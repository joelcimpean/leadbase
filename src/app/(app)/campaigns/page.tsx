import Link from "next/link";
import {
  MapPin,
  Megaphone,
  Plus,
  Target,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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

export default async function CampaignsPage() {
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
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
    console.error("Could not load campaigns:", error);
  }

  const { data: campaignLeads } = await supabase
    .from("leads")
    .select("campaign_id")
    .not("campaign_id", "is", null);

  const leadCounts = new Map<string, number>();

  for (const lead of campaignLeads ?? []) {
    if (!lead.campaign_id) {
      continue;
    }

    leadCounts.set(
      lead.campaign_id,
      (leadCounts.get(lead.campaign_id) ?? 0) + 1
    );
  }

  const campaignRows = campaigns ?? [];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-8 py-8 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            Outreach
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Campaigns
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Create target profiles for different markets,
            research criteria and outreach strategies.
          </p>
        </div>

        <Link
          href="/campaigns/new"
          className={buttonVariants({
            className: "w-fit gap-2",
          })}
        >
          <Plus className="size-4" />
          New campaign
        </Link>
      </header>

      {campaignRows.length === 0 ? (
        <div className="mt-8 flex min-h-80 items-center justify-center rounded-xl border border-dashed">
          <div className="max-w-sm text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-lg border">
              <Megaphone className="size-4" />
            </div>

            <h2 className="mt-4 text-sm font-semibold">
              No campaigns yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Create your first target profile to organize
              lead discovery and personalized outreach.
            </p>

            <Link
              href="/campaigns/new"
              className={buttonVariants({
                className: "mt-5 gap-2",
              })}
            >
              <Plus className="size-4" />
              Create campaign
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaignRows.map((campaign) => {
              const leadCount =
                leadCounts.get(campaign.id) ?? 0;

              return (
                <Card
                  key={campaign.id}
                  className="shadow-none"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
                        <Megaphone className="size-4" />
                      </div>

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

                    <Link
  href={`/campaigns/${campaign.id}`}
  className="mt-5 block text-base font-semibold transition-colors hover:text-muted-foreground hover:underline"
>
  {campaign.name}
</Link>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <Target className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Industry
                          </p>

                          <p className="mt-0.5 text-sm">
                            {campaign.target_industry ??
                              "Any industry"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Geography
                          </p>

                          <p className="mt-0.5 text-sm">
                            {campaign.target_geography ??
                              "Any location"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Leads
                          </p>

                          <p className="mt-0.5 text-sm">
                            {leadCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    {campaign.outreach_angle ? (
                      <div className="mt-5 border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                          Outreach angle
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm leading-6">
                          {campaign.outreach_angle}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                      <span>
                        Follow-up:{" "}
                        {campaign.follow_up_days} days
                      </span>

                      <span>
                        {leadCount === 1
                          ? "1 lead"
                          : `${leadCount} leads`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {campaignRows.length}{" "}
            {campaignRows.length === 1
              ? "campaign"
              : "campaigns"}
          </p>
        </>
      )}
    </div>
  );
}