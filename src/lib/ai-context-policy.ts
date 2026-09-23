import "server-only";

import {
  getLeadbasePlanAccess,
} from "@/lib/plan-access";
import {
  planAllowsFeature,
  type LeadbasePlanId,
} from "@/lib/plan-entitlements";

export type LeadAiContextPolicy = {
  planId: LeadbasePlanId;
  allowCompanyBasics: boolean;
  allowWebsiteUrl: boolean;
  allowUserNotes: boolean;
  allowBroadVisualAnalysis: boolean;
  allowEmailThread: boolean;
  allowResearchSummary: boolean;
  allowStructuralFindings: boolean;
  allowEvidenceAudit: boolean;
  allowAdvancedTechnicalFindings: boolean;
  allowCompetitorResearch: boolean;
  allowAdvancedDesignResearch: boolean;
  allowPreviewSignals: boolean;
};

export async function getLeadAiContextPolicy(
  userId: string,
): Promise<LeadAiContextPolicy> {
  const access = await getLeadbasePlanAccess(userId);
  const free = access.planId === "free";

  return {
    planId: access.planId,
    allowCompanyBasics: true,
    allowWebsiteUrl: true,
    allowUserNotes: true,
    allowBroadVisualAnalysis: true,
    allowEmailThread: true,
    allowResearchSummary: !free,
    allowStructuralFindings: !free,
    allowEvidenceAudit:
      !free && planAllowsFeature(access.planId, "evidence_audit"),
    allowAdvancedTechnicalFindings: !free,
    allowCompetitorResearch:
      planAllowsFeature(access.planId, "competitor_research"),
    allowAdvancedDesignResearch:
      !free && planAllowsFeature(access.planId, "design_research"),
    allowPreviewSignals: !free,
  };
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(
  value: unknown,
  maxLength = 1800,
) {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!clean) return null;
  return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength)}…`;
}

function cleanStringArray(
  value: unknown,
  maxItems = 6,
  maxItemLength = 420,
) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) =>
      item.length <= maxItemLength
        ? item
        : `${item.slice(0, maxItemLength)}…`,
    );
}

/**
 * Free AI may use a broad visual impression, but not hidden technical,
 * structural, PageSpeed or evidence fields that happen to live beside it.
 * Keep this whitelist intentionally small and human-readable.
 */
export function sanitizeBroadVisualAnalysis(
  value: unknown,
): Record<string, unknown> | null {
  if (!isRecord(value)) return null;

  const result: Record<string, unknown> = {};
  const summary = cleanString(value.summary, 1800);
  const redesignReason = cleanString(value.redesignReason, 1200);
  const outreachAngle = cleanString(value.outreachAngle, 1200);
  const strengths = cleanStringArray(value.strengths, 6, 360);
  const weaknesses = cleanStringArray(value.weaknesses, 8, 360);

  if (summary) result.summary = summary;
  if (redesignReason) result.redesignReason = redesignReason;
  if (outreachAngle) result.outreachAngle = outreachAngle;
  if (strengths.length) result.strengths = strengths;
  if (weaknesses.length) result.weaknesses = weaknesses;

  return Object.keys(result).length > 0 ? result : null;
}

export function visualAnalysisForPolicy(
  policy: LeadAiContextPolicy,
  value: unknown,
) {
  if (!policy.allowBroadVisualAnalysis) return null;
  if (policy.allowAdvancedTechnicalFindings) return value ?? null;
  return sanitizeBroadVisualAnalysis(value);
}

export function researchSummaryForPolicy(
  policy: LeadAiContextPolicy,
  value: string | null | undefined,
) {
  return policy.allowResearchSummary ? value ?? null : null;
}

export function structuralFindingsForPolicy(
  policy: LeadAiContextPolicy,
  value: unknown,
) {
  return policy.allowStructuralFindings ? value ?? null : null;
}
