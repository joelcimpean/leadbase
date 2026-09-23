"use client";

import Link from "next/link";

import {
  LockKeyhole,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  Button,
} from "@/components/ui/button";

import {
  CreditEstimatePill,
} from "@/components/credit-estimate-pill";

import { useLeadbasePlan } from "@/hooks/use-leadbase-plan";

import type {
  ProposalCustomSection,
} from "@/lib/proposal-sections";

type AutofillResponse = {
  ok?: boolean;
  title?: string;
  introText?: string;
  scope?: string[];
  timelineText?: string | null;
  price?: number | null;
  notes?: string | null;
  customSections?: ProposalCustomSection[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  error?: string;
};

function setFormValue(
  form: HTMLFormElement,
  name: string,
  value: string
) {
  const element =
    form.elements.namedItem(name);

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    element.value = value;
    element.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    );
    element.dispatchEvent(
      new Event("change", {
        bubbles: true,
      })
    );
  }
}

export function ProposalAiAutofillButton({
  leadId,
  isGerman,
  disabled,
  available,
  compact = false,
}: {
  leadId: string;
  isGerman: boolean;
  disabled: boolean;
  available: boolean;
  compact?: boolean;
}) {
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  const { planId, remainingCredits, loading: planLoading } = useLeadbasePlan();
  const freeLocked = !planLoading && planId === "free";
  const noCredits =
    !planLoading &&
    planId !== "free" &&
    remainingCredits !== null &&
    remainingCredits <= 0;

  async function generate() {
    const form =
      document.getElementById(
        "proposal-builder-form"
      );

    if (!(form instanceof HTMLFormElement)) {
      setMessage(
        isGerman
          ? "Formular nicht gefunden."
          : "Form not found."
      );
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/leads/${encodeURIComponent(
          leadId
        )}/proposal-autofill`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      const data =
        (await response.json()) as AutofillResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ||
            (isGerman
              ? "AI-Autofill fehlgeschlagen."
              : "AI autofill failed.")
        );
      }

      if (data.title) {
        setFormValue(form, "title", data.title);
      }

      if (data.introText) {
        setFormValue(form, "introText", data.introText);
      }

      if (Array.isArray(data.scope)) {
        setFormValue(
          form,
          "scope",
          data.scope.join("\n")
        );
      }

      if (data.timelineText) {
        setFormValue(
          form,
          "timelineText",
          data.timelineText
        );
      }

      if (
        typeof data.price === "number" &&
        Number.isFinite(data.price) &&
        data.price > 0
      ) {
        setFormValue(
          form,
          "price",
          String(data.price)
        );
      }

      if (data.notes) {
        setFormValue(form, "notes", data.notes);
      }

      window.dispatchEvent(
        new CustomEvent(
          "leadbase:proposal-autofill",
          {
            detail: {
              customSections:
                data.customSections ?? [],
              scope:
                data.scope ?? [],
            },
          }
        )
      );

      setMessage(
        isGerman
          ? "Entwurf eingefügt · Credits wurden nach tatsächlicher Nutzung abgerechnet."
          : "Draft inserted · Credits were charged based on actual usage."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : isGerman
            ? "AI-Autofill fehlgeschlagen."
            : "AI autofill failed."
      );
    } finally {
      setLoading(false);
    }
  }

  if (freeLocked) {
    return compact ? (
      <Link href="/profile?dialog=plan" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#002BBA] hover:text-[#001E85]">
        <LockKeyhole className="size-3" />
        {isGerman ? "AI · ab Starter" : "AI · Starter+"}
      </Link>
    ) : (
      <div className="w-full min-w-0 space-y-2">
        <Link href="/profile?dialog=plan" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium">
          <LockKeyhole className="size-4" />
          {isGerman ? "Proposal AI ab Starter" : "Proposal AI from Starter"}
        </Link>
        <p className="max-w-xl text-xs leading-5 text-muted-foreground">{isGerman ? "Der Entwurf aus dem Free Full Lead Workflow bleibt nutzbar. Weitere AI-Autofills sind ab Starter verfügbar." : "The draft from the Free Full Lead Workflow remains usable. Additional AI autofills are available from Starter."}</p>
      </div>
    );
  }

  if (noCredits) {
    return compact ? (
      <Link href="/profile?dialog=credits" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#002BBA] hover:text-[#001E85]">
        <Zap className="size-3" />
        {isGerman ? "Keine Credits · kaufen" : "No Credits · Buy Credits"}
      </Link>
    ) : (
      <Link href="/profile?dialog=credits" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium">
        <Zap className="size-4" />
        {isGerman ? "Credits kaufen" : "Buy Credits"}
      </Link>
    );
  }

  if (compact) {
    return (
      <div className="min-w-0">
        <button
          type="button"
          disabled={disabled || !available || loading}
          onClick={generate}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#002BBA] transition-colors hover:text-[#001E85] disabled:cursor-not-allowed disabled:text-[#9AA0A8]"
        >
          <Sparkles className={`size-3 ${loading ? "animate-pulse" : ""}`} />
          {loading
            ? isGerman
              ? "Liest Verlauf…"
              : "Reading thread…"
            : available
              ? isGerman
                ? "Aus Verlauf vorschlagen"
                : "Suggest from thread"
              : isGerman
                ? "Kein sinnvoller Verlauf"
                : "No useful thread"}

          {available && !loading ? (
            <CreditEstimatePill
              feature="proposal_autofill"
              language={isGerman ? "de" : "en"}
              hideOnSmall
            />
          ) : null}
        </button>

        {message ? (
          <p className="mt-1 text-[10px] text-[#6B7078]">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2 sm:w-auto"
        disabled={disabled || !available || loading}
        onClick={generate}
      >
        <Sparkles className="size-4" />
        {loading
          ? isGerman
            ? "Liest Verlauf…"
            : "Reading thread…"
          : !available
            ? isGerman
              ? "Noch kein sinnvoller Verlauf"
              : "No useful thread yet"
            : isGerman
              ? "Mit AI aus Verlauf erstellen"
              : "Create from thread with AI"}

        {available && !loading ? (
          <CreditEstimatePill
            feature="proposal_autofill"
            language={isGerman ? "de" : "en"}
            hideOnSmall
          />
        ) : null}
      </Button>

      <p className="max-w-xl text-xs leading-5 text-muted-foreground">
        {message ??
          (!available
            ? isGerman
              ? "AI wird erst aktiviert, wenn Leadbase einen echten E-Mail-Austausch mit mindestens einer sinnvollen Kundenantwort erkannt hat. Bis dahin werden keine Credits verbraucht."
              : "AI is only enabled after Leadbase detects a real email exchange with at least one useful customer reply. Until then, no Credits are used."
            : isGerman
              ? "Liest Lead-Daten und E-Mail-Historie. Verbraucht nur bei Ausführung Credits; nichts wird automatisch gesendet."
              : "Reads lead data and email history. Uses Credits only when run; nothing is sent automatically.")}
      </p>
    </div>
  );
}
