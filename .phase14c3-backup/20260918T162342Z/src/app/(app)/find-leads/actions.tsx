"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type GooglePlace = {
  id?: string;

  displayName?: {
    text?: string;
    languageCode?: string;
  };

  formattedAddress?: string;

  websiteUri?: string;

  nationalPhoneNumber?: string;

  googleMapsUri?: string;

  rating?: number;

  userRatingCount?: number;

  primaryType?: string;

  types?: string[];

  location?: {
    latitude?: number;
    longitude?: number;
  };
};

type GoogleTextSearchResponse = {
  places?: GooglePlace[];

  nextPageToken?: string;

  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type ExistingCandidate = {
  external_id:
    | string
    | null;

  website_domain:
    | string
    | null;

  website_url:
    | string
    | null;
};

type ExistingCompany = {
  google_place_id:
    | string
    | null;

  website_domain:
    | string
    | null;

  website_url:
    | string
    | null;
};

/* =========================================================
   WEBSITE DOMAIN
========================================================= */

function getWebsiteDomain(
  websiteUrl:
    | string
    | null
    | undefined
) {
  if (
    !websiteUrl
  ) {
    return null;
  }

  try {
    return new URL(
      websiteUrl.startsWith(
        "http://"
      ) ||
        websiteUrl.startsWith(
          "https://"
        )
        ? websiteUrl
        : `https://${websiteUrl}`
    )
      .hostname
      .toLowerCase()
      .replace(
        /^www\./,
        ""
      );
  } catch {
    return null;
  }
}

/* =========================================================
   NORMALIZE DOMAIN
========================================================= */

function normalizeDomain(
  value:
    | string
    | null
    | undefined
) {
  if (
    !value
  ) {
    return null;
  }

  const trimmed =
    value
      .trim()
      .toLowerCase();

  if (
    !trimmed
  ) {
    return null;
  }

  if (
    trimmed.includes(
      "://"
    ) ||
    trimmed.includes(
      "/"
    )
  ) {
    return getWebsiteDomain(
      trimmed
    );
  }

  return trimmed.replace(
    /^www\./,
    ""
  );
}

/* =========================================================
   COORDINATES
========================================================= */

function getLatitude(
  place:
    GooglePlace
) {
  return typeof place
    .location
    ?.latitude ===
    "number"
    ? place.location.latitude
    : null;
}

function getLongitude(
  place:
    GooglePlace
) {
  return typeof place
    .location
    ?.longitude ===
    "number"
    ? place.location.longitude
    : null;
}

/* =========================================================
   ERROR URL
========================================================= */

function buildErrorUrl(
  message: string
) {
  return `/find-leads?error=${encodeURIComponent(
    message
  )}`;
}

/* =========================================================
   RUN LEAD SEARCH
========================================================= */

export async function runLeadSearch(
  formData: FormData
) {
  const campaignId =
    formData.get(
      "campaignId"
    );

  const industry =
    formData.get(
      "industry"
    );

  const location =
    formData.get(
      "location"
    );

  const resultLimit =
    formData.get(
      "resultLimit"
    );

  /* =======================================================
     VALIDATE INPUT
  ======================================================= */

  if (
    typeof campaignId !==
      "string" ||
    !campaignId.trim()
  ) {
    redirect(
      buildErrorUrl(
        "Bitte wähle eine Kampagne aus."
      )
    );
  }

  if (
    typeof industry !==
      "string" ||
    !industry.trim()
  ) {
    redirect(
      buildErrorUrl(
        "Bitte gib eine Branche ein."
      )
    );
  }

  if (
    typeof location !==
      "string" ||
    !location.trim()
  ) {
    redirect(
      buildErrorUrl(
        "Bitte gib einen Standort ein."
      )
    );
  }

  /* =======================================================
     RESULT LIMIT
  ======================================================= */

  const parsedLimit =
    typeof resultLimit ===
    "string"
      ? Number(
          resultLimit
        )
      : 20;

  const cleanResultLimit =
    Number.isInteger(
      parsedLimit
    ) &&
    parsedLimit >=
      1 &&
    parsedLimit <=
      60
      ? parsedLimit
      : 20;

  /* =======================================================
     GOOGLE API KEY
  ======================================================= */

  const apiKey =
    process.env
      .GOOGLE_PLACES_API_KEY;

  if (
    !apiKey
  ) {
    redirect(
      buildErrorUrl(
        "Google Places API Key wurde nicht gefunden. Prüfe deine .env-Datei und starte den Dev-Server neu."
      )
    );
  }

  /* =======================================================
     SUPABASE + USER
  ======================================================= */

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },

    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login"
    );
  }

  /* =======================================================
     VERIFY CAMPAIGN
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
        name
      `)
      .eq(
        "id",
        campaignId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    campaignError ||
    !campaign
  ) {
    redirect(
      buildErrorUrl(
        "Die ausgewählte Kampagne wurde nicht gefunden."
      )
    );
  }

  /* =======================================================
     SEARCH QUERY
  ======================================================= */

  const cleanIndustry =
    industry.trim();

  const cleanLocation =
    location.trim();

  const query =
    `${cleanIndustry} in ${cleanLocation}`;

  /* =======================================================
     CREATE SEARCH RUN
  ======================================================= */

  const {
    data:
      search,

    error:
      searchError,
  } =
    await supabase
      .from(
        "lead_searches"
      )
      .insert({
        user_id:
          user.id,

        campaign_id:
          campaign.id,

        query,

        industry:
          cleanIndustry,

        location:
          cleanLocation,

        result_limit:
          cleanResultLimit,

        source:
          "GOOGLE_PLACES",

        status:
          "RUNNING",
      })
      .select(
        "id"
      )
      .single();

  if (
    searchError ||
    !search
  ) {
    console.error(
      "Could not create lead search:",
      searchError
    );

    redirect(
      buildErrorUrl(
        "Der Suchlauf konnte nicht erstellt werden."
      )
    );
  }

  let searchSuccessful =
    false;

  let failureMessage:
    | string
    | null =
    null;

  try {
    /* =====================================================
       GOOGLE PLACES
    ===================================================== */

    const allPlaces:
      GooglePlace[] =
      [];

    let nextPageToken:
      | string
      | undefined;

    const rawSearchLimit =
      Math.min(
        60,
        Math.max(
          cleanResultLimit,
          cleanResultLimit *
            2
        )
      );

    do {
      const remaining =
        rawSearchLimit -
        allPlaces.length;

      if (
        remaining <=
        0
      ) {
        break;
      }

      const pageSize =
        Math.min(
          20,
          remaining
        );

      const requestBody: {
        textQuery: string;

        pageSize: number;

        pageToken?: string;
      } = {
        textQuery:
          query,

        pageSize,
      };

      if (
        nextPageToken
      ) {
        requestBody.pageToken =
          nextPageToken;
      }

      const response =
        await fetch(
          "https://places.googleapis.com/v1/places:searchText",
          {
            method:
              "POST",

            cache:
              "no-store",

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
                  "places.nationalPhoneNumber",
                  "places.googleMapsUri",
                  "places.rating",
                  "places.userRatingCount",
                  "places.primaryType",
                  "places.types",
                  "places.location",
                  "nextPageToken",
                ].join(
                  ","
                ),
            },

            body:
              JSON.stringify(
                requestBody
              ),
          }
        );

      const data =
        (await response.json()) as
          GoogleTextSearchResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          data.error
            ?.message ??
            `Google Places returned ${response.status}.`
        );
      }

      allPlaces.push(
        ...(
          data.places ??
          []
        )
      );

      nextPageToken =
        data.nextPageToken;
    } while (
      nextPageToken &&
      allPlaces.length <
        rawSearchLimit
    );

    /* =====================================================
       UNIQUE PLACE IDS
    ===================================================== */

    const uniqueByPlaceId =
      Array.from(
        new Map(
          allPlaces
            .filter(
              (
                place
              ): place is GooglePlace & {
                id: string;
              } =>
                Boolean(
                  place.id
                )
            )
            .map(
              (
                place
              ) => [
                place.id,
                place,
              ]
            )
        ).values()
      );

    /* =====================================================
       SAME-DOMAIN DUPLICATES
    ===================================================== */

    const currentSearchDomains =
      new Set<string>();

    const currentSearchPlaceIds =
      new Set<string>();

    const uniquePlaces:
      Array<
        GooglePlace & {
          id: string;
        }
      > = [];

    for (
      const place of
        uniqueByPlaceId
    ) {
      if (
        currentSearchPlaceIds.has(
          place.id
        )
      ) {
        continue;
      }

      const domain =
        getWebsiteDomain(
          place.websiteUri
        );

      if (
        domain &&
        currentSearchDomains.has(
          domain
        )
      ) {
        continue;
      }

      currentSearchPlaceIds.add(
        place.id
      );

      if (
        domain
      ) {
        currentSearchDomains.add(
          domain
        );
      }

      uniquePlaces.push(
        place
      );
    }

    /* =====================================================
       LOAD EXISTING
    ===================================================== */

    const [
      existingCandidatesResult,
      existingCompaniesResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "lead_candidates"
          )
          .select(`
            external_id,
            website_domain,
            website_url
          `)
          .eq(
            "user_id",
            user.id
          ),

        supabase
          .from(
            "companies"
          )
          .select(`
            google_place_id,
            website_domain,
            website_url
          `)
          .eq(
            "user_id",
            user.id
          ),
      ]);

    if (
      existingCandidatesResult.error
    ) {
      throw new Error(
        `Could not check existing candidates: ${existingCandidatesResult.error.message}`
      );
    }

    if (
      existingCompaniesResult.error
    ) {
      throw new Error(
        `Could not check existing companies: ${existingCompaniesResult.error.message}`
      );
    }

    const existingCandidates =
      (
        existingCandidatesResult.data ??
        []
      ) as ExistingCandidate[];

    const existingCompanies =
      (
        existingCompaniesResult.data ??
        []
      ) as ExistingCompany[];

    /* =====================================================
       KNOWN PLACE IDS
    ===================================================== */

    const knownPlaceIds =
      new Set<string>();

    for (
      const candidate of
        existingCandidates
    ) {
      if (
        candidate.external_id
      ) {
        knownPlaceIds.add(
          candidate.external_id
        );
      }
    }

    for (
      const company of
        existingCompanies
    ) {
      if (
        company.google_place_id
      ) {
        knownPlaceIds.add(
          company.google_place_id
        );
      }
    }

    /* =====================================================
       KNOWN DOMAINS
    ===================================================== */

    const knownDomains =
      new Set<string>();

    for (
      const candidate of
        existingCandidates
    ) {
      const storedDomain =
        normalizeDomain(
          candidate.website_domain
        );

      const urlDomain =
        getWebsiteDomain(
          candidate.website_url
        );

      if (
        storedDomain
      ) {
        knownDomains.add(
          storedDomain
        );
      }

      if (
        urlDomain
      ) {
        knownDomains.add(
          urlDomain
        );
      }
    }

    for (
      const company of
        existingCompanies
    ) {
      const storedDomain =
        normalizeDomain(
          company.website_domain
        );

      const urlDomain =
        getWebsiteDomain(
          company.website_url
        );

      if (
        storedDomain
      ) {
        knownDomains.add(
          storedDomain
        );
      }

      if (
        urlDomain
      ) {
        knownDomains.add(
          urlDomain
        );
      }
    }

    /* =====================================================
       GLOBAL DUPLICATE FILTER
    ===================================================== */

    const newPlaces =
      uniquePlaces
        .filter(
          (
            place
          ) => {
            if (
              knownPlaceIds.has(
                place.id
              )
            ) {
              return false;
            }

            const domain =
              getWebsiteDomain(
                place.websiteUri
              );

            if (
              domain &&
              knownDomains.has(
                domain
              )
            ) {
              return false;
            }

            return true;
          }
        )
        .slice(
          0,
          cleanResultLimit
        );

    /* =====================================================
       SAVE CANDIDATES
    ===================================================== */

    if (
      newPlaces.length >
      0
    ) {
      const candidates =
        newPlaces.map(
          (
            place
          ) => ({
            user_id:
              user.id,

            campaign_id:
              campaign.id,

            search_id:
              search.id,

            source:
              "GOOGLE_PLACES",

            external_id:
              place.id,

            name:
              place
                .displayName
                ?.text ??
              "Unknown company",

            website_url:
              place.websiteUri ??
              null,

            website_domain:
              getWebsiteDomain(
                place.websiteUri
              ),

            phone:
              place
                .nationalPhoneNumber ??
              null,

            formatted_address:
              place
                .formattedAddress ??
              null,

            location:
              cleanLocation,

            latitude:
              getLatitude(
                place
              ),

            longitude:
              getLongitude(
                place
              ),

            maps_url:
              place
                .googleMapsUri ??
              null,

            rating:
              typeof place.rating ===
              "number"
                ? place.rating
                : null,

            review_count:
              typeof place.userRatingCount ===
              "number"
                ? place.userRatingCount
                : null,

            primary_type:
              place.primaryType ??
              null,

            types:
              place.types ??
              [],
          })
        );

      const {
        error:
          candidatesError,
      } =
        await supabase
          .from(
            "lead_candidates"
          )
          .upsert(
            candidates,
            {
              onConflict:
                "user_id,campaign_id,source,external_id",
            }
          );

      if (
        candidatesError
      ) {
        throw new Error(
          `Could not save candidates: ${candidatesError.message}`
        );
      }
    }

    /* =====================================================
       COMPLETE SEARCH
    ===================================================== */

    const {
      error:
        completeError,
    } =
      await supabase
        .from(
          "lead_searches"
        )
        .update({
          status:
            "COMPLETED",

          result_count:
            newPlaces.length,

          completed_at:
            new Date()
              .toISOString(),

          error_message:
            null,
        })
        .eq(
          "id",
          search.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      completeError
    ) {
      throw new Error(
        `Could not complete search: ${completeError.message}`
      );
    }

    searchSuccessful =
      true;
  } catch (
    error
  ) {
    failureMessage =
      error instanceof
        Error
        ? error.message
        : "Unknown Google Places error.";

    console.error(
      "Google Places search failed:",
      failureMessage
    );

    const {
      error:
        failedUpdateError,
    } =
      await supabase
        .from(
          "lead_searches"
        )
        .update({
          status:
            "FAILED",

          error_message:
            failureMessage,

          completed_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          search.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      failedUpdateError
    ) {
      console.error(
        "Could not mark search as failed:",
        failedUpdateError
      );
    }
  }

  revalidatePath(
    "/find-leads"
  );

  if (
    searchSuccessful
  ) {
    redirect(
      `/find-leads?search=${search.id}`
    );
  }

  redirect(
    `/find-leads?error=${encodeURIComponent(
      failureMessage ??
        "Der Suchlauf ist fehlgeschlagen."
    )}`
  );
}