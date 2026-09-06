import Link from "next/link";

import {
  ArrowLeft,
  ExternalLink,
  FileText,
  FolderKanban,
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
  ProposalAiAutofillButton,
} from "@/components/proposal-ai-autofill-button";

import {
  ProposalSectionsBuilder,
} from "@/components/proposal-sections-builder";

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

  const isGerman =
    language === "de";

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
    ? templateScope(selectedPayload.scope, companyName, contactName) || formatDefaultScope(language)
    : Array.isArray(proposal?.scope)
      ? proposal.scope.join("\n")
      : formatDefaultScope(language);

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
    ? templateString(selectedPayload.accentColor) || "#002BBA"
    : proposal?.accent_color ?? "#002BBA";

  const activeLogoUrl = selectedPayload
    ? templateString(selectedPayload.logoUrl) || null
    : proposal?.logo_url ?? null;

  const activeFirstTimeClient = selectedPayload
    ? selectedPayload.firstTimeClient !== false
    : proposal?.first_time_client ?? true;

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
      : defaultProposalCustomSections(language);

  const publicPath =
    proposal?.public_token
      ? `/proposal/${encodeURIComponent(
          proposal.public_token
        )}`
      : null;

  const isAccepted =
    proposal?.status ===
    "ACCEPTED";

  return (
    <div className="leadbase-workspace-page mx-auto min-h-full w-full max-w-[1040px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <WorkspacePageMotion />
      <Link
        href={`/leads/${encodeURIComponent(
          id
        )}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {isGerman
          ? "Zurück zum Lead"
          : "Back to lead"}
      </Link>

      <header data-workspace-reveal className="leadbase-workspace-header mt-5 flex flex-col gap-4 p-5 sm:mt-6 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {isGerman
              ? "Proposal Builder"
              : "Proposal builder"}
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {proposal
              ? isGerman
                ? "Angebot bearbeiten"
                : "Edit proposal"
              : isGerman
                ? "Angebot erstellen"
                : "Create proposal"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {isGerman
              ? "Kundendaten und Projektwert werden aus dem Lead übernommen. Speichere den Entwurf und öffne anschließend die öffentliche Proposal-Seite."
              : "Customer data and project value are prefilled from the lead. Save the draft, then open the public proposal page."}
          </p>
        </div>

        {publicPath ? (
          <div className="flex flex-wrap gap-2">
            <CopyProposalLink
              path={publicPath}
              label={
                isGerman
                  ? "Link kopieren"
                  : "Copy link"
              }
              copiedLabel={
                isGerman
                  ? "Kopiert"
                  : "Copied"
              }
            />

            <Link
              href={publicPath}
              target="_blank"
              className={buttonVariants({
                className:
                  "gap-2",
              })}
            >
              <ExternalLink className="size-4" />
              {isGerman
                ? "Vorschau öffnen"
                : "Open preview"}
            </Link>
          </div>
        ) : null}
      </header>

      {query.saved === "1" ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {query.reopened === "1"
            ? isGerman
              ? `Überarbeitetes Angebot gespeichert. Die vorherige Ablehnung wurde zurückgesetzt – der Kunde kann Version ${proposal?.revision ?? 2} wieder annehmen oder ablehnen.`
              : `Revised proposal saved. The previous decline was reset – the client can accept or decline version ${proposal?.revision ?? 2} again.`
            : isGerman
              ? "Angebot gespeichert. Der öffentliche Proposal-Link ist jetzt verfügbar."
              : "Proposal saved. The public proposal link is now available."}
        </div>
      ) : null}

      {query.proposalSent === "1" ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {isGerman
            ? "Angebot wurde per Gmail an den Kunden gesendet."
            : "Proposal was sent to the client via Gmail."}
        </div>
      ) : null}

      {query.templateSaved === "1" ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {isGerman
            ? "Vorlage gespeichert. Du kannst sie jetzt bei anderen Leads laden."
            : "Template saved. You can now load it for other leads."}
        </div>
      ) : null}

      {query.templateDeleted === "1" ? (
        <div className="mt-6 rounded-xl border px-4 py-3 text-sm text-muted-foreground">
          {isGerman ? "Vorlage gelöscht." : "Template deleted."}
        </div>
      ) : null}

      {query.error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {query.error}
        </div>
      ) : null}

      {isAccepted ? (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          {isGerman
            ? proposal?.pdf_emailed_at
              ? "Dieses Angebot wurde angenommen. Die Bestätigungs-PDF wurde an den Kunden gesendet. Änderungen sind gesperrt, damit der angenommene Stand erhalten bleibt."
              : "Dieses Angebot wurde angenommen. Die Inhalte sind jetzt gesperrt, damit der angenommene Stand erhalten bleibt."
            : proposal?.pdf_emailed_at
              ? "This proposal has been accepted and the confirmation PDF was emailed to the client. Editing is locked to preserve the accepted version."
              : "This proposal has been accepted. Editing is locked to preserve the accepted version."}
          {proposal?.pdf_email_error ? (
            <span className="mt-1 block text-xs">
              PDF-Mail: {proposal.pdf_email_error}
            </span>
          ) : null}
        </div>
      ) : null}

      {linkedProject ? (
        <Card data-workspace-reveal className="leadbase-workspace-card mt-6">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
                <FolderKanban className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isGerman ? "Projekt automatisch angelegt" : "Project created automatically"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {linkedProject.project_name} · {linkedProject.status}
                </p>
              </div>
            </div>
            <Link
              href={`/projects/${encodeURIComponent(linkedProject.id)}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              {isGerman ? "Projekt öffnen" : "Open project"}
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {!isAccepted ? (
        <Card data-workspace-reveal className="leadbase-workspace-card mt-6 sm:mt-8">
          <CardContent className="p-4 sm:p-6">
            <div>
              <h2 className="text-sm font-semibold">
                {isGerman ? "Vorlagen & AI" : "Templates & AI"}
              </h2>

              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                {isGerman
                  ? "Lade eine wiederverwendbare Angebotsvorlage oder lass Leadbase aus dem bisherigen E-Mail-Verlauf einen editierbaren Entwurf erstellen."
                  : "Load a reusable proposal template or let Leadbase create an editable draft from the email history."}
              </p>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] xl:items-start">
              <div className="min-w-0 rounded-xl border bg-muted/10 p-4">
                <p className="text-xs font-medium text-foreground">
                  {isGerman ? "Vorlage laden" : "Load template"}
                </p>

                <form
                  method="get"
                  className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <select
                    name="template"
                    defaultValue={selectedTemplate?.id ?? ""}
                    className="h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="">
                      {isGerman ? "Keine Vorlage" : "No template"}
                    </option>
                    {templateRows.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className={buttonVariants({
                      variant: "outline",
                      className: "w-full whitespace-nowrap sm:w-auto",
                    })}
                  >
                    {isGerman ? "Vorlage laden" : "Load template"}
                  </button>
                </form>

                {selectedTemplate ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
                    <span className="min-w-0 truncate">
                      {isGerman ? "Geladen:" : "Loaded:"} {selectedTemplate.name}
                    </span>

                    <form action={deleteProposalTemplate}>
                      <input type="hidden" name="leadId" value={id} />
                      <input type="hidden" name="templateId" value={selectedTemplate.id} />
                      <button
                        type="submit"
                        className="whitespace-nowrap font-medium text-foreground hover:underline"
                      >
                        {isGerman ? "Vorlage löschen" : "Delete template"}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 rounded-xl border bg-muted/10 p-4">
                <p className="text-xs font-medium text-foreground">
                  {isGerman ? "AI-Entwurf" : "AI draft"}
                </p>

                <div className="mt-3">
                  <ProposalAiAutofillButton
                    leadId={id}
                    isGerman={isGerman}
                    disabled={false}
                    available={proposalHistoryAssessment.ready}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form
        id="proposal-builder-form"
        action={saveProposal}
        className="mt-6 space-y-4 sm:mt-8"
      >
        <input
          type="hidden"
          name="leadId"
          value={id}
        />

        {selectedPayload && activeLogoUrl ? (
          <input
            type="hidden"
            name="templateLogoUrl"
            value={activeLogoUrl}
          />
        ) : null}

        <Card data-workspace-reveal className="leadbase-workspace-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
                <FileText className="size-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold">
                  {isGerman
                    ? "Angebotsdaten"
                    : "Proposal details"}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {isGerman
                    ? "Diese Angaben erscheinen auf der öffentlichen Proposal-Seite."
                    : "These details appear on the public proposal page."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field
                name="title"
                label={
                  isGerman
                    ? "Titel *"
                    : "Title *"
                }
                defaultValue={activeTitle}
                required
              />

              <Field
                name="clientName"
                label={
                  isGerman
                    ? "Kunde *"
                    : "Client *"
                }
                defaultValue={
                  proposal?.client_name ??
                  companyName
                }
                required
              />

              <Field
                name="contactName"
                label={
                  isGerman
                    ? "Ansprechpartner"
                    : "Contact"
                }
                defaultValue={
                  proposal?.contact_name ??
                  contact?.full_name ??
                  ""
                }
              />

              <Field
                name="contactEmail"
                label={
                  isGerman
                    ? "Kunden-E-Mail für Bestätigungs-PDF"
                    : "Client email for confirmation PDF"
                }
                type="email"
                defaultValue={
                  proposal?.contact_email ??
                  contact?.email ??
                  ""
                }
              />

              <Field
                name="websiteUrl"
                label="Website"
                type="text"
                defaultValue={
                  proposal?.website_url ??
                  company?.website_url ??
                  ""
                }
              />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="introText">
                  {isGerman
                    ? "Einleitung"
                    : "Introduction"}
                </Label>
                <Textarea
                  id="introText"
                  name="introText"
                  rows={4}
                  defaultValue={activeIntro}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="scope">
                  {isGerman
                    ? "Leistungsumfang · eine Leistung pro Zeile"
                    : "Scope · one item per line"}
                </Label>
                <Textarea
                  id="scope"
                  name="scope"
                  rows={7}
                  defaultValue={scope}
                />
              </div>

              <Field
                name="timelineText"
                label={
                  isGerman
                    ? "Zeitrahmen"
                    : "Timeline"
                }
                defaultValue={activeTimeline}
              />

              <Field
                name="validUntil"
                label={
                  isGerman
                    ? "Gültig bis"
                    : "Valid until"
                }
                type="date"
                defaultValue={
                  proposal?.valid_until ??
                  ""
                }
              />

              <Field
                name="price"
                label={
                  isGerman
                    ? "Projektpreis *"
                    : "Project price *"
                }
                type="number"
                step="0.01"
                min="0"
                defaultValue={String(activePrice)}
                required
              />

              <div className="space-y-2">
                <Label htmlFor="currency">
                  {isGerman
                    ? "Währung"
                    : "Currency"}
                </Label>
                <select
                  id="currency"
                  name="currency"
                  defaultValue={activeCurrency}
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="CHF">CHF</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">
                  {isGerman
                    ? "Zusätzliche Hinweise"
                    : "Additional notes"}
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={activeNotes}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-workspace-reveal className="leadbase-workspace-card">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-6">
              <h2 className="text-sm font-semibold">
                {isGerman ? "Eigene Abschnitte" : "Custom sections"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {isGerman
                  ? "Baue dein Angebot wie ein echtes SOW auf. Titel und Inhalt sind frei; Reihenfolge kannst du ändern."
                  : "Build the proposal like a real SOW. Titles and content are free-form and can be reordered."}
              </p>
            </div>

            <ProposalSectionsBuilder
              defaultSections={activeCustomSections}
              disabled={isAccepted}
              isGerman={isGerman}
            />
          </CardContent>
        </Card>

        <Card data-workspace-reveal className="leadbase-workspace-card">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-6">
              <h2 className="text-sm font-semibold">
                {isGerman
                  ? "Branding & Konditionen"
                  : "Branding & terms"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {isGerman
                  ? "Passe Logo und Akzentfarbe an und entscheide pro Projekt, ob die Erstkunden-Garantie gilt."
                  : "Customize the logo and accent color and choose whether the first-time-client guarantee applies."}
              </p>
            </div>

            <ProposalBrandingFields
              defaultAccentColor={activeAccentColor}
              currentLogoUrl={activeLogoUrl}
              firstTimeClient={activeFirstTimeClient}
              isGerman={isGerman}
              disabled={isAccepted}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <PendingSubmitButton
            className={buttonVariants({
              className:
                "gap-2",
            })}
            pendingText={
              isGerman
                ? "Speichert…"
                : "Saving…"
            }
            disabled={isAccepted}
          >
            {isAccepted
              ? isGerman
                ? "Angebot angenommen"
                : "Proposal accepted"
              : isGerman
                ? "Angebot speichern"
                : "Save proposal"}
          </PendingSubmitButton>
        </div>
      </form>

      {proposal && !isAccepted ? (
        <Card data-workspace-reveal className="leadbase-workspace-card mt-4">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Send className="size-4" />
                  <h2 className="text-sm font-semibold">
                    {isGerman ? "Angebot versenden" : "Send proposal"}
                  </h2>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {proposal.contact_email
                    ? isGerman
                      ? `Versand an ${proposal.contact_email}. Der Kunde erhält den öffentlichen Proposal-Link und kann direkt annehmen oder ablehnen.`
                      : `Send to ${proposal.contact_email}. The client receives the public proposal link and can accept or decline directly.`
                    : isGerman
                      ? "Speichere zuerst eine Kunden-E-Mail, bevor du das Angebot versendest."
                      : "Save a client email before sending the proposal."}
                </p>
                {proposal.sent_at ? (
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                    {isGerman ? "Zuletzt gesendet:" : "Last sent:"}{" "}
                    {new Intl.DateTimeFormat(isGerman ? "de-DE" : "en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Berlin",
                    }).format(new Date(proposal.sent_at))}
                  </p>
                ) : null}
                {proposal.delivery_email_error ? (
                  <p className="mt-1 max-w-2xl text-xs text-red-600 dark:text-red-400">
                    {proposal.delivery_email_error}
                  </p>
                ) : null}
              </div>

              <form action={sendProposalToClient}>
                <input type="hidden" name="leadId" value={id} />
                <PendingSubmitButton
                  className={buttonVariants({ className: "gap-2" })}
                  pendingText={isGerman ? "Sendet…" : "Sending…"}
                  disabled={!proposal.contact_email}
                >
                  <Send className="size-4" />
                  {proposal.sent_at
                    ? isGerman
                      ? "Erneut senden"
                      : "Send again"
                    : isGerman
                      ? "Per E-Mail senden"
                      : "Send by email"}
                </PendingSubmitButton>
              </form>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {proposal && !isAccepted ? (
        <Card data-workspace-reveal className="leadbase-workspace-card mt-4">
          <CardContent className="p-4 sm:p-6">
            <form action={saveProposalAsTemplate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="leadId" value={id} />
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="templateName">
                  {isGerman ? "Aktuelles Angebot als Vorlage speichern" : "Save current proposal as template"}
                </Label>
                <Input
                  id="templateName"
                  name="templateName"
                  placeholder={isGerman ? "z. B. Webdesign Standard" : "e.g. Standard web design"}
                  required
                  maxLength={120}
                />
              </div>
              <PendingSubmitButton
                className={buttonVariants({ variant: "outline" })}
                pendingText={isGerman ? "Speichert…" : "Saving…"}
              >
                {isGerman ? "Als Vorlage speichern" : "Save as template"}
              </PendingSubmitButton>
            </form>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {isGerman
                ? "Kundenname und Ansprechpartner werden als Platzhalter gespeichert und beim nächsten Lead automatisch ersetzt."
                : "Client and contact names are stored as placeholders and replaced automatically for the next lead."}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
  step,
  min,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        step={step}
        min={min}
      />
    </div>
  );
}
