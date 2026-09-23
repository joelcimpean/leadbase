import "server-only";

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

export type CallPrepLanguage =
  | "de"
  | "en";

export type GenerateCallPrepInput = {
  language:
    CallPrepLanguage;

  companyName:
    string;

  companyDescription?:
    | string
    | null;

  industry?:
    | string
    | null;

  location?:
    | string
    | null;

  websiteUrl?:
    | string
    | null;

  contactName?:
    | string
    | null;

  contactJobTitle?:
    | string
    | null;

  leadStatus?:
    | string
    | null;

  priority?:
    | string
    | null;

  notes?:
    | string
    | null;

  researchSummary?:
    | string
    | null;

  websiteContext?:
    | string
    | null;

  outreachContext?:
    | string
    | null;

  conversationContext?:
    | string
    | null;

  latestReplyContext?:
    | string
    | null;

  previewContext?:
    | string
    | null;
};

export type GeneratedCallPrep = {
  summary:
    string;

  currentSituation:
    string;

  talkingPoints:
    string[];

  discoveryQuestions:
    string[];

  likelyObjections: Array<{
    objection:
      string;

    response:
      string;
  }>;

  cautionNotes:
    string[];

  nextStep:
    string;

  model:
    string;

  usage: {
    inputTokens:
      number;

    outputTokens:
      number;

    totalTokens:
      number;
  };
};

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_MODEL =
  "gpt-5.6-luna";

/* =========================================================
   SCHEMA
========================================================= */

const CallPrepSchema =
  z.object({
    summary:
      z
        .string()
        .min(1)
        .max(700),

    currentSituation:
      z
        .string()
        .min(1)
        .max(700),

    talkingPoints:
      z
        .array(
          z
            .string()
            .min(1)
            .max(260)
        )
        .min(3)
        .max(6),

    discoveryQuestions:
      z
        .array(
          z
            .string()
            .min(1)
            .max(240)
        )
        .min(3)
        .max(6),

    likelyObjections:
      z
        .array(
          z.object({
            objection:
              z
                .string()
                .min(1)
                .max(220),

            response:
              z
                .string()
                .min(1)
                .max(360),
          })
        )
        .min(1)
        .max(5),

    cautionNotes:
      z
        .array(
          z
            .string()
            .min(1)
            .max(240)
        )
        .max(4),

    nextStep:
      z
        .string()
        .min(1)
        .max(420),
  });

/* =========================================================
   HELPERS
========================================================= */

function createOpenAIClient() {
  const apiKey =
    process.env
      .OPENAI_API_KEY;

  if (
    !apiKey
  ) {
    throw new Error(
      "OPENAI_API_KEY is missing from the environment."
    );
  }

  return new OpenAI({
    apiKey,
  });
}

function optionalSection(
  title:
    string,
  value:
    | string
    | null
    | undefined
) {
  const clean =
    value?.trim();

  if (
    !clean
  ) {
    return null;
  }

  return `${title}:\n${clean}`;
}

function normalizeText(
  value:
    string
) {
  return value
    .replace(
      /\r\n/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

/* =========================================================
   GENERATE
========================================================= */

export async function generateCallPrep(
  input:
    GenerateCallPrepInput
): Promise<GeneratedCallPrep> {
  const openai =
    createOpenAIClient();

  const model =
    process.env
      .OPENAI_CALL_PREP_MODEL
      ?.trim() ||
    DEFAULT_MODEL;

  const languageInstruction =
    input.language ===
    "en"
      ? "Write all output in natural English."
      : "Schreibe die gesamte Ausgabe auf natürlichem Deutsch.";

  const context = [
    optionalSection(
      "Company",
      input.companyName
    ),

    optionalSection(
      "Company description",
      input.companyDescription
    ),

    optionalSection(
      "Industry",
      input.industry
    ),

    optionalSection(
      "Location",
      input.location
    ),

    optionalSection(
      "Website",
      input.websiteUrl
    ),

    optionalSection(
      "Contact",
      input.contactName
    ),

    optionalSection(
      "Contact role",
      input.contactJobTitle
    ),

    optionalSection(
      "Lead status",
      input.leadStatus
    ),

    optionalSection(
      "Priority",
      input.priority
    ),

    optionalSection(
      "Joel's notes",
      input.notes
    ),

    optionalSection(
      "Research summary",
      input.researchSummary
    ),

    optionalSection(
      "Website analysis",
      input.websiteContext
    ),

    optionalSection(
      "Sent outreach",
      input.outreachContext
    ),

    optionalSection(
      "Email conversation",
      input.conversationContext
    ),

    optionalSection(
      "Latest reply intelligence",
      input.latestReplyContext
    ),

    optionalSection(
      "Preview behavior",
      input.previewContext
    ),
  ]
    .filter(Boolean)
    .join(
      "\n\n"
    );

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
You prepare the signed-in Leadbase user for a real sales/discovery call with a potential client.

${languageInstruction}

The preparation is private internal guidance for Joel. It must be concise, practical and grounded only in the supplied context.

Rules:
- Never invent facts about the company, contact, budget, needs, competitors or buying intent.
- Distinguish observed facts from reasonable conversation strategy.
- Do not claim the prospect saw or liked something unless preview/reply data actually supports it.
- Do not be aggressive, manipulative or fear-based.
- Do not insult the prospect's current website.
- Treat the existing website as the basis and the redesign as a possible direction.
- Focus on understanding the prospect first, not immediately closing the deal.
- Talking points should connect to the actual research, outreach and reply context.
- Discovery questions should be open, natural and useful in a real call.
- Objection responses should sound calm and human, not scripted.
- Caution notes are only for things Joel should avoid assuming or saying. Return an empty array if there are none.
- The next step should be one realistic action to aim for at the end of the call.
- No markdown inside fields.
          `.trim(),
        },

        {
          role:
            "user",

          content: `
Prepare the call using only this context:

${context}
          `.trim(),
        },
      ],

      text: {
        format:
          zodTextFormat(
            CallPrepSchema,
            "call_prep"
          ),
      },
    });

  const parsed =
    response.output_parsed;

  if (
    !parsed
  ) {
    throw new Error(
      "Call prep generation returned no structured result."
    );
  }

  return {
    summary:
      normalizeText(
        parsed.summary
      ),

    currentSituation:
      normalizeText(
        parsed.currentSituation
      ),

    talkingPoints:
      parsed.talkingPoints.map(
        normalizeText
      ),

    discoveryQuestions:
      parsed.discoveryQuestions.map(
        normalizeText
      ),

    likelyObjections:
      parsed.likelyObjections.map(
        (
          item
        ) => ({
          objection:
            normalizeText(
              item.objection
            ),

          response:
            normalizeText(
              item.response
            ),
        })
      ),

    cautionNotes:
      parsed.cautionNotes.map(
        normalizeText
      ),

    nextStep:
      normalizeText(
        parsed.nextStep
      ),

    model,

    usage: {
      inputTokens:
        response.usage
          ?.input_tokens ??
        0,

      outputTokens:
        response.usage
          ?.output_tokens ??
        0,

      totalTokens:
        response.usage
          ?.total_tokens ??
        0,
    },
  };
}
