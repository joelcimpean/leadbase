"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type CustomerDesignFrameProps = {
  html:
    string;

  title:
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

     Put it at the END of <head> so it wins over the
     generated design's normal CSS rules.
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
   COMPONENT
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

          /*
           * Initial measure.
           */

          measure();

          /*
           * Images often load after the HTML itself.
           */

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

          /*
           * ResizeObserver catches:
           *
           * - responsive layout changes
           * - remote image dimensions
           * - font loading
           * - mobile wrapping
           */

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

          /*
           * Web fonts can change the page height after the
           * initial render.
           */

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