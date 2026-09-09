import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  Eye,
  ExternalLink,
  FileText,
  FolderKanban,
  Save,
  Send,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  CopyProposalLink,
} from "./copy-proposal-link";

import {
  ProposalBrandingFields,
} from "./proposal-branding-fields";

import {
  deleteProposalTemplate,
  saveProposal,
  saveProposalAsTemplate,
  sendProposalToClient,
} from "./actions";

import {
  PendingSubmitButton,
} from "@/components/pending-submit-button";

import {
  ExternalFormSubmitButton,
} from "@/components/external-form-submit-button";


import {
  ProposalAiAutofillButton,
} from "@/components/proposal-ai-autofill-button";

import {
  ProposalSectionsBuilder,
} from "@/components/proposal-sections-builder";

import {
  ProposalBuilderTabs,
} from "@/components/proposal-builder-tabs";

import {
  ProposalScopeEditor,
} from "@/components/proposal-scope-editor";

import {
  ProposalLivePreview,
} from "@/components/proposal-live-preview";

import {
  ProposalDesignTemplatePicker,
} from "@/components/proposal-design-template-picker";

import {
  normalizeProposalDesignTemplate,
} from "@/lib/proposal-design-templates";

import {
  ProposalReadinessCard,
} from "@/components/proposal-readiness-card";

import {
  ProposalLanguageSwitch,
} from "./proposal-language-switch";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  defaultProposalCustomSections,
  normalizeProposalSections,
} from "@/lib/proposal-sections";

import {
  assessProposalEmailHistory,
} from "@/lib/proposal-email-history";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

type ProposalPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    saved?: string;
    reopened?: string;
    error?: string;
    template?: string;
    templateSaved?: string;
    templateDeleted?: string;
    proposalSent?: string;
    proposalLanguage?: string;
  }>;
};

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value ?? null;
}

function formatDefaultScope(
  language: "de" | "en"
) {
  return language === "de"
    ? [
        "Konzeption und visuelle Überarbeitung der Website",
        "Responsive Umsetzung für Desktop, Tablet und Mobile",
        "Optimierung von Struktur, Nutzerführung und Call-to-Actions",
        "Aufbereitung der vorhandenen Inhalte und Vertrauenselemente",
        "Technische Veröffentlichung und finale Qualitätskontrolle",
      ].join("\n")
    : [
        "Website concept and visual redesign",
        "Responsive implementation for desktop, tablet and mobile",
        "Structure, user journey and call-to-action optimization",
        "Refinement of existing content and trust elements",
        "Technical launch and final quality check",
      ].join("\n");
}

type ProposalTemplateRow = {
  id: string;
  name: string;
  payload: unknown;
  updated_at?: string | null;
};

type ProposalTemplatePayload = {
  title?: unknown;
  introText?: unknown;
  scope?: unknown;
  timelineText?: unknown;
  price?: unknown;
  currency?: unknown;
  notes?: unknown;
  accentColor?: unknown;
  logoUrl?: unknown;
  firstTimeClient?: unknown;
  customSections?: unknown;
};

function templateString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function materializeTemplateText(
  value: unknown,
  companyName: string,
  contactName: string
) {
  return templateString(value)
    .split("{{client}}")
    .join(companyName)
    .split("{{contact}}")
    .join(contactName);
}

function templateScope(
  value: unknown,
  companyName: string,
  contactName: string
) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => materializeTemplateText(item, companyName, contactName))
        .join("\n")
    : "";
}

function templateNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export default async function ProposalPage({
  params,
  searchParams,
}: ProposalPageProps) {
  const [
    { id },
    query,
    language,
    supabase,
  ] =
    await Promise.all([
      params,
      searchParams,
      getAppLanguage(),
      createClient(),
    ]);

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const userProposalBranding = (user.user_metadata?.leadbase_proposal_branding ?? {}) as {
    accentColor?: unknown;
    logoUrl?: unknown;
  };

  const userDefaultAccentColor =
    typeof userProposalBranding.accentColor === "string" && /^#[0-9A-F]{6}$/i.test(userProposalBranding.accentColor)
      ? userProposalBranding.accentColor.toUpperCase()
      : "#002BBA";

  const userDefaultLogoUrl =
    typeof userProposalBranding.logoUrl === "string" && userProposalBranding.logoUrl.trim()
      ? userProposalBranding.logoUrl.trim()
      : null;

  const {
    data: lead,
    error: leadError,
  } =
    await supabase
      .from("leads")
      .select(`
        id,
        estimated_project_value,
        currency,

        company:companies (
          name,
          website_url
        ),

        primary_contact:contacts (
          full_name,
          email
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

  if (
    leadError ||
    !lead
  ) {
    console.error(
      "Could not load proposal lead:",
      leadError
    );

    notFound();
  }

  const {
    data: proposal,
    error: proposalError,
  } =
    await supabase
      .from("proposals")
      .select(`
        id,
        public_token,
        status,
        revision,
        title,
        client_name,
        contact_name,
        contact_email,
        website_url,
        intro_text,
        scope,
        timeline_text,
        price,
        currency,
        valid_until,
        notes,
        custom_sections,
        accent_color,
        logo_url,
        first_time_client,
        design_template,
        proposal_number,
        language,
        pdf_emailed_at,
        pdf_email_error,
        delivery_email_error,
        sent_at,
        accepted_at,
        updated_at
      `)
      .eq("lead_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

  if (proposalError) {
    console.error(
      "Could not load proposal:",
      proposalError
    );
  }

  let linkedProject:
    | {
        id: string;
        project_name: string;
        status: string;
      }
    | null = null;

  if (proposal?.id) {
    const {
      data: projectRow,
      error: projectError,
    } = await supabase
      .from("client_projects")
      .select("id,project_name,status")
      .eq("user_id", user.id)
      .eq("source_proposal_id", proposal.id)
      .maybeSingle();

    if (projectError) {
      console.error(
        "Could not load proposal project:",
        projectError
      );
    } else {
      linkedProject = projectRow;
    }
  }

  const {
    data: templates,
    error: templatesError,
  } = await supabase
    .from("proposal_templates")
    .select("id,name,payload,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (templatesError) {
    console.error(
      "Could not load proposal templates:",
      templatesError
    );
  }

  const {
    data: proposalEmailHistory,
    error: proposalEmailHistoryError,
  } = await supabase
    .from("email_messages")
    .select(`
      direction,
      subject,
      body_text,
      received_at,
      reply_classification
    `)
    .eq("user_id", user.id)
    .eq("lead_id", id)
    .order("received_at", {
      ascending: false,
    })
    .limit(20);

  if (proposalEmailHistoryError) {
    console.error(
      "Could not check proposal email history:",
      proposalEmailHistoryError
    );
  }

  const proposalHistoryAssessment =
    assessProposalEmailHistory(
      proposalEmailHistory ?? []
    );

  const company =
    getSingleRelation(
      lead.company
    );

  const contact =
    getSingleRelation(
      lead.primary_contact
    );

  const requestedProposalLanguage =
    query.proposalLanguage === "de" ||
    query.proposalLanguage === "en"
      ? query.proposalLanguage
      : null;

  const storedProposalLanguage =
    proposal?.language === "en"
      ? "en"
      : proposal?.language === "de"
        ? "de"
        : null;

  const proposalLanguage:
    "de" | "en" =
      requestedProposalLanguage ??
      storedProposalLanguage ??
      language;

  const isGerman =
    proposalLanguage === "de";

  const companyName =
    company?.name ?? "";

  const defaultTitle =
    isGerman
      ? `Website-Redesign für ${companyName}`
      : `Website redesign for ${companyName}`;

  const templateRows =
    (templates ?? []) as ProposalTemplateRow[];

  const selectedTemplate =
    templateRows.find((template) => template.id === query.template) ?? null;

  const selectedPayload =
    selectedTemplate?.payload && typeof selectedTemplate.payload === "object"
      ? selectedTemplate.payload as ProposalTemplatePayload
      : null;

  const contactName =
    proposal?.contact_name ??
    contact?.full_name ??
    "";

  const activeTitle = selectedPayload
    ? materializeTemplateText(selectedPayload.title, companyName, contactName) || defaultTitle
    : proposal?.title ?? defaultTitle;

  const scope = selectedPayload
    ? templateScope(selectedPayload.scope, companyName, contactName) || formatDefaultScope(proposalLanguage)
    : Array.isArray(proposal?.scope)
      ? proposal.scope.join("\n")
      : formatDefaultScope(proposalLanguage);

  const activeIntro = selectedPayload
    ? materializeTemplateText(selectedPayload.introText, companyName, contactName)
    : proposal?.intro_text ??
      (isGerman
        ? `Auf Basis unseres bisherigen Austauschs habe ich für ${companyName} folgenden Projektumfang zusammengestellt.`
        : `Based on our conversation, I prepared the following project scope for ${companyName}.`);

  const activeTimeline = selectedPayload
    ? materializeTemplateText(selectedPayload.timelineText, companyName, contactName)
    : proposal?.timeline_text ??
      (isGerman
        ? "ca. 2–4 Wochen nach Projektstart"
        : "approx. 2–4 weeks after project start");

  const activePrice = selectedPayload
    ? templateNumber(selectedPayload.price) ?? Number(lead.estimated_project_value ?? 0)
    : Number(proposal?.price ?? lead.estimated_project_value ?? 0);

  const activeCurrency = selectedPayload
    ? templateString(selectedPayload.currency) || proposal?.currency || lead.currency || "EUR"
    : proposal?.currency ?? lead.currency ?? "EUR";

  const activeNotes = selectedPayload
    ? materializeTemplateText(selectedPayload.notes, companyName, contactName)
    : proposal?.notes ??
      (isGerman
        ? "50 % Anzahlung vor Projektstart, Restzahlung nach Abnahme."
        : "50% deposit before project start, remaining balance after approval.");

  const activeAccentColor = selectedPayload
    ? templateString(selectedPayload.accentColor) || userDefaultAccentColor
    : proposal?.accent_color ?? userDefaultAccentColor;

  const activeLogoUrl = selectedPayload
    ? templateString(selectedPayload.logoUrl) || userDefaultLogoUrl
    : proposal?.logo_url ?? userDefaultLogoUrl;

  const activeFirstTimeClient = selectedPayload
    ? selectedPayload.firstTimeClient !== false
    : proposal?.first_time_client ?? true;

  const activeDesignTemplate =
    normalizeProposalDesignTemplate(
      proposal?.design_template
    );

  const storedCustomSections =
    normalizeProposalSections(
      proposal?.custom_sections
    );

  const activeCustomSections = selectedPayload
    ? normalizeProposalSections(selectedPayload.customSections).map((section) => ({
        ...section,
        title: materializeTemplateText(section.title, companyName, contactName),
        content: materializeTemplateText(section.content, companyName, contactName),
      }))
    : storedCustomSections.length > 0
      ? storedCustomSections
      : defaultProposalCustomSections(proposalLanguage);

  const publicPath =
    proposal?.public_token
      ? `/proposal/${encodeURIComponent(
          proposal.public_token
        )}`
      : null;

  const isAccepted =
    proposal?.status ===
    "ACCEPTED";

  const scopeLines =
    scope
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

  const displayedStatus =
    proposal?.status ?? "DRAFT";

  const isDraft =
    !proposal ||
    displayedStatus === "DRAFT";

  const proposalStatusLabel =
    isAccepted
      ? isGerman
        ? "Angenommen"
        : "Accepted"
      : isDraft
        ? isGerman
          ? "Entwurf"
          : "Draft"
        : displayedStatus;

  const contactSummary =
    [
      contactName,
      proposal?.contact_email ??
        contact?.email ??
        "",
    ]
      .filter(Boolean)
      .join(" · ");

  const formattedPrice =
    new Intl.NumberFormat(
      isGerman
        ? "de-DE"
        : "en-US",
      {
        maximumFractionDigits: 2,
      }
    ).format(activePrice || 0);

  const ownerName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Joel Cimpean";

  return (
    <div className="flex h-full min-h-[720px] w-full flex-col overflow-hidden bg-[#F6F7F9] px-[26px] py-6 text-[#0B0C0E] dark:bg-[#0C0D10] dark:text-white">
      <WorkspacePageMotion />

      {/* HEADER */}
      <header className="shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/leads/${encodeURIComponent(id)}`}
            className="inline-flex items-center gap-1.5 text-[11.5px] text-[#6B7078] transition-colors hover:text-[#0B0C0E] dark:hover:text-white"
          >
            <ArrowLeft className="size-[13px]" />
            {isGerman
              ? "Zurück zum Lead"
              : "Back to lead"}
          </Link>

          <div className="h-3 w-px bg-black/[0.14] dark:bg-white/[0.14]" />

          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#002BBA]">
            Proposal Builder
          </div>
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="m-0 text-[42px] font-semibold leading-none tracking-[-0.035em]">
                {proposal
                  ? isGerman
                    ? "Angebot bearbeiten"
                    : "Edit proposal"
                  : isGerman
                    ? "Angebot erstellen"
                    : "Create proposal"}
              </h1>

              <span className="rounded-[6px] bg-black/[0.05] px-[9px] py-[3px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#40454E] dark:bg-white/[0.06] dark:text-[#B9BDC5]">
                {proposalStatusLabel}
              </span>
            </div>

            <p className="mt-[9px] max-w-[820px] text-[13.5px] text-[#6B7078] text-pretty">
              {isGerman
                ? "Kundendaten und Projektwert werden aus dem Lead übernommen. Speichere den Entwurf und öffne anschließend die öffentliche Angebotsseite."
                : "Customer data and project value are taken from the lead. Save the draft and then open the public proposal page."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ProposalLanguageSwitch
              language={proposalLanguage}
              disabled={isAccepted}
            />

            {publicPath ? (
              <Link
                href={publicPath}
                target="_blank"
                className="inline-flex h-[34px] items-center gap-[7px] rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] dark:border-white/[0.10] dark:bg-[#111216] dark:text-white"
              >
                <Eye className="size-3.5 opacity-60" />
                {isGerman
                  ? "Angebotsseite"
                  : "Proposal page"}
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title={isGerman ? "Nach dem ersten Speichern verfügbar" : "Available after the first save"}
                className="inline-flex h-[34px] items-center gap-[7px] rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#6B7078] opacity-60 dark:border-white/[0.10] dark:bg-[#111216]"
              >
                <Eye className="size-3.5 opacity-60" />
                {isGerman
                  ? "Angebotsseite"
                  : "Proposal page"}
              </button>
            )}

            <ExternalFormSubmitButton
              formId="proposal-builder-form"
              disabled={isAccepted}
              pendingText={
                isGerman
                  ? "Speichert…"
                  : "Saving…"
              }
              className="inline-flex h-[34px] items-center gap-[7px] rounded-[10px] bg-[#002BBA] px-[14px] text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,0.30)] transition-colors hover:bg-[#00229A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="size-3.5" />

              {isGerman
                ? "Angebot speichern"
                : "Save proposal"}
            </ExternalFormSubmitButton>
          </div>
        </div>
      </header>

      {/* STATUS MESSAGES */}
      {(query.saved === "1" || query.proposalSent === "1" || query.templateSaved === "1" || query.templateDeleted === "1" || query.error || isAccepted) ? (
        <div className={`mt-3 shrink-0 rounded-[10px] border px-3 py-2 text-[11.5px] ${query.error ? "border-red-200 bg-red-50 text-red-700" : "border-black/[0.08] bg-white text-[#40454E] dark:border-white/[0.08] dark:bg-[#111216] dark:text-[#B9BDC5]"}`}>
          {query.error
            ? query.error
            : isAccepted
              ? isGerman
                ? "Dieses Angebot wurde angenommen. Die Inhalte sind gesperrt, damit der angenommene Stand erhalten bleibt."
                : "This proposal has been accepted. Editing is locked to preserve the accepted version."
              : query.proposalSent === "1"
                ? isGerman
                  ? "Angebot wurde per Gmail an den Kunden gesendet."
                  : "Proposal was sent to the client via Gmail."
                : query.templateSaved === "1"
                  ? isGerman
                    ? "Vorlage gespeichert."
                    : "Template saved."
                  : query.templateDeleted === "1"
                    ? isGerman
                      ? "Vorlage gelöscht."
                      : "Template deleted."
                    : isGerman
                      ? "Angebot gespeichert."
                      : "Proposal saved."}
        </div>
      ) : null}

      {/* CONTEXT STRIP */}
      <section className="mt-[14px] flex shrink-0 overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,0.03)] dark:border-white/[0.08] dark:bg-[#111216]">
        <ProposalMetric className="flex-[1.7]" label={isGerman ? "Kunde" : "Client"}>
          <div className="truncate text-[14px] font-semibold tracking-[-0.015em]">
            {companyName || "—"}
          </div>
          <div className="truncate text-[11.5px] text-[#6B7078]">
            {contactSummary || "—"}
          </div>
        </ProposalMetric>

        <ProposalDivider />

        <ProposalMetric className="flex-1 bg-[linear-gradient(180deg,rgba(0,43,186,0.035),rgba(0,43,186,0))]" label={isGerman ? "Projektpreis" : "Project price"} accent>
          <div className="flex items-baseline gap-[7px]">
            <span className={`text-[26px] font-semibold tabular-nums tracking-[-0.03em] ${activePrice > 0 ? "text-[#0B0C0E] dark:text-white" : "text-[#7E838B]"}`}>
              {formattedPrice}
            </span>
            <span className="font-mono text-[11px] text-[#6B7078]">
              {activeCurrency}
            </span>
          </div>
          <div className={`text-[11px] ${activePrice > 0 ? "text-[#6B7078]" : "text-[#9A5106]"}`}>
            {activePrice > 0
              ? isGerman
                ? "Preis gesetzt"
                : "Price set"
              : isGerman
                ? "Pflichtfeld · noch nicht gesetzt"
                : "Required · not set yet"}
          </div>
        </ProposalMetric>

        <ProposalDivider />

        <ProposalMetric className="flex-1" label={isGerman ? "Gültig bis" : "Valid until"}>
          <div className="flex items-baseline gap-[7px]">
            <span className={`text-[26px] font-semibold tracking-[-0.03em] ${proposal?.valid_until ? "text-[#0B0C0E] dark:text-white" : "text-[#7E838B]"}`}>
              {proposal?.valid_until
                ? new Intl.DateTimeFormat(isGerman ? "de-DE" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${proposal.valid_until}T12:00:00`))
                : "—"}
            </span>
            {!proposal?.valid_until ? (
              <span className="text-[11.5px] text-[#6B7078]">
                {isGerman ? "offen" : "open"}
              </span>
            ) : null}
          </div>
          <div className="truncate text-[11px] text-[#6B7078]">
            {activeTimeline}
          </div>
        </ProposalMetric>

        <ProposalDivider />

        <ProposalMetric className="flex-1" label={isGerman ? "Leistungen" : "Services"}>
          <div className="flex items-baseline gap-[7px]">
            <span className="text-[26px] font-semibold tabular-nums tracking-[-0.03em]">
              {scopeLines.length}
            </span>
            <span className="text-[11.5px] text-[#6B7078]">
              + {activeCustomSections.length} {isGerman ? "Abschnitt" : "section"}
            </span>
          </div>
          <div className="truncate text-[11px] text-[#6B7078]">
            {activeCustomSections[0]?.title || (isGerman ? "Keine eigenen Abschnitte" : "No custom sections")}
          </div>
        </ProposalMetric>

        <ProposalDivider />

        <ProposalMetric className="flex-[1.15]" label={isGerman ? "Vorlage / AI" : "Template / AI"}>
          <div className="truncate text-[13.5px] font-medium tracking-[-0.01em]">
            {selectedTemplate?.name || (isGerman ? "Keine Vorlage" : "No template")}
          </div>
          <div className="truncate text-[11px] text-[#6B7078]">
            {proposalHistoryAssessment.ready
              ? isGerman
                ? "AI-Entwurf verfügbar"
                : "AI draft available"
              : isGerman
                ? "AI-Entwurf inaktiv · kein sinnvoller Verlauf"
                : "AI draft inactive · no useful thread"}
          </div>
        </ProposalMetric>
      </section>

      {/* WORK AREA */}
      <div className="mt-[14px] flex min-h-0 flex-1 gap-4">
        <form
          id="proposal-builder-form"
          action={saveProposal}
          className="flex min-w-0 flex-1"
        >
          <input type="hidden" name="leadId" value={id} />
          <input
            type="hidden"
            name="proposalLanguage"
            value={proposalLanguage}
          />

          {selectedPayload && activeLogoUrl ? (
            <input type="hidden" name="templateLogoUrl" value={activeLogoUrl} />
          ) : null}

          <ProposalBuilderTabs
            isGerman={isGerman}
            scopeCount={scopeLines.length}
            sectionCount={activeCustomSections.length}
            details={
              <div className="space-y-[14px]">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <ProposalInput
                    name="proposalNumber"
                    label={isGerman ? "Angebotsnummer" : "Proposal number"}
                    defaultValue={proposal?.proposal_number ?? ""}
                    placeholder={isGerman ? "z. B. RE-14" : "e.g. Q-14"}
                    required
                    disabled={isAccepted}
                  />
                  <ProposalInput name="title" label={isGerman ? "Titel" : "Title"} defaultValue={activeTitle} required disabled={isAccepted} />
                  <ProposalInput name="clientName" label={isGerman ? "Kunde" : "Client"} defaultValue={proposal?.client_name ?? companyName} required disabled={isAccepted} />
                  <ProposalInput name="contactName" label={isGerman ? "Ansprechpartner" : "Contact"} defaultValue={proposal?.contact_name ?? contact?.full_name ?? ""} disabled={isAccepted} />
                  <ProposalInput name="contactEmail" label={isGerman ? "Kunden-E-Mail für Bestätigungs-PDF" : "Client email for confirmation PDF"} defaultValue={proposal?.contact_email ?? contact?.email ?? ""} type="email" disabled={isAccepted} />
                </div>

                <ProposalInput
                  name="websiteUrl"
                  label="Website"
                  defaultValue={proposal?.website_url ?? company?.website_url ?? ""}
                  disabled={isAccepted}
                />

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <ProposalLabel>
                      {isGerman ? "Einleitung" : "Introduction"}
                    </ProposalLabel>
                    <ProposalAiAutofillButton
                      leadId={id}
                      isGerman={isGerman}
                      disabled={isAccepted}
                      available={proposalHistoryAssessment.ready}
                      compact
                    />
                  </div>
                  <Textarea
                    id="introText"
                    name="introText"
                    rows={3}
                    defaultValue={activeIntro}
                    disabled={isAccepted}
                    className="mt-1.5 min-h-[64px] rounded-[10px] border-black/[0.09] bg-[#F7F8FA] px-[11px] py-2.5 text-[12.5px] leading-[1.5] shadow-none focus-visible:border-[#002BBA]/45 focus-visible:ring-[3px] focus-visible:ring-[#002BBA]/10 dark:border-white/[0.10] dark:bg-white/[0.04]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <ProposalInput name="timelineText" label={isGerman ? "Zeitrahmen" : "Timeline"} defaultValue={activeTimeline} disabled={isAccepted} />
                  <ProposalInput name="validUntil" label={isGerman ? "Gültig bis" : "Valid until"} defaultValue={proposal?.valid_until ?? ""} type="date" disabled={isAccepted} />
                  <div>
                    <ProposalLabel required>
                      {isGerman ? "Projektpreis" : "Project price"}
                    </ProposalLabel>
                    <div className="mt-1.5 flex h-9 items-center gap-2 rounded-[10px] border border-[#002BBA]/45 bg-white px-[11px] shadow-[0_0_0_3px_rgba(0,43,186,0.10)] dark:bg-[#111216]">
                      <span className="text-[13px] font-medium text-[#002BBA]">€</span>
                      <input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={String(activePrice)}
                        required
                        disabled={isAccepted}
                        className="min-w-0 flex-1 bg-transparent font-mono text-[13px] tabular-nums outline-none"
                      />
                      <select
                        id="currency"
                        name="currency"
                        defaultValue={activeCurrency}
                        disabled={isAccepted}
                        className="h-6 rounded-[7px] border-0 bg-black/[0.05] px-[7px] font-mono text-[10.5px] text-[#40454E] outline-none dark:bg-white/[0.07] dark:text-white"
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="CHF">CHF</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <ProposalLabel>
                    {isGerman ? "Zusätzliche Hinweise" : "Additional notes"}
                  </ProposalLabel>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    defaultValue={activeNotes}
                    disabled={isAccepted}
                    className="mt-1.5 min-h-[52px] rounded-[10px] border-black/[0.09] bg-[#F7F8FA] px-[11px] py-2.5 text-[12.5px] leading-[1.45] shadow-none focus-visible:border-[#002BBA]/45 focus-visible:ring-[3px] focus-visible:ring-[#002BBA]/10 dark:border-white/[0.10] dark:bg-white/[0.04]"
                  />
                </div>
              </div>
            }
            scope={
              <ProposalScopeEditor
                defaultValue={scope}
                disabled={isAccepted}
                isGerman={isGerman}
              />
            }
            sections={
              <ProposalSectionsBuilder
                defaultSections={activeCustomSections}
                disabled={isAccepted}
                isGerman={isGerman}
              />
            }
            branding={
              <ProposalBrandingFields
                defaultAccentColor={activeAccentColor}
                currentLogoUrl={activeLogoUrl}
                firstTimeClient={activeFirstTimeClient}
                isGerman={isGerman}
                disabled={isAccepted}
              />
            }
            design={
              <ProposalDesignTemplatePicker
                initialTemplate={activeDesignTemplate}
                accentColor={activeAccentColor}
                isGerman={isGerman}
                disabled={isAccepted}
              />
            }
            footer={
              <div
                key="proposal-builder-footer"
                className="flex shrink-0 items-center justify-between border-t border-black/[0.07] px-[18px] py-[10px] dark:border-white/[0.08]"
              >
                <div className="flex min-w-0 items-center gap-2 text-[11.5px] text-[#6B7078]">
                  {activePrice <= 0 ? (
                    <AlertCircle className="size-3.5 shrink-0 text-[#9A5106]" />
                  ) : null}
                  <span className="truncate">
                    {isAccepted
                      ? isGerman
                        ? "Angenommener Stand · Bearbeitung gesperrt"
                        : "Accepted version · editing locked"
                      : activePrice <= 0
                        ? isGerman
                          ? "Projektpreis fehlt · Angebot kann noch nicht veröffentlicht werden"
                          : "Project price missing · proposal cannot be published yet"
                        : isGerman
                          ? "Änderungen werden beim Speichern auf der Angebotsseite aktualisiert"
                          : "Saving updates the public proposal page"}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#6B7078]">
                    {isAccepted
                      ? isGerman
                        ? "Gesperrt"
                        : "Locked"
                      : isGerman
                        ? "Nicht gespeichert"
                        : "Unsaved"}
                  </span>

                  <PendingSubmitButton
                    className="inline-flex h-[32px] items-center gap-1.5 rounded-[9px] bg-[#002BBA] px-3 text-[12.5px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,0.30)] transition-colors hover:bg-[#00229A]"
                    pendingText={isGerman ? "Speichert…" : "Saving…"}
                    disabled={isAccepted}
                  >
                    <Save className="size-3.5" />
                    {isGerman ? "Angebot speichern" : "Save proposal"}
                  </PendingSubmitButton>
                </div>
              </div>
            }
          />
        </form>

        {/* RIGHT RAIL */}
        <aside className="flex w-[360px] shrink-0 self-start flex-col gap-[14px] xl:w-[392px]">
          <section className="flex shrink-0 flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,0.03)] dark:border-white/[0.08] dark:bg-[#111216]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.07] px-[18px] py-[13px] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Eye className="size-3.5 text-[#6B7078]" />
                <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
                  {isGerman ? "Vorschau" : "Preview"}
                </h2>
              </div>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#6B7078]">
                {isGerman ? "Angebotsseite" : "Proposal page"}
              </span>
            </div>

            <div className="max-h-[430px] overflow-y-auto bg-[#F6F7F9] p-[14px] dark:bg-[#0C0D10]">
              <ProposalLivePreview
                ownerName={ownerName}
                isGerman={isGerman}
                initial={{
                  title: activeTitle,
                  clientName: proposal?.client_name ?? companyName,
                  contactName,
                  introText: activeIntro,
                  scope: scopeLines,
                  price: String(activePrice),
                  currency: activeCurrency,
                  firstTimeClient: activeFirstTimeClient,
                  accentColor: activeAccentColor,
                  designTemplate: activeDesignTemplate,
                  proposalNumber: proposal?.proposal_number ?? "",
                }}
              />
            </div>
          </section>

          <ProposalReadinessCard
            isGerman={isGerman}
            initialSectionCount={activeCustomSections.length}
            footer={
              proposal && !isAccepted ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 text-[10px] text-white/55">
                    {proposal.sent_at
                      ? `${isGerman ? "Zuletzt gesendet" : "Last sent"}: ${new Intl.DateTimeFormat(isGerman ? "de-DE" : "en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(proposal.sent_at))}`
                      : isGerman
                        ? "Entwurf gespeichert"
                        : "Draft saved"}
                  </div>

                  <form action={sendProposalToClient}>
                    <input type="hidden" name="leadId" value={id} />
                    <PendingSubmitButton
                      pendingText={isGerman ? "Sendet…" : "Sending…"}
                      disabled={!proposal.contact_email}
                      className="inline-flex h-[28px] items-center gap-1.5 rounded-[8px] bg-white px-2.5 text-[10.5px] font-medium text-[#0B0C0E] transition-colors hover:bg-white/90"
                    >
                      <Send className="size-3" />
                      {proposal.sent_at
                        ? isGerman ? "Erneut senden" : "Send again"
                        : isGerman ? "Per E-Mail senden" : "Send by email"}
                    </PendingSubmitButton>
                  </form>
                </div>
              ) : undefined
            }
          />

          {/* EXISTING SECONDARY FUNCTIONALITY, compactly integrated */}
          {!isAccepted ? (
            <details className="shrink-0 rounded-[12px] border border-black/[0.08] bg-white px-3 py-2.5 dark:border-white/[0.08] dark:bg-[#111216]">
              <summary className="cursor-pointer list-none text-[11.5px] font-medium text-[#40454E] dark:text-[#B9BDC5]">
                {isGerman ? "Vorlagen & AI" : "Templates & AI"}
              </summary>

              <div className="mt-3 space-y-3 border-t border-black/[0.07] pt-3 dark:border-white/[0.08]">
                <form method="get" className="flex gap-2">
                  <select
                    name="template"
                    defaultValue={selectedTemplate?.id ?? ""}
                    className="h-8 min-w-0 flex-1 rounded-[8px] border border-black/[0.09] bg-white px-2 text-[11px] dark:border-white/[0.10] dark:bg-[#15161A]"
                  >
                    <option value="">{isGerman ? "Keine Vorlage" : "No template"}</option>
                    {templateRows.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="h-8 rounded-[8px] border border-black/[0.09] px-2.5 text-[11px] text-[#40454E] hover:bg-[#F7F8FA] dark:border-white/[0.10] dark:text-white">
                    {isGerman ? "Laden" : "Load"}
                  </button>
                </form>

                {selectedTemplate ? (
                  <form action={deleteProposalTemplate} className="flex items-center justify-between gap-2 rounded-[8px] bg-[#F7F8FA] px-2.5 py-2 dark:bg-white/[0.04]">
                    <input type="hidden" name="leadId" value={id} />
                    <input type="hidden" name="templateId" value={selectedTemplate.id} />
                    <span className="min-w-0 truncate text-[10.5px] text-[#6B7078]">{selectedTemplate.name}</span>
                    <button type="submit" className="shrink-0 text-[10.5px] text-[#9A5106] hover:underline">
                      {isGerman ? "Löschen" : "Delete"}
                    </button>
                  </form>
                ) : null}

                <ProposalAiAutofillButton
                  leadId={id}
                  isGerman={isGerman}
                  disabled={false}
                  available={proposalHistoryAssessment.ready}
                />

                {proposal ? (
                  <form action={saveProposalAsTemplate} className="flex gap-2">
                    <input type="hidden" name="leadId" value={id} />
                    <Input
                      name="templateName"
                      placeholder={isGerman ? "Vorlagenname" : "Template name"}
                      required
                      maxLength={120}
                      className="h-8 rounded-[8px] text-[11px]"
                    />
                    <PendingSubmitButton
                      pendingText={isGerman ? "Speichert…" : "Saving…"}
                      className="h-8 shrink-0 rounded-[8px] border border-black/[0.09] px-2.5 text-[11px] text-[#40454E] hover:bg-[#F7F8FA] dark:border-white/[0.10] dark:text-white"
                    >
                      {isGerman ? "Als Vorlage" : "Save template"}
                    </PendingSubmitButton>
                  </form>
                ) : null}

                {publicPath ? (
                  <div className="flex items-center gap-2">
                    <CopyProposalLink
                      path={publicPath}
                      label={isGerman ? "Link kopieren" : "Copy link"}
                      copiedLabel={isGerman ? "Kopiert" : "Copied"}
                    />
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}

          {linkedProject ? (
            <Link
              href={`/projects/${encodeURIComponent(linkedProject.id)}`}
              className="flex shrink-0 items-center gap-2 rounded-[12px] border border-black/[0.08] bg-white px-3 py-2.5 text-[11.5px] text-[#40454E] transition-colors hover:bg-[#F7F8FA] dark:border-white/[0.08] dark:bg-[#111216] dark:text-[#B9BDC5]"
            >
              <FolderKanban className="size-3.5 text-[#002BBA]" />
              <span className="min-w-0 flex-1 truncate">{linkedProject.project_name}</span>
              <ExternalLink className="size-3 text-[#6B7078]" />
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ProposalMetric({
  label,
  accent = false,
  className = "",
  children,
}: {
  label: string;
  accent?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 px-5 py-[15px] ${className}`}>
      <div className={`font-mono text-[9.5px] uppercase tracking-[0.11em] ${accent ? "text-[#002BBA]" : "text-[#6B7078]"}`}>
        {label}
      </div>
      <div className="mt-1.5 flex min-h-[42px] flex-col gap-1.5">
        {children}
      </div>
    </div>
  );
}

function ProposalDivider() {
  return (
    <div className="my-[14px] w-px shrink-0 bg-black/[0.07] dark:bg-white/[0.08]" />
  );
}

function ProposalLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
      {children}
      {required ? (
        <span className="ml-1 text-[#002BBA]">*</span>
      ) : null}
    </div>
  );
}

function ProposalInput({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
  disabled = false,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={name === "websiteUrl" ? "col-span-2" : ""}>
      <ProposalLabel required={required}>
        {label}
      </ProposalLabel>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1.5 h-9 rounded-[10px] border-black/[0.09] bg-[#F7F8FA] px-[11px] text-[13px] shadow-none focus-visible:border-[#002BBA]/45 focus-visible:ring-[3px] focus-visible:ring-[#002BBA]/10 dark:border-white/[0.10] dark:bg-white/[0.04]"
      />
    </div>
  );
}
