"use client";

import {
  Clock3,
  Eye,
  Loader2,
  MapPin,
  MousePointer2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  useLanguage,
} from "@/components/language-provider";

/* =========================================================
   TYPES
========================================================= */

export type LeadPreviewSummary = {
  slug:
    string;

  totalViews:
    number;

  detailedSessions:
    number;

  externalVisitors:
    number;

  ownerSessions:
    number;

  outreachSessions:
    number;

  engagedExternalSessions:
    number;

  legacyViewCount:
    number;
};

type PreviewVisit = {
  id:
    string;

  source:
    | "OWNER"
    | "OUTREACH"
    | "DIRECT";

  is_owner:
    boolean;

  is_engaged:
    boolean;

  first_seen_at:
    string;

  duration_seconds:
    number;

  max_scroll_percent:
    number;

  interaction_count:
    number;

  country_code:
    | string
    | null;

  country_region:
    | string
    | null;

  city:
    | string
    | null;

  device_type:
    | string
    | null;

  browser_name:
    | string
    | null;

  os_name:
    | string
    | null;
};

type VisitsResponse = {
  ok?:
    boolean;

  error?:
    string;

  summary?: {
    legacyViewCount?:
      number;

    externalVisitors?:
      number;

    ownerSessions?:
      number;

    outreachSessions?:
      number;

    engagedExternalSessions?:
      number;
  };

  visits?:
    PreviewVisit[];
};

