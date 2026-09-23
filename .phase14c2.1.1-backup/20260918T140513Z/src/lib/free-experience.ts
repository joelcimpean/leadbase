import "server-only";

import { getLeadbasePlanAccess } from "@/lib/plan-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const FREE_SAVED_LEAD_LIMIT = 1;

export type LeadCreationAccess = {
  allowed: boolean;
  planId: "free" | "starter" | "pro" | "scale";
  savedLeadCount: number;
  limit: number | null;
  existingLeadId: string | null;
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
    };
  }

  const admin = createAdminClient();
  const { data, error, count } = await admin
    .from("leads")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`FREE_LEAD_ACCESS_UNAVAILABLE:${error.message}`);
  }

  const savedLeadCount = count ?? data?.length ?? 0;
  const existingLeadId = data?.[0]?.id ?? null;

  return {
    allowed: savedLeadCount < FREE_SAVED_LEAD_LIMIT,
    planId: plan.planId,
    savedLeadCount,
    limit: FREE_SAVED_LEAD_LIMIT,
    existingLeadId,
  };
}
