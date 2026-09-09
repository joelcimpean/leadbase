import type {
  ComponentProps,
  ReactNode,
} from "react"

import { cn } from "@/lib/utils"

function AppPage({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="app-page"
      className={cn(
        "mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-5 lg:px-[22px] lg:py-[22px] min-[1900px]:max-w-[1760px] min-[3000px]:max-w-[2380px]",
        className
      )}
      {...props}
    />
  )
}

function AppPageHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  return (
    <header
      data-slot="app-page-header"
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
      {...props}
    />
  )
}

function AppPageHeaderMain({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="app-page-header-main"
      className={cn("min-w-0", className)}
      {...props}
    />
  )
}

function AppPageEyebrow({
  className,
  children,
  ...props
}: ComponentProps<"div"> & {
  children: ReactNode
}) {
  return (
    <div
      data-slot="app-page-eyebrow"
      className={cn(
        "flex items-center gap-2 font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-primary",
        className
      )}
      {...props}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
      <span className="truncate">{children}</span>
    </div>
  )
}

function AppPageTitle({
  className,
  ...props
}: ComponentProps<"h1">) {
  return (
    <h1
      data-slot="app-page-title"
      className={cn(
        "mt-2 text-[32px] font-semibold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[36px]",
        className
      )}
      {...props}
    />
  )
}

function AppPageDescription({
  className,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      data-slot="app-page-description"
      className={cn(
        "mt-2 max-w-2xl text-[12px] leading-5 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function AppPageActions({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="app-page-actions"
      className={cn(
        "flex flex-wrap items-center gap-2",
        className
      )}
      {...props}
    />
  )
}

function AppPageToolbar({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="app-page-toolbar"
      className={cn(
        "mt-4 flex min-h-11 flex-col gap-2 rounded-[14px] border border-border bg-card px-3 py-2 shadow-[var(--lb-shadow-xs)] sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    />
  )
}

function AppPageSection({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      data-slot="app-page-section"
      className={cn("mt-4", className)}
      {...props}
    />
  )
}

export {
  AppPage,
  AppPageActions,
  AppPageDescription,
  AppPageEyebrow,
  AppPageHeader,
  AppPageHeaderMain,
  AppPageSection,
  AppPageTitle,
  AppPageToolbar,
}
