"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Clock3,
  Flame,
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import {
  HeatmapCells,
  HeatmapChart,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
} from "@/components/charts/heatmap";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

type ActivityDay = {
  activity_date: string;
  opens: number;
  active_minutes: number;
  actions: number;
  score: number;
};

type TimerSession = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

type ProductivityResponse = {
  ok: boolean;
  activity?: ActivityDay[];
  todaySeconds?: number;
  openSession?: TimerSession | null;
};

function getLocalDateKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toHeatLevel(
  score: number
) {
  if (score <= 0) return 0;
  if (score < 8) return 1;
  if (score < 20) return 2;
  if (score < 40) return 3;
  return 4;
}

function buildHeatmapData(
  activity: ActivityDay[]
) {
  const activityMap =
    new Map(
      activity.map(
        (day) => [
          day.activity_date,
          day,
        ]
      )
    );

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const currentSunday =
    new Date(
      today
    );

  currentSunday.setDate(
    currentSunday.getDate() -
      currentSunday.getDay()
  );

  const firstSunday =
    new Date(
      currentSunday
    );

  firstSunday.setDate(
    firstSunday.getDate() -
      11 * 7
  );

  return Array.from(
    { length: 12 },
    (_, weekIndex) => {
      const weekStart =
        new Date(
          firstSunday
        );

      weekStart.setDate(
        firstSunday.getDate() +
          weekIndex * 7
      );

      return {
        bin: weekIndex,
        bins: Array.from(
          { length: 7 },
          (_, dayIndex) => {
            const date =
              new Date(
                weekStart
              );

            date.setDate(
              weekStart.getDate() +
                dayIndex
            );

            const key =
              getLocalDateKey(
                date
              );

            const day =
              activityMap.get(
                key
              );

            return {
              bin: dayIndex,
              count:
                date.getTime() >
                today.getTime()
                  ? 0
                  : toHeatLevel(
                      Number(
                        day?.score ??
                          0
                      )
                    ),
              date,
            };
          }
        ),
      };
    }
  );
}

function calculateStreak(
  activity: ActivityDay[]
) {
  const activeDates =
    new Set(
      activity
        .filter(
          (day) =>
            Number(
              day.score ??
                0
            ) > 0
        )
        .map(
          (day) =>
            day.activity_date
        )
    );

  const cursor =
    new Date();

  cursor.setHours(
    0,
    0,
    0,
    0
  );

  if (
    !activeDates.has(
      getLocalDateKey(
        cursor
      )
    )
  ) {
    cursor.setDate(
      cursor.getDate() - 1
    );
  }

  let streak = 0;

  while (
    activeDates.has(
      getLocalDateKey(
        cursor
      )
    )
  ) {
    streak += 1;
    cursor.setDate(
      cursor.getDate() - 1
    );
  }

  return streak;
}

