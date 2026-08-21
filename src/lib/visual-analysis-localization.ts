import "server-only";

import {
  createHash,
} from "node:crypto";

import OpenAI from "openai";

import {
  zodTextFormat,
} from "openai/helpers/zod";

import {
  z,
} from "zod";

/* =========================================================
   TYPES
========================================================= */

export type VisualAnalysisLanguage =
  | "de"
  | "en";

export type VisualNarrative = {
  strengths: string[];

  weaknesses: string[];

  summary: string;

  redesignReason: string;

  outreachAngle: string;
};

/* =========================================================
   SCHEMA
========================================================= */

const VisualNarrativeSchema =
  z.object({
    strengths:
      z.array(
        z.string()
      ),

    weaknesses:
      z.array(
        z.string()
      ),

    summary:
      z.string(),

    redesignReason:
      z.string(),

    outreachAngle:
      z.string(),
  });

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

function getString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : "";
}

function getStringArray(
  value: unknown
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item ===
      "string"
  );
}

/* =========================================================
   EXTRACT NARRATIVE
========================================================= */

export function extractVisualNarrative(
  value: unknown
): VisualNarrative {
  const record =
    getRecord(
      value
    );

  if (
    !record
  ) {
    return {
      strengths:
        [],

      weaknesses:
        [],

      summary:
        "",

      redesignReason:
        "",

      outreachAngle:
        "",
    };
  }

  return {
    strengths:
      getStringArray(
        record.strengths
      ),

    weaknesses:
      getStringArray(
        record.weaknesses
      ),

    summary:
      getString(
        record.summary
      ),

    redesignReason:
      getString(
        record.redesignReason
      ),

    outreachAngle:
      getString(
        record.outreachAngle
      ),
  };
}

/* =========================================================
   EMPTY CHECK
========================================================= */

export function hasVisualNarrative(
  narrative:
    VisualNarrative
) {
  return Boolean(
    narrative
      .strengths
      .length >
      0 ||
      narrative
        .weaknesses
        .length >
        0 ||
      narrative.summary.trim() ||
      narrative
        .redesignReason
        .trim() ||
      narrative
        .outreachAngle
        .trim()
  );
}

/* =========================================================
   FINGERPRINT

   Used to detect whether the original analysis changed.
   If the website is analyzed again, old translations will
   automatically be considered stale.
========================================================= */

export function createVisualNarrativeFingerprint(
  narrative:
    VisualNarrative
) {
  return createHash(
    "sha256"
  )
    .update(
      JSON.stringify(
        narrative
      )
    )
    .digest(
      "hex"
    );
}

/* =========================================================
   LOCALIZATION
========================================================= */

export async function localizeVisualNarrative({
  narrative,
  sourceLanguage,
  targetLanguage,
}: {
  narrative:
    VisualNarrative;

  sourceLanguage:
    VisualAnalysisLanguage;

  targetLanguage:
    VisualAnalysisLanguage;
}): Promise<VisualNarrative> {
  if (
    sourceLanguage ===
    targetLanguage
  ) {
    return narrative;
  }

  if (
    !hasVisualNarrative(
      narrative
    )
  ) {
    return narrative;
  }

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

  const targetLanguageName =
    targetLanguage ===
    "de"
      ? "German"
      : "English";

  const sourceLanguageName =
    sourceLanguage ===
    "de"
      ? "German"
      : "English";

  const response =
    await openai.responses.parse({
      model:
        process.env
          .OPENAI_TRANSLATION_MODEL ??
        "gpt-5-mini",

      reasoning: {
        effort:
          "low",
      },

      input: [
        {
          role:
            "system",

          content: `
You are localizing a professional website-analysis report for a lead-generation application.

Translate and localize the supplied analysis from ${sourceLanguageName} into natural, professional ${targetLanguageName}.

This is NOT a new website analysis.

STRICT RULES:

- Preserve every factual claim.
- Preserve the meaning of every strength and weakness.
- Do not invent new observations.
- Do not remove important observations.
- Do not make criticism harsher or softer.
- Do not change scores or numerical implications.
- Do not introduce new sales claims.
- Preserve company names, brand names, URLs, product names and proper nouns.
- Keep the approximate level of detail of the source.
- Use natural business language in the target language.
- Do not translate mechanically word for word when a more natural professional formulation exists.
- Keep the tone concise, analytical, respectful and useful for a professional web designer.
- Never insult the company or its website.
- Return the same information structure as the source.

FIELD GUIDANCE:

strengths:
Translate each existing strength individually.

weaknesses:
Translate each existing weakness individually.

summary:
Write a natural localized version of the same visual summary.

redesignReason:
Write a natural localized version of the same redesign reasoning.

outreachAngle:
Localize the suggested outreach angle while preserving the exact strategic idea.

If an input field is empty, keep the corresponding output field empty.
          `.trim(),
        },

        {
          role:
            "user",

          content:
            JSON.stringify(
              narrative
            ),
        },
      ],

      text: {
        format:
          zodTextFormat(
            VisualNarrativeSchema,
            "visual_analysis_localization"
          ),
      },
    });

  const localized =
    response.output_parsed;

  if (
    !localized
  ) {
    throw new Error(
      "OpenAI did not return a localized visual analysis."
    );
  }

  return {
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
  };
}