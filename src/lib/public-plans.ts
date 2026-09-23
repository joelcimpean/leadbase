import { type LeadbaseBillingCurrency } from "@/lib/account-currency";
import {
  LEADBASE_PLAN_ENTITLEMENTS,
  type LeadbaseBillingInterval,
  type LeadbasePublicPlanId,
} from "@/lib/plan-entitlements";

export type LeadbasePlanTier = {
  credits: number;
  monthlyPriceEur: number;
  monthlyPriceUsd: number;
};

export type LeadbasePublicPlan = {
  id: LeadbasePublicPlanId;
  name: string;
  recommended?: boolean;
  includedLeads: number;
  redesignsLabel: string;
  redesignsLabelEn: string;
  extra: string;
  extraEn: string;
  tiers: readonly LeadbasePlanTier[];
};

export {
  LEADBASE_FEATURE_CATALOG,
  LEADBASE_PLAN_ENTITLEMENTS,
  getPlanEntitlements,
  getPlanLimit,
  minimumPlanForFeature,
  minimumPlanForModel,
  normalizePlanId,
  planAllowsAiRequest,
  planAllowsFeature,
  planFeatureForAiFeature,
} from "@/lib/plan-entitlements";

export type {
  LeadbaseAiModel,
  LeadbaseBillingInterval,
  LeadbaseDesignReasoning,
  LeadbaseFeatureCatalogEntry,
  LeadbaseFeatureId,
  LeadbasePlanEntitlements,
  LeadbasePlanId,
  LeadbasePlanLimits,
  LeadbasePublicPlanId,
} from "@/lib/plan-entitlements";

export const LEADBASE_FREE_SIGNUP_CREDITS = 50;
export const LEADBASE_CREDITS_PER_PROVIDER_USD = 250;
export const LEADBASE_YEARLY_MONTHS_CHARGED = 10;
export const LEADBASE_YEARLY_DISCOUNT_PERCENT = Math.round((1 - LEADBASE_YEARLY_MONTHS_CHARGED / 12) * 100);
export const LEADBASE_CUSTOM_CREDITS_MIN = 500;
export const LEADBASE_CUSTOM_CREDITS_MAX = 50_000;
export const LEADBASE_CUSTOM_CREDITS_STEP = 100;

export const LEADBASE_PUBLIC_PLANS: readonly LeadbasePublicPlan[] = [
  {
    id: "starter",
    name: "Starter",
    includedLeads: LEADBASE_PLAN_ENTITLEMENTS.starter.limits.leadMonthlyLimit,
    redesignsLabel: `bis ${LEADBASE_PLAN_ENTITLEMENTS.starter.limits.redesignMonthlyLimit}`,
    redesignsLabelEn: `up to ${LEADBASE_PLAN_ENTITLEMENTS.starter.limits.redesignMonthlyLimit}`,
    extra:
      "Bulk Actions eingeschränkt · Sol Design Model Standard · ~100 Mails/Tag",
    extraEn:
      "Limited bulk actions · Sol design model Standard · ~100 emails/day",
    tiers: [
      { credits: 500, monthlyPriceEur: 29, monthlyPriceUsd: 29 },
      { credits: 1_000, monthlyPriceEur: 45, monthlyPriceUsd: 45 },
      { credits: 2_000, monthlyPriceEur: 69, monthlyPriceUsd: 69 },
      { credits: 3_000, monthlyPriceEur: 89, monthlyPriceUsd: 89 },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    recommended: true,
    includedLeads: LEADBASE_PLAN_ENTITLEMENTS.pro.limits.leadMonthlyLimit,
    redesignsLabel: `bis ${LEADBASE_PLAN_ENTITLEMENTS.pro.limits.redesignMonthlyLimit}`,
    redesignsLabelEn: `up to ${LEADBASE_PLAN_ENTITLEMENTS.pro.limits.redesignMonthlyLimit}`,
    extra:
      "Bulk Design / GIF · Competitor Research · Sol High · ~300 Mails/Tag",
    extraEn:
      "Bulk design / GIF · Competitor research · Sol High · ~300 emails/day",
    tiers: [
      { credits: 1_500, monthlyPriceEur: 69, monthlyPriceUsd: 69 },
      { credits: 3_000, monthlyPriceEur: 109, monthlyPriceUsd: 109 },
      { credits: 5_000, monthlyPriceEur: 149, monthlyPriceUsd: 149 },
      { credits: 8_000, monthlyPriceEur: 199, monthlyPriceUsd: 199 },
    ],
  },
  {
    id: "scale",
    name: "Scale",
    includedLeads: LEADBASE_PLAN_ENTITLEMENTS.scale.limits.leadMonthlyLimit,
    redesignsLabel: `bis ${LEADBASE_PLAN_ENTITLEMENTS.scale.limits.redesignMonthlyLimit}`,
    redesignsLabelEn: `up to ${LEADBASE_PLAN_ENTITLEMENTS.scale.limits.redesignMonthlyLimit}`,
    extra:
      "Alles aus Pro · GPT-6 Astra · höchste Bulk-Größen · ~500 Mails/Tag",
    extraEn:
      "Everything in Pro · GPT-6 Astra · highest bulk limits · ~500 emails/day",
    tiers: [
      { credits: 4_000, monthlyPriceEur: 149, monthlyPriceUsd: 149 },
      { credits: 8_000, monthlyPriceEur: 239, monthlyPriceUsd: 239 },
      { credits: 15_000, monthlyPriceEur: 379, monthlyPriceUsd: 379 },
      { credits: 25_000, monthlyPriceEur: 549, monthlyPriceUsd: 549 },
    ],
  },
] as const;

export const LEADBASE_CREDIT_TOPUPS = [
  { id: "small", credits: 500, priceEur: 19, priceUsd: 19 },
  { id: "medium", credits: 1_500, priceEur: 49, priceUsd: 49 },
  { id: "large", credits: 4_000, priceEur: 119, priceUsd: 119 },
] as const;

export function getPublicPlan(planId: unknown) {
  return LEADBASE_PUBLIC_PLANS.find((plan) => plan.id === planId) ?? null;
}

export function normalizeTierIndex(plan: LeadbasePublicPlan, value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(plan.tiers.length - 1, Math.round(number)));
}

