import {
  NextResponse,
} from "next/server";

import {
  analyzeWebsite,
  type WebsiteFinding,
} from "@/lib/website-analysis";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  assertPlanFeatureAvailable,
  isPlanAccessError,
  planAccessMessage,
} from "@/lib/plan-access";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
};

type GoogleTextSearchResponse = {
  places?: GooglePlace[];
  error?: {
    message?: string;
  };
};

type MetricKey =
  | "mobile"
  | "cta"
  | "services"
  | "projects"
  | "testimonials"
  | "trust";

type Metrics =
  Record<
    MetricKey,
    boolean | null
  >;

type CompetitorResult = {
  placeId: string | null;
  name: string;
  address: string | null;
  websiteUrl: string;
  mapsUrl: string | null;
  rating: number | null;
  userRatingCount: number | null;
  websiteScore: number | null;
  metrics: Metrics;
  analysisError: string | null;
};

type SavedSnapshot = {
  version: 1;
  query: string;
  target: {
    name: string;
    websiteUrl: string | null;
    websiteScore: number | null;
    metrics: Metrics;
  };
  competitors: CompetitorResult[];
  market: {
    position:
      | "ABOVE"
      | "AVERAGE"
      | "BELOW"
      | "UNKNOWN";
    competitorMedianScore: number | null;
    scoreDifference: number | null;
    strengths: string[];
    opportunities: string[];
  };
  note: string;
};

function jsonError(
  error: string,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error,
    },
    {
      status,
    }
  );
}

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function emptyMetrics(): Metrics {
  return {
    mobile: null,
    cta: null,
    services: null,
    projects: null,
    testimonials: null,
    trust: null,
  };
}

function metricsFromFindings(
  value: unknown
): Metrics {
  if (
    !Array.isArray(
      value
    )
  ) {
    return emptyMetrics();
  }

  const byKey =
    new Map<
      string,
      boolean
    >();

  for (
    const item of value
  ) {
    if (
      !isRecord(item) ||
      typeof item.key !== "string" ||
      typeof item.passed !== "boolean"
    ) {
      continue;
    }

    byKey.set(
      item.key,
      item.passed
    );
  }

  return {
    mobile: byKey.get("viewport") ?? null,
    cta: byKey.get("cta") ?? null,
    services: byKey.get("services") ?? null,
    projects: byKey.get("projects") ?? null,
    testimonials: byKey.get("testimonials") ?? null,
    trust: byKey.get("trust") ?? null,
  };
}

function metricsFromTypedFindings(
  findings: WebsiteFinding[]
) {
  return metricsFromFindings(
    findings
  );
}

function normalizeUrl(
  value: string
) {
  const clean =
    value.trim();

  if (
    !clean
  ) {
    return null;
  }

  try {
    const url =
      new URL(
        clean.startsWith("http://") ||
        clean.startsWith("https://")
          ? clean
          : `https://${clean}`
      );

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function hostname(
  value: string | null
) {
  if (
    !value
  ) {
    return null;
  }

  try {
    return new URL(value)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeName(
  value: string
) {
  return value
    .toLowerCase()
    .replace(/\b(gmbh|ug|ag|kg|gbr|e\.k\.|e\.k|mbh)\b/g, "")
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function median(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return null;
  }

  const sorted =
    [...values].sort(
      (a, b) => a - b
    );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length % 2 === 1
  ) {
    return sorted[middle];
  }

  return (
    sorted[middle - 1] +
    sorted[middle]
  ) / 2;
}

function isSavedSnapshot(
  value: unknown
): value is SavedSnapshot {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.query === "string" &&
    isRecord(value.target) &&
    Array.isArray(value.competitors) &&
    isRecord(value.market) &&
    typeof value.note === "string"
  );
}

async function searchPlaces({
  query,
  apiKey,
}: {
  query: string;
  apiKey: string;
}) {
  const response =
    await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type":
            "application/json",
          "X-Goog-Api-Key":
            apiKey,
          "X-Goog-FieldMask":
            [
              "places.id",
              "places.displayName",
              "places.formattedAddress",
              "places.websiteUri",
              "places.googleMapsUri",
              "places.rating",
              "places.userRatingCount",
            ].join(","),
        },
        body: JSON.stringify({
          textQuery: query,
          pageSize: 14,
        }),
      }
    );

  const data =
    (await response.json()) as GoogleTextSearchResponse;

  if (
    !response.ok
  ) {
    throw new Error(
      data.error?.message ??
      `Google Places returned ${response.status}.`
    );
  }

  return data.places ?? [];
}

