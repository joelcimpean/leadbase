import "server-only";

import {
  createHash,
} from "node:crypto";

/* =========================================================
   TYPES
========================================================= */

export type RedesignHeroLayout =
  | "split"
  | "centered"
  | "fullbleed"
  | "offset"
  | "editorial"
  | "poster"
  | "frame";

export type RedesignSectionLayout =
  | "cards"
  | "split"
  | "list"
  | "mosaic"
  | "editorial"
  | "steps"
  | "banner"
  | "bento"
  | "media"
  | "statement"
  | "index";

export type RedesignSectionType =
  | "services"
  | "about"
  | "showcase"
  | "proof"
  | "process"
  | "cta";

export type VisualDensity =
  | "compact"
  | "balanced"
  | "expressive";

export type ContentDensity =
  | "standard"
  | "rich";

export const REDESIGN_ARCHETYPE_IDS = [
  "editorial-index",
  "immersive-craft",
  "framed-studio",
  "poster-grid",
  "structured-corporate",
  "architectural-offset",
  "dense-bento",
  "heritage-editorial",
  "kinetic-index",
  "modular-premium",
  "technical-blueprint",
  "local-human",
] as const;

export type RedesignArchetypeId =
  (
    typeof REDESIGN_ARCHETYPE_IDS
  )[number];

export type RedesignArchetype = {
  id:
    RedesignArchetypeId;

  name:
    string;

  description:
    string;

  visualDensity:
    VisualDensity;

  contentDensity:
    ContentDensity;

  heroLayouts:
    RedesignHeroLayout[];

  sectionLayouts:
    Record<
      RedesignSectionType,
      RedesignSectionLayout[]
    >;

  typographyDirection:
    string;

  compositionDirection:
    string;

  imageDirection:
    string;

  colorDirection:
    string;

  motionDirection:
    string;

  avoid:
    string[];
};

/* =========================================================
   ARCHETYPE LIBRARY
========================================================= */

