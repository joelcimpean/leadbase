"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  useRouter,
} from "next/navigation";

/* =========================================================
   CONFIG
========================================================= */

const AUTO_SYNC_INTERVAL_MS =
  60_000;

const MIN_AUTO_SYNC_GAP_MS =
  45_000;

const QUOTA_COOLDOWN_MS =
  180_000;

const LAST_AUTO_SYNC_KEY =
  "leadbase:last-auto-inbox-sync";

const QUOTA_COOLDOWN_KEY =
  "leadbase:gmail-sync-cooldown-until";

type AutoSyncResponse = {
  ok?: boolean;
  newReplies?: number;
  skipped?: boolean;
  error?: string;
};

function getStoredNumber(
  key: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return 0;
  }

  const value =
    Number(
      window.localStorage.getItem(
        key
      ) ?? 0
    );

  return Number.isFinite(
    value
  )
    ? value
    : 0;
}

function canRunAutoSync() {
  const now =
    Date.now();

  const cooldownUntil =
    getStoredNumber(
      QUOTA_COOLDOWN_KEY
    );

  if (
    cooldownUntil >
    now
  ) {
    return false;
  }

  const lastAttempt =
    getStoredNumber(
      LAST_AUTO_SYNC_KEY
    );

  return (
    now - lastAttempt >=
    MIN_AUTO_SYNC_GAP_MS
  );
}

async function requestInboxSync() {
  const response =
    await fetch(
      "/api/inbox/sync",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept:
            "application/json",
        },
      }
    );

  const text =
    await response.text();

  if (!text) {
    throw new Error(
      `Inbox sync returned an empty response (${response.status}).`
    );
  }

  let result:
    AutoSyncResponse;

  try {
    result =
      JSON.parse(text) as
        AutoSyncResponse;
  } catch {
    throw new Error(
      `Inbox sync returned invalid JSON (${response.status}).`
    );
  }

  return result;
}

/* =========================================================
   COMPONENT
========================================================= */

export function InboxAutoSync({
  enabled,
}: {
  enabled: boolean;
}) {
  const router =
    useRouter();

  const syncingRef =
    useRef(false);

  const runSync =
    useCallback(
      async () => {
        if (
          !enabled ||
          syncingRef.current ||
          !canRunAutoSync()
        ) {
          return;
        }

        if (
          typeof document !==
            "undefined" &&
          document.visibilityState ===
            "hidden"
        ) {
          return;
        }

        syncingRef.current =
          true;

        window.localStorage.setItem(
          LAST_AUTO_SYNC_KEY,
          String(Date.now())
        );

        try {
          /*
           * IMPORTANT:
           *
           * Auto sync deliberately uses a stable API route instead of a
           * Next.js Server Action. Server Action IDs are build-specific.
           * An already-open browser tab can otherwise hold an old action
           * hash after `npm run dev` / .next regeneration and immediately
           * produce `Failed to find Server Action` on startup.
           */
          const result =
            await requestInboxSync();

          if (
            !result.ok &&
            result.error ===
              "GMAIL_QUOTA_COOLDOWN"
          ) {
            window.localStorage.setItem(
              QUOTA_COOLDOWN_KEY,
              String(
                Date.now() +
                  QUOTA_COOLDOWN_MS
              )
            );

            return;
          }

          if (result.ok) {
            window.localStorage.removeItem(
              QUOTA_COOLDOWN_KEY
            );
          }

          if (
            result.ok &&
            (result.newReplies ?? 0) >
              0
          ) {
            router.refresh();
          }
        } catch (error) {
          console.warn(
            "Automatic inbox sync failed:",
            error
          );
        } finally {
          syncingRef.current =
            false;
        }
      },
      [
        enabled,
        router,
      ]
    );

  useEffect(
    () => {
      if (!enabled) {
        return;
      }

      const initialTimeout =
        window.setTimeout(
          () => {
            void runSync();
          },
          1_500
        );

      const interval =
        window.setInterval(
          () => {
            void runSync();
          },
          AUTO_SYNC_INTERVAL_MS
        );

      const handleFocus =
        () => {
          void runSync();
        };

      const handleVisibilityChange =
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void runSync();
          }
        };

      window.addEventListener(
        "focus",
        handleFocus
      );

      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      return () => {
        window.clearTimeout(
          initialTimeout
        );

        window.clearInterval(
          interval
        );

        window.removeEventListener(
          "focus",
          handleFocus
        );

        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    },
    [
      enabled,
      runSync,
    ]
  );

  return null;
}
