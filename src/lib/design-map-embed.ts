/* =========================================================
   TRUSTED MAP EMBEDS

   Generated Leadbase designs are normally stripped of every
   iframe. A real location section is the one narrow exception.

   We temporarily protect ONLY trusted Google Maps / OSM embeds,
   let the caller run its normal HTML sanitizer, then restore a
   normalized iframe. Everything else remains untrusted and gets
   removed by the caller's existing iframe sanitizer.
========================================================= */

export type ProtectedMapEmbeds = {
  html: string;
  restore: (html: string) => string;
  count: number;
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readAttribute(raw: string, name: string) {
  const pattern = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );

  const match = raw.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function cleanClassName(value: string | null) {
  if (!value) return null;
  const cleaned = value.replace(/[^A-Za-z0-9_:\-\s\[\]\/%.#()]+/g, " ").trim();
  return cleaned.slice(0, 500) || null;
}

function cleanStyle(value: string | null) {
  if (!value) return null;

  const cleaned = value
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "")
    .slice(0, 1200)
    .trim();

  return cleaned || null;
}

function normalizeTrustedMapUrl(raw: string | null) {
  if (!raw) return null;

  try {
    const decoded = decodeHtmlEntities(raw.trim());
    const url = new URL(decoded);

    if (url.protocol !== "https:") return null;

    const hostname = url.hostname.toLowerCase();
    const googleHosts = new Set([
      "google.com",
      "www.google.com",
      "maps.google.com",
    ]);

    if (googleHosts.has(hostname)) {
      const isEmbedPath =
        url.pathname.startsWith("/maps/embed") ||
        url.pathname === "/maps" ||
        url.pathname.startsWith("/maps/place") ||
        url.pathname.startsWith("/maps/search");

      const isEmbedQuery =
        url.searchParams.get("output") === "embed" ||
        url.pathname.startsWith("/maps/embed");

      if (!isEmbedPath || !isEmbedQuery) return null;
      return url.toString();
    }

    if (
      hostname === "www.openstreetmap.org" &&
      url.pathname === "/export/embed.html"
    ) {
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeTrustedMapFrame(raw: string) {
  const src = normalizeTrustedMapUrl(readAttribute(raw, "src"));
  if (!src) return null;

  const title =
    readAttribute(raw, "title")?.trim().slice(0, 160) ||
    "Location map";

  const className = cleanClassName(readAttribute(raw, "class"));
  const style = cleanStyle(readAttribute(raw, "style"));
  const width = readAttribute(raw, "width")?.replace(/[^0-9.%]/g, "").slice(0, 12);
  const height = readAttribute(raw, "height")?.replace(/[^0-9.%]/g, "").slice(0, 12);

  const attrs = [
    `src="${escapeHtmlAttribute(src)}"`,
    `title="${escapeHtmlAttribute(title)}"`,
    `loading="lazy"`,
    `referrerpolicy="no-referrer-when-downgrade"`,
    `data-leadbase-map-embed="true"`,
  ];

  if (className) attrs.push(`class="${escapeHtmlAttribute(className)}"`);
  if (style) attrs.push(`style="${escapeHtmlAttribute(style)}"`);
  if (width) attrs.push(`width="${escapeHtmlAttribute(width)}"`);
  if (height) attrs.push(`height="${escapeHtmlAttribute(height)}"`);

  return `<iframe ${attrs.join(" ")} allowfullscreen></iframe>`;
}

export function protectTrustedMapEmbeds(value: string): ProtectedMapEmbeds {
  const frames: string[] = [];

  const html = value.replace(
    /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
    (raw) => {
      const normalized = normalizeTrustedMapFrame(raw);
      if (!normalized) return raw;

      const index = frames.length;
      frames.push(normalized);
      return `<!--LEADBASE_TRUSTED_MAP_${index}-->`;
    }
  );

  return {
    html,
    count: frames.length,
    restore(sanitizedHtml: string) {
      let result = sanitizedHtml;

      for (let index = 0; index < frames.length; index += 1) {
        result = result.replace(
          `<!--LEADBASE_TRUSTED_MAP_${index}-->`,
          frames[index] ?? ""
        );
      }

      return result;
    },
  };
}
