import "server-only";

import {
  lookup,
} from "node:dns/promises";

import {
  isIP,
} from "node:net";

import {
  load,
} from "cheerio";

/* =========================================================
   CONFIG
========================================================= */

const REQUEST_TIMEOUT =
  12_000;

const MAX_HTML_BYTES =
  2_000_000;

const MAX_REDIRECTS =
  5;

const MAX_ASSETS =
  32;

const MAX_NAV_ITEMS =
  7;

const MAX_HEADINGS =
  18;

const MAX_PARAGRAPHS =
  16;

const MAX_CTAS =
  10;

const MAX_COLORS =
  8;

const MAX_BRAND_COLOR_CANDIDATES =
  5;

const MAX_HOMEPAGE_SECTIONS =
  12;

/* =========================================================
   TYPES
========================================================= */

export type RedesignSourceAssetRole =
  | "logo"
  | "hero"
  | "team"
  | "project"
  | "content";

export type RedesignSourceAsset = {
  id:
    string;

  url:
    string;

  alt:
    string;

  kind:
    | "logo"
    | "image";

  sectionIndex:
    number
    | null;

  role:
    RedesignSourceAssetRole;

  context:
    string;
};

export type HomepageSectionPurpose =
  | "hero"
  | "services"
  | "about"
  | "team"
  | "showcase"
  | "proof"
  | "process"
  | "contact"
  | "cta"
  | "other";

export type RedesignHomepageSection = {
  index:
    number;

  purpose:
    HomepageSectionPurpose;

  heading:
    string;

  text:
    string[];

  links:
    string[];

  imageCount:
    number;

  idHint:
    string;

  hasH1:
    boolean;
};

export type RedesignSource = {
  websiteUrl:
    string;

  finalUrl:
    string;

  hostname:
    string;

  brandName:
    string;

  pageTitle:
    string;

  metaDescription:
    string;

  logoAssetId:
    string;

  assets:
    RedesignSourceAsset[];

  navigation:
    string[];

  headings:
    string[];

  paragraphs:
    string[];

  ctas:
    string[];

  colorHints:
    string[];

  brandColorAnchor:
    string;

  brandColorCandidates:
    string[];

  homepageHero:
    RedesignHomepageSection
    | null;

  homepageSections:
    RedesignHomepageSection[];
};

/* =========================================================
   TEXT
========================================================= */

function normalizeText(
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
  const clean =
    normalizeText(
      value
    );

  if (
    clean.length <=
    maxLength
  ) {
    return clean;
  }

  return `${clean.slice(
    0,
    maxLength -
      1
  )}…`;
}

function cleanHostname(
  hostname:
    string
) {
  return hostname
    .toLowerCase()
    .replace(
      /^www\./,
      ""
    );
}