function formatDuration(
  seconds: number
) {
  const safe =
    Math.max(
      0,
      Math.floor(
        seconds
      )
    );

  const hours =
    Math.floor(
      safe / 3600
    );

  const minutes =
    Math.floor(
      (safe % 3600) /
        60
    );

  const rest =
    safe % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function DashboardProductivity() {
  const {
    language,
  } =
    useLanguage();

  const de =
    language === "de";

  const [
    activity,
    setActivity,
  ] =
    useState<ActivityDay[]>(
      []
    );

  const [
    openSession,
    setOpenSession,
  ] =
    useState<TimerSession | null>(
      null
    );

  const [
    todaySeconds,
    setTodaySeconds,
  ] =
    useState(
      0
    );

  const [
    syncedAt,
    setSyncedAt,
  ] =
    useState(
      Date.now()
    );

  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );

  const [
    timerBusy,
    setTimerBusy,
  ] =
    useState(
      false
    );

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
            );

          const result =
            (await response.json()) as
              ProductivityResponse;

          if (
            response.ok &&
            result.ok
          ) {
            setActivity(
              result.activity ??
                []
            );

            setOpenSession(
              result.openSession ??
                null
            );

            setTodaySeconds(
              Math.max(
                0,
                Number(
                  result.todaySeconds ??
                    0
                )
              )
            );

            const timestamp =
              Date.now();

            setSyncedAt(
              timestamp
            );

            setNow(
              timestamp
            );
          }
        } catch {
          // Keep the dashboard usable when activity metrics are temporarily unavailable.
        }
      },
      []
    );

  useEffect(
    () => {
      void load();

      const interval =
        window.setInterval(
          () => {
            void load();
          },
          60_000
        );

      const handleTimerUpdated =
        () => {
          void load();
        };

      window.addEventListener(
        "leadbase:timer-updated",
        handleTimerUpdated
      );

      return () => {
        window.clearInterval(
          interval
        );

        window.removeEventListener(
          "leadbase:timer-updated",
          handleTimerUpdated
        );
      };
    },
    [load]
  );

  useEffect(
    () => {
      if (
        !openSession
      ) {
        return;
      }

      const interval =
        window.setInterval(
          () => {
            setNow(
              Date.now()
            );
          },
          1000
        );

      return () =>
        window.clearInterval(
          interval
        );
    },
    [openSession]
  );

  const heatmapData =
    useMemo(
      () =>
        buildHeatmapData(
          activity
        ),
      [activity]
    );

  const streak =
    useMemo(
      () =>
        calculateStreak(
          activity
        ),
      [activity]
    );

  const displayedSeconds =
    todaySeconds +
    (openSession
      ? Math.max(
          0,
          Math.floor(
            (now -
              syncedAt) /
              1000
          )
        )
      : 0);

  async function runTimerAction(
    action:
      | "start_timer"
      | "stop_timer"
      | "reset_timer"
  ) {
    if (
      timerBusy
    ) {
      return;
    }

    setTimerBusy(
      true
    );

    try {
      const response =
        await fetch(
          "/api/productivity",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action,
                title:
                  null,
                projectId:
                  null,
                tzOffset:
                  new Date()
                    .getTimezoneOffset(),
              }),
          }
        );

      if (
        response.ok
      ) {
        await load();
        window.dispatchEvent(
          new Event(
            "leadbase:timer-updated"
          )
        );
      }
    } finally {
      setTimerBusy(
        false
      );
    }
  }

  return (
    <Card className="min-w-0 border-black/[0.08] bg-white py-0 shadow-[0_1px_2px_rgba(11,12,14,0.03)] dark:border-white/10 dark:bg-[#111216]">
      <CardContent className="p-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
              {de
                ? "Outreach-Aktivität"
                : "Outreach activity"}
            </h2>

            <p className="mt-1 text-[11px] text-[#6B7078]">
              {de
                ? "Echte Leadbase-Aktivität der letzten 12 Wochen"
                : "Real Leadbase activity over the last 12 weeks"}
            </p>
          </div>

          <div className="text-right">
            <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#6B7078]">
              {de
                ? "Streak"
                : "Streak"}
            </p>

            <p className="mt-0.5 font-mono text-[12px] font-semibold text-primary">
              {streak} {de ? "T" : "D"}
            </p>
          </div>
        </div>

        <div className="mt-3.5 w-full overflow-hidden">
          <HeatmapInteractionProvider>
            <HeatmapInteractionBoundary>
              <div className="flex w-full flex-col items-stretch gap-2">
                <HeatmapChart
                  className="w-full"
                  data={heatmapData}
                  layout="fluid"
                  gap={3}
                >
                  <HeatmapCells
                    inactiveOpacity={1}
                    inactiveScale={1}
                  />
                  <HeatmapXAxis />
                  <HeatmapYAxis />
                  <HeatmapTooltip instant />
                </HeatmapChart>

                <HeatmapLegend
                  align="center"
                  gap={3}
                  inactiveOpacity={1}
                  inactiveScale={1}
                  lessLabel={
                    de
                      ? "Weniger"
                      : "Less"
                  }
                  moreLabel={
                    de
                      ? "Mehr"
                      : "More"
                  }
                />
              </div>
            </HeatmapInteractionBoundary>
          </HeatmapInteractionProvider>
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-3 dark:border-white/[0.07]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Clock3 className="size-3 text-primary" />
              <span className="text-[10.5px] font-medium text-[#565B63] dark:text-[#C7CAD0]">
                {de
                  ? "Time Tracker"
                  : "Time tracker"}
              </span>
            </div>

            <p className="mt-1 font-mono text-[14px] font-semibold leading-none tabular-nums tracking-[-0.02em]">
              {formatDuration(
                displayedSeconds
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                void runTimerAction(
                  openSession
                    ? "stop_timer"
                    : "start_timer"
                )
              }
              disabled={timerBusy}
              aria-label={
                openSession
                  ? de
                    ? "Timer pausieren"
                    : "Pause timer"
                  : de
                    ? "Timer starten"
                    : "Start timer"
              }
              className="flex size-8 items-center justify-center rounded-[9px] bg-primary text-primary-foreground transition hover:bg-[#00229A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {timerBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : openSession ? (
                <Pause className="size-3.5 fill-current" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                void runTimerAction(
                  "reset_timer"
                )
              }
              disabled={timerBusy}
              aria-label={
                de
                  ? "Timer zurücksetzen"
                  : "Reset timer"
              }
              className="flex size-8 items-center justify-center rounded-[9px] border border-black/[0.09] bg-white text-[#5E636B] transition hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#111216] dark:text-[#C7CAD0] dark:hover:bg-white/[0.05]"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
