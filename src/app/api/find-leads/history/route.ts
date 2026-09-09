import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

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

function safeNumber(
  value: string | null,
  fallback:
    number
) {
  const parsed =
    Number(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
}

export async function GET(
  request:
    NextRequest
) {
  const supabase =
    await createClient();

  const {
    data:
      authData,

    error:
      authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !authData.user
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Unauthorized",
      },
      {
        status:
          401,
      }
    );
  }

  const offset =
    Math.max(
      0,
      Math.floor(
        safeNumber(
          request.nextUrl.searchParams.get(
            "offset"
          ),
          0
        )
      )
    );

  const limit =
    Math.max(
      1,
      Math.min(
        50,
        Math.floor(
          safeNumber(
            request.nextUrl.searchParams.get(
              "limit"
            ),
            30
          )
        )
      )
    );

  const {
    data,
    error,
  } =
    await supabase
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
      .range(
        offset,
        offset +
          limit
      );

  if (
    error
  ) {
    console.error(
      "Could not load lead search history:",
      error
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Could not load lead search history",
      },
      {
        status:
          500,
      }
    );
  }

  const rawRows =
    data ??
    [];

  const hasMore =
    rawRows.length >
    limit;

  const visibleRows =
    hasMore
      ? rawRows.slice(
          0,
          limit
        )
      : rawRows;

  const runs =
    visibleRows.map(
      (
        search
      ) => {
        const campaign =
          relationCampaign(
            search.campaign as
              CampaignRelation
          );

        return {
          id:
            search.id,

          campaignId:
            search.campaign_id,

          campaignName:
            campaign?.name ??
            "—",

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
        };
      }
    );

  return NextResponse.json({
    ok:
      true,

    runs,

    total:
      offset +
      runs.length,

    hasMore,
  });
}
