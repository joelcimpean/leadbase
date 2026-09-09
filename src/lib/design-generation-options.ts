export const DESIGN_MODEL_OPTIONS = [
  "gpt-6-astra",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
] as const;

export type DesignModelOption =
  (typeof DESIGN_MODEL_OPTIONS)[number];

export type DesignReasoningEffort =
  | "low"
  | "medium"
  | "high";

export type DesignMotionPreset =
  | "none"
  | "subtle"
  | "premium";

export function isDesignModelOption(
  value: unknown
): value is DesignModelOption {
  return (
    typeof value === "string" &&
    (DESIGN_MODEL_OPTIONS as readonly string[]).includes(value)
  );
}

export function normalizeDesignModel(
  value: unknown,
  fallback = process.env.OPENAI_REDESIGN_DESIGN_MODEL ?? "gpt-5.6-sol"
): DesignModelOption {
  if (isDesignModelOption(value)) {
    return value;
  }

  if (isDesignModelOption(fallback)) {
    return fallback;
  }

  return "gpt-5.6-sol";
}

export function normalizeDesignReasoningEffort(
  value: unknown,
  fallback: DesignReasoningEffort = "high"
): DesignReasoningEffort {
  switch (value) {
    case "low":
    case "medium":
    case "high":
      return value;
    default:
      return fallback;
  }
}

export function normalizeMotionPreset(
  value: unknown,
  fallback: DesignMotionPreset = "none"
): DesignMotionPreset {
  switch (value) {
    case "none":
    case "subtle":
    case "premium":
      return value;
    default:
      return fallback;
  }
}

export function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function buildDesignInspirationMemo({
  baseResearch,
  inspirationMemo,
  inspirationLinks,
  inspirationImages,
  motionPreset,
}: {
  baseResearch: string | null;
  inspirationMemo: string | null;
  inspirationLinks: string[];
  inspirationImages: string[];
  motionPreset: DesignMotionPreset;
}) {
  const blocks: string[] = [];

  if (baseResearch?.trim()) {
    blocks.push(baseResearch.trim());
  }

  if (inspirationMemo?.trim()) {
    blocks.push(
      [
        "User-provided visual direction:",
        inspirationMemo.trim(),
      ].join("\n")
    );
  }

  if (inspirationLinks.length > 0) {
    blocks.push(
      [
        "Website inspiration links to study and interpret:",
        ...inspirationLinks.map(
          (link, index) => `${index + 1}. ${link}`
        ),
      ].join("\n")
    );
  }

  if (inspirationImages.length > 0) {
    blocks.push(
      [
        "Reference image URLs available to the system:",
        ...inspirationImages.map(
          (link, index) => `${index + 1}. ${link}`
        ),
      ].join("\n")
    );
  }

  if (motionPreset === "subtle") {
    blocks.push(
      "Requested motion treatment: Add only subtle premium micro-interactions, calm hover states, small reveal effects, and restrained motion that still feels professional."
    );
  }

  if (motionPreset === "premium") {
    blocks.push(
      "Requested motion treatment: Add a richer interaction layer with hover states, staggered reveal animations, smooth section transitions, tasteful scroll motion, and premium micro-interactions. Keep motion elegant and not gimmicky."
    );
  }

  return blocks.length > 0
    ? blocks.join("\n\n")
    : null;
}
