import "server-only";

import {
  randomUUID,
} from "node:crypto";

import OpenAI from "openai";

import {
  zodTextFormat,
} from "openai/helpers/zod";

import {
  z,
} from "zod";

import {
  applyArchetypeHeroLayout,
  applyArchetypeSectionLayout,
  getArchetypePrompt,
  getArchetypeSpacing,
  REDESIGN_ARCHETYPE_IDS,
  selectRedesignArchetype,
  type RedesignArchetypeId,
  type RedesignSectionLayout,
} from "@/lib/redesign-art-direction";

import {
  type RedesignSource,
  type RedesignSourceAsset,
} from "@/lib/redesign-source";

import {
  getStockImageSets,
} from "@/lib/stock-images";

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_MODEL =
  "gpt-5.6-terra";

const MAX_STOCK_QUERIES =
  3;

const MAX_GENERATED_SECTIONS =
  12;

/* =========================================================
   TYPOGRAPHY
========================================================= */

export const REDESIGN_WEB_FONTS = [
  "Inter",
  "Manrope",
  "DM Sans",
  "Space Grotesk",
  "Plus Jakarta Sans",
  "IBM Plex Sans",
  "Sora",
  "Archivo",
  "Outfit",
  "Bricolage Grotesque",
  "Instrument Sans",
  "Urbanist",
  "Fraunces",
  "Lora",
  "Source Serif 4",
  "Playfair Display",
  "Cormorant Garamond",
  "Merriweather",
] as const;

const WebFontSchema =
  z.enum(
    REDESIGN_WEB_FONTS
  );

const TypographySchema =
  z.object({
    headingFont:
      WebFontSchema,

    bodyFont:
      WebFontSchema,

    headingWeight:
      z.union([
        z.literal(
          500
        ),
        z.literal(
          600
        ),
        z.literal(
          700
        ),
      ]),

    bodyWeight:
      z.union([
        z.literal(
          400
        ),
        z.literal(
          500
        ),
      ]),

    headingTracking:
      z.enum([
        "tight",
        "normal",
        "wide",
      ]),

    headingCase:
      z.enum([
        "normal",
        "uppercase",
      ]),
  });

const DEFAULT_TYPOGRAPHY =
  {
    headingFont:
      "Manrope",

    bodyFont:
      "Inter",

    headingWeight:
      700,

    bodyWeight:
      400,

    headingTracking:
      "tight",

    headingCase:
      "normal",
  } as const;

/* =========================================================
   BASIC
========================================================= */

const HexColorSchema =
  z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/
    );

const OptionalHexColorSchema =
  z.union([
    HexColorSchema,
    z.literal(
      ""
    ),
  ]);

const ImageQueryIndexSchema =
  z
    .number()
    .int()
    .min(
      -1
    )
    .max(
      MAX_STOCK_QUERIES -
        1
    );

const ImagePreferenceSchema =
  z.enum([
    "auto",
    "source",
    "stock",
    "none",
  ]);

const SectionLayoutSchema =
  z.enum([
    "cards",
    "split",
    "list",
    "mosaic",
    "editorial",
    "steps",
    "banner",
    "bento",
    "media",
    "statement",
    "index",
  ]);

const HeroLayoutSchema =
  z.enum([
    "split",
    "centered",
    "fullbleed",
    "offset",
    "editorial",
    "poster",
    "frame",
  ]);

const DesignArchetypeSchema =
  z.enum(
    REDESIGN_ARCHETYPE_IDS
  );

/* =========================================================
   BRAND IDENTITY
========================================================= */

const BrandIdentitySchema =
  z.object({
    primaryColor:
      OptionalHexColorSchema,

    secondaryColor:
      OptionalHexColorSchema,

    confidence:
      z.enum([
        "low",
        "medium",
        "high",
      ]),

    evidence:
      z
        .string()
        .max(
          500
        ),
  });

/* =========================================================
   GENERATED ITEM
========================================================= */

const GeneratedSectionItemSchema =
  z.object({
    title:
      z
        .string()
        .max(
          80
        ),

    description:
      z
        .string()
        .max(
          260
        ),

    label:
      z
        .string()
        .max(
          60
        ),

    imageQueryIndex:
      ImageQueryIndexSchema,

    imagePreference:
      ImagePreferenceSchema,
  });

/* =========================================================
   GENERATED SECTION
========================================================= */

const GeneratedSectionSchema =
  z.object({
    type:
      z.enum([
        "services",
        "about",
        "showcase",
        "proof",
        "process",
        "cta",
      ]),

    layout:
      SectionLayoutSchema,

    sourceSectionIndexes:
      z
        .array(
          z
            .number()
            .int()
            .min(
              1
            )
        )
        .max(
          4
        ),

    eyebrow:
      z
        .string()
        .max(
          70
        ),

    title:
      z
        .string()
        .max(
          110
        ),

    intro:
      z
        .string()
        .max(
          300
        ),

    body:
      z
        .string()
        .max(
          700
        ),

    imageQueryIndex:
      ImageQueryIndexSchema,

    imagePreference:
      ImagePreferenceSchema,

    items:
      z
        .array(
          GeneratedSectionItemSchema
        )
        .max(
          6
        ),
  });

type GeneratedSection =
  z.infer<
    typeof GeneratedSectionSchema
  >;

type GeneratedSectionItem =
  z.infer<
    typeof GeneratedSectionItemSchema
  >;

/* =========================================================
   STRUCTURE PLAN
========================================================= */

const GeneratedStructurePlanSchema =
  z.object({
    strategy:
      z.enum([
        "preserve",
        "prune",
        "reorder",
      ]),

    rationale:
      z
        .string()
        .max(
          700
        ),

    keptSourceSectionIndexes:
      z
        .array(
          z
            .number()
            .int()
            .min(
              1
            )
        )
        .max(
          MAX_GENERATED_SECTIONS
        ),

    droppedSourceSectionIndexes:
      z
        .array(
          z
            .number()
            .int()
            .min(
              1
            )
        )
        .max(
          MAX_GENERATED_SECTIONS
        ),
  });

type GeneratedStructurePlan =
  z.infer<
    typeof GeneratedStructurePlanSchema
  >;

/* =========================================================
   INSPIRATION TRACE
========================================================= */

const InspirationTraceSchema =
  z.object({
    visualNorthStar:
      z
        .string()
        .max(
          500
        ),

    hero:
      z
        .string()
        .max(
          420
        ),

    typography:
      z
        .string()
        .max(
          420
        ),

    color:
      z
        .string()
        .max(
          420
        ),

    motion:
      z
        .string()
        .max(
          420
        ),

    sections:
      z
        .array(
          z.object({
            sourceSectionIndexes:
              z
                .array(
                  z.number()
                )
                .max(
                  4
                ),

            reference:
              z
                .string()
                .max(
                  220
                ),

            appliedIdea:
              z
                .string()
                .max(
                  420
                ),
          })
        )
        .max(
          MAX_GENERATED_SECTIONS
        ),
  });

/* =========================================================
   THEME
========================================================= */

