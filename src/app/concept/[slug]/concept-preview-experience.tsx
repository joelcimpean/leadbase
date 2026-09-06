"use client";

import {
  ExternalLink,
} from "lucide-react";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CustomerDesignFrame,
} from "./customer-design-frame";

/* =========================================================
   TEMP FEATURE FLAG
========================================================= */

/*
 * Preview 2.0 (Aktuell / Vergleichen) stays in the codebase,
 * but is intentionally disabled for now. Set this to true
 * when Joel wants to revisit the feature.
 */
const PREVIEW_COMPARE_ENABLED =
  false;

/* =========================================================
   TYPES
========================================================= */

type PreviewMode =
  | "concept"
  | "current"
  | "compare";

type MobileCompareMode =
  | "current"
  | "concept";

type ConceptPreviewExperienceProps = {
  companyName:
    string;

  html:
    string;

  currentWebsiteSnapshotUrl:
    string
    | null;

  currentWebsiteUrl:
    string
    | null;
};

/* =========================================================
   HELPERS
========================================================= */

function prepareComparisonHtml(
  value:
    string
) {
  const styles = `
<style id="leadbase-compare-preview-fix">
  html,
  body {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  img,
  video,
  svg,
  canvas {
    max-width: 100% !important;
  }
</style>
  `.trim();

  if (
    /<\/head>/i.test(
      value
    )
  ) {
    return value.replace(
      /<\/head>/i,
      `${styles}\n</head>`
    );
  }

  return `${styles}\n${value}`;
}

/* =========================================================
   TABS
========================================================= */

