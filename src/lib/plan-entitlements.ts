/**
 * Phase 14A — Leadbase plan / feature source of truth.
 *
 * This file intentionally contains product policy only. It does NOT perform
 * database reads, provider calls, billing, or request throttling.
 *
 * Phase 14B can use these helpers from every server route so UI locks and
 * backend enforcement share exactly the same rules.
 */

export const LEADBASE_PLAN_MATRIX_VERSION = "phase14a-2026-09-13";

export type LeadbaseBillingInterval = "monthly" | "yearly";
export type LeadbasePublicPlanId = "starter" | "pro" | "scale";
export type LeadbasePlanId = "free" | LeadbasePublicPlanId;

export type LeadbaseAiModel =
  | "gpt-5-mini"
  | "gpt-5.6-luna"
  | "gpt-5.6-terra"
  | "gpt-5.6-sol"
  | "gpt-6-astra";

export type LeadbaseDesignReasoning =
  | "none"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

export type LeadbaseFeatureId =
  // Core product
  | "crm_core"
  | "campaigns"
  | "analytics"
  | "projects"
  | "project_creation"
  | "reminders"
  | "proposal_builder"
  | "proposal_sharing"
  // Discovery / audit
  | "google_places_lead_search"
  | "ai_lead_search"
  | "website_analysis"
  | "evidence_audit"
  | "visual_analysis"
  | "website_screenshot"
  | "pexels_search"
  // Outreach / inbox
  | "outreach_generation"
  | "follow_up_generation"
  | "reply_generation"
  | "reply_intelligence"
  | "gmail_connect"
  | "gmail_sync"
  | "gmail_send"
  | "gmail_schedule"
  // Sales workflow
  | "call_prep"
  | "proposal_autofill"
  | "competitor_research"
  // Design
  | "design_research"
  | "design_generation"
  | "design_motion"
  | "preview_gif"
  | "visual_analysis_localization"
  // Bulk / activation
  | "bulk_analyze"
  | "bulk_outreach"
  | "bulk_design"
  | "full_lead_workflow";

export type LeadbaseFeatureMetering =
  | "included"
  | "credits"
  | "quota"
  | "background";

export type LeadbaseProvider =
  | "openai"
  | "google_places"
  | "google_pagespeed"
  | "gmail"
  | "pexels"
  | "maxibestof"
  | "browser_render"
  | "supabase";

export type LeadbaseFeatureCatalogEntry = {
  label: string;
  category: "core" | "discovery" | "outreach" | "sales" | "design" | "bulk";
  metering: LeadbaseFeatureMetering;
  providers: readonly LeadbaseProvider[];
  defaultModel?: LeadbaseAiModel;
  typicalCredits?: readonly [min: number, max: number];
  heavy?: boolean;
  customerVisible: boolean;
  note?: string;
};

/**
 * Complete feature inventory for cost / entitlement work.
 * Typical Credit ranges are UX estimates only; actual charging remains based
 * on measured provider usage in ai-usage.ts.
 */
