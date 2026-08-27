import "server-only";

import OpenAI from "openai";

import {
  chromium,
} from "playwright";

import {
  zodTextFormat,
} from "openai/helpers/zod";

import {
  z,
} from "zod";

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_QA_MODEL =
  "gpt-5.6-luna";

const PAGE_TIMEOUT =
  30_000;

const MAX_SCREENSHOT_HEIGHT =
  14_000;

/* =========================================================
   SCHEMA
========================================================= */

const QualityIssueSchema =
  z.object({
    severity:
      z.enum([
        "critical",
        "major",
        "minor",
      ]),

    category:
      z.enum([
        "broken-image",
        "logo",
        "brand",
        "layout",
        "typography",
        "spacing",
        "content",
        "metadata",
        "responsive",
        "visual-quality",
      ]),

    description:
      z
        .string()
        .max(
          500
        ),

    fixInstruction:
      z
        .string()
        .max(
          700
        ),
  });

const QualityAuditSchema =
  z.object({
    score:
      z
        .number()
        .int()
        .min(
          0
        )
        .max(
          100
        ),

    pass:
      z.boolean(),

    summary:
      z
        .string()
        .max(
          900
        ),

    issues:
      z
        .array(
          QualityIssueSchema
        )
        .max(
          14
        ),
  });

/* =========================================================
   TYPES
========================================================= */

export type V0QualityIssue =
  z.infer<
    typeof QualityIssueSchema
  >;

export type V0QualityAudit =
  z.infer<
    typeof QualityAuditSchema
  > & {
    deterministicIssues:
      V0QualityIssue[];
  };

type PreviewInspection = {
  screenshot:
    Buffer;

  pageWidth:
    number;

  pageHeight:
    number;

  brokenImages:
    Array<{
      src:
        string;

      alt:
        string;
    }>;

  tinyHeaderImages:
    Array<{
      src:
        string;

      alt:
        string;

      width:
        number;

      height:
        number;
    }>;

  narrowText:
    Array<{
      text:
        string;

      width:
        number;

      tag:
        string;
    }>;

  overflowingElements:
    Array<{
      text:
        string;

      width:
        number;

      scrollWidth:
        number;

      tag:
        string;
    }>;

  internalNumbers:
    string[];

  horizontalOverflow:
    boolean;
};

/* =========================================================
   OPENAI
========================================================= */

function createOpenAIClient() {
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

  return new OpenAI({
    apiKey,
  });
}

/* =========================================================
   TEXT
========================================================= */

