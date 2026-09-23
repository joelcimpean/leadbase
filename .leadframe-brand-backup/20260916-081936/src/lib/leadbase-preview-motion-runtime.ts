type PreviewMotionRuntimeOptions = {
  iframe: HTMLIFrameElement;
  document: Document;
  smoothWheel?: boolean;
};

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

export function initializeLeadbasePreviewMotionRuntime({
  iframe,
  document,
  smoothWheel = true,
}: PreviewMotionRuntimeOptions) {
  const root =
    document.documentElement;

  const body =
    document.body;

  const frameWindow =
    iframe.contentWindow;

  const revealElements =
    Array.from(
      document.querySelectorAll<HTMLElement>(
        ".leadbase-motion-reveal"
      )
    );

  if (
    !root ||
    !body ||
    !frameWindow ||
    revealElements.length === 0
  ) {
    return () => {};
  }

  /*
   * Keep one explicitly non-null iframe Window reference.
   * TypeScript does not preserve the contentWindow narrowing
   * inside all nested callbacks.
   */
  const frame =
    frameWindow as Window &
      typeof globalThis;

  const prefersReducedMotion =
    frame.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  /*
   * Motion previews use the iframe itself as the scrolling
   * viewport. This is deliberate:
   *
   * - IntersectionObserver now sees the real visible area.
   * - reveal animations trigger reliably.
   * - wheel smoothing is isolated to the concept.
   * - the outer Leadbase page no longer has to infer positions
   *   of elements in a full-height iframe.
   */
  root.style.setProperty(
    "height",
    "100%",
    "important"
  );

  root.style.setProperty(
    "max-height",
    "100%",
    "important"
  );

  root.style.setProperty(
    "overflow-y",
    "auto",
    "important"
  );

  root.style.setProperty(
    "overflow-x",
    "hidden",
    "important"
  );

  root.style.setProperty(
    "scroll-behavior",
    "smooth",
    "important"
  );

  body.style.setProperty(
    "min-height",
    "100%",
    "important"
  );

  body.style.setProperty(
    "height",
    "auto",
    "important"
  );

  body.style.setProperty(
    "overflow-y",
    "visible",
    "important"
  );

  body.style.setProperty(
    "overflow-x",
    "hidden",
    "important"
  );

  root.classList.add(
    "leadbase-motion-runtime"
  );

  if (
    prefersReducedMotion
  ) {
    for (
      const element of
        revealElements
    ) {
      element.classList.add(
        "leadbase-motion-visible"
      );
    }

    return () => {
      root.classList.remove(
        "leadbase-motion-runtime"
      );
    };
  }

  const Observer =
    frame.IntersectionObserver;

  const observer =
    new Observer(
      (
        entries:
          IntersectionObserverEntry[]
      ) => {
        for (
          const entry of
            entries
        ) {
          if (
            !entry.isIntersecting
          ) {
            continue;
          }

          const element =
            entry.target as
              HTMLElement;

          element.classList.add(
            "leadbase-motion-visible"
          );

          observer.unobserve(
            element
          );
        }
      },
      {
        root:
          null,

        rootMargin:
          "0px 0px -12% 0px",

        threshold:
          0.04,
      }
    );

  for (
    const element of
      revealElements
  ) {
    observer.observe(
      element
    );
  }

  let smoothFrame:
    number | null =
      null;

  let targetScroll =
    frame.scrollY;

  let smoothing =
    false;

  function stopSmoothFrame() {
    if (
      smoothFrame !==
      null
    ) {
      frame.cancelAnimationFrame(
        smoothFrame
      );

      smoothFrame =
        null;
    }
  }

  function animateSmoothScroll() {
    const current =
      frame.scrollY;

    const distance =
      targetScroll -
      current;

    if (
      Math.abs(
        distance
      ) <
      0.45
    ) {
      frame.scrollTo(
        0,
        targetScroll
      );

      smoothFrame =
        null;

      smoothing =
        false;

      return;
    }

    frame.scrollTo(
      0,
      current +
        distance *
          0.11
    );

    smoothFrame =
      frame.requestAnimationFrame(
        animateSmoothScroll
      );
  }

  function handleWheel(
    event: WheelEvent
  ) {
    if (
      !smoothWheel ||
      event.ctrlKey ||
      Math.abs(
        event.deltaY
      ) <
        0.4
    ) {
      return;
    }

    event.preventDefault();

    const documentHeight =
      Math.max(
        root.scrollHeight,
        body.scrollHeight
      );

    const maxScroll =
      Math.max(
        0,
        documentHeight -
          frame.innerHeight
      );

    if (
      !smoothing
    ) {
      targetScroll =
        frame.scrollY;

      smoothing =
        true;
    }

    const modeMultiplier =
      event.deltaMode === 1
        ? 18
        : event.deltaMode === 2
          ? frame.innerHeight
          : 1;

    targetScroll =
      clamp(
        targetScroll +
          event.deltaY *
            modeMultiplier *
            0.82,
        0,
        maxScroll
      );

    if (
      smoothFrame ===
      null
    ) {
      smoothFrame =
        frame.requestAnimationFrame(
          animateSmoothScroll
        );
    }
  }

  frame.addEventListener(
    "wheel",
    handleWheel,
    {
      passive:
        false,
    }
  );

  function syncTarget() {
    if (
      !smoothing
    ) {
      targetScroll =
        frame.scrollY;
    }
  }

  frame.addEventListener(
    "scroll",
    syncTarget,
    {
      passive:
        true,
    }
  );

  return () => {
    observer.disconnect();

    frame.removeEventListener(
      "wheel",
      handleWheel
    );

    frame.removeEventListener(
      "scroll",
      syncTarget
    );

    stopSmoothFrame();

    root.classList.remove(
      "leadbase-motion-runtime"
    );

    for (
      const element of
        revealElements
    ) {
      element.classList.remove(
        "leadbase-motion-visible"
      );
    }
  };
}
