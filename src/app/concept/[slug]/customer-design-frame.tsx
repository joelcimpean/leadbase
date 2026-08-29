"use client";

import {
  ArrowUpRight,
  CalendarDays,
  Mail,
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