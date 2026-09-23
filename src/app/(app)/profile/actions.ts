"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeBillingCurrency,
  normalizeLeadbaseCurrency,
  type LeadbaseBillingCurrency,
  type LeadbaseCurrencyMode,
} from "@/lib/account-currency";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeBrandColor,
  normalizeClientPreviewCtaMode,
  normalizeHttpsUrl,
  normalizePublicIdentityMode,
  readLeadbaseBrandKit,
  type LeadbaseClientPreviewCtaMode,
  type LeadbasePublicIdentityMode,
} from "@/lib/brand-kit";
import {
  LEADBASE_CREDIT_TOPUPS,
  customCreditPrice,
  customCreditPriceEur,
  getPublicPlan,
  normalizeCustomCredits,
  normalizeTierIndex,
  priceForTier,
  priceForTopup,
  type LeadbaseBillingInterval,
  type LeadbasePublicPlanId,
} from "@/lib/public-plans";

export type LeadbaseProfileData = {
  senderName: string;
  outreachRole: string;
  replyEmail: string;
  website: string;
  signature: string;
  company: string;
  focus: string;
  description: string;
  fullName: string;
  phoneCountryCode: string;
  phone: string;
  location: string;
  currency: string;
  currencyMode: LeadbaseCurrencyMode;
};

export type ProposalTemplateId =
  | "signature"
  | "minimal"
  | "kontur"
  | "kanzlei"
  | "prisma"
  | "atelier"
  | "kompakt";

export type ProposalBrandingDefaults = {
  accentColor: string;
  logoUrl: string | null;
  logoPath: string | null;
  templateId: ProposalTemplateId;
  identityMode: LeadbasePublicIdentityMode;
  ctaMode: LeadbaseClientPreviewCtaMode;
  bookingUrl: string;
  bookingProviderLabel: string;
};

export type AccountPlanSelection = {
  planId: LeadbasePublicPlanId | "free";
  tierIndex: number;
  billing: LeadbaseBillingInterval;
  billingCurrency?: LeadbaseBillingCurrency;
  checkoutStatus: "free" | "pending_checkout" | "active";
  credits: number | null;
  price?: number;
  priceEur: number;
  priceUsd?: number;
};

const PROPOSAL_TEMPLATE_IDS = new Set<ProposalTemplateId>([
  "signature",
  "minimal",
  "kontur",
  "kanzlei",
  "prisma",
  "atelier",
  "kompakt",
]);

type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeColor(value: string) {
  const trimmed = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(trimmed) ? trimmed : "#002BBA";
}

function normalizeProposalTemplateId(value: unknown): ProposalTemplateId {
  return typeof value === "string" && PROPOSAL_TEMPLATE_IDS.has(value as ProposalTemplateId)
    ? (value as ProposalTemplateId)
    : "signature";
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return null;
}

async function authenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not signed in.");
  return { supabase, user };
}

async function appOrigin() {
  const configured = process.env.LEADBASE_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  if (!host) return "http://localhost:3000";
  return `${protocol}://${host}`;
}

async function updateUserMetadata(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; user_metadata?: Record<string, unknown> | null },
  patch: Record<string, unknown>,
) {
  const current = (user.user_metadata ?? {}) as Record<string, unknown>;

  // Normal profile/account edits belong to the authenticated user. Prefer the
  // scoped auth client so profile saving never depends on exposing an admin
  // secret in local/dev environments.
  const { error: selfUpdateError } = await supabase.auth.updateUser({
    data: { ...current, ...patch },
  });

  if (!selfUpdateError) return;

  // Server-side fallback for production environments where an auth policy or
  // provider quirk rejects the self-update. This still targets the same user id.
  try {
    const admin = createAdminClient();
    const { data, error: loadError } = await admin.auth.admin.getUserById(user.id);
    if (loadError || !data.user) throw new Error(loadError?.message || "Could not load the account.");
    const adminCurrent = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...adminCurrent, ...patch },
    });
    if (updateError) throw new Error(updateError.message);
  } catch (adminError) {
    const adminMessage = adminError instanceof Error ? adminError.message : "server fallback failed";
    throw new Error(`${selfUpdateError.message} (${adminMessage})`);
  }
}

