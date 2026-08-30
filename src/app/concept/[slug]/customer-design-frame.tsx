"use client";

import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Eye,
  Laptop,
  Mail,
  MapPin,
  MousePointer2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

/* =========================================================
   TYPES
========================================================= */

type CustomerDesignFrameProps = {
  html:
    string;

  title:
    string;
};

type CustomerContactChoiceProps = {
  companyName:
    string;

  mailUrl:
    string
    | null;

  calendarUrl:
    string;
};

/* =========================================================
   HTML PREPARATION
========================================================= */

function preparePreviewHtml(
  value:
    string
) {
  const previewStyles =
    `
<style id="leadbase-customer-preview-fix">
  html {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden !important;
  }

  body {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden !important;
  }

  img,
  video,
  svg,
  canvas {
    max-width: 100%;
  }

  @media (max-width: 767px) {
    html,
    body {
      height: auto !important;
      min-height: 0 !important;
      overflow-y: visible !important;
      overscroll-behavior-y: auto !important;
      -webkit-overflow-scrolling: touch;
    }

    body {
      position: relative !important;
    }
  }
</style>
    `.trim();

  let html =
    value.trim();

  /* =======================================================
     VIEWPORT
  ======================================================= */

  if (
    !/<meta[^>]+name=["']viewport["']/i.test(
      html
    )
  ) {
    if (
      /<\/head>/i.test(
        html
      )
    ) {
      html =
        html.replace(
          /<\/head>/i,
          `
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
>

</head>
          `.trim()
        );
    } else {
      html =
        `
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover"
>

${html}
        `.trim();
    }
  }

  /* =======================================================
     MOBILE / SCROLL FIX
  ======================================================= */

  if (
    /<\/head>/i.test(
      html
    )
  ) {
    html =
      html.replace(
        /<\/head>/i,
        `${previewStyles}

</head>`
      );
  } else {
    html =
      `${previewStyles}

${html}`;
  }

  return html;
}

/* =========================================================
   CONTACT CHOICE
========================================================= */

export function CustomerContactChoice({
  companyName,
  mailUrl,
  calendarUrl,
}: CustomerContactChoiceProps) {
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

  /* =======================================================
     MOUNT
  ======================================================= */

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

  /* =======================================================
     ESCAPE + BODY LOCK
  ======================================================= */

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function handleKeyDown(
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
        handleKeyDown
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      open,
    ]
  );

  /* =======================================================
     MODAL
  ======================================================= */

  const modal =
    open &&
    mounted
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
              aria-labelledby="customer-contact-title"
              className="relative my-0 w-full max-h-[calc(100dvh-24px)] overflow-y-auto rounded-t-[26px] border border-neutral-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:my-auto sm:max-w-[640px] sm:rounded-[26px]"
            >
              {/* ===========================================
                  CLOSE
              =========================================== */}

              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                aria-label="Dialog schließen"
                className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:bg-neutral-100 hover:text-neutral-950 sm:right-5 sm:top-5"
              >
                <X className="size-4" />
              </button>

              {/* ===========================================
                  HEADER
              =========================================== */}

              <div className="border-b border-neutral-100 px-5 pb-5 pt-6 pr-16 sm:px-7 sm:pb-6 sm:pt-7 sm:pr-20">
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-neutral-400">
                  Designvorschau
                </p>

                <h2
                  id="customer-contact-title"
                  className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl"
                >
                  Wie möchten Sie weitermachen?
                </h2>

                <p className="mt-3 max-w-[540px] text-sm leading-6 text-neutral-600">
                  Wenn Ihnen die Richtung für{" "}
                  <strong className="font-semibold text-neutral-900">
                    {
                      companyName
                    }
                  </strong>{" "}
                  grundsätzlich gefällt, können Sie mir direkt schreiben oder die Vorschau persönlich in einem kurzen Gespräch mit mir besprechen.
                </p>
              </div>

              {/* ===========================================
                  OPTIONS
              =========================================== */}

              <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                {/* =========================================
                    EMAIL
                ========================================= */}

                {mailUrl ? (
                  <a
                    href={
                      mailUrl
                    }
                    onClick={() =>
                      setOpen(
                        false
                      )
                    }
                    className="group flex min-h-[200px] flex-col rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-950 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg"
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-neutral-950 text-white">
                      <Mail className="size-4" />
                    </div>

                    <div className="mt-5">
                      <p className="text-base font-semibold">
                        Per E-Mail schreiben
                      </p>

                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        Schreiben Sie mir direkt eine kurze Nachricht. Betreff und ein kurzer Einstieg sind bereits vorbereitet.
                      </p>
                    </div>

                    <div className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold">
                      E-Mail öffnen

                      <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </a>
                ) : null}

                {/* =========================================
                    CAL.COM
                ========================================= */}

                <a
                  href={
                    calendarUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    setOpen(
                      false
                    )
                  }
                  className="group flex min-h-[200px] flex-col rounded-2xl border border-neutral-950 bg-neutral-950 p-5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-900 hover:shadow-lg"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white text-neutral-950">
                    <CalendarDays className="size-4" />
                  </div>

                  <div className="mt-5">
                    <p className="text-base font-semibold">
                      30-Minuten-Call buchen
                    </p>

                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      Falls Sie die Vorschau lieber persönlich mit mir besprechen möchten, können Sie direkt einen passenden Termin auswählen.
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold">
                    Termin auswählen

                    <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </a>
              </div>

              {/* ===========================================
                  FOOTER
              =========================================== */}

              <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3.5 text-center text-[11px] leading-5 text-neutral-400 sm:px-7">
                Beides ist unverbindlich – wählen Sie einfach den Weg, der für Sie angenehmer ist.
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(
            true
          )
        }
        className="group inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-neutral-950 px-3 text-[11px] font-semibold text-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-px hover:bg-neutral-800 min-[390px]:gap-2 min-[390px]:px-3.5 min-[390px]:text-xs sm:h-11 sm:px-5 sm:text-sm"
      >
        <Mail className="size-3.5 shrink-0 sm:size-4" />

        <span className="min-[390px]:hidden">
          Kontakt
        </span>

        <span className="hidden min-[390px]:inline">
          Projekt besprechen
        </span>

        <ArrowUpRight className="hidden size-3.5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" />
      </button>

      {
        modal
      }
    </>
  );
}

