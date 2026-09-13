import {
  normalizeDesignModel,
  normalizeDesignReasoningEffort,
  normalizeMotionPreset,
  type DesignModelOption,
  type DesignMotionPreset,
  type DesignReasoningEffort,
} from "@/lib/design-generation-options";

export type LeadbaseDesignDefaults = {
  designModel: DesignModelOption;
  reasoningEffort: DesignReasoningEffort;
  motionPreset: DesignMotionPreset;
};

export const DEFAULT_LEADBASE_DESIGN_DEFAULTS: LeadbaseDesignDefaults = {
  designModel: "gpt-5.6-sol",
  reasoningEffort: "medium",
  motionPreset: "none",
};

export function normalizeLeadbaseDesignDefaults(
  value: unknown,
): LeadbaseDesignDefaults {
  const record =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    designModel: normalizeDesignModel(
      record.designModel,
      DEFAULT_LEADBASE_DESIGN_DEFAULTS.designModel,
    ),
    reasoningEffort: normalizeDesignReasoningEffort(
      record.reasoningEffort,
      DEFAULT_LEADBASE_DESIGN_DEFAULTS.reasoningEffort,
    ),
    motionPreset: normalizeMotionPreset(
      record.motionPreset,
      DEFAULT_LEADBASE_DESIGN_DEFAULTS.motionPreset,
    ),
  };
}
