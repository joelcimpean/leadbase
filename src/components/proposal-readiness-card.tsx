"use client";

import type {
  ReactNode,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Circle,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Readiness = {
  title: boolean;
  contact: boolean;
  intro: boolean;
  scope: boolean;
  sections: boolean;
  price: boolean;
  validUntil: boolean;
};

function value(
  form: HTMLFormElement,
  name: string
) {
  const field =
    form.elements.namedItem(name);

  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLSelectElement
  ) {
    return field.value.trim();
  }

  return "";
}

export function ProposalReadinessCard({
  isGerman,
  initialSectionCount,
  footer,
}: {
  isGerman: boolean;
  initialSectionCount: number;
  footer?: ReactNode;
}) {
  const [sectionCount, setSectionCount] =
    useState(initialSectionCount);

  const [state, setState] =
    useState<Readiness>({
      title: false,
      contact: false,
      intro: false,
      scope: false,
      sections:
        initialSectionCount > 0,
      price: false,
      validUntil: false,
    });

  useEffect(() => {
    const form =
      document.getElementById(
        "proposal-builder-form"
      );

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    // Keep the narrowed HTMLFormElement type inside nested callbacks.
    // TypeScript does not preserve DOM narrowing for a captured mutable value.
    const proposalForm = form;

    function sync() {
      const price =
        Number(
          value(proposalForm, "price") ||
          0
        );

      setState((current) => ({
        title:
          Boolean(
            value(proposalForm, "title")
          ),
        contact:
          Boolean(
            value(proposalForm, "clientName")
          ) &&
          Boolean(
            value(proposalForm, "contactName") ||
            value(proposalForm, "contactEmail")
          ),
        intro:
          Boolean(
            value(proposalForm, "introText")
          ),
        scope:
          value(proposalForm, "scope")
            .split(/\r?\n/)
            .some((line) =>
              Boolean(line.trim())
            ),
        sections:
          current.sections,
        price:
          Number.isFinite(price) &&
          price > 0,
        validUntil:
          Boolean(
            value(proposalForm, "validUntil")
          ),
      }));
    }

    const sectionHandler = (
      event: Event
    ) => {
      const detail =
        (event as CustomEvent<{
          sections?: unknown[];
        }>).detail;

      if (
        Array.isArray(
          detail?.sections
        )
      ) {
        const nextCount =
          detail.sections.length;

        setSectionCount(
          nextCount
        );

        setState((current) => ({
          ...current,
          sections:
            nextCount > 0,
        }));
      }
    };

    const scopeHandler = () =>
      sync();

    proposalForm.addEventListener(
      "input",
      sync
    );
    proposalForm.addEventListener(
      "change",
      sync
    );
    window.addEventListener(
      "leadbase:proposal-sections-change",
      sectionHandler
    );
    window.addEventListener(
      "leadbase:proposal-scope-change",
      scopeHandler
    );
    window.addEventListener(
      "leadbase:proposal-autofill",
      sync
    );

    sync();

    return () => {
      proposalForm.removeEventListener(
        "input",
        sync
      );
      proposalForm.removeEventListener(
        "change",
        sync
      );
      window.removeEventListener(
        "leadbase:proposal-sections-change",
        sectionHandler
      );
      window.removeEventListener(
        "leadbase:proposal-scope-change",
        scopeHandler
      );
      window.removeEventListener(
        "leadbase:proposal-autofill",
        sync
      );
    };
  }, []);

  const checks = useMemo(
    () => [
      {
        label:
          isGerman
            ? "Titel"
            : "Title",
        ok: state.title,
      },
      {
        label:
          isGerman
            ? "Kunde & Kontakt"
            : "Client & contact",
        ok: state.contact,
      },
      {
        label:
          isGerman
            ? "Einleitung"
            : "Introduction",
        ok: state.intro,
      },
      {
        label: `${
          state.scope
            ? ""
            : ""
        }${
          isGerman
            ? "Leistungen"
            : "Services"
        }`,
        ok: state.scope,
      },
      {
        label:
          sectionCount > 0
            ? isGerman
              ? "Rahmenbedingungen"
              : "Terms"
            : isGerman
              ? "Abschnitt"
              : "Section",
        ok: state.sections,
      },
      {
        label:
          isGerman
            ? "Projektpreis"
            : "Project price",
        ok: state.price,
        warning: !state.price,
      },
      {
        label:
          isGerman
            ? "Gültig bis"
            : "Valid until",
        ok: state.validUntil,
      },
    ],
    [
      isGerman,
      sectionCount,
      state,
    ]
  );

  const ready =
    checks.filter(
      (check) => check.ok
    ).length;

  const percent =
    Math.round(
      (ready / checks.length) *
        100
    );

  return (
    <section className="shrink-0 rounded-[16px] bg-[#0B0C0E] px-[18px] py-4 text-white">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-white/60">
          {isGerman
            ? "Bereit zum Senden"
            : "Ready to send"}
        </div>
        <div className="font-mono text-[10.5px] tabular-nums text-white/70">
          {ready} / {checks.length}
        </div>
      </div>

      <div className="mt-[10px] h-[5px] overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-[#3B5BE0] transition-[width] duration-300"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-[14px] gap-y-[7px]">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`flex items-center gap-[7px] text-[11px] ${
              check.ok
                ? "text-white/80"
                : check.warning
                  ? "text-[#FFC98A]"
                  : "text-white/50"
            }`}
          >
            {check.ok ? (
              <CheckCircle2 className="size-[11px] shrink-0 text-[#8FE3A5]" />
            ) : check.warning ? (
              <AlertCircle className="size-[11px] shrink-0" />
            ) : (
              <Circle className="size-[11px] shrink-0" />
            )}
            {check.label}
          </div>
        ))}
      </div>

      {footer ? (
        <div className="mt-3 border-t border-white/10 pt-3">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
