import { NextResponse } from "next/server";

import { getLeadbaseUsageSnapshot } from "@/lib/ai-usage";
import { getPlanEntitlements } from "@/lib/plan-entitlements";
import { createClient } from "@/lib/supabase/server";

function dayKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snapshot = await getLeadbaseUsageSnapshot(user.id);
    const now = new Date();
    const monthStart = new Date(snapshot.monthStart);

    const modelMap = new Map<string, { model: string; inputTokens: number; outputTokens: number; credits: number; requests: number; costUsd: number }>();
    const featureMap = new Map<string, { feature: string; credits: number; requests: number; costUsd: number }>();
    const dailyMap = new Map<string, { date: string; credits: number; requests: number; costUsd: number }>();

    for (const event of snapshot.events) {
      const model = event.model || "Other";
      const credits = Number(event.credits_charged ?? 0) || 0;
      const costUsd = Number(event.provider_cost_usd ?? 0) || 0;
      const modelRow = modelMap.get(model) ?? { model, inputTokens: 0, outputTokens: 0, credits: 0, requests: 0, costUsd: 0 };
      modelRow.inputTokens += Number(event.input_tokens ?? 0) || 0;
      modelRow.outputTokens += Number(event.output_tokens ?? 0) || 0;
      modelRow.credits += credits;
      modelRow.costUsd += costUsd;
      modelRow.requests += 1;
      modelMap.set(model, modelRow);

      const feature = event.feature || "other";
      const featureRow = featureMap.get(feature) ?? { feature, credits: 0, requests: 0, costUsd: 0 };
      featureRow.credits += credits;
      featureRow.costUsd += costUsd;
      featureRow.requests += 1;
      featureMap.set(feature, featureRow);

      const date = dayKey(event.created_at);
      if (date) {
        const day = dailyMap.get(date) ?? { date, credits: 0, requests: 0, costUsd: 0 };
        day.credits += credits;
        day.costUsd += costUsd;
        day.requests += 1;
        dailyMap.set(date, day);
      }
    }

    const trend: Array<{ date: string; credits: number; requests: number; costUsd: number }> = [];
    for (let cursor = new Date(monthStart); cursor <= now; cursor = new Date(cursor.getTime() + 86_400_000)) {
      const date = cursor.toISOString().slice(0, 10);
      trend.push(dailyMap.get(date) ?? { date, credits: 0, requests: 0, costUsd: 0 });
    }

    return NextResponse.json({
      configured: true,
      scope: "leadbase_user",
      period: { start: monthStart.toISOString(), end: now.toISOString() },
      plan: {
        id: snapshot.planId,
        storedPlanId: snapshot.storedPlanId,
        tierIndex: snapshot.planTierIndex,
        billingInterval: snapshot.billingInterval,
        subscriptionStatus: snapshot.subscriptionStatus,
        monthlyCredits: snapshot.monthlyCreditLimit,
        planCreditsRemaining: snapshot.planCreditBalance,
        purchasedCreditsRemaining: snapshot.purchasedCreditBalance,
        remainingCredits: snapshot.availableCredits,
        creditDebt: snapshot.creditDebtBalance,
        resetsAt: snapshot.creditPeriodResetsAt,
        cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
        currentPeriodEnd: snapshot.subscriptionCurrentPeriodEnd,
      },
      entitlements: (() => {
        const value = getPlanEntitlements(snapshot.planId);
        return {
          aiModels: value.aiModels,
          userSelectableDesignModels: value.userSelectableDesignModels,
          maxDesignReasoning: value.maxDesignReasoning,
          features: value.features,
          limits: value.limits,
          fullLeadWorkflow: value.fullLeadWorkflow,
        };
      })(),
      totals: {
        creditsUsed: snapshot.creditsUsed,
        modelRequests: snapshot.requests,
        providerCostUsd: snapshot.providerCostUsd,
        // Raw token diagnostics stay available for debugging/admin views but are
        // no longer the customer-facing billing unit.
        inputTokens: snapshot.inputTokens,
        outputTokens: snapshot.outputTokens,
        cachedInputTokens: snapshot.cachedInputTokens,
        totalTokens: snapshot.totalTokens,
      },
      byModel: [...modelMap.values()].sort((a, b) => b.credits - a.credits).slice(0, 8),
      byFeature: [...featureMap.values()].sort((a, b) => b.credits - a.credits),
      trend,
    });
  } catch (error) {
    console.error("Could not load credit usage:", error);
    return NextResponse.json(
      { configured: false, error: error instanceof Error ? error.message : "credit usage could not be loaded." },
      { status: 500 },
    );
  }
}
