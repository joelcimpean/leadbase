"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

export type LeadDetailTabKey =
  | "visual"
  | "structure"
  | "evidence"
  | "outreach"
  | "history"
  | "notes";

export function LeadDetailTabs({
  language,
  analyzed,
  analyzedAt,
  model,
  totalTokens,
  structurePassed,
  structureTotal,
  visual,
  structure,
  evidence,
  outreach,
  history,
  notes,
}: {
  language: "de" | "en";
  analyzed: boolean;
  analyzedAt: string;
  model: string | null;
  totalTokens: number | null;
  structurePassed: number;
  structureTotal: number;
  visual: ReactNode;
  structure: ReactNode;
  evidence: ReactNode;
  outreach: ReactNode;
  history: ReactNode;
  notes: ReactNode;
}) {
  const [tab, setTab] = useState<LeadDetailTabKey>("visual");

  useEffect(() => {
    const validTabs: LeadDetailTabKey[] = [
      "visual",
      "structure",
      "evidence",
      "outreach",
      "history",
      "notes",
    ];

    function syncTabFromHash() {
      const hash = window.location.hash.replace(/^#/, "") as LeadDetailTabKey;
      if (validTabs.includes(hash)) setTab(hash);
    }

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  const labels = language === "de"
    ? {
        title: "Analyse & Outreach",
        analyzed: "Analysiert",
        visual: "Visuell",
        structure: "Struktur",
        evidence: "Nachweise",
        outreach: "Outreach",
        history: "Verlauf",
        notes: "Notizen",
      }
    : {
        title: "Analysis & Outreach",
        analyzed: "Analyzed",
        visual: "Visual",
        structure: "Structure",
        evidence: "Evidence",
        outreach: "Outreach",
        history: "History",
        notes: "Notes",
      };

  const items: { key: LeadDetailTabKey; label: string; meta?: string }[] = [
    { key: "visual", label: labels.visual },
    { key: "structure", label: labels.structure, meta: structureTotal > 0 ? `${structurePassed}/${structureTotal}` : undefined },
    { key: "evidence", label: labels.evidence },
    { key: "outreach", label: labels.outreach },
    { key: "history", label: labels.history },
    { key: "notes", label: labels.notes },
  ];

  const current = {
    visual,
    structure,
    evidence,
    outreach,
    history,
    notes,
  }[tab];

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,0.03)]">
      <header className="flex shrink-0 flex-col gap-3 border-b border-black/[0.07] px-[18px] pb-[14px] pt-4 min-[1320px]:flex-row min-[1320px]:items-center min-[1320px]:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="whitespace-nowrap text-[14.5px] font-semibold tracking-[-0.015em]">{labels.title}</h2>
            {analyzed ? (
              <span className="rounded-[6px] bg-[#E9F0EA] px-[7px] py-[2px] font-mono text-[9px] uppercase tracking-[0.06em] text-[#2F6B3A]">{labels.analyzed}</span>
            ) : null}
          </div>
          <span className="mt-1.5 block whitespace-normal font-mono text-[9.5px] uppercase tracking-[0.06em] text-[#6B7078]">
            {[analyzedAt, model, totalTokens ? `${totalTokens.toLocaleString(language === "de" ? "de-DE" : "en-GB")} tokens` : null].filter(Boolean).join(" · ")}
          </span>
        </div>

        <div className="flex max-w-full shrink-0 overflow-x-auto rounded-[10px] bg-black/[0.045] p-[3px]">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                window.history.replaceState(
                  null,
                  "",
                  `${window.location.pathname}${window.location.search}#${item.key}`,
                );
              }}
              className={`h-[26px] rounded-[8px] px-2.5 text-[11px] transition-[background-color,color,box-shadow] ${tab === item.key ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,0.12)]" : "text-[#6B7078] hover:text-[#0B0C0E]"}`}
            >
              {item.label}{item.meta ? ` ${item.meta}` : ""}
            </button>
          ))}
        </div>
      </header>

      <div className="leadbase-detail-tab-panel min-h-0 flex-1 overflow-y-auto px-[18px] py-4 [&_.leadbase-workspace-card]:rounded-none [&_.leadbase-workspace-card]:border-0 [&_.leadbase-workspace-card]:bg-transparent [&_.leadbase-workspace-card]:shadow-none">
        {current}
      </div>
    </section>
  );
}