/* =========================================================
   PREVIEW VISIT TRACKER
========================================================= */

type PreviewVisitTrackerProps = {
  slug:
    string;
};

function createTrackingId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }
}

function getOrCreateStorageId({
  storage,
  key,
}: {
  storage:
    Storage;

  key:
    string;
}) {
  try {
    const existing =
      storage.getItem(
        key
      );

    if (
      existing
    ) {
      return existing;
    }

    const created =
      createTrackingId();

    storage.setItem(
      key,
      created
    );

    return created;
  } catch {
    return createTrackingId();
  }
}

export function PreviewVisitTracker({
  slug,
}: PreviewVisitTrackerProps) {
  useEffect(
    () => {
      const visitorId =
        getOrCreateStorageId({
          storage:
            window.localStorage,

          key:
            "leadbase-preview-visitor-id",
        });

      const sessionId =
        getOrCreateStorageId({
          storage:
            window.sessionStorage,

          key:
            `leadbase-preview-session:${slug}`,
        });

      const searchParams =
        new URLSearchParams(
          window.location.search
        );

      const source =
        searchParams.get(
          "src"
        ) ===
          "outreach"
          ? "OUTREACH"
          : "DIRECT";

      let started =
        false;

      let visibleStartedAt =
        document.visibilityState ===
          "visible"
          ? Date.now()
          : null;

      let visibleMilliseconds =
        0;

      let maxScrollPercent =
        0;

      let interactionCount =
        0;

      function getDurationSeconds() {
        const currentVisible =
          visibleStartedAt
            ? Date.now() -
              visibleStartedAt
            : 0;

        return Math.max(
          0,
          Math.round(
            (
              visibleMilliseconds +
              currentVisible
            ) /
              1000
          )
        );
      }

      function getEngaged() {
        return (
          getDurationSeconds() >=
            8 ||
          maxScrollPercent >=
            25 ||
          interactionCount >=
            1
        );
      }

      function createPayload(
        action:
          "start"
          | "update"
      ) {
        return {
          action,

          visitorId,

          sessionId,

          source,

          durationSeconds:
            getDurationSeconds(),

          maxScrollPercent,

          interactionCount,

          engaged:
            getEngaged(),
        };
      }

      async function send(
        action:
          "start"
          | "update"
      ) {
        if (
          document.visibilityState !==
            "visible" &&
          action ===
            "start"
        ) {
          return;
        }

        try {
          const response =
            await fetch(
              `/concept/${encodeURIComponent(
                slug
              )}/track`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify(
                    createPayload(
                      action
                    )
                  ),

                keepalive:
                  true,
              }
            );

          if (
            !response.ok
          ) {
            console.warn(
              "Preview visit tracking request failed:",
              response.status,
              response.statusText
            );
          }
        } catch (
          trackingError
        ) {
          console.warn(
            "Preview visit tracking request failed:",
            trackingError
          );
        }
      }

      function sendBeacon() {
        if (
          !started ||
          !navigator.sendBeacon
        ) {
          return;
        }

        try {
          const blob =
            new Blob(
              [
                JSON.stringify(
                  createPayload(
                    "update"
                  )
                ),
              ],
              {
                type:
                  "application/json",
              }
            );

          navigator.sendBeacon(
            `/concept/${encodeURIComponent(
              slug
            )}/track`,
            blob
          );
        } catch {
          // Non-fatal.
        }
      }

      function updateScrollDepth() {
        const root =
          document.documentElement;

        const body =
          document.body;

        const documentHeight =
          Math.max(
            root.scrollHeight,
            body.scrollHeight
          );

        const viewportHeight =
          window.innerHeight;

        const scrollable =
          Math.max(
            1,
            documentHeight -
              viewportHeight
          );

        const percent =
          Math.min(
            100,
            Math.max(
              0,
              Math.round(
                (
                  window.scrollY /
                  scrollable
                ) *
                  100
              )
            )
          );

        maxScrollPercent =
          Math.max(
            maxScrollPercent,
            percent
          );
      }

      function handleInteraction() {
        interactionCount +=
          1;
      }

      function handleVisibility() {
        if (
          document.visibilityState ===
            "visible"
        ) {
          visibleStartedAt =
            Date.now();

          if (
            !started
          ) {
            started =
              true;

            void send(
              "start"
            );
          }

          return;
        }

        if (
          visibleStartedAt
        ) {
          visibleMilliseconds +=
            Date.now() -
            visibleStartedAt;

          visibleStartedAt =
            null;
        }

        if (
          started
        ) {
          void send(
            "update"
          );
        }
      }

      /*
       * Waiting briefly + requiring a visible document filters
       * out many email-security prefetches and simple bots.
       */
      const startTimer =
        window.setTimeout(
          () => {
            if (
              document.visibilityState ===
                "visible"
            ) {
              started =
                true;

              void send(
                "start"
              );
            }
          },
          1500
        );

      const heartbeat =
        window.setInterval(
          () => {
            if (
              started &&
              document.visibilityState ===
                "visible"
            ) {
              void send(
                "update"
              );
            }
          },
          10000
        );

      window.addEventListener(
        "scroll",
        updateScrollDepth,
        {
          passive:
            true,
        }
      );

      window.addEventListener(
        "pointerdown",
        handleInteraction,
        {
          passive:
            true,
        }
      );

      window.addEventListener(
        "keydown",
        handleInteraction
      );

      document.addEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.addEventListener(
        "pagehide",
        sendBeacon
      );

      updateScrollDepth();

      return () => {
        window.clearTimeout(
          startTimer
        );

        window.clearInterval(
          heartbeat
        );

        window.removeEventListener(
          "scroll",
          updateScrollDepth
        );

        window.removeEventListener(
          "pointerdown",
          handleInteraction
        );

        window.removeEventListener(
          "keydown",
          handleInteraction
        );

        document.removeEventListener(
          "visibilitychange",
          handleVisibility
        );

        window.removeEventListener(
          "pagehide",
          sendBeacon
        );

        sendBeacon();
      };
    },
    [
      slug,
    ]
  );

  return null;
}

