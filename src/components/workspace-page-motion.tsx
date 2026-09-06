"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function WorkspacePageMotion() {
  useLayoutEffect(() => {
    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return;
    }

    const items = gsap.utils.toArray<HTMLElement>(
      "[data-workspace-reveal]"
    );

    if (items.length === 0) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      items.forEach((item, index) => {
        const reveal = () => {
          gsap.fromTo(
            item,
            {
              opacity: 0.68,
              y: 18,
              scale: 0.992,
            },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.64,
              delay: index < 3 ? index * 0.045 : 0,
              ease: "power3.out",
              clearProps: "opacity,transform",
            }
          );
        };

        const rect = item.getBoundingClientRect();
        const alreadyVisible =
          rect.top < window.innerHeight * 0.94 &&
          rect.bottom > 0;

        if (alreadyVisible) {
          reveal();
          return;
        }

        /*
         * Important: elements stay fully visible before the trigger fires.
         * Motion is progressive enhancement only. This prevents invisible
         * sections in full-page screenshots, slow devices, failed JS, or
         * ScrollTrigger edge cases.
         */
        ScrollTrigger.create({
          trigger: item,
          start: "top 92%",
          once: true,
          onEnter: reveal,
        });
      });
    });

    ScrollTrigger.refresh();

    return () => context.revert();
  }, []);

  return null;
}
