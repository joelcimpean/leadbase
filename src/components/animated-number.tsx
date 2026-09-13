"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function AnimatedNumber({
  value,
  locale = "en-US",
  duration = 340,
  minimumFractionDigits = 0,
  maximumFractionDigits = 0,
}: {
  value: number;
  locale?: string;
  duration?: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}) {
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;

    if (from === value) {
      setDisplay(value);
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const safeDuration = Math.max(120, duration);

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / safeDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else setDisplay(value);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, value]);

  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits, maximumFractionDigits }),
    [locale, maximumFractionDigits, minimumFractionDigits],
  );

  return <>{formatter.format(display)}</>;
}
