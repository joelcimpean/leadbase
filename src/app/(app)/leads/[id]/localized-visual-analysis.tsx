"use client";

import {
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  type AppLanguage,
} from "@/lib/i18n";

/* =========================================================
   TYPES
========================================================= */

export type VisualNarrative = {
  strengths: string[];

  weaknesses: string[];

  summary:
    | string
    | null;

  redesignReason:
    | string
    | null;

  outreachAngle:
    | string
    | null;
};

type LocalizedVisualAnalysisProps = {
  leadId: string;

  sourceLanguage?:
    AppLanguage;

  narrative:
    VisualNarrative;
};

type LocalizationResponse = {
  ok?: boolean;

  error?: string;

  language?:
    AppLanguage;

  cached?: boolean;

  narrative?: {
    strengths: string[];

    weaknesses: string[];

    summary: string;

    redesignReason: string;

    outreachAngle: string;
  };
};

/* =========================================================
   COPY
========================================================= */

const copy = {
  de: {
    strengths:
      "Stärken",

    weaknesses:
      "Schwächen",

    summary:
      "Visuelle Zusammenfassung",

    redesignReason:
      "Grund für Redesign",

    outreachAngle:
      "Empfohlener Outreach-Ansatz",

    loading:
      "Analyse wird auf Deutsch aufbereitet...",

    error:
      "Die deutsche Analyse konnte nicht geladen werden. Es wird die Originalanalyse angezeigt.",
  },

  en: {
    strengths:
      "Strengths",

    weaknesses:
      "Weaknesses",

    summary:
      "Visual summary",

    redesignReason:
      "Redesign reason",

    outreachAngle:
      "Suggested outreach angle",

    loading:
      "Preparing English analysis...",

    error:
      "The English analysis could not be loaded. Showing the original analysis.",
  },
} as const;

/* =========================================================
   HELPERS
========================================================= */

function normalizeNarrative(
  value:
    | LocalizationResponse["narrative"]
    | VisualNarrative
): VisualNarrative {
  return {
    strengths:
      Array.isArray(
        value?.strengths
      )
        ? value.strengths
        : [],

    weaknesses:
      Array.isArray(
        value?.weaknesses
      )
        ? value.weaknesses
        : [],

    summary:
      typeof value?.summary ===
      "string"
        ? value.summary
        : null,

    redesignReason:
      typeof value?.redesignReason ===
      "string"
        ? value.redesignReason
        : null,

    outreachAngle:
      typeof value?.outreachAngle ===
      "string"
        ? value.outreachAngle
        : null,
  };
}

