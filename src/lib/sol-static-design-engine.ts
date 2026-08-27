import "server-only";

import OpenAI from "openai";

import type {
  Response as OpenAIResponse,
} from "openai/resources/responses/responses";

import {
  type RedesignAnalysisContext,
} from "@/lib/redesign-preview";

import {
  type RedesignSiteIntelligence,
  type SiteIntelligenceImage,
} from "@/lib/redesign-site-intelligence";

import {
  type RedesignSource,
} from "@/lib/redesign-source";

/* =========================================================
   TYPES
========================================================= */

export type StaticDesignSnapshot = {
  version:
    3;

  renderMode:
    "html";

  html:
    string;

  companyName:
    string;

  sourceUrl:
    string;

  generationIndex:
    number;

  model:
    string;

  direction:
    string;

  inspirationMemo:
    string;

  allowedImages:
    string[];

  createdAt:
    string;
};

export type StaticDesignResult = {
  previewUrl:
    string;

  promptSnapshot:
    string;

  snapshot:
    StaticDesignSnapshot;

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

type VisualCandidate = {
  url:
    string;

  role:
    string;

  alt:
    string;

  context:
    string;
};

type SupportedImageMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

type PreparedVisionImage = {
  candidate:
    VisualCandidate;

  dataUrl:
    string;

  mime:
    SupportedImageMime;

  bytes:
    number;
};

type ModelInputContent =
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
        "low";
    };

type ImageUsageResult = {
  usedRealImages:
    number;

  warnings:
    string[];
};

type DocumentQualityResult = {
  ok:
    boolean;

  reasons:
    string[];

  htmlCharacters:
    number;

  visibleTextCharacters:
    number;

  sectionCount:
    number;

  headingCount:
    number;

  paragraphCount:
    number;

  imageCount:
    number;
};

type UsageTotals = {
  inputTokens:
    number;

  outputTokens:
    number;

  totalTokens:
    number;
};

type GenerationResponseResult = {
  response:
    OpenAIResponse;

  visionFallbackUsed:
    boolean;
};

/* =========================================================
   CONFIG
========================================================= */

const MAX_VISUAL_IMAGES =
  12;

/*
 * Four visually attached images are enough for Sol to
 * understand:
 *
 * - the company's visual language
 * - project photography
 * - people/team
 * - real premises
 *
 * We still send the URLs + metadata for all other images.
 */
const MAX_VISION_IMAGES =
  4;

const MAX_VISION_CHECKS =
  10;

/*
 * Large original website images are unnecessary for low
 * detail vision.
 *
 * Lowering this also protects us against unusually large
 * or malformed files.
 */
const MAX_VISION_IMAGE_BYTES =
  3_500_000;

const VISION_IMAGE_TIMEOUT =
  7_000;

const MAX_RESEARCH_LENGTH =
  8_000;

const MAX_OUTPUT_TOKENS =
  24_000;

const REPAIR_MAX_OUTPUT_TOKENS =
  24_000;

const MIN_HTML_LENGTH =
  8_000;

const MIN_VISIBLE_TEXT_CHARACTERS =
  1_150;

const MIN_SECTION_COUNT =
  7;

const MIN_HEADING_COUNT =
  6;

const MIN_PARAGRAPH_COUNT =
  5;

/* =========================================================
   TEXT
========================================================= */

function cleanText(
  value:
    string
) {
  return value
    .replace(
      /\u00a0/g,
      " "
    )
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
    maxLength -
      1
  )}…`;
}

function compactJson(
  value:
    unknown,
  maxLength =
    6_000
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
   URL
========================================================= */

function isRemoteHttpUrl(
  value:
    string
) {
  try {
    const url =
      new URL(
        value
      );

    return (
      url.protocol ===
        "http:" ||
      url.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}

function decodeHtmlUrl(
  value:
    string
) {
  return value
    .replace(
      /&amp;/g,
      "&"
    )
    .replace(
      /&#38;/g,
      "&"
    );
}

function normalizeComparableUrl(
  value:
    string
) {
  const decoded =
    decodeHtmlUrl(
      value
    );

  try {
    return new URL(
      decoded
    ).toString();
  } catch {
    return decoded;
  }
}

/* =========================================================
   HTML ATTRIBUTE
========================================================= */

function escapeHtmlAttribute(
  value:
    string
) {
  return value
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#39;"
    );
}

/* =========================================================
   VISUAL CANDIDATES
========================================================= */

function imageText(
  image:
    Pick<
      SiteIntelligenceImage,
      | "url"
      | "alt"
      | "context"
      | "pageTitle"
    >
) {
  return [
    image.url,
    image.alt,
    image.context,
    image.pageTitle,
  ]
    .join(
      " "
    )
    .toLowerCase();
}

function looksObviouslyBad(
  value:
    string
) {
  return /\b(icon|favicon|sprite|qr|barcode|facebook|instagram|linkedin|youtube|social|badge|cookie|placeholder|map|google maps|google-map|brochure|broschüre|pdf|rating|stars?|meditation|yoga|wellness|pexels|unsplash)\b/i.test(
    value
  );
}

function collectVisualCandidates({
  source,
  site,
}: {
  source:
    RedesignSource;

  site:
    RedesignSiteIntelligence;
}) {
  const result:
    VisualCandidate[] = [];

  const seen =
    new Set<string>();

  function add(
    candidate:
      VisualCandidate
  ) {
    if (
      !candidate.url ||
      !isRemoteHttpUrl(
        candidate.url
      )
    ) {
      return;
    }

    const normalizedUrl =
      normalizeComparableUrl(
        candidate.url
      );

    if (
      seen.has(
        normalizedUrl
      )
    ) {
      return;
    }

    const intrinsic =
      `${candidate.url} ${candidate.alt} ${candidate.context}`
        .toLowerCase();

    if (
      candidate.role !==
        "REAL COMPANY LOGO" &&
      looksObviouslyBad(
        intrinsic
      )
    ) {
      return;
    }

    seen.add(
      normalizedUrl
    );

    result.push(
      candidate
    );
  }

  /* =======================================================
     LOGO
  ======================================================= */

  if (
    site.primaryLogo
  ) {
    add({
      url:
        site.primaryLogo.url,

      role:
        "REAL COMPANY LOGO",

      alt:
        site.primaryLogo.alt,

      context:
        site.primaryLogo.context,
    });
  } else {
    const sourceLogo =
      source.assets.find(
        (
          asset
        ) =>
          asset.kind ===
          "logo"
      );

    if (
      sourceLogo
    ) {
      add({
        url:
          sourceLogo.url,

        role:
          "REAL COMPANY LOGO",

        alt:
          sourceLogo.alt,

        context:
          sourceLogo.context,
      });
    }
  }

  /* =======================================================
     TEAM
  ======================================================= */

  for (
    const image of
      site.teamImages.slice(
        0,
        3
      )
  ) {
    add({
      url:
        image.url,

      role:
        "POSSIBLE REAL TEAM / EMPLOYEE IMAGE",

      alt:
        image.alt,

      context:
        `${image.pageTitle} ${image.context}`,
    });
  }

  /* =======================================================
     PROJECTS
  ======================================================= */

  for (
    const image of
      site.projectImages.slice(
        0,
        6
      )
  ) {
    add({
      url:
        image.url,

      role:
        "POSSIBLE REAL PROJECT / REFERENCE IMAGE",

      alt:
        image.alt,

      context:
        `${image.pageTitle} ${image.context}`,
    });
  }

  /* =======================================================
     CONTENT
  ======================================================= */

  for (
    const image of
      site.contentImages.slice(
        0,
        5
      )
  ) {
    if (
      looksObviouslyBad(
        imageText(
          image
        )
      )
    ) {
      continue;
    }

    add({
      url:
        image.url,

      role:
        "OTHER REAL WEBSITE IMAGE — USE ONLY IF VISUALLY RELEVANT",

      alt:
        image.alt,

      context:
        `${image.pageTitle} ${image.context}`,
    });
  }

  /* =======================================================
     HOMEPAGE FALLBACK
  ======================================================= */

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

      role:
        `REAL HOMEPAGE ${asset.role.toUpperCase()} IMAGE`,

      alt:
        asset.alt,

      context:
        asset.context,
    });
  }

  return result.slice(
    0,
    MAX_VISUAL_IMAGES
  );
}

/* =========================================================
   VARIANT ART DIRECTIONS
========================================================= */

const VARIANT_MANDATES = [
  `
