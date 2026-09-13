import {
    revalidatePath,
  } from "next/cache";
  
  import {
    NextResponse,
  } from "next/server";
  
  import OpenAI from "openai";
  
  import {
    zodTextFormat,
  } from "openai/helpers/zod";
  
  import {
    z,
  } from "zod";
  
  import {
    createClient,
  } from "@/lib/supabase/server";

  import {
    getLeadbasePlanAccess,
  } from "@/lib/plan-access";

  import {
    assertAiUsageAvailable,
    recordAiUsage,
  } from "@/lib/ai-usage";
  
  /* =========================================================
     CONFIG
  ========================================================= */
  
  const MAX_INDUSTRIES =
    4;
  
  const MAX_RESULTS =
    60;
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type AppLanguage =
    | "de"
    | "en";
  
  type AiSearchContext = {
    industries: string[];
  
    location: string;
  
    resultLimit: number;
  };
  
  type RequestBody = {
    prompt?: unknown;
  
    campaignId?: unknown;
  
    language?: unknown;
  
    context?: unknown;
  };
  
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
     AI SCHEMA
  ========================================================= */
  
  const AiLeadSearchSchema =
    z.object({
      industries:
        z
          .array(
            z.string()
          )
          .max(
            MAX_INDUSTRIES
          ),
  
      location:
        z.string(),
  
      resultLimit:
        z
          .number()
          .int()
          .min(
            1
          )
          .max(
            MAX_RESULTS
          ),
  
      needsClarification:
        z.boolean(),
  
      clarificationQuestion:
        z.string(),
    });
  
  /* =========================================================
     LANGUAGE
  ========================================================= */
  
  function parseLanguage(
    value: unknown
  ): AppLanguage {
    return value ===
      "en"
      ? "en"
      : "de";
  }
  
  /* =========================================================
     CONTEXT
  ========================================================= */
  
  function parseContext(
    value: unknown
  ): AiSearchContext | null {
    if (
      typeof value !==
        "object" ||
      value ===
        null ||
      Array.isArray(
        value
      )
    ) {
      return null;
    }
  
    const record =
      value as Record<
        string,
        unknown
      >;
  
    const industries =
      Array.isArray(
        record.industries
      )
        ? record.industries.filter(
            (
              item
            ): item is string =>
              typeof item ===
                "string" &&
              Boolean(
                item.trim()
              )
          )
        : [];
  
    const location =
      typeof record.location ===
        "string"
        ? record.location.trim()
        : "";
  
    const resultLimit =
      typeof record.resultLimit ===
        "number" &&
      Number.isInteger(
        record.resultLimit
      )
        ? Math.max(
            1,
            Math.min(
              MAX_RESULTS,
              record.resultLimit
            )
          )
        : 20;
  
    if (
      industries.length ===
        0 ||
      !location
    ) {
      return null;
    }
  
    return {
      industries:
        industries.slice(
          0,
          MAX_INDUSTRIES
        ),
  
      location,
  
      resultLimit,
    };
  }
  
  /* =========================================================
     INDUSTRIES
  ========================================================= */
  
  function normalizeIndustries(
    values: string[]
  ) {
    const seen =
      new Set<string>();
  
    const result:
      string[] = [];
  
    for (
      const value of
        values
    ) {
      const cleaned =
        value
          .replace(
            /\s+/g,
            " "
          )
          .trim();
  
      if (
        !cleaned
      ) {
        continue;
      }
  
      const key =
        cleaned.toLowerCase();
  
      if (
        seen.has(
          key
        )
      ) {
        continue;
      }
  
      seen.add(
        key
      );
  
      result.push(
        cleaned
      );
  
      if (
        result.length >=
        MAX_INDUSTRIES
      ) {
        break;
      }
    }
  
    return result;
  }
  
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
      const url =
        new URL(
          websiteUrl.startsWith(
            "http://"
          ) ||
            websiteUrl.startsWith(
              "https://"
            )
            ? websiteUrl
            : `https://${websiteUrl}`
        );
  
      return url.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );
    } catch {
      return null;
    }
  }
  
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
  
    const cleaned =
      value
        .trim()
        .toLowerCase();
  
    if (
      !cleaned
    ) {
      return null;
    }
  
    if (
      cleaned.includes(
        "://"
      ) ||
      cleaned.includes(
        "/"
      )
    ) {
      return getWebsiteDomain(
        cleaned
      );
    }
  
    return cleaned.replace(
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
     GOOGLE SEARCH
  ========================================================= */
  
  async function searchGooglePlaces({
    apiKey,
    query,
    rawLimit,
  }: {
    apiKey: string;
  
    query: string;
  
    rawLimit: number;
  }) {
    const allPlaces:
      GooglePlace[] = [];
  
    let nextPageToken:
      | string
      | undefined;
  
    do {
      const remaining =
        rawLimit -
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
        rawLimit
    );
  
    return allPlaces;
  }
  
  /* =========================================================
     AI INTERPRETATION
  ========================================================= */
  
  async function interpretPrompt({
    prompt,
    language,
    context,
  }: {
    prompt: string;
  
    language:
      AppLanguage;
  
    context:
      AiSearchContext | null;
  }) {
    const apiKey =
      process.env
        .OPENAI_API_KEY;
  
    if (
      !apiKey
    ) {
      throw new Error(
        "OPENAI_API_KEY is missing."
      );
    }
  
    const openai =
      new OpenAI({
        apiKey,
      });
  
    const model =
      process.env.OPENAI_LEAD_SEARCH_MODEL ??
      "gpt-5-mini";

    const response =
      await openai.responses.parse({
        model,
  
        reasoning: {
          effort:
            "low",
        },
  
        input: [
          {
            role:
              "system",
  
            content: `
  You interpret natural-language lead-search requests for a CRM application.
  
  Your job is ONLY to convert the user's request into structured search parameters.
  
  You never invent company names.
  Actual companies will later be fetched from Google Places.
  
  The application searches for local businesses using:
  - one location
  - one or more industries / business categories
  - a desired total result count
  
  IMPORTANT TYPO AND LANGUAGE HANDLING:
  
  Users may write quickly and make spelling mistakes, keyboard mistakes, missing letters, swapped letters or phonetic mistakes.
  
  Silently correct obvious mistakes when the intended meaning is reasonably clear.
  
  Examples:
  - "gsrtenbsu" -> "Gartenbau"
  - "Gsrtenbau" -> "Gartenbau"
  - "gartnebauer" -> "Gartenbau"
  - "elektricker" -> "Elektriker"
  - "handwrker" -> "Handwerker"
  - "Albstdt" -> "Albstadt"
  - "Balignen" -> "Balingen"
  
  Do not ask for clarification just because a word is misspelled if the intended industry or location is obvious from context.
  
  Normalize obvious spelling mistakes BEFORE producing industries and location.
  
  However:
  - Never guess if multiple substantially different interpretations are plausible.
  - Never invent a city or industry without enough evidence.
  - Never invent company names.
  
  RULES:
  
  1. Extract the requested location.
  2. Extract up to ${MAX_INDUSTRIES} distinct industries or business categories.
  3. Extract the requested number of companies.
  4. If no number is explicitly requested, use 20.
  5. Maximum result count is ${MAX_RESULTS}.
  6. Normalize obvious spelling and typing mistakes.
  7. Return correctly spelled industry and location names whenever the intended meaning is clear.
  8. Preserve useful industry wording that works in a Google Places search.
  9. A broad request such as "Handwerk und Gartenbau" can become multiple industries.
  10. Do not produce company names.
  11. Do not change the requested location to another city unless you are only correcting an obvious typo.
  12. If the user says something like "noch 20", "more of those", "same again", or otherwise refers to the previous search, reuse the previous industries/location from the provided context.
  13. If the user modifies only one part, preserve the other values from context.
  14. Example: after "30 Gartenbauer in Albstadt", the message "jetzt 20 in Balingen" means same industry, Balingen, 20.
  15. If required information is still missing after considering the previous context, set needsClarification=true.
  16. clarificationQuestion must be short and natural.
  17. The clarification question must be written in ${
              language ===
              "de"
                ? "German"
                : "English"
            }.
  18. If no clarification is required, clarificationQuestion must be an empty string.
  
  Previous search context:
  ${JSON.stringify(
    context
  )}
            `.trim(),
          },
  
          {
            role:
              "user",
  
            content:
              prompt,
          },
        ],
  
        text: {
          format:
            zodTextFormat(
              AiLeadSearchSchema,
              "ai_lead_search"
            ),
        },
      });
  
    if (
      !response.output_parsed
    ) {
      throw new Error(
        "The AI could not interpret the search request."
      );
    }
  
    const result =
      response.output_parsed;
  
    const industries =
      normalizeIndustries(
        result.industries
      );
  
    const location =
      result.location
        .replace(
          /\s+/g,
          " "
        )
        .trim();
  
    const resultLimit =
      Math.max(
        1,
        Math.min(
          MAX_RESULTS,
          result.resultLimit
        )
      );
  
    const needsClarification =
      result.needsClarification ||
      industries.length ===
        0 ||
      !location;
  
    return {
      industries,
  
      location,
  
      resultLimit,
  
      needsClarification,
  
      clarificationQuestion:
        result.clarificationQuestion.trim(),

      _model: model,
      _usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }
  
  /* =========================================================
     POST
  ========================================================= */
  
  export async function POST(
    request: Request
  ) {
    let body:
      RequestBody;
  
    try {
      body =
        (await request.json()) as
          RequestBody;
    } catch {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Invalid request body.",
        },
        {
          status:
            400,
        }
      );
    }
  
    const prompt =
      typeof body.prompt ===
      "string"
        ? body.prompt.trim()
        : "";
  
    const campaignId =
      typeof body.campaignId ===
      "string"
        ? body.campaignId.trim()
        : "";
  
    const language =
      parseLanguage(
        body.language
      );
  
    const context =
      parseContext(
        body.context
      );
  
    if (
      !prompt
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            language ===
            "de"
              ? "Bitte gib eine Suchanfrage ein."
              : "Please enter a search request.",
        },
        {
          status:
            400,
        }
      );
    }
  
    if (
      !campaignId
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            language ===
            "de"
              ? "Bitte wähle eine Kampagne aus."
              : "Please select a campaign.",
        },
        {
          status:
            400,
        }
      );
    }
  
    /* =======================================================
       ENV
    ======================================================= */
  
    const googleApiKey =
      process.env
        .GOOGLE_PLACES_API_KEY;
  
    if (
      !googleApiKey
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            language ===
            "de"
              ? "Der Google Places API Key wurde nicht gefunden."
              : "The Google Places API key is missing.",
        },
        {
          status:
            500,
        }
      );
    }
  
    /* =======================================================
       USER
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
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Unauthorized.",
        },
        {
          status:
            401,
        }
      );
    }

    const planAccess = await getLeadbasePlanAccess(user.id);
    const planResultLimit = planAccess.entitlements.limits.aiLeadSearchMaxResultsPerRun;
  
    /* =======================================================
       CAMPAIGN
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
          name,
          status
        `)
        .eq(
          "id",
          campaignId
        )
        .eq(
          "user_id",
          user.id
        )
        .neq(
          "status",
          "ARCHIVED"
        )
        .maybeSingle();
  
    if (
      campaignError ||
      !campaign
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            language ===
            "de"
              ? "Die ausgewählte Kampagne wurde nicht gefunden."
              : "The selected campaign could not be found.",
        },
        {
          status:
            404,
        }
      );
    }
  
    /* =======================================================
       INTERPRET PROMPT
    ======================================================= */
  
    let intent:
      Awaited<
        ReturnType<
          typeof interpretPrompt
        >
      >;
  
    let usageReservationKey: string | null = null;

    try {
      const usageGuard = await assertAiUsageAvailable(user.id, {
        feature: "ai_lead_search",
        model: process.env.OPENAI_LEAD_SEARCH_MODEL ?? "gpt-5-mini",
        metadata: { campaignId },
      });
      usageReservationKey = usageGuard.reservationKey;

      intent =
        await interpretPrompt({
          prompt,
  
          language,
  
          context,
        });
    } catch (
      error
    ) {
      console.error(
        "Could not interpret AI lead search:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            language ===
            "de"
              ? "Die Suchanfrage konnte gerade nicht verstanden werden."
              : "The search request could not be interpreted.",
        },
        {
          status:
            500,
        }
      );
    }
  
    await recordAiUsage({
      userId: user.id,
      feature: "ai_lead_search",
      model: intent._model,
      usage: intent._usage,
      requestKey: `ai-lead-search:${campaignId}:${crypto.randomUUID()}`,
      reservationKey: usageReservationKey,
      metadata: { campaignId, prompt: prompt.slice(0, 240) },
    });

    intent = {
      ...intent,
      resultLimit: Math.min(intent.resultLimit, planResultLimit),
    };

    /* =======================================================
       CLARIFICATION
    ======================================================= */
  
    if (
      intent.needsClarification
    ) {
      const fallbackQuestion =
        language ===
        "de"
          ? "Welche Branche und welchen Standort soll ich durchsuchen?"
          : "Which industry and location should I search?";
  
      return NextResponse.json({
        ok:
          true,
  
        needsClarification:
          true,
  
        assistantMessage:
          intent.clarificationQuestion ||
          fallbackQuestion,
      });
    }
  
    const searchContext:
      AiSearchContext = {
      industries:
        intent.industries,
  
      location:
        intent.location,
  
      resultLimit:
        intent.resultLimit,
    };
  
    /* =======================================================
       CREATE SEARCH
    ======================================================= */
  
    const normalizedQuery =
      `${intent.industries.join(
        ", "
      )} in ${intent.location}`;
  
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
  
          query:
            normalizedQuery,
  
          industry:
            intent.industries.join(
              ", "
            ),
  
          location:
            intent.location,
  
          result_limit:
            intent.resultLimit,
  
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
        "Could not create AI lead search:",
        searchError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            language ===
            "de"
              ? "Der Suchlauf konnte nicht erstellt werden."
              : "The search could not be created.",
        },
        {
          status:
            500,
        }
      );
    }
  
    /* =======================================================
       SEARCH
    ======================================================= */
  
    try {
      /* =====================================================
         KNOWN COMPANIES
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
          existingCandidatesResult.error.message
        );
      }
  
      if (
        existingCompaniesResult.error
      ) {
        throw new Error(
          existingCompaniesResult.error.message
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
  
      const knownPlaceIds =
        new Set<string>();
  
      const knownDomains =
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
        if (
          company.google_place_id
        ) {
          knownPlaceIds.add(
            company.google_place_id
          );
        }
  
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
         GOOGLE SEARCH PER INDUSTRY
      ===================================================== */
  
      const perIndustryTarget =
        Math.max(
          1,
          Math.ceil(
            intent.resultLimit /
              intent.industries.length
          )
        );
  
      const rawLimitPerIndustry =
        Math.min(
          40,
          Math.max(
            20,
            perIndustryTarget *
              2
          )
        );
  
      const placeBuckets =
        await Promise.all(
          intent.industries.map(
            async (
              industry
            ) =>
              await searchGooglePlaces({
                apiKey:
                  googleApiKey,
  
                query:
                  `${industry} in ${intent.location}`,
  
                rawLimit:
                  rawLimitPerIndustry,
              })
          )
        );
  
      /* =====================================================
         BALANCED MERGE
      ===================================================== */
  
      const bucketIndexes =
        placeBuckets.map(
          () =>
            0
        );
  
      const finalPlaces:
        GooglePlace[] =
        [];
  
      const currentPlaceIds =
        new Set<string>();
  
      const currentDomains =
        new Set<string>();
  
      let skippedKnown =
        0;
  
      let madeProgress =
        true;
  
      while (
        finalPlaces.length <
          intent.resultLimit &&
        madeProgress
      ) {
        madeProgress =
          false;
  
        for (
          let bucketIndex =
            0;
          bucketIndex <
            placeBuckets.length;
          bucketIndex +=
            1
        ) {
          if (
            finalPlaces.length >=
            intent.resultLimit
          ) {
            break;
          }
  
          const bucket =
            placeBuckets[
              bucketIndex
            ];
  
          while (
            bucketIndexes[
              bucketIndex
            ] <
            bucket.length
          ) {
            const place =
              bucket[
                bucketIndexes[
                  bucketIndex
                ]
              ];
  
            bucketIndexes[
              bucketIndex
            ] +=
              1;
  
            if (
              !place.id
            ) {
              continue;
            }
  
            const domain =
              getWebsiteDomain(
                place.websiteUri
              );
  
            /* -----------------------------------------------
               DUPLICATE INSIDE CURRENT SEARCH
            ----------------------------------------------- */
  
            if (
              currentPlaceIds.has(
                place.id
              )
            ) {
              continue;
            }
  
            if (
              domain &&
              currentDomains.has(
                domain
              )
            ) {
              continue;
            }
  
            /* -----------------------------------------------
               GLOBAL DUPLICATE CHECK
            ----------------------------------------------- */
  
            if (
              knownPlaceIds.has(
                place.id
              )
            ) {
              skippedKnown +=
                1;
  
              continue;
            }
  
            if (
              domain &&
              knownDomains.has(
                domain
              )
            ) {
              skippedKnown +=
                1;
  
              continue;
            }
  
            currentPlaceIds.add(
              place.id
            );
  
            if (
              domain
            ) {
              currentDomains.add(
                domain
              );
            }
  
            finalPlaces.push(
              place
            );
  
            madeProgress =
              true;
  
            break;
          }
        }
      }
  
      /* =====================================================
         SAVE CANDIDATES
  
         NEW:
         latitude + longitude are saved directly from
         Google Places for the future dashboard globe.
      ===================================================== */
  
      if (
        finalPlaces.length >
        0
      ) {
        const candidates =
          finalPlaces.map(
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
                (
                  language ===
                  "de"
                    ? "Unbekanntes Unternehmen"
                    : "Unknown company"
                ),
  
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
                intent.location,
  
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
            candidatesError.message
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
              finalPlaces.length,
  
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
          completeError.message
        );
      }
  
      revalidatePath(
        "/find-leads"
      );
  
      /* =====================================================
         CHAT RESPONSE
      ===================================================== */
  
      let assistantMessage:
        string;
  
      if (
        language ===
        "de"
      ) {
        if (
          finalPlaces.length ===
          0
        ) {
          assistantMessage =
            skippedKnown >
            0
              ? `Ich habe keine neuen Firmen mehr gefunden. ${skippedKnown} passende Ergebnisse waren bereits bekannt und wurden übersprungen.`
              : "Ich habe für diese Suche aktuell keine neuen Firmen gefunden.";
        } else {
          assistantMessage =
            `Ich habe ${finalPlaces.length} neue ${
              finalPlaces.length ===
              1
                ? "Firma"
                : "Firmen"
            } für ${intent.industries.join(
              ", "
            )} in ${intent.location} gefunden.`;
  
          if (
            skippedKnown >
            0
          ) {
            assistantMessage +=
              ` ${skippedKnown} bereits bekannte ${
                skippedKnown ===
                1
                  ? "Firma wurde"
                  : "Firmen wurden"
              } übersprungen.`;
          }
        }
      } else {
        if (
          finalPlaces.length ===
          0
        ) {
          assistantMessage =
            skippedKnown >
            0
              ? `I couldn't find any new companies. ${skippedKnown} matching results were already known and were skipped.`
              : "I couldn't find any new companies for this search.";
        } else {
          assistantMessage =
            `I found ${finalPlaces.length} new ${
              finalPlaces.length ===
              1
                ? "company"
                : "companies"
            } for ${intent.industries.join(
              ", "
            )} in ${intent.location}.`;
  
          if (
            skippedKnown >
            0
          ) {
            assistantMessage +=
              ` ${skippedKnown} already-known ${
                skippedKnown ===
                1
                  ? "company was"
                  : "companies were"
              } skipped.`;
          }
        }
      }
  
      return NextResponse.json({
        ok:
          true,
  
        needsClarification:
          false,
  
        assistantMessage,
  
        searchId:
          search.id,
  
        foundCount:
          finalPlaces.length,
  
        skippedKnown,
  
        intent:
          searchContext,
      });
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Unknown AI lead search error.";
  
      console.error(
        "AI lead search failed:",
        message
      );
  
      await supabase
        .from(
          "lead_searches"
        )
        .update({
          status:
            "FAILED",
  
          error_message:
            message,
  
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
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            language ===
            "de"
              ? "Die Lead-Suche ist fehlgeschlagen. Bitte versuche es erneut."
              : "The lead search failed. Please try again.",
        },
        {
          status:
            500,
        }
      );
    }
  }