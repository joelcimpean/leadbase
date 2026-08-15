"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  syncInboxSilently,
} from "@/app/(app)/inbox/actions";

/* =========================================================
   CONFIG
========================================================= */

const AUTO_SYNC_INTERVAL_MS =
  30_000;

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
    useRef(
      false
    );

  const runSync =
    useCallback(
      async () => {
        if (
          !enabled ||
          syncingRef.current
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

        try {
          const result =
            await syncInboxSilently();

          if (
            result.ok &&
            result.newReplies >
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
      if (
        !enabled
      ) {
        return;
      }

      /*
       * Initial sync shortly after loading JOEL LEADOS.
       */

      const initialTimeout =
        window.setTimeout(
          () => {
            void runSync();
          },
          1_500
        );

      /*
       * Near-live sync while the app is open.
       */

      const interval =
        window.setInterval(
          () => {
            void runSync();
          },
          AUTO_SYNC_INTERVAL_MS
        );

      /*
       * Sync immediately when returning to the app.
       */

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