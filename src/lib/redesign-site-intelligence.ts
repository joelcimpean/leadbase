import "server-only";

import {
  chromium,
  type Page,
} from "playwright";

/* =========================================================
   CONFIG
========================================================= */

const MAX_PAGES =
  8;

const MAX_IMAGES =
  45;

const MAX_PAGE_PARAGRAPHS =
  8;

const MAX_PAGE_HEADINGS =
  12;

const MAX_BRAND_COLORS =
  8;

const MAX_FACTS =
  12;

const MAX_SERVICES =
  20;

const NAVIGATION_TIMEOUT =
  10_000;

const CACHE_TTL =
  30 * 60 * 1000;

/* =========================================================
   TYPES
========================================================= */

export type SiteIntelligenceImage = {
  url: string;

  alt: string;

  pageUrl: string;

  pageTitle: string;

  context: string;

  width: number;

  height: number;

  inHeader: boolean;

  logoScore: number;

  teamScore: number;

  projectScore: number;
};

export type SiteIntelligencePage = {
  url: string;

  title: string;

  h1: string;

  headings: string[];

  paragraphs: string[];
};

export type SiteBrandColor = {
  hex: string;

  score: number;

  contexts: string[];
};

export type SiteIntelligenceFact = {
  value: string;

  label: string;

  context: string;

  pageUrl: string;

  score: number;
};

export type SiteIntelligenceService = {
  name: string;

  description: string;

  pageUrl: string;

  score: number;
};

export type RedesignSiteIntelligence = {
  pages: SiteIntelligencePage[];

  primaryLogo:
    | SiteIntelligenceImage
    | null;

  logoCandidates:
    SiteIntelligenceImage[];

  teamImages:
    SiteIntelligenceImage[];

  projectImages:
    SiteIntelligenceImage[];

  contentImages:
    SiteIntelligenceImage[];

  primaryBrandColor:
    | string
    | null;

  brandColors:
    SiteBrandColor[];

  facts:
    SiteIntelligenceFact[];

  services:
    SiteIntelligenceService[];
};

/* =========================================================
   RAW TYPES
========================================================= */

type RawPageLink = {
  href: string;

  text: string;

  inNavigation: boolean;
};

type RawPageImage = {
  url: string;

  alt: string;

  context: string;

  width: number;

  height: number;

  inHeader: boolean;
};

type RawColorSample = {
  value: string;

  property:
    | "background"
    | "text"
    | "border"
    | "theme";

  context: string;
};

type RawFactCandidate = {
  value: string;

  context: string;
};

type RawServiceCandidate = {
  name: string;

  description: string;

  context: string;
};

type RawPageData = {
  url: string;

  title: string;

  h1: string;

  headings: string[];

  paragraphs: string[];

  images: RawPageImage[];

  colors: RawColorSample[];

  facts: RawFactCandidate[];

  services: RawServiceCandidate[];
};

/* =========================================================
   CACHE
========================================================= */

const intelligenceCache =
  new Map<
    string,
    {
      expiresAt: number;

      data: RedesignSiteIntelligence;
    }
  >();

/* =========================================================
   TEXT
========================================================= */

function cleanText(
  value: string
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

function normalizeKey(
  value: string
) {
  return cleanText(
    value
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9äöüß]+/gi,
      " "
    )
    .trim();
}

/* =========================================================
   URL
========================================================= */

function normalizedHostname(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /^www\./,
      ""
    );
}

function isSameWebsite(
  first: URL,
  second: URL
) {
  return (
    normalizedHostname(
      first.hostname
    ) ===
    normalizedHostname(
      second.hostname
    )
  );
}

