import {
    revalidatePath,
  } from "next/cache";
  
  import {
    cookies,
  } from "next/headers";
  
  import {
    NextResponse,
  } from "next/server";
  
  import {
    getStoredMaxiBestOfAccessToken,
  } from "@/lib/maxibestof-oauth";
  
  import {
    researchMaxiBestOfDesign,
  } from "@/lib/maxibestof-research";
  
  import {
    generateRedesignPreview,
  } from "@/lib/redesign-preview";
  
  import {
    extractRedesignSource,
  } from "@/lib/redesign-source";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  import {
    captureWebsiteScreenshots,
  } from "@/lib/website-screenshot";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type RouteContext = {
    params: Promise<{
      id: string;
    }>;
  };
  
  type RequestBody = {
    regenerate?: unknown;
  };
  
  /* =========================================================
     RELATION
  ========================================================= */
  
  function getSingleRelation<T>(
    value:
      | T
      | T[]
      | null
  ): T | null {
    if (
      Array.isArray(
        value
      )
    ) {
      return (
        value[0] ??
        null
      );
    }
  
    return value;
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
    const {
      id:
        leadId,
    } =
      await params;
  
    let body:
      RequestBody = {};
  
    try {
      body =
        (await request.json()) as
          RequestBody;
    } catch {
      body = {};
    }
  
    const regenerate =
      body.regenerate ===
      true;
  
    const supabase =
      await createClient();
  
    /* =======================================================
       AUTH
    ======================================================= */
  
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
          analysis_status,
          visual_analysis_status,
          research_summary,
          website_findings,
          visual_analysis,
  
          company:companies (
            id,
            name,
            website_url,
            industry,
            location,
            description
          )
        `)
        .eq(
          "id",
          leadId
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();
  
    if (
      leadError ||
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
  
    const company =
      getSingleRelation(
        lead.company
      );
  
    if (
      !company
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Company not found.",
        },
        {
          status:
            404,
        }
      );
    }
  
    if (
      !company.website_url
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "This lead has no website.",
        },
        {
          status:
            400,
        }
      );
    }
  
    if (
      lead.analysis_status !==
      "COMPLETED"
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Analyze the website before generating a redesign.",
        },
        {
          status:
            400,
        }
      );
    }
  
    /* =======================================================
       PREVIOUS PREVIEW
    ======================================================= */
  
    const {
      data:
        previousPreview,
  
      error:
        previousPreviewError,
    } =
      await supabase
        .from(
          "redesign_previews"
        )
        .select(`
          id,
          public_token,
          generation_index,
          spec
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "lead_id",
          leadId
        )
        .order(
          "generation_index",
          {
            ascending:
              false,
          }
        )
        .limit(
          1
        )
        .maybeSingle();
  
    if (
      previousPreviewError
    ) {
      console.error(
        "Could not load previous redesign preview:",
        previousPreviewError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not load previous redesign preview.",
        },
        {
          status:
            500,
        }
      );
    }
  
    if (
      previousPreview &&
      !regenerate
    ) {
      return NextResponse.json({
        ok:
          true,
  
        generated:
          false,
  
        publicToken:
          previousPreview.public_token,
  
        previewUrl:
          `/preview/${previousPreview.public_token}`,
      });
    }
  
    /* =======================================================
       SOURCE WEBSITE
    ======================================================= */
  
    let source;
  
    try {
      source =
        await extractRedesignSource(
          company.website_url
        );
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Could not read website content.";
  
      console.error(
        "Could not extract redesign source:",
        message
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The website content could not be prepared for the redesign.",
        },
        {
          status:
            500,
        }
      );
    }
  
    /* =======================================================
       MAXIBESTOF CONNECTION
    ======================================================= */
  
    const cookieStore =
      await cookies();
  
    const maxiBestOfAccessToken =
      getStoredMaxiBestOfAccessToken(
        cookieStore
      );
  
    if (
      !maxiBestOfAccessToken
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "MaxiBestOf is not connected. Open /api/integrations/maxibestof/connect first.",
  
          connectUrl:
            "/api/integrations/maxibestof/connect",
        },
        {
          status:
            409,
        }
      );
    }
  
    /* =======================================================
       ANALYSIS CONTEXT
    ======================================================= */
  
    const analysisContext = {
      company: {
        name:
          company.name,
  
        industry:
          company.industry,
  
        location:
          company.location,
  
        description:
          company.description,
      },
  
      researchSummary:
        lead.research_summary,
  
      websiteFindings:
        lead.website_findings,
  
      visualAnalysis:
        lead.visual_analysis,
    };
  
    /* =======================================================
       MAXIBESTOF DESIGN RESEARCH
    ======================================================= */
  
    let designResearch;
  
    try {
      designResearch =
        await researchMaxiBestOfDesign({
          accessToken:
            maxiBestOfAccessToken,
  
          source,
  
          company:
            analysisContext.company,
  
          researchSummary:
            lead.research_summary,
  
          visualAnalysis:
            lead.visual_analysis,
        });
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "MaxiBestOf research failed.";
  
      console.error(
        "MaxiBestOf research failed:",
        message
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            `MaxiBestOf research failed: ${message}`,
        },
        {
          status:
            502,
        }
      );
    }
  
    /* =======================================================
       OPTIONAL SCREENSHOT
    ======================================================= */
  
    let desktopScreenshot:
      Buffer | null =
      null;
  
    try {
      const screenshots =
        await captureWebsiteScreenshots(
          company.website_url
        );
  
      desktopScreenshot =
        screenshots.desktop;
    } catch (
      error
    ) {
      console.warn(
        "Could not capture redesign reference screenshot:",
        error
      );
    }
  
    /* =======================================================
       GENERATE REDESIGN
    ======================================================= */
  
    let generated;
  
    try {
      generated =
        await generateRedesignPreview({
          source,
  
          analysis:
            analysisContext,
  
          designResearch:
            designResearch.text,
  
          previousSpec:
            regenerate
              ? previousPreview
                  ?.spec ??
                null
              : null,
  
          screenshot:
            desktopScreenshot,
        });
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Redesign generation failed.";
  
      console.error(
        "Redesign generation failed:",
        message
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The redesign could not be generated.",
        },
        {
          status:
            500,
        }
      );
    }
  
    /* =======================================================
       SAVE
    ======================================================= */
  
    const generationIndex =
      (
        previousPreview
          ?.generation_index ??
        0
      ) +
      1;
  
    const totalInputTokens =
      generated.usage
        .inputTokens +
      designResearch.usage
        .inputTokens;
  
    const totalOutputTokens =
      generated.usage
        .outputTokens +
      designResearch.usage
        .outputTokens;
  
    const totalTokens =
      generated.usage
        .totalTokens +
      designResearch.usage
        .totalTokens;
  
    const {
      data:
        preview,
  
      error:
        previewError,
    } =
      await supabase
        .from(
          "redesign_previews"
        )
        .insert({
          user_id:
            user.id,
  
          lead_id:
            leadId,
  
          generation_index:
            generationIndex,
  
          source_url:
            source.finalUrl,
  
          source_snapshot: {
            ...source,
  
            maxiBestOfResearch: {
              memo:
                designResearch.text,
  
              toolCalls:
                designResearch.toolCalls,
  
              model:
                designResearch.model,
  
              usage:
                designResearch.usage,
            },
          },
  
          spec:
            generated.spec,
  
          model:
            generated.model,
  
          input_tokens:
            totalInputTokens,
  
          output_tokens:
            totalOutputTokens,
  
          total_tokens:
            totalTokens,
        })
        .select(`
          id,
          public_token,
          generation_index,
          created_at
        `)
        .single();
  
    if (
      previewError ||
      !preview
    ) {
      console.error(
        "Could not save redesign preview:",
        previewError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The redesign was generated but could not be saved.",
        },
        {
          status:
            500,
        }
      );
    }
  
    revalidatePath(
      `/leads/${leadId}`
    );
  
    return NextResponse.json({
      ok:
        true,
  
      generated:
        true,
  
      publicToken:
        preview.public_token,
  
      previewUrl:
        `/preview/${preview.public_token}`,
  
      generationIndex:
        preview.generation_index,
  
      model:
        generated.model,
  
      maxiBestOf: {
        used:
          true,
  
        toolCalls:
          designResearch.toolCalls,
  
        researchModel:
          designResearch.model,
      },
  
      usage: {
        research:
          designResearch.usage,
  
        generation:
          generated.usage,
  
        total: {
          inputTokens:
            totalInputTokens,
  
          outputTokens:
            totalOutputTokens,
  
          totalTokens,
        },
      },
    });
  }