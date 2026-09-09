"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"

function LeadbaseMark({
  className,
}: {
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z" />
    </svg>
  )
}

function LeadbaseLogo({
  subtitle,
  href = "/",
  compact = false,
  onNavigate,
  className,
}: {
  subtitle?: string
  href?: string
  compact?: boolean
  onNavigate?: () => void
  className?: string
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex min-w-0 items-center gap-[10px]",
        className
      )}
    >
      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-primary text-white">
        <LeadbaseMark className="size-4" />
      </span>

      {!compact ? (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground">
            Leadbase
          </span>

          {subtitle ? (
            <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-[0.10em] text-muted-foreground">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </Link>
  )
}

export {
  LeadbaseLogo,
  LeadbaseMark,
}
