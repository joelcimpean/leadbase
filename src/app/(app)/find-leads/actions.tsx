"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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

function getWebsiteDomain(
  websiteUrl: string | undefined
) {
  if (!websiteUrl) {
    return null;
  }

  try {
    return new URL(
      websiteUrl
    ).hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    return null;
  }
}

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
    formData.get("campaignId");

  const industry =
    formData.get("industry");

  const location =
    formData.get("location");

  const resultLimit =
    formData.get("resultLimit");

  /* =========================================================
     VALIDATE INPUT
  ========================================================= */

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

  /* =========================================================
     RESULT LIMIT
  ========================================================= */

  const parsedLimit =
    typeof resultLimit ===
    "string"
      ? Number(resultLimit)
      : 20;

  const cleanResultLimit =
    Number.isInteger(
      parsedLimit
    ) &&
    parsedLimit >= 1 &&
    parsedLimit <= 60
      ? parsedLimit
      : 20;

  /* =========================================================
     GOOGLE API KEY
  ========================================================= */

  const apiKey =
    process.env
      .GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    redirect(
      buildErrorUrl(
        "Google Places API Key wurde nicht gefunden. Prüfe deine .env-Datei und starte den Dev-Server neu."
      )
    );
  }

  /* =========================================================
     SUPABASE + USER
  ========================================================= */

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect("/login");
  }

  /* =========================================================
     VERIFY CAMPAIGN
  ========================================================= */

  const {
    data: campaign,
    error: campaignError,
  } = await supabase
    .from("campaigns")
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

  /* =========================================================
     SEARCH QUERY
  ========================================================= */

  const cleanIndustry =
    industry.trim();

  const cleanLocation =
    location.trim();

  const query =
    `${cleanIndustry} in ${cleanLocation}`;

  /* =========================================================
     CREATE SEARCH RUN
  ========================================================= */

  const {
    data: search,
    error: searchError,
  } = await supabase
    .from("lead_searches")
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
    .select("id")
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

  /* =========================================================
     SEARCH STATE

     IMPORTANT:
     redirect() happens AFTER try/catch.
  ========================================================= */

  let searchSuccessful =
    false;

  let failureMessage:
    | string
    | null = null;

  try {
    /* =======================================================
       GOOGLE PLACES SEARCH
    ======================================================= */

    const allPlaces:
      GooglePlace[] = [];

    let nextPageToken:
      | string
      | undefined;

    do {
      const remaining =
        cleanResultLimit -
        allPlaces.length;

      if (
        remaining <= 0
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
                  "nextPageToken",
                ].join(","),
            },

            body:
              JSON.stringify(
                requestBody
              ),
          }
        );

      const data =
        (await response.json()) as GoogleTextSearchResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          data.error
            ?.message ??
            `Google Places returned ${response.status}.`
        );
      }

      const places =
        data.places ??
        [];

      allPlaces.push(
        ...places
      );

      nextPageToken =
        data.nextPageToken;
    } while (
      nextPageToken &&
      allPlaces.length <
        cleanResultLimit
    );

    /* =======================================================
       REMOVE DUPLICATES
    ======================================================= */

    const uniquePlaces =
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
              (place) => [
                place.id,
                place,
              ]
            )
        ).values()
      ).slice(
        0,
        cleanResultLimit
      );

    /* =======================================================
       SAVE CANDIDATES
    ======================================================= */

    if (
      uniquePlaces.length >
      0
    ) {
      const candidates =
        uniquePlaces.map(
          (place) => ({
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

    /* =======================================================
       COMPLETE SEARCH
    ======================================================= */

    const {
      error:
        completeError,
    } = await supabase
      .from(
        "lead_searches"
      )
      .update({
        status:
          "COMPLETED",

        result_count:
          uniquePlaces.length,

        completed_at:
          new Date().toISOString(),

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
  } catch (error) {
    /* =======================================================
       REAL ERROR HANDLING
    ======================================================= */

    failureMessage =
      error instanceof Error
        ? error.message
        : "Unknown Google Places error.";

    console.error(
      "Google Places search failed:",
      failureMessage
    );

    const {
      error:
        failedUpdateError,
    } = await supabase
      .from(
        "lead_searches"
      )
      .update({
        status:
          "FAILED",

        error_message:
          failureMessage,

        completed_at:
          new Date().toISOString(),
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

  /* =========================================================
     REVALIDATE

     redirect() MUST stay outside try/catch.
  ========================================================= */

  revalidatePath(
    "/find-leads"
  );

  /* =========================================================
     SUCCESS REDIRECT
  ========================================================= */

  if (
    searchSuccessful
  ) {
    redirect(
      `/find-leads?search=${search.id}`
    );
  }

  /* =========================================================
     ERROR REDIRECT
  ========================================================= */

  redirect(
    `/find-leads?error=${encodeURIComponent(
      failureMessage ??
        "Der Suchlauf ist fehlgeschlagen."
    )}`
  );
}