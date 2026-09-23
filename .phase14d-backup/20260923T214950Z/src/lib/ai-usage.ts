import "server-only";

import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  LEADBASE_CREDITS_PER_PROVIDER_USD,
  normalizePlanId,
  planAllowsAiRequest,
  type LeadbasePlanId,
} from "@/lib/public-plans";

export type LeadbaseAiFeature =
  | "lead_analysis"
  | "ai_lead_search"
  | "design_generation"
  | "design_motion"
  | "design_research"
  | "outreach_generation"
  | "follow_up_generation"
  | "reply_generation"
  | "reply_intelligence"
  | "proposal_autofill"
  | "competitor_research"
  | "call_prep"
  | "visual_analysis"
  | "visual_analysis_localization"
  | "full_lead_workflow"
  | "other";

export type AiUsageWorkflowContext = {
  userId: string;
  workflowRunId: string;
  billingMode: "fixed_bundle" | "passthrough";
  fixedCredits?: number | null;
  allowedFeatures?: readonly LeadbaseAiFeature[];
};

const AI_USAGE_WORKFLOW_CONTEXT =
  new AsyncLocalStorage<AiUsageWorkflowContext>();

export function getAiUsageWorkflowContext() {
  return AI_USAGE_WORKFLOW_CONTEXT.getStore() ?? null;
}

export async function runWithAiUsageWorkflowContext<T>(
  context: AiUsageWorkflowContext,
  callback: () => Promise<T>,
): Promise<T> {
  return AI_USAGE_WORKFLOW_CONTEXT.run(context, callback);
}

function workflowMetadata(
  metadata: Record<string, unknown> | null | undefined,
  context: AiUsageWorkflowContext | null,
) {
  return context
    ? {
        ...(metadata ?? {}),
        workflowRunId: context.workflowRunId,
        workflowBillingMode: context.billingMode,
      }
    : (metadata ?? {});
}

export type AiUsageLike = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  cachedInputTokens?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  input_tokens_details?: { cached_tokens?: number | null } | null;
};

