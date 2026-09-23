import "server-only";

import { randomUUID } from "node:crypto";

import { getAiUsageWorkflowContext } from "@/lib/ai-usage";
import { getLeadbasePlanAccess } from "@/lib/plan-access";
import { isUsefulIncomingProposalMessage } from "@/lib/proposal-email-history";
import { createAdminClient } from "@/lib/supabase/admin";

export const FREE_SAVED_LEAD_LIMIT = 1;
const FREE_CALL_PREP_CLAIM_TTL_MS = 10 * 60 * 1000;

export type LeadCreationAccess = {
  allowed: boolean;
  planId: "free" | "starter" | "pro" | "scale";
  savedLeadCount: number;
  limit: number | null;
  existingLeadId: string | null;
  freeLeadClaimed: boolean;
};

export async function getLeadCreationAccess(userId: string): Promise<LeadCreationAccess> {
  const plan = await getLeadbasePlanAccess(userId);

  if (plan.planId !== "free") {
    return {
      allowed: true,
      planId: plan.planId,
      savedLeadCount: 0,
      limit: null,
      existingLeadId: null,
      freeLeadClaimed: false,
    };
  }

  const admin = createAdminClient();
  const [{ data: state, error: stateError }, { data: leadRows, error: leadError, count }] = await Promise.all([
    admin
      .from("free_experience_state")
      .select("free_lead_claimed_at, free_lead_id")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("leads")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  if (stateError) {
    throw new Error(`FREE_LEAD_ACCESS_UNAVAILABLE:${stateError.message}`);
  }
  if (leadError) {
    throw new Error(`FREE_LEAD_ACCESS_UNAVAILABLE:${leadError.message}`);
  }

  const savedLeadCount = count ?? leadRows?.length ?? 0;
  const existingLeadId = leadRows?.[0]?.id ?? null;
  const freeLeadClaimed = Boolean(state?.free_lead_claimed_at) || savedLeadCount >= FREE_SAVED_LEAD_LIMIT;

  return {
    allowed: !freeLeadClaimed,
    planId: plan.planId,
    savedLeadCount,
    limit: FREE_SAVED_LEAD_LIMIT,
    existingLeadId: state?.free_lead_id ?? existingLeadId,
    freeLeadClaimed,
  };
}

export class FreeDirectAiActionError extends Error {
  readonly code = "FREE_FULL_WORKFLOW_ONLY" as const;

  constructor() {
    super("FREE_FULL_WORKFLOW_ONLY");
    this.name = "FreeDirectAiActionError";
  }
}

/**
 * Free activation is intentionally one bundled workflow instead of a pool of
 * individual AI buttons. A verified Full Lead Workflow sponsor runs inside
 * AsyncLocalStorage and is allowed through; direct Free requests are not.
 */
export async function assertDirectAiActionAllowed(userId: string) {
  const workflow = getAiUsageWorkflowContext();
  if (workflow?.userId === userId) return;

  const plan = await getLeadbasePlanAccess(userId);
  if (plan.planId === "free") {
    throw new FreeDirectAiActionError();
  }
}

export function isFreeDirectAiActionError(
  error: unknown,
): error is FreeDirectAiActionError {
  return error instanceof FreeDirectAiActionError ||
    (error instanceof Error && error.message === "FREE_FULL_WORKFLOW_ONLY");
}

export type FreeWorkspaceLeadScope = {
  restricted: boolean;
  leadId: string | null;
};

export async function getFreeWorkspaceLeadScope(
  userId: string,
): Promise<FreeWorkspaceLeadScope> {
  const plan = await getLeadbasePlanAccess(userId);
  if (plan.planId !== "free") {
    return { restricted: false, leadId: null };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("free_experience_state")
    .select("free_lead_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`FREE_WORKSPACE_SCOPE_UNAVAILABLE:${error.message}`);
  }

  return {
    restricted: true,
    leadId: data?.free_lead_id ?? null,
  };
}

export async function assertFreeWorkspaceLeadAllowed(
  userId: string,
  leadId: string,
) {
  const scope = await getFreeWorkspaceLeadScope(userId);
  if (!scope.restricted) return scope;

  if (!scope.leadId || scope.leadId !== leadId) {
    throw new Error("FREE_WORKSPACE_LEAD_SCOPE_DENIED");
  }

  return scope;
}

export function isFreeWorkspaceLeadScopeError(error: unknown) {
  return error instanceof Error &&
    error.message === "FREE_WORKSPACE_LEAD_SCOPE_DENIED";
}

export type FreePostReplyCallPrepStatus = {
  isFree: boolean;
  eligible: boolean;
  used: boolean;
  inProgress: boolean;
  leadId: string | null;
  messageId: string | null;
  reason:
    | "PAID_PLAN"
    | "NO_FREE_LEAD"
    | "WRONG_LEAD"
    | "WORKFLOW_NOT_COMPLETED"
    | "NO_CUSTOMER_REPLY"
    | "LATEST_REPLY_NOT_USEFUL"
    | "ALREADY_USED"
    | "IN_PROGRESS"
    | "READY";
};

type FreeExperienceStateRow = {
  free_lead_id: string | null;
  free_call_prep_refresh_claimed_at: string | null;
  free_call_prep_refresh_claim_token: string | null;
  free_call_prep_refresh_used_at: string | null;
  free_call_prep_refresh_message_id: string | null;
};

async function loadFreeExperienceState(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("free_experience_state")
    .select(`
      free_lead_id,
      free_call_prep_refresh_claimed_at,
      free_call_prep_refresh_claim_token,
      free_call_prep_refresh_used_at,
      free_call_prep_refresh_message_id
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`FREE_EXPERIENCE_STATE_UNAVAILABLE:${error.message}`);
  }

  return (data ?? null) as FreeExperienceStateRow | null;
}

export async function getFreePostReplyCallPrepStatus(
  userId: string,
  leadId: string,
): Promise<FreePostReplyCallPrepStatus> {
  const plan = await getLeadbasePlanAccess(userId);
  if (plan.planId !== "free") {
    return {
      isFree: false,
      eligible: false,
      used: false,
      inProgress: false,
      leadId,
      messageId: null,
      reason: "PAID_PLAN",
    };
  }

  const state = await loadFreeExperienceState(userId);
  if (!state?.free_lead_id) {
    return {
      isFree: true,
      eligible: false,
      used: false,
      inProgress: false,
      leadId: null,
      messageId: null,
      reason: "NO_FREE_LEAD",
    };
  }

  if (state.free_lead_id !== leadId) {
    return {
      isFree: true,
      eligible: false,
      used: Boolean(state.free_call_prep_refresh_used_at),
      inProgress: false,
      leadId: state.free_lead_id,
      messageId: state.free_call_prep_refresh_message_id,
      reason: "WRONG_LEAD",
    };
  }

  if (state.free_call_prep_refresh_used_at) {
    return {
      isFree: true,
      eligible: false,
      used: true,
      inProgress: false,
      leadId,
      messageId: state.free_call_prep_refresh_message_id,
      reason: "ALREADY_USED",
    };
  }

  const claimedAt = state.free_call_prep_refresh_claimed_at
    ? new Date(state.free_call_prep_refresh_claimed_at).getTime()
    : 0;
  const activeClaim =
    Boolean(state.free_call_prep_refresh_claim_token) &&
    Number.isFinite(claimedAt) &&
    claimedAt > Date.now() - FREE_CALL_PREP_CLAIM_TTL_MS;

  if (activeClaim) {
    return {
      isFree: true,
      eligible: false,
      used: false,
      inProgress: true,
      leadId,
      messageId: state.free_call_prep_refresh_message_id,
      reason: "IN_PROGRESS",
    };
  }

  const admin = createAdminClient();
  const { data: workflow, error: workflowError } = await admin
    .from("full_lead_workflow_runs")
    .select("id,completed_at")
    .eq("user_id", userId)
    .eq("lead_id", leadId)
    .eq("mode", "one_time_50_credit_demo")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (workflowError) {
    throw new Error(`FREE_CALL_PREP_WORKFLOW_CHECK_FAILED:${workflowError.message}`);
  }

  if (!workflow?.completed_at) {
    return {
      isFree: true,
      eligible: false,
      used: false,
      inProgress: false,
      leadId,
      messageId: null,
      reason: "WORKFLOW_NOT_COMPLETED",
    };
  }

  const { data: incomingMessages, error: messageError } = await admin
    .from("email_messages")
    .select("id,direction,subject,body_text,received_at,reply_classification")
    .eq("user_id", userId)
    .eq("lead_id", leadId)
    .eq("direction", "INCOMING")
    .gte("received_at", workflow.completed_at)
    .order("received_at", { ascending: false })
    .limit(20);

  if (messageError) {
    throw new Error(`FREE_CALL_PREP_REPLY_CHECK_FAILED:${messageError.message}`);
  }

  const incoming = incomingMessages ?? [];
  if (incoming.length === 0) {
    return {
      isFree: true,
      eligible: false,
      used: false,
      inProgress: false,
      leadId,
      messageId: null,
      reason: "NO_CUSTOMER_REPLY",
    };
  }

  const usefulIncoming = incoming.find(isUsefulIncomingProposalMessage) ?? null;
  if (!usefulIncoming) {
    return {
      isFree: true,
      eligible: false,
      used: false,
      inProgress: false,
      leadId,
      messageId: incoming[0]?.id ?? null,
      reason: "LATEST_REPLY_NOT_USEFUL",
    };
  }

  return {
    isFree: true,
    eligible: true,
    used: false,
    inProgress: false,
    leadId,
    messageId: usefulIncoming.id,
    reason: "READY",
  };
}

export type FreePostReplyCallPrepClaim = {
  token: string;
  messageId: string;
};

export async function claimFreePostReplyCallPrepRefresh(
  userId: string,
  leadId: string,
): Promise<FreePostReplyCallPrepClaim | null> {
  const status = await getFreePostReplyCallPrepStatus(userId, leadId);
  if (!status.eligible || !status.messageId) return null;

  const admin = createAdminClient();
  const token = randomUUID();
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - FREE_CALL_PREP_CLAIM_TTL_MS).toISOString();

  const { data, error } = await admin
    .from("free_experience_state")
    .update({
      free_call_prep_refresh_claimed_at: now,
      free_call_prep_refresh_claim_token: token,
      free_call_prep_refresh_message_id: status.messageId,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("free_lead_id", leadId)
    .is("free_call_prep_refresh_used_at", null)
    .or(
      `free_call_prep_refresh_claimed_at.is.null,free_call_prep_refresh_claimed_at.lt.${staleBefore}`,
    )
    .select("free_call_prep_refresh_claim_token,free_call_prep_refresh_message_id")
    .maybeSingle();

  if (error) {
    throw new Error(`FREE_CALL_PREP_CLAIM_FAILED:${error.message}`);
  }
  if (!data || data.free_call_prep_refresh_claim_token !== token) return null;

  return {
    token,
    messageId: String(data.free_call_prep_refresh_message_id ?? status.messageId),
  };
}

export async function finalizeFreePostReplyCallPrepRefresh(
  userId: string,
  leadId: string,
  claim: FreePostReplyCallPrepClaim,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("free_experience_state")
    .update({
      free_call_prep_refresh_used_at: now,
      free_call_prep_refresh_claimed_at: null,
      free_call_prep_refresh_claim_token: null,
      free_call_prep_refresh_message_id: claim.messageId,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("free_lead_id", leadId)
    .eq("free_call_prep_refresh_claim_token", claim.token)
    .is("free_call_prep_refresh_used_at", null)
    .select("user_id")
    .maybeSingle();

  if (error) {
    throw new Error(`FREE_CALL_PREP_FINALIZE_FAILED:${error.message}`);
  }
  if (!data) {
    throw new Error("FREE_CALL_PREP_FINALIZE_FAILED:claim_not_found");
  }
}

export async function releaseFreePostReplyCallPrepRefresh(
  userId: string,
  leadId: string,
  claim: FreePostReplyCallPrepClaim,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("free_experience_state")
    .update({
      free_call_prep_refresh_claimed_at: null,
      free_call_prep_refresh_claim_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("free_lead_id", leadId)
    .eq("free_call_prep_refresh_claim_token", claim.token)
    .is("free_call_prep_refresh_used_at", null);

  if (error) {
    console.error("Could not release Free post-reply Call Prep claim:", error);
  }
}
