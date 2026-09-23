import {
  minimumPlanForFeature,
  planAllowsFeature,
  type LeadbaseFeatureId,
  type LeadbasePlanId,
} from "@/lib/plan-entitlements";

export type LeadbaseAccessState =
  | { status: "available" }
  | { status: "no_credits"; cta: "buy_credits" }
  | { status: "plan_required"; minimumPlan: LeadbasePlanId; cta: "upgrade" }
  | { status: "free_demo_used"; cta: "upgrade" }
  | { status: "limit_reached"; limit: number; cta: "upgrade" }
  | { status: "temporarily_unavailable"; retryable: boolean }
  | { status: "in_progress" };

export function resolveFeatureAccess(input: {
  planId: LeadbasePlanId;
  feature: LeadbaseFeatureId;
  remainingCredits?: number | null;
  billable?: boolean;
  inProgress?: boolean;
  temporarilyUnavailable?: boolean;
}): LeadbaseAccessState {
  if (input.inProgress) return { status: "in_progress" };
  if (input.temporarilyUnavailable) {
    return { status: "temporarily_unavailable", retryable: true };
  }

  if (!planAllowsFeature(input.planId, input.feature)) {
    return {
      status: "plan_required",
      minimumPlan: minimumPlanForFeature(input.feature) ?? "starter",
      cta: "upgrade",
    };
  }

  if (input.billable && input.remainingCredits !== undefined && input.remainingCredits !== null && input.remainingCredits <= 0) {
    return { status: "no_credits", cta: "buy_credits" };
  }

  return { status: "available" };
}

export function resolveFreeLeadSlotAccess(input: {
  planId: LeadbasePlanId;
  savedLeadCount: number;
  limit: number;
}): LeadbaseAccessState {
  if (input.planId !== "free" || input.savedLeadCount < input.limit) {
    return { status: "available" };
  }

  return {
    status: "limit_reached",
    limit: input.limit,
    cta: "upgrade",
  };
}
