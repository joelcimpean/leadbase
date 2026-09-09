/* =========================================================
   LEADBASE USAGE / PLAN FOUNDATION

   Deliberately contains NO invented pricing or quotas.
   Product limits can be configured later without changing
   every AI/API route again.
========================================================= */

export const LEADBASE_METERED_ACTIONS = [
  "lead_analysis",
  "ai_lead_search",
  "design_generation",
  "design_motion",
  "outreach_generation",
  "reply_generation",
  "proposal_autofill",
  "competitor_research",
] as const;

export type LeadbaseMeteredAction =
  (typeof LEADBASE_METERED_ACTIONS)[number];

export const LEADBASE_FEATURES = [
  "bulk_analysis",
  "bulk_design",
  "bulk_gif",
  "enhance_motion",
  "gmail",
  "followups",
  "proposals",
  "analytics",
  "competitor_research",
  "ai_proposal_autofill",
] as const;

export type LeadbaseFeature =
  (typeof LEADBASE_FEATURES)[number];

export type LeadbasePlanDefinition = {
  id: string;
  name: string;
  monthlyIncludedTokens: number | null;
  allowTokenTopups: boolean;
  features: Partial<Record<LeadbaseFeature, boolean>>;
  actionLimits: Partial<Record<LeadbaseMeteredAction, number | null>>;
};

export type LeadbaseUsageSnapshot = {
  planId: string;
  monthlyIncludedTokens: number | null;
  monthlyUsedTokens: number;
  purchasedTokenBalance: number;
  actionUsage: Partial<Record<LeadbaseMeteredAction, number>>;
};

export type UsageDecision = {
  allowed: boolean;
  reason: "ok" | "feature_disabled" | "action_limit" | "token_limit";
  remainingTokens: number | null;
};

/**
 * Development mode is intentionally unlimited until the real
 * commercial plan matrix is approved. This prevents accidental
 * self-lockout while the app is still being built.
 */
export const DEVELOPMENT_PLAN: LeadbasePlanDefinition = {
  id: "development",
  name: "Development",
  monthlyIncludedTokens: null,
  allowTokenTopups: false,
  features: Object.fromEntries(
    LEADBASE_FEATURES.map((feature) => [feature, true])
  ) as Record<LeadbaseFeature, boolean>,
  actionLimits: {},
};

export function getRemainingTokens({
  plan,
  usage,
}: {
  plan: LeadbasePlanDefinition;
  usage: LeadbaseUsageSnapshot;
}) {
  if (plan.monthlyIncludedTokens === null) return null;

  return Math.max(
    0,
    plan.monthlyIncludedTokens -
      Math.max(0, usage.monthlyUsedTokens) +
      Math.max(0, usage.purchasedTokenBalance)
  );
}

export function canUseLeadbaseAction({
  plan,
  usage,
  feature,
  action,
  estimatedTokens = 0,
}: {
  plan: LeadbasePlanDefinition;
  usage: LeadbaseUsageSnapshot;
  feature?: LeadbaseFeature;
  action: LeadbaseMeteredAction;
  estimatedTokens?: number;
}): UsageDecision {
  const remainingTokens = getRemainingTokens({ plan, usage });

  if (feature && plan.features[feature] === false) {
    return {
      allowed: false,
      reason: "feature_disabled",
      remainingTokens,
    };
  }

  const actionLimit = plan.actionLimits[action];
  if (typeof actionLimit === "number") {
    const used = usage.actionUsage[action] ?? 0;
    if (used >= actionLimit) {
      return {
        allowed: false,
        reason: "action_limit",
        remainingTokens,
      };
    }
  }

  if (
    remainingTokens !== null &&
    estimatedTokens > remainingTokens
  ) {
    return {
      allowed: false,
      reason: "token_limit",
      remainingTokens,
    };
  }

  return {
    allowed: true,
    reason: "ok",
    remainingTokens,
  };
}
