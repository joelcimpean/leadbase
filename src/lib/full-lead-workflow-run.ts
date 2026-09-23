import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AiUsageWorkflowContext } from "@/lib/ai-usage";

export const FULL_LEAD_WORKFLOW_STEPS = [
  "analysis",
  "design",
  "outreach",
  "call_prep",
  "proposal",
] as const;

export type FullLeadWorkflowStep =
  (typeof FULL_LEAD_WORKFLOW_STEPS)[number];

export type FullLeadWorkflowMode =
  | "one_time_50_credit_demo"
  | "normal_credits";

export type FullLeadWorkflowRunRow = {
  id: string;
  user_id: string;
  lead_id: string;
  mode: FullLeadWorkflowMode;
  status: "running" | "completed" | "failed";
  current_step: string;
  steps: Record<string, unknown> | null;
  fixed_credits: number | null;
  reservation_key: string | null;
  internal_token: string;
  credits_charged: number;
  provider_cost_usd: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

export type FullLeadWorkflowSafeRun = Omit<
  FullLeadWorkflowRunRow,
  "internal_token" | "reservation_key" | "user_id"
>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function safeWorkflowRun(
  run: FullLeadWorkflowRunRow,
): FullLeadWorkflowSafeRun {
  const {
    internal_token: _internalToken,
    reservation_key: _reservationKey,
    user_id: _userId,
    ...safe
  } = run;
  return safe;
}

export async function resolveWorkflowSponsorFromRequest(
  request: Request,
  userId: string,
) {
  const runId = request.headers.get("x-leadbase-workflow-run")?.trim();
  const token = request.headers.get("x-leadbase-workflow-token")?.trim();
  if (!runId || !token) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("full_lead_workflow_runs")
    .select("id,user_id,lead_id,mode,status,current_step,steps,fixed_credits,reservation_key,internal_token,credits_charged,provider_cost_usd,error_message,started_at,completed_at,updated_at")
    .eq("id", runId)
    .eq("user_id", userId)
    .eq("internal_token", token)
    .maybeSingle();

  if (error || !data) return null;
  const run = data as FullLeadWorkflowRunRow;
  if (run.status !== "running") return null;

  const context: AiUsageWorkflowContext = {
    userId,
    workflowRunId: run.id,
    billingMode:
      run.mode === "one_time_50_credit_demo"
        ? "fixed_bundle"
        : "passthrough",
    fixedCredits: run.fixed_credits,
    allowedFeatures: [
      "lead_analysis",
      "design_generation",
      "outreach_generation",
      "call_prep",
      "proposal_autofill",
    ],
  };

  return { run, context };
}

export async function updateFullWorkflowStep(input: {
  runId: string;
  step: FullLeadWorkflowStep;
  status: "running" | "completed" | "skipped" | "failed";
  detail?: Record<string, unknown> | null;
  currentStep?: string;
}) {
  const admin = createAdminClient();
  const { data: current, error: loadError } = await admin
    .from("full_lead_workflow_runs")
    .select("steps")
    .eq("id", input.runId)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  const steps = record(current?.steps);
  steps[input.step] = {
    status: input.status,
    ...(input.detail ?? {}),
    updatedAt: new Date().toISOString(),
  };

  const { error } = await admin
    .from("full_lead_workflow_runs")
    .update({
      current_step: input.currentStep ?? input.step,
      steps,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.runId);

  if (error) throw new Error(error.message);
}

export async function workflowUsageSummary(
  userId: string,
  workflowRunId: string,
  startedAt: string,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_usage_events")
    .select("input_tokens,cached_input_tokens,output_tokens,total_tokens,credits_charged,provider_cost_usd,metadata")
    .eq("user_id", userId)
    .gte("created_at", startedAt);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter((row) => {
    const metadata = record(row.metadata);
    return metadata.workflowRunId === workflowRunId;
  });

  return rows.reduce(
    (sum, row) => ({
      inputTokens: sum.inputTokens + Number(row.input_tokens ?? 0),
      cachedInputTokens: sum.cachedInputTokens + Number(row.cached_input_tokens ?? 0),
      outputTokens: sum.outputTokens + Number(row.output_tokens ?? 0),
      totalTokens: sum.totalTokens + Number(row.total_tokens ?? 0),
      creditsCharged: sum.creditsCharged + Number(row.credits_charged ?? 0),
      providerCostUsd: sum.providerCostUsd + Number(row.provider_cost_usd ?? 0),
    }),
    {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      creditsCharged: 0,
      providerCostUsd: 0,
    },
  );
}