export async function saveProfile(
  input: LeadbaseProfileData
): Promise<ActionResult<{ profile: LeadbaseProfileData }>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const fullName = clean(input.fullName, 160);
    const location = clean(input.location, 180);

    if (!fullName) {
      return { ok: false, error: "Full name is required." };
    }
    if (!location) {
      return { ok: false, error: "Location is required." };
    }

    const { data: gmailConnection } = await supabase
      .from("gmail_connections")
      .select("email_address")
      .eq("user_id", user.id)
      .maybeSingle();

    const replyEmail =
      clean(gmailConnection?.email_address, 254) ||
      clean(user.email, 254);

    const currencyMode: LeadbaseCurrencyMode = "manual";
    const currency = normalizeLeadbaseCurrency(input.currency);

    const profile: LeadbaseProfileData = {
      senderName: clean(input.senderName, 120) || fullName,
      outreachRole: clean(input.outreachRole, 160),
      replyEmail,
      website: clean(input.website, 300),
      signature: clean(input.signature, 2000),
      company: clean(input.company, 180),
      focus: clean(input.focus, 240),
      description: clean(input.description, 1200),
      fullName,
      phoneCountryCode: clean(input.phoneCountryCode, 8),
      phone: clean(input.phone, 50),
      location,
      currency,
      currencyMode,
    };

    await updateUserMetadata(supabase, user, {
      full_name: profile.fullName,
      name: profile.fullName,
      leadbase_profile: profile,
      leadbase_profile_completed: true,
      leadbase_onboarding_completed: true,
    });

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { ok: true, data: { profile } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Profile could not be saved." };
  }
}

export async function saveAvatar(formData: FormData): Promise<ActionResult<{ avatarUrl: string }>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "No profile image selected." };
    }
    if (file.size > 3 * 1024 * 1024) {
      return { ok: false, error: "The profile image may be up to 3 MB." };
    }
    const extension = extensionFor(file.type);
    if (!extension) return { ok: false, error: "Please use PNG, JPG or WebP." };

    const admin = createAdminClient();
    const path = `${user.id}/profile/avatar.${extension}`;
    const previousPath = typeof user.user_metadata?.avatar_path === "string" ? user.user_metadata.avatar_path : null;
    if (previousPath && previousPath !== path) {
      await admin.storage.from("proposal-assets").remove([previousPath]);
    }

    const { error: uploadError } = await admin.storage.from("proposal-assets").upload(
      path,
      Buffer.from(await file.arrayBuffer()),
      { contentType: file.type, upsert: true, cacheControl: "3600" }
    );
    if (uploadError) return { ok: false, error: uploadError.message };

    const { data } = admin.storage.from("proposal-assets").getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    await updateUserMetadata(supabase, user, { avatar_url: avatarUrl, avatar_path: path });

    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { ok: true, data: { avatarUrl } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Profile image could not be saved." };
  }
}

