import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type LeadbaseAiFeature =
  | "lead_analysis"
  | "ai_lead_search"
  | "design_generation"
  | "design_motion"
  | "outreach_generation"
  | "reply_generation"
  | "proposal_autofill"
  | "competitor_research"
  | "call_prep"
  | "other";

export type AiUsageLike = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
};

function positiveInt(value: unknown) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.max(0, Math.round(number));
}

export function normalizeAiUsage(usage?: AiUsageLike | null) {
  const inputTokens = positiveInt(usage?.inputTokens ?? usage?.input_tokens);
  const outputTokens = positiveInt(usage?.outputTokens ?? usage?.output_tokens);
  const reportedTotal = positiveInt(usage?.totalTokens ?? usage?.total_tokens);
  const totalTokens = reportedTotal || inputTokens + outputTokens;

  return { inputTokens, outputTokens, totalTokens };
}

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function getLeadbaseUsageSnapshot(userId: string) {
  const admin = createAdminClient();
  const monthStart = monthStartIso();

  const [accountResult, eventsResult] = await Promise.all([
    admin
      .from("ai_usage_accounts")
      .select("plan_id, monthly_token_limit, purchased_token_balance")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("ai_usage_events")
      .select("input_tokens, output_tokens, total_tokens, feature, model, created_at")
      .eq("user_id", userId)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: true }),
  ]);

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }

  const rows = eventsResult.data ?? [];
  const inputTokens = rows.reduce((sum, row) => sum + positiveInt(row.input_tokens), 0);
  const outputTokens = rows.reduce((sum, row) => sum + positiveInt(row.output_tokens), 0);
  const totalTokens = rows.reduce((sum, row) => sum + positiveInt(row.total_tokens), 0);
  const monthlyTokenLimit =
    typeof accountResult.data?.monthly_token_limit === "number"
      ? Math.max(0, Number(accountResult.data.monthly_token_limit))
      : null;
  const purchasedTokenBalance = Math.max(
    0,
    Number(accountResult.data?.purchased_token_balance ?? 0) || 0,
  );
  const effectiveLimit =
    monthlyTokenLimit === null ? null : monthlyTokenLimit + purchasedTokenBalance;
  const remainingTokens =
    effectiveLimit === null ? null : Math.max(0, effectiveLimit - totalTokens);

  return {
    monthStart,
    planId: accountResult.data?.plan_id ?? "development",
    monthlyTokenLimit,
    purchasedTokenBalance,
    effectiveLimit,
    inputTokens,
    outputTokens,
    totalTokens,
    remainingTokens,
    requests: rows.length,
    events: rows,
  };
}

export async function assertAiUsageAvailable(userId: string) {
  try {
    const snapshot = await getLeadbaseUsageSnapshot(userId);
    if (
      snapshot.effectiveLimit !== null &&
      snapshot.totalTokens >= snapshot.effectiveLimit
    ) {
      throw new Error(
        `AI_TOKEN_LIMIT_REACHED:${snapshot.totalTokens}:${snapshot.effectiveLimit}`,
      );
    }
    return snapshot;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AI_TOKEN_LIMIT_REACHED:")) {
      throw error;
    }
    // During rollout/migration we never break an existing AI action merely because
    // the usage ledger is temporarily unavailable.
    console.error("Could not check Leadbase AI usage budget:", error);
    return null;
  }
}

export async function recordAiUsage({
  userId,
  feature,
  model,
  usage,
  requestKey,
  metadata,
}: {
  userId: string;
  feature: LeadbaseAiFeature;
  model?: string | null;
  usage?: AiUsageLike | null;
  requestKey?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const normalized = normalizeAiUsage(usage);
  if (!userId || normalized.totalTokens <= 0) return normalized;

  try {
    const admin = createAdminClient();
    const payload = {
      user_id: userId,
      feature,
      model: model?.trim() || null,
      input_tokens: normalized.inputTokens,
      output_tokens: normalized.outputTokens,
      total_tokens: normalized.totalTokens,
      request_key: requestKey?.trim() || null,
      metadata: metadata ?? {},
    };

    const query = admin.from("ai_usage_events").insert(payload);
    const { error } = await query;
    if (error && error.code !== "23505") {
      console.error("Could not record Leadbase AI usage:", error);
    }
  } catch (error) {
    console.error("Could not record Leadbase AI usage:", error);
  }

  return normalized;
}

export function isAiTokenLimitError(error: unknown) {
  return error instanceof Error && error.message.startsWith("AI_TOKEN_LIMIT_REACHED:");
}

export function aiTokenLimitMessage(error: unknown, language: "de" | "en" = "de") {
  if (!isAiTokenLimitError(error)) return null;
  const [, usedRaw, limitRaw] = (error as Error).message.split(":");
  const used = Number(usedRaw || 0).toLocaleString(language === "de" ? "de-DE" : "en-US");
  const limit = Number(limitRaw || 0).toLocaleString(language === "de" ? "de-DE" : "en-US");
  return language === "de"
    ? `Dein monatliches KI-Limit ist erreicht (${used} / ${limit} Tokens).`
    : `Your monthly AI limit has been reached (${used} / ${limit} tokens).`;
}