export const LEADBASE_FEATURE_CATALOG = {
  crm_core: {
    label: "CRM / Leads",
    category: "core",
    metering: "included",
    providers: ["supabase"],
    customerVisible: true,
  },
  campaigns: {
    label: "Campaigns",
    category: "core",
    metering: "included",
    providers: ["supabase"],
    customerVisible: true,
  },
  analytics: {
    label: "Analytics",
    category: "core",
    metering: "included",
    providers: ["supabase"],
    customerVisible: true,
  },
  projects: {
    label: "Projects",
    category: "core",
    metering: "included",
    providers: ["supabase"],
    customerVisible: true,
  },
  project_creation: {
    label: "Project creation",
    category: "core",
    metering: "included",
    providers: ["supabase"],
    customerVisible: true,
    note: "Accepted proposals may materialize a locked project preview on Free; manual project creation and management require Starter+.",
  },
  reminders: {
    label: "Reminders",
    category: "core",
    metering: "included",
    providers: ["supabase"],
    customerVisible: true,
  },
  proposal_builder: {
    label: "Proposal builder",
    category: "sales",
    metering: "included",
    providers: ["supabase"],
    customerVisible: true,
  },
  proposal_sharing: {
    label: "Proposal sharing / PDF",
    category: "sales",
    metering: "included",
    providers: ["supabase", "browser_render"],
    customerVisible: true,
  },
  google_places_lead_search: {
    label: "Lead search",
    category: "discovery",
    metering: "quota",
    providers: ["google_places"],
    customerVisible: true,
    note: "Google Places usage is plan-limited, not charged as Credits.",
  },
  ai_lead_search: {
    label: "AI Lead Search",
    category: "discovery",
    metering: "credits",
    providers: ["openai", "google_places"],
    defaultModel: "gpt-5-mini",
    typicalCredits: [1, 2],
    customerVisible: true,
  },
  website_analysis: {
    label: "Analyze website",
    category: "discovery",
    metering: "credits",
    providers: ["openai", "browser_render"],
    defaultModel: "gpt-5.6-luna",
    typicalCredits: [1, 3],
    customerVisible: true,
  },
  evidence_audit: {
    label: "Evidence Audit",
    category: "discovery",
    metering: "quota",
    providers: ["google_pagespeed", "browser_render"],
    customerVisible: true,
    note: "Real website evidence. API quota should be cached and plan-limited, not charged as Credits.",
  },
  visual_analysis: {
    label: "Visual website analysis",
    category: "discovery",
    metering: "credits",
    providers: ["openai", "browser_render"],
    defaultModel: "gpt-5.6-luna",
    typicalCredits: [1, 3],
    customerVisible: false,
    note: "Normally part of Analyze website rather than a separate customer charge label.",
  },
  website_screenshot: {
    label: "Website screenshot",
    category: "discovery",
    metering: "quota",
    providers: ["browser_render"],
    heavy: true,
    customerVisible: false,
  },
  pexels_search: {
    label: "Stock image search",
    category: "design",
    metering: "quota",
    providers: ["pexels"],
    customerVisible: true,
  },
  outreach_generation: {
    label: "Generate outreach",
    category: "outreach",
    metering: "credits",
    providers: ["openai"],
    defaultModel: "gpt-5.6-luna",
    typicalCredits: [1, 3],
    customerVisible: true,
  },
  follow_up_generation: {
    label: "Generate follow-up",
    category: "outreach",
    metering: "credits",
    providers: ["openai"],
    defaultModel: "gpt-5.6-luna",
    typicalCredits: [1, 3],
    customerVisible: true,
    note: "Where generation is rule-based rather than AI, no Credit should be charged.",
  },
  reply_generation: {
    label: "Generate inbox reply",
    category: "outreach",
    metering: "credits",
    providers: ["openai"],
    defaultModel: "gpt-5.6-luna",
    typicalCredits: [1, 3],
    customerVisible: true,
  },
  reply_intelligence: {
    label: "Reply intelligence",
    category: "outreach",
    metering: "background",
    providers: ["openai"],
    defaultModel: "gpt-5.6-luna",
    customerVisible: false,
    note: "Classification / OOO / intent intelligence should feel included and be protected by email/rate limits rather than visible Credit charges.",
  },
  gmail_connect: {
    label: "Connect Gmail",
    category: "outreach",
    metering: "included",
    providers: ["gmail"],
    customerVisible: true,
  },
  gmail_sync: {
    label: "Gmail sync",
    category: "outreach",
    metering: "quota",
    providers: ["gmail", "supabase"],
    customerVisible: true,
  },
  gmail_send: {
    label: "Send email",
    category: "outreach",
    metering: "quota",
    providers: ["gmail"],
    customerVisible: true,
  },
  gmail_schedule: {
    label: "Schedule email / follow-up",
    category: "outreach",
    metering: "quota",
    providers: ["gmail", "supabase"],
    customerVisible: true,
  },
  call_prep: {
    label: "Call prep",
    category: "sales",
    metering: "credits",
    providers: ["openai"],
    defaultModel: "gpt-5.6-luna",
    typicalCredits: [1, 4],
    customerVisible: true,
  },
  proposal_autofill: {
    label: "Proposal AI autofill",
    category: "sales",
    metering: "credits",
    providers: ["openai"],
    defaultModel: "gpt-5.6-luna",
    typicalCredits: [2, 6],
    customerVisible: true,
  },
  competitor_research: {
    label: "Competitor research",
    category: "sales",
    metering: "credits",
    providers: ["openai", "google_places", "google_pagespeed", "browser_render"],
    defaultModel: "gpt-5.6-terra",
    typicalCredits: [5, 20],
    heavy: true,
    customerVisible: true,
  },
  design_research: {
    label: "Design research",
    category: "design",
    metering: "credits",
    providers: ["openai", "maxibestof"],
    defaultModel: "gpt-5.6-luna",
    typicalCredits: [3, 12],
    heavy: true,
    customerVisible: false,
    note: "Usually an internal stage of design generation; do not double-label it as a separate charge when included in a design run.",
  },
  design_generation: {
    label: "AI website design",
    category: "design",
    metering: "credits",
    providers: ["openai", "browser_render", "pexels"],
    defaultModel: "gpt-5.6-sol",
    typicalCredits: [15, 50],
    heavy: true,
    customerVisible: true,
    note: "Sol High / Astra can exceed the standard estimate and should show their own estimate before generation.",
  },
  design_motion: {
    label: "Enhance Motion",
    category: "design",
    metering: "credits",
    providers: ["openai"],
    defaultModel: "gpt-5.6-sol",
    typicalCredits: [5, 20],
    heavy: true,
    customerVisible: true,
  },
  preview_gif: {
    label: "Preview GIF",
    category: "design",
    metering: "quota",
    providers: ["browser_render"],
    heavy: true,
    customerVisible: true,
  },
  visual_analysis_localization: {
    label: "Visual analysis localization",
    category: "design",
    metering: "background",
    providers: ["openai"],
    defaultModel: "gpt-5.6-luna",
    customerVisible: false,
  },
  bulk_analyze: {
    label: "Bulk Analyze",
    category: "bulk",
    metering: "credits",
    providers: ["openai", "google_pagespeed", "browser_render"],
    heavy: true,
    customerVisible: true,
    note: "Credits are charged per lead / provider usage; plan limits only cap batch size.",
  },
  bulk_outreach: {
    label: "Bulk Outreach",
    category: "bulk",
    metering: "credits",
    providers: ["openai"],
    heavy: true,
    customerVisible: true,
    note: "Credits are charged per generated lead; plan limits only cap batch size.",
  },
  bulk_design: {
    label: "Bulk Design",
    category: "bulk",
    metering: "credits",
    providers: ["openai", "browser_render", "pexels", "maxibestof"],
    heavy: true,
    customerVisible: true,
    note: "Paid plans can run multiple user jobs in parallel; batch size limits stop one account from flooding provider capacity.",
  },
  full_lead_workflow: {
    label: "Full AI lead workflow",
    category: "bulk",
    metering: "credits",
    providers: ["openai", "google_pagespeed", "browser_render"],
    defaultModel: "gpt-5.6-luna",
    typicalCredits: [20, 60],
    heavy: true,
    customerVisible: true,
    note: "Free activation flow is a one-time 50-Credit bundle on a user-selected lead. Paid plans use normal measured Credit charging.",
  },
} as const satisfies Record<LeadbaseFeatureId, LeadbaseFeatureCatalogEntry>;

