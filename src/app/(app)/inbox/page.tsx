/* eslint-disable @next/next/no-img-element */

import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  Download,
  FileText,
  Inbox,
  Mail,
  MailCheck,
  MailOpen,
  Paperclip,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";

import Link from "next/link";

import {
  cookies,
} from "next/headers";

import {
  redirect,
} from "next/navigation";

import {
  archiveLeadConversation,
  emptyTrash,
  markLeadConversationReadFromForm,
  markLeadConversationUnreadFromForm,
  moveLeadConversationToTrash,
  permanentlyDeleteLeadConversation,
  restoreLeadConversation,
} from "./actions";

import {
  type InboxConversationListItem,
} from "./conversation-list";

import {
  InboxListPane,
} from "./inbox-list-pane";

import {
  ReplyComposer,
} from "./reply-composer";

import {
  InboxStatusBanner,
} from "./status-banner";

import {
  SyncInboxButton,
} from "./sync-button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  PendingSubmitButton,
} from "@/components/pending-submit-button";

import {
  Separator,
} from "@/components/ui/separator";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

import {
  APP_LANGUAGE_COOKIE,
  type AppLanguage,
} from "@/lib/i18n";

import {
  inboxCopy,
} from "@/lib/inbox-i18n";

import type {
  ReplyClassification,
} from "@/lib/reply-intelligence";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type InboxView =
  | "inbox"
  | "archived"
  | "trash";

type ConversationState =
  | "INBOX"
  | "ARCHIVED"
  | "TRASH"
  | "DELETED";