type ModelPrice = {
  inputPerMillionUsd: number;
  cachedInputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

// OpenAI public API pricing checked for Phase 13 on 2026-09-12.
// Keep this table server-side and update it whenever provider pricing changes.
export const LEADBASE_AI_PRICING_VERSION = "openai-2026-09-12";
const MODEL_PRICES: Record<string, ModelPrice> = {
  "gpt-5.6-luna": {
    inputPerMillionUsd: 0.2,
    cachedInputPerMillionUsd: 0.02,
    outputPerMillionUsd: 1.2,
  },
  "gpt-5.6-terra": {
    inputPerMillionUsd: 2,
    cachedInputPerMillionUsd: 0.2,
    outputPerMillionUsd: 12,
  },
  "gpt-5.6-sol": {
    inputPerMillionUsd: 4,
    cachedInputPerMillionUsd: 0.4,
    outputPerMillionUsd: 20,
  },
  "gpt-6-astra": {
    inputPerMillionUsd: 10,
    cachedInputPerMillionUsd: 1,
    outputPerMillionUsd: 50,
  },
  "gpt-5-mini": {
    inputPerMillionUsd: 0.25,
    cachedInputPerMillionUsd: 0.025,
    outputPerMillionUsd: 2,
  },
};

const SAFE_UNKNOWN_MODEL_PRICE: ModelPrice = MODEL_PRICES["gpt-6-astra"];

const FEATURE_RESERVE_USD: Record<LeadbaseAiFeature, number> = {
  lead_analysis: 0.15,
  ai_lead_search: 0.08,
  design_generation: 1.6,
  design_motion: 0.6,
  design_research: 0.25,
  outreach_generation: 0.08,
  follow_up_generation: 0.08,
  reply_generation: 0.08,
  reply_intelligence: 0.03,
  proposal_autofill: 0.12,
  competitor_research: 0.35,
  call_prep: 0.15,
  visual_analysis: 0.15,
  visual_analysis_localization: 0.05,
  full_lead_workflow: 0.2,
  other: 0.12,
};

const DEFAULT_MODEL_BY_FEATURE: Record<LeadbaseAiFeature, string> = {
  lead_analysis: "gpt-5.6-luna",
  ai_lead_search: "gpt-5-mini",
  design_generation: "gpt-5.6-sol",
  design_motion: "gpt-5.6-sol",
  design_research: "gpt-5.6-luna",
  outreach_generation: "gpt-5.6-luna",
  follow_up_generation: "gpt-5.6-luna",
  reply_generation: "gpt-5.6-luna",
  reply_intelligence: "gpt-5.6-luna",
  proposal_autofill: "gpt-5.6-luna",
  competitor_research: "gpt-5.6-terra",
  call_prep: "gpt-5.6-luna",
  visual_analysis: "gpt-5.6-luna",
  visual_analysis_localization: "gpt-5.6-luna",
  full_lead_workflow: "gpt-5.6-luna",
  other: "gpt-5.6-luna",
};

function positiveInt(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.max(0, Math.round(number));
}

function money(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function canonicalAiModel(model?: string | null) {
  const value = model?.trim().toLowerCase() || "";
  if (value === "gpt-5.6" || value.startsWith("gpt-5.6-sol")) return "gpt-5.6-sol";
  if (value.startsWith("gpt-5.6-terra")) return "gpt-5.6-terra";
  if (value.startsWith("gpt-5.6-luna")) return "gpt-5.6-luna";
  if (value.startsWith("gpt-6-astra")) return "gpt-6-astra";
  if (value.startsWith("gpt-5-mini")) return "gpt-5-mini";
  return value || null;
}

export function normalizeAiUsage(usage?: AiUsageLike | null) {
  const inputTokens = positiveInt(usage?.inputTokens ?? usage?.input_tokens);
  const outputTokens = positiveInt(usage?.outputTokens ?? usage?.output_tokens);
  const cachedInputTokens = Math.min(
    inputTokens,
    positiveInt(
      usage?.cachedInputTokens ?? usage?.input_tokens_details?.cached_tokens,
    ),
  );
  const reportedTotal = positiveInt(usage?.totalTokens ?? usage?.total_tokens);
  const totalTokens = reportedTotal || inputTokens + outputTokens;

  return { inputTokens, cachedInputTokens, outputTokens, totalTokens };
}

export function calculateAiProviderCostUsd(model: string | null | undefined, usage?: AiUsageLike | null) {
  const normalized = normalizeAiUsage(usage);
  const canonicalModel = canonicalAiModel(model);
  const price = (canonicalModel && MODEL_PRICES[canonicalModel]) || SAFE_UNKNOWN_MODEL_PRICE;
  const uncachedInputTokens = Math.max(0, normalized.inputTokens - normalized.cachedInputTokens);

  // GPT-5.6 requests above 272K input tokens are billed at the long-context
  // multiplier. Applying it to the whole request matches OpenAI's model docs.
  const isLongContext = normalized.inputTokens > 272_000 && canonicalModel?.startsWith("gpt-5.6-");
  const inputMultiplier = isLongContext ? 2 : 1;
  const outputMultiplier = isLongContext ? 1.5 : 1;

  const inputCost =
    (uncachedInputTokens / 1_000_000) * price.inputPerMillionUsd * inputMultiplier;
  const cachedInputCost =
    (normalized.cachedInputTokens / 1_000_000) * price.cachedInputPerMillionUsd * inputMultiplier;
  const outputCost =
    (normalized.outputTokens / 1_000_000) * price.outputPerMillionUsd * outputMultiplier;
  const providerCostUsd = inputCost + cachedInputCost + outputCost;
  const credits = normalized.totalTokens > 0
    ? Math.max(1, Math.ceil(providerCostUsd * LEADBASE_CREDITS_PER_PROVIDER_USD))
    : 0;

  return {
    ...normalized,
    canonicalModel,
    providerCostUsd,
    credits,
    pricingVersion: LEADBASE_AI_PRICING_VERSION,
  };
}


function positiveNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function assertProviderCostGuards(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("leadbase_cost_guard_snapshot", { p_user_id: userId });
  if (error) throw new Error(`AI_COST_GUARD_UNAVAILABLE:${error.message}`);
  const snapshot = (data ?? {}) as Record<string, unknown>;
  const userDay = money(snapshot.user_day_usd);
  const globalDay = money(snapshot.global_day_usd);
  const globalMonth = money(snapshot.global_month_usd);

  const userDayCap = positiveNumberEnv("LEADBASE_AI_USER_DAILY_COST_CAP_USD", 5);
  const globalDayCap = positiveNumberEnv("LEADBASE_AI_GLOBAL_DAILY_COST_CAP_USD", 25);
  const globalMonthCap = positiveNumberEnv("LEADBASE_AI_GLOBAL_MONTHLY_COST_CAP_USD", 250);

  if (userDay >= userDayCap) throw new Error(`AI_USER_DAILY_COST_CAP_REACHED:${userDay}:${userDayCap}`);
  if (globalDay >= globalDayCap) throw new Error(`AI_GLOBAL_COST_CAP_REACHED:day:${globalDay}:${globalDayCap}`);
  if (globalMonth >= globalMonthCap) throw new Error(`AI_GLOBAL_COST_CAP_REACHED:month:${globalMonth}:${globalMonthCap}`);
}

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function refreshCreditAccount(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("leadbase_refresh_credit_period", { p_user_id: userId });
  if (error) throw new Error(`CREDIT_SYSTEM_NOT_READY:${error.message}`);
}

export async function getLeadbaseUsageSnapshot(userId: string) {
  const admin = createAdminClient();
  const monthStart = monthStartIso();
  await refreshCreditAccount(userId);

  const [accountResult, eventsResult] = await Promise.all([
    admin
      .from("ai_usage_accounts")
      .select(`
        plan_id,
        plan_tier_index,
        billing_interval,
        subscription_status,
        monthly_credit_limit,
        plan_credit_balance,
        purchased_credit_balance,
        credit_debt_balance,
        credit_period_started_at,
        credit_period_resets_at,
        stripe_customer_id,
        stripe_subscription_id,
        cancel_at_period_end,
        subscription_current_period_end
      `)
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("ai_usage_events")
      .select("input_tokens, cached_input_tokens, output_tokens, total_tokens, credits_charged, provider_cost_usd, feature, model, created_at")
      .eq("user_id", userId)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: true }),
  ]);

  if (accountResult.error) throw new Error(accountResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);

  const account = accountResult.data;
  if (!account) throw new Error("CREDIT_ACCOUNT_MISSING");

  const rows = eventsResult.data ?? [];
  const inputTokens = rows.reduce((sum, row) => sum + positiveInt(row.input_tokens), 0);
  const cachedInputTokens = rows.reduce((sum, row) => sum + positiveInt(row.cached_input_tokens), 0);
  const outputTokens = rows.reduce((sum, row) => sum + positiveInt(row.output_tokens), 0);
  const totalTokens = rows.reduce((sum, row) => sum + positiveInt(row.total_tokens), 0);
  const creditsUsed = rows.reduce((sum, row) => sum + positiveInt(row.credits_charged), 0);
  const providerCostUsd = rows.reduce((sum, row) => sum + money(row.provider_cost_usd), 0);

  const storedPlanId = normalizePlanId(account.plan_id);
  const subscriptionStatus = String(account.subscription_status ?? "free");
  const paidActive = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const planId: LeadbasePlanId = storedPlanId === "free" || paidActive ? storedPlanId : "free";
  const planCreditBalance = positiveInt(account.plan_credit_balance);
  const purchasedCreditBalance = positiveInt(account.purchased_credit_balance);
  const creditDebtBalance = positiveInt(account.credit_debt_balance);
  const availableCredits = Math.max(0, planCreditBalance + purchasedCreditBalance - creditDebtBalance);

  return {
    monthStart,
    planId,
    storedPlanId,
    planTierIndex: positiveInt(account.plan_tier_index),
    billingInterval: account.billing_interval === "yearly" ? "yearly" as const : "monthly" as const,
    subscriptionStatus,
    monthlyCreditLimit: positiveInt(account.monthly_credit_limit),
    planCreditBalance,
    purchasedCreditBalance,
    creditDebtBalance,
    availableCredits,
    creditPeriodStartedAt: account.credit_period_started_at as string | null,
    creditPeriodResetsAt: account.credit_period_resets_at as string | null,
    stripeCustomerId: account.stripe_customer_id as string | null,
    stripeSubscriptionId: account.stripe_subscription_id as string | null,
    cancelAtPeriodEnd: Boolean(account.cancel_at_period_end),
    subscriptionCurrentPeriodEnd: account.subscription_current_period_end as string | null,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    totalTokens,
    creditsUsed,
    providerCostUsd,
    requests: rows.length,
    events: rows,
  };
}

