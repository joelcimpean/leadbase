"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  Settings,
  Users,
} from "lucide-react";

import {
  logout,
} from "@/app/(app)/actions";

import {
  cn,
} from "@/lib/utils";

/* =========================================================
   NAVIGATION
========================================================= */

const navigation = [
  {
    name:
      "Dashboard",

    href:
      "/",

    icon:
      LayoutDashboard,
  },

  {
    name:
      "Find Leads",

    href:
      "/find-leads",

    icon:
      Search,
  },

  {
    name:
      "Leads",

    href:
      "/leads",

    icon:
      Users,
  },

  {
    name:
      "Campaigns",

    href:
      "/campaigns",

    icon:
      Megaphone,
  },

  {
    name:
      "Inbox",

    href:
      "/inbox",

    icon:
      Inbox,
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export function AppSidebar({
  unreadInboxCount = 0,
}: {
  unreadInboxCount?: number;
}) {
  const pathname =
    usePathname();

  const unreadLabel =
    unreadInboxCount >
    99
      ? "99+"
      : String(
          unreadInboxCount
        );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-background">
      {/* ===================================================
          LOGO
      =================================================== */}

      <div className="shrink-0 border-b px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">
            J
          </div>

          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">
              Joel Leados
            </p>

            <p className="truncate text-xs text-muted-foreground">
              Lead workspace
            </p>
          </div>
        </Link>
      </div>

      {/* ===================================================
          MAIN NAVIGATION
      =================================================== */}

      <nav className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {navigation.map(
            (
              item
            ) => {
              const Icon =
                item.icon;

              const isActive =
                item.href ===
                "/"
                  ? pathname ===
                    "/"
                  : pathname.startsWith(
                      item.href
                    );

              const isInbox =
                item.href ===
                "/inbox";

              return (
                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",

                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />

                  <span className="min-w-0 flex-1 truncate">
                    {
                      item.name
                    }
                  </span>

                  {isInbox &&
                  unreadInboxCount >
                    0 ? (
                    <span
                      className={cn(
                        "flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",

                        isActive
                          ? "bg-foreground text-background"
                          : "bg-foreground text-background"
                      )}
                    >
                      {
                        unreadLabel
                      }
                    </span>
                  ) : null}
                </Link>
              );
            }
          )}
        </div>
      </nav>

      {/* ===================================================
          BOTTOM AREA
      =================================================== */}

      <div className="shrink-0 border-t p-3">
        <Link
          href="/settings"
          className={cn(
            "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",

            pathname.startsWith(
              "/settings"
            )
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          )}
        >
          <Settings className="size-4 shrink-0" />

          <span>
            Settings
          </span>
        </Link>

        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            JC
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              Joel Cimpean
            </p>

            <p className="truncate text-xs text-muted-foreground">
              Private workspace
            </p>
          </div>
        </div>

        <form
          action={
            logout
          }
        >
          <button
            type="submit"
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <LogOut className="size-4 shrink-0" />

            <span>
              Sign out
            </span>
          </button>
        </form>
      </div>
    </aside>
  );
}