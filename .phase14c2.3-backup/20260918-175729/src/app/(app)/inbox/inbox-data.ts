import "server-only";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

export type InboxView =
  | "inbox"
  | "archived"
  | "trash";

export type ConversationState =
  | "INBOX"
  | "ARCHIVED"
  | "TRASH"
  | "DELETED";

export type TimelineAttachment = {
  name: string;

  type: string;

  size: number;

  gmailMessageId:
    | string
    | null;
};

export type TimelineMessage = {
  id: string;

  direction:
    | "incoming"
    | "outgoing";

  sender: string;

  email: string;

  subject:
    | string
    | null;

  body: string;

  date: string;

  attachments:
    TimelineAttachment[];
};

export type Conversation = {
  leadId: string;

  company: string;

  contact: string;

  email:
    | string
    | null;

  subject: string;

  preview: string;

  lastDate: string;

  unread: boolean;

  unreadCount: number;

  status:
    | "Replied"
    | "Sent";

  state:
    ConversationState;

  nextFollowUpAt:
    | string
    | null;

  replyToMessageId:
    | string
    | null;

  replyRecipientName:
    | string
    | null;

  replyRecipientEmail:
    | string
    | null;

  timeline:
    TimelineMessage[];
};

export type InboxSearchParams = {
  lead?:
    | string
    | string[];

  q?:
    | string
    | string[];

  sync?:
    | string
    | string[];

  new?:
    | string
    | string[];

  reply?:
    | string
    | string[];

  view?:
    | string
    | string[];
};

export type InboxData = {
  currentView:
    InboxView;

  requestedLeadId:
    string;

  rawQuery:
    string;

  syncStatus:
    string;

  replyStatus:
    string;

  newReplies:
    number;

  gmailReadReady:
    boolean;

  gmailSendReady:
    boolean;

  inboxCount:
    number;

  archivedCount:
    number;

  trashCount:
    number;

  filtered:
    Conversation[];

  selected:
    | Conversation
    | null;

  cleanStatusHref:
    string;
};

/* =========================================================
   RELATION
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

/* =========================================================
   QUERY VALUE
========================================================= */

export function getQueryValue(
  value:
    | string
    | string[]
    | undefined
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      ""
    );
  }

  return (
    value ??
    ""
  );
}

/* =========================================================
   VIEW
========================================================= */

export function parseInboxView(
  value: string
): InboxView {
  if (
    value ===
    "archived"
  ) {
    return "archived";
  }

  if (
    value ===
    "trash"
  ) {
    return "trash";
  }

  return "inbox";
}

function stateForView(
  view:
    InboxView
): ConversationState {
  if (
    view ===
    "archived"
  ) {
    return "ARCHIVED";
  }

  if (
    view ===
    "trash"
  ) {
    return "TRASH";
  }

  return "INBOX";
}

/* =========================================================
   PREVIEW
========================================================= */

function compactPreview(
  value: string
) {
  return value
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .slice(
      0,
      180
    );
}

/* =========================================================
   TIME
========================================================= */

function timestamp(
  value:
    | string
    | null
    | undefined
) {
  if (
    !value
  ) {
    return 0;
  }

  const result =
    new Date(
      value
    ).getTime();

  return Number.isFinite(
    result
  )
    ? result
    : 0;
}

/* =========================================================
   ATTACHMENTS
========================================================= */

function parseAttachments(
  value: unknown,

  gmailMessageId:
    | string
    | null
): TimelineAttachment[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  const result:
    TimelineAttachment[] =
    [];

  for (
    const item of
    value
  ) {
    if (
      typeof item !==
        "object" ||
      item ===
        null
    ) {
      continue;
    }

    const record =
      item as Record<
        string,
        unknown
      >;

    if (
      typeof record.name !==
      "string"
    ) {
      continue;
    }

    result.push({
      name:
        record.name,

      type:
        typeof record.type ===
        "string"
          ? record.type
          : "application/octet-stream",

      size:
        typeof record.size ===
        "number"
          ? record.size
          : 0,

      gmailMessageId,
    });
  }

  return result;
}

/* =========================================================
   URL
========================================================= */