export type LeadbasePlanLimits = {
  leadMonthlyLimit: number;
  emailDailyLimit: number;
  redesignMonthlyLimit: number;
  aiLeadSearchMaxResultsPerRun: number;
  bulkAnalyzeMaxLeads: number;
  bulkOutreachMaxLeads: number;
  bulkDesignMaxLeads: number;
  bulkGifMaxLeads: number;
  pageSpeedMode: "trial" | "mobile" | "mobile_desktop";
};

export type LeadbaseFullLeadWorkflowPolicy = {
  enabled: boolean;
  mode: "one_time_50_credit_demo" | "normal_credits";
  fixedDemoCredits: number | null;
  forcedDemoDesignModel: LeadbaseAiModel | null;
};

export type LeadbasePlanEntitlements = {
  aiModels: readonly LeadbaseAiModel[];
  userSelectableDesignModels: readonly LeadbaseAiModel[];
  maxDesignReasoning: LeadbaseDesignReasoning;
  features: readonly LeadbaseFeatureId[];
  limits: LeadbasePlanLimits;
  fullLeadWorkflow: LeadbaseFullLeadWorkflowPolicy;

  // Backward-compatible flags already used by Phase 13. Phase 14B will move
  // route enforcement to planAllowsFeature()/limits and can remove these later.
  designGeneration: boolean;
  designMotion: boolean;
  competitorResearch: boolean;
  bulkDesign: boolean;
  priorityQueue: boolean;
};

