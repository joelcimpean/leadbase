import OpenAI from "openai";
import { load } from "cheerio";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  normalizeDesignModel,
  normalizeDesignReasoningEffort,
  normalizeMotionPreset,
} from "@/lib/design-generation-options";
import { createClient } from "@/lib/supabase/server";
import { assertAiUsageAvailable, recordAiUsage, releaseAiUsageReservation } from "@/lib/ai-usage";
import {
  assertPlanAiSelectionAvailable,
  isPlanAccessError,
  planAccessMessage,
} from "@/lib/plan-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type RequestBody = {
  designModel?: unknown;
  reasoningEffort?: unknown;
  motionPreset?: unknown;
};

type StaticDesignSnapshot = {
  version: 3;
  renderMode: "html";
  html: string;
  [key: string]: unknown;
};

type MotionPlan = {
  revealDistancePx: number;
  revealDurationMs: number;
  revealScale: number;
  staggerMs: number;
  hoverLiftPx: number;
  hoverScale: number;
  easing: string;
  imageRevealDistancePx: number;
  imageRevealScale: number;
  revealRangePercent: number;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getSnapshot(
  value: unknown
): StaticDesignSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value.version !== 3 ||
    value.renderMode !== "html" ||
    typeof value.html !== "string" ||
    !value.html.trim()
  ) {
    return null;
  }

  return value as StaticDesignSnapshot;
}

function clamp(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      parsed
    )
  );
}

function safeEasing(
  value: unknown
) {
  if (
    typeof value === "string" &&
    /^cubic-bezier\(\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*,\s*-?\d*\.?\d+\s*\)$/i.test(
      value.trim()
    )
  ) {
    return value.trim();
  }

  return "cubic-bezier(.16,1,.3,1)";
}

function defaultMotionPlan(
  preset: "none" | "subtle" | "premium"
): MotionPlan {
  if (preset === "subtle") {
    return {
      revealDistancePx: 18,
      revealDurationMs: 720,
      revealScale: 0.992,
      staggerMs: 45,
      hoverLiftPx: 2,
      hoverScale: 1.005,
      easing: "cubic-bezier(.16,1,.3,1)",
      imageRevealDistancePx: 22,
      imageRevealScale: 0.985,
      revealRangePercent: 28,
    };
  }

  return {
    revealDistancePx: 36,
    revealDurationMs: 1040,
    revealScale: 0.978,
    staggerMs: 82,
    hoverLiftPx: 6,
    hoverScale: 1.018,
    easing: "cubic-bezier(.16,1,.3,1)",
    imageRevealDistancePx: 48,
    imageRevealScale: 0.955,
    revealRangePercent: 38,
  };
}

function extractJson(
  value: string
) {
  const cleaned =
    value
      .trim()
      .replace(
        /^```(?:json)?\s*/i,
        ""
      )
      .replace(
        /```\s*$/i,
        ""
      );

  const start =
    cleaned.indexOf("{");

  const end =
    cleaned.lastIndexOf("}");

  if (
    start < 0 ||
    end <= start
  ) {
    return null;
  }

  try {
    return JSON.parse(
      cleaned.slice(
        start,
        end + 1
      )
    ) as unknown;
  } catch {
    return null;
  }
}

function normalizeMotionPlan({
  value,
  fallback,
}: {
  value: unknown;
  fallback: MotionPlan;
}): MotionPlan {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    revealDistancePx:
      clamp(
        value.revealDistancePx,
        8,
        64,
        fallback.revealDistancePx
      ),
    revealDurationMs:
      Math.round(
        clamp(
          value.revealDurationMs,
          420,
          1600,
          fallback.revealDurationMs
        )
      ),
    revealScale:
      clamp(
        value.revealScale,
        0.94,
        1,
        fallback.revealScale
      ),
    staggerMs:
      Math.round(
        clamp(
          value.staggerMs,
          0,
          160,
          fallback.staggerMs
        )
      ),
    hoverLiftPx:
      clamp(
        value.hoverLiftPx,
        0,
        8,
        fallback.hoverLiftPx
      ),
    hoverScale:
      clamp(
        value.hoverScale,
        1,
        1.04,
        fallback.hoverScale
      ),
    easing:
      safeEasing(
        value.easing
      ),
    imageRevealDistancePx:
      clamp(
        value.imageRevealDistancePx,
        8,
        72,
        fallback.imageRevealDistancePx
      ),
    imageRevealScale:
      clamp(
        value.imageRevealScale,
        0.92,
        1,
        fallback.imageRevealScale
      ),
    revealRangePercent:
      Math.round(
        clamp(
          value.revealRangePercent,
          18,
          48,
          fallback.revealRangePercent
        )
      ),
  };
}