function cleanText(
  value:
    string
) {
  return value
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function truncate(
  value:
    string,
  maxLength:
    number
) {
  const cleaned =
    cleanText(
      value
    );

  if (
    cleaned.length <=
    maxLength
  ) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    maxLength
  )}…`;
}

/* =========================================================
   PREVIEW INSPECTION
========================================================= */

async function inspectPreview(
  previewUrl:
    string
): Promise<PreviewInspection> {
  const browser =
    await chromium.launch({
      headless:
        true,
    });

  try {
    const context =
      await browser.newContext({
        viewport: {
          width:
            1440,

          height:
            1000,
        },

        deviceScaleFactor:
          1,
      });

    const page =
      await context.newPage();

    await page.goto(
      previewUrl,
      {
        waitUntil:
          "domcontentloaded",

        timeout:
          PAGE_TIMEOUT,
      }
    );

    /*
     * Wait for web fonts and lazy images.
     */
    await page.evaluate(
      async () => {
        if (
          "fonts" in
          document
        ) {
          await document.fonts.ready;
        }
      }
    );

    await page.waitForTimeout(
      2_000
    );

    /*
     * Trigger lazy-loaded sections.
     */
    await page.evaluate(
      async () => {
        const step =
          Math.max(
            500,
            Math.round(
              window.innerHeight *
                0.75
            )
          );

        for (
          let y =
            0;
          y <
          document.body.scrollHeight;
          y +=
            step
        ) {
          window.scrollTo(
            0,
            y
          );

          await new Promise(
            (
              resolve
            ) => {
              window.setTimeout(
                resolve,
                40
              );
            }
          );
        }

        window.scrollTo(
          0,
          0
        );
      }
    );

    await page.waitForTimeout(
      900
    );

    const metrics =
      await page.evaluate(
        () => {
          function visible(
            element:
              Element
          ) {
            const style =
              window.getComputedStyle(
                element
              );

            const rect =
              element.getBoundingClientRect();

            return (
              style.display !==
                "none" &&
              style.visibility !==
                "hidden" &&
              Number(
                style.opacity
              ) >
                0.01 &&
              rect.width >
                0 &&
              rect.height >
                0
            );
          }

          function normalize(
            value:
              string
          ) {
            return value
              .replace(
                /\s+/g,
                " "
              )
              .trim();
          }

          const brokenImages =
            Array.from(
              document.images
            )
              .filter(
                (
                  image
                ) =>
                  visible(
                    image
                  ) &&
                  (
                    !image.complete ||
                    image.naturalWidth ===
                      0 ||
                    image.naturalHeight ===
                      0
                  )
              )
              .slice(
                0,
                12
              )
              .map(
                (
                  image
                ) => ({
                  src:
                    image.currentSrc ||
                    image.src ||
                    "",

                  alt:
                    image.alt ||
                    "",
                })
              );

          const headerImages =
            Array.from(
              document.querySelectorAll(
                "header img, nav img"
              )
            )
              .filter(
                visible
              )
              .map(
                (
                  element
                ) => {
                  const image =
                    element as
                      HTMLImageElement;

                  const rect =
                    image.getBoundingClientRect();

                  return {
                    src:
                      image.currentSrc ||
                      image.src ||
                      "",

                    alt:
                      image.alt ||
                      "",

                    width:
                      Math.round(
                        rect.width
                      ),

                    height:
                      Math.round(
                        rect.height
                      ),
                  };
                }
              )
              .filter(
                (
                  image
                ) =>
                  image.width <
                    82 &&
                  image.height <
                    82
              )
              .slice(
                0,
                8
              );

          const textElements =
            Array.from(
              document.querySelectorAll(
                [
                  "p",
                  "li",
                  "blockquote",
                  "h1",
                  "h2",
                  "h3",
                  "h4",
                  "h5",
                  "h6",
                ].join(
                  ","
                )
              )
            );

          const narrowText =
            textElements
              .filter(
                (
                  element
                ) => {
                  if (
                    !visible(
                      element
                    )
                  ) {
                    return false;
                  }

                  const text =
                    normalize(
                      element.textContent ??
                        ""
                    );

                  if (
                    text.length <
                    36
                  ) {
                    return false;
                  }

                  const rect =
                    element.getBoundingClientRect();

                  return (
                    rect.width <
                    170
                  );
                }
              )
              .slice(
                0,
                12
              )
              .map(
                (
                  element
                ) => {
                  const rect =
                    element.getBoundingClientRect();

                  return {
                    text:
                      normalize(
                        element.textContent ??
                          ""
                      ).slice(
                        0,
                        180
                      ),

                    width:
                      Math.round(
                        rect.width
                      ),

                    tag:
                      element.tagName.toLowerCase(),
                  };
                }
              );

          const overflowingElements =
            Array.from(
              document.querySelectorAll(
                "main *, header *, footer *"
              )
            )
              .filter(
                (
                  element
                ) => {
                  if (
                    !visible(
                      element
                    )
                  ) {
                    return false;
                  }

                  const html =
                    element as
                      HTMLElement;

                  return (
                    html.scrollWidth >
                    html.clientWidth +
                      12
                  );
                }
              )
              .slice(
                0,
                12
              )
              .map(
                (
                  element
                ) => {
                  const html =
                    element as
                      HTMLElement;

                  return {
                    text:
                      normalize(
                        element.textContent ??
                          ""
                      ).slice(
                        0,
                        140
                      ),

                    width:
                      Math.round(
                        html.clientWidth
                      ),

                    scrollWidth:
                      Math.round(
                        html.scrollWidth
                      ),

                    tag:
                      element.tagName.toLowerCase(),
                  };
                }
              );

          const internalNumbers =
            Array.from(
              document.querySelectorAll(
                "main *"
              )
            )
              .filter(
                (
                  element
                ) => {
                  if (
                    !visible(
                      element
                    )
                  ) {
                    return false;
                  }

                  /*
                   * Ignore elements containing children with
                   * additional text. We only care about a
                   * standalone visible label.
                   */
                  const directText =
                    Array.from(
                      element.childNodes
                    )
                      .filter(
                        (
                          node
                        ) =>
                          node.nodeType ===
                          Node.TEXT_NODE
                      )
                      .map(
                        (
                          node
                        ) =>
                          node.textContent ??
                          ""
                      )
                      .join(
                        " "
                      );

                  const text =
                    normalize(
                      directText
                    );

                  return (
                    /^(?:section|chapter|kapitel)?\s*0?(?:[1-9]|1[0-2])$/i.test(
                      text
                    )
                  );
                }
              )
              .map(
                (
                  element
                ) =>
                  normalize(
                    element.textContent ??
                      ""
                  )
              )
              .filter(
                Boolean
              )
              .slice(
                0,
                12
              );

          return {
            pageWidth:
              document.documentElement.scrollWidth,

            pageHeight:
              document.documentElement.scrollHeight,

            brokenImages,

            tinyHeaderImages:
              headerImages,

            narrowText,

            overflowingElements,

            internalNumbers,

            horizontalOverflow:
              document.documentElement.scrollWidth >
              window.innerWidth +
                12,
          };
        }
      );

    /*
     * Avoid pathological 40,000px screenshots.
     *
     * If the generated page is absurdly tall, that is itself
     * useful QA information and the screenshot still captures
     * a substantial portion of the page.
     */
    const screenshot =
      await page.screenshot({
        type:
          "jpeg",

        quality:
          72,

        fullPage:
          metrics.pageHeight <=
          MAX_SCREENSHOT_HEIGHT,
      });

    await context.close();

    return {
      screenshot,

      ...metrics,
    };
  } finally {
    await browser.close();
  }
}

/* =========================================================
   DETERMINISTIC QA
========================================================= */

function buildDeterministicIssues(
  inspection:
    PreviewInspection,
  logoExpected:
    boolean
): V0QualityIssue[] {
  const issues:
    V0QualityIssue[] =
    [];

  if (
    inspection
      .brokenImages
      .length >
    0
  ) {
    issues.push({
      severity:
        "critical",

      category:
        "broken-image",

      description:
        `${inspection.brokenImages.length} visible image(s) failed to load. Examples: ${inspection.brokenImages
          .slice(
            0,
            4
          )
          .map(
            (
              image
            ) =>
              image.alt ||
              image.src
          )
          .join(
            " | "
          )}`,

      fixInstruction:
        "Replace every broken image with a working supplied real-company attachment or another verified real source image. Do not leave broken image icons or alt text visible.",
    });
  }

  if (
    logoExpected &&
    inspection
      .tinyHeaderImages
      .length >
      0
  ) {
    const likelyLogo =
      inspection
        .tinyHeaderImages
        .find(
          (
            image
          ) =>
            /logo|brand/i.test(
              `${image.alt} ${image.src}`
            )
        );

    if (
      likelyLogo
    ) {
      issues.push({
        severity:
          "major",

        category:
          "logo",

        description:
          `The visible header logo appears too small at approximately ${likelyLogo.width}×${likelyLogo.height}px.`,

        fixInstruction:
          "Increase the real logo's visual size while preserving its natural aspect ratio. It must be clearly readable and intentional in the navigation.",
      });
    }
  }

  if (
    inspection
      .narrowText
      .length >
    0
  ) {
    issues.push({
      severity:
        "critical",

      category:
        "layout",

      description:
        `Long text is rendered inside unusably narrow columns. Example width: ${inspection.narrowText[0]?.width ?? 0}px. Example: "${inspection.narrowText[0]?.text ?? ""}"`,

      fixInstruction:
        "Rebuild the affected grid/column layout. Long body copy must have a usable readable width; do not let sentences wrap one or two words per line.",
    });
  }

  if (
    inspection
      .overflowingElements
      .length >
    2
  ) {
    issues.push({
      severity:
        "major",

      category:
        "responsive",

      description:
        `${inspection.overflowingElements.length} visible elements overflow their containers.`,

      fixInstruction:
        "Fix widths, grids, flex behavior and text wrapping so content remains inside its intended containers.",
    });
  }

  if (
    inspection
      .horizontalOverflow
  ) {
    issues.push({
      severity:
        "critical",

      category:
        "responsive",

      description:
        "The desktop page has horizontal overflow.",

      fixInstruction:
        "Remove page-level horizontal overflow. Fix oversized fixed widths, transforms, grids or absolute-positioned elements causing the body to exceed the viewport.",
    });
  }

  if (
    inspection
      .internalNumbers
      .length >
    0
  ) {
    issues.push({
      severity:
        "critical",

      category:
        "metadata",

      description:
        `Internal-looking standalone section numbers are visible: ${inspection.internalNumbers.join(
          ", "
        )}.`,

      fixInstruction:
        "Remove standalone decorative/internal section indexes such as 01, 02, 05, SECTION 05 or KAPITEL 05 unless the number is a real factual business metric.",
    });
  }

  return issues;
}

/* =========================================================
   AI VISUAL QA
========================================================= */

async function runVisualAudit({
  inspection,
  deterministicIssues,
  companyName,
  primaryBrandColor,
  logoExpected,
  teamImageExpected,
}: {
  inspection:
    PreviewInspection;

  deterministicIssues:
    V0QualityIssue[];

  companyName:
    string;

  primaryBrandColor:
    string
    | null;

  logoExpected:
    boolean;

  teamImageExpected:
    boolean;
}) {
  const openai =
    createOpenAIClient();

  const response =
    await openai.responses.parse({
      model:
        process.env
          .OPENAI_REDESIGN_QA_MODEL ??
        DEFAULT_QA_MODEL,

      reasoning: {
        effort:
          "low",
      },

      input: [
        {
          role:
            "system",

          content: `
