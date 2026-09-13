import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { load } from "cheerio";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditFindingCategory =
  | "performance"
  | "mobile"
  | "technical"
  | "content"
  | "contact"
  | "legal_presence";

export type AuditFindingSeverity = "info" | "warning" | "strong";

export type AuditFinding = {
  id: string;
  key: string;
  category: AuditFindingCategory;
  severity: AuditFindingSeverity;
  label: string;
  value?: string | number;
  evidence: string;
  hookEligible: boolean;
};

export type EvidenceHook = {
  category: string | null;
  strength: 0 | 1 | 2 | 3;
  value: string | null;
  evidence: string | null;
  sentence: string | null;
};

export type EvidenceAuditResult = {
  auditVersion: string;
  websiteUrl: string;
  mobileScore: number | null;
  desktopScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  hasViewport: boolean | null;
  httpsValid: boolean | null;
  httpRedirectsToHttps: boolean | null;
  hasImpressumLink: boolean | null;
  hasPrivacyLink: boolean | null;
  hasContactForm: boolean | null;
  contactFormReachable: boolean | null;
  contactFormUrl: string | null;
  brokenLinkCount: number | null;
  footerYear: number | null;
  metaDescriptionPresent: boolean | null;
  cms: string | null;
  oversizedImagesKb: number | null;
  findings: AuditFinding[];
  hook: EvidenceHook;
  raw: Record<string, unknown>;
};

export type PersistedEvidenceAudit = EvidenceAuditResult & {
  id: string;
  createdAt: string;
};

/**
 * evidence-v3:
 * - Improved contact-form detection
 * - Better Squarespace / builder detection
 * - Prevents old v2 cached false negatives from being reused
 */
const AUDIT_VERSION = "evidence-v3";

const CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT = 12_000;
const LINK_LIMIT = 20;

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  const url = new URL(normalized);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Unsupported website protocol.");
  }

  return url;
}

function isPrivateIpv4(address: string) {
  const p = address.split(".").map(Number);

  if (p.length !== 4) return true;

  const [a, b] = p;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string) {
  const v = address.toLowerCase();

  if (
    v === "::" ||
    v === "::1" ||
    v.startsWith("fc") ||
    v.startsWith("fd") ||
    /^fe[89ab]/.test(v) ||
    v.startsWith("ff")
  ) {
    return true;
  }

  if (v.startsWith("::ffff:")) {
    return isPrivateIpv4(v.replace("::ffff:", ""));
  }

  return false;
}

async function assertPublicUrl(url: URL) {
  const host = url.hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("Local addresses are not allowed.");
  }

  if (isIP(host)) {
    if (
      (isIP(host) === 4 && isPrivateIpv4(host)) ||
      (isIP(host) === 6 && isPrivateIpv6(host))
    ) {
      throw new Error("Private IP addresses are not allowed.");
    }

    return;
  }

  const records = await lookup(host, {
    all: true,
    verbatim: true,
  });

  if (
    !records.length ||
    records.some((r) =>
      r.family === 4
        ? isPrivateIpv4(r.address)
        : isPrivateIpv6(r.address)
    )
  ) {
    throw new Error("Website resolves to a private or unsafe address.");
  }
}

