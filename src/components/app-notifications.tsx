"use client";

import Link from "next/link";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

export type AppNotificationVariant =
  | "success"
  | "info"
  | "warning"
  | "error";

export type AppNotificationItem = {
  title:
    string;

  description?:
    string;

  href?:
    string;
};

export type AppNotificationInput = {
  variant:
    AppNotificationVariant;

  title:
    string;

  description?:
    string;

  items?:
    AppNotificationItem[];

  action?:
    {
      label:
        string;

      href:
        string;
    };

  durationMs?:
    number;
};

type AppNotification =
  AppNotificationInput & {
    id:
      string;

    durationMs:
      number;

    paused:
      boolean;

    closing:
      boolean;
  };

type TimerMeta = {
  timerId:
    number
    | null;

  startedAt:
    number;

  remainingMs:
    number;
};

type AppNotificationContextValue = {
  notify:
    (
      notification:
        AppNotificationInput
    ) => string;

  dismiss:
    (
      id:
        string
    ) => void;
};

/* =========================================================
   CONTEXT
========================================================= */

const AppNotificationContext =
  createContext<
    AppNotificationContextValue
    | null
  >(
    null
  );

/* =========================================================
   HELPERS
========================================================= */

function createNotificationId() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function defaultDuration(
  variant:
    AppNotificationVariant
) {
  if (
    variant ===
      "error"
  ) {
    return 12_000;
  }

  if (
    variant ===
      "warning"
  ) {
    return 10_000;
  }

  return 6_500;
}

function safeParseNotification(
  value:
    string
): AppNotificationInput | null {
  try {
    const parsed =
      JSON.parse(
        value
      ) as
        Partial<AppNotificationInput>;

    if (
      !parsed ||
      typeof parsed.title !==
        "string" ||
      (
        parsed.variant !==
          "success" &&
        parsed.variant !==
          "info" &&
        parsed.variant !==
          "warning" &&
        parsed.variant !==
          "error"
      )
    ) {
      return null;
    }

    return {
      variant:
        parsed.variant,

      title:
        parsed.title,

      description:
        typeof parsed.description ===
          "string"
          ? parsed.description
          : undefined,

      items:
        Array.isArray(
          parsed.items
        )
          ? parsed.items
              .filter(
                (
                  item
                ) =>
                  item &&
                  typeof item.title ===
                    "string"
              )
              .slice(
                0,
                5
              )
              .map(
                (
                  item
                ) => ({
                  title:
                    item.title,

                  description:
                    typeof item.description ===
                      "string"
                      ? item.description
                      : undefined,

                  href:
                    typeof item.href ===
                      "string"
                      ? item.href
                      : undefined,
                })
              )
          : undefined,

      action:
        parsed.action &&
        typeof parsed.action.label ===
          "string" &&
        typeof parsed.action.href ===
          "string"
          ? {
              label:
                parsed.action.label,

              href:
                parsed.action.href,
            }
          : undefined,

      durationMs:
        typeof parsed.durationMs ===
          "number"
          ? parsed.durationMs
          : undefined,
    };
  } catch {
    return null;
  }
}

/* =========================================================
   PROVIDER
========================================================= */

