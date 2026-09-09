"use client";

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(
        "leadbase:proposal-sections-change",
        {
          detail: {
            sections,
          },
        }
      )
    );
  }, [sections]);

  const serialized = useMemo(
    () => JSON.stringify(sections),
    [sections]
  );

  function addSection() {
    if (
      disabled ||
      sections.length >= 20
    ) {
      return;
    }

    const id =
      createId();

    setSections(
      (
        current
      ) => [
        ...current,
        {
          id,
          title: "",
          content: "",
        },
      ]
    );

    /*
     * Keep the creation flow local to where the user is working.
     * After appending, smoothly reveal the new section instead of
     * making the user scroll around to find it.
     */
    window.setTimeout(
      () => {
        document
          .getElementById(
            `proposal-section-${id}`
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "center",
          });
      },
      0
    );
  }

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
    <div>
      <input
        type="hidden"
        name="customSections"
        value={serialized}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">
            {isGerman
              ? "Eigene Abschnitte"
              : "Custom sections"}
          </h3>
          <p className="mt-1 text-[11.5px] text-[#6B7078]">
            {isGerman
              ? "Titel und Inhalt sind frei, Reihenfolge änderbar."
              : "Titles and content are free-form and reorderable."}
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || sections.length >= 20}
          onClick={
            addSection
          }
          className="inline-flex h-[30px] items-center gap-1.5 rounded-[9px] bg-[#002BBA] px-[11px] text-[12.5px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,0.30)] transition-colors hover:bg-[#00229A] disabled:opacity-50"
        >
          <Plus className="size-3" />
          {isGerman
            ? "Abschnitt hinzufügen"
            : "Add section"}
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="mt-[14px] rounded-[12px] border border-dashed border-black/[0.10] px-4 py-5 text-[12px] leading-5 text-[#6B7078] dark:border-white/[0.10]">
          {isGerman
            ? "Noch keine eigenen Abschnitte."
            : "No custom sections yet."}
        </div>
      ) : (
        <div className="mt-[14px] space-y-3">
          {sections.map((section, index) => (
            <div
              key={section.id}
              id={`proposal-section-${section.id}`}
              className="scroll-mt-24 overflow-hidden rounded-[13px] border border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-[#111216]"
            >
              <div className="flex items-center gap-2.5 border-b border-black/[0.07] bg-[#F7F8FA] px-3 py-[9px] dark:border-white/[0.08] dark:bg-white/[0.035]">
                <GripVertical className="size-3.5 shrink-0 cursor-grab text-black/25 dark:text-white/25" />

                <span className="rounded-[6px] bg-[#EAEEFB] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-[#002BBA]">
                  {isGerman
                    ? `Abschnitt ${index + 1}`
                    : `Section ${index + 1}`}
                </span>

                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium tracking-[-0.01em]">
                  {section.title ||
                    (isGerman
                      ? "Ohne Titel"
                      : "Untitled")}
                </span>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => moveSection(index, -1)}
                    className="flex size-6 items-center justify-center rounded-[7px] text-[#6B7078] transition-colors hover:bg-black/[0.05] disabled:opacity-30 dark:hover:bg-white/[0.06]"
                    aria-label={isGerman ? "Nach oben" : "Move up"}
                  >
                    <ArrowUp className="size-3" />
                  </button>

                  <button
                    type="button"
                    disabled={disabled || index === sections.length - 1}
                    onClick={() => moveSection(index, 1)}
                    className="flex size-6 items-center justify-center rounded-[7px] text-[#6B7078] transition-colors hover:bg-black/[0.05] disabled:opacity-30 dark:hover:bg-white/[0.06]"
                    aria-label={isGerman ? "Nach unten" : "Move down"}
                  >
                    <ArrowDown className="size-3" />
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setSections((current) =>
                        current.filter((_, sectionIndex) => sectionIndex !== index)
                      )
                    }
                    className="flex size-6 items-center justify-center rounded-[7px] text-[#9A5106] transition-colors hover:bg-[#FDF0E3] disabled:opacity-30"
                    aria-label={isGerman ? "Löschen" : "Delete"}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 p-3">
                <Input
                  value={section.title}
                  disabled={disabled}
                  placeholder={isGerman ? "Titel" : "Title"}
                  onChange={(event) =>
                    updateSection(index, {
                      title: event.target.value,
                    })
                  }
                  className="h-[34px] rounded-[9px] bg-[#F7F8FA] text-[12.5px]"
                />

                <Textarea
                  rows={5}
                  value={section.content}
                  disabled={disabled}
                  placeholder={
                    isGerman
                      ? "Inhalt des Abschnitts"
                      : "Section content"
                  }
                  onChange={(event) =>
                    updateSection(index, {
                      content: event.target.value,
                    })
                  }
                  className="min-h-[110px] rounded-[9px] bg-[#F7F8FA] text-[12px] leading-[1.5]"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={
              disabled ||
              sections.length >= 20
            }
            onClick={
              addSection
            }
            className="flex h-[38px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-black/[0.10] bg-white text-[12px] font-medium text-[#6B7078] transition-[border-color,background-color,color] hover:border-[#002BBA]/30 hover:bg-[#EAEEFB]/45 hover:text-[#002BBA] disabled:pointer-events-none disabled:opacity-40 dark:border-white/[0.10] dark:bg-[#111216] dark:hover:border-[#002BBA]/40 dark:hover:bg-[#002BBA]/10 dark:hover:text-[#8EA6FF]"
          >
            <Plus className="size-3.5" />

            {isGerman
              ? "Weiteren Abschnitt hinzufügen"
              : "Add another section"}
          </button>
        </div>
      )}
    </div>
  );
}
