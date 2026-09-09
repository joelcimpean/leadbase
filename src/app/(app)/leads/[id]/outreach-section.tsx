import {
  AlertCircle,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Film,
  Mail,
  MailCheck,
  PencilLine,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

import {
  GenerateOutreachButton,
} from "./generate-outreach-button";

import {
  OutreachGifPreference,
} from "./outreach-gif-preference";

import {
  SendEmailButton,
} from "./send-email-button";

import {
  SendFollowUpButton,
} from "./send-follow-up-button";

import {
  applyDiscoveredEmailCandidate,
  approveOutreachDraft,
  cancelScheduledOutreach,
  resetSentOutreachDraft,
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
  PendingSubmitButton,
} from "@/components/pending-submit-button";

import {
  getEmailQualityLabel,
} from "@/lib/email-quality";

import {
  evaluateOutreachQuality,
} from "@/lib/outreach-quality";

import {
  type AppLanguage,
} from "@/lib/i18n";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  leadsCopy,
} from "@/lib/leads-i18n";

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
  value:
    | T
    | T[]
    | null
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
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );

  if (
    parts.length ===
    0
  ) {
    return "";
  }

  if (
    parts.length ===
    1
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
    parts.length -
    1;

  while (
    start >
      0 &&
    particles.has(
      parts[
        start -
          1
      ].toLowerCase()
    )
  ) {
    start -=
      1;
  }

  return parts
    .slice(
      start
    )
    .join(
      " "
    );
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
    index ===
    -1
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
  if (
    !value
  ) {
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
    | undefined,
  language:
    AppLanguage
) {
  if (
    !date
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-IE",
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

      timeZone:
        "Europe/Berlin",
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
    case "SCHEDULED":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400";

    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "SENDING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400";

    case "SENT":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400";

    case "ARCHIVED":
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
  }
}

function draftStatusLabel(
  status: string,
  language:
    AppLanguage
) {
  const text =
    leadsCopy[
      language
    ].outreach;

  switch (
    status
  ) {
    case "SCHEDULED":
      return language ===
          "de"
        ? "Geplant"
        : "Scheduled";

    case "APPROVED":
      return text.statusApproved;

    case "SENDING":
      return text.statusSending;

    case "SENT":
      return text.statusSent;

    case "ARCHIVED":
      return text.statusArchived;

    default:
      return text.statusDraft;
  }
}

/* =========================================================
   SIGNATURE
========================================================= */

function Signature() {
  return (
    <div className="mt-7 break-words text-sm leading-6">
      <p>
        Mit freundlichen Grüßen / Kind regards,
      </p>

      <div className="mt-4">
        <p className="font-medium">
          Joel Cimpean
        </p>

        <p className="mt-0.5 break-words text-muted-foreground">
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
    <div className="min-w-0">
      <div className="whitespace-pre-wrap break-words text-[14px] leading-7 text-foreground">
        {
          message
        }
      </div>

      {hasSignature ? (
        <Signature />
      ) : null}
    </div>
  );
}

function smartFollowUpLabel(
  mode:
    string
    | null
    | undefined,
  language:
    "de"
    | "en"
) {
  const de =
    language ===
    "de";

  switch (
    mode
  ) {
    case "VIEWED":
      return de
        ? "Smart · Vorschau gesehen"
        : "Smart · Preview viewed";

    case "ENGAGED":
      return de
        ? "Smart · Vorschau aktiv angesehen"
        : "Smart · Preview engaged";

    case "REPEAT":
      return de
        ? "Smart · Starkes Interesse"
        : "Smart · Strong engagement";

    case "OOO":
      return de
        ? "Smart · Nach Abwesenheit"
        : "Smart · After absence";

    case "REQUESTED":
      return de
        ? "Smart · Vom Kunden gewünscht"
        : "Smart · Customer requested";

    case "STOPPED":
      return de
        ? "Smart · Gestoppt"
        : "Smart · Stopped";

    default:
      return de
        ? "Smart · Standard"
        : "Smart · Standard";
  }
}

/* =========================================================
   OUTREACH
========================================================= */

export async function OutreachSection({
  leadId,
}: OutreachSectionProps) {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const text =
    leadsCopy[
      language
    ].outreach;

  const [
    draftResult,
    leadResult,
    gmailResult,
    scheduleResult,
    selectedDesignResult,
    publicPreviewsResult,
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
        .limit(
          1
        )
        .maybeSingle(),

      supabase
        .from(
          "leads"
        )
        .select(`
          id,
          status,
          outreach_gif_enabled,
          next_follow_up_at,
          smart_follow_up_mode,
          smart_follow_up_reason,
          smart_follow_up_updated_at,

          company:companies (
            id,
            name,
            website_url
          ),

          primary_contact:contacts (
            id,
            full_name,
            job_title,
            email,
            salutation,
            email_quality_status,
            email_quality_detail,
            email_source_url,
            email_candidate,
            email_candidate_source_url,
            email_checked_at
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

      supabase
        .from(
          "scheduled_emails"
        )
        .select(`
          id,
          outreach_draft_id,
          status,
          scheduled_for,
          include_preview_gif
        `)
        .eq(
          "lead_id",
          leadId
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
        )
        .limit(
          1
        )
        .maybeSingle(),

      supabase
        .from(
          "design_mockup_variants"
        )
        .select(`
          id,
          source_snapshot,
          selected,
          selected_at
        `)
        .eq(
          "lead_id",
          leadId
        )
        .eq(
          "selected",
          true
        )
        .order(
          "selected_at",
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
          "design_public_previews"
        )
        .select(`
          design_mockup_variant_id,
          public_slug,
          expires_at,
          revoked_at,
          preview_gif_status,
          preview_gif_url
        `)
        .eq(
          "lead_id",
          leadId
        ),
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

  if (
    scheduleResult.error
  ) {
    console.error(
      "Could not load scheduled outreach:",
      scheduleResult.error
    );
  }

  if (
    selectedDesignResult.error
  ) {
    console.error(
      "Could not load selected outreach design:",
      selectedDesignResult.error
    );
  }

  if (
    publicPreviewsResult.error
  ) {
    console.error(
      "Could not load outreach previews:",
      publicPreviewsResult.error
    );
  }

  const draft =
    draftResult.data;

  const lead =
    leadResult.data;

  const gmailConnection =
    gmailResult.data;

  const rawActiveSchedule =
    scheduleResult.data;

  const activeSchedule =
    rawActiveSchedule &&
    draft &&
    rawActiveSchedule.outreach_draft_id ===
      draft.id
      ? rawActiveSchedule
      : null;

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

  const preSendQuality =
    evaluateOutreachQuality({
      leadStatus:
        lead?.status ??
        null,

      companyName:
        company?.name ??
        null,

      websiteUrl:
        company?.website_url ??
        null,

      contact:
        contact
          ? {
              email:
                contact.email,

              full_name:
                contact.full_name,

              salutation:
                contact.salutation,

              email_quality_status:
                contact.email_quality_status,

              email_source_url:
                contact.email_source_url,

              email_candidate:
                contact.email_candidate,

              email_candidate_source_url:
                contact.email_candidate_source_url,
            }
          : null,

      draft:
        draft
          ? {
              subject:
                draft.subject,

              body:
                draft.body,
            }
          : null,

      selectedDesign:
        selectedDesignResult.data
          ? {
              id:
                selectedDesignResult.data.id,

              source_snapshot:
                selectedDesignResult.data.source_snapshot,
            }
          : null,

      publicPreviews:
        (
          publicPreviewsResult.data ??
          []
        ).map(
          (
            preview
          ) => ({
            design_mockup_variant_id:
              preview.design_mockup_variant_id,

            public_slug:
              preview.public_slug,

            expires_at:
              preview.expires_at,

            revoked_at:
              preview.revoked_at,
          })
        ),

      gmailReady,
    });

  const activePublicPreview =
    (
      publicPreviewsResult.data ??
      []
    ).find(
      (
        preview
      ) => {
        if (
          preview.revoked_at
        ) {
          return false;
        }

        if (
          preview.expires_at &&
          new Date(
            preview.expires_at
          ).getTime() <=
            Date.now()
        ) {
          return false;
        }

        return Boolean(
          preview.public_slug
        );
      }
    ) ??
    null;

  const outreachGifReady =
    activePublicPreview
      ?.preview_gif_status ===
      "READY" &&
    Boolean(
      activePublicPreview
        .preview_gif_url
    );

  const recipientEmail =
    contact?.email
      ?.trim() ??
    null;

  const emailQualityStatus =
    contact?.email_quality_status ??
    "UNCHECKED";

  const emailQualityBlocked =
    emailQualityStatus ===
      "MISSING" ||
    emailQualityStatus ===
      "INVALID" ||
    emailQualityStatus ===
      "PLACEHOLDER";

  const emailQualityWarning =
    emailQualityStatus ===
      "DOMAIN_MISMATCH" ||
    emailQualityStatus ===
      "SUSPICIOUS";

  const emailQualityGood =
    emailQualityStatus ===
      "VERIFIED_WEBSITE" ||
    emailQualityStatus ===
      "DOMAIN_MATCH" ||
    emailQualityStatus ===
      "GENERIC_VALID" ||
    emailQualityStatus ===
      "PERSONAL_VALID";

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

  const locale =
    language ===
      "de"
      ? "de-DE"
      : "en-IE";

  return (
    <>
      <Card
        id="outreach"
      className="min-w-0 overflow-hidden shadow-none"
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-5 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <Sparkles className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">
                  {
                    text.title
                  }
                </h2>

                {draft ? (
                  <Badge
                    variant="outline"
                    className={
                      draftStatusClass(
                        activeSchedule
                          ? "SCHEDULED"
                          : draft.status
                      )
                    }
                  >
                    {draftStatusLabel(
                      activeSchedule
                        ? "SCHEDULED"
                        : draft.status,
                      language
                    )}
                  </Badge>
                ) : null}
              </div>

              <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                {contact?.full_name
                  ? text.personalizedForPerson.replace(
                      "{name}",
                      contact.full_name
                    )
                  : company?.name
                    ? text.personalizedForCompany.replace(
                        "{name}",
                        company.name
                      )
                    : text.personalizedBasedOnResearch}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
            <GenerateOutreachButton
              leadId={
                leadId
              }
              hasDraft={Boolean(
                draft
              )}
            />
          </div>
        </div>

        {!draft ? (
          <div className="border-t px-4 py-10 sm:px-5">
            <div className="mx-auto max-w-sm text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg border">
                <Mail className="size-4 text-muted-foreground" />
              </div>

              <p className="mt-3 text-sm font-medium">
                {
                  text.noDraft
                }
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {
                  text.noDraftDescription
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="border-t px-4 py-3 sm:px-5">
              <OutreachGifPreference
                leadId={
                  leadId
                }
                initialEnabled={
                  lead?.outreach_gif_enabled ??
                  true
                }
                gifReady={
                  outreachGifReady
                }
              />
            </div>

            <div className="border-t bg-muted/20 px-4 py-4 sm:px-5">
              <div className="grid gap-4">
                <div className="grid min-w-0 gap-2 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-start">
                  <p className="pt-0.5 text-xs font-medium text-muted-foreground">
                    {
                      text.recipient
                    }
                  </p>

                  <div className="flex min-w-0 items-start gap-2">
                    <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">
                        {contact?.full_name ??
                          company?.name ??
                          text.unknownRecipient}
                      </p>

                      <p className="mt-0.5 break-all text-xs text-muted-foreground">
                        {recipientEmail ??
                          text.noEmailAddress}
                      </p>

                      {contact?.job_title ? (
                        <p className="mt-0.5 break-words text-xs text-muted-foreground">
                          {
                            contact.job_title
                          }
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                {contact ? (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-start">
                    <p className="pt-0.5 text-xs font-medium text-muted-foreground">
                      {language ===
                      "de"
                        ? "E-Mail-Prüfung"
                        : "Email check"}
                    </p>

                    <div
                      className={`min-w-0 rounded-lg border px-3 py-2.5 ${
                        emailQualityBlocked
                          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                          : emailQualityWarning
                            ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                            : emailQualityGood
                              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                              : "bg-background"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            emailQualityBlocked
                              ? "text-red-700 dark:text-red-300"
                              : emailQualityWarning
                                ? "text-amber-700 dark:text-amber-300"
                                : emailQualityGood
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {emailQualityBlocked ||
                          emailQualityWarning ? (
                            <AlertCircle className="size-3.5" />
                          ) : (
                            <CheckCircle2 className="size-3.5" />
                          )}

                          {getEmailQualityLabel(
                            emailQualityStatus,
                            language
                          )}
                        </span>

                        {contact.email_source_url ? (
                          <a
                            href={
                              contact.email_source_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                          >
                            {language ===
                            "de"
                              ? "Quelle öffnen"
                              : "Open source"}
                          </a>
                        ) : null}
                      </div>

                      {contact.email_quality_detail ? (
                        <p className="mt-1.5 break-words text-[11px] leading-5 text-muted-foreground">
                          {
                            contact.email_quality_detail
                          }
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                          {language ===
                          "de"
                            ? "Wird bei der nächsten Website-Analyse geprüft."
                            : "Will be checked during the next website analysis."}
                        </p>
                      )}

                      {contact.email_candidate ? (
                        <div className="mt-2.5 flex flex-col gap-2 rounded-md border bg-background/80 p-2.5 min-[500px]:flex-row min-[500px]:items-center min-[500px]:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {language ===
                              "de"
                                ? "Auf Website gefunden"
                                : "Found on website"}
                            </p>

                            <p className="mt-0.5 break-all text-xs font-semibold">
                              {
                                contact.email_candidate
                              }
                            </p>

                            {contact.email_candidate_source_url ? (
                              <a
                                href={
                                  contact.email_candidate_source_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                              >
                                {language ===
                                "de"
                                  ? "Fundstelle ansehen"
                                  : "View source"}
                              </a>
                            ) : null}
                          </div>

                          {contact.id ? (
                            <form
                              action={
                                applyDiscoveredEmailCandidate
                              }
                              className="shrink-0"
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

                              <PendingSubmitButton
                                pendingText={
                                  language ===
                                    "de"
                                    ? "Übernimmt..."
                                    : "Applying..."
                                }
                                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 min-[500px]:w-auto"
                              >
                                {language ===
                                "de"
                                  ? "Adresse übernehmen"
                                  : "Use this address"}
                              </PendingSubmitButton>
                            </form>
                          ) : null}
                        </div>
                      ) : null}

                      {emailQualityBlocked ? (
                        <p className="mt-2 text-[10px] font-semibold text-red-700 dark:text-red-300">
                          {language ===
                          "de"
                            ? "Leadbase blockiert Freigabe, geplanten Versand und direkten Versand, bis die Adresse korrigiert ist."
                            : "Leadbase blocks approval, scheduling and sending until the address is corrected."}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {contact?.id &&
                contact.full_name &&
                canEditSalutation ? (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center">
                    <p className="text-xs font-medium text-muted-foreground">
                      {
                        text.salutation
                      }
                    </p>

                    <div className="min-w-0">
                      <form
                        action={
                          updateLeadContactSalutation
                        }
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-wrap sm:items-center"
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
                          className="h-10 min-w-0 rounded-md border bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring sm:h-8"
                        >
                          <option value="">
                            {
                              text.neutral
                            }
                          </option>

                          <option value="HERR">
                            Herr
                          </option>

                          <option value="FRAU">
                            Frau
                          </option>
                        </select>

                        <PendingSubmitButton
                          pendingText={
                            language ===
                              "de"
                              ? "Speichert..."
                              : "Saving..."
                          }
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted sm:h-8"
                        >
                          {
                            text.save
                          }
                        </PendingSubmitButton>
                      </form>

                      <p className="mt-2 break-words text-xs text-muted-foreground">
                        {
                          text.preview
                        }
                        :{" "}
                        <span className="text-foreground">
                          {
                            greeting
                          }
                        </span>
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="grid min-w-0 gap-2 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-start">
                  <p className="pt-0.5 text-xs font-medium text-muted-foreground">
                    {
                      text.subject
                    }
                  </p>

                  <p className="break-words text-sm font-medium">
                    {draft.subject ??
                      "—"}
                  </p>
                </div>

                {activeSchedule ? (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-start">
                    <p className="pt-0.5 text-xs font-medium text-muted-foreground">
                      {language ===
                      "de"
                        ? "Geplant"
                        : "Scheduled"}
                    </p>

                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 dark:text-violet-400">
                        <CalendarClock className="size-4" />

                        {formatDateTime(
                          activeSchedule.scheduled_for,
                          language
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {activeSchedule.status ===
                        "PROCESSING"
                          ? language ===
                              "de"
                            ? "Wird gerade für den Versand verarbeitet."
                            : "Currently being processed for sending."
                          : language ===
                              "de"
                            ? "Wird automatisch zu diesem Zeitpunkt gesendet."
                            : "Will be sent automatically at this time."}
                      </p>

                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Film className="size-3.5" />
                        {language ===
                          "de"
                          ? `Animierte Vorschau: ${
                              activeSchedule.include_preview_gif
                                ? "AN"
                                : "AUS"
                            }`
                          : `Animated preview: ${
                              activeSchedule.include_preview_gif
                                ? "ON"
                                : "OFF"
                            }`}
                      </p>
                    </div>
                  </div>
                ) : null}

                {draft.sent_at ? (
                  <div className="grid min-w-0 gap-2 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-start">
                    <p className="pt-0.5 text-xs font-medium text-muted-foreground">
                      {
                        text.sent
                      }
                    </p>

                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {formatDateTime(
                          draft.sent_at,
                          language
                        )}
                      </p>

                      {draft.sent_to ? (
                        <p className="mt-0.5 break-all text-xs text-muted-foreground">
                          {
                            text.to
                          }{" "}
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

            {draft.status !==
            "SENT" ? (
              <div className="border-t bg-background">
                <details
                  open={
                    !preSendQuality.ready
                  }
                  className="group"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
                        preSendQuality.ready
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                      }`}
                    >
                      <ShieldCheck className="size-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold">
                          {language ===
                          "de"
                            ? "Versand-Check"
                            : "Pre-send check"}
                        </p>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                            preSendQuality.ready
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-red-500/10 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {preSendQuality.ready
                            ? language ===
                                "de"
                              ? "Bereit"
                              : "Ready"
                            : language ===
                                "de"
                              ? `${preSendQuality.blockers.length} Problem${preSendQuality.blockers.length === 1 ? "" : "e"}`
                              : `${preSendQuality.blockers.length} blocker${preSendQuality.blockers.length === 1 ? "" : "s"}`}
                        </span>

                        {preSendQuality.warnings.length >
                        0 ? (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300">
                            {preSendQuality.warnings.length}{" "}
                            {language ===
                            "de"
                              ? "Hinweis"
                              : "warning"}
                            {preSendQuality.warnings.length ===
                            1
                              ? ""
                              : language ===
                                  "de"
                                ? "e"
                                : "s"}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {preSendQuality.ready
                          ? language ===
                              "de"
                            ? "Alle kritischen Voraussetzungen für den Versand sind erfüllt."
                            : "All critical send requirements are satisfied."
                          : language ===
                              "de"
                            ? "Leadbase blockiert den Versand, bis die roten Punkte behoben sind."
                            : "Leadbase blocks sending until all red items are fixed."}
                      </p>
                    </div>

                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="border-t px-4 py-3 sm:px-5">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {preSendQuality.items.map(
                        (
                          item
                        ) => (
                          <div
                            key={
                              item.key
                            }
                            className={`rounded-lg border px-3 py-2.5 ${
                              item.severity ===
                              "blocker"
                                ? "border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20"
                                : item.severity ===
                                    "warning"
                                  ? "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20"
                                  : "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/15"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {item.severity ===
                              "blocker" ? (
                                <AlertCircle className="size-3.5 shrink-0 text-red-600 dark:text-red-400" />
                              ) : item.severity ===
                                  "warning" ? (
                                <AlertCircle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              )}

                              <p className="text-[11px] font-semibold">
                                {
                                  item.label
                                }
                              </p>
                            </div>

                            <p className="mt-1.5 break-words text-[10px] leading-4 text-muted-foreground">
                              {
                                item.detail
                              }
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </details>
              </div>
            ) : null}

            <div className="min-w-0 border-t px-4 py-5 sm:px-5 sm:py-6">
              <div className="mx-auto min-w-0 max-w-[760px]">
                <EmailBody
                  body={
                    draft.body
                  }
                />
              </div>
            </div>

            {draft.send_error ? (
              <div className="border-t border-red-200 bg-red-50 px-4 py-3 sm:px-5 dark:border-red-900 dark:bg-red-950/40">
                <div className="flex min-w-0 items-start gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />

                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {
                        text.emailCouldNotBeSent
                      }
                    </p>

                    <p className="mt-1 break-words text-xs leading-5">
                      {
                        draft.send_error
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t bg-muted/10 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5 sm:py-3">
              <div className="flex min-w-0 items-start gap-2 text-xs leading-5 text-muted-foreground sm:items-center">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 sm:mt-0" />

                <span className="break-words">
                  {personalizationPoints.length ===
                  1
                    ? text.personalizedUsingOne
                    : text.personalizedUsingMany.replace(
                        "{count}",
                        String(
                          personalizationPoints.length
                        )
                      )}
                </span>
              </div>

              <div className="flex w-full flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap sm:w-auto sm:items-center [&>form]:w-full min-[420px]:[&>form]:w-auto">
                {activeSchedule ? (
                  <>
                    <div className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-3 text-xs font-medium text-violet-700 min-[420px]:w-auto sm:h-8 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400">
                      <CalendarClock className="size-3.5" />

                      {language ===
                      "de"
                        ? `Geplant · ${formatDateTime(
                            activeSchedule.scheduled_for,
                            language
                          )}`
                        : `Scheduled · ${formatDateTime(
                            activeSchedule.scheduled_for,
                            language
                          )}`}
                    </div>

                    {activeSchedule.status ===
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
                            leadId
                          }
                        />

                        <PendingSubmitButton
                          pendingText={
                            language ===
                              "de"
                              ? "Wird gestoppt..."
                              : "Cancelling..."
                          }
                          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-[420px]:w-auto sm:h-8"
                        >
                          <CalendarX2 className="size-3.5" />

                          {language ===
                          "de"
                            ? "Geplanten Versand stoppen"
                            : "Cancel scheduled send"}
                        </PendingSubmitButton>
                      </form>
                    ) : null}
                  </>
                ) : (
                  <>
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

                        <PendingSubmitButton
                          pendingText={
                            language ===
                              "de"
                              ? "Wird freigegeben..."
                              : "Approving..."
                          }
                          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:h-8 sm:w-auto"
                        >
                          {
                            text.approveDraft
                          }
                        </PendingSubmitButton>
                      </form>
                    ) : null}

                    {draft.status ===
                    "APPROVED" ? (
                      <>
                        <div className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 min-[420px]:w-auto sm:h-8 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />

                          {
                            text.readyToSend
                          }
                        </div>

                        {recipientEmail &&
                        gmailReady ? (
                          <div className="w-full min-[420px]:w-auto [&>*]:w-full min-[420px]:[&>*]:w-auto">
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
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </>
                )}

                {draft.status ===
                "SENDING" ? (
                  <div className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700 min-[420px]:w-auto sm:h-8 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                    <Clock3 className="size-3.5" />

                    {
                      text.sending
                    }
                  </div>
                ) : null}

                {draft.status ===
                "SENT" ? (
                  <>
                    <div className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 min-[420px]:w-auto sm:h-8 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                      <MailCheck className="size-3.5" />

                      {
                        text.emailSent
                      }
                    </div>

                    {!draft.follow_up_sent_at ? (
                      <form
                        action={
                          resetSentOutreachDraft
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

                        <PendingSubmitButton
                          pendingText={
                            language ===
                              "de"
                              ? "Wird zurückgesetzt..."
                              : "Resetting..."
                          }
                          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-[420px]:w-auto sm:h-8"
                        >
                          <RotateCcw className="size-3.5" />

                          {language ===
                          "de"
                            ? "Empfänger korrigieren"
                            : "Correct recipient"}
                        </PendingSubmitButton>
                      </form>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            {draft.status ===
              "SENT" &&
            draft.follow_up_body ? (
              <div className="border-t">
                <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
                      <CalendarClock className="size-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {
                          text.followUp
                        }
                      </p>

                      {draft.follow_up_sent_at ? (
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {text.followUpSentAt.replace(
                            "{date}",
                            formatDateTime(
                              draft.follow_up_sent_at,
                              language
                            )
                          )}
                        </p>
                      ) : followUpDue ? (
                        <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                          {
                            text.followUpDue
                          }
                        </p>
                      ) : followUpScheduled &&
                        followUpDueAt ? (
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {text.scheduledFor.replace(
                            "{date}",
                            formatDateTime(
                              followUpDueAt.toISOString(),
                              language
                            )
                          )}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {
                            text.noFollowUpScheduled
                          }
                        </p>
                      )}

                      {!draft.follow_up_sent_at &&
                      lead?.smart_follow_up_mode ? (
                        <span className="mt-2 inline-flex items-center rounded-full border bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {smartFollowUpLabel(
                            lead.smart_follow_up_mode,
                            language
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
                    {draft.follow_up_sent_at ? (
                      <div className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 sm:h-8 sm:w-auto dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                        <MailCheck className="size-3.5" />

                        {
                          text.followUpSent
                        }
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
                      <div className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border px-3 text-xs text-muted-foreground sm:h-8 sm:w-auto">
                        <Clock3 className="size-3.5" />

                        {
                          text.waiting
                        }
                      </div>
                    ) : null}
                  </div>
                </div>

                {draft.follow_up_send_error ? (
                  <div className="border-t border-red-200 bg-red-50 px-4 py-3 sm:px-5 dark:border-red-900 dark:bg-red-950/40">
                    <div className="flex min-w-0 items-start gap-2 text-red-700 dark:text-red-400">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />

                      <div className="min-w-0">
                        <p className="text-xs font-medium">
                          {
                            text.followUpCouldNotBeSent
                          }
                        </p>

                        <p className="mt-1 break-words text-xs leading-5">
                          {
                            draft.follow_up_send_error
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <details className="group border-t">
                  <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium transition-colors hover:bg-muted/30 sm:px-5">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {
                          text.previewFollowUp
                        }
                      </span>

                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </div>
                  </summary>

                  <div className="min-w-0 border-t px-4 py-5 sm:px-5 sm:py-6">
                    <div className="mx-auto min-w-0 max-w-[760px]">
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

            {canEdit ? (
              <details className="group border-t">
                <summary className="cursor-pointer list-none px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <PencilLine className="size-4 shrink-0 text-muted-foreground" />

                      <span className="text-sm font-medium">
                        {
                          text.editDraft
                        }
                      </span>
                    </div>

                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <form
                  action={
                    updateOutreachDraft
                  }
                  className="border-t bg-muted/10 px-4 py-5 sm:px-5"
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

                  <div className="mx-auto min-w-0 max-w-[760px] space-y-5">
                    <div className="min-w-0">
                      <label
                        htmlFor={`outreach-subject-${draft.id}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {
                          text.subject
                        }
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
                        className="mt-2 h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring sm:h-10"
                      />
                    </div>

                    <div className="min-w-0">
                      <label
                        htmlFor={`outreach-body-${draft.id}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {
                          text.message
                        }
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
                        className="mt-2 min-h-[300px] w-full min-w-0 resize-y rounded-md border bg-background px-3 py-3 text-sm leading-7 outline-none transition-shadow focus:ring-2 focus:ring-ring sm:min-h-[260px]"
                      />

                      <div className="mt-3 rounded-md border bg-background px-3 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {
                            text.signatureAddedAutomatically
                          }
                        </p>

                        <div className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                          <p>
                            Mit freundlichen Grüßen / Kind regards,
                          </p>

                          <p className="mt-2 font-medium text-foreground">
                            Joel Cimpean
                          </p>

                          <p className="break-all">
                            hello@joelcimpean.com / joelcimpean.com
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <label
                        htmlFor={`outreach-followup-${draft.id}`}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {
                          text.followUp
                        }
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
                        className="mt-2 min-h-[190px] w-full min-w-0 resize-y rounded-md border bg-background px-3 py-3 text-sm leading-7 outline-none transition-shadow focus:ring-2 focus:ring-ring sm:min-h-[170px]"
                      />
                    </div>

                    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <p className="max-w-md text-xs leading-5 text-muted-foreground">
                        {
                          text.editApprovedWarning
                        }
                      </p>

                      <PendingSubmitButton
                        pendingText={
                          language ===
                            "de"
                            ? "Speichert..."
                            : "Saving..."
                        }
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:h-9 sm:w-auto"
                      >
                        <Save className="size-3.5" />

                        {
                          leadsCopy[
                            language
                          ].common.saveChanges
                        }
                      </PendingSubmitButton>
                    </div>
                  </div>
                </form>
              </details>
            ) : null}

            {personalizationPoints.length >
            0 ? (
              <details className="group border-t">
                <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium transition-colors hover:bg-muted/30 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      {
                        text.personalizationDetails
                      }
                    </span>

                    <span className="shrink-0 text-xs font-normal text-muted-foreground">
                      {personalizationPoints.length ===
                      1
                        ? text.oneInsight
                        : text.manyInsights.replace(
                            "{count}",
                            String(
                              personalizationPoints.length
                            )
                          )}
                    </span>
                  </div>
                </summary>

                <div className="border-t bg-muted/10 px-4 py-4 sm:px-5">
                  <div className="space-y-2.5">
                    {personalizationPoints.map(
                      (
                        point,
                        index
                      ) => (
                        <div
                          key={`${point}-${index}`}
                          className="flex min-w-0 items-start gap-2.5 text-sm leading-6"
                        >
                          <CheckCircle2 className="mt-1 size-3.5 shrink-0 text-emerald-600" />

                          <span className="break-words">
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

            <details className="border-t">
              <summary className="cursor-pointer list-none px-4 py-4 text-xs text-muted-foreground transition-colors hover:bg-muted/30 sm:px-5 sm:py-3">
                {
                  text.generationDeliveryDetails
                }
              </summary>

              <div className="grid gap-4 border-t bg-muted/10 px-4 py-4 text-xs text-muted-foreground sm:grid-cols-2 sm:px-5">
                <div className="min-w-0">
                  <p>
                    {
                      text.model
                    }
                  </p>

                  <p className="mt-1 break-words text-foreground">
                    {draft.model ??
                      "—"}
                  </p>
                </div>

                <div className="min-w-0">
                  <p>
                    {
                      text.generated
                    }
                  </p>

                  <p className="mt-1 text-foreground">
                    {formatDateTime(
                      draft.created_at,
                      language
                    )}
                  </p>
                </div>

                <div className="min-w-0">
                  <p>
                    {
                      text.totalTokens
                    }
                  </p>

                  <p className="mt-1 text-foreground">
                    {draft.total_tokens?.toLocaleString(
                      locale
                    ) ??
                      "—"}
                  </p>
                </div>

                <div className="min-w-0">
                  <p>
                    {
                      text.channel
                    }
                  </p>

                  <p className="mt-1 break-words text-foreground">
                    {
                      draft.channel
                    }

                    {" · "}

                    {
                      draft.language
                    }
                  </p>
                </div>

                {draft.gmail_message_id ? (
                  <div className="min-w-0">
                    <p>
                      {
                        text.gmailMessageId
                      }
                    </p>

                    <p className="mt-1 break-all font-mono text-[11px] text-foreground">
                      {
                        draft.gmail_message_id
                      }
                    </p>
                  </div>
                ) : null}

                {draft.gmail_follow_up_message_id ? (
                  <div className="min-w-0">
                    <p>
                      {
                        text.followUpGmailId
                      }
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
    </>
  );
}