export function AppNotificationProvider({
  children,
}: {
  children:
    ReactNode;
}) {
  const [
    notifications,
    setNotifications,
  ] =
    useState<
      AppNotification[]
    >(
      []
    );

  const timersRef =
    useRef<
      Map<
        string,
        TimerMeta
      >
    >(
      new Map()
    );

  const removeImmediately =
    useCallback(
      (
        id:
          string
      ) => {
        const timer =
          timersRef.current.get(
            id
          );

        if (
          timer?.timerId
        ) {
          window.clearTimeout(
            timer.timerId
          );
        }

        timersRef.current.delete(
          id
        );

        setNotifications(
          (
            current
          ) =>
            current.filter(
              (
                notification
              ) =>
                notification.id !==
                id
            )
        );
      },
      []
    );

  const dismiss =
    useCallback(
      (
        id:
          string
      ) => {
        const timer =
          timersRef.current.get(
            id
          );

        if (
          timer?.timerId
        ) {
          window.clearTimeout(
            timer.timerId
          );

          timer.timerId =
            null;
        }

        setNotifications(
          (
            current
          ) =>
            current.map(
              (
                notification
              ) =>
                notification.id ===
                id
                  ? {
                      ...notification,

                      closing:
                        true,
                    }
                  : notification
            )
        );

        window.setTimeout(
          () => {
            removeImmediately(
              id
            );
          },
          190
        );
      },
      [
        removeImmediately,
      ]
    );

  const scheduleDismiss =
    useCallback(
      (
        id:
          string,
        duration:
          number
      ) => {
        if (
          duration <=
          0
        ) {
          return;
        }

        const startedAt =
          performance.now();

        const timerId =
          window.setTimeout(
            () => {
              dismiss(
                id
              );
            },
            duration
          );

        timersRef.current.set(
          id,
          {
            timerId,
            startedAt,
            remainingMs:
              duration,
          }
        );
      },
      [
        dismiss,
      ]
    );

  const notify =
    useCallback(
      (
        input:
          AppNotificationInput
      ) => {
        const id =
          createNotificationId();

        const duration =
          input.durationMs ??
          defaultDuration(
            input.variant
          );

        const notification:
          AppNotification = {
          ...input,

          id,

          durationMs:
            duration,

          paused:
            false,

          closing:
            false,
        };

        setNotifications(
          (
            current
          ) => [
            ...current.slice(
              -3
            ),
            notification,
          ]
        );

        scheduleDismiss(
          id,
          duration
        );

        return id;
      },
      [
        scheduleDismiss,
      ]
    );

  const pause =
    useCallback(
      (
        id:
          string
      ) => {
        const meta =
          timersRef.current.get(
            id
          );

        if (
          !meta
        ) {
          return;
        }

        if (
          meta.timerId
        ) {
          window.clearTimeout(
            meta.timerId
          );
        }

        const elapsed =
          performance.now() -
          meta.startedAt;

        meta.timerId =
          null;

        meta.remainingMs =
          Math.max(
            0,
            meta.remainingMs -
              elapsed
          );

        setNotifications(
          (
            current
          ) =>
            current.map(
              (
                notification
              ) =>
                notification.id ===
                id
                  ? {
                      ...notification,

                      paused:
                        true,
                    }
                  : notification
            )
        );
      },
      []
    );

  const resume =
    useCallback(
      (
        id:
          string
      ) => {
        const meta =
          timersRef.current.get(
            id
          );

        if (
          !meta ||
          meta.remainingMs <=
            0
        ) {
          return;
        }

        meta.startedAt =
          performance.now();

        meta.timerId =
          window.setTimeout(
            () => {
              dismiss(
                id
              );
            },
            meta.remainingMs
          );

        setNotifications(
          (
            current
          ) =>
            current.map(
              (
                notification
              ) =>
                notification.id ===
                id
                  ? {
                      ...notification,

                      paused:
                        false,
                    }
                  : notification
            )
        );
      },
      [
        dismiss,
      ]
    );

  /*
   * Free/manual notification test.
   *
   * Open the browser console and run:
   *
   * window.dispatchEvent(new CustomEvent("leadbase:notify", {
   *   detail: {
   *     variant: "success",
   *     title: "Analysis complete",
   *     description: "2 leads successfully analyzed."
   *   }
   * }))
   *
   * This does not call OpenAI and costs no credits.
   */
  useEffect(
    () => {
      function handleTestNotification(
        event:
          Event
      ) {
        const customEvent =
          event as
            CustomEvent<AppNotificationInput>;

        const detail =
          customEvent.detail;

        if (
          !detail ||
          typeof detail.title !==
            "string"
        ) {
          return;
        }

        notify(
          detail
        );
      }

      window.addEventListener(
        "leadbase:notify",
        handleTestNotification
      );

      return () => {
        window.removeEventListener(
          "leadbase:notify",
          handleTestNotification
        );
      };
    },
    [
      notify,
    ]
  );

  useEffect(
    () => {
      return () => {
        for (
          const meta of
            timersRef.current.values()
        ) {
          if (
            meta.timerId
          ) {
            window.clearTimeout(
              meta.timerId
            );
          }
        }

        timersRef.current.clear();
      };
    },
    []
  );

  const value =
    useMemo(
      () => ({
        notify,
        dismiss,
      }),
      [
        notify,
        dismiss,
      ]
    );

  return (
    <AppNotificationContext.Provider
      value={
        value
      }
    >
      {
        children
      }

      <Suspense
        fallback={
          null
        }
      >
        <NotificationUrlBridge
          notify={
            notify
          }
        />
      </Suspense>

      <NotificationViewport
        notifications={
          notifications
        }
        dismiss={
          dismiss
        }
        pause={
          pause
        }
        resume={
          resume
        }
      />
    </AppNotificationContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useAppNotifications() {
  const context =
    useContext(
      AppNotificationContext
    );

  if (
    !context
  ) {
    throw new Error(
      "useAppNotifications must be used inside AppNotificationProvider."
    );
  }

  return context;
}

/* =========================================================
   URL BRIDGE
========================================================= */

function NotificationUrlBridge({
  notify,
}: {
  notify:
    (
      notification:
        AppNotificationInput
    ) => string;
}) {
  const searchParams =
    useSearchParams();

  const pathname =
    usePathname();

  const router =
    useRouter();

  const lastNoticeRef =
    useRef<
      string
      | null
    >(
      null
    );

  const notice =
    searchParams.get(
      "notice"
    );

  useEffect(
    () => {
      if (
        !notice ||
        notice ===
          lastNoticeRef.current
      ) {
        return;
      }

      lastNoticeRef.current =
        notice;

      const parsed =
        safeParseNotification(
          notice
        );

      if (
        parsed
      ) {
        notify(
          parsed
        );
      }

      const nextParams =
        new URLSearchParams(
          searchParams.toString()
        );

      nextParams.delete(
        "notice"
      );

      const query =
        nextParams.toString();

      router.replace(
        query
          ? `${pathname}?${query}`
          : pathname,
        {
          scroll:
            false,
        }
      );
    },
    [
      notice,
      notify,
      pathname,
      router,
      searchParams,
    ]
  );

  return null;
}

/* =========================================================
   VIEWPORT
========================================================= */

function NotificationViewport({
  notifications,
  dismiss,
  pause,
  resume,
}: {
  notifications:
    AppNotification[];

  dismiss:
    (
      id:
        string
    ) => void;

  pause:
    (
      id:
        string
    ) => void;

  resume:
    (
      id:
        string
    ) => void;
}) {
  if (
    notifications.length ===
    0
  ) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes leadbase-toast-in {
          from {
            opacity: 0;
            transform: translate3d(30px, 0, 0) scale(.985);
          }

          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes leadbase-toast-out {
          from {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }

          to {
            opacity: 0;
            transform: translate3d(18px, 0, 0) scale(.985);
          }
        }

        @keyframes leadbase-toast-progress {
          from {
            transform: scaleX(1);
          }

          to {
            transform: scaleX(0);
          }
        }

        .leadbase-toast-in {
          animation:
            leadbase-toast-in
            240ms
            cubic-bezier(.16, 1, .3, 1)
            both;
        }

        .leadbase-toast-out {
          animation:
            leadbase-toast-out
            180ms
            ease
            both;
        }

        .leadbase-toast-progress {
          animation-name:
            leadbase-toast-progress;

          animation-timing-function:
            linear;

          animation-fill-mode:
            forwards;

          transform-origin:
            left center;
        }

        @media (prefers-reduced-motion: reduce) {
          .leadbase-toast-in,
          .leadbase-toast-out,
          .leadbase-toast-progress {
            animation: none !important;
          }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[120] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[420px]">
        {notifications.map(
          (
            notification
          ) => (
            <NotificationCard
              key={
                notification.id
              }
              notification={
                notification
              }
              dismiss={
                dismiss
              }
              pause={
                pause
              }
              resume={
                resume
              }
            />
          )
        )}
      </div>
    </>
  );
}

/* =========================================================
   CARD
========================================================= */

function NotificationCard({
  notification,
  dismiss,
  pause,
  resume,
}: {
  notification:
    AppNotification;

  dismiss:
    (
      id:
        string
    ) => void;

  pause:
    (
      id:
        string
    ) => void;

  resume:
    (
      id:
        string
    ) => void;
}) {
  const config =
    notification.variant ===
      "success"
      ? {
          Icon:
            CheckCircle2,

          iconClass:
            "text-emerald-600 dark:text-emerald-400",

          borderClass:
            "border-emerald-200/80 dark:border-emerald-900/70",

          progressClass:
            "bg-emerald-500",
        }
      : notification.variant ===
          "warning"
        ? {
            Icon:
              AlertTriangle,

            iconClass:
              "text-amber-600 dark:text-amber-400",

            borderClass:
              "border-amber-200/80 dark:border-amber-900/70",

            progressClass:
              "bg-amber-500",
          }
        : notification.variant ===
            "error"
          ? {
              Icon:
                XCircle,

              iconClass:
                "text-red-600 dark:text-red-400",

              borderClass:
                "border-red-200/80 dark:border-red-900/70",

              progressClass:
                "bg-red-500",
            }
          : {
              Icon:
                Info,

              iconClass:
                "text-blue-600 dark:text-blue-400",

              borderClass:
                "border-blue-200/80 dark:border-blue-900/70",

              progressClass:
                "bg-blue-500",
            };

  const Icon =
    config.Icon;

  return (
    <div
      role={
        notification.variant ===
          "error"
          ? "alert"
          : "status"
      }
      onMouseEnter={
        () =>
          pause(
            notification.id
          )
      }
      onMouseLeave={
        () =>
          resume(
            notification.id
          )
      }
      className={`pointer-events-auto w-full overflow-hidden rounded-xl border bg-background/95 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.35)] backdrop-blur-md ${
        notification.closing
          ? "leadbase-toast-out"
          : "leadbase-toast-in"
      } ${config.borderClass}`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
          <Icon
            className={`size-4 ${config.iconClass}`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {
              notification.title
            }
          </p>

          {notification.description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {
                notification.description
              }
            </p>
          ) : null}

          {notification.items &&
          notification.items.length >
            0 ? (
            <div className="mt-3 space-y-2">
              {notification.items.map(
                (
                  item,
                  index
                ) => {
                  const content = (
                    <>
                      <p className="truncate text-xs font-medium">
                        {
                          item.title
                        }
                      </p>

                      {item.description ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                          {
                            item.description
                          }
                        </p>
                      ) : null}
                    </>
                  );

                  return item.href ? (
                    <Link
                      key={`${item.title}-${index}`}
                      href={
                        item.href
                      }
                      className="block rounded-lg border bg-muted/20 px-2.5 py-2 transition-colors hover:bg-muted/50"
                    >
                      {
                        content
                      }
                    </Link>
                  ) : (
                    <div
                      key={`${item.title}-${index}`}
                      className="rounded-lg border bg-muted/20 px-2.5 py-2"
                    >
                      {
                        content
                      }
                    </div>
                  );
                }
              )}
            </div>
          ) : null}

          {notification.action ? (
            <Link
              href={
                notification.action.href
              }
              className="mt-3 inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              {
                notification.action.label
              }
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          onClick={
            () =>
              dismiss(
                notification.id
              )
          }
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss notification"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {notification.durationMs >
      0 ? (
        <div className="h-[2px] w-full bg-muted/60">
          <div
            className={`leadbase-toast-progress h-full w-full ${config.progressClass}`}
            style={{
              animationDuration:
                `${notification.durationMs}ms`,

              animationPlayState:
                notification.paused
                  ? "paused"
                  : "running",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
