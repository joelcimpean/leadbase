import Link from "next/link";

import {
  ArrowUpRight,
  ChevronDown,
  Inbox,
  Mail,
  MailCheck,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type LeadEmailHistoryProps = {
  leadId:
    string;
};

type HistoryItem = {
  id:
    string;

  direction:
    "INCOMING"
    | "OUTGOING";

  sender:
    string;

  email:
    string;

  subject:
    | string
    | null;

  body:
    string;

  date:
    string;
};

/* =========================================================
   HELPERS
========================================================= */

function timestamp(
  value:
    string
) {
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

function formatDateTime(
  value:
    string,
  language:
    "de"
    | "en"
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

function compactPreview(
  value:
    string
) {
  return value
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .slice(
      0,
      150
    );
}

/* =========================================================
   COMPONENT
========================================================= */

export async function LeadEmailHistory({
  leadId,
}: LeadEmailHistoryProps) {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    return null;
  }

  const [
    draftResult,
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
          subject,
          body,
          sent_at,
          follow_up_body,
          follow_up_sent_at,
          sent_to,
          follow_up_sent_to
        `)
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
        )
        .limit(
          1
        )
        .maybeSingle(),

      supabase
        .from(
          "email_messages"
        )
        .select(`
          id,
          direction,
          from_name,
          from_email,
          to_email,
          subject,
          body_text,
          received_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "lead_id",
          leadId
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
        .select(
          "email_address"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle(),
    ]);

  if (
    draftResult.error
  ) {
    console.error(
      "Could not load lead outreach history:",
      draftResult.error
    );
  }

  if (
    messagesResult.error
  ) {
    console.error(
      "Could not load lead email messages:",
      messagesResult.error
    );
  }

  const draft =
    draftResult.data;

  const senderEmail =
    gmailResult.data
      ?.email_address ??
    "hello@joelcimpean.com";

  const timeline:
    HistoryItem[] =
    [];

  if (
    draft?.sent_at
  ) {
    timeline.push({
      id:
        `outreach-${draft.id}`,

      direction:
        "OUTGOING",

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
    });
  }

  if (
    draft?.follow_up_sent_at &&
    draft.follow_up_body
  ) {
    timeline.push({
      id:
        `follow-up-${draft.id}`,

      direction:
        "OUTGOING",

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
    });
  }

  for (
    const message of
      messagesResult.data ??
      []
  ) {
    timeline.push({
      id:
        message.id,

      direction:
        message.direction ===
          "OUTGOING"
          ? "OUTGOING"
          : "INCOMING",

      sender:
        message.direction ===
          "OUTGOING"
          ? message.from_name ??
            "Joel Cimpean"
          : message.from_name ??
            message.from_email,

      email:
        message.from_email,

      subject:
        message.subject,

      body:
        message.body_text,

      date:
        message.received_at,
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

  const de =
    language ===
    "de";

  /*
   * Open the newest incoming customer mail by default.
   * If there is no incoming mail, keep everything collapsed.
   */
  const newestIncomingId =
    [...timeline]
      .reverse()
      .find(
        (
          item
        ) =>
          item.direction ===
          "INCOMING"
      )
      ?.id ??
    null;

  return (
    <Card
      id="email-history"
      className="mt-4 min-w-0 shadow-none sm:mt-6"
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
              <Inbox className="size-3.5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">
                  {de
                    ? "E-Mail-Verlauf"
                    : "Email history"}
                </h2>

                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {timeline.length}{" "}
                  {timeline.length ===
                  1
                    ? de
                      ? "Nachricht"
                      : "message"
                    : de
                      ? "Nachrichten"
                      : "messages"}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {de
                  ? "Kompakter Verlauf aus Outreach und Inbox."
                  : "Compact outreach and inbox history."}
              </p>
            </div>
          </div>

          <Link
            href={`/inbox?lead=${encodeURIComponent(
              leadId
            )}`}
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted"
          >
            {de
              ? "In Inbox öffnen"
              : "Open in inbox"}

            <ArrowUpRight className="size-3" />
          </Link>
        </div>

        {timeline.length ===
        0 ? (
          <div className="border-t px-4 py-8 text-center sm:px-5">
            <Mail className="mx-auto size-4 text-muted-foreground" />

            <p className="mt-2 text-sm font-medium">
              {de
                ? "Noch kein E-Mail-Verlauf"
                : "No email history yet"}
            </p>
          </div>
        ) : (
          <div className="border-t">
            {timeline.map(
              (
                item
              ) => {
                const incoming =
                  item.direction ===
                  "INCOMING";

                const openByDefault =
                  item.id ===
                  newestIncomingId;

                const preview =
                  compactPreview(
                    item.body
                  );

                return (
                  <details
                    key={
                      item.id
                    }
                    open={
                      openByDefault
                    }
                    className="group border-b last:border-b-0"
                  >
                    <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5 [&::-webkit-details-marker]:hidden">
                      <div
                        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border ${
                          incoming
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {incoming ? (
                          <Mail className="size-3" />
                        ) : (
                          <MailCheck className="size-3" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-xs font-semibold">
                            {
                              item.sender
                            }
                          </p>

                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                              incoming
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {incoming
                              ? de
                                ? "Kunde"
                                : "Customer"
                              : de
                                ? "Du"
                                : "You"}
                          </span>

                          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                            {formatDateTime(
                              item.date,
                              language
                            )}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-xs font-medium">
                          {item.subject ??
                            (
                              de
                                ? "Ohne Betreff"
                                : "No subject"
                            )}
                        </p>

                        <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground group-open:hidden">
                          {
                            preview
                          }
                          {item.body
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

                      <ChevronDown className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>

                    <div className="border-t bg-muted/10 px-4 py-4 sm:px-5 sm:pl-16">
                      <p className="break-all text-[10px] text-muted-foreground">
                        {
                          item.email
                        }
                      </p>

                      <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                        {
                          item.body
                        }
                      </div>
                    </div>
                  </details>
                );
              }
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
