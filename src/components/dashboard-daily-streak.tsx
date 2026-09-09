"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  Flame,
} from "lucide-react"

import {
  useLanguage,
} from "@/components/language-provider"

type ActivityDay = {
  activity_date:
    string
  opens:
    number
  active_minutes:
    number
  actions:
    number
  score:
    number
}

type ProductivityResponse = {
  ok:
    boolean
  activity?:
    ActivityDay[]
}

function getLocalDateKey(
  date:
    Date
) {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    )

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    )

  return `${year}-${month}-${day}`
}

function calculateStreak(
  activity:
    ActivityDay[]
) {
  const activeDates =
    new Set(
      activity
        .filter(
          (
            day
          ) =>
            Number(
              day.score ??
                0
            ) >
            0
        )
        .map(
          (
            day
          ) =>
            day.activity_date
        )
    )

  /*
   * The card itself proves Leadbase is open today.
   * ActivityHeartbeat persists the open asynchronously, so include
   * today immediately instead of briefly showing the old streak.
   *
   * Result:
   * - active yesterday + today -> streak continues
   * - skip tomorrow, return the day after -> missing day breaks it,
   *   so the new streak is exactly 1
   */
  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0
  )

  activeDates.add(
    getLocalDateKey(
      today
    )
  )

  const cursor =
    new Date(
      today
    )

  let streak =
    0

  while (
    activeDates.has(
      getLocalDateKey(
        cursor
      )
    )
  ) {
    streak +=
      1

    cursor.setDate(
      cursor.getDate() -
        1
    )
  }

  return streak
}

function buildWeeks() {
  const today =
    new Date()

  today.setHours(
    0,
    0,
    0,
    0
  )

  const dayOfWeek =
    (
      today.getDay() +
      6
    ) %
    7

  const monday =
    new Date(
      today
    )

  monday.setDate(
    monday.getDate() -
      dayOfWeek
  )

  const start =
    new Date(
      monday
    )

  start.setDate(
    start.getDate() -
      11 *
        7
  )

  return Array.from(
    {
      length:
        12,
    },
    (
      _,
      weekIndex
    ) =>
      Array.from(
        {
          length:
            7,
        },
        (
          __,
          dayIndex
        ) => {
          const date =
            new Date(
              start
            )

          date.setDate(
            start.getDate() +
              weekIndex *
                7 +
              dayIndex
          )

          return {
            date,
            key:
              getLocalDateKey(
                date
              ),
            future:
              date.getTime() >
              today.getTime(),
          }
        }
      )
  )
}

function heatClass(
  score:
    number
) {
  if (
    score <=
    0
  ) {
    return "bg-[#F1F3F7] dark:bg-[#171A25]"
  }

  if (
    score <
    8
  ) {
    return "bg-[#D5DCF5] dark:bg-[#273456]"
  }

  if (
    score <
    20
  ) {
    return "bg-[#9FB0EA] dark:bg-[#3A4E8B]"
  }

  if (
    score <
    40
  ) {
    return "bg-[#4C66D4] dark:bg-[#3655BC]"
  }

  return "bg-[#002BBA] dark:bg-[#4D6FE8]"
}

