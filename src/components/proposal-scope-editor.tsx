"use client";

import {
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

type AutofillDetail = {
  scope?: string[];
};

export function ProposalScopeEditor({
  defaultValue,
  disabled,
  isGerman,
}: {
  defaultValue: string;
  disabled: boolean;
  isGerman: boolean;
}) {
  const [lines, setLines] =
    useState(
      defaultValue
        .split(/\r?\n/)
        .map((line) =>
          line.trim()
        )
        .filter(Boolean)
    );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail =
        (event as CustomEvent<AutofillDetail>).detail;

      if (
        Array.isArray(
          detail?.scope
        )
      ) {
        setLines(
          detail.scope.filter(
            (line): line is string =>
              typeof line === "string" &&
              Boolean(line.trim())
          )
        );
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
        "leadbase:proposal-scope-change",
        {
          detail: {
            scope: lines,
          },
        }
      )
    );
  }, [lines]);

  function updateLine(
    index: number,
    value: string
  ) {
    setLines((current) =>
      current.map(
        (line, lineIndex) =>
          lineIndex === index
            ? value
            : line
      )
    );
  }

  return (
    <div>
      <textarea
        name="scope"
        value={lines.join("\n")}
        readOnly
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">
            {isGerman
              ? "Leistungsumfang"
              : "Scope"}
          </h3>
          <p className="mt-1 text-[11.5px] text-[#6B7078]">
            {isGerman
              ? "Eine Leistung pro Zeile · erscheint als Liste im Angebot."
              : "One service per row · shown as a list in the proposal."}
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setLines((current) => [
              ...current,
              "",
            ])
          }
          className="inline-flex h-[30px] items-center gap-1.5 rounded-[9px] border border-black/[0.09] bg-white px-[11px] text-[12.5px] text-[#40454E] transition-colors hover:border-black/[0.16] disabled:opacity-50 dark:border-white/[0.10] dark:bg-[#15161A] dark:text-white"
        >
          <Plus className="size-3" />
          {isGerman
            ? "Leistung"
            : "Service"}
        </button>
      </div>

      <div className="mt-[14px] overflow-hidden rounded-[12px] border border-black/[0.08] dark:border-white/[0.08]">
        {lines.map((line, index) => (
          <div
            key={index}
            className="group flex min-h-[40px] items-center gap-3 border-b border-black/[0.06] bg-white px-3 last:border-b-0 hover:bg-[#F7F8FA] dark:border-white/[0.06] dark:bg-[#111216] dark:hover:bg-white/[0.035]"
          >
            <GripVertical className="size-3.5 shrink-0 cursor-grab text-black/25 dark:text-white/25" />

            <span className="w-[18px] shrink-0 font-mono text-[10.5px] tabular-nums text-[#9AA0A8]">
              {String(index + 1).padStart(2, "0")}
            </span>

            <input
              value={line}
              disabled={disabled}
              onChange={(event) =>
                updateLine(
                  index,
                  event.target.value
                )
              }
              className="min-w-0 flex-1 bg-transparent py-2 text-[12.5px] text-[#0B0C0E] outline-none disabled:opacity-60 dark:text-white"
            />

            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                setLines((current) =>
                  current.filter(
                    (_, lineIndex) =>
                      lineIndex !== index
                  )
                )
              }
              className="flex size-6 shrink-0 items-center justify-center rounded-[7px] text-[#9AA0A8] opacity-0 transition-[background-color,color,opacity] hover:bg-[#FDF0E3] hover:text-[#9A5106] group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-30"
              aria-label={
                isGerman
                  ? "Leistung löschen"
                  : "Delete service"
              }
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setLines((current) => [
              ...current,
              "",
            ])
          }
          className="flex w-full items-center gap-2.5 bg-[#FDFDFE] px-3 py-[10px] text-left text-[12px] text-[#6B7078] transition-colors hover:bg-[#F7F8FA] hover:text-[#002BBA] disabled:opacity-50 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
        >
          <Plus className="size-3.5" />
          {isGerman
            ? "Weitere Leistung hinzufügen"
            : "Add another service"}
        </button>
      </div>
    </div>
  );
}
