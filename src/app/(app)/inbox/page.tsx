/* eslint-disable @next/next/no-img-element */

import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileText,
  Inbox,
  MailCheck,
  Paperclip,
  Search,
} from "lucide-react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  MarkConversationRead,
} from "./mark-conversation-read";

import {
  ReplyComposer,
} from "./reply-composer";

import {
  SyncInboxButton,
} from "./sync-button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Input,
} from "@/components/ui/input";

import {
  Separator,
} from "@/components/ui/separator";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type InboxPageProps = {
  searchParams?: Promise<{
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
  }>;
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
  const result =
    value
      .split(
        /\s+/
      )
      .filter(Boolean)
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
      .join("");

  return (
    result ||
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
      item === null
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

function formatConversationTime(
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

function formatFullDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "de-DE",
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
    1024 * 1024
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
   PAGE
========================================================= */

export default async function InboxPage({
  searchParams,
}: InboxPageProps) {
  const params =
    searchParams
      ? await searchParams
      : {};

  const requestedLeadId =
    getQueryValue(
      params.lead
    );

  const query =
    getQueryValue(
      params.q
    )
      .trim()
      .toLowerCase();

  const syncStatus =
    getQueryValue(
      params.sync
    );

  const newReplies =
    Number(
      getQueryValue(
        params.new
      ) ||
      0
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
     LOAD
  ======================================================= */

  const [
    draftsResult,
    messagesResult,
    gmailResult,
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
     INDEX
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
     SENT OUTREACH CONVERSATIONS
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
          contact?.full_name ??
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
          latestIncoming?.from_name ??
          "Company inbox",

        email:
          contact?.email ??
          latestIncoming?.from_email ??
          null,

        subject:
          draft.subject ??
          latestIncoming?.subject ??
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
          latestTimeline?.date ??
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

        nextFollowUpAt:
          lead.next_follow_up_at,

        replyToMessageId:
          latestIncoming?.id ??
          null,

        replyRecipientName:
          latestIncoming?.from_name ??
          contact?.full_name ??
          null,

        replyRecipientEmail:
          latestIncoming?.from_email ??
          contact?.email ??
          null,

        timeline,
      }
    );
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
                contact?.full_name ??
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
          latestIncoming.from_name ??
          "Company inbox",

        email:
          latestIncoming.from_email,

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
          latestIncoming.received_at,

        unread:
          unreadCount >
          0,

        unreadCount,

        status:
          "Replied",

        nextFollowUpAt:
          lead.next_follow_up_at,

        replyToMessageId:
          latestIncoming.id,

        replyRecipientName:
          latestIncoming.from_name ??
          contact?.full_name ??
          null,

        replyRecipientEmail:
          latestIncoming.from_email,

        timeline,
      }
    );
  }

  /* =======================================================
     FILTER
  ======================================================= */

  const allConversations =
    Array.from(
      conversations.values()
    ).sort(
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

  const filtered =
    query
      ? allConversations.filter(
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
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(
                query
              )
        )
      : allConversations;

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
     UI
  ======================================================= */

  return (
    <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-end justify-between gap-6 border-b px-8 py-7 lg:px-10">
        <div>
          <p className="text-sm text-muted-foreground">
            Communication
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Inbox
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Lead emails and replies synchronized from Gmail.
          </p>
        </div>

        <SyncInboxButton
          disabled={
            !gmailReadReady
          }
        />
      </header>

      {selected ? (
        <MarkConversationRead
          leadId={
            selected.leadId
          }
          hasUnread={
            selected.unread
          }
        />
      ) : null}

      {syncStatus ===
      "done" ? (
        <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-8 py-2.5 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="size-3.5" />

          {newReplies >
          0
            ? `${newReplies} new message${
                newReplies ===
                1
                  ? ""
                  : "s"
              } synced.`
            : "Inbox is up to date."}
        </div>
      ) : null}

      {!gmailReadReady ? (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-8 py-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertCircle className="size-3.5" />

          Gmail read access is required.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* LIST */}

        <aside className="flex w-[390px] shrink-0 flex-col border-r">
          <div className="border-b p-4">
            <form>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  name="q"
                  defaultValue={
                    getQueryValue(
                      params.q
                    )
                  }
                  placeholder="Search conversations..."
                  className="pl-9"
                />
              </div>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map(
              (
                conversation
              ) => (
                <Link
                  key={
                    conversation.leadId
                  }
                  href={`/inbox?lead=${encodeURIComponent(
                    conversation.leadId
                  )}`}
                  className={`block border-b px-4 py-4 transition-colors hover:bg-muted/50 ${
                    selected
                      ?.leadId ===
                    conversation.leadId
                      ? "bg-muted/70"
                      : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold">
                      {getInitials(
                        conversation.company
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <p className="truncate text-sm font-medium">
                          {
                            conversation.company
                          }
                        </p>

                        <span className="text-xs text-muted-foreground">
                          {formatConversationTime(
                            conversation.lastDate
                          )}
                        </span>
                      </div>

                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {
                          conversation.contact
                        }
                      </p>

                      <p className="mt-3 truncate text-sm">
                        {
                          conversation.subject
                        }
                      </p>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {
                          conversation.preview
                        }
                      </p>

                      <div className="mt-3 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={messageStatusClass(
                            conversation.status
                          )}
                        >
                          {
                            conversation.status
                          }
                        </Badge>

                        {conversation.unread ? (
                          <span className="size-2 rounded-full bg-blue-500" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
        </aside>

        {/* THREAD */}

        <main className="min-w-0 flex-1 overflow-y-auto">
          {selected ? (
            <div className="mx-auto max-w-4xl px-8 py-8 lg:px-12 lg:py-10">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <Badge
                    variant="outline"
                    className={messageStatusClass(
                      selected.status
                    )}
                  >
                    {selected.status ===
                    "Replied"
                      ? "Reply received"
                      : "Email sent"}
                  </Badge>

                  <h2 className="mt-4 text-xl font-semibold">
                    {
                      selected.subject
                    }
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {selected.contact} · {selected.company}
                  </p>
                </div>

                <Link
                  href={`/leads/${selected.leadId}`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                >
                  Open lead

                  <ArrowUpRight className="size-4" />
                </Link>
              </div>

              <Separator className="my-8" />

              <div className="space-y-6">
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
                    />
                  )
                )}
              </div>

              {selected.replyToMessageId &&
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
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No conversation selected.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   MESSAGE
========================================================= */

function MessageCard({
  message,
  conversationSubject,
}: {
  message:
    TimelineMessage;

  conversationSubject:
    string;
}) {
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

  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <div className="flex justify-between gap-5 border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-muted">
            {outgoing ? (
              <MailCheck className="size-4" />
            ) : (
              <Inbox className="size-4" />
            )}
          </div>

          <div>
            <p className="text-sm font-medium">
              {
                message.sender
              }
            </p>

            <p className="text-xs text-muted-foreground">
              {
                message.email
              }
            </p>
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          {formatFullDate(
            message.date
          )}
        </span>
      </div>

      {differentSubject ? (
        <div className="border-b bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground">
          Subject:{" "}
          <span className="font-medium text-foreground">
            {
              message.subject
            }
          </span>
        </div>
      ) : null}

      <div className="whitespace-pre-wrap px-5 py-5 text-sm leading-7">
        {
          message.body
        }
      </div>

      {message.attachments.length >
      0 ? (
        <div className="border-t px-5 py-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium">
            <Paperclip className="size-3.5" />

            Attachments
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
                />
              )
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

/* =========================================================
   ATTACHMENT
========================================================= */

function AttachmentCard({
  attachment,
}: {
  attachment:
    TimelineAttachment;
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
            title="Download attachment"
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
        >
          <Download className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}