export function buildInboxHref({
  view,
  leadId,
  q,
}: {
  view:
    InboxView;

  leadId?:
    string;

  q?:
    string;
}) {
  const search =
    new URLSearchParams();

  if (
    view !==
    "inbox"
  ) {
    search.set(
      "view",
      view
    );
  }

  if (
    leadId
  ) {
    search.set(
      "lead",
      leadId
    );
  }

  if (
    q
  ) {
    search.set(
      "q",
      q
    );
  }

  const query =
    search.toString();

  return query
    ? `/inbox?${query}`
    : "/inbox";
}

/* =========================================================
   INITIALS
========================================================= */

export function getInitials(
  value: string
) {
  return (
    value
      .split(
        /\s+/
      )
      .filter(
        Boolean
      )
      .slice(
        0,
        2
      )
      .map(
        (
          word
        ) =>
          word
            .charAt(
              0
            )
            .toUpperCase()
      )
      .join("") ||
    "?"
  );
}

/* =========================================================
   DATE
========================================================= */

export function formatConversationTime(
  value: string
) {
  const date =
    new Date(
      value
    );

  const now =
    new Date();

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Berlin",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    );

  if (
    formatter.format(
      date
    ) ===
    formatter.format(
      now
    )
  ) {
    return new Intl.DateTimeFormat(
      "de-DE",
      {
        timeZone:
          "Europe/Berlin",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      date
    );
  }

  return new Intl.DateTimeFormat(
    "de-DE",
    {
      timeZone:
        "Europe/Berlin",

      day:
        "2-digit",

      month:
        "short",
    }
  ).format(
    date
  );
}

/* =========================================================
   LOAD
========================================================= */

export async function loadInboxData(
  params:
    InboxSearchParams
): Promise<InboxData> {
  const requestedLeadId =
    getQueryValue(
      params.lead
    );

  const rawQuery =
    getQueryValue(
      params.q
    ).trim();

  const query =
    rawQuery
      .toLowerCase();

  const syncStatus =
    getQueryValue(
      params.sync
    );

  const replyStatus =
    getQueryValue(
      params.reply
    );

  const newReplies =
    Number(
      getQueryValue(
        params.new
      ) ||
      0
    );

  const currentView =
    parseInboxView(
      getQueryValue(
        params.view
      )
    );

  const desiredState =
    stateForView(
      currentView
    );

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
    redirect(
      "/login"
    );
  }

  /* =======================================================
     TRASH RETENTION
  ======================================================= */

  const {
    data:
      preferences,
  } =
    await supabase
      .from(
        "inbox_preferences"
      )
      .select(
        "trash_retention_days"
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  const retentionDays =
    preferences
      ? preferences
          .trash_retention_days
      : 30;

  if (
    retentionDays !==
    null
  ) {
    const cutoff =
      new Date(
        Date.now() -
          retentionDays *
            24 *
            60 *
            60 *
            1000
      ).toISOString();

    const {
      error:
        cleanupError,
    } =
      await supabase
        .from(
          "inbox_conversation_states"
        )
        .update({
          state:
            "DELETED",

          deleted_at:
            new Date()
              .toISOString(),

          trashed_at:
            null,
        })
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "state",
          "TRASH"
        )
        .lt(
          "trashed_at",
          cutoff
        );

    if (
      cleanupError
    ) {
      console.error(
        "Could not automatically clean trash:",
        cleanupError
      );
    }
  }

  /* =======================================================
     LOAD DATABASE DATA
  ======================================================= */

  const [
    draftsResult,
    messagesResult,
    gmailResult,
    statesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "outreach_drafts"
        )
        .select(`
          id,
          lead_id,
          subject,
          body,
          sent_at,
          follow_up_body,
          follow_up_sent_at,

          lead:leads (
            id,
            status,
            next_follow_up_at,

            company:companies (
              id,
              name
            ),

            primary_contact:contacts (
              id,
              full_name,
              email
            )
          )
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "SENT"
        )
        .not(
          "sent_at",
          "is",
          null
        )
        .order(
          "sent_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "email_messages"
        )
        .select(`
          id,
          lead_id,
          outreach_draft_id,
          gmail_message_id,
          gmail_thread_id,
          direction,
          from_name,
          from_email,
          to_email,
          subject,
          body_text,
          received_at,
          is_unread,
          read_at,
          attachments
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "received_at",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "gmail_connections"
        )
        .select(`
          email_address,
          scopes
        `)
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle(),

      supabase
        .from(
          "inbox_conversation_states"
        )
        .select(`
          lead_id,
          state,
          archived_at,
          trashed_at,
          deleted_at
        `)
        .eq(
          "user_id",
          user.id
        ),
    ]);

  /* =======================================================
     ERRORS
  ======================================================= */

  if (
    draftsResult.error
  ) {
    console.error(
      "Could not load outreach:",
      draftsResult.error
    );
  }

  if (
    messagesResult.error
  ) {
    console.error(
      "Could not load messages:",
      messagesResult.error
    );
  }

  if (
    gmailResult.error
  ) {
    console.error(
      "Could not load Gmail:",
      gmailResult.error
    );
  }

  if (
    statesResult.error
  ) {
    console.error(
      "Could not load inbox states:",
      statesResult.error
    );
  }

  /* =======================================================
     CONNECTION
  ======================================================= */

  const drafts =
    draftsResult.data ??
    [];

  const emailMessages =
    messagesResult.data ??
    [];

  const gmailConnection =
    gmailResult.data;

  const scopes =
    Array.isArray(
      gmailConnection
        ?.scopes
    )
      ? gmailConnection.scopes
      : [];

  const gmailReadReady =
    scopes.includes(
      "https://www.googleapis.com/auth/gmail.readonly"
    );

  const gmailSendReady =
    scopes.includes(
      "https://www.googleapis.com/auth/gmail.send"
    );

  const senderEmail =
    gmailConnection
      ?.email_address ??
    "hello@joelcimpean.com";

  /* =======================================================
     STATES
  ======================================================= */

  const stateByLead =
    new Map<
      string,
      ConversationState
    >();

  for (
    const state of
      statesResult.data ??
      []
  ) {
    stateByLead.set(
      state.lead_id,
      state.state as
        ConversationState
    );
  }

  /* =======================================================
     DRAFT INDEX
  ======================================================= */

  const latestDraftByLead =
    new Map<
      string,
      (typeof drafts)[number]
    >();

  for (
    const draft of
      drafts
  ) {
    if (
      !latestDraftByLead.has(
        draft.lead_id
      )
    ) {
      latestDraftByLead.set(
        draft.lead_id,
        draft
      );
    }
  }

  /* =======================================================
     MESSAGE INDEX
  ======================================================= */

  const messagesByLead =
    new Map<
      string,
      typeof emailMessages
    >();

  for (
    const message of
      emailMessages
  ) {
    const existing =
      messagesByLead.get(
        message.lead_id
      ) ??
      [];

    existing.push(
      message
    );

    messagesByLead.set(
      message.lead_id,
      existing
    );
  }

  /* =======================================================
     CONVERSATIONS
  ======================================================= */

  const conversations =
    new Map<
      string,
      Conversation
    >();

  /* =======================================================
     OUTREACH THREADS
  ======================================================= */

  for (
    const draft of
      latestDraftByLead.values()
  ) {
    const lead =
      getSingleRelation(
        draft.lead
      );

    if (
      !lead
    ) {
      continue;
    }

    const company =
      getSingleRelation(
        lead.company
      );

    const contact =
      getSingleRelation(
        lead.primary_contact
      );

    const stored =
      [
        ...(
          messagesByLead.get(
            lead.id
          ) ??
          []
        ),
      ].sort(
        (
          a,
          b
        ) =>
          timestamp(
            a.received_at
          ) -
          timestamp(
            b.received_at
          )
      );

    const incoming =
      stored.filter(
        (
          message
        ) =>
          message.direction ===
          "INCOMING"
      );

    const outgoing =
      stored.filter(
        (
          message
        ) =>
          message.direction ===
          "OUTGOING"
      );

    const latestIncoming =
      incoming.at(
        -1
      ) ??
      null;

    const timeline:
      TimelineMessage[] =
      [];

    /* ORIGINAL OUTREACH */

    if (
      draft.sent_at
    ) {
      timeline.push({
        id:
          `original-${draft.id}`,

        direction:
          "outgoing",

        sender:
          "Joel Cimpean",

        email:
          senderEmail,

        subject:
          draft.subject,

        body:
          draft.body,

        date:
          draft.sent_at,

        attachments:
          [],
      });
    }

    /* FOLLOW UP */

    if (
      draft.follow_up_sent_at &&
      draft.follow_up_body
    ) {
      timeline.push({
        id:
          `follow-${draft.id}`,

        direction:
          "outgoing",

        sender:
          "Joel Cimpean",

        email:
          senderEmail,

        subject:
          draft.subject,

        body:
          draft.follow_up_body,

        date:
          draft.follow_up_sent_at,

        attachments:
          [],
      });
    }

    /* INCOMING */

    for (
      const message of
        incoming
    ) {
      timeline.push({
        id:
          message.id,

        direction:
          "incoming",

        sender:
          message.from_name ??
          contact
            ?.full_name ??
          message.from_email,

        email:
          message.from_email,

        subject:
          message.subject,

        body:
          message.body_text,

        date:
          message.received_at,

        attachments:
          parseAttachments(
            message.attachments,
            message.gmail_message_id
          ),
      });
    }

    /* OUTGOING REPLIES */

    for (
      const message of
        outgoing
    ) {
      timeline.push({
        id:
          message.id,

        direction:
          "outgoing",

        sender:
          message.from_name ??
          "Joel Cimpean",

        email:
          message.from_email,

        subject:
          message.subject,

        body:
          message.body_text,

        date:
          message.received_at,

        attachments:
          parseAttachments(
            message.attachments,
            message.gmail_message_id
          ),
      });
    }

    timeline.sort(
      (
        a,
        b
      ) =>
        timestamp(
          a.date
        ) -
        timestamp(
          b.date
        )
    );

    const latestTimeline =
      timeline.at(
        -1
      ) ??
      null;

    const unreadCount =
      incoming.filter(
        (
          message
        ) =>
          !message.read_at
      ).length;

    conversations.set(
      lead.id,
      {
        leadId:
          lead.id,

        company:
          company?.name ??
          "Unknown company",

        contact:
          contact?.full_name ??
          latestIncoming
            ?.from_name ??
          "Company inbox",

        email:
          contact?.email ??
          latestIncoming
            ?.from_email ??
          null,

        subject:
          draft.subject ??
          latestIncoming
            ?.subject ??
          "Outreach",

        preview:
          latestTimeline
            ? compactPreview(
                latestTimeline.body
              )
            : compactPreview(
                draft.body
              ),

        lastDate:
          latestTimeline
            ?.date ??
          draft.sent_at ??
          new Date(
            0
          ).toISOString(),

        unread:
          unreadCount >
          0,

        unreadCount,

        status:
          incoming.length >
          0
            ? "Replied"
            : "Sent",

        state:
          stateByLead.get(
            lead.id
          ) ??
          "INBOX",

        nextFollowUpAt:
          lead.next_follow_up_at,

        replyToMessageId:
          latestIncoming
            ?.id ??
          null,

        replyRecipientName:
          latestIncoming
            ?.from_name ??
          contact?.full_name ??
          null,

        replyRecipientEmail:
          latestIncoming
            ?.from_email ??
          contact?.email ??
          null,

        timeline,
      }
    );
  }

  /* =======================================================
     INBOUND-ONLY THREADS
  ======================================================= */

  for (
    const [
      leadId,
      leadMessages,
    ] of
      messagesByLead.entries()
  ) {
    if (
      conversations.has(
        leadId
      )
    ) {
      continue;
    }

    const incoming =
      leadMessages.filter(
        (
          message
        ) =>
          message.direction ===
          "INCOMING"
      );

    if (
      incoming.length ===
      0
    ) {
      continue;
    }

    const {
      data:
        lead,
    } =
      await supabase
        .from(
          "leads"
        )
        .select(`
          id,
          next_follow_up_at,

          company:companies (
            id,
            name
          ),

          primary_contact:contacts (
            id,
            full_name,
            email
          )
        `)
        .eq(
          "id",
          leadId
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      !lead
    ) {
      continue;
    }

    const company =
      getSingleRelation(
        lead.company
      );

    const contact =
      getSingleRelation(
        lead.primary_contact
      );

    const sorted =
      [
        ...leadMessages,
      ].sort(
        (
          a,
          b
        ) =>
          timestamp(
            a.received_at
          ) -
          timestamp(
            b.received_at
          )
      );

    const sortedIncoming =
      sorted.filter(
        (
          message
        ) =>
          message.direction ===
          "INCOMING"
      );

    const latestIncoming =
      sortedIncoming.at(
        -1
      )!;

    const timeline:
      TimelineMessage[] =
      sorted.map(
        (
          message
        ) => ({
          id:
            message.id,

          direction:
            message.direction ===
            "OUTGOING"
              ? "outgoing"
              : "incoming",

          sender:
            message.direction ===
            "OUTGOING"
              ? message.from_name ??
                "Joel Cimpean"
              : message.from_name ??
                contact
                  ?.full_name ??
                message.from_email,

          email:
            message.from_email,

          subject:
            message.subject,

          body:
            message.body_text,

          date:
            message.received_at,

          attachments:
            parseAttachments(
              message.attachments,
              message.gmail_message_id
            ),
        })
      );

    const unreadCount =
      sortedIncoming.filter(
        (
          message
        ) =>
          !message.read_at
      ).length;

    conversations.set(
      leadId,
      {
        leadId,

        company:
          company?.name ??
          "Unknown company",

        contact:
          contact?.full_name ??
          latestIncoming
            .from_name ??
          "Company inbox",

        email:
          latestIncoming
            .from_email,

        subject:
          sortedIncoming[0]
            ?.subject ??
          "Email",

        preview:
          compactPreview(
            timeline.at(
              -1
            )?.body ??
            ""
          ),

        lastDate:
          timeline.at(
            -1
          )?.date ??
          latestIncoming
            .received_at,

        unread:
          unreadCount >
          0,

        unreadCount,

        status:
          "Replied",

        state:
          stateByLead.get(
            leadId
          ) ??
          "INBOX",

        nextFollowUpAt:
          lead.next_follow_up_at,

        replyToMessageId:
          latestIncoming.id,

        replyRecipientName:
          latestIncoming
            .from_name ??
          contact?.full_name ??
          null,

        replyRecipientEmail:
          latestIncoming
            .from_email,

        timeline,
      }
    );
  }

  /* =======================================================
     SORT
  ======================================================= */

  const allConversations =
    Array.from(
      conversations.values()
    )
      .filter(
        (
          conversation
        ) =>
          conversation.state !==
          "DELETED"
      )
      .sort(
        (
          a,
          b
        ) =>
          timestamp(
            b.lastDate
          ) -
          timestamp(
            a.lastDate
          )
      );

  /* =======================================================
     COUNTS
  ======================================================= */

  const inboxCount =
    allConversations.filter(
      (
        conversation
      ) =>
        conversation.state ===
        "INBOX"
    ).length;

  const archivedCount =
    allConversations.filter(
      (
        conversation
      ) =>
        conversation.state ===
        "ARCHIVED"
    ).length;

  const trashCount =
    allConversations.filter(
      (
        conversation
      ) =>
        conversation.state ===
        "TRASH"
    ).length;

  /* =======================================================
     CURRENT FOLDER
  ======================================================= */

  const folderConversations =
    allConversations.filter(
      (
        conversation
      ) =>
        conversation.state ===
        desiredState
    );

  /* =======================================================
     SEARCH
  ======================================================= */

  const filtered =
    query
      ? folderConversations.filter(
          (
            conversation
          ) =>
            [
              conversation.company,
              conversation.contact,
              conversation.email,
              conversation.subject,
              conversation.preview,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .toLowerCase()
              .includes(
                query
              )
        )
      : folderConversations;

  /* =======================================================
     SELECTED
  ======================================================= */

  const selected =
    filtered.find(
      (
        conversation
      ) =>
        conversation.leadId ===
        requestedLeadId
    ) ??
    filtered[0] ??
    null;

  /* =======================================================
     CLEAN STATUS URL
  ======================================================= */

  const cleanStatusHref =
    buildInboxHref({
      view:
        currentView,

      leadId:
        requestedLeadId ||
        undefined,

      q:
        rawQuery ||
        undefined,
    });

  return {
    currentView,
    requestedLeadId,
    rawQuery,
    syncStatus,
    replyStatus,
    newReplies,
    gmailReadReady,
    gmailSendReady,
    inboxCount,
    archivedCount,
    trashCount,
    filtered,
    selected,
    cleanStatusHref,
  };
}