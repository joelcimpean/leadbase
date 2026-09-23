import { NextResponse } from "next/server";

import { analyzeLeadWebsite } from "@/app/(app)/leads/analysis-actions";
import { generateLeadOutreachDraftForWorkflow } from "@/app/(app)/leads/outreach-actions";
import {
  getLeadbaseUsageSnapshot,
  runWithAiUsageWorkflowContext,
} from "@/lib/ai-usage";
import {
  FULL_LEAD_WORKFLOW_STEPS,
  safeWorkflowRun,
  updateFullWorkflowStep,
  workflowUsageSummary,
  type FullLeadWorkflowMode,
  type FullLeadWorkflowRunRow,
  type FullLeadWorkflowStep,
} from "@/lib/full-lead-workflow-run";
import { generateAndSaveWorkflowCallPrep } from "@/lib/full-workflow-call-prep";
import { generateAndSaveWorkflowProposal } from "@/lib/full-workflow-proposal";
import { getAppLanguage } from "@/lib/i18n-server";
import { getPlanEntitlements } from "@/lib/plan-entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FREE_WORKFLOW_CREDITS = 50;
const STALE_WORKFLOW_MINUTES = 15;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type StartWorkflowRpc = {
  id?: string;
  status?: string;
  mode?: FullLeadWorkflowMode;
  reservation_key?: string | null;
  internal_token?: string;
  reused?: boolean;
  already_completed?: boolean;
};

type ClaimWorkflowRpc = {
  status?: "running" | "completed" | "failed";
  busy?: boolean;
  step?: FullLeadWorkflowStep | "finalize" | null;
  internal_token?: string;
};

function jsonError(error: string, status = 400, code?: string) {
  return NextResponse.json(
    { ok: false, error, ...(code ? { code } : {}) },
    { status },
  );
}

async function loadRun(runId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("full_lead_workflow_runs")
    .select("id,user_id,lead_id,mode,status,current_step,steps,fixed_credits,reservation_key,internal_token,credits_charged,provider_cost_usd,error_message,started_at,completed_at,updated_at")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as FullLeadWorkflowRunRow | null;
}