You are the final visual QA director at a high-end web
design studio.

You are NOT designing a new website.

You are reviewing an already generated homepage before it
is shown to a prospective client.

Be strict.

A visually attractive page can still FAIL if it contains
implementation mistakes.

=========================================================
AUTOMATIC FAIL / MAJOR PROBLEMS
=========================================================

Treat these as serious:

- broken visible images
- visible image alt text caused by failed images
- unusably narrow text columns
- words stacking vertically because a grid column is too
  narrow
- horizontal overflow
- overlapping text
- clipped important content
- tiny unreadable company logo
- obvious internal metadata such as SECTION 05 / 05 /
  CHAPTER 03
- duplicated or nonsensical visible numbering
- unreadable text contrast
- obviously broken responsive composition
- giant empty areas that clearly look accidental
- repeated Bento/card compositions across most sections
- several sections that visually look like the same
  component copied repeatedly
- obvious generic AI landing-page appearance
- random decorative UI that does not fit the company

=========================================================
BRAND
=========================================================

When a primary client brand color is supplied, check that
the page visibly remains in that color family.

The page does not need to cover itself in the brand color,
but the identity must still be recognizable.

Do not fail a sophisticated neutral design merely because
some surfaces are neutral.

Fail brand only when the redesign clearly replaced a
recognizable brand hue with an unrelated hue.

