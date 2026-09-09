"use client";

import { useState } from "react";

import {
  PROPOSAL_DESIGN_TEMPLATES,
  normalizeProposalDesignTemplate,
  type ProposalDesignTemplate,
} from "@/lib/proposal-design-templates";

export function ProposalDesignTemplatePicker({
  initialTemplate,
  accentColor,
  isGerman,
  disabled = false,
}: {
  initialTemplate: ProposalDesignTemplate;
  accentColor: string;
  isGerman: boolean;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<ProposalDesignTemplate>(
    normalizeProposalDesignTemplate(initialTemplate)
  );

  function pick(next: ProposalDesignTemplate) {
    if (disabled) return;
    setSelected(next);
    window.dispatchEvent(
      new CustomEvent("leadbase:proposal-design-template-change", {
        detail: { template: next },
      })
    );
  }

  return (
    <div>
      <input type="hidden" name="designTemplate" value={selected} />

      <div className="flex items-baseline gap-3">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
          {isGerman ? "Proposal Builder · Schritt 5 · Design" : "Proposal Builder · Step 5 · Design"}
        </div>
        <p className="text-[11.5px] text-[#6B7078]">
          {isGerman
            ? "Dieselben Angebotsdaten, sieben Vorlagen. Die Auswahl wird am Angebot gespeichert."
            : "The same proposal data in seven layouts. Your selection is saved with this proposal."}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-4">
        {PROPOSAL_DESIGN_TEMPLATES.map((template) => {
          const active = template.id === selected;
          const thumbInk =
            template.paper === "#0B0C0E"
              ? "rgba(255,255,255,.72)"
              : "rgba(11,12,14,.55)";

          return (
            <button
              key={template.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => pick(template.id)}
              className="group block min-w-0 rounded-[12px] bg-white p-[9px] text-left outline-none transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-55 dark:bg-[#15161A]"
              style={{
                border: `1px solid ${active ? accentColor : "rgba(11,12,14,.09)"}`,
                boxShadow: active ? `0 0 0 3px ${accentColor}1F` : "none",
              }}
            >
              <div
                className="flex h-[62px] flex-col gap-1 overflow-hidden rounded-[8px] border border-black/[0.08] p-2"
                style={{ background: template.paper }}
              >
                <div
                  className="h-[5px] rounded-[2px]"
                  style={{
                    width: template.accentBar ? "38%" : "22%",
                    background: template.accentBar ? accentColor : thumbInk,
                  }}
                />
                <div
                  className="h-2 w-[76%] rounded-[2px]"
                  style={{ background: thumbInk }}
                />
                <div
                  className="h-[3px] w-[92%] rounded-[2px] opacity-40"
                  style={{ background: thumbInk }}
                />
                <div
                  className="h-[3px] w-[64%] rounded-[2px] opacity-40"
                  style={{ background: thumbInk }}
                />
                <div
                  className="mt-auto h-[9px] w-[44%] rounded-[2px] opacity-70"
                  style={{ background: thumbInk }}
                />
              </div>

              <div className="mt-[9px] flex items-center gap-1.5">
                <span className="truncate text-[12.5px] font-medium tracking-[-0.01em] text-[#0B0C0E] dark:text-white">
                  {template.name}
                </span>
                {active ? (
                  <span
                    className="size-[5px] shrink-0 rounded-full"
                    style={{ background: accentColor }}
                  />
                ) : null}
              </div>
              <div className="mt-0.5 line-clamp-2 min-h-[29px] text-[10.5px] leading-[1.4] text-[#6B7078]">
                {isGerman ? template.blurbDe : template.blurbEn}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-[10px] border border-black/[0.07] bg-[#F7F8FA] px-3 py-2 text-[10.5px] leading-[1.5] text-[#6B7078] dark:border-white/[0.08] dark:bg-white/[0.04]">
        {isGerman
          ? "Die Vorschau rechts wechselt sofort. Inhalt, Preis, Branding und Annahme-Flow bleiben identisch — nur die visuelle Vorlage ändert sich."
          : "The preview on the right changes instantly. Content, pricing, branding and acceptance flow stay the same — only the visual layout changes."}
      </div>
    </div>
  );
}
