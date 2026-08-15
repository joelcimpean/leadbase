import Link from "next/link";
import { notFound } from "next/navigation";

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


import { updateLeadStatus } from "../actions";

import { AnalyzeWebsiteButton } from "./analyze-button";
import { DeleteLeadDialog } from "./delete-lead-dialog";
import { OutreachSection } from "./outreach-section";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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
  visualScore: number | null;
  redesignPotential: number | null;

  modernity: number | null;
  visualHierarchy: number | null;
  typography: number | null;
  spacing: number | null;
  branding: number | null;
  imagery: number | null;
  ctaVisibility: number | null;
  mobileQuality: number | null;
  projectPresentation: number | null;

  strengths: string[];
  weaknesses: string[];

  summary: string | null;
  redesignReason: string | null;
  outreachAngle: string | null;
};

/* =========================================================
   STATUS
========================================================= */

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClass(status: string) {
  switch (status) {
    case "NEW":
      return "border-sky-200 bg-sky-50 text-sky-700";

    case "RESEARCHING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "QUALIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "NOT_A_FIT":
      return "border-zinc-200 bg-zinc-100 text-zinc-600";

    case "DRAFT_READY":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "CONTACTED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "REPLIED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";

    case "CALL_BOOKED":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";

    case "PROPOSAL":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "WON":
      return "border-green-200 bg-green-50 text-green-700";

    case "LOST":
      return "border-zinc-200 bg-zinc-100 text-zinc-600";

    case "DO_NOT_CONTACT":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

/* =========================================================
   ANALYSIS STATUS
========================================================= */

function analysisStatusClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "ANALYZING":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-600";
  }
}

function analysisStatusLabel(status: string) {
  switch (status) {
    case "COMPLETED":
      return "Analyzed";

    case "ANALYZING":
      return "Analyzing";

    case "FAILED":
      return "Failed";

    default:
      return "Not analyzed";
  }
}

/* =========================================================
   DATE
========================================================= */

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/* =========================================================
   RELATION HELPER
========================================================= */

function getSingleRelation<T>(
  value: T | T[] | null
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

/* =========================================================
   STRUCTURAL FINDINGS
========================================================= */

function parseWebsiteFindings(
  value: unknown
): WebsiteFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
    .map((item, index) => ({
      key:
        typeof item.key === "string"
          ? item.key
          : `finding-${index}`,

      label:
        typeof item.label === "string"
          ? item.label
          : "Finding",

      passed: item.passed === true,

      detail:
        typeof item.detail === "string"
          ? item.detail
          : undefined,
    }));
}

/* =========================================================
   VISUAL ANALYSIS PARSER
========================================================= */

function parseVisualAnalysis(
  value: unknown
): VisualAnalysis {
  const empty: VisualAnalysis = {
    visualScore: null,
    redesignPotential: null,

    modernity: null,
    visualHierarchy: null,
    typography: null,
    spacing: null,
    branding: null,
    imagery: null,
    ctaVisibility: null,
    mobileQuality: null,
    projectPresentation: null,

    strengths: [],
    weaknesses: [],

    summary: null,
    redesignReason: null,
    outreachAngle: null,
  };

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return empty;
  }

  const data = value as Record<string, unknown>;

  const numberValue = (key: string) => {
    return typeof data[key] === "number"
      ? (data[key] as number)
      : null;
  };

  const stringValue = (key: string) => {
    return typeof data[key] === "string"
      ? (data[key] as string)
      : null;
  };

  const stringArray = (key: string) => {
    if (!Array.isArray(data[key])) {
      return [];
    }

    return (data[key] as unknown[]).filter(
      (item): item is string =>
        typeof item === "string"
    );
  };

  return {
    visualScore: numberValue("visualScore"),

    redesignPotential:
      numberValue("redesignPotential"),

    modernity: numberValue("modernity"),

    visualHierarchy:
      numberValue("visualHierarchy"),

    typography: numberValue("typography"),

    spacing: numberValue("spacing"),

    branding: numberValue("branding"),

    imagery: numberValue("imagery"),

    ctaVisibility:
      numberValue("ctaVisibility"),

    mobileQuality:
      numberValue("mobileQuality"),

    projectPresentation:
      numberValue("projectPresentation"),

    strengths: stringArray("strengths"),

    weaknesses: stringArray("weaknesses"),

    summary: stringValue("summary"),

    redesignReason:
      stringValue("redesignReason"),

    outreachAngle:
      stringValue("outreachAngle"),
  };
}

/* =========================================================
   PAGE
========================================================= */

