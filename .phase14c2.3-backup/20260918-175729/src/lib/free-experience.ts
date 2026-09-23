import "server-only";

import { getAiUsageWorkflowContext } from "@/lib/ai-usage";
import { getLeadbasePlanAccess } from "@/lib/plan-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const FREE_SAVED_LEAD_LIMIT = 1;

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