export function DashboardDailyStreak() {
  const {
    language,
  } =
    useLanguage()

  const de =
    language ===
    "de"

  const [
    activity,
    setActivity,
  ] =
    useState<
      ActivityDay[]
    >(
      []
    )

  const load =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/productivity?tzOffset=${encodeURIComponent(
                String(
                  new Date()
                    .getTimezoneOffset()
                )
              )}`,
              {
                cache:
                  "no-store",
              }
            )

          const result =
            await response.json() as ProductivityResponse

          if (
            response.ok &&
            result.ok
          ) {
            setActivity(
              result.activity ??
                []
            )
          }
        } catch {
          // Dashboard remains usable if streak data is unavailable.
        }
      },
      []
    )

  useEffect(
    () => {
      void load()

      const refresh =
        window.setTimeout(
          () => {
            void load()
          },
          1200
        )

      return () => {
        window.clearTimeout(
          refresh
        )
      }
    },
    [
      load,
    ]
  )

  const weeks =
    useMemo(
      () =>
        buildWeeks(),
      []
    )

  const activityMap =
    useMemo(
      () =>
        new Map(
          activity.map(
            (
              day
            ) => [
              day.activity_date,
              day,
            ]
          )
        ),
      [
        activity,
      ]
    )

  const streak =
    useMemo(
      () =>
        calculateStreak(
          activity
        ),
      [
        activity,
      ]
    )

  const streakUnit =
    streak ===
    1
      ? de
        ? "Tag"
        : "Day"
      : de
        ? "Tage"
        : "Days"

  const weekdayLabels =
    de
      ? [
          "MO",
          "DI",
          "MI",
          "DO",
          "FR",
          "SA",
          "SO",
        ]
      : [
          "MO",
          "TU",
          "WE",
          "TH",
          "FR",
          "SA",
          "SU",
        ]

  const todayKey =
    getLocalDateKey(
      new Date()
    )

  return (
    <div className="shrink-0 rounded-[15px] border border-border bg-card p-3.5 shadow-[var(--lb-shadow-xs)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Flame className="size-3.5 text-primary" />

            <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
              Daily streak
            </h2>
          </div>

          <p className="mt-1 text-[10.5px] leading-4 text-muted-foreground">
            {de
              ? "Letzte 12 Wochen · Montag bis Sonntag"
              : "Last 12 weeks · Monday to Sunday"}
          </p>
        </div>

        <div className="shrink-0 rounded-[10px] border border-primary/15 bg-primary/[0.035] px-2.5 py-1.5 text-center">
          <div className="font-mono text-[13px] font-semibold leading-none text-primary">
            {
              streak
            }
          </div>

          <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-muted-foreground">
            {
              streakUnit
            }
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[20px_repeat(12,minmax(0,1fr))] gap-[3px]">
        <div />

        {weeks.map(
          (
            week,
            index
          ) => {
            const first =
              week[0]
                .date

            const month =
              new Intl.DateTimeFormat(
                de
                  ? "de-DE"
                  : "en-GB",
                {
                  month:
                    "short",
                }
              )
                .format(
                  first
                )
                .replace(
                  ".",
                  ""
                )

            const previousMonth =
              index >
              0
                ? weeks[
                    index -
                    1
                  ][0]
                    .date
                    .getMonth()
                : -1

            const show =
              first.getMonth() !==
              previousMonth

            return (
              <div
                key={
                  index
                }
                className="truncate text-center font-mono text-[6.5px] uppercase text-muted-foreground"
              >
                {show
                  ? month
                  : ""}
              </div>
            )
          }
        )}

        {weekdayLabels.map(
          (
            label,
            dayIndex
          ) => (
            <div
              key={
                dayIndex
              }
              className="contents"
            >
              <div className="flex items-center font-mono text-[6.5px] font-medium text-muted-foreground">
                {
                  label
                }
              </div>

              {weeks.map(
                (
                  week,
                  weekIndex
                ) => {
                  const day =
                    week[
                      dayIndex
                    ]

                  const score =
                    day.future
                      ? 0
                      : Number(
                          activityMap.get(
                            day.key
                          )
                            ?.score ??
                            0
                        )

                  return (
                    <div
                      key={
                        `${weekIndex}-${dayIndex}`
                      }
                      title={`${new Intl.DateTimeFormat(
                        de
                          ? "de-DE"
                          : "en-GB",
                        {
                          weekday:
                            "short",
                          day:
                            "2-digit",
                          month:
                            "short",
                        }
                      ).format(
                        day.date
                      )}: ${score}`}
                      className={`h-[13px] rounded-[2.5px] ${
                        day.future
                          ? "bg-transparent"
                          : heatClass(
                              score
                            )
                      } ${
                        day.key ===
                        todayKey
                          ? "ring-1 ring-primary ring-offset-1 ring-offset-card"
                          : ""
                      }`}
                    />
                  )
                }
              )}
            </div>
          )
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-border pt-2.5">
        <span className="text-[9.5px] text-muted-foreground">
          {de
            ? "Aktuelle Serie:"
            : "Current streak:"}
          {" "}
          <span className="font-medium text-foreground">
            {
              streak
            }{" "}
            {
              streakUnit.toLowerCase()
            }
          </span>
        </span>

        <div className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-[6.5px] uppercase text-muted-foreground">
            {de
              ? "Weniger"
              : "Less"}
          </span>

          {[
            "#F1F3F7",
            "#D5DCF5",
            "#9FB0EA",
            "#4C66D4",
            "#002BBA",
          ].map(
            (
              color
            ) => (
              <span
                key={
                  color
                }
                className="size-[7px] rounded-[2px]"
                style={{
                  background:
                    color,
                }}
              />
            )
          )}

          <span className="font-mono text-[6.5px] uppercase text-muted-foreground">
            {de
              ? "Mehr"
              : "More"}
          </span>
        </div>
      </div>
    </div>
  )
}