async function markRunFailed(
  run: FullLeadWorkflowRunRow,
  step: FullLeadWorkflowStep | "queued",
  error: unknown,
) {
  const admin = createAdminClient();
  const message = error instanceof Error ? error.message : "Full workflow failed.";

  if (run.mode === "one_time_50_credit_demo" && run.reservation_key) {
    const { error: releaseError } = await admin.rpc("leadbase_release_credit_reservation", {
      p_user_id: run.user_id,
      p_request_key: run.reservation_key,
      p_reason: "full_workflow_failed",
    });
    if (releaseError) {
      console.error("Could not release failed full-workflow reservation:", releaseError);
    }
  }

  const steps = run.steps && typeof run.steps === "object" && !Array.isArray(run.steps)
    ? { ...run.steps }
    : {};
  if (step !== "queued") {
    steps[step] = {
      status: "failed",
      error: message.slice(0, 1200),
      updatedAt: new Date().toISOString(),
    };
  }

  await admin
    .from("full_lead_workflow_runs")
    .update({
      status: "failed",
      current_step: step,
      steps,
      error_message: message.slice(0, 4000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", run.id);
}

async function finalizeRun(run: FullLeadWorkflowRunRow) {
  const admin = createAdminClient();
  const usage = await workflowUsageSummary(
    run.user_id,
    run.id,
    run.started_at,
  );

  let chargedCredits = usage.creditsCharged;

  if (run.mode === "one_time_50_credit_demo") {
    if (!run.reservation_key) {
      throw new Error("Full workflow Credit reservation is missing.");
    }

    const { data, error } = await admin.rpc("leadbase_settle_credit_reservation", {
      p_user_id: run.user_id,
      p_request_key: run.reservation_key,
      p_actual_credits: FREE_WORKFLOW_CREDITS,
      p_provider_cost_usd: usage.providerCostUsd,
      p_metadata: {
        workflowRunId: run.id,
        leadId: run.lead_id,
        fixedBundle: true,
        providerCostUsd: usage.providerCostUsd,
      },
    });
    if (error) throw new Error(error.message);

    const settled = data as { charged_credits?: number } | null;
    chargedCredits = Number(settled?.charged_credits ?? FREE_WORKFLOW_CREDITS);

    // The nested sponsored events contain the real token/cost telemetry with
    // credits_charged=0. This zero-token summary event carries the fixed bundle
    // charge so dashboard usage totals stay correct without double counting.
    const { error: summaryError } = await admin
      .from("ai_usage_events")
      .insert({
        user_id: run.user_id,
        feature: "full_lead_workflow",
        model: "mixed",
        input_tokens: 0,
        cached_input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        provider_cost_usd: 0,
        credits_charged: chargedCredits,
        pricing_version: "phase14c-fixed-bundle-v1",
        request_key: `full-workflow-summary:${run.id}`,
        metadata: {
          workflowRunId: run.id,
          leadId: run.lead_id,
          fixedBundle: true,
          providerCostUsd: usage.providerCostUsd,
          nestedUsage: usage,
        },
      });
    if (summaryError && summaryError.code !== "23505") {
      throw new Error(summaryError.message);
    }
  }

  const completedAt = new Date().toISOString();
  const { data: transitioned, error: finishError } = await admin
    .from("full_lead_workflow_runs")
    .update({
      status: "completed",
      current_step: "completed",
      credits_charged: chargedCredits,
      provider_cost_usd: usage.providerCostUsd,
      completed_at: completedAt,
      updated_at: completedAt,
      error_message: null,
    })
    .eq("id", run.id)
    .eq("status", "running")
    .select("id")
    .maybeSingle();
  if (finishError) throw new Error(finishError.message);

  // Only the request that actually transitions running -> completed creates the
  // activity row. Concurrent/retried finalization remains idempotent.
  if (transitioned?.id) {
    const { error: activityError } = await admin.from("activities").insert({
      user_id: run.user_id,
      lead_id: run.lead_id,
      activity_type: "FULL_LEAD_WORKFLOW_COMPLETED",
      title: "Full AI workflow completed",
      description:
        run.mode === "one_time_50_credit_demo"
          ? "Analysis, design, outreach draft, call prep and proposal draft were prepared in the one-time 50-Credit workflow."
          : "Analysis, design, outreach draft, call prep and proposal draft were prepared.",
    });
    if (activityError) {
      console.error("Could not save full-workflow completion activity:", activityError);
    }
  }

  const updated = await loadRun(run.id);
  if (!updated) throw new Error("Completed workflow could not be reloaded.");
  return updated;
}

async function recoverStaleRun(run: FullLeadWorkflowRunRow | null) {
  if (!run || run.status !== "running") return run;
  const heartbeat = new Date(run.updated_at || run.started_at).getTime();
  if (!Number.isFinite(heartbeat)) return run;
  const staleMs = STALE_WORKFLOW_MINUTES * 60_000;
  if (Date.now() - heartbeat < staleMs) return run;

  await markRunFailed(
    run,
    FULL_LEAD_WORKFLOW_STEPS.includes(run.current_step as FullLeadWorkflowStep)
      ? (run.current_step as FullLeadWorkflowStep)
      : "queued",
    new Error("The workflow timed out before completion. You can retry once."),
  );
  return loadRun(run.id);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: leadId } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonError("Not authenticated.", 401);

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id,company:companies(name,website_url)")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (leadError || !lead) return jsonError("Lead not found.", 404);

    const usage = await getLeadbaseUsageSnapshot(user.id);
    const entitlements = getPlanEntitlements(usage.planId);
    const admin = createAdminClient();

    const { data: leadRunData, error: leadRunError } = await admin
      .from("full_lead_workflow_runs")
      .select("id,user_id,lead_id,mode,status,current_step,steps,fixed_credits,reservation_key,internal_token,credits_charged,provider_cost_usd,error_message,started_at,completed_at,updated_at")
      .eq("user_id", user.id)
      .eq("lead_id", leadId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (leadRunError) throw new Error(leadRunError.message);

    let leadRun = await recoverStaleRun((leadRunData ?? null) as FullLeadWorkflowRunRow | null);

    let demoRun: FullLeadWorkflowRunRow | null = null;
    if (usage.planId === "free") {
      const { data, error } = await admin
        .from("full_lead_workflow_runs")
        .select("id,user_id,lead_id,mode,status,current_step,steps,fixed_credits,reservation_key,internal_token,credits_charged,provider_cost_usd,error_message,started_at,completed_at,updated_at")
        .eq("user_id", user.id)
        .eq("mode", "one_time_50_credit_demo")
        .in("status", ["running", "completed"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      demoRun = await recoverStaleRun((data ?? null) as FullLeadWorkflowRunRow | null);
    }

    const company = Array.isArray(lead.company) ? lead.company[0] : lead.company;
    const emailVerified = Boolean(user.email_confirmed_at);

    return NextResponse.json({
      ok: true,
      planId: usage.planId,
      enabled: entitlements.fullLeadWorkflow.enabled,
      mode: entitlements.fullLeadWorkflow.mode,
      fixedCredits: entitlements.fullLeadWorkflow.fixedDemoCredits,
      availableCredits: usage.availableCredits,
      emailVerified,
      hasWebsite: Boolean(company?.website_url),
      companyName: company?.name ?? "Company",
      run: leadRun ? safeWorkflowRun(leadRun) : null,
      demoClaim: demoRun ? safeWorkflowRun(demoRun) : null,
      steps: FULL_LEAD_WORKFLOW_STEPS,
    });
  } catch (error) {
    console.error("Could not load full workflow state:", error);
    const message = error instanceof Error ? error.message : "Could not load workflow state.";
    if (/full_lead_workflow_runs|leadbase_start_full_workflow/i.test(message)) {
      return jsonError(
        "Phase 14C database setup is missing. Run sql/23-phase14C-full-lead-workflow.sql first.",
        503,
        "WORKFLOW_SETUP_REQUIRED",
      );
    }
    return jsonError(message, 500);
  }
}

export async function POST(request: Request, context: RouteContext) {
  let activeRun: FullLeadWorkflowRunRow | null = null;
  let activeStep: FullLeadWorkflowStep | "queued" = "queued";
  let finalizing = false;

  try {
    const { id: leadId } = await context.params;
    const [supabase, language] = await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonError("Not authenticated.", 401);

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id,analysis_status,company:companies(name,website_url)")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (leadError || !lead) return jsonError("Lead not found.", 404);

    const company = Array.isArray(lead.company) ? lead.company[0] : lead.company;
    if (!company?.website_url) {
      return jsonError("This full workflow needs a lead with a website.", 422, "WEBSITE_REQUIRED");
    }

    const usage = await getLeadbaseUsageSnapshot(user.id);
    const entitlements = getPlanEntitlements(usage.planId);
    if (!entitlements.fullLeadWorkflow.enabled) {
      return jsonError("Full Lead Workflow is not included in your plan.", 403);
    }

    const mode: FullLeadWorkflowMode = entitlements.fullLeadWorkflow.mode;
    if (mode === "normal_credits" && usage.availableCredits <= 0) {
      return jsonError(
        "You need Credits before running the full workflow.",
        402,
        "INSUFFICIENT_WORKFLOW_CREDITS",
      );
    }

    if (mode === "one_time_50_credit_demo") {
      if (!user.email_confirmed_at) {
        return jsonError(
          "Verify your email before using the one-time 50-Credit workflow.",
          403,
          "EMAIL_VERIFICATION_REQUIRED",
        );
      }
      if (usage.availableCredits < FREE_WORKFLOW_CREDITS) {
        // A previously-started run already holds its reservation, so it may
        // continue even though the visible available balance is now 0.
        const admin = createAdminClient();
        const { data: existingRun } = await admin
          .from("full_lead_workflow_runs")
          .select("id,status")
          .eq("user_id", user.id)
          .eq("lead_id", leadId)
          .eq("status", "running")
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!existingRun) {
          return jsonError(
            `The free workflow needs ${FREE_WORKFLOW_CREDITS} available Credits.`,
            402,
            "INSUFFICIENT_WORKFLOW_CREDITS",
          );
        }
      }
    }

    const admin = createAdminClient();
    const { data: startData, error: startError } = await admin.rpc(
      "leadbase_start_full_workflow",
      {
        p_user_id: user.id,
        p_lead_id: leadId,
        p_mode: mode,
        p_fixed_credits: mode === "one_time_50_credit_demo" ? FREE_WORKFLOW_CREDITS : null,
      },
    );

    if (startError) {
      const message = startError.message || "Could not start full workflow.";
      if (/retry limit/i.test(message)) {
        return jsonError(
          "The free workflow already used its allowed technical retry. Please contact support if a provider failure caused this.",
          409,
          "FREE_WORKFLOW_RETRY_LIMIT",
        );
      }
      if (/already running/i.test(message)) {
        return jsonError(
          "The one-time free workflow is already running on another lead.",
          409,
          "FREE_WORKFLOW_ALREADY_RUNNING",
        );
      }
      if (/already used/i.test(message)) {
        return jsonError(
          "The one-time free workflow has already been used.",
          409,
          "FREE_WORKFLOW_ALREADY_USED",
        );
      }
      if (/insufficient credits/i.test(message)) {
        return jsonError(
          `The workflow needs ${FREE_WORKFLOW_CREDITS} available Credits.`,
          402,
          "INSUFFICIENT_WORKFLOW_CREDITS",
        );
      }
      throw new Error(message);
    }

    const started = (startData ?? {}) as StartWorkflowRpc;
    if (!started.id) throw new Error("Workflow start returned no run id.");

    activeRun = await loadRun(started.id);
    if (!activeRun) throw new Error("Workflow run could not be loaded.");

    if (activeRun.status === "completed") {
      return NextResponse.json({
        ok: true,
        started: false,
        reused: true,
        done: true,
        run: safeWorkflowRun(activeRun),
      });
    }

    // Claim one step atomically. A full workflow deliberately spans multiple
    // HTTP requests so a ~3 minute design does not make the whole pipeline hit
    // one serverless function timeout. The client immediately requests the next
    // step after this one completes.
    const { data: claimData, error: claimError } = await admin.rpc(
      "leadbase_claim_full_workflow_step",
      {
        p_user_id: user.id,
        p_run_id: activeRun.id,
      },
    );
    if (claimError) throw new Error(claimError.message);

    const claim = (claimData ?? {}) as ClaimWorkflowRpc;
    if (claim.status === "completed") {
      const completed = await loadRun(activeRun.id);
      if (!completed) throw new Error("Completed workflow could not be reloaded.");
      return NextResponse.json({ ok: true, done: true, run: safeWorkflowRun(completed) });
    }
    if (claim.status === "failed") {
      const failed = await loadRun(activeRun.id);
      return jsonError(failed?.error_message || "Full workflow failed.", 409, "FULL_WORKFLOW_FAILED");
    }
    if (claim.busy) {
      const busyRun = await loadRun(activeRun.id);
      return NextResponse.json({
        ok: true,
        done: false,
        busy: true,
        run: busyRun ? safeWorkflowRun(busyRun) : safeWorkflowRun(activeRun),
      }, { status: 202 });
    }

    if (claim.step === "finalize") {
      finalizing = true;
      const freshRun = await loadRun(activeRun.id);
      if (!freshRun) throw new Error("Workflow run disappeared before finalization.");
      const completed = await finalizeRun(freshRun);
      return NextResponse.json({
        ok: true,
        done: true,
        run: safeWorkflowRun(completed),
      });
    }

    const claimedStep = claim.step;
    if (!claimedStep || !FULL_LEAD_WORKFLOW_STEPS.includes(claimedStep)) {
      throw new Error("Workflow could not determine the next step.");
    }
    activeStep = claimedStep;

    // Reload after the atomic claim so current_step and steps reflect the step
    // that this request owns.
    activeRun = await loadRun(activeRun.id);
    if (!activeRun) throw new Error("Workflow run could not be reloaded after step claim.");

    const workflowContext = {
      userId: user.id,
      workflowRunId: activeRun.id,
      billingMode: activeRun.mode === "one_time_50_credit_demo"
        ? "fixed_bundle" as const
        : "passthrough" as const,
      fixedCredits: activeRun.fixed_credits,
      allowedFeatures: [
        "lead_analysis",
        "design_generation",
        "outreach_generation",
        "call_prep",
        "proposal_autofill",
      ] as const,
    };

    await runWithAiUsageWorkflowContext(workflowContext, async () => {
      if (claimedStep === "analysis") {
        const { data: freshLead, error: freshLeadError } = await supabase
          .from("leads")
          .select("analysis_status,analysis_error")
          .eq("id", leadId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (freshLeadError) throw new Error(freshLeadError.message);

        if (freshLead?.analysis_status !== "COMPLETED") {
          const formData = new FormData();
          formData.set("leadId", leadId);
          await analyzeLeadWebsite(formData);
        }

        const { data: analyzedLead, error: analyzedLeadError } = await supabase
          .from("leads")
          .select("analysis_status,analysis_error")
          .eq("id", leadId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (analyzedLeadError || analyzedLead?.analysis_status !== "COMPLETED") {
          throw new Error(analyzedLead?.analysis_error || analyzedLeadError?.message || "Website analysis did not complete.");
        }
        await updateFullWorkflowStep({
          runId: activeRun!.id,
          step: "analysis",
          status: freshLead?.analysis_status === "COMPLETED" ? "skipped" : "completed",
        });
        return;
      }

      if (claimedStep === "design") {
        const origin = new URL(request.url).origin;
        const cookieHeader = request.headers.get("cookie") ?? "";
        const designResponse = await fetch(
          `${origin}/api/leads/${encodeURIComponent(leadId)}/redesign-v2`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(cookieHeader ? { cookie: cookieHeader } : {}),
              "x-leadbase-workflow-run": activeRun!.id,
              "x-leadbase-workflow-token": activeRun!.internal_token,
            },
            body: JSON.stringify({
              regenerate: false,
              bulk: false,
              designModel: "gpt-5.6-sol",
              reasoningEffort: "low",
              motionPreset: "none",
              inspirationMemo: "",
              inspirationLinks: [],
              inspirationImages: [],
            }),
            cache: "no-store",
          },
        );
        const designJson = await designResponse.json().catch(() => ({})) as Record<string, unknown>;
        if (!designResponse.ok || designJson.ok === false) {
          throw new Error(
            typeof designJson.error === "string"
              ? designJson.error
              : `Design generation failed with HTTP ${designResponse.status}.`,
          );
        }
        await updateFullWorkflowStep({
          runId: activeRun!.id,
          step: "design",
          status: designJson.generated === false ? "skipped" : "completed",
          detail: {
            previewId: typeof designJson.previewId === "string" ? designJson.previewId : null,
            previewUrl: typeof designJson.previewUrl === "string" ? designJson.previewUrl : null,
            reusedExistingDesign: designJson.generated === false,
          },
        });
        return;
      }

      if (claimedStep === "outreach") {
        const outreach = await generateLeadOutreachDraftForWorkflow(leadId);
        if (outreach.status === "skipped" && /preview/i.test(outreach.reason)) {
          throw new Error(outreach.reason);
        }
        await updateFullWorkflowStep({
          runId: activeRun!.id,
          step: "outreach",
          status: outreach.status === "created" ? "completed" : "skipped",
          detail: {
            reason: outreach.status === "skipped" ? outreach.reason : null,
            previewUrl: outreach.status === "created" ? outreach.previewUrl : null,
          },
        });
        return;
      }

      if (claimedStep === "call_prep") {
        const callPrep = await generateAndSaveWorkflowCallPrep({
          leadId,
          language: language === "en" ? "en" : "de",
        });
        await updateFullWorkflowStep({
          runId: activeRun!.id,
          step: "call_prep",
          status: callPrep.status === "created" ? "completed" : "skipped",
          detail: {
            generatedAt: callPrep.generatedAt,
            reason: callPrep.status === "skipped" ? callPrep.reason : null,
          },
        });
        return;
      }

      const proposal = await generateAndSaveWorkflowProposal({
        leadId,
        language,
      });
      await updateFullWorkflowStep({
        runId: activeRun!.id,
        step: "proposal",
        status: proposal.status === "created" ? "completed" : "skipped",
        detail: {
          proposalId: proposal.proposalId,
          reason: proposal.status === "skipped" ? proposal.reason : null,
        },
      });
    });

    const progressRun = await loadRun(activeRun.id);
    if (!progressRun) throw new Error("Workflow run could not be reloaded after the step.");

    return NextResponse.json({
      ok: true,
      done: false,
      processedStep: claimedStep,
      run: safeWorkflowRun(progressRun),
    }, { status: 202 });
  } catch (error) {
    console.error("Full Lead Workflow failed:", error);
    if (activeRun && !finalizing) {
      try {
        const fresh = await loadRun(activeRun.id);
        if (fresh?.status === "running") {
          await markRunFailed(fresh, activeStep, error);
        }
      } catch (failureError) {
        console.error("Could not mark Full Lead Workflow as failed:", failureError);
      }
    }

    const message = error instanceof Error ? error.message : "Full Lead Workflow failed.";
    if (/full_lead_workflow_runs|leadbase_start_full_workflow|leadbase_claim_full_workflow_step/i.test(message)) {
      return jsonError(
        "Phase 14C database setup is missing. Run sql/23-phase14C-full-lead-workflow.sql first.",
        503,
        "WORKFLOW_SETUP_REQUIRED",
      );
    }
    return jsonError(message, 500, "FULL_WORKFLOW_FAILED");
  }
}