function hasNarrative(
  narrative:
    VisualNarrative
) {
  return Boolean(
    narrative
      .strengths
      .length >
      0 ||
      narrative
        .weaknesses
        .length >
        0 ||
      narrative.summary?.trim() ||
      narrative
        .redesignReason
        ?.trim() ||
      narrative
        .outreachAngle
        ?.trim()
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export function LocalizedVisualAnalysis({
  leadId,
  sourceLanguage = "en",
  narrative,
}: LocalizedVisualAnalysisProps) {
  const {
    language,
  } =
    useLanguage();

  const text =
    copy[
      language
    ];

  /* =======================================================
     MEMORY CACHE

     Prevents another request when switching
     DE -> EN -> DE while this component stays mounted.
  ======================================================= */

  const cacheRef =
    useRef<
      Map<
        AppLanguage,
        VisualNarrative
      >
    >(
      new Map([
        [
          sourceLanguage,
          normalizeNarrative(
            narrative
          ),
        ],
      ])
    );

  const [
    displayedNarrative,
    setDisplayedNarrative,
  ] =
    useState<VisualNarrative>(
      normalizeNarrative(
        narrative
      )
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  /* =======================================================
     KEEP SOURCE CURRENT
  ======================================================= */

  useEffect(
    () => {
      const normalized =
        normalizeNarrative(
          narrative
        );

      cacheRef.current.set(
        sourceLanguage,
        normalized
      );

      if (
        language ===
        sourceLanguage
      ) {
        setDisplayedNarrative(
          normalized
        );

        setLoading(
          false
        );

        setError(
          null
        );
      }
    },
    [
      language,
      narrative,
      sourceLanguage,
    ]
  );

  /* =======================================================
     LANGUAGE CHANGE
  ======================================================= */

  useEffect(
    () => {
      const sourceNarrative =
        normalizeNarrative(
          narrative
        );

      /* =====================================================
         NO ANALYSIS CONTENT
      ===================================================== */

      if (
        !hasNarrative(
          sourceNarrative
        )
      ) {
        setDisplayedNarrative(
          sourceNarrative
        );

        setLoading(
          false
        );

        setError(
          null
        );

        return;
      }

      /* =====================================================
         ORIGINAL LANGUAGE
      ===================================================== */

      if (
        language ===
        sourceLanguage
      ) {
        setDisplayedNarrative(
          sourceNarrative
        );

        setLoading(
          false
        );

        setError(
          null
        );

        return;
      }

      /* =====================================================
         CLIENT CACHE
      ===================================================== */

      const cached =
        cacheRef.current.get(
          language
        );

      if (
        cached
      ) {
        setDisplayedNarrative(
          cached
        );

        setLoading(
          false
        );

        setError(
          null
        );

        return;
      }

      /* =====================================================
         LOAD LOCALIZATION
      ===================================================== */

      const controller =
        new AbortController();

      async function loadLocalization() {
        setLoading(
          true
        );

        setError(
          null
        );

        try {
          const response =
            await fetch(
              `/api/leads/${encodeURIComponent(
                leadId
              )}/localize-visual-analysis`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    language,
                  }),

                signal:
                  controller.signal,
              }
            );

          const contentType =
            response.headers.get(
              "content-type"
            ) ??
            "";

          if (
            !contentType.includes(
              "application/json"
            )
          ) {
            throw new Error(
              `Localization request failed (${response.status}).`
            );
          }

          const result =
            (await response.json()) as
              LocalizationResponse;

          if (
            !response.ok ||
            !result.ok ||
            !result.narrative
          ) {
            throw new Error(
              result.error ??
                `Localization request failed (${response.status}).`
            );
          }

          const localized =
            normalizeNarrative(
              result.narrative
            );

          cacheRef.current.set(
            language,
            localized
          );

          setDisplayedNarrative(
            localized
          );
        } catch (
          localizationError
        ) {
          if (
            localizationError instanceof
              DOMException &&
            localizationError.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Could not localize visual analysis:",
            localizationError
          );

          /*
           * Never make the analysis disappear just because
           * translation failed.
           */

          setDisplayedNarrative(
            sourceNarrative
          );

          setError(
            text.error
          );
        } finally {
          if (
            !controller.signal
              .aborted
          ) {
            setLoading(
              false
            );
          }
        }
      }

      void loadLocalization();

      return () => {
        controller.abort();
      };
    },
    [
      language,
      leadId,
      narrative,
      sourceLanguage,
      text.error,
    ]
  );

  /* =======================================================
     NOTHING TO DISPLAY
  ======================================================= */

  if (
    !hasNarrative(
      displayedNarrative
    ) &&
    !loading
  ) {
    return null;
  }

  /* =======================================================
     LOADING

     Do not flash the English original while German is
     being generated for the first time.
  ======================================================= */

  if (
    loading &&
    language !==
      sourceLanguage &&
    !cacheRef.current.has(
      language
    )
  ) {
    return (
      <div className="mt-6 flex items-center gap-3 border-t pt-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 shrink-0 animate-spin" />

        <span>
          {
            text.loading
          }
        </span>
      </div>
    );
  }

  return (
    <>
      {/* ===================================================
          ERROR FALLBACK
      =================================================== */}

      {error ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          {
            error
          }
        </div>
      ) : null}

      {/* ===================================================
          STRENGTHS / WEAKNESSES
      =================================================== */}

      {(displayedNarrative
        .strengths
        .length >
        0 ||
        displayedNarrative
          .weaknesses
          .length >
          0) ? (
        <div className="mt-6 grid gap-5 border-t pt-5 sm:grid-cols-2">
          {/* =================================================
              STRENGTHS
          ================================================= */}

          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {
                text.strengths
              }
            </p>

            <div className="mt-3 space-y-2.5">
              {displayedNarrative
                .strengths
                .map(
                  (
                    strength,
                    index
                  ) => (
                    <div
                      key={`${strength}-${index}`}
                      className="flex min-w-0 gap-2 text-sm leading-6"
                    >
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" />

                      <span className="break-words">
                        {
                          strength
                        }
                      </span>
                    </div>
                  )
                )}
            </div>
          </div>

          {/* =================================================
              WEAKNESSES
          ================================================= */}

          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {
                text.weaknesses
              }
            </p>

            <div className="mt-3 space-y-2.5">
              {displayedNarrative
                .weaknesses
                .map(
                  (
                    weakness,
                    index
                  ) => (
                    <div
                      key={`${weakness}-${index}`}
                      className="flex min-w-0 gap-2 text-sm leading-6"
                    >
                      <XCircle className="mt-1 size-4 shrink-0 text-red-500" />

                      <span className="break-words">
                        {
                          weakness
                        }
                      </span>
                    </div>
                  )
                )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================================================
          SUMMARY
      =================================================== */}

      {displayedNarrative
        .summary ? (
        <AnalysisTextSection
          label={
            text.summary
          }
          value={
            displayedNarrative
              .summary
          }
        />
      ) : null}

      {/* ===================================================
          REDESIGN REASON
      =================================================== */}

      {displayedNarrative
        .redesignReason ? (
        <AnalysisTextSection
          label={
            text.redesignReason
          }
          value={
            displayedNarrative
              .redesignReason
          }
        />
      ) : null}

      {/* ===================================================
          OUTREACH ANGLE
      =================================================== */}

      {displayedNarrative
        .outreachAngle ? (
        <div className="mt-5 rounded-lg border bg-muted/30 px-4 py-4">
          <p className="text-xs font-medium text-muted-foreground">
            {
              text.outreachAngle
            }
          </p>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
            {
              displayedNarrative
                .outreachAngle
            }
          </p>
        </div>
      ) : null}
    </>
  );
}

/* =========================================================
   TEXT SECTION
========================================================= */

function AnalysisTextSection({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="mt-5 border-t pt-5">
      <p className="text-xs font-medium text-muted-foreground">
        {
          label
        }
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
        {
          value
        }
      </p>
    </div>
  );
}