"use client";

import Link from "next/link";

import {
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  useFormStatus,
} from "react-dom";

import {
  generateLeadOutreachDraft,
} from "../outreach-actions";

import {
  Button,
} from "@/components/ui/button";

import {
  CreditEstimatePill,
} from "@/components/credit-estimate-pill";

import {
  useLanguage,
} from "@/components/language-provider";
import { useLeadbasePlan } from "@/hooks/use-leadbase-plan";

/* =========================================================
   TYPES
========================================================= */

type GenerateOutreachButtonProps = {
  leadId: string;
  hasDraft?: boolean;
};

/* =========================================================
   BUTTON
========================================================= */

export function GenerateOutreachButton({
  leadId,
  hasDraft = false,
}: GenerateOutreachButtonProps) {
  const { language } = useLanguage();
  const { planId, remainingCredits, loading: planLoading } = useLeadbasePlan();
  const noCredits = !planLoading && remainingCredits !== null && remainingCredits <= 0;

  if (!planLoading && planId === "free") {
    return (
      <Link
        href="/profile?dialog=plan"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[#002BBA]/20 bg-[#EEF2FF] px-3 text-xs font-medium text-[#002BBA] transition-colors hover:bg-[#E4EAFF]"
      >
        <LockKeyhole className="size-3.5" />
        {hasDraft
          ? language === "de" ? "Neu erstellen · ab Starter" : "Regenerate · Starter+"
          : language === "de" ? "AI-Outreach · ab Starter" : "AI outreach · Starter+"}
      </Link>
    );
  }

  if (noCredits) {
    return (
      <Link
        href="/profile?dialog=credits"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-[9px] bg-[#002BBA] px-3 text-xs font-medium text-white transition-colors hover:bg-[#00229A]"
      >
        <Zap className="size-3.5" />
        {language === "de" ? "Keine Credits · kaufen" : "No Credits · Buy Credits"}
      </Link>
    );
  }

  return (
    <form
      action={
        generateLeadOutreachDraft
      }
    >
      <input
        type="hidden"
        name="leadId"
        value={
          leadId
        }
      />

      <SubmitButton
        hasDraft={
          hasDraft
        }
      />
    </form>
  );
}

/* =========================================================
   SUBMIT
========================================================= */

function SubmitButton({
  hasDraft,
}: {
  hasDraft: boolean;
}) {
  const {
    pending,
  } = useFormStatus();

  const { language } = useLanguage();

  return (
    <Button
      type="submit"
      size="sm"
      variant="default"
      disabled={
        pending
      }
      className="h-9 gap-2 rounded-[9px] bg-[#002BBA] px-3 text-white shadow-none transition-colors hover:bg-[#00229A]"
    >
      {pending ? (
        <>
          <RefreshCw className="size-3.5 animate-spin" />

          {language === "de" ? "Entwurf wird erstellt..." : "Generating draft..."}
        </>
      ) : (
        <>
          <Sparkles className="size-3.5" />

          {hasDraft
            ? language === "de"
              ? "Entwurf neu erstellen"
              : "Regenerate draft"
            : language === "de"
              ? "Entwurf erstellen"
              : "Generate draft"}

          <CreditEstimatePill
            feature="outreach_generation"
            language={language}
            hideOnSmall
          />
        </>
      )}
    </Button>
  );
}