async function safeFetch(
  url: URL,
  init: RequestInit = {},
  redirects = 0
): Promise<Response> {
  if (redirects > MAX_REDIRECTS) {
    throw new Error("Too many redirects.");
  }

  await assertPublicUrl(url);

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(url, {
      ...init,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "LeadbaseEvidenceAudit/1.0 (+website-audit)",
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        ...(init.headers ?? {}),
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");

      if (!location) {
        return response;
      }

      const next = new URL(location, url);

      return safeFetch(next, init, redirects + 1);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHtml(url: URL) {
  const response = await safeFetch(url);

  if (!response.ok) {
    throw new Error(
      `Website returned HTTP ${response.status}.`
    );
  }

  const type =
    response.headers.get("content-type") ?? "";

  if (
    type &&
    !type.includes("text/html") &&
    !type.includes("application/xhtml+xml")
  ) {
    throw new Error("Website did not return HTML.");
  }

  const text = await response.text();

  if (
    Buffer.byteLength(text, "utf8") >
    MAX_HTML_BYTES
  ) {
    throw new Error(
      "Website HTML is too large to audit safely."
    );
  }

  return {
    html: text,
    finalUrl: new URL(
      response.url || url.toString()
    ),
  };
}

function maybeYear(text: string) {
  const years = Array.from(
    text.matchAll(
      /(?:©|copyright)?\s*(20\d{2})/gi
    )
  )
    .map((m) => Number(m[1]))
    .filter(
      (y) =>
        y >= 2000 &&
        y <= new Date().getFullYear() + 1
    );

  return years.length
    ? Math.max(...years)
    : null;
}

function detectCms(
  html: string,
  generator: string
) {
  const source =
    `${generator} ${html.slice(
      0,
      250_000
    )}`.toLowerCase();

  if (
    source.includes("wp-content") ||
    source.includes("wordpress")
  ) {
    return "WordPress";
  }

  if (
    source.includes("wixstatic") ||
    source.includes("wix.com")
  ) {
    return "Wix";
  }

  if (source.includes("squarespace")) {
    return "Squarespace";
  }

  if (source.includes("webflow")) {
    return "Webflow";
  }

  if (
    source.includes("framerusercontent") ||
    source.includes("framer.com")
  ) {
    return "Framer";
  }

  if (source.includes("shopify")) {
    return "Shopify";
  }

  return generator.trim() || null;
}

/**
 * Detects real contact forms while trying not to
 * mistake newsletter/signup inputs for contact forms.
 *
 * Supports:
 * - native <form>
 * - Squarespace
 * - Webflow
 * - HubSpot
 * - Formspree
 * - common custom form wrappers
 * - serialized / builder-generated form markup
 */
function detectContactFormInHtml(
  html: string
) {
  const $ = load(html);

  const rootLooksLikeContact = (
    root: any
  ) => {
    const fields = root.find(
      "input, textarea, select"
    );

    const buttons = root.find(
      'button, input[type="submit"], input[type="button"]'
    );

    const text = root
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    const metadata = fields
      .toArray()
      .map((field: any) =>
        [
          $(field).attr("name"),
          $(field).attr("id"),
          $(field).attr("placeholder"),
          $(field).attr("aria-label"),
          $(field).attr("type"),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      )
      .join(" ");

    const buttonText = buttons
      .toArray()
      .map((button: any) =>
        [
          $(button).text(),
          $(button).attr("value"),
          $(button).attr("aria-label"),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      )
      .join(" ");

    const combined =
      `${text} ${metadata} ${buttonText}`;

    const hasEmail =
      root.find('input[type="email"]')
        .length > 0 ||
      /\b(e-?mail|email-address|emailadresse|mailadresse)\b/i.test(
        combined
      );

    const hasMessage =
      root.find("textarea").length > 0 ||
      /\b(message|nachricht|anfrage|mitteilung|kommentar|frage)\b/i.test(
        combined
      );

    const hasSubject =
      /\b(subject|betreff|thema)\b/i.test(
        combined
      );

    const hasName =
      /\b(name|vorname|nachname|first.?name|last.?name)\b/i.test(
        combined
      );

    const hasPhone =
      root.find('input[type="tel"]').length >
        0 ||
      /\b(phone|telefon|telephone|tel)\b/i.test(
        combined
      );

    const hasSubmit =
      root.find(
        'button[type="submit"], input[type="submit"]'
      ).length > 0 ||
      /\b(senden|send|submit|abschicken|anfragen|kontaktieren|request)\b/i.test(
        buttonText
      ) ||
      /\b(senden|send|submit|abschicken)\b/i.test(
        text
      );

    const hasContactText =
      /\b(kontakt|contact|nachricht|anfrage|schreib uns|write us|get in touch)\b/i.test(
        combined
      );

    let score = 0;

    if (fields.length >= 2) {
      score += 1;
    }

    if (fields.length >= 3) {
      score += 1;
    }

    if (hasEmail) {
      score += 3;
    }

    if (hasMessage) {
      score += 3;
    }

    if (hasSubject) {
      score += 1;
    }

    if (hasName) {
      score += 1;
    }

    if (hasPhone) {
      score += 1;
    }

    if (hasSubmit) {
      score += 2;
    }

    if (hasContactText) {
      score += 1;
    }

    /*
     * Newsletter forms usually only have:
     * email + submit.
     *
     * A real contact form should normally
     * contain either a message field or
     * multiple additional contact signals.
     */
    const strongContactStructure =
      hasEmail &&
      (
        hasMessage ||
        hasSubject ||
        (hasName && fields.length >= 3) ||
        (hasPhone && fields.length >= 3)
      );

    return (
      strongContactStructure &&
      score >= 6
    );
  };

  /*
   * 1. Native form elements
   */
  const nativeForms =
    $("form").toArray();

  if (
    nativeForms.some((el) =>
      rootLooksLikeContact($(el))
    )
  ) {
    return true;
  }

  /*
   * 2. Common builder wrappers
   */
  const builderRoots = $(
    [
      ".sqs-block-form",
      ".form-wrapper",
      ".form-block",
      ".form-container",
      ".w-form",
      ".hs-form",
      "[data-form-id]",
      "[data-form-block-id]",
      "[data-block-type='9']",
      "[class*='contact-form']",
      "[class*='contactForm']",
      "[class*='contact_form']",
    ].join(",")
  );

  if (
    builderRoots
      .toArray()
      .some((el) =>
        rootLooksLikeContact($(el))
      )
  ) {
    return true;
  }

  /*
   * 3. Fallback detection.
   *
   * Some builders store form markup/configuration
   * inside scripts or serialized HTML instead of
   * providing a normal <form> element in the
   * server response.
   */
  const source = html
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0022/gi, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .toLowerCase();

  const knownFormBuilder =
    source.includes("squarespace") ||
    source.includes("sqs-block-form") ||
    source.includes("data-form-id") ||
    source.includes(
      "data-form-block-id"
    ) ||
    source.includes("form-wrapper") ||
    source.includes("form-block") ||
    source.includes("formspree") ||
    source.includes("hubspot") ||
    source.includes("hs-form") ||
    source.includes("w-form");

  const email =
    /type=["']email["']|e-?mail-adresse|emailadresse|email address|mailadresse/.test(
      source
    );

  const message =
    /<textarea|nachricht|message|mitteilung|kommentar|anfrage/.test(
      source
    );

  const subject =
    /betreff|subject|thema/.test(
      source
    );

  const name =
    /vorname|nachname|first.?name|last.?name/.test(
      source
    );

  const phone =
    /type=["']tel["']|telefon|telephone|phone/.test(
      source
    );

  const submit =
    /type=["']submit["']/.test(
      source
    ) ||
    />[^<]{0,60}(senden|send|submit|abschicken|anfragen|kontaktieren)[^<]{0,60}</i.test(
      source
    ) ||
    /"submit(?:label|text)?"\s*:\s*"[^"]+"/i.test(
      source
    );

  /*
   * Important newsletter protection:
   *
   * email + submit alone must NOT count.
   */
  const contactStructure =
    email &&
    (
      message ||
      subject ||
      (name && phone)
    );

  if (!contactStructure) {
    return false;
  }

  let fallbackScore = 0;

  if (knownFormBuilder) {
    fallbackScore += 2;
  }

  if (email) {
    fallbackScore += 3;
  }

  if (message) {
    fallbackScore += 3;
  }

  if (subject) {
    fallbackScore += 1;
  }

  if (name) {
    fallbackScore += 1;
  }

  if (phone) {
    fallbackScore += 1;
  }

  if (submit) {
    fallbackScore += 2;
  }

  return fallbackScore >= 6;
}

function pageSpeedValue(
  audits:
    | Record<string, any>
    | undefined,
  key: string
) {
  const value =
    audits?.[key]?.numericValue;

  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

async function loadPageSpeed(
  url: string,
  strategy: "mobile" | "desktop"
) {
  const key =
    process.env
      .GOOGLE_PAGESPEED_API_KEY
      ?.trim();

  if (!key) {
    return null;
  }

  const endpoint = new URL(
    "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed"
  );

  endpoint.searchParams.set(
    "url",
    url
  );

  endpoint.searchParams.set(
    "strategy",
    strategy
  );

  endpoint.searchParams.set(
    "category",
    "performance"
  );

  endpoint.searchParams.set(
    "key",
    key
  );

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    90_000
  );

  try {
    const response = await fetch(
      endpoint,
      {
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      let detail = "";

      try {
        detail = await response.text();
      } catch {
        // Ignore response parsing failure.
      }

      throw new Error(
        `PageSpeed returned HTTP ${response.status}.${detail ? ` ${detail.slice(0, 500)}` : ""}`
      );
    }

    const json =
      (await response.json()) as any;

    const scoreRaw =
      json?.lighthouseResult?.categories
        ?.performance?.score;

    const score =
      typeof scoreRaw === "number"
        ? Math.round(scoreRaw * 100)
        : null;

    const audits =
      json?.lighthouseResult
        ?.audits as
        | Record<string, any>
        | undefined;

    const imageSavings = [
      "uses-optimized-images",
      "uses-responsive-images",
      "offscreen-images",
    ]
      .map(
        (id) =>
          audits?.[id]?.details
            ?.overallSavingsBytes
      )
      .filter(
        (v): v is number =>
          typeof v === "number" &&
          Number.isFinite(v)
      );

    return {
      score,

      lcpMs: pageSpeedValue(
        audits,
        "largest-contentful-paint"
      ),

      cls: pageSpeedValue(
        audits,
        "cumulative-layout-shift"
      ),

      tbtMs: pageSpeedValue(
        audits,
        "total-blocking-time"
      ),

      oversizedImagesKb:
        imageSavings.length
          ? Math.round(
              Math.max(
                ...imageSavings
              ) / 1024
            )
          : null,

      raw: {
        id: json?.id ?? url,
        fetchTime:
          json?.lighthouseResult
            ?.fetchTime ?? null,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkLink(
  link: URL
) {
  try {
    const response =
      await safeFetch(link, {
        method: "HEAD",
      });

    if (
      response.status === 405 ||
      response.status === 501
    ) {
      const fallback =
        await safeFetch(link, {
          method: "GET",
          headers: {
            range:
              "bytes=0-1024",
          },
        });

      return (
        fallback.ok ||
        (fallback.status >= 300 &&
          fallback.status < 400)
      );
    }

    return (
      response.ok ||
      (response.status >= 300 &&
        response.status < 400)
    );
  } catch {
    return false;
  }
}

function finding(
  key: string,
  category: AuditFindingCategory,
  severity: AuditFindingSeverity,
  label: string,
  evidence: string,
  value?: string | number,
  hookEligible = false
): AuditFinding {
  return {
    id: `${key}:${String(
      value ?? evidence
    )}`,
    key,
    category,
    severity,
    label,
    value,
    evidence,
    hookEligible,
  };
}

function chooseHook(
  findings: AuditFinding[]
): EvidenceHook {
  const priority = [
    "contact_form_unreachable",
    "https_problem",
    "mobile_score",
    "mobile_lcp",
    "broken_links",
    "content_freshness",
    "oversized_images",
    "meta_description",
  ];

  const eligible =
    findings.filter(
      (f) => f.hookEligible
    );

  const selected = eligible.sort(
    (a, b) => {
      const ai = priority.indexOf(
        a.key
      );

      const bi = priority.indexOf(
        b.key
      );

      return (
        (ai === -1
          ? 999
          : ai) -
        (bi === -1
          ? 999
          : bi)
      );
    }
  )[0];

  if (!selected) {
    return {
      category: null,
      strength: 0,
      value: null,
      evidence: null,
      sentence: null,
    };
  }

  const map: Record<
    string,
    string
  > = {
    contact_form_unreachable:
      "contact_form",
    https_problem: "https",
    mobile_score:
      "mobile_speed",
    mobile_lcp:
      "mobile_speed",
    broken_links:
      "broken_links",
    content_freshness:
      "freshness",
    oversized_images:
      "image_performance",
    meta_description:
      "metadata",
  };

  const sentence =
    selected.key ===
    "mobile_lcp"
      ? `Largest Contentful Paint measured ${selected.value}.`
      : selected.key ===
          "mobile_score"
        ? `Mobile PageSpeed measured ${selected.value}/100.`
        : selected.key ===
            "contact_form_unreachable"
          ? "The contact form link was present but could not be reached during the audit."
          : selected.key ===
              "https_problem"
            ? "The website did not complete the HTTPS check successfully."
            : selected.key ===
                "broken_links"
              ? `${selected.value} checked internal links were not reachable.`
              : selected.key ===
                  "content_freshness"
                ? `The visible footer year detected was ${selected.value}.`
                : selected.key ===
                    "oversized_images"
                  ? `PageSpeed reported about ${selected.value} KB of potential image savings.`
                  : "No meta description was detected on the audited page.";

  return {
    category:
      map[selected.key] ??
      selected.category,

    strength:
      selected.severity ===
      "strong"
        ? 3
        : selected.severity ===
            "warning"
          ? 2
          : 1,

    value:
      selected.value ===
      undefined
        ? null
        : String(
            selected.value
          ),

    evidence:
      selected.evidence,

    sentence,
  };
}

export async function runEvidenceAudit(
  websiteUrl: string
): Promise<EvidenceAuditResult> {
  const start =
    normalizeUrl(websiteUrl);

  const { html, finalUrl } =
    await fetchHtml(start);

  const $ = load(html);

  const hrefs = $("a[href]")
    .map(
      (_, el) =>
        $(el).attr("href") ?? ""
    )
    .get();

  const lowerHrefText =
    hrefs.map((href) =>
      href.toLowerCase()
    );

  const hasImpressumLink =
    lowerHrefText.some((href) =>
      /impressum|imprint/.test(
        href
      )
    );

  const hasPrivacyLink =
    lowerHrefText.some((href) =>
      /privacy|datenschutz|data-protection/.test(
        href
      )
    );

  /*
   * First check the current page itself.
   */
  let hasContactForm =
    detectContactFormInHtml(html);

  let contactFormReachable:
    | boolean
    | null =
    hasContactForm
      ? true
      : null;

  let contactFormUrl:
    | string
    | null =
    hasContactForm
      ? finalUrl.toString()
      : null;

  /*
   * Then look for a dedicated contact page.
   *
   * This supports:
   * /contact
   * /kontakt
   * /kontaktieren
   * /contact-us
   * etc.
   */
  const contactHref =
    hrefs.find((href) =>
      /(?:^|\/|[-_])(contact|kontakt)(?:\/|[-_?#.]|$)/i.test(
        href
      )
    );

  if (
    !hasContactForm &&
    contactHref
  ) {
    try {
      const contactUrl =
        new URL(
          contactHref,
          finalUrl
        );

      if (
        contactUrl.hostname ===
        finalUrl.hostname
      ) {
        const contactPage =
          await fetchHtml(
            contactUrl
          );

        if (
          detectContactFormInHtml(
            contactPage.html
          )
        ) {
          hasContactForm = true;
          contactFormReachable =
            true;
          contactFormUrl =
            contactPage.finalUrl.toString();
        }
      }
    } catch (error) {
      console.warn(
        "[Evidence Audit] Contact page could not be inspected:",
        error
      );

      contactFormReachable =
        false;
    }
  }

  const internalLinks: URL[] =
    [];

  for (const href of hrefs) {
    if (
      internalLinks.length >=
      LINK_LIMIT
    ) {
      break;
    }

    try {
      const u = new URL(
        href,
        finalUrl
      );

      if (
        (u.protocol ===
          "http:" ||
          u.protocol ===
            "https:") &&
        u.hostname ===
          finalUrl.hostname &&
        !internalLinks.some(
          (x) =>
            x.toString() ===
            u.toString()
        )
      ) {
        internalLinks.push(u);
      }
    } catch {
      // Ignore invalid hrefs.
    }
  }

  const linkChecks =
    await Promise.all(
      internalLinks.map(
        checkLink
      )
    );

  const brokenLinkCount =
    linkChecks.filter(
      (ok) => !ok
    ).length;

  const hasViewport =
    $(
      'meta[name="viewport"]'
    ).length > 0;

  const metaDescriptionPresent =
    Boolean(
      $(
        'meta[name="description"]'
      )
        .attr("content")
        ?.trim()
    );

  const footerYear =
    maybeYear(
      $("footer").text() ||
        $("body")
          .text()
          .slice(-10_000)
    );

  const generator =
    $(
      'meta[name="generator"]'
    ).attr("content") ?? "";

  const cms = detectCms(
    html,
    generator
  );

  const httpsValid =
    finalUrl.protocol ===
    "https:";

  let httpRedirectsToHttps:
    | boolean
    | null = null;

  if (httpsValid) {
    try {
      const http = new URL(
        finalUrl.toString()
      );

      http.protocol = "http:";

      const response =
        await safeFetch(http, {
          method: "HEAD",
        });

      httpRedirectsToHttps =
        (response.url || "")
          .startsWith(
            "https://"
          );
    } catch {
      httpRedirectsToHttps =
        false;
    }
  }

  const [mobile, desktop] =
    await Promise.all([
      loadPageSpeed(
        finalUrl.toString(),
        "mobile"
      ).catch((error) => {
        console.error(
          "[Evidence Audit] PageSpeed mobile failed:",
          error
        );

        return null;
      }),

      loadPageSpeed(
        finalUrl.toString(),
        "desktop"
      ).catch((error) => {
        console.error(
          "[Evidence Audit] PageSpeed desktop failed:",
          error
        );

        return null;
      }),
    ]);

  const findings: AuditFinding[] =
    [];

  if (
    contactFormReachable ===
    false
  ) {
    findings.push(
      finding(
        "contact_form_unreachable",
        "contact",
        "strong",
        "Contact form unreachable",
        "A contact form/link was detected but its target did not return a successful response.",
        "unreachable",
        true
      )
    );
  }

  if (
    !httpsValid ||
    httpRedirectsToHttps ===
      false
  ) {
    findings.push(
      finding(
        "https_problem",
        "technical",
        "strong",
        "HTTPS check",
        `HTTPS valid: ${httpsValid}; HTTP redirects to HTTPS: ${String(
          httpRedirectsToHttps
        )}`,
        httpsValid
          ? "redirect missing"
          : "HTTPS failed",
        true
      )
    );
  }

  if (
    mobile?.score !== null &&
    mobile?.score !== undefined &&
    mobile.score < 50
  ) {
    findings.push(
      finding(
        "mobile_score",
        "performance",
        mobile.score < 35
          ? "strong"
          : "warning",
        "Mobile PageSpeed",
        `PageSpeed mobile performance score: ${mobile.score}/100`,
        mobile.score,
        true
      )
    );
  }

  if (
    mobile?.lcpMs !== null &&
    mobile?.lcpMs !==
      undefined &&
    mobile.lcpMs > 4000
  ) {
    findings.push(
      finding(
        "mobile_lcp",
        "performance",
        mobile.lcpMs > 6000
          ? "strong"
          : "warning",
        "Mobile LCP",
        `Largest Contentful Paint: ${Math.round(
          mobile.lcpMs
        )}ms`,
        `${(
          mobile.lcpMs / 1000
        ).toFixed(1)}s`,
        true
      )
    );
  }

  if (!hasViewport) {
    findings.push(
      finding(
        "viewport_missing",
        "mobile",
        "warning",
        "Viewport meta missing",
        'No <meta name="viewport"> tag was detected.',
        "missing",
        false
      )
    );
  }

  if (
    brokenLinkCount >= 2
  ) {
    findings.push(
      finding(
        "broken_links",
        "technical",
        brokenLinkCount >= 4
          ? "strong"
          : "warning",
        "Broken internal links",
        `${brokenLinkCount} of ${internalLinks.length} checked internal links were unreachable.`,
        brokenLinkCount,
        true
      )
    );
  }

  if (
    footerYear &&
    footerYear <=
      new Date().getFullYear() -
        4
  ) {
    findings.push(
      finding(
        "content_freshness",
        "content",
        "warning",
        "Visible footer year",
        `Latest footer/copyright year detected: ${footerYear}`,
        footerYear,
        true
      )
    );
  }

  if (
    mobile?.oversizedImagesKb &&
    mobile.oversizedImagesKb >=
      1000
  ) {
    findings.push(
      finding(
        "oversized_images",
        "performance",
        mobile.oversizedImagesKb >=
          3000
          ? "strong"
          : "warning",
        "Image performance",
        `PageSpeed potential image savings: ${mobile.oversizedImagesKb} KB`,
        mobile.oversizedImagesKb,
        true
      )
    );
  }

  if (
    !metaDescriptionPresent
  ) {
    findings.push(
      finding(
        "meta_description",
        "content",
        "info",
        "Meta description",
        "No meta description was detected on the audited page.",
        "missing",
        true
      )
    );
  }

  if (!hasPrivacyLink) {
    findings.push(
      finding(
        "privacy_link_presence",
        "legal_presence",
        "info",
        "Privacy link presence",
        "No privacy/data-protection link was found in the audited page links.",
        "not found",
        false
      )
    );
  }

  if (!hasImpressumLink) {
    findings.push(
      finding(
        "imprint_link_presence",
        "legal_presence",
        "info",
        "Imprint link presence",
        "No imprint/impressum link was found in the audited page links.",
        "not found",
        false
      )
    );
  }

  const hook =
    chooseHook(findings);

  return {
    auditVersion:
      AUDIT_VERSION,

    websiteUrl:
      finalUrl.toString(),

    mobileScore:
      mobile?.score ?? null,

    desktopScore:
      desktop?.score ?? null,

    lcpMs:
      mobile?.lcpMs != null
        ? Math.round(
            mobile.lcpMs
          )
        : null,

    cls:
      mobile?.cls ?? null,

    tbtMs:
      mobile?.tbtMs != null
        ? Math.round(
            mobile.tbtMs
          )
        : null,

    hasViewport,
    httpsValid,
    httpRedirectsToHttps,
    hasImpressumLink,
    hasPrivacyLink,
    hasContactForm,
    contactFormReachable,
    contactFormUrl,
    brokenLinkCount,
    footerYear,
    metaDescriptionPresent,
    cms,

    oversizedImagesKb:
      mobile
        ?.oversizedImagesKb ??
      null,

    findings,
    hook,

    raw: {
      checkedInternalLinks:
        internalLinks.map(String),

      contactFormUrl,

      pageSpeed: {
        mobile:
          mobile?.raw ?? null,

        desktop:
          desktop?.raw ?? null,

        configured:
          Boolean(
            process.env
              .GOOGLE_PAGESPEED_API_KEY
          ),
      },
    },
  };
}

function fromRow(
  row: any
): PersistedEvidenceAudit {
  return {
    id: row.id,

    createdAt:
      row.created_at,

    auditVersion:
      row.audit_version,

    websiteUrl:
      row.website_url,

    mobileScore:
      row.mobile_score,

    desktopScore:
      row.desktop_score,

    lcpMs:
      row.lcp_ms,

    cls:
      row.cls === null
        ? null
        : Number(row.cls),

    tbtMs:
      row.tbt_ms,

    hasViewport:
      row.has_viewport,

    httpsValid:
      row.https_valid,

    httpRedirectsToHttps:
      row.http_redirects_to_https,

    hasImpressumLink:
      row.has_impressum_link,

    hasPrivacyLink:
      row.has_privacy_link,

    hasContactForm:
      row.has_contact_form,

    contactFormReachable:
      row.contact_form_reachable,

    contactFormUrl:
      typeof row
        .raw_results_json
        ?.contactFormUrl ===
      "string"
        ? row
            .raw_results_json
            .contactFormUrl
        : null,

    brokenLinkCount:
      row.broken_link_count,

    footerYear:
      row.footer_year,

    metaDescriptionPresent:
      row.meta_description_present,

    cms: row.cms,

    oversizedImagesKb:
      row.oversized_images_kb,

    findings:
      Array.isArray(
        row.findings
      )
        ? row.findings
        : [],

    hook: {
      category:
        row.hook_category,

      strength: [
        0,
        1,
        2,
        3,
      ].includes(
        Number(
          row.hook_strength
        )
      )
        ? (Number(
            row.hook_strength
          ) as 0 | 1 | 2 | 3)
        : 0,

      value:
        row.hook_value,

      evidence:
        row.hook_evidence,

      sentence:
        row.hook_sentence,
    },

    raw:
      row.raw_results_json &&
      typeof row.raw_results_json ===
        "object"
        ? row.raw_results_json
        : {},
  };
}

export async function getOrRunEvidenceAudit(
  input: {
    supabase: SupabaseClient;
    userId: string;
    leadId: string;
    websiteUrl: string;
    force?: boolean;
  }
): Promise<PersistedEvidenceAudit> {
  if (!input.force) {
    const cutoff = new Date(
      Date.now() - CACHE_MS
    ).toISOString();

    const { data } =
      await input.supabase
        .from("lead_audits")
        .select("*")
        .eq(
          "user_id",
          input.userId
        )
        .eq(
          "lead_id",
          input.leadId
        )
        .eq(
          "audit_version",
          AUDIT_VERSION
        )
        .gte(
          "created_at",
          cutoff
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (data) {
      return fromRow(data);
    }
  }

  const audit =
    await runEvidenceAudit(
      input.websiteUrl
    );

  const { data, error } =
    await input.supabase
      .from("lead_audits")
      .insert({
        user_id: input.userId,
        lead_id: input.leadId,
        website_url:
          audit.websiteUrl,
        audit_version:
          audit.auditVersion,

        mobile_score:
          audit.mobileScore,

        desktop_score:
          audit.desktopScore,

        lcp_ms:
          audit.lcpMs,

        cls:
          audit.cls,

        tbt_ms:
          audit.tbtMs,

        has_viewport:
          audit.hasViewport,

        https_valid:
          audit.httpsValid,

        http_redirects_to_https:
          audit.httpRedirectsToHttps,

        has_impressum_link:
          audit.hasImpressumLink,

        has_privacy_link:
          audit.hasPrivacyLink,

        has_contact_form:
          audit.hasContactForm,

        contact_form_reachable:
          audit.contactFormReachable,

        broken_link_count:
          audit.brokenLinkCount,

        footer_year:
          audit.footerYear,

        meta_description_present:
          audit.metaDescriptionPresent,

        cms:
          audit.cms,

        oversized_images_kb:
          audit.oversizedImagesKb,

        findings:
          audit.findings,

        raw_results_json:
          audit.raw,

        hook_category:
          audit.hook.category,

        hook_strength:
          audit.hook.strength,

        hook_value:
          audit.hook.value,

        hook_evidence:
          audit.hook.evidence,

        hook_sentence:
          audit.hook.sentence,
      })
      .select("*")
      .single();

  if (error || !data) {
    throw new Error(
      error?.message ??
        "Evidence audit could not be saved."
    );
  }

  return fromRow(data);
}