function ModeTabs({
  mode,
  setMode,
  compareAvailable,
}: {
  mode:
    PreviewMode;

  setMode:
    (
      value:
        PreviewMode
    ) =>
      void;

  compareAvailable:
    boolean;
}) {
  const tabs:
    Array<{
      id:
        PreviewMode;

      label:
        string;

      disabled?:
        boolean;
    }> = [
    {
      id:
        "current",

      label:
        "Aktuell",

      disabled:
        !compareAvailable,
    },
    {
      id:
        "concept",

      label:
        "Konzept",
    },
    {
      id:
        "compare",

      label:
        "Vergleichen",

      disabled:
        !compareAvailable,
    },
  ];

  return (
    <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-100 p-1">
      {tabs.map(
        (
          tab
        ) => {
          const active =
            tab.id ===
            mode;

          return (
            <button
              key={
                tab.id
              }
              type="button"
              disabled={
                tab.disabled
              }
              onClick={() =>
                setMode(
                  tab.id
                )
              }
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                active
                  ? "bg-white text-neutral-950 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900"
              } disabled:cursor-not-allowed disabled:opacity-35`}
            >
              {
                tab.label
              }
            </button>
          );
        }
      )}
    </div>
  );
}

/* =========================================================
   CURRENT SNAPSHOT
========================================================= */

function CurrentSnapshot({
  companyName,
  snapshotUrl,
  fill = false,
}: {
  companyName:
    string;

  snapshotUrl:
    string;

  fill?:
    boolean;
}) {
  return (
    <img
      src={
        snapshotUrl
      }
      alt={`Aktueller Webauftritt von ${companyName}`}
      draggable={
        false
      }
      className={
        fill
          ? "pointer-events-none absolute inset-0 size-full select-none object-cover"
          : "block aspect-[16/10] w-full select-none object-cover"
      }
    />
  );
}

function CurrentWebsiteView({
  companyName,
  snapshotUrl,
  currentWebsiteUrl,
}: {
  companyName:
    string;

  snapshotUrl:
    string;

  currentWebsiteUrl:
    string
    | null;
}) {
  return (
    <section className="bg-neutral-50 px-3 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,.08)] sm:rounded-3xl">
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-2.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="size-2.5 rounded-full bg-neutral-200" />
                <span className="size-2.5 rounded-full bg-neutral-200" />
                <span className="size-2.5 rounded-full bg-neutral-200" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-neutral-800 sm:text-sm">
                  Aktueller Webauftritt
                </p>

                <p className="hidden text-[10px] text-neutral-400 sm:block">
                  Gespeicherter Stand zum Zeitpunkt der Designvorschau
                </p>
              </div>
            </div>

            {currentWebsiteUrl ? (
              <a
                href={
                  currentWebsiteUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-950 sm:px-3 sm:text-xs"
              >
                Original öffnen

                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>

          <CurrentSnapshot
            companyName={
              companyName
            }
            snapshotUrl={
              snapshotUrl
            }
          />
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   DESKTOP REVEAL
========================================================= */

function DesktopCompare({
  companyName,
  snapshotUrl,
  html,
}: {
  companyName:
    string;

  snapshotUrl:
    string;

  html:
    string;
}) {
  const [
    position,
    setPosition,
  ] =
    useState(
      50
    );

  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const updatePosition =
    useCallback(
      (
        clientX:
          number
      ) => {
        const element =
          containerRef.current;

        if (
          !element
        ) {
          return;
        }

        const rect =
          element.getBoundingClientRect();

        const next =
          ((clientX -
            rect.left) /
            rect.width) *
          100;

        setPosition(
          Math.min(
            94,
            Math.max(
              6,
              next
            )
          )
        );
      },
      []
    );

  const preparedHtml =
    useMemo(
      () =>
        prepareComparisonHtml(
          html
        ),
      [
        html,
      ]
    );

  return (
    <div
      ref={
        containerRef
      }
      className="relative hidden aspect-[16/10] w-full select-none overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,.10)] md:block"
      onPointerDown={(
        event
      ) => {
        event.currentTarget.setPointerCapture(
          event.pointerId
        );

        updatePosition(
          event.clientX
        );
      }}
      onPointerMove={(
        event
      ) => {
        if (
          event.currentTarget.hasPointerCapture(
            event.pointerId
          )
        ) {
          updatePosition(
            event.clientX
          );
        }
      }}
    >
      <CurrentSnapshot
        companyName={
          companyName
        }
        snapshotUrl={
          snapshotUrl
        }
        fill
      />

      <div
        className="absolute inset-0 overflow-hidden bg-white"
        style={{
          clipPath:
            `inset(0 0 0 ${position}%)`,
        }}
      >
        <iframe
          title={`Designidee für ${companyName}`}
          srcDoc={
            preparedHtml
          }
          sandbox=""
          tabIndex={
            -1
          }
          className="pointer-events-none absolute inset-0 size-full border-0 bg-white"
        />
      </div>

      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
        Aktueller Webauftritt
      </div>

      <div className="pointer-events-none absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-neutral-950 shadow-sm backdrop-blur">
        Designidee
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,.15)]"
        style={{
          left:
            `${position}%`,
        }}
      />

      <button
        type="button"
        aria-label="Vergleich verschieben"
        className="absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-white/70 bg-neutral-950 text-white shadow-xl"
        style={{
          left:
            `${position}%`,
        }}
      >
        <span className="text-sm font-semibold tracking-[-0.12em]">
          ↔
        </span>
      </button>
    </div>
  );
}

/* =========================================================
   MOBILE COMPARE
========================================================= */

function MobileCompare({
  companyName,
  snapshotUrl,
  html,
}: {
  companyName:
    string;

  snapshotUrl:
    string;

  html:
    string;
}) {
  const [
    mode,
    setMode,
  ] =
    useState<MobileCompareMode>(
      "concept"
    );

  const preparedHtml =
    useMemo(
      () =>
        prepareComparisonHtml(
          html
        ),
      [
        html,
      ]
    );

  return (
    <div className="md:hidden">
      <div className="mb-3 grid grid-cols-2 rounded-xl border border-neutral-200 bg-neutral-100 p-1">
        <button
          type="button"
          onClick={() =>
            setMode(
              "current"
            )
          }
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            mode ===
            "current"
              ? "bg-white text-neutral-950 shadow-sm"
              : "text-neutral-500"
          }`}
        >
          Aktueller Webauftritt
        </button>

        <button
          type="button"
          onClick={() =>
            setMode(
              "concept"
            )
          }
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            mode ===
            "concept"
              ? "bg-white text-neutral-950 shadow-sm"
              : "text-neutral-500"
          }`}
        >
          Designidee
        </button>
      </div>

      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {mode ===
        "current" ? (
          <CurrentSnapshot
            companyName={
              companyName
            }
            snapshotUrl={
              snapshotUrl
            }
            fill
          />
        ) : (
          <iframe
            title={`Designidee für ${companyName}`}
            srcDoc={
              preparedHtml
            }
            sandbox=""
            tabIndex={
              -1
            }
            className="pointer-events-none size-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================
   COMPARE VIEW
========================================================= */

function CompareView({
  companyName,
  snapshotUrl,
  html,
  showConcept,
}: {
  companyName:
    string;

  snapshotUrl:
    string;

  html:
    string;

  showConcept:
    () =>
      void;
}) {
  return (
    <section className="bg-neutral-50 px-3 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mx-auto mb-5 max-w-[760px] text-center sm:mb-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Vergleich
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">
            Aktuellen Webauftritt und Designidee direkt vergleichen
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            Links sehen Sie den gespeicherten Stand des aktuellen Auftritts, rechts die Designidee – im exakt gleichen 16:10-Viewport. Der Vergleich ist keine Bewertung des bestehenden Auftritts.
          </p>
        </div>

        <DesktopCompare
          companyName={
            companyName
          }
          snapshotUrl={
            snapshotUrl
          }
          html={
            html
          }
        />

        <MobileCompare
          companyName={
            companyName
          }
          snapshotUrl={
            snapshotUrl
          }
          html={
            html
          }
        />

        <div className="mt-5 flex justify-center sm:mt-6">
          <button
            type="button"
            onClick={
              showConcept
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Komplettes Konzept ansehen
          </button>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   EXPERIENCE
========================================================= */

export function ConceptPreviewExperience({
  companyName,
  html,
  currentWebsiteSnapshotUrl,
  currentWebsiteUrl,
}: ConceptPreviewExperienceProps) {
  if (
    !PREVIEW_COMPARE_ENABLED
  ) {
    return (
      <CustomerDesignFrame
        title={`Designkonzept für ${companyName}`}
        html={
          html
        }
      />
    );
  }

  const compareAvailable =
    Boolean(
      currentWebsiteSnapshotUrl
    );

  const [
    mode,
    setMode,
  ] =
    useState<PreviewMode>(
      "concept"
    );

  return (
    <>
      <div className="sticky top-0 z-[90] border-b border-neutral-100 bg-white/95 shadow-[0_1px_0_rgba(0,0,0,.03)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <ModeTabs
            mode={
              mode
            }
            setMode={
              setMode
            }
            compareAvailable={
              compareAvailable
            }
          />

          <p className="max-w-[620px] text-[11px] leading-5 text-neutral-400 sm:text-right">
            Ihr bestehender Auftritt bildet die Grundlage. Die Designidee zeigt eine mögliche visuelle Weiterentwicklung – kein finales Konzept.
          </p>
        </div>
      </div>

      {mode ===
      "current" &&
      currentWebsiteSnapshotUrl ? (
        <CurrentWebsiteView
          companyName={
            companyName
          }
          snapshotUrl={
            currentWebsiteSnapshotUrl
          }
          currentWebsiteUrl={
            currentWebsiteUrl
          }
        />
      ) : null}

      {mode ===
      "compare" &&
      currentWebsiteSnapshotUrl ? (
        <CompareView
          companyName={
            companyName
          }
          snapshotUrl={
            currentWebsiteSnapshotUrl
          }
          html={
            html
          }
          showConcept={() =>
            setMode(
              "concept"
            )
          }
        />
      ) : null}

      {mode ===
      "concept" ? (
        <CustomerDesignFrame
          title={`Designkonzept für ${companyName}`}
          html={
            html
          }
        />
      ) : null}
    </>
  );
}