function strengthenMotionPlan({
  plan,
  preset,
}: {
  plan: MotionPlan;
  preset:
    | "none"
    | "subtle"
    | "premium";
}): MotionPlan {
  if (
    preset !==
    "premium"
  ) {
    return plan;
  }

  return {
    ...plan,
    revealDistancePx:
      Math.max(
        32,
        plan.revealDistancePx
      ),
    revealDurationMs:
      Math.max(
        900,
        plan.revealDurationMs
      ),
    staggerMs:
      Math.max(
        64,
        plan.staggerMs
      ),
    hoverLiftPx:
      Math.max(
        5,
        plan.hoverLiftPx
      ),
    hoverScale:
      Math.max(
        1.014,
        plan.hoverScale
      ),
    imageRevealDistancePx:
      Math.max(
        42,
        plan.imageRevealDistancePx
      ),
    imageRevealScale:
      Math.min(
        0.97,
        plan.imageRevealScale
      ),
    revealRangePercent:
      Math.max(
        34,
        plan.revealRangePercent
      ),
  };
}

function buildMotionCss(
  plan: MotionPlan
) {
  return `
html {
  scroll-behavior: smooth !important;
  scroll-padding-top: 24px;
}

body {
  scroll-behavior: smooth !important;
}

.leadbase-motion-reveal {
  opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
  /*
   * Only compositing properties are animated. translate and
   * scale are individual transform properties, so an approved
   * design's existing transform/layout remains untouched.
   */
  .leadbase-motion-runtime
  .leadbase-motion-reveal {
    opacity: .001;
    translate: 0 ${plan.revealDistancePx}px;
    scale: ${plan.revealScale};
    transition:
      opacity ${plan.revealDurationMs}ms ${plan.easing},
      translate ${plan.revealDurationMs}ms ${plan.easing},
      scale ${plan.revealDurationMs}ms ${plan.easing};
    transition-delay:
      var(--leadbase-motion-delay, 0ms);
    will-change: opacity, translate, scale;
  }

  .leadbase-motion-runtime
  .leadbase-motion-image {
    translate: 0 ${plan.imageRevealDistancePx}px;
    scale: ${plan.imageRevealScale};
  }

  .leadbase-motion-runtime
  .leadbase-motion-reveal.leadbase-motion-visible {
    opacity: 1;
    translate: 0 0;
    scale: 1;
  }

  body :is(
    a,
    button,
    [role="button"],
    article,
    figure,
    [class*="card"],
    [class*="Card"]
  ) {
    transition:
      translate 420ms ${plan.easing},
      scale 420ms ${plan.easing},
      box-shadow 420ms ${plan.easing},
      border-color 420ms ${plan.easing},
      background-color 420ms ${plan.easing},
      opacity 420ms ${plan.easing};
  }

  body :is(
    a,
    button,
    [role="button"],
    article,
    figure,
    [class*="card"],
    [class*="Card"]
  ):hover {
    translate: 0 -${plan.hoverLiftPx}px;
    scale: ${plan.hoverScale};
  }

  img,
  picture,
  figure,
  video {
    transform-origin: center center;
  }
}

@media (prefers-reduced-motion: reduce) {
  html,
  body {
    scroll-behavior: auto !important;
  }

  .leadbase-motion-reveal {
    opacity: 1 !important;
    translate: none !important;
    scale: 1 !important;
    transition: none !important;
  }
}
  `.trim();
}

