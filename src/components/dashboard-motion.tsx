"use client";

import {
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function DashboardMotion({
  children,
}: {
  children: ReactNode;
}) {
  const rootRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(
        "[data-leadbase-reveal]",
        root
      );

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
         * Never pre-hide dashboard content. The section remains usable and
         * visible even if ScrollTrigger does not run. We only animate when
         * it actually enters the viewport.
         */
        ScrollTrigger.create({
          trigger: item,
          start: "top 92%",
          once: true,
          onEnter: reveal,
        });
      });
    }, root);

    ScrollTrigger.refresh();

    return () => {
      context.revert();
    };
  }, []);

  return (
    <div ref={rootRef}>
      {children}
    </div>
  );
}
