"use client";

import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  Textarea,
} from "@/components/ui/textarea";

import type {
  ProposalCustomSection,
} from "@/lib/proposal-sections";

function createId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `section-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type AutofillEventDetail = {
  customSections?: ProposalCustomSection[];
};

export function ProposalSectionsBuilder({
  defaultSections,
  disabled,
  isGerman,
}: {
  defaultSections: ProposalCustomSection[];
  disabled: boolean;
  isGerman: boolean;
}) {
  const [sections, setSections] =
    useState<ProposalCustomSection[]>(defaultSections);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail =
        (event as CustomEvent<AutofillEventDetail>).detail;

      if (Array.isArray(detail?.customSections)) {
        setSections(detail.customSections);
      }
    };

    window.addEventListener(
      "leadbase:proposal-autofill",
      handler
    );

    return () => {
      window.removeEventListener(
        "leadbase:proposal-autofill",
        handler
      );
    };
  }, []);

  const serialized = useMemo(
    () => JSON.stringify(sections),
    [sections]
  );

  function updateSection(
    index: number,
    patch: Partial<ProposalCustomSection>
  ) {
    setSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index
          ? {
              ...section,
              ...patch,
            }
          : section
      )
    );
  }

  function moveSection(
    index: number,
    direction: -1 | 1
  ) {
    setSections((current) => {
      const nextIndex = index + direction;

      if (
        nextIndex < 0 ||
        nextIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name="customSections"
        value={serialized}
      />

      {sections.length === 0 ? (
        <div className="leadbase-workspace-empty rounded-2xl border border-dashed p-5 text-sm leading-6 text-muted-foreground">
          {isGerman
            ? "Noch keine eigenen Abschnitte. Füge z. B. Nicht enthalten, Kundenmitwirkung, Revisionen, Zahlung, Kündigung oder Nutzungsrechte hinzu."
            : "No custom sections yet. Add items such as exclusions, client responsibilities, revisions, payment, cancellation or ownership."}
        </div>
      ) : null}

      {sections.map((section, index) => (
        <div
          key={section.id}
          className="leadbase-subtle-panel rounded-2xl border p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {isGerman
                ? `Abschnitt ${index + 1}`
                : `Section ${index + 1}`}
            </p>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || index === 0}
                onClick={() => moveSection(index, -1)}
                aria-label={isGerman ? "Nach oben" : "Move up"}
              >
                <ArrowUp className="size-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled || index === sections.length - 1}
                onClick={() => moveSection(index, 1)}
                aria-label={isGerman ? "Nach unten" : "Move down"}
              >
                <ArrowDown className="size-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() =>
                  setSections((current) =>
                    current.filter((_, sectionIndex) => sectionIndex !== index)
                  )
                }
                aria-label={isGerman ? "Löschen" : "Delete"}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <Input
              value={section.title}
              disabled={disabled}
              placeholder={isGerman ? "Titel, z. B. Nicht enthalten" : "Title, e.g. Out of scope"}
              onChange={(event) =>
                updateSection(index, {
                  title: event.target.value,
                })
              }
            />

            <Textarea
              rows={6}
              value={section.content}
              disabled={disabled}
              placeholder={
                isGerman
                  ? "Schreibe den Inhalt frei. Zeilen mit '- ' werden in der öffentlichen Ansicht als Aufzählung dargestellt."
                  : "Write the content freely. Lines starting with '- ' are rendered as bullets on the public proposal."
              }
              onChange={(event) =>
                updateSection(index, {
                  content: event.target.value,
                })
              }
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        disabled={disabled || sections.length >= 20}
        className="gap-2 rounded-xl"
        onClick={() =>
          setSections((current) => [
            ...current,
            {
              id: createId(),
              title: "",
              content: "",
            },
          ])
        }
      >
        <Plus className="size-4" />
        {isGerman ? "Abschnitt hinzufügen" : "Add section"}
      </Button>
    </div>
  );
}
