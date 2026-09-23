"use client";

import { formatAccountMoney } from "@/lib/account-currency";

import { useEffect, useMemo, useState } from "react";

import { ProposalTemplateDocument } from "@/components/proposal-template-document";
import {
  normalizeProposalDesignTemplate,
  type ProposalDesignTemplate,
} from "@/lib/proposal-design-templates";

type PreviewSection = {
  id: string;
  title: string;
  content: string;
};

type PreviewState = {
  title: string;
  clientName: string;
  contactName: string;
  contactEmail?: string;
  website?: string;
  introText: string;
  scope: string[];
  timelineText?: string;
  validUntil?: string;
  notes?: string;
  customSections?: PreviewSection[];
  price: string;
  currency: string;
  firstTimeClient: boolean;
  accentColor: string;
  designTemplate: ProposalDesignTemplate;
  proposalNumber: string;
};

function fieldValue(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    return field.value;
  }
  return "";
}

function checkedValue(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.checked : false;
}

function parseSections(raw: string): PreviewSection[] {
  if (!raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;
        const value = item as Record<string, unknown>;
        const title = typeof value.title === "string" ? value.title.trim() : "";
        const content = typeof value.content === "string" ? value.content.trim() : "";
        if (!title || !content) return null;
        return {
          id: typeof value.id === "string" && value.id ? value.id : `section-${index + 1}`,
          title,
          content,
        };
      })
      .filter((item): item is PreviewSection => Boolean(item));
  } catch {
    return [];
  }
}

function formatPrice(value: string, currency: string, isGerman: boolean) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return formatAccountMoney(safeAmount, currency || "EUR", isGerman ? "de" : "en");
}

export function ProposalLivePreview({
  initial,
  ownerName,
  isGerman,
}: {
  initial: PreviewState;
  ownerName: string;
  isGerman: boolean;
}) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    const form = document.getElementById("proposal-builder-form");
    if (!(form instanceof HTMLFormElement)) return;
    const proposalForm = form;

    function sync() {
      setState((current) => ({
        ...current,
        title: fieldValue(proposalForm, "title") || current.title,
        clientName: fieldValue(proposalForm, "clientName") || current.clientName,
        contactName: fieldValue(proposalForm, "contactName"),
        contactEmail: fieldValue(proposalForm, "contactEmail"),
        introText: fieldValue(proposalForm, "introText"),
        scope: fieldValue(proposalForm, "scope")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean),
        timelineText: fieldValue(proposalForm, "timelineText"),
        validUntil: fieldValue(proposalForm, "validUntil"),
        notes: fieldValue(proposalForm, "notes"),
        customSections: parseSections(fieldValue(proposalForm, "customSections")),
        price: fieldValue(proposalForm, "price"),
        currency: fieldValue(proposalForm, "currency") || current.currency,
        firstTimeClient: checkedValue(proposalForm, "firstTimeClient"),
        accentColor: fieldValue(proposalForm, "accentColor") || current.accentColor,
        designTemplate: normalizeProposalDesignTemplate(
          fieldValue(proposalForm, "designTemplate") || current.designTemplate,
        ),
        proposalNumber:
          fieldValue(proposalForm, "proposalNumber") ||
          (isGerman ? "NOCH NICHT VERGEBEN" : "NOT SET"),
      }));
    }

    function scopeHandler(event: Event) {
      const detail = (event as CustomEvent<{ scope?: string[] }>).detail;
      if (Array.isArray(detail?.scope)) {
        setState((current) => ({ ...current, scope: detail.scope ?? [] }));
      }
    }

    function sectionsHandler(event: Event) {
      const detail = (event as CustomEvent<{ sections?: PreviewSection[] }>).detail;
      if (Array.isArray(detail?.sections)) {
        setState((current) => ({ ...current, customSections: detail.sections ?? [] }));
      }
    }

    function designHandler(event: Event) {
      const detail = (event as CustomEvent<{ template?: unknown }>).detail;
      setState((current) => ({
        ...current,
        designTemplate: normalizeProposalDesignTemplate(detail?.template),
      }));
    }

    proposalForm.addEventListener("input", sync);
    proposalForm.addEventListener("change", sync);
    window.addEventListener("leadbase:proposal-scope-change", scopeHandler);
    window.addEventListener("leadbase:proposal-sections-change", sectionsHandler);
    window.addEventListener("leadbase:proposal-autofill", sync);
    window.addEventListener("leadbase:proposal-design-template-change", designHandler);
    sync();

    return () => {
      proposalForm.removeEventListener("input", sync);
      proposalForm.removeEventListener("change", sync);
      window.removeEventListener("leadbase:proposal-scope-change", scopeHandler);
      window.removeEventListener("leadbase:proposal-sections-change", sectionsHandler);
      window.removeEventListener("leadbase:proposal-autofill", sync);
      window.removeEventListener("leadbase:proposal-design-template-change", designHandler);
    };
  }, []);

  const priceLabel = useMemo(
    () => formatPrice(state.price, state.currency, isGerman),
    [isGerman, state.currency, state.price],
  );

  // The actual template is rendered at its authored desktop width and then scaled
  // down. This keeps the builder preview visually identical to the public proposal.
  const scale = 0.29;
  const authoredWidth = 1180;

  return (
    <div className="relative h-[398px] w-full overflow-hidden rounded-[10px] bg-white">
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: authoredWidth,
          transform: `scale(${scale})`,
          pointerEvents: "none",
        }}
      >
        <ProposalTemplateDocument
          template={state.designTemplate}
          title={state.title}
          clientName={state.clientName}
          contactName={state.contactName}
          contactEmail={state.contactEmail}
          website={state.website}
          introText={state.introText}
          scope={state.scope}
          timelineText={state.timelineText}
          priceLabel={priceLabel}
          validUntil={state.validUntil}
          notes={state.notes}
          customSections={state.customSections}
          firstTimeClient={state.firstTimeClient}
          accentColor={state.accentColor}
          isGerman={isGerman}
          proposalNumber={state.proposalNumber || (isGerman ? "NOCH NICHT VERGEBEN" : "NOT SET")}
          revision={1}
          ownerName={ownerName}
          expectedAcceptanceName={state.contactName || state.clientName}
          interactive={false}
        />
      </div>
    </div>
  );
}
