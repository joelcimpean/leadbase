import {
  FindLeadsWorkspace,
  type FindLeadsCampaign,
  type FindLeadsCandidate,
  type FindLeadsRun,
} from "./find-leads-workspace";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type FindLeadsPageProps = {
  searchParams: Promise<{
    search?: string;

    error?: string;

    review?: string;
  }>;
};

type CampaignRelation =
  | {
      id?: string;
      name?: string;
    }
  | {
      id?: string;
      name?: string;
    }[]
  | null;

/* =========================================================
   HELPERS
========================================================= */

function relationCampaign(
  value: CampaignRelation
) {
  if (
    Array.isArray(
      value
    )
  ) {
    return value[0] ??
      null;
  }

  return value ??
    null;
}

function formatRunDate(
  value: string,
  language:
    "de" | "en"
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    language === "de"
      ? "de-DE"
      : "en-GB",
    {
      day:
        "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

/* =========================================================
   PAGE
========================================================= */

export default async function FindLeadsPage({
  searchParams,
}: FindLeadsPageProps) {
  const params =
    await searchParams;

  const language =
    await getAppLanguage();

  const supabase =
    await createClient();

  /* =======================================================
     CAMPAIGNS + SEARCH RUNS + GLOBAL REVIEW COUNT
  ======================================================= */

  const [
    campaignsResult,
    searchesResult,
    pendingResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "campaigns"
        )
        .select(`
          id,
          name,
          target_industry,
          target_geography,
          status
        `)
        .neq(
          "status",
          "ARCHIVED"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "lead_searches"
        )
        .select(`
          id,
          campaign_id,
          query,
          industry,
          location,
          result_limit,
          result_count,
          status,
          error_message,
          created_at,

          campaign:campaigns (
            id,
            name
          )
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          9
        ),

      supabase
        .from(
          "lead_candidates"
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "status",
          "DISCOVERED"
        ),
    ]);

  if (
    campaignsResult.error
  ) {
    console.error(
      "Could not load campaigns:",
      campaignsResult.error
    );
  }

  if (
    searchesResult.error
  ) {
    console.error(
      "Could not load lead searches:",
      searchesResult.error
    );
  }

  if (
    pendingResult.error
  ) {
    console.error(
      "Could not load pending lead candidate count:",
      pendingResult.error
    );
  }

  const rawCampaigns =
    campaignsResult.data ??
    [];

  const rawSearches =
    searchesResult.data ??
    [];

  /* =======================================================
     CAMPAIGN LEAD COUNTS
  ======================================================= */

  const campaignLeadCounts =
    new Map<
      string,
      number
    >();

  const {
    data:
      campaignLeadRows,

    error:
      campaignLeadsError,
  } =
    await supabase
      .from(
        "leads"
      )
      .select(
        "campaign_id"
      )
      .not(
        "campaign_id",
        "is",
        null
      );

  if (
    campaignLeadsError
  ) {
    console.error(
      "Could not load campaign lead counts:",
      campaignLeadsError
    );
  }

  for (
    const lead of
      campaignLeadRows ??
      []
  ) {
    const id =
      typeof lead.campaign_id ===
        "string"
        ? lead.campaign_id
        : null;

    if (
      !id
    ) {
      continue;
    }

    campaignLeadCounts.set(
      id,
      (
        campaignLeadCounts.get(
          id
        ) ??
        0
      ) + 1
    );
  }

  const campaigns:
    FindLeadsCampaign[] =
    rawCampaigns.map(
      (
        campaign
      ) => ({
        id:
          campaign.id,

        name:
          campaign.name,

        targetIndustry:
          campaign.target_industry,

        targetGeography:
          campaign.target_geography,

        status:
          campaign.status,

        leadCount:
          campaignLeadCounts.get(
            campaign.id
          ) ??
          0,
      })
    );

  /* =======================================================
     SEARCH COUNTS BY STATUS
  ======================================================= */

  const searchIds =
    rawSearches
      .map(
        (
          search
        ) =>
          search.id
      )
      .filter(
        (
          value
        ): value is string =>
          typeof value ===
            "string" &&
          value.length >
            0
      );

  const candidateStatusBySearch =
    new Map<
      string,
      {
        discovered:
          number;

        saved:
          number;

        rejected:
          number;
      }
    >();

  if (
    searchIds.length >
    0
  ) {
    const {
      data:
        candidateStatusRows,

      error:
        candidateStatusError,
    } =
      await supabase
        .from(
          "lead_candidates"
        )
        .select(
          "search_id,status"
        )
        .in(
          "search_id",
          searchIds
        );

    if (
      candidateStatusError
    ) {
      console.error(
        "Could not load candidate status counts:",
        candidateStatusError
      );
    }

    for (
      const row of
        candidateStatusRows ??
        []
    ) {
      const searchId =
        typeof row.search_id ===
          "string"
          ? row.search_id
          : null;

      if (
        !searchId
      ) {
        continue;
      }

      const current =
        candidateStatusBySearch.get(
          searchId
        ) ?? {
          discovered:
            0,

          saved:
            0,

          rejected:
            0,
        };

      if (
        row.status ===
        "DISCOVERED"
      ) {
        current.discovered +=
          1;
      } else if (
        row.status ===
        "SAVED"
      ) {
        current.saved +=
          1;
      } else if (
        row.status ===
        "REJECTED"
      ) {
        current.rejected +=
          1;
      }

      candidateStatusBySearch.set(
        searchId,
        current
      );
    }
  }

  const runs:
    FindLeadsRun[] =
    rawSearches.map(
      (
        search
      ) => {
        const campaign =
          relationCampaign(
            search.campaign as
              CampaignRelation
          );

        const statusCounts =
          candidateStatusBySearch.get(
            search.id
          ) ?? {
            discovered:
              0,

            saved:
              0,

            rejected:
              0,
          };

        return {
          id:
            search.id,

          campaignId:
            search.campaign_id,

          campaignName:
            campaign?.name ??
            (
              language ===
                "de"
                ? "Keine Kampagne"
                : "No campaign"
            ),

          query:
            search.query ??
            "",

          industry:
            search.industry ??
            "",

          location:
            search.location ??
            "",

          limit:
            Math.max(
              1,
              search.result_limit ??
                20
            ),

          results:
            Math.max(
              0,
              search.result_count ??
                0
            ),

          status:
            search.status,

          errorMessage:
            search.error_message,

          createdAt:
            search.created_at,

          when:
            formatRunDate(
              search.created_at,
              language
            ),

          discoveredCount:
            statusCounts.discovered,

          savedCount:
            statusCounts.saved,

          rejectedCount:
            statusCounts.rejected,
        };
      }
    );

  /* =======================================================
     ACTIVE / REVIEW SEARCH
  ======================================================= */

  const activeSearchId =
    params.search ??
    runs.find(
      (
        run
      ) =>
        run.status ===
        "COMPLETED"
    )?.id ??
    runs[0]?.id ??
    null;

  const activeRun =
    runs.find(
      (
        run
      ) =>
        run.id ===
        activeSearchId
    ) ??
    null;

  let candidates:
    FindLeadsCandidate[] =
    [];

  if (
    activeSearchId
  ) {
    const {
      data:
        candidateRows,

      error:
        candidateError,
    } =
      await supabase
        .from(
          "lead_candidates"
        )
        .select(`
          id,
          name,
          website_url,
          phone,
          formatted_address,
          maps_url,
          rating,
          review_count,
          primary_type,
          status
        `)
        .eq(
          "search_id",
          activeSearchId
        )
        .eq(
          "status",
          "DISCOVERED"
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        );

    if (
      candidateError
    ) {
      console.error(
        "Could not load review candidates:",
        candidateError
      );
    }

    candidates =
      (
        candidateRows ??
        []
      ).map(
        (
          candidate
        ) => ({
          id:
            candidate.id,

          name:
            candidate.name,

          websiteUrl:
            candidate.website_url,

          phone:
            candidate.phone,

          address:
            candidate.formatted_address,

          mapsUrl:
            candidate.maps_url,

          rating:
            candidate.rating,

          reviewCount:
            candidate.review_count,

          primaryType:
            candidate.primary_type,
        })
      );
  }

  return (
    <FindLeadsWorkspace
      language={
        language
      }
      campaigns={
        campaigns
      }
      runs={
        runs
      }
      totalPendingCount={
        pendingResult.count ??
        0
      }
      activeRunId={
        activeRun?.id ??
        null
      }
      candidates={
        candidates
      }
      initialReviewOpen={
        params.review ===
        "1"
      }
      pageError={
        params.error ??
        null
      }
    />
  );
}
