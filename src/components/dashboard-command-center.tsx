"use client"

import Link from "next/link"

import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Mail,
  MessageSquareReply,
  ShieldAlert,
  Sparkles,
  BellRing,
  CalendarClock,
} from "lucide-react"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  Badge,
} from "@/components/ui/badge"

export type DashboardFocusKey =
  | "replies"
  | "hot"
  | "followups"
  | "email-issues"
  | "drafts"
  | "ooo"

export type DashboardCommandItem = {
  key: string
  priority: number
  title: string
  description: string
  href: string
  badge: string
  badgeClass: string
  sortTime: number
}

export type DashboardCommandGroups = {
  all: DashboardCommandItem[]
  replies: DashboardCommandItem[]
  hot: DashboardCommandItem[]
  followups: DashboardCommandItem[]
  "email-issues": DashboardCommandItem[]
  drafts: DashboardCommandItem[]
  ooo: DashboardCommandItem[]
}

export type DashboardSummaryCard = {
  label: string
  value: number
  meta: string
  focus: DashboardFocusKey
}

type DashboardFocusTab = {
  label: string
  count: number
  focus: DashboardFocusKey | null
}

const focusEventName =
  "leadbase:dashboard-focus"

function setUrlFocus(
  focus:
    DashboardFocusKey
    | null
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return
  }

  const url =
    new URL(
      window.location.href
    )

  if (
    focus
  ) {
    url.searchParams.set(
      "focus",
      focus
    )
  } else {
    url.searchParams.delete(
      "focus"
    )
  }

  url.hash = ""

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}`
  )
}

function broadcastFocus(
  focus:
    DashboardFocusKey
    | null
) {
  setUrlFocus(
    focus
  )

  window.dispatchEvent(
    new CustomEvent(
      focusEventName,
      {
        detail: {
          focus,
        },
      }
    )
  )
}

function useDashboardFocus(
  initialFocus:
    DashboardFocusKey
    | null
) {
  const [
    focus,
    setFocus,
  ] =
    useState<
      DashboardFocusKey
      | null
    >(
      initialFocus
    )

  useEffect(
    () => {
      function onFocus(
        event:
          Event
      ) {
        const custom =
          event as CustomEvent<{
            focus:
              DashboardFocusKey
              | null
          }>

        setFocus(
          custom.detail
            ?.focus ??
          null
        )
      }

      window.addEventListener(
        focusEventName,
        onFocus
      )

      return () =>
        window.removeEventListener(
          focusEventName,
          onFocus
        )
    },
    []
  )

  return [
    focus,
    (
      next:
        DashboardFocusKey
        | null
    ) => {
      setFocus(
        next
      )

      broadcastFocus(
        next
      )
    },
  ] as const
}

function SummaryIcon({
  focus,
}: {
  focus:
    DashboardFocusKey
}) {
  const Icon =
    focus ===
    "hot"
      ? Flame
      : focus ===
          "followups"
        ? CalendarClock
        : focus ===
            "email-issues"
          ? ShieldAlert
          : focus ===
              "drafts"
            ? Mail
            : focus ===
                "ooo"
              ? BellRing
              : MessageSquareReply

  return (
    <Icon className="size-3" />
  )
}

export function DashboardSummaryStrip({
  cards,
  initialFocus,
}: {
  cards:
    DashboardSummaryCard[]
  initialFocus:
    DashboardFocusKey
    | null
}) {
  const [
    focus,
    pickFocus,
  ] =
    useDashboardFocus(
      initialFocus
    )

  return (
    <section
      data-leadbase-reveal
      className="mt-3 grid overflow-hidden rounded-[15px] border border-border bg-card shadow-[var(--lb-shadow-xs)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {cards.map(
        (
          card,
          index
        ) => {
          const active =
            focus ===
            card.focus

          const highlighted =
            card.value >
              0 &&
            (
              card.focus ===
                "hot" ||
              card.focus ===
                "followups"
            )

          return (
            <button
              key={
                card.focus
              }
              type="button"
              onClick={() =>
                pickFocus(
                  card.focus
                )
              }
              className={`relative min-w-0 px-4 py-3 text-left transition-colors hover:bg-black/[0.018] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25 dark:hover:bg-white/[0.025] ${
                index >
                0
                  ? "border-t border-black/[0.06] sm:border-l lg:border-t-0 dark:border-white/[0.07]"
                  : ""
              } ${
                active ||
                highlighted
                  ? "bg-[linear-gradient(180deg,rgba(0,43,186,0.035),rgba(0,43,186,0))]"
                  : ""
              }`}
            >
              <div
                className={`flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.11em] ${
                  active ||
                  highlighted
                    ? "text-primary"
                    : "text-[#6B7078] dark:text-muted-foreground"
                }`}
              >
                {card.focus ===
                  "hot" ? (
                  <SummaryIcon
                    focus={
                      card.focus
                    }
                  />
                ) : null}

                <span>
                  {
                    card.label
                  }
                </span>
              </div>

              <div className="mt-1.5 flex items-baseline gap-2">
                <span
                  className={`text-[25px] font-semibold leading-none tracking-[-0.035em] tabular-nums ${
                    active ||
                    highlighted
                      ? "text-primary"
                      : card.value >
                          0
                        ? "text-foreground"
                        : "text-[#7E838B]"
                  }`}
                >
                  {
                    card.value
                  }
                </span>

                <span className="truncate text-[10.5px] text-[#6B7078] dark:text-muted-foreground">
                  {
                    card.meta
                  }
                </span>
              </div>
            </button>
          )
        }
      )}
    </section>
  )
}

function getCommandChannel({
  href,
  de,
}: {
  href:
    string
  de:
    boolean
}) {
  if (
    href.startsWith(
      "/inbox"
    )
  ) {
    return de
      ? "Inbox"
      : "Inbox"
  }

  if (
    href.startsWith(
      "/projects"
    )
  ) {
    return de
      ? "Projekt"
      : "Project"
  }

  if (
    href.includes(
      "#outreach"
    )
  ) {
    return de
      ? "E-Mail"
      : "Email"
  }

  return de
    ? "Lead"
    : "Lead"
}

function getCommandActionLabel({
  href,
  de,
}: {
  href:
    string
  de:
    boolean
}) {
  if (
    href.startsWith(
      "/inbox"
    )
  ) {
    return de
      ? "Antwort öffnen"
      : "Open reply"
  }

  if (
    href.startsWith(
      "/projects"
    )
  ) {
    return de
      ? "Projekt öffnen"
      : "Open project"
  }

  if (
    href.includes(
      "#outreach"
    )
  ) {
    return de
      ? "Entwurf öffnen"
      : "Open draft"
  }

  return de
    ? "Öffnen"
    : "Open"
}

export function DashboardFocusWorkspace({
  initialFocus,
  groups,
  tabs,
  language,
  title,
  description,
  emptyTitle,
  emptyDescription,
}: {
  initialFocus:
    DashboardFocusKey
    | null
  groups:
    DashboardCommandGroups
  tabs:
    DashboardFocusTab[]
  language:
    "de"
    | "en"
  title:
    string
  description:
    string
  emptyTitle:
    string
  emptyDescription:
    string
}) {
  const de =
    language ===
    "de"

  const [
    focus,
    pickFocus,
  ] =
    useDashboardFocus(
      initialFocus
    )

  const items =
    useMemo(
      () =>
        focus
          ? groups[
              focus
            ]
          : groups.all,
      [
        focus,
        groups,
      ]
    )

  const nextAction =
    items[0] ??
    null

  return (
    <div className="flex min-h-[470px] min-w-0 flex-1 flex-col overflow-hidden rounded-[15px] border border-border bg-card shadow-[var(--lb-shadow-xs)] xl:min-h-0">
      <div className="flex flex-col gap-2.5 px-4 pb-2.5 pt-3.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />

            <h2 className="text-[13px] font-semibold tracking-[-0.015em]">
              {
                title
              }
            </h2>
          </div>

          <p className="mt-1 text-[11.5px] text-[#6B7078] dark:text-muted-foreground">
            {
              description
            }
          </p>
        </div>

        <div className="flex max-w-full shrink-0 overflow-x-auto rounded-[10px] bg-black/[0.045] p-[3px] dark:bg-white/[0.055]">
          {tabs.map(
            (
              tab
            ) => {
              const selected =
                focus ===
                tab.focus

              return (
                <button
                  key={
                    tab.label
                  }
                  type="button"
                  onClick={() =>
                    pickFocus(
                      tab.focus
                    )
                  }
                  className={`whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[11px] transition ${
                    selected
                      ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,0.10)] dark:bg-[#1A1B20] dark:text-white"
                      : "text-[#6B7078] hover:text-foreground"
                  }`}
                >
                  {
                    tab.label
                  }{" "}
                  {
                    tab.count
                  }
                </button>
              )
            }
          )}
        </div>
      </div>

      {nextAction ? (
        <div className="mx-4 mb-2.5 flex flex-col gap-2.5 rounded-[12px] bg-[linear-gradient(96deg,#002BBA,#1D3FCB)] px-3.5 py-3 text-white sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[9px] uppercase tracking-[0.11em] text-white/70">
              {de
                ? "Nächste Aktion"
                : "Next action"}
              {" · "}
              {
                nextAction.badge
              }
            </div>

            <p className="mt-1 truncate text-[13px] font-semibold tracking-[-0.015em]">
              {
                nextAction.title
              }
            </p>

            <p className="mt-1 truncate text-[11px] text-white/75">
              {
                nextAction.description
              }
            </p>
          </div>

          <Link
            href={
              nextAction.href
            }
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[9px] bg-white px-3.5 text-[12px] font-semibold text-primary transition hover:bg-white/90"
          >
            {getCommandActionLabel({
              href:
                nextAction.href,
              de,
            })}

            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {items.length ===
        0 ? (
          <div className="flex min-h-[300px] items-center justify-center p-6 text-center">
            <div className="max-w-sm">
              <CheckCircle2 className="mx-auto size-5 text-emerald-600" />

              <p className="mt-3 text-sm font-medium">
                {
                  emptyTitle
                }
              </p>

              <p className="mt-1 text-xs leading-5 text-[#6B7078] dark:text-muted-foreground">
                {
                  emptyDescription
                }
              </p>
            </div>
          </div>
        ) : (
          <div>
            {items.map(
              (
                item,
                index
              ) => (
                <Link
                  key={
                    item.key
                  }
                  href={
                    item.href
                  }
                  className="group flex items-center gap-2.5 rounded-[11px] px-3 py-[8px] transition hover:bg-[#F7F8FA] dark:hover:bg-white/[0.035]"
                >
                  <div className="w-6 shrink-0 text-right font-mono text-[9px] text-[#8B9097]">
                    {String(
                      index +
                        1
                    ).padStart(
                      2,
                      "0"
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-[12px] font-medium tracking-[-0.01em]">
                        {
                          item.title
                        }
                      </p>

                      <Badge
                        variant="outline"
                        className={`h-5 shrink-0 rounded-[6px] px-1.5 font-mono text-[8px] uppercase tracking-[0.04em] ${item.badgeClass}`}
                      >
                        {
                          item.badge
                        }
                      </Badge>
                    </div>

                    <p className="mt-0.5 truncate text-[9.5px] text-[#6B7078] dark:text-muted-foreground">
                      {
                        item.description
                      }
                    </p>
                  </div>

                  <div className="hidden shrink-0 items-center gap-2 sm:flex">
                    <span className="font-mono text-[9px] text-[#7A7F87]">
                      {getCommandChannel({
                        href:
                          item.href,
                        de,
                      })}
                    </span>

                    <span className="flex size-7 items-center justify-center rounded-[8px] border border-black/[0.08] text-[#6B7078] transition group-hover:border-primary group-hover:bg-primary group-hover:text-white dark:border-white/10">
                      <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