export async function saveProposalBranding(
  formData: FormData
): Promise<ActionResult<ProposalBrandingDefaults>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const currentKit = readLeadbaseBrandKit((user.user_metadata ?? {}) as Record<string, unknown>);
    const currentProposal = (user.user_metadata?.leadbase_proposal_branding ?? {}) as Record<string, unknown>;
    let logoUrl = currentKit.logoUrl;
    let logoPath = currentKit.logoPath;
    const accentColor = normalizeBrandColor(formData.get("accentColor"));
    const templateId = normalizeProposalTemplateId(formData.get("templateId"));
    const identityMode = normalizePublicIdentityMode(formData.get("identityMode"));
    const ctaMode = normalizeClientPreviewCtaMode(formData.get("ctaMode"));
    const rawBookingUrl = clean(formData.get("bookingUrl"), 500);
    const bookingUrl = normalizeHttpsUrl(rawBookingUrl);
    const bookingProviderLabel = clean(formData.get("bookingProviderLabel"), 80);
    const removeLogo = String(formData.get("removeLogo") ?? "") === "1";
    const file = formData.get("logo");
    const admin = createAdminClient();

    if ((ctaMode === "booking" || ctaMode === "both") && !bookingUrl) {
      return { ok: false, error: "Add a valid HTTPS booking link before enabling booking." };
    }

    if (removeLogo && logoPath) {
      await admin.storage.from("proposal-assets").remove([logoPath]);
      logoPath = null;
      logoUrl = null;
    }

    if (file instanceof File && file.size > 0) {
      if (file.size > 2 * 1024 * 1024) return { ok: false, error: "The logo may be up to 2 MB." };
      const extension = extensionFor(file.type);
      if (!extension) return { ok: false, error: "Please upload the logo as PNG, JPG or WebP." };
      const path = `${user.id}/profile/brand-kit-logo.${extension}`;
      if (logoPath && logoPath !== path) await admin.storage.from("proposal-assets").remove([logoPath]);
      const { error: uploadError } = await admin.storage.from("proposal-assets").upload(
        path,
        Buffer.from(await file.arrayBuffer()),
        { contentType: file.type, upsert: true, cacheControl: "3600" }
      );
      if (uploadError) return { ok: false, error: uploadError.message };
      const { data } = admin.storage.from("proposal-assets").getPublicUrl(path);
      logoPath = path;
      logoUrl = `${data.publicUrl}?v=${Date.now()}`;
    }

    if (identityMode === "logo" && !logoUrl) {
      return { ok: false, error: "Upload a logo before choosing Logo as your public identity." };
    }

    const branding: ProposalBrandingDefaults = {
      accentColor,
      logoUrl,
      logoPath,
      templateId,
      identityMode,
      ctaMode,
      bookingUrl,
      bookingProviderLabel,
    };

    const brandKit = {
      brandColor: accentColor,
      logoUrl,
      logoPath,
      identityMode,
      ctaMode,
      bookingUrl,
      bookingProviderLabel,
    };

    await updateUserMetadata(supabase, user, {
      leadbase_brand_kit: brandKit,
      leadbase_proposal_branding: {
        ...currentProposal,
        accentColor,
        logoUrl,
        logoPath,
        templateId,
      },
    });

    revalidatePath("/profile");
    revalidatePath("/leads", "layout");
    return { ok: true, data: branding };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Brand Kit could not be saved." };
  }
}


export async function saveAccountPlanSelection(input: {
  planId: LeadbasePublicPlanId;
  tierIndex: number;
  billing: LeadbaseBillingInterval;
  billingCurrency?: LeadbaseBillingCurrency;
}): Promise<ActionResult<AccountPlanSelection>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const plan = getPublicPlan(input.planId);
    if (!plan) return { ok: false, error: "Unknown plan." };
    const billing: LeadbaseBillingInterval = input.billing === "yearly" ? "yearly" : "monthly";
    const billingCurrency = normalizeBillingCurrency(input.billingCurrency);
    const tierIndex = normalizeTierIndex(plan, input.tierIndex);
    const tier = plan.tiers[tierIndex];
    if (!tier) return { ok: false, error: "Invalid plan tier." };

    const selection: AccountPlanSelection = {
      planId: plan.id,
      tierIndex,
      billing,
      billingCurrency,
      checkoutStatus: "pending_checkout",
      credits: tier.credits,
      price: priceForTier(tier, billing, billingCurrency),
      priceEur: priceForTier(tier, billing, "EUR"),
      priceUsd: priceForTier(tier, billing, "USD"),
    };
    await updateUserMetadata(supabase, user, {
      leadbase_plan_selection: selection,
      leadbase_plan_requested_at: new Date().toISOString(),
      leadbase_billing_currency: billingCurrency,
    });

    revalidatePath("/profile");
    return {
      ok: true,
      data: selection,
      message: billing === "yearly"
        ? "Plan selection saved. The annual plan activates after checkout."
        : "Plan selection saved. The plan activates after checkout.",
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Plan selection could not be saved." };
  }
}