/* =========================================================
   PRIVATE OWNER VISIT INSPECTOR
========================================================= */

type VisitRow = {
  id:
    string;

  visitor_id:
    string;

  session_id:
    string;

  source:
    "OWNER"
    | "OUTREACH"
    | "DIRECT";

  is_owner:
    boolean;

  is_engaged:
    boolean;

  first_seen_at:
    string;

  last_seen_at:
    string;

  engaged_at:
    string
    | null;

  duration_seconds:
    number;

  max_scroll_percent:
    number;

  interaction_count:
    number;

  country_code:
    string
    | null;

  country_region:
    string
    | null;

  city:
    string
    | null;

  timezone:
    string
    | null;

  device_type:
    string
    | null;

  browser_name:
    string
    | null;

  os_name:
    string
    | null;
};

type VisitResponse = {
  ok?:
    boolean;

  summary?: {
    legacyViewCount?:
      number;

    externalSessions?:
      number;

    externalVisitors?:
      number;

    ownerSessions?:
      number;

    outreachSessions?:
      number;

    engagedExternalSessions?:
      number;

    lastViewedAt?:
      string
      | null;
  };

  visits?:
    VisitRow[];
};

function formatVisitDate(
  value:
    string
) {
  try {
    return new Intl.DateTimeFormat(
      "de-DE",
      {
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
  } catch {
    return value;
  }
}

function visitLocation(
  visit:
    VisitRow
) {
  return [
    visit.city,
    visit.country_region,
    visit.country_code,
  ]
    .filter(
      Boolean
    )
    .join(
      ", "
    ) ||
    "Standort unbekannt";
}

function visitLabel(
  visit:
    VisitRow
) {
  if (
    visit.is_owner
  ) {
    return "Du · Eigenaufruf";
  }

  if (
    visit.source ===
      "OUTREACH" &&
    visit.is_engaged
  ) {
    return "Wahrscheinlich Kunde";
  }

  if (
    visit.source ===
      "OUTREACH"
  ) {
    return "Outreach-Link";
  }

  if (
    visit.is_engaged
  ) {
    return "Externer Besucher";
  }

  return "Direkter Aufruf";
}

export function PreviewVisitInspector({
  slug,
}: {
  slug:
    string;
}) {
  const [
    allowed,
    setAllowed,
  ] =
    useState<
      boolean
      | null
    >(
      null
    );

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    summary,
    setSummary,
  ] =
    useState<
      VisitResponse["summary"]
    >(
      undefined
    );

  const [
    visits,
    setVisits,
  ] =
    useState<
      VisitRow[]
    >(
      []
    );

  const loadVisits =
    useCallback(
      async (
        refresh =
          false
      ) => {
        if (
          refresh
        ) {
          setRefreshing(
            true
          );
        } else {
          setLoading(
            true
          );
        }

        try {
          const response =
            await fetch(
              `/api/concept/${encodeURIComponent(
                slug
              )}/visits`,
              {
                cache:
                  "no-store",
              }
            );

          if (
            response.status ===
              401 ||
            response.status ===
              403
          ) {
            setAllowed(
              false
            );

            return;
          }

          if (
            !response.ok
          ) {
            return;
          }

          const result =
            (await response.json()) as
              VisitResponse;

          if (
            !result.ok
          ) {
            return;
          }

          setAllowed(
            true
          );

          setSummary(
            result.summary
          );

          setVisits(
            result.visits ??
              []
          );
        } catch {
          // Owner inspector is optional.
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        slug,
      ]
    );

  useEffect(
    () => {
      void loadVisits();
    },
    [
      loadVisits,
    ]
  );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      function handleKeyDown(
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
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      open,
    ]
  );

  if (
    loading ||
    allowed !==
      true
  ) {
    return null;
  }

  const modal =
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
            className="fixed inset-0 z-[10000] flex items-end justify-center overflow-y-auto bg-black/50 p-0 backdrop-blur-[4px] sm:items-center sm:p-6"
          >
            <div
              role="dialog"
              aria-modal="true"
              className="relative w-full max-h-[calc(100dvh-24px)] overflow-y-auto rounded-t-[26px] border border-neutral-200 bg-white text-neutral-950 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:max-w-[760px] sm:rounded-[26px]"
            >
              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                aria-label="Besuche schließen"
                className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
              >
                <X className="size-4" />
              </button>

              <div className="border-b border-neutral-100 px-5 pb-5 pt-6 pr-16 sm:px-7 sm:pb-6 sm:pt-7">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-neutral-500" />

                  <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-neutral-400">
                    Nur für dich sichtbar
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      Vorschau-Besuche
                    </h2>

                    <p className="mt-2 max-w-[590px] text-sm leading-6 text-neutral-600">
                      Eigenaufrufe werden erkannt, solange du im selben Browser
                      in Leadbase eingeloggt bist. Ein externer Aufruf über den
                      Mail-Link ist deshalb deutlich von deinen eigenen Tests getrennt.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      refreshing
                    }
                    onClick={() =>
                      void loadVisits(
                        true
                      )
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-semibold transition-colors hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`size-3.5 ${
                        refreshing
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    Aktualisieren
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-neutral-100 p-4 sm:grid-cols-4 sm:p-5">
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">
                    Externe Besucher
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {summary
                      ?.externalVisitors ??
                      0}
                  </p>
                </div>

                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">
                    Outreach-Aufrufe
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {summary
                      ?.outreachSessions ??
                      0}
                  </p>
                </div>

                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">
                    Engagiert
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {summary
                      ?.engagedExternalSessions ??
                      0}
                  </p>
                </div>

                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">
                    Deine Aufrufe
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {summary
                      ?.ownerSessions ??
                      0}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {visits.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-neutral-200 px-5 py-10 text-center">
                    <Eye className="mx-auto size-5 text-neutral-300" />

                    <p className="mt-2 text-sm font-medium">
                      Noch keine neuen detaillierten Besuche
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      Das Tracking beginnt ab diesem Deploy. Alte Aufrufe können
                      nicht rückwirkend zugeordnet werden.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visits.map(
                      (
                        visit
                      ) => (
                        <div
                          key={
                            visit.id
                          }
                          className="rounded-xl border border-neutral-200 p-3.5 sm:p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                    visit.is_owner
                                      ? "bg-blue-50 text-blue-700"
                                      : visit.source ===
                                            "OUTREACH" &&
                                          visit.is_engaged
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-neutral-100 text-neutral-700"
                                  }`}
                                >
                                  {visitLabel(
                                    visit
                                  )}
                                </span>

                                {visit.source ===
                                "OUTREACH" &&
                                !visit.is_owner ? (
                                  <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">
                                    Aus Outreach-Mail
                                  </span>
                                ) : null}
                              </div>

                              <p className="mt-2 text-xs text-neutral-500">
                                {formatVisitDate(
                                  visit.first_seen_at
                                )}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-medium text-neutral-800">
                                {visit.device_type ??
                                  "Unbekannt"}
                              </p>

                              <p className="mt-0.5 text-[10px] text-neutral-400">
                                {visit.browser_name ??
                                  "Browser unbekannt"}{" "}
                                ·{" "}
                                {visit.os_name ??
                                  "OS unbekannt"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-neutral-600 sm:grid-cols-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <MapPin className="size-3.5 shrink-0 text-neutral-400" />

                              <span className="truncate">
                                {visitLocation(
                                  visit
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Clock3 className="size-3.5 shrink-0 text-neutral-400" />

                              <span>
                                {visit.duration_seconds}s sichtbar
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <MousePointer2 className="size-3.5 shrink-0 text-neutral-400" />

                              <span>
                                {visit.max_scroll_percent}% Scroll ·{" "}
                                {visit.interaction_count} Aktionen
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-100 bg-neutral-50 px-5 py-3.5 text-[10px] leading-5 text-neutral-500 sm:px-7">
                „Wahrscheinlich Kunde“ bedeutet: nicht dein eingeloggter
                Leadbase-Browser + Link aus deiner Outreach-Mail + echte
                Browser-Interaktion. Eine Person kann den Link trotzdem
                weiterleiten, deshalb ist eine mathematische 100%-Identität
                ohne Login nicht möglich.
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

          void loadVisits(
            true
          );
        }}
        className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 min-[520px]:inline-flex sm:h-11 sm:px-4 sm:text-xs"
        title="Nur für dich: Vorschau-Besuche ansehen"
      >
        <Eye className="size-3.5" />

        Besuche{" "}
        {summary
          ?.externalVisitors ??
          0}
      </button>

      {
        modal
      }
    </>
  );
}

