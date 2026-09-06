import Link from "next/link";

import {
  Bell,
  CheckCheck,
  CircleCheckBig,
  CircleX,
  FileWarning,
  Inbox,
  Trash2,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  clearReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

import {
  cn,
} from "@/lib/utils";

import {
  createClient,
} from "@/lib/supabase/server";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

const berlinFormatter =
  new Intl.DateTimeFormat(
    "de-DE",
    {
      timeZone:
        "Europe/Berlin",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

function notificationIcon(
  kind: string
) {
  if (
    kind ===
    "PROPOSAL_ACCEPTED"
  ) {
    return CircleCheckBig;
  }

  if (
    kind ===
    "PROPOSAL_DECLINED"
  ) {
    return CircleX;
  }

  if (
    kind ===
    "PROPOSAL_PDF_FAILED"
  ) {
    return FileWarning;
  }

  return Bell;
}

function notificationTone(
  kind: string
) {
  if (
    kind ===
    "PROPOSAL_ACCEPTED"
  ) {
    return "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300";
  }

  if (
    kind ===
    "PROPOSAL_DECLINED"
  ) {
    return "border-red-200 bg-red-50/60 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300";
  }

  if (
    kind ===
    "PROPOSAL_PDF_FAILED"
  ) {
    return "border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300";
  }

  return "border-border bg-muted/40 text-foreground";
}

export default async function NotificationsPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data,
    error,
  } = await supabase
    .from("app_notifications")
    .select(`
      id,
      kind,
      title,
      description,
      href,
      read_at,
      created_at
    `)
    .eq(
      "user_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(100);

  if (error) {
    console.error(
      "Could not load notifications:",
      error
    );
  }

  const notifications =
    (data ?? []) as NotificationRow[];

  const unreadCount =
    notifications.filter(
      (item) =>
        !item.read_at
    ).length;

  const hasRead =
    notifications.some(
      (item) =>
        Boolean(item.read_at)
    );

  return (
    <div className="leadbase-workspace-page min-h-full"><WorkspacePageMotion /><div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
      <header data-workspace-reveal className="leadbase-workspace-header flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell className="size-4" />
            Activity Center
          </div>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Benachrichtigungen
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Zusagen, Absagen und wichtige Proposal-Ereignisse landen dauerhaft hier – auch wenn du Leadbase gerade nicht offen hast.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 ? (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className={buttonVariants({
                  variant:
                    "outline",
                  className:
                    "gap-2",
                })}
              >
                <CheckCheck className="size-4" />
                Alle gelesen
              </button>
            </form>
          ) : null}

          {hasRead ? (
            <form action={clearReadNotifications}>
              <button
                type="submit"
                className={buttonVariants({
                  variant:
                    "ghost",
                  className:
                    "gap-2 text-muted-foreground",
                })}
              >
                <Trash2 className="size-4" />
                Gelesene löschen
              </button>
            </form>
          ) : null}
        </div>
      </header>

      <div data-workspace-reveal className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="leadbase-workspace-card leadbase-workspace-stat rounded-2xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Neu</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-primary">{unreadCount}</p>
        </div>
        <div className="leadbase-workspace-card leadbase-workspace-stat rounded-2xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Insgesamt</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{notifications.length}</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div data-workspace-reveal className="leadbase-workspace-empty mt-8 rounded-3xl border border-dashed p-10 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-muted">
            <Inbox className="size-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-sm font-semibold">
            Noch keine Benachrichtigungen
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            Sobald ein Kunde ein Angebot annimmt oder ablehnt, erscheint das Ereignis hier.
          </p>
        </div>
      ) : (
        <div data-workspace-reveal className="leadbase-workspace-table mt-6">
          {notifications.map(
            (
              notification,
              index
            ) => {
              const Icon =
                notificationIcon(
                  notification.kind
                );

              const unread =
                !notification.read_at;

              return (
                <article
                  key={notification.id}
                  className={cn(
                    "relative flex gap-4 px-4 py-4 sm:px-5",
                    index > 0 &&
                      "border-t",
                    unread &&
                      "bg-primary/[0.035]"
                  )}
                >
                  {unread ? (
                    <span className="absolute left-0 top-0 h-full w-1 bg-primary" />
                  ) : null}

                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                      notificationTone(
                        notification.kind
                      )
                    )}
                  >
                    <Icon className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2 className="text-sm font-semibold">
                        {notification.title}
                      </h2>

                      {unread ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          Neu
                        </span>
                      ) : null}
                    </div>

                    {notification.description ? (
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {notification.description}
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs text-muted-foreground">
                      {berlinFormatter.format(
                        new Date(
                          notification.created_at
                        )
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end justify-center gap-2 sm:flex-row sm:items-center">
                    {notification.href ? (
                      <Link
                        href={`/notifications/open?id=${encodeURIComponent(
                          notification.id
                        )}`}
                        className={buttonVariants({
                          variant:
                            unread
                              ? "default"
                              : "outline",
                          size:
                            "sm",
                        })}
                      >
                        Öffnen
                      </Link>
                    ) : null}

                    {unread ? (
                      <form action={markNotificationRead}>
                        <input
                          type="hidden"
                          name="id"
                          value={notification.id}
                        />
                        <button
                          type="submit"
                          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Gelesen
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div></div>
  );
}
