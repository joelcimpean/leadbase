import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Monitor,
  Phone,
  PhoneCall,
  Sparkles,
  User,
  XCircle,
  BriefcaseBusiness,
  BarChart3,
  FileText,
  CalendarClock,
  Layers3,
  Trash2,
} from "lucide-react";

import {
  PendingSubmitButton,
} from "@/components/pending-submit-button";

import {
  updateLeadStatus,
} from "../actions";

import {
  AnalyzeWebsiteButton,
} from "./analyze-button";

import {
  DeleteLeadDialog,
} from "./delete-lead-dialog";

import {
  LocalizedVisualAnalysis,
} from "./localized-visual-analysis";

import {
  OutreachSection,
} from "./outreach-section";

import {
  RedesignPreviewActions,
} from "./redesign-preview-actions";

import {
  LeadEmailHistory,
} from "./lead-email-history";

import {
  LeadDetailTabs,
} from "./lead-detail-tabs";

import {
  Badge,
} from "@/components/ui/badge";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  type AppLanguage,
} from "@/lib/i18n";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  getLeadPriorityLabel,
  getLeadStatusLabel,
  leadsCopy,
} from "@/lib/leads-i18n";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

import {
  ProjectCreateDialog,
} from "@/components/quick-create-dialogs";

import {
  LeadEditDialog,
  type LeadEditDialogCampaign,
  type LeadEditDialogValue,
} from "./lead-edit-dialog";


/* =========================================================
   TEMP FEATURE FLAGS
========================================================= */

/*
 * Competitor Snapshot stays in the codebase, but is
 * intentionally hidden for now. Re-enable later when
 * Joel wants to continue that feature.
 */
const COMPETITOR_SNAPSHOT_ENABLED =
  false;

/* =========================================================
   TYPES
========================================================= */

type LeadDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type WebsiteFinding = {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
};

type VisualAnalysis = {
  visualScore:
    | number
    | null;

  redesignPotential:
    | number
    | null;

  modernity:
    | number
    | null;

  visualHierarchy:
    | number
    | null;

  typography:
    | number
    | null;

  spacing:
    | number
    | null;

  branding:
    | number
    | null;

  imagery:
    | number
    | null;

  ctaVisibility:
    | number
    | null;

  mobileQuality:
    | number
    | null;

  projectPresentation:
    | number
    | null;

  strengths: string[];

  weaknesses: string[];

  summary:
    | string
    | null;

  redesignReason:
    | string
    | null;

  outreachAngle:
    | string
    | null;
};

/* =========================================================
   STATUS
========================================================= */

function statusClass(
  status: string
) {
  switch (
    status
  ) {
    case "NEW":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400";

    case "RESEARCHING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400";

    case "QUALIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "NOT_A_FIT":
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";

    case "DRAFT_READY":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400";

    case "CONTACTED":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400";

    case "REPLIED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-400";

    case "CALL_BOOKED":
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400";

    case "PROPOSAL":
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-400";

    case "WON":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400";

    case "LOST":
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";

    case "DO_NOT_CONTACT":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
  }
}

function analysisStatusClass(
  status: string
) {
  switch (
    status
  ) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "ANALYZING":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";
  }
}

function analysisStatusLabel(
  status: string,
  language:
    AppLanguage
) {
  const text =
    leadsCopy[
      language
    ].detail;

  switch (
    status
  ) {
    case "COMPLETED":
      return text.analyzed;

    case "ANALYZING":
      return text.analyzing;

    case "FAILED":
      return text.failed;

    default:
      return text.notAnalyzed;
  }
}

/* =========================================================
   DATE
========================================================= */

function formatDate(
  date:
    | string
    | null,
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
    }
  ).format(
    new Date(
      date
    )
  );
}

function formatDateTime(
  date:
    | string
    | null,
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
    }
  ).format(
    new Date(
      date
    )
  );
}

/* =========================================================
   URL
========================================================= */

function normalizeUrl(
  url: string
) {
  return url.startsWith(
    "http"
  )
    ? url
    : `https://${url}`;
}

/* =========================================================
   RELATION
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

/* =========================================================
   FINDINGS
========================================================= */

function parseWebsiteFindings(
  value: unknown,
  fallbackLabel: string
): WebsiteFinding[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is Record<
        string,
        unknown
      > =>
        typeof item ===
          "object" &&
        item !==
          null
    )
    .map(
      (
        item,
        index
      ) => ({
        key:
          typeof item.key ===
          "string"
            ? item.key
            : `finding-${index}`,

        label:
          typeof item.label ===
          "string"
            ? item.label
            : fallbackLabel,

        passed:
          item.passed ===
          true,

        detail:
          typeof item.detail ===
          "string"
            ? item.detail
            : undefined,
      })
    );
}

/* =========================================================
   VISUAL PARSER
========================================================= */

