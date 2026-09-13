import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { load } from "cheerio";

/* =========================================================
   TYPES
========================================================= */

export type WebsiteFinding = {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
};

export type DecisionMakerSalutation =
  | "HERR"
  | "FRAU"
  | null;

export type WebsiteAnalysisResult = {
  websiteScore: number;
  opportunityScore: number;
  priority: "LOW" | "MEDIUM" | "HIGH";

  summary: string;
  findings: WebsiteFinding[];

  discoveredEmail: string | null;
  emailSourceUrl: string | null;

  discoveredPhone: string | null;
  phoneSourceUrl: string | null;

  contactFormUrl: string | null;

  decisionMakerName: string | null;
  decisionMakerRole: string | null;
  decisionMakerSalutation: DecisionMakerSalutation;
  decisionMakerSourceUrl: string | null;

  analyzedPages: string[];
};

type CrawledPage = {
  url: URL;
  html: string;
};

type DecisionMaker = {
  name: string;
  role: string;
  salutation: DecisionMakerSalutation;
};

type DecisionMakerCandidate = DecisionMaker & {
  score: number;
  sourceUrl: string;
};

type DecisionRole = {
  role: string;
  score: number;
};

/* =========================================================
   CONFIG
========================================================= */

const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT = 12_000;

/*
 * Slightly higher than before so that contact,
 * imprint AND about/team pages are more likely
 * to be included in the crawl.
 */
const MAX_PAGES = 10;

/* =========================================================
   BASIC HELPERS
========================================================= */

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function normalizeText(
  value: string
) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(
  value: string,
  keywords: string[]
) {
  const normalized =
    value.toLowerCase();

  return keywords.some(
    (keyword) =>
      normalized.includes(
        keyword.toLowerCase()
      )
  );
}

function cleanHostname(
  hostname: string
) {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "");
}

/* =========================================================
   URL
========================================================= */

function normalizeUrl(
  websiteUrl: string
) {
  const value =
    websiteUrl.trim();

  const normalized =
    value.startsWith("http://") ||
    value.startsWith("https://")
      ? value
      : `https://${value}`;

  const url =
    new URL(normalized);

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "Unsupported website protocol."
    );
  }

  return url;
}

/* =========================================================
   PRIVATE IP PROTECTION
========================================================= */

function isPrivateIpv4(
  address: string
) {
  const parts =
    address
      .split(".")
      .map(Number);

  if (parts.length !== 4) {
    return true;
  }

  const [a, b] = parts;

  if (a === 0) {
    return true;
  }

  if (a === 10) {
    return true;
  }

  if (a === 127) {
    return true;
  }

  if (
    a === 169 &&
    b === 254
  ) {
    return true;
  }

  if (
    a === 172 &&
    b >= 16 &&
    b <= 31
  ) {
    return true;
  }

  if (
    a === 192 &&
    b === 168
  ) {
    return true;
  }

  if (
    a === 100 &&
    b >= 64 &&
    b <= 127
  ) {
    return true;
  }

  if (
    a === 198 &&
    (b === 18 ||
      b === 19)
  ) {
    return true;
  }

  if (a >= 224) {
    return true;
  }

  return false;
}

function isPrivateIpv6(
  address: string
) {
  const value =
    address.toLowerCase();

  if (
    value === "::" ||
    value === "::1"
  ) {
    return true;
  }

  if (
    value.startsWith("fc") ||
    value.startsWith("fd")
  ) {
    return true;
  }

  if (
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  ) {
    return true;
  }

  if (
    value.startsWith("ff")
  ) {
    return true;
  }

  if (
    value.startsWith("::ffff:")
  ) {
    const ipv4 =
      value.replace(
        "::ffff:",
        ""
      );

    if (
      isIP(ipv4) === 4
    ) {
      return isPrivateIpv4(
        ipv4
      );
    }
  }

  return false;
}

function isPrivateIp(
  address: string
) {
  const version =
    isIP(address);

  if (version === 4) {
    return isPrivateIpv4(
      address
    );
  }

  if (version === 6) {
    return isPrivateIpv6(
      address
    );
  }

  return true;
}

