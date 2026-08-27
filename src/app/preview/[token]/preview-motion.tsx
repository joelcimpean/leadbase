"use client";

import {
  type RefObject,
  useEffect,
} from "react";

type PreviewMotionConfig = {
  reveal:
    | "fade"
    | "slide"
    | "stagger"
    | "soft-scale"
    | "clip";

  scroll?:
    | "none"
    | "image-parallax"
    | "section-drift";
};

type PreviewMotionProps = {
  rootRef:
    RefObject<HTMLDivElement | null>;

  motion:
    PreviewMotionConfig;
};

export function PreviewMotion({
  rootRef,
  motion,
}: PreviewMotionProps) {
  useEffect(
    () => {
      let cancelled =
        false;

      let cleanup =
        () => {};

      async function setupMotion() {
        if (
          window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches
        ) {
          return;
        }

        const [
          gsapModule,
          scrollTriggerModule,
        ] =
          await Promise.all([
            import(
              "gsap"
            ),

            import(
              "gsap/ScrollTrigger"
            ),
          ]);

        if (
          cancelled
        ) {
          return;
        }

        const root =
          rootRef.current;

        if (
          !root
        ) {
          return;
        }

        const gsap =
          gsapModule.gsap;

        const ScrollTrigger =
          scrollTriggerModule.ScrollTrigger;

        gsap.registerPlugin(
          ScrollTrigger
        );

        const context =
          gsap.context(
            () => {
              /* ===========================================
                 HERO
              =========================================== */

              const hero =
                root.querySelector(
                  "[data-gsap-hero]"
                );

              if (
                hero
              ) {
                const heroCopy =
                  hero.querySelectorAll(
                    "[data-gsap-hero-copy]"
                  );

                if (
                  heroCopy.length >
                    0
                ) {
                  gsap.fromTo(
                    heroCopy,
                    {
                      opacity:
                        0,

                      y:
                        22,
                    },
                    {
                      opacity:
                        1,

                      y:
                        0,

                      duration:
                        1.15,

                      stagger:
                        0.11,

                      ease:
                        "power2.out",

                      delay:
                        0.1,

                      clearProps:
                        "transform",
                    }
                  );
                }

                const heroMedia =
                  hero.querySelector(
                    "[data-gsap-hero-media]"
                  );

                if (
                  heroMedia
                ) {
                  gsap.fromTo(
                    heroMedia,
                    {
                      opacity:
                        0,

                      scale:
                        1.025,
                    },
                    {
                      opacity:
                        1,

                      scale:
                        1,

                      duration:
                        1.45,

                      ease:
                        "power2.out",

                      delay:
                        0.12,
                    }
                  );
                }
              }

              /* ===========================================
                 SECTIONS
              =========================================== */

              const sections =
                root.querySelectorAll<HTMLElement>(
                  "[data-gsap-section]"
                );

              sections.forEach(
                (
                  section
                ) => {
                  const headings =
                    section.querySelectorAll(
                      "[data-gsap-heading]"
                    );

                  const items =
                    section.querySelectorAll(
                      "[data-gsap-item]"
                    );

                  const media =
                    section.querySelectorAll(
                      "[data-gsap-media]"
                    );

                  /* ---------------------------------------
                     HEADINGS
                  --------------------------------------- */

                  if (
                    headings.length >
                    0
                  ) {
                    const from:
                      Record<
                        string,
                        number
                      > = {
                      opacity:
                        0,
                    };

                    if (
                      motion.reveal ===
                      "soft-scale"
                    ) {
                      from.scale =
                        0.985;
                    } else if (
                      motion.reveal !==
                      "fade"
                    ) {
                      from.y =
                        18;
                    }

                    gsap.fromTo(
                      headings,
                      from,
                      {
                        opacity:
                          1,

                        y:
                          0,

                        scale:
                          1,

                        duration:
                          1.05,

                        stagger:
                          0.075,

                        ease:
                          "power2.out",

                        clearProps:
                          "transform",

                        scrollTrigger: {
                          trigger:
                            section,

                          start:
                            "top 84%",

                          once:
                            true,
                        },
                      }
                    );
                  }

                  /* ---------------------------------------
                     ITEMS
                  --------------------------------------- */

                  if (
                    items.length >
                    0
                  ) {
                    gsap.fromTo(
                      items,
                      {
                        opacity:
                          0,

                        y:
                          motion.reveal ===
                          "fade"
                            ? 0
                            : 16,

                        scale:
                          motion.reveal ===
                          "soft-scale"
                            ? 0.988
                            : 1,
                      },
                      {
                        opacity:
                          1,

                        y:
                          0,

                        scale:
                          1,

                        duration:
                          1,

                        stagger:
                          motion.reveal ===
                          "stagger"
                            ? 0.12
                            : 0.065,

                        ease:
                          "power2.out",

                        clearProps:
                          "transform",

                        scrollTrigger: {
                          trigger:
                            section,

                          start:
                            "top 80%",

                          once:
                            true,
                        },
                      }
                    );
                  }

                  /* ---------------------------------------
                     MEDIA
                  --------------------------------------- */

                  if (
                    media.length >
                    0
                  ) {
                    media.forEach(
                      (
                        image
                      ) => {
                        gsap.fromTo(
                          image,
                          {
                            clipPath:
                              motion.reveal ===
                              "clip"
                                ? "inset(5% 0% 5% 0%)"
                                : "inset(2% 0% 2% 0%)",

                            scale:
                              1.022,

                            opacity:
                              0.92,
                          },
                          {
                            clipPath:
                              "inset(0% 0% 0% 0%)",

                            scale:
                              1,

                            opacity:
                              1,

                            duration:
                              1.35,

                            ease:
                              "power2.out",

                            scrollTrigger: {
                              trigger:
                                image,

                              start:
                                "top 90%",

                              once:
                                true,
                            },
                          }
                        );
                      }
                    );
                  }
                }
              );

              /* ===========================================
                 IMAGE PARALLAX

                 Much subtler than before.
              =========================================== */

              if (
                motion.scroll ===
                "image-parallax"
              ) {
                const images =
                  root.querySelectorAll<HTMLElement>(
                    "[data-gsap-parallax]"
                  );

                images.forEach(
                  (
                    image
                  ) => {
                    gsap.fromTo(
                      image,
                      {
                        yPercent:
                          -2.25,
                      },
                      {
                        yPercent:
                          3.25,

                        ease:
                          "none",

                        scrollTrigger: {
                          trigger:
                            image,

                          start:
                            "top bottom",

                          end:
                            "bottom top",

                          scrub:
                            1.8,
                        },
                      }
                    );
                  }
                );
              }

              /* ===========================================
                 SECTION DRIFT

                 Previously ±18px.
                 Now intentionally restrained.
              =========================================== */

              if (
                motion.scroll ===
                "section-drift"
              ) {
                const driftElements =
                  root.querySelectorAll<HTMLElement>(
                    "[data-gsap-drift]"
                  );

                driftElements.forEach(
                  (
                    element,
                    index
                  ) => {
                    gsap.fromTo(
                      element,
                      {
                        x:
                          index %
                            2 ===
                          0
                            ? -7
                            : 7,
                      },
                      {
                        x:
                          index %
                            2 ===
                          0
                            ? 7
                            : -7,

                        ease:
                          "none",

                        scrollTrigger: {
                          trigger:
                            element,

                          start:
                            "top bottom",

                          end:
                            "bottom top",

                          scrub:
                            2,
                        },
                      }
                    );
                  }
                );
              }
            },
            root
          );

        const refresh =
          () => {
            ScrollTrigger.refresh();
          };

        window.addEventListener(
          "load",
          refresh,
          {
            once:
              true,
          }
        );

        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              refresh
            );
          }
        );

        cleanup =
          () => {
            window.removeEventListener(
              "load",
              refresh
            );

            context.revert();
          };
      }

      void setupMotion();

      return () => {
        cancelled =
          true;

        cleanup();
      };
    },
    [
      motion,
      rootRef,
    ]
  );

  return null;
}