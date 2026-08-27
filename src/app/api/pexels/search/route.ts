import {
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  /* =========================================================
     CONFIG
  ========================================================= */
  
  export const runtime =
    "nodejs";
  
  export const dynamic =
    "force-dynamic";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type PexelsPhoto = {
    id?:
      number;
  
    width?:
      number;
  
    height?:
      number;
  
    url?:
      string;
  
    photographer?:
      string;
  
    photographer_url?:
      string;
  
    alt?:
      string;
  
    src?: {
      original?:
        string;
  
      large2x?:
        string;
  
      large?:
        string;
  
      medium?:
        string;
  
      small?:
        string;
  
      portrait?:
        string;
  
      landscape?:
        string;
  
      tiny?:
        string;
    };
  };
  
  type PexelsSearchResponse = {
    page?:
      number;
  
    per_page?:
      number;
  
    total_results?:
      number;
  
    next_page?:
      string;
  
    prev_page?:
      string;
  
    photos?:
      PexelsPhoto[];
  };
  
  /* =========================================================
     PAGE
  ========================================================= */
  
  function normalizePage(
    value:
      string | null
  ) {
    const parsed =
      Number.parseInt(
        value ??
        "1",
        10
      );
  
    if (
      !Number.isFinite(
        parsed
      )
    ) {
      return 1;
    }
  
    return Math.max(
      1,
      Math.min(
        parsed,
        100
      )
    );
  }
  
  /* =========================================================
     GET
  ========================================================= */
  
  export async function GET(
    request:
      Request
  ) {
    /* =======================================================
       AUTH
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
  
    /* =======================================================
       API KEY
    ======================================================= */
  
    const apiKey =
      process.env
        .PEXELS_API_KEY
        ?.trim();
  
    if (
      !apiKey
    ) {
      console.error(
        "PEXELS_API_KEY is missing."
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "PEXELS_API_KEY is missing.",
        },
        {
          status:
            500,
        }
      );
    }
  
    /* =======================================================
       SEARCH PARAMS
    ======================================================= */
  
    const url =
      new URL(
        request.url
      );
  
    const query =
      url.searchParams
        .get(
          "q"
        )
        ?.trim() ??
      "";
  
    const page =
      normalizePage(
        url.searchParams.get(
          "page"
        )
      );
  
    if (
      query.length <
      2
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Bitte mindestens zwei Zeichen eingeben.",
        },
        {
          status:
            400,
        }
      );
    }
  
    /* =======================================================
       PEXELS REQUEST
    ======================================================= */
  
    const pexelsUrl =
      new URL(
        "https://api.pexels.com/v1/search"
      );
  
    pexelsUrl.searchParams.set(
      "query",
      query
    );
  
    pexelsUrl.searchParams.set(
      "page",
      String(
        page
      )
    );
  
    pexelsUrl.searchParams.set(
      "per_page",
      "18"
    );
  
    pexelsUrl.searchParams.set(
      "locale",
      "de-DE"
    );
  
    try {
      const response =
        await fetch(
          pexelsUrl,
          {
            method:
              "GET",
  
            headers: {
              Authorization:
                apiKey,
  
              Accept:
                "application/json",
            },
  
            cache:
              "no-store",
          }
        );
  
      if (
        !response.ok
      ) {
        const responseText =
          await response
            .text()
            .catch(
              () =>
                ""
            );
  
        console.error(
          "Pexels API error:",
          response.status,
          responseText
        );
  
        if (
          response.status ===
          401
        ) {
          return NextResponse.json(
            {
              ok:
                false,
  
              error:
                "Der Pexels API-Key ist ungültig.",
            },
            {
              status:
                502,
            }
          );
        }
  
        if (
          response.status ===
          429
        ) {
          return NextResponse.json(
            {
              ok:
                false,
  
              error:
                "Das Pexels API-Limit wurde erreicht.",
            },
            {
              status:
                429,
            }
          );
        }
  
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              `Pexels konnte nicht durchsucht werden (${response.status}).`,
          },
          {
            status:
              502,
          }
        );
      }
  
      const data =
        (await response.json()) as
          PexelsSearchResponse;
  
      const photos =
        (
          data.photos ??
          []
        )
          .map(
            (
              photo
            ) => {
              const imageUrl =
                photo.src
                  ?.large2x ??
                photo.src
                  ?.large ??
                photo.src
                  ?.original ??
                null;
  
              const thumbnailUrl =
                photo.src
                  ?.medium ??
                photo.src
                  ?.small ??
                imageUrl;
  
              if (
                typeof photo.id !==
                  "number" ||
                !imageUrl ||
                !thumbnailUrl
              ) {
                return null;
              }
  
              return {
                id:
                  photo.id,
  
                width:
                  photo.width ??
                  null,
  
                height:
                  photo.height ??
                  null,
  
                imageUrl,
  
                thumbnailUrl,
  
                alt:
                  photo.alt
                    ?.trim() ??
                  "",
  
                photographer:
                  photo.photographer
                    ?.trim() ||
                  "Pexels",
  
                photographerUrl:
                  photo.photographer_url ??
                  null,
  
                pexelsUrl:
                  photo.url ??
                  null,
              };
            }
          )
          .filter(
            (
              photo
            ) =>
              photo !==
              null
          );
  
      return NextResponse.json({
        ok:
          true,
  
        query,
  
        page:
          data.page ??
          page,
  
        totalResults:
          data.total_results ??
          photos.length,
  
        hasNext:
          Boolean(
            data.next_page
          ),
  
        hasPrevious:
          Boolean(
            data.prev_page
          ),
  
        photos,
      });
    } catch (
      error
    ) {
      console.error(
        "Could not search Pexels:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Pexels konnte nicht durchsucht werden.",
        },
        {
          status:
            500,
        }
      );
    }
  }