export async function assertAiUsageAvailable(
  userId: string,
  options?: {
    feature?: LeadbaseAiFeature;
    model?: string | null;
    reasoningEffort?: string | null;
    reserveCredits?: number;
    metadata?: Record<string, unknown> | null;
  },
) {
  try {
    const snapshot = await getLeadbaseUsageSnapshot(userId);
    await assertProviderCostGuards(userId);
    const feature = options?.feature ?? "other";
    const model = canonicalAiModel(options?.model) ?? DEFAULT_MODEL_BY_FEATURE[feature];
    const workflowContext = getAiUsageWorkflowContext();
    const fixedWorkflow =
      workflowContext?.userId === userId &&
      workflowContext.billingMode === "fixed_bundle";

    if (fixedWorkflow) {
      const allowed = workflowContext.allowedFeatures ?? [];
      if (allowed.length > 0 && !allowed.includes(feature)) {
        throw new Error(`AI_ENTITLEMENT_DENIED:FEATURE_NOT_INCLUDED:${snapshot.planId}:${feature}:${model}`);
      }
      if (snapshot.creditDebtBalance > 0) {
        throw new Error(`AI_CREDIT_DEBT:${snapshot.creditDebtBalance}`);
      }

      return {
        ...snapshot,
        reservationKey: `workflow-sponsored:${workflowContext.workflowRunId}:${crypto.randomUUID()}`,
        reservedCredits: 0,
        model,
      };
    }

    const entitlement = planAllowsAiRequest({
      planId: snapshot.planId,
      feature,
      model,
      reasoningEffort: options?.reasoningEffort,
    });

    if (!entitlement.ok) {
      throw new Error(`AI_ENTITLEMENT_DENIED:${entitlement.reason}:${snapshot.planId}:${feature}:${model}`);
    }
    if (snapshot.creditDebtBalance > 0) {
      throw new Error(`AI_CREDIT_DEBT:${snapshot.creditDebtBalance}`);
    }
    if (snapshot.availableCredits <= 0) {
      throw new Error("AI_CREDITS_EXHAUSTED:0");
    }

    let reservationKey: string | null = null;
    let reservedCredits = 0;

    // New Phase 13 call sites pass a feature. Reserving before the provider call
    // prevents concurrent bulk requests from spending the same balance twice.
    if (options?.feature) {
      reservedCredits = Math.max(
        1,
        positiveInt(options.reserveCredits) ||
          Math.ceil(FEATURE_RESERVE_USD[feature] * LEADBASE_CREDITS_PER_PROVIDER_USD),
      );
      reservationKey = `air:${crypto.randomUUID()}`;
      const admin = createAdminClient();
      const { error } = await admin.rpc("leadbase_reserve_credits", {
        p_user_id: userId,
        p_request_key: reservationKey,
        p_credits: reservedCredits,
        p_feature: feature,
        p_model: model,
        p_metadata: workflowMetadata(options.metadata, workflowContext),
      });
      if (error) {
        if (/insufficient/i.test(error.message)) {
          throw new Error(`AI_CREDITS_EXHAUSTED:${snapshot.availableCredits}`);
        }
        throw new Error(`AI_CREDIT_RESERVATION_FAILED:${error.message}`);
      }
    }

    return { ...snapshot, reservationKey, reservedCredits, model };
  } catch (error) {
    if (isAiUsageLimitError(error)) throw error;
    // Cost controls fail closed. If the billing ledger is unavailable, a public
    // SaaS must not silently send an unmetered provider request.
    console.error("Could not check Credit budget:", error);
    throw error instanceof Error ? error : new Error("AI_CREDIT_CHECK_FAILED");
  }
}