/* =========================================================
   DESIGN FRAME
========================================================= */

export function CustomerDesignFrame({
  html,
  title,
}: CustomerDesignFrameProps) {
  const iframeRef =
    useRef<HTMLIFrameElement | null>(
      null
    );

  const cleanupRef =
    useRef<
      (() => void)
      | null
    >(
      null
    );

  const [
    frameHeight,
    setFrameHeight,
  ] =
    useState(
      900
    );

  const preparedHtml =
    useMemo(
      () =>
        preparePreviewHtml(
          html
        ),
      [
        html,
      ]
    );

  /* =======================================================
     CLEANUP
  ======================================================= */

  const clearObservers =
    useCallback(
      () => {
        cleanupRef.current?.();

        cleanupRef.current =
          null;
      },
      []
    );

  /* =======================================================
     MEASURE
  ======================================================= */

  const measure =
    useCallback(
      () => {
        const iframe =
          iframeRef.current;

        if (
          !iframe
        ) {
          return;
        }

        try {
          const document =
            iframe.contentDocument;

          if (
            !document
          ) {
            return;
          }

          const root =
            document.documentElement;

          const body =
            document.body;

          const nextHeight =
            Math.max(
              root?.scrollHeight ??
                0,

              root?.offsetHeight ??
                0,

              body?.scrollHeight ??
                0,

              body?.offsetHeight ??
                0,

              500
            );

          setFrameHeight(
            (
              current
            ) =>
              Math.abs(
                current -
                  nextHeight
              ) >
              2
                ? nextHeight
                : current
          );
        } catch (
          error
        ) {
          console.warn(
            "Could not measure customer design preview:",
            error
          );
        }
      },
      []
    );

  /* =======================================================
     IFRAME LOAD
  ======================================================= */

  const handleLoad =
    useCallback(
      () => {
        clearObservers();

        const iframe =
          iframeRef.current;

        if (
          !iframe
        ) {
          return;
        }

        try {
          const document =
            iframe.contentDocument;

          if (
            !document
          ) {
            return;
          }

          const root =
            document.documentElement;

          const body =
            document.body;

          measure();

          const images =
            Array.from(
              document.images
            );

          const imageHandler =
            () => {
              window.requestAnimationFrame(
                measure
              );
            };

          for (
            const image of
              images
          ) {
            if (
              image.complete
            ) {
              continue;
            }

            image.addEventListener(
              "load",
              imageHandler
            );

            image.addEventListener(
              "error",
              imageHandler
            );
          }

          const observer =
            new ResizeObserver(
              () => {
                window.requestAnimationFrame(
                  measure
                );
              }
            );

          if (
            root
          ) {
            observer.observe(
              root
            );
          }

          if (
            body
          ) {
            observer.observe(
              body
            );
          }

          void document.fonts
            ?.ready
            ?.then(
              () => {
                window.requestAnimationFrame(
                  measure
                );
              }
            )
            .catch(
              () => {
                // Non-fatal.
              }
            );

          const delayedMeasures =
            [
              100,
              300,
              800,
              1500,
            ].map(
              (
                delay
              ) =>
                window.setTimeout(
                  measure,
                  delay
                )
            );

          cleanupRef.current =
            () => {
              observer.disconnect();

              for (
                const image of
                  images
              ) {
                image.removeEventListener(
                  "load",
                  imageHandler
                );

                image.removeEventListener(
                  "error",
                  imageHandler
                );
              }

              for (
                const timeout of
                  delayedMeasures
              ) {
                window.clearTimeout(
                  timeout
                );
              }
            };
        } catch (
          error
        ) {
          console.warn(
            "Could not prepare customer design preview:",
            error
          );
        }
      },
      [
        clearObservers,
        measure,
      ]
    );

  /* =======================================================
     WINDOW RESIZE
  ======================================================= */

  useEffect(
    () => {
      function handleResize() {
        window.requestAnimationFrame(
          measure
        );
      }

      window.addEventListener(
        "resize",
        handleResize
      );

      return () => {
        window.removeEventListener(
          "resize",
          handleResize
        );

        clearObservers();
      };
    },
    [
      clearObservers,
      measure,
    ]
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <iframe
      ref={
        iframeRef
      }
      title={
        title
      }
      srcDoc={
        preparedHtml
      }
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      loading="eager"
      onLoad={
        handleLoad
      }
      className="block w-full border-0 bg-white"
      style={{
        height:
          `${frameHeight}px`,

        minHeight:
          "calc(100dvh - 64px)",
      }}
    />
  );
}