function addRevealTargets({
  html,
  staggerMs,
}: {
  html: string;
  staggerMs: number;
}) {
  const $ =
    load(
      html,
      {
        xmlMode: false,
      }
    );

  $(
    "style[data-leadbase-motion-enhancement]"
  ).remove();

  $(
    ".leadbase-motion-reveal"
  )
    .removeClass(
      "leadbase-motion-reveal"
    )
    .removeClass(
      "leadbase-motion-image"
    );

  const selectors = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "blockquote",
    "ul",
    "ol",
    "form",
    "article",
    "figure",
    "picture",
    "img",
    "video",
    "section > div",
    "section > header",
    "section > aside",
    "section > a",
    "footer > div",
    '[class*="card"]',
    '[class*="Card"]',
    '[class*="grid"] > *',
    '[class*="Grid"] > *',
  ];

  let index = 0;

  $(
    selectors.join(",")
  ).each(
    (_, element) => {
      const current =
        $(element);

      if (
        current.closest(
          "nav"
        ).length > 0
      ) {
        return;
      }

      if (
        current.is("img") &&
        current.closest(
          "figure, picture"
        ).length > 0
      ) {
        return;
      }

      const authoredStyle =
        current.attr(
          "style"
        ) ??
        "";

      // Preserve authored transforms/translate/scale exactly. Motion
      // enhancement must never move an element whose design already
      // relies on those properties.
      if (
        /(?:^|;)\s*(?:transform|translate|scale)\s*:/i.test(
          authoredStyle
        )
      ) {
        return;
      }

      current.addClass(
        "leadbase-motion-reveal"
      );

      if (
        current.is(
          "img,picture,figure,video"
        ) ||
        current.find(
          "img,picture,video"
        ).length > 0
      ) {
        current.addClass(
          "leadbase-motion-image"
        );
      }

      const existingStyle =
        authoredStyle;

      const delay =
        Math.min(
          420,
          index *
            staggerMs
        );

      current.attr(
        "style",
        `${existingStyle}${existingStyle.trim() ? ";" : ""}--leadbase-motion-delay:${delay}ms;`
      );

      index += 1;
    }
  );

  return $.html();
}

function injectMotionEnhancement({
  html,
  css,
  staggerMs,
}: {
  html: string;
  css: string;
  staggerMs: number;
}) {
  const prepared =
    addRevealTargets({
      html,
      staggerMs,
    });

  const style =
    `<style data-leadbase-motion-enhancement>\n${css}\n</style>`;

  if (/<\/head>/i.test(prepared)) {
    return prepared.replace(
      /<\/head>/i,
      `${style}\n</head>`
    );
  }

  return `${style}\n${prepared}`;
}

function compactHtmlForMotionPrompt(
  html: string
) {
  return html
    .replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      "<style>[existing styles omitted]</style>"
    )
    .replace(
      /\s{2,}/g,
      " "
    )
    .slice(
      0,
      45_000
    );
}

