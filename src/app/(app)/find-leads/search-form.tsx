"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
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
  IndustryAutocomplete,
} from "@/components/industry-autocomplete";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  acquisitionCopy,
  getCampaignStatusLabel,
} from "@/lib/acquisition-i18n";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   COMPONENT
========================================================= */

export function FindLeadsSearchForm({
  campaigns,
}: {
  campaigns:
    FindLeadsCampaign[];
}) {
  const {
    language,
  } =
    useLanguage();

  const text =
    acquisitionCopy[
      language
    ].findLeads;

  const activeCampaigns =
    useMemo(
      () =>
        campaigns.filter(
          (
            campaign
          ) =>
            campaign.status !==
            "ARCHIVED"
        ),
      [
        campaigns,
      ]
    );

  const firstCampaign =
    activeCampaigns.find(
      (
        campaign
      ) =>
        campaign.status ===
        "ACTIVE"
    ) ??
    activeCampaigns[0] ??
    null;

  const [
    campaignId,
    setCampaignId,
  ] =
    useState(
      firstCampaign?.id ??
        ""
    );

  const [
    industry,
    setIndustry,
  ] =
    useState(
      firstCampaign
        ?.target_industry ??
        ""
    );

  const [
    location,
    setLocation,
  ] =
    useState(
      firstCampaign
        ?.target_geography ??
        ""
    );

  const [
    resultLimit,
    setResultLimit,
  ] =
    useState(
      "20"
    );

  /* =======================================================
     CAMPAIGN FROM URL

     /find-leads?campaign=...
  ======================================================= */

  useEffect(
    () => {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const requestedCampaignId =
        params.get(
          "campaign"
        );

      if (
        !requestedCampaignId
      ) {
        return;
      }

      const requestedCampaign =
        activeCampaigns.find(
          (
            campaign
          ) =>
            campaign.id ===
            requestedCampaignId
        );

      if (
        !requestedCampaign
      ) {
        return;
      }

      setCampaignId(
        requestedCampaign.id
      );

      setIndustry(
        requestedCampaign
          .target_industry ??
          ""
      );

      setLocation(
        requestedCampaign
          .target_geography ??
          ""
      );
    },
    [
      activeCampaigns,
    ]
  );

  const selectedCampaign =
    activeCampaigns.find(
      (
        campaign
      ) =>
        campaign.id ===
        campaignId
    ) ??
    null;

  /* =======================================================
     CAMPAIGN CHANGE
  ======================================================= */

  function handleCampaignChange(
    nextCampaignId:
      string
  ) {
    setCampaignId(
      nextCampaignId
    );

    const nextCampaign =
      activeCampaigns.find(
        (
          campaign
        ) =>
          campaign.id ===
          nextCampaignId
      );

    setIndustry(
      nextCampaign
        ?.target_industry ??
        ""
    );

    setLocation(
      nextCampaign
        ?.target_geography ??
        ""
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <form
      action={
        runLeadSearch
      }
    >
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-6">
        {/* =================================================
            CAMPAIGN
        ================================================= */}

        <div className="min-w-0 space-y-2">
          <Label htmlFor="campaignId">
            {
              text.campaign
            }
          </Label>

          <div className="relative">
            <Target className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />

            <select
              id="campaignId"
              name="campaignId"
              value={
                campaignId
              }
              onChange={(
                event
              ) =>
                handleCampaignChange(
                  event.target
                    .value
                )
              }
              className="h-11 w-full min-w-0 appearance-none rounded-lg border bg-background pl-10 pr-10 text-sm outline-none transition-colors hover:bg-muted/30 focus:ring-2 focus:ring-ring sm:h-10"
              required
            >
              {activeCampaigns.length ===
              0 ? (
                <option value="">
                  {
                    text.noCampaignsAvailable
                  }
                </option>
              ) : null}

              {activeCampaigns.map(
                (
                  campaign
                ) => (
                  <option
                    key={
                      campaign.id
                    }
                    value={
                      campaign.id
                    }
                  >
                    {campaign.name} ·{" "}
                    {getCampaignStatusLabel(
                      campaign.status,
                      language
                    )}
                  </option>
                )
              )}
            </select>

            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            >
              <path
                d="m6 8 4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {selectedCampaign ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {
                text.newLeadsSaved
              }
            </p>
          ) : null}
        </div>

        {/* =================================================
            RESULTS
        ================================================= */}

        <div className="min-w-0 space-y-2">
          <Label htmlFor="resultLimit">
            {
              text.resultLimit
            }
          </Label>

          <select
            id="resultLimit"
            name="resultLimit"
            value={
              resultLimit
            }
            onChange={(
              event
            ) =>
              setResultLimit(
                event.target.value
              )
            }
            className="h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/30 focus:ring-2 focus:ring-ring sm:h-10"
          >
            <option value="10">
              10{" "}
              {
                text.companies
              }
            </option>

            <option value="20">
              20{" "}
              {
                text.companies
              }
            </option>

            <option value="40">
              40{" "}
              {
                text.companies
              }
            </option>

            <option value="60">
              60{" "}
              {
                text.companies
              }
            </option>
          </select>
        </div>

        {/* =================================================
            INDUSTRY
        ================================================= */}

        <div className="min-w-0 space-y-2">
          <Label htmlFor="industry">
            {
              text.industry
            }
          </Label>

          <IndustryAutocomplete
            id="industry"
            name="industry"
            value={
              industry
            }
            onValueChange={
              setIndustry
            }
            placeholder={
              text.industryPlaceholder
            }
            required
          />

          <p className="text-xs leading-5 text-muted-foreground">
            {
              text.industryHint
            }
          </p>
        </div>

        {/* =================================================
            LOCATION
        ================================================= */}

        <div className="min-w-0 space-y-2">
          <Label htmlFor="location">
            {
              text.location
            }
          </Label>

          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              id="location"
              name="location"
              value={
                location
              }
              onChange={(
                event
              ) =>
                setLocation(
                  event.target
                    .value
                )
              }
              placeholder={
                text.locationPlaceholder
              }
              className="h-11 pl-9 sm:h-10"
              required
            />
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            {
              text.locationHint
            }
          </p>
        </div>
      </div>

      {/* ===================================================
          QUERY PREVIEW
      =================================================== */}

      <div className="mt-5 min-w-0 rounded-xl border bg-muted/20 px-4 py-4 sm:mt-6">
        <p className="text-xs font-medium text-muted-foreground">
          {
            text.searchQuery
          }
        </p>

        <p className="mt-1.5 break-words text-sm font-medium">
          {industry.trim() &&
          location.trim()
            ? `${industry.trim()} in ${location.trim()}`
            : text.incompleteQuery}
        </p>

        {selectedCampaign ? (
          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
            {
              text.savedToCampaign
            }{" "}
            <span className="font-medium text-foreground">
              {
                selectedCampaign.name
              }
            </span>
            .
          </p>
        ) : null}
      </div>

      {/* ===================================================
          ACTION
      =================================================== */}

      <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="order-2 text-center text-xs text-muted-foreground sm:order-1 sm:text-left">
          {
            text.poweredBy
          }
        </p>

        <div className="order-1 w-full sm:order-2 sm:w-auto">
          <SearchButton
            disabled={
              !campaignId ||
              !industry.trim() ||
              !location.trim()
            }
          />
        </div>
      </div>
    </form>
  );
}

/* =========================================================
   SEARCH BUTTON
========================================================= */

function SearchButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const {
    language,
  } =
    useLanguage();

  const text =
    acquisitionCopy[
      language
    ].findLeads;

  const {
    pending,
  } =
    useFormStatus();

  return (
    <Button
      type="submit"
      disabled={
        disabled ||
        pending
      }
      className="h-11 w-full gap-2 px-4 sm:h-10 sm:min-w-[120px] sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />

          {
            text.searching
          }
        </>
      ) : (
        <>
          <Search className="size-4" />

          {
            text.findLeads
          }
        </>
      )}
    </Button>
  );
}