import {
    CalendarClock,
    CalendarX2,
    Clock3,
    Film,
    Mail,
  } from "lucide-react";
  
  import Link from "next/link";
  
  import {
    redirect,
  } from "next/navigation";
  
  import {
    cancelScheduledOutreach,
  } from "../leads/outreach-actions";
  
  import {
    Badge,
  } from "@/components/ui/badge";
  
  import {
    Card,
    CardContent,
  } from "@/components/ui/card";
  
  import {
    PendingSubmitButton,
  } from "@/components/pending-submit-button";
  
  import {
    getAppLanguage,
  } from "@/lib/i18n-server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";
  
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
  
  function formatDateTime(
    value:
      string,
    language:
      "de" | "en"
  ) {
    return new Intl.DateTimeFormat(
      language ===
        "de"
        ? "de-DE"
        : "en-IE",
      {
        weekday:
          "short",
  
        day:
          "2-digit",
  
        month:
          "2-digit",
  
        year:
          "numeric",
  
        hour:
          "2-digit",
  
        minute:
          "2-digit",
  
        timeZone:
          "Europe/Berlin",
      }
    ).format(
      new Date(
        value
      )
    );
  }
  
  /* =========================================================
     PAGE
  ========================================================= */
  
  export default async function ScheduledEmailsPage() {
    const [
      supabase,
      language,
    ] =
      await Promise.all([
        createClient(),
        getAppLanguage(),
      ]);
  
    const de =
      language ===
        "de";
  
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
      redirect(
        "/login"
      );
    }
  
    const {
      data:
        schedules,
      error,
    } =
      await supabase
        .from(
          "scheduled_emails"
        )
        .select(`
          id,
          lead_id,
          outreach_draft_id,
          status,
          scheduled_for,
          include_preview_gif,
          created_at,
  
          lead:leads (
            id,
            status,
  
            company:companies (
              id,
              name
            ),
  
            primary_contact:contacts (
              id,
              full_name,
              email
            )
          ),
  
          outreach_draft:outreach_drafts (
            id,
            subject,
            status
          )
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "message_type",
          "OUTREACH"
        )
        .in(
          "status",
          [
            "SCHEDULED",
            "PROCESSING",
          ]
        )
        .order(
          "scheduled_for",
          {
            ascending:
              true,
          }
        );
  
    if (
      error
    ) {
      console.error(
        "Could not load scheduled outreach:",
        error
      );
    }
  
    const rows =
      schedules ??
      [];
  
    return (
      <div className="leadbase-workspace-page mx-auto min-h-full w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <WorkspacePageMotion />
        <div data-workspace-reveal className="leadbase-workspace-header flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="size-5" />
  
              <h1 className="text-xl font-semibold">
                {de
                  ? "Geplante Mails"
                  : "Scheduled emails"}
              </h1>
            </div>
  
            <p className="mt-1 text-sm text-muted-foreground">
              {de
                ? "Alle ersten Outreach-Mails, die automatisch später gesendet werden."
                : "All initial outreach emails scheduled to be sent automatically later."}
            </p>
          </div>
  
          <Badge
            variant="outline"
            className="w-fit"
          >
            {rows.length}{" "}
            {de
              ? "geplant"
              : "scheduled"}
          </Badge>
        </div>
  
        {rows.length ===
        0 ? (
          <Card data-workspace-reveal className="leadbase-workspace-card mt-6">
            <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
              <Mail className="size-7 text-muted-foreground" />
  
              <p className="mt-3 text-sm font-medium">
                {de
                  ? "Keine Mails geplant"
                  : "No emails scheduled"}
              </p>
  
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                {de
                  ? "Markiere Leads auf der Leads-Seite und nutze „Später senden“, damit sie hier erscheinen."
                  : "Select leads on the Leads page and use Send later to see them here."}
              </p>
  
              <Link
                href="/leads"
                className="mt-4 inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                {de
                  ? "Zu den Leads"
                  : "Go to Leads"}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-3">
            {rows.map(
              (
                schedule
              ) => {
                const lead =
                  getSingleRelation(
                    schedule.lead
                  );
  
                const company =
                  getSingleRelation(
                    lead?.company
                  );
  
                const contact =
                  getSingleRelation(
                    lead?.primary_contact
                  );
  
                const draft =
                  getSingleRelation(
                    schedule.outreach_draft
                  );
  
                return (
                  <Card
                    key={
                      schedule.id
                    }
                    className="leadbase-workspace-card"
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/leads/${schedule.lead_id}#outreach`}
                              className="truncate text-sm font-semibold hover:underline"
                            >
                              {company?.name ??
                                (
                                  de
                                    ? "Unbekanntes Unternehmen"
                                    : "Unknown company"
                                )}
                            </Link>
  
                            <Badge
                              variant="outline"
                              className={
                                schedule.status ===
                                  "PROCESSING"
                                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
                                  : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400"
                              }
                            >
                              {schedule.status ===
                              "PROCESSING"
                                ? de
                                  ? "Wird gesendet"
                                  : "Sending"
                                : de
                                  ? "Geplant"
                                  : "Scheduled"}
                            </Badge>
  
                            {schedule.include_preview_gif ? (
                              <Badge
                                variant="outline"
                                className="gap-1.5"
                              >
                                <Film className="size-3" />
                                GIF
                              </Badge>
                            ) : null}
                          </div>
  
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {draft?.subject ??
                              (
                                de
                                  ? "Ohne Betreff"
                                  : "No subject"
                              )}
                          </p>
  
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="size-3.5" />
  
                              {formatDateTime(
                                schedule.scheduled_for,
                                language
                              )}
                            </span>
  
                            {contact?.email ? (
                              <span className="break-all">
                                {contact.full_name
                                  ? `${contact.full_name} · `
                                  : ""}
                                {contact.email}
                              </span>
                            ) : null}
                          </div>
                        </div>
  
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Link
                            href={`/leads/${schedule.lead_id}#outreach`}
                            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            {de
                              ? "Lead öffnen"
                              : "Open lead"}
                          </Link>
  
                          {schedule.status ===
                          "SCHEDULED" ? (
                            <form
                              action={
                                cancelScheduledOutreach
                              }
                            >
                              <input
                                type="hidden"
                                name="leadId"
                                value={
                                  schedule.lead_id
                                }
                              />
  
                              <PendingSubmitButton
                                pendingText={
                                  de
                                    ? "Wird gestoppt..."
                                    : "Cancelling..."
                                }
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <CalendarX2 className="size-3.5" />
  
                                {de
                                  ? "Versand stoppen"
                                  : "Cancel send"}
                              </PendingSubmitButton>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>
        )}
      </div>
    );
  }
  