function parseVisualAnalysis(
  value: unknown
): VisualAnalysis {
  const empty:
    VisualAnalysis = {
    visualScore:
      null,

    redesignPotential:
      null,

    modernity:
      null,

    visualHierarchy:
      null,

    typography:
      null,

    spacing:
      null,

    branding:
      null,

    imagery:
      null,

    ctaVisibility:
      null,

    mobileQuality:
      null,

    projectPresentation:
      null,

    strengths:
      [],

    weaknesses:
      [],

    summary:
      null,

    redesignReason:
      null,

    outreachAngle:
      null,
  };

  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value
    )
  ) {
    return empty;
  }

  const data =
    value as Record<
      string,
      unknown
    >;

  const numberValue = (
    key: string
  ) =>
    typeof data[
      key
    ] ===
    "number"
      ? data[
          key
        ] as number
      : null;

  const stringValue = (
    key: string
  ) =>
    typeof data[
      key
    ] ===
    "string"
      ? data[
          key
        ] as string
      : null;

  const stringArray = (
    key: string
  ) => {
    if (
      !Array.isArray(
        data[
          key
        ]
      )
    ) {
      return [];
    }

    return (
      data[
        key
      ] as unknown[]
    ).filter(
      (
        item
      ): item is string =>
        typeof item ===
        "string"
    );
  };

  return {
    visualScore:
      numberValue(
        "visualScore"
      ),

    redesignPotential:
      numberValue(
        "redesignPotential"
      ),

    modernity:
      numberValue(
        "modernity"
      ),

    visualHierarchy:
      numberValue(
        "visualHierarchy"
      ),

    typography:
      numberValue(
        "typography"
      ),

    spacing:
      numberValue(
        "spacing"
      ),

    branding:
      numberValue(
        "branding"
      ),

    imagery:
      numberValue(
        "imagery"
      ),

    ctaVisibility:
      numberValue(
        "ctaVisibility"
      ),

    mobileQuality:
      numberValue(
        "mobileQuality"
      ),

    projectPresentation:
      numberValue(
        "projectPresentation"
      ),

    strengths:
      stringArray(
        "strengths"
      ),

    weaknesses:
      stringArray(
        "weaknesses"
      ),

    summary:
      stringValue(
        "summary"
      ),

    redesignReason:
      stringValue(
        "redesignReason"
      ),

    outreachAngle:
      stringValue(
        "outreachAngle"
      ),
  };
}

/* =========================================================
   SOURCE LANGUAGE
========================================================= */

function parseVisualSourceLanguage(
  value: unknown
): AppLanguage {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value
    )
  ) {
    return "en";
  }

  const data =
    value as Record<
      string,
      unknown
    >;

  if (
    data.sourceLanguage ===
    "de"
  ) {
    return "de";
  }

  if (
    data.sourceLanguage ===
    "en"
  ) {
    return "en";
  }

  return "en";
}

function emailWebsiteDomainMismatch(
  email:
    | string
    | null
    | undefined,
  websiteUrl:
    | string
    | null
    | undefined
) {
  if (
    !email ||
    !websiteUrl ||
    !email.includes("@")
  ) {
    return false;
  }

  const emailDomain =
    email
      .split("@")
      .pop()
      ?.trim()
      .toLowerCase()
      .replace(/^www\./, "") ??
    "";

  try {
    const websiteDomain =
      new URL(
        normalizeUrl(
          websiteUrl
        )
      ).hostname
        .toLowerCase()
        .replace(/^www\./, "");

    return Boolean(
      emailDomain &&
      websiteDomain &&
      emailDomain !==
        websiteDomain &&
      !emailDomain.endsWith(
        `.${websiteDomain}`
      ) &&
      !websiteDomain.endsWith(
        `.${emailDomain}`
      )
    );
  } catch {
    return false;
  }
}

/* =========================================================
   PAGE
========================================================= */

