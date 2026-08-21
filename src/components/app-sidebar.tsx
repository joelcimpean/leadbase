"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import {
  BriefcaseBusiness,
  Inbox,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

import {
  logout,
} from "@/app/(app)/actions";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  languageCopy,
  type AppLanguage,
} from "@/lib/i18n";

import {
  cn,
} from "@/lib/utils";

/* =========================================================
   SIDEBAR CONTENT
========================================================= */

function SidebarContent({
  pathname,
  unreadInboxCount,
  onNavigate,
  showCloseButton = false,
}: {
  pathname: string;

  unreadInboxCount: number;

  onNavigate?: () => void;

  showCloseButton?: boolean;
}) {
  const {
    language,
    setLanguage,
  } =
    useLanguage();

  const text =
    languageCopy[
      language
    ].sidebar;

  const navigation = [
    {
      name:
        text.dashboard,

      href: "/",

      icon:
        LayoutDashboard,
    },

    {
      name:
        text.findLeads,

      href:
        "/find-leads",

      icon:
        Search,
    },

    {
      name:
        text.leads,

      href:
        "/leads",

      icon:
        Users,
    },

    {
      name:
        text.campaigns,

      href:
        "/campaigns",

      icon:
        Megaphone,
    },

    {
      name:
        text.projects,

      href:
        "/projects",

      icon:
        BriefcaseBusiness,
    },

    {
      name:
        text.inbox,

      href:
        "/inbox",

      icon:
        Inbox,
    },
  ];

  const unreadLabel =
    unreadInboxCount >
    99
      ? "99+"
      : String(
          unreadInboxCount
        );

  function changeLanguage(
    nextLanguage:
      AppLanguage
  ) {
    setLanguage(
      nextLanguage
    );
  }

  return (
    <>
      {/* ===================================================
          LOGO
      =================================================== */}

      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <Link
          href="/"
          onClick={
            onNavigate
          }
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">
            ⚡︎
          </div>

          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">
              Leadbase
            </p>

            <p className="truncate text-xs text-muted-foreground">
              {
                text.leadWorkspace
              }
            </p>
          </div>
        </Link>

        {showCloseButton ? (
          <button
            type="button"
            onClick={
              onNavigate
            }
            aria-label={
              text.closeNavigation
            }
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        ) : null}
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
                  onClick={
                    onNavigate
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
                    <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-semibold leading-none text-background">
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
          BOTTOM
      =================================================== */}

      <div className="shrink-0 border-t p-3">
        {/* =================================================
            LANGUAGE
        ================================================= */}

        <div className="mb-2 flex h-10 items-center gap-3 rounded-lg px-3">
          <Languages className="size-4 shrink-0 text-muted-foreground" />

          <span className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
            {language ===
            "de"
              ? "Sprache"
              : "Language"}
          </span>

          <div className="flex shrink-0 items-center rounded-md bg-muted p-0.5">
            <button
              type="button"
              onClick={() =>
                changeLanguage(
                  "de"
                )
              }
              aria-pressed={
                language ===
                "de"
              }
              className={cn(
                "flex h-6 min-w-8 items-center justify-center rounded px-1.5 text-[11px] font-semibold transition-colors",

                language ===
                  "de"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              DE
            </button>

            <button
              type="button"
              onClick={() =>
                changeLanguage(
                  "en"
                )
              }
              aria-pressed={
                language ===
                "en"
              }
              className={cn(
                "flex h-6 min-w-8 items-center justify-center rounded px-1.5 text-[11px] font-semibold transition-colors",

                language ===
                  "en"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
          </div>
        </div>

        {/* =================================================
            SETTINGS
        ================================================= */}

        <Link
          href="/settings"
          onClick={
            onNavigate
          }
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
            {
              text.settings
            }
          </span>
        </Link>

        {/* =================================================
            USER
        ================================================= */}

        <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            JC
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              Joel Cimpean
            </p>

            <p className="truncate text-xs text-muted-foreground">
              {
                text.privateWorkspace
              }
            </p>
          </div>
        </div>

        {/* =================================================
            SIGN OUT
        ================================================= */}

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
              {
                text.signOut
              }
            </span>
          </button>
        </form>
      </div>
    </>
  );
}

/* =========================================================
   APP SIDEBAR
========================================================= */

export function AppSidebar({
  unreadInboxCount = 0,
}: {
  unreadInboxCount?: number;
}) {
  const pathname =
    usePathname();

  const {
    language,
  } =
    useLanguage();

  const text =
    languageCopy[
      language
    ].sidebar;

  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(
      false
    );

  useEffect(
    () => {
      setMobileOpen(
        false
      );
    },
    [
      pathname,
    ]
  );

  useEffect(
    () => {
      if (
        !mobileOpen
      ) {
        return;
      }

      function handleKeyDown(
        event:
          KeyboardEvent
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setMobileOpen(
            false
          );
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      mobileOpen,
    ]
  );

  return (
    <>
      {/* ===================================================
          DESKTOP
      =================================================== */}

      <aside className="hidden h-full w-64 shrink-0 flex-col border-r bg-background md:flex">
        <SidebarContent
          pathname={
            pathname
          }
          unreadInboxCount={
            unreadInboxCount
          }
        />
      </aside>

      {/* ===================================================
          MOBILE HEADER
      =================================================== */}

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">
            ⚡︎
          </div>

          <span className="truncate text-sm font-semibold">
            Leadbase
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {unreadInboxCount >
          0 ? (
            <Link
              href="/inbox"
              aria-label={`${unreadInboxCount} ${text.unreadInboxMessages}`}
              className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Inbox className="size-5" />

              <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold leading-4 text-background">
                {unreadInboxCount >
                99
                  ? "99+"
                  : unreadInboxCount}
              </span>
            </Link>
          ) : null}

          <button
            type="button"
            aria-label={
              text.openNavigation
            }
            aria-expanded={
              mobileOpen
            }
            onClick={() =>
              setMobileOpen(
                true
              )
            }
            className="flex size-9 items-center justify-center rounded-lg border bg-background text-foreground transition-colors hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* ===================================================
          MOBILE DRAWER
      =================================================== */}

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={
              text.closeNavigation
            }
            onClick={() =>
              setMobileOpen(
                false
              )
            }
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label={
              text.navigation
            }
            className="relative z-10 flex h-full w-[min(20rem,88vw)] flex-col border-r bg-background shadow-2xl"
          >
            <SidebarContent
              pathname={
                pathname
              }
              unreadInboxCount={
                unreadInboxCount
              }
              showCloseButton
              onNavigate={() =>
                setMobileOpen(
                  false
                )
              }
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}