"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Sparkles, X } from "lucide-react";

import { saveDesignDefaults } from "@/app/onboarding/actions";
import {
  type LeadbaseDesignDefaults,
} from "@/lib/design-defaults";
import type {
  DesignModelOption,
  DesignMotionPreset,
  DesignReasoningEffort,
} from "@/lib/design-generation-options";
import {
  getPlanEntitlements,
  planAllowsFeature,
  type LeadbasePlanId,
} from "@/lib/plan-entitlements";

export function DesignDefaultsDialog({
  initial,
  language,
  planId,
  onClose,
  onSaved,
}: {
  initial: LeadbaseDesignDefaults;
  language: "de" | "en";
  planId: LeadbasePlanId;
  onClose: () => void;
  onSaved: (value: LeadbaseDesignDefaults) => void;
}) {
  const de = language === "de";
  const [designModel, setDesignModel] = useState<DesignModelOption>(initial.designModel);
  const [reasoningEffort, setReasoningEffort] = useState<DesignReasoningEffort>(initial.reasoningEffort);
  const [motionPreset, setMotionPreset] = useState<DesignMotionPreset>(initial.motionPreset);
  const entitlements = getPlanEntitlements(planId);
  const allowedModels = new Set(entitlements.userSelectableDesignModels);
  const canConfigureDesign = planAllowsFeature(planId, "design_generation");
  const canUseMotion = planAllowsFeature(planId, "design_motion");
  const maxReasoning = entitlements.maxDesignReasoning;
  const reasoningOrder = ["low", "medium", "high"] as const;
  const maxReasoningIndex = Math.max(0, reasoningOrder.indexOf(maxReasoning as (typeof reasoningOrder)[number]));
  const reasoningAllowed = (value: DesignReasoningEffort) =>
    reasoningOrder.indexOf(value) <= maxReasoningIndex;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canConfigureDesign) return;

    if (!allowedModels.has(designModel)) {
      const fallbackModel = entitlements.userSelectableDesignModels[0] as DesignModelOption | undefined;
      if (fallbackModel) setDesignModel(fallbackModel);
    }

    if (!reasoningAllowed(reasoningEffort)) {
      const fallbackReasoning = reasoningOrder[maxReasoningIndex] ?? "low";
      setReasoningEffort(fallbackReasoning);
    }

    if (!canUseMotion && motionPreset !== "none") {
      setMotionPreset("none");
    }
  }, [
    planId,
    canConfigureDesign,
    canUseMotion,
    designModel,
    reasoningEffort,
    motionPreset,
    maxReasoningIndex,
    entitlements.userSelectableDesignModels,
  ]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function persist() {
    setSaving(true);
    setError(null);
    const result = await saveDesignDefaults({ designModel, reasoningEffort, motionPreset });
    setSaving(false);
    if (!result.ok || !result.data) {
      setError(result.ok ? (de ? "Speichern fehlgeschlagen." : "Save failed.") : result.error);
      return;
    }
    onSaved(result.data.defaults);
  }

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-[rgba(9,10,12,0.46)] p-5 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="w-full max-w-[560px] rounded-[14px] border border-black/[0.07] bg-white px-[26px] pb-5 pt-6 text-[#0B0C0E] shadow-[0_32px_70px_-26px_rgba(9,10,12,0.46)] dark:border-white/10 dark:bg-[#111216] dark:text-white">
        <div className="flex items-start gap-3">
          <div className="flex size-8 items-center justify-center rounded-[9px] bg-[#EAEEFB] text-[#002BBA] dark:bg-[#002BBA]/20"><Sparkles className="size-4" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-semibold tracking-[-0.026em]">{de ? "Design-Generierung – Standardwerte" : "Design generation defaults"}</h2>
            <p className="mt-1 text-[12.5px] leading-[1.55] text-[#6B7078] dark:text-[#AEB2BA]">{de ? "Diese Werte füllen jede neue Generierung vor. Änderungen im Design Studio gelten nur für dieses Design." : "These values prefill every new generation. Changes inside Design Studio only apply to that design."}</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-7 items-center justify-center rounded-[8px] text-[#6B7078] hover:bg-black/[0.045] dark:hover:bg-white/[0.05]" aria-label="Close"><X className="size-4" /></button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-[11.5px] font-medium text-[#40454E] dark:text-[#D5D7DB]">
            {de ? "Design AI" : "Design AI"}
            <select disabled={!canConfigureDesign} value={designModel} onChange={(event) => setDesignModel(event.target.value as DesignModelOption)} className="mt-1.5 h-10 w-full rounded-[9px] border border-[#DFE1E5] bg-white px-2.5 text-[12px] text-[#0B0C0E] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/10 dark:bg-[#15161A] dark:text-white">
              <option value="gpt-5.6-sol" disabled={!allowedModels.has("gpt-5.6-sol")}>GPT-5.6 Sol</option>
              <option value="gpt-5.6-terra" disabled={!allowedModels.has("gpt-5.6-terra")}>GPT-5.6 Terra</option>
              <option value="gpt-5.6-luna" disabled={!allowedModels.has("gpt-5.6-luna")}>GPT-5.6 Luna</option>
              <option value="gpt-6-astra" disabled={!allowedModels.has("gpt-6-astra")}>GPT-6 Astra · Scale</option>
            </select>
          </label>
          <label className="block text-[11.5px] font-medium text-[#40454E] dark:text-[#D5D7DB]">
            {de ? "Qualität" : "Quality"}
            <select disabled={!canConfigureDesign} value={reasoningEffort} onChange={(event) => setReasoningEffort(event.target.value as DesignReasoningEffort)} className="mt-1.5 h-10 w-full rounded-[9px] border border-[#DFE1E5] bg-white px-2.5 text-[12px] text-[#0B0C0E] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/10 dark:bg-[#15161A] dark:text-white">
              <option value="low">Low</option>
              <option value="medium" disabled={!reasoningAllowed("medium")}>Medium</option>
              <option value="high" disabled={!reasoningAllowed("high")}>High · Pro+</option>
            </select>
          </label>
          <label className="block text-[11.5px] font-medium text-[#40454E] dark:text-[#D5D7DB]">
            Motion
            <select disabled={!canConfigureDesign} value={motionPreset} onChange={(event) => setMotionPreset(event.target.value as DesignMotionPreset)} className="mt-1.5 h-10 w-full rounded-[9px] border border-[#DFE1E5] bg-white px-2.5 text-[12px] text-[#0B0C0E] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/10 dark:bg-[#15161A] dark:text-white">
              <option value="none">None</option>
              <option value="subtle" disabled={!canUseMotion}>Subtle · Pro+</option>
              <option value="premium" disabled={!canUseMotion}>Premium · Pro+</option>
            </select>
          </label>
        </div>

        {motionPreset !== "none" ? (
          <div className="mt-4 flex items-start gap-2 rounded-[11px] bg-[#FDF0E3] px-3 py-2.5 text-[11.5px] leading-[1.5] text-[#9A5106]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{de ? `Motion „${motionPreset === "premium" ? "Premium" : "Subtle"}“ wird automatisch auf neue Designs angewendet. Dadurch läuft ein zusätzlicher AI-Motion-Schritt und es werden mehr Credits verbraucht.` : `“${motionPreset === "premium" ? "Premium" : "Subtle"}” motion is automatically applied to new designs. This runs an additional AI motion step and uses more credits.`}</span>
          </div>
        ) : null}

        {!canConfigureDesign ? (
          <div className="mt-4 rounded-[10px] bg-[#EAEEFB] px-3 py-2.5 text-[11.5px] leading-[1.5] text-[#002BBA] dark:bg-[#002BBA]/20 dark:text-[#9FB2FF]">
            {de ? "AI-Designs sind ab Starter verfügbar. Upgrade deinen Plan, um Design-Defaults festzulegen." : "AI designs are available from Starter. Upgrade your plan to configure design defaults."}
          </div>
        ) : null}
        <p className="mt-4 text-[11.5px] leading-[1.5] text-[#6B7078] dark:text-[#AEB2BA]">{de ? "Modell- und Qualitätsverfügbarkeit hängt vom aktiven Plan ab. Manuelle Änderungen im Studio überschreiben diese Defaults nicht dauerhaft." : "Model and quality availability depends on the active plan. Manual studio changes do not permanently overwrite these defaults."}</p>
        {error ? <div className="mt-3 flex items-start gap-2 text-[12px] text-[#B42318]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{error}</div> : null}
        <div className="mt-5 flex justify-end gap-2 border-t border-black/[0.07] pt-4 dark:border-white/[0.08]">
          <button type="button" onClick={onClose} className="h-9 rounded-[9px] border border-[#DFE1E5] px-3.5 text-[12.5px] text-[#40454E] dark:border-white/10 dark:text-[#D5D7DB]">{de ? "Abbrechen" : "Cancel"}</button>
          <button type="button" disabled={saving || !canConfigureDesign} onClick={() => void persist()} className="flex h-9 items-center gap-1.5 rounded-[9px] bg-[#002BBA] px-4 text-[12.5px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,0.30)] disabled:opacity-50">{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}{de ? "Speichern" : "Save"}</button>
        </div>
      </section>
    </div>
  );
}