async function createMotionPlan({
  model,
  reasoningEffort,
  motionPreset,
  html,
}: {
  model: string;
  reasoningEffort:
    | "low"
    | "medium"
    | "high";
  motionPreset:
    | "none"
    | "subtle"
    | "premium";
  html: string;
}) {
  const fallback =
    defaultMotionPlan(
      motionPreset
    );

  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      plan: fallback,
      model: null,
      durationMs: 0,
      usedAi: false,
    };
  }

  const openai =
    new OpenAI({
      apiKey,
      maxRetries: 1,
    });

  const prompt = `
You are Leadbase's motion director.

Analyze the EXISTING approved website HTML below and choose motion parameters for it.

You are NOT redesigning the website.
You are NOT changing layout, text, colors, images, typography, spacing, z-index, dimensions, or DOM structure.
You are choosing motion parameters only.

The final implementation will automatically apply:
- smooth scroll
- scroll-driven appear animations to headings, paragraphs, cards and content blocks
- appear animations to images, picture elements, figures and video
- tasteful hover lift/scale
- prefers-reduced-motion support

Choose parameters that fit the visual language of this specific website.

Motion preset requested: ${motionPreset}

IMPORTANT:
- do not use blur or filter effects
- do not hide content permanently
- do not create infinite animations
- motion should feel premium and immediately noticeable when scrolling
- images should have a slightly richer reveal than text
- preserve readability
- keep layout stable

Return ONLY valid JSON with exactly these keys:
{
  "revealDistancePx": number,
  "revealDurationMs": number,
  "revealScale": number,
  "staggerMs": number,
  "hoverLiftPx": number,
  "hoverScale": number,
  "easing": "cubic-bezier(...)",
  "imageRevealDistancePx": number,
  "imageRevealScale": number,
  "revealRangePercent": number
}

Existing HTML:
${compactHtmlForMotionPrompt(html)}
  `.trim();

  const startedAt =
    Date.now();

  try {
    const response =
      await openai.responses.create({
        model,
        reasoning: {
          effort:
            reasoningEffort,
        },
        max_output_tokens:
          1800,
        store:
          false,
        input:
          prompt,
      });

    const parsed =
      extractJson(
        response.output_text ??
          ""
      );

    return {
      plan:
        normalizeMotionPlan({
          value: parsed,
          fallback,
        }),
      model,
      durationMs:
        Date.now() -
        startedAt,
      usedAi: true,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  } catch (error) {
    console.warn(
      "AI motion planning failed; using safe fallback:",
      error
    );

    return {
      plan: fallback,
      model,
      durationMs:
        Date.now() -
        startedAt,
      usedAi: false,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const { id: previewId } =
    await params;

  let body: RequestBody = {};

  try {
    body =
      (await request.json()) as
        RequestBody;
  } catch {
    body = {};
  }

  const model =
    normalizeDesignModel(
      body.designModel
    );

  const reasoningEffort =
    normalizeDesignReasoningEffort(
      body.reasoningEffort,
      "medium"
    );

  const motionPreset =
    normalizeMotionPreset(
      body.motionPreset,
      "premium"
    );

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    await assertPlanAiSelectionAvailable(user.id, {
      feature: "design_motion",
      model,
      reasoningEffort,
    });
  } catch (error) {
    if (isPlanAccessError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            planAccessMessage(error, "en") ??
            "Enhance Motion is not included in your plan.",
        },
        { status: 403 }
      );
    }
    throw error;
  }

  const {
    data: variant,
    error: variantError,
  } =
    await supabase
      .from("design_mockup_variants")
      .select(`
        id,
        user_id,
        lead_id,
        generation_index,
        image_url,
        prompt_snapshot,
        source_snapshot,
        selected
      `)
      .eq("id", previewId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (variantError || !variant) {
    return NextResponse.json(
      {
        ok: false,
        error: "Design variation not found.",
      },
      { status: 404 }
    );
  }

  const snapshot =
    getSnapshot(
      variant.source_snapshot
    );

  if (!snapshot) {
    return NextResponse.json(
      {
        ok: false,
        error: "This design cannot be motion-enhanced.",
      },
      { status: 400 }
    );
  }

  const usageGuard = await assertAiUsageAvailable(user.id, {
    feature: "design_motion",
    model,
    reasoningEffort,
    metadata: { previewId, leadId: variant.lead_id },
  });

  const {
    plan,
    model:
      motionModel,
    durationMs:
      motionGenerationMs,
    usedAi,
    usage: motionUsage,
  } =
    await createMotionPlan({
      model,
      reasoningEffort,
      motionPreset,
      html:
        snapshot.html,
    });

  if (usedAi) {
    await recordAiUsage({
      userId: user.id,
      feature: "design_motion",
      model: motionModel,
      usage: motionUsage,
      requestKey: `design-motion:${previewId}:${Date.now()}`,
      reservationKey: usageGuard.reservationKey,
      metadata: { previewId, leadId: variant.lead_id },
    });
  } else {
    await releaseAiUsageReservation(user.id, usageGuard.reservationKey);
  }

  const finalPlan =
    strengthenMotionPlan({
      plan,
      preset:
        motionPreset,
    });

  const nextHtml =
    injectMotionEnhancement({
      html:
        snapshot.html,
      css:
        buildMotionCss(
          finalPlan
        ),
      staggerMs:
        finalPlan.staggerMs,
    });

  const currentSettings =
    isRecord(
      snapshot.generationSettings
    )
      ? snapshot.generationSettings
      : {};

  const inheritedMotionSourceGenerationIndex =
    typeof currentSettings[
      "motionSourceGenerationIndex"
    ] === "number"
      ? Number(
          currentSettings[
            "motionSourceGenerationIndex"
          ]
        )
      : null;

  const motionSourceGenerationIndex =
    inheritedMotionSourceGenerationIndex ??
    variant.generation_index;

  const nextSnapshot = {
    ...snapshot,
    html:
      nextHtml,
    generationSettings: {
      ...currentSettings,
      motionPreset,
      motionApplied:
        true,
      motionEngine:
        "leadbase-ai-motion-v3",
      motionModel,
      motionReasoningEffort:
        reasoningEffort,
      motionGenerationMs,
      motionUsedAi:
        usedAi,
      motionPlan:
        finalPlan,
      motionEnhancedAt:
        new Date().toISOString(),
      motionSourcePreviewId:
        previewId,
      motionSourceGenerationIndex,
    },
  };

  /* =======================================================
     SAVE IN PLACE

     Enhance Motion is an effect pass on the selected design,
     not a redesign/new variation. Content, layout and variant ID
     stay the same.
  ======================================================= */

  const {
    error: updateError,
  } =
    await supabase
      .from("design_mockup_variants")
      .update({
        source_snapshot:
          nextSnapshot,
      })
      .eq("id", previewId)
      .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Motion could not be saved to this design.",
      },
      { status: 500 }
    );
  }

  /* =======================================================
     LIVE CUSTOMER PREVIEW SYNC

     If this variation already has a client link, update it now.
     The previous GIF is invalidated instead of being silently
     reused; the next manual/Bulk GIF render captures this HTML.
  ======================================================= */

  const {
    data: publicPreviews,
    error: publicPreviewError,
  } =
    await supabase
      .from("design_public_previews")
      .select("id, public_slug")
      .eq("user_id", user.id)
      .eq("design_mockup_variant_id", previewId)
      .is("revoked_at", null);

  if (!publicPreviewError && publicPreviews?.length) {
    const { error: syncError } =
      await supabase
        .from("design_public_previews")
        .update({
          source_snapshot:
            nextSnapshot,
          preview_gif_status:
            "NOT_GENERATED",
          // Keep the stale storage path internally so the next GIF
          // render can delete that old object after the fresh one is saved.
          preview_gif_url:
            null,
          preview_gif_generated_at:
            null,
          preview_gif_error:
            null,
          preview_gif_bytes:
            null,
        })
        .in(
          "id",
          publicPreviews.map((preview) => preview.id)
        );

    if (syncError) {
      console.warn(
        "Motion saved, but the linked customer preview could not be refreshed:",
        syncError
      );
    } else {
      for (const preview of publicPreviews) {
        if (preview.public_slug) {
          revalidatePath(
            `/concept/${preview.public_slug}`
          );
        }
      }
    }
  }

  revalidatePath(
    `/design-preview/${previewId}`
  );

  return NextResponse.json({
    ok: true,
    previewId,
    sourcePreviewId:
      previewId,
    generationIndex:
      variant.generation_index,
    sourceGenerationIndex:
      motionSourceGenerationIndex,
    motionPreset,
    motionModel,
    motionGenerationMs,
    motionUsedAi:
      usedAi,
    updatedInPlace:
      true,
  });
}
