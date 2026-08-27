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
  Pencil,
  Phone,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

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

/* =========================================================
   PAGE
========================================================= */

export default async function LeadDetailPage({
  params,
}: LeadDetailPageProps) {
  const [
    {
      id,
    },
    language,
  ] =
    await Promise.all([
      params,
      getAppLanguage(),
    ]);

  const text =
    leadsCopy[
      language
    ];

  const supabase =
    await createClient();

  const {
    data:
      lead,

    error,
  } =
    await supabase
      .from(
        "leads"
      )
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
        )
      `)
      .eq(
        "id",
        id
      )
      .single();

  if (
    error ||
    !lead
  ) {
    console.error(
      "Could not load lead:",
      error
    );

    notFound();
  }

  /* =======================================================
     LATEST REDESIGN
  ======================================================= */

  const {
    data:
      latestRedesignPreview,

    error:
      latestRedesignPreviewError,
  } =
    await supabase
      .from(
        "redesign_previews"
      )
      .select(`
        public_token,
        generation_index
      `)
      .eq(
        "lead_id",
        id
      )
      .order(
        "generation_index",
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )
      .maybeSingle();

  if (
    latestRedesignPreviewError
  ) {
    console.error(
      "Could not load latest redesign preview:",
      latestRedesignPreviewError
    );
  }

  const company =
    getSingleRelation(
      lead.company
    );

  const contact =
    getSingleRelation(
      lead.primary_contact
    );

  const findings =
    parseWebsiteFindings(
      lead.website_findings,
      text.detail.finding
    );

  const visual =
    parseVisualAnalysis(
      lead.visual_analysis
    );

  const visualSourceLanguage =
    parseVisualSourceLanguage(
      lead.visual_analysis
    );

  const structuralStatus =
    lead.analysis_status ??
    "NOT_ANALYZED";

  const visualStatus =
    lead.visual_analysis_status ??
    "NOT_ANALYZED";

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        {
          text.detail
            .backToLeads
        }
      </Link>

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="mt-5 flex flex-col justify-between gap-5 sm:mt-6 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">
              {company?.name ??
                text.common
                  .unknownCompany}
            </h1>

            <Badge
              variant="outline"
              className={`shrink-0 font-medium ${statusClass(
                lead.status
              )}`}
            >
              {getLeadStatusLabel(
                lead.status,
                language
              )}
            </Badge>
          </div>

          <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
            {company?.industry ? (
              <span className="flex min-w-0 items-start gap-1.5">
                <Building2 className="mt-0.5 size-4 shrink-0" />

                <span className="break-words">
                  {
                    company.industry
                  }
                </span>
              </span>
            ) : null}

            {company?.location ? (
              <span className="flex min-w-0 items-start gap-1.5">
                <MapPin className="mt-0.5 size-4 shrink-0" />

                <span className="break-words">
                  {
                    company.location
                  }
                </span>
              </span>
            ) : null}
          </div>
        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center lg:max-w-[900px] lg:justify-end">
          <div className="[&>*]:w-full sm:[&>*]:w-auto">
            <AnalyzeWebsiteButton
              leadId={
                lead.id
              }
              hasWebsite={Boolean(
                company?.website_url
              )}
            />
          </div>

          {company?.website_url &&
          structuralStatus ===
            "COMPLETED" ? (
            <RedesignPreviewActions
              leadId={
                lead.id
              }
              initialPreviewToken={
                latestRedesignPreview
                  ?.public_token ??
                null
              }
              initialGenerationIndex={
                latestRedesignPreview
                  ?.generation_index ??
                0
              }
            />
          ) : null}

          <Link
            href={`/leads/${lead.id}/edit`}
            className={buttonVariants({
              variant:
                "outline",

              className:
                "h-10 w-full gap-2 sm:h-9 sm:w-auto",
            })}
          >
            <Pencil className="size-4" />

            {
              text.detail.edit
            }
          </Link>

          <form
            action={
              updateLeadStatus
            }
            className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center"
          >
            <input
              type="hidden"
              name="leadId"
              value={
                lead.id
              }
            />

            <select
              name="status"
              defaultValue={
                lead.status
              }
              className="h-10 min-w-0 rounded-lg border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-ring sm:h-9"
            >
              {[
                "NEW",
                "RESEARCHING",
                "QUALIFIED",
                "NOT_A_FIT",
                "DRAFT_READY",
                "CONTACTED",
                "REPLIED",
                "CALL_BOOKED",
                "PROPOSAL",
                "WON",
                "LOST",
                "DO_NOT_CONTACT",
              ].map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {getLeadStatusLabel(
                      item,
                      language
                    )}
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              className="h-10 whitespace-nowrap rounded-lg bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:h-9"
            >
              {
                text.detail
                  .update
              }
            </button>
          </form>

          {company?.website_url ? (
            <a
              href={
                normalizeUrl(
                  company.website_url
                )
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted sm:h-9 sm:w-auto"
            >
              {
                text.common
                  .visitWebsite
              }

              <ExternalLink className="size-4" />
            </a>
          ) : null}

          <div className="[&>*]:w-full sm:[&>*]:w-auto">
            <DeleteLeadDialog
              leadId={
                lead.id
              }
              companyName={
                company?.name ??
                text.detail
                  .thisLead
              }
            />
          </div>
        </div>
      </header>

      {/* ===================================================
          TOP SCORES
      =================================================== */}

      <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 lg:grid-cols-3 lg:gap-4">
        <ScoreCard
          label={
            text.detail
              .websiteScore
          }
          value={
            lead.website_score
          }
        />

        <ScoreCard
          label={
            text.detail
              .opportunityScore
          }
          value={
            lead.opportunity_score
          }
        />

        <Card className="col-span-2 min-w-0 shadow-none lg:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {
                text.detail
                  .estimatedValue
              }
            </p>

            <p className="mt-4 break-words text-xl font-semibold tracking-tight sm:mt-5 sm:text-2xl">
              {lead.estimated_project_value !==
              null
                ? new Intl.NumberFormat(
                    language ===
                      "de"
                      ? "de-DE"
                      : "en-IE",
                    {
                      style:
                        "currency",

                      currency:
                        lead.currency ??
                        "EUR",

                      maximumFractionDigits:
                        0,
                    }
                  ).format(
                    lead.estimated_project_value
                  )
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ===================================================
          MAIN GRID
      =================================================== */}

      <div className="mt-4 grid min-w-0 gap-4 sm:mt-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <Card className="min-w-0 shadow-none">
            <CardContent className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold">
                {
                  text.detail
                    .overview
                }
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
                <DetailItem
                  label={
                    text.common
                      .industry
                  }
                  value={
                    company?.industry ??
                    "—"
                  }
                />

                <DetailItem
                  label={
                    text.common
                      .location
                  }
                  value={
                    company?.location ??
                    "—"
                  }
                />

                <DetailItem
                  label={
                    text.common
                      .priority
                  }
                  value={
                    lead.priority
                      ? getLeadPriorityLabel(
                          lead.priority,
                          language
                        )
                      : "—"
                  }
                />

                <DetailItem
                  label={
                    text.detail
                      .created
                  }
                  value={
                    formatDate(
                      lead.created_at,
                      language
                    )
                  }
                />

                <DetailItem
                  label={
                    text.detail
                      .lastContact
                  }
                  value={
                    formatDate(
                      lead.last_contacted_at,
                      language
                    )
                  }
                />

                <DetailItem
                  label={
                    text.detail
                      .nextFollowUp
                  }
                  value={
                    formatDate(
                      lead.next_follow_up_at,
                      language
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          <VisualAnalysisCard
            leadId={
              lead.id
            }
            language={
              language
            }
            sourceLanguage={
              visualSourceLanguage
            }
            status={
              visualStatus
            }
            structuralScore={
              lead.structural_score
            }
            visualScore={
              lead.visual_score
            }
            redesignPotential={
              lead.redesign_potential
            }
            analysis={
              visual
            }
            analyzedAt={
              lead.visual_analyzed_at
            }
            error={
              lead.visual_analysis_error
            }
            model={
              lead.visual_model
            }
            inputTokens={
              lead.visual_input_tokens
            }
            outputTokens={
              lead.visual_output_tokens
            }
            totalTokens={
              lead.visual_total_tokens
            }
          />

          <StructuralAnalysisCard
            language={
              language
            }
            status={
              structuralStatus
            }
            findings={
              findings
            }
            analyzedAt={
              lead.analyzed_at
            }
            error={
              lead.analysis_error
            }
          />

          <OutreachSection
            leadId={
              lead.id
            }
          />

          <Card className="min-w-0 shadow-none">
            <CardContent className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold">
                {
                  text.detail
                    .companyDescription
                }
              </h2>

              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {company?.description ??
                  text.detail
                    .noCompanyDescription}
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-none">
            <CardContent className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold">
                {
                  text.detail
                    .notes
                }
              </h2>

              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {lead.notes ??
                  text.detail
                    .noNotes}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="min-w-0 shadow-none">
            <CardContent className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold">
                {
                  text.detail
                    .primaryContact
                }
              </h2>

              <div className="mt-5 space-y-4">
                <ContactRow
                  icon={
                    User
                  }
                  label={
                    text.detail
                      .contactPerson
                  }
                  value={
                    contact?.full_name ??
                    text.detail
                      .noContactPerson
                  }
                />

                <ContactRow
                  icon={
                    Building2
                  }
                  label={
                    text.detail
                      .jobTitle
                  }
                  value={
                    contact?.job_title ??
                    "—"
                  }
                />

                <ContactRow
                  icon={
                    Mail
                  }
                  label={
                    text.detail.email
                  }
                  value={
                    contact?.email ??
                    text.common
                      .noEmailFound
                  }
                />

                <ContactRow
                  icon={
                    Phone
                  }
                  label={
                    text.detail.phone
                  }
                  value={
                    contact?.phone ??
                    company?.phone ??
                    text.detail
                      .noPhoneFound
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 shadow-none">
            <CardContent className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold">
                {
                  text.detail
                    .companyLinks
                }
              </h2>

              <div className="mt-5 space-y-3">
                <CompanyLink
                  icon={
                    Globe2
                  }
                  label={
                    text.common
                      .website
                  }
                  href={
                    company?.website_url
                  }
                  notFoundLabel={
                    text.detail
                      .notFound
                  }
                />

                <CompanyLink
                  icon={
                    Mail
                  }
                  label={
                    text.detail
                      .contactForm
                  }
                  href={
                    company?.contact_form_url
                  }
                  notFoundLabel={
                    text.detail
                      .notFound
                  }
                />

                <CompanyLink
                  icon={
                    ExternalLink
                  }
                  label="LinkedIn"
                  href={
                    company?.linkedin_url
                  }
                  notFoundLabel={
                    text.detail
                      .notFound
                  }
                />

                <CompanyLink
                  icon={
                    ExternalLink
                  }
                  label="Instagram"
                  href={
                    company?.instagram_url
                  }
                  notFoundLabel={
                    text.detail
                      .notFound
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
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
    <Card className="min-w-0 shadow-none">
      <CardContent className="p-4 sm:p-5">
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
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MiniScore
                label={
                  text.structural
                }
                value={
                  structuralScore
                }
              />

              <MiniScore
                label={
                  text.visual
                }
                value={
                  visualScore
                }
              />

              <MiniScore
                label={
                  text.redesignPotential
                }
                value={
                  redesignPotential
                }
              />
            </div>

            <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <VisualMetric
                label={
                  text.modernity
                }
                value={
                  analysis.modernity
                }
              />

              <VisualMetric
                label={
                  text.visualHierarchy
                }
                value={
                  analysis.visualHierarchy
                }
              />

              <VisualMetric
                label={
                  text.typography
                }
                value={
                  analysis.typography
                }
              />

              <VisualMetric
                label={
                  text.spacing
                }
                value={
                  analysis.spacing
                }
              />

              <VisualMetric
                label={
                  text.branding
                }
                value={
                  analysis.branding
                }
              />

              <VisualMetric
                label={
                  text.imagery
                }
                value={
                  analysis.imagery
                }
              />

              <VisualMetric
                label={
                  text.ctaVisibility
                }
                value={
                  analysis.ctaVisibility
                }
              />

              <VisualMetric
                label={
                  text.mobileQuality
                }
                value={
                  analysis.mobileQuality
                }
              />

              <VisualMetric
                label={
                  text.projectPresentation
                }
                value={
                  analysis.projectPresentation
                }
              />
            </div>

            <LocalizedVisualAnalysis
              leadId={
                leadId
              }
              sourceLanguage={
                sourceLanguage
              }
              narrative={{
                strengths:
                  analysis.strengths,

                weaknesses:
                  analysis.weaknesses,

                summary:
                  analysis.summary,

                redesignReason:
                  analysis.redesignReason,

                outreachAngle:
                  analysis.outreachAngle,
              }}
            />

            <div className="mt-5 flex flex-col gap-1.5 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <span>
                {
                  text.lastAnalyzed
                }{" "}
                {formatDateTime(
                  analyzedAt,
                  language
                )}
              </span>

              <span className="break-words">
                {model ??
                  "Visual AI"}

                {totalTokens !==
                null
                  ? ` · ${totalTokens.toLocaleString(
                      locale
                    )} tokens`
                  : ""}
              </span>
            </div>

            {(inputTokens !==
              null ||
              outputTokens !==
                null) ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {
                  text.input
                }{" "}
                {inputTokens?.toLocaleString(
                  locale
                ) ??
                  "—"}{" "}
                ·{" "}
                {
                  text.output
                }{" "}
                {outputTokens?.toLocaleString(
                  locale
                ) ??
                  "—"}
              </p>
            ) : null}
          </>
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
    <Card className="min-w-0 shadow-none">
      <CardContent className="p-4 sm:p-5">
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
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {findings.map(
                (
                  finding
                ) => (
                  <div
                    key={
                      finding.key
                    }
                    className="flex min-w-0 items-start gap-3 rounded-lg border px-3 py-3"
                  >
                    {finding.passed ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    )}

                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">
                        {
                          finding.label
                        }
                      </p>

                      <p className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">
                        {finding.detail ??
                          (finding.passed
                            ? text.detected
                            : text.notDetected)}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
              {
                text.lastAnalyzed
              }{" "}
              {formatDateTime(
                analyzedAt,
                language
              )}
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
}: {
  label: string;

  value:
    | number
    | null;
}) {
  const safeValue =
    value ??
    0;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {
            label
          }
        </p>

        <p className="shrink-0 text-xs font-medium">
          {value !==
          null
            ? `${value}/100`
            : "—"}
        </p>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all"
          style={{
            width: `${Math.max(
              0,
              Math.min(
                safeValue,
                100
              )
            )}%`,
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
    <Card className="min-w-0 shadow-none">
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