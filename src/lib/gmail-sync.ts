import "server-only";

import { google } from "googleapis";
import { load } from "cheerio";

import {
  createGmailOAuthClient,
  decryptGmailToken,
} from "@/lib/gmail-oauth";

import { createClient } from "@/lib/supabase/server";

/* =========================================================
   CONFIG
========================================================= */

const GMAIL_READ_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

const MESSAGE_LOOKBACK_DAYS = 30;

const SEARCH_TERM_CHUNK_SIZE = 20;

const MAX_SEARCH_PAGES = 5;

const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.de",
  "hotmail.com",
  "hotmail.de",
  "live.com",
  "live.de",
  "icloud.com",
  "me.com",
  "mac.com",
  "web.de",
  "gmx.de",
  "gmx.net",
  "gmx.com",
  "yahoo.com",
  "yahoo.de",
  "t-online.de",
  "freenet.de",
  "aol.com",
  "protonmail.com",
  "proton.me",
]);

/* =========================================================
   TYPES
========================================================= */

type GmailHeader = {
  name?: string | null;
  value?: string | null;
};

type GmailMessagePart = {
  mimeType?: string | null;

  body?: {
    data?: string | null;
  } | null;

  parts?: GmailMessagePart[] | null;

  headers?: GmailHeader[] | null;
};

type LeadReference = {
  leadId: string;
  draftId: string | null;
};

type ThreadReference = {
  leadId: string;
  draftId: string;
  threadId: string;
};

type ParsedIncomingMessage = {
  user_id: string;
  lead_id: string;
  outreach_draft_id: string | null;

  gmail_message_id: string;
  gmail_thread_id: string;

  direction: "INCOMING";

  from_name: string | null;
  from_email: string;
  to_email: string | null;

  subject: string | null;
  body_text: string;

  received_at: string;

  is_unread: boolean;
};

/* =========================================================
   GENERIC HELPERS
========================================================= */

function getSingleRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function chunkArray<T>(
  values: T[],
  size: number
) {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index + size
      )
    );
  }

  return chunks;
}

function isReasonableEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function getEmailDomain(
  email: string
) {
  const parts =
    email
      .trim()
      .toLowerCase()
      .split("@");

  if (parts.length !== 2) {
    return null;
  }

  return parts[1] || null;
}

/* =========================================================
   HEADERS
========================================================= */

function getHeader(
  payload:
    | GmailMessagePart
    | null
    | undefined,
  name: string
) {
  const headers =
    payload?.headers ?? [];

  const header =
    headers.find(
      (item) =>
        item.name?.toLowerCase() ===
        name.toLowerCase()
    );

  return (
    header?.value?.trim() ??
    null
  );
}

/* =========================================================
   EMAIL ADDRESS
========================================================= */

function parseEmailAddress(
  value: string | null
) {
  if (!value) {
    return {
      email: null,
      name: null,
    };
  }

  const angleMatch =
    value.match(
      /^(.*?)<([^>]+)>/
    );

  if (angleMatch) {
    const rawName =
      angleMatch[1]
        .trim()
        .replace(
          /^["']|["']$/g,
          ""
        );

    const email =
      angleMatch[2]
        .trim()
        .toLowerCase();

    const usableName =
      rawName &&
      !rawName.includes("=?")
        ? rawName
        : null;

    return {
      email,
      name: usableName,
    };
  }

  const emailMatch =
    value.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

  return {
    email:
      emailMatch
        ? emailMatch[0]
            .trim()
            .toLowerCase()
        : null,

    name: null,
  };
}

/* =========================================================
   BASE64
========================================================= */

function decodeBase64Url(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "";
  }

  try {
    return Buffer.from(
      value,
      "base64url"
    ).toString(
      "utf8"
    );
  } catch {
    return "";
  }
}

/* =========================================================
   MIME BODY
========================================================= */

function findTextPart(
  part:
    | GmailMessagePart
    | null
    | undefined,
  mimeType: string
): string | null {
  if (!part) {
    return null;
  }

  if (
    part.mimeType === mimeType &&
    part.body?.data
  ) {
    return decodeBase64Url(
      part.body.data
    );
  }

  const children =
    part.parts ?? [];

  for (const child of children) {
    const result =
      findTextPart(
        child,
        mimeType
      );

    if (result) {
      return result;
    }
  }

  return null;
}

/* =========================================================
   HTML -> TEXT
========================================================= */