export default async function LeadDetailPage({
  params,
}: LeadDetailPageProps) {
  const [{ id }, language] = await Promise.all([
    params,
    getAppLanguage(),
  ]);

  const text = leadsCopy[language];
  const supabase = await createClient();

  const {
    data: lead,
    error,
  } = await supabase
    .from("leads")
    .select(`
      id,
      status,
      website_score,
      opportunity_score,
      priority,
      structural_score,
      visual_score,
      redesign_potential,
      visual_analysis,
      visual_analysis_status,
      visual_analysis_error,
      visual_analyzed_at,
      visual_model,
      visual_input_tokens,
      visual_output_tokens,
      visual_total_tokens,
      estimated_project_value,
      currency,
      last_contacted_at,
      next_follow_up_at,
      notes,
      created_at,
      research_summary,
      website_findings,
      analysis_status,
      analyzed_at,
      analysis_error,
      call_prep_generated_at,

      company:companies (
        id,
        name,
        website_url,
        industry,
        location,
        description,
        phone,
        contact_form_url,
        linkedin_url,
        instagram_url
      ),

      primary_contact:contacts (
        id,
        full_name,
        job_title,
        email,
        phone,
        linkedin_url
      ),

      campaign:campaigns (
        id,
        name
      )
    `)
    .eq("id", id)
    .single();

  if (error || !lead) {
    console.error("Could not load lead:", error);
    notFound();
  }

  const {
    data:
      editableCampaignsData,
    error:
      editableCampaignsError,
  } =
    await supabase
      .from("campaigns")
      .select("id,name,status")
      .neq("status", "ARCHIVED")
      .order("name", {
        ascending:
          true,
      });

  if (
    editableCampaignsError
  ) {
    console.error(
      "Could not load campaigns for lead editor:",
      editableCampaignsError
    );
  }

  const editableCampaigns =
    (editableCampaignsData ??
      []) as LeadEditDialogCampaign[];

  const [redesignResult, proposalResult] = await Promise.all([
    supabase
      .from("redesign_previews")
      .select("public_token, generation_index")
      .eq("lead_id", id)
      .order("generation_index", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("proposals")
      .select("id")
      .eq("lead_id", id)
      .maybeSingle(),
  ]);

  if (redesignResult.error) console.error("Could not load latest redesign preview:", redesignResult.error);
  if (proposalResult.error) console.error("Could not load proposal state:", proposalResult.error);

  const latestRedesignPreview = redesignResult.data;
  const existingProposal = proposalResult.data;
  const company = getSingleRelation(lead.company);
  const contact = getSingleRelation(lead.primary_contact);
  const campaign = getSingleRelation(lead.campaign);
  const findings = parseWebsiteFindings(lead.website_findings, text.detail.finding);
  const visual = parseVisualAnalysis(lead.visual_analysis);
  const visualSourceLanguage = parseVisualSourceLanguage(lead.visual_analysis);
  const structuralStatus = lead.analysis_status ?? "NOT_ANALYZED";
  const visualStatus = lead.visual_analysis_status ?? "NOT_ANALYZED";
  const analyzed = structuralStatus === "COMPLETED" || visualStatus === "COMPLETED";
  const structurePassed = findings.filter((item) => item.passed).length;
  const leadName = company?.name ?? text.common.unknownCompany;
  const contactDomainMismatch = emailWebsiteDomainMismatch(contact?.email, company?.website_url);

  const leadEditValue:
    LeadEditDialogValue | null =
    company
      ? {
          id:
            lead.id,
          campaignId:
            campaign?.id ??
            null,
          priority:
            lead.priority,
          estimatedProjectValue:
            lead.estimated_project_value,
          notes:
            lead.notes,
          company: {
            name:
              company.name,
            websiteUrl:
              company.website_url,
            industry:
              company.industry,
            location:
              company.location,
            phone:
              company.phone,
            description:
              company.description,
            contactFormUrl:
              company.contact_form_url,
            linkedinUrl:
              company.linkedin_url,
            instagramUrl:
              company.instagram_url,
          },
          contact:
            contact
              ? {
                  fullName:
                    contact.full_name,
                  jobTitle:
                    contact.job_title,
                  email:
                    contact.email,
                  phone:
                    contact.phone,
                  linkedinUrl:
                    contact.linkedin_url,
                }
              : null,
        }
      : null;

  let existingProject:
    | {
        id: string;
        project_name: string;
        status: string;
      }
    | null = null;

  if (existingProposal?.id) {
    const {
      data: linkedProject,
      error: linkedProjectError,
    } = await supabase
      .from("client_projects")
      .select("id,project_name,status")
      .eq("source_proposal_id", existingProposal.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (linkedProjectError) {
      console.error("Could not load lead project by proposal:", linkedProjectError);
    } else {
      existingProject = linkedProject;
    }
  }

  if (!existingProject && leadName !== text.common.unknownCompany) {
    const {
      data: clientProject,
      error: clientProjectError,
    } = await supabase
      .from("client_projects")
      .select("id,project_name,status")
      .eq("client_name", leadName)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clientProjectError) {
      console.error("Could not load lead project by client name:", clientProjectError);
    } else {
      existingProject = clientProject;
    }
  }

  const money = lead.estimated_project_value !== null
    ? new Intl.NumberFormat(language === "de" ? "de-DE" : "en-IE", {
        style: "currency",
        currency: lead.currency ?? "EUR",
        maximumFractionDigits: 0,
      }).format(lead.estimated_project_value)
    : null;

  const strings = language === "de"
    ? {
        eyebrow: campaign?.name ? `Lead · ${campaign.name}` : "Lead · Ohne Kampagne",
        created: "Erstellt",
        lastContact: "Letzter Kontakt",
        websiteScore: "Website-Score",
        opportunityScore: "Potenzial-Score",
        estimated: "Geschätzter Wert",
        notEstimated: "nicht geschätzt",
        structure: "Struktur",
        visual: "Visuell",
        redesign: "Redesign-Potenzial",
        nextSteps: "Nächste Schritte",
        nextTitle: "Aus Lead wird Kunde",
        nextBody: "Die wichtigsten Sales-Aktionen an einem Ort.",
        proposalView: existingProposal ? "Angebot ansehen" : "Angebot erstellen",
        proposalSub: "Preis, Scope und Annahme",
        callPrep: lead.call_prep_generated_at ? "Call-Notizen" : "Call vorbereiten",
        callSub: lead.call_prep_generated_at ? "Vorbereitung erstellt · ansehen" : "Gesprächspunkte & Einwände",
        project: existingProject ? "Zum Projekt" : "Projekt anlegen",
        projectSub: existingProject ? existingProject.project_name : "In Projektphase übernehmen",
        manage: "Lead verwalten",
        nextFollow: "Nächstes Follow-up",
        scheduled: lead.next_follow_up_at ? formatDate(lead.next_follow_up_at, language) : "—",
        primaryContact: "Hauptkontakt",
        position: "Position",
        industry: "Branche",
        links: "Unternehmenslinks",
        notFound: "Nicht gefunden",
        preview: "Kunden-Vorschau",
        createdPreview: "Erstellt",
        noPreview: "Nicht erstellt",
        edit: "Bearbeiten",
        analyze: "Website analysieren",
        websiteOpen: "Website öffnen",
        notesEmpty: text.detail.noNotes,
      }
    : {
        eyebrow: campaign?.name ? `Lead · ${campaign.name}` : "Lead · No campaign",
        created: "Created",
        lastContact: "Last contact",
        websiteScore: "Website score",
        opportunityScore: "Opportunity score",
        estimated: "Estimated value",
        notEstimated: "not estimated",
        structure: "Structure",
        visual: "Visual",
        redesign: "Redesign potential",
        nextSteps: "Next steps",
        nextTitle: "Move the lead forward",
        nextBody: "The most important sales actions in one place.",
        proposalView: existingProposal ? "View proposal" : "Create proposal",
        proposalSub: "Price, scope and acceptance",
        callPrep: lead.call_prep_generated_at ? "Call notes" : "Prepare call",
        callSub: lead.call_prep_generated_at ? "Preparation ready · open" : "Talking points & objections",
        project: existingProject ? "Go to project" : "Create project",
        projectSub: existingProject ? existingProject.project_name : "Move into project phase",
        manage: "Manage lead",
        nextFollow: "Next follow-up",
        scheduled: lead.next_follow_up_at ? formatDate(lead.next_follow_up_at, language) : "—",
        primaryContact: "Primary contact",
        position: "Position",
        industry: "Industry",
        links: "Company links",
        notFound: "Not found",
        preview: "Customer preview",
        createdPreview: "Created",
        noPreview: "Not created",
        edit: "Edit",
        analyze: "Analyze website",
        websiteOpen: "Open website",
        notesEmpty: text.detail.noNotes,
      };

  function metric(label: string, value: number | null, accent = false, hint?: string) {
    return (
      <div className={`flex min-w-0 flex-1 flex-col gap-1.5 px-5 py-4 ${accent ? "bg-[linear-gradient(180deg,rgba(0,43,186,.035),rgba(0,43,186,0))]" : ""}`}>
        <span className={`font-mono text-[9.5px] uppercase tracking-[0.11em] ${accent ? "text-[#002BBA]" : "text-[#6B7078]"}`}>{label}</span>
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className={`text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums ${accent ? "text-[#002BBA]" : value === null ? "text-[#7E838B]" : "text-[#0B0C0E]"}`}>{value ?? "—"}</span>
          {value !== null ? <span className="font-mono text-[11px] text-[#6B7078]">/100</span> : null}
          {hint ? <span className="ml-1 truncate text-[10.5px] text-[#6B7078]">{hint}</span> : null}
        </div>
      </div>
    );
  }

  function companyLink(label: string, href: string | null, icon: typeof Globe2) {
    const Icon = icon;
    return (
      <div className="flex items-center gap-2.5 border-b border-black/[0.07] py-[10px] last:border-b-0">
        <Icon className={`size-3.5 shrink-0 ${href ? "text-[#002BBA]" : "text-[#6B7078]"}`} />
        {href ? (
          <a href={normalizeUrl(href)} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px] font-medium hover:text-[#002BBA]">
            <span className="truncate">{label}</span>
            <ExternalLink className="ml-auto size-3 text-[#002BBA]" />
          </a>
        ) : (
          <>
            <span className="flex-1 text-[12.5px] text-[#40454E]">{label}</span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[#6B7078]">{strings.notFound}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="leadbase-route-lead-detail flex h-full min-h-0 flex-col bg-[#F6F7F9] px-[26px] py-6 text-[#0B0C0E] max-[900px]:h-auto max-[900px]:px-4 max-[900px]:py-4">
      <WorkspacePageMotion />

      {/* HEADER */}
      <header className="shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/leads" className="flex items-center gap-1.5 text-[11.5px] text-[#6B7078] transition-colors hover:text-[#0B0C0E]">
            <ArrowLeft className="size-3" />
            {text.detail.backToLeads}
          </Link>
          <span className="h-3 w-px bg-black/[0.14]" />
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#002BBA]">{strings.eyebrow}</span>
        </div>

        <div className="mt-2 flex items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-[42px] font-semibold leading-none tracking-[-0.035em]">{leadName}</h1>
              <Badge variant="outline" className={`shrink-0 border-0 px-[9px] py-[3px] font-mono text-[9.5px] uppercase tracking-[0.08em] ${statusClass(lead.status)}`}>
                {getLeadStatusLabel(lead.status, language)}
              </Badge>
            </div>

            <div className="mt-[9px] flex flex-wrap items-center gap-x-[14px] text-[12px] text-[#6B7078]">
              {company?.location ? <span className="flex items-center gap-1.5"><Building2 className="size-3 opacity-70" />{company.location}</span> : null}
              <span className="h-3 w-px bg-black/[0.14]" />
              <span>{text.common.priority} <strong className="font-medium text-[#0B0C0E]">{getLeadPriorityLabel(lead.priority, language)}</strong></span>
              <span className="h-3 w-px bg-black/[0.14]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.04em]">{strings.created} {formatDate(lead.created_at, language)}</span>
              <span className="h-3 w-px bg-black/[0.14]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.04em]">{strings.lastContact} {formatDate(lead.last_contacted_at, language)}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 max-[980px]:hidden">
            {company?.website_url ? (
              <a href={normalizeUrl(company.website_url)} target="_blank" rel="noreferrer" className="flex h-[34px] items-center gap-[7px] rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] hover:border-black/[0.16] hover:bg-[#FDFDFE]">
                <ExternalLink className="size-3.5 opacity-60" />
                {strings.websiteOpen}
              </a>
            ) : null}

            {leadEditValue ? (
              <LeadEditDialog
                language={language}
                lead={leadEditValue}
                campaigns={editableCampaigns}
              />
            ) : null}

            <div className="[&_button]:h-[34px] [&_button]:rounded-[10px] [&_button]:border-0 [&_button]:bg-[#002BBA] [&_button]:px-3.5 [&_button]:text-[13px] [&_button]:font-medium [&_button]:text-white [&_button]:shadow-[0_1px_2px_rgba(0,43,186,0.30)] [&_button:hover]:bg-[#00229A]">
              <AnalyzeWebsiteButton leadId={lead.id} hasWebsite={Boolean(company?.website_url)} />
            </div>
          </div>
        </div>
      </header>

      {/* METRIC STRIP */}
      <section className="mt-4 flex shrink-0 overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,0.03)] max-[980px]:grid max-[980px]:grid-cols-2">
        {metric(strings.websiteScore, lead.website_score, true, language === "de" ? "Gesamtbewertung" : "overall")}
        <span className="my-3.5 w-px bg-black/[0.07] max-[980px]:hidden" />
        {metric(strings.opportunityScore, lead.opportunity_score)}
        <span className="my-3.5 w-px bg-black/[0.07] max-[980px]:hidden" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-5 py-4">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">{strings.estimated}</span>
          <div className="flex items-baseline gap-2">
            <span className={`truncate text-[28px] font-semibold leading-none tracking-[-0.03em] ${money ? "text-[#0B0C0E]" : "text-[#7E838B]"}`}>{money ?? "—"}</span>
            {!money ? <span className="text-[11.5px] text-[#6B7078]">{strings.notEstimated}</span> : null}
          </div>
        </div>
        <span className="my-3.5 w-px bg-black/[0.07] max-[980px]:hidden" />
        {metric(strings.structure, lead.structural_score)}
        <span className="my-3.5 w-px bg-black/[0.07] max-[980px]:hidden" />
        {metric(strings.visual, lead.visual_score)}
        <span className="my-3.5 w-px bg-black/[0.07] max-[980px]:hidden" />
        {metric(strings.redesign, lead.redesign_potential, true)}
      </section>

      {/* MAIN WORKSPACE */}
      <div className="mt-4 flex min-h-0 flex-1 gap-4 max-[900px]:flex-col">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <section className="flex shrink-0 items-center gap-5 rounded-[14px] bg-[linear-gradient(96deg,#002BBA,#1D3FCB)] px-[18px] py-4 text-white">
            <div className="w-[212px] shrink-0 max-[1080px]:hidden">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-white/70">{strings.nextSteps}</div>
              <div className="mt-1.5 text-[15px] font-semibold tracking-[-0.015em]">{strings.nextTitle}</div>
              <div className="mt-[3px] text-[11.5px] text-white/80">{strings.nextBody}</div>
            </div>

            <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 max-[680px]:grid-cols-1">
              <Link href={`/leads/${encodeURIComponent(lead.id)}/proposal`} className="flex h-[52px] min-w-0 items-center gap-2.5 rounded-[11px] border border-white/[0.18] bg-white/[0.12] px-3 transition-colors hover:bg-white/[0.20]">
                <FileText className="size-3.5 shrink-0" />
                <div className="min-w-0"><div className="truncate text-[12px] font-medium">{strings.proposalView}</div><div className="truncate text-[9.5px] text-white/70">{strings.proposalSub}</div></div>
              </Link>
              <Link href={`/leads/${encodeURIComponent(lead.id)}/call-prep`} className="flex h-[52px] min-w-0 items-center gap-2.5 rounded-[11px] border border-white/[0.18] bg-white/[0.12] px-3 transition-colors hover:bg-white/[0.20]">
                <PhoneCall className="size-3.5 shrink-0" />
                <div className="min-w-0"><div className="truncate text-[12px] font-medium">{strings.callPrep}</div><div className="truncate text-[9.5px] text-white/70">{strings.callSub}</div></div>
              </Link>
              {existingProject ? (
                <Link
                  href={`/projects/${encodeURIComponent(existingProject.id)}`}
                  className="flex h-[52px] min-w-0 items-center gap-2.5 rounded-[11px] border border-white/[0.18] bg-white/[0.12] px-3 transition-colors hover:bg-white/[0.20]"
                >
                  <BriefcaseBusiness className="size-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium">{strings.project}</div>
                    <div className="truncate text-[9.5px] text-white/70">{strings.projectSub}</div>
                  </div>
                </Link>
              ) : (
                <ProjectCreateDialog
                  language={language}
                  label={strings.project}
                  triggerVariant="nextStep"
                  triggerDescription={strings.projectSub}
                  triggerClassName="w-full"
                  defaultClientName={leadName}
                  defaultWebsiteUrl={company?.website_url ?? ""}
                  defaultStatus="IN_PROGRESS"
                  returnTo={`/leads/${encodeURIComponent(lead.id)}`}
                  sourceProposalId={existingProposal?.id ?? null}
                />
              )}
            </div>
          </section>

          {company?.website_url && structuralStatus === "COMPLETED" ? (
            <div className="shrink-0 [&>*]:mt-0">
              <RedesignPreviewActions
                leadId={lead.id}
                initialPreviewToken={latestRedesignPreview?.public_token ?? null}
                initialGenerationIndex={latestRedesignPreview?.generation_index ?? 0}
              />
            </div>
          ) : null}

          <LeadDetailTabs
            language={language}
            analyzed={analyzed}
            analyzedAt={formatDateTime(lead.visual_analyzed_at ?? lead.analyzed_at, language)}
            model={lead.visual_model}
            totalTokens={lead.visual_total_tokens}
            structurePassed={structurePassed}
            structureTotal={findings.length}
            visual={
              <VisualAnalysisCard
                leadId={lead.id}
                language={language}
                sourceLanguage={visualSourceLanguage}
                status={visualStatus}
                structuralScore={lead.structural_score}
                visualScore={lead.visual_score}
                redesignPotential={lead.redesign_potential}
                analysis={visual}
                analyzedAt={lead.visual_analyzed_at}
                error={lead.visual_analysis_error}
                model={lead.visual_model}
                inputTokens={lead.visual_input_tokens}
                outputTokens={lead.visual_output_tokens}
                totalTokens={lead.visual_total_tokens}
              />
            }
            structure={
              <StructuralAnalysisCard
                language={language}
                status={structuralStatus}
                findings={findings}
                analyzedAt={lead.analyzed_at}
                error={lead.analysis_error}
              />
            }
            outreach={<div id="outreach"><OutreachSection leadId={lead.id} /></div>}
            history={<LeadEmailHistory leadId={lead.id} />}
            notes={
              <div className="p-1">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-[13px] font-semibold">{text.detail.notes}</h3>
                  {leadEditValue ? (
                    <LeadEditDialog
                      language={language}
                      lead={leadEditValue}
                      campaigns={editableCampaigns}
                      variant="text"
                    />
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[12px] leading-5 text-[#6B7078]">{lead.notes ?? strings.notesEmpty}</p>
              </div>
            }
          />
        </div>

        {/* RIGHT RAIL */}
        <aside className="flex w-[330px] shrink-0 flex-col gap-3.5 max-[1080px]:w-[300px] max-[900px]:w-full">
          <section className="rounded-[16px] border border-black/[0.08] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(11,12,14,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">{strings.manage}</span>
              <div className="[&_button]:h-auto [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-[10.5px] [&_button]:font-normal [&_button]:text-[#6B7078] [&_button]:shadow-none [&_button:hover]:bg-transparent [&_button:hover]:text-[#0B0C0E]"><DeleteLeadDialog leadId={lead.id} companyName={leadName} /></div>
            </div>

            <form action={updateLeadStatus} className="mt-3 flex items-center gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <select name="status" defaultValue={lead.status} className="h-8 min-w-0 flex-1 rounded-[9px] border border-black/[0.09] bg-white px-2.5 text-[11.5px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10">
                {["NEW","RESEARCHING","QUALIFIED","NOT_A_FIT","DRAFT_READY","CONTACTED","REPLIED","CALL_BOOKED","PROPOSAL","WON","LOST","DO_NOT_CONTACT"].map((item) => <option key={item} value={item}>{getLeadStatusLabel(item, language)}</option>)}
              </select>
              <PendingSubmitButton pendingText={language === "de" ? "…" : "…"} className="h-8 rounded-[9px] bg-[#002BBA] px-3 text-[11.5px] font-medium text-white hover:bg-[#00229A]">{text.detail.update}</PendingSubmitButton>
            </form>

            <div className="mt-3 flex items-center justify-between border-t border-black/[0.07] pt-3 text-[11px]">
              <span className="text-[#6B7078]">{strings.nextFollow}</span>
              <Link href="/scheduled" className="flex items-center gap-1.5 font-medium text-[#002BBA] hover:text-[#001E85]"><CalendarClock className="size-3" />{strings.scheduled}</Link>
            </div>
          </section>

          <section className="rounded-[16px] border border-black/[0.08] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(11,12,14,0.03)]">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">{strings.primaryContact}</div>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#EAEEFB] font-mono text-[10px] font-medium text-[#002BBA]">{(contact?.full_name ?? leadName).split(/\s+/).slice(0,2).map((part: string) => part[0]).join("").toUpperCase()}</div>
              <div className="min-w-0"><div className="truncate text-[12.5px] font-medium">{contact?.full_name ?? text.detail.noContactPerson}</div><div className="mt-0.5 truncate text-[10.5px] text-[#6B7078]">{contact?.job_title ?? `${strings.position} —`}</div></div>
            </div>
            <div className="mt-3 border-t border-black/[0.07]">
              <div className="flex min-h-[38px] items-center gap-2 border-b border-black/[0.07]"><Mail className="size-3.5 text-[#6B7078]" /><span className="min-w-0 flex-1 truncate text-[11.5px] text-[#40454E]">{contact?.email ?? text.common.noEmailFound}</span>{contactDomainMismatch ? <span className="shrink-0 rounded-[6px] bg-[#FDF0E3] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-[#9A5106]">Domain ≠</span> : null}</div>
              <div className="flex min-h-[38px] items-center gap-2 border-b border-black/[0.07]"><Phone className="size-3.5 text-[#6B7078]" /><span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-[#40454E]">{contact?.phone ?? company?.phone ?? text.detail.noPhoneFound}</span></div>
              <div className="flex min-h-[38px] items-center gap-2"><BriefcaseBusiness className="size-3.5 text-[#6B7078]" /><span className="min-w-0 flex-1 truncate text-[11.5px] text-[#6B7078]">{strings.industry} {company?.industry ?? "—"}</span></div>
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-[16px] border border-black/[0.08] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(11,12,14,0.03)]">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">{strings.links}</div>
            <div className="mt-2">
              {companyLink(text.common.website, company?.website_url ?? null, Globe2)}
              {companyLink(text.detail.contactForm, company?.contact_form_url ?? null, FileText)}
              {companyLink("LinkedIn", company?.linkedin_url ?? null, ExternalLink)}
              {companyLink("Instagram", company?.instagram_url ?? null, ExternalLink)}
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-black/[0.07] pt-3 text-[10.5px]">
              <span className="text-[#6B7078]">{strings.preview}</span>
              <span className={`font-mono text-[9px] uppercase tracking-[0.06em] ${latestRedesignPreview?.public_token ? "text-[#2F6B3A]" : "text-[#6B7078]"}`}>{latestRedesignPreview?.public_token ? strings.createdPreview : strings.noPreview}</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* =========================================================
   VISUAL ANALYSIS CARD
========================================================= */

function VisualAnalysisCard({
  leadId,
  language,
  sourceLanguage,
  status,
  structuralScore,
  visualScore,
  redesignPotential,
  analysis,
  analyzedAt,
  error,
  model,
  inputTokens,
  outputTokens,
  totalTokens,
}: {
  leadId: string;

  language:
    AppLanguage;

  sourceLanguage:
    AppLanguage;

  status: string;

  structuralScore:
    | number
    | null;

  visualScore:
    | number
    | null;

  redesignPotential:
    | number
    | null;

  analysis:
    VisualAnalysis;

  analyzedAt:
    | string
    | null;

  error:
    | string
    | null;

  model:
    | string
    | null;

  inputTokens:
    | number
    | null;

  outputTokens:
    | number
    | null;

  totalTokens:
    | number
    | null;
}) {
  const text =
    leadsCopy[
      language
    ].detail;

  const locale =
    language ===
      "de"
      ? "de-DE"
      : "en-IE";

  return (
    <Card data-workspace-reveal className="leadbase-workspace-card min-w-0">
      <CardContent className="p-0">
        {status !==
        "COMPLETED" ? (
          <>
        <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <Sparkles className="size-4" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                {
                  text.visualAnalysis
                }
              </h2>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {
                  text.visualAnalysisDescription
                }
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`w-fit shrink-0 ${analysisStatusClass(
              status
            )}`}
          >
            {analysisStatusLabel(
              status,
              language
            )}
          </Badge>
        </div>

          </>
        ) : null}

        {status ===
        "FAILED" ? (
          <div className="mt-5 flex min-w-0 gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900 dark:bg-red-950/40">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />

            <div className="min-w-0">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {
                  text.visualAnalysisFailed
                }
              </p>

              <p className="mt-1 break-words text-sm leading-6 text-red-700/80 dark:text-red-400/80">
                {error ??
                  text.visualAnalysisFailedDescription}
              </p>
            </div>
          </div>
        ) : null}

        {status ===
        "NOT_ANALYZED" ? (
          <div className="mt-5 rounded-lg border border-dashed px-4 py-5">
            <p className="text-sm font-medium">
              {
                text.noVisualAnalysis
              }
            </p>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {
                text.noVisualAnalysisDescription
              }
            </p>
          </div>
        ) : null}

        {status ===
        "ANALYZING" ? (
          <div className="mt-5 rounded-lg border px-4 py-5">
            <p className="text-sm font-medium">
              {
                text.visualAnalysisInProgress
              }
            </p>
          </div>
        ) : null}

        {status ===
        "COMPLETED" ? (
          <LocalizedVisualAnalysis
            leadId={leadId}
            sourceLanguage={sourceLanguage}
            narrative={{
              strengths: analysis.strengths,
              weaknesses: analysis.weaknesses,
              summary: analysis.summary,
              redesignReason: analysis.redesignReason,
              outreachAngle: analysis.outreachAngle,
            }}
            leftContent={
              <div key="visual-analysis-left-content">
                <div className="flex items-center gap-2">
                  <Monitor className="size-[13px] text-[#6B7078]" />
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
                    {language === "de" ? "Design-Kriterien" : "Design criteria"}
                  </p>
                </div>

                <div className="mt-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
                  <VisualMetric label={text.modernity} value={analysis.modernity} color="#002BBA" />
                  <VisualMetric label={text.visualHierarchy} value={analysis.visualHierarchy} color="#4C66D4" />
                  <VisualMetric label={text.typography} value={analysis.typography} color="#002BBA" />
                  <VisualMetric label={text.spacing} value={analysis.spacing} color="#4C66D4" />
                  <VisualMetric label={text.branding} value={analysis.branding} color="#4C66D4" />
                  <VisualMetric label={text.imagery} value={analysis.imagery} color="#9FB0EA" />
                  <VisualMetric label={text.ctaVisibility} value={analysis.ctaVisibility} color="#9FB0EA" />
                  <VisualMetric label={text.mobileQuality} value={analysis.mobileQuality} color="#4C66D4" />
                  <VisualMetric label={text.projectPresentation} value={analysis.projectPresentation} color="#9FB0EA" />
                </div>
              </div>
            }
            footer={
              <div
                key="visual-analysis-footer"
                className="font-mono text-[9.5px] uppercase tracking-[0.04em] text-[#6B7078]"
              >
                {inputTokens !== null ? `INPUT ${inputTokens.toLocaleString(locale)}` : "INPUT —"}
                {" · "}
                {outputTokens !== null ? `OUTPUT ${outputTokens.toLocaleString(locale)} TOKENS` : "OUTPUT — TOKENS"}
              </div>
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

/* =========================================================
   STRUCTURAL ANALYSIS
========================================================= */

function StructuralAnalysisCard({
  language,
  status,
  findings,
  analyzedAt,
  error,
}: {
  language:
    AppLanguage;

  status: string;

  findings:
    WebsiteFinding[];

  analyzedAt:
    | string
    | null;

  error:
    | string
    | null;
}) {
  const text =
    leadsCopy[
      language
    ].detail;

  return (
    <Card data-workspace-reveal className="leadbase-workspace-card min-w-0">
      <CardContent className="p-0">
        {status !==
        "COMPLETED" ? (
          <>
        <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              {
                text.structuralAnalysis
              }
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {
                text.structuralAnalysisDescription
              }
            </p>
          </div>

          <Badge
            variant="outline"
            className={`w-fit shrink-0 ${analysisStatusClass(
              status
            )}`}
          >
            {analysisStatusLabel(
              status,
              language
            )}
          </Badge>
        </div>

          </>
        ) : null}

        {status ===
        "FAILED" ? (
          <div className="mt-5 flex min-w-0 gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900 dark:bg-red-950/40">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />

            <div className="min-w-0">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {
                  text.structuralAnalysisFailed
                }
              </p>

              <p className="mt-1 break-words text-sm leading-6 text-red-700/80 dark:text-red-400/80">
                {error ??
                  text.analysisFailed}
              </p>
            </div>
          </div>
        ) : null}

        {status ===
          "COMPLETED" &&
        findings.length >
          0 ? (
          <>
            <div className="mt-2 flex items-center justify-between gap-4">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
                {language === "de" ? "Strukturelle Analyse" : "Structural analysis"} · {findings.length} {language === "de" ? "Signale" : "signals"}
              </p>

              <div className="flex items-center gap-3.5 text-[11.5px] text-[#6B7078]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3 text-[#2F6B3A]" />
                  {findings.filter((item) => item.passed).length} {language === "de" ? "erfüllt" : "passed"}
                </span>
                <span className="flex items-center gap-1.5">
                  <XCircle className="size-3 text-[#9A5106]" />
                  {findings.filter((item) => !item.passed).length} {language === "de" ? "offen" : "open"}
                </span>
              </div>
            </div>

            <div className="mt-3.5 grid gap-x-5 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {findings.map((finding) => (
                <div key={finding.key} className="flex min-w-0 gap-2.5">
                  {finding.passed ? (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#2F6B3A]" />
                  ) : (
                    <XCircle className="mt-0.5 size-3.5 shrink-0 text-[#9A5106]" />
                  )}

                  <div className="min-w-0">
                    <p className="break-words text-[12.5px] font-medium tracking-[-0.01em] text-[#0B0C0E]">
                      {finding.label}
                    </p>
                    <p className="mt-0.5 break-words text-[10.5px] leading-4 text-[#6B7078]">
                      {finding.detail ?? (finding.passed ? text.detected : text.notDetected)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 border-t border-black/[0.07] pt-3 font-mono text-[9.5px] uppercase tracking-[0.04em] text-[#6B7078]">
              {text.lastAnalyzed} {formatDateTime(analyzedAt, language)}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* =========================================================
   VISUAL METRIC
========================================================= */

function VisualMetric({
  label,
  value,
  color = "#002BBA",
}: {
  label: string;

  value:
    | number
    | null;

  color?:
    string;
}) {
  const safeValue =
    value ??
    0;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-[11.5px] text-[#40454E]">
          {label}
        </span>

        <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-[#0B0C0E]">
          {value ?? "—"}
        </span>
      </div>

      <div className="mt-[5px] h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(
              0,
              Math.min(
                safeValue,
                100
              )
            )}%`,

            backgroundColor:
              color,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   MINI SCORE
========================================================= */

function MiniScore({
  label,
  value,
}: {
  label: string;

  value:
    | number
    | null;
}) {
  return (
    <div className="min-w-0 rounded-lg border px-4 py-3">
      <p className="break-words text-xs text-muted-foreground">
        {
          label
        }
      </p>

      <p className="mt-2 text-xl font-semibold tracking-tight">
        {value !==
        null ? (
          <>
            {
              value
            }

            <span className="text-xs font-normal text-muted-foreground">
              /100
            </span>
          </>
        ) : (
          "—"
        )}
      </p>
    </div>
  );
}

/* =========================================================
   SCORE CARD
========================================================= */

function ScoreCard({
  label,
  value,
}: {
  label: string;

  value:
    | number
    | null;
}) {
  return (
    <Card className="leadbase-detail-metric leadbase-workspace-card min-w-0">
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {
            label
          }
        </p>

        <p className="mt-4 text-xl font-semibold tracking-tight sm:mt-5 sm:text-2xl">
          {value !==
          null ? (
            <>
              {
                value
              }

              <span className="text-sm font-normal text-muted-foreground sm:text-base">
                /100
              </span>
            </>
          ) : (
            "—"
          )}
        </p>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">
        {
          label
        }
      </p>

      <p className="mt-1.5 break-words text-sm">
        {
          value
        }
      </p>
    </div>
  );
}

/* =========================================================
   CONTACT ROW
========================================================= */

function ContactRow({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    React.ElementType;

  label: string;

  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          {
            label
          }
        </p>

        <p className="mt-0.5 break-words text-sm">
          {
            value
          }
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   COMPANY LINK
========================================================= */

function CompanyLink({
  icon:
    Icon,
  label,
  href,
  notFoundLabel,
}: {
  icon:
    React.ElementType;

  label: string;

  href:
    | string
    | null
    | undefined;

  notFoundLabel:
    string;
}) {
  if (
    !href
  ) {
    return (
      <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-3 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="size-4 shrink-0 text-muted-foreground" />

          <span className="truncate text-sm">
            {
              label
            }
          </span>
        </div>

        <span className="shrink-0 text-xs text-muted-foreground">
          {
            notFoundLabel
          }
        </span>
      </div>
    );
  }

  return (
    <a
      href={
        normalizeUrl(
          href
        )
      }
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-3 transition-colors hover:bg-muted/50 sm:py-2.5"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon className="size-4 shrink-0 text-muted-foreground" />

        <span className="truncate text-sm">
          {
            label
          }
        </span>
      </div>

      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}