type InboxSearchParams = {
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

type InboxPageProps = {
  searchParams?:
    Promise<InboxSearchParams>;
};

type TimelineAttachment = {
  name: string;

  type: string;

  size: number;

  gmailMessageId:
    | string
    | null;
};

type TimelineMessage = {
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

  classification:
    ReplyClassification
    | null;

  classificationConfidence:
    number
    | null;

  classificationReason:
    string
    | null;

  followUpAt:
    string
    | null;

  detectedDateText:
    string
    | null;

  alternativeContactName:
    string
    | null;

  alternativeContactEmail:
    string
    | null;

  automaticReply:
    boolean;
};

type Conversation = {
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

  replyClassification:
    ReplyClassification
    | null;

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

function getQueryValue(
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

function parseInboxView(
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

function getInitials(
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

function normalizeSubject(
  value:
    | string
    | null
    | undefined
) {
  return (
    value ??
    ""
  )
    .replace(
      /^(?:(?:re|aw|fw|fwd)\s*:\s*)+/i,
      ""
    )
    .trim()
    .toLowerCase();
}

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

function buildInboxHref({
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

function formatConversationTime(
  value: string,
  language:
    AppLanguage
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
      language ===
        "de"
        ? "de-DE"
        : "en-GB",
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
    language ===
      "de"
      ? "de-DE"
      : "en-GB",
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

function formatFullDate(
  value: string,
  language:
    AppLanguage
) {
  return new Intl.DateTimeFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-GB",
    {
      timeZone:
        "Europe/Berlin",

      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

function getReplyIntelligenceMeta(
  classification:
    ReplyClassification,
  language:
    AppLanguage
) {
  const de =
    language ===
    "de";

  switch (
    classification
  ) {
    case "INTERESTED":
      return {
        label:
          de
            ? "Interessiert"
            : "Interested",

        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
      };

    case "QUESTION":
      return {
        label:
          de
            ? "Rückfrage"
            : "Question",

        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
      };

    case "NOT_INTERESTED":
      return {
        label:
          de
            ? "Absage"
            : "Not interested",

        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
      };

    case "OUT_OF_OFFICE":
      return {
        label:
          de
            ? "Abwesend"
            : "Out of office",

        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
      };

    case "FOLLOW_UP_LATER":
      return {
        label:
          de
            ? "Später melden"
            : "Follow up later",

        className:
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300",
      };

    case "BOUNCE":
      return {
        label:
          "Bounce",

        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
      };

    default:
      return {
        label:
          de
            ? "Neutral"
            : "Neutral",

        className:
          "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
      };
  }
}

function formatFileSize(
  bytes: number
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(
    1
  )} MB`;
}

function messageStatusClass(
  status: string
) {
  if (
    status ===
    "Replied"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
}

/* =========================================================
   ARCHIVE THREAD + RETURN TO INBOX HOME
========================================================= */

async function archiveConversationAndReturnToInbox(
  leadId: string
) {
  "use server";

  await archiveLeadConversation(
    leadId
  );

  redirect(
    "/inbox"
  );
}

/* =========================================================
   PAGE
========================================================= */

export default async function InboxPage({
  searchParams,
}: InboxPageProps) {
  /* =======================================================
     SEARCH PARAMS

     Explicit typing here fixes the six TS2339 errors.
  ======================================================= */

  const params:
    InboxSearchParams =
    searchParams
      ? await searchParams
      : {};

  /* =======================================================
     LANGUAGE

     Read the same cookie that LanguageProvider writes.
     router.refresh() makes this server component receive
     the newly selected language automatically.
  ======================================================= */

  const cookieStore =
    await cookies();

  const storedLanguage =
    cookieStore.get(
      APP_LANGUAGE_COOKIE
    )?.value;

  const language:
    AppLanguage =
    storedLanguage ===
    "de"
      ? "de"
      : "en";

  const text =
    inboxCopy[
      language
    ].page;

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
     LOAD DATA
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
          attachments,
          is_automatic_reply,
          reply_classification,
          reply_classification_confidence,
          reply_classification_reason,
          reply_follow_up_at,
          reply_detected_date_text,
          reply_alternative_contact_name,
          reply_alternative_contact_email
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
     INDEX DATA
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

  const conversations =
    new Map<
      string,
      Conversation
    >();

  /* =======================================================
     OUTREACH CONVERSATIONS
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

    const humanIncoming =
      incoming.filter(
        (
          message
        ) =>
          !message.is_automatic_reply &&
          message.reply_classification !==
            "BOUNCE"
      );

    const timeline:
      TimelineMessage[] =
      [];

    /* =====================================================
       ORIGINAL OUTREACH
    ===================================================== */

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

        classification:
          null,

        classificationConfidence:
          null,

        classificationReason:
          null,

        followUpAt:
          null,

        detectedDateText:
          null,

        alternativeContactName:
          null,

        alternativeContactEmail:
          null,

        automaticReply:
          false,
      });
    }

    /* =====================================================
       FOLLOW UP
    ===================================================== */

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

        classification:
          null,

        classificationConfidence:
          null,

        classificationReason:
          null,

        followUpAt:
          null,

        detectedDateText:
          null,

        alternativeContactName:
          null,

        alternativeContactEmail:
          null,

        automaticReply:
          false,
      });
    }

    /* =====================================================
       INCOMING
    ===================================================== */

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

        classification:
          (
            message.reply_classification as
              | ReplyClassification
              | null
          ) ??
          null,

        classificationConfidence:
          message.reply_classification_confidence ??
          null,

        classificationReason:
          message.reply_classification_reason ??
          null,

        followUpAt:
          message.reply_follow_up_at ??
          null,

        detectedDateText:
          message.reply_detected_date_text ??
          null,

        alternativeContactName:
          message.reply_alternative_contact_name ??
          null,

        alternativeContactEmail:
          message.reply_alternative_contact_email ??
          null,

        automaticReply:
          Boolean(
            message.is_automatic_reply
          ),
      });
    }

    /* =====================================================
       OUTGOING REPLIES
    ===================================================== */

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

        classification:
          null,

        classificationConfidence:
          null,

        classificationReason:
          null,

        followUpAt:
          null,

        detectedDateText:
          null,

        alternativeContactName:
          null,

        alternativeContactEmail:
          null,

        automaticReply:
          false,
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
          text.unknownCompany,

        contact:
          contact?.full_name ??
          latestIncoming
            ?.from_name ??
          text.companyInbox,

        email:
          contact?.email ??
          latestIncoming
            ?.from_email ??
          null,

        subject:
          draft.subject ??
          latestIncoming
            ?.subject ??
          text.outreach,

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
          humanIncoming.length >
          0
            ? "Replied"
            : "Sent",

        replyClassification:
          (
            latestIncoming?.reply_classification ===
              "BOUNCE" &&
            latestTimeline?.direction ===
              "outgoing" &&
            timestamp(
              latestTimeline.date
            ) >
              timestamp(
                latestIncoming.received_at
              )
              ? null
              : (
                  latestIncoming?.reply_classification as
                    | ReplyClassification
                    | null
                ) ??
                null
          ),

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
     PRELOAD INBOUND-ONLY LEADS

     Previously this section queried Supabase once PER inbound-
     only lead. With more inbox history that becomes an N+1
     slowdown. Load all required leads in one query instead.
  ======================================================= */

  const inboundOnlyLeadIds =
    Array.from(
      messagesByLead.entries()
    )
      .filter(
        (
          [
            leadId,
            leadMessages,
          ]
        ) =>
          !conversations.has(
            leadId
          ) &&
          leadMessages.some(
            (
              message
            ) =>
              message.direction ===
              "INCOMING"
          )
      )
      .map(
        (
          [
            leadId,
          ]
        ) =>
          leadId
      );

  const inboundOnlyLeadById =
    new Map<
      string,
      {
        id:
          string;

        next_follow_up_at:
          string
          | null;

        company:
          | {
              id:
                string;

              name:
                string;
            }
          | {
              id:
                string;

              name:
                string;
            }[]
          | null;

        primary_contact:
          | {
              id:
                string;

              full_name:
                string
                | null;

              email:
                string
                | null;
            }
          | {
              id:
                string;

              full_name:
                string
                | null;

              email:
                string
                | null;
            }[]
          | null;
      }
    >();

  if (
    inboundOnlyLeadIds.length >
      0
  ) {
    const {
      data:
        inboundOnlyLeads,

      error:
        inboundOnlyLeadsError,
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
          "user_id",
          user.id
        )
        .in(
          "id",
          inboundOnlyLeadIds
        );

    if (
      inboundOnlyLeadsError
    ) {
      console.error(
        "Could not preload inbound-only leads:",
        inboundOnlyLeadsError
      );
    }

    for (
      const lead of
        inboundOnlyLeads ??
        []
    ) {
      inboundOnlyLeadById.set(
        lead.id,
        lead as {
          id:
            string;

          next_follow_up_at:
            string
            | null;

          company:
            | {
                id:
                  string;

                name:
                  string;
              }
            | {
                id:
                  string;

                name:
                  string;
              }[]
            | null;

          primary_contact:
            | {
                id:
                  string;

                full_name:
                  string
                  | null;

                email:
                  string
                  | null;
              }
            | {
                id:
                  string;

                full_name:
                  string
                  | null;

                email:
                  string
                  | null;
              }[]
            | null;
        }
      );
    }
  }

  /* =======================================================
     INBOUND-ONLY LEADS
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

    const lead =
      inboundOnlyLeadById.get(
        leadId
      ) ??
      null;

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

    const humanIncoming =
      sortedIncoming.filter(
        (
          message
        ) =>
          !message.is_automatic_reply &&
          message.reply_classification !==
            "BOUNCE"
      );

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

          classification:
            message.direction ===
              "INCOMING"
              ? (
                  message.reply_classification as
                    | ReplyClassification
                    | null
                ) ??
                null
              : null,

          classificationConfidence:
            message.direction ===
              "INCOMING"
              ? message.reply_classification_confidence ??
                null
              : null,

          classificationReason:
            message.direction ===
              "INCOMING"
              ? message.reply_classification_reason ??
                null
              : null,

          followUpAt:
            message.direction ===
              "INCOMING"
              ? message.reply_follow_up_at ??
                null
              : null,

          detectedDateText:
            message.direction ===
              "INCOMING"
              ? message.reply_detected_date_text ??
                null
              : null,

          alternativeContactName:
            message.direction ===
              "INCOMING"
              ? message.reply_alternative_contact_name ??
                null
              : null,

          alternativeContactEmail:
            message.direction ===
              "INCOMING"
              ? message.reply_alternative_contact_email ??
                null
              : null,

          automaticReply:
            message.direction ===
              "INCOMING"
              ? Boolean(
                  message.is_automatic_reply
                )
              : false,
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
          text.unknownCompany,

        contact:
          contact?.full_name ??
          latestIncoming
            .from_name ??
          text.companyInbox,

        email:
          latestIncoming
            .from_email,

        subject:
          sortedIncoming[0]
            ?.subject ??
          text.email,

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
          humanIncoming.length >
          0
            ? "Replied"
            : "Sent",

        replyClassification:
          (
            latestIncoming.reply_classification as
              | ReplyClassification
              | null
          ) ??
          null,

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
     FOLDERS
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
     SELECTED THREAD
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
     STATUS CLEANUP
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

  /* =======================================================
     MOBILE
  ======================================================= */

  const mobileThreadOpen =
    Boolean(
      requestedLeadId &&
      selected
    );

  const inboxListHref =
    buildInboxHref({
      view:
        currentView,

      q:
        rawQuery ||
        undefined,
    });

  /* =======================================================
     OPEN LEAD
  ======================================================= */

  const selectedThreadHref =
    selected
      ? buildInboxHref({
          view:
            currentView,

          leadId:
            selected.leadId,

          q:
            rawQuery ||
            undefined,
        })
      : null;

  const openLeadHref =
    selected &&
    selectedThreadHref
      ? `/leads/${selected.leadId}?returnTo=${encodeURIComponent(
          selectedThreadHref
        )}`
      : selected
        ? `/leads/${selected.leadId}`
        : "/leads";

  const newestIncomingMessageId =
    selected
      ? [
          ...selected.timeline,
        ]
          .reverse()
          .find(
            (
              message
            ) =>
              message.direction ===
              "incoming"
          )
          ?.id ??
        selected.timeline.at(
          -1
        )?.id ??
        null
      : null;

  /* =======================================================
     CONVERSATION LIST
  ======================================================= */

  const conversationListItems:
    InboxConversationListItem[] =
    folderConversations.map(
      (
        conversation
      ) => ({
        leadId:
          conversation.leadId,

        href:
          buildInboxHref({
            view:
              currentView,

            leadId:
              conversation.leadId,

            q:
              rawQuery ||
              undefined,
          }),

        company:
          conversation.company,

        contact:
          conversation.contact,

        email:
          conversation.email,

        subject:
          conversation.subject,

        preview:
          conversation.preview,

        lastTimeLabel:
          formatConversationTime(
            conversation.lastDate,
            language
          ),

        unread:
          conversation.unread,

        unreadCount:
          conversation.unreadCount,

        status:
          conversation.status,

        replyClassification:
          conversation.replyClassification,

        initials:
          getInitials(
            conversation.company
          ),
      })
    );

  const searchPlaceholder =
    currentView ===
    "archived"
      ? text.searchArchived
      : currentView ===
          "trash"
        ? text.searchTrash
        : text.searchInbox;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="leadbase-inbox-page flex h-full min-w-0 flex-1 flex-col overflow-hidden"><WorkspacePageMotion />
      {/* ===================================================
          HEADER
      =================================================== */}

      <header
        className={`leadbase-inbox-header shrink-0 items-start justify-between gap-4 border-b px-4 py-5 sm:px-6 md:flex md:items-end md:gap-6 md:px-8 md:py-7 lg:px-10 ${
          mobileThreadOpen
            ? "hidden"
            : "flex"
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {
              text.eyebrow
            }
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {
              text.title
            }
          </h1>

          <p className="mt-2 hidden text-sm text-muted-foreground sm:block">
            {
              text.description
            }
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {currentView ===
            "trash" &&
          trashCount >
            0 ? (
            <form
              action={
                emptyTrash
              }
            >
              <PendingSubmitButton
                pendingText={
                  language ===
                    "de"
                    ? "Leert..."
                    : "Emptying..."
                }
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Trash2 className="size-4" />

                <span className="hidden sm:inline">
                  {
                    text.emptyTrash
                  }
                </span>
              </PendingSubmitButton>
            </form>
          ) : null}

          <SyncInboxButton
            disabled={
              !gmailReadReady
            }
          />
        </div>
      </header>

      {/* ===================================================
          STATUS BANNERS
      =================================================== */}

      {syncStatus ===
      "done" ? (
        <InboxStatusBanner
          cleanupHref={
            cleanStatusHref
          }
          message={
            newReplies >
            0
              ? newReplies ===
                1
                ? text.syncOne
                : text.syncMany.replace(
                    "{count}",
                    String(
                      newReplies
                    )
                  )
              : text.upToDate
          }
        />
      ) : null}

      {replyStatus ===
      "sent" ? (
        <InboxStatusBanner
          cleanupHref={
            cleanStatusHref
          }
          message={
            text.replySent
          }
        />
      ) : null}

      {/* ===================================================
          GMAIL ERRORS
      =================================================== */}

      {!gmailReadReady ? (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 sm:px-6 md:px-8 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertCircle className="size-3.5 shrink-0" />

          {
            text.gmailReadRequired
          }
        </div>
      ) : null}

      {syncStatus ===
      "quota" ? (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 sm:px-6 md:px-8 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertCircle className="size-3.5 shrink-0" />

          {language ===
          "de"
            ? "Gmail hat das kurzfristige API-Limit erreicht. Leadbase pausiert den Sync automatisch für ein paar Minuten und versucht es danach wieder."
            : "Gmail reached its short-term API quota. Leadbase pauses syncing for a few minutes and will try again automatically."}
        </div>
      ) : null}

      {syncStatus ===
      "error" ? (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:px-6 md:px-8 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="size-3.5 shrink-0" />

          {
            text.syncFailed
          }
        </div>
      ) : null}

      {/* ===================================================
          FOLDERS
      =================================================== */}

      <div
        className={`leadbase-inbox-folders shrink-0 items-center gap-1 overflow-x-auto border-b px-3 py-2 sm:px-4 md:flex md:px-6 ${
          mobileThreadOpen
            ? "hidden"
            : "flex"
        }`}
      >
        <FolderTab
          href="/inbox"
          active={
            currentView ===
            "inbox"
          }
          label={
            text.inbox
          }
          count={
            inboxCount
          }
          icon={
            Inbox
          }
        />

        <FolderTab
          href="/inbox?view=archived"
          active={
            currentView ===
            "archived"
          }
          label={
            text.archived
          }
          count={
            archivedCount
          }
          icon={
            Archive
          }
        />

        <FolderTab
          href="/inbox?view=trash"
          active={
            currentView ===
            "trash"
          }
          label={
            text.trash
          }
          count={
            trashCount
          }
          icon={
            Trash2
          }
        />
      </div>

      {/* ===================================================
          BODY
      =================================================== */}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* =================================================
            CONVERSATION LIST
        ================================================= */}

        <aside
          className={`leadbase-inbox-list-panel w-full shrink-0 flex-col border-r md:flex md:w-[390px] ${
            mobileThreadOpen
              ? "hidden"
              : "flex"
          }`}
        >
          <InboxListPane
            conversations={
              conversationListItems
            }
            selectedLeadId={
              requestedLeadId ||
              null
            }
            view={
              currentView
            }
            initialQuery={
              rawQuery
            }
            searchPlaceholder={
              searchPlaceholder
            }
          />
        </aside>

        {/* =================================================
            THREAD
        ================================================= */}

        <main
          className={`leadbase-inbox-thread-panel min-w-0 flex-1 overflow-y-auto md:block ${
            mobileThreadOpen
              ? "block"
              : "hidden"
          }`}
        >
          {selected ? (
            <div className="mx-auto w-full max-w-4xl px-4 pb-5 sm:px-6 sm:pb-6 md:px-8 md:py-8 lg:px-12 lg:py-10">
              {/* ===========================================
                  MOBILE / THREAD HEADER
              =========================================== */}

              <div className="sticky top-0 z-30 -mx-4 mb-6 border-b bg-background/95 px-4 pb-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:mb-0 md:border-b-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
                <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
                  <Link
                    href={
                      inboxListHref
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <ArrowLeft className="size-5" />

                    {
                      text.inbox
                    }
                  </Link>

                  <span className="text-xs text-muted-foreground">
                    {
                      selected.timeline
                        .length
                    }{" "}
                    {selected.timeline
                      .length ===
                    1
                      ? text.message
                      : text.messages}
                  </span>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
                  <div className="min-w-0">
                    <Badge
                      variant="outline"
                      className={
                        messageStatusClass(
                          selected.status
                        )
                      }
                    >
                      {selected.status ===
                      "Replied"
                        ? text.replyReceived
                        : text.emailSent}
                    </Badge>

                    <h2 className="mt-4 break-words text-xl font-semibold">
                      {
                        selected.subject
                      }
                    </h2>

                    <p className="mt-2 break-words text-sm text-muted-foreground">
                      {selected.contact} ·{" "}
                      {selected.company}
                    </p>
                  </div>

                  {/* =======================================
                      ACTIONS
                  ======================================= */}

                  <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                    {currentView !==
                    "trash" ? (
                      selected.unread ? (
                        <form
                          action={
                            markLeadConversationReadFromForm.bind(
                              null,
                              selected.leadId
                            )
                          }
                        >
                          <PendingSubmitButton
                            pendingText=""
                            title={
                              text.markAsRead
                            }
                            aria-label={
                              text.markAsRead
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                          >
                            <MailOpen className="size-4" />

                            <span className="hidden sm:inline">
                              {
                                text.read
                              }
                            </span>
                          </PendingSubmitButton>
                        </form>
                      ) : selected.replyToMessageId ? (
                        <form
                          action={
                            markLeadConversationUnreadFromForm.bind(
                              null,
                              selected.leadId
                            )
                          }
                        >
                          <PendingSubmitButton
                            pendingText=""
                            title={
                              text.markAsUnread
                            }
                            aria-label={
                              text.markAsUnread
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                          >
                            <Mail className="size-4" />

                            <span className="hidden sm:inline">
                              {
                                text.unread
                              }
                            </span>
                          </PendingSubmitButton>
                        </form>
                      ) : null
                    ) : null}

                    {currentView ===
                    "inbox" ? (
                      <form
                        action={
                          archiveConversationAndReturnToInbox.bind(
                            null,
                            selected.leadId
                          )
                        }
                      >
                        <PendingSubmitButton
                          pendingText=""
                          title={
                            text.archive
                          }
                          aria-label={
                            text.archive
                          }
                          className="inline-flex size-9 items-center justify-center rounded-md border bg-background hover:bg-muted"
                        >
                          <Archive className="size-4" />
                        </PendingSubmitButton>
                      </form>
                    ) : null}

                    {currentView ===
                    "archived" ? (
                      <form
                        action={
                          restoreLeadConversation.bind(
                            null,
                            selected.leadId
                          )
                        }
                      >
                        <PendingSubmitButton
                          pendingText=""
                          className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                        >
                          <RotateCcw className="size-4" />

                          <span className="hidden sm:inline">
                            {
                              text.restore
                            }
                          </span>
                        </PendingSubmitButton>
                      </form>
                    ) : null}

                    {currentView !==
                    "trash" ? (
                      <form
                        action={
                          moveLeadConversationToTrash.bind(
                            null,
                            selected.leadId
                          )
                        }
                      >
                        <PendingSubmitButton
                          pendingText=""
                          title={
                            text.moveToTrash
                          }
                          aria-label={
                            text.moveToTrash
                          }
                          className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted hover:text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </PendingSubmitButton>
                      </form>
                    ) : (
                      <>
                        <form
                          action={
                            restoreLeadConversation.bind(
                              null,
                              selected.leadId
                            )
                          }
                        >
                          <PendingSubmitButton
                            pendingText=""
                            className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                          >
                            <RotateCcw className="size-4" />

                            <span className="hidden sm:inline">
                              {
                                text.restore
                              }
                            </span>
                          </PendingSubmitButton>
                        </form>

                        <form
                          action={
                            permanentlyDeleteLeadConversation.bind(
                              null,
                              selected.leadId
                            )
                          }
                        >
                          <PendingSubmitButton
                            pendingText=""
                            title={
                              text.deletePermanently
                            }
                            aria-label={
                              text.deletePermanently
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-background px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40"
                          >
                            <XCircle className="size-4" />

                            <span className="hidden sm:inline">
                              {
                                text.deletePermanently
                              }
                            </span>
                          </PendingSubmitButton>
                        </form>
                      </>
                    )}

                    <Link
                      href={
                        openLeadHref
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                    >
                      <span className="hidden sm:inline">
                        {
                          text.openLead
                        }
                      </span>

                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <Separator className="hidden md:my-8 md:block" />

              {/* =================================================
                  MESSAGES
              ================================================= */}

              <div className="space-y-4 md:space-y-6">
                {selected.timeline.map(
                  (
                    message
                  ) => (
                    <MessageCard
                      key={
                        message.id
                      }
                      message={
                        message
                      }
                      conversationSubject={
                        selected.subject
                      }
                      language={
                        language
                      }
                      defaultOpen={
                        message.id ===
                        newestIncomingMessageId
                      }
                      bounceResolved={
                        message.classification ===
                          "BOUNCE" &&
                        selected.timeline.some(
                          (
                            laterMessage
                          ) =>
                            laterMessage.direction ===
                              "outgoing" &&
                            timestamp(
                              laterMessage.date
                            ) >
                              timestamp(
                                message.date
                              )
                        )
                      }
                    />
                  )
                )}
              </div>

              {/* =================================================
                  REPLY
              ================================================= */}

              {currentView !==
                "trash" &&
              selected.replyToMessageId &&
              selected.replyRecipientEmail &&
              gmailSendReady ? (
                <ReplyComposer
                  leadId={
                    selected.leadId
                  }
                  replyToMessageId={
                    selected.replyToMessageId
                  }
                  recipientName={
                    selected.replyRecipientName ??
                    selected.replyRecipientEmail
                  }
                  recipientEmail={
                    selected.replyRecipientEmail
                  }
                />
              ) : null}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-8">
              <div className="text-center">
                <Inbox className="mx-auto size-6 text-muted-foreground" />

                <p className="mt-4 text-sm font-medium">
                  {
                    text.noConversationSelected
                  }
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   FOLDER TAB
========================================================= */

function FolderTab({
  href,
  active,
  label,
  count,
  icon: Icon,
}: {
  href: string;

  active: boolean;

  label: string;

  count: number;

  icon:
    React.ElementType;
}) {
  return (
    <Link
      href={
        href
      }
      className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
          : "text-muted-foreground hover:bg-primary/[0.055] hover:text-foreground"
      }`}
    >
      <Icon className="size-4" />

      {
        label
      }

      {count >
      0 ? (
        <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {
            count
          }
        </span>
      ) : null}
    </Link>
  );
}

/* =========================================================
   MESSAGE
========================================================= */

function MessageCard({
  message,
  conversationSubject,
  language,
  defaultOpen,
  bounceResolved,
}: {
  message:
    TimelineMessage;

  conversationSubject:
    string;

  language:
    AppLanguage;

  defaultOpen:
    boolean;

  bounceResolved:
    boolean;
}) {
  const text =
    inboxCopy[
      language
    ].page;

  const outgoing =
    message.direction ===
    "outgoing";

  const differentSubject =
    Boolean(
      message.subject &&
      normalizeSubject(
        message.subject
      ) !==
        normalizeSubject(
          conversationSubject
        )
    );

  const preview =
    compactPreview(
      message.body
    );

  const intelligenceMeta =
    message.classification
      ? getReplyIntelligenceMeta(
          message.classification,
          language
        )
      : null;

  const confidencePercent =
    message.classificationConfidence !==
      null
      ? Math.round(
          message.classificationConfidence *
            100
        )
      : null;

  return (
    <details
      open={
        defaultOpen
      }
      className="group overflow-hidden rounded-xl border bg-card"
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/35 sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          {outgoing ? (
            <MailCheck className="size-3.5" />
          ) : (
            <Inbox className="size-3.5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-medium">
              {
                message.sender
              }
            </p>

            <span className="text-[11px] text-muted-foreground">
              {outgoing
                ? language ===
                    "de"
                  ? "Du"
                  : "You"
                : language ===
                    "de"
                  ? "Kunde"
                  : "Customer"}
            </span>

            {!outgoing &&
            intelligenceMeta ? (
              <Badge
                variant="outline"
                className={`h-5 rounded-full px-2 text-[9px] font-semibold ${intelligenceMeta.className}`}
              >
                {
                  intelligenceMeta.label
                }
              </Badge>
            ) : null}

            {!outgoing &&
            message.automaticReply ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                {language ===
                "de"
                  ? "Automatisch"
                  : "Automatic"}
              </span>
            ) : null}

            {bounceResolved ? (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">
                {language ===
                "de"
                  ? "Behoben"
                  : "Resolved"}
              </span>
            ) : null}

            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
              {formatFullDate(
                message.date,
                language
              )}
            </span>
          </div>

          <p className="mt-1 truncate text-xs text-muted-foreground">
            {
              message.email
            }
          </p>

          {differentSubject ? (
            <p className="mt-2 truncate text-xs font-medium">
              {
                message.subject
              }
            </p>
          ) : null}

          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground group-open:hidden">
            {
              preview
            }
            {message.body
              .replace(
                /\s+/g,
                " "
              )
              .trim()
              .length >
            preview.length
              ? "…"
              : ""}
          </p>
        </div>

        <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t">
        {differentSubject ? (
          <div className="border-b bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
            {
              text.subject
            }
            :{" "}

            <span className="font-medium text-foreground">
              {
                message.subject
              }
            </span>
          </div>
        ) : null}

        {!outgoing &&
        intelligenceMeta ? (
          <div className="border-b bg-muted/15 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`rounded-full text-[10px] ${intelligenceMeta.className}`}
              >
                {
                  intelligenceMeta.label
                }
              </Badge>

              {confidencePercent !==
              null ? (
                <span className="text-[10px] text-muted-foreground">
                  {language ===
                  "de"
                    ? "Sicherheit"
                    : "Confidence"}
                  :{" "}
                  {
                    confidencePercent
                  }
                  %
                </span>
              ) : null}

              {message.automaticReply ? (
                <span className="text-[10px] text-muted-foreground">
                  ·{" "}
                  {language ===
                  "de"
                    ? "automatische Nachricht"
                    : "automatic message"}
                </span>
              ) : null}
            </div>

            {message.classificationReason ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {
                  message.classificationReason
                }
              </p>
            ) : null}

            {bounceResolved ? (
              <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {language ===
                "de"
                  ? "Der Empfänger wurde danach korrigiert und eine neuere E-Mail wurde erneut gesendet. Dieser Bounce bleibt nur als Verlauf erhalten."
                  : "The recipient was corrected afterwards and a newer email was sent. This bounce remains only as history."}
              </p>
            ) : null}

            {message.followUpAt ||
            message.detectedDateText ||
            message.alternativeContactName ||
            message.alternativeContactEmail ? (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {message.followUpAt ? (
                  <span>
                    <span className="font-medium text-foreground">
                      {language ===
                      "de"
                        ? "Nächster Kontakt:"
                        : "Next contact:"}
                    </span>{" "}
                    {formatFullDate(
                      message.followUpAt,
                      language
                    )}
                  </span>
                ) : message.detectedDateText ? (
                  <span>
                    <span className="font-medium text-foreground">
                      {language ===
                      "de"
                        ? "Erkannter Zeitpunkt:"
                        : "Detected timing:"}
                    </span>{" "}
                    {
                      message.detectedDateText
                    }
                  </span>
                ) : null}

                {message.alternativeContactName ||
                message.alternativeContactEmail ? (
                  <span>
                    <span className="font-medium text-foreground">
                      {language ===
                      "de"
                        ? "Alternative Kontaktperson:"
                        : "Alternative contact:"}
                    </span>{" "}
                    {[
                      message.alternativeContactName,
                      message.alternativeContactEmail,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " · "
                      )}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="break-words whitespace-pre-wrap px-4 py-4 text-sm leading-7 sm:px-5 sm:py-5">
          {
            message.body
          }
        </div>

        {message.attachments.length >
        0 ? (
          <div className="border-t px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium">
              <Paperclip className="size-3.5" />

              {
                text.attachments
              }
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {message.attachments.map(
                (
                  attachment
                ) => (
                  <AttachmentCard
                    key={`${message.id}-${attachment.name}`}
                    attachment={
                      attachment
                    }
                    downloadLabel={
                      text.downloadAttachment
                    }
                  />
                )
              )}
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}

/* =========================================================
   ATTACHMENT
========================================================= */

function AttachmentCard({
  attachment,
  downloadLabel,
}: {
  attachment:
    TimelineAttachment;

  downloadLabel:
    string;
}) {
  const isImage =
    attachment.type.startsWith(
      "image/"
    );

  const baseUrl =
    attachment.gmailMessageId
      ? `/api/inbox/attachment?messageId=${encodeURIComponent(
          attachment.gmailMessageId
        )}&filename=${encodeURIComponent(
          attachment.name
        )}`
      : null;

  if (
    isImage &&
    baseUrl
  ) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <a
          href={
            baseUrl
          }
          target="_blank"
          rel="noreferrer"
          className="block bg-muted/20"
        >
          <img
            src={
              baseUrl
            }
            alt={
              attachment.name
            }
            className="max-h-72 w-full object-contain"
          />
        </a>

        <div className="flex items-center gap-3 border-t px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {
                attachment.name
              }
            </p>

            <p className="text-[11px] text-muted-foreground">
              {formatFileSize(
                attachment.size
              )}
            </p>
          </div>

          <a
            href={`${baseUrl}&download=1`}
            className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
            title={
              downloadLabel
            }
          >
            <Download className="size-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-3">
      <div className="flex size-9 items-center justify-center rounded-md bg-muted">
        <FileText className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          {
            attachment.name
          }
        </p>

        <p className="text-[11px] text-muted-foreground">
          {formatFileSize(
            attachment.size
          )}
        </p>
      </div>

      {baseUrl ? (
        <a
          href={`${baseUrl}&download=1`}
          className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
          title={
            downloadLabel
          }
        >
          <Download className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}