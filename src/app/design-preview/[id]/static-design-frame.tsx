"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_HEIGHT =
  900;

const MIN_HEIGHT =
  600;

const HEIGHT_TOLERANCE =
  3;

/* =========================================================
   TYPES
========================================================= */

type StaticDesignFrameProps = {
  html:
    string;

  title:
    string;
};

/* =========================================================
   DOCUMENT HEIGHT
========================================================= */

function getDocumentHeight(
  document:
    Document
) {
  const html =
    document.documentElement;

  const body =
    document.body;

  return Math.max(
    html?.scrollHeight ??
      0,

    html?.offsetHeight ??
      0,

    html?.clientHeight ??
      0,

    body?.scrollHeight ??
      0,

    body?.offsetHeight ??
      0,

    body?.clientHeight ??
      0,

    MIN_HEIGHT
  );
}

/* =========================================================
   FORCE SCROLLABLE DOCUMENT

   This only fixes root-level scroll locking.

   It does NOT redesign the generated website.
========================================================= */

function unlockDocumentScroll(
  document:
    Document
) {
  const html =
    document.documentElement;

  const body =
    document.body;

  const applyRootStyles = (
    element:
      HTMLElement | null
  ) => {
    if (
      !element
    ) {
      return;
    }

    element.style.setProperty(
      "height",
      "auto",
      "important"
    );

    element.style.setProperty(
      "max-height",
      "none",
      "important"
    );

    element.style.setProperty(
      "overflow-x",
      "hidden",
      "important"
    );

    element.style.setProperty(
      "overflow-y",
      "visible",
      "important"
    );
  };

  applyRootStyles(
    html
  );

  applyRootStyles(
    body
  );

  if (
    body
  ) {
    body.style.setProperty(
      "min-height",
      "100vh",
      "important"
    );

    body.style.setProperty(
      "position",
      "relative",
      "important"
    );

    const firstElement =
      body.firstElementChild;

    if (
      firstElement instanceof
      HTMLElement
    ) {
      firstElement.style.setProperty(
        "height",
        "auto",
        "important"
      );

      firstElement.style.setProperty(
        "min-height",
        "0",
        "important"
      );

      firstElement.style.setProperty(
        "max-height",
        "none",
        "important"
      );

      firstElement.style.setProperty(
        "overflow",
        "visible",
        "important"
      );

      if (
        window.getComputedStyle(
          firstElement
        ).position ===
        "fixed"
      ) {
        firstElement.style.setProperty(
          "position",
          "relative",
          "important"
        );
      }
    }
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export function StaticDesignFrame({
  html,
  title,
}: StaticDesignFrameProps) {
  const iframeRef =
    useRef<HTMLIFrameElement | null>(
      null
    );

  const resizeObserverRef =
    useRef<ResizeObserver | null>(
      null
    );

  const mutationObserverRef =
    useRef<MutationObserver | null>(
      null
    );

  const animationFrameRef =
    useRef<number | null>(
      null
    );

  const timeoutsRef =
    useRef<number[]>(
      []
    );

  const [
    frameHeight,
    setFrameHeight,
  ] =
    useState(
      DEFAULT_HEIGHT
    );

  /* =======================================================
     CLEANUP
  ======================================================= */

  const cleanup =
    useCallback(
      () => {
        resizeObserverRef
          .current
          ?.disconnect();

        resizeObserverRef.current =
          null;

        mutationObserverRef
          .current
          ?.disconnect();

        mutationObserverRef.current =
          null;

        if (
          animationFrameRef.current !==
          null
        ) {
          window.cancelAnimationFrame(
            animationFrameRef.current
          );

          animationFrameRef.current =
            null;
        }

        for (
          const timeout of
            timeoutsRef.current
        ) {
          window.clearTimeout(
            timeout
          );
        }

        timeoutsRef.current =
          [];
      },
      []
    );

  /* =======================================================
     UPDATE HEIGHT
  ======================================================= */

  const updateHeight =
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

          const nextHeight =
            getDocumentHeight(
              document
            );

          setFrameHeight(
            (
              current
            ) => {
              if (
                Math.abs(
                  current -
                    nextHeight
                ) <=
                HEIGHT_TOLERANCE
              ) {
                return current;
              }

              return nextHeight;
            }
          );
        } catch (
          error
        ) {
          console.warn(
            "Could not measure design preview:",
            error
          );
        }
      },
      []
    );

  /* =======================================================
     SCHEDULE HEIGHT
  ======================================================= */

  const scheduleHeightUpdate =
    useCallback(
      () => {
        if (
          animationFrameRef.current !==
          null
        ) {
          window.cancelAnimationFrame(
            animationFrameRef.current
          );
        }

        animationFrameRef.current =
          window.requestAnimationFrame(
            () => {
              animationFrameRef.current =
                null;

              updateHeight();
            }
          );
      },
      [
        updateHeight,
      ]
    );

  /* =======================================================
     LOAD
  ======================================================= */

  const handleLoad =
    useCallback(
      () => {
        cleanup();

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

          /* ===============================================
             REMOVE ROOT SCROLL LOCK
          =============================================== */

          unlockDocumentScroll(
            document
          );

          /* ===============================================
             INITIAL MEASUREMENT
          =============================================== */

          scheduleHeightUpdate();

          /* ===============================================
             RESIZE OBSERVER
          =============================================== */

          if (
            typeof ResizeObserver !==
            "undefined"
          ) {
            const resizeObserver =
              new ResizeObserver(
                () => {
                  scheduleHeightUpdate();
                }
              );

            resizeObserver.observe(
              document.documentElement
            );

            if (
              document.body
            ) {
              resizeObserver.observe(
                document.body
              );
            }

            resizeObserverRef.current =
              resizeObserver;
          }

          /* ===============================================
             DOM CHANGES
          =============================================== */

          if (
            typeof MutationObserver !==
            "undefined" &&
            document.body
          ) {
            const mutationObserver =
              new MutationObserver(
                () => {
                  scheduleHeightUpdate();
                }
              );

            mutationObserver.observe(
              document.body,
              {
                childList:
                  true,

                subtree:
                  true,

                attributes:
                  true,
              }
            );

            mutationObserverRef.current =
              mutationObserver;
          }

          /* ===============================================
             IMAGES

             Remote images can change the page height after
             the iframe's first load.
          =============================================== */

          const images =
            Array.from(
              document.images
            );

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
              scheduleHeightUpdate,
              {
                once:
                  true,
              }
            );

            image.addEventListener(
              "error",
              scheduleHeightUpdate,
              {
                once:
                  true,
              }
            );
          }

          /* ===============================================
             WEB FONTS
          =============================================== */

          if (
            document.fonts
          ) {
            void document.fonts.ready.then(
              () => {
                scheduleHeightUpdate();
              }
            );
          }

          /* ===============================================
             FALLBACK MEASUREMENTS

             Some external images/fonts finish slightly
             later. These are cheap and local.
          =============================================== */

          for (
            const delay of
              [
                100,
                350,
                800,
                1_500,
                3_000,
              ]
          ) {
            const timeout =
              window.setTimeout(
                () => {
                  unlockDocumentScroll(
                    document
                  );

                  scheduleHeightUpdate();
                },
                delay
              );

            timeoutsRef.current.push(
              timeout
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Could not initialize design preview frame:",
            error
          );
        }
      },
      [
        cleanup,
        scheduleHeightUpdate,
      ]
    );

  /* =======================================================
     CLEANUP ON UNMOUNT
  ======================================================= */

  useEffect(
    () => {
      return () => {
        cleanup();
      };
    },
    [
      cleanup,
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
        html
      }
      sandbox="allow-same-origin allow-forms allow-popups"
      referrerPolicy="no-referrer"
      onLoad={
        handleLoad
      }
      className="block w-full border-0 bg-white"
      style={{
        height:
          `${frameHeight}px`,

        minHeight:
          "100dvh",

        overflow:
          "hidden",
      }}
    />
  );
}