export const REDESIGN_ARCHETYPES:
  RedesignArchetype[] = [
    {
      id:
        "editorial-index",

      name:
        "Editorial Index",

      description:
        "A typography-led editorial composition with strong indexes, asymmetric text blocks and carefully controlled negative space.",

      visualDensity:
        "balanced",

      contentDensity:
        "rich",

      heroLayouts: [
        "editorial",
        "offset",
      ],

      sectionLayouts: {
        services: [
          "index",
          "editorial",
        ],

        about: [
          "statement",
          "media",
        ],

        showcase: [
          "mosaic",
          "bento",
        ],

        proof: [
          "index",
          "editorial",
        ],

        process: [
          "index",
          "steps",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Strong grotesk or editorial typography. Headlines can be oversized, tightly tracked and deliberately broken across lines. Avoid tiny generic headings.",

      compositionDirection:
        "Use asymmetric editorial grids, narrow text columns against wider media, numbered indexes and strong alignment systems.",

      imageDirection:
        "Photography should feel curated and deliberately cropped rather than dropped into generic cards.",

      colorDirection:
        "Mostly restrained surfaces with the real brand color used confidently for hierarchy and emphasis.",

      motionDirection:
        "Slow editorial reveals, image clipping and understated section movement.",

      avoid: [
        "three identical cards",
        "generic centered SaaS sections",
        "huge empty vertical gaps",
      ],
    },

    {
      id:
        "immersive-craft",

      name:
        "Immersive Craft",

      description:
        "A tactile, image-rich direction for companies where materials, workmanship and real-world execution matter.",

      visualDensity:
        "expressive",

      contentDensity:
        "rich",

      heroLayouts: [
        "fullbleed",
        "poster",
      ],

      sectionLayouts: {
        services: [
          "split",
          "bento",
        ],

        about: [
          "media",
          "split",
        ],

        showcase: [
          "mosaic",
          "bento",
        ],

        proof: [
          "statement",
          "bento",
        ],

        process: [
          "steps",
          "index",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Confident contemporary typography with large headlines and strong contrast against photography.",

      compositionDirection:
        "Photography carries substantial visual weight. Use edge-to-edge media, material details and alternating dense/quiet compositions.",

      imageDirection:
        "Prefer actual source projects, team and craftsmanship imagery. Stock is supporting material only.",

      colorDirection:
        "Preserve the client's core brand hue and combine it with grounded neutrals.",

      motionDirection:
        "Slow image zoom, subtle parallax, clip reveals and calm hover scaling.",

      avoid: [
        "tiny imagery",
        "text-only sections when real imagery exists",
        "generic icon-card grids",
      ],
    },

    {
      id:
        "framed-studio",

      name:
        "Framed Studio",

      description:
        "A polished studio-style direction using framed compositions, precise grids, defined surfaces and curated media.",

      visualDensity:
        "balanced",

      contentDensity:
        "standard",

      heroLayouts: [
        "frame",
        "offset",
      ],

      sectionLayouts: {
        services: [
          "cards",
          "split",
        ],

        about: [
          "media",
          "editorial",
        ],

        showcase: [
          "bento",
          "split",
        ],

        proof: [
          "cards",
          "statement",
        ],

        process: [
          "steps",
          "list",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Controlled modern typography with refined scale contrast and restrained weights.",

      compositionDirection:
        "Sections can sit inside framed surfaces, inset media compositions and clearly constructed grid systems.",

      imageDirection:
        "Use crisp large images with deliberate framing rather than generic full-width sections everywhere.",

      colorDirection:
        "Use brand color in buttons, frames, key surfaces and small directional details.",

      motionDirection:
        "Soft scaling, gentle lift and precise reveal timing.",

      avoid: [
        "floating pill everything",
        "excessive rounded cards",
        "unstructured whitespace",
      ],
    },

    {
      id:
        "poster-grid",

      name:
        "Poster Grid",

      description:
        "A bold graphic direction inspired by posters, large typography and modular visual blocks.",

      visualDensity:
        "expressive",

      contentDensity:
        "rich",

      heroLayouts: [
        "poster",
        "fullbleed",
      ],

      sectionLayouts: {
        services: [
          "index",
          "bento",
        ],

        about: [
          "statement",
          "split",
        ],

        showcase: [
          "bento",
          "mosaic",
        ],

        proof: [
          "statement",
          "index",
        ],

        process: [
          "index",
          "steps",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Bold display scale, compact spacing and highly intentional headline wrapping.",

      compositionDirection:
        "Think graphic poster rather than corporate template: strong blocks, contrast, oversized type and modular imagery.",

      imageDirection:
        "Images should form graphic compositions rather than simple card thumbnails.",

      colorDirection:
        "Use the real brand color more boldly as large blocks or graphic accents.",

      motionDirection:
        "Staggered typography, clipped media and subtle drift.",

      avoid: [
        "safe corporate card stack",
        "tiny typography",
        "washed-out brand color",
      ],
    },

    {
      id:
        "structured-corporate",

      name:
        "Structured Corporate",

      description:
        "A confident, information-rich business direction with strong hierarchy and conversion clarity without becoming generic.",

      visualDensity:
        "compact",

      contentDensity:
        "rich",

      heroLayouts: [
        "split",
        "offset",
      ],

      sectionLayouts: {
        services: [
          "list",
          "index",
        ],

        about: [
          "split",
          "media",
        ],

        showcase: [
          "split",
          "mosaic",
        ],

        proof: [
          "cards",
          "index",
        ],

        process: [
          "steps",
          "list",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Highly readable professional grotesk system with decisive headings and compact information hierarchy.",

      compositionDirection:
        "Use dense information blocks, strong dividing lines and disciplined grid relationships.",

      imageDirection:
        "Images support proof and context rather than acting as decoration.",

      colorDirection:
        "Brand-led corporate palette with strong readable contrast.",

      motionDirection:
        "Quiet slide reveals, subtle hover states and limited parallax.",

      avoid: [
        "overly artistic empty sections",
        "low information density",
        "generic pastel cards",
      ],
    },

    {
      id:
        "architectural-offset",

      name:
        "Architectural Offset",

      description:
        "A spatial, asymmetric direction with offset media, architectural proportions and sophisticated editorial rhythm.",

      visualDensity:
        "balanced",

      contentDensity:
        "standard",

      heroLayouts: [
        "offset",
        "editorial",
      ],

      sectionLayouts: {
        services: [
          "editorial",
          "split",
        ],

        about: [
          "media",
          "statement",
        ],

        showcase: [
          "mosaic",
          "split",
        ],

        proof: [
          "editorial",
          "statement",
        ],

        process: [
          "index",
          "steps",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Architectural grotesk or restrained editorial pairing with strong proportional hierarchy.",

      compositionDirection:
        "Offset columns, large image fields, intentionally uneven grid spans and strong vertical alignment.",

      imageDirection:
        "Photography should often dominate one side of the composition and create spatial rhythm.",

      colorDirection:
        "Neutral architectural surfaces with the brand hue preserved as a disciplined accent.",

      motionDirection:
        "Image parallax, section drift and calm clip reveals.",

      avoid: [
        "symmetrical three-column repetition",
        "generic centered headers",
        "decorative gradients",
      ],
    },

    {
      id:
        "dense-bento",

      name:
        "Dense Bento",

      description:
        "A modern modular composition with substantial content density, varied tile sizes and strong visual grouping.",

      visualDensity:
        "compact",

      contentDensity:
        "rich",

      heroLayouts: [
        "frame",
        "split",
      ],

      sectionLayouts: {
        services: [
          "bento",
          "cards",
        ],

        about: [
          "bento",
          "media",
        ],

        showcase: [
          "bento",
          "mosaic",
        ],

        proof: [
          "bento",
          "cards",
        ],

        process: [
          "steps",
          "index",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Compact modern typography with clear hierarchy inside modular content blocks.",

      compositionDirection:
        "Use varied tile spans, dominant and supporting blocks and compact spacing between meaningful content.",

      imageDirection:
        "Mix media-heavy and text-heavy modules rather than making every tile identical.",

      colorDirection:
        "Brand color may appear across multiple surfaces while maintaining readable contrast.",

      motionDirection:
        "Soft card lift, staggered tile entry and subtle image scale.",

      avoid: [
        "six identical cards",
        "large dead areas",
        "every tile using the same dimensions",
      ],
    },

    {
      id:
        "heritage-editorial",

      name:
        "Heritage Editorial",

      description:
        "A refined direction for established businesses with history, craft, tradition or a strong regional identity.",

      visualDensity:
        "balanced",

      contentDensity:
        "rich",

      heroLayouts: [
        "editorial",
        "frame",
      ],

      sectionLayouts: {
        services: [
          "list",
          "editorial",
        ],

        about: [
          "statement",
          "media",
        ],

        showcase: [
          "split",
          "mosaic",
        ],

        proof: [
          "statement",
          "editorial",
        ],

        process: [
          "list",
          "steps",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "A contemporary grotesk may be paired with a restrained serif only when the company genuinely benefits from heritage character.",

      compositionDirection:
        "Narrative typography, historical or company imagery and careful editorial pacing.",

      imageDirection:
        "Real company and historic/project imagery should be strongly preferred over generic stock.",

      colorDirection:
        "Keep recognizable brand color but pair it with warm, grounded neutrals when appropriate.",

      motionDirection:
        "Slow fades, image reveals and restrained transitions.",

      avoid: [
        "fake luxury serif styling",
        "minimalism that removes company substance",
        "generic startup visuals",
      ],
    },

    {
      id:
        "kinetic-index",

      name:
        "Kinetic Index",

      description:
        "A contemporary system built around large indexes, horizontal rhythm and subtle movement.",

      visualDensity:
        "compact",

      contentDensity:
        "rich",

      heroLayouts: [
        "fullbleed",
        "offset",
      ],

      sectionLayouts: {
        services: [
          "index",
          "list",
        ],

        about: [
          "statement",
          "split",
        ],

        showcase: [
          "media",
          "mosaic",
        ],

        proof: [
          "index",
          "statement",
        ],

        process: [
          "index",
          "steps",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Strong contemporary sans typography with compact vertical rhythm and large directional labels.",

      compositionDirection:
        "Horizontal rules, indexed rows, offset media and alternating large/small visual moments.",

      imageDirection:
        "Use large visual interruptions between dense indexed content sections.",

      colorDirection:
        "Brand color used in numbering, indicators, controls and occasional large surfaces.",

      motionDirection:
        "Stagger, controlled section drift and smooth hover underlines.",

      avoid: [
        "static card-only page",
        "identical section headers",
        "oversized whitespace",
      ],
    },

    {
      id:
        "modular-premium",

      name:
        "Modular Premium",

      description:
        "A polished premium system using large modular sections, restrained details and clear image hierarchy.",

      visualDensity:
        "balanced",

      contentDensity:
        "standard",

      heroLayouts: [
        "frame",
        "editorial",
      ],

      sectionLayouts: {
        services: [
          "cards",
          "bento",
        ],

        about: [
          "split",
          "media",
        ],

        showcase: [
          "bento",
          "mosaic",
        ],

        proof: [
          "statement",
          "cards",
        ],

        process: [
          "steps",
          "list",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Premium contemporary typography with careful scale, strong readability and minimal unnecessary decoration.",

      compositionDirection:
        "Large polished modules, clear transitions and visual anchors rather than endless white sections.",

      imageDirection:
        "One strong image is better than several weak decorative images.",

      colorDirection:
        "Use a sophisticated refinement of the real brand hue rather than replacing it.",

      motionDirection:
        "Soft-scale imagery and smooth restrained section reveals.",

      avoid: [
        "fake luxury styling",
        "pale unreadable copy",
        "generic gradient backgrounds",
      ],
    },

    {
      id:
        "technical-blueprint",

      name:
        "Technical Blueprint",

      description:
        "A precise technical system for construction, engineering, energy, manufacturing and specialist services.",

      visualDensity:
        "compact",

      contentDensity:
        "rich",

      heroLayouts: [
        "split",
        "poster",
      ],

      sectionLayouts: {
        services: [
          "index",
          "list",
        ],

        about: [
          "split",
          "statement",
        ],

        showcase: [
          "split",
          "bento",
        ],

        proof: [
          "index",
          "cards",
        ],

        process: [
          "steps",
          "index",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Technical, structured grotesk typography with high clarity and strong hierarchy.",

      compositionDirection:
        "Grid lines, indexed data, technical spacing and deliberate information architecture.",

      imageDirection:
        "Use real workmanship, systems, projects and materials rather than lifestyle filler.",

      colorDirection:
        "Brand color stays dominant and works against engineered neutral surfaces.",

      motionDirection:
        "Precise stagger and clean slide reveals with almost no decorative movement.",

      avoid: [
        "soft lifestyle look",
        "excessive rounded UI",
        "decorative serif typography",
      ],
    },

    {
      id:
        "local-human",

      name:
        "Local Human",

      description:
        "A warm, trustworthy direction for regional businesses built around people, real work and approachable clarity.",

      visualDensity:
        "balanced",

      contentDensity:
        "rich",

      heroLayouts: [
        "split",
        "centered",
      ],

      sectionLayouts: {
        services: [
          "cards",
          "list",
        ],

        about: [
          "media",
          "split",
        ],

        showcase: [
          "mosaic",
          "bento",
        ],

        proof: [
          "cards",
          "statement",
        ],

        process: [
          "steps",
          "list",
        ],

        cta: [
          "banner",
        ],
      },

      typographyDirection:
        "Friendly but professional sans typography. Human and clear rather than corporate or playful.",

      compositionDirection:
        "Use real team imagery, readable service blocks and a warmer, more approachable rhythm.",

      imageDirection:
        "Real people and real projects are the primary visual trust signals.",

      colorDirection:
        "Retain the original brand family and allow slightly warmer supporting surfaces.",

      motionDirection:
        "Gentle slide reveals and slow natural hover movement.",

      avoid: [
        "anonymous stock people replacing employees",
        "sterile ultra-minimal layouts",
        "tech-startup aesthetics",
      ],
    },
  ];

/* =========================================================
   HASH
========================================================= */

function hashNumber(
  value:
    string
) {
  const digest =
    createHash(
      "sha256"
    )
      .update(
        value
      )
      .digest(
        "hex"
      );

  return parseInt(
    digest.slice(
      0,
      8
    ),
    16
  );
}

/* =========================================================
   SELECT ARCHETYPE
========================================================= */

export function selectRedesignArchetype({
  seed,
  previousArchetype,
}: {
  seed:
    string;

  previousArchetype?:
    string
    | null;
}) {
  let candidates =
    REDESIGN_ARCHETYPES.filter(
      (
        archetype
      ) =>
        archetype.id !==
        previousArchetype
    );

  if (
    candidates.length ===
    0
  ) {
    candidates =
      REDESIGN_ARCHETYPES;
  }

  const index =
    hashNumber(
      seed
    ) %
    candidates.length;

  return candidates[
    index
  ];
}

/* =========================================================
   PICK FROM LIST
========================================================= */

function pickFromList<T>({
  values,
  seed,
}: {
  values:
    T[];

  seed:
    string;
}) {
  if (
    values.length ===
    0
  ) {
    return null;
  }

  return values[
    hashNumber(
      seed
    ) %
      values.length
  ] ??
    null;
}

/* =========================================================
   HERO NORMALIZATION
========================================================= */

export function applyArchetypeHeroLayout({
  requested,
  archetype,
  seed,
}: {
  requested:
    RedesignHeroLayout;

  archetype:
    RedesignArchetype;

  seed:
    string;
}): RedesignHeroLayout {
  if (
    archetype.heroLayouts.includes(
      requested
    )
  ) {
    return requested;
  }

  return (
    pickFromList({
      values:
        archetype.heroLayouts,

      seed:
        `${seed}:hero`,
    }) ??
    archetype.heroLayouts[
      0
    ] ??
    requested
  );
}

/* =========================================================
   SECTION NORMALIZATION
========================================================= */

export function applyArchetypeSectionLayout({
  type,
  requested,
  archetype,
  sectionIndex,
  seed,
}: {
  type:
    RedesignSectionType;

  requested:
    RedesignSectionLayout;

  archetype:
    RedesignArchetype;

  sectionIndex:
    number;

  seed:
    string;
}): RedesignSectionLayout {
  const allowed =
    archetype.sectionLayouts[
      type
    ];

  if (
    allowed.includes(
      requested
    )
  ) {
    return requested;
  }

  return (
    pickFromList({
      values:
        allowed,

      seed:
        `${seed}:${type}:${sectionIndex}`,
    }) ??
    allowed[
      0
    ] ??
    requested
  );
}

/* =========================================================
   SPACING
========================================================= */

export function getArchetypeSpacing(
  archetype:
    RedesignArchetype
):
  | "tight"
  | "balanced"
  | "airy" {
  switch (
    archetype.visualDensity
  ) {
    case "compact":
      return "tight";

    case "expressive":
      return "balanced";

    default:
      return "balanced";
  }
}

/* =========================================================
   PROMPT
========================================================= */

export function getArchetypePrompt(
  archetype:
    RedesignArchetype
) {
  return `
SELECTED DESIGN ARCHETYPE:
${archetype.name}

ID:
${archetype.id}

THIS ARCHETYPE IS MANDATORY.

Do not silently fall back to your usual landing-page
structure.

DESCRIPTION:
${archetype.description}

VISUAL DENSITY:
${archetype.visualDensity}

CONTENT DENSITY:
${archetype.contentDensity}

HERO TOOLBOX FOR THIS CONCEPT:
${archetype.heroLayouts.join(
  ", "
)}

SECTION TOOLBOX:

Services:
${archetype.sectionLayouts.services.join(
  ", "
)}

About / Team:
${archetype.sectionLayouts.about.join(
  ", "
)}

Showcase:
${archetype.sectionLayouts.showcase.join(
  ", "
)}

Proof:
${archetype.sectionLayouts.proof.join(
  ", "
)}

Process:
${archetype.sectionLayouts.process.join(
  ", "
)}

TYPOGRAPHY:
${archetype.typographyDirection}

COMPOSITION:
${archetype.compositionDirection}

IMAGERY:
${archetype.imageDirection}

COLOR:
${archetype.colorDirection}

MOTION:
${archetype.motionDirection}

AVOID:
${archetype.avoid
  .map(
    (
      item
    ) =>
      `- ${item}`
  )
  .join(
    "\n"
  )}

IMPORTANT:

MaxiBestOf research should influence the execution INSIDE
this archetype.

MaxiBestOf does not replace the archetype.

The real company information architecture and factual
content still remain the source of truth.
  `.trim();
}