function uniqueStrings(
  values:
    string[],
  limit:
    number
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
      normalizeText(
        value
      );

    if (
      !cleaned
    ) {
      continue;
    }

    const key =
      cleaned.toLowerCase();

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
      cleaned
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

/* =========================================================
   URL
========================================================= */

function normalizeUrl(
  websiteUrl:
    string
) {
  const value =
    websiteUrl.trim();

  const normalized =
    value.startsWith(
      "http://"
    ) ||
    value.startsWith(
      "https://"
    )
      ? value
      : `https://${value}`;

  const url =
    new URL(
      normalized
    );

  if (
    url.protocol !==
      "http:" &&
    url.protocol !==
      "https:"
  ) {
    throw new Error(
      "Unsupported website protocol."
    );
  }

  return url;
}

/* =========================================================
   PRIVATE NETWORK PROTECTION
========================================================= */

function isPrivateIpv4(
  address:
    string
) {
  const parts =
    address
      .split(".")
      .map(
        Number
      );

  if (
    parts.length !==
    4
  ) {
    return true;
  }

  const [
    a,
    b,
  ] =
    parts;

  if (
    a ===
      0 ||
    a ===
      10 ||
    a ===
      127
  ) {
    return true;
  }

  if (
    a ===
      169 &&
    b ===
      254
  ) {
    return true;
  }

  if (
    a ===
      172 &&
    b >=
      16 &&
    b <=
      31
  ) {
    return true;
  }

  if (
    a ===
      192 &&
    b ===
      168
  ) {
    return true;
  }

  if (
    a ===
      100 &&
    b >=
      64 &&
    b <=
      127
  ) {
    return true;
  }

  if (
    a ===
      198 &&
    (
      b ===
        18 ||
      b ===
        19
    )
  ) {
    return true;
  }

  if (
    a >=
    224
  ) {
    return true;
  }

  return false;
}

function isPrivateIpv6(
  address:
    string
) {
  const value =
    address.toLowerCase();

  if (
    value ===
      "::" ||
    value ===
      "::1"
  ) {
    return true;
  }

  if (
    value.startsWith(
      "fc"
    ) ||
    value.startsWith(
      "fd"
    )
  ) {
    return true;
  }

  if (
    value.startsWith(
      "fe8"
    ) ||
    value.startsWith(
      "fe9"
    ) ||
    value.startsWith(
      "fea"
    ) ||
    value.startsWith(
      "feb"
    )
  ) {
    return true;
  }

  if (
    value.startsWith(
      "ff"
    )
  ) {
    return true;
  }

  if (
    value.startsWith(
      "::ffff:"
    )
  ) {
    const ipv4 =
      value.replace(
        "::ffff:",
        ""
      );

    if (
      isIP(
        ipv4
      ) ===
      4
    ) {
      return isPrivateIpv4(
        ipv4
      );
    }
  }

  return false;
}

function isPrivateIp(
  address:
    string
) {
  const version =
    isIP(
      address
    );

  if (
    version ===
    4
  ) {
    return isPrivateIpv4(
      address
    );
  }

  if (
    version ===
    6
  ) {
    return isPrivateIpv6(
      address
    );
  }

  return true;
}

async function assertPublicUrl(
  url:
    URL
) {
  const hostname =
    url.hostname.toLowerCase();

  if (
    hostname ===
      "localhost" ||
    hostname.endsWith(
      ".localhost"
    )
  ) {
    throw new Error(
      "Local addresses are not allowed."
    );
  }

  const directIp =
    isIP(
      hostname
    );

  if (
    directIp &&
    isPrivateIp(
      hostname
    )
  ) {
    throw new Error(
      "Private IP addresses are not allowed."
    );
  }

  if (
    !directIp
  ) {
    const addresses =
      await lookup(
        hostname,
        {
          all:
            true,

          verbatim:
            true,
        }
      );

    if (
      addresses.length ===
      0
    ) {
      throw new Error(
        "Website hostname could not be resolved."
      );
    }

    if (
      addresses.some(
        (
          item
        ) =>
          isPrivateIp(
            item.address
          )
      )
    ) {
      throw new Error(
        "Website resolves to a private network."
      );
    }
  }
}

/* =========================================================
   FETCH
========================================================= */

async function readLimitedHtml(
  response:
    Response
) {
  if (
    !response.body
  ) {
    return "";
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let totalBytes =
    0;

  let html =
    "";

  while (
    true
  ) {
    const {
      value,
      done,
    } =
      await reader.read();

    if (
      done
    ) {
      break;
    }

    totalBytes +=
      value.byteLength;

    if (
      totalBytes >
      MAX_HTML_BYTES
    ) {
      await reader.cancel();

      throw new Error(
        "Website response is too large."
      );
    }

    html +=
      decoder.decode(
        value,
        {
          stream:
            true,
        }
      );
  }

  html +=
    decoder.decode();

  return html;
}

async function fetchHomepage(
  initialUrl:
    URL
) {
  let currentUrl =
    initialUrl;

  for (
    let redirectCount =
      0;
    redirectCount <=
    MAX_REDIRECTS;
    redirectCount +=
    1
  ) {
    await assertPublicUrl(
      currentUrl
    );

    const response =
      await fetch(
        currentUrl,
        {
          method:
            "GET",

          redirect:
            "manual",

          cache:
            "no-store",

          signal:
            AbortSignal.timeout(
              REQUEST_TIMEOUT
            ),

          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36",

            Accept:
              "text/html,application/xhtml+xml",

            "Accept-Language":
              "de-DE,de;q=0.9,en;q=0.8",
          },
        }
      );

    if (
      response.status >=
        300 &&
      response.status <
        400
    ) {
      const location =
        response.headers.get(
          "location"
        );

      if (
        !location
      ) {
        throw new Error(
          "Website returned an invalid redirect."
        );
      }

      currentUrl =
        new URL(
          location,
          currentUrl
        );

      continue;
    }

    if (
      !response.ok
    ) {
      throw new Error(
        `Website returned HTTP ${response.status}.`
      );
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) ??
      "";

    if (
      !contentType.includes(
        "text/html"
      ) &&
      !contentType.includes(
        "application/xhtml+xml"
      )
    ) {
      throw new Error(
        "Website did not return HTML."
      );
    }

    const html =
      await readLimitedHtml(
        response
      );

    if (
      !html.trim()
    ) {
      throw new Error(
        "Website returned an empty document."
      );
    }

    return {
      html,

      finalUrl:
        currentUrl,
    };
  }

  throw new Error(
    "Website redirected too many times."
  );
}

/* =========================================================
   ASSET URL
========================================================= */

function resolveAssetUrl(
  value:
    | string
    | undefined
    | null,
  pageUrl:
    URL
) {
  if (
    !value
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  if (
    !cleaned ||
    cleaned.startsWith(
      "data:"
    ) ||
    cleaned.startsWith(
      "blob:"
    ) ||
    cleaned.startsWith(
      "javascript:"
    )
  ) {
    return null;
  }

  try {
    const url =
      new URL(
        cleaned,
        pageUrl
      );

    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getSrcsetUrl(
  value:
    | string
    | undefined
    | null
) {
  if (
    !value
  ) {
    return null;
  }

  const candidates =
    value
      .split(",")
      .map(
        (
          part
        ) =>
          part.trim()
      )
      .filter(
        Boolean
      );

  if (
    candidates.length ===
      0
  ) {
    return null;
  }

  const last =
    candidates[
      candidates.length -
        1
    ];

  return last
    ?.split(
      /\s+/
    )[0] ??
    null;
}

function resolveFirstAssetUrl(
  values:
    Array<
      string
      | null
      | undefined
    >,
  pageUrl:
    URL
) {
  for (
    const value of
      values
  ) {
    const resolved =
      resolveAssetUrl(
        value,
        pageUrl
      );

    if (
      resolved
    ) {
      return resolved;
    }
  }

  return null;
}

/* =========================================================
   BRAND
========================================================= */

function getBrandName(
  $:
    ReturnType<
      typeof load
    >,
  finalUrl:
    URL
) {
  const siteName =
    normalizeText(
      $(
        'meta[property="og:site_name"]'
      )
        .first()
        .attr(
          "content"
        ) ??
        ""
    );

  if (
    siteName
  ) {
    return siteName;
  }

  const title =
    normalizeText(
      $("title")
        .first()
        .text()
    );

  if (
    title
  ) {
    const firstPart =
      title
        .split(
          /\s+[|–—-]\s+/
        )[0]
        ?.trim();

    if (
      firstPart &&
      firstPart.length >=
        2
    ) {
      return truncate(
        firstPart,
        100
      );
    }
  }

  return cleanHostname(
    finalUrl.hostname
  )
    .split(".")[0]
    ?.replace(
      /[-_]+/g,
      " "
    ) ??
    cleanHostname(
      finalUrl.hostname
    );
}

/* =========================================================
   COLOR
========================================================= */

type RgbColor = {
  r:
    number;

  g:
    number;

  b:
    number;
};

type HslColor = {
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
): RgbColor | null {
  const hex =
    value
      .replace(
        "#",
        ""
      )
      .trim();

  if (
    !/^[0-9a-f]{6}$/i.test(
      hex
    )
  ) {
    return null;
  }

  return {
    r:
      parseInt(
        hex.slice(
          0,
          2
        ),
        16
      ),

    g:
      parseInt(
        hex.slice(
          2,
          4
        ),
        16
      ),

    b:
      parseInt(
        hex.slice(
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
}: RgbColor): HslColor {
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

function extractColorHints(
  html:
    string,
  themeColor:
    string
) {
  const counts =
    new Map<
      string,
      number
    >();

  function addColor(
    value:
      string,
    weight =
      1
  ) {
    const normalized =
      value.toUpperCase();

    counts.set(
      normalized,
      (
        counts.get(
          normalized
        ) ??
        0
      ) +
        weight
    );
  }

  if (
    /^#[0-9a-f]{6}$/i.test(
      themeColor
    )
  ) {
    addColor(
      themeColor,
      30
    );
  }

  const brandVariables =
    html.matchAll(
      /--(?:brand|primary|accent|main|theme|color-primary)[\w-]*\s*:\s*(#[0-9a-fA-F]{6})\b/g
    );

  for (
    const match of
      brandVariables
  ) {
    if (
      match[1]
    ) {
      addColor(
        match[1],
        20
      );
    }
  }

  const matches =
    html.match(
      /#[0-9a-fA-F]{6}\b/g
    ) ??
    [];

  for (
    const color of
      matches.slice(
        0,
        1600
      )
  ) {
    addColor(
      color
    );
  }

  const sorted =
    Array.from(
      counts.entries()
    )
      .map(
        (
          [
            color,
            count,
          ]
        ) => {
          const rgb =
            hexToRgb(
              color
            );

          const hsl =
            rgb
              ? rgbToHsl(
                  rgb
                )
              : {
                  h:
                    0,

                  s:
                    0,

                  l:
                    0,
                };

          const usefulColor =
            hsl.s >=
              0.18 &&
            hsl.l >=
              0.1 &&
            hsl.l <=
              0.9;

          return {
            color,

            count,

            hsl,

            score:
              usefulColor
                ? count *
                  (
                    1 +
                    hsl.s *
                      1.4
                  )
                : count *
                  0.12,
          };
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          second.score -
          first.score
      );

  const chromatic =
    sorted.filter(
      (
        item
      ) =>
        item.hsl.s >=
          0.2 &&
        item.hsl.l >=
          0.11 &&
        item.hsl.l <=
          0.88
    );

  const brandColorCandidates =
    uniqueStrings(
      chromatic.map(
        (
          item
        ) =>
          item.color
      ),
      MAX_BRAND_COLOR_CANDIDATES
    );

  return {
    colorHints:
      uniqueStrings(
        [
          ...brandColorCandidates,

          ...sorted.map(
            (
              item
            ) =>
              item.color
          ),
        ],
        MAX_COLORS
      ),

    brandColorAnchor:
      brandColorCandidates[0] ??
      "",

    brandColorCandidates,
  };
}

/* =========================================================
   SECTION PURPOSE
========================================================= */

function detectSectionPurpose({
  heading,
  text,
  idHint,
  hasH1,
  position,
}: {
  heading:
    string;

  text:
    string[];

  idHint:
    string;

  hasH1:
    boolean;

  position:
    number;
}): HomepageSectionPurpose {
  const haystack =
    [
      heading,
      ...text,
      idHint,
    ]
      .join(
        " "
      )
      .toLowerCase();

  if (
    hasH1 ||
    (
      position ===
        0 &&
      heading
    )
  ) {
    return "hero";
  }

  /*
   * Important:
   * team BEFORE generic about.
   */
  if (
    /\b(team|büroteam|unser team|unser büroteam|mitarbeiter|mitarbeiterinnen|mannschaft|crew|people|ansprechpartner|kollegen|kolleginnen)\b/i.test(
      haystack
    )
  ) {
    return "team";
  }

  if (
    /\b(leistung|leistungen|service|services|angebot|angebote|kompetenz|kompetenzen|lösungen|solutions)\b/i.test(
      haystack
    )
  ) {
    return "services";
  }

  if (
    /\b(projekt|projekte|referenz|referenzen|portfolio|galerie|gallery|bilder|fotos|photos|einblicke|work|arbeiten)\b/i.test(
      haystack
    )
  ) {
    return "showcase";
  }

  if (
    /\b(über uns|about|unternehmen|philosophie|geschichte|tradition|wer wir|betrieb|company|familiengeschichte)\b/i.test(
      haystack
    )
  ) {
    return "about";
  }

  if (
    /\b(ablauf|prozess|process|schritt|schritte|so arbeiten|workflow|vorgehen)\b/i.test(
      haystack
    )
  ) {
    return "process";
  }

  if (
    /\b(kundenstimmen|testimonial|testimonials|bewertungen|reviews|vertrauen|zertifikat|zertifikate|partner|auszeichnung|award|jahre erfahrung)\b/i.test(
      haystack
    )
  ) {
    return "proof";
  }

  if (
    /\b(kontakt|contact|anfrage|erreichbar|telefon|e-mail|email)\b/i.test(
      haystack
    )
  ) {
    return "contact";
  }

  if (
    /\b(jetzt anfragen|projekt besprechen|termin vereinbaren|get started|contact us|request quote|angebot anfragen)\b/i.test(
      haystack
    )
  ) {
    return "cta";
  }

  return "other";
}

/* =========================================================
   HOMEPAGE STRUCTURE
========================================================= */

function extractHomepageStructure(
  $:
    ReturnType<
      typeof load
    >
) {
  const main =
    $("main").first();

  let candidates =
    main.length >
      0
      ? main
          .find(
            "section"
          )
          .filter(
            (
              _,
              element
            ) =>
              $(
                element
              )
                .parents(
                  "section"
                )
                .length ===
              0
          )
          .toArray()
      : [];

  /*
   * Many Framer/Webflow/WordPress pages use DIVs rather
   * than semantic section elements.
   */
  if (
    candidates.length ===
      0 &&
    main.length >
      0
  ) {
    candidates =
      main
        .children(
          "section, article, div"
        )
        .toArray();
  }

  if (
    candidates.length ===
    0
  ) {
    candidates =
      $(
        "body > section, body > main > section, body > main > div"
      )
        .toArray();
  }

  const sections:
    RedesignHomepageSection[] =
    [];

  for (
    let candidateIndex =
      0;
    candidateIndex <
    candidates.length;
    candidateIndex +=
      1
  ) {
    const element =
      candidates[
        candidateIndex
      ];

    const node =
      $(
        element
      );

    const idHint =
      truncate(
        [
          node.attr(
            "id"
          ) ??
            "",

          node.attr(
            "class"
          ) ??
            "",
        ].join(
          " "
        ),
        180
      );

    if (
      /\b(cookie|consent|gdpr|modal|popup|newsletter-popup|lightbox)\b/i.test(
        idHint
      )
    ) {
      continue;
    }

    const heading =
      truncate(
        node
          .find(
            "h1, h2, h3"
          )
          .first()
          .text(),
        180
      );

    const paragraphTexts =
      node
        .find(
          "p"
        )
        .toArray()
        .map(
          (
            paragraph
          ) =>
            truncate(
              $(
                paragraph
              ).text(),
              320
            )
        );

    const listTexts =
      node
        .find(
          "li"
        )
        .toArray()
        .map(
          (
            item
          ) =>
            truncate(
              $(
                item
              ).text(),
              180
            )
        );

    let text =
      uniqueStrings(
        [
          ...paragraphTexts,
          ...listTexts,
        ],
        6
      );

    if (
      text.length ===
        0
    ) {
      const fallbackText =
        truncate(
          node.text(),
          500
        );

      if (
        fallbackText &&
        fallbackText !==
          heading
      ) {
        text = [
          fallbackText,
        ];
      }
    }

    const links =
      uniqueStrings(
        node
          .find(
            "a, button"
          )
          .toArray()
          .map(
            (
              link
            ) =>
              truncate(
                $(
                  link
                ).text(),
                70
              )
          ),
        6
      );

    const imageCount =
      node
        .find(
          "img, picture, video"
        )
        .length;

    const hasH1 =
      node
        .find(
          "h1"
        )
        .length >
      0;

    const meaningfulLength =
      heading.length +
      text.join(
        ""
      ).length;

    if (
      meaningfulLength <
        10 &&
      imageCount ===
        0
    ) {
      continue;
    }

    const sectionIndex =
      candidateIndex +
      1;

    /*
     * CRITICAL:
     *
     * We mark the ORIGINAL DOM node so every image below
     * can later be mapped back to this exact homepage
     * section.
     */
    node.attr(
      "data-leadbase-section-index",
      String(
        sectionIndex
      )
    );

    const purpose =
      detectSectionPurpose({
        heading,

        text,

        idHint,

        hasH1,

        position:
          sections.length,
      });

    sections.push({
      index:
        sectionIndex,

      purpose,

      heading,

      text,

      links,

      imageCount,

      idHint,

      hasH1,
    });

    if (
      sections.length >=
      MAX_HOMEPAGE_SECTIONS
    ) {
      break;
    }
  }

  let heroIndex =
    sections.findIndex(
      (
        section
      ) =>
        section.purpose ===
        "hero"
    );

  if (
    heroIndex <
      0
  ) {
    heroIndex =
      sections.findIndex(
        (
          section
        ) =>
          section.hasH1
      );
  }

  const homepageHero =
    heroIndex >=
    0
      ? sections[
          heroIndex
        ]
      : null;

  const homepageSections =
    sections.filter(
      (
        _,
        index
      ) =>
        index !==
        heroIndex
    );

  return {
    homepageHero,

    homepageSections,
  };
}

/* =========================================================
   IMAGE → SECTION
========================================================= */

function findMatchingSourceSection({
  node,
  homepageHero,
  homepageSections,
}: {
  node:
    ReturnType<
      ReturnType<
        typeof load
      >
    >;

  homepageHero:
    RedesignHomepageSection
    | null;

  homepageSections:
    RedesignHomepageSection[];
}) {
  const allSections =
    [
      ...(
        homepageHero
          ? [
              homepageHero,
            ]
          : []
      ),

      ...homepageSections,
    ];

  /*
   * This is now the primary and exact mapping.
   */
  const markedParent =
    node
      .closest(
        "[data-leadbase-section-index]"
      )
      .first();

  const markedIndex =
    Number(
      markedParent.attr(
        "data-leadbase-section-index"
      )
    );

  if (
    Number.isInteger(
      markedIndex
    ) &&
    markedIndex >
      0
  ) {
    const exact =
      allSections.find(
        (
          section
        ) =>
          section.index ===
          markedIndex
      );

    if (
      exact
    ) {
      return exact;
    }
  }

  /*
   * Fallback for unusual DOM structures.
   */
  const ancestor =
    node
      .closest(
        "section, article"
      )
      .first();

  if (
    ancestor.length ===
    0
  ) {
    return null;
  }

  const heading =
    truncate(
      ancestor
        .find(
          "h1, h2, h3"
        )
        .first()
        .text(),
      180
    );

  if (
    !heading
  ) {
    return null;
  }

  return (
    allSections.find(
      (
        section
      ) =>
        normalizeText(
          section.heading
        ).toLowerCase() ===
        normalizeText(
          heading
        ).toLowerCase()
    ) ??
    null
  );
}

/* =========================================================
   IMAGE ROLE
========================================================= */

function inferAssetRole({
  isLogo,
  sourceSection,
  context,
}: {
  isLogo:
    boolean;

  sourceSection:
    RedesignHomepageSection
    | null;

  context:
    string;
}): RedesignSourceAssetRole {
  if (
    isLogo
  ) {
    return "logo";
  }

  if (
    sourceSection
      ?.purpose ===
    "hero"
  ) {
    return "hero";
  }

  if (
    sourceSection
      ?.purpose ===
    "team"
  ) {
    return "team";
  }

  if (
    sourceSection
      ?.purpose ===
    "showcase"
  ) {
    return "project";
  }

  const normalized =
    context.toLowerCase();

  if (
    /\b(team|mitarbeiter|mitarbeiterin|büroteam|crew|mannschaft|ansprechpartner)\b/i.test(
      normalized
    )
  ) {
    return "team";
  }

  if (
    /\b(referenz|projekt|portfolio|bauvorhaben|baustelle|sanierung|project)\b/i.test(
      normalized
    )
  ) {
    return "project";
  }

  return "content";
}

/* =========================================================
   EXTRACT
========================================================= */

export async function extractRedesignSource(
  websiteUrl:
    string
): Promise<RedesignSource> {
  const initialUrl =
    normalizeUrl(
      websiteUrl
    );

  const {
    html,
    finalUrl,
  } =
    await fetchHomepage(
      initialUrl
    );

  const $ =
    load(
      html
    );

  /*
   * IMPORTANT:
   * structure first so the DOM receives our internal
   * section markers before image extraction starts.
   */
  const {
    homepageHero,
    homepageSections,
  } =
    extractHomepageStructure(
      $
    );

  $(
    "script, noscript"
  ).remove();

  const pageTitle =
    truncate(
      $("title")
        .first()
        .text(),
      180
    );

  const metaDescription =
    truncate(
      $(
        'meta[name="description"]'
      )
        .first()
        .attr(
          "content"
        ) ??
        "",
      400
    );

  const brandName =
    getBrandName(
      $,
      finalUrl
    );

  const navigation =
    uniqueStrings(
      $(
        "nav a, header a"
      )
        .toArray()
        .map(
          (
            element
          ) =>
            truncate(
              $(
                element
              ).text(),
              50
            )
        )
        .filter(
          (
            value
          ) =>
            value.length >=
            2
        ),
      MAX_NAV_ITEMS
    );

  const headings =
    uniqueStrings(
      $(
        "h1, h2, h3"
      )
        .toArray()
        .map(
          (
            element
          ) =>
            truncate(
              $(
                element
              ).text(),
              180
            )
        )
        .filter(
          (
            value
          ) =>
            value.length >=
            3
        ),
      MAX_HEADINGS
    );

  const paragraphs =
    uniqueStrings(
      $(
        "main p, section p, article p, body p"
      )
        .toArray()
        .map(
          (
            element
          ) =>
            truncate(
              $(
                element
              ).text(),
              420
            )
        )
        .filter(
          (
            value
          ) =>
            value.length >=
            30
        ),
      MAX_PARAGRAPHS
    );

  const ctaElements =
    $(
      [
        "button",
        'a[class*="button"]',
        'a[class*="btn"]',
        'a[class*="cta"]',
        '[role="button"]',
      ].join(
        ","
      )
    ).toArray();

  const ctas =
    uniqueStrings(
      ctaElements
        .map(
          (
            element
          ) =>
            truncate(
              $(
                element
              ).text(),
              60
            )
        )
        .filter(
          (
            value
          ) =>
            value.length >=
            2
        ),
      MAX_CTAS
    );

  /* =======================================================
     IMAGE CANDIDATES
  ======================================================= */

  type AssetCandidate = {
    url:
      string;

    alt:
      string;

    logoScore:
      number;

    contentScore:
      number;

    sectionIndex:
      number
      | null;

    role:
      RedesignSourceAssetRole;

    context:
      string;
  };

  const assetCandidates =
    new Map<
      string,
      AssetCandidate
    >();

  $(
    "img"
  ).each(
    (
      _,
      element
    ) => {
      const node =
        $(
          element
        );

      /*
       * Critical improvement:
       *
       * We no longer select src first and then give up if
       * src is a data placeholder.
       *
       * Every possible lazy/srcset source is tested.
       */
      const picture =
        node
          .closest(
            "picture"
          )
          .first();

      const pictureSource =
        picture
          .find(
            "source"
          )
          .last();

      const url =
        resolveFirstAssetUrl(
          [
            node.attr(
              "src"
            ),

            node.attr(
              "data-src"
            ),

            node.attr(
              "data-lazy-src"
            ),

            node.attr(
              "data-original"
            ),

            node.attr(
              "data-lazy"
            ),

            getSrcsetUrl(
              node.attr(
                "srcset"
              )
            ),

            getSrcsetUrl(
              node.attr(
                "data-srcset"
              )
            ),

            getSrcsetUrl(
              pictureSource.attr(
                "srcset"
              )
            ),

            getSrcsetUrl(
              pictureSource.attr(
                "data-srcset"
              )
            ),
          ],
          finalUrl
        );

      if (
        !url
      ) {
        return;
      }

      const alt =
        truncate(
          node.attr(
            "alt"
          ) ??
            "",
          120
        );

      const identityText =
        [
          url,
          alt,
          node.attr(
            "class"
          ) ??
            "",
          node.attr(
            "id"
          ) ??
            "",
        ]
          .join(
            " "
          )
          .toLowerCase();

      let logoScore =
        0;

      if (
        identityText.includes(
          "logo"
        )
      ) {
        logoScore +=
          100;
      }

      if (
        node.closest(
          "header"
        ).length >
        0
      ) {
        logoScore +=
          35;
      }

      if (
        node.closest(
          "nav"
        ).length >
        0
      ) {
        logoScore +=
          25;
      }

      const sourceSection =
        findMatchingSourceSection({
          node,

          homepageHero,

          homepageSections,
        });

      const context =
        truncate(
          [
            alt,

            sourceSection
              ?.heading ??
              "",

            ...(
              sourceSection
                ?.text.slice(
                  0,
                  2
                ) ??
              []
            ),
          ].join(
            " "
          ),
          320
        );

      const role =
        inferAssetRole({
          isLogo:
            logoScore >
            0,

          sourceSection,

          context,
        });

      let contentScore =
        10;

      if (
        role ===
        "hero"
      ) {
        contentScore +=
          45;
      }

      if (
        role ===
        "team"
      ) {
        /*
         * Actual team images are extremely valuable.
         */
        contentScore +=
          90;
      }

      if (
        role ===
        "project"
      ) {
        contentScore +=
          70;
      }

      if (
        alt
      ) {
        contentScore +=
          8;
      }

      const width =
        Number(
          node.attr(
            "width"
          )
        );

      const height =
        Number(
          node.attr(
            "height"
          )
        );

      if (
        Number.isFinite(
          width
        ) &&
        Number.isFinite(
          height
        ) &&
        width >=
          500 &&
        height >=
          250
      ) {
        contentScore +=
          20;
      }

      if (
        /\b(icon|favicon|facebook|instagram|linkedin|youtube|social)\b/i.test(
          identityText
        )
      ) {
        contentScore -=
          70;
      }

      const existing =
        assetCandidates.get(
          url
        );

      if (
        !existing ||
        logoScore +
          contentScore >
          existing.logoScore +
            existing.contentScore
      ) {
        assetCandidates.set(
          url,
          {
            url,

            alt,

            logoScore,

            contentScore,

            sectionIndex:
              sourceSection
                ?.index ??
              null,

            role,

            context,
          }
        );
      }
    }
  );

  /* =======================================================
     INLINE / LAZY BACKGROUND IMAGES
  ======================================================= */

  $(
    "[style], [data-bg], [data-background], [data-background-image], [data-lazy-bg]"
  ).each(
    (
      _,
      element
    ) => {
      const node =
        $(
          element
        );

      const style =
        node.attr(
          "style"
        ) ??
        "";

      const rawValues:
        string[] = [];

      const matches =
        style.matchAll(
          /url\((['"]?)(.*?)\1\)/gi
        );

      for (
        const match of
          matches
      ) {
        if (
          match[2]
        ) {
          rawValues.push(
            match[2]
          );
        }
      }

      for (
        const attr of
          [
            "data-bg",
            "data-background",
            "data-background-image",
            "data-lazy-bg",
          ]
      ) {
        const value =
          node.attr(
            attr
          );

        if (
          value
        ) {
          rawValues.push(
            value
          );
        }
      }

      for (
        const rawValue of
          rawValues
      ) {
        const url =
          resolveAssetUrl(
            rawValue,
            finalUrl
          );

        if (
          !url ||
          assetCandidates.has(
            url
          )
        ) {
          continue;
        }

        const sourceSection =
          findMatchingSourceSection({
            node,

            homepageHero,

            homepageSections,
          });

        const context =
          truncate(
            [
              sourceSection
                ?.heading ??
                "",

              ...(
                sourceSection
                  ?.text.slice(
                    0,
                    2
                  ) ??
                []
              ),
            ].join(
              " "
            ),
            320
          );

        const role =
          inferAssetRole({
            isLogo:
              false,

            sourceSection,

            context,
          });

        assetCandidates.set(
          url,
          {
            url,

            alt:
              sourceSection
                ?.heading ??
              "",

            logoScore:
              0,

            contentScore:
              role ===
              "team"
                ? 90
                : role ===
                    "project"
                  ? 70
                  : role ===
                      "hero"
                    ? 45
                    : 10,

            sectionIndex:
              sourceSection
                ?.index ??
              null,

            role,

            context,
          }
        );
      }
    }
  );

  /* =======================================================
     OG IMAGE
  ======================================================= */

  const ogImage =
    resolveAssetUrl(
      $(
        'meta[property="og:image"]'
      )
        .first()
        .attr(
          "content"
        ),
      finalUrl
    );

  if (
    ogImage &&
    !assetCandidates.has(
      ogImage
    )
  ) {
    assetCandidates.set(
      ogImage,
      {
        url:
          ogImage,

        alt:
          brandName,

        logoScore:
          0,

        contentScore:
          25,

        sectionIndex:
          homepageHero
            ?.index ??
          null,

        role:
          "hero",

        context:
          homepageHero
            ?.heading ??
          brandName,
      }
    );
  }

  /* =======================================================
     SORT ASSETS
  ======================================================= */

  const sortedAssets =
    Array.from(
      assetCandidates.values()
    ).sort(
      (
        first,
        second
      ) => {
        const logoDifference =
          second.logoScore -
          first.logoScore;

        if (
          logoDifference !==
          0
        ) {
          return logoDifference;
        }

        return (
          second.contentScore -
          first.contentScore
        );
      }
    );

  const likelyLogo =
    sortedAssets.find(
      (
        asset
      ) =>
        asset.logoScore >
        0
    ) ??
    null;

  const assets:
    RedesignSourceAsset[] =
    [];

  if (
    likelyLogo
  ) {
    assets.push({
      id:
        "logo",

      url:
        likelyLogo.url,

      alt:
        likelyLogo.alt ||
        brandName,

      kind:
        "logo",

      sectionIndex:
        null,

      role:
        "logo",

      context:
        brandName,
    });
  }

  let imageIndex =
    1;

  for (
    const asset of
      sortedAssets
  ) {
    if (
      assets.length >=
      MAX_ASSETS
    ) {
      break;
    }

    if (
      likelyLogo &&
      asset.url ===
        likelyLogo.url
    ) {
      continue;
    }

    assets.push({
      id:
        `source-image-${imageIndex}`,

      url:
        asset.url,

      alt:
        asset.alt,

      kind:
        "image",

      sectionIndex:
        asset.sectionIndex,

      role:
        asset.role,

      context:
        asset.context,
    });

    imageIndex +=
      1;
  }

  /* =======================================================
     COLORS
  ======================================================= */

  const themeColor =
    normalizeText(
      $(
        'meta[name="theme-color"]'
      )
        .first()
        .attr(
          "content"
        ) ??
        ""
    );

  const {
    colorHints,
    brandColorAnchor,
    brandColorCandidates,
  } =
    extractColorHints(
      html,
      themeColor
    );

  return {
    websiteUrl:
      initialUrl.toString(),

    finalUrl:
      finalUrl.toString(),

    hostname:
      cleanHostname(
        finalUrl.hostname
      ),

    brandName,

    pageTitle,

    metaDescription,

    logoAssetId:
      likelyLogo
        ? "logo"
        : "",

    assets,

    navigation,

    headings,

    paragraphs,

    ctas,

    colorHints,

    brandColorAnchor,

    brandColorCandidates,

    homepageHero,

    homepageSections,
  };
}