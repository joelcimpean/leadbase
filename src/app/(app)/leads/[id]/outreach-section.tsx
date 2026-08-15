import {
    AlertCircle,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Mail,
    MailCheck,
    PencilLine,
    Save,
    Sparkles,
    User,
  } from "lucide-react";
  
  import {
    GenerateOutreachButton,
  } from "./generate-outreach-button";
  
  import {
    SendEmailButton,
  } from "./send-email-button";
  
  import {
    SendFollowUpButton,
  } from "./send-follow-up-button";
  
  import {
    approveOutreachDraft,
    updateLeadContactSalutation,
    updateOutreachDraft,
  } from "../outreach-actions";
  
  import {
    Badge,
  } from "@/components/ui/badge";
  
  import {
    Card,
    CardContent,
  } from "@/components/ui/card";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type OutreachSectionProps = {
    leadId: string;
  };
  
  type ContactSalutation =
    | "HERR"
    | "FRAU"
    | null;
  
  /* =========================================================
     CONFIG
  ========================================================= */
  
  const SIGNATURE_MARKER =
    "Mit freundlichen Grüßen / Kind regards,";
  
  const GMAIL_SEND_SCOPE =
    "https://www.googleapis.com/auth/gmail.send";
  
  /* =========================================================
     HELPERS
  ========================================================= */
  
  function getSingleRelation<T>(
    value: T | T[] | null
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
  
    return value;
  }
  
  function parsePoints(
    value: unknown
  ) {
    if (
      !Array.isArray(
        value
      )
    ) {
      return [];
    }
  
    return value.filter(
      (
        item
      ): item is string =>
        typeof item ===
        "string"
    );
  }
  
  function getLastName(
    fullName: string
  ) {
    const parts =
      fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean);
  
    if (
      parts.length === 0
    ) {
      return "";
    }
  
    if (
      parts.length === 1
    ) {
      return parts[0];
    }
  
    const particles =
      new Set([
        "von",
        "van",
        "de",
        "der",
        "den",
        "zu",
        "zur",
      ]);
  
    let start =
      parts.length - 1;
  
    while (
      start > 0 &&
      particles.has(
        parts[
          start - 1
        ].toLowerCase()
      )
    ) {
      start -= 1;
    }
  
    return parts
      .slice(start)
      .join(" ");
  }
  
  function getGreeting(
    fullName:
      | string
      | null
      | undefined,
  
    salutation:
      | ContactSalutation
      | undefined
  ) {
    if (
      fullName &&
      salutation ===
        "HERR"
    ) {
      return `Sehr geehrter Herr ${getLastName(
        fullName
      )},`;
    }
  
    if (
      fullName &&
      salutation ===
        "FRAU"
    ) {
      return `Sehr geehrte Frau ${getLastName(
        fullName
      )},`;
    }
  
    return "Guten Tag,";
  }
  
  function splitSignature(
    value: string
  ) {
    const index =
      value.indexOf(
        SIGNATURE_MARKER
      );
  
    if (
      index === -1
    ) {
      return {
        message:
          value.trim(),
  
        hasSignature:
          false,
      };
    }
  
    return {
      message:
        value
          .slice(
            0,
            index
          )
          .trim(),
  
      hasSignature:
        true,
    };
  }
  
  function getEditableMessage(
    value:
      | string
      | null
      | undefined
  ) {
    if (!value) {
      return "";
    }
  
    return splitSignature(
      value
    ).message;
  }
  
  function formatDateTime(
    date:
      | string
      | null
      | undefined
  ) {
    if (!date) {
      return "—";
    }
  
    return new Intl.DateTimeFormat(
      "de-DE",
      {
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
        date
      )
    );
  }
  
  function draftStatusClass(
    status: string
  ) {
    switch (
      status
    ) {
      case "APPROVED":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
  
      case "SENDING":
        return "border-amber-200 bg-amber-50 text-amber-700";
  
      case "SENT":
        return "border-blue-200 bg-blue-50 text-blue-700";
  
      case "ARCHIVED":
        return "border-zinc-200 bg-zinc-100 text-zinc-600";
  
      default:
        return "border-zinc-200 bg-zinc-50 text-zinc-700";
    }
  }
  
  function draftStatusLabel(
    status: string
  ) {
    switch (
      status
    ) {
      case "APPROVED":
        return "Approved";
  
      case "SENDING":
        return "Sending";
  
      case "SENT":
        return "Sent";
  
      case "ARCHIVED":
        return "Archived";
  
      default:
        return "Draft";
    }
  }
  
  /* =========================================================
     SIGNATURE
  ========================================================= */
  
  function Signature() {
    return (
      <div className="mt-7 text-sm leading-6">
        <p>
          Mit freundlichen Grüßen / Kind regards,
        </p>
  
        <div className="mt-4">
          <p className="font-medium">
            Joel Cimpean
          </p>
  
          <p className="text-muted-foreground">
            <a
              href="mailto:hello@joelcimpean.com"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              hello@joelcimpean.com
            </a>
  
            <span className="mx-1.5">
              /
            </span>
  
            <a
              href="https://joelcimpean.com"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              joelcimpean.com
            </a>
          </p>
        </div>
      </div>
    );
  }
  
  /* =========================================================
     EMAIL BODY
  ========================================================= */
  
  function EmailBody({
    body,
  }: {
    body: string;
  }) {
    const {
      message,
      hasSignature,
    } =
      splitSignature(
        body
      );
  
    return (
      <div>
        <div className="whitespace-pre-wrap text-[14px] leading-7 text-foreground">
          {message}
        </div>
  
        {hasSignature ? (
          <Signature />
        ) : null}
      </div>
    );
  }
  
  /* =========================================================
     OUTREACH SECTION
  ========================================================= */
  
  export async function OutreachSection({
    leadId,
  }: OutreachSectionProps) {
    const supabase =
      await createClient();
  
    const [
      draftResult,
      leadResult,
      gmailResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "outreach_drafts"
          )
          .select(`
            id,
            channel,
            language,
            subject,
            body,
            follow_up_body,
            personalization_points,
            status,
            model,
            input_tokens,
            output_tokens,
            total_tokens,
            created_at,
            sent_at,
            sent_to,
            gmail_message_id,
            gmail_thread_id,
            sending_started_at,
            send_error,
            follow_up_sent_at,
            follow_up_sent_to,
            gmail_follow_up_message_id,
            gmail_follow_up_thread_id,
            follow_up_sending_started_at,
            follow_up_send_error
          `)
          .eq(
            "lead_id",
            leadId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle(),
  
        supabase
          .from(
            "leads"
          )
          .select(`
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
              job_title,
              email,
              salutation
            )
          `)
          .eq(
            "id",
            leadId
          )
          .maybeSingle(),
  
        supabase
          .from(
            "gmail_connections"
          )
          .select(`
            email_address,
            scopes
          `)
          .maybeSingle(),
      ]);
  
    if (
      draftResult.error
    ) {
      console.error(
        "Could not load outreach draft:",
        draftResult.error
      );
    }
  
    if (
      leadResult.error
    ) {
      console.error(
        "Could not load outreach recipient:",
        leadResult.error
      );
    }
  
    if (
      gmailResult.error
    ) {
      console.error(
        "Could not load Gmail status:",
        gmailResult.error
      );
    }
  
    const draft =
      draftResult.data;
  
    const lead =
      leadResult.data;
  
    const gmailConnection =
      gmailResult.data;
  
    const company =
      getSingleRelation(
        lead?.company ??
          null
      );
  
    const contact =
      getSingleRelation(
        lead?.primary_contact ??
          null
      );
  
    const personalizationPoints =
      parsePoints(
        draft?.personalization_points
      );
  
    const greeting =
      getGreeting(
        contact?.full_name,
  
        contact?.salutation as
          | ContactSalutation
          | undefined
      );
  
    const canEdit =
      Boolean(
        draft &&
        (
          draft.status ===
            "DRAFT" ||
          draft.status ===
            "APPROVED"
        )
      );
  
    const canEditSalutation =
      canEdit;
  
    const gmailScopes =
      Array.isArray(
        gmailConnection?.scopes
      )
        ? gmailConnection.scopes
        : [];
  
    const gmailReady =
      Boolean(
        gmailConnection &&
        gmailScopes.includes(
          GMAIL_SEND_SCOPE
        )
      );
  
    const recipientEmail =
      contact?.email
        ?.trim() ??
      null;
  
    const followUpDueAt =
      lead?.next_follow_up_at
        ? new Date(
            lead.next_follow_up_at
          )
        : null;
  
    const followUpDue =
      Boolean(
        draft?.status ===
          "SENT" &&
        draft.follow_up_body &&
        !draft.follow_up_sent_at &&
        followUpDueAt &&
        followUpDueAt.getTime() <=
          Date.now()
      );
  
    const followUpScheduled =
      Boolean(
        draft?.status ===
          "SENT" &&
        draft.follow_up_body &&
        !draft.follow_up_sent_at &&
        followUpDueAt &&
        followUpDueAt.getTime() >
          Date.now()
      );
  
    return (
      <Card
        id="outreach"
        className="overflow-hidden shadow-none"
      >
        <CardContent className="p-0">
          {/* HEADER */}
  
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                <Sparkles className="size-4" />
              </div>
  
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    Outreach draft
                  </h2>
  
                  {draft ? (
                    <Badge
                      variant="outline"
                      className={
                        draftStatusClass(
                          draft.status
                        )
                      }
                    >
                      {draftStatusLabel(
                        draft.status
                      )}
                    </Badge>
                  ) : null}
                </div>
  
                <p className="mt-1 text-xs text-muted-foreground">
                  {contact?.full_name
                    ? `Personalized email for ${contact.full_name}.`
                    : company?.name
                      ? `Personalized email for ${company.name}.`
                      : "Personalized email based on the current research."}
                </p>
              </div>
            </div>
  
            <GenerateOutreachButton
              leadId={
                leadId
              }
              hasDraft={
                Boolean(
                  draft
                )
              }
            />
          </div>
  
          {!draft ? (
            <div className="border-t px-5 py-10">
              <div className="mx-auto max-w-sm text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-lg border">
                  <Mail className="size-4 text-muted-foreground" />
                </div>
  
                <p className="mt-3 text-sm font-medium">
                  No outreach draft yet
                </p>
  
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Generate a personalized German email using the company and website research.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* RECIPIENT */}
  
              <div className="border-t bg-muted/20 px-5 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2 sm:grid-cols-[110px_1fr] sm:items-start">
                    <p className="pt-0.5 text-xs font-medium text-muted-foreground">
                      Recipient
                    </p>
  
                    <div className="flex items-start gap-2">
                      <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
  
                      <div>
                        <p className="text-sm font-medium">
                          {contact?.full_name ??
                            company?.name ??
                            "Unknown recipient"}
                        </p>
  
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {recipientEmail ??
                            "No email address found"}
                        </p>
  
                        {contact?.job_title ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {
                              contact.job_title
                            }
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
  
                  {contact?.id &&
                  contact.full_name &&
                  canEditSalutation ? (
                    <div className="grid gap-2 sm:grid-cols-[110px_1fr] sm:items-center">
                      <p className="text-xs font-medium text-muted-foreground">
                        Salutation
                      </p>
  
                      <div className="flex flex-wrap items-center gap-2">
                        <form
                          action={
                            updateLeadContactSalutation
                          }
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="leadId"
                            value={
                              leadId
                            }
                          />
  
                          <input
                            type="hidden"
                            name="contactId"
                            value={
                              contact.id
                            }
                          />
  
                          <select
                            name="salutation"
                            defaultValue={
                              contact.salutation ??
                              ""
                            }
                            className="h-8 rounded-md border bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">
                              Neutral
                            </option>
  
                            <option value="HERR">
                              Herr
                            </option>
  
                            <option value="FRAU">
                              Frau
                            </option>
                          </select>
  
                          <button
                            type="submit"
                            className="h-8 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            Save
                          </button>
                        </form>
  
                        <span className="text-xs text-muted-foreground">
                          →{" "}
                          {greeting}
                        </span>
                      </div>
                    </div>
                  ) : null}
  
                  <div className="grid gap-2 sm:grid-cols-[110px_1fr] sm:items-start">
                    <p className="pt-0.5 text-xs font-medium text-muted-foreground">
                      Subject
                    </p>
  
                    <p className="text-sm font-medium">
                      {draft.subject ??
                        "—"}
                    </p>
                  </div>
  
                  {draft.sent_at ? (
                    <div className="grid gap-2 sm:grid-cols-[110px_1fr] sm:items-start">
                      <p className="pt-0.5 text-xs font-medium text-muted-foreground">
                        Sent
                      </p>
  
                      <div>
                        <p className="text-sm font-medium">
                          {formatDateTime(
                            draft.sent_at
                          )}
                        </p>
  
                        {draft.sent_to ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            to{" "}
                            {
                              draft.sent_to
                            }
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
  
              {/* EMAIL */}
  
              <div className="border-t px-5 py-6">
                <div className="mx-auto max-w-[760px]">
                  <EmailBody
                    body={
                      draft.body
                    }
                  />
                </div>
              </div>
  
              {draft.send_error ? (
                <div className="border-t border-red-200 bg-red-50 px-5 py-3">
                  <div className="flex items-start gap-2 text-red-700">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
  
                    <div>
                      <p className="text-xs font-medium">
                        Email could not be sent
                      </p>
  
                      <p className="mt-1 text-xs leading-5">
                        {
                          draft.send_error
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
  
              {/* ACTION BAR */}
  
              <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 px-5 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3.5" />
  
                  <span>
                    Personalized using{" "}
                    {
                      personalizationPoints.length
                    }{" "}
                    company insight
                    {personalizationPoints.length ===
                    1
                      ? ""
                      : "s"}
                  </span>
                </div>
  
                <div className="flex flex-wrap items-center gap-2">
                  {draft.status ===
                  "DRAFT" ? (
                    <form
                      action={
                        approveOutreachDraft
                      }
                    >
                      <input
                        type="hidden"
                        name="draftId"
                        value={
                          draft.id
                        }
                      />
  
                      <input
                        type="hidden"
                        name="leadId"
                        value={
                          leadId
                        }
                      />
  
                      <button
                        type="submit"
                        className="h-8 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90"
                      >
                        Approve draft
                      </button>
                    </form>
                  ) : null}
  
                  {draft.status ===
                  "APPROVED" ? (
                    <>
                      <div className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
  
                        Ready to send
                      </div>
  
                      {recipientEmail &&
                      gmailReady ? (
                        <SendEmailButton
                          leadId={
                            leadId
                          }
                          draftId={
                            draft.id
                          }
                          recipientEmail={
                            recipientEmail
                          }
                        />
                      ) : null}
                    </>
                  ) : null}
  
                  {draft.status ===
                  "SENDING" ? (
                    <div className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700">
                      <Clock3 className="size-3.5" />
  
                      Sending...
                    </div>
                  ) : null}
  
                  {draft.status ===
                  "SENT" ? (
                    <div className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700">
                      <MailCheck className="size-3.5" />
  
                      Email sent
                    </div>
                  ) : null}
                </div>
              </div>
  
              {/* FOLLOW-UP WORKFLOW */}
  
              {draft.status ===
                "SENT" &&
              draft.follow_up_body ? (
                <div className="border-t">
                  <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
                        <CalendarClock className="size-4 text-muted-foreground" />
                      </div>
  
                      <div>
                        <p className="text-sm font-medium">
                          Follow-up
                        </p>
  
                        {draft.follow_up_sent_at ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Sent{" "}
                            {formatDateTime(
                              draft.follow_up_sent_at
                            )}
                          </p>
                        ) : followUpDue ? (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            Follow-up is due now
                          </p>
                        ) : followUpScheduled &&
                          followUpDueAt ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Scheduled for{" "}
                            {formatDateTime(
                              followUpDueAt.toISOString()
                            )}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            No follow-up date scheduled.
                          </p>
                        )}
                      </div>
                    </div>
  
                    <div className="flex flex-wrap items-center gap-2">
                      {draft.follow_up_sent_at ? (
                        <div className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700">
                          <MailCheck className="size-3.5" />
  
                          Follow-up sent
                        </div>
                      ) : followUpDue &&
                        recipientEmail &&
                        gmailReady ? (
                        <SendFollowUpButton
                          leadId={
                            leadId
                          }
                          draftId={
                            draft.id
                          }
                          recipientEmail={
                            recipientEmail
                          }
                        />
                      ) : followUpScheduled ? (
                        <div className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs text-muted-foreground">
                          <Clock3 className="size-3.5" />
  
                          Waiting
                        </div>
                      ) : null}
                    </div>
                  </div>
  
                  {draft.follow_up_send_error ? (
                    <div className="border-t border-red-200 bg-red-50 px-5 py-3">
                      <div className="flex items-start gap-2 text-red-700">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
  
                        <div>
                          <p className="text-xs font-medium">
                            Follow-up could not be sent
                          </p>
  
                          <p className="mt-1 text-xs leading-5">
                            {
                              draft.follow_up_send_error
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
  
                  <details className="group border-t">
                    <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium transition-colors hover:bg-muted/30">
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          Preview follow-up
                        </span>
  
                        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                      </div>
                    </summary>
  
                    <div className="border-t px-5 py-6">
                      <div className="mx-auto max-w-[760px]">
                        <EmailBody
                          body={
                            draft.follow_up_body
                          }
                        />
                      </div>
                    </div>
                  </details>
                </div>
              ) : null}
  
              {/* EDIT */}
  
              {canEdit ? (
                <details className="group border-t">
                  <summary className="cursor-pointer list-none px-5 py-4 transition-colors hover:bg-muted/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <PencilLine className="size-4 text-muted-foreground" />
  
                        <span className="text-sm font-medium">
                          Edit draft
                        </span>
                      </div>
  
                      <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
  
                  <form
                    action={
                      updateOutreachDraft
                    }
                    className="border-t bg-muted/10 px-5 py-5"
                  >
                    <input
                      type="hidden"
                      name="draftId"
                      value={
                        draft.id
                      }
                    />
  
                    <input
                      type="hidden"
                      name="leadId"
                      value={
                        leadId
                      }
                    />
  
                    <div className="mx-auto max-w-[760px] space-y-5">
                      <div>
                        <label
                          htmlFor={`outreach-subject-${draft.id}`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Subject
                        </label>
  
                        <input
                          id={`outreach-subject-${draft.id}`}
                          name="subject"
                          type="text"
                          required
                          defaultValue={
                            draft.subject ??
                            ""
                          }
                          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
                        />
                      </div>
  
                      <div>
                        <label
                          htmlFor={`outreach-body-${draft.id}`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Message
                        </label>
  
                        <textarea
                          id={`outreach-body-${draft.id}`}
                          name="body"
                          required
                          rows={
                            12
                          }
                          defaultValue={
                            getEditableMessage(
                              draft.body
                            )
                          }
                          className="mt-2 min-h-[260px] w-full resize-y rounded-md border bg-background px-3 py-3 text-sm leading-7 outline-none transition-shadow focus:ring-2 focus:ring-ring"
                        />
  
                        <div className="mt-3 rounded-md border bg-background px-3 py-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Signature added automatically
                          </p>
  
                          <div className="mt-2 text-xs leading-5 text-muted-foreground">
                            <p>
                              Mit freundlichen Grüßen / Kind regards,
                            </p>
  
                            <p className="mt-2 font-medium text-foreground">
                              Joel Cimpean
                            </p>
  
                            <p>
                              hello@joelcimpean.com / joelcimpean.com
                            </p>
                          </div>
                        </div>
                      </div>
  
                      <div>
                        <label
                          htmlFor={`outreach-followup-${draft.id}`}
                          className="text-xs font-medium text-muted-foreground"
                        >
                          Follow-up
                        </label>
  
                        <textarea
                          id={`outreach-followup-${draft.id}`}
                          name="followUpBody"
                          rows={
                            7
                          }
                          defaultValue={
                            getEditableMessage(
                              draft.follow_up_body
                            )
                          }
                          className="mt-2 min-h-[170px] w-full resize-y rounded-md border bg-background px-3 py-3 text-sm leading-7 outline-none transition-shadow focus:ring-2 focus:ring-ring"
                        />
                      </div>
  
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                        <p className="max-w-md text-xs leading-5 text-muted-foreground">
                          Editing an approved draft will require approval again before sending.
                        </p>
  
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
                        >
                          <Save className="size-3.5" />
  
                          Save changes
                        </button>
                      </div>
                    </div>
                  </form>
                </details>
              ) : null}
  
              {/* PERSONALIZATION */}
  
              {personalizationPoints.length >
              0 ? (
                <details className="group border-t">
                  <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium transition-colors hover:bg-muted/30">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        Personalization details
                      </span>
  
                      <span className="text-xs font-normal text-muted-foreground">
                        {
                          personalizationPoints.length
                        }{" "}
                        insights
                      </span>
                    </div>
                  </summary>
  
                  <div className="border-t bg-muted/10 px-5 py-4">
                    <div className="space-y-2.5">
                      {personalizationPoints.map(
                        (
                          point,
                          index
                        ) => (
                          <div
                            key={`${point}-${index}`}
                            className="flex items-start gap-2.5 text-sm leading-6"
                          >
                            <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-emerald-600" />
  
                            <span>
                              {
                                point
                              }
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </details>
              ) : null}
  
              {/* DETAILS */}
  
              <details className="border-t">
                <summary className="cursor-pointer list-none px-5 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/30">
                  Generation & delivery details
                </summary>
  
                <div className="grid gap-4 border-t bg-muted/10 px-5 py-4 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>
                    <p>
                      Model
                    </p>
  
                    <p className="mt-1 text-foreground">
                      {draft.model ??
                        "—"}
                    </p>
                  </div>
  
                  <div>
                    <p>
                      Generated
                    </p>
  
                    <p className="mt-1 text-foreground">
                      {formatDateTime(
                        draft.created_at
                      )}
                    </p>
                  </div>
  
                  <div>
                    <p>
                      Total tokens
                    </p>
  
                    <p className="mt-1 text-foreground">
                      {draft.total_tokens?.toLocaleString(
                        "de-DE"
                      ) ??
                        "—"}
                    </p>
                  </div>
  
                  <div>
                    <p>
                      Channel
                    </p>
  
                    <p className="mt-1 text-foreground">
                      {draft.channel}
                      {" · "}
                      {draft.language}
                    </p>
                  </div>
  
                  {draft.gmail_message_id ? (
                    <div>
                      <p>
                        Gmail message ID
                      </p>
  
                      <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                        {
                          draft.gmail_message_id
                        }
                      </p>
                    </div>
                  ) : null}
  
                  {draft.gmail_follow_up_message_id ? (
                    <div>
                      <p>
                        Follow-up Gmail ID
                      </p>
  
                      <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                        {
                          draft.gmail_follow_up_message_id
                        }
                      </p>
                    </div>
                  ) : null}
                </div>
              </details>
            </>
          )}
        </CardContent>
      </Card>
    );
  }