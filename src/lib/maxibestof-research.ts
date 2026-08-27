import "server-only";

import OpenAI from "openai";

import {
  MAXIBESTOF_MCP_URL,
} from "@/lib/maxibestof-oauth";

import {
  type RedesignSource,
} from "@/lib/redesign-source";

/* =========================================================
   TYPES
========================================================= */

type CompanyContext = {
  name:
    string;

  industry:
    | string
    | null;

  location:
    | string
    | null;

  description:
    | string
    | null;
};

export type MaxiBestOfDesignResearch = {
  text:
    string;

  model:
    string;

  toolCalls:
    string[];

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
   HELPERS
========================================================= */

function uniqueStrings(
  values:
    string[]
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
      value.trim();

    if (
      !cleaned ||
      seen.has(
        cleaned
      )
    ) {
      continue;
    }

    seen.add(
      cleaned
    );

    result.push(
      cleaned
    );
  }

  return result;
}

function compactJson(
  value:
    unknown,
  maxLength =
    5_000
) {
  const serialized =
    JSON.stringify(
      value
    );

  if (
    serialized.length <=
    maxLength
  ) {
    return serialized;
  }

  return `${serialized.slice(
    0,
    maxLength
  )}…`;
}

/* =========================================================
   RESEARCH
========================================================= */

export async function researchMaxiBestOfDesign({
  accessToken,
  source,
  company,
  researchSummary,
  visualAnalysis,
}: {
  accessToken:
    string;

  source:
    RedesignSource;

  company:
    CompanyContext;

  researchSummary:
    | string
    | null;

  visualAnalysis:
    unknown;
}): Promise<MaxiBestOfDesignResearch> {
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

  /*
   * IMPORTANT:
   *
   * MaxiBestOf research does NOT need our expensive
   * design model.
   *
   * Luna is enough for:
   * - searching references
   * - extracting design principles
   * - summarizing them for Sol
   *
   * Sol will later do the actual visual design work.
   */
  const model =
    process.env
      .OPENAI_REDESIGN_RESEARCH_MODEL ??
    "gpt-5.6-luna";

  /* =======================================================
     COMPACT SOURCE CONTEXT
  ======================================================= */

  const sections =
    source.homepageSections
      .slice(
        0,
        10
      )
      .map(
        (
          section
        ) => ({
          purpose:
            section.purpose,

          heading:
            section.heading,

          text:
            section.text.slice(
              0,
              3
            ),
        })
      );

  const images =
    source.assets
      .filter(
        (
          asset
        ) =>
          asset.kind ===
          "image"
      )
      .slice(
        0,
        14
      )
      .map(
        (
          asset
        ) => ({
          role:
            asset.role,

          alt:
            asset.alt,

          context:
            asset.context,
        })
      );

  /* =======================================================
     SINGLE MCP PASS
  ======================================================= */

  const response =
    await openai.responses.create({
      model,

      reasoning: {
        effort:
          "low",
      },

      max_output_tokens:
        2_000,

      tool_choice:
        "required",

      tools: [
        {
          type:
            "mcp",

          server_label:
            "maxibestof",

          server_description:
            "Official MaxiBestOf curated website and visual design inspiration library.",

          server_url:
            MAXIBESTOF_MCP_URL,

          authorization:
            accessToken,

          require_approval:
            "never",
        },
      ],

      input: `
You are a senior digital Art Director researching design
references for a REAL company redesign.

You MUST use the MaxiBestOf MCP.

Do not ask questions.

Do not produce a generic web-design guide.

Your output will be passed directly into GPT-5.6 Sol,
which will create the actual visual website concept.

=========================================================
REAL COMPANY
=========================================================

Name:
${company.name}

Industry:
${company.industry ?? "Unknown"}

Location:
${company.location ?? "Unknown"}

Description:
${company.description ?? "No additional description"}

Website:
${source.finalUrl}

Current hero:
${compactJson(
  source.homepageHero
)}

Current sections:
${compactJson(
  sections
)}

Current navigation:
${compactJson(
  source.navigation
)}

Real imagery types:
${compactJson(
  images
)}

Detected brand colors:
${compactJson(
  [
    source.brandColorAnchor,
    ...source.brandColorCandidates,
  ].filter(
    Boolean
  )
)}

Existing company research:
${researchSummary ?? ""}

Visual analysis:
${compactJson(
  visualAnalysis,
  3_500
)}

=========================================================
YOUR JOB
=========================================================

Search MaxiBestOf for genuinely excellent visual
references suitable for this exact company.

Do not search only within the literal business category.

Good transferable references may come from:

- architecture
- craft
- construction
- manufacturing
- editorial design
- studios
- hospitality
- premium local services
- industrial companies
- interior design
- cultural institutions

Quality and transferable visual principles matter more
than matching the exact industry.

Find references that help GPT-5.6 Sol create something
that looks intentionally art-directed rather than like
a typical AI landing page.

Research:

- hero composition
- overall page rhythm
- typography
- type scale
- grid systems
- asymmetry
- use of photography
- image cropping
- content density
- service presentation
- project/reference presentation
- company/about presentation
- section transitions
- CTA treatment
- color relationships

=========================================================
VERY IMPORTANT
=========================================================

The source company's identity ALWAYS wins.

A reference must NEVER cause:

blue brand → random green brand

red brand → random purple brand

or similar.

MaxiBestOf provides COMPOSITION and ART DIRECTION.

The real company provides:

- identity
- logo
- colors
- facts
- content
- people
- projects

Do not recommend fake:

- testimonials
- awards
- employees
- projects
- statistics

=========================================================
VARIETY
=========================================================

Avoid generic AI patterns:

- repetitive Bento grids
- centered SaaS heroes
- three identical cards
- excessive rounded rectangles
- enormous empty sections
- identical section composition throughout
- tiny amounts of copy
- gratuitous gradients
- purple startup styling
- random stock people

Look for strong editorial or agency-level composition.

=========================================================
OUTPUT FORMAT
=========================================================

Return ONE compact actionable memo.

Use these sections:

VISUAL NORTH STAR

3-5 sentences defining the overall visual direction.

REFERENCE 1
Name:
Useful principle:
Application to this company:

REFERENCE 2
Name:
Useful principle:
Application to this company:

REFERENCE 3
Name:
Useful principle:
Application to this company:

If another reference adds something genuinely different,
include it too.

TYPOGRAPHY
Concrete recommendation.

HERO
Concrete composition recommendation.

SERVICES
Concrete treatment.

PROJECTS / REFERENCES
Concrete treatment when relevant.

ABOUT / TEAM
Concrete treatment when relevant.

COLOR
Explain how to evolve the real brand color without
replacing it.

PAGE RHYTHM
Explain how adjacent sections should vary.

AVOID
A short explicit list of visual clichés to avoid.

Do not ask follow-up questions.
      `.trim(),
    });

  /* =======================================================
     VERIFY MCP
  ======================================================= */

  const toolCalls:
    string[] = [];

  for (
    const item of
      response.output
  ) {
    if (
      item.type !==
      "mcp_call"
    ) {
      continue;
    }

    if (
      item.error
    ) {
      continue;
    }

    toolCalls.push(
      item.name
    );
  }

  if (
    toolCalls.length ===
    0
  ) {
    throw new Error(
      "MaxiBestOf did not perform a successful MCP call."
    );
  }

  const text =
    response.output_text
      .trim();

  if (
    !text
  ) {
    throw new Error(
      "MaxiBestOf research returned no final response."
    );
  }

  return {
    text:
      text.slice(
        0,
        12_000
      ),

    model,

    toolCalls:
      uniqueStrings(
        toolCalls
      ),

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