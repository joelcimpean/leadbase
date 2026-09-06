"use client";

import {
  useEffect,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useAppNotifications,
} from "@/components/app-notifications";

import {
  createClient,
} from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  href: string | null;
};

function variantForKind(
  kind: string
) {
  if (
    kind ===
    "PROPOSAL_ACCEPTED"
  ) {
    return "success" as const;
  }

  if (
    kind ===
    "PROPOSAL_DECLINED" ||
    kind ===
    "PROPOSAL_PDF_FAILED"
  ) {
    return "warning" as const;
  }

  return "info" as const;
}

export function NotificationRealtimeBridge({
  userId,
}: {
  userId: string;
}) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const {
    notify,
  } =
    useAppNotifications();

  useEffect(
    () => {
      const supabase =
        createClient();

      let refreshTimer:
        number | null =
          null;

      function broadcastChange() {
        window.dispatchEvent(
          new Event(
            "leadbase:persistent-notifications-changed"
          )
        );

        if (
          pathname.startsWith(
            "/notifications"
          )
        ) {
          if (refreshTimer) {
            window.clearTimeout(
              refreshTimer
            );
          }

          refreshTimer =
            window.setTimeout(
              () => {
                router.refresh();
              },
              120
            );
        }
      }

      const channel =
        supabase
          .channel(
            `leadbase-notifications-${userId}`
          )
          .on(
            "postgres_changes",
            {
              event:
                "INSERT",
              schema:
                "public",
              table:
                "app_notifications",
              filter:
                `user_id=eq.${userId}`,
            },
            (payload) => {
              const row =
                payload.new as
                  NotificationRow;

              broadcastChange();

              notify({
                variant:
                  variantForKind(
                    row.kind
                  ),
                title:
                  row.title,
                description:
                  row.description ??
                  undefined,
                action:
                  row.href
                    ? {
                        label:
                          "Öffnen",
                        href:
                          row.href,
                      }
                    : undefined,
                durationMs:
                  10_000,
              });
            }
          )
          .on(
            "postgres_changes",
            {
              event:
                "UPDATE",
              schema:
                "public",
              table:
                "app_notifications",
              filter:
                `user_id=eq.${userId}`,
            },
            () => {
              broadcastChange();
            }
          )
          .subscribe();

      return () => {
        if (refreshTimer) {
          window.clearTimeout(
            refreshTimer
          );
        }

        void supabase.removeChannel(
          channel
        );
      };
    },
    [
      notify,
      pathname,
      router,
      userId,
    ]
  );

  return null;
}