async function assertPublicUrl(
  url: URL
) {
  const hostname =
    url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(
      ".localhost"
    )
  ) {
    throw new Error(
      "Local addresses are not allowed."
    );
  }

  const directIp =
    isIP(hostname);

  if (
    directIp &&
    isPrivateIp(hostname)
  ) {
    throw new Error(
      "Private IP addresses are not allowed."
    );
  }

  if (!directIp) {
    const addresses =
      await lookup(
        hostname,
        {
          all: true,
          verbatim: true,
        }
      );

    if (
      addresses.length === 0
    ) {
      throw new Error(
        "Website hostname could not be resolved."
      );
    }

    if (
      addresses.some(
        (item) =>
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
  response: Response
) {
  if (!response.body) {
    return "";
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let totalBytes = 0;
  let html = "";

  while (true) {
    const {
      value,
      done,
    } = await reader.read();

    if (done) {
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
        "Website response is too large to analyze."
      );
    }

    html +=
      decoder.decode(
        value,
        {
          stream: true,
        }
      );
  }

  html +=
    decoder.decode();

  return html;
}

async function fetchWebsite(
  initialUrl: URL
) {
  let currentUrl =
    initialUrl;

  for (
    let redirectCount = 0;
    redirectCount <=
      MAX_REDIRECTS;
    redirectCount += 1
  ) {
    await assertPublicUrl(
      currentUrl
    );

    const response =
      await fetch(
        currentUrl,
        {
          method: "GET",

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
      response.status >= 300 &&
      response.status < 400
    ) {
      const location =
        response.headers.get(
          "location"
        );

      if (!location) {
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

    if (!response.ok) {
      throw new Error(
        `Website returned HTTP ${response.status}.`
      );
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) ?? "";

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

    if (!html.trim()) {
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
   INTERNAL LINK DISCOVERY
========================================================= */

function internalPagePriority(
  href: string,
  text: string
) {
  const value =
    `${href} ${text}`
      .toLowerCase();

  if (
    containsAny(
      value,
      [
        "kontakt",
        "contact",
        "kontaktieren",
      ]
    )
  ) {
    return 100;
  }

  if (
    containsAny(
      value,
      [
        "impressum",
        "imprint",
      ]
    )
  ) {
    return 98;
  }

  if (
    containsAny(
      value,
      [
        "über-uns",
        "ueber-uns",
        "about",
        "about-us",
        "wir-ueber-uns",
        "unternehmen",
        "team",
        "mitarbeiter",
        "unser-team",
      ]
    )
  ) {
    return 94;
  }

  if (
    containsAny(
      value,
      [
        "leistungen",
        "services",
        "service",
        "angebot",
      ]
    )
  ) {
    return 85;
  }

  if (
    containsAny(
      value,
      [
        "referenzen",
        "projekte",
        "projects",
        "portfolio",
        "galerie",
        "gallery",
        "arbeiten",
        "our-work",
      ]
    )
  ) {
    return 80;
  }

  if (
    containsAny(
      value,
      [
        "datenschutz",
        "privacy",
      ]
    )
  ) {
    return 30;
  }

  return 0;
}

function shouldIgnoreUrl(
  url: URL
) {
  const path =
    url.pathname.toLowerCase();

  return /\.(jpg|jpeg|png|gif|webp|svg|ico|pdf|zip|rar|doc|docx|xls|xlsx|mp4|mp3|avi|mov)$/i.test(
    path
  );
}

function discoverInternalLinks(
  html: string,
  pageUrl: URL,
  rootHostname: string
) {
  const $ =
    load(html);

  const found =
    new Map<
      string,
      {
        url: URL;
        priority: number;
      }
    >();

  $("a[href]").each(
    (_, element) => {
      const href =
        $(element).attr(
          "href"
        );

      if (!href) {
        return;
      }

      if (
        href.startsWith(
          "mailto:"
        ) ||
        href.startsWith(
          "tel:"
        ) ||
        href.startsWith(
          "javascript:"
        )
      ) {
        return;
      }

      try {
        const url =
          new URL(
            href,
            pageUrl
          );

        if (
          url.protocol !==
            "http:" &&
          url.protocol !==
            "https:"
        ) {
          return;
        }

        if (
          cleanHostname(
            url.hostname
          ) !==
          rootHostname
        ) {
          return;
        }

        if (
          shouldIgnoreUrl(
            url
          )
        ) {
          return;
        }

        url.hash = "";

        const text =
          normalizeText(
            $(element).text()
          );

        const priority =
          internalPagePriority(
            url.pathname,
            text
          );

        if (
          priority <= 0
        ) {
          return;
        }

        const key =
          url.toString();

        const existing =
          found.get(key);

        if (
          !existing ||
          priority >
            existing.priority
        ) {
          found.set(
            key,
            {
              url,
              priority,
            }
          );
        }
      } catch {
        return;
      }
    }
  );

  return Array.from(
    found.values()
  ).sort(
    (a, b) =>
      b.priority -
      a.priority
  );
}

/* =========================================================
   CRAWLER
========================================================= */

async function crawlWebsite(
  initialUrl: URL
): Promise<CrawledPage[]> {
  const homepage =
    await fetchWebsite(
      initialUrl
    );

  const rootHostname =
    cleanHostname(
      homepage.finalUrl.hostname
    );

  const pages:
    CrawledPage[] = [
    {
      url:
        homepage.finalUrl,

      html:
        homepage.html,
    },
  ];

  const visited =
    new Set<string>([
      homepage.finalUrl.toString(),
    ]);

  let queue =
    discoverInternalLinks(
      homepage.html,
      homepage.finalUrl,
      rootHostname
    );

  while (
    queue.length > 0 &&
    pages.length <
      MAX_PAGES
  ) {
    const next =
      queue.shift();

    if (!next) {
      break;
    }

    const key =
      next.url.toString();

    if (
      visited.has(key)
    ) {
      continue;
    }

    visited.add(key);

    try {
      const fetched =
        await fetchWebsite(
          next.url
        );

      if (
        cleanHostname(
          fetched.finalUrl
            .hostname
        ) !==
        rootHostname
      ) {
        continue;
      }

      pages.push({
        url:
          fetched.finalUrl,

        html:
          fetched.html,
      });

      const moreLinks =
        discoverInternalLinks(
          fetched.html,
          fetched.finalUrl,
          rootHostname
        );

      queue = [
        ...queue,
        ...moreLinks,
      ].sort(
        (a, b) =>
          b.priority -
          a.priority
      );
    } catch (error) {
      console.warn(
        `Could not crawl ${next.url.toString()}:`,
        error
      );
    }
  }

  return pages;
}

/* =========================================================
   CONTACT HELPERS
========================================================= */

function extractEmails(
  html: string
) {
  const $ =
    load(html);

  const found =
    new Set<string>();

  $('a[href^="mailto:"]').each(
    (_, element) => {
      const href =
        $(element).attr(
          "href"
        );

      if (!href) {
        return;
      }

      const value =
        href
          .replace(
            /^mailto:/i,
            ""
          )
          .split("?")[0]
          .trim()
          .toLowerCase();

      if (value) {
        found.add(
          value
        );
      }
    }
  );

  const text =
    normalizeText(
      $("body").text()
    );

  const matches =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    ) ?? [];

  for (
    const match of matches
  ) {
    found.add(
      match.toLowerCase()
    );
  }

  return Array.from(
    found
  ).filter(
    (email) =>
      !email.endsWith(
        "@example.com"
      )
  );
}

function normalizePhone(
  value: string
) {
  return value
    .replace(
      /^tel:/i,
      ""
    )
    .trim();
}

function extractPhones(
  html: string
) {
  const $ =
    load(html);

  const found =
    new Set<string>();

  $('a[href^="tel:"]').each(
    (_, element) => {
      const href =
        $(element).attr(
          "href"
        );

      if (!href) {
        return;
      }

      const phone =
        normalizePhone(
          href
        );

      if (phone) {
        found.add(
          phone
        );
      }
    }
  );

  const text =
    normalizeText(
      $("body").text()
    );

  const matches =
    text.match(
      /(?:\+49|0)[\s()/.-]*(?:\d[\s()/.-]*){6,14}/g
    ) ?? [];

  for (
    const match of matches
  ) {
    const phone =
      normalizeText(
        match
      );

    if (phone) {
      found.add(
        phone
      );
    }
  }

  return Array.from(
    found
  );
}

function detectContactForm(
  html: string
) {
  const $ =
    load(html);

  const formLooksLikeContact = (root: any) => {
    const text = normalizeText(root.text()).toLowerCase();
    const inputs = root.find("input, textarea, select");
    const fieldMetadata = inputs
      .toArray()
      .map((field: any) => [
        $(field).attr("name"),
        $(field).attr("id"),
        $(field).attr("placeholder"),
        $(field).attr("aria-label"),
        $(field).attr("type"),
      ].filter(Boolean).join(" ").toLowerCase())
      .join(" ");

    const hasEmail =
      root.find('input[type="email"]').length > 0 ||
      /\b(e-?mail|email-address|mailadresse)\b/i.test(fieldMetadata);

    const hasMessage =
      root.find("textarea").length > 0 ||
      /\b(message|nachricht|anfrage|frage|subject|betreff)\b/i.test(fieldMetadata);

    const looksLikeContact =
      containsAny(text, [
        "kontakt",
        "contact",
        "nachricht",
        "ihre frage",
        "anfrage",
        "betreff",
        "e-mail",
        "email",
        "senden",
        "send",
      ]);

    return inputs.length >= 2 && (hasEmail || hasMessage || looksLikeContact);
  };

  if (
    $("form")
      .toArray()
      .some((formElement) => formLooksLikeContact($(formElement)))
  ) {
    return true;
  }

  /*
   * Some builders (notably Squarespace, HubSpot, Wix/Webflow embeds and a
   * number of JS form widgets) do not expose a literal <form> element in the
   * first server-rendered HTML response. Detect their contact-form wrappers
   * and field metadata as deterministic evidence instead of calling the form
   * missing just because hydration has not run.
   */
  const builderRoots = $(
    [
      ".sqs-block-form",
      ".form-wrapper",
      ".form-block",
      ".w-form",
      ".hs-form",
      "[data-form-id]",
      "[data-form-block-id]",
      "[data-block-type='9']",
      "[class*='contact-form']",
      "[class*='contactForm']",
    ].join(",")
  );

  if (
    builderRoots
      .toArray()
      .some((element) => formLooksLikeContact($(element)))
  ) {
    return true;
  }

  const source = html.toLowerCase();
  const hasBuilderMarker = [
    "sqs-block-form",
    "data-form-id",
    "form-wrapper",
    "form-field",
    "hs-form",
    "w-form",
    "formspree",
    "hubspot",
  ].some((marker) => source.includes(marker));

  const hasEmailSignal = /type=["']email["']|e-mail-adresse|email address|mailadresse/.test(source);
  const hasMessageSignal = /<textarea|nachricht|message|betreff|subject/.test(source);
  const hasSubmitSignal = />\s*(senden|send|submit)\s*</i.test(html) || /type=["']submit["']/.test(source);

  return hasBuilderMarker && hasEmailSignal && hasMessageSignal && hasSubmitSignal;
}

/* =========================================================
   DECISION MAKER HELPERS
========================================================= */

function cleanPersonName(
  value: string
) {
  return normalizeText(
    value
  )
    .replace(
      /^(?:herr|frau)\s+/i,
      ""
    )
    .replace(
      /\s*\([^)]*\)\s*$/,
      ""
    )
    .replace(
      /^[,:;\-–—|\s]+/,
      ""
    )
    .replace(
      /[,:;\-–—|\s]+$/,
      ""
    )
    .trim();
}

function getSalutationFromText(
  value: string
): DecisionMakerSalutation {
  if (
    /\bherr\b/i.test(
      value
    )
  ) {
    return "HERR";
  }

  if (
    /\bfrau\b/i.test(
      value
    )
  ) {
    return "FRAU";
  }

  return null;
}

function isLikelyPersonName(
  value: string
) {
  const name =
    cleanPersonName(
      value
    );

  if (
    name.length < 4 ||
    name.length > 80
  ) {
    return false;
  }

  if (
    /[&@:/]/.test(
      name
    )
  ) {
    return false;
  }

  if (
    /\d/.test(
      name
    )
  ) {
    return false;
  }

  const words =
    name
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length < 2 ||
    words.length > 5
  ) {
    return false;
  }

  const forbiddenWords = [
    "gmbh",
    "gesellschaft",
    "haftung",
    "gartengestaltung",
    "gartenbau",
    "landschaftsbau",
    "pflege-service",
    "service",
    "team",
    "straße",
    "strasse",
    "telefon",
    "telefax",
    "kontakt",
    "email",
    "e-mail",
    "internet",
    "umsatzsteuer",
    "register",
    "amtsgericht",
    "inhaltlich",
    "webseite",
    "website",
    "datenschutz",
    "impressum",
    "geschäftsführer",
    "geschäftsführerin",
    "geschäftsführung",
    "geschäftsleitung",
    "inhaber",
    "inhaberin",
    "unternehmensinhaber",
    "bauleitung",
    "büroleitung",
    "marketingleitung",
  ];

  const lower =
    name.toLowerCase();

  if (
    forbiddenWords.some(
      (word) =>
        lower.includes(
          word
        )
    )
  ) {
    return false;
  }

  const allowedLowercaseParticles =
    new Set([
      "von",
      "van",
      "de",
      "del",
      "der",
      "den",
      "zu",
      "zur",
    ]);

  return words.every(
    (word) => {
      const cleaned =
        word.replace(
          /^[("'„“]+|[)"'„“.,:;]+$/g,
          ""
        );

      if (!cleaned) {
        return false;
      }

      if (
        allowedLowercaseParticles.has(
          cleaned.toLowerCase()
        )
      ) {
        return true;
      }

      if (
        /^(Dr|Prof)\.?$/i.test(
          cleaned
        )
      ) {
        return true;
      }

      return /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüßÀ-ÿ'’.-]*$/.test(
        cleaned
      );
    }
  );
}

/* =========================================================
   DECISION ROLE CLASSIFICATION
========================================================= */

function getDecisionRole(
  value: string
): DecisionRole | null {
  const text =
    normalizeText(
      value
    ).toLowerCase();

  /*
   * Owner + managing director gets highest priority.
   */

  if (
    (
      text.includes(
        "unternehmensinhaber"
      ) ||
      text.includes(
        "firmeninhaber"
      ) ||
      /\binhaber\b/.test(
        text
      ) ||
      /\binhaberin\b/.test(
        text
      )
    ) &&
    (
      text.includes(
        "geschäftsführer"
      ) ||
      text.includes(
        "geschäftsführerin"
      )
    )
  ) {
    return {
      role:
        text.includes(
          "geschäftsführerin"
        )
          ? "Unternehmensinhaberin und Geschäftsführerin"
          : "Unternehmensinhaber und Geschäftsführer",

      score:
        130,
    };
  }

  if (
    text.includes(
      "geschäftsführerin"
    )
  ) {
    return {
      role:
        "Geschäftsführerin",

      score:
        120,
    };
  }

  if (
    text.includes(
      "geschäftsführer"
    )
  ) {
    return {
      role:
        "Geschäftsführer",

      score:
        120,
    };
  }

  if (
    text.includes(
      "unternehmensinhaberin"
    ) ||
    text.includes(
      "firmeninhaberin"
    )
  ) {
    return {
      role:
        "Unternehmensinhaberin",

      score:
        115,
    };
  }

  if (
    text.includes(
      "unternehmensinhaber"
    ) ||
    text.includes(
      "firmeninhaber"
    )
  ) {
    return {
      role:
        "Unternehmensinhaber",

      score:
        115,
    };
  }

  if (
    /\binhaberin\b/.test(
      text
    )
  ) {
    return {
      role:
        "Inhaberin",

      score:
        115,
    };
  }

  if (
    /\binhaber\b/.test(
      text
    )
  ) {
    return {
      role:
        "Inhaber",

      score:
        115,
    };
  }

  if (
    text.includes(
      "vertreten durch"
    ) ||
    text.includes(
      "vertretungsberechtigt"
    )
  ) {
    return {
      role:
        "Vertretungsberechtigt",

      score:
        110,
    };
  }

  /*
   * Do this before generic Geschäftsleitung.
   */

  if (
    text.includes(
      "stellv. geschäftsleitung"
    ) ||
    text.includes(
      "stellv geschäftsleitung"
    ) ||
    text.includes(
      "stellvertretende geschäftsleitung"
    ) ||
    text.includes(
      "stellvertretender geschäftsleitung"
    )
  ) {
    return {
      role:
        "Stellv. Geschäftsleitung",

      score:
        80,
    };
  }

  if (
    text.includes(
      "gesamtleitung"
    )
  ) {
    return {
      role:
        "Gesamtleitung",

      score:
        105,
    };
  }

  if (
    text.includes(
      "geschäftsleitung"
    )
  ) {
    return {
      role:
        "Geschäftsleitung",

      score:
        100,
    };
  }

  if (
    text.includes(
      "inhaltlich verantwortlich"
    ) ||
    text.includes(
      "verantwortlich für den inhalt"
    )
  ) {
    return {
      role:
        "Inhaltlich verantwortlich",

      score:
        70,
    };
  }

  return null;
}

/* =========================================================
   TEXT LINES
========================================================= */

function getVisibleTextLines(
  html: string
) {
  const preparedHtml =
    html
      .replace(
        /<br\s*\/?>/gi,
        "\n"
      )
      .replace(
        /<\/(?:p|div|address|li|h1|h2|h3|h4|h5|h6|section|article|tr|td)>/gi,
        "\n"
      );

  const $ =
    load(
      preparedHtml
    );

  $(
    "script, style, noscript"
  ).remove();

  return $("body")
    .text()
    .split(/\n+/)
    .map(
      (line) =>
        normalizeText(
          line
        )
    )
    .filter(Boolean);
}

function parsePersonCandidate(
  value: string
) {
  const salutation =
    getSalutationFromText(
      value
    );

  const name =
    cleanPersonName(
      value
    );

  if (
    !isLikelyPersonName(
      name
    )
  ) {
    return null;
  }

  return {
    name,
    salutation,
  };
}

/* =========================================================
   DECISION MAKER CANDIDATES
========================================================= */

function collectDecisionMakerCandidates(
  page: CrawledPage
): DecisionMakerCandidate[] {
  const candidates:
    DecisionMakerCandidate[] =
      [];

  const lines =
    getVisibleTextLines(
      page.html
    );

  const sourceUrl =
    page.url.toString();

  /*
   * CASE 1
   *
   * Patrick Reichelt (Geschäftsführer)
   * Max Mustermann (Inhaber)
   */

  for (
    const line of lines
  ) {
    const match =
      line.match(
        /^(?:(Herr|Frau)\s+)?(.+?)\s*\(([^)]{1,120})\)\s*$/
      );

    if (!match) {
      continue;
    }

    const person =
      parsePersonCandidate(
        `${match[1] ?? ""} ${match[2]}`
      );

    const role =
      getDecisionRole(
        match[3]
      );

    if (
      !person ||
      !role
    ) {
      continue;
    }

    candidates.push({
      name:
        person.name,

      role:
        role.role,

      salutation:
        person.salutation,

      score:
        role.score + 8,

      sourceUrl,
    });
  }

  /*
   * CASE 2
   *
   * Geschäftsführer: Patrick Reichelt
   * Inhaber: Max Mustermann
   *
   * Also handles:
   *
   * Gesamtleitung (inhaltlich verantwortlich):
   * Patrick Reichelt (Geschäftsführer)
   */

  for (
    let index = 0;
    index <
    lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    const colonIndex =
      line.indexOf(
        ":"
      );

    if (
      colonIndex === -1
    ) {
      continue;
    }

    const beforeColon =
      line.slice(
        0,
        colonIndex
      );

    const afterColon =
      line.slice(
        colonIndex + 1
      );

    const beforeRole =
      getDecisionRole(
        beforeColon
      );

    const fullLineRole =
      getDecisionRole(
        line
      );

    const role =
      fullLineRole ??
      beforeRole;

    if (!role) {
      continue;
    }

    const person =
      parsePersonCandidate(
        afterColon
      );

    if (person) {
      candidates.push({
        name:
          person.name,

        role:
          role.role,

        salutation:
          person.salutation,

        score:
          role.score + 6,

        sourceUrl,
      });

      continue;
    }

    /*
     * Role line followed by name line.
     */

    const nextLine =
      lines[
        index + 1
      ];

    if (!nextLine) {
      continue;
    }

    const nextPerson =
      parsePersonCandidate(
        nextLine
      );

    if (
      nextPerson
    ) {
      candidates.push({
        name:
          nextPerson.name,

        role:
          role.role,

        salutation:
          nextPerson.salutation,

        score:
          role.score + 4,

        sourceUrl,
      });
    }
  }

  /*
   * CASE 3
   *
   * Patrick Reichelt – Geschäftsführer
   * Patrick Reichelt - Inhaber
   * Patrick Reichelt | Geschäftsführer
   */

  for (
    const line of lines
  ) {
    const separators =
      [
        " – ",
        " — ",
        " - ",
        " | ",
      ];

    for (
      const separator of
        separators
    ) {
      if (
        !line.includes(
          separator
        )
      ) {
        continue;
      }

      const [
        left,
        ...rest
      ] =
        line.split(
          separator
        );

      const right =
        rest.join(
          separator
        );

      const person =
        parsePersonCandidate(
          left
        );

      const role =
        getDecisionRole(
          right
        );

      if (
        person &&
        role
      ) {
        candidates.push({
          name:
            person.name,

          role:
            role.role,

          salutation:
            person.salutation,

          score:
            role.score + 5,

          sourceUrl,
        });
      }
    }
  }

  /*
   * CASE 4
   *
   * Patrick Reichelt
   * Unternehmensinhaber und Geschäftsführer
   *
   * Justin Reichelt
   * Stellv. Geschäftsleitung / Bauleitung
   *
   * This is the important pattern for team/about pages.
   */

  for (
    let index = 0;
    index <
    lines.length;
    index += 1
  ) {
    const person =
      parsePersonCandidate(
        lines[index]
      );

    if (!person) {
      continue;
    }

    const nextLine =
      lines[
        index + 1
      ] ?? "";

    const secondNextLine =
      lines[
        index + 2
      ] ?? "";

    const role =
      getDecisionRole(
        `${nextLine} ${secondNextLine}`
      );

    if (!role) {
      continue;
    }

    candidates.push({
      name:
        person.name,

      role:
        role.role,

      salutation:
        person.salutation,

      score:
        role.score + 7,

      sourceUrl,
    });
  }

  /*
   * CASE 5
   *
   * Geschäftsführer
   * Patrick Reichelt
   */

  for (
    let index = 0;
    index <
    lines.length;
    index += 1
  ) {
    const role =
      getDecisionRole(
        lines[index]
      );

    if (!role) {
      continue;
    }

    const nextLine =
      lines[
        index + 1
      ];

    if (!nextLine) {
      continue;
    }

    const person =
      parsePersonCandidate(
        nextLine
      );

    if (!person) {
      continue;
    }

    candidates.push({
      name:
        person.name,

      role:
        role.role,

      salutation:
        person.salutation,

      score:
        role.score + 3,

      sourceUrl,
    });
  }

  return candidates;
}

/* =========================================================
   IMPRESSUM FALLBACK
========================================================= */

function extractImprintPersonFallback(
  page: CrawledPage
): DecisionMakerCandidate | null {
  const lines =
    getVisibleTextLines(
      page.html
    );

  if (
    lines.length === 0
  ) {
    return null;
  }

  const markerPatterns = [
    /angaben\s+gem[aä]ß\s+§\s*5\s+(?:tmg|ddg)/i,
    /angaben\s+gem[aä]ß\s+§\s*5/i,
    /^anbieterkennzeichnung/i,
  ];

  for (
    let index = 0;
    index <
    lines.length;
    index += 1
  ) {
    const line =
      lines[index];

    const isMarker =
      markerPatterns.some(
        (pattern) =>
          pattern.test(
            line
          )
      );

    if (!isMarker) {
      continue;
    }

    /*
     * Same-line variant:
     *
     * Angaben gemäß § 5 TMG: Thomas Thiele
     */

    const colonIndex =
      line.indexOf(
        ":"
      );

    if (
      colonIndex >= 0 &&
      colonIndex <
        line.length - 1
    ) {
      const person =
        parsePersonCandidate(
          line.slice(
            colonIndex + 1
          )
        );

      if (person) {
        return {
          name:
            person.name,

          role:
            "Anbieter laut Impressum",

          salutation:
            person.salutation,

          score:
            50,

          sourceUrl:
            page.url.toString(),
        };
      }
    }

    /*
     * Multi-line variant:
     *
     * Angaben gemäß § 5 TMG:
     * Thomas Thiele
     * Gartengestaltung und Pflege-Service
     */

    for (
      let offset = 1;
      offset <= 6;
      offset += 1
    ) {
      const candidate =
        lines[
          index + offset
        ];

      if (!candidate) {
        break;
      }

      if (
        containsAny(
          candidate,
          [
            "kontakt:",
            "telefon:",
            "telefax:",
            "e-mail:",
            "email:",
            "umsatzsteuer",
            "registergericht",
            "handelsregister",
            "streitschlichtung",
            "haftung",
          ]
        )
      ) {
        break;
      }

      const person =
        parsePersonCandidate(
          candidate
        );

      if (!person) {
        continue;
      }

      return {
        name:
          person.name,

        role:
          "Anbieter laut Impressum",

        salutation:
          person.salutation,

        score:
          50,

        sourceUrl:
          page.url.toString(),
      };
    }
  }

  return null;
}

/* =========================================================
   DECISION MAKER PAGE HELPERS
========================================================= */

function isDecisionMakerPage(
  page: CrawledPage
) {
  const pathname =
    decodeURIComponent(
      page.url.pathname
    ).toLowerCase();

  return containsAny(
    pathname,
    [
      "impressum",
      "imprint",
      "kontakt",
      "contact",
      "ueber",
      "über",
      "about",
      "unternehmen",
      "team",
      "mitarbeiter",
      "unser-team",
    ]
  );
}

function decisionMakerPageBonus(
  page: CrawledPage
) {
  const pathname =
    decodeURIComponent(
      page.url.pathname
    ).toLowerCase();

  if (
    containsAny(
      pathname,
      [
        "impressum",
        "imprint",
      ]
    )
  ) {
    return 15;
  }

  if (
    containsAny(
      pathname,
      [
        "ueber",
        "über",
        "about",
        "unternehmen",
        "team",
        "mitarbeiter",
        "unser-team",
      ]
    )
  ) {
    return 12;
  }

  if (
    containsAny(
      pathname,
      [
        "kontakt",
        "contact",
      ]
    )
  ) {
    return 5;
  }

  return 0;
}

/* =========================================================
   BEST DECISION MAKER
========================================================= */

function findBestDecisionMaker(
  pages: CrawledPage[]
): DecisionMakerCandidate | null {
  const relevantPages =
    pages.filter(
      isDecisionMakerPage
    );

  const candidates:
    DecisionMakerCandidate[] =
      [];

  for (
    const page of
      relevantPages
  ) {
    const found =
      collectDecisionMakerCandidates(
        page
      );

    const pageBonus =
      decisionMakerPageBonus(
        page
      );

    for (
      const candidate of
        found
    ) {
      candidates.push({
        ...candidate,

        score:
          candidate.score +
          pageBonus,
      });
    }
  }

  /*
   * Deduplicate equivalent people/roles.
   */

  const unique =
    new Map<
      string,
      DecisionMakerCandidate
    >();

  for (
    const candidate of
      candidates
  ) {
    const key =
      `${candidate.name.toLowerCase()}::${candidate.role.toLowerCase()}`;

    const existing =
      unique.get(
        key
      );

    if (
      !existing ||
      candidate.score >
        existing.score
    ) {
      unique.set(
        key,
        candidate
      );
    }
  }

  const ranked =
    Array.from(
      unique.values()
    ).sort(
      (a, b) =>
        b.score -
        a.score
    );

  if (
    ranked.length > 0
  ) {
    return ranked[0];
  }

  /*
   * Last fallback for sole traders where the imprint
   * simply starts with a person's name.
   */

  const imprintPages =
    relevantPages.filter(
      (page) =>
        containsAny(
          page.url.pathname,
          [
            "impressum",
            "imprint",
          ]
        )
    );

  for (
    const page of
      imprintPages
  ) {
    const fallback =
      extractImprintPersonFallback(
        page
      );

    if (
      fallback
    ) {
      return fallback;
    }
  }

  return null;
}

/* =========================================================
   ANALYZE WEBSITE
========================================================= */

export async function analyzeWebsite(
  websiteUrl: string
): Promise<WebsiteAnalysisResult> {
  const initialUrl =
    normalizeUrl(
      websiteUrl
    );

  const pages =
    await crawlWebsite(
      initialUrl
    );

  if (
    pages.length === 0
  ) {
    throw new Error(
      "Website could not be crawled."
    );
  }

  const homepage =
    pages[0];

  const home$ =
    load(
      homepage.html
    );

  const parsedPages =
    pages.map(
      (page) => {
        const $ =
          load(
            page.html
          );

        return {
          ...page,

          text:
            normalizeText(
              $("body").text()
            ).toLowerCase(),
        };
      }
    );

  const allPageText =
    parsedPages
      .map(
        (page) =>
          page.text
      )
      .join(" ");

  /* =========================================================
     CONTACT DISCOVERY
  ========================================================= */

  let discoveredEmail:
    string | null = null;

  let emailSourceUrl:
    string | null = null;

  let discoveredPhone:
    string | null = null;

  let phoneSourceUrl:
    string | null = null;

  let contactFormUrl:
    string | null = null;

  const contactSortedPages =
    [...pages].sort(
      (a, b) => {
        const priorityA =
          internalPagePriority(
            a.url.pathname,
            ""
          );

        const priorityB =
          internalPagePriority(
            b.url.pathname,
            ""
          );

        return (
          priorityB -
          priorityA
        );
      }
    );

  for (
    const page of
      contactSortedPages
  ) {
    if (
      !discoveredEmail
    ) {
      const emails =
        extractEmails(
          page.html
        );

      if (
        emails.length > 0
      ) {
        discoveredEmail =
          emails[0];

        emailSourceUrl =
          page.url.toString();
      }
    }

    if (
      !discoveredPhone
    ) {
      const phones =
        extractPhones(
          page.html
        );

      if (
        phones.length > 0
      ) {
        discoveredPhone =
          phones[0];

        phoneSourceUrl =
          page.url.toString();
      }
    }

    if (
      !contactFormUrl &&
      detectContactForm(
        page.html
      )
    ) {
      contactFormUrl =
        page.url.toString();
    }
  }

  /* =========================================================
     DECISION MAKER DISCOVERY
  ========================================================= */

  let decisionMakerName:
    string | null = null;

  let decisionMakerRole:
    string | null = null;

  let decisionMakerSalutation:
    DecisionMakerSalutation =
      null;

  let decisionMakerSourceUrl:
    string | null = null;

  const bestDecisionMaker =
    findBestDecisionMaker(
      pages
    );

  if (
    bestDecisionMaker
  ) {
    decisionMakerName =
      bestDecisionMaker.name;

    decisionMakerRole =
      bestDecisionMaker.role;

    decisionMakerSalutation =
      bestDecisionMaker.salutation;

    decisionMakerSourceUrl =
      bestDecisionMaker.sourceUrl;
  }

  /* =========================================================
     TECHNICAL
  ========================================================= */

  const hasHttps =
    homepage.url.protocol ===
    "https:";

  const pageTitle =
    normalizeText(
      home$("title")
        .first()
        .text()
    );

  const hasTitle =
    pageTitle.length >= 3;

  const metaDescription =
    normalizeText(
      home$(
        'meta[name="description"]'
      )
        .first()
        .attr("content") ??
        ""
    );

  const hasMetaDescription =
    metaDescription.length >=
    40;

  const hasViewport =
    home$(
      'meta[name="viewport"]'
    ).length > 0;

  /* =========================================================
     STRUCTURE
  ========================================================= */

  const h1Count =
    home$("h1").length;

  const h2Count =
    home$("h2").length;

  const sectionCount =
    home$("section").length;

  const hasH1 =
    h1Count > 0;

  const hasGoodStructure =
    h2Count >= 2 ||
    sectionCount >= 3;

  const hasNavigation =
    home$("nav").length > 0 ||
    home$("header a")
      .length >= 3;

  /* =========================================================
     CTA
  ========================================================= */

  const actionTexts =
    parsedPages.flatMap(
      (page) => {
        const $ =
          load(
            page.html
          );

        return $(
          "a, button, input[type='submit'], input[type='button']"
        )
          .toArray()
          .map(
            (element) =>
              normalizeText(
                [
                  $(element).text(),

                  $(element).attr(
                    "aria-label"
                  ),

                  $(element).attr(
                    "value"
                  ),
                ]
                  .filter(Boolean)
                  .join(" ")
              ).toLowerCase()
          )
          .filter(Boolean);
      }
    );

  const hasClearCta =
    actionTexts.some(
      (text) =>
        containsAny(
          text,
          [
            "angebot anfragen",
            "angebot erhalten",
            "jetzt anfragen",
            "anfrage senden",
            "kontakt aufnehmen",
            "kontaktieren",
            "termin vereinbaren",
            "termin buchen",
            "beratung anfragen",
            "kostenlose beratung",
            "projekt anfragen",
            "get a quote",
            "request a quote",
            "contact us",
            "get in touch",
            "book a call",
          ]
        )
    );

  /* =========================================================
     CONTACT
  ========================================================= */

  const hasContactForm =
    Boolean(
      contactFormUrl
    );

  const hasDirectContact =
    Boolean(
      discoveredEmail ||
      discoveredPhone
    );

  /* =========================================================
     BUSINESS CONTENT
  ========================================================= */

  const hasServices =
    containsAny(
      allPageText,
      [
        "leistungen",
        "unsere leistungen",
        "dienstleistungen",
        "services",
        "our services",
        "leistungsspektrum",
      ]
    );

  const hasProjects =
    containsAny(
      allPageText,
      [
        "referenzen",
        "projekte",
        "projektbeispiele",
        "galerie",
        "portfolio",
        "projects",
        "references",
        "case studies",
        "vorher-nachher",
      ]
    );

  const hasTestimonials =
    containsAny(
      allPageText,
      [
        "kundenstimmen",
        "kundenmeinungen",
        "bewertungen",
        "das sagen unsere kunden",
        "testimonials",
        "customer reviews",
        "reviews",
      ]
    );

  const hasTrustSignals =
    containsAny(
      allPageText,
      [
        "meisterbetrieb",
        "zertifiziert",
        "zertifikat",
        "jahre erfahrung",
        "langjährige erfahrung",
        "familienbetrieb",
        "inhabergeführt",
        "partner",
        "mitglied",
        "auszeichnung",
        "certified",
        "years of experience",
      ]
    ) ||
    /\bseit\s+(19|20)\d{2}\b/i.test(
      allPageText
    );

  /* =========================================================
     SOCIAL
  ========================================================= */

  let socialLinkCount = 0;

  for (
    const page of pages
  ) {
    const $ =
      load(
        page.html
      );

    socialLinkCount +=
      $("a")
        .toArray()
        .filter(
          (element) => {
            const href =
              (
                $(element).attr(
                  "href"
                ) ?? ""
              ).toLowerCase();

            return (
              href.includes(
                "instagram.com"
              ) ||
              href.includes(
                "linkedin.com"
              ) ||
              href.includes(
                "facebook.com"
              ) ||
              href.includes(
                "youtube.com"
              )
            );
          }
        ).length;
  }

  const hasSocialLinks =
    socialLinkCount > 0;

  /* =========================================================
     IMAGES
  ========================================================= */

  const images =
    home$("img")
      .toArray();

  const imageCount =
    images.length;

  const imagesWithAlt =
    images.filter(
      (image) => {
        const alt =
          normalizeText(
            home$(image).attr(
              "alt"
            ) ?? ""
          );

        return (
          alt.length >= 3
        );
      }
    ).length;

  const altCoverage =
    imageCount > 0
      ? imagesWithAlt /
        imageCount
      : 0;

  const hasGoodImageAlt =
    imageCount > 0 &&
    altCoverage >= 0.6;

  /* =========================================================
     FINDINGS
  ========================================================= */

  const findings:
    WebsiteFinding[] = [
    {
      key: "https",
      label: "HTTPS",
      passed: hasHttps,

      detail: hasHttps
        ? "Secure HTTPS connection detected."
        : "Website does not use HTTPS.",
    },

    {
      key: "title",
      label: "Page title",
      passed: hasTitle,

      detail: hasTitle
        ? pageTitle
        : "No meaningful page title detected.",
    },

    {
      key:
        "meta_description",

      label:
        "Meta description",

      passed:
        hasMetaDescription,

      detail:
        hasMetaDescription
          ? `${metaDescription.length} characters detected.`
          : "No meaningful meta description detected.",
    },

    {
      key:
        "viewport",

      label:
        "Mobile viewport",

      passed:
        hasViewport,

      detail:
        hasViewport
          ? "Responsive viewport configuration detected."
          : "No mobile viewport configuration detected.",
    },

    {
      key:
        "heading",

      label:
        "Main heading",

      passed:
        hasH1,

      detail:
        hasH1
          ? `${h1Count} H1 element${h1Count === 1 ? "" : "s"} detected.`
          : "No H1 heading detected.",
    },

    {
      key:
        "structure",

      label:
        "Content structure",

      passed:
        hasGoodStructure,

      detail:
        `${h2Count} H2 headings and ${sectionCount} sections detected on the homepage.`,
    },

    {
      key:
        "navigation",

      label:
        "Navigation",

      passed:
        hasNavigation,

      detail:
        hasNavigation
          ? "Main navigation structure detected."
          : "No clear navigation structure detected.",
    },

    {
      key:
        "cta",

      label:
        "Clear CTA",

      passed:
        hasClearCta,

      detail:
        hasClearCta
          ? "Conversion-oriented CTA detected."
          : "No strong conversion-oriented CTA detected.",
    },

    {
      key:
        "contact_form",

      label:
        "Contact form",

      passed:
        hasContactForm,

      detail:
        contactFormUrl
          ? `Contact form detected on ${new URL(
              contactFormUrl
            ).pathname}.`
          : "No clear contact form detected.",
    },

    {
      key:
        "direct_contact",

      label:
        "Direct contact",

      passed:
        hasDirectContact,

      detail:
        discoveredEmail
          ? `Email detected: ${discoveredEmail}`
          : discoveredPhone
            ? `Phone detected: ${discoveredPhone}`
            : "No visible email or phone contact detected.",
    },

    {
      key:
        "decision_maker",

      label:
        "Decision maker",

      passed:
        Boolean(
          decisionMakerName
        ),

      detail:
        decisionMakerName
          ? `${decisionMakerRole ?? "Decision maker"}: ${
              decisionMakerSalutation === "HERR"
                ? "Herr "
                : decisionMakerSalutation === "FRAU"
                  ? "Frau "
                  : ""
            }${decisionMakerName}`
          : "No clear decision maker or imprint provider detected.",
    },

    {
      key:
        "services",

      label:
        "Service presentation",

      passed:
        hasServices,

      detail:
        hasServices
          ? "Service-related content detected across the website."
          : "No clear service presentation detected.",
    },

    {
      key:
        "projects",

      label:
        "Projects / references",

      passed:
        hasProjects,

      detail:
        hasProjects
          ? "Projects, references or gallery content detected."
          : "No clear projects or references detected.",
    },

    {
      key:
        "testimonials",

      label:
        "Testimonials",

      passed:
        hasTestimonials,

      detail:
        hasTestimonials
          ? "Customer testimonials or reviews detected."
          : "No clear customer testimonials detected.",
    },

    {
      key:
        "trust",

      label:
        "Trust signals",

      passed:
        hasTrustSignals,

      detail:
        hasTrustSignals
          ? "Experience, certifications or similar trust signals detected."
          : "No strong trust signals detected.",
    },

    {
      key:
        "images",

      label:
        "Image accessibility",

      passed:
        hasGoodImageAlt,

      detail:
        imageCount > 0
          ? `${imagesWithAlt}/${imageCount} homepage images have meaningful alt text.`
          : "No homepage images detected.",
    },

    {
      key:
        "social",

      label:
        "Social presence",

      passed:
        hasSocialLinks,

      detail:
        hasSocialLinks
          ? `${socialLinkCount} social profile link(s) detected.`
          : "No social profile links detected.",
    },
  ];

  /* =========================================================
     WEBSITE SCORE
  ========================================================= */

  let websiteScore = 0;

  if (hasHttps) {
    websiteScore += 5;
  }

  if (hasTitle) {
    websiteScore += 5;
  }

  if (
    hasMetaDescription
  ) {
    websiteScore += 5;
  }

  if (
    hasViewport
  ) {
    websiteScore += 8;
  }

  if (hasH1) {
    websiteScore += 7;
  }

  if (
    hasNavigation
  ) {
    websiteScore += 7;
  }

  if (
    hasGoodStructure
  ) {
    websiteScore += 5;
  }

  if (
    hasClearCta
  ) {
    websiteScore += 10;
  }

  if (
    hasContactForm
  ) {
    websiteScore += 8;
  }

  if (
    hasDirectContact
  ) {
    websiteScore += 8;
  }

  if (
    hasServices
  ) {
    websiteScore += 8;
  }

  if (
    hasProjects
  ) {
    websiteScore += 10;
  }

  if (
    hasTestimonials
  ) {
    websiteScore += 6;
  }

  if (
    hasTrustSignals
  ) {
    websiteScore += 4;
  }

  if (
    hasGoodImageAlt
  ) {
    websiteScore += 4;
  }

  if (
    hasSocialLinks
  ) {
    websiteScore += 2;
  }

  websiteScore =
    clamp(
      websiteScore,
      0,
      100
    );

  /* =========================================================
     BUSINESS STRENGTH
  ========================================================= */

  let businessStrength = 0;

  if (
    hasServices
  ) {
    businessStrength += 20;
  }

  if (
    hasProjects
  ) {
    businessStrength += 25;
  }

  if (
    hasTestimonials
  ) {
    businessStrength += 15;
  }

  if (
    hasTrustSignals
  ) {
    businessStrength += 15;
  }

  if (
    hasDirectContact
  ) {
    businessStrength += 10;
  }

  if (
    hasContactForm
  ) {
    businessStrength += 5;
  }

  if (
    hasSocialLinks
  ) {
    businessStrength += 5;
  }

  if (
    imageCount >= 4
  ) {
    businessStrength += 5;
  }

  businessStrength =
    clamp(
      businessStrength,
      0,
      100
    );

  /* =========================================================
     CONVERSION GAP
  ========================================================= */

  let conversionGap = 0;

  if (
    !hasClearCta
  ) {
    conversionGap += 35;
  }

  if (
    !hasContactForm
  ) {
    conversionGap += 25;
  }

  if (
    !hasTestimonials
  ) {
    conversionGap += 15;
  }

  if (
    !hasTrustSignals
  ) {
    conversionGap += 10;
  }

  if (
    !hasNavigation
  ) {
    conversionGap += 5;
  }

  if (
    !hasGoodImageAlt
  ) {
    conversionGap += 5;
  }

  if (
    !hasMetaDescription
  ) {
    conversionGap += 5;
  }

  conversionGap =
    clamp(
      conversionGap,
      0,
      100
    );

  /* =========================================================
     OPPORTUNITY SCORE
  ========================================================= */

  const websiteWeakness =
    100 -
    websiteScore;

  const opportunityScore =
    clamp(
      Math.round(
        websiteWeakness *
          0.5 +
        businessStrength *
          0.3 +
        conversionGap *
          0.2
      ),
      0,
      100
    );

  /* =========================================================
     PRIORITY
  ========================================================= */

  const priority:
    | "LOW"
    | "MEDIUM"
    | "HIGH" =
    opportunityScore >= 65
      ? "HIGH"
      : opportunityScore >= 40
        ? "MEDIUM"
        : "LOW";

  /* =========================================================
     SUMMARY
  ========================================================= */

  const weaknesses =
    findings
      .filter(
        (finding) =>
          !finding.passed
      )
      .map(
        (finding) =>
          finding.label
      );

  const strengths =
    findings
      .filter(
        (finding) =>
          finding.passed
      )
      .map(
        (finding) =>
          finding.label
      );

  const websiteQuality =
    websiteScore >= 75
      ? "strong"
      : websiteScore >= 50
        ? "mixed"
        : "weak";

  const opportunityLevel =
    opportunityScore >= 65
      ? "high"
      : opportunityScore >= 40
        ? "medium"
        : "low";

  const decisionMakerSummary =
    decisionMakerName
      ? `Public decision maker found: ${
          decisionMakerSalutation === "HERR"
            ? "Herr "
            : decisionMakerSalutation === "FRAU"
              ? "Frau "
              : ""
        }${decisionMakerName} (${decisionMakerRole ?? "role not specified"}).`
      : "No clear decision maker or imprint provider was found during the crawl.";

  const summary = [
    `Analyzed ${pages.length} page${pages.length === 1 ? "" : "s"} across the website.`,

    `The website has a ${websiteQuality} structural and conversion foundation with a website score of ${websiteScore}/100.`,

    `The current lead opportunity is ${opportunityLevel} at ${opportunityScore}/100.`,

    weaknesses.length > 0
      ? `Main detected gaps: ${weaknesses.join(", ")}.`
      : "No major structural gaps were detected.",

    strengths.length > 0
      ? `Detected strengths: ${strengths.join(", ")}.`
      : "",

    discoveredEmail
      ? `Public email found: ${discoveredEmail}.`
      : "No public email was found during this crawl.",

    contactFormUrl
      ? "A contact form was found."
      : "No contact form was found.",

    decisionMakerSummary,

    "Visual design quality is evaluated separately by the visual analysis stage.",
  ]
    .filter(Boolean)
    .join(" ");

  /* =========================================================
     RETURN
  ========================================================= */

  return {
    websiteScore,
    opportunityScore,
    priority,

    summary,
    findings,

    discoveredEmail,
    emailSourceUrl,

    discoveredPhone,
    phoneSourceUrl,

    contactFormUrl,

    decisionMakerName,
    decisionMakerRole,
    decisionMakerSalutation,
    decisionMakerSourceUrl,

    analyzedPages:
      pages.map(
        (page) =>
          page.url.toString()
      ),
  };
}