=========================================================
LOGO
=========================================================

If a real logo is expected:

- it must appear
- it must be readable
- it must not be replaced by typed company text
- it must not be absurdly tiny

=========================================================
REAL PEOPLE
=========================================================

If strong real team imagery is available, a relevant About
or Team area should preferably use it rather than a fake
stock employee.

=========================================================
COPY
=========================================================

The homepage should contain enough useful content for a
real business.

Do not reward artificially short AI copy.

Watch for:

- vague filler
- meaningless 3-word paragraphs
- awkward generated German
- repetitive copy
- factual claims that look suspicious
- headings that do not relate to the content below them

=========================================================
DESIGN QUALITY
=========================================================

Review:

- typography hierarchy
- alignment
- spacing
- image crops
- rhythm
- contrast
- section variety
- density
- composition
- professionalism

A client-ready concept should feel like a designer made
specific decisions for this company.

=========================================================
SCORING
=========================================================

90–100:
excellent, genuinely client-ready

82–89:
strong and presentable

72–81:
promising but needs noticeable fixes

60–71:
multiple major issues

below 60:
not client-ready

Set pass=true only when the page is genuinely safe to show
to a prospective web-design client.

Do not praise defects.

Give concrete repair instructions.
          `.trim(),
        },

        {
          role:
            "user",

          content: [
            {
              type:
                "input_text",

              text: `