const CORE_FEATURES = [
  "crm_core",
  "campaigns",
  "projects",
  "reminders",
  "proposal_builder",
  "proposal_sharing",
  "google_places_lead_search",
  "gmail_connect",
  "gmail_sync",
  "gmail_send",
  "gmail_schedule",
  "pexels_search",
] as const satisfies readonly LeadbaseFeatureId[];

const PAID_WORKSPACE_FEATURES = [
  "analytics",
  "project_creation",
] as const satisfies readonly LeadbaseFeatureId[];

const BASIC_AI_FEATURES = [
  "ai_lead_search",
  "website_analysis",
  "evidence_audit",
  "visual_analysis",
  "website_screenshot",
  "outreach_generation",
  "follow_up_generation",
  "reply_generation",
  "reply_intelligence",
  "call_prep",
  "proposal_autofill",
  "visual_analysis_localization",
] as const satisfies readonly LeadbaseFeatureId[];

const ALL_MODELS_EXCEPT_ASTRA: readonly LeadbaseAiModel[] = [
  "gpt-5-mini",
  "gpt-5.6-luna",
  "gpt-5.6-terra",
  "gpt-5.6-sol",
];

const ALL_MODELS: readonly LeadbaseAiModel[] = [
  ...ALL_MODELS_EXCEPT_ASTRA,
  "gpt-6-astra",
];