function normalizeInternalUrl({
  href,
  baseUrl,
  rootUrl,
}: {
  href: string;

  baseUrl: URL;

  rootUrl: URL;
}) {
  try {
    const url =
      new URL(
        href,
        baseUrl
      );

    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      return null;
    }

    if (
      !isSameWebsite(
        url,
        rootUrl
      )
    ) {
      return null;
    }

    url.hash =
      "";

    const pathname =
      url.pathname.toLowerCase();

    if (
      /\.(?:pdf|zip|jpg|jpeg|png|webp|gif|svg|mp4|webm|doc|docx)$/i.test(
        pathname
      )
    ) {
      return null;
    }

    if (
      /(?:impressum|datenschutz|privacy|cookie|agb|terms|legal|widerruf)/i.test(
        pathname
      )
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

/* =========================================================
   PAGE PRIORITY
========================================================= */

function getPagePriority(
  link: RawPageLink,
  url: URL
) {
  const haystack =
    `${link.text} ${url.pathname}`
      .toLowerCase();

  let score =
    link.inNavigation
      ? 40
      : 0;

  if (
    /\b(team|mitarbeiter|menschen|people|staff|büroteam|bueroteam)\b/i.test(
      haystack
    )
  ) {
    score +=
      150;
  }

  if (
    /\b(über|ueber|about|unternehmen|firma|betrieb|geschichte|wir)\b/i.test(
      haystack
    )
  ) {
    score +=
      120;
  }

  if (
    /\b(leistung|leistungen|service|services|kompetenz|kompetenzen)\b/i.test(
      haystack
    )
  ) {
    score +=
      115;
  }

  if (
    /\b(referenz|referenzen|projekt|projekte|portfolio|arbeiten|gallery|galerie)\b/i.test(
      haystack
    )
  ) {
    score +=
      110;
  }

  if (
    /\b(kontakt|contact)\b/i.test(
      haystack
    )
  ) {
    score +=
      25;
  }

  const depth =
    url.pathname
      .split("/")
      .filter(
        Boolean
      ).length;

  score -=
    Math.max(
      0,
      depth -
        2
    ) *
    8;

  return score;
}

/* =========================================================
   COLOR
========================================================= */

function rgbToHex(
  value: string
) {
  const match =
    value.match(
      /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i
    );

  if (
    !match
  ) {
    return null;
  }

  const red =
    Math.max(
      0,
      Math.min(
        255,
        Math.round(
          Number(
            match[1]
          )
        )
      )
    );

  const green =
    Math.max(
      0,
      Math.min(
        255,
        Math.round(
          Number(
            match[2]
          )
        )
      )
    );

  const blue =
    Math.max(
      0,
      Math.min(
        255,
        Math.round(
          Number(
            match[3]
          )
        )
      )
    );

  const alpha =
    typeof match[4] ===
      "string"
      ? Number(
          match[4]
        )
      : 1;

  if (
    Number.isFinite(
      alpha
    ) &&
    alpha <=
      0.05
  ) {
    return null;
  }

  return `#${[
    red,
    green,
    blue,
  ]
    .map(
      (
        channel
      ) =>
        channel
          .toString(
            16
          )
          .padStart(
            2,
            "0"
          )
    )
    .join("")
    .toUpperCase()}`;
}

function parseHex(
  hex: string
) {
  if (
    !/^#[0-9A-F]{6}$/i.test(
      hex
    )
  ) {
    return null;
  }

  return {
    r:
      parseInt(
        hex.slice(
          1,
          3
        ),
        16
      ),

    g:
      parseInt(
        hex.slice(
          3,
          5
        ),
        16
      ),

    b:
      parseInt(
        hex.slice(
          5,
          7
        ),
        16
      ),
  };
}

function isUsefulBrandColor(
  hex: string
) {
  const rgb =
    parseHex(
      hex
    );

  if (
    !rgb
  ) {
    return false;
  }

  const channels =
    [
      rgb.r,
      rgb.g,
      rgb.b,
    ];

  const max =
    Math.max(
      ...channels
    );

  const min =
    Math.min(
      ...channels
    );

  if (
    max -
      min <
    22
  ) {
    return false;
  }

  if (
    min >
    242
  ) {
    return false;
  }

  return true;
}

function getColorSampleScore(
  sample: RawColorSample
) {
  const context =
    sample.context.toLowerCase();

  let score =
    1;

  if (
    sample.property ===
    "theme"
  ) {
    score +=
      35;
  }

  if (
    sample.property ===
    "background"
  ) {
    score +=
      3;
  }

  if (
    /\b(button|btn|cta|primary|accent)\b/i.test(
      context
    )
  ) {
    score +=
      15;
  }

  if (
    /\b(header|navigation|navbar|nav)\b/i.test(
      context
    )
  ) {
    score +=
      7;
  }

  if (
    /\b(brand|logo)\b/i.test(
      context
    )
  ) {
    score +=
      12;
  }

  return score;
}

/* =========================================================
   IMAGE INTELLIGENCE
========================================================= */

function createImageIntelligence({
  image,
  page,
}: {
  image: RawPageImage;

  page: RawPageData;
}): SiteIntelligenceImage {
  const ratio =
    image.height >
    0
      ? image.width /
        image.height
      : 0;

  const haystack =
    [
      image.url,
      image.alt,
      image.context,
      page.url,
      page.title,
      page.h1,
      ...page.headings,
    ]
      .join(
        " "
      )
      .toLowerCase();

  let logoScore =
    0;

  let teamScore =
    0;

  let projectScore =
    0;

  if (
    /\b(logo|brandmark|wordmark)\b/i.test(
      haystack
    )
  ) {
    logoScore +=
      140;
  }

  if (
    image.inHeader
  ) {
    logoScore +=
      100;
  }

  if (
    image.width >
      80 &&
    image.height >
      20 &&
    ratio >=
      1.3
  ) {
    logoScore +=
      10;
  }

  if (
    image.width >
      900 &&
    image.height >
      500
  ) {
    logoScore -=
      90;
  }

  if (
    /\b(team|mitarbeiter|mitarbeitende|büroteam|bueroteam|belegschaft|staff|employee|employees|our people|unser team|menschen)\b/i.test(
      haystack
    )
  ) {
    teamScore +=
      150;
  }

  if (
    /\b(über uns|ueber uns|about us|unternehmen|familienbetrieb|familiengeführt|familiengefuehrt)\b/i.test(
      haystack
    )
  ) {
    teamScore +=
      45;
  }

  if (
    teamScore >
      0 &&
    image.width >=
      1000 &&
    ratio >=
      1.5
  ) {
    teamScore +=
      90;
  }

  if (
    teamScore >
      0 &&
    ratio >=
      0.55 &&
    ratio <=
      1.25 &&
    image.height >=
      450
  ) {
    teamScore +=
      35;
  }

  if (
    /\b(referenz|referenzen|projekt|projekte|portfolio|arbeiten|project|projects|work|bauvorhaben)\b/i.test(
      haystack
    )
  ) {
    projectScore +=
      110;
  }

  if (
    image.width >=
      700 &&
    image.height >=
      350
  ) {
    projectScore +=
      20;
  }

  return {
    url:
      image.url,

    alt:
      image.alt,

    pageUrl:
      page.url,

    pageTitle:
      page.title,

    context:
      image.context,

    width:
      image.width,

    height:
      image.height,

    inHeader:
      image.inHeader,

    logoScore,

    teamScore,

    projectScore,
  };
}

/* =========================================================
   FACT INTELLIGENCE
========================================================= */

function createFactIntelligence({
  candidate,
  page,
}: {
  candidate:
    RawFactCandidate;

  page:
    RawPageData;
}): SiteIntelligenceFact | null {
  const value =
    cleanText(
      candidate.value
    );

  const context =
    truncate(
      candidate.context,
      260
    );

  if (
    !value ||
    !context
  ) {
    return null;
  }

  const normalized =
    context.toLowerCase();

  const digits =
    Number(
      value
        .replace(
          /[.\s,+]/g,
          ""
        )
    );

  let score =
    0;

  if (
    /\b(mitarbeiter|mitarbeitende|mitarbeiterinnen|beschäftigte|team)\b/i.test(
      normalized
    )
  ) {
    score +=
      90;
  }

  if (
    /\b(auszubildende|azubi|azubis|ausbildung)\b/i.test(
      normalized
    )
  ) {
    score +=
      90;
  }

  if (
    /\b(bauvorhaben|projekte|projekten|aufträge|auftraege)\b/i.test(
      normalized
    )
  ) {
    score +=
      80;
  }

  if (
    /\b(auftraggeber|kunden|kundinnen)\b/i.test(
      normalized
    )
  ) {
    score +=
      80;
  }

  if (
    /\b(jahre|jahr|seit|generation|erfahrung|tradition)\b/i.test(
      normalized
    )
  ) {
    score +=
      55;
  }

  if (
    /\b(standorte|niederlassungen|fahrzeuge|meister|fachbereiche)\b/i.test(
      normalized
    )
  ) {
    score +=
      45;
  }

  if (
    page.url.match(
      /(?:unternehmen|ueber|über|about|team|firma)/i
    )
  ) {
    score +=
      18;
  }

  if (
    Number.isFinite(
      digits
    ) &&
    digits >=
      1900 &&
    digits <=
      2035
  ) {
    if (
      !/\b(seit|jahre|jahr|gegründet|gegruendet|geschichte|tradition)\b/i.test(
        normalized
      )
    ) {
      score -=
        80;
    }
  }

  if (
    /\b(telefon|tel\.?|fax|mobil)\b/i.test(
      normalized
    )
  ) {
    score -=
      100;
  }

  if (
    /\b(news|aktuelles|beitrag|artikel)\b/i.test(
      normalized
    )
  ) {
    score -=
      30;
  }

  if (
    score <
      35
  ) {
    return null;
  }

  let label =
    context
      .replace(
        value,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  label =
    truncate(
      label,
      150
    );

  return {
    value,

    label,

    context,

    pageUrl:
      page.url,

    score,
  };
}

/* =========================================================
   SERVICE INTELLIGENCE
========================================================= */

function createServiceIntelligence({
  candidate,
  page,
}: {
  candidate:
    RawServiceCandidate;

  page:
    RawPageData;
}): SiteIntelligenceService | null {
  const name =
    cleanText(
      candidate.name
    );

  if (
    !name ||
    name.length <
      2 ||
    name.length >
      90
  ) {
    return null;
  }

  const normalized =
    name.toLowerCase();

  if (
    /^(leistungen?|services?|mehr erfahren|mehr info|details?|weiter|home|kontakt|unternehmen|referenzen?)$/i.test(
      normalized
    )
  ) {
    return null;
  }

  if (
    /^(was können wir für sie tun|was wir tun|unser angebot|unsere leistungen)$/i.test(
      normalized
    )
  ) {
    return null;
  }

  const haystack =
    `${candidate.context} ${page.url} ${page.title} ${page.h1}`
      .toLowerCase();

  let score =
    10;

  if (
    /\b(leistung|leistungen|service|services|kompetenz|kompetenzen|was wir tun|was können wir)\b/i.test(
      haystack
    )
  ) {
    score +=
      75;
  }

  if (
    /(?:leistung|service|kompetenz)/i.test(
      page.url
    )
  ) {
    score +=
      45;
  }

  if (
    candidate.description
  ) {
    score +=
      10;
  }

  if (
    name.split(
      /\s+/
    ).length <=
      6
  ) {
    score +=
      8;
  }

  if (
    score <
      45
  ) {
    return null;
  }

  return {
    name,

    description:
      truncate(
        candidate.description,
        220
      ),

    pageUrl:
      page.url,

    score,
  };
}

/* =========================================================
   PAGE DATA
========================================================= */

async function collectPageData(
  page: Page,
  url: string
): Promise<RawPageData | null> {
  try {
    const response =
      await page.goto(
        url,
        {
          waitUntil:
            "domcontentloaded",

          timeout:
            NAVIGATION_TIMEOUT,
        }
      );

    if (
      !response ||
      !response.ok()
    ) {
      return null;
    }

    await page.evaluate(
      () => {
        window.scrollTo(
          0,
          document.body.scrollHeight
        );
      }
    );

    await page.waitForTimeout(
      250
    );

    return await page.evaluate(
      ({
        maxImages,
        maxParagraphs,
        maxHeadings,
      }) => {
        function clean(
          value:
            string
            | null
            | undefined
        ) {
          return (
            value ??
            ""
          )
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

        const title =
          clean(
            document.title
          );

        const h1 =
          clean(
            document
              .querySelector(
                "h1"
              )
              ?.textContent
          );

        const headings =
          Array.from(
            document.querySelectorAll(
              "h1, h2, h3"
            )
          )
            .map(
              (
                element
              ) =>
                clean(
                  element.textContent
                )
            )
            .filter(
              Boolean
            )
            .slice(
              0,
              maxHeadings
            );

        const paragraphs =
          Array.from(
            document.querySelectorAll(
              "main p, section p, article p"
            )
          )
            .map(
              (
                element
              ) =>
                clean(
                  element.textContent
                )
            )
            .filter(
              (
                value
              ) =>
                value.length >=
                35
            )
            .slice(
              0,
              maxParagraphs
            );

        /* ===============================================
           IMAGES
        =============================================== */

        const images =
          Array.from(
            document.images
          )
            .map(
              (
                image
              ) => {
                const fallbackUrl =
                  image.getAttribute(
                    "data-src"
                  ) ??
                  image.getAttribute(
                    "data-lazy-src"
                  ) ??
                  image.getAttribute(
                    "data-original"
                  ) ??
                  "";

                let imageUrl =
                  image.currentSrc ||
                  image.src ||
                  fallbackUrl;

                if (
                  fallbackUrl &&
                  !image.currentSrc &&
                  !image.src
                ) {
                  try {
                    imageUrl =
                      new URL(
                        fallbackUrl,
                        document.baseURI
                      ).toString();
                  } catch {
                    imageUrl =
                      fallbackUrl;
                  }
                }

                const container =
                  image.closest(
                    "section, article, header, main, figure, div"
                  );

                const heading =
                  container
                    ?.querySelector(
                      "h1, h2, h3, h4"
                    )
                    ?.textContent ??
                  "";

                const context =
                  clean(
                    [
                      heading,
                      container
                        ?.getAttribute(
                          "id"
                        ) ??
                        "",
                      container
                        ?.getAttribute(
                          "class"
                        ) ??
                        "",
                      image.getAttribute(
                        "class"
                      ) ??
                        "",
                    ].join(
                      " "
                    )
                  );

                return {
                  url:
                    imageUrl,

                  alt:
                    clean(
                      image.alt
                    ),

                  context,

                  width:
                    image.naturalWidth ||
                    image.width ||
                    0,

                  height:
                    image.naturalHeight ||
                    image.height ||
                    0,

                  inHeader:
                    Boolean(
                      image.closest(
                        "header, nav"
                      )
                    ),
                };
              }
            )
            .filter(
              (
                image
              ) =>
                Boolean(
                  image.url
                )
            )
            .slice(
              0,
              maxImages
            );

        /* ===============================================
           COLORS
        =============================================== */

        const colors:
          Array<{
            value: string;

            property:
              | "background"
              | "text"
              | "border"
              | "theme";

            context: string;
          }> =
          [];

        const themeColor =
          document
            .querySelector(
              'meta[name="theme-color"]'
            )
            ?.getAttribute(
              "content"
            );

        if (
          themeColor
        ) {
          colors.push({
            value:
              themeColor,

            property:
              "theme",

            context:
              "meta theme-color brand",
          });
        }

        const colorElements =
          Array.from(
            document.querySelectorAll(
              [
                "body",
                "header",
                "nav",
                "main",
                "section",
                "h1",
                "h2",
                "h3",
                "a",
                "button",
                '[role="button"]',
                '[class*="button"]',
                '[class*="btn"]',
                '[class*="cta"]',
                '[class*="primary"]',
                '[class*="accent"]',
                '[class*="brand"]',
              ].join(
                ","
              )
            )
          ).slice(
            0,
            240
          );

        for (
          const element of
            colorElements
        ) {
          const style =
            window.getComputedStyle(
              element
            );

          const context =
            clean(
              [
                element.tagName,
                element.getAttribute(
                  "id"
                ) ??
                  "",
                element.getAttribute(
                  "class"
                ) ??
                  "",
              ].join(
                " "
              )
            );

          colors.push(
            {
              value:
                style.backgroundColor,

              property:
                "background",

              context,
            },
            {
              value:
                style.color,

              property:
                "text",

              context,
            },
            {
              value:
                style.borderTopColor,

              property:
                "border",

              context,
            }
          );
        }

        /* ===============================================
           FACTS / COUNTERS

           We intentionally inspect small text containers
           around number-only elements, because many sites
           render:
           49
           Mitarbeiter
           as separate children.
        =============================================== */

        const facts:
          Array<{
            value: string;

            context: string;
          }> =
          [];

        const factKeys =
          new Set<string>();

        const numberElements =
          Array.from(
            document.querySelectorAll<HTMLElement>(
              "main *, section *, article *"
            )
          ).slice(
            0,
            1800
          );

        for (
          const element of
            numberElements
        ) {
          const ownText =
            clean(
              element.textContent
            );

          if (
            !ownText ||
            ownText.length >
              80
          ) {
            continue;
          }

          const numberMatch =
            ownText.match(
              /(?:^|\s)((?:\d{1,3}(?:[.\s]\d{3})+|\d{1,6})(?:[+%])?)(?:\s|$)/
            );

          if (
            !numberMatch ||
            !numberMatch[1]
          ) {
            continue;
          }

          const value =
            numberMatch[1];

          let container:
            HTMLElement | null =
            element;

          for (
            let level =
              0;
            level <
              3;
            level +=
              1
          ) {
            if (
              !container
            ) {
              break;
            }

            const text =
              clean(
                container.textContent
              );

            if (
              text.length >=
                value.length +
                  4 &&
              text.length <=
                280
            ) {
              const key =
                `${value}|${text}`;

              if (
                !factKeys.has(
                  key
                )
              ) {
                factKeys.add(
                  key
                );

                facts.push({
                  value,

                  context:
                    text,
                });
              }

              break;
            }

            container =
              container.parentElement;
          }

          if (
            facts.length >=
              40
          ) {
            break;
          }
        }

        /* ===============================================
           SERVICES
        =============================================== */

        const services:
          Array<{
            name: string;

            description: string;

            context: string;
          }> =
          [];

        const serviceKeys =
          new Set<string>();

        const pageServiceSignal =
          /leistung|service|kompetenz|was-wir-tun/i.test(
            `${window.location.pathname} ${title} ${h1}`
          );

        const serviceContainers =
          Array.from(
            document.querySelectorAll<HTMLElement>(
              "main section, main article, main > div"
            )
          );

        for (
          const container of
            serviceContainers
        ) {
          const context =
            clean(
              [
                container.getAttribute(
                  "id"
                ) ??
                  "",
                container.getAttribute(
                  "class"
                ) ??
                  "",
                container
                  .querySelector(
                    "h1, h2"
                  )
                  ?.textContent ??
                  "",
              ].join(
                " "
              )
            );

          const relevant =
            pageServiceSignal ||
            /leistung|service|kompetenz|was wir tun|was können wir/i.test(
              context
            );

          if (
            !relevant
          ) {
            continue;
          }

          const candidates =
            Array.from(
              container.querySelectorAll<HTMLElement>(
                "h3, h4, h5, [class*='title'], [class*='heading']"
              )
            );

          for (
            const candidate of
              candidates
          ) {
            const name =
              clean(
                candidate.textContent
              );

            if (
              !name ||
              name.length <
                2 ||
              name.length >
                90
            ) {
              continue;
            }

            const parent =
              candidate.closest(
                "article, li, [class*='card'], [class*='item'], div"
              );

            const description =
              clean(
                parent
                  ?.querySelector(
                    "p"
                  )
                  ?.textContent
              ).slice(
                0,
                240
              );

            const key =
              name.toLowerCase();

            if (
              serviceKeys.has(
                key
              )
            ) {
              continue;
            }

            serviceKeys.add(
              key
            );

            services.push({
              name,

              description,

              context,
            });
          }
        }

        return {
          url:
            window.location.href,

          title,

          h1,

          headings,

          paragraphs,

          images,

          colors,

          facts,

          services,
        };
      },
      {
        maxImages:
          MAX_IMAGES,

        maxParagraphs:
          MAX_PAGE_PARAGRAPHS,

        maxHeadings:
          MAX_PAGE_HEADINGS,
      }
    );
  } catch (
    error
  ) {
    console.warn(
      `Could not inspect redesign source page ${url}:`,
      error
    );

    return null;
  }
}

/* =========================================================
   LINKS
========================================================= */

async function discoverLinks(
  page: Page
): Promise<RawPageLink[]> {
  return await page.evaluate(
    () =>
      Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          "a[href]"
        )
      ).map(
        (
          anchor
        ) => ({
          href:
            anchor.href,

          text:
            (
              anchor.textContent ??
              ""
            )
              .replace(
                /\s+/g,
                " "
              )
              .trim(),

          inNavigation:
            Boolean(
              anchor.closest(
                "header, nav"
              )
            ),
        })
      )
  );
}

/* =========================================================
   MAIN
========================================================= */

export async function inspectRedesignSite(
  websiteUrl: string
): Promise<RedesignSiteIntelligence> {
  const rootUrl =
    new URL(
      websiteUrl
    );

  rootUrl.hash =
    "";

  const cacheKey =
    rootUrl.toString();

  const cached =
    intelligenceCache.get(
      cacheKey
    );

  if (
    cached &&
    cached.expiresAt >
      Date.now()
  ) {
    return cached.data;
  }

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

        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151 Safari/537.36",
      });

    /* =====================================================
       DISCOVER
    ===================================================== */

    const homePage =
      await context.newPage();

    await homePage.goto(
      rootUrl.toString(),
      {
        waitUntil:
          "domcontentloaded",

        timeout:
          NAVIGATION_TIMEOUT,
      }
    );

    const links =
      await discoverLinks(
        homePage
      );

    await homePage.close();

    const urls =
      new Map<
        string,
        {
          url: URL;

          priority: number;
        }
      >();

    urls.set(
      rootUrl.toString(),
      {
        url:
          rootUrl,

        priority:
          Number.MAX_SAFE_INTEGER,
      }
    );

    for (
      const link of
        links
    ) {
      const url =
        normalizeInternalUrl({
          href:
            link.href,

          baseUrl:
            rootUrl,

          rootUrl,
        });

      if (
        !url
      ) {
        continue;
      }

      const key =
        url.toString();

      const priority =
        getPagePriority(
          link,
          url
        );

      const existing =
        urls.get(
          key
        );

      if (
        !existing ||
        priority >
          existing.priority
      ) {
        urls.set(
          key,
          {
            url,

            priority,
          }
        );
      }
    }

    const selectedUrls =
      Array.from(
        urls.values()
      )
        .sort(
          (
            first,
            second
          ) =>
            second.priority -
            first.priority
        )
        .slice(
          0,
          MAX_PAGES
        )
        .map(
          (
            item
          ) =>
            item.url.toString()
        );

    /* =====================================================
       CRAWL IN PARALLEL
    ===================================================== */

    const rawPages =
      (
        await Promise.all(
          selectedUrls.map(
            async (
              url
            ) => {
              const page =
                await context.newPage();

              try {
                return await collectPageData(
                  page,
                  url
                );
              } finally {
                await page.close();
              }
            }
          )
        )
      ).filter(
        (
          value
        ): value is RawPageData =>
          Boolean(
            value
          )
      );

    await context.close();

    /* =====================================================
       PAGES
    ===================================================== */

    const pages:
      SiteIntelligencePage[] =
      rawPages.map(
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
            page.headings,

          paragraphs:
            page.paragraphs,
        })
      );

    /* =====================================================
       IMAGES
    ===================================================== */

    const imageByUrl =
      new Map<
        string,
        SiteIntelligenceImage
      >();

    for (
      const page of
        rawPages
    ) {
      for (
        const rawImage of
          page.images
      ) {
        const image =
          createImageIntelligence({
            image:
              rawImage,

            page,
          });

        const existing =
          imageByUrl.get(
            image.url
          );

        if (
          !existing ||
          (
            image.logoScore +
            image.teamScore +
            image.projectScore
          ) >
            (
              existing.logoScore +
              existing.teamScore +
              existing.projectScore
            )
        ) {
          imageByUrl.set(
            image.url,
            image
          );
        }
      }
    }

    const allImages =
      Array.from(
        imageByUrl.values()
      );

    const logoCandidates =
      allImages
        .filter(
          (
            image
          ) =>
            image.logoScore >
            0
        )
        .sort(
          (
            first,
            second
          ) =>
            second.logoScore -
            first.logoScore
        )
        .slice(
          0,
          4
        );

    const teamImages =
      allImages
        .filter(
          (
            image
          ) =>
            image.teamScore >=
            55 &&
            image.width >=
              350 &&
            image.height >=
              250
        )
        .sort(
          (
            first,
            second
          ) =>
            second.teamScore -
            first.teamScore
        )
        .slice(
          0,
          8
        );

    const projectImages =
      allImages
        .filter(
          (
            image
          ) =>
            image.projectScore >=
            55 &&
            image.width >=
              500 &&
            image.height >=
              250
        )
        .sort(
          (
            first,
            second
          ) =>
            second.projectScore -
            first.projectScore
        )
        .slice(
          0,
          12
        );

    const specialUrls =
      new Set(
        [
          ...logoCandidates,
          ...teamImages,
          ...projectImages,
        ].map(
          (
            image
          ) =>
            image.url
        )
      );

    const contentImages =
      allImages
        .filter(
          (
            image
          ) =>
            !specialUrls.has(
              image.url
            ) &&
            image.width >=
              650 &&
            image.height >=
              300
        )
        .sort(
          (
            first,
            second
          ) =>
            (
              second.width *
              second.height
            ) -
            (
              first.width *
              first.height
            )
        )
        .slice(
          0,
          10
        );

    /* =====================================================
       COLORS
    ===================================================== */

    const colorMap =
      new Map<
        string,
        {
          score: number;

          contexts:
            Set<string>;
        }
      >();

    for (
      const page of
        rawPages
    ) {
      for (
        const sample of
          page.colors
      ) {
        let hex:
          | string
          | null =
          null;

        if (
          /^#[0-9A-Fa-f]{6}$/.test(
            sample.value
          )
        ) {
          hex =
            sample.value.toUpperCase();
        } else {
          hex =
            rgbToHex(
              sample.value
            );
        }

        if (
          !hex ||
          !isUsefulBrandColor(
            hex
          )
        ) {
          continue;
        }

        const current =
          colorMap.get(
            hex
          ) ?? {
            score:
              0,

            contexts:
              new Set<string>(),
          };

        current.score +=
          getColorSampleScore(
            sample
          );

        if (
          current.contexts.size <
          6
        ) {
          current.contexts.add(
            truncate(
              sample.context,
              100
            )
          );
        }

        colorMap.set(
          hex,
          current
        );
      }
    }

    const brandColors:
      SiteBrandColor[] =
      Array.from(
        colorMap.entries()
      )
        .map(
          (
            [
              hex,
              data,
            ]
          ) => ({
            hex,

            score:
              data.score,

            contexts:
              Array.from(
                data.contexts
              ),
          })
        )
        .sort(
          (
            first,
            second
          ) =>
            second.score -
            first.score
        )
        .slice(
          0,
          MAX_BRAND_COLORS
        );

    /* =====================================================
       FACTS
    ===================================================== */

    const factMap =
      new Map<
        string,
        SiteIntelligenceFact
      >();

    for (
      const page of
        rawPages
    ) {
      for (
        const candidate of
          page.facts
      ) {
        const fact =
          createFactIntelligence({
            candidate,

            page,
          });

        if (
          !fact
        ) {
          continue;
        }

        const key =
          `${normalizeKey(
            fact.value
          )}|${normalizeKey(
            fact.label
          ).slice(
            0,
            80
          )}`;

        const existing =
          factMap.get(
            key
          );

        if (
          !existing ||
          fact.score >
            existing.score
        ) {
          factMap.set(
            key,
            fact
          );
        }
      }
    }

    const facts =
      Array.from(
        factMap.values()
      )
        .sort(
          (
            first,
            second
          ) =>
            second.score -
            first.score
        )
        .slice(
          0,
          MAX_FACTS
        );

    /* =====================================================
       SERVICES
    ===================================================== */

    const serviceMap =
      new Map<
        string,
        SiteIntelligenceService
      >();

    for (
      const page of
        rawPages
    ) {
      for (
        const candidate of
          page.services
      ) {
        const service =
          createServiceIntelligence({
            candidate,

            page,
          });

        if (
          !service
        ) {
          continue;
        }

        const key =
          normalizeKey(
            service.name
          );

        const existing =
          serviceMap.get(
            key
          );

        if (
          !existing ||
          service.score >
            existing.score
        ) {
          serviceMap.set(
            key,
            service
          );
        }
      }
    }

    const services =
      Array.from(
        serviceMap.values()
      )
        .sort(
          (
            first,
            second
          ) =>
            second.score -
            first.score
        )
        .slice(
          0,
          MAX_SERVICES
        );

    /* =====================================================
       RESULT
    ===================================================== */

    const result:
      RedesignSiteIntelligence = {
      pages,

      primaryLogo:
        logoCandidates[0] ??
        null,

      logoCandidates,

      teamImages,

      projectImages,

      contentImages,

      primaryBrandColor:
        brandColors[0]
          ?.hex ??
        null,

      brandColors,

      facts,

      services,
    };

    intelligenceCache.set(
      cacheKey,
      {
        expiresAt:
          Date.now() +
          CACHE_TTL,

        data:
          result,
      }
    );

    return result;
  } finally {
    await browser.close();
  }
}