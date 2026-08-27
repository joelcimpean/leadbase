import "server-only";

import {
  createClient,
} from "v0-sdk";

import {
  type RedesignAnalysisContext,
} from "@/lib/redesign-preview";

import {
  inspectRedesignSite,
  type RedesignSiteIntelligence,
} from "@/lib/redesign-site-intelligence";

import {
  type RedesignSource,
} from "@/lib/redesign-source";

/* =========================================================
   CONFIG
========================================================= */

const PREVIEW_POLL_ATTEMPTS =
  18;

const PREVIEW_POLL_DELAY =
  2_000;

const MAX_RESEARCH_CHARS =
  6_500;

const MAX_ANALYSIS_CHARS =
  3_000;

const MAX_ALLOWED_IMAGES =
  22;

/* =========================================================
   DESIGN VARIATIONS

   These are composition directions, NOT templates.
========================================================= */

const DESIGN_DIRECTIONS = [
  `
Editorial asymmetric composition.
Strong type scale, irregular but controlled image placement,
high information density and clear hierarchy.
Avoid card-heavy design.
  `.trim(),

  `
Image-led architectural composition.
Large photography, strong cropping, restrained typography,
alternating full-width and compact content zones.
Avoid Bento as the dominant pattern.
  `.trim(),

  `
Technical grid composition.
Structured lines, precise alignment, service index,
strong information architecture and functional typography.
Premium through discipline rather than emptiness.
  `.trim(),

  `
Modern craft editorial.
Mix large typography with real material/project photography.
Use contrasting section scales and tactile image treatment.
Avoid repetitive three-column sections.
  `.trim(),

  `
Magazine-inspired business homepage.
Strong editorial rhythm, useful long-form content,
large feature moments and smaller information modules.
Every section should have its own composition.
  `.trim(),

  `
Compact premium composition.
Less empty whitespace, more useful information above the fold,
clear service structure and strong trust signals.
Use photography purposefully.
  `.trim(),

  `
Bold typographic composition.
Headline-driven sections combined with selected real imagery.
Use unusual proportions while remaining highly usable.
Avoid generic startup/SaaS layout patterns.
  `.trim(),

  `
Photography-first local business concept.
Real people, real projects and real company identity dominate.
Typography supports photography rather than competing with it.
Use a strong visual narrative from top to bottom.
  `.trim(),

  `
Structured heritage-meets-modern concept.
Useful for established companies with history.
Balance contemporary typography with credibility,
real company facts and strong project imagery.
  `.trim(),

  `
Minimal but information-rich studio composition.
Strict hierarchy, refined spacing and restrained interaction.
Minimal does NOT mean empty.
Avoid decorative components without content value.
  `.trim(),

  `
Layered asymmetric composition.
Use overlapping image/text relationships selectively,
strong section transitions and varied visual rhythm.
Do not repeat the same split layout.
  `.trim(),

  `
Industrial editorial system.
Large functional typography, full-width information bands,
precise service presentation and strong project imagery.
Use brand color deliberately and confidently.
  `.trim(),
] as const;

/* =========================================================
   TYPES
========================================================= */

export type V0RedesignResult = {
  chatId: string;

  previewUrl: string;
};

type ExtendedRedesignSource =
  RedesignSource & {
    brandColorAnchor?:
      | string
      | null;

    brandColorCandidates?:
      string[];
  };

/* =========================================================
   CLIENT
========================================================= */

function createV0Client() {
  const apiKey =
    process.env
      .V0_API_KEY;

  if (
    !apiKey
  ) {
    throw new Error(
      "V0_API_KEY is missing."
    );
  }

  return createClient({
    apiKey,
  });
}

/* =========================================================
   WAIT
========================================================= */