export const LEADBASE_PLAN_ENTITLEMENTS: Record<LeadbasePlanId, LeadbasePlanEntitlements> = {
  free: {
    aiModels: ["gpt-5-mini", "gpt-5.6-luna"],
    userSelectableDesignModels: [],
    maxDesignReasoning: "low",
    features: [
      ...CORE_FEATURES,
      ...BASIC_AI_FEATURES,
      "full_lead_workflow",
    ],
    limits: {
      leadMonthlyLimit: 1,
      emailDailyLimit: 20,
      redesignMonthlyLimit: 1,
      aiLeadSearchMaxResultsPerRun: 10,
      bulkAnalyzeMaxLeads: 1,
      bulkOutreachMaxLeads: 1,
      bulkDesignMaxLeads: 0,
      bulkGifMaxLeads: 0,
      pageSpeedMode: "trial",
    },
    fullLeadWorkflow: {
      enabled: true,
      mode: "one_time_50_credit_demo",
      fixedDemoCredits: 50,
      forcedDemoDesignModel: "gpt-5.6-sol",
    },
    designGeneration: false,
    designMotion: false,
    competitorResearch: false,
    bulkDesign: false,
    priorityQueue: false,
  },
  starter: {
    aiModels: ALL_MODELS_EXCEPT_ASTRA,
    userSelectableDesignModels: ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"],
    maxDesignReasoning: "medium",
    features: [
      ...CORE_FEATURES,
      ...PAID_WORKSPACE_FEATURES,
      ...BASIC_AI_FEATURES,
      "design_research",
      "design_generation",
      "bulk_analyze",
      "bulk_outreach",
      "full_lead_workflow",
    ],
    limits: {
      leadMonthlyLimit: 250,
      emailDailyLimit: 100,
      redesignMonthlyLimit: 10,
      aiLeadSearchMaxResultsPerRun: 25,
      bulkAnalyzeMaxLeads: 10,
      bulkOutreachMaxLeads: 10,
      bulkDesignMaxLeads: 0,
      bulkGifMaxLeads: 0,
      pageSpeedMode: "mobile",
    },
    fullLeadWorkflow: {
      enabled: true,
      mode: "normal_credits",
      fixedDemoCredits: null,
      forcedDemoDesignModel: null,
    },
    designGeneration: true,
    designMotion: false,
    competitorResearch: false,
    bulkDesign: false,
    priorityQueue: false,
  },
  pro: {
    aiModels: ALL_MODELS_EXCEPT_ASTRA,
    userSelectableDesignModels: ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"],
    maxDesignReasoning: "high",
    features: [
      ...CORE_FEATURES,
      ...PAID_WORKSPACE_FEATURES,
      ...BASIC_AI_FEATURES,
      "competitor_research",
      "design_research",
      "design_generation",
      "design_motion",
      "preview_gif",
      "bulk_analyze",
      "bulk_outreach",
      "bulk_design",
      "full_lead_workflow",
    ],
    limits: {
      leadMonthlyLimit: 1_500,
      emailDailyLimit: 300,
      redesignMonthlyLimit: 50,
      aiLeadSearchMaxResultsPerRun: 50,
      bulkAnalyzeMaxLeads: 50,
      bulkOutreachMaxLeads: 50,
      bulkDesignMaxLeads: 10,
      bulkGifMaxLeads: 10,
      pageSpeedMode: "mobile",
    },
    fullLeadWorkflow: {
      enabled: true,
      mode: "normal_credits",
      fixedDemoCredits: null,
      forcedDemoDesignModel: null,
    },
    designGeneration: true,
    designMotion: true,
    competitorResearch: true,
    bulkDesign: true,
    priorityQueue: false,
  },
  scale: {
    aiModels: ALL_MODELS,
    userSelectableDesignModels: ["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol", "gpt-6-astra"],
    maxDesignReasoning: "max",
    features: [
      ...CORE_FEATURES,
      ...PAID_WORKSPACE_FEATURES,
      ...BASIC_AI_FEATURES,
      "competitor_research",
      "design_research",
      "design_generation",
      "design_motion",
      "preview_gif",
      "bulk_analyze",
      "bulk_outreach",
      "bulk_design",
      "full_lead_workflow",
    ],
    limits: {
      leadMonthlyLimit: 5_000,
      emailDailyLimit: 500,
      redesignMonthlyLimit: 150,
      aiLeadSearchMaxResultsPerRun: 60,
      bulkAnalyzeMaxLeads: 200,
      bulkOutreachMaxLeads: 200,
      bulkDesignMaxLeads: 25,
      bulkGifMaxLeads: 25,
      pageSpeedMode: "mobile_desktop",
    },
    fullLeadWorkflow: {
      enabled: true,
      mode: "normal_credits",
      fixedDemoCredits: null,
      forcedDemoDesignModel: null,
    },
    designGeneration: true,
    designMotion: true,
    competitorResearch: true,
    bulkDesign: true,
    // Leadbase currently has no visible global queue. Keep this false so Phase
    // 14 does not accidentally sell or imply a queue-based product feature.
    priorityQueue: false,
  },
};


const AI_FEATURE_TO_PLAN_FEATURE: Readonly<Record<string, LeadbaseFeatureId | null>> = {
  lead_analysis: "website_analysis",
  ai_lead_search: "ai_lead_search",
  design_generation: "design_generation",
  design_motion: "design_motion",
  outreach_generation: "outreach_generation",
  follow_up_generation: "follow_up_generation",
  reply_generation: "reply_generation",
  reply_intelligence: "reply_intelligence",
  proposal_autofill: "proposal_autofill",
  competitor_research: "competitor_research",
  call_prep: "call_prep",
  visual_analysis: "visual_analysis",
  visual_analysis_localization: "visual_analysis_localization",
  design_research: "design_research",
  full_lead_workflow: "full_lead_workflow",
  other: null,
};

