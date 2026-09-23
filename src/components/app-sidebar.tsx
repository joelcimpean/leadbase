"use client";

import Link from "next/link";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import type { User } from "@supabase/supabase-js";

import {
  Bell,
  BriefcaseBusiness,
  FileText,
  Inbox,
  Languages,
  LayoutDashboard,
  Menu,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Sparkles,
  Users,
  UserRound,
  X,
  BarChart3,
} from "lucide-react";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  languageCopy,
  type AppLanguage,
} from "@/lib/i18n";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  LeadbaseLogo,
} from "@/components/leadbase-logo";

import {
  cn,
} from "@/lib/utils";


import { normalizePlanId, type LeadbasePlanId } from "@/lib/plan-entitlements";
type SidebarCampaign = {
  id: string;
  name: string;
  status: string | null;
  target_industry: string | null;
  target_geography: string | null;
  leadCount: number;
};

function campaignStatusText(
  status: string | null,
  language: AppLanguage
) {
  switch (status) {
    case "ACTIVE":
      return language === "de"
        ? "Aktiv"
        : "Active";
    case "PAUSED":
      return language === "de"
        ? "Pausiert"
        : "Paused";
    case "DRAFT":
      return language === "de"
        ? "Entwurf"
        : "Draft";
    default:
      return language === "de"
        ? "Kampagne"
        : "Campaign";
  }
}

function campaignEyebrow(
  status: string | null,
  language: AppLanguage
) {
  switch (status) {
    case "ACTIVE":
      return language === "de"
        ? "Kampagne aktiv"
        : "Campaign active";
    case "PAUSED":
      return language === "de"
        ? "Kampagne pausiert"
        : "Campaign paused";
    default:
      return language === "de"
        ? "Kampagne"
        : "Campaign";
  }
}

