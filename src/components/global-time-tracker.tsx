"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import {
  useLanguage,
} from "@/components/language-provider";

type TimerSession = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

type ProductivityResponse = {
  ok: boolean;
  todaySeconds?: number;
  openSession?: TimerSession | null;
};

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

export function GlobalTimeTracker() {
  const {
    language,
  } =
    useLanguage();

  const [
    session,
    setSession,
  ] =
    useState<TimerSession | null>(
      null
    );

  const [
    baseTodaySeconds,
    setBaseTodaySeconds,
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
    busy,
    setBusy,
  ] =
    useState(
      false
    );

  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
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
            setSession(
              result.openSession ??
                null
            );

            setBaseTodaySeconds(
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
          // Do not make the global app shell fail because of the optional timer.
        }
      },
      []
    );

  useEffect(
    () => {
      void load();

      const syncInterval =
        window.setInterval(
          () => {
            void load();
          },
          30_000
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
          syncInterval
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
        !session
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
    [session]
  );

  const seconds =
    baseTodaySeconds +
    (session
      ? Math.max(
          0,
          Math.floor(
            (now -
              syncedAt) /
              1000
          )
        )
      : 0);

  async function runAction(
    action:
      | "start_timer"
      | "stop_timer"
      | "reset_timer"
  ) {
    if (
      busy
    ) {
      return;
    }

    setBusy(
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
      setBusy(
        false
      );
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[95] flex items-center gap-2 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-xl shadow-black/10 backdrop-blur-xl md:bottom-5 md:right-5">
      <div className="min-w-[86px] px-2 text-right">
        <p className="font-mono text-sm font-semibold tabular-nums">
          {formatDuration(
            seconds
          )}
        </p>
        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {language === "de"
            ? session
              ? "Fokus"
              : "Pausiert"
            : session
              ? "Focus"
              : "Paused"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            void runAction(
              session
                ? "stop_timer"
                : "start_timer"
            )
          }
          disabled={busy}
          aria-label={
            session
              ? language === "de"
                ? "Timer pausieren"
                : "Pause timer"
              : language === "de"
                ? "Timer starten"
                : "Start timer"
          }
          className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : session ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current" />
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            void runAction(
              "reset_timer"
            )
          }
          disabled={busy}
          aria-label={
            language === "de"
              ? "Timer zurücksetzen"
              : "Reset timer"
          }
          className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-background transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}