function wait(
  milliseconds: number
) {
  return new Promise<void>(
    (
      resolve
    ) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

/* =========================================================
   TEXT
========================================================= */

function cleanText(
  value: string
) {
  return value
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function truncate(
  value: string,
  maxLength: number
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
    maxLength -
      1
  )}…`;
}

function compactJson(
  value: unknown,
  maxLength: number
) {
  let json =
    "";

  try {
    json =
      JSON.stringify(
        value
      );
  } catch {
    return "";
  }

  if (
    json.length <=
    maxLength
  ) {
    return json;
  }

  return `${json.slice(
    0,
    maxLength
  )}…`;
}

/* =========================================================
   EMPTY SITE
========================================================= */

function createEmptySiteIntelligence():
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
   ALLOWED IMAGES
========================================================= */

function createAllowedImages(
  source: RedesignSource,
  site: RedesignSiteIntelligence
) {
  const result:
    Array<{
      url: string;

      type:
        | "logo"
        | "team"
        | "project"
        | "content";

      context: string;

      width?: number;

      height?: number;
    }> =
    [];

  const seen =
    new Set<string>();

  function add(
    item: {
      url: string;

      type:
        | "logo"
        | "team"
        | "project"
        | "content";

      context: string;

      width?: number;

      height?: number;
    }
  ) {
    if (
      !item.url ||
      seen.has(
        item.url
      ) ||
      result.length >=
        MAX_ALLOWED_IMAGES
    ) {
      return;
    }

    seen.add(
      item.url
    );

    result.push(
      item
    );
  }

  if (
    site.primaryLogo
  ) {
    add({
      url:
        site.primaryLogo.url,

      type:
        "logo",

      context:
        "Primary real company logo",

      width:
        site.primaryLogo.width,

      height:
        site.primaryLogo.height,
    });
  } else {
    const logo =
      source.assets.find(
        (
          asset
        ) =>
          asset.kind ===
          "logo"
      );

    if (
      logo
    ) {
      add({
        url:
          logo.url,

        type:
          "logo",

        context:
          "Primary real company logo",
      });
    }
  }

  for (
    const image of
      site.teamImages.slice(
        0,
        5
      )
  ) {
    add({
      url:
        image.url,

      type:
        "team",

      context:
        truncate(
          `${image.pageTitle} ${image.alt} ${image.context}`,
          180
        ),

      width:
        image.width,

      height:
        image.height,
    });
  }

  for (
    const image of
      site.projectImages.slice(
        0,
        10
      )
  ) {
    add({
      url:
        image.url,

      type:
        "project",

      context:
        truncate(
          `${image.pageTitle} ${image.alt} ${image.context}`,
          180
        ),

      width:
        image.width,

      height:
        image.height,
    });
  }

  for (
    const image of
      site.contentImages.slice(
        0,
        6
      )
  ) {
    add({
      url:
        image.url,

      type:
        "content",

      context:
        truncate(
          `${image.pageTitle} ${image.alt} ${image.context}`,
          180
        ),

      width:
        image.width,

      height:
        image.height,
    });
  }

  /*
   * Fallback for sites where Playwright could not classify
   * enough images.
   */
  if (
    result.length <
      5
  ) {
    for (
      const asset of
        source.assets
    ) {
      if (
        asset.kind !==
        "image"
      ) {
        continue;
      }

      add({
        url:
          asset.url,

        type:
          asset.role ===
            "team"
            ? "team"
            : asset.role ===
                "project"
              ? "project"
              : "content",

        context:
          truncate(
            `${asset.alt} ${asset.context}`,
            180
          ),
      });
    }
  }

  return result;
}

/* =========================================================
   COMPACT PAGES
========================================================= */

function createPageBrief(
  site: RedesignSiteIntelligence
) {
  return site.pages
    .slice(
      0,
      8
    )
    .map(
      (
        page
      ) => ({
        url:
          page.url,

        title:
          page.title,

        h1:
          page.h1,

        headings:
          page.headings.slice(
            0,
            6
          ),

        paragraphs:
          page.paragraphs.slice(
            0,
            3
          ),
      })
    );
}

/* =========================================================
   SOURCE STRUCTURE
========================================================= */

function createSourceSectionBrief(
  source: RedesignSource
) {
  return source.homepageSections.map(
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
          4
        ),

      links:
        section.links,
    })
  );
}

/* =========================================================
   VARIATION
========================================================= */

function getDesignDirection(
  generationIndex: number
) {
  const index =
    Math.max(
      0,
      generationIndex -
        1
    ) %
    DESIGN_DIRECTIONS.length;

  return DESIGN_DIRECTIONS[
    index
  ];
}

/* =========================================================
   PROMPT
========================================================= */

function buildPrompt({
  source,
  analysis,
  designResearch,
  generationIndex,
  site,
}: {
  source: RedesignSource;

  analysis:
    RedesignAnalysisContext;

  designResearch: string;

  generationIndex: number;

  site:
    RedesignSiteIntelligence;
}) {
  const extendedSource =
    source as
      ExtendedRedesignSource;

  const allowedImages =
    createAllowedImages(
      source,
      site
    );

  const exactLogo =
    allowedImages.find(
      (
        image
      ) =>
        image.type ===
        "logo"
    ) ??
    null;

  const primaryBrandColor =
    site.primaryBrandColor ??
    extendedSource
      .brandColorAnchor ??
    null;

  const brandColors =
    site.brandColors.length >
    0
      ? site.brandColors.slice(
          0,
          6
        )
      : (
          extendedSource
            .brandColorCandidates ??
          []
        )
          .slice(
            0,
            6
          )
          .map(
            (
              hex
            ) => ({
              hex,

              score:
                0,
            })
          );

  const requiredFacts =
    site.facts.slice(
      0,
      10
    );

  const requiredServices =
    site.services.slice(
      0,
      18
    );

  const designDirection =
    getDesignDirection(
      generationIndex
    );

  return `
BUILD a complete, working, polished homepage redesign for
this REAL company.

Create the actual Next.js / React / Tailwind files.

Do not return a plan.
Do not return a design brief.
Do not merely describe the website.

=========================================================
COMPANY
=========================================================

${compactJson(
  analysis.company,
  1_500
)}

Website:
${source.finalUrl}

Title:
${source.pageTitle}

Description:
${source.metaDescription}

=========================================================
VARIATION ${generationIndex}
=========================================================

Use this composition direction as a starting constraint:

${designDirection}

This is NOT a template.

Adapt it to the actual company and its content.

=========================================================
CONTENT CONTRACT — HARD REQUIREMENT
=========================================================

The following information was extracted from the REAL
company website.

You may rewrite wording for clarity.

You may NOT invent, remove, alter or contradict factual
information.

-------------------------
REQUIRED SERVICES
-------------------------

${JSON.stringify(
  requiredServices,
  null,
  2
)}

When this list contains real services:

EVERY meaningful service in this list must appear visibly
on the homepage.

Do not silently drop services because your chosen design
only has room for three or four cards.

If there are many services:

use a service index,
structured rows,
a responsive grid,
accordion,
compact list,
editorial index,
or another suitable design.

CONTENT controls the component.

The component does NOT control the content.

-------------------------
REQUIRED FACTS / COUNTERS
-------------------------

${JSON.stringify(
  requiredFacts,
  null,
  2
)}

These are valuable real trust signals.

If two or more strong facts exist, include them visibly.

Examples may include:

- employees
- apprentices
- completed projects
- clients
- years
- generations
- locations

DO NOT change their numbers.

Do not invent additional statistics.

=========================================================
REAL WEBSITE PAGES
=========================================================

We inspected relevant subpages as well as the homepage:

${JSON.stringify(
  createPageBrief(
    site
  ),
  null,
  2
)}

Use useful real information from:

- About
- Team
- Company
- Services
- References
- Projects

when appropriate for a modern homepage.

=========================================================
IMAGE CONTRACT — EXTREMELY IMPORTANT
=========================================================

The following URLs are the APPROVED real company image
library for this redesign:

${JSON.stringify(
  allowedImages,
  null,
  2
)}

THIS IS A HARD ALLOWLIST.

Every visible business photograph must use one of these
exact supplied URLs.

Do NOT introduce:

- Unsplash
- Pexels
- random stock photos
- AI-generated photos
- placeholder photography
- unrelated external images
- random architecture
- random landscapes
- random people

A beautiful irrelevant photo is WORSE than no photo.

If you cannot find a suitable approved image for a section,
design the section without photography.

Never use a lighthouse for a construction company unless
the client's own website actually contains and supports
that lighthouse image.

=========================================================
LOGO — HARD REQUIREMENT
=========================================================

Real company logo:

${exactLogo?.url ?? "No reliable logo detected"}

When a real logo URL exists:

USE IT.

Use the exact image.

Do not type the company name as a replacement.

Do not invent a logo.

Do not recolor it.

Do not crop it.

Do not make it tiny.

It should normally have enough visual presence to be
immediately recognizable in the header.

=========================================================
REAL TEAM
=========================================================

Approved real team images:

${JSON.stringify(
  allowedImages.filter(
    (
      image
    ) =>
      image.type ===
      "team"
  ),
  null,
  2
)}

If real team photography exists and the source contains
meaningful company/team information:

USE at least one actual team/company image.

Do not substitute stock employees.

=========================================================
REAL PROJECTS
=========================================================

Approved project images:

${JSON.stringify(
  allowedImages.filter(
    (
      image
    ) =>
      image.type ===
      "project"
  ),
  null,
  2
)}

Use these when presenting real work/references.

Do not create fictional project titles or locations.

=========================================================
BRAND COLOR — HARD REQUIREMENT
=========================================================

Primary detected brand color:

${primaryBrandColor ?? "Unknown"}

Other real brand colors:

${JSON.stringify(
  brandColors
)}

Existing source color hints:

${JSON.stringify(
  source.colorHints.slice(
    0,
    6
  )
)}

If a reliable brand hue exists:

the redesign MUST visibly remain in that brand family.

Blue company → blue-led redesign.
Orange company → orange-led redesign.
Red company → red-led redesign.
Green company → green-led redesign.

You may create sophisticated shades and tints.

You may pair the brand with:

- warm neutrals
- cool neutrals
- black
- off-white
- subtle surfaces

But do NOT arbitrarily replace the company's identity with
a fashionable color from an inspiration website.

=========================================================
ORIGINAL HOMEPAGE STRUCTURE
=========================================================

Hero:

${compactJson(
  source.homepageHero,
  1_400
)}

Sections:

${JSON.stringify(
  createSourceSectionBrief(
    source
  ),
  null,
  2
)}

Navigation:

${JSON.stringify(
  source.navigation
)}

CTAs:

${JSON.stringify(
  source.ctas
)}

Preserve useful semantic content.

You may merge genuinely redundant sections.

You may reorder when the UX clearly benefits.

Do NOT remove important information merely to make the page
shorter.

=========================================================
SOURCE COPY
=========================================================

Important headings:

${JSON.stringify(
  source.headings.slice(
    0,
    12
  )
)}

Important source paragraphs:

${JSON.stringify(
  source.paragraphs.slice(
    0,
    8
  )
)}

=========================================================
ANALYSIS
=========================================================

Research summary:

${truncate(
  analysis.researchSummary ??
    "",
  2_000
)}

Website findings:

${compactJson(
  analysis.websiteFindings,
  MAX_ANALYSIS_CHARS
)}

Visual analysis:

${compactJson(
  analysis.visualAnalysis,
  2_500
)}

=========================================================
MAXIBESTOF ART DIRECTION
=========================================================

${designResearch.slice(
  0,
  MAX_RESEARCH_CHARS
)}

Use MaxiBestOf for:

- composition
- typography
- spacing
- image treatment
- section rhythm
- interaction
- navigation ideas

Do not use MaxiBestOf to replace:

- real brand colors
- real logo
- real facts
- real services
- real people
- real projects

=========================================================
NO GENERIC AI LANDING PAGE
=========================================================

Do not automatically produce:

split hero
+ service cards
+ Bento gallery
+ about split
+ CTA

Do NOT use Bento repeatedly.

At most ONE section may use a Bento-like composition.

Do not make every section:

eyebrow
large heading
tiny paragraph
three cards

Do not use enormous blank sections as a shortcut for
"premium".

Do not build a SaaS landing page for a construction,
craft, architecture or local service company.

=========================================================
CONTENT DENSITY
=========================================================

This should feel like a REAL website, not a mood board.

The visitor should understand:

- what the company does
- its full relevant service range
- who the company is
- important trust facts
- what kind of work it has done
- how to contact it

Use meaningful paragraphs where source material supports
them.

Do not reduce all real company information to tiny vague
sentences.

=========================================================
TYPOGRAPHY
=========================================================

Typography must be art-directed.

Choose fonts according to:

- brand
- industry
- company history
- MaxiBestOf research
- content density
- visual concept

Do not default to Inter every time.

Do not automatically use serif because a business has
history.

Use a coherent type system:

- display headline
- section headline
- body
- small labels
- navigation
- buttons

=========================================================
LAYOUT VARIETY
=========================================================

Adjacent sections should not use the same composition.

Possible structures:

- full-bleed photographic hero
- editorial asymmetric hero
- technical service index
- service rows
- compact service grid
- project masonry
- project strip
- oversized trust facts
- team image composition
- split editorial story
- timeline
- horizontal information band
- large typographic statement
- layered image composition
- structured contact area

Choose only what serves the content.

=========================================================
INTERNAL METADATA
=========================================================

NEVER DISPLAY:

01
02
03
04
05
06
07
08
09
10
11
12

as decorative section numbering.

Never display:

SECTION 05
CHAPTER 03
SOURCE INDEX 4
KAPITEL 02

unless the number itself is a real supported company fact.

Before completion search your own visible JSX for stray
section numbers and remove them.

=========================================================
MOTION
=========================================================

Interactions should be subtle and polished.

Typical hover transitions:

300–500ms.

Use smooth easing.

Good:

- subtle image scale
- underline movement
- small translate
- restrained reveal
- gentle stagger
- controlled parallax

Bad:

- twitchy 100ms transitions
- bouncing
- giant zooming
- excessive motion
- every element animating

=========================================================
RESPONSIVE
=========================================================

Desktop, tablet and mobile all need intentional design.

Do not simply stack every desktop column on mobile without
rethinking hierarchy.

=========================================================
TECHNICAL
=========================================================

Build working Next.js / React / Tailwind files.

For approved remote images use standard HTML:

<img src="EXACT_APPROVED_URL" />

when needed.

Do not add Next Image configuration just for the preview.

Navigation/buttons may use "#" links.

Forms must not send externally.

=========================================================
FINAL QA — MANDATORY
=========================================================

Before finishing check:

[ ] Every required service is visible.

[ ] Important real counters/facts are visible.

[ ] Every photograph comes from the supplied allowlist.

[ ] No random stock or generated photography exists.

[ ] Real team imagery is used when supplied and relevant.

[ ] Real project imagery is used when supplied.

[ ] Real company logo is used.

[ ] Logo is readable and not tiny.

[ ] Brand hue matches the real company.

[ ] No visible internal section numbering exists.

[ ] Bento is not repeated.

[ ] No generic AI landing-page structure.

[ ] Copy is substantial enough.

[ ] No unsupported facts are invented.

[ ] Desktop is intentional.

[ ] Mobile is intentional.

Fix every failed item before finishing.

BUILD THE WEBSITE NOW.
  `.trim();
}

/* =========================================================
   SYSTEM
========================================================= */

const SYSTEM_PROMPT =
  `
You are a senior web designer, creative director and senior
React developer.

You BUILD polished client-ready websites.

Never return only:

- plans
- explanations
- wireframes
- design briefs
- pseudo-code

The user's real company source data is authoritative.

Priority:

1. factual accuracy
2. complete relevant real content
3. real client logo
4. real client brand identity
5. real client photography
6. strong art direction
7. typography
8. responsive implementation
9. restrained interaction

Never introduce unrelated photography when an explicit
image allowlist is supplied.

Never expose internal source metadata or section indexes.

Create the actual working website.
  `.trim();

/* =========================================================
   CHAT GUARD
========================================================= */

function isChatDetail(
  value: unknown
): value is {
  id: string;

  latestVersion?: {
    demoUrl?:
      | string
      | null;
  } | null;
} {
  if (
    typeof value !==
      "object" ||
    value ===
      null
  ) {
    return false;
  }

  return (
    "id" in value &&
    typeof (
      value as {
        id?: unknown;
      }
    ).id ===
      "string"
  );
}

/* =========================================================
   PREVIEW
========================================================= */

async function waitForPreview({
  v0,
  chatId,
  firstPreviewUrl,
}: {
  v0:
    ReturnType<
      typeof createV0Client
    >;

  chatId: string;

  firstPreviewUrl:
    | string
    | null;
}) {
  if (
    firstPreviewUrl
  ) {
    return firstPreviewUrl;
  }

  for (
    let attempt =
      0;
    attempt <
    PREVIEW_POLL_ATTEMPTS;
    attempt +=
      1
  ) {
    await wait(
      PREVIEW_POLL_DELAY
    );

    const chatResponse =
      await v0.chats.getById({
        chatId,
      });

    if (
      !isChatDetail(
        chatResponse
      )
    ) {
      continue;
    }

    const previewUrl =
      chatResponse
        .latestVersion
        ?.demoUrl ??
      null;

    if (
      previewUrl
    ) {
      return previewUrl;
    }
  }

  throw new Error(
    "v0 finished the chat but did not create a previewable website."
  );
}

/* =========================================================
   GENERATE
========================================================= */

export async function generateV0Redesign({
  source,
  analysis,
  designResearch,
  generationIndex,
}: {
  source: RedesignSource;

  analysis:
    RedesignAnalysisContext;

  designResearch: string;

  generationIndex: number;
}): Promise<V0RedesignResult> {
  const v0 =
    createV0Client();

  let site =
    createEmptySiteIntelligence();

  try {
    site =
      await inspectRedesignSite(
        source.finalUrl
      );
  } catch (
    error
  ) {
    console.warn(
      "Could not collect multi-page redesign intelligence:",
      error
    );
  }

  const message =
    buildPrompt({
      source,

      analysis,

      designResearch,

      generationIndex,

      site,
    });

  const chatResponse =
    await v0.chats.create({
      message,

      system:
        SYSTEM_PROMPT,
    });

  if (
    !isChatDetail(
      chatResponse
    )
  ) {
    throw new Error(
      "v0 returned an unexpected streaming response instead of a normal chat."
    );
  }

  const chatId =
    chatResponse.id;

  const previewUrl =
    await waitForPreview({
      v0,

      chatId,

      firstPreviewUrl:
        chatResponse
          .latestVersion
          ?.demoUrl ??
        null,
    });

  return {
    chatId,

    previewUrl,
  };
}