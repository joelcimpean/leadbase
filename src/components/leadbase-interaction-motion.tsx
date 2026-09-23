"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { animate as motionAnimate, hover, press } from "motion";
import { animate as animeAnimate, stagger } from "animejs";

/* =========================================================
   HELPERS
========================================================= */

function parseAnimatedNumber(text: string) {
  const match = text.match(/-?[0-9][0-9.,]*/);

  if (!match || match.index === undefined) {
    return null;
  }

  const token = match[0];
  const prefix = text.slice(0, match.index);
  const suffix = text.slice(match.index + token.length);

  const normalized = token
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    return null;
  }

  const decimals = normalized.includes(".")
    ? Math.min(2, normalized.split(".")[1]?.length ?? 0)
    : 0;

  return {
    value,
    prefix,
    suffix,
    decimals,
    finalText: text,
  };
}

function animateDialog(element: HTMLElement) {
  motionAnimate(
    element,
    {
      opacity: [0.84, 1],
      y: [14, 0],
      scale: [0.972, 1],
      filter: ["blur(2px)", "blur(0px)"],
    },
    {
      duration: 0.34,
      ease: [0.22, 1, 0.36, 1],
    }
  );
}

function animateToast(element: HTMLElement) {
  motionAnimate(
    element,
    {
      opacity: [0.86, 1],
      x: [18, 0],
      scale: [0.985, 1],
    },
    {
      type: "spring",
      stiffness: 420,
      damping: 34,
      mass: 0.6,
    }
  );
}

/* =========================================================
   GLOBAL MOTION LAYER
========================================================= */

export function LeadbaseInteractionMotion() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeDialog = searchParams.get("dialog");

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      return;
    }

    /* -----------------------------------------------------
       PAGE TRANSITION
    ----------------------------------------------------- */

    const page = document.querySelector<HTMLElement>(
      "main > :first-child"
    );

    if (page) {
      // A transformed ancestor changes the containing block of position:fixed
      // dialogs. Deep-linked dialogs such as /profile?dialog=plan would
      // therefore dim only the main content for the first transition frame
      // before snapping to the full viewport. Keep route motion opacity-only
      // whenever a dialog is already open from the URL.
      motionAnimate(
        page,
        routeDialog
          ? { opacity: [0.96, 1] }
          : {
              opacity: [0.93, 1],
              y: [6, 0],
              scale: [0.998, 1],
            },
        {
          duration: routeDialog ? 0.18 : 0.28,
          ease: [0.22, 1, 0.36, 1],
        }
      );
    }

    /* -----------------------------------------------------
       SPRING HOVER / PRESS
    ----------------------------------------------------- */

    const cancelHover = hover(
      '[data-motion-lift="true"]',
      (element) => {
        motionAnimate(
          element,
          {
            y: -5,
            scale: 1.012,
          },
          {
            type: "spring",
            stiffness: 430,
            damping: 31,
            mass: 0.58,
          }
        );

        return () => {
          motionAnimate(
            element,
            {
              y: 0,
              scale: 1,
            },
            {
              type: "spring",
              stiffness: 470,
              damping: 34,
              mass: 0.58,
            }
          );
        };
      }
    );

    const cancelPress = press(
      '[data-motion-press="true"]',
      (element) => {
        motionAnimate(
          element,
          {
            scale: 0.972,
          },
          {
            duration: 0.09,
          }
        );

        return () => {
          motionAnimate(
            element,
            {
              scale: 1,
            },
            {
              type: "spring",
              stiffness: 680,
              damping: 34,
              mass: 0.42,
            }
          );
        };
      }
    );

    /* -----------------------------------------------------
       STAGGERED GRIDS / LISTS
    ----------------------------------------------------- */

    const staggerGroups = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-anime-stagger], [data-motion-list-stagger]"
      )
    );

    const staggerAnimations = staggerGroups
      .map((group) => {
        const children = Array.from(group.children) as HTMLElement[];

        if (children.length === 0) {
          return null;
        }

        return animeAnimate(children, {
          opacity: [0.74, 1],
          translateY: [13, 0],
          scale: [0.988, 1],
          duration: 650,
          delay: stagger(48),
          ease: "outExpo",
        });
      })
      .filter(Boolean);

    /* -----------------------------------------------------
       KPI COUNT-UP
    ----------------------------------------------------- */

    const countAnimations = Array.from(
      document.querySelectorAll<HTMLElement>("[data-motion-count]")
    )
      .map((element, index) => {
        const parsed = parseAnimatedNumber(element.textContent?.trim() ?? "");

        if (!parsed || parsed.value === 0) {
          return null;
        }

        const animation = motionAnimate(
          0,
          parsed.value,
          {
            duration: 0.72 + Math.min(index, 5) * 0.035,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (latest) => {
              const rendered = parsed.decimals > 0
                ? latest.toFixed(parsed.decimals)
                : String(Math.round(latest));

              element.textContent = `${parsed.prefix}${rendered}${parsed.suffix}`;
            },
          }
        );

        animation.then(() => {
          element.textContent = parsed.finalText;
        });

        return animation;
      })
      .filter(Boolean);

    /* -----------------------------------------------------
       ANALYTICS PROGRESS BARS
    ----------------------------------------------------- */

    const progressAnimations = Array.from(
      document.querySelectorAll<HTMLElement>("[data-motion-progress]")
    )
      .map((element, index) => {
        const targetWidth = element.style.width;

        if (!targetWidth || targetWidth === "0%") {
          return null;
        }

        return motionAnimate(
          element,
          {
            width: ["0%", targetWidth],
          },
          {
            duration: 0.7,
            delay: 0.08 + index * 0.055,
            ease: [0.22, 1, 0.36, 1],
          }
        );
      })
      .filter(Boolean);

    /* -----------------------------------------------------
       ACTIVE SEGMENT / TAB
    ----------------------------------------------------- */

    const activeSegments = Array.from(
      document.querySelectorAll<HTMLElement>("[data-motion-segment-active]")
    );

    for (const segment of activeSegments) {
      motionAnimate(
        segment,
        {
          opacity: [0.78, 1],
          scale: [0.92, 1],
          y: [2, 0],
        },
        {
          type: "spring",
          stiffness: 520,
          damping: 34,
          mass: 0.48,
        }
      );
    }

    /* -----------------------------------------------------
       DIALOGS / TOASTS ADDED AFTER PAGE LOAD
    ----------------------------------------------------- */

    const animatedDialogs = new WeakSet<HTMLElement>();
    const animatedToasts = new WeakSet<HTMLElement>();

    const scanNode = (node: Node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }

      const dialogs = [
        ...(node.matches('[role="dialog"]') ? [node] : []),
        ...Array.from(node.querySelectorAll<HTMLElement>('[role="dialog"]')),
      ];

      for (const dialog of dialogs) {
        if (!animatedDialogs.has(dialog)) {
          animatedDialogs.add(dialog);
          animateDialog(dialog);
        }
      }

      const toasts = [
        ...(node.matches("[data-sonner-toast]") ? [node] : []),
        ...Array.from(node.querySelectorAll<HTMLElement>("[data-sonner-toast]")),
      ];

      for (const toast of toasts) {
        if (!animatedToasts.has(toast)) {
          animatedToasts.add(toast);
          animateToast(toast);
        }
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          scanNode(node);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cancelHover();
      cancelPress();

      for (const animation of staggerAnimations) {
        animation?.pause();
      }

      for (const animation of countAnimations) {
        animation?.stop();
      }

      for (const animation of progressAnimations) {
        animation?.stop();
      }
    };
  }, [pathname, routeDialog]);

  return null;
}