const ThemeSchema =
  z.object({
    mode:
      z.enum([
        "light",
        "dark",
      ]),

    background:
      HexColorSchema,

    surface:
      HexColorSchema,

    text:
      HexColorSchema,

    mutedText:
      HexColorSchema,

    accent:
      HexColorSchema,

    accentText:
      HexColorSchema,

    border:
      HexColorSchema,

    radius:
      z.enum([
        "none",
        "small",
        "medium",
        "large",
        "pill",
      ]),

    headingStyle:
      z.enum([
        "display",
        "editorial",
        "geometric",
        "classic",
        "compact",
      ]),

    spacing:
      z.enum([
        "tight",
        "balanced",
        "airy",
      ]),
  });

type GeneratedTheme =
  z.infer<
    typeof ThemeSchema
  >;

/* =========================================================
   GENERATED SPEC
========================================================= */

const GeneratedRedesignSpecSchema =
  z.object({
    copyLanguage:
      z.enum([
        "de",
        "en",
        "other",
      ]),

    conceptName:
      z
        .string()
        .max(
          80
        ),

    creativeDirection:
      z
        .string()
        .max(
          420
        ),

    designPersonality:
      z.enum([
        "minimal",
        "editorial",
        "bold",
        "warm",
        "technical",
        "premium",
      ]),

    brandIdentity:
      BrandIdentitySchema,

    structurePlan:
      GeneratedStructurePlanSchema,

    inspirationTrace:
      InspirationTraceSchema,

    typography:
      TypographySchema,

    stockImageQueries:
      z
        .array(
          z.string()
        )
        .min(
          2
        )
        .max(
          MAX_STOCK_QUERIES
        ),

    theme:
      ThemeSchema,

    navigation:
      z.object({
        style:
          z.enum([
            "minimal",
            "floating",
            "bordered",
            "transparent",
          ]),

        items:
          z
            .array(
              z.string()
            )
            .max(
              6
            ),

        ctaLabel:
          z
            .string()
            .max(
              50
            ),
      }),

    hero:
      z.object({
        layout:
          HeroLayoutSchema,

        eyebrow:
          z
            .string()
            .max(
              80
            ),

        headline:
          z
            .string()
            .max(
              90
            ),

        subheadline:
          z
            .string()
            .max(
              260
            ),

        primaryCta:
          z
            .string()
            .max(
              50
            ),

        secondaryCta:
          z
            .string()
            .max(
              50
            ),

        imageQueryIndex:
          ImageQueryIndexSchema,

        imagePreference:
          ImagePreferenceSchema,
      }),

    ticker:
      z.object({
        enabled:
          z.boolean(),

        style:
          z.enum([
            "minimal",
            "solid",
            "outline",
          ]),

        speed:
          z.enum([
            "slow",
            "medium",
          ]),

        items:
          z
            .array(
              z.string()
            )
            .max(
              8
            ),
      }),

    sections:
      z
        .array(
          GeneratedSectionSchema
        )
        .min(
          1
        )
        .max(
          MAX_GENERATED_SECTIONS
        ),

    footer:
      z.object({
        tagline:
          z
            .string()
            .max(
              220
            ),

        contactLine:
          z
            .string()
            .max(
              180
            ),

        navigation:
          z
            .array(
              z.string()
            )
            .max(
              6
            ),
      }),

    motion:
      z.object({
        reveal:
          z.enum([
            "fade",
            "slide",
            "stagger",
            "soft-scale",
            "clip",
          ]),

        hover:
          z.enum([
            "lift",
            "underline",
            "scale",
            "subtle",
          ]),

        background:
          z.enum([
            "none",
            "grid",
            "glow",
            "grain",
            "lines",
          ]),

        heroImage:
          z.enum([
            "none",
            "slow-zoom",
            "float",
          ]),

        scroll:
          z.enum([
            "none",
            "image-parallax",
            "section-drift",
          ]),
      }),
  });

/* =========================================================
   PUBLIC SCHEMA
========================================================= */

const PublicSectionItemSchema =
  z.object({
    title:
      z.string(),

    description:
      z.string(),

    label:
      z.string(),

    imageAssetId:
      z.string(),
  });

const PublicSectionSchema =
  z.object({
    type:
      z.enum([
        "services",
        "about",
        "showcase",
        "proof",
        "process",
        "cta",
      ]),

    layout:
      SectionLayoutSchema,

    sourceSectionIndexes:
      z
        .array(
          z.number()
        )
        .optional()
        .default(
          []
        ),

    eyebrow:
      z.string(),

    title:
      z.string(),

    intro:
      z.string(),

    body:
      z.string(),

    imageAssetId:
      z.string(),

    items:
      z.array(
        PublicSectionItemSchema
      ),
  });

const PublicStructurePlanSchema =
  z.object({
    strategy:
      z.enum([
        "preserve",
        "prune",
        "reorder",
      ]),

    rationale:
      z.string(),

    keptSourceSectionIndexes:
      z.array(
        z.number()
      ),

    droppedSourceSectionIndexes:
      z.array(
        z.number()
      ),
  });

export const RedesignPreviewSpecSchema =
  z.object({
    copyLanguage:
      z.enum([
        "de",
        "en",
        "other",
      ]),

    conceptName:
      z.string(),

    creativeDirection:
      z.string(),

    designPersonality:
      z.enum([
        "minimal",
        "editorial",
        "bold",
        "warm",
        "technical",
        "premium",
      ]),

    designArchetype:
      DesignArchetypeSchema
        .optional(),

    visualDensity:
      z
        .enum([
          "compact",
          "balanced",
          "expressive",
        ])
        .optional(),

    contentDensity:
      z
        .enum([
          "standard",
          "rich",
        ])
        .optional(),

    brandIdentity:
      BrandIdentitySchema
        .optional(),

    structurePlan:
      PublicStructurePlanSchema
        .optional(),

    inspirationTrace:
      InspirationTraceSchema
        .optional(),

    typography:
      TypographySchema
        .optional()
        .default(
          DEFAULT_TYPOGRAPHY
        ),

    theme:
      ThemeSchema,

    navigation:
      GeneratedRedesignSpecSchema
        .shape
        .navigation,

    hero:
      z.object({
        layout:
          HeroLayoutSchema,

        eyebrow:
          z.string(),

        headline:
          z.string(),

        subheadline:
          z.string(),

        primaryCta:
          z.string(),

        secondaryCta:
          z.string(),

        imageAssetId:
          z.string(),
      }),

    ticker:
      GeneratedRedesignSpecSchema
        .shape
        .ticker
        .optional()
        .default({
          enabled:
            false,

          style:
            "minimal",

          speed:
            "slow",

          items:
            [],
        }),

    sections:
      z.array(
        PublicSectionSchema
      ),

    footer:
      GeneratedRedesignSpecSchema
        .shape
        .footer,

    motion:
      GeneratedRedesignSpecSchema
        .shape
        .motion,

    sourceWebsiteUrl:
      z.string(),

    sourceBrandName:
      z.string(),

    assets:
      z.array(
        z.object({
          id:
            z.string(),

          url:
            z.string(),

          alt:
            z.string(),

          kind:
            z.enum([
              "logo",
              "image",
            ]),

          source:
            z
              .enum([
                "source",
                "pexels",
              ])
              .optional(),

          role:
            z
              .enum([
                "logo",
                "hero",
                "team",
                "project",
                "content",
              ])
              .optional(),

          sectionIndex:
            z
              .number()
              .nullable()
              .optional(),

          creditName:
            z
              .string()
              .optional(),

          creditUrl:
            z
              .string()
              .optional(),
        })
      ),

    generatedAt:
      z.string(),
  });

