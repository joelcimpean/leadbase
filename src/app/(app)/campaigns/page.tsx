import Link from "next/link";

import {
  ArrowRight,
  Lightbulb,
  MapPin,
  Megaphone,
  Plus,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

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
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

import {
  acquisitionCopy,
  getCampaignIdeaCategoryLabel,
  getCampaignIdeaDescription,
  getCampaignIdeaFitLabel,
  getCampaignStatusLabel,
  localizeCampaignStrategyText,
} from "@/lib/acquisition-i18n";

import {
  CAMPAIGN_IDEAS,
} from "@/lib/campaign-ideas";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

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

/* =========================================================
   PAGE
========================================================= */

export default async function CampaignsPage() {
  const language =
    await getAppLanguage();

  const text =
    acquisitionCopy[
      language
    ].campaigns;

  const supabase =
    await createClient();

  /* =======================================================
     CAMPAIGNS
  ======================================================= */

  const {
    data: campaigns,
    error,
  } = await supabase
    .from("campaigns")
    .select(`
      id,
      name,
      target_industry,
      target_geography,
      company_size_preference,
      target_roles,
      outreach_angle,
      follow_up_days,
      status,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Could not load campaigns:",
      error
    );
  }

  /* =======================================================
     LEAD COUNTS
  ======================================================= */

  const {
    data: campaignLeads,
  } = await supabase
    .from("leads")
    .select("campaign_id")
    .not(
      "campaign_id",
      "is",
      null
    );

  const leadCounts =
    new Map<string, number>();

  for (
    const lead of
    campaignLeads ?? []
  ) {
    if (
      !lead.campaign_id
    ) {
      continue;
    }

    leadCounts.set(
      lead.campaign_id,
      (
        leadCounts.get(
          lead.campaign_id
        ) ?? 0
      ) + 1
    );
  }

  const campaignRows =
    campaigns ?? [];

  /* =======================================================
     CAMPAIGN IDEAS
  ======================================================= */

  const existingIndustries =
    new Set(
      campaignRows
        .map(
          (campaign) =>
            campaign.target_industry
              ?.toLowerCase()
              .trim()
        )
        .filter(
          (
            industry
          ): industry is string =>
            Boolean(
              industry
            )
        )
    );

  const recommendedIdeas =
    CAMPAIGN_IDEAS.filter(
      (idea) =>
        !existingIndustries.has(
          idea.industry
            .toLowerCase()
            .trim()
        )
    ).slice(0, 6);

  return (
    <div className="leadbase-workspace-page min-h-full"><WorkspacePageMotion /><div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header data-workspace-reveal className="leadbase-workspace-header flex flex-col justify-between gap-5 p-5 sm:p-6 lg:flex-row lg:items-end">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {
              text.eyebrow
            }
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {
              text.title
            }
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {
              text.description
            }
          </p>
        </div>

        <Link
          href="/campaigns/new"
          className={buttonVariants({
            className:
              "w-full gap-2 sm:w-fit",
          })}
        >
          <Plus className="size-4" />

          {
            text.newCampaign
          }
        </Link>
      </header>

      {/* ===================================================
          CAMPAIGN IDEAS
      =================================================== */}

      {recommendedIdeas.length >
      0 ? (
        <section data-workspace-reveal className="mt-7 md:mt-8">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 shrink-0" />

                <h2 className="text-sm font-semibold">
                  {
                    text.ideasTitle
                  }
                </h2>
              </div>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                {
                  text.ideasDescription
                }
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recommendedIdeas.map(
              (idea) => (
                <Card
                  key={
                    idea.id
                  }
                  className="leadbase-workspace-card group min-w-0 transition-colors" data-lift="true"
                >
                  <CardContent className="flex h-full flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
                        <Lightbulb className="size-4" />
                      </div>

                      <Badge
                        variant="outline"
                        className="shrink-0 font-normal"
                      >
                        {getCampaignIdeaFitLabel(
                          idea.fit,
                          language
                        )}
                      </Badge>
                    </div>

                    <div className="mt-4 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {getCampaignIdeaCategoryLabel(
                          idea.category,
                          language
                        )}
                      </p>

                      <h3 className="mt-1 break-words text-sm font-semibold">
                        {
                          idea.name
                        }
                      </h3>

                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {getCampaignIdeaDescription(
                          idea.name,
                          idea.description,
                          language
                        )}
                      </p>
                    </div>

                    <div className="mt-auto pt-5">
                      <Link
                        href={`/campaigns/new?idea=${idea.id}`}
                        className="flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        <span>
                          {
                            text.useIdea
                          }
                        </span>

                        <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </section>
      ) : null}

      {/* ===================================================
          YOUR CAMPAIGNS
      =================================================== */}

      <section data-workspace-reveal className="mt-8 md:mt-10">
        <div>
          <h2 className="text-sm font-semibold">
            {
              text.yourCampaigns
            }
          </h2>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {
              text.yourCampaignsDescription
            }
          </p>
        </div>

        {campaignRows.length ===
        0 ? (
          <div className="leadbase-workspace-empty mt-4 flex min-h-64 items-center justify-center rounded-3xl border border-dashed px-4 py-10 sm:min-h-72">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg border">
                <Megaphone className="size-4" />
              </div>

              <h3 className="mt-4 text-sm font-semibold">
                {
                  text.noCampaigns
                }
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {
                  text.noCampaignsDescription
                }
              </p>

              <Link
                href="/campaigns/new"
                className={buttonVariants({
                  className:
                    "mt-5 w-full gap-2 sm:w-auto",
                })}
              >
                <Plus className="size-4" />

                {
                  text.createCampaign
                }
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {campaignRows.map(
                (campaign) => {
                  const leadCount =
                    leadCounts.get(
                      campaign.id
                    ) ?? 0;

                  return (
                    <Card
                      key={
                        campaign.id
                      }
                      className="leadbase-workspace-card min-w-0"
                    >
                      <CardContent className="p-4 sm:p-5 xl:p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
                            <Megaphone className="size-4" />
                          </div>

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

                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="mt-4 block break-words text-base font-semibold transition-colors hover:text-muted-foreground hover:underline sm:mt-5"
                        >
                          {
                            campaign.name
                          }
                        </Link>

                        <div className="mt-5 space-y-3.5">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <Target className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">
                                {
                                  text.industry
                                }
                              </p>

                              <p className="mt-0.5 break-words text-sm">
                                {campaign.target_industry ??
                                  text.anyIndustry}
                              </p>
                            </div>
                          </div>

                          <div className="flex min-w-0 items-start gap-2.5">
                            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">
                                {
                                  text.geography
                                }
                              </p>

                              <p className="mt-0.5 break-words text-sm">
                                {campaign.target_geography ??
                                  text.anyLocation}
                              </p>
                            </div>
                          </div>

                          <div className="flex min-w-0 items-start gap-2.5">
                            <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">
                                {
                                  text.leads
                                }
                              </p>

                              <p className="mt-0.5 text-sm">
                                {
                                  leadCount
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        {campaign.outreach_angle ? (
                          <div className="mt-5 border-t pt-4">
                            <p className="text-xs text-muted-foreground">
                              {
                                text.outreachAngle
                              }
                            </p>

                            <p className="mt-1 line-clamp-3 break-words text-sm leading-6 sm:line-clamp-2">
                              {localizeCampaignStrategyText(
                                campaign.outreach_angle,
                                language
                              )}
                            </p>
                          </div>
                        ) : null}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
                          <span>
                            {
                              text.followUp
                            }
                            :{" "}
                            {
                              campaign.follow_up_days
                            }{" "}
                            {
                              text.days
                            }
                          </span>

                          <span>
                            {
                              leadCount
                            }{" "}
                            {leadCount ===
                            1
                              ? language ===
                                "de"
                                ? "Lead"
                                : "lead"
                              : language ===
                                  "de"
                                ? "Leads"
                                : "leads"}
                          </span>
                        </div>

                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="mt-4 flex min-h-10 items-center justify-between rounded-lg border px-3 text-xs font-medium transition-colors hover:bg-muted sm:hidden"
                        >
                          {
                            text.openCampaign
                          }

                          <ArrowRight className="size-3.5" />
                        </Link>
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              {
                campaignRows.length
              }{" "}
              {campaignRows.length ===
              1
                ? text.campaign
                : text.campaigns}
            </p>
          </>
        )}
      </section>
    </div></div>
  );
}