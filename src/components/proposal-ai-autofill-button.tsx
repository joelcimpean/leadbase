"use client";

import {
  Sparkles,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  Button,
} from "@/components/ui/button";

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
}: {
  leadId: string;
  isGerman: boolean;
  disabled: boolean;
  available: boolean;
}) {
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

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
            },
          }
        )
      );

      const tokens =
        data.usage?.totalTokens ?? 0;

      setMessage(
        isGerman
          ? tokens > 0
            ? `Entwurf eingefügt · ${tokens.toLocaleString("de-DE")} Tokens`
            : "Entwurf eingefügt."
          : tokens > 0
            ? `Draft inserted · ${tokens.toLocaleString("en-US")} tokens`
            : "Draft inserted."
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
      </Button>

      <p className="max-w-xl text-xs leading-5 text-muted-foreground">
        {message ??
          (!available
            ? isGerman
              ? "AI wird erst aktiviert, wenn Leadbase einen echten E-Mail-Austausch mit mindestens einer sinnvollen Kundenantwort erkannt hat. Bis dahin werden keine OpenAI-Tokens verbraucht."
              : "AI is only enabled after Leadbase detects a real email exchange with at least one useful customer reply. Until then, no OpenAI tokens are used."
            : isGerman
              ? "Liest Lead-Daten und E-Mail-Historie. Verbraucht eine kleine Menge OpenAI-Tokens; nichts wird automatisch gesendet."
              : "Reads lead data and email history. Uses a small amount of OpenAI tokens; nothing is sent automatically.")}
      </p>
    </div>
  );
}