export function planFeatureForAiFeature(feature: string | null | undefined) {
  const key = feature?.trim() || "other";
  return AI_FEATURE_TO_PLAN_FEATURE[key] ?? null;
}

export function minimumPlanForFeature(feature: LeadbaseFeatureId): LeadbasePlanId | null {
  const order: readonly LeadbasePlanId[] = ["free", "starter", "pro", "scale"];
  return order.find((planId) => planAllowsFeature(planId, feature)) ?? null;
}

export function minimumPlanForModel(model: LeadbaseAiModel): LeadbasePlanId | null {
  const order: readonly LeadbasePlanId[] = ["free", "starter", "pro", "scale"];
  return order.find((planId) => LEADBASE_PLAN_ENTITLEMENTS[planId].aiModels.includes(model)) ?? null;
}

const REASONING_ORDER = ["none", "low", "medium", "high", "xhigh", "max"] as const;

export function normalizePlanId(value: unknown): LeadbasePlanId {
  return value === "starter" || value === "pro" || value === "scale" ? value : "free";
}

export function getPlanEntitlements(planId: LeadbasePlanId) {
  return LEADBASE_PLAN_ENTITLEMENTS[planId];
}

export function planAllowsFeature(planId: LeadbasePlanId, feature: LeadbaseFeatureId) {
  return LEADBASE_PLAN_ENTITLEMENTS[planId].features.includes(feature);
}

export function getPlanLimit<K extends keyof LeadbasePlanLimits>(
  planId: LeadbasePlanId,
  limit: K,
): LeadbasePlanLimits[K] {
  return LEADBASE_PLAN_ENTITLEMENTS[planId].limits[limit];
}

export function planAllowsAiRequest(input: {
  planId: LeadbasePlanId;
  feature?: string | null;
  model?: string | null;
  reasoningEffort?: string | null;
}) {
  const entitlement = LEADBASE_PLAN_ENTITLEMENTS[input.planId];
  const feature = input.feature ?? "other";
  const planFeature = planFeatureForAiFeature(feature);
  const model = input.model?.trim() || null;

  if (planFeature && !planAllowsFeature(input.planId, planFeature)) {
    return { ok: false as const, reason: "FEATURE_NOT_INCLUDED" as const };
  }

  if (model && !entitlement.aiModels.includes(model as LeadbaseAiModel)) {
    return { ok: false as const, reason: "MODEL_NOT_INCLUDED" as const };
  }

  // Starter includes Sol Standard for website design, but Sol is not a general
  // text/utility model on Starter. Buying extra Credits must never bypass this.
  if (
    input.planId === "starter" &&
    model === "gpt-5.6-sol" &&
    planFeature !== "design_generation"
  ) {
    return { ok: false as const, reason: "MODEL_NOT_INCLUDED" as const };
  }

  // maxDesignReasoning is intentionally a design entitlement. Do not apply it
  // to low-level reasoning used by text helpers such as outreach/call prep.
  const isDesignReasoning =
    planFeature === "design_generation" ||
    planFeature === "design_motion" ||
    planFeature === "design_research";

  const effort = input.reasoningEffort?.toLowerCase();
  if (
    isDesignReasoning &&
    effort &&
    REASONING_ORDER.includes(effort as (typeof REASONING_ORDER)[number])
  ) {
    const requested = REASONING_ORDER.indexOf(effort as (typeof REASONING_ORDER)[number]);
    const allowed = REASONING_ORDER.indexOf(entitlement.maxDesignReasoning);
    if (requested > allowed) {
      return { ok: false as const, reason: "REASONING_NOT_INCLUDED" as const };
    }
  }

  return { ok: true as const };
}

