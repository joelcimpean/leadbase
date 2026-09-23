export type LeadbasePublicIdentityMode = "logo" | "avatar" | "none";
export type LeadbaseClientPreviewCtaMode = "email" | "booking" | "both";

export type LeadbaseBrandKit = {
  brandColor: string;
  logoUrl: string | null;
  logoPath: string | null;
  identityMode: LeadbasePublicIdentityMode;
  ctaMode: LeadbaseClientPreviewCtaMode;
  bookingUrl: string;
  bookingProviderLabel: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeBrandColor(value: unknown) {
  const candidate = string(value).toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : "#002BBA";
}

export function normalizePublicIdentityMode(value: unknown): LeadbasePublicIdentityMode {
  return value === "logo" || value === "avatar" || value === "none" ? value : "avatar";
}

export function normalizeClientPreviewCtaMode(value: unknown): LeadbaseClientPreviewCtaMode {
  return value === "email" || value === "booking" || value === "both" ? value : "email";
}

export function normalizeHttpsUrl(value: unknown) {
  const candidate = string(value);
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function readableTextColor(background: string) {
  const normalized = normalizeBrandColor(background).slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const channel = (value: number) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
  return luminance > 0.49 ? "#0B0C0E" : "#FFFFFF";
}

export function readLeadbaseBrandKit(
  metadata: Record<string, unknown> | null | undefined,
): LeadbaseBrandKit {
  const meta = metadata ?? {};
  const brandKit = record(meta.leadbase_brand_kit);
  const proposalBranding = record(meta.leadbase_proposal_branding);
  const fallbackLogoUrl = string(proposalBranding.logoUrl) || null;
  const fallbackLogoPath = string(proposalBranding.logoPath) || null;

  const logoUrl = string(brandKit.logoUrl) || fallbackLogoUrl;
  const logoPath = string(brandKit.logoPath) || fallbackLogoPath;
  const requestedIdentityMode = normalizePublicIdentityMode(brandKit.identityMode);
  const identityMode = requestedIdentityMode === "logo" && !logoUrl ? "avatar" : requestedIdentityMode;

  return {
    brandColor: normalizeBrandColor(brandKit.brandColor || proposalBranding.accentColor),
    logoUrl,
    logoPath,
    identityMode,
    ctaMode: normalizeClientPreviewCtaMode(brandKit.ctaMode),
    bookingUrl: normalizeHttpsUrl(brandKit.bookingUrl),
    bookingProviderLabel: string(brandKit.bookingProviderLabel).slice(0, 80),
  };
}
