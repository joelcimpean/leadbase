import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPlanEntitlements,
  normalizePlanId,
  planAllowsAiRequest,
  planAllowsFeature,
  type LeadbaseAiModel,
  type LeadbaseDesignReasoning,
  type LeadbaseFeatureId,
  type LeadbasePlanId,
} from "@/lib/plan-entitlements";

export type LeadbasePlanAccessSnapshot = {
  planId: LeadbasePlanId;
  storedPlanId: LeadbasePlanId;
  subscriptionStatus: string;
  entitlements: ReturnType<typeof getPlanEntitlements>;
};

export class LeadbasePlanAccessError extends Error {
  readonly code:
    | "FEATURE_NOT_INCLUDED"
    | "MODEL_NOT_INCLUDED"
    | "REASONING_NOT_INCLUDED";
  readonly planId: LeadbasePlanId;
  readonly feature: string | null;
  readonly model: string | null;

  constructor(input: {
    code: "FEATURE_NOT_INCLUDED" | "MODEL_NOT_INCLUDED" | "REASONING_NOT_INCLUDED";
    planId: LeadbasePlanId;
    feature?: string | null;
    model?: string | null;
  }) {
    super(
      `PLAN_ACCESS_DENIED:${input.code}:${input.planId}:${input.feature ?? "none"}:${input.model ?? "none"}`,
    );
    this.name = "LeadbasePlanAccessError";
    this.code = input.code;
    this.planId = input.planId;
    this.feature = input.feature ?? null;
    this.model = input.model ?? null;
  }
}

export async function getLeadbasePlanAccess(
  userId: string,
): Promise<LeadbasePlanAccessSnapshot> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_usage_accounts")
    .select("plan_id, subscription_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`PLAN_ACCESS_UNAVAILABLE:${error.message}`);
  }

  const storedPlanId = normalizePlanId(data?.plan_id);
  const subscriptionStatus = String(data?.subscription_status ?? "free");
  const paidActive = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const planId: LeadbasePlanId =
    storedPlanId === "free" || paidActive ? storedPlanId : "free";

  return {
    planId,
    storedPlanId,
    subscriptionStatus,
    entitlements: getPlanEntitlements(planId),
  };
}

export async function assertPlanFeatureAvailable(
  userId: string,
  feature: LeadbaseFeatureId,
) {
  const snapshot = await getLeadbasePlanAccess(userId);
  if (!planAllowsFeature(snapshot.planId, feature)) {
    throw new LeadbasePlanAccessError({
      code: "FEATURE_NOT_INCLUDED",
      planId: snapshot.planId,
      feature,
    });
  }
  return snapshot;
}

export async function assertPlanAiSelectionAvailable(
  userId: string,
  input: {
    feature: string;
    model?: LeadbaseAiModel | string | null;
    reasoningEffort?: LeadbaseDesignReasoning | string | null;
  },
) {
  const snapshot = await getLeadbasePlanAccess(userId);
  const decision = planAllowsAiRequest({
    planId: snapshot.planId,
    feature: input.feature,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
  });

  if (!decision.ok) {
    throw new LeadbasePlanAccessError({
      code: decision.reason,
      planId: snapshot.planId,
      feature: input.feature,
      model: input.model ?? null,
    });
  }

  return snapshot;
}

export function isPlanAccessError(error: unknown): error is LeadbasePlanAccessError {
  return error instanceof LeadbasePlanAccessError ||
    (error instanceof Error && error.message.startsWith("PLAN_ACCESS_DENIED:"));
}

export function planAccessMessage(
  error: unknown,
  language: "de" | "en" = "en",
) {
  if (!isPlanAccessError(error)) return null;

  const code = error instanceof LeadbasePlanAccessError
    ? error.code
    : ((error as Error).message.split(":")[1] as LeadbasePlanAccessError["code"] | undefined);

  if (code === "MODEL_NOT_INCLUDED") {
    return language === "de"
      ? "Dieses AI-Modell ist in deinem aktuellen Plan nicht enthalten."
      : "This AI model is not included in your current plan.";
  }
  if (code === "REASONING_NOT_INCLUDED") {
    return language === "de"
      ? "Diese Qualitätsstufe ist in deinem aktuellen Plan nicht enthalten."
      : "This quality level is not included in your current plan.";
  }
  return language === "de"
    ? "Dieses Feature ist in deinem aktuellen Plan nicht enthalten."
    : "This feature is not included in your current plan.";
}
