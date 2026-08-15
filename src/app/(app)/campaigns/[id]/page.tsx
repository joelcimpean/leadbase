import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Mail,
  MapPin,
  Plus,
  Target,
  Users,
} from "lucide-react";

import { CampaignActions } from "./campaign-actions";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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

import { createClient } from "@/lib/supabase/server";

type CampaignDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function statusClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PAUSED":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "ARCHIVED":
      return "border-zinc-200 bg-zinc-100 text-zinc-600";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function leadStatusClass(
  status: string
) {
  switch (status) {
    case "NEW":
      return "border-sky-200 bg-sky-50 text-sky-700";

    case "RESEARCHING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "QUALIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

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

    case "DO_NOT_CONTACT":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-600";
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "de-DE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(new Date(date));
}

function getSingleRelation<T>(
  value: T | T[] | null
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: campaign,
    error: campaignError,
  } = await supabase
    .from("campaigns")
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
    .eq("id", id)
    .single();

  if (
    campaignError ||
    !campaign
  ) {
    notFound();
  }

  const {
    data: leads,
    error: leadsError,
  } = await supabase
    .from("leads")
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
        ascending: false,
      }
    );

  if (leadsError) {
    console.error(
      "Could not load campaign leads:",
      leadsError
    );
  }

  const campaignLeads =
    leads ?? [];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-8 py-8 lg:px-10 lg:py-10">
      {/* BACK */}

      <Link
        href="/campaigns"
        className="
          inline-flex
          items-center
          gap-2
          text-sm
          text-muted-foreground
          transition-colors
          hover:text-foreground
        "
      >
        <ArrowLeft className="size-4" />

        Back to campaigns
      </Link>

      {/* HEADER */}

      <header className="mt-6 flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {campaign.name}
            </h1>

            <Badge
              variant="outline"
              className={`font-medium ${statusClass(
                campaign.status
              )}`}
            >
              {statusLabel(
                campaign.status
              )}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {campaign.target_industry ? (
              <span className="flex items-center gap-1.5">
                <Target className="size-4" />

                {
                  campaign.target_industry
                }
              </span>
            ) : null}

            {campaign.target_geography ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />

                {
                  campaign.target_geography
                }
              </span>
            ) : null}
          </div>
        </div>

        <CampaignActions
          campaignId={campaign.id}
          campaignName={campaign.name}
          initialStatus={
            campaign.status
          }
          leadCount={
            campaignLeads.length
          }
        />
      </header>

      {/* STATS */}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Leads"
          value={String(
            campaignLeads.length
          )}
        />

        <StatCard
          icon={Building2}
          label="Company size"
          value={
            campaign.company_size_preference ??
            "Any"
          }
        />

        <StatCard
          icon={Mail}
          label="Target roles"
          value={
            campaign.target_roles ??
            "Any"
          }
        />

        <StatCard
          icon={CalendarClock}
          label="Follow-up"
          value={`${campaign.follow_up_days} days`}
        />
      </div>

      {/* STRATEGY */}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <InfoCard
          title="Research criteria"
          value={
            campaign.research_criteria
          }
          empty="No research criteria defined."
        />

        <InfoCard
          title="Website criteria"
          value={
            campaign.website_criteria
          }
          empty="No website criteria defined."
        />

        <InfoCard
          title="Outreach angle"
          value={
            campaign.outreach_angle
          }
          empty="No outreach angle defined."
        />

        <InfoCard
          title="Email tone"
          value={
            campaign.email_tone
          }
          empty="No email tone defined."
        />
      </div>

      {/* CAMPAIGN LEADS */}

      <Card className="mt-6 shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2 className="text-sm font-semibold">
                Campaign leads
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Companies currently
                assigned to this campaign.
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {campaignLeads.length}{" "}
              {campaignLeads.length ===
              1
                ? "lead"
                : "leads"}
            </span>
          </div>

          {campaignLeads.length ===
          0 ? (
            <div className="flex min-h-48 items-center justify-center px-6 py-10">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex size-9 items-center justify-center rounded-lg border">
                  <Users className="size-4" />
                </div>

                <p className="mt-4 text-sm font-medium">
                  No leads in this
                  campaign yet
                </p>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Leads discovered or
                  assigned to this
                  campaign will appear
                  here.
                </p>

                <Link
                  href={`/leads/new?campaign=${campaign.id}`}
                  className={buttonVariants({
                    variant:
                      "outline",

                    className:
                      "mt-4 gap-2",
                  })}
                >
                  <Plus className="size-4" />

                  Add first lead
                </Link>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    Company
                  </TableHead>

                  <TableHead>
                    Industry
                  </TableHead>

                  <TableHead>
                    Location
                  </TableHead>

                  <TableHead>
                    Website
                  </TableHead>

                  <TableHead>
                    Opportunity
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                  <TableHead>
                    Priority
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {campaignLeads.map(
                  (lead) => {
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
                            className="
                              font-medium
                              transition-colors
                              hover:text-muted-foreground
                              hover:underline
                            "
                          >
                            {company?.name ??
                              "Unknown company"}
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
                            {statusLabel(
                              lead.status
                            )}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {lead.priority
                            ? statusLabel(
                                lead.priority
                              )
                            : "No priority"}
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Created{" "}
        {formatDate(
          campaign.created_at
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
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <div className="flex size-8 items-center justify-center rounded-lg border">
          <Icon className="size-3.5 text-muted-foreground" />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {label}
        </p>

        <p className="mt-1 text-sm font-medium">
          {value}
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
  value: string | null;
  empty: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold">
          {title}
        </h2>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {value ?? empty}
        </p>
      </CardContent>
    </Card>
  );
}