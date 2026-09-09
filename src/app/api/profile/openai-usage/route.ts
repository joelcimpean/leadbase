import { NextResponse } from "next/server";

import { getLeadbaseUsageSnapshot } from "@/lib/ai-usage";
import { createClient } from "@/lib/supabase/server";

function dayKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await getLeadbaseUsageSnapshot(user.id);
    const now = new Date();
    const monthStart = new Date(snapshot.monthStart);

    const modelMap = new Map<
      string,
      { model: string; inputTokens: number; outputTokens: number; requests: number }
    >();
    const featureMap = new Map<string, { feature: string; tokens: number; requests: number }>();
    const dailyMap = new Map<string, { date: string; tokens: number; requests: number; costUsd: number }>();

    for (const event of snapshot.events) {
      const model = event.model || "Other";
      const modelRow = modelMap.get(model) ?? {
        model,
        inputTokens: 0,
        outputTokens: 0,
        requests: 0,
      };
      modelRow.inputTokens += Number(event.input_tokens ?? 0) || 0;
      modelRow.outputTokens += Number(event.output_tokens ?? 0) || 0;
      modelRow.requests += 1;
      modelMap.set(model, modelRow);

      const feature = event.feature || "other";
      const featureRow = featureMap.get(feature) ?? { feature, tokens: 0, requests: 0 };
      featureRow.tokens += Number(event.total_tokens ?? 0) || 0;
      featureRow.requests += 1;
      featureMap.set(feature, featureRow);

      const date = dayKey(event.created_at);
      if (date) {
        const day = dailyMap.get(date) ?? { date, tokens: 0, requests: 0, costUsd: 0 };
        day.tokens += Number(event.total_tokens ?? 0) || 0;
        day.requests += 1;
        dailyMap.set(date, day);
      }
    }

    const trend: Array<{ date: string; tokens: number; requests: number; costUsd: number }> = [];
    for (
      let cursor = new Date(monthStart);
      cursor <= now;
      cursor = new Date(cursor.getTime() + 86_400_000)
    ) {
      const date = cursor.toISOString().slice(0, 10);
      trend.push(dailyMap.get(date) ?? { date, tokens: 0, requests: 0, costUsd: 0 });
    }

    return NextResponse.json({
      configured: true,
      scope: "leadbase_user",
      period: { start: monthStart.toISOString(), end: now.toISOString() },
      plan: {
        id: snapshot.planId,
        monthlyTokenLimit: snapshot.monthlyTokenLimit,
        purchasedTokenBalance: snapshot.purchasedTokenBalance,
        effectiveLimit: snapshot.effectiveLimit,
        remainingTokens: snapshot.remainingTokens,
      },
      totals: {
        inputTokens: snapshot.inputTokens,
        outputTokens: snapshot.outputTokens,
        cachedInputTokens: 0,
        embeddingTokens: 0,
        totalTokens: snapshot.totalTokens,
        modelRequests: snapshot.requests,
        imageRequests: 0,
        imagesProcessed: 0,
        webSearchCalls: 0,
        fileSearchCalls: 0,
        costUsd: 0,
      },
      byModel: [...modelMap.values()]
        .sort(
          (a, b) =>
            b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens),
        )
        .slice(0, 8),
      byFeature: [...featureMap.values()].sort((a, b) => b.tokens - a.tokens),
      trend,
    });
  } catch (error) {
    console.error("Could not load Leadbase AI usage:", error);
    return NextResponse.json(
      {
        configured: false,
        error:
          error instanceof Error
            ? error.message
            : "Leadbase AI usage could not be loaded.",
      },
      { status: 500 },
    );
  }
}