export type RedesignPreviewSpec =
  z.infer<
    typeof RedesignPreviewSpecSchema
  >;

export type GeneratedRedesignPreview = {
  spec:
    RedesignPreviewSpec;

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
   ANALYSIS
========================================================= */

export type RedesignAnalysisContext = {
  company: {
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

  researchSummary:
    | string
    | null;

  websiteFindings:
    unknown;

  visualAnalysis:
    unknown;
};

/* =========================================================
   CLIENT
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

/* =========================================================
   STRING HELPERS
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

function uniqueStrings(
  values:
    string[],
  limit =
    values.length
) {
  const seen =
    new Set<string>();

  const result:
    string[] = [];

  for (
    const rawValue of
      values
  ) {
    const value =
      cleanText(
        rawValue
      );

    if (
      !value
    ) {
      continue;
    }

    const key =
      value.toLowerCase();

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

    result.push(
      value
    );

    if (
      result.length >=
      limit
    ) {
      break;
    }
  }

  return result;
}

function uniqueNumbers(
  values:
    number[]
) {
  return Array.from(
    new Set(
      values
    )
  );
}

/* =========================================================
   LABEL CLEANUP
========================================================= */

function cleanItemLabel(
  value:
    string
) {
  const label =
    cleanText(
      value
    );

  if (
    !label
  ) {
    return "";
  }

  if (
    /^(?:0*\d+|step\s*0*\d+|schritt\s*0*\d+)$/i.test(
      label
    )
  ) {
    return "";
  }

  return label;
}

/* =========================================================
   ITEM CLEANUP
========================================================= */

function cleanItems(
  items:
    GeneratedSectionItem[],
  maxItems:
    number
) {
  const seen =
    new Set<string>();

  const result:
    GeneratedSectionItem[] =
    [];

  for (
    const item of
      items
  ) {
    const title =
      cleanText(
        item.title
      );

    if (
      !title
    ) {
      continue;
    }

    const key =
      title.toLowerCase();

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

    result.push({
      ...item,

      title,

      description:
        cleanText(
          item.description
        ),

      label:
        cleanItemLabel(
          item.label
        ),
    });

    if (
      result.length >=
      maxItems
    ) {
      break;
    }
  }

  return result;
}

/* =========================================================
   SOURCE PURPOSE → RENDER TYPE
========================================================= */

function getTypeForSourcePurpose(
  purpose:
    RedesignSource["homepageSections"][number]["purpose"]
):
  | GeneratedSection["type"]
  | null {
  switch (
    purpose
  ) {
    case "services":
      return "services";

    case "about":
    case "team":
      return "about";

    case "showcase":
      return "showcase";

    case "proof":
      return "proof";

    case "process":
      return "process";

    case "contact":
    case "cta":
      return "cta";

    default:
      return null;
  }
}

/* =========================================================
   QUERY INDEX
========================================================= */

function normalizeQueryIndex(
  value:
    number,
  fallback:
    number,
  queryCount:
    number
) {
  if (
    value >=
      0 &&
    value <
      queryCount
  ) {
    return value;
  }

  if (
    queryCount <=
    0
  ) {
    return -1;
  }

  return (
    fallback %
    queryCount
  );
}

/* =========================================================
   NORMALIZE SECTIONS
========================================================= */

function normalizeSections({
  sections,
  copyLanguage,
  queryCount,
  sourceSections,
  archetype,
  creativeSeed,
}: {
  sections:
    GeneratedSection[];

  copyLanguage:
    "de"
    | "en"
    | "other";

  queryCount:
    number;

  sourceSections:
    RedesignSource["homepageSections"];

  archetype:
    ReturnType<
      typeof selectRedesignArchetype
    >;

  creativeSeed:
    string;
}) {
  const result:
    GeneratedSection[] =
    [];

  const sourceByIndex =
    new Map(
      sourceSections.map(
        (
          section
        ) => [
          section.index,
          section,
        ] as const
      )
    );

  const hasSourceStructure =
    sourceSections.length >
    0;

  const canRecoverByPosition =
    hasSourceStructure &&
    sections.length ===
      sourceSections.length;

  const usedSourceIndexes =
    new Set<number>();

  for (
    let sectionIndex =
      0;
    sectionIndex <
      sections.length;
    sectionIndex +=
      1
  ) {
    const section =
      sections[
        sectionIndex
      ];

    let sourceSectionIndexes =
      uniqueNumbers(
        section.sourceSectionIndexes
      ).filter(
        (
          index
        ) =>
          sourceByIndex.has(
            index
          )
      );

    if (
      sourceSectionIndexes.length ===
        0 &&
      canRecoverByPosition
    ) {
      const fallback =
        sourceSections[
          sectionIndex
        ];

      if (
        fallback
      ) {
        sourceSectionIndexes = [
          fallback.index,
        ];
      }
    }

    if (
      hasSourceStructure &&
      sourceSectionIndexes.length ===
        0
    ) {
      continue;
    }

    if (
      hasSourceStructure
    ) {
      sourceSectionIndexes =
        sourceSectionIndexes.filter(
          (
            index
          ) =>
            !usedSourceIndexes.has(
              index
            )
        );

      if (
        sourceSectionIndexes.length ===
          0
      ) {
        continue;
      }

      for (
        const index of
          sourceSectionIndexes
      ) {
        usedSourceIndexes.add(
          index
        );
      }
    }

    let type =
      section.type;

    let sourcePurpose:
      RedesignSource["homepageSections"][number]["purpose"]
      | null =
      null;

    if (
      sourceSectionIndexes.length ===
      1
    ) {
      const sourceSection =
        sourceByIndex.get(
          sourceSectionIndexes[
            0
          ]
        );

      if (
        sourceSection
      ) {
        sourcePurpose =
          sourceSection.purpose;

        const mappedType =
          getTypeForSourcePurpose(
            sourceSection.purpose
          );

        if (
          mappedType
        ) {
          type =
            mappedType;
        }
      }
    }

    let layout =
      applyArchetypeSectionLayout({
        type,

        requested:
          section.layout as
            RedesignSectionLayout,

        archetype,

        sectionIndex,

        seed:
          creativeSeed,
      });

    /*
     * Real team sections should remain image-led.
     */
    if (
      sourcePurpose ===
        "team" &&
      ![
        "media",
        "split",
        "bento",
      ].includes(
        layout
      )
    ) {
      layout =
        "media";
    }

    let maxItems =
      6;

    if (
      type ===
      "process"
    ) {
      maxItems =
        4;
    }

    if (
      type ===
      "showcase"
    ) {
      maxItems =
        6;
    }

    const items =
      cleanItems(
        section.items,
        maxItems
      );

    if (
      !hasSourceStructure &&
      [
        "services",
        "process",
        "showcase",
      ].includes(
        type
      ) &&
      items.length ===
        0
    ) {
      continue;
    }

    let title =
      cleanText(
        section.title
      );

    if (
      type ===
        "showcase" &&
      /^(bilder|galerie|images|gallery|photos|fotos)$/i.test(
        title
      )
    ) {
      title =
        copyLanguage ===
        "de"
          ? "Einblicke in unsere Arbeit"
          : "A closer look at our work";
    }

    const normalizedItems =
      items.map(
        (
          item,
          itemIndex
        ) => ({
          ...item,

          label:
            type ===
            "showcase"
              ? ""
              : item.label,

          imageQueryIndex:
            type ===
            "showcase"
              ? normalizeQueryIndex(
                  item.imageQueryIndex,
                  itemIndex,
                  queryCount
                )
              : item.imageQueryIndex,
        })
      );

    let imageQueryIndex =
      section.imageQueryIndex;

    if (
      [
        "about",
        "showcase",
        "proof",
      ].includes(
        type
      )
    ) {
      imageQueryIndex =
        normalizeQueryIndex(
          section.imageQueryIndex,
          sectionIndex,
          queryCount
        );
    }

    result.push({
      ...section,

      type,

      layout,

      sourceSectionIndexes,

      eyebrow:
        cleanText(
          section.eyebrow
        ),

      title,

      intro:
        cleanText(
          section.intro
        ),

      body:
        cleanText(
          section.body
        ),

      imageQueryIndex,

      items:
        normalizedItems,
    });
  }

  return result;
}

/* =========================================================
   SOURCE ORDER
========================================================= */

function applySourceSectionOrder({
  sections,
  sourceSections,
  structurePlan,
}: {
  sections:
    GeneratedSection[];

  sourceSections:
    RedesignSource["homepageSections"];

  structurePlan:
    GeneratedStructurePlan;
}) {
  if (
    sourceSections.length ===
    0
  ) {
    return sections;
  }

  const allowReorder =
    structurePlan.strategy ===
      "reorder" &&
    cleanText(
      structurePlan.rationale
    ).length >=
      50;

  if (
    allowReorder
  ) {
    return sections;
  }

  const orderMap =
    new Map(
      sourceSections.map(
        (
          section,
          order
        ) => [
          section.index,
          order,
        ] as const
      )
    );

  return [
    ...sections,
  ].sort(
    (
      first,
      second
    ) => {
      const firstOrder =
        Math.min(
          ...first
            .sourceSectionIndexes
            .map(
              (
                index
              ) =>
                orderMap.get(
                  index
                ) ??
                Number.MAX_SAFE_INTEGER
            )
        );

      const secondOrder =
        Math.min(
          ...second
            .sourceSectionIndexes
            .map(
              (
                index
              ) =>
                orderMap.get(
                  index
                ) ??
                Number.MAX_SAFE_INTEGER
            )
        );

      return (
        firstOrder -
        secondOrder
      );
    }
  );
}

/* =========================================================
   FINAL STRUCTURE PLAN
========================================================= */

function buildFinalStructurePlan({
  requestedPlan,
  sourceSections,
  sections,
}: {
  requestedPlan:
    GeneratedStructurePlan;

  sourceSections:
    RedesignSource["homepageSections"];

  sections:
    GeneratedSection[];
}) {
  const sourceIndexes =
    sourceSections.map(
      (
        section
      ) =>
        section.index
    );

  const generatedIndexes =
    uniqueNumbers(
      sections.flatMap(
        (
          section
        ) =>
          section.sourceSectionIndexes
      )
    );

  const kept =
    generatedIndexes.filter(
      (
        index
      ) =>
        sourceIndexes.includes(
          index
        )
    );

  const dropped =
    sourceIndexes.filter(
      (
        index
      ) =>
        !kept.includes(
          index
        )
    );

  if (
    sourceSections.length ===
    0
  ) {
    return {
      strategy:
        requestedPlan.strategy,

      rationale:
        cleanText(
          requestedPlan.rationale
        ),

      keptSourceSectionIndexes:
        [],

      droppedSourceSectionIndexes:
        [],
    };
  }

  const expectedOrder =
    sourceIndexes.filter(
      (
        index
      ) =>
        kept.includes(
          index
        )
    );

  const orderChanged =
    JSON.stringify(
      expectedOrder
    ) !==
    JSON.stringify(
      kept
    );

  return {
    strategy:
      orderChanged
        ? "reorder" as const
        : dropped.length >
            0
          ? "prune" as const
          : "preserve" as const,

    rationale:
      cleanText(
        requestedPlan.rationale
      ),

    keptSourceSectionIndexes:
      kept,

    droppedSourceSectionIndexes:
      dropped,
  };
}

/* =========================================================
   COLOR
========================================================= */

type Rgb = {
  r:
    number;

  g:
    number;

  b:
    number;
};

type Hsl = {
  h:
    number;

  s:
    number;

  l:
    number;
};

function hexToRgb(
  value:
    string
): Rgb | null {
  const cleaned =
    value
      .replace(
        "#",
        ""
      )
      .trim();

  if (
    !/^[0-9a-f]{6}$/i.test(
      cleaned
    )
  ) {
    return null;
  }

  return {
    r:
      parseInt(
        cleaned.slice(
          0,
          2
        ),
        16
      ),

    g:
      parseInt(
        cleaned.slice(
          2,
          4
        ),
        16
      ),

    b:
      parseInt(
        cleaned.slice(
          4,
          6
        ),
        16
      ),
  };
}

function rgbToHsl({
  r,
  g,
  b,
}: Rgb): Hsl {
  const red =
    r /
    255;

  const green =
    g /
    255;

  const blue =
    b /
    255;

  const max =
    Math.max(
      red,
      green,
      blue
    );

  const min =
    Math.min(
      red,
      green,
      blue
    );

  const lightness =
    (
      max +
      min
    ) /
    2;

  if (
    max ===
    min
  ) {
    return {
      h:
        0,

      s:
        0,

      l:
        lightness,
    };
  }

  const delta =
    max -
    min;

  const saturation =
    lightness >
    0.5
      ? delta /
        (
          2 -
          max -
          min
        )
      : delta /
        (
          max +
          min
        );

  let hue =
    0;

  if (
    max ===
    red
  ) {
    hue =
      (
        green -
        blue
      ) /
        delta +
      (
        green <
        blue
          ? 6
          : 0
      );
  } else if (
    max ===
    green
  ) {
    hue =
      (
        blue -
        red
      ) /
        delta +
      2;
  } else {
    hue =
      (
        red -
        green
      ) /
        delta +
      4;
  }

  hue *=
    60;

  return {
    h:
      hue,

    s:
      saturation,

    l:
      lightness,
  };
}

function hueDistance(
  first:
    number,
  second:
    number
) {
  const difference =
    Math.abs(
      first -
      second
    );

  return Math.min(
    difference,
    360 -
      difference
  );
}

function isUsableBrandColor(
  value:
    string
) {
  const rgb =
    hexToRgb(
      value
    );

  if (
    !rgb
  ) {
    return false;
  }

  const hsl =
    rgbToHsl(
      rgb
    );

  return (
    hsl.s >=
      0.18 &&
    hsl.l >=
      0.08 &&
    hsl.l <=
      0.92
  );
}

function hasSourceHueConsensus(
  source:
    RedesignSource
) {
  if (
    !source.brandColorAnchor ||
    source.brandColorCandidates.length <
      2
  ) {
    return false;
  }

  const anchorRgb =
    hexToRgb(
      source.brandColorAnchor
    );

  if (
    !anchorRgb
  ) {
    return false;
  }

  const anchorHue =
    rgbToHsl(
      anchorRgb
    ).h;

  const similar =
    source.brandColorCandidates
      .slice(
        0,
        4
      )
      .filter(
        (
          color
        ) => {
          const rgb =
            hexToRgb(
              color
            );

          if (
            !rgb
          ) {
            return false;
          }

          return (
            hueDistance(
              anchorHue,
              rgbToHsl(
                rgb
              ).h
            ) <=
            28
          );
        }
      );

  return (
    similar.length >=
    2
  );
}

function resolveBrandColor({
  source,
  visualPrimary,
  confidence,
}: {
  source:
    RedesignSource;

  visualPrimary:
    string;

  confidence:
    "low"
    | "medium"
    | "high";
}) {
  const sourceColor =
    source.brandColorAnchor;

  const sourceValid =
    isUsableBrandColor(
      sourceColor
    );

  const visualValid =
    isUsableBrandColor(
      visualPrimary
    );

  if (
    sourceValid &&
    visualValid
  ) {
    const sourceRgb =
      hexToRgb(
        sourceColor
      )!;

    const visualRgb =
      hexToRgb(
        visualPrimary
      )!;

    const distance =
      hueDistance(
        rgbToHsl(
          sourceRgb
        ).h,
        rgbToHsl(
          visualRgb
        ).h
      );

    /*
     * They agree → exact source color wins.
     */
    if (
      distance <=
      30
    ) {
      return sourceColor;
    }

    /*
     * HTML/CSS repeatedly points at the same hue.
     * This protects orange/green/red brands from the
     * vision model randomly turning them blue.
     */
    if (
      hasSourceHueConsensus(
        source
      )
    ) {
      return sourceColor;
    }

    /*
     * Strong screenshot evidence can override one weak
     * HTML candidate.
     */
    if (
      confidence ===
      "high"
    ) {
      return visualPrimary.toUpperCase();
    }

    return sourceColor;
  }

  if (
    sourceValid
  ) {
    return sourceColor;
  }

  if (
    visualValid
  ) {
    return visualPrimary.toUpperCase();
  }

  return "";
}

function relativeLuminance(
  color:
    Rgb
) {
  const channels =
    [
      color.r,
      color.g,
      color.b,
    ].map(
      (
        channel
      ) => {
        const value =
          channel /
          255;

        return value <=
          0.03928
          ? value /
            12.92
          : Math.pow(
              (
                value +
                0.055
              ) /
                1.055,
              2.4
            );
      }
    );

  return (
    channels[
      0
    ] *
      0.2126 +
    channels[
      1
    ] *
      0.7152 +
    channels[
      2
    ] *
      0.0722
  );
}

function getReadableTextColor(
  background:
    string
) {
  const rgb =
    hexToRgb(
      background
    );

  if (
    !rgb
  ) {
    return "#FFFFFF";
  }

  return relativeLuminance(
    rgb
  ) >
    0.48
      ? "#111111"
      : "#FFFFFF";
}

function enforceBrandTheme({
  theme,
  brandColor,
  spacing,
}: {
  theme:
    GeneratedTheme;

  brandColor:
    string;

  spacing:
    "tight"
    | "balanced"
    | "airy";
}): GeneratedTheme {
  if (
    !brandColor
  ) {
    return {
      ...theme,

      spacing,
    };
  }

  const brandRgb =
    hexToRgb(
      brandColor
    );

  const accentRgb =
    hexToRgb(
      theme.accent
    );

  if (
    !brandRgb ||
    !accentRgb
  ) {
    return {
      ...theme,

      spacing,

      accent:
        brandColor,

      accentText:
        getReadableTextColor(
          brandColor
        ),
    };
  }

  const distance =
    hueDistance(
      rgbToHsl(
        brandRgb
      ).h,
      rgbToHsl(
        accentRgb
      ).h
    );

  /*
   * Refining the shade is allowed.
   * Changing the hue family is not.
   */
  if (
    distance <=
    32
  ) {
    return {
      ...theme,

      spacing,
    };
  }

  return {
    ...theme,

    spacing,

    accent:
      brandColor,

    accentText:
      getReadableTextColor(
        brandColor
      ),
  };
}

/* =========================================================
   SOURCE IMAGES
========================================================= */

function getSourceImages(
  source:
    RedesignSource
) {
  return source.assets.filter(
    (
      asset
    ) =>
      asset.kind ===
      "image"
  );
}

function sourceImagePriority(
  asset:
    RedesignSourceAsset
) {
  switch (
    asset.role
  ) {
    case "team":
      return 120;

    case "project":
      return 110;

    case "hero":
      return 90;

    case "content":
      return 40;

    default:
      return 10;
  }
}

function createSourceImageAssigner(
  source:
    RedesignSource
) {
  const used =
    new Set<string>();

  const all =
    getSourceImages(
      source
    );

  function take(
    candidates:
      RedesignSourceAsset[]
  ) {
    const sorted =
      [
        ...candidates,
      ].sort(
        (
          first,
          second
        ) =>
          sourceImagePriority(
            second
          ) -
          sourceImagePriority(
            first
          )
      );

    for (
      const asset of
        sorted
    ) {
      if (
        used.has(
          asset.id
        )
      ) {
        continue;
      }

      used.add(
        asset.id
      );

      return asset.id;
    }

    return "";
  }

  return {
    takeForSections(
      indexes:
        number[]
    ) {
      return take(
        all.filter(
          (
            asset
          ) =>
            asset.sectionIndex !==
              null &&
            indexes.includes(
              asset.sectionIndex
            )
        )
      );
    },

    takeRole(
      role:
        RedesignSourceAsset["role"]
    ) {
      return take(
        all.filter(
          (
            asset
          ) =>
            asset.role ===
            role
        )
      );
    },

    takeAny() {
      return take(
        all
      );
    },
  };
}

function getSourcePurposes({
  source,
  indexes,
}: {
  source:
    RedesignSource;

  indexes:
    number[];
}) {
  return source.homepageSections
    .filter(
      (
        section
      ) =>
        indexes.includes(
          section.index
        )
    )
    .map(
      (
        section
      ) =>
        section.purpose
    );
}

function shouldForceSourceImage({
  source,
  section,
}: {
  source:
    RedesignSource;

  section:
    GeneratedSection;
}) {
  const purposes =
    getSourcePurposes({
      source,

      indexes:
        section.sourceSectionIndexes,
    });

  return (
    purposes.includes(
      "team"
    ) ||
    purposes.includes(
      "showcase"
    )
  );
}

function takeSourceImageForSection({
  source,
  assigner,
  section,
}: {
  source:
    RedesignSource;

  assigner:
    ReturnType<
      typeof createSourceImageAssigner
    >;

  section:
    GeneratedSection;
}) {
  let assetId =
    assigner.takeForSections(
      section.sourceSectionIndexes
    );

  if (
    assetId
  ) {
    return assetId;
  }

  const purposes =
    getSourcePurposes({
      source,

      indexes:
        section.sourceSectionIndexes,
    });

  if (
    purposes.includes(
      "team"
    )
  ) {
    assetId =
      assigner.takeRole(
        "team"
      );
  }

  if (
    !assetId &&
    purposes.includes(
      "showcase"
    )
  ) {
    assetId =
      assigner.takeRole(
        "project"
      );
  }

  if (
    !assetId &&
    purposes.includes(
      "about"
    )
  ) {
    assetId =
      assigner.takeRole(
        "content"
      );
  }

  return assetId;
}

/* =========================================================
   STOCK ASSIGNER
========================================================= */

function createStockImageAssigner(
  assetIdsByQuery:
    string[][]
) {
  const cursors =
    assetIdsByQuery.map(
      () =>
        0
    );

  const used =
    new Set<string>();

  return (
    queryIndex:
      number
  ) => {
    if (
      queryIndex <
        0 ||
      queryIndex >=
        assetIdsByQuery.length
    ) {
      return "";
    }

    const ids =
      assetIdsByQuery[
        queryIndex
      ] ??
      [];

    while (
      cursors[
        queryIndex
      ] <
      ids.length
    ) {
      const id =
        ids[
          cursors[
            queryIndex
          ]
        ];

      cursors[
        queryIndex
      ] +=
        1;

      if (
        used.has(
          id
        )
      ) {
        continue;
      }

      used.add(
        id
      );

      return id;
    }

    return "";
  };
}

/* =========================================================
   IMAGE STRATEGY
========================================================= */

function getImageStrategy(
  source:
    RedesignSource
):
  | "source-first"
  | "hybrid"
  | "stock-led" {
  const sourceImages =
    getSourceImages(
      source
    );

  const valuableImages =
    sourceImages.filter(
      (
        asset
      ) =>
        [
          "team",
          "project",
          "hero",
        ].includes(
          asset.role
        )
    );

  if (
    valuableImages.length >=
    3
  ) {
    return "source-first";
  }

  if (
    sourceImages.length >=
    2
  ) {
    return "hybrid";
  }

  return "stock-led";
}

/* =========================================================
   PREVIOUS DESIGN
========================================================= */

function getPreviousDesignSummary(
  value:
    unknown
) {
  const parsed =
    RedesignPreviewSpecSchema.safeParse(
      value
    );

  if (
    !parsed.success
  ) {
    return null;
  }

  const spec =
    parsed.data;

  return {
    conceptName:
      spec.conceptName,

    designArchetype:
      spec.designArchetype ??
      null,

    creativeDirection:
      spec.creativeDirection,

    designPersonality:
      spec.designPersonality,

    visualDensity:
      spec.visualDensity ??
      null,

    typography:
      spec.typography,

    theme:
      spec.theme,

    heroLayout:
      spec.hero.layout,

    sectionSequence:
      spec.sections.map(
        (
          section
        ) => ({
          type:
            section.type,

          layout:
            section.layout,

          sourceSectionIndexes:
            section.sourceSectionIndexes,
        })
      ),

    motion:
      spec.motion,
  };
}

/* =========================================================
   GENERATE
========================================================= */

export async function generateRedesignPreview({
  source,
  analysis,
  designResearch,
  previousSpec,
  screenshot,
}: {
  source:
    RedesignSource;

  analysis:
    RedesignAnalysisContext;

  designResearch?:
    string
    | null;

  previousSpec?:
    unknown;

  screenshot?:
    Buffer
    | null;
}): Promise<GeneratedRedesignPreview> {
  const openai =
    createOpenAIClient();

  const model =
    process.env
      .OPENAI_REDESIGN_MODEL ??
    DEFAULT_MODEL;

  const creativeSeed =
    randomUUID();

  const previousDesign =
    getPreviousDesignSummary(
      previousSpec
    );

  const archetype =
    selectRedesignArchetype({
      seed:
        `${source.brandName}:${creativeSeed}`,

      previousArchetype:
        previousDesign
          ?.designArchetype ??
        null,
    });

  const archetypePrompt =
    getArchetypePrompt(
      archetype
    );

  const imageStrategy =
    getImageStrategy(
      source
    );

  const realLogo =
    source.assets.find(
      (
        asset
      ) =>
        asset.kind ===
        "logo"
    ) ??
    null;

  const sourceImages =
    getSourceImages(
      source
    )
      .slice(
        0,
        24
      )
      .map(
        (
          asset
        ) => ({
          id:
            asset.id,

          role:
            asset.role,

          sectionIndex:
            asset.sectionIndex,

          alt:
            asset.alt,

          context:
            asset.context,
        })
      );

  const sourceForModel = {
    brandName:
      source.brandName,

    finalUrl:
      source.finalUrl,

    pageTitle:
      source.pageTitle,

    metaDescription:
      source.metaDescription,

    navigation:
      source.navigation,

    headings:
      source.headings,

    paragraphs:
      source.paragraphs,

    existingCtas:
      source.ctas,

    existingColorHints:
      source.colorHints,

    brandColorAnchor:
      source.brandColorAnchor,

    brandColorCandidates:
      source.brandColorCandidates,

    hasRealLogo:
      Boolean(
        realLogo
      ),

    sourceImages,

    currentHomepageHero:
      source.homepageHero,

    currentHomepageSections:
      source.homepageSections,
  };

  const userText =
    `
Create a client-ready homepage redesign concept for this
REAL company.

CREATIVE SEED:
${creativeSeed}

=========================================================
SOURCE
=========================================================

${JSON.stringify(
  sourceForModel
)}

=========================================================
EXISTING WEBSITE ANALYSIS
=========================================================

${JSON.stringify(
  analysis
)}

=========================================================
MAXIBESTOF RESEARCH
=========================================================

${designResearch ?? "No MaxiBestOf memo is available."}

=========================================================
MANDATORY ART DIRECTION
=========================================================

${archetypePrompt}

=========================================================
SOURCE IMAGE STRATEGY
=========================================================

${imageStrategy}

source-first:
Prefer real company/project/team imagery whenever relevant.

hybrid:
Use real source imagery for identity-bearing sections and
stock for conceptual supporting sections.

stock-led:
Source imagery is limited, so use carefully chosen stock
while preserving any useful real company assets.

=========================================================
PREVIOUS CONCEPT
=========================================================

${JSON.stringify(
  previousDesign
)}

The new concept must NOT look like the previous concept.

Do not output HTML.

Return only the structured specification.
    `.trim();

  const content: Array<
    | {
        type:
          "input_text";

        text:
          string;
      }
    | {
        type:
          "input_image";

        image_url:
          string;

        detail:
          "high";
      }
  > = [
    {
      type:
        "input_text",

      text:
        userText,
    },
  ];

  if (
    screenshot
  ) {
    content.push({
      type:
        "input_image",

      image_url:
        `data:image/jpeg;base64,${screenshot.toString(
          "base64"
        )}`,

      detail:
        "high",
    });
  }

  const response =
    await openai.responses.parse({
      model,

      reasoning: {
        effort:
          "medium",
      },

      input: [
        {
          role:
            "system",

          content: `
You are a senior digital Art Director designing a homepage
concept that a professional web designer can confidently
show to a real potential client.

=========================================================
THIS IS NOT A GENERIC LANDING PAGE GENERATOR
=========================================================

The most common failure is repeating:

- white background
- split hero
- tiny eyebrow
- service list
- image mosaic
- about text
- rectangular CTA

Do NOT fall back to this pattern.

A mandatory design archetype is supplied in the user's
brief.

You MUST execute that archetype.

The backend will also enforce its layout grammar.

=========================================================
MAXIBESTOF
=========================================================

MaxiBestOf is genuine design research.

Actually use it.

Its role is to provide:

- art direction
- real website references
- typography inspiration
- color-system principles
- composition ideas
- section ideas
- interaction ideas
- image-treatment ideas

The final concept should visibly show that research.

However:

Do NOT copy a reference pixel-for-pixel.

Do NOT replace the client's actual brand with the
reference's brand.

Do NOT force the reference site's information architecture
onto the company.

Translate reference PRINCIPLES into this company's design.

=========================================================
BRAND COLOR
=========================================================

Determine the real company's brand identity from:

1. screenshot
2. repeated visible website colors
3. actual logo
4. supplied HTML color candidates

brandIdentity must describe the SOURCE company.

Do not allow MaxiBestOf to influence brandIdentity.

If a company is clearly orange:
keep an orange-family accent.

If it is clearly blue:
keep a blue-family accent.

If it is clearly green:
keep a green-family accent.

You may refine shade and saturation.

You may NOT randomly change the fundamental brand hue.

=========================================================
DENSITY
=========================================================

Premium does NOT mean empty.

Especially for:

- trades
- construction
- local service businesses
- roofing
- solar
- painting
- landscaping
- manufacturing
- technical services

the page should generally feel complete and substantial.

Use useful real content.

Avoid enormous blank areas between sections.

The supplied archetype defines the desired visual and
content density.

=========================================================
SOURCE IMAGES
=========================================================

Real source imagery has high value.

Source images may include:

- actual employees
- actual team
- actual projects
- actual workshop
- actual company environment
- actual references

Never replace actual employees with stock employees.

Never represent a named real project using unrelated stock.

When source images are useful:
set imagePreference to "source".

Stock is supporting material.

=========================================================
SOURCE STRUCTURE
=========================================================

The source's real homepage structure is the semantic source
of truth.

Preserve useful sections.

Prune only content that is genuinely:

- duplicated
- empty
- obsolete
- very low-value

Reorder only with a real UX or conversion reason.

Visual variety should primarily come from ART DIRECTION,
not from inventing fake content.

=========================================================
SECTION MAPPING
=========================================================

Every generated section must contain its real:

sourceSectionIndexes

Do not create fake mappings.

=========================================================
TYPOGRAPHY
=========================================================

Available web fonts:

${REDESIGN_WEB_FONTS.join(
  "\n"
)}

Typography is a major design decision.

Use MaxiBestOf typography research.

Avoid always using:

Manrope + Inter

unless that is genuinely the strongest direction.

Consider personality, width, proportions, x-height,
weight and headline character.

=========================================================
IMAGERY
=========================================================

Create 2–3 different Pexels queries in English.

Do not make all queries nearly identical.

Good research usually contains a combination of:

- real craft / person at work
- completed environment/result
- material/detail/texture

when relevant.

=========================================================
HERO
=========================================================

The selected archetype provides a hero toolbox.

Use it.

The hero must feel like a COMPOSITION rather than:

left text + right rectangle image

every single time.

Headline:

- preferably 4–9 words
- clear
- concise
- no generic AI slogans
- natural line breaks
- maximum 90 characters

=========================================================
SECTIONS
=========================================================

The selected archetype provides allowed layouts.

Use those patterns intentionally.

A section must not exist only because the schema permits it.

Each section should have a visual reason to exist.

Use variation in:

- scale
- alignment
- media size
- column proportions
- surface treatment
- information density
- type hierarchy

=========================================================
NO DUPLICATE NUMBERING
=========================================================

Never put:

01
02
03
Step 1
Schritt 1

inside labels.

The renderer handles numbering.

=========================================================
MOTION
=========================================================

The renderer supports GSAP and ScrollTrigger.

Motion should feel expensive and controlled.

Prefer:

- 0.7–1.2 second reveals
- power3-style easing
- restrained parallax
- image clip reveals
- subtle stagger
- gentle image scaling

Avoid:

- hyperactive hover
- immediate snapping
- animation on everything
- excessive floating elements

=========================================================
REGENERATION
=========================================================

If a PREVIOUS CONCEPT exists, materially differentiate the
new design.

Do NOT just recolor it.

Change several of:

- design composition
- hero treatment
- typography
- section layouts
- image treatment
- surface treatment
- rhythm
- motion
- navigation

The server has deliberately selected a different design
archetype from the previous concept.

Respect that.

=========================================================
MAXIBESTOF TRACE
=========================================================

inspirationTrace must explain what was ACTUALLY used from
the research.

Do not write vague statements such as:

"used modern inspiration"

Instead state concrete principles:

- oversized left-aligned headline inspired by X
- image crop logic inspired by Y
- typography contrast inspired by Z
- border/grid rhythm inspired by X

=========================================================
FACTUAL ACCURACY
=========================================================

Never invent:

- reviews
- testimonials
- projects
- statistics
- years
- employee counts
- certifications
- awards
- guarantees
- prices
- locations
- customers
- services

unless supported by the source.

=========================================================
FINAL DESIGN CRITIQUE
=========================================================

Before returning the result, silently review it.

Reject your own first idea if:

- it looks like the standard AI layout
- it is too empty
- its color identity does not match the company
- it ignores source images
- it ignores MaxiBestOf
- it repeats the previous design
- every section uses the same alignment
- every section uses cards
- typography feels generic
- the page could belong to any company

Improve it before returning.

The result should feel like an actual design studio made a
specific concept for this exact business.

Return only the structured specification.
          `.trim(),
        },

        {
          role:
            "user",

          content,
        },
      ],

      text: {
        format:
          zodTextFormat(
            GeneratedRedesignSpecSchema,
            "redesign_preview"
          ),
      },
    });

  const parsed =
    response.output_parsed;

  if (
    !parsed
  ) {
    throw new Error(
      "Redesign generation returned no structured result."
    );
  }

  /* =======================================================
     ARCHETYPE LAYOUT ENFORCEMENT
  ======================================================= */

  const normalizedSections =
    normalizeSections({
      sections:
        parsed.sections,

      copyLanguage:
        parsed.copyLanguage,

      queryCount:
        parsed.stockImageQueries.length,

      sourceSections:
        source.homepageSections,

      archetype,

      creativeSeed,
    });

  if (
    normalizedSections.length ===
    0
  ) {
    throw new Error(
      "The redesign did not produce any valid homepage sections."
    );
  }

  const orderedSections =
    applySourceSectionOrder({
      sections:
        normalizedSections,

      sourceSections:
        source.homepageSections,

      structurePlan:
        parsed.structurePlan,
    });

  const finalStructurePlan =
    buildFinalStructurePlan({
      requestedPlan:
        parsed.structurePlan,

      sourceSections:
        source.homepageSections,

      sections:
        orderedSections,
    });

  /* =======================================================
     BRAND COLOR
  ======================================================= */

  const resolvedBrandColor =
    resolveBrandColor({
      source,

      visualPrimary:
        parsed.brandIdentity.primaryColor,

      confidence:
        parsed.brandIdentity.confidence,
    });

  const finalTheme =
    enforceBrandTheme({
      theme:
        parsed.theme,

      brandColor:
        resolvedBrandColor,

      spacing:
        getArchetypeSpacing(
          archetype
        ),
    });

  const finalBrandIdentity = {
    ...parsed.brandIdentity,

    primaryColor:
      resolvedBrandColor ||
      parsed.brandIdentity.primaryColor,
  };

  /* =======================================================
     HERO LAYOUT
  ======================================================= */

  const enforcedHeroLayout =
    applyArchetypeHeroLayout({
      requested:
        parsed.hero.layout,

      archetype,

      seed:
        creativeSeed,
    });

  /* =======================================================
     STOCK
  ======================================================= */

  const stock =
    await getStockImageSets({
      queries:
        parsed.stockImageQueries,

      seed:
        creativeSeed,
    });

  const assignStockImage =
    createStockImageAssigner(
      stock.assetIdsByQuery
    );

  const sourceAssigner =
    createSourceImageAssigner(
      source
    );

  /* =======================================================
     HERO IMAGE
  ======================================================= */

  const heroQueryIndex =
    normalizeQueryIndex(
      parsed.hero.imageQueryIndex,
      0,
      parsed.stockImageQueries.length
    );

  let heroImageAssetId =
    "";

  if (
    parsed.hero.imagePreference ===
      "source" ||
    imageStrategy ===
      "source-first"
  ) {
    heroImageAssetId =
      sourceAssigner.takeRole(
        "hero"
      );
  }

  if (
    !heroImageAssetId &&
    parsed.hero.imagePreference !==
      "none" &&
    parsed.hero.imagePreference !==
      "source"
  ) {
    heroImageAssetId =
      assignStockImage(
        heroQueryIndex
      );
  }

  if (
    !heroImageAssetId &&
    parsed.hero.imagePreference !==
      "none"
  ) {
    heroImageAssetId =
      sourceAssigner.takeAny();
  }

  const {
    imageQueryIndex:
      _heroImageQueryIndex,

    imagePreference:
      _heroImagePreference,

    ...heroWithoutImageLogic
  } =
    parsed.hero;

  const hero = {
    ...heroWithoutImageLogic,

    layout:
      enforcedHeroLayout,

    imageAssetId:
      heroImageAssetId,
  };

  /* =======================================================
     SECTIONS
  ======================================================= */

  const sections =
    orderedSections.map(
      (
        section
      ) => {
        const {
          imageQueryIndex,
          imagePreference,
          items,
          ...sectionWithoutImageLogic
        } =
          section;

        const forceSource =
          shouldForceSourceImage({
            source,

            section,
          });

        const sourcePreferred =
          forceSource ||
          imagePreference ===
            "source" ||
          (
            imageStrategy ===
              "source-first" &&
            [
              "about",
              "showcase",
              "proof",
            ].includes(
              section.type
            )
          );

        const showcaseUsesItems =
          section.type ===
            "showcase" &&
          [
            "mosaic",
            "bento",
            "split",
          ].includes(
            section.layout
          );

        let sectionAssetId =
          "";

        if (
          sourcePreferred &&
          !showcaseUsesItems
        ) {
          sectionAssetId =
            takeSourceImageForSection({
              source,

              assigner:
                sourceAssigner,

              section,
            });
        }

        if (
          !sectionAssetId &&
          !showcaseUsesItems &&
          imagePreference !==
            "none" &&
          !forceSource
        ) {
          sectionAssetId =
            imageQueryIndex >=
              0
              ? assignStockImage(
                  imageQueryIndex
                )
              : "";
        }

        if (
          !sectionAssetId &&
          !showcaseUsesItems &&
          imagePreference !==
            "none" &&
          sourcePreferred
        ) {
          sectionAssetId =
            sourceAssigner.takeAny();
        }

        const itemResults =
          items.map(
            (
              item
            ) => {
              const {
                imageQueryIndex:
                  itemQuery,

                imagePreference:
                  itemPreference,

                ...itemWithoutImageLogic
              } =
                item;

              let itemAssetId =
                "";

              if (
                forceSource ||
                itemPreference ===
                  "source" ||
                (
                  imageStrategy ===
                    "source-first" &&
                  section.type ===
                    "showcase"
                )
              ) {
                itemAssetId =
                  takeSourceImageForSection({
                    source,

                    assigner:
                      sourceAssigner,

                    section,
                  });
              }

              if (
                !itemAssetId &&
                itemPreference !==
                  "none" &&
                !forceSource
              ) {
                itemAssetId =
                  itemQuery >=
                    0
                    ? assignStockImage(
                        itemQuery
                      )
                    : "";
              }

              return {
                ...itemWithoutImageLogic,

                imageAssetId:
                  itemAssetId,
              };
            }
          );

        return {
          ...sectionWithoutImageLogic,

          imageAssetId:
            sectionAssetId,

          items:
            itemResults,
        };
      }
    );

  /* =======================================================
     ASSETS
  ======================================================= */

  const assets:
    RedesignPreviewSpec["assets"] =
    source.assets.map(
      (
        asset
      ) => ({
        id:
          asset.id,

        url:
          asset.url,

        alt:
          asset.alt,

        kind:
          asset.kind,

        source:
          "source",

        role:
          asset.role,

        sectionIndex:
          asset.sectionIndex,
      })
    );

  assets.push(
    ...stock.assets
  );

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigation = {
    ...parsed.navigation,

    items:
      uniqueStrings(
        parsed.navigation.items,
        6
      ),
  };

  /* =======================================================
     TICKER
  ======================================================= */

  const ticker = {
    ...parsed.ticker,

    items:
      uniqueStrings(
        parsed.ticker.items,
        8
      ),
  };

  if (
    ticker.items.length <
    3
  ) {
    ticker.enabled =
      false;
  }

  /* =======================================================
     FINAL SPEC
  ======================================================= */

  const spec:
    RedesignPreviewSpec = {
    copyLanguage:
      parsed.copyLanguage,

    conceptName:
      parsed.conceptName,

    creativeDirection:
      parsed.creativeDirection,

    designPersonality:
      parsed.designPersonality,

    designArchetype:
      archetype.id as
        RedesignArchetypeId,

    visualDensity:
      archetype.visualDensity,

    contentDensity:
      archetype.contentDensity,

    brandIdentity:
      finalBrandIdentity,

    structurePlan:
      finalStructurePlan,

    inspirationTrace:
      parsed.inspirationTrace,

    typography:
      parsed.typography,

    theme:
      finalTheme,

    navigation,

    hero,

    ticker,

    sections,

    footer:
      parsed.footer,

    motion:
      parsed.motion,

    sourceWebsiteUrl:
      source.finalUrl,

    sourceBrandName:
      source.brandName,

    assets,

    generatedAt:
      new Date()
        .toISOString(),
  };

  const validated =
    RedesignPreviewSpecSchema.parse(
      spec
    );

  return {
    spec:
      validated,

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