function SidebarContent({
  pathname,
  unreadInboxCount,
  unreadNotificationCount,
  leadCount,
  activeCampaign,
  onNavigate,
  showCloseButton = false,
  collapsed = false,
  onCollapsedChange,
}: {
  pathname: string;
  unreadInboxCount: number;
  unreadNotificationCount: number;
  leadCount: number;
  activeCampaign: SidebarCampaign | null;
  onNavigate?: () => void;
  showCloseButton?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (
    value:
      boolean
  ) => void;
}) {
  const {
    language,
    setLanguage,
  } =
    useLanguage();

  // Kept in the public sidebar API for existing callers, but Lead count is
  // intentionally no longer rendered in the navigation.
  void leadCount;

  const text =
    languageCopy[
      language
    ].sidebar;

  const [profileIdentity, setProfileIdentity] = useState<{ name: string; avatarUrl: string | null }>({
    name: "Leadbase user",
    avatarUrl: null,
  });
  const [creditUsage, setCreditUsage] = useState<number | null>(null);
  const [rawTokenUsage, setRawTokenUsage] = useState<number | null>(null);
  const [openAIUsageConfigured, setOpenAIUsageConfigured] = useState<boolean | null>(null);
  const [creditRemaining, setCreditRemaining] = useState<number | null>(null);
  const [planId, setPlanId] = useState<LeadbasePlanId>("free");

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let usageChannel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: number | null = null;
    let currentUserId: string | null = null;
    let attachSequence = 0;

    function clearUsage() {
      setCreditUsage(null);
      setRawTokenUsage(null);
      setCreditRemaining(null);
      setOpenAIUsageConfigured(null);
      setPlanId("free");
    }

    async function loadUsage(userId: string) {
      try {
        const response = await fetch(
          `/api/profile/openai-usage?uid=${encodeURIComponent(userId)}&ts=${Date.now()}`,
          { cache: "no-store" },
        );
        const data = await response.json() as {
          configured?: boolean;
          totals?: { creditsUsed?: number; totalTokens?: number };
          plan?: { id?: string; remainingCredits?: number };
        };
        if (cancelled || currentUserId !== userId) return;
        const creditsUsed = typeof data.totals?.creditsUsed === "number" ? data.totals.creditsUsed : null;
        const totalTokens = typeof data.totals?.totalTokens === "number" ? data.totals.totalTokens : null;
        const remainingCredits = typeof data.plan?.remainingCredits === "number" ? data.plan.remainingCredits : null;
        const configured = data.configured === true && creditsUsed !== null && remainingCredits !== null;
        setCreditUsage(creditsUsed);
        setRawTokenUsage(totalTokens);
        setCreditRemaining(remainingCredits);
        setPlanId(normalizePlanId(data.plan?.id));
        setOpenAIUsageConfigured(configured);
        window.dispatchEvent(new CustomEvent("leadbase:ai-usage-updated", { detail: { creditsUsed, remainingCredits, userId } }));
      } catch {
        if (!cancelled && currentUserId === userId) setOpenAIUsageConfigured(false);
      }
    }

    async function detachUsageListeners() {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (usageChannel) {
        await supabase.removeChannel(usageChannel);
        usageChannel = null;
      }
    }

    async function attachUser(user: User | null) {
      const sequence = ++attachSequence;
      await detachUsageListeners();
      if (cancelled || sequence !== attachSequence) return;

      currentUserId = user?.id ?? null;
      clearUsage();

      if (!user) {
        setProfileIdentity({ name: "Leadbase", avatarUrl: null });
        return;
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const stored = (metadata.leadbase_profile ?? {}) as Record<string, unknown>;
      const name =
        (typeof stored.fullName === "string" && stored.fullName.trim()) ||
        (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
        (typeof metadata.name === "string" && metadata.name.trim()) ||
        user.email?.split("@")[0] ||
        "Leadbase";
      const avatarUrl = typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;
      setProfileIdentity({ name, avatarUrl });

      await loadUsage(user.id);
      if (cancelled || sequence !== attachSequence || currentUserId !== user.id) return;

      // A user switch can trigger initialize() and onAuthStateChange almost at the
      // same time. Supabase reuses channels with the same topic, so a second
      // attach could try to add postgres_changes after the first channel had
      // already subscribed. Use a unique topic for every attachment.
      const usageChannelTopic = `leadbase-ai-usage-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      usageChannel = supabase
        .channel(usageChannelTopic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ai_usage_events",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void loadUsage(user.id);
          },
        )
        .subscribe();

      pollTimer = window.setInterval(() => {
        if (document.visibilityState === "visible" && currentUserId === user.id) {
          void loadUsage(user.id);
        }
      }, 15_000);
    }

    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();
      await attachUser(user);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // AppShell can stay mounted across sign-out/sign-in. Reset immediately so
      // the next account never sees the previous account's token total.
      void attachUser(session?.user ?? null);
    });

    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<{ name?: string; avatarUrl?: string | null }>).detail;
      setProfileIdentity((current) => ({
        name: detail?.name || current.name,
        avatarUrl: detail && "avatarUrl" in detail ? detail.avatarUrl ?? null : current.avatarUrl,
      }));
    }

    void initialize();
    window.addEventListener("leadbase:profile-updated", handleProfileUpdated);
    return () => {
      cancelled = true;
      currentUserId = null;
      window.removeEventListener("leadbase:profile-updated", handleProfileUpdated);
      authListener.subscription.unsubscribe();
      if (pollTimer !== null) window.clearInterval(pollTimer);
      if (usageChannel) void supabase.removeChannel(usageChannel);
    };
  }, []);

  const profileInitials = profileIdentity.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "JC";

  const compactCreditsUsed = creditUsage === null
    ? null
    : creditUsage >= 1_000_000
      ? `${(creditUsage / 1_000_000).toFixed(1)}M`
      : creditUsage >= 1_000
        ? `${Math.round(creditUsage / 1_000)}K`
        : String(creditUsage);

  const compactCreditsRemaining = creditRemaining === null
    ? null
    : creditRemaining >= 1_000_000
      ? `${(creditRemaining / 1_000_000).toFixed(1)}M`
      : creditRemaining >= 1_000
        ? `${Math.round(creditRemaining / 1_000)}K`
        : String(creditRemaining);

  const creditPool =
    creditUsage !== null && creditRemaining !== null
      ? creditUsage + creditRemaining
      : null;

  const usagePercent =
    creditUsage !== null && creditPool !== null && creditPool > 0
      ? Math.min(100, Math.max(0, (creditUsage / creditPool) * 100))
      : creditUsage && creditUsage > 0
        ? 100
        : 0;

  const usagePercentLabel =
    usagePercent > 0 && usagePercent < 1
      ? "<1%"
      : `${Math.round(usagePercent)}%`;

  const usageTooltip = [
    creditUsage !== null
      ? language === "de"
        ? `${creditUsage.toLocaleString("de-DE")} Credits verbraucht`
        : `${creditUsage.toLocaleString("en-US")} Credits used`
      : null,
    rawTokenUsage !== null
      ? language === "de"
        ? `${rawTokenUsage.toLocaleString("de-DE")} AI-Tokens verarbeitet`
        : `${rawTokenUsage.toLocaleString("en-US")} AI tokens processed`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const navigation = [
    {
      key: "dashboard",
      name: text.dashboard,
      href: "/",
      icon: LayoutDashboard,
    },
    {
      key: "find-leads",
      name: text.findLeads,
      href: "/find-leads",
      icon: Search,
    },
    {
      key: "leads",
      name: text.leads,
      href: "/leads",
      icon: Users,
    },
    {
      key: "campaigns",
      name: text.campaigns,
      href: "/campaigns",
      icon: Megaphone,
    },
    {
      key: "projects",
      name: text.projects,
      href: "/projects",
      icon: BriefcaseBusiness,
    },
    {
      key: "proposals",
      name:
        language === "de"
          ? "Angebote"
          : "Proposals",
      href: "/proposals",
      icon: FileText,
    },
    {
      key: "inbox",
      name: text.inbox,
      href: "/inbox",
      icon: Inbox,
      hasDot:
        unreadInboxCount > 0,
      count:
        undefined,
    },
    {
      key: "notifications",
      name:
        language === "de"
          ? "Benachrichtigungen"
          : "Notifications",
      href: "/notifications",
      icon: Bell,
      hasDot:
        unreadNotificationCount > 0,
      count:
        undefined,
    },
    {
      key: "analytics",
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
    },
  ];

  function changeLanguage(
    nextLanguage: AppLanguage
  ) {
    setLanguage(
      nextLanguage
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex h-[66px] shrink-0 items-center",
          showCloseButton
            ? "justify-between px-5"
            : "justify-start px-[19px]"
        )}
      >
        <LeadbaseLogo
          subtitle={
            language === "de"
              ? "Vom Lead zum Kunden"
              : "From lead to client"
          }
          compact={
            collapsed
          }
          onNavigate={
            onNavigate
          }
          className=""
        />

        {showCloseButton ? (
          <button
            type="button"
            onClick={
              onNavigate
            }
            aria-label={
              text.closeNavigation
            }
            className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-[var(--lb-text-muted)] transition-colors hover:bg-black/[0.04] hover:text-[var(--lb-text)] dark:text-[#AEB2BA] dark:hover:bg-white/[0.05] dark:hover:text-white"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-3 pt-0">
        <div className="space-y-[2px]">
          {navigation
            .map(
            (
              item
            ) => {
              const Icon =
                item.icon;

              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(
                      item.href
                    );

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
                  title={
                    collapsed
                      ? item.name
                      : undefined
                  }
                  data-leadbase-tour={item.key}
                  className={cn(
                    "relative flex h-9 items-center gap-[10px] overflow-hidden rounded-[10px] px-[10px] text-[13.5px] font-medium leading-[1.4] transition-colors duration-150",
                    isActive
                      ? "bg-primary text-white"
                      : "text-[var(--lb-text-secondary)] hover:bg-black/[0.045] hover:text-[var(--lb-text)] dark:text-[#AEB2BA] dark:hover:bg-white/[0.05] dark:hover:text-white"
                  )}
                >
                  <Icon className={cn(
                    "size-4 shrink-0",
                    isActive ? "opacity-100" : "opacity-60"
                  )} />

                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate py-px pr-7 leading-[1.4] transition-opacity duration-100",
                      collapsed
                        ? "pointer-events-none opacity-0"
                        : "opacity-100"
                    )}
                  >
                    {item.name}
                  </span>

                  {typeof item.count === "number" && item.count > 0 && !collapsed ? (
                    <span
                      className={cn(
                        "absolute right-[10px] top-1/2 -translate-y-1/2 font-mono text-[9px] tabular-nums",
                        isActive
                          ? "text-white/80"
                          : "text-[var(--lb-text-muted)] dark:text-[#8C9199]"
                      )}
                    >
                      {item.count > 999 ? "999+" : item.count}
                    </span>
                  ) : null}

                  {item.hasDot ? (
                    <span
                      className={cn(
                        "size-[6px] shrink-0 rounded-full bg-primary",
                        collapsed
                          ? "absolute right-1.5 top-1.5 ring-2 ring-[var(--sidebar)]"
                          : ""
                      )}
                    />
                  ) : null}
                </Link>
              );
            }
          )}
        </div>

        {activeCampaign ? (
          <Link
            href={`/campaigns/${activeCampaign.id}`}
            onClick={onNavigate}
            className={cn(
              "block overflow-hidden rounded-[14px] border bg-white px-[14px] shadow-[0_1px_2px_rgba(11,12,14,0.02)] transition-[max-height,margin,opacity,border-color,padding-top,padding-bottom] duration-200 ease-out dark:bg-[#111216]",
              collapsed
                ? "pointer-events-none mt-0 max-h-0 border-transparent py-0 opacity-0"
                : "mt-7 max-h-40 border-black/[0.07] py-[13px] opacity-100 hover:border-black/[0.10] dark:border-white/10 dark:hover:bg-white/[0.03]"
            )}
          >
            <div className="font-mono text-[8px] uppercase tracking-[0.11em] text-[var(--lb-text-muted)] dark:text-[#8C9199]">
              {campaignEyebrow(
                activeCampaign.status,
                language
              )}
            </div>

            <div className="mt-[7px] line-clamp-2 text-[12.5px] font-medium tracking-[-0.01em] text-[var(--lb-text)] dark:text-white">
              {activeCampaign.name}
            </div>

            <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.max(18, Math.min(100, activeCampaign.leadCount))}%`,
                }}
              />
            </div>

            <div className="mt-[9px] flex items-center justify-between gap-2 text-[10px] text-[var(--lb-text-muted)] dark:text-[#8C9199]">
              <span className="truncate">{activeCampaign.leadCount} {language === "de" ? "Leads" : "leads"}</span>
              <span className="truncate">{campaignStatusText(activeCampaign.status, language)}</span>
            </div>
          </Link>
        ) : null}
      </nav>

      <div className="shrink-0 px-4 pb-4 pt-2">
        <Link
          href="/profile#ai-usage"
          onClick={onNavigate}
          title={collapsed ? "Credits" : undefined}
          className={cn(
            "mt-2 block overflow-hidden rounded-[12px] border bg-white shadow-[0_1px_2px_rgba(11,12,14,0.02)] transition-[max-height,padding,opacity,border-color] duration-200 ease-out dark:bg-[#111216]",
            collapsed
              ? "max-h-9 border-transparent p-0 opacity-100"
              : "max-h-[78px] border-black/[0.07] px-[10px] py-[9px] opacity-100 hover:border-primary/35 dark:border-white/10"
          )}
        >
          {collapsed ? (
            <div className="flex size-9 items-center justify-center rounded-[10px] text-primary transition-colors hover:bg-black/[0.045] dark:hover:bg-white/[0.05]">
              <Sparkles className="size-4" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-[7px]">
                <Sparkles className="size-3 shrink-0 text-primary" />
                <span className="text-[11.5px] font-medium leading-[1.3] text-[var(--lb-text-secondary)] dark:text-[#AEB2BA]">
                  {language === "de" ? "Credits" : "Credits"}
                </span>
                <span className="ml-auto font-mono text-[10px] tabular-nums text-[var(--lb-text-muted)] dark:text-[#8C9199]">
                  {compactCreditsRemaining !== null ? `${compactCreditsRemaining} ${language === "de" ? "übrig" : "left"}` : (openAIUsageConfigured === false ? "Setup" : "0")}
                </span>
              </div>
              <div className="mt-[7px] h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${usagePercent}%` }} />
              </div>
              <div className="mt-[6px] flex items-center justify-between gap-2 font-mono text-[8.5px] uppercase tracking-[0.06em] text-[var(--lb-text-muted)] dark:text-[#8C9199]">
                <span title={usageTooltip || undefined}>
                  {language === "de"
                    ? `${usagePercentLabel} verbraucht`
                    : `${usagePercentLabel} used`}
                </span>
                <span>{language === "de" ? "So funktioniert’s" : "How it works"}</span>
              </div>
            </>
          )}
        </Link>

        <div ref={accountMenuRef} className="relative mt-2">
          {accountMenuOpen ? (
            <div
              role="menu"
              aria-label={language === "de" ? "Konto-Menü" : "Account menu"}
              className={cn(
                "z-50 w-[199px] overflow-hidden rounded-[12px] border border-black/[0.08] bg-white p-1.5 shadow-[0_18px_38px_-18px_rgba(11,12,14,0.28)] dark:border-white/10 dark:bg-[#111216]",
                collapsed
                  ? "fixed bottom-[31px] left-[84px]"
                  : "absolute bottom-[calc(100%+8px)] left-0"
              )}
            >
              <Link
                href="/profile"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onNavigate?.();
                }}
                role="menuitem"
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-[12.5px] font-medium transition-colors",
                  pathname.startsWith("/profile")
                    ? "bg-[#EAEEFB] text-primary dark:bg-primary/15"
                    : "text-[var(--lb-text-secondary)] hover:bg-black/[0.045] hover:text-[var(--lb-text)] dark:text-[#AEB2BA] dark:hover:bg-white/[0.05] dark:hover:text-white"
                )}
              >
                <UserRound className="size-4 shrink-0 opacity-70" />
                <span>{language === "de" ? "Profil" : "Profile"}</span>
              </Link>

              <Link
                href="/settings"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onNavigate?.();
                }}
                role="menuitem"
                className={cn(
                  "mt-0.5 flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-[12.5px] font-medium transition-colors",
                  pathname.startsWith("/settings")
                    ? "bg-[#EAEEFB] text-primary dark:bg-primary/15"
                    : "text-[var(--lb-text-secondary)] hover:bg-black/[0.045] hover:text-[var(--lb-text)] dark:text-[#AEB2BA] dark:hover:bg-white/[0.05] dark:hover:text-white"
                )}
              >
                <Settings className="size-4 shrink-0 opacity-70" />
                <span>{text.settings}</span>
              </Link>

              <div className="my-1.5 h-px bg-black/[0.07] dark:bg-white/[0.08]" />

              <div className="flex min-h-10 items-center gap-2.5 rounded-[8px] px-2.5">
                <Languages className="size-4 shrink-0 text-[var(--lb-text-muted)] dark:text-[#8C9199]" />
                <span className="min-w-0 flex-1 text-[12.5px] font-medium text-[var(--lb-text-secondary)] dark:text-[#AEB2BA]">
                  {language === "de" ? "Sprache" : "Language"}
                </span>
                <div className="flex shrink-0 items-center rounded-[8px] bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => changeLanguage("de")}
                    aria-pressed={language === "de"}
                    className={cn(
                      "flex h-5 min-w-7 items-center justify-center rounded-[6px] px-1.5 font-mono text-[9px] uppercase tracking-[0.04em] transition-colors",
                      language === "de"
                        ? "bg-white text-[var(--lb-text)] shadow-[0_1px_2px_rgba(11,12,14,0.10)] dark:bg-[#1A1B20] dark:text-white"
                        : "text-[var(--lb-text-muted)] hover:text-[var(--lb-text)] dark:text-[#8C9199] dark:hover:text-white"
                    )}
                  >
                    DE
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLanguage("en")}
                    aria-pressed={language === "en"}
                    className={cn(
                      "flex h-5 min-w-7 items-center justify-center rounded-[6px] px-1.5 font-mono text-[9px] uppercase tracking-[0.04em] transition-colors",
                      language === "en"
                        ? "bg-white text-[var(--lb-text)] shadow-[0_1px_2px_rgba(11,12,14,0.10)] dark:bg-[#1A1B20] dark:text-white"
                        : "text-[var(--lb-text-muted)] hover:text-[var(--lb-text)] dark:text-[#8C9199] dark:hover:text-white"
                    )}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            data-leadbase-tour="account"
            onClick={() => setAccountMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            className={cn(
              "relative flex h-10 items-center overflow-hidden rounded-[12px] border text-left shadow-[0_1px_2px_rgba(11,12,14,0.02)] transition-[width,border-radius,background-color,border-color] duration-200 ease-out",
              pathname.startsWith("/profile") || accountMenuOpen
                ? "border-primary/20 bg-[#EAEEFB] dark:border-primary/35 dark:bg-primary/15"
                : "border-black/[0.07] bg-white hover:border-primary/35 dark:border-white/10 dark:bg-[#111216]",
              collapsed ? "w-9.5" : "w-[200px]"
            )}
            title={collapsed ? profileIdentity.name : undefined}
          >
            <div className="ml-1 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#0B0C0E] font-mono text-[9px] font-medium text-white dark:bg-white dark:text-black">
              {profileIdentity.avatarUrl ? (
                <img src={profileIdentity.avatarUrl} alt="" className="size-full object-cover" />
              ) : profileInitials}
            </div>

            <div
              className={cn(
                "ml-3 min-w-[112px] flex-1 overflow-hidden transition-opacity duration-100",
                collapsed ? "pointer-events-none opacity-0" : "opacity-100"
              )}
            >
              <p className="truncate text-[11.5px] font-medium leading-[1.25] tracking-[-0.01em] text-[var(--lb-text)] dark:text-white">
                {profileIdentity.name}
              </p>
              <p className="mt-0.5 truncate text-[9.5px] leading-[1.25] text-[var(--lb-text-muted)] dark:text-[#8C9199]">
                {text.privateWorkspace}
              </p>
            </div>

            <ChevronRight
              className={cn(
                "mr-2 size-3.5 shrink-0 text-primary transition-[opacity,transform] duration-150",
                collapsed ? "pointer-events-none opacity-0" : "opacity-100",
                accountMenuOpen ? "-rotate-90" : "rotate-0"
              )}
            />
          </button>
        </div>
      </div>
    </>
  );
}