export async function releaseAiUsageReservation(userId: string, reservationKey?: string | null) {
  if (!userId || !reservationKey) return;
  const workflowContext = getAiUsageWorkflowContext();
  if (
    workflowContext?.userId === userId &&
    workflowContext.billingMode === "fixed_bundle" &&
    reservationKey.startsWith("workflow-sponsored:")
  ) {
    return;
  }
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("leadbase_release_credit_reservation", {
      p_user_id: userId,
      p_request_key: reservationKey,
      p_reason: "provider_request_failed",
    });
    if (error) console.error("Could not release credit reservation:", error);
  } catch (error) {
    console.error("Could not release credit reservation:", error);
  }
}

export async function recordAiUsage({
  userId,
  feature,
  model,
  usage,
  requestKey,
  reservationKey,
  metadata,
}: {
  userId: string;
  feature: LeadbaseAiFeature;
  model?: string | null;
  usage?: AiUsageLike | null;
  requestKey?: string | null;
  reservationKey?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const calculated = calculateAiProviderCostUsd(model, usage);
  if (!userId || calculated.totalTokens <= 0) return calculated;

  try {
    const admin = createAdminClient();
    const workflowContext = getAiUsageWorkflowContext();
    const mergedMetadata = workflowMetadata(metadata, workflowContext);
    const fixedWorkflow =
      workflowContext?.userId === userId &&
      workflowContext.billingMode === "fixed_bundle";

    if (fixedWorkflow) {
      const payload = {
        user_id: userId,
        feature,
        model: calculated.canonicalModel ?? model?.trim() ?? null,
        input_tokens: calculated.inputTokens,
        cached_input_tokens: calculated.cachedInputTokens,
        output_tokens: calculated.outputTokens,
        total_tokens: calculated.totalTokens,
        provider_cost_usd: calculated.providerCostUsd,
        credits_charged: 0,
        pricing_version: calculated.pricingVersion,
        request_key: requestKey?.trim() || reservationKey || `workflow-usage:${crypto.randomUUID()}`,
        metadata: {
          ...mergedMetadata,
          sponsoredByFixedWorkflow: true,
          fixedWorkflowCredits: workflowContext.fixedCredits ?? null,
        },
      };

      const { error } = await admin.from("ai_usage_events").insert(payload);
      if (error && error.code !== "23505") {
        throw new Error(error.message);
      }
      return calculated;
    }

    let chargedCredits = calculated.credits;

    if (reservationKey) {
      const { data, error } = await admin.rpc("leadbase_settle_credit_reservation", {
        p_user_id: userId,
        p_request_key: reservationKey,
        p_actual_credits: calculated.credits,
        p_provider_cost_usd: calculated.providerCostUsd,
        p_metadata: {
          ...mergedMetadata,
          pricingVersion: calculated.pricingVersion,
        },
      });
      if (error) throw new Error(error.message);
      const settled = data as { charged_credits?: number } | null;
      chargedCredits = positiveInt(settled?.charged_credits) || calculated.credits;
    } else {
      const directKey = requestKey?.trim() || `usage:${crypto.randomUUID()}`;
      const { data, error } = await admin.rpc("leadbase_charge_credits", {
        p_user_id: userId,
        p_request_key: directKey,
        p_credits: calculated.credits,
        p_feature: feature,
        p_model: calculated.canonicalModel ?? model ?? null,
        p_provider_cost_usd: calculated.providerCostUsd,
        p_metadata: {
          ...mergedMetadata,
          pricingVersion: calculated.pricingVersion,
          directCharge: true,
        },
      });
      if (error) throw new Error(error.message);
      const charged = data as { charged_credits?: number } | null;
      chargedCredits = positiveInt(charged?.charged_credits) || calculated.credits;
    }

    const payload = {
      user_id: userId,
      feature,
      model: calculated.canonicalModel ?? model?.trim() ?? null,
      input_tokens: calculated.inputTokens,
      cached_input_tokens: calculated.cachedInputTokens,
      output_tokens: calculated.outputTokens,
      total_tokens: calculated.totalTokens,
      provider_cost_usd: calculated.providerCostUsd,
      credits_charged: chargedCredits,
      pricing_version: calculated.pricingVersion,
      request_key: requestKey?.trim() || reservationKey || null,
      metadata: mergedMetadata,
    };

    const { error } = await admin.from("ai_usage_events").insert(payload);
    if (error && error.code !== "23505") {
      console.error("Could not record Leadbase AI usage:", error);
    }
  } catch (error) {
    // A provider request has already happened at this point. Surface this loudly
    // instead of silently allowing unmetered usage.
    console.error("CRITICAL: Could not settle Credits:", error);
    throw error instanceof Error ? error : new Error("AI_CREDIT_SETTLEMENT_FAILED");
  }

  return calculated;
}

export function isAiUsageLimitError(error: unknown) {
  return error instanceof Error && (
    error.message.startsWith("AI_CREDITS_EXHAUSTED:") ||
    error.message.startsWith("AI_CREDIT_DEBT:") ||
    error.message.startsWith("AI_ENTITLEMENT_DENIED:") ||
    error.message.startsWith("AI_CREDIT_RESERVATION_FAILED:") ||
    error.message.startsWith("AI_USER_DAILY_COST_CAP_REACHED:") ||
    error.message.startsWith("AI_GLOBAL_COST_CAP_REACHED:")
  );
}

// Backward-compatible export name for existing route error handlers.
export const isAiTokenLimitError = isAiUsageLimitError;

export function aiTokenLimitMessage(error: unknown, language: "de" | "en" = "de") {
  if (!isAiUsageLimitError(error)) return null;
  const message = (error as Error).message;

  if (message.startsWith("AI_USER_DAILY_COST_CAP_REACHED:")) {
    return language === "de"
      ? "Dein tägliches KI-Kostenlimit wurde erreicht. Bitte versuche es morgen erneut."
      : "Your daily AI cost limit has been reached. Please try again tomorrow.";
  }
  if (message.startsWith("AI_GLOBAL_COST_CAP_REACHED:")) {
    return language === "de"
      ? "Leadbase hat das globale Sicherheitslimit für KI-Kosten erreicht. Weitere KI-Aktionen sind vorübergehend pausiert."
      : "Leadbase reached its global AI cost safety limit. AI actions are temporarily paused.";
  }
  if (message.startsWith("AI_ENTITLEMENT_DENIED:")) {
    return language === "de"
      ? "Dieses KI-Modell oder Feature ist in deinem aktuellen Plan nicht enthalten."
      : "This AI model or feature is not included in your current plan.";
  }
  if (message.startsWith("AI_CREDIT_DEBT:")) {
    return language === "de"
      ? "Dein Credit-Konto muss zuerst ausgeglichen werden, bevor weitere KI-Aktionen möglich sind."
      : "Your credit balance must be settled before more AI actions can run.";
  }
  return language === "de"
    ? "Deine Credits reichen für diese KI-Aktion nicht aus. Bitte füge Credits hinzu oder wechsle deinen Plan."
    : "You do not have enough credits for this AI action. Add credits or change your plan.";
}
