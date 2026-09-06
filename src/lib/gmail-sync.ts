import "server-only";

import {
  google,
} from "googleapis";

import {
  load,
} from "cheerio";

import {
  isAutomaticReply,
} from "@/lib/email-message-classification";

import {
  classifyReplyIntelligence,
  detectOutOfOfficeFollowUpAt,
  replyIntelligenceColumns,
  type ReplyClassification,
} from "@/lib/reply-intelligence";

import {
  createGmailOAuthClient,
  decryptGmailToken,
} from "@/lib/gmail-oauth";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   CONFIG
========================================================= */

const GMAIL_READ_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly";

const MESSAGE_LOOKBACK_DAYS =
  30;

const SEARCH_TERM_CHUNK_SIZE =
  20;

const MAX_SEARCH_PAGES =
  5;

const AUTO_SEARCH_PAGES =
  2;

const AUTO_THREAD_INSPECTION_LIMIT =
  6;

const MANUAL_THREAD_INSPECTION_LIMIT =
  24;

const GENERIC_EMAIL_DOMAINS =
  new Set([
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

export type GmailSyncMode =
  | "auto"
  | "manual";

type GmailHeader = {
  name?:
    | string
    | null;

  value?:
    | string
    | null;
};

type GmailMessagePart = {
  filename?:
    | string
    | null;

  mimeType?:
    | string
    | null;

  body?: {
    data?:
      | string
      | null;

    attachmentId?:
      | string
      | null;

    size?:
      | number
      | null;
  } | null;

  parts?:
    | GmailMessagePart[]
    | null;

  headers?:
    | GmailHeader[]
    | null;
};

type LeadReference = {
  leadId:
    string;

  draftId:
    | string
    | null;
};

type ThreadReference = {
  leadId:
    string;

  draftId:
    string;

  threadId:
    string;
};

type LeadContext = {
  companyName:
    string
    | null;

  contactName:
    string
    | null;

  currentStatus:
    string
    | null;

  currentPriority:
    string
    | null;

  nextFollowUpAt:
    string
    | null;

  manualFollowUpStoppedAt:
    string
    | null;
};

type AttachmentMetadata = {
  name:
    string;

  type:
    string;

  size:
    number;
};

type ParsedIncomingMessage = {
  user_id:
    string;

  lead_id:
    string;

  outreach_draft_id:
    | string
    | null;

  gmail_message_id:
    string;

  gmail_thread_id:
    string;

  direction:
    "INCOMING";

  from_name:
    | string
    | null;

  from_email:
    string;

  to_email:
    | string
    | null;

  subject:
    | string
    | null;

  body_text:
    string;

  received_at:
    string;

  is_unread:
    boolean;

  attachments:
    AttachmentMetadata[];

  is_automatic_reply:
    boolean;

  reply_classification:
    ReplyClassification;

  reply_classification_confidence:
    number;

  reply_classification_reason:
    string;

  reply_follow_up_at:
    string
    | null;

  reply_detected_date_text:
    string
    | null;

  reply_alternative_contact_name:
    string
    | null;

  reply_alternative_contact_email:
    string
    | null;

  reply_classified_at:
    string;

  reply_classification_model:
    string;

  reply_classification_input_tokens:
    number;

  reply_classification_output_tokens:
    number;

  reply_classification_total_tokens:
    number;
};

/* =========================================================
   HELPERS
========================================================= */

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return (
    value ??
    null
  );
}

function chunkArray<T>(
  values:
    T[],
  size:
    number
) {
  const chunks:
    T[][] =
    [];

  for (
    let index =
      0;
    index <
      values.length;
    index +=
      size
  ) {
    chunks.push(
      values.slice(
        index,
        index +
          size
      )
    );
  }

  return chunks;
}

function isReasonableEmail(
  value:
    string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function getEmailDomain(
  email:
    string
) {
  const parts =
    email
      .trim()
      .toLowerCase()
      .split(
        "@"
      );

  if (
    parts.length !==
      2
  ) {
    return null;
  }

  return (
    parts[1] ||
    null
  );
}

function getErrorCode(
  error:
    unknown
) {
  if (
    typeof error ===
      "object" &&
    error !==
      null &&
    "code" in
      error
  ) {
    return Number(
      (
        error as {
          code?:
            unknown;
        }
      ).code
    );
  }

  return null;
}

/* =========================================================
   HEADERS
========================================================= */

function getHeader(
  payload:
    | GmailMessagePart
    | null
    | undefined,
  name:
    string
) {
  const header =
    (
      payload?.headers ??
      []
    ).find(
      (
        item
      ) =>
        item.name
          ?.toLowerCase() ===
        name.toLowerCase()
    );

  return (
    header
      ?.value
      ?.trim() ??
    null
  );
}

/* =========================================================
   ADDRESS
========================================================= */

function parseEmailAddress(
  value:
    | string
    | null
) {
  if (
    !value
  ) {
    return {
      email:
        null,

      name:
        null,
    };
  }

  const angleMatch =
    value.match(
      /^(.*?)<([^>]+)>/
    );

  if (
    angleMatch
  ) {
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

    return {
      email,

      name:
        rawName &&
        !rawName.includes(
          "=?"
        )
          ? rawName
          : null,
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

    name:
      null,
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
  if (
    !value
  ) {
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
   BODY
========================================================= */

function findTextPart(
  part:
    | GmailMessagePart
    | null
    | undefined,
  mimeType:
    string
): string | null {
  if (
    !part
  ) {
    return null;
  }

  if (
    part.mimeType ===
      mimeType &&
    part.body?.data
  ) {
    return decodeBase64Url(
      part.body.data
    );
  }

  for (
    const child of
      part.parts ??
      []
  ) {
    const result =
      findTextPart(
        child,
        mimeType
      );

    if (
      result
    ) {
      return result;
    }
  }

  return null;
}

function htmlToText(
  html:
    string
) {
  const $ =
    load(
      html
    );

  $("br").replaceWith(
    "\n"
  );

  $(
    "p, div, li, blockquote"
  ).each(
    (
      _,
      element
    ) => {
      $(
        element
      ).append(
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

function removeQuotedReply(
  value:
    string
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

  for (
    const marker of
      markers
  ) {
    const match =
      marker.exec(
        text
      );

    if (
      match &&
      (
        firstIndex ===
          -1 ||
        match.index <
          firstIndex
      )
    ) {
      firstIndex =
        match.index;
    }
  }

  if (
    firstIndex >=
      0
  ) {
    text =
      text
        .slice(
          0,
          firstIndex
        )
        .trim();
  }

  return text
    .split(
      "\n"
    )
    .filter(
      (
        line
      ) =>
        !line
          .trim()
          .startsWith(
            ">"
          )
    )
    .join(
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

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

  if (
    plain
  ) {
    return removeQuotedReply(
      plain
    );
  }

  const html =
    findTextPart(
      payload,
      "text/html"
    );

  if (
    html
  ) {
    return removeQuotedReply(
      htmlToText(
        html
      )
    );
  }

  return (
    fallbackSnippet
      ?.trim() ??
    ""
  );
}

/* =========================================================
   ATTACHMENTS
========================================================= */

function collectAttachments(
  part:
    | GmailMessagePart
    | null
    | undefined
): AttachmentMetadata[] {
  if (
    !part
  ) {
    return [];
  }

  const attachments:
    AttachmentMetadata[] =
    [];

  function walk(
    current:
      GmailMessagePart
  ) {
    const filename =
      current.filename
        ?.trim() ??
      "";

    if (
      filename
    ) {
      attachments.push({
        name:
          filename,

        type:
          current.mimeType ||
          "application/octet-stream",

        size:
          current.body
            ?.size ??
          0,
      });
    }

    for (
      const child of
        current.parts ??
        []
    ) {
      walk(
        child
      );
    }
  }

  walk(
    part
  );

  return attachments;
}

/* =========================================================
   BOUNCES
========================================================= */

function isHardBounce({
  fromEmail,
  subject,
}: {
  fromEmail:
    string;

  subject:
    | string
    | null;
}) {
  const sender =
    fromEmail
      .toLowerCase();

  const subjectText =
    subject
      ?.toLowerCase() ??
    "";

  return (
    sender.includes(
      "mailer-daemon"
    ) ||
    sender.includes(
      "postmaster"
    ) ||
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
  );
}

/* =========================================================
   HISTORICAL CLASSIFICATION BACKFILL

   Existing inbox messages from before Phase 2 are
   classified in small batches whenever Gmail sync runs.

   Important:
   This backfill only adds intelligence metadata. It does
   NOT retroactively change CRM statuses or follow-ups.
========================================================= */

async function backfillStoredReplyIntelligence({
  supabase,
  userId,
  leadContextById,
}: {
  supabase:
    Awaited<
      ReturnType<
        typeof createClient
      >
    >;

  userId:
    string;

  leadContextById:
    Map<
      string,
      LeadContext
    >;
}) {
  const {
    data:
      messages,

    error,
  } =
    await supabase
      .from(
        "email_messages"
      )
      .select(`
        id,
        lead_id,
        from_name,
        from_email,
        subject,
        body_text,
        received_at
      `)
      .eq(
        "user_id",
        userId
      )
      .eq(
        "direction",
        "INCOMING"
      )
      .is(
        "reply_classification",
        null
      )
      .order(
        "received_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        5
      );

  if (
    error
  ) {
    console.error(
      "Could not load old messages for reply-intelligence backfill:",
      error
    );

    return 0;
  }

  let classified =
    0;

  for (
    const message of
      messages ??
      []
  ) {
    const automaticReply =
      isAutomaticReply({
        subject:
          message.subject,

        body:
          message.body_text,
      });

    const hardBounce =
      isHardBounce({
        fromEmail:
          message.from_email,

        subject:
          message.subject,
      });

    const context =
      leadContextById.get(
        message.lead_id
      ) ??
      null;

    const result =
      await classifyReplyIntelligence({
        subject:
          message.subject,

        body:
          message.body_text,

        fromEmail:
          message.from_email,

        fromName:
          message.from_name,

        companyName:
          context?.companyName ??
          null,

        contactName:
          context?.contactName ??
          null,

        receivedAt:
          message.received_at,

        automaticReply,

        hardBounce,
      });

    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "email_messages"
        )
        .update(
          replyIntelligenceColumns({
            result,

            automaticReply,
          })
        )
        .eq(
          "id",
          message.id
        )
        .eq(
          "user_id",
          userId
        )
        .is(
          "reply_classification",
          null
        );

    if (
      updateError
    ) {
      console.error(
        `Could not backfill reply intelligence for ${message.id}:`,
        updateError
      );

      continue;
    }

    classified +=
      1;
  }

  return classified;
}

/* =========================================================
   AUTO-REPLY REPAIR / CRM RECONCILIATION

   Phase 2 originally classified old inbox messages without
   retroactively touching CRM state. That was intentionally
   conservative, but it means older OOO / acknowledgement
   messages can still leave a lead looking "Replied" and can
   leave an old follow-up date in place.

   This lightweight reconciliation:
   - re-checks recent incoming messages with the deterministic
     classifier,
   - reclassifies only messages whose automatic-reply signal
     changed,
   - restores REPLIED -> CONTACTED when a lead has no genuine
     human reply,
   - postpones OOO follow-ups to the detected return date.
========================================================= */

async function repairRecentAutomaticReplies({
  supabase,
  userId,
  leadContextById,
}: {
  supabase:
    Awaited<
      ReturnType<
        typeof createClient
      >
    >;

  userId:
    string;

  leadContextById:
    Map<
      string,
      LeadContext
    >;
}) {
  const {
    data:
      messages,

    error,
  } =
    await supabase
      .from(
        "email_messages"
      )
      .select(`
        id,
        lead_id,
        from_name,
        from_email,
        subject,
        body_text,
        received_at,
        is_automatic_reply,
        reply_classification,
        reply_classification_confidence,
        reply_follow_up_at
      `)
      .eq(
        "user_id",
        userId
      )
      .eq(
        "direction",
        "INCOMING"
      )
      .order(
        "received_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        100
      );

  if (
    error
  ) {
    console.error(
      "Could not load recent incoming messages for auto-reply repair:",
      error
    );

    return {
      repairedMessages:
        0,

      reconciledLeads:
        0,
    };
  }

  const effectiveMessages =
    new Map<
      string,
      {
        leadId:
          string;

        receivedAt:
          string;

        automaticReply:
          boolean;

        classification:
          ReplyClassification
          | null;

        followUpAt:
          string
          | null;
      }[]
    >();

  let repairedMessages =
    0;

  for (
    const message of
      messages ??
      []
  ) {
    const detectedAutomatic =
      isAutomaticReply({
        subject:
          message.subject,

        body:
          message.body_text,
      });

    const hardBounce =
      isHardBounce({
        fromEmail:
          message.from_email,

        subject:
          message.subject,
      });

    let automaticReply =
      Boolean(
        message.is_automatic_reply
      );

    let classification =
      (
        message.reply_classification as
          | ReplyClassification
          | null
      ) ??
      null;

    let followUpAt =
      message.reply_follow_up_at ??
      null;

    const deterministicOooFollowUpAt =
      detectedAutomatic &&
      classification ===
        "OUT_OF_OFFICE"
        ? detectOutOfOfficeFollowUpAt({
            body:
              message.body_text,

            receivedAt:
              message.received_at,
          })
        : null;

    /*
     * Explicit date ranges are stronger than the old fallback.
     * Repair the stored intelligence metadata without another
     * OpenAI call when possible.
     */
    if (
      deterministicOooFollowUpAt &&
      deterministicOooFollowUpAt !==
        followUpAt
    ) {
      const {
        error:
          dateRepairError,
      } =
        await supabase
          .from(
            "email_messages"
          )
          .update({
            is_automatic_reply:
              true,

            reply_classification:
              "OUT_OF_OFFICE",

            reply_classification_confidence:
              Math.max(
                Number(
                  message.reply_classification_confidence ??
                  0
                ),
                0.98
              ),

            reply_classification_reason:
              "Expliziter Abwesenheitszeitraum in der Nachricht erkannt.",

            reply_follow_up_at:
              deterministicOooFollowUpAt,

            reply_classified_at:
              new Date()
                .toISOString(),

            reply_classification_model:
              "deterministic-ooo-date",
          })
          .eq(
            "id",
            message.id
          )
          .eq(
            "user_id",
            userId
          );

      if (
        dateRepairError
      ) {
        console.error(
          `Could not repair explicit OOO follow-up date for ${message.id}:`,
          dateRepairError
        );
      } else {
        repairedMessages +=
          1;

        automaticReply =
          true;

        classification =
          "OUT_OF_OFFICE";

        followUpAt =
          deterministicOooFollowUpAt;
      }
    }

    /*
     * Re-run intelligence only when deterministic detection
     * newly proves this was automatic. This keeps the repair
     * cheap and avoids reclassifying the entire inbox.
     */
    if (
      detectedAutomatic &&
      !automaticReply &&
      !deterministicOooFollowUpAt
    ) {
      const context =
        leadContextById.get(
          message.lead_id
        ) ??
        null;

      const result =
        await classifyReplyIntelligence({
          subject:
            message.subject,

          body:
            message.body_text,

          fromEmail:
            message.from_email,

          fromName:
            message.from_name,

          companyName:
            context?.companyName ??
            null,

          contactName:
            context?.contactName ??
            null,

          receivedAt:
            message.received_at,

          automaticReply:
            true,

          hardBounce,
        });

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "email_messages"
          )
          .update(
            replyIntelligenceColumns({
              result,

              automaticReply:
                true,
            })
          )
          .eq(
            "id",
            message.id
          )
          .eq(
            "user_id",
            userId
          );

      if (
        updateError
      ) {
        console.error(
          `Could not repair automatic-reply metadata for ${message.id}:`,
          updateError
        );
      } else {
        repairedMessages +=
          1;

        automaticReply =
          true;

        classification =
          result.classification;

        followUpAt =
          result.followUpAt;
      }
    }

    const existing =
      effectiveMessages.get(
        message.lead_id
      ) ??
      [];

    existing.push({
      leadId:
        message.lead_id,

      receivedAt:
        message.received_at,

      automaticReply,

      classification,

      followUpAt,
    });

    effectiveMessages.set(
      message.lead_id,
      existing
    );
  }

  let reconciledLeads =
    0;

  for (
    const [
      leadId,
      leadMessages,
    ] of
      effectiveMessages.entries()
  ) {
    const context =
      leadContextById.get(
        leadId
      ) ??
      null;

    if (
      !context
    ) {
      continue;
    }

    const sorted =
      [
        ...leadMessages,
      ].sort(
        (
          a,
          b
        ) =>
          new Date(
            a.receivedAt
          ).getTime() -
          new Date(
            b.receivedAt
          ).getTime()
      );

    const hasHumanReply =
      sorted.some(
        (
          message
        ) =>
          !message.automaticReply &&
          message.classification !==
            "BOUNCE"
      );

    const latestAutomatic =
      [
        ...sorted,
      ]
        .reverse()
        .find(
          (
            message
          ) =>
            message.automaticReply
        ) ??
      null;

    const updates: {
      status?:
        string;

      next_follow_up_at?:
        string
        | null;

      smart_follow_up_mode?:
        string;

      smart_follow_up_reason?:
        string;

      smart_follow_up_updated_at?:
        string;
    } = {};

    /*
     * If the lead only ever received automatic messages,
     * "REPLIED" is misleading. CONTACTED is the correct CRM
     * state because there is still no human response.
     */
    if (
      !hasHumanReply &&
      context.currentStatus ===
        "REPLIED"
    ) {
      updates.status =
        "CONTACTED";
    }

    /*
     * Latest OOO controls the cold follow-up date until a
     * real person replies. If no exact return date exists,
     * postpone safely by seven days from the OOO message.
     */
    if (
      !hasHumanReply &&
      !context.manualFollowUpStoppedAt &&
      latestAutomatic
        ?.classification ===
        "OUT_OF_OFFICE"
    ) {
      const fallbackFollowUp =
        new Date(
          new Date(
            latestAutomatic.receivedAt
          ).getTime() +
            7 *
              24 *
              60 *
              60 *
              1000
        ).toISOString();

      const proposed =
        latestAutomatic
          .followUpAt ??
        fallbackFollowUp;

      const current =
        context.nextFollowUpAt
          ? new Date(
              context.nextFollowUpAt
            ).getTime()
          : null;

      const proposedTime =
        new Date(
          proposed
        ).getTime();

      updates.next_follow_up_at =
        current &&
        current >
          proposedTime
          ? context.nextFollowUpAt
          : proposed;

      updates.smart_follow_up_mode =
        "OOO";

      updates.smart_follow_up_reason =
        "Follow-up postponed until after the out-of-office period.";

      updates.smart_follow_up_updated_at =
        new Date()
          .toISOString();
    }

    if (
      Object.keys(
        updates
      ).length ===
      0
    ) {
      continue;
    }

    const {
      error:
        leadUpdateError,
    } =
      await supabase
        .from(
          "leads"
        )
        .update(
          updates
        )
        .eq(
          "id",
          leadId
        )
        .eq(
          "user_id",
          userId
        );

    if (
      leadUpdateError
    ) {
      console.error(
        `Could not reconcile auto-reply CRM state for ${leadId}:`,
        leadUpdateError
      );

      continue;
    }

    reconciledLeads +=
      1;
  }

  return {
    repairedMessages,

    reconciledLeads,
  };
}

/* =========================================================
   SYNC GUARD
========================================================= */

export async function setGmailQuotaCooldownForCurrentUser() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    return;
  }

  const now =
    Date.now();

  const {
    error,
  } =
    await supabase
      .from(
        "gmail_sync_state"
      )
      .upsert(
        {
          user_id:
            user.id,

          cooldown_until:
            new Date(
              now +
                180_000
            ).toISOString(),

          lease_until:
            null,

          last_error:
            "GMAIL_QUOTA_COOLDOWN",

          updated_at:
            new Date(
              now
            ).toISOString(),
        },
        {
          onConflict:
            "user_id",
        }
      );

  if (
    error
  ) {
    console.warn(
      "Could not persist Gmail quota cooldown:",
      error.message
    );
  }
}

/* =========================================================
   SYNC
========================================================= */

export async function syncGmailRepliesForCurrentUser({
  mode = "manual",
}: {
  mode?: GmailSyncMode;
} = {}) {
  const supabase =
    await createClient();

  /* =======================================================
     USER
  ======================================================= */

  const {
    data: {
      user,
    },
    error:
      userError,
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
     SYNC CLAIM

     Server-side guard prevents multiple tabs, focus events
     and route reloads from starting expensive Gmail work at
     the same time.
  ======================================================= */

  const {
    data:
      claimRows,
    error:
      claimError,
  } =
    await supabase.rpc(
      "claim_gmail_sync",
      {
        p_force:
          mode ===
          "manual",
      }
    );

  if (
    claimError
  ) {
    throw new Error(
      `Could not claim Gmail sync: ${claimError.message}`
    );
  }

  const claim =
    Array.isArray(
      claimRows
    )
      ? claimRows[0]
      : claimRows;

  if (
    claim &&
    claim.allowed ===
      false
  ) {
    return {
      threadsChecked:
        0,

      messagesChecked:
        0,

      repliesFound:
        0,

      automaticReplies:
        0,

      newReplies:
        0,

      bounces:
        0,

      historicalClassified:
        0,

      repairedAutomaticReplies:
        0,

      reconciledAutomaticReplyLeads:
        0,

      skipped:
        true,

      skipReason:
        typeof claim.reason ===
        "string"
          ? claim.reason
          : "recent",
    };
  }

  /* =======================================================
     CONNECTION
  ======================================================= */

  const {
    data:
      connection,
    error:
      connectionError,
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
    connection
      .email_address
      .trim()
      .toLowerCase();

  /* =======================================================
     SENT OUTREACH
  ======================================================= */

  const outreachLookback =
    new Date(
      Date.now() -
        MESSAGE_LOOKBACK_DAYS *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  const {
    data:
      drafts,
    error:
      draftsError,
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
          ascending:
            false,
        }
      );

  if (
    draftsError
  ) {
    throw new Error(
      `Could not load sent outreach drafts: ${draftsError.message}`
    );
  }

  /* =======================================================
     LEADS
  ======================================================= */

  const {
    data:
      leads,
    error:
      leadsError,
  } =
    await supabase
      .from(
        "leads"
      )
      .select(`
        id,
        status,
        priority,
        next_follow_up_at,
        manual_follow_up_stopped_at,

        company:companies (
          id,
          name
        ),

        primary_contact:contacts (
          id,
          email,
          full_name
        )
      `)
      .eq(
        "user_id",
        user.id
      );

  if (
    leadsError
  ) {
    throw new Error(
      `Could not load lead contacts: ${leadsError.message}`
    );
  }

  /* =======================================================
     LOOKUPS
  ======================================================= */

  const latestDraftByLead =
    new Map<
      string,
      string
    >();

  for (
    const draft of
      drafts ??
      []
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

  const leadContextById =
    new Map<
      string,
      LeadContext
    >();

  const knownContactByEmail =
    new Map<
      string,
      LeadReference
    >();

  const domainReferences =
    new Map<
      string,
      LeadReference[]
    >();

  for (
    const lead of
      leads ??
      []
  ) {
    const contact =
      getSingleRelation(
        lead.primary_contact
      );

    const company =
      getSingleRelation(
        lead.company
      );

    leadContextById.set(
      lead.id,
      {
        companyName:
          company?.name ??
          null,

        contactName:
          contact?.full_name ??
          null,

        currentStatus:
          lead.status ??
          null,

        currentPriority:
          lead.priority ??
          null,

        nextFollowUpAt:
          lead.next_follow_up_at ??
          null,

        manualFollowUpStoppedAt:
          lead.manual_follow_up_stopped_at ??
          null,
      }
    );

    const email =
      contact?.email
        ?.trim()
        .toLowerCase();

    if (
      !email ||
      !isReasonableEmail(
        email
      )
    ) {
      continue;
    }

    const latestDraftId =
      latestDraftByLead.get(
        lead.id
      );

    /*
     * Only query Gmail for contacts that actually received
     * outreach inside the active lookback window. Searching
     * every lead in the CRM burns query units for no benefit.
     */
    if (
      !latestDraftId
    ) {
      continue;
    }

    const reference:
      LeadReference = {
      leadId:
        lead.id,

      draftId:
        latestDraftId,
    };

    knownContactByEmail.set(
      email,
      reference
    );

    const domain =
      getEmailDomain(
        email
      );

    if (
      !domain ||
      GENERIC_EMAIL_DOMAINS.has(
        domain
      )
    ) {
      continue;
    }

    const existing =
      domainReferences.get(
        domain
      ) ??
      [];

    existing.push(
      reference
    );

    domainReferences.set(
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
      domainReferences.entries()
  ) {
    const leadIds =
      new Set(
        references.map(
          (
            reference
          ) =>
            reference.leadId
        )
      );

    if (
      leadIds.size ===
        1
    ) {
      knownLeadByDomain.set(
        domain,
        references[0]
      );
    }
  }

  const historicalClassified =
    await backfillStoredReplyIntelligence({
      supabase,

      userId:
        user.id,

      leadContextById,
    });

  const autoReplyRepair =
    await repairRecentAutomaticReplies({
      supabase,

      userId:
        user.id,

      leadContextById,
    });

  /* =======================================================
     THREAD MAP
  ======================================================= */

  const threadMap =
    new Map<
      string,
      ThreadReference
    >();

  for (
    const draft of
      drafts ??
      []
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
     GMAIL
  ======================================================= */

  const refreshToken =
    decryptGmailToken(
      connection
        .encrypted_refresh_token
    );

  const oauth2Client =
    createGmailOAuthClient();

  oauth2Client.setCredentials({
    refresh_token:
      refreshToken,
  });

  const gmail =
    google.gmail({
      version:
        "v1",

      auth:
        oauth2Client,
    });

  /* =======================================================
     CANDIDATES
  ======================================================= */

  const candidateMessageIds =
    new Set<
      string
    >();

  const threadReferenceByMessageId =
    new Map<
      string,
      ThreadReference
    >();

  /* =======================================================
     EXISTING THREADS
  ======================================================= */

  const threadReferences =
    Array.from(
      threadMap.values()
    );

  const threadInspectionLimit =
    mode === "auto"
      ? AUTO_THREAD_INSPECTION_LIMIT
      : MANUAL_THREAD_INSPECTION_LIMIT;

  for (
    const reference of
      threadReferences.slice(
        0,
        threadInspectionLimit
      )
  ) {
    try {
      const response =
        await gmail
          .users
          .threads
          .get(
            {
              userId:
                "me",

              id:
                reference.threadId,

              format:
                "minimal",
            },
            {
              retry:
                false,
            }
          );

      for (
        const message of
          response
            .data
            .messages ??
          []
      ) {
        if (
          !message.id
        ) {
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
    } catch (
      error
    ) {
      const code =
        getErrorCode(
          error
        );

      if (
        code ===
          401 ||
        code ===
          403
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
     NEW THREADS
  ======================================================= */

  const searchTerms = [
    ...Array.from(
      knownContactByEmail.keys()
    ).map(
      (
        email
      ) =>
        `from:${email}`
    ),

    ...Array.from(
      knownLeadByDomain.keys()
    ).map(
      (
        domain
      ) =>
        `from:${domain}`
    ),
  ];

  const searchChunks =
    chunkArray(
      Array.from(
        new Set(
          searchTerms
        )
      ),
      SEARCH_TERM_CHUNK_SIZE
    );

  const searchPageLimit =
    mode === "auto"
      ? AUTO_SEARCH_PAGES
      : MAX_SEARCH_PAGES;

  for (
    const searchChunk of
      searchChunks
  ) {
    if (
      searchChunk.length ===
        0
    ) {
      continue;
    }

    const query =
      `newer_than:${MESSAGE_LOOKBACK_DAYS}d {${searchChunk.join(
        " "
      )}}`;

    let pageToken:
      string | undefined =
      undefined;

    for (
      let page =
        0;
      page <
        searchPageLimit;
      page +=
        1
    ) {
      const listData: {
        messages?:
          | Array<{
              id?:
                | string
                | null;
            }>
          | null;

        nextPageToken?:
          | string
          | null;
      } = (
        await gmail
          .users
          .messages
          .list(
            {
              userId:
                "me",

              q:
                query,

              maxResults:
                100,

              pageToken,
            },
            {
              retry:
                false,
            }
          )
      ).data;

      for (
        const message of
          listData.messages ??
          []
      ) {
        if (
          message.id
        ) {
          candidateMessageIds.add(
            message.id
          );
        }
      }

      pageToken =
        listData.nextPageToken ??
        undefined;

      if (
        !pageToken
      ) {
        break;
      }
    }
  }

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

      automaticReplies:
        0,

      newReplies:
        0,

      historicalClassified,
    };
  }

  /* =======================================================
     ALREADY STORED
  ======================================================= */

  const candidateIds =
    Array.from(
      candidateMessageIds
    );

  const existingMessageIds =
    new Set<
      string
    >();

  for (
    const chunk of
      chunkArray(
        candidateIds,
        100
      )
  ) {
    const {
      data,
      error,
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

    if (
      error
    ) {
      throw new Error(
        `Could not check existing inbox messages: ${error.message}`
      );
    }

    for (
      const message of
        data ??
        []
    ) {
      existingMessageIds.add(
        message.gmail_message_id
      );
    }
  }

  const unknownMessageIds =
    candidateIds.filter(
      (
        id
      ) =>
        !existingMessageIds.has(
          id
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

      automaticReplies:
        0,

      newReplies:
        0,

      historicalClassified,
    };
  }

  /* =======================================================
     FETCH + CLASSIFY
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
      const response =
        await gmail
          .users
          .messages
          .get(
            {
              userId:
                "me",

              id:
                messageId,

              format:
                "full",
            },
            {
              retry:
                false,
            }
          );

      message =
        response.data;
    } catch (
      error
    ) {
      const code =
        getErrorCode(
          error
        );

      if (
        code ===
          401 ||
        code ===
          403
      ) {
        throw error;
      }

      console.warn(
        `Could not fetch Gmail message ${messageId}:`,
        error
      );

      continue;
    }

    if (
      !message.id
    ) {
      continue;
    }

    const payload =
      message.payload as
        | GmailMessagePart
        | undefined;

    const from =
      parseEmailAddress(
        getHeader(
          payload,
          "From"
        )
      );

    const to =
      parseEmailAddress(
        getHeader(
          payload,
          "To"
        )
      );

    const subject =
      getHeader(
        payload,
        "Subject"
      );

    if (
      !from.email
    ) {
      continue;
    }

    if (
      from.email ===
        ownEmail
    ) {
      continue;
    }

    const hardBounce =
      isHardBounce({
        fromEmail:
          from.email,

        subject,
      });

    const failedRecipient =
      hardBounce
        ? (
            parseEmailAddress(
              getHeader(
                payload,
                "X-Failed-Recipients"
              ) ??
              getHeader(
                payload,
                "Final-Recipient"
              ) ??
              getHeader(
                payload,
                "Original-Recipient"
              )
            ).email
          )
        : null;

    /* =====================================================
       MATCH LEAD

       Bounces are allowed to continue here. If Gmail keeps
       the delivery failure in a known outreach thread we
       can safely attach it to that lead and surface it.
    ===================================================== */

    const threadReference =
      threadReferenceByMessageId.get(
        message.id
      );

    let leadReference:
      LeadReference | null =
      null;

    if (
      threadReference
    ) {
      leadReference = {
        leadId:
          threadReference.leadId,

        draftId:
          threadReference.draftId,
      };
    }

    if (
      !leadReference &&
      failedRecipient
    ) {
      leadReference =
        knownContactByEmail.get(
          failedRecipient
        ) ??
        null;
    }

    if (
      !leadReference
    ) {
      leadReference =
        knownContactByEmail.get(
          from.email
        ) ??
        null;
    }

    if (
      !leadReference
    ) {
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
          ) ??
          null;
      }
    }

    if (
      !leadReference
    ) {
      continue;
    }

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
      message.labelIds ??
      [];

    const bodyText =
      extractBody(
        payload,
        message.snippet
      );

    const automaticReply =
      isAutomaticReply({
        subject,

        body:
          bodyText,

        autoSubmitted:
          getHeader(
            payload,
            "Auto-Submitted"
          ),

        precedence:
          getHeader(
            payload,
            "Precedence"
          ),

        xAutoReply:
          getHeader(
            payload,
            "X-Autoreply"
          ),

        xAutorespond:
          getHeader(
            payload,
            "X-Autorespond"
          ),

        xAutoResponseSuppress:
          getHeader(
            payload,
            "X-Auto-Response-Suppress"
          ),
      });

    const leadContext =
      leadContextById.get(
        leadReference.leadId
      ) ??
      null;

    const intelligence =
      await classifyReplyIntelligence({
        subject,

        body:
          bodyText,

        fromEmail:
          from.email,

        fromName:
          from.name,

        companyName:
          leadContext?.companyName ??
          null,

        contactName:
          leadContext?.contactName ??
          null,

        receivedAt,

        automaticReply,

        hardBounce,
      });

    const intelligenceColumns =
      replyIntelligenceColumns({
        result:
          intelligence,

        automaticReply,
      });

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
        bodyText,

      received_at:
        receivedAt,

      is_unread:
        labels.includes(
          "UNREAD"
        ),

      attachments:
        collectAttachments(
          payload
        ),

      ...intelligenceColumns,
    });
  }

  const validMessages =
    parsedMessages.filter(
      (
        message
      ) =>
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

      automaticReplies:
        0,

      newReplies:
        0,

      historicalClassified,
    };
  }

  /* =======================================================
     STORE ALL INCOMING MESSAGES

     Automatic replies remain visible in the inbox. They are
     only excluded from "human reply" workflow changes.
  ======================================================= */

  const {
    error:
      insertError,
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

  if (
    insertError
  ) {
    throw new Error(
      `Could not save Gmail replies: ${insertError.message}`
    );
  }

  const incomingLeadIds =
    Array.from(
      new Set(
        validMessages.map(
          (
            message
          ) =>
            message.lead_id
        )
      )
    );

  const humanReplyMessages =
    validMessages.filter(
      (
        message
      ) =>
        !message.is_automatic_reply &&
        message.reply_classification !==
          "BOUNCE"
    );

  const automaticReplyMessages =
    validMessages.filter(
      (
        message
      ) =>
        message.is_automatic_reply
    );

  const bounceMessages =
    validMessages.filter(
      (
        message
      ) =>
        message.reply_classification ===
        "BOUNCE"
    );

  /* =======================================================
     RESTORE EVERY NEW INCOMING MAIL TO INBOX

     Automatic replies and technical bounces stay visible.
  ======================================================= */

  if (
    incomingLeadIds.length >
      0
  ) {
    const {
      error:
        inboxStateError,
    } =
      await supabase
        .from(
          "inbox_conversation_states"
        )
        .upsert(
          incomingLeadIds.map(
            (
              leadId
            ) => ({
              user_id:
                user.id,

              lead_id:
                leadId,

              state:
                "INBOX",

              archived_at:
                null,

              trashed_at:
                null,

              deleted_at:
                null,
            })
          ),
          {
            onConflict:
              "user_id,lead_id",
          }
        );

    if (
      inboxStateError
    ) {
      console.error(
        "Messages were synced but conversations could not be restored to inbox:",
        inboxStateError
      );
    }
  }

  /* =======================================================
     AI CRM AUTOMATION

     Safe rule:
     - no automatic reply is ever sent
     - low-confidence intent never causes an aggressive CRM
       status change
     - a normal human reply still stops the old cold-email
       sequence, matching the previous Leadbase behavior
  ======================================================= */

  const latestNewMessageByLead =
    new Map<
      string,
      ParsedIncomingMessage
    >();

  for (
    const message of
      validMessages
  ) {
    const current =
      latestNewMessageByLead.get(
        message.lead_id
      );

    if (
      !current ||
      new Date(
        message.received_at
      ).getTime() >
        new Date(
          current.received_at
        ).getTime()
    ) {
      latestNewMessageByLead.set(
        message.lead_id,
        message
      );
    }
  }

  for (
    const [
      leadId,
      message,
    ] of
      latestNewMessageByLead.entries()
  ) {
    const classification =
      message.reply_classification;

    const confidence =
      message.reply_classification_confidence;

    const leadContext =
      leadContextById.get(
        leadId
      ) ??
      null;

    const cancelledAt =
      new Date()
        .toISOString();

    /* -----------------------------------------------------
       BOUNCE
    ----------------------------------------------------- */

    if (
      classification ===
      "BOUNCE"
    ) {
      const {
        error:
          scheduledCancellationError,
      } =
        await supabase
          .from(
            "scheduled_emails"
          )
          .update({
            status:
              "CANCELLED",

            cancelled_at:
              cancelledAt,

            last_error:
              "Cancelled automatically because the latest customer email was classified as a bounce.",
          })
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "lead_id",
            leadId
          )
          .eq(
            "status",
            "SCHEDULED"
          );

      if (
        scheduledCancellationError
      ) {
        console.error(
          "Bounce was stored but scheduled emails could not be cancelled:",
          scheduledCancellationError
        );
      }

      const {
        error:
          bounceFollowUpError,
      } =
        await supabase
          .from(
            "leads"
          )
          .update({
            next_follow_up_at:
              null,

            smart_follow_up_mode:
              "STOPPED",

            smart_follow_up_reason:
              "Follow-up stopped because the email bounced.",

            smart_follow_up_updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "id",
            leadId
          );

      if (
        bounceFollowUpError
      ) {
        console.error(
          "Bounce was stored but follow-up could not be stopped:",
          bounceFollowUpError
        );
      }

      continue;
    }

    /* -----------------------------------------------------
       AUTOMATIC REPLY

       Only an actual OOO may postpone the next follow-up.
       Generic auto acknowledgements stay informational.
    ----------------------------------------------------- */

    if (
      message.is_automatic_reply
    ) {
      if (
        classification ===
        "OUT_OF_OFFICE" &&
        !leadContext?.manualFollowUpStoppedAt
      ) {
        const fallbackDate =
          new Date(
            Date.now() +
              7 *
                24 *
                60 *
                60 *
                1000
          ).toISOString();

        const proposedFollowUp =
          message.reply_follow_up_at ??
          fallbackDate;

        const currentFollowUp =
          leadContext?.nextFollowUpAt
            ? new Date(
                leadContext.nextFollowUpAt
              ).getTime()
            : null;

        const proposedTime =
          new Date(
            proposedFollowUp
          ).getTime();

        /*
         * Never pull an existing follow-up earlier because
         * of an OOO message.
         */
        const nextFollowUp =
          currentFollowUp &&
          currentFollowUp >
            proposedTime
            ? leadContext
                ?.nextFollowUpAt ??
              proposedFollowUp
            : proposedFollowUp;

        const {
          error:
            oooUpdateError,
        } =
          await supabase
            .from(
              "leads"
            )
            .update({
              next_follow_up_at:
                nextFollowUp,

              smart_follow_up_mode:
                "OOO",

              smart_follow_up_reason:
                "Follow-up postponed until after the out-of-office period.",

              smart_follow_up_updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "id",
              leadId
            )
            .not(
              "status",
              "in",
              '("WON","LOST","DO_NOT_CONTACT")'
            );

        if (
          oooUpdateError
        ) {
          console.error(
            "OOO reply was stored but follow-up date could not be postponed:",
            oooUpdateError
          );
        }
      }

      continue;
    }

    /* -----------------------------------------------------
       HUMAN REPLY BASELINE

       A real customer response stops the old cold outreach
       schedule. A later-contact request can then set a new
       CRM follow-up date below.
    ----------------------------------------------------- */

    const {
      error:
        scheduledCancellationError,
    } =
      await supabase
        .from(
          "scheduled_emails"
        )
        .update({
          status:
            "CANCELLED",

          cancelled_at:
            cancelledAt,

          last_error:
            `Cancelled automatically after human reply classified as ${classification}.`,
        })
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "lead_id",
          leadId
        )
        .eq(
          "status",
          "SCHEDULED"
        );

    if (
      scheduledCancellationError
    ) {
      console.error(
        "Human reply was stored but scheduled emails could not be cancelled:",
        scheduledCancellationError
      );
    }

    let nextFollowUp:
      string | null =
      null;

    if (
      classification ===
        "FOLLOW_UP_LATER" &&
      confidence >=
        0.7 &&
      message.reply_follow_up_at
    ) {
      nextFollowUp =
        message.reply_follow_up_at;
    }

    const {
      error:
        followUpError,
    } =
      await supabase
        .from(
          "leads"
        )
        .update({
          next_follow_up_at:
            nextFollowUp,

          smart_follow_up_mode:
            nextFollowUp
              ? "REQUESTED"
              : "STOPPED",

          smart_follow_up_reason:
            nextFollowUp
              ? "Customer explicitly requested to be contacted again later."
              : "Cold follow-up stopped because a real customer reply was received.",

          smart_follow_up_updated_at:
            new Date()
              .toISOString(),

          ...(nextFollowUp
            ? {
                manual_follow_up_stopped_at:
                  null,
              }
            : {}),
        })
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "id",
          leadId
        );

    if (
      followUpError
    ) {
      console.error(
        "Human reply was stored but follow-up state could not be updated:",
        followUpError
      );
    }

    /* -----------------------------------------------------
       STATUS

       Normal human answer -> REPLIED.

       Clear high-confidence rejection -> LOST.

       Advanced pipeline states are never downgraded.
    ----------------------------------------------------- */

    const targetStatus =
      classification ===
        "NOT_INTERESTED" &&
      confidence >=
        0.82
        ? "LOST"
        : "REPLIED";

    const statusSourceStates =
      targetStatus ===
        "LOST"
        ? [
            "NEW",
            "RESEARCHING",
            "QUALIFIED",
            "DRAFT_READY",
            "CONTACTED",
            "REPLIED",
          ]
        : [
            "NEW",
            "RESEARCHING",
            "QUALIFIED",
            "DRAFT_READY",
            "CONTACTED",
          ];

    const {
      error:
        statusError,
    } =
      await supabase
        .from(
          "leads"
        )
        .update({
          status:
            targetStatus,
        })
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "id",
          leadId
        )
        .in(
          "status",
          statusSourceStates
        );

    if (
      statusError
    ) {
      console.error(
        "Reply was stored but lead status could not be updated:",
        statusError
      );
    }

    /* -----------------------------------------------------
       PRIORITY

       Positive interest and genuine questions are strong
       action signals, but only when classification is
       reasonably confident.
    ----------------------------------------------------- */

    if (
      (
        classification ===
          "INTERESTED" ||
        classification ===
          "QUESTION"
      ) &&
      confidence >=
        0.72
    ) {
      const {
        error:
          priorityError,
      } =
        await supabase
          .from(
            "leads"
          )
          .update({
            priority:
              "HIGH",
          })
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "id",
            leadId
          )
          .not(
            "status",
            "in",
            '("WON","LOST","DO_NOT_CONTACT")'
          );

      if (
        priorityError
      ) {
        console.error(
          "Interested/question reply was stored but priority could not be raised:",
          priorityError
        );
      }
    }
  }

  return {
    threadsChecked:
      threadMap.size,

    messagesChecked:
      unknownMessageIds.length,

    repliesFound:
      humanReplyMessages.length,

    automaticReplies:
      automaticReplyMessages.length,

    newReplies:
      validMessages.length,

    bounces:
      bounceMessages.length,

    historicalClassified,

    repairedAutomaticReplies:
      autoReplyRepair.repairedMessages,

    reconciledAutomaticReplyLeads:
      autoReplyRepair.reconciledLeads,
  };
}