export function AppSidebar({
  userId = null,
  unreadInboxCount = 0,
  unreadNotificationCount = 0,
  leadCount = 0,
  activeCampaign = null,
}: {
  userId?: string | null;
  unreadInboxCount?: number;
  unreadNotificationCount?: number;
  leadCount?: number;
  activeCampaign?: SidebarCampaign | null;
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
    liveUnreadNotificationCount,
    setLiveUnreadNotificationCount,
  ] =
    useState(
      unreadNotificationCount
    );

  useEffect(
    () => {
      setLiveUnreadNotificationCount(
        unreadNotificationCount
      );
    },
    [
      unreadNotificationCount,
    ]
  );

  useEffect(
    () => {
      if (!userId) {
        return;
      }

      let cancelled =
        false;

      async function refreshNotificationCount() {
        const supabase =
          createClient();

        const {
          count,
          error,
        } = await supabase
          .from(
            "app_notifications"
          )
          .select(
            "id",
            {
              count:
                "exact",
              head:
                true,
            }
          )
          .eq(
            "user_id",
            userId
          )
          .is(
            "read_at",
            null
          );

        if (error) {
          console.error(
            "Could not refresh live notification count:",
            error
          );
          return;
        }

        if (!cancelled) {
          setLiveUnreadNotificationCount(
            count ?? 0
          );
        }
      }

      function handleChange() {
        void refreshNotificationCount();
      }

      window.addEventListener(
        "leadbase:persistent-notifications-changed",
        handleChange
      );

      return () => {
        cancelled = true;

        window.removeEventListener(
          "leadbase:persistent-notifications-changed",
          handleChange
        );
      };
    },
    [
      userId,
    ]
  );

  const [
    collapsed,
    setCollapsed,
  ] =
    useState(
      false
    );

  const [
    sidebarReady,
    setSidebarReady,
  ] =
    useState(
      false
    );

  useEffect(
    () => {
      const storedCollapsed =
        window.localStorage.getItem(
          "leadbase.sidebar.collapsed"
        ) ===
        "1";

      setCollapsed(
        storedCollapsed
      );

      const frame =
        window.requestAnimationFrame(
          () => {
            setSidebarReady(
              true
            );
          }
        );

      return () => {
        window.cancelAnimationFrame(
          frame
        );
      };
    },
    []
  );

  function updateCollapsed(
    value:
      boolean
  ) {
    setCollapsed(
      value
    );

    window.localStorage.setItem(
      "leadbase.sidebar.collapsed",
      value
        ? "1"
        : "0"
    );
  }

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
      if (!mobileOpen) {
        return;
      }

      function handleKeyDown(
        event: KeyboardEvent
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
      <aside
        data-collapsed={
          collapsed
            ? "true"
            : "false"
        }
        className={cn(
          "relative hidden h-full shrink-0 flex-col border-r border-black/[0.07] bg-[var(--sidebar)] will-change-[width] dark:border-white/[0.08] md:flex",
          sidebarReady
            ? "transition-[width] duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
            : "transition-none",
          collapsed
            ? "w-[68px]"
            : "w-[232px]"
        )}
      >
        <div className="flex h-full min-w-0 flex-col overflow-hidden">
          <SidebarContent
            pathname={pathname}
            unreadInboxCount={unreadInboxCount}
            unreadNotificationCount={liveUnreadNotificationCount}
            leadCount={leadCount}
            activeCampaign={activeCampaign}
            collapsed={
              collapsed
            }
            onCollapsedChange={
              updateCollapsed
            }
          />
        </div>

        <button
          type="button"
          onClick={() =>
            updateCollapsed(
              !collapsed
            )
          }
          aria-label={
            collapsed
              ? language === "de"
                ? "Sidebar aufklappen"
                : "Expand sidebar"
              : language === "de"
                ? "Sidebar zuklappen"
                : "Collapse sidebar"
          }
          title={
            collapsed
              ? language === "de"
                ? "Sidebar aufklappen"
                : "Expand sidebar"
              : language === "de"
                ? "Sidebar zuklappen"
                : "Collapse sidebar"
          }
          className="absolute -right-[11px] top-1/2 z-30 flex size-[22px] -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--lb-page)] bg-primary text-white shadow-[0_5px_14px_rgba(0,43,186,0.24)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:scale-110 hover:bg-[#001E85] hover:shadow-[0_7px_18px_rgba(0,43,186,0.30)] active:scale-95"
        >
          {collapsed ? (
            <ChevronRight className="size-3" />
          ) : (
            <ChevronLeft className="size-3" />
          )}
        </button>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-black/[0.07] bg-[#FBFBFC]/95 px-4 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0D0E11]/95 md:hidden">
        <LeadbaseLogo compact />

        <div className="flex items-center gap-2">
          {liveUnreadNotificationCount > 0 ? (
            <Link
              href="/notifications"
              aria-label={`${liveUnreadNotificationCount} Benachrichtigungen`}
              className="relative flex size-9 items-center justify-center rounded-[10px] text-[var(--lb-text-muted)] transition-colors hover:bg-black/[0.04] hover:text-[var(--lb-text)] dark:text-[#AEB2BA] dark:hover:bg-white/[0.05] dark:hover:text-white"
            >
              <Bell className="size-5" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
            </Link>
          ) : null}

          {unreadInboxCount > 0 ? (
            <Link
              href="/inbox"
              aria-label={`${unreadInboxCount} ${text.unreadInboxMessages}`}
              className="relative flex size-9 items-center justify-center rounded-[10px] text-[var(--lb-text-muted)] transition-colors hover:bg-black/[0.04] hover:text-[var(--lb-text)] dark:text-[#AEB2BA] dark:hover:bg-white/[0.05] dark:hover:text-white"
            >
              <Inbox className="size-5" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
            </Link>
          ) : null}

          <button
            type="button"
            aria-label={text.openNavigation}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="flex size-9 items-center justify-center rounded-[10px] border border-black/[0.08] bg-white text-[var(--lb-text)] shadow-[0_1px_2px_rgba(11,12,14,0.03)] transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:bg-[#111216] dark:text-white dark:hover:bg-white/[0.05]"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={text.closeNavigation}
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label={text.navigation}
            className="relative z-10 flex h-full w-[min(20rem,88vw)] flex-col border-r border-black/[0.07] bg-[#FBFBFC] shadow-2xl dark:border-white/[0.08] dark:bg-[#0D0E11]"
          >
            <SidebarContent
              pathname={pathname}
              unreadInboxCount={unreadInboxCount}
              unreadNotificationCount={liveUnreadNotificationCount}
              leadCount={leadCount}
              activeCampaign={activeCampaign}
              collapsed={
                false
              }
              showCloseButton
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
