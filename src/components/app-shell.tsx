import type { ReactNode } from "react"

import { AppShellViewport } from "@/components/app-shell-viewport"
import { cn } from "@/lib/utils"

function AppShell({
  sidebar,
  children,
  className,
}: {
  sidebar: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <AppShellViewport>
      <div
        className={cn(
          "mx-auto flex h-full w-full max-w-none overflow-hidden bg-[var(--lb-surface)] md:rounded-[var(--lb-radius-frame)] md:border md:border-[var(--lb-border)] md:shadow-[0_40px_76px_-34px_rgba(11,12,14,0.26)] dark:md:shadow-[0_40px_76px_-34px_rgba(0,0,0,0.72)]",
          className
        )}
      >
        {sidebar}

        <main className="leadbase-global-dark-scope min-w-0 flex-1 overflow-y-auto bg-[var(--lb-page)] pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </AppShellViewport>
  )
}

export { AppShell }