Editorial architecture.

Build a sophisticated publication-like website with
asymmetric compositions, large photography, dramatic
typographic contrast and an intentionally changing page
rhythm.

Do not make it look like a startup landing page.
  `.trim(),

  `
Swiss industrial.

Use a precise rational grid, disciplined spacing,
high-contrast typography, technical information layouts
and sharp art direction.

Avoid soft generic cards.
  `.trim(),

  `
Photography-led documentary.

Let authentic company photography carry the narrative.

Use immersive image compositions, editorial captions,
strong typography and human credibility.

Do not create a gallery-only page.
  `.trim(),

  `
Bold typography.

Use expressive scale contrast, unusual headline
compositions, highly deliberate type/image relationships
and restrained decoration.

The typography itself should create visual architecture.
  `.trim(),

  `
Quiet premium craft.

Use highly controlled typography, sophisticated editorial
pacing, subtle surfaces, premium spacing and restrained
application of the company's real brand color.
  `.trim(),

  `
Architectural portfolio.

Projects, materials and craft should dominate.

Use gallery-grade compositions, large project photography,
precise typography and sophisticated whitespace.
  `.trim(),

  `
Contemporary magazine.

Create varied section rhythms, editorial crops,
asymmetrical grids, confident typography and strong
information hierarchy.

Every major section should feel deliberately composed.
  `.trim(),

  `
Agency-level local business.

Create something highly contemporary but trustworthy,
human and commercially useful.

It should feel custom-designed for a serious regional
business, not like a SaaS template.
  `.trim(),

  `
Technical catalogue meets editorial design.

Communicate a large service offering intelligently.

Combine precise information architecture with strong
editorial typography and image-led storytelling.
  `.trim(),

  `
Cinematic craft.

Use dramatic imagery, controlled dark/light transitions,
large statements and a strong narrative journey through
the company and its work.
  `.trim(),

  `
Graphic modernism.

Create strong compositions through typography, grids,
lines, proportions and the company's brand color.

Avoid decorative gradients and generic cards.
  `.trim(),

  `
Heritage reinterpreted.

Communicate history, experience and credibility through
contemporary typography and composition.

