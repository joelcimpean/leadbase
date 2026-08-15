"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Building2,
  Loader2,
  MapPin,
  Search,
  Target,
} from "lucide-react";

import {
  useFormStatus,
} from "react-dom";

import {
  runLeadSearch,
} from "./actions";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

export type FindLeadsCampaign = {
  id: string;
  name: string;

  target_industry:
    | string
    | null;

  target_geography:
    | string
    | null;

  status: string;
};

export function FindLeadsSearchForm({
  campaigns,
}: {
  campaigns: FindLeadsCampaign[];
}) {
  const activeCampaigns =
    useMemo(
      () =>
        campaigns.filter(
          (campaign) =>
            campaign.status !==
            "ARCHIVED"
        ),
      [campaigns]
    );

  const firstCampaign =
    activeCampaigns.find(
      (campaign) =>
        campaign.status ===
        "ACTIVE"
    ) ??
    activeCampaigns[0] ??
    null;

  const [
    campaignId,
    setCampaignId,
  ] = useState(
    firstCampaign?.id ?? ""
  );

  const selectedCampaign =
    activeCampaigns.find(
      (campaign) =>
        campaign.id ===
        campaignId
    ) ?? null;

  const [
    industry,
    setIndustry,
  ] = useState(
    firstCampaign
      ?.target_industry ?? ""
  );

  const [
    location,
    setLocation,
  ] = useState(
    firstCampaign
      ?.target_geography ?? ""
  );

  const [
    resultLimit,
    setResultLimit,
  ] = useState("20");

  function handleCampaignChange(
    nextCampaignId: string
  ) {
    setCampaignId(
      nextCampaignId
    );

    const campaign =
      activeCampaigns.find(
        (item) =>
          item.id ===
          nextCampaignId
      ) ?? null;

    if (!campaign) {
      return;
    }

    setIndustry(
      campaign.target_industry ??
        ""
    );

    setLocation(
      campaign.target_geography ??
        ""
    );
  }

  return (
    <form
      action={runLeadSearch}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* CAMPAIGN */}

        <div className="space-y-2">
          <Label htmlFor="campaignId">
            Campaign
          </Label>

          <div className="relative">
            <Target className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <select
              id="campaignId"
              name="campaignId"
              value={campaignId}
              onChange={(event) =>
                handleCampaignChange(
                  event.target.value
                )
              }
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition-colors hover:bg-muted/30 focus:ring-2 focus:ring-ring"
            >
              {activeCampaigns.length ===
              0 ? (
                <option value="">
                  No campaigns
                  available
                </option>
              ) : (
                activeCampaigns.map(
                  (campaign) => (
                    <option
                      key={
                        campaign.id
                      }
                      value={
                        campaign.id
                      }
                    >
                      {
                        campaign.name
                      }

                      {campaign.status !==
                      "ACTIVE"
                        ? ` · ${campaign.status.toLowerCase()}`
                        : ""}
                    </option>
                  )
                )
              )}
            </select>
          </div>
        </div>

        {/* RESULTS */}

        <div className="space-y-2">
          <Label htmlFor="resultLimit">
            Results
          </Label>

          <select
            id="resultLimit"
            name="resultLimit"
            value={resultLimit}
            onChange={(event) =>
              setResultLimit(
                event.target.value
              )
            }
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/30 focus:ring-2 focus:ring-ring"
          >
            <option value="10">
              10 companies
            </option>

            <option value="20">
              20 companies
            </option>

            <option value="40">
              40 companies
            </option>

            <option value="60">
              60 companies
            </option>
          </select>
        </div>

        {/* INDUSTRY */}

        <div className="space-y-2">
          <Label htmlFor="industry">
            Industry
          </Label>

          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="industry"
              name="industry"
              value={industry}
              onChange={(event) =>
                setIndustry(
                  event.target.value
                )
              }
              placeholder="e.g. Garten- und Landschaftsbau"
              className="h-10 pl-9"
              required
            />
          </div>
        </div>

        {/* LOCATION */}

        <div className="space-y-2">
          <Label htmlFor="location">
            Location
          </Label>

          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="location"
              name="location"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
              placeholder="e.g. Baden-Württemberg"
              className="h-10 pl-9"
              required
            />
          </div>
        </div>
      </div>

      {/* QUERY PREVIEW */}

      <div className="mt-6 rounded-xl border bg-muted/20 px-4 py-4">
        <p className="text-xs font-medium text-muted-foreground">
          Search query
        </p>

        <p className="mt-1.5 text-sm font-medium">
          {industry.trim() &&
          location.trim()
            ? `${industry.trim()} in ${location.trim()}`
            : "Complete industry and location to build a search query."}
        </p>

        {selectedCampaign ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Results will be
            assigned to{" "}
            <span className="font-medium text-foreground">
              {
                selectedCampaign.name
              }
            </span>
            .
          </p>
        ) : null}
      </div>

      {/* ACTION */}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Search powered by Google
          Places.
        </p>

        <SearchButton
          disabled={
            !campaignId ||
            !industry.trim() ||
            !location.trim()
          }
        />
      </div>
    </form>
  );
}

function SearchButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const {
    pending,
  } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={
        disabled ||
        pending
      }
      className="h-10 min-w-[120px] gap-2 px-4"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />

          Searching...
        </>
      ) : (
        <>
          <Search className="size-4" />

          Find leads
        </>
      )}
    </Button>
  );
}