"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getPlanEntitlements,
  normalizePlanId,
  type LeadbasePlanId,
} from "@/lib/plan-entitlements";

type UsagePlanResponse = {
  configured?: boolean;
  plan?: {
    id?: string | null;
    remainingCredits?: number | null;
  };
};

export function useLeadbasePlan() {
  const [planId, setPlanId] = useState<LeadbasePlanId>("free");
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/profile/openai-usage?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as UsagePlanResponse;
      if (response.ok && data.configured === true) {
        setPlanId(normalizePlanId(data.plan?.id));
        setRemainingCredits(
          typeof data.plan?.remainingCredits === "number"
            ? data.plan.remainingCredits
            : null,
        );
        setConfigured(true);
      } else {
        setConfigured(false);
        setRemainingCredits(null);
      }
    } catch {
      // Server-side plan checks remain authoritative. The UI falls back to Free
      // if entitlement metadata cannot be loaded.
      setConfigured(false);
      setRemainingCredits(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onUsageUpdated = () => {
      void refresh();
    };
    window.addEventListener("leadbase:ai-usage-updated", onUsageUpdated);
    return () => window.removeEventListener("leadbase:ai-usage-updated", onUsageUpdated);
  }, [refresh]);

  const entitlements = useMemo(() => getPlanEntitlements(planId), [planId]);

  return {
    planId,
    entitlements,
    remainingCredits,
    configured,
    loading,
    refresh,
  };
}