Do not use nostalgic visual clichés.
  `.trim(),
] as const;

function getVariantMandate(
  generationIndex:
    number
) {
  const index =
    Math.abs(
      generationIndex -
        1
    ) %
    VARIANT_MANDATES.length;

  return (
    VARIANT_MANDATES[
      index
    ] ??
    VARIANT_MANDATES[
      0
    ]
  );
}

/* =========================================================
   IMAGE BYTE READER
========================================================= */

async function readLimitedBytes(
  response:
    Response,
  maximumBytes:
    number
) {
  if (
    !response.body
  ) {
    const buffer =
      new Uint8Array(
        await response.arrayBuffer()
      );

    if (
      buffer.byteLength >
      maximumBytes
    ) {
      return null;
    }

    return buffer;
  }

  const reader =
    response.body.getReader();

  const chunks:
    Uint8Array[] = [];

  let total =
    0;

  try {
    while (
      true
    ) {
      const {
        done,
        value,
      } =
        await reader.read();

      if (
        done
      ) {
        break;
      }

      if (
        !value
      ) {
        continue;
      }

      total +=
        value.byteLength;

      if (
        total >
        maximumBytes
      ) {
        await reader.cancel();

        return null;
      }

      chunks.push(
        value
      );
    }
  } finally {
    reader.releaseLock();
  }

  const output =
    new Uint8Array(
      total
    );

  let offset =
    0;

  for (
    const chunk of
      chunks
  ) {
    output.set(
      chunk,
      offset
    );

    offset +=
      chunk.byteLength;
  }

  return output;
}

/* =========================================================
   IMAGE SIGNATURE

   Deliberately only JPEG / PNG / WEBP for vision.

   GIF technically works in many APIs, but it gives us
   absolutely no advantage for website-reference vision
   and introduces another source of malformed input.
========================================================= */

function detectImageMime(
  bytes:
    Uint8Array
): SupportedImageMime | null {
  if (
    bytes.length >=
      3 &&
    bytes[0] ===
      0xff &&
    bytes[1] ===
      0xd8 &&
    bytes[2] ===
      0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >=
      8 &&
    bytes[0] ===
      0x89 &&
    bytes[1] ===
      0x50 &&
    bytes[2] ===
      0x4e &&
    bytes[3] ===
      0x47 &&
    bytes[4] ===
      0x0d &&
    bytes[5] ===
      0x0a &&
    bytes[6] ===
      0x1a &&
    bytes[7] ===
      0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >=
      12
  ) {
    const riff =
      String.fromCharCode(
        bytes[0] ??
          0,
        bytes[1] ??
          0,
        bytes[2] ??
          0,
        bytes[3] ??
          0
      );

    const webp =
      String.fromCharCode(
        bytes[8] ??
          0,
        bytes[9] ??
          0,
        bytes[10] ??
          0,
        bytes[11] ??
          0
      );

    if (
      riff ===
        "RIFF" &&
      webp ===
        "WEBP"
    ) {
      return "image/webp";
    }
  }

  return null;
}

/* =========================================================
   PREPARE VISION IMAGE
========================================================= */

async function prepareVisionImage(
  candidate:
    VisualCandidate
): Promise<PreparedVisionImage | null> {
  try {
    const response =
      await fetch(
        candidate.url,
        {
          method:
            "GET",

          redirect:
            "follow",

          cache:
            "no-store",

          signal:
            AbortSignal.timeout(
              VISION_IMAGE_TIMEOUT
            ),

          headers: {
            Accept:
              "image/webp,image/png,image/jpeg,*/*;q=0.4",

            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151 Safari/537.36",
          },
        }
      );

    if (
      !response.ok
    ) {
      return null;
    }

    const declaredLength =
      Number(
        response.headers.get(
          "content-length"
        )
      );

    if (
      Number.isFinite(
        declaredLength
      ) &&
      declaredLength >
        MAX_VISION_IMAGE_BYTES
    ) {
      return null;
    }

    const bytes =
      await readLimitedBytes(
        response,
        MAX_VISION_IMAGE_BYTES
      );

    if (
      !bytes ||
      bytes.byteLength <
        64
    ) {
      return null;
    }

    const mime =
      detectImageMime(
        bytes
      );

    if (
      !mime
    ) {
      return null;
    }

    const base64 =
      Buffer.from(
        bytes
      ).toString(
        "base64"
      );

    if (
      !base64 ||
      base64.length <
        40
    ) {
      return null;
    }

    return {
      candidate,

      dataUrl:
        `data:${mime};base64,${base64}`,

      mime,

      bytes:
        bytes.byteLength,
    };
  } catch (
    error
  ) {
    console.warn(
      `Skipping unusable vision image ${candidate.url}:`,
      error
    );

    return null;
  }
}

/* =========================================================
   PREPARE VISION SET
========================================================= */

async function prepareVisionImages(
  candidates:
    VisualCandidate[]
) {
  const checked =
    candidates.slice(
      0,
      MAX_VISION_CHECKS
    );

  const results =
    await Promise.all(
      checked.map(
        (
          candidate
        ) =>
          prepareVisionImage(
            candidate
          )
      )
    );

  return results
    .filter(
      (
        result
      ): result is PreparedVisionImage =>
        Boolean(
          result
        )
    )
    .slice(
      0,
      MAX_VISION_IMAGES
    );
}

/* =========================================================
   INVALID VISION ERROR

   This catches exactly the error from your screenshot.

   If OpenAI rejects even one apparently valid image, the
   whole design must NOT fail.

   We simply retry the same design request without binary
   image attachments. Sol still receives every real image
   URL, alt text and crawler context.
========================================================= */

function isInvalidVisionInputError(
  error:
    unknown
) {
  const message =
    error instanceof
      Error
      ? error.message
      : String(
          error
        );

  return (
    /image data.*does not represent a valid image/i.test(
      message
    ) ||
    /supported image formats/i.test(
      message
    ) ||
    /invalid image/i.test(
      message
    ) ||
    /unsupported image/i.test(
      message
    )
  );
}

/* =========================================================
   HTML EXTRACTION
========================================================= */

function extractHtml(
  value:
    string
) {
  let html =
    value.trim();

  html =
    html.replace(
      /^```(?:html)?\s*/i,
      ""
    );

  html =
    html.replace(
      /\s*```$/,
      ""
    );

  const lower =
    html.toLowerCase();

  const doctypeIndex =
    lower.indexOf(
      "<!doctype html"
    );

  const htmlIndex =
    lower.indexOf(
      "<html"
    );

  const startIndex =
    doctypeIndex >=
      0
      ? doctypeIndex
      : htmlIndex;

  if (
    startIndex >
    0
  ) {
    html =
      html.slice(
        startIndex
      );
  }

  const endIndex =
    html
      .toLowerCase()
      .lastIndexOf(
        "</html>"
      );

  if (
    endIndex >=
    0
  ) {
    html =
      html.slice(
        0,
        endIndex +
          "</html>".length
      );
  }

  return html.trim();
}

/* =========================================================
   HTML SAFETY
========================================================= */

function sanitizeHtml(
  value:
    string
) {
  let html =
    value;

  html =
    html.replace(
      /<script\b[^>]*>[\s\S]*?<\/script>/gi,
      ""
    );

  html =
    html.replace(
      /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
      ""
    );

  html =
    html.replace(
      /<object\b[^>]*>[\s\S]*?<\/object>/gi,
      ""
    );

  html =
    html.replace(
      /<embed\b[^>]*\/?>/gi,
      ""
    );

  html =
    html.replace(
      /\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
      ""
    );

  html =
    html.replace(
      /javascript:/gi,
      ""
    );

  html =
    html.replace(
      /<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/gi,
      ""
    );

  return html;
}

/* =========================================================
   COMPLETE HTML
========================================================= */

function ensureCompleteHtml(
  value:
    string
) {
  let html =
    value.trim();

  if (
    !/<html[\s>]/i.test(
      html
    )
  ) {
    html =
      `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body>
${html}
</body>
</html>`;
  }

  if (
    !/<!doctype html>/i.test(
      html
    )
  ) {
    html =
      `<!DOCTYPE html>\n${html}`;
  }

  if (
    !/<meta[^>]+name=["']viewport["']/i.test(
      html
    )
  ) {
    html =
      html.replace(
        /<head([^>]*)>/i,
        '<head$1><meta name="viewport" content="width=device-width,initial-scale=1">'
      );
  }

  if (
    !/<\/body>/i.test(
      html
    )
  ) {
    if (
      /<\/html>/i.test(
        html
      )
    ) {
      html =
        html.replace(
          /<\/html>/i,
          "</body>\n</html>"
        );
    } else {
      html +=
        "\n</body>";
    }
  }

  if (
    !/<\/html>/i.test(
      html
    )
  ) {
    html +=
      "\n</html>";
  }

  return html;
}

/* =========================================================
   MOBILE SAFETY CSS

   Sol still designs the actual mobile page itself.

   This is only the final safety net against:
   - horizontal overflow
   - oversized media
   - unbreakable strings
   - tables wider than the viewport
========================================================= */

function ensureMobileSafetyCss(
    value:
      string
  ) {
    if (
      value.includes(
        "data-leadbase-mobile-safety"
      )
    ) {
      return value;
    }
  
    const safetyCss =
      `
  <style data-leadbase-mobile-safety>
  *,*::before,*::after{
    box-sizing:border-box;
  }
  
  html{
    width:100%!important;
    max-width:100%!important;
    height:auto!important;
    min-height:100%!important;
    overflow-x:hidden!important;
    overflow-y:auto!important;
    scroll-behavior:auto!important;
  }
  
  body{
    width:100%!important;
    max-width:100%!important;
    height:auto!important;
    min-height:100vh!important;
    overflow-x:hidden!important;
    overflow-y:visible!important;
    position:relative!important;
  }
  
  body > main,
  body > div,
  main{
    height:auto!important;
    min-height:0;
    max-height:none!important;
  }
  
  img,
  video,
  svg{
    max-width:100%;
  }
  
  @media(max-width:768px){
    html{
      width:100%!important;
      max-width:100%!important;
      height:auto!important;
      min-height:100%!important;
      overflow-x:hidden!important;
      overflow-y:auto!important;
    }
  
    body{
      width:100%!important;
      max-width:100%!important;
      height:auto!important;
      min-height:100vh!important;
      max-height:none!important;
      overflow-x:hidden!important;
      overflow-y:visible!important;
      position:relative!important;
      touch-action:pan-y!important;
      overscroll-behavior-y:auto!important;
    }
  
    body > main,
    body > div,
    main{
      width:100%;
      height:auto!important;
      min-height:0!important;
      max-height:none!important;
      overflow:visible!important;
    }
  
    header,
    nav,
    section,
    article,
    footer{
      max-width:100%;
    }
  
    img,
    video,
    svg{
      max-width:100%;
      height:auto;
      object-position:center;
    }
  
    h1,
    h2,
    h3,
    h4,
    p,
    li,
    a,
    span{
      overflow-wrap:break-word;
      word-break:normal;
    }
  
    table{
      display:block;
      max-width:100%;
      overflow-x:auto;
      -webkit-overflow-scrolling:touch;
    }
  }
  
  @media(max-width:480px){
    html,
    body{
      overflow-x:hidden!important;
    }
  
    body{
      overflow-y:visible!important;
      height:auto!important;
      min-height:100vh!important;
      max-height:none!important;
    }
  
    body > main,
    body > div,
    main{
      height:auto!important;
      max-height:none!important;
      overflow:visible!important;
    }
  }
  </style>
      `.trim();
  
    if (
      /<\/head>/i.test(
        value
      )
    ) {
      return value.replace(
        /<\/head>/i,
        `${safetyCss}\n</head>`
      );
    }
  
    return value;
  }

/* =========================================================
   APPROVED IMAGE LOOKUP
========================================================= */

function createApprovedImageMap(
  candidates:
    VisualCandidate[]
) {
  const map =
    new Map<
      string,
      VisualCandidate
    >();

  for (
    const candidate of
      candidates
  ) {
    map.set(
      normalizeComparableUrl(
        candidate.url
      ),
      candidate
    );
  }

  return map;
}

/* =========================================================
   IMAGE FALLBACKS
========================================================= */

function getFallbackImages(
  candidates:
    VisualCandidate[]
) {
  const withoutLogo =
    candidates.filter(
      (
        candidate
      ) =>
        candidate.role !==
        "REAL COMPANY LOGO"
    );

  const preferred =
    withoutLogo.filter(
      (
        candidate
      ) =>
        candidate.role.includes(
          "PROJECT"
        ) ||
        candidate.role.includes(
          "TEAM"
        ) ||
        candidate.role.includes(
          "HOMEPAGE"
        )
    );

  return preferred.length >
    0
    ? preferred
    : withoutLogo;
}

/* =========================================================
   SANITIZE GENERATED IMAGE URLS
========================================================= */

function sanitizeGeneratedImageUrls({
  html,
  candidates,
}: {
  html:
    string;

  candidates:
    VisualCandidate[];
}) {
  const approved =
    createApprovedImageMap(
      candidates
    );

  const fallbacks =
    getFallbackImages(
      candidates
    );

  let fallbackIndex =
    0;

  function getFallback() {
    if (
      fallbacks.length ===
      0
    ) {
      return null;
    }

    const fallback =
      fallbacks[
        fallbackIndex %
          fallbacks.length
      ] ??
      null;

    fallbackIndex +=
      1;

    return fallback;
  }

  let sanitized =
    html.replace(
      /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
      (
        fullMatch,
        sourceUrl:
          string
      ) => {
        const normalized =
          normalizeComparableUrl(
            sourceUrl
          );

        if (
          approved.has(
            normalized
          )
        ) {
          return fullMatch;
        }

        const fallback =
          getFallback();

        if (
          !fallback
        ) {
          return "";
        }

        return fullMatch.replace(
          sourceUrl,
          escapeHtmlAttribute(
            fallback.url
          )
        );
      }
    );

  sanitized =
    sanitized.replace(
      /url\(\s*(['"]?)(https?:\/\/[^"')\s]+)\1\s*\)/gi,
      (
        fullMatch,
        _quote:
          string,
        sourceUrl:
          string
      ) => {
        if (
          /fonts\.(?:googleapis|gstatic)\.com/i.test(
            sourceUrl
          )
        ) {
          return fullMatch;
        }

        const normalized =
          normalizeComparableUrl(
            sourceUrl
          );

        if (
          approved.has(
            normalized
          )
        ) {
          return fullMatch;
        }

        const fallback =
          getFallback();

        if (
          !fallback
        ) {
          return "none";
        }

        return `url("${fallback.url}")`;
      }
    );

  return sanitized;
}

/* =========================================================
   VISIBLE TEXT
========================================================= */

function getVisibleText(
  html:
    string
) {
  const bodyMatch =
    html.match(
      /<body\b[^>]*>([\s\S]*?)<\/body>/i
    );

  let body =
    bodyMatch?.[1] ??
    html;

  body =
    body.replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      " "
    );

  body =
    body.replace(
      /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
      " "
    );

  body =
    body.replace(
      /<!--[\s\S]*?-->/g,
      " "
    );

  body =
    body.replace(
      /<[^>]+>/g,
      " "
    );

  body =
    body.replace(
      /&nbsp;/gi,
      " "
    );

  body =
    body.replace(
      /&amp;/gi,
      "&"
    );

  body =
    body.replace(
      /&quot;/gi,
      '"'
    );

  body =
    body.replace(
      /&#39;/gi,
      "'"
    );

  return cleanText(
    body
  );
}

/* =========================================================
   TAG COUNTER
========================================================= */

function countMatches(
  value:
    string,
  pattern:
    RegExp
) {
  return Array.from(
    value.matchAll(
      pattern
    )
  ).length;
}

/* =========================================================
   DOCUMENT QUALITY
========================================================= */

function inspectDocumentQuality(
  html:
    string
): DocumentQualityResult {
  const reasons:
    string[] = [];

  const visibleText =
    getVisibleText(
      html
    );

  const sectionCount =
    countMatches(
      html,
      /<(?:section|article)\b/gi
    );

  const headingCount =
    countMatches(
      html,
      /<h[1-4]\b/gi
    );

  const paragraphCount =
    countMatches(
      html,
      /<p\b/gi
    );

  const imageCount =
    countMatches(
      html,
      /<img\b/gi
    );

  if (
    html.length <
    MIN_HTML_LENGTH
  ) {
    reasons.push(
      `HTML is too short (${html.length} characters).`
    );
  }

  if (
    visibleText.length <
    MIN_VISIBLE_TEXT_CHARACTERS
  ) {
    reasons.push(
      `Visible content is too short (${visibleText.length} characters).`
    );
  }

  if (
    sectionCount <
    MIN_SECTION_COUNT
  ) {
    reasons.push(
      `Only ${sectionCount} substantial sections were generated.`
    );
  }

  if (
    headingCount <
    MIN_HEADING_COUNT
  ) {
    reasons.push(
      `Only ${headingCount} headings were generated.`
    );
  }

  if (
    paragraphCount <
    MIN_PARAGRAPH_COUNT
  ) {
    reasons.push(
      `Only ${paragraphCount} paragraphs were generated.`
    );
  }

  if (
    sectionCount <=
      2 &&
    visibleText.length <
      1_800
  ) {
    reasons.push(
      "The document appears to contain only an unfinished header/hero."
    );
  }

  return {
    ok:
      reasons.length ===
      0,

    reasons,

    htmlCharacters:
      html.length,

    visibleTextCharacters:
      visibleText.length,

    sectionCount,

    headingCount,

    paragraphCount,

    imageCount,
  };
}

/* =========================================================
   IMAGE QA
========================================================= */

function inspectImageUsage({
  html,
  candidates,
}: {
  html:
    string;

  candidates:
    VisualCandidate[];
}): ImageUsageResult {
  const warnings:
    string[] = [];

  const logoUrl =
    candidates.find(
      (
        candidate
      ) =>
        candidate.role ===
        "REAL COMPANY LOGO"
    )
      ?.url ??
    null;

  const nonLogo =
    candidates.filter(
      (
        candidate
      ) =>
        candidate.url !==
        logoUrl
    );

  const usedNonLogo =
    nonLogo.filter(
      (
        candidate
      ) => {
        const escaped =
          escapeHtmlAttribute(
            candidate.url
          );

        return (
          html.includes(
            candidate.url
          ) ||
          html.includes(
            escaped
          )
        );
      }
    );

  if (
    nonLogo.length >=
      4 &&
    usedNonLogo.length <
      3
  ) {
    warnings.push(
      `Only ${usedNonLogo.length} of ${nonLogo.length} available real company images were used.`
    );
  }

  if (
    logoUrl &&
    !html.includes(
      logoUrl
    ) &&
    !html.includes(
      escapeHtmlAttribute(
        logoUrl
      )
    )
  ) {
    warnings.push(
      "Detected real company logo was not used."
    );
  }

  return {
    usedRealImages:
      usedNonLogo.length,

    warnings,
  };
}

/* =========================================================
   MODEL CONTENT
========================================================= */

function buildModelContent({
  prompt,
  candidates,
  visionByUrl,
  includeVision,
}: {
  prompt:
    string;

  candidates:
    VisualCandidate[];

  visionByUrl:
    Map<
      string,
      PreparedVisionImage
    >;

  includeVision:
    boolean;
}) {
  const content:
    ModelInputContent[] = [
      {
        type:
          "input_text",

        text:
          prompt,
      },
    ];

  for (
    let index =
      0;
    index <
    candidates.length;
    index +=
      1
  ) {
    const candidate =
      candidates[
        index
      ];

    const prepared =
      visionByUrl.get(
        candidate.url
      );

    content.push({
      type:
        "input_text",

      text:
        `
REAL WEBSITE IMAGE ${index + 1}

CRAWLER ROLE:
${candidate.role}

ALT:
${candidate.alt || "none"}

CONTEXT:
${candidate.context || "none"}

EXACT REAL URL:
${candidate.url}

VISUALLY ATTACHED:
${prepared && includeVision ? "yes" : "no"}
        `.trim(),
    });

    if (
      prepared &&
      includeVision
    ) {
      content.push({
        type:
          "input_image",

        image_url:
          prepared.dataUrl,

        detail:
          "low",
      });
    }
  }

  return content;
}

/* =========================================================
   USAGE
========================================================= */

function addUsage({
  totals,
  response,
}: {
  totals:
    UsageTotals;

  response:
    OpenAIResponse;
}) {
  totals.inputTokens +=
    response.usage
      ?.input_tokens ??
    0;

  totals.outputTokens +=
    response.usage
      ?.output_tokens ??
    0;

  totals.totalTokens +=
    response.usage
      ?.total_tokens ??
    0;
}

/* =========================================================
   MODEL CALL WITH VISION FALLBACK

   If one weird customer image is rejected by OpenAI,
   generation automatically continues without image
   attachments.

   No red error for the user.
========================================================= */

async function createGenerationResponse({
  openai,
  model,
  prompt,
  candidates,
  visionByUrl,
  maxOutputTokens,
  allowVision,
}: {
  openai:
    OpenAI;

  model:
    string;

  prompt:
    string;

  candidates:
    VisualCandidate[];

  visionByUrl:
    Map<
      string,
      PreparedVisionImage
    >;

  maxOutputTokens:
    number;

  allowVision:
    boolean;
}): Promise<GenerationResponseResult> {
  const hasVisionImages =
    allowVision &&
    visionByUrl.size >
      0;

  const firstContent =
    buildModelContent({
      prompt,

      candidates,

      visionByUrl,

      includeVision:
        hasVisionImages,
    });

  try {
    const response =
      await openai.responses.create({
        model,

        reasoning: {
          effort:
            "medium",
        },

        max_output_tokens:
          maxOutputTokens,

        store:
          false,

        input: [
          {
            role:
              "user",

            content:
              firstContent,
          },
        ],
      });

    return {
      response,

      visionFallbackUsed:
        false,
    };
  } catch (
    error
  ) {
    if (
      !hasVisionImages ||
      !isInvalidVisionInputError(
        error
      )
    ) {
      throw error;
    }

    console.warn(
      "OpenAI rejected one of the validated vision images. Retrying the design without binary image attachments.",
      error
    );

    const fallbackContent =
      buildModelContent({
        prompt:
          `${prompt}

=========================================================
VISION FALLBACK NOTICE
=========================================================

The binary image attachments could not be transmitted
reliably.

You still have the EXACT real company image URLs, roles,
alt text and context listed in this request.

Continue building the complete website.

Use ONLY those supplied real image URLs.

Do not invent replacement stock photography.
          `.trim(),

        candidates,

        visionByUrl,

        includeVision:
          false,
      });

    const response =
      await openai.responses.create({
        model,

        reasoning: {
          effort:
            "medium",
        },

        max_output_tokens:
          maxOutputTokens,

        store:
          false,

        input: [
          {
            role:
              "user",

            content:
              fallbackContent,
          },
        ],
      });

    return {
      response,

      visionFallbackUsed:
        true,
    };
  }
}

/* =========================================================
   PREPARE GENERATED HTML
========================================================= */

function prepareGeneratedHtml({
  rawHtml,
  candidates,
}: {
  rawHtml:
    string;

  candidates:
    VisualCandidate[];
}) {
  let html =
    extractHtml(
      rawHtml
    );

  html =
    sanitizeHtml(
      html
    );

  html =
    sanitizeGeneratedImageUrls({
      html,

      candidates,
    });

  html =
    ensureCompleteHtml(
      html
    );

  html =
    ensureMobileSafetyCss(
      html
    );

  return html;
}

/* =========================================================
   GENERATE
========================================================= */

export async function generateSolStaticDesign({
  variantId,
  source,
  analysis,
  site,
  generationIndex,
  designResearch,
  previousDirections = [],
}: {
  variantId:
    string;

  source:
    RedesignSource;

  analysis:
    RedesignAnalysisContext;

  site:
    RedesignSiteIntelligence;

  generationIndex:
    number;

  designResearch:
    string
    | null;

  previousDirections?:
    string[];
}): Promise<StaticDesignResult> {
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

  const model =
    process.env
      .OPENAI_REDESIGN_DESIGN_MODEL ??
    "gpt-5.6-sol";

  const candidates =
    collectVisualCandidates({
      source,

      site,
    });

  const mandate =
    getVariantMandate(
      generationIndex
    );

  const visionImages =
    await prepareVisionImages(
      candidates
    );

  const visionByUrl =
    new Map(
      visionImages.map(
        (
          image
        ) => [
          image.candidate
            .url,
          image,
        ]
      )
    );

  /* =======================================================
     PAGE RESEARCH
  ======================================================= */

  const pageSummary =
    site.pages
      .slice(
        0,
        9
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
              8
            ),

          paragraphs:
            page.paragraphs.slice(
              0,
              6
            ),
        })
      );

  const sourceSections =
    source.homepageSections
      .slice(
        0,
        12
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
            section.text,

          links:
            section.links,
        })
      );

  /* =======================================================
     MAIN PROMPT
  ======================================================= */

  const prompt =
    `
You are GPT-5.6 Sol acting as a world-class senior web
designer, Art Director and frontend designer.

Create ONE complete visual homepage concept for this REAL
company.

This is a STATIC DESIGN CONCEPT used for sales outreach.

The goal is to make the business owner think:

"This looks substantially better than my current website.
I want to speak to the designer who created this."

=========================================================
OUTPUT
=========================================================

Return ONLY one complete standalone HTML document.

No Markdown.

No explanation before or after it.

Use:

- semantic HTML
- ONE concise inline <style> block
- responsive CSS
- optional Google Fonts via <link>

DO NOT use JavaScript.

DO NOT use React.

DO NOT use Tailwind.

DO NOT use external CSS frameworks.

=========================================================
CRITICAL OUTPUT-BUDGET RULE
=========================================================

You have enough output capacity to create a complete
homepage.

USE IT.

Do NOT spend the majority of the response writing CSS.

The CSS should be clean and concise.

Avoid:

- giant CSS resets
- hundreds of repetitive utility classes
- duplicated selectors
- unnecessary animation systems
- verbose comments
- unnecessary CSS variables

The visible HTML content is more important than elaborate
CSS infrastructure.

Begin the real <body> content early.

Do not spend 50% of the response before reaching the real
homepage markup.

MOST IMPORTANT:

DO NOT STOP AFTER THE HERO.

DO NOT STOP AFTER THE SECOND SECTION.

You must finish the complete homepage.

=========================================================
HOMEPAGE DEPTH — HARD REQUIREMENT
=========================================================

When enough real source material exists, create a
substantial homepage with approximately:

7–10 MAJOR CONTENT SECTIONS
PLUS HEADER AND FOOTER.

The exact sections must come from the real company content.

A strong structure may include:

- navigation / utility header
- hero
- credibility / statistics
- company introduction
- service overview
- deeper service presentation
- work / references
- history / company story
- team / people
- quality / process / expertise
- contact / conversion section
- footer

You do NOT need to use those exact sections.

Do NOT invent information just to fill them.

Instead, use the strongest real content found across the
actual website.

If the company has enough material for eight meaningful
sections, DO NOT compress it into three sections.

=========================================================
THE MOST IMPORTANT DESIGN RULE
=========================================================

THIS MUST NOT LOOK LIKE A GENERIC AI LANDING PAGE.

Do not simply create:

hero
→ cards
→ bento
→ about
→ CTA

Do not default to a SaaS design system.

Do not use repetitive rounded cards.

Do not make every section the same width and composition.

Do not make the homepage artificially short.

At desktop width this should feel like a substantial real
company website.

Aim for the visual depth of a complete professionally
designed homepage, approximately 4500–7000px tall when
the real source contains enough useful material.

The page should have deliberate changes in:

- scale
- density
- alignment
- image treatment
- section rhythm
- background treatment
- typography
- grid structure

=========================================================
CRITICAL VISIBILITY RULE
=========================================================

Everything important must be visible WITHOUT JavaScript.

Do NOT build scroll-reveal systems that require:

- IntersectionObserver
- JavaScript
- client-side scripts

Do NOT leave sections with:

opacity: 0

visibility: hidden

display: none

waiting for JavaScript.

The static HTML must render as a complete visible website
immediately.

CSS hover effects are fine.

Small CSS-only transitions are fine.

The actual page content must always remain visible.

=========================================================
VARIATION
=========================================================

This is design variation:

${generationIndex}

Art-direction mandate:

${mandate}

THIS IS NOT A TEMPLATE.

Interpret the direction freely.

Create an original composition.

Previously generated directions:

${compactJson(
  previousDirections,
  2_500
)}

The new variation must feel meaningfully different in:

- hero composition
- headline treatment
- typography
- image placement
- service presentation
- project presentation
- section rhythm
- page density

Changing only colors does NOT count.

=========================================================
REAL COMPANY
=========================================================

${compactJson(
  analysis.company,
  2_500
)}

Real website:

${source.finalUrl}

Page title:

${source.pageTitle}

Meta description:

${source.metaDescription}

=========================================================
BRAND
=========================================================

Detected primary brand color:

${site.primaryBrandColor ??
source.brandColorAnchor ??
"Unknown"}

Other detected colors:

${compactJson(
  [
    ...site.brandColors,
    ...source.brandColorCandidates,
  ],
  4_000
)}

Real logo URL:

${site.primaryLogo
  ?.url ??
source.assets.find(
  (
    asset
  ) =>
    asset.kind ===
    "logo"
)
  ?.url ??
"none"}

The client's real visual identity outranks design
inspiration.

Respect the recognizable hue.

If the real company is:

blue
→ remain blue-led

red
→ remain red-led

green
→ remain green-led

orange
→ remain orange-led

Refine the palette professionally.

Do NOT randomly rebrand the company.

If a real logo is supplied:

USE IT.

Use the exact URL.

Do not redraw it.

Do not replace it with typed text.

=========================================================
REAL HOMEPAGE
=========================================================

Navigation:

${compactJson(
  source.navigation
)}

Hero:

${compactJson(
  source.homepageHero,
  4_500
)}

Homepage sections:

${compactJson(
  sourceSections,
  9_000
)}

Headings:

${compactJson(
  source.headings,
  4_000
)}

Important paragraphs:

${compactJson(
  source.paragraphs,
  8_000
)}

CTAs:

${compactJson(
  source.ctas
)}

=========================================================
MULTI-PAGE COMPANY RESEARCH
=========================================================

We inspected relevant pages from the REAL company website.

${compactJson(
  pageSummary,
  14_000
)}

Extracted site facts:

${compactJson(
  site.facts,
  6_000
)}

Extracted services:

${compactJson(
  site.services,
  7_000
)}

Do not treat the homepage as the only source.

Use useful factual information from:

- About
- Company
- Team
- Services
- References
- Projects
- History
- Contact

when available.

The redesign homepage should intelligently combine the
strongest information from across the real site.

=========================================================
EXISTING ANALYSIS
=========================================================

Research:

${truncate(
  analysis.researchSummary ??
  "",
  5_000
)}

Website findings:

${compactJson(
  analysis.websiteFindings,
  5_000
)}

Visual analysis:

${compactJson(
  analysis.visualAnalysis,
  5_000
)}

=========================================================
MAXIBESTOF ART DIRECTION
=========================================================

${(
  designResearch ??
  "No MaxiBestOf memo available."
).slice(
  0,
  MAX_RESEARCH_LENGTH
)}

This research is not decorative context.

ACTUALLY USE IT.

Extract concrete design ideas such as:

- typography relationships
- grid logic
- headline proportions
- composition
- image crops
- section transitions
- negative space
- information density
- navigation treatment
- reference presentation
- service presentation

Do NOT clone one inspiration website.

Synthesize the strongest ideas into an original design for
THIS company.

MaxiBestOf influences ART DIRECTION.

The real company controls:

- brand
- facts
- imagery
- content
- identity

=========================================================
FACTUAL ACCURACY
=========================================================

Use REAL facts from the supplied company material.

Important statistics must NOT disappear.

If real content contains meaningful values such as:

- number of employees
- apprentices
- completed projects
- clients
- founding year
- years of experience
- generations
- locations

show them prominently when appropriate.

Never change those numbers.

Never invent:

- testimonials
- reviews
- awards
- certifications
- employees
- customers
- projects
- locations
- guarantees
- prices
- years

=========================================================
SERVICES
=========================================================

Preserve the real service depth.

If the source lists many meaningful services, do not
compress everything into four generic categories.

Use thoughtful information architecture.

Possible treatments:

- editorial service index
- large service rows
- grouped service families
- technical capability table
- alternating service compositions
- typographic service directory
- visual service chapters

Do NOT present raw navigation garbage.

Do NOT include:

- menu labels
- cookie buttons
- privacy controls
- "mehr info" as a service
- navigation leftovers

=========================================================
COPY
=========================================================

Do not reduce the website to five-word marketing phrases.

Use useful real copy.

A strong homepage needs enough information to understand:

- what the business does
- where it operates
- important services
- expertise
- history
- people
- projects
- credibility
- contact path

Headlines can be editorial and concise.

Supporting copy should still carry meaningful real
information.

Avoid incomplete fragments such as:

"seit"

"mehr"

"unternehmen"

without meaningful context.

=========================================================
REAL IMAGES
=========================================================

The following image records were discovered on the
company's REAL website.

Some are attached visually.

LOOK at visually attached images before deciding how to
use them.

Some crawler labels can be wrong.

Visual evidence outranks crawler labels.

Examples:

A yoga photo is NOT appropriate for a construction company.

A lighthouse is NOT a team image.

A rating badge is NOT a reference project.

A map screenshot is NOT hero photography.

Prioritize real:

- team
- employees
- company premises
- buildings
- construction
- projects
- craftsmanship
- products
- reference photography

Do not use an irrelevant image simply because it exists.

=========================================================
IMAGE QUANTITY
=========================================================

Use several DIFFERENT real photographs when enough useful
ones exist.

Do NOT reuse one project photograph five times.

A strong long homepage can comfortably use 4–8 different
real company images if the supplied material supports it.

If only 2 relevant photographs exist, use those 2 well.

Relevance is more important than filling space.

=========================================================
IMAGE URL RULE
=========================================================

Use ONLY supplied company image URLs.

Never use:

- Unsplash
- Pexels
- fake stock
- placeholder services
- invented image URLs
- random remote images

The real logo may appear in both header and footer.

Other photographs should normally appear once.

=========================================================
ART-DIRECTION QUALITY
=========================================================

Think like an excellent human web designer.

A strong section should have a reason for its composition.

Do not repeat the same:

eyebrow
headline
paragraph
cards

formula for every section.

Create meaningful contrast.

Examples:

one section may be typography-led

the next photography-led

the next information-dense

the next quiet and editorial

the next dark and immersive

the next structured and technical

The page should have a narrative rhythm.

=========================================================
NO INTERNAL METADATA
=========================================================

Never display crawler/source indexes.

Never show decorative:

01
02
03
04
05

SECTION 01
SECTION 05
CHAPTER 03

unless the number itself is an actual factual value from
the company.

=========================================================
MOBILE — HARD REQUIREMENT
=========================================================

The mobile version is NOT an afterthought.

You are designing TWO connected experiences:

1. desktop
2. mobile

The mobile version must feel deliberately art-directed.

Target real viewport widths such as:

375px
390px
430px

Do NOT merely take the desktop grid and stack every column
in its original order.

Recompose sections where necessary.

Mobile must preserve the identity and drama of desktop
while remaining extremely readable.

MANDATORY MOBILE RULES:

- create an explicit @media (max-width: 768px) section
- create an explicit @media (max-width: 480px) section
- absolutely no horizontal page overflow
- no fixed desktop width that exceeds the viewport
- no body min-width larger than the viewport
- no giant headline extending off-screen
- no clipped words
- no overlapping text and images
- no tiny body text
- no desktop navigation squeezed into one line
- no unusable 5-column statistic row
- no image compositions that become microscopic
- no enormous empty areas caused by desktop positioning
- no essential content hidden on mobile

At <= 768px:

- reorganize complex grids
- reduce paddings intentionally
- resize headline typography with clamp()
- simplify navigation
- use strong single-column or carefully designed
  two-column compositions
- preserve useful image hierarchy
- resize statistic layouts
- keep calls-to-action easy to tap

At <= 480px:

- optimize specifically for a phone
- use comfortable horizontal padding, usually around
  18–24px
- body text should normally be at least around 15–16px
- buttons should have a comfortable tap height
- important hero copy must be visible immediately
- typography may remain bold but must fit naturally
- project imagery should remain impressive, not tiny
- service content must remain readable

Do not solve mobile by simply adding:

display: block

to everything.

Design the mobile sequence.

If desktop uses:

- overlap
- asymmetry
- split compositions
- floating typography
- large photographic grids

reinterpret those ideas intelligently for mobile.

Do not destroy the art direction.

=========================================================
MOBILE HERO
=========================================================

The mobile hero deserves its own composition.

For example:

A split desktop hero may become:

headline
→ supporting copy / CTA
→ strong full-width real image

An overlapping desktop hero may become:

compact image
→ deliberately offset typography

A full-screen desktop hero may remain image-led, but the
text overlay must maintain strong contrast.

Do NOT let:

- nav
- logo
- hero title
- CTA
- hero image

fight for space.

=========================================================
MOBILE SERVICES
=========================================================

If the company has many services:

do not hide most of them on mobile.

Use:

- clean stacked service rows
- compact indexed lists
- grouped categories
- readable capability sections

Keep the real service depth.

=========================================================
MOBILE REFERENCES
=========================================================

Reference/project photography is important on mobile.

Do not compress three strong images into three tiny
side-by-side thumbnails.

Prefer:

- one strong feature image
- alternating large images
- carefully staggered project cards
- horizontal compositions only when readable

=========================================================
MOBILE QA
=========================================================

Before returning the HTML, mentally inspect it at:

390 × 844

and:

375 × 812

Confirm:

- no horizontal scroll
- header fits
- logo fits
- hero headline fits
- hero CTA fits
- images remain visually strong
- stats fit
- services remain complete
- body copy remains readable
- contact content fits
- footer fits
- no absolute-positioned desktop element floats outside
  its section

Mobile is part of the actual design.

It is not optional.

=========================================================
FINAL SELF-CHECK
=========================================================

Before outputting the document, inspect the complete page.

Verify:

[ ] Complete HTML document exists.

[ ] Homepage contains at least 7 substantial content
    sections when enough source material exists.

[ ] The page does NOT end after the hero or second section.

[ ] Real brand identity is respected.

[ ] Real logo is used when supplied.

[ ] Important statistics are retained.

[ ] Important services are retained.

[ ] Several real relevant images are used when available.

[ ] No unrelated image is used.

[ ] No fake stock is used.

[ ] No project image is needlessly repeated.

[ ] No internal section indexes appear.

[ ] No unsupported facts were invented.

[ ] Visible content does not require JavaScript.

[ ] No generic repeated Bento layout.

[ ] Typography feels intentionally designed.

[ ] Sections have different compositions.

[ ] Explicit mobile CSS exists.

[ ] Mobile hero is intentionally composed.

[ ] Mobile services are readable and complete.

[ ] Mobile references remain visually strong.

[ ] No horizontal overflow exists at 375px.

[ ] No horizontal overflow exists at 390px.

[ ] The homepage feels substantial enough to sell a real
    professional website project.

Fix failures BEFORE returning.

Return ONLY the finished complete HTML document.
    `.trim();

  /* =======================================================
     USAGE
  ======================================================= */

  const usage:
    UsageTotals = {
    inputTokens:
      0,

    outputTokens:
      0,

    totalTokens:
      0,
  };

  /* =======================================================
     FIRST GENERATION

     Vision is attempted first.

     If one customer image is rejected, we automatically
     retry WITHOUT image attachments.
  ======================================================= */

  const firstGeneration =
    await createGenerationResponse({
      openai,

      model,

      prompt,

      candidates,

      visionByUrl,

      maxOutputTokens:
        MAX_OUTPUT_TOKENS,

      allowVision:
        true,
    });

  addUsage({
    totals:
      usage,

    response:
      firstGeneration.response,
  });

  const firstRawHtml =
    firstGeneration
      .response
      .output_text;

  if (
    !firstRawHtml.trim()
  ) {
    throw new Error(
      "GPT-5.6 Sol returned no design HTML."
    );
  }

  let html =
    prepareGeneratedHtml({
      rawHtml:
        firstRawHtml,

      candidates,
    });

  let quality =
    inspectDocumentQuality(
      html
    );

  let repaired =
    false;

  let repairVisionFallbackUsed =
    false;

  /* =======================================================
     AUTOMATIC STRUCTURAL REPAIR
  ======================================================= */

  if (
    !quality.ok
  ) {
    repaired =
      true;

    console.warn(
      "Static redesign failed structural QA. Attempting one repair:",
      quality
    );

    const repairPrompt =
      `
${prompt}

=========================================================
CRITICAL REPAIR ATTEMPT
=========================================================

Your previous attempt was structurally incomplete and is
NOT acceptable.

The automatic quality checker reported:

${quality.reasons.join(
  "\n"
)}

Previous attempt metrics:

HTML characters:
${quality.htmlCharacters}

Visible text characters:
${quality.visibleTextCharacters}

Substantial sections:
${quality.sectionCount}

Headings:
${quality.headingCount}

Paragraphs:
${quality.paragraphCount}

Images:
${quality.imageCount}

START AGAIN AND OUTPUT A COMPLETE FINISHED HOMEPAGE.

Do not explain the failure.

Do not discuss the previous attempt.

Do not return a patch.

Return the ENTIRE standalone HTML document from
<!DOCTYPE html> through </html>.

Mandatory repair requirements:

- at least 7 substantial semantic content sections
- at least 6 meaningful headings
- meaningful supporting paragraphs
- complete hero
- complete services presentation
- company / credibility content
- real references or projects when available
- team / people content when supported
- strong conversion/contact ending
- footer
- all content visible without JavaScript
- concise CSS
- explicit responsive treatment
- explicit @media (max-width: 768px)
- explicit @media (max-width: 480px)
- deliberate mobile hero
- readable mobile services
- strong mobile project imagery
- no horizontal overflow at 375px
- no horizontal overflow at 390px
- do not stop early
- do not output an unfinished document

The previous result failed because it looked like an
unfinished page.

This repair must be a COMPLETE CLIENT-PRESENTABLE WEBSITE.

Return ONLY the complete HTML.
      `.trim();

    /*
     * Repair intentionally skips binary vision.
     *
     * This prevents a bad company image from breaking an
     * expensive emergency repair.
     */
    const repairGeneration =
      await createGenerationResponse({
        openai,

        model,

        prompt:
          repairPrompt,

        candidates,

        visionByUrl,

        maxOutputTokens:
          REPAIR_MAX_OUTPUT_TOKENS,

        allowVision:
          false,
      });

    repairVisionFallbackUsed =
      repairGeneration
        .visionFallbackUsed;

    addUsage({
      totals:
        usage,

      response:
        repairGeneration
          .response,
    });

    const repairedRawHtml =
      repairGeneration
        .response
        .output_text;

    if (
      !repairedRawHtml.trim()
    ) {
      throw new Error(
        "GPT-5.6 Sol returned no HTML during the repair attempt."
      );
    }

    html =
      prepareGeneratedHtml({
        rawHtml:
          repairedRawHtml,

        candidates,
      });

    quality =
      inspectDocumentQuality(
        html
      );

    if (
      !quality.ok
    ) {
      console.error(
        "Static redesign failed structural QA after repair:",
        quality
      );

      throw new Error(
        `Generated website remained incomplete after automatic repair: ${quality.reasons.join(
          " "
        )}`
      );
    }
  }

  /* =======================================================
     IMAGE QA

     Still non-fatal.

     We log warnings instead of throwing away a design.
  ======================================================= */

  const imageQa =
    inspectImageUsage({
      html,

      candidates,
    });

  if (
    imageQa.warnings.length >
    0
  ) {
    console.warn(
      "Static redesign image QA warnings:",
      imageQa.warnings
    );
  }

  /* =======================================================
     RESULT
  ======================================================= */

  const direction =
    `${mandate} Variation ${generationIndex}`;

  const snapshot:
    StaticDesignSnapshot = {
    version:
      3,

    renderMode:
      "html",

    html,

    companyName:
      analysis.company
        .name,

    sourceUrl:
      source.finalUrl,

    generationIndex,

    model,

    direction,

    inspirationMemo:
      designResearch
        ? designResearch.slice(
            0,
            12_000
          )
        : "",

    allowedImages:
      candidates.map(
        (
          candidate
        ) =>
          candidate.url
      ),

    createdAt:
      new Date()
        .toISOString(),
  };

  const hasMobile768 =
    /@media[^{]*(?:max-width\s*:\s*768px|max-width\s*:\s*48em)/i.test(
      html
    );

  const hasMobile480 =
    /@media[^{]*(?:max-width\s*:\s*480px|max-width\s*:\s*30em)/i.test(
      html
    );

  const promptSnapshot =
    [
      "ENGINE=GPT-5.6-SOL-STATIC-V4-MOBILE",

      `MODEL=${model}`,

      `GENERATION=${generationIndex}`,

      `DIRECTION=${direction}`,

      `MAXIBESTOF=${designResearch ? "cached" : "none"}`,

      `DISCOVERED_REAL_IMAGES=${candidates.length}`,

      `VALID_VISION_IMAGES=${visionImages.length}`,

      `VISION_FALLBACK=${firstGeneration.visionFallbackUsed ? "yes" : "no"}`,

      `REPAIR_VISION_FALLBACK=${repairVisionFallbackUsed ? "yes" : "no"}`,

      `USED_REAL_IMAGES=${imageQa.usedRealImages}`,

      `IMAGE_QA_WARNINGS=${imageQa.warnings.length}`,

      `AUTO_REPAIRED=${repaired ? "yes" : "no"}`,

      `MOBILE_768=${hasMobile768 ? "yes" : "safety-only"}`,

      `MOBILE_480=${hasMobile480 ? "yes" : "missing-model-query"}`,

      `HTML_CHARS=${quality.htmlCharacters}`,

      `VISIBLE_TEXT_CHARS=${quality.visibleTextCharacters}`,

      `SECTIONS=${quality.sectionCount}`,

      `HEADINGS=${quality.headingCount}`,

      `PARAGRAPHS=${quality.paragraphCount}`,

      `IMAGES=${quality.imageCount}`,
    ].join(
      "\n"
    );

  return {
    previewUrl:
      `/design-canvas/${variantId}`,

    promptSnapshot,

    snapshot,

    model,

    usage,
  };
}