export function priceForTier(
  tier: LeadbasePlanTier,
  billing: LeadbaseBillingInterval,
  currency: LeadbaseBillingCurrency = "USD",
) {
  const monthly = currency === "EUR" ? tier.monthlyPriceEur : tier.monthlyPriceUsd;
  return billing === "yearly" ? monthly * LEADBASE_YEARLY_MONTHS_CHARGED : monthly;
}

export function priceForTopup(
  pack: { priceEur: number; priceUsd: number },
  currency: LeadbaseBillingCurrency = "USD",
) {
  return currency === "EUR" ? pack.priceEur : pack.priceUsd;
}


export function normalizeCustomCredits(value: unknown) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return null;
  if (number < LEADBASE_CUSTOM_CREDITS_MIN || number > LEADBASE_CUSTOM_CREDITS_MAX) return null;
  if (number % LEADBASE_CUSTOM_CREDITS_STEP !== 0) return null;
  return number;
}

export function customCreditPriceEur(value: unknown) {
  const credits = normalizeCustomCredits(value);
  if (credits === null) return null;

  // Smooth, monotonic pricing anchored to the existing public packs:
  // 500 = €19, 1,500 = €49, 4,000 = €119. Above 4,000 the
  // same marginal rate continues so custom packs stay profitable and
  // never become cheaper than a smaller amount of credits.
  if (credits <= 1_500) {
    return Math.round(19 + (credits - 500) * 0.03);
  }
  return Math.round(49 + (credits - 1_500) * 0.028);
}

export function customCreditPriceUsd(value: unknown) {
  // USD is the international default. Keep the same public numeric ladder
  // as EUR so pricing is predictable ($19 / $49 / $119 anchors).
  return customCreditPriceEur(value);
}

export function customCreditPrice(
  value: unknown,
  currency: LeadbaseBillingCurrency = "USD",
) {
  return currency === "EUR" ? customCreditPriceEur(value) : customCreditPriceUsd(value);
}

export function stripePlanLookupKey(
  planId: LeadbasePublicPlanId,
  credits: number,
  billing: LeadbaseBillingInterval,
) {
  return `leadbase_${planId}_${credits}_${billing}`;
}

export function stripeTopupLookupKey(credits: number) {
  return `leadbase_topup_${credits}`;
}