function htmlToText(
  html: string
) {
  const $ =
    load(html);

  $("br").replaceWith(
    "\n"
  );

  $(
    "p, div, li, blockquote"
  ).each(
    (_, element) => {
      $(element).append(
        "\n"
      );
    }
  );

  return $("body")
    .text()
    .replace(
      /\u00a0/g,
      " "
    )
    .replace(
      /\n[ \t]+/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

/* =========================================================
   REMOVE QUOTED REPLY
========================================================= */

function removeQuotedReply(
  value: string
) {
  let text =
    value
      .replace(
        /\r\n/g,
        "\n"
      )
      .trim();

  const markers = [
    /\nOn .+wrote:\s*\n/i,
    /\nAm .+schrieb .+:\s*\n/i,
    /\n-{2,}\s*Original Message\s*-{2,}\s*\n/i,
    /\n-{2,}\s*Ursprüngliche Nachricht\s*-{2,}\s*\n/i,
  ];

  let firstIndex =
    -1;

  for (const marker of markers) {
    const match =
      marker.exec(text);

    if (
      match &&
      (
        firstIndex === -1 ||
        match.index < firstIndex
      )
    ) {
      firstIndex =
        match.index;
    }
  }

  if (firstIndex >= 0) {
    text =
      text
        .slice(
          0,
          firstIndex
        )
        .trim();
  }

  return text
    .split("\n")
    .filter(
      (line) =>
        !line
          .trim()
          .startsWith(">")
    )
    .join("\n")
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

/* =========================================================
   BODY
========================================================= */

function extractBody(
  payload:
    | GmailMessagePart
    | null
    | undefined,
  fallbackSnippet:
    | string
    | null
    | undefined
) {
  const plain =
    findTextPart(
      payload,
      "text/plain"
    );

  if (plain) {
    return removeQuotedReply(
      plain
    );
  }

  const html =
    findTextPart(
      payload,
      "text/html"
    );

  if (html) {
    return removeQuotedReply(
      htmlToText(html)
    );
  }

  return (
    fallbackSnippet?.trim() ??
    ""
  );
}

/* =========================================================
   BOUNCES
========================================================= */

function isHardBounce({
  fromEmail,
  subject,
}: {
  fromEmail: string;
  subject: string | null;
}) {
  const sender =
    fromEmail.toLowerCase();

  const subjectText =
    subject?.toLowerCase() ??
    "";

  if (
    sender.includes(
      "mailer-daemon"
    ) ||
    sender.includes(
      "postmaster"
    )
  ) {
    return true;
  }

  if (
    subjectText.includes(
      "delivery status notification"
    ) ||
    subjectText.includes(
      "mail delivery failed"
    ) ||
    subjectText.includes(
      "undeliverable"
    ) ||
    subjectText.includes(
      "zustellung fehlgeschlagen"
    )
  ) {
    return true;
  }

  return false;
}

/* =========================================================
   SYNC
========================================================= */

export async function syncGmailRepliesForCurrentUser() {
  const supabase =
    await createClient();

  /* =======================================================
     USER
  ======================================================= */

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    throw new Error(
      "NOT_AUTHENTICATED"
    );
  }

  /* =======================================================
     CONNECTION
  ======================================================= */

  const {
    data: connection,
    error: connectionError,
  } =
    await supabase
      .from(
        "gmail_connections"
      )
      .select(`
        email_address,
        encrypted_refresh_token,
        scopes
      `)
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    connectionError ||
    !connection
  ) {
    throw new Error(
      "GMAIL_NOT_CONNECTED"
    );
  }

  const scopes =
    Array.isArray(
      connection.scopes
    )
      ? connection.scopes
      : [];

  if (
    !scopes.includes(
      GMAIL_READ_SCOPE
    )
  ) {
    throw new Error(
      "GMAIL_READ_PERMISSION_REQUIRED"
    );
  }

  const ownEmail =
    connection.email_address
      .trim()
      .toLowerCase();

  /* =======================================================
     SENT DRAFTS
  ======================================================= */

  const {
    data: drafts,
    error: draftsError,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .select(`
        id,
        lead_id,
        sent_at,
        gmail_thread_id,
        gmail_follow_up_thread_id
      `)
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "SENT"
      )
      .order(
        "sent_at",
        {
          ascending: false,
        }
      );

  if (draftsError) {
    throw new Error(
      `Could not load sent outreach drafts: ${draftsError.message}`
    );
  }

  /* =======================================================
     LEADS + CONTACT EMAILS
  ======================================================= */

  const {
    data: leads,
    error: leadsError,
  } =
    await supabase
      .from("leads")
      .select(`
        id,

        primary_contact:contacts (
          id,
          email
        )
      `)
      .eq(
        "user_id",
        user.id
      );

  if (leadsError) {
    throw new Error(
      `Could not load lead contacts: ${leadsError.message}`
    );
  }

  /* =======================================================
     LATEST DRAFT PER LEAD
  ======================================================= */

  const latestDraftByLead =
    new Map<
      string,
      string
    >();

  for (
    const draft of
      drafts ?? []
  ) {
    if (
      !latestDraftByLead.has(
        draft.lead_id
      )
    ) {
      latestDraftByLead.set(
        draft.lead_id,
        draft.id
      );
    }
  }

  /* =======================================================
     KNOWN EMAILS + DOMAINS
  ======================================================= */

  const knownContactByEmail =
    new Map<
      string,
      LeadReference
    >();

  const possibleDomainReferences =
    new Map<
      string,
      LeadReference[]
    >();

  for (
    const lead of
      leads ?? []
  ) {
    const contact =
      getSingleRelation(
        lead.primary_contact
      );

    const email =
      contact?.email
        ?.trim()
        .toLowerCase();

    if (
      !email ||
      !isReasonableEmail(email)
    ) {
      continue;
    }

    const reference:
      LeadReference = {
      leadId:
        lead.id,

      draftId:
        latestDraftByLead.get(
          lead.id
        ) ?? null,
    };

    knownContactByEmail.set(
      email,
      reference
    );

    const domain =
      getEmailDomain(email);

    if (
      !domain ||
      GENERIC_EMAIL_DOMAINS.has(
        domain
      )
    ) {
      continue;
    }

    const existing =
      possibleDomainReferences.get(
        domain
      ) ?? [];

    existing.push(
      reference
    );

    possibleDomainReferences.set(
      domain,
      existing
    );
  }

  const knownLeadByDomain =
    new Map<
      string,
      LeadReference
    >();

  for (
    const [
      domain,
      references,
    ] of
      possibleDomainReferences
        .entries()
  ) {
    const uniqueLeadIds =
      new Set(
        references.map(
          (reference) =>
            reference.leadId
        )
      );

    if (
      uniqueLeadIds.size !== 1
    ) {
      continue;
    }

    knownLeadByDomain.set(
      domain,
      references[0]
    );
  }

  /* =======================================================
     KNOWN OUTREACH THREADS
  ======================================================= */

  const threadMap =
    new Map<
      string,
      ThreadReference
    >();

  for (
    const draft of
      drafts ?? []
  ) {
    if (
      draft.gmail_thread_id
    ) {
      threadMap.set(
        draft.gmail_thread_id,
        {
          leadId:
            draft.lead_id,

          draftId:
            draft.id,

          threadId:
            draft.gmail_thread_id,
        }
      );
    }

    if (
      draft.gmail_follow_up_thread_id
    ) {
      threadMap.set(
        draft.gmail_follow_up_thread_id,
        {
          leadId:
            draft.lead_id,

          draftId:
            draft.id,

          threadId:
            draft.gmail_follow_up_thread_id,
        }
      );
    }
  }

  /* =======================================================
     GMAIL CLIENT
  ======================================================= */

  const refreshToken =
    decryptGmailToken(
      connection.encrypted_refresh_token
    );

  const oauth2Client =
    createGmailOAuthClient();

  oauth2Client.setCredentials({
    refresh_token:
      refreshToken,
  });

  const gmail =
    google.gmail({
      version: "v1",
      auth: oauth2Client,
    });

  /* =======================================================
     CANDIDATE IDS
  ======================================================= */

  const candidateMessageIds =
    new Set<string>();

  const threadReferenceByMessageId =
    new Map<
      string,
      ThreadReference
    >();

  /* =======================================================
     SOURCE A — EXISTING OUTREACH THREADS
  ======================================================= */

  for (
    const reference of
      threadMap.values()
  ) {
    try {
      const threadResponse =
        await gmail.users.threads.get({
          userId: "me",

          id:
            reference.threadId,

          format:
            "minimal",
        });

      for (
        const message of
          threadResponse.data.messages ??
          []
      ) {
        if (!message.id) {
          continue;
        }

        candidateMessageIds.add(
          message.id
        );

        threadReferenceByMessageId.set(
          message.id,
          reference
        );
      }
    } catch (error) {
      const possibleCode =
        typeof error ===
          "object" &&
        error !== null &&
        "code" in error
          ? Number(
              (
                error as {
                  code?: unknown;
                }
              ).code
            )
          : null;

      if (
        possibleCode === 401 ||
        possibleCode === 403
      ) {
        throw error;
      }

      console.warn(
        `Could not inspect Gmail thread ${reference.threadId}:`,
        error
      );
    }
  }

  /* =======================================================
     SOURCE B — NEW EMAILS FROM KNOWN CONTACTS / DOMAINS
  ======================================================= */

  const searchTerms = [
    ...Array.from(
      knownContactByEmail.keys()
    ).map(
      (email) =>
        `from:${email}`
    ),

    ...Array.from(
      knownLeadByDomain.keys()
    ).map(
      (domain) =>
        `from:${domain}`
    ),
  ];

  const uniqueSearchTerms =
    Array.from(
      new Set(
        searchTerms
      )
    );

  const searchChunks =
    chunkArray(
      uniqueSearchTerms,
      SEARCH_TERM_CHUNK_SIZE
    );

  for (
    const searchChunk of
      searchChunks
  ) {
    if (
      searchChunk.length === 0
    ) {
      continue;
    }

    const fromSearch =
      searchChunk.join(" ");

    const query =
      `newer_than:${MESSAGE_LOOKBACK_DAYS}d {${fromSearch}}`;

    let pageToken:
      string | undefined;

    for (
      let page = 0;
      page < MAX_SEARCH_PAGES;
      page += 1
    ) {
      const listResponse =
        await gmail.users.messages.list({
          userId: "me",

          q: query,

          maxResults: 100,

          pageToken,
        });

      for (
        const message of
          listResponse.data.messages ??
          []
      ) {
        if (message.id) {
          candidateMessageIds.add(
            message.id
          );
        }
      }

      const nextPageToken =
        listResponse.data
          .nextPageToken ??
        undefined;

      if (!nextPageToken) {
        break;
      }

      pageToken =
        nextPageToken;
    }
  }

  /* =======================================================
     NOTHING FOUND
  ======================================================= */

  if (
    candidateMessageIds.size ===
    0
  ) {
    return {
      threadsChecked:
        threadMap.size,

      messagesChecked:
        0,

      repliesFound:
        0,

      newReplies:
        0,
    };
  }

  /* =======================================================
     REMOVE ALREADY STORED IDS
  ======================================================= */

  const candidateIds =
    Array.from(
      candidateMessageIds
    );

  const existingMessageIds =
    new Set<string>();

  const candidateChunks =
    chunkArray(
      candidateIds,
      100
    );

  for (
    const chunk of
      candidateChunks
  ) {
    const {
      data: existingMessages,
      error: existingError,
    } =
      await supabase
        .from(
          "email_messages"
        )
        .select(
          "gmail_message_id"
        )
        .eq(
          "user_id",
          user.id
        )
        .in(
          "gmail_message_id",
          chunk
        );

    if (existingError) {
      throw new Error(
        `Could not check existing inbox messages: ${existingError.message}`
      );
    }

    for (
      const message of
        existingMessages ?? []
    ) {
      existingMessageIds.add(
        message.gmail_message_id
      );
    }
  }

  const unknownMessageIds =
    candidateIds.filter(
      (messageId) =>
        !existingMessageIds.has(
          messageId
        )
    );

  if (
    unknownMessageIds.length ===
    0
  ) {
    return {
      threadsChecked:
        threadMap.size,

      messagesChecked:
        candidateIds.length,

      repliesFound:
        0,

      newReplies:
        0,
    };
  }

  /* =======================================================
     FETCH FULL MESSAGES
  ======================================================= */

  const parsedMessages:
    ParsedIncomingMessage[] =
      [];

  for (
    const messageId of
      unknownMessageIds
  ) {
    let message;

    try {
      const messageResponse =
        await gmail.users.messages.get({
          userId: "me",

          id:
            messageId,

          format:
            "full",
        });

      message =
        messageResponse.data;
    } catch (error) {
      const possibleCode =
        typeof error ===
          "object" &&
        error !== null &&
        "code" in error
          ? Number(
              (
                error as {
                  code?: unknown;
                }
              ).code
            )
          : null;

      if (
        possibleCode === 401 ||
        possibleCode === 403
      ) {
        throw error;
      }

      console.warn(
        `Could not fetch Gmail message ${messageId}:`,
        error
      );

      continue;
    }

    if (!message.id) {
      continue;
    }

    const payload =
      message.payload as
        | GmailMessagePart
        | undefined;

    const fromHeader =
      getHeader(
        payload,
        "From"
      );

    const toHeader =
      getHeader(
        payload,
        "To"
      );

    const subject =
      getHeader(
        payload,
        "Subject"
      );

    const from =
      parseEmailAddress(
        fromHeader
      );

    const to =
      parseEmailAddress(
        toHeader
      );

    if (!from.email) {
      continue;
    }

    /*
     * Do not import our own sent messages
     * as incoming lead messages.
     */
    if (
      from.email ===
      ownEmail
    ) {
      continue;
    }

    if (
      isHardBounce({
        fromEmail:
          from.email,

        subject,
      })
    ) {
      continue;
    }

    /* =====================================================
       MATCH TO LEAD
    ===================================================== */

    const threadReference =
      threadReferenceByMessageId.get(
        message.id
      );

    let leadReference:
      LeadReference | null =
      null;

    /*
     * 1. Exact existing Gmail thread.
     */
    if (threadReference) {
      leadReference = {
        leadId:
          threadReference.leadId,

        draftId:
          threadReference.draftId,
      };
    }

    /*
     * 2. Exact known lead email.
     */
    if (!leadReference) {
      leadReference =
        knownContactByEmail.get(
          from.email
        ) ?? null;
    }

    /*
     * 3. Same unique company domain.
     */
    if (!leadReference) {
      const domain =
        getEmailDomain(
          from.email
        );

      if (
        domain &&
        !GENERIC_EMAIL_DOMAINS.has(
          domain
        )
      ) {
        leadReference =
          knownLeadByDomain.get(
            domain
          ) ?? null;
      }
    }

    /*
     * Unknown emails stay in Gmail and do not
     * enter the JOEL LEADOS CRM inbox.
     */
    if (!leadReference) {
      continue;
    }

    const body =
      extractBody(
        payload,
        message.snippet
      );

    const internalDate =
      message.internalDate
        ? Number(
            message.internalDate
          )
        : Date.now();

    const receivedAt =
      Number.isFinite(
        internalDate
      )
        ? new Date(
            internalDate
          ).toISOString()
        : new Date()
            .toISOString();

    const labels =
      message.labelIds ?? [];

    parsedMessages.push({
      user_id:
        user.id,

      lead_id:
        leadReference.leadId,

      outreach_draft_id:
        leadReference.draftId,

      gmail_message_id:
        message.id,

      gmail_thread_id:
        message.threadId ??
        threadReference
          ?.threadId ??
        "",

      direction:
        "INCOMING",

      from_name:
        from.name,

      from_email:
        from.email,

      to_email:
        to.email,

      subject,

      body_text:
        body,

      received_at:
        receivedAt,

      is_unread:
        labels.includes(
          "UNREAD"
        ),
    });
  }

  const validMessages =
    parsedMessages.filter(
      (message) =>
        Boolean(
          message.gmail_thread_id
        )
    );

  if (
    validMessages.length ===
    0
  ) {
    return {
      threadsChecked:
        threadMap.size,

      messagesChecked:
        unknownMessageIds.length,

      repliesFound:
        0,

      newReplies:
        0,
    };
  }

  /* =======================================================
     STORE
  ======================================================= */

  const {
    error: insertError,
  } =
    await supabase
      .from(
        "email_messages"
      )
      .upsert(
        validMessages,
        {
          onConflict:
            "user_id,gmail_message_id",

          ignoreDuplicates:
            true,
        }
      );

  if (insertError) {
    throw new Error(
      `Could not save Gmail replies: ${insertError.message}`
    );
  }

  /* =======================================================
     UPDATE LEADS
  ======================================================= */

  const repliedLeadIds =
    Array.from(
      new Set(
        validMessages.map(
          (message) =>
            message.lead_id
        )
      )
    );

  if (
    repliedLeadIds.length >
    0
  ) {
    const {
      error: followUpError,
    } =
      await supabase
        .from("leads")
        .update({
          next_follow_up_at:
            null,
        })
        .eq(
          "user_id",
          user.id
        )
        .in(
          "id",
          repliedLeadIds
        );

    if (followUpError) {
      console.error(
        "Replies were stored but follow-ups could not be stopped:",
        followUpError
      );
    }

    const {
      error: statusError,
    } =
      await supabase
        .from("leads")
        .update({
          status:
            "REPLIED",
        })
        .eq(
          "user_id",
          user.id
        )
        .in(
          "id",
          repliedLeadIds
        )
        .in(
          "status",
          [
            "NEW",
            "RESEARCHING",
            "QUALIFIED",
            "DRAFT_READY",
            "CONTACTED",
          ]
        );

    if (statusError) {
      console.error(
        "Replies were stored but lead statuses could not be updated:",
        statusError
      );
    }
  }

  return {
    threadsChecked:
      threadMap.size,

    messagesChecked:
      unknownMessageIds.length,

    repliesFound:
      validMessages.length,

    newReplies:
      validMessages.length,
  };
}