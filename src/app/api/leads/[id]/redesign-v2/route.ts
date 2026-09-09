import {
    cookies,
  } from "next/headers";
  
  import {
    NextResponse,
  } from "next/server";
  
  import type {
    RedesignAnalysisContext,
  } from "@/lib/redesign-preview";
  
  import {
    extractRedesignSource,
  } from "@/lib/redesign-source";
  
  import {
    inspectRedesignSite,
    type RedesignSiteIntelligence,
  } from "@/lib/redesign-site-intelligence";
  
  import {
    generateSolStaticDesign,
  } from "@/lib/sol-static-design-engine";

import {
    buildDesignInspirationMemo,
    normalizeDesignModel,
    normalizeDesignReasoningEffort,
    normalizeMotionPreset,
    normalizeStringArray,
  } from "@/lib/design-generation-options";
  
  import {
    getStoredMaxiBestOfAccessToken,
  } from "@/lib/maxibestof-oauth";
  
  import {
    researchMaxiBestOfDesign,
  } from "@/lib/maxibestof-research";
  
  import {
    createClient,
  } from "@/lib/supabase/server";

  import {
    assertAiUsageAvailable,
    recordAiUsage,
  } from "@/lib/ai-usage";
  
  /* =========================================================
     CONFIG
  ========================================================= */
  
  export const runtime =
    "nodejs";
  
  export const maxDuration =
    300;
  
  export const dynamic =
    "force-dynamic";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type RouteContext = {
    params: Promise<{
      id:
        string;
    }>;
  };
  
  type PostBody = {
    regenerate?:
      unknown;

    designModel?:
      unknown;

    reasoningEffort?:
      unknown;

    inspirationMemo?:
      unknown;

    inspirationLinks?:
      unknown;

    inspirationImages?:
      unknown;

    motionPreset?:
      unknown;
  };
  
  type PatchBody = {
    previewId?:
      unknown;
  };
  
  type VariantRow = {
    id:
      string;
  
    generation_index:
      number;
  
    image_url:
      string;
  
    selected:
      boolean;
  
    selected_at:
      string
      | null;
  
    created_at:
      string;
  
    source_snapshot:
      unknown;
  };
  
  type CompanyRow = {
    id:
      string;
  
    name:
      string;
  
    website_url:
      string
      | null;
  
    industry:
      string
      | null;
  
    location:
      string
      | null;
  
    description:
      string
      | null;
  };
  
  type LeadRow = {
    id:
      string;
  
    analysis_status:
      string
      | null;
  
    research_summary:
      string
      | null;
  
    website_findings:
      unknown;
  
    visual_analysis:
      unknown;
  
    company:
      | CompanyRow
      | CompanyRow[]
      | null;
  };
  
  /* =========================================================
     HELPERS
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
  
  function isRecord(
    value:
      unknown
  ): value is Record<
    string,
    unknown
  > {
    return (
      typeof value ===
        "object" &&
      value !==
        null &&
      !Array.isArray(
        value
      )
    );
  }
  
  function getString(
    value:
      unknown
  ) {
    if (
      typeof value !==
        "string"
    ) {
      return null;
    }
  
    const cleaned =
      value.trim();
  
    return (
      cleaned ||
      null
    );
  }
  
  function createPreviewUrl(
    variantId:
      string
  ) {
    return `/design-preview/${encodeURIComponent(
      variantId
    )}`;
  }
  
  /* =========================================================
     STORED RESEARCH
  ========================================================= */
  
  function getStoredResearchMemo(
    value:
      unknown
  ) {
    if (
      !isRecord(
        value
      )
    ) {
      return null;
    }
  
    const directMemo =
      getString(
        value[
          "inspirationMemo"
        ]
      );
  
    if (
      directMemo
    ) {
      return directMemo;
    }
  
    const maxiResearch =
      value[
        "maxiBestOfResearch"
      ];
  
    if (
      isRecord(
        maxiResearch
      )
    ) {
      return getString(
        maxiResearch[
          "memo"
        ]
      );
    }
  
    return null;
  }
  
  function getStoredDirection(
    value:
      unknown
  ) {
    if (
      !isRecord(
        value
      )
    ) {
      return null;
    }
  
    return (
      getString(
        value[
          "direction"
        ]
      ) ??
      getString(
        value[
          "designDirection"
        ]
      ) ??
      null
    );
  }
  
  /* =========================================================
     VARIANT
  ========================================================= */
  
  function mapVariant(
    row:
      VariantRow
  ) {
    return {
      id:
        row.id,
  
      generationIndex:
        row
          .generation_index,
  
      previewUrl:
        createPreviewUrl(
          row.id
        ),
  
      chatId:
        `design-${row.id}`,
  
      selected:
        row.selected,
  
      selectedAt:
        row.selected_at,
  
      motionApplied:
        isRecord(
          row.source_snapshot
        ) &&
        isRecord(
          row.source_snapshot[
            "generationSettings"
          ]
        )
          ? row.source_snapshot[
              "generationSettings"
            ][
              "motionApplied"
            ] === true
          : false,
  
      motionSourceGenerationIndex:
        isRecord(
          row.source_snapshot
        ) &&
        isRecord(
          row.source_snapshot[
            "generationSettings"
          ]
        ) &&
        typeof row.source_snapshot[
          "generationSettings"
        ][
          "motionSourceGenerationIndex"
        ] === "number"
          ? row.source_snapshot[
              "generationSettings"
            ][
              "motionSourceGenerationIndex"
            ] as number
          : null,
  
      createdAt:
        row.created_at,
    };
  }
  
  /* =========================================================
     LOAD VARIANTS
  ========================================================= */
  
  async function loadVariantsForLead({
    supabase,
    userId,
    leadId,
  }: {
    supabase:
      Awaited<
        ReturnType<
          typeof createClient
        >
      >;
  
    userId:
      string;
  
    leadId:
      string;
  }) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .select(`
          id,
          generation_index,
          image_url,
          selected,
          selected_at,
          created_at,
          source_snapshot
        `)
        .eq(
          "user_id",
          userId
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
        );
  
    if (
      error
    ) {
      throw error;
    }
  
    const rows =
      (
        data ??
        []
      ) as
        VariantRow[];
  
    const variants =
      rows.map(
        mapVariant
      );
  
    const selected =
      variants.find(
        (
          variant
        ) =>
          variant.selected
      ) ??
      variants[0] ??
      null;
  
    let storedResearch:
      string
      | null =
      null;
  
    const previousDirections:
      string[] =
      [];
  
    for (
      const row of
        rows
    ) {
      if (
        !storedResearch
      ) {
        storedResearch =
          getStoredResearchMemo(
            row.source_snapshot
          );
      }
  
      const direction =
        getStoredDirection(
          row.source_snapshot
        );
  
      if (
        direction &&
        !previousDirections.includes(
          direction
        )
      ) {
        previousDirections.push(
          direction
        );
      }
    }
  
    return {
      rows,
  
      variants,
  
      selected,
  
      storedResearch,
  
      previousDirections,
  
      generationIndex:
        variants[0]
          ?.generationIndex ??
        0,
    };
  }
  
  /* =========================================================
     EMPTY SITE
  ========================================================= */
  
  function createEmptySite():
    RedesignSiteIntelligence {
    return {
      pages:
        [],
  
      primaryLogo:
        null,
  
      logoCandidates:
        [],
  
      teamImages:
        [],
  
      projectImages:
        [],
  
      contentImages:
        [],
  
      primaryBrandColor:
        null,
  
      brandColors:
        [],
  
      facts:
        [],
  
      services:
        [],
    };
  }
  
  /* =========================================================
     RESPONSE
  ========================================================= */
  
  function createVariantResponse(
    existing:
      Awaited<
        ReturnType<
          typeof loadVariantsForLead
        >
      >
  ) {
    return {
      ok:
        true,
  
      exists:
        existing
          .variants
          .length >
        0,
  
      generationIndex:
        existing
          .generationIndex,
  
      previewId:
        existing.selected
          ?.id ??
        null,
  
      previewUrl:
        existing.selected
          ?.previewUrl ??
        null,
  
      selectedPreviewId:
        existing.selected
          ?.id ??
        null,
  
      selectedPreviewUrl:
        existing.selected
          ?.previewUrl ??
        null,
  
      variants:
        existing.variants,
    };
  }
  
  /* =========================================================
     GET
  ========================================================= */
  
  export async function GET(
    _request:
      Request,
    {
      params,
    }:
      RouteContext
  ) {
    const {
      id:
        leadId,
    } =
      await params;
  
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
  
    try {
      const existing =
        await loadVariantsForLead({
          supabase,
  
          userId:
            user.id,
  
          leadId,
        });
  
      return NextResponse.json(
        createVariantResponse(
          existing
        )
      );
    } catch (
      error
    ) {
      console.error(
        "Could not load design variants:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not load design variants.",
        },
        {
          status:
            500,
        }
      );
    }
  }
  
  /* =========================================================
     POST
  ========================================================= */
  
  export async function POST(
    request:
      Request,
    {
      params,
    }:
      RouteContext
  ) {
    const {
      id:
        leadId,
    } =
      await params;
  
    let body:
      PostBody = {};
  
    try {
      body =
        (await request.json()) as
          PostBody;
    } catch {
      body = {};
    }
  
    const regenerate =
      body.regenerate ===
      true;

    const selectedDesignModel =
      normalizeDesignModel(
        body.designModel
      );

    const selectedReasoningEffort =
      normalizeDesignReasoningEffort(
        body.reasoningEffort,
        "high"
      );

    const selectedMotionPreset =
      normalizeMotionPreset(
        body.motionPreset,
        "none"
      );

    const inspirationMemo =
      getString(
        body.inspirationMemo
      );

    const inspirationLinks =
      normalizeStringArray(
        body.inspirationLinks
      );

    const inspirationImages =
      normalizeStringArray(
        body.inspirationImages
      );
  
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
       EXISTING
    ======================================================= */
  
    let existing:
      Awaited<
        ReturnType<
          typeof loadVariantsForLead
        >
      >;
  
    try {
      existing =
        await loadVariantsForLead({
          supabase,
  
          userId:
            user.id,
  
          leadId,
        });
    } catch (
      error
    ) {
      console.error(
        "Could not load existing design variants:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not load existing variants.",
        },
        {
          status:
            500,
        }
      );
    }
  
    if (
      existing
        .variants
        .length >
        0 &&
      !regenerate
    ) {
      return NextResponse.json({
        ...createVariantResponse(
          existing
        ),
  
        generated:
          false,
      });
    }
  
    /* =======================================================
       LEAD
    ======================================================= */
  
    const {
      data:
        leadData,
  
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
      !leadData
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
  
    const lead =
      leadData as
        LeadRow;
  
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
            "Analyze the website first.",
        },
        {
          status:
            400,
        }
      );
    }
  
    const generationIndex =
      existing
        .generationIndex +
      1;
  
    /* =======================================================
       SOURCE
    ======================================================= */
  
    let source:
      Awaited<
        ReturnType<
          typeof extractRedesignSource
        >
      >;
  
    try {
      source =
        await extractRedesignSource(
          company.website_url
        );
    } catch (
      error
    ) {
      console.error(
        "Could not extract redesign source:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The source website could not be prepared.",
        },
        {
          status:
            500,
        }
      );
    }
  
    /* =======================================================
       ANALYSIS
    ======================================================= */
  
    const analysis:
      RedesignAnalysisContext = {
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
       RESEARCH CACHE
    ======================================================= */
  
    let designResearch =
      existing.storedResearch;
  
    if (
      !designResearch
    ) {
      const {
        data:
          classicPreview,
  
        error:
          classicError,
      } =
        await supabase
          .from(
            "redesign_previews"
          )
          .select(
            "source_snapshot"
          )
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
        classicError
      ) {
        console.warn(
          "Could not load reusable MaxiBestOf research:",
          classicError
        );
      }
  
      designResearch =
        getStoredResearchMemo(
          classicPreview
            ?.source_snapshot
        );
    }
  
    /* =======================================================
       SITE + MAXIBESTOF
    ======================================================= */
  
    const sitePromise =
      inspectRedesignSite(
        source.finalUrl
      )
        .catch(
          (
            error
          ) => {
            console.warn(
              "Could not inspect redesign site. Continuing with homepage source only:",
              error
            );
  
            return createEmptySite();
          }
        );
  
    let researchPromise:
      Promise<
        string
        | null
      > =
      Promise.resolve(
        designResearch
      );
  
    if (
      !designResearch
    ) {
      const cookieStore =
        await cookies();
  
      const accessToken =
        getStoredMaxiBestOfAccessToken(
          cookieStore
        );
  
      if (
        accessToken
      ) {
        researchPromise =
          researchMaxiBestOfDesign({
            accessToken,
  
            source,
  
            company:
              analysis.company,
  
            researchSummary:
              analysis.researchSummary,
  
            visualAnalysis:
              analysis.visualAnalysis,
          })
            .then(
              (
                result
              ) =>
                result.text
            )
            .catch(
              (
                error
              ) => {
                console.warn(
                  "MaxiBestOf inspiration research failed. Continuing without external inspiration:",
                  error
                );
  
                return null;
              }
            );
      }
    }
  
    const [
      site,
      resolvedResearch,
    ] =
      await Promise.all([
        sitePromise,
        researchPromise,
      ]);
  
    designResearch =
      buildDesignInspirationMemo({
        baseResearch:
          resolvedResearch,

        inspirationMemo,

        inspirationLinks,

        inspirationImages,

        motionPreset:
          selectedMotionPreset,
      });
  
    /* =======================================================
       GPT-5.6 SOL
    ======================================================= */
  
    const variantId =
      crypto.randomUUID();
  
    let generated:
      Awaited<
        ReturnType<
          typeof generateSolStaticDesign
        >
      >;
  
    try {
      await assertAiUsageAvailable(user.id);

      generated =
        await generateSolStaticDesign({
          variantId,
  
          source,
  
          analysis,
  
          site,
  
          generationIndex,
  
          designResearch,
  
          previousDirections:
            existing.previousDirections,

          designModel:
            selectedDesignModel,

          reasoningEffort:
            selectedReasoningEffort,
        });
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Unknown Sol design generation error.";
  
      console.error(
        "Sol static design generation failed:",
        message
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            `Design generation failed: ${message}`,
        },
        {
          status:
            502,
        }
      );
    }
  
    await recordAiUsage({
      userId: user.id,
      feature: "design_generation",
      model: generated.model,
      usage: generated.usage,
      requestKey: `design-generation:${variantId}`,
      metadata: { leadId, variantId },
    });

    /* =======================================================
       SAVE
    ======================================================= */
  
    const firstVariant =
      existing
        .variants
        .length ===
      0;
  
    /*
     * Important:
     *
     * We deliberately ignore generated.previewUrl here.
     * Every Leadbase design uses /design-preview/:id.
     */
    const previewUrl =
      createPreviewUrl(
        variantId
      );
  
    const {
      data:
        saved,
  
      error:
        saveError,
    } =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .insert({
          id:
            variantId,
  
          user_id:
            user.id,
  
          lead_id:
            leadId,
  
          generation_index:
            generationIndex,
  
          image_url:
            previewUrl,
  
          prompt_snapshot:
            generated.promptSnapshot,
  
          source_snapshot: {
            ...(generated.snapshot as Record<
              string,
              unknown
            >),

            generationSettings: {
              model:
                selectedDesignModel,

              reasoningEffort:
                selectedReasoningEffort,

              motionPreset:
                selectedMotionPreset,

              inspirationMemo,

              inspirationLinks,

              inspirationImages,
            },
          },
  
          selected:
            firstVariant,
  
          selected_at:
            firstVariant
              ? new Date()
                  .toISOString()
              : null,
        })
        .select(`
          id,
          generation_index,
          image_url,
          selected,
          selected_at,
          created_at,
          source_snapshot
        `)
        .single();
  
    if (
      saveError ||
      !saved
    ) {
      console.error(
        "Could not save Sol design variant:",
        saveError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The design was generated, but could not be saved.",
        },
        {
          status:
            500,
        }
      );
    }
  
    const latest =
      await loadVariantsForLead({
        supabase,
  
        userId:
          user.id,
  
        leadId,
      });
  
    return NextResponse.json({
      ok:
        true,
  
      generated:
        true,
  
      previewId:
        saved.id,
  
      previewUrl,
  
      selectedPreviewId:
        latest.selected
          ?.id ??
        null,
  
      selectedPreviewUrl:
        latest.selected
          ?.previewUrl ??
        null,
  
      generationIndex:
        saved
          .generation_index,
  
      variants:
        latest.variants,
    });
  }
  
  /* =========================================================
     PATCH
  ========================================================= */
  
  export async function PATCH(
    request:
      Request,
    {
      params,
    }:
      RouteContext
  ) {
    const {
      id:
        leadId,
    } =
      await params;
  
    let body:
      PatchBody = {};
  
    try {
      body =
        (await request.json()) as
          PatchBody;
    } catch {
      body = {};
    }
  
    const previewId =
      typeof body.previewId ===
        "string" &&
      body.previewId.trim()
        ? body.previewId.trim()
        : null;
  
    if (
      !previewId
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "previewId is required.",
        },
        {
          status:
            400,
        }
      );
    }
  
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
  
    const {
      data:
        current,
  
      error:
        currentError,
    } =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .select(
          "id"
        )
        .eq(
          "id",
          previewId
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "lead_id",
          leadId
        )
        .maybeSingle();
  
    if (
      currentError ||
      !current
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Variant not found.",
        },
        {
          status:
            404,
        }
      );
    }
  
    const resetResult =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .update({
          selected:
            false,
  
          selected_at:
            null,
        })
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "lead_id",
          leadId
        );
  
    if (
      resetResult.error
    ) {
      console.error(
        "Could not reset selected design variant:",
        resetResult.error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not change selected variant.",
        },
        {
          status:
            500,
        }
      );
    }
  
    const selectResult =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .update({
          selected:
            true,
  
          selected_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          previewId
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "lead_id",
          leadId
        );
  
    if (
      selectResult.error
    ) {
      console.error(
        "Could not set selected design variant:",
        selectResult.error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not select this variant.",
        },
        {
          status:
            500,
        }
      );
    }
  
    const latest =
      await loadVariantsForLead({
        supabase,
  
        userId:
          user.id,
  
        leadId,
      });
  
    return NextResponse.json({
      ok:
        true,
  
      selectedPreviewId:
        latest.selected
          ?.id ??
        null,
  
      selectedPreviewUrl:
        latest.selected
          ?.previewUrl ??
        null,
  
      generationIndex:
        latest.generationIndex,
  
      variants:
        latest.variants,
    });
  }