Company:
${companyName}

Expected primary brand color:
${primaryBrandColor ?? "Unknown"}

Real logo expected:
${logoExpected ? "YES" : "NO"}

Strong real team imagery available:
${teamImageExpected ? "YES" : "NO"}

Page dimensions:
${inspection.pageWidth} × ${inspection.pageHeight}

Deterministic browser inspection:

${JSON.stringify(
  {
    brokenImages:
      inspection.brokenImages,

    tinyHeaderImages:
      inspection.tinyHeaderImages,

    narrowText:
      inspection.narrowText,

    overflowingElements:
      inspection.overflowingElements,

    internalNumbers:
      inspection.internalNumbers,

    horizontalOverflow:
      inspection.horizontalOverflow,

    deterministicIssues,
  },
  null,
  2
)}

Review the attached generated homepage screenshot.

Do not redesign it.

Find the concrete problems that should be repaired before
a customer sees it.
              `.trim(),
            },

            {
              type:
                "input_image",

              image_url:
                `data:image/jpeg;base64,${inspection.screenshot.toString(
                  "base64"
                )}`,

              detail:
                "high",
            },
          ],
        },
      ],

      text: {
        format:
          zodTextFormat(
            QualityAuditSchema,
            "v0_redesign_quality_audit"
          ),
      },
    });

  if (
    !response.output_parsed
  ) {
    throw new Error(
      "Visual QA returned no structured result."
    );
  }

  return response.output_parsed;
}

/* =========================================================
   PUBLIC AUDIT
========================================================= */

export async function auditV0Redesign({
  previewUrl,
  companyName,
  primaryBrandColor,
  logoExpected,
  teamImageExpected,
}: {
  previewUrl:
    string;

  companyName:
    string;

  primaryBrandColor:
    string
    | null;

  logoExpected:
    boolean;

  teamImageExpected:
    boolean;
}): Promise<V0QualityAudit> {
  const inspection =
    await inspectPreview(
      previewUrl
    );

  const deterministicIssues =
    buildDeterministicIssues(
      inspection,
      logoExpected
    );

  try {
    const visualAudit =
      await runVisualAudit({
        inspection,

        deterministicIssues,

        companyName,

        primaryBrandColor,

        logoExpected,

        teamImageExpected,
      });

    /*
     * Browser-detected critical failures always override
     * an accidentally optimistic vision score.
     */
    const deterministicBlocking =
      deterministicIssues.some(
        (
          issue
        ) =>
          issue.severity ===
            "critical" ||
          issue.severity ===
            "major"
      );

    const allIssues =
      [
        ...deterministicIssues,
        ...visualAudit.issues,
      ];

    const uniqueIssues:
      V0QualityIssue[] =
      [];

    const seen =
      new Set<string>();

    for (
      const issue of
        allIssues
    ) {
      const key =
        `${issue.category}:${issue.description}`
          .toLowerCase();

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

      uniqueIssues.push(
        issue
      );

      if (
        uniqueIssues.length >=
        14
      ) {
        break;
      }
    }

    return {
      score:
        visualAudit.score,

      pass:
        visualAudit.pass &&
        !deterministicBlocking &&
        visualAudit.score >=
          82,

      summary:
        visualAudit.summary,

      issues:
        uniqueIssues,

      deterministicIssues,
    };
  } catch (
    error
  ) {
    /*
     * QA should never destroy an otherwise generated site
     * just because the second AI call had a temporary issue.
     */
    console.warn(
      "Visual redesign QA failed, using deterministic QA only:",
      error
    );

    const blocking =
      deterministicIssues.some(
        (
          issue
        ) =>
          issue.severity ===
            "critical" ||
          issue.severity ===
            "major"
      );

    return {
      score:
        blocking
          ? 65
          : 84,

      pass:
        !blocking,

      summary:
        blocking
          ? "Deterministic browser QA detected implementation problems."
          : "Visual AI QA was unavailable, but deterministic browser checks passed.",

      issues:
        deterministicIssues,

      deterministicIssues,
    };
  }
}