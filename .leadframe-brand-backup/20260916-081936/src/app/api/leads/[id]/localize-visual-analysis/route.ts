import {
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  import {
    createVisualNarrativeFingerprint,
    extractVisualNarrative,
    hasVisualNarrative,
    localizeVisualNarrative,
    type VisualAnalysisLanguage,
    type VisualNarrative,
  } from "@/lib/visual-analysis-localization";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type RouteContext = {
    params: Promise<{
      id: string;
    }>;
  };
  
  type RequestBody = {
    language?: unknown;
  };
  
  type CachedLocalization =
    VisualNarrative & {
      sourceFingerprint:
        string;
    };
  
  /* =========================================================
     HELPERS
  ========================================================= */
  
  function getRecord(
    value: unknown
  ): Record<
    string,
    unknown
  > | null {
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
  
    return value as Record<
      string,
      unknown
    >;
  }
  
  function isLanguage(
    value: unknown
  ): value is
    VisualAnalysisLanguage {
    return (
      value ===
        "de" ||
      value ===
        "en"
    );
  }
  
  function readStringArray(
    value: unknown
  ) {
    if (
      !Array.isArray(
        value
      )
    ) {
      return null;
    }
  
    const strings =
      value.filter(
        (
          item
        ): item is string =>
          typeof item ===
          "string"
      );
  
    if (
      strings.length !==
      value.length
    ) {
      return null;
    }
  
    return strings;
  }
  
  function readCachedLocalization(
    value: unknown,
    expectedFingerprint:
      string
  ): CachedLocalization | null {
    const record =
      getRecord(
        value
      );
  
    if (
      !record
    ) {
      return null;
    }
  
    if (
      record.sourceFingerprint !==
      expectedFingerprint
    ) {
      return null;
    }
  
    const strengths =
      readStringArray(
        record.strengths
      );
  
    const weaknesses =
      readStringArray(
        record.weaknesses
      );
  
    if (
      !strengths ||
      !weaknesses
    ) {
      return null;
    }
  
    if (
      typeof record.summary !==
        "string" ||
      typeof record.redesignReason !==
        "string" ||
      typeof record.outreachAngle !==
        "string"
    ) {
      return null;
    }
  
    return {
      sourceFingerprint:
        expectedFingerprint,
  
      strengths,
  
      weaknesses,
  
      summary:
        record.summary,
  
      redesignReason:
        record.redesignReason,
  
      outreachAngle:
        record.outreachAngle,
    };
  }
  
  /* =========================================================
     POST
  ========================================================= */
  
  export async function POST(
    request: Request,
    {
      params,
    }: RouteContext
  ) {
    /* =======================================================
       PARAMS
    ======================================================= */
  
    const {
      id,
    } =
      await params;
  
    if (
      !id
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Lead ID is missing.",
        },
        {
          status:
            400,
        }
      );
    }
  
    /* =======================================================
       REQUEST BODY
    ======================================================= */
  
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
  
    if (
      !isLanguage(
        body.language
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Language must be de or en.",
        },
        {
          status:
            400,
        }
      );
    }
  
    const targetLanguage =
      body.language;
  
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
       LOAD LEAD
    ======================================================= */
  
    const {
      data:
        lead,
  
      error:
        leadError,
    } =
      await supabase
        .from(
          "leads"
        )
        .select(`
          id,
          user_id,
          visual_analysis,
          visual_analysis_status
        `)
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();
  
    if (
      leadError
    ) {
      console.error(
        "Could not load lead for visual localization:",
        leadError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not load lead.",
        },
        {
          status:
            500,
        }
      );
    }
  
    if (
      !lead
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Lead not found.",
        },
        {
          status:
            404,
        }
      );
    }
  
    /* =======================================================
       ANALYSIS
    ======================================================= */
  
    const visualAnalysis =
      getRecord(
        lead.visual_analysis
      );
  
    if (
      !visualAnalysis ||
      lead.visual_analysis_status !==
        "COMPLETED"
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "No completed visual analysis is available.",
        },
        {
          status:
            409,
        }
      );
    }
  
    /* =======================================================
       SOURCE LANGUAGE
  
       Existing Leadbase visual analyses were generated in
       English. Newer analyses can explicitly save
       sourceLanguage inside the JSON.
    ======================================================= */
  
    const storedSourceLanguage =
      visualAnalysis
        .sourceLanguage;
  
    const sourceLanguage:
      VisualAnalysisLanguage =
      isLanguage(
        storedSourceLanguage
      )
        ? storedSourceLanguage
        : "en";
  
    /* =======================================================
       SOURCE NARRATIVE
    ======================================================= */
  
    const sourceNarrative =
      extractVisualNarrative(
        visualAnalysis
      );
  
    if (
      !hasVisualNarrative(
        sourceNarrative
      )
    ) {
      return NextResponse.json({
        ok:
          true,
  
        language:
          targetLanguage,
  
        cached:
          true,
  
        narrative:
          sourceNarrative,
      });
    }
  
    const sourceFingerprint =
      createVisualNarrativeFingerprint(
        sourceNarrative
      );
  
    /* =======================================================
       SOURCE LANGUAGE DOES NOT NEED AI
    ======================================================= */
  
    if (
      targetLanguage ===
      sourceLanguage
    ) {
      return NextResponse.json({
        ok:
          true,
  
        language:
          targetLanguage,
  
        cached:
          true,
  
        narrative:
          sourceNarrative,
      });
    }
  
    /* =======================================================
       CACHED LOCALIZATION
    ======================================================= */
  
    const localizations =
      getRecord(
        visualAnalysis
          .localizations
      ) ??
      {};
  
    const cached =
      readCachedLocalization(
        localizations[
          targetLanguage
        ],
        sourceFingerprint
      );
  
    if (
      cached
    ) {
      return NextResponse.json({
        ok:
          true,
  
        language:
          targetLanguage,
  
        cached:
          true,
  
        narrative: {
          strengths:
            cached.strengths,
  
          weaknesses:
            cached.weaknesses,
  
          summary:
            cached.summary,
  
          redesignReason:
            cached.redesignReason,
  
          outreachAngle:
            cached.outreachAngle,
        },
      });
    }
  
    /* =======================================================
       GENERATE LOCALIZATION
    ======================================================= */
  
    let localized:
      VisualNarrative;
  
    try {
      localized =
        await localizeVisualNarrative({
          narrative:
            sourceNarrative,
  
          sourceLanguage,
  
          targetLanguage,
        });
    } catch (
      localizationError
    ) {
      console.error(
        "Visual analysis localization failed:",
        localizationError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            localizationError instanceof
            Error
              ? localizationError.message
              : "Visual analysis localization failed.",
        },
        {
          status:
            500,
        }
      );
    }
  
    /* =======================================================
       CACHE TRANSLATION INSIDE EXISTING JSON
  
       No SQL migration required.
    ======================================================= */
  
    const nextVisualAnalysis = {
      ...visualAnalysis,
  
      sourceLanguage,
  
      localizations: {
        ...localizations,
  
        [targetLanguage]: {
          sourceFingerprint,
  
          strengths:
            localized.strengths,
  
          weaknesses:
            localized.weaknesses,
  
          summary:
            localized.summary,
  
          redesignReason:
            localized.redesignReason,
  
          outreachAngle:
            localized.outreachAngle,
        },
      },
    };
  
    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "leads"
        )
        .update({
          visual_analysis:
            nextVisualAnalysis,
        })
        .eq(
          "id",
          lead.id
        )
        .eq(
          "user_id",
          user.id
        );
  
    if (
      updateError
    ) {
      console.error(
        "Could not cache visual analysis localization:",
        updateError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Localization was created but could not be saved.",
        },
        {
          status:
            500,
        }
      );
    }
  
    /* =======================================================
       DONE
    ======================================================= */
  
    return NextResponse.json({
      ok:
        true,
  
      language:
        targetLanguage,
  
      cached:
        false,
  
      narrative:
        localized,
    });
  }