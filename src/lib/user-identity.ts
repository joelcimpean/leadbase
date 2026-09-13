export type LeadbaseUserIdentity = {
  fullName: string;
  senderName: string;
  outreachRole: string;
  company: string;
  website: string;
  replyEmail: string;
  signature: string;
  location: string;
  phoneCountryCode: string;
  phone: string;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readLeadbaseUserIdentity(
  metadata: Record<string, unknown> | null | undefined,
  accountEmail?: string | null,
): LeadbaseUserIdentity {
  const meta = metadata ?? {};
  const profile = record(meta.leadbase_profile);
  const fullName =
    cleanString(profile.fullName) ||
    cleanString(meta.full_name) ||
    cleanString(meta.name) ||
    cleanString(meta.fullName);
  const senderName = cleanString(profile.senderName) || fullName;
  const outreachRole = cleanString(profile.outreachRole);
  const company = cleanString(profile.company);
  const website = cleanString(profile.website);
  const replyEmail = cleanString(profile.replyEmail) || cleanString(accountEmail);
  const savedSignature = cleanString(profile.signature);

  const fallbackSignature = [
    senderName,
    outreachRole,
    [website, replyEmail].filter(Boolean).join(" · "),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    fullName,
    senderName,
    outreachRole,
    company,
    website,
    replyEmail,
    signature: savedSignature || fallbackSignature,
    location: cleanString(profile.location),
    phoneCountryCode: cleanString(profile.phoneCountryCode),
    phone: cleanString(profile.phone),
  };
}

export function displaySenderName(identity: LeadbaseUserIdentity) {
  return identity.senderName || identity.fullName || identity.replyEmail || "Leadbase";
}