function buildMarketSummary({
  targetMetrics,
  competitors,
  language,
}: {
  targetMetrics: Metrics;
  competitors: CompetitorResult[];
  language: "de" | "en";
}) {
  const keys:
    MetricKey[] = [
      "mobile",
      "cta",
      "services",
      "projects",
      "testimonials",
      "trust",
    ];

  const labels: Record<
    MetricKey,
    {
      de: string;
      en: string;
    }
  > = {
    mobile: {
      de: "Mobile Basis",
      en: "Mobile basics",
    },
    cta: {
      de: "klare CTA",
      en: "clear CTA",
    },
    services: {
      de: "Leistungsdarstellung",
      en: "service presentation",
    },
    projects: {
      de: "Referenzen / Projekte",
      en: "projects / references",
    },
    testimonials: {
      de: "Testimonials / Bewertungen",
      en: "testimonials / reviews",
    },
    trust: {
      de: "Trust-Signale",
      en: "trust signals",
    },
  };

  const strengths:
    string[] = [];

  const opportunities:
    string[] = [];

  for (
    const key of keys
  ) {
    const known =
      competitors
        .map(
          (competitor) =>
            competitor.metrics[key]
        )
        .filter(
          (
            value
          ): value is boolean =>
            typeof value === "boolean"
        );

    if (
      known.length === 0 ||
      targetMetrics[key] === null
    ) {
      continue;
    }

    const competitorPositive =
      known.filter(Boolean).length;

    if (
      targetMetrics[key] === true &&
      competitorPositive <=
        Math.floor(
          known.length / 2
        )
    ) {
      strengths.push(
        labels[key][language]
      );
    }

    if (
      targetMetrics[key] === false &&
      competitorPositive >=
        Math.ceil(
          known.length / 2
        )
    ) {
      opportunities.push(
        labels[key][language]
      );
    }
  }

  return {
    strengths,
    opportunities,
  };
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const {
      id,
    } = await context.params;

    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Not authenticated.",
        401
      );
    }

    const {
      data: lead,
      error,
    } =
      await supabase
        .from("leads")
        .select(`
          competitor_snapshot,
          competitor_snapshot_generated_at
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "Could not load competitor snapshot:",
        error
      );

      return jsonError(
        "Could not load competitor snapshot.",
        500
      );
    }

    if (
      !lead
    ) {
      return jsonError(
        "Lead not found.",
        404
      );
    }

    if (
      !isSavedSnapshot(
        lead.competitor_snapshot
      )
    ) {
      return NextResponse.json({
        ok: true,
        found: false,
      });
    }

    return NextResponse.json({
      ok: true,
      found: true,
      snapshot:
        lead.competitor_snapshot,
      generatedAt:
        lead.competitor_snapshot_generated_at ??
        null,
    });
  } catch (
    error
  ) {
    console.error(
      "Competitor snapshot GET failed:",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not load competitor snapshot.",
      500
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const {
      id,
    } = await context.params;

    let language:
      "de" | "en" =
      "de";

    try {
      const payload =
        (await request.json()) as {
          language?: unknown;
        };

      language =
        payload.language === "en"
          ? "en"
          : "de";
    } catch {
      language = "de";
    }

    const apiKey =
      process.env.GOOGLE_PLACES_API_KEY;

    if (
      !apiKey
    ) {
      return jsonError(
        "GOOGLE_PLACES_API_KEY is missing.",
        500
      );
    }

    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Not authenticated.",
        401
      );
    }

    try {
      await assertPlanFeatureAvailable(user.id, "competitor_research");
    } catch (error) {
      if (isPlanAccessError(error)) {
        return jsonError(
          planAccessMessage(error, language) ?? "Competitor research is not included in your plan.",
          403
        );
      }
      throw error;
    }

    const {
      data: lead,
      error: leadError,
    } =
      await supabase
        .from("leads")
        .select(`
          id,
          website_score,
          website_findings,
          company:companies (
            id,
            name,
            website_url,
            industry,
            location,
            google_place_id
          )
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (
      leadError
    ) {
      console.error(
        "Could not load lead for competitor snapshot:",
        leadError
      );

      return jsonError(
        "Could not load lead.",
        500
      );
    }

    if (
      !lead
    ) {
      return jsonError(
        "Lead not found.",
        404
      );
    }

    const company =
      getSingleRelation(
        lead.company
      );

    if (
      !company
    ) {
      return jsonError(
        "Company data is missing."
      );
    }

    if (
      !company.industry?.trim() ||
      !company.location?.trim()
    ) {
      return jsonError(
        language === "de"
          ? "Für den Marktvergleich werden Branche und Standort des Leads benötigt."
          : "Industry and location are required for the market snapshot."
      );
    }

    const query =
      `${company.industry.trim()} ${company.location.trim()}`;

    const places =
      await searchPlaces({
        query,
        apiKey,
      });

    const ownUrl =
      company.website_url
        ? normalizeUrl(
            company.website_url
          )
        : null;

    const ownHost =
      hostname(
        ownUrl
      );

    const ownName =
      normalizeName(
        company.name
      );

    const candidates =
      places
        .map(
          (place) => ({
            place,
            websiteUrl:
              place.websiteUri
                ? normalizeUrl(
                    place.websiteUri
                  )
                : null,
          })
        )
        .filter(
          (
            item
          ): item is {
            place: GooglePlace;
            websiteUrl: string;
          } =>
            Boolean(
              item.websiteUrl
            )
        )
        .filter(
          ({
            place,
            websiteUrl,
          }) => {
            if (
              company.google_place_id &&
              place.id ===
                company.google_place_id
            ) {
              return false;
            }

            if (
              ownHost &&
              hostname(
                websiteUrl
              ) === ownHost
            ) {
              return false;
            }

            const candidateName =
              normalizeName(
                place.displayName?.text ??
                ""
              );

            if (
              ownName &&
              candidateName &&
              (candidateName === ownName ||
                candidateName.includes(ownName) ||
                ownName.includes(candidateName))
            ) {
              return false;
            }

            return true;
          }
        )
        .slice(
          0,
          5
        );

    if (
      candidates.length === 0
    ) {
      return jsonError(
        language === "de"
          ? "In dieser Suche wurden keine geeigneten Wettbewerber mit eigener Website gefunden."
          : "No suitable competitors with their own website were found for this search."
      );
    }

    let targetScore:
      number | null =
      typeof lead.website_score === "number"
        ? lead.website_score
        : null;

    let targetMetrics =
      metricsFromFindings(
        lead.website_findings
      );

    const targetHasMetrics =
      Object.values(
        targetMetrics
      ).some(
        (value) =>
          value !== null
      );

    if (
      ownUrl &&
      (targetScore === null ||
        !targetHasMetrics)
    ) {
      try {
        const targetAnalysis =
          await analyzeWebsite(
            ownUrl
          );

        targetScore =
          targetScore ??
          targetAnalysis.websiteScore;

        targetMetrics =
          targetHasMetrics
            ? targetMetrics
            : metricsFromTypedFindings(
                targetAnalysis.findings
              );
      } catch (
        error
      ) {
        console.warn(
          "Target website analysis for market snapshot failed:",
          error
        );
      }
    }

    const results:
      CompetitorResult[] = [];

    for (
      const candidate of candidates
    ) {
      if (
        results.length >= 3
      ) {
        break;
      }

      const name =
        candidate.place.displayName?.text?.trim() ||
        hostname(
          candidate.websiteUrl
        ) ||
        "Competitor";

      try {
        const analysis =
          await analyzeWebsite(
            candidate.websiteUrl
          );

        results.push({
          placeId:
            candidate.place.id ??
            null,
          name,
          address:
            candidate.place.formattedAddress ??
            null,
          websiteUrl:
            candidate.websiteUrl,
          mapsUrl:
            candidate.place.googleMapsUri ??
            null,
          rating:
            typeof candidate.place.rating === "number"
              ? candidate.place.rating
              : null,
          userRatingCount:
            typeof candidate.place.userRatingCount === "number"
              ? candidate.place.userRatingCount
              : null,
          websiteScore:
            analysis.websiteScore,
          metrics:
            metricsFromTypedFindings(
              analysis.findings
            ),
          analysisError:
            null,
        });
      } catch (
        error
      ) {
        console.warn(
          `Competitor website analysis failed for ${candidate.websiteUrl}:`,
          error
        );

        results.push({
          placeId:
            candidate.place.id ??
            null,
          name,
          address:
            candidate.place.formattedAddress ??
            null,
          websiteUrl:
            candidate.websiteUrl,
          mapsUrl:
            candidate.place.googleMapsUri ??
            null,
          rating:
            typeof candidate.place.rating === "number"
              ? candidate.place.rating
              : null,
          userRatingCount:
            typeof candidate.place.userRatingCount === "number"
              ? candidate.place.userRatingCount
              : null,
          websiteScore:
            null,
          metrics:
            emptyMetrics(),
          analysisError:
            error instanceof Error
              ? error.message
              : "Website analysis failed.",
        });
      }
    }

    const scoredCompetitors =
      results
        .map(
          (item) =>
            item.websiteScore
        )
        .filter(
          (
            value
          ): value is number =>
            typeof value === "number"
        );

    const competitorMedianScore =
      median(
        scoredCompetitors
      );

    const scoreDifference =
      targetScore !== null &&
      competitorMedianScore !== null
        ? Math.round(
            targetScore -
            competitorMedianScore
          )
        : null;

    const position:
      SavedSnapshot["market"]["position"] =
      scoreDifference === null
        ? "UNKNOWN"
        : scoreDifference >= 8
          ? "ABOVE"
          : scoreDifference <= -8
            ? "BELOW"
            : "AVERAGE";

    const marketSignals =
      buildMarketSummary({
        targetMetrics,
        competitors:
          results,
        language,
      });

    const snapshot:
      SavedSnapshot = {
      version: 1,
      query,
      target: {
        name:
          company.name,
        websiteUrl:
          ownUrl,
        websiteScore:
          targetScore,
        metrics:
          targetMetrics,
      },
      competitors:
        results,
      market: {
        position,
        competitorMedianScore,
        scoreDifference,
        strengths:
          marketSignals.strengths,
        opportunities:
          marketSignals.opportunities,
      },
      note:
        language === "de"
          ? "Interne Research-Hilfe auf Basis einer kleinen Google-Places-Stichprobe und öffentlich erreichbarer Websites. Keine vollständige Marktanalyse und kein objektives Ranking."
          : "Internal research aid based on a small Google Places sample and publicly accessible websites. This is not a complete market analysis or objective ranking.",
    };

    const generatedAt =
      new Date().toISOString();

    const {
      error: saveError,
    } =
      await supabase
        .from("leads")
        .update({
          competitor_snapshot:
            snapshot,
          competitor_snapshot_generated_at:
            generatedAt,
        })
        .eq("id", id)
        .eq("user_id", user.id);

    if (
      saveError
    ) {
      console.error(
        "Could not save competitor snapshot:",
        saveError
      );

      return jsonError(
        "Market snapshot was created but could not be saved.",
        500
      );
    }

    return NextResponse.json({
      ok: true,
      snapshot,
      generatedAt,
    });
  } catch (
    error
  ) {
    console.error(
      "Competitor snapshot generation failed:",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Competitor snapshot generation failed.",
      500
    );
  }
}
