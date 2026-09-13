import { cn } from "@/lib/utils";

export type CreditEstimateFeature =
  | "lead_analysis"
  | "ai_lead_search"
  | "outreach_generation"
  | "reply_generation"
  | "proposal_autofill"
  | "call_prep"
  | "competitor_research"
  | "design_motion";

const ESTIMATES: Record<CreditEstimateFeature, string> = {
  lead_analysis: "1–3",
  ai_lead_search: "1–4",
  outreach_generation: "1–3",
  reply_generation: "1–3",
  proposal_autofill: "1–3",
  call_prep: "1–4",
  competitor_research: "5–20",
  design_motion: "8–30",
};

function scaleRange(range: [number, number], multiplier: number): [number, number] {
  return [
    Math.max(1, Math.round(range[0] * multiplier)),
    Math.max(1, Math.round(range[1] * multiplier)),
  ];
}

export function designCreditEstimate(
  model?: string | null,
  reasoningEffort?: string | null,
) {
  const normalized = model?.toLowerCase() ?? "";
  let range: [number, number] = normalized.includes("astra")
    ? [60, 180]
    : normalized.includes("terra")
      ? [20, 60]
      : normalized.includes("luna")
        ? [5, 20]
        : [15, 50];

  const effort = reasoningEffort?.toLowerCase() ?? "";
  if (effort === "high") range = scaleRange(range, 1.45);
  else if (effort === "medium") range = scaleRange(range, 1.15);

  return `${range[0]}–${range[1]}`;
}

export function CreditEstimatePill({
  feature,
  estimate,
  language = "en",
  className,
  hideOnSmall = false,
}: {
  feature?: CreditEstimateFeature;
  estimate?: string;
  language?: "de" | "en";
  className?: string;
  hideOnSmall?: boolean;
}) {
  const value = estimate ?? (feature ? ESTIMATES[feature] : null);
  if (!value) return null;

  const title = language === "de"
    ? "Typischer Richtwert. Der tatsächliche Verbrauch hängt vom Modell, Umfang und Ergebnis ab."
    : "Typical estimate. Actual usage depends on the model, request size, and result.";

  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center rounded-[6px] border border-current/10 bg-current/[0.045] px-1.5 py-0.5 font-mono text-[8.5px] font-medium leading-none tracking-[-0.01em] opacity-70",
        hideOnSmall ? "hidden sm:inline-flex" : "",
        className,
      )}
    >
      ~{value} {language === "de" ? "Credits" : "Credits"}
    </span>
  );
}
