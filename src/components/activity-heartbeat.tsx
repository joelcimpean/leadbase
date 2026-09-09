"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  usePathname,
} from "next/navigation";

const HEARTBEAT_INTERVAL_MS =
  5 * 60 * 1000;

const HEARTBEAT_LOCK_MS =
  4 * 60 * 1000;

const STORAGE_PREFIX =
  "leadbase:activity";

function getLocalDate() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function sendPing({
  opens = 0,
  activeMinutes = 0,
  actions = 0,
  keepalive = false,
}: {
  opens?: number;
  activeMinutes?: number;
  actions?: number;
  keepalive?: boolean;
}) {
  try {
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
            action:
              "activity_ping",
            localDate:
              getLocalDate(),
            opens,
            activeMinutes,
            actions,
          }),
        keepalive,
      }
    );
  } catch {
    // Activity tracking must never interrupt the app.
  }
}

export function ActivityHeartbeat() {
  const pathname =
    usePathname();

  const pendingActionsRef =
    useRef(0);

  const lastPathRef =
    useRef(
      pathname
    );

  useEffect(
    () => {
      if (
        lastPathRef.current !==
        pathname
      ) {
        pendingActionsRef.current +=
          1;
        lastPathRef.current =
          pathname;
      }
    },
    [
      pathname,
    ]
  );

  useEffect(
    () => {
      const localDate =
        getLocalDate();

      const openKey =
        `${STORAGE_PREFIX}:open:${localDate}`;

      if (
        !window.sessionStorage.getItem(
          openKey
        )
      ) {
        window.sessionStorage.setItem(
          openKey,
          "1"
        );

        void sendPing({
          opens: 1,
        });
      }

      function recordAction(
        event: Event
      ) {
        const target =
          event.target;

        if (
          !(target instanceof Element)
        ) {
          return;
        }

        const actionable =
          target.closest(
            "button,a,[role='button'],input[type='submit']"
          );

        if (
          actionable
        ) {
          pendingActionsRef.current =
            Math.min(
              30,
              pendingActionsRef.current +
                1
            );
        }
      }

      function flushHeartbeat(
        keepalive = false
      ) {
        if (
          document.visibilityState !==
            "visible" &&
          !keepalive
        ) {
          return;
        }

        const lockKey =
          `${STORAGE_PREFIX}:heartbeat:${getLocalDate()}`;

        const lastHeartbeat =
          Number(
            window.localStorage.getItem(
              lockKey
            ) ??
              "0"
          );

        const now =
          Date.now();

        const actions =
          pendingActionsRef.current;

        if (
          !keepalive &&
          now -
            lastHeartbeat <
            HEARTBEAT_LOCK_MS
        ) {
          return;
        }

        pendingActionsRef.current =
          0;

        window.localStorage.setItem(
          lockKey,
          String(now)
        );

        void sendPing({
          activeMinutes:
            keepalive
              ? 0
              : 5,
          actions,
          keepalive,
        });
      }

      const interval =
        window.setInterval(
          () => {
            flushHeartbeat();
          },
          HEARTBEAT_INTERVAL_MS
        );

      function handleVisibility() {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          flushHeartbeat(
            true
          );
        }
      }

      window.addEventListener(
        "click",
        recordAction,
        true
      );

      document.addEventListener(
        "visibilitychange",
        handleVisibility
      );

      function handlePageHide() {
        flushHeartbeat(
          true
        );
      }

      window.addEventListener(
        "pagehide",
        handlePageHide
      );

      return () => {
        window.clearInterval(
          interval
        );

        window.removeEventListener(
          "click",
          recordAction,
          true
        );

        document.removeEventListener(
          "visibilitychange",
          handleVisibility
        );

        window.removeEventListener(
          "pagehide",
          handlePageHide
        );
      };
    },
    []
  );

  return null;
}
