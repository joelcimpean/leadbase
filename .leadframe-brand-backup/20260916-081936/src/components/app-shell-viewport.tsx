"use client"

import type { ReactNode } from "react"
import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

/**
 * Keeps the visual Leadbase shell inside the real browser viewport even when
 * the high-resolution shell scale from phase 10M2 uses CSS `zoom`.
 *
 * Width is intentionally untouched: phase 10M2 fixed the right-side gap by
 * letting the shell consume the full available width. We only compensate the
 * height when the rendered box is visually taller than its layout box.
 */
function AppShellViewport({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0

    const fit = () => {
      const element = ref.current

      if (!element) return

      // Measure from the un-compensated viewport height on every pass so the
      // calculation remains correct after crossing a high-res media query.
      element.style.height = "100dvh"

      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const node = ref.current

        if (!node) return

        const layoutHeight = node.offsetHeight
        const visualHeight = node.getBoundingClientRect().height

        if (layoutHeight <= 0 || visualHeight <= 0) return

        const effectiveScale = visualHeight / layoutHeight

        if (effectiveScale > 1.001) {
          node.style.height = `calc(100dvh / ${effectiveScale})`
        } else {
          node.style.height = "100dvh"
        }
      })
    }

    fit()
    const timers = [60, 250, 800].map((delay) => window.setTimeout(fit, delay))

    window.addEventListener("resize", fit)
    window.visualViewport?.addEventListener("resize", fit)

    return () => {
      cancelAnimationFrame(frame)
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener("resize", fit)
      window.visualViewport?.removeEventListener("resize", fit)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "h-dvh w-full overflow-hidden bg-[var(--lb-canvas)] p-0 md:p-3.5",
        className
      )}
    >
      {children}
    </div>
  )
}

export { AppShellViewport }