export async function requestCreditTopup(input: {
  presetId: string;
  credits: number;
  billingCurrency?: LeadbaseBillingCurrency;
}): Promise<ActionResult<{ presetId: string; credits: number; billingCurrency: LeadbaseBillingCurrency; price: number | null; priceEur: number | null }>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const preset = LEADBASE_CREDIT_TOPUPS.find((item) => item.id === input.presetId);
    const billingCurrency = normalizeBillingCurrency(input.billingCurrency);
    let credits: number;
    let priceEur: number | null;
    let price: number | null;
    let presetId: string;

    if (preset) {
      presetId = preset.id;
      credits = preset.credits;
      priceEur = preset.priceEur;
      price = priceForTopup(preset, billingCurrency);
    } else if (input.presetId === "custom") {
      const normalized = normalizeCustomCredits(input.credits);
      if (normalized === null) {
        return { ok: false, error: "Custom credits must be between 500 and 50,000 in steps of 100." };
      }
      credits = normalized;
      presetId = "custom";
      priceEur = customCreditPriceEur(credits);
      price = customCreditPrice(credits, billingCurrency);
    } else {
      return { ok: false, error: "Unknown credit package." };
    }

    const request = {
      presetId,
      credits,
      billingCurrency,
      price,
      priceEur,
      checkoutStatus: "pending_checkout" as const,
      requestedAt: new Date().toISOString(),
    };
    await updateUserMetadata(supabase, user, {
      leadbase_pending_credit_topup: request,
      leadbase_billing_currency: billingCurrency,
    });

    revalidatePath("/profile");
    return {
      ok: true,
      data: { presetId, credits, billingCurrency, price, priceEur },
      message: "Credit package selected. Credits are added only after a successful checkout.",
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Credit request could not be saved." };
  }
}

export async function saveBillingCurrencyPreference(
  value: LeadbaseBillingCurrency,
): Promise<ActionResult<{ billingCurrency: LeadbaseBillingCurrency }>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const billingCurrency = normalizeBillingCurrency(value);
    await updateUserMetadata(supabase, user, { leadbase_billing_currency: billingCurrency });
    revalidatePath("/profile");
    return { ok: true, data: { billingCurrency } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Billing currency could not be saved." };
  }
}

export async function changeAccountEmail(
  nextEmail: string,
): Promise<ActionResult<{ pendingEmail: string | null; activeEmail: string }>> {
  try {
    const { supabase, user } = await authenticatedUser();
    const email = clean(nextEmail, 254).toLowerCase();
    const currentEmail = clean(user.email, 254).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
    if (email === currentEmail) return { ok: false, error: "That is already your account email." };

    const origin = await appOrigin();
    const next = encodeURIComponent("/profile?security=email-verified");
    const { data, error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${origin}/auth/callback?next=${next}` },
    );
    if (error) return { ok: false, error: error.message };

    const activeEmail = clean(data.user?.email, 254).toLowerCase() || currentEmail;
    const pendingEmail = activeEmail === email ? null : email;
    await updateUserMetadata(supabase, data.user ?? user, {
      leadbase_pending_email_change: pendingEmail
        ? { email: pendingEmail, requestedAt: new Date().toISOString() }
        : null,
    });

    revalidatePath("/profile");
    return {
      ok: true,
      data: { pendingEmail, activeEmail },
      message: pendingEmail
        ? "Verification sent. Your current email stays active until the new address is confirmed."
        : "Account email updated.",
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Email could not be changed." };
  }
}

export async function requestPasswordChange(): Promise<ActionResult> {
  try {
    const { supabase, user } = await authenticatedUser();
    const email = clean(user.email, 254).toLowerCase();
    if (!email) return { ok: false, error: "This account has no email address for password recovery." };

    const origin = await appOrigin();
    const next = encodeURIComponent("/auth/reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=${next}`,
    });
    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      message: "A secure password-change link was sent to your account email.",
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Password-change email could not be sent." };
  }
}
