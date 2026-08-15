import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const VISUAL_MODEL = "gpt-5.6-luna";

/* =========================================================
   SCHEMA
========================================================= */

const VisualWebsiteAnalysisSchema = z.object({
  visualScore: z
    .number()
    .int()
    .min(0)
    .max(100),

  redesignPotential: z
    .number()
    .int()
    .min(0)
    .max(100),

  modernity: z
    .number()
    .int()
    .min(0)
    .max(100),

  visualHierarchy: z
    .number()
    .int()
    .min(0)
    .max(100),

  typography: z
    .number()
    .int()
    .min(0)
    .max(100),

  spacing: z
    .number()
    .int()
    .min(0)
    .max(100),

  branding: z
    .number()
    .int()
    .min(0)
    .max(100),

  imagery: z
    .number()
    .int()
    .min(0)
    .max(100),

  ctaVisibility: z
    .number()
    .int()
    .min(0)
    .max(100),

  mobileQuality: z
    .number()
    .int()
    .min(0)
    .max(100),

  projectPresentation: z
    .number()
    .int()
    .min(0)
    .max(100),

  strengths: z
    .array(z.string())
    .max(6),

  weaknesses: z
    .array(z.string())
    .max(8),

  summary: z.string(),

  redesignReason: z.string(),

  outreachAngle: z.string(),
});

export type VisualWebsiteAnalysis =
  z.infer<
    typeof VisualWebsiteAnalysisSchema
  >;

export type VisualWebsiteAnalysisResult =
  VisualWebsiteAnalysis & {
    model: string;

    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  };

type AnalyzeWebsiteVisualsInput = {
  websiteUrl: string;
  desktop: Buffer;
  mobile: Buffer;
};

/* =========================================================
   CLIENT
========================================================= */

function createOpenAIClient() {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing from the environment."
    );
  }

  return new OpenAI({
    apiKey,
  });
}

/* =========================================================
   IMAGE
========================================================= */

function bufferToJpegDataUrl(
  buffer: Buffer
) {
  return `data:image/jpeg;base64,${buffer.toString(
    "base64"
  )}`;
}

/* =========================================================
   VISUAL ANALYSIS
========================================================= */

export async function analyzeWebsiteVisuals({
  websiteUrl,
  desktop,
  mobile,
}: AnalyzeWebsiteVisualsInput): Promise<VisualWebsiteAnalysisResult> {
  const openai =
    createOpenAIClient();

  const desktopImage =
    bufferToJpegDataUrl(
      desktop
    );

  const mobileImage =
    bufferToJpegDataUrl(
      mobile
    );

  const response =
    await openai.responses.parse({
      model: VISUAL_MODEL,

      reasoning: {
        effort: "low",
      },

      input: [
        {
          role: "system",

          content: `
You are a senior web designer, UX expert and B2B lead qualification analyst.

You evaluate websites for a web designer who wants to find businesses that could genuinely benefit from a redesign.

You receive:
1. A desktop screenshot.
2. A mobile screenshot.

Only judge what is visually supported by the screenshots.

Do not assume functionality that cannot be seen.
Do not penalize a website merely because it is minimal.
Do not reward a website merely because it follows a current design trend.

Evaluate whether the website communicates the apparent professionalism of the business effectively.

A visually strong website should:
- create a professional first impression
- have clear visual hierarchy
- use typography intentionally
- have consistent spacing
- feel visually current
- use coherent branding
- present imagery professionally
- make important actions obvious
- work convincingly on mobile
- present services or projects effectively

A weak website may:
- look visually dated
- use outdated layouts
- have weak hierarchy
- have cramped or inconsistent spacing
- use weak typography
- have unclear CTAs
- use low-quality imagery
- have inconsistent branding
- waste screen space
- have poor mobile composition
- present strong work or services poorly

VISUAL SCORE:
0-25 = very poor or heavily outdated
26-45 = weak
46-60 = average or mixed
61-75 = good
76-90 = very good
91-100 = exceptional

REDESIGN POTENTIAL:
0-20 = little reason for redesign
21-40 = minor opportunity
41-60 = meaningful opportunity
61-80 = strong redesign opportunity
81-100 = urgent or obvious redesign opportunity

redesignPotential is NOT simply 100 minus visualScore.

A company can have an average website but still have strong redesign potential when a better website could substantially improve presentation, conversion or perceived professionalism.

For projectPresentation:
If projects or portfolio work are not visible in the supplied screenshots, score only the visible presentation and do not invent project content.

The outreachAngle must be respectful, specific and suitable for a personalized cold outreach message.

Never insult the company or describe its website as ugly, terrible or embarrassing.

Keep summaries concise and useful for sales qualification.
          `.trim(),
        },

        {
          role: "user",

          content: [
            {
              type: "input_text",

              text: `
Analyze this website visually:

${websiteUrl}

IMAGE 1 = desktop viewport
IMAGE 2 = mobile viewport

Evaluate:
- first impression
- modernity
- visual hierarchy
- typography
- spacing
- branding
- imagery
- CTA visibility
- mobile execution
- presentation of services/projects

Return the structured evaluation.
              `.trim(),
            },

            {
              type: "input_image",

              image_url:
                desktopImage,

              detail: "high",
            },

            {
              type: "input_image",

              image_url:
                mobileImage,

              detail: "high",
            },
          ],
        },
      ],

      text: {
        format: zodTextFormat(
          VisualWebsiteAnalysisSchema,
          "visual_website_analysis"
        ),
      },
    });

  const parsed =
    response.output_parsed;

  if (!parsed) {
    throw new Error(
      "Visual website analysis returned no structured result."
    );
  }

  return {
    ...parsed,

    model: VISUAL_MODEL,

    usage: {
      inputTokens:
        response.usage
          ?.input_tokens ?? 0,

      outputTokens:
        response.usage
          ?.output_tokens ?? 0,

      totalTokens:
        response.usage
          ?.total_tokens ?? 0,
    },
  };
}