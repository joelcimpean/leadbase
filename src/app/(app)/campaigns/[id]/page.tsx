import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Mail,
  MapPin,
  Plus,
  Target,
  Users,
} from "lucide-react";

import {
  CampaignActions,
} from "./campaign-actions";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  acquisitionCopy,
  getAcquisitionLeadStatusLabel,
  getAcquisitionPriorityLabel,
  getCampaignStatusLabel,
  localizeCampaignStrategyText,
  localizeCompanySizePreference,
  localizeTargetRoles,
} from "@/lib/acquisition-i18n";

import {
  type AppLanguage,
} from "@/lib/i18n";

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
   TYPES
========================================================= */

type CampaignDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   STATUS
========================================================= */

function statusClass(
  status: string
) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "PAUSED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400";

    case "ARCHIVED":
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400";
  }
}

function leadStatusClass(
  status: string
) {
  switch (status) {
    case "NEW":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400";

    case "RESEARCHING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400";

    case "QUALIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400";

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

    case "DO_NOT_CONTACT":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400";

    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";
  }
}

/* =========================================================
   DATE
========================================================= */

function formatDate(
  date: string,
  language: AppLanguage
) {
  return new Intl.DateTimeFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-GB",
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
   PAGE
========================================================= */

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const {
    id,
  } =
    await params;

  const language =
    await getAppLanguage();

  const text =
    acquisitionCopy[
      language
    ].campaignDetail;

  const supabase =
    await createClient();

  /* =======================================================
     CAMPAIGN
  ======================================================= */

  const {
    data:
      campaign,

    error:
      campaignError,
  } =
    await supabase
      .from(
        "campaigns"
      )
      .select(`
        id,
        name,
        target_industry,
        target_geography,
        company_size_preference,
        target_roles,
        research_criteria,
        website_criteria,
        outreach_angle,
        email_tone,
        follow_up_days,
        status,
        created_at
      `)
      .eq(
        "id",
        id
      )
      .single();

  if (
    campaignError ||
    !campaign
  ) {
    notFound();
  }

  /* =======================================================
     LEADS
  ======================================================= */

  const {
    data:
      leads,

    error:
      leadsError,
  } =
    await supabase
      .from(
        "leads"
      )
      .select(`
        id,
        status,
        priority,
        website_score,
        opportunity_score,

        company:companies (
          id,
          name,
          industry,
          location
        )
      `)
      .eq(
        "campaign_id",
        id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (
    leadsError
  ) {
    console.error(
      "Could not load campaign leads:",
      leadsError
    );
  }

  const campaignLeads =
    leads ?? [];

  const companySize =
    localizeCompanySizePreference(
      campaign.company_size_preference,
      language
    );

  const targetRoles =
    localizeTargetRoles(
      campaign.target_roles,
      language
    );

  const researchCriteria =
    localizeCampaignStrategyText(
      campaign.research_criteria,
      language
    );

  const websiteCriteria =
    localizeCampaignStrategyText(
      campaign.website_criteria,
      language
    );

  const outreachAngle =
    localizeCampaignStrategyText(
      campaign.outreach_angle,
      language
    );

  const emailTone =
    localizeCampaignStrategyText(
      campaign.email_tone,
      language
    );

  return (
    <div className="leadbase-workspace-page leadbase-route-campaign-detail mx-auto min-h-full w-full max-w-[1400px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
      <WorkspacePageMotion />
      {/* ===================================================
          BACK
      =================================================== */}

      <Link
        href="/campaigns"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />

        {
          text.back
        }
      </Link>

      {/* ===================================================
          HEADER
      =================================================== */}

      <header data-workspace-reveal className="leadbase-workspace-header mt-5 flex flex-col justify-between gap-5 p-5 md:mt-6 md:p-6 xl:flex-row xl:items-start xl:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">
              {
                campaign.name
              }
            </h1>

            <Badge
              variant="outline"
              className={`shrink-0 font-medium ${statusClass(
                campaign.status
              )}`}
            >
              {getCampaignStatusLabel(
                campaign.status,
                language
              )}
            </Badge>
          </div>

          <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            {campaign.target_industry ? (
              <span className="flex min-w-0 items-start gap-1.5">
                <Target className="mt-0.5 size-4 shrink-0" />

                <span className="break-words">
                  {
                    campaign.target_industry
                  }
                </span>
              </span>
            ) : null}

            {campaign.target_geography ? (
              <span className="flex min-w-0 items-start gap-1.5">
                <MapPin className="mt-0.5 size-4 shrink-0" />

                <span className="break-words">
                  {
                    campaign.target_geography
                  }
                </span>
              </span>
            ) : null}
          </div>
        </div>

        <CampaignActions
          campaignId={
            campaign.id
          }
          campaignName={
            campaign.name
          }
          initialStatus={
            campaign.status
          }
          leadCount={
            campaignLeads.length
          }
        />
      </header>

      {/* ===================================================
          STATS
      =================================================== */}

      <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 xl:grid-cols-4 xl:gap-4">
        <StatCard
          icon={
            Users
          }
          label={
            text.leads
          }
          value={String(
            campaignLeads.length
          )}
        />

        <StatCard
          icon={
            Building2
          }
          label={
            text.companySize
          }
          value={
            companySize ??
            text.any
          }
        />

        <StatCard
          icon={
            Mail
          }
          label={
            text.targetRoles
          }
          value={
            targetRoles ??
            text.any
          }
        />

        <StatCard
          icon={
            CalendarClock
          }
          label={
            text.followUp
          }
          value={`${campaign.follow_up_days} ${text.days}`}
        />
      </div>

      {/* ===================================================
          STRATEGY
      =================================================== */}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:mt-6 xl:gap-4">
        <InfoCard
          title={
            text.researchCriteria
          }
          value={
            researchCriteria
          }
          empty={
            text.noResearchCriteria
          }
        />

        <InfoCard
          title={
            text.websiteCriteria
          }
          value={
            websiteCriteria
          }
          empty={
            text.noWebsiteCriteria
          }
        />

        <InfoCard
          title={
            text.outreachAngle
          }
          value={
            outreachAngle
          }
          empty={
            text.noOutreachAngle
          }
        />

        <InfoCard
          title={
            text.emailTone
          }
          value={
            emailTone
          }
          empty={
            text.noEmailTone
          }
        />
      </div>

      {/* ===================================================
          CAMPAIGN LEADS
      =================================================== */}

      <Card data-workspace-reveal className="leadbase-workspace-card mt-4 min-w-0 xl:mt-6">
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:items-center sm:px-6 sm:py-5">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                {
                  text.campaignLeads
                }
              </h2>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {
                  text.campaignLeadsDescription
                }
              </p>
            </div>

            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
              {
                campaignLeads.length
              }{" "}
              {campaignLeads.length ===
              1
                ? text.lead
                : text.leadsPlural}
            </span>
          </div>

          {/* =================================================
              EMPTY STATE
          ================================================= */}

          {campaignLeads.length ===
          0 ? (
            <div className="flex min-h-48 items-center justify-center px-4 py-10 sm:px-6">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex size-9 items-center justify-center rounded-lg border">
                  <Users className="size-4" />
                </div>

                <p className="mt-4 text-sm font-medium">
                  {
                    text.noLeads
                  }
                </p>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {
                    text.noLeadsDescription
                  }
                </p>

                <Link
                  href={`/leads/new?campaign=${campaign.id}`}
                  className={buttonVariants({
                    variant:
                      "outline",

                    className:
                      "mt-4 w-full gap-2 sm:w-auto",
                  })}
                >
                  <Plus className="size-4" />

                  {
                    text.addFirstLead
                  }
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* =============================================
                  MOBILE CARDS
              ============================================= */}

              <div className="divide-y md:hidden">
                {campaignLeads.map(
                  (
                    lead
                  ) => {
                    const company =
                      getSingleRelation(
                        lead.company
                      );

                    return (
                      <Link
                        key={
                          lead.id
                        }
                        href={`/leads/${lead.id}`}
                        className="group block px-4 py-4 transition-colors hover:bg-muted/40 active:bg-muted/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold">
                              {company?.name ??
                                text.unknownCompany}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`whitespace-nowrap ${leadStatusClass(
                                  lead.status
                                )}`}
                              >
                                {getAcquisitionLeadStatusLabel(
                                  lead.status,
                                  language
                                )}
                              </Badge>

                              {lead.priority ? (
                                <span className="text-xs text-muted-foreground">
                                  {language ===
                                  "de"
                                    ? `${text.priority}: ${getAcquisitionPriorityLabel(
                                        lead.priority,
                                        language
                                      )}`
                                    : `${getAcquisitionPriorityLabel(
                                        lead.priority,
                                        language
                                      )} priority`}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {
                                    text.noPriority
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {
                                text.industry
                              }
                            </p>

                            <p className="mt-1 break-words text-xs">
                              {company?.industry ??
                                "—"}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {
                                text.location
                              }
                            </p>

                            <p className="mt-1 break-words text-xs">
                              {company?.location ??
                                "—"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border">
                          <div className="border-r px-3 py-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {
                                text.website
                              }
                            </p>

                            <p className="mt-1 text-base font-semibold">
                              {lead.website_score !==
                              null ? (
                                <>
                                  {
                                    lead.website_score
                                  }

                                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                                    /100
                                  </span>
                                </>
                              ) : (
                                "—"
                              )}
                            </p>
                          </div>

                          <div className="px-3 py-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {
                                text.opportunity
                              }
                            </p>

                            <p className="mt-1 text-base font-semibold">
                              {lead.opportunity_score !==
                              null ? (
                                <>
                                  {
                                    lead.opportunity_score
                                  }

                                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                                    /100
                                  </span>
                                </>
                              ) : (
                                "—"
                              )}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>

              {/* =============================================
                  DESKTOP TABLE
              ============================================= */}

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>
                        {language ===
                        "de"
                          ? "Unternehmen"
                          : "Company"}
                      </TableHead>

                      <TableHead>
                        {
                          text.industry
                        }
                      </TableHead>

                      <TableHead>
                        {
                          text.location
                        }
                      </TableHead>

                      <TableHead>
                        {
                          text.website
                        }
                      </TableHead>

                      <TableHead>
                        {
                          text.opportunity
                        }
                      </TableHead>

                      <TableHead>
                        {
                          text.status
                        }
                      </TableHead>

                      <TableHead>
                        {
                          text.priority
                        }
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {campaignLeads.map(
                      (
                        lead
                      ) => {
                        const company =
                          getSingleRelation(
                            lead.company
                          );

                        return (
                          <TableRow
                            key={
                              lead.id
                            }
                          >
                            <TableCell>
                              <Link
                                href={`/leads/${lead.id}`}
                                className="font-medium transition-colors hover:text-muted-foreground hover:underline"
                              >
                                {company?.name ??
                                  text.unknownCompany}
                              </Link>
                            </TableCell>

                            <TableCell className="text-muted-foreground">
                              {company?.industry ??
                                "—"}
                            </TableCell>

                            <TableCell className="text-muted-foreground">
                              {company?.location ??
                                "—"}
                            </TableCell>

                            <TableCell>
                              {lead.website_score !==
                              null ? (
                                <>
                                  {
                                    lead.website_score
                                  }

                                  <span className="text-muted-foreground">
                                    /100
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              {lead.opportunity_score !==
                              null ? (
                                <>
                                  {
                                    lead.opportunity_score
                                  }

                                  <span className="text-muted-foreground">
                                    /100
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`whitespace-nowrap ${leadStatusClass(
                                  lead.status
                                )}`}
                              >
                                {getAcquisitionLeadStatusLabel(
                                  lead.status,
                                  language
                                )}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-muted-foreground">
                              {lead.priority
                                ? getAcquisitionPriorityLabel(
                                    lead.priority,
                                    language
                                  )
                                : text.noPriority}
                            </TableCell>
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        {
          text.created
        }{" "}
        {formatDate(
          campaign.created_at,
          language
        )}
      </p>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon:
    React.ElementType;

  label: string;

  value: string;
}) {
  return (
    <Card className="leadbase-detail-metric leadbase-workspace-card min-w-0">
      <CardContent className="p-4 sm:p-5">
        <div className="flex size-8 items-center justify-center rounded-lg border border-primary/15 bg-primary/8">
          <Icon className="size-3.5 text-primary" />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {
            label
          }
        </p>

        <p className="mt-1 break-words text-sm font-medium">
          {
            value
          }
        </p>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function InfoCard({
  title,
  value,
  empty,
}: {
  title: string;

  value:
    | string
    | null;

  empty: string;
}) {
  return (
    <Card data-workspace-reveal className="leadbase-workspace-card min-w-0">
      <CardContent className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold">
          {
            title
          }
        </h2>

        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
          {value ??
            empty}
        </p>
      </CardContent>
    </Card>
  );
}