type LeadPreviewVisitsButtonProps = {
  summary:
    LeadPreviewSummary;
};

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  value:
    string,
  language:
    "de"
    | "en"
) {
  return new Intl.DateTimeFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-GB",
    {
      timeZone:
        "Europe/Berlin",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatDuration(
  seconds:
    number,
  language:
    "de"
    | "en"
) {
  if (
    seconds <
      60
  ) {
    return `${seconds}s`;
  }

  const minutes =
    Math.floor(
      seconds /
        60
    );

  const rest =
    seconds %
    60;

  return language ===
    "de"
    ? `${minutes} Min.${rest ? ` ${rest}s` : ""}`
    : `${minutes} min${rest ? ` ${rest}s` : ""}`;
}

function getLocation(
  visit:
    PreviewVisit,
  fallback:
    string
) {
  const values =
    [
      visit.city,
      visit.country_region,
      visit.country_code,
    ].filter(
      (
        value
      ): value is string =>
        Boolean(
          value
        )
    );

  return values.length >
    0
    ? values.join(
        ", "
      )
    : fallback;
}

/* =========================================================
   COMPONENT
========================================================= */

export function LeadPreviewVisitsButton({
  summary:
    initialSummary,
}: LeadPreviewVisitsButtonProps) {
  const {
    language,
  } =
    useLanguage();

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const [
    mounted,
    setMounted,
  ] =
    useState(
      false
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

  const [
    visits,
    setVisits,
  ] =
    useState<
      PreviewVisit[]
    >(
      []
    );

  const [
    summary,
    setSummary,
  ] =
    useState({
      legacyViewCount:
        initialSummary.legacyViewCount,

      externalVisitors:
        initialSummary.externalVisitors,

      ownerSessions:
        initialSummary.ownerSessions,

      outreachSessions:
        initialSummary.outreachSessions,

      engagedExternalSessions:
        initialSummary.engagedExternalSessions,
    });

  const de =
    language ===
    "de";

  useEffect(
    () => {
      setMounted(
        true
      );

      return () => {
        setMounted(
          false
        );
      };
    },
    []
  );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      const previous =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function keyDown(
        event:
          KeyboardEvent
      ) {
        if (
          event.key ===
            "Escape"
        ) {
          setOpen(
            false
          );
        }
      }

      window.addEventListener(
        "keydown",
        keyDown
      );

      return () => {
        document.body.style.overflow =
          previous;

        window.removeEventListener(
          "keydown",
          keyDown
        );
      };
    },
    [
      open,
    ]
  );

  const loadVisits =
    useCallback(
      async () => {
        setLoading(
          true
        );

        setError(
          null
        );

        try {
          const response =
            await fetch(
              `/api/concept/${encodeURIComponent(
                initialSummary.slug
              )}/visits`,
              {
                cache:
                  "no-store",
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
              de
                ? "Besuchsdetails konnten nicht geladen werden."
                : "Visit details could not be loaded."
            );
          }

          const result =
            (await response.json()) as
              VisitsResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
              (
                de
                  ? "Besuchsdetails konnten nicht geladen werden."
                  : "Visit details could not be loaded."
              )
            );
          }

          setVisits(
            result.visits ??
              []
          );

          setSummary({
            legacyViewCount:
              result.summary
                ?.legacyViewCount ??
              initialSummary.legacyViewCount,

            externalVisitors:
              result.summary
                ?.externalVisitors ??
              initialSummary.externalVisitors,

            ownerSessions:
              result.summary
                ?.ownerSessions ??
              initialSummary.ownerSessions,

            outreachSessions:
              result.summary
                ?.outreachSessions ??
              initialSummary.outreachSessions,

            engagedExternalSessions:
              result.summary
                ?.engagedExternalSessions ??
              initialSummary.engagedExternalSessions,
          });
        } catch (
          loadError
        ) {
          console.error(
            "Could not load lead preview visits:",
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : de
                ? "Besuchsdetails konnten nicht geladen werden."
                : "Visit details could not be loaded."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        de,
        initialSummary,
      ]
    );

  const modal =
    mounted &&
    open
      ? createPortal(
          <div
            role="presentation"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                  event.currentTarget
              ) {
                setOpen(
                  false
                );
              }
            }}
            className="fixed inset-0 z-[9999] flex items-end justify-center overflow-y-auto bg-black/45 p-0 backdrop-blur-[4px] sm:items-center sm:p-6"
          >
            <div
              role="dialog"
              aria-modal="true"
              className="relative w-full max-h-[calc(100dvh-24px)] overflow-y-auto rounded-t-[26px] border bg-background shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:max-w-[760px] sm:rounded-[26px]"
            >
              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:right-5 sm:top-5"
                aria-label={
                  de
                    ? "Schließen"
                    : "Close"
                }
              >
                <X className="size-4" />
              </button>

              <div className="border-b px-5 pb-5 pt-6 pr-16 sm:px-7 sm:pb-6 sm:pt-7 sm:pr-20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" />

                  <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                    {de
                      ? "Kunden-Vorschau aktiv"
                      : "Client preview active"}
                  </p>
                </div>

                <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                  {de
                    ? "Vorschau-Besuche"
                    : "Preview visits"}
                </h2>

                <div className="mt-4">
                  <button
                    type="button"
                    disabled={
                      loading
                    }
                    onClick={() =>
                      void loadVisits()
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`size-3.5 ${
                        loading
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    {de
                      ? "Aktualisieren"
                      : "Refresh"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b bg-muted/20 p-4 sm:grid-cols-4 sm:p-5">
                <Stat
                  label={
                    de
                      ? "Externe Besucher"
                      : "External visitors"
                  }
                  value={
                    summary.externalVisitors
                  }
                />

                <Stat
                  label={
                    de
                      ? "Outreach-Aufrufe"
                      : "Outreach visits"
                  }
                  value={
                    summary.outreachSessions
                  }
                />

                <Stat
                  label={
                    de
                      ? "Engagiert"
                      : "Engaged"
                  }
                  value={
                    summary.engagedExternalSessions
                  }
                />

                <Stat
                  label={
                    de
                      ? "Deine Aufrufe"
                      : "Your visits"
                  }
                  value={
                    summary.ownerSessions
                  }
                />
              </div>

              <div className="p-4 sm:p-5">
                {error ? (
                  <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
                    {
                      error
                    }
                  </p>
                ) : null}

                {loading &&
                visits.length ===
                  0 ? (
                  <div className="flex min-h-36 items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : visits.length ===
                  0 ? (
                  <div className="rounded-xl border border-dashed px-5 py-9 text-center">
                    <Eye className="mx-auto size-5 text-muted-foreground" />

                    <p className="mt-2 text-sm font-medium">
                      {de
                        ? "Noch keine zugeordneten Besuche"
                        : "No attributed visits yet"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visits.map(
                      (
                        visit
                      ) => {
                        const likelyCustomer =
                          !visit.is_owner &&
                          visit.source ===
                            "OUTREACH" &&
                          visit.is_engaged;

                        const label =
                          visit.is_owner
                            ? de
                              ? "Du · Eigenaufruf"
                              : "You · Own visit"
                            : likelyCustomer
                              ? de
                                ? "Wahrscheinlich Kunde"
                                : "Likely customer"
                              : visit.source ===
                                  "OUTREACH"
                                ? de
                                  ? "Aus Outreach-Mail"
                                  : "From outreach email"
                                : de
                                  ? "Externer Besucher"
                                  : "External visitor";

                        return (
                          <div
                            key={
                              visit.id
                            }
                            className="rounded-xl border bg-background p-3.5 sm:p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                    visit.is_owner
                                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                      : likelyCustomer
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : "bg-muted text-foreground"
                                  }`}
                                >
                                  {
                                    label
                                  }
                                </span>

                                <p className="mt-2 text-xs text-muted-foreground">
                                  {formatDate(
                                    visit.first_seen_at,
                                    language
                                  )}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-xs font-medium">
                                  {visit.device_type ??
                                    "—"}
                                </p>

                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  {visit.browser_name ??
                                    "—"}{" "}
                                  ·{" "}
                                  {visit.os_name ??
                                    "—"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <MapPin className="size-3.5 shrink-0" />

                                <span className="truncate">
                                  {getLocation(
                                    visit,
                                    de
                                      ? "Standort unbekannt"
                                      : "Location unknown"
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock3 className="size-3.5 shrink-0" />

                                <span>
                                  {formatDuration(
                                    visit.duration_seconds,
                                    language
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <MousePointer2 className="size-3.5 shrink-0" />

                                <span>
                                  {visit.max_scroll_percent}%{" "}
                                  Scroll ·{" "}
                                  {
                                    visit.interaction_count
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {summary.legacyViewCount >
                0 ? (
                  <div className="mt-4 rounded-xl border bg-muted/20 px-3.5 py-3">
                    <p className="text-xs font-medium">
                      {de
                        ? "Frühere, nicht zuordenbare Aufrufe"
                        : "Earlier unattributed views"}
                      :{" "}
                      {
                        summary.legacyViewCount
                      }
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(
            true
          );

          void loadVisits();
        }}
        className={`inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold transition-colors ${
          initialSummary.externalVisitors >
          0
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
            : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        title={
          initialSummary.externalVisitors >
          0
            ? de
              ? `Kundenvorschau gesehen · ${initialSummary.totalViews} Aufruf${initialSummary.totalViews === 1 ? "" : "e"} insgesamt`
              : `Preview viewed · ${initialSummary.totalViews} total view${initialSummary.totalViews === 1 ? "" : "s"}`
            : de
              ? `${initialSummary.totalViews} Vorschau-Aufruf${initialSummary.totalViews === 1 ? "" : "e"}`
              : `${initialSummary.totalViews} preview view${initialSummary.totalViews === 1 ? "" : "s"}`
        }
      >
        <Eye className="size-3 shrink-0" />

        {initialSummary.externalVisitors >
        0 ? (
          <span>
            {de
              ? "Gesehen"
              : "Viewed"}
          </span>
        ) : (
          <span>
            {
              initialSummary.totalViews
            }
          </span>
        )}
      </button>

      {
        modal
      }
    </>
  );
}

/* =========================================================
   STAT
========================================================= */

function Stat({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {
          label
        }
      </p>

      <p className="mt-1 text-xl font-semibold">
        {
          value
        }
      </p>
    </div>
  );
}
