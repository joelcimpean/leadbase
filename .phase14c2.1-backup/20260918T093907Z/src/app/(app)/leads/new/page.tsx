import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Megaphone,
} from "lucide-react";

import { createLead } from "../actions";
import { SubmitLeadButton } from "./submit-button";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

type NewLeadPageProps = {
  searchParams: Promise<{
    error?: string;
    campaign?: string;
  }>;
};

export default async function NewLeadPage({
  searchParams,
}: NewLeadPageProps) {
  const {
    error,
    campaign: preselectedCampaignId,
  } = await searchParams;

  const supabase = await createClient();

  const { data: campaigns, error: campaignsError } =
    await supabase
      .from("campaigns")
      .select(`
        id,
        name,
        status
      `)
      .neq("status", "ARCHIVED")
      .order("name", {
        ascending: true,
      });

  if (campaignsError) {
    console.error(
      "Could not load campaigns:",
      campaignsError
    );
  }

  const campaignRows = campaigns ?? [];

  const validPreselectedCampaign =
    campaignRows.some(
      (campaign) =>
        campaign.id === preselectedCampaignId
    )
      ? preselectedCampaignId
      : "";

  const selectedCampaign =
    campaignRows.find(
      (campaign) =>
        campaign.id === validPreselectedCampaign
    ) ?? null;

  const returnHref = selectedCampaign
    ? `/campaigns/${selectedCampaign.id}`
    : "/leads";

  const returnLabel = selectedCampaign
    ? "Back to campaign"
    : "Back to leads";

  return (
    <div className="leadbase-workspace-page leadbase-route-form mx-auto min-h-full w-full max-w-[920px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
      <WorkspacePageMotion />
      <Link
        href={returnHref}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {returnLabel}
      </Link>

      <header data-workspace-reveal className="leadbase-workspace-header mt-6 p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">
          CRM
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Add lead
        </h1>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Add a company manually. Missing information can
          be researched later.
        </p>

        {selectedCampaign ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Adding to{" "}
            <span className="font-medium text-foreground">
              {selectedCampaign.name}
            </span>
          </p>
        ) : null}
      </header>

      <Card data-workspace-reveal className="leadbase-workspace-card mt-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border">
              <Building2 className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">
                Company information
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground">
                Only the company name is required.
              </p>
            </div>
          </div>

          <form
            action={createLead}
            className="mt-7 space-y-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Company name *
                </Label>

                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="e.g. Muster Gartenbau GmbH"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">
                  Website
                </Label>

                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">
                  Industry
                </Label>

                <Input
                  id="industry"
                  name="industry"
                  placeholder="e.g. Landscaping"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  Location
                </Label>

                <Input
                  id="location"
                  name="location"
                  placeholder="e.g. Balingen"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center gap-2">
                <Megaphone className="size-4 text-muted-foreground" />

                <h3 className="text-sm font-semibold">
                  Campaign
                </h3>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Optional. Assign this lead to a target
                campaign.
              </p>

              <div className="mt-5 max-w-md space-y-2">
                <Label htmlFor="campaignId">
                  Campaign
                </Label>

                <select
                  id="campaignId"
                  name="campaignId"
                  defaultValue={validPreselectedCampaign}
                  className="flex h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">
                    No campaign
                  </option>

                  {campaignRows.map((campaign) => (
                    <option
                      key={campaign.id}
                      value={campaign.id}
                    >
                      {campaign.name}
                      {campaign.status !== "ACTIVE"
                        ? ` · ${campaign.status.toLowerCase()}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold">
                Contact
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                Leave these empty if no public contact was
                found.
              </p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">
                    Contact person
                  </Label>

                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    placeholder="e.g. Max Mustermann"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Public email
                  </Label>

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="max@example.com"
                  />
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 border-t pt-6">
              <Link
                href={returnHref}
                className={buttonVariants({
                  variant: "outline",
                })}
              >
                Cancel
              </Link>

              <SubmitLeadButton />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}