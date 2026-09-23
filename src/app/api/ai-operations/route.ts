import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECENT_WINDOW_MS = 90_000;
const STALE_OPERATION_MS = 30 * 60_000;

type OperationStatus = "running" | "completed" | "failed";

type OperationRow = {
  id: string;
  feature: string;
  model: string | null;
  reasoning_effort: string | null;
  status: OperationStatus;
  lead_id: string | null;
  workflow_run_id: string | null;
  credits_reserved: number | null;
  credits_charged: number | null;
  retry_count: number | null;
  error_category: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

type WorkflowRow = {
  id: string;
  lead_id: string;
  status: OperationStatus;
  current_step: string;
  steps: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

function recentCutoffIso() {
  return new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
}

function safeTime(value: string | null | undefined) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

function workflowStageStartedAt(row: WorkflowRow) {
  if (!row.steps || typeof row.steps !== "object" || Array.isArray(row.steps)) {
    return row.current_step === "finalizing" ? row.updated_at : row.started_at;
  }
  const raw = row.steps[row.current_step];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return row.current_step === "finalizing" ? row.updated_at : row.started_at;
  }
  const updatedAt = (raw as { updatedAt?: unknown }).updatedAt;
  return typeof updatedAt === "string" ? updatedAt : row.started_at;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const admin = createAdminClient();
    const recentCutoff = recentCutoffIso();

    const [operationsResult, workflowsResult] = await Promise.all([
      admin
        .from("ai_operation_runs")
        .select(
          "id,feature,model,reasoning_effort,status,lead_id,workflow_run_id,credits_reserved,credits_charged,retry_count,error_category,error_message,started_at,completed_at,updated_at",
        )
        .eq("user_id", user.id)
        .is("workflow_run_id", null)
        .or(`status.eq.running,updated_at.gte.${recentCutoff}`)
        .order("started_at", { ascending: false })
        .limit(12),
      admin
        .from("full_lead_workflow_runs")
        .select("id,lead_id,status,current_step,steps,error_message,started_at,completed_at,updated_at")
        .eq("user_id", user.id)
        .or(`status.eq.running,updated_at.gte.${recentCutoff}`)
        .order("started_at", { ascending: false })
        .limit(6),
    ]);

    if (operationsResult.error) {
      const message = operationsResult.error.message || "Could not load AI operations.";
      if (/ai_operation_runs/i.test(message)) {
        return NextResponse.json(
          {
            ok: false,
            error: "Phase 14D database setup is missing. Run sql/28-phase14D-ai-progress-telemetry.sql first.",
            code: "AI_PROGRESS_SETUP_REQUIRED",
          },
          { status: 503 },
        );
      }
      throw new Error(message);
    }
    if (workflowsResult.error) throw new Error(workflowsResult.error.message);

    const now = Date.now();
    const operations = ((operationsResult.data ?? []) as OperationRow[])
      .map((row) => {
        const stale =
          row.status === "running" &&
          now - safeTime(row.updated_at || row.started_at) > STALE_OPERATION_MS;
        return {
          id: `ai:${row.id}`,
          source: "ai" as const,
          feature: row.feature,
          model: row.model,
          reasoningEffort: row.reasoning_effort,
          status: stale ? ("failed" as const) : row.status,
          stage: row.feature,
          leadId: row.lead_id,
          workflowRunId: null,
          creditsReserved: Number(row.credits_reserved ?? 0),
          creditsCharged: Number(row.credits_charged ?? 0),
          retryCount: Number(row.retry_count ?? 0),
          errorCategory: stale ? "stale_operation" : row.error_category,
          errorMessage: stale
            ? "This AI action stopped reporting progress. You can retry it safely."
            : row.error_message,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          updatedAt: row.updated_at,
          href: row.lead_id ? `/leads/${row.lead_id}` : null,
        };
      });

    const workflows = ((workflowsResult.data ?? []) as WorkflowRow[]).map((row) => ({
      id: `workflow:${row.id}`,
      source: "workflow" as const,
      feature: "full_lead_workflow",
      model: "mixed",
      reasoningEffort: null,
      status: row.status,
      stage: row.current_step,
      leadId: row.lead_id,
      workflowRunId: row.id,
      creditsReserved: 0,
      creditsCharged: 0,
      retryCount: 0,
      errorCategory: row.status === "failed" ? "workflow_failed" : null,
      errorMessage: row.error_message,
      startedAt: workflowStageStartedAt(row),
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
      href: `/leads/${row.lead_id}`,
    }));

    const items = [...workflows, ...operations]
      .sort((a, b) => safeTime(b.startedAt) - safeTime(a.startedAt))
      .slice(0, 12);

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("Could not load persistent AI progress:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not load AI progress." },
      { status: 500 },
    );
  }
}