export default async function LeadDetailPage({
  params,
}: LeadDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: lead, error } = await supabase
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
    .eq("id", id)
    .single();

  if (error || !lead) {
    console.error("Could not load lead:", error);

    notFound();
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
      lead.website_findings
    );

  const visual =
    parseVisualAnalysis(
      lead.visual_analysis
    );

  const structuralStatus =
    lead.analysis_status ??
    "NOT_ANALYZED";

  const visualStatus =
    lead.visual_analysis_status ??
    "NOT_ANALYZED";

  return (
    <div className="mx-auto w-full max-w-[1400px] px-8 py-8 lg:px-10 lg:py-10">
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        Back to leads
      </Link>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {company?.name ??
                "Unknown company"}
            </h1>

            <Badge
              variant="outline"
              className={`font-medium ${statusClass(
                lead.status
              )}`}
            >
              {statusLabel(
                lead.status
              )}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {company?.industry ? (
              <span className="flex items-center gap-1.5">
                <Building2 className="size-4" />

                {company.industry}
              </span>
            ) : null}

            {company?.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />

                {company.location}
              </span>
            ) : null}
          </div>
        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap items-center gap-2">
          <AnalyzeWebsiteButton
            leadId={lead.id}
            hasWebsite={Boolean(
              company?.website_url
            )}
          />

          <Link
            href={`/leads/${lead.id}/edit`}
            className={buttonVariants({
              variant: "outline",

              className:
                "h-9 gap-2",
            })}
          >
            <Pencil className="size-4" />

            Edit
          </Link>

          <form
            action={updateLeadStatus}
            className="flex items-center gap-2"
          >
            <input
              type="hidden"
              name="leadId"
              value={lead.id}
            />

            <select
              name="status"
              defaultValue={
                lead.status
              }
              className="h-9 rounded-lg border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-ring"
            >
              <option value="NEW">
                New
              </option>

              <option value="RESEARCHING">
                Researching
              </option>

              <option value="QUALIFIED">
                Qualified
              </option>

              <option value="NOT_A_FIT">
                Not a fit
              </option>

              <option value="DRAFT_READY">
                Draft ready
              </option>

              <option value="CONTACTED">
                Contacted
              </option>

              <option value="REPLIED">
                Replied
              </option>

              <option value="CALL_BOOKED">
                Call booked
              </option>

              <option value="PROPOSAL">
                Proposal
              </option>

              <option value="WON">
                Won
              </option>

              <option value="LOST">
                Lost
              </option>

              <option value="DO_NOT_CONTACT">
                Do not contact
              </option>
            </select>

            <button
              type="submit"
              className="h-9 rounded-lg bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Update status
            </button>
          </form>

          {company?.website_url ? (
            <a
                href={
                    company.website_url.startsWith("http")
                    ? company.website_url
                    : `https://${company.website_url}`
                        }
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
                Visit website

                <ExternalLink className="size-4" />
            </a>
            ) : null}

          <DeleteLeadDialog
            leadId={lead.id}
            companyName={
              company?.name ??
              "this lead"
            }
          />
        </div>
      </header>

      {/* =====================================================
          FINAL SCORES
      ===================================================== */}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <ScoreCard
          label="Website score"
          value={
            lead.website_score
          }
        />

        <ScoreCard
          label="Opportunity score"
          value={
            lead.opportunity_score
          }
        />

        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Estimated value
            </p>

            <p className="mt-5 text-2xl font-semibold tracking-tight">
              {lead.estimated_project_value !== null
                ? new Intl.NumberFormat(
                    "de-DE",
                    {
                      style:
                        "currency",

                      currency:
                        lead.currency ??
                        "EUR",

                      maximumFractionDigits: 0,
                    }
                  ).format(
                    lead.estimated_project_value
                  )
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* OVERVIEW */}

          <Card className="shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold">
                Overview
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <DetailItem
                  label="Industry"
                  value={
                    company?.industry ??
                    "—"
                  }
                />

                <DetailItem
                  label="Location"
                  value={
                    company?.location ??
                    "—"
                  }
                />

                <DetailItem
                  label="Priority"
                  value={
                    lead.priority
                      ? statusLabel(
                          lead.priority
                        )
                      : "—"
                  }
                />

                <DetailItem
                  label="Created"
                  value={formatDate(
                    lead.created_at
                  )}
                />

                <DetailItem
                  label="Last contact"
                  value={formatDate(
                    lead.last_contacted_at
                  )}
                />

                <DetailItem
                  label="Next follow-up"
                  value={formatDate(
                    lead.next_follow_up_at
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* =================================================
              VISUAL ANALYSIS
          ================================================= */}

          <VisualAnalysisCard
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

          {/* =================================================
              STRUCTURAL ANALYSIS
          ================================================= */}

          <StructuralAnalysisCard
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
          
          {/* =================================================
    OUTREACH
================================================= */}

<OutreachSection
  leadId={lead.id}
/>

          {/* COMPANY DESCRIPTION */}

          <Card className="shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold">
                Company description
              </h2>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {company?.description ??
                  "No company description available yet."}
              </p>
            </CardContent>
          </Card>

          {/* NOTES */}

          <Card className="shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold">
                Notes
              </h2>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {lead.notes ??
                  "No notes yet."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ===================================================
            RIGHT COLUMN
        =================================================== */}

        <div className="space-y-4">
          <Card className="shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold">
                Primary contact
              </h2>

              <div className="mt-5 space-y-4">
                <ContactRow
                  icon={User}
                  label="Contact person"
                  value={
                    contact?.full_name ??
                    "No contact person found"
                  }
                />

                <ContactRow
                  icon={Building2}
                  label="Job title"
                  value={
                    contact?.job_title ??
                    "—"
                  }
                />

                <ContactRow
                  icon={Mail}
                  label="Email"
                  value={
                    contact?.email ??
                    "No email found"
                  }
                />

                <ContactRow
                  icon={Phone}
                  label="Phone"
                  value={
                    contact?.phone ??
                    company?.phone ??
                    "No phone found"
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold">
                Company links
              </h2>

              <div className="mt-5 space-y-3">
                <CompanyLink
                  icon={Globe2}
                  label="Website"
                  href={
                    company?.website_url
                  }
                />

                <CompanyLink
                  icon={Mail}
                  label="Contact form"
                  href={
                    company?.contact_form_url
                  }
                />

                <CompanyLink
                  icon={ExternalLink}
                  label="LinkedIn"
                  href={
                    company?.linkedin_url
                  }
                />

                <CompanyLink
                  icon={ExternalLink}
                  label="Instagram"
                  href={
                    company?.instagram_url
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

  analysis: VisualAnalysis;

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
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <Sparkles className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">
                Visual analysis
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                AI review of desktop and mobile presentation.
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={
              analysisStatusClass(
                status
              )
            }
          >
            {analysisStatusLabel(
              status
            )}
          </Badge>
        </div>

        {status === "FAILED" ? (
          <div className="mt-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />

            <div>
              <p className="text-sm font-medium text-red-700">
                Visual analysis failed
              </p>

              <p className="mt-1 break-words text-sm leading-6 text-red-700/80">
                {error ??
                  "Visual analysis could not be completed."}
              </p>
            </div>
          </div>
        ) : null}

        {status === "NOT_ANALYZED" ? (
          <div className="mt-5 rounded-lg border border-dashed px-4 py-5">
            <p className="text-sm font-medium">
              No visual analysis yet
            </p>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Analyze the website to create desktop and mobile screenshots and evaluate the design.
            </p>
          </div>
        ) : null}

        {status === "ANALYZING" ? (
          <div className="mt-5 rounded-lg border px-4 py-5">
            <p className="text-sm font-medium">
              Visual analysis in progress
            </p>
          </div>
        ) : null}

        {status === "COMPLETED" ? (
          <>
            {/* THREE SOURCE SCORES */}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MiniScore
                label="Structural"
                value={
                  structuralScore
                }
              />

              <MiniScore
                label="Visual"
                value={
                  visualScore
                }
              />

              <MiniScore
                label="Redesign potential"
                value={
                  redesignPotential
                }
              />
            </div>

            {/* VISUAL METRICS */}

            <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <VisualMetric
                label="Modernity"
                value={
                  analysis.modernity
                }
              />

              <VisualMetric
                label="Visual hierarchy"
                value={
                  analysis.visualHierarchy
                }
              />

              <VisualMetric
                label="Typography"
                value={
                  analysis.typography
                }
              />

              <VisualMetric
                label="Spacing"
                value={
                  analysis.spacing
                }
              />

              <VisualMetric
                label="Branding"
                value={
                  analysis.branding
                }
              />

              <VisualMetric
                label="Imagery"
                value={
                  analysis.imagery
                }
              />

              <VisualMetric
                label="CTA visibility"
                value={
                  analysis.ctaVisibility
                }
              />

              <VisualMetric
                label="Mobile quality"
                value={
                  analysis.mobileQuality
                }
              />

              <VisualMetric
                label="Project presentation"
                value={
                  analysis.projectPresentation
                }
              />
            </div>

            {/* STRENGTH / WEAKNESS */}

            {(analysis.strengths.length >
              0 ||
              analysis.weaknesses.length >
                0) && (
              <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Strengths
                  </p>

                  <div className="mt-3 space-y-2">
                    {analysis.strengths.map(
                      (
                        strength,
                        index
                      ) => (
                        <div
                          key={`${strength}-${index}`}
                          className="flex gap-2 text-sm"
                        >
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />

                          <span>
                            {
                              strength
                            }
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Weaknesses
                  </p>

                  <div className="mt-3 space-y-2">
                    {analysis.weaknesses.map(
                      (
                        weakness,
                        index
                      ) => (
                        <div
                          key={`${weakness}-${index}`}
                          className="flex gap-2 text-sm"
                        >
                          <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" />

                          <span>
                            {
                              weakness
                            }
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {analysis.summary ? (
              <AnalysisTextSection
                label="Visual summary"
                value={
                  analysis.summary
                }
              />
            ) : null}

            {analysis.redesignReason ? (
              <AnalysisTextSection
                label="Redesign reason"
                value={
                  analysis.redesignReason
                }
              />
            ) : null}

            {analysis.outreachAngle ? (
              <div className="mt-5 rounded-lg border bg-muted/30 px-4 py-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Suggested outreach angle
                </p>

                <p className="mt-2 text-sm leading-6">
                  {
                    analysis.outreachAngle
                  }
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
              <span>
                Last analyzed{" "}
                {formatDateTime(
                  analyzedAt
                )}
              </span>

              <span>
                {model ??
                  "Visual AI"}

                {totalTokens !== null
                  ? ` · ${totalTokens.toLocaleString(
                      "de-DE"
                    )} tokens`
                  : ""}
              </span>
            </div>

            {(inputTokens !== null ||
              outputTokens !==
                null) && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Input{" "}
                {inputTokens?.toLocaleString(
                  "de-DE"
                ) ?? "—"}{" "}
                · Output{" "}
                {outputTokens?.toLocaleString(
                  "de-DE"
                ) ?? "—"}
              </p>
            )}
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
  status,
  findings,
  analyzedAt,
  error,
}: {
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
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              Structural analysis
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Multi-page analysis of structure, content and conversion signals.
            </p>
          </div>

          <Badge
            variant="outline"
            className={
              analysisStatusClass(
                status
              )
            }
          >
            {analysisStatusLabel(
              status
            )}
          </Badge>
        </div>

        {status === "FAILED" ? (
          <div className="mt-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />

            <div>
              <p className="text-sm font-medium text-red-700">
                Structural analysis failed
              </p>

              <p className="mt-1 text-sm text-red-700/80">
                {error ??
                  "Analysis failed."}
              </p>
            </div>
          </div>
        ) : null}

        {status === "COMPLETED" &&
        findings.length > 0 ? (
          <>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {findings.map(
                (finding) => (
                  <div
                    key={
                      finding.key
                    }
                    className="flex items-start gap-3 rounded-lg border px-3 py-3"
                  >
                    {finding.passed ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    )}

                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {
                          finding.label
                        }
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {finding.detail ??
                          (finding.passed
                            ? "Detected"
                            : "Not detected")}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
              Last analyzed{" "}
              {formatDateTime(
                analyzedAt
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
    value ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="text-xs font-medium">
          {value !== null
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
    <div className="rounded-lg border px-4 py-3">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold tracking-tight">
        {value !== null ? (
          <>
            {value}

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
   TEXT SECTION
========================================================= */

function AnalysisTextSection({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mt-5 border-t pt-5">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
        {value}
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
    <Card className="shadow-none">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">
          {label}
        </p>

        <p className="mt-5 text-2xl font-semibold tracking-tight">
          {value !== null ? (
            <>
              {value}

              <span className="text-base font-normal text-muted-foreground">
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
    <div>
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>

      <p className="mt-1.5 text-sm">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   CONTACT ROW
========================================================= */

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm">
          {value}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   COMPANY LINK
========================================================= */

function CompanyLink({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href:
    | string
    | null
    | undefined;
}) {
  if (!href) {
    return (
      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <Icon className="size-4 text-muted-foreground" />

          <span className="text-sm">
            {label}
          </span>
        </div>

        <span className="text-xs text-muted-foreground">
          Not found
        </span>
      </div>
    );
  }

  const url =
    href.startsWith("http")
      ? href
      : `https://${href}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="size-4 text-muted-foreground" />

        <span className="text-sm">
          {label}
        </span>
      </div>

      <ExternalLink className="size-3.5 text-muted-foreground" />
    </a>
  );
}