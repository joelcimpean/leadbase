"use client";

import {
  Printer,
} from "lucide-react";

type ProposalPrintButtonProps = {
  variant?: "header" | "rail";
  isGerman?: boolean;
};

export function ProposalPrintButton({
  variant = "header",
  isGerman = true,
}: ProposalPrintButtonProps) {
  if (variant === "rail") {
    return (
      <button
        type="button"
        onClick={() => window.print()}
        className="lb-proposal-link inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[9px] border border-black/[0.12] bg-white text-[10.5px] text-[#6B6660] hover:border-black/[0.26] hover:text-[#14161A]"
        title={isGerman ? "Drucken oder im Browser als PDF speichern" : "Print or save as PDF in your browser"}
      >
        <Printer className="size-3" />
        {isGerman ? "Drucken" : "Print"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="lb-proposal-link inline-flex h-7 items-center gap-1.5 rounded-full border border-white/20 px-2.5 text-[10.5px] text-white/85"
      title={isGerman ? "Drucken oder im Browser als PDF speichern" : "Print or save as PDF in your browser"}
    >
      <Printer className="size-3" />
      <span className="hidden sm:inline">
        {isGerman ? "Drucken" : "Print"}
      </span>
    </button>
  );
}
