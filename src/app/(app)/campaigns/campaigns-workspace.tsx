"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Flame,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Search,
  Users,
  WandSparkles,
} from "lucide-react";

import {
  updateCampaignStatus,
} from "./actions";

import {
  generateLeadOutreachDraftForBulk,
} from "@/app/(app)/leads/outreach-actions";

import {
  CampaignCreateDialog,
} from "@/components/quick-create-dialogs";

/* =========================================================
   TYPES
========================================================= */

export type CampaignWorkspaceRow = {
  id: string;
  name: string;
  status: string;
  industry: string | null;
  region: string | null;
  followUpDays: number;
  outreachAngle: string | null;
  leadIds: string[];
  leads: number;
  contacted: number;
  replies: number;
  hot: number;
  drafts: number;
  due: number;
  lastActivityAt: string | null;
  firstDueLeadId: string | null;
  firstDraftLeadId: string | null;
  latestReplyLeadId: string | null;
};

export type CampaignWorkspaceIdea = {
  id: string;
  name: string;
  category: string;
  fit: string;
  description: string;
  geography?: string;
};

type Tab =
  | "ACTIVE"
  | "PAUSED"
  | "ARCHIVED";

type Language =
  | "de"
  | "en";

/* =========================================================
   COPY
========================================================= */

const COPY = {
  de: {
    eyebrow: "Outreach",
    title: "Kampagnen",
    subtitle:
      "Fokussierte Zielgruppen für Lead-Suche, Recherche und personalisierten Outreach.",
    active: "Aktiv",
    paused: "Pausiert",
    archived: "Archiviert",
    assigned: "Leads zugeordnet",
    unassigned: "ohne Kampagne",
    performance: "Performance",
    newCampaign: "Neue Kampagne",
    yourCampaigns: "Deine Kampagnen",
    yourCampaignsSub:
      "Zielgruppe, Bestand und aktueller Outreach-Stand je Kampagne.",
    campaign: "Kampagne",
    contacted: "Kontaktiert",
    replies: "Antworten",
    hot: "Hot",
    followUp: "Follow-up",
    action: "Aktion",
    open: "Öffnen",
    outreachAngle: "Outreach-Ansatz",
    edit: "Bearbeiten",
    findLeads: "Leads finden",
    status: "Stand",
    draftsReady: "Entwürfe bereit",
    dueFollowUps: "Follow-ups fällig",
    lastActivity: "Letzte Aktivität",
    days: "Tage",
    assign: "Zuordnen",
    noCampaignLead: "Lead ohne Kampagne",
    noCampaignLeads: "Leads ohne Kampagne",
    assignSub:
      "Einer Zielgruppe zuordnen, damit Outreach und Follow-up greifen.",
    noPaused: "Keine pausierten Kampagnen",
    noArchived: "Keine archivierten Kampagnen",
    noActive: "Keine aktiven Kampagnen",
    emptySub:
      "Kampagnen behalten ihren Bestand, wenn du sie pausierst oder archivierst.",
    campaigns: "Kampagnen",
    bestRate: "Beste Quote",
    ideas: "Kampagnenideen",
    ideasSub:
      "Zielgruppen, die sich für Website-Outreach eignen. Idee wählen, um eine Kampagne vorzufüllen.",
    use: "Verwenden",
    attention: "Braucht Aufmerksamkeit",
    oneCampaign: "1 Kampagne",
    attentionBody: (count: number) =>
      `${count} Leads recherchiert, aber noch kein Kontakt gesendet. Die Kampagne läuft, produziert aber nichts.`,
    createDrafts: "Entwürfe erstellen",
    pause: "Pausieren",
    pausing: "Wird pausiert …",
    draftsWorking: "Entwürfe werden erstellt …",
    draftsDone: (created: number, skipped: number, failed: number) =>
      `${created} erstellt · ${skipped} übersprungen${failed ? ` · ${failed} fehlgeschlagen` : ""}`,
    activeState: "Aktiv",
    pausedState: "Pausiert",
    archivedState: "Archiviert",
    draftState: "Entwurf",
    followUpsAction: (count: number) =>
      `${count} Follow-up${count === 1 ? "" : "s"} senden`,
    draftsAction: (count: number) =>
      `${count} Entwurf${count === 1 ? "" : "würfe"} freigeben`,
    replyAction: "Antwort bearbeiten",
    campaignAction: "Kampagne öffnen",
  },
  en: {
    eyebrow: "Outreach",
    title: "Campaigns",
    subtitle:
      "Focused target groups for lead discovery, research and personalized outreach.",
    active: "Active",
    paused: "Paused",
    archived: "Archived",
    assigned: "leads assigned",
    unassigned: "without campaign",
    performance: "Performance",
    newCampaign: "New campaign",
    yourCampaigns: "Your campaigns",
    yourCampaignsSub:
      "Target group, inventory and current outreach state per campaign.",
    campaign: "Campaign",
    contacted: "Contacted",
    replies: "Replies",
    hot: "Hot",
    followUp: "Follow-up",
    action: "Action",
    open: "Open",
    outreachAngle: "Outreach angle",
    edit: "Edit",
    findLeads: "Find leads",
    status: "Status",
    draftsReady: "Drafts ready",
    dueFollowUps: "Follow-ups due",
    lastActivity: "Last activity",
    days: "days",
    assign: "Assign",
    noCampaignLead: "lead without campaign",
    noCampaignLeads: "leads without campaign",
    assignSub:
      "Assign them to a target group so outreach and follow-up can work.",
    noPaused: "No paused campaigns",
    noArchived: "No archived campaigns",
    noActive: "No active campaigns",
    emptySub:
      "Campaigns keep their lead inventory when you pause or archive them.",
    campaigns: "campaigns",
    bestRate: "Best rate",
    ideas: "Campaign ideas",
    ideasSub:
      "Target groups that fit website outreach. Use an idea to prefill a campaign.",
    use: "Use",
    attention: "Needs attention",
    oneCampaign: "1 campaign",
    attentionBody: (count: number) =>
      `${count} leads researched, but no contact has been sent yet. The campaign is active but producing nothing.`,
    createDrafts: "Create drafts",
    pause: "Pause",
    pausing: "Pausing …",
    draftsWorking: "Creating drafts …",
    draftsDone: (created: number, skipped: number, failed: number) =>
      `${created} created · ${skipped} skipped${failed ? ` · ${failed} failed` : ""}`,
    activeState: "Active",
    pausedState: "Paused",
    archivedState: "Archived",
    draftState: "Draft",
    followUpsAction: (count: number) =>
      `Send ${count} follow-up${count === 1 ? "" : "s"}`,
    draftsAction: (count: number) =>
      `Review ${count} draft${count === 1 ? "" : "s"}`,
    replyAction: "Handle reply",
    campaignAction: "Open campaign",
  },
} as const;

/* =========================================================
   HELPERS
========================================================= */

function statusLabel(
  status: string,
  language: Language
) {
  const text = COPY[language];

  switch (status) {
    case "ACTIVE":
      return text.activeState;
    case "PAUSED":
      return text.pausedState;
    case "ARCHIVED":
      return text.archivedState;
    default:
      return text.draftState;
  }
}

function formatActivity(
  value: string | null,
  language: Language
) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      language === "de"
        ? "de-DE"
        : "en-GB",
      {
        day: "2-digit",
        month: "short",
      }
    )
      .format(new Date(value))
      .replaceAll(".", "")
      .toUpperCase();
  } catch {
    return "—";
  }
}

function campaignTab(
  status: string
): Tab | null {
  if (
    status === "ACTIVE" ||
    status === "DRAFT"
  ) {
    return "ACTIVE";
  }

  if (status === "PAUSED") {
    return "PAUSED";
  }

  if (status === "ARCHIVED") {
    return "ARCHIVED";
  }

  return null;
}

function ideaFitClass(
  fit: string
) {
  const normalized =
    fit.toLowerCase();

  if (
    normalized.includes("sehr") ||
    normalized.includes("strong") ||
    normalized.includes("very")
  ) {
    return "bg-[#E9F0EA] text-[#2F6B3A] dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  return "bg-black/[0.05] text-[#40454E] dark:bg-white/[0.08] dark:text-[#C9CDD4]";
}

function nextAction(
  campaign: CampaignWorkspaceRow,
  language: Language
) {
  const text = COPY[language];

  if (
    campaign.due > 0 &&
    campaign.firstDueLeadId
  ) {
    return {
      label:
        text.followUpsAction(
          campaign.due
        ),
      href:
        `/leads/${campaign.firstDueLeadId}#outreach`,
    };
  }

  if (
    campaign.replies > 0 &&
    campaign.latestReplyLeadId
  ) {
    return {
      label:
        text.replyAction,
      href:
        `/inbox?lead=${campaign.latestReplyLeadId}`,
    };
  }

  if (
    campaign.drafts > 0 &&
    campaign.firstDraftLeadId
  ) {
    return {
      label:
        text.draftsAction(
          campaign.drafts
        ),
      href:
        `/leads/${campaign.firstDraftLeadId}#outreach`,
    };
  }

  return {
    label:
      text.campaignAction,
    href:
      `/campaigns/${campaign.id}`,
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export function CampaignsWorkspace({
  language,
  campaigns,
  ideas,
  unassignedCount,
}: {
  language: Language;
  campaigns: CampaignWorkspaceRow[];
  ideas: CampaignWorkspaceIdea[];
  unassignedCount: number;
}) {
  const router =
    useRouter();

  const text =
    COPY[language];

  const [tab, setTab] =
    useState<Tab>(
      "ACTIVE"
    );

  const firstActiveId =
    campaigns.find(
      (campaign) =>
        campaignTab(
          campaign.status
        ) === "ACTIVE"
    )?.id ?? null;

  const [openId, setOpenId] =
    useState<string | null>(
      firstActiveId
    );

  const [draftingCampaignId, setDraftingCampaignId] =
    useState<string | null>(null);

  const [draftResult, setDraftResult] =
    useState<string | null>(null);

  const [pausingCampaignId, setPausingCampaignId] =
    useState<string | null>(null);

  const counts =
    useMemo(
      () => ({
        ACTIVE:
          campaigns.filter(
            (campaign) =>
              campaignTab(
                campaign.status
              ) === "ACTIVE"
          ).length,
        PAUSED:
          campaigns.filter(
            (campaign) =>
              campaignTab(
                campaign.status
              ) === "PAUSED"
          ).length,
        ARCHIVED:
          campaigns.filter(
            (campaign) =>
              campaignTab(
                campaign.status
              ) === "ARCHIVED"
          ).length,
      }),
      [campaigns]
    );

  const activeCount =
    counts.ACTIVE;

  const assignedCount =
    campaigns.reduce(
      (sum, campaign) =>
        sum + campaign.leads,
      0
    );

  const visibleCampaigns =
    campaigns.filter(
      (campaign) =>
        campaignTab(
          campaign.status
        ) === tab
    );

  const sumLeads =
    visibleCampaigns.reduce(
      (sum, campaign) =>
        sum + campaign.leads,
      0
    );

  const sumContacted =
    visibleCampaigns.reduce(
      (sum, campaign) =>
        sum + campaign.contacted,
      0
    );

  const bestCampaign =
    visibleCampaigns
      .filter(
        (campaign) =>
          campaign.contacted > 0 &&
          campaign.replies > 0
      )
      .slice()
      .sort(
        (a, b) =>
          b.replies /
            b.contacted -
          a.replies /
            a.contacted
      )[0] ?? null;

  const attentionCampaign =
    campaigns
      .filter(
        (campaign) =>
          campaignTab(
            campaign.status
          ) === "ACTIVE" &&
          campaign.leads > 0 &&
          campaign.contacted === 0
      )
      .slice()
      .sort(
        (a, b) =>
          b.leads - a.leads
      )[0] ?? null;

  async function createCampaignDrafts(
    campaign: CampaignWorkspaceRow
  ) {
    if (
      draftingCampaignId ||
      campaign.leadIds.length === 0
    ) {
      return;
    }

    setDraftingCampaignId(
      campaign.id
    );
    setDraftResult(null);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    try {
      for (
        const leadId of
          campaign.leadIds
      ) {
        try {
          const result =
            await generateLeadOutreachDraftForBulk(
              leadId
            );

          if (!result.success) {
            failed += 1;
          } else if (
            result.status ===
            "created"
          ) {
            created += 1;
          } else {
            skipped += 1;
          }
        } catch {
          failed += 1;
        }
      }

      setDraftResult(
        text.draftsDone(
          created,
          skipped,
          failed
        )
      );

      router.refresh();
    } finally {
      setDraftingCampaignId(
        null
      );
    }
  }

  async function pauseCampaign(
    campaignId: string
  ) {
    if (pausingCampaignId) {
      return;
    }

    setPausingCampaignId(
      campaignId
    );

    const formData =
      new FormData();

    formData.set(
      "campaignId",
      campaignId
    );
    formData.set(
      "status",
      "PAUSED"
    );

    try {
      await updateCampaignStatus(
        formData
      );

      router.refresh();
    } finally {
      setPausingCampaignId(
        null
      );
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-20px)] w-full flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6 lg:py-5 xl:px-[26px] xl:py-6">
      {/* HEADER */}

      <header
        data-workspace-reveal
        className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#002BBA]">
            <span className="size-[5px] rounded-full bg-[#002BBA]" />
            {text.eyebrow}
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
            <h1 className="text-[34px] font-semibold leading-none tracking-[-0.035em] text-[#0B0C0E] dark:text-white sm:text-[38px]">
              {text.title}
            </h1>

            <span className="text-[13px] tracking-[-0.01em] text-[#6B7078] dark:text-[#9CA1AA] sm:text-[14px] xl:text-[15px]">
              {activeCount} {text.active.toLowerCase()} · {assignedCount} {text.assigned} · {unassignedCount} {text.unassigned}
            </span>
          </div>

          <p className="mt-[7px] max-w-[760px] text-[11.5px] leading-[18px] text-[#6B7078] dark:text-[#9CA1AA] sm:text-[12px]">
            {text.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/analytics"
            className="inline-flex h-[34px] items-center gap-[7px] rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] dark:border-white/10 dark:bg-[#111216] dark:text-[#D7D9DE] dark:hover:bg-white/[0.05]"
          >
            <Activity className="size-3.5 opacity-60" />
            {text.performance}
          </Link>

          <CampaignCreateDialog
            language={language}
            label={text.newCampaign}
          />
        </div>
      </header>

      {/* WORK AREA */}

      <div
        data-workspace-reveal
        className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_336px]"
      >
        {/* CAMPAIGN TABLE */}

        <section className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,.03)] dark:border-white/10 dark:bg-[#0F1013] xl:min-h-0">
          <div className="flex shrink-0 items-start justify-between gap-4 px-[18px] pb-[13px] pt-4">
            <div>
              <h2 className="text-[14.5px] font-semibold tracking-[-0.015em] text-[#0B0C0E] dark:text-white">
                {text.yourCampaigns}
              </h2>
              <p className="mt-[3px] text-[12px] text-[#6B7078] dark:text-[#91969F]">
                {text.yourCampaignsSub}
              </p>
            </div>

            <div className="flex shrink-0 rounded-[10px] bg-black/[0.045] p-[3px] dark:bg-white/[0.06]">
              {(
                [
                  ["ACTIVE", text.active],
                  ["PAUSED", text.paused],
                  ["ARCHIVED", text.archived],
                ] as const
              ).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setTab(value);
                      setOpenId(
                        campaigns.find(
                          (campaign) =>
                            campaignTab(
                              campaign.status
                            ) === value
                        )?.id ?? null
                      );
                    }}
                    className={`h-[26px] whitespace-nowrap rounded-[8px] px-2.5 text-[11.5px] transition-all ${
                      tab === value
                        ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,.12)] dark:bg-[#1A1B20] dark:text-white"
                        : "text-[#6B7078] hover:text-[#0B0C0E] dark:text-[#91969F] dark:hover:text-white"
                    }`}
                  >
                    {label} {counts[value]}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 overflow-auto">
            <div className="min-w-[870px]">
              <div className="grid grid-cols-[minmax(0,1fr)_118px_86px_78px_104px_88px] items-center gap-x-3 border-y border-black/[0.07] bg-[#FDFDFE] px-[18px] py-[9px] dark:border-white/[0.08] dark:bg-white/[0.015]">
                {[
                  text.campaign,
                  text.contacted,
                  text.replies,
                  text.hot,
                  text.followUp,
                  text.action,
                ].map((label) => (
                  <div
                    key={label}
                    className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#6B7078] dark:text-[#898E97]"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {visibleCampaigns.length === 0 ? (
                <div className="flex flex-col items-center gap-[9px] px-[18px] py-10">
                  <span className="font-mono text-[10px] uppercase tracking-[0.11em] text-[#6B7078]">
                    {tab === "PAUSED"
                      ? text.noPaused
                      : tab === "ARCHIVED"
                        ? text.noArchived
                        : text.noActive}
                  </span>
                  <span className="text-[11.5px] text-[#6B7078]">
                    {text.emptySub}
                  </span>
                </div>
              ) : (
                visibleCampaigns.map(
                  (campaign) => {
                    const expanded =
                      openId === campaign.id;
                    const coverage =
                      campaign.leads > 0
                        ? Math.round(
                            campaign.contacted /
                              campaign.leads *
                              100
                          )
                        : 0;
                    const rate =
                      campaign.contacted > 0
                        ? campaign.replies /
                          campaign.contacted *
                          100
                        : null;
                    const stalled =
                      campaign.status ===
                        "ACTIVE" &&
                      campaign.leads > 0 &&
                      campaign.contacted === 0;
                    const action =
                      nextAction(
                        campaign,
                        language
                      );

                    return (
                      <div
                        key={campaign.id}
                        className={`border-b border-black/[0.06] dark:border-white/[0.07] ${
                          expanded
                            ? "bg-[#FDFDFE] dark:bg-white/[0.015]"
                            : ""
                        }`}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setOpenId(
                              expanded
                                ? null
                                : campaign.id
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" ||
                              event.key === " "
                            ) {
                              event.preventDefault();
                              setOpenId(
                                expanded
                                  ? null
                                  : campaign.id
                              );
                            }
                          }}
                          className="grid cursor-pointer grid-cols-[minmax(0,1fr)_118px_86px_78px_104px_88px] items-center gap-x-3 px-[18px] py-[13px] transition-colors hover:bg-[#F7F8FA] dark:hover:bg-white/[0.025]"
                        >
                          <div className="flex min-w-0 items-center gap-[11px]">
                            {expanded ? (
                              <ChevronDown className="size-[13px] shrink-0 text-[#6B7078]" />
                            ) : (
                              <ChevronRight className="size-[13px] shrink-0 text-[#6B7078]" />
                            )}

                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-[13.5px] font-semibold tracking-[-0.015em] text-[#0B0C0E] dark:text-white">
                                  {campaign.name}
                                </span>
                                <span
                                  className={`shrink-0 rounded-[6px] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] ${
                                    stalled
                                      ? "bg-[#FDF0E3] text-[#9A5106] dark:bg-amber-950/50 dark:text-amber-300"
                                      : campaign.status === "ARCHIVED"
                                        ? "bg-black/[0.05] text-[#6B7078] dark:bg-white/[0.07] dark:text-[#A5A9B0]"
                                        : campaign.status === "PAUSED"
                                          ? "bg-[#FDF0E3] text-[#9A5106] dark:bg-amber-950/50 dark:text-amber-300"
                                          : "bg-[#EAEEFB] text-[#002BBA] dark:bg-[#12215A] dark:text-[#9FB1FF]"
                                  }`}
                                >
                                  {statusLabel(
                                    campaign.status,
                                    language
                                  )}
                                </span>
                              </div>

                              <div className="mt-[3px] flex min-w-0 items-center gap-[9px] text-[11px] text-[#6B7078] dark:text-[#91969F]">
                                <span className="flex min-w-0 items-center gap-[5px] truncate">
                                  <CircleDot className="size-[11px] shrink-0" />
                                  <span className="truncate">
                                    {campaign.industry ?? "—"}
                                  </span>
                                </span>
                                <span className="h-2.5 w-px shrink-0 bg-black/[0.14] dark:bg-white/[0.14]" />
                                <span className="flex min-w-0 items-center gap-[5px] truncate">
                                  <MapPin className="size-[11px] shrink-0" />
                                  <span className="truncate">
                                    {campaign.region ?? "—"}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-baseline gap-[5px]">
                              <span
                                className={`font-mono text-[13px] font-medium tabular-nums ${
                                  stalled
                                    ? "text-[#9A5106]"
                                    : "text-[#0B0C0E] dark:text-white"
                                }`}
                              >
                                {campaign.contacted}
                              </span>
                              <span className="font-mono text-[10px] text-[#6B7078]">
                                / {campaign.leads}
                              </span>
                            </div>
                            <div className="mt-[5px] h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                              <div
                                className="h-full rounded-full bg-[#002BBA]"
                                style={{
                                  width:
                                    `${Math.min(100, coverage)}%`,
                                  opacity:
                                    coverage === 0
                                      ? 0
                                      : coverage >= 80
                                        ? 1
                                        : 0.72,
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-baseline gap-1.5">
                            <span
                              className={`font-mono text-[13px] tabular-nums ${
                                campaign.replies > 0
                                  ? "font-medium text-[#002BBA]"
                                  : "text-[#6B7078]"
                              }`}
                            >
                              {campaign.replies}
                            </span>
                            <span className="font-mono text-[10px] text-[#6B7078]">
                              {rate === null
                                ? ""
                                : `${rate.toFixed(1).replace(".", ",")} %`}
                            </span>
                          </div>

                          <div>
                            {campaign.hot > 0 ? (
                              <span className="inline-flex items-center gap-[5px] rounded-[6px] bg-[#0B0C0E] px-[7px] py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-white dark:bg-white dark:text-[#0B0C0E]">
                                <Flame className="size-2.5" />
                                {campaign.hot} HOT
                              </span>
                            ) : (
                              <span className="font-mono text-[11.5px] text-[#6B7078]">
                                —
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-[7px] text-[11.5px] text-[#40454E] dark:text-[#C5C8CE]">
                            <Clock3 className="size-3 text-[#6B7078]" />
                            {campaign.followUpDays} {text.days}
                          </div>

                          <div className="flex items-center justify-end gap-[5px]">
                            <Link
                              href={`/campaigns/${campaign.id}`}
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                              className="inline-flex h-7 items-center rounded-[8px] border border-black/[0.09] bg-white px-[11px] text-[12px] text-[#40454E] transition-colors hover:border-[#002BBA]/35 hover:text-[#002BBA] dark:border-white/10 dark:bg-[#111216] dark:text-[#D0D3D8]"
                            >
                              {text.open}
                            </Link>

                            <Link
                              href={`/campaigns/${campaign.id}/edit`}
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                              aria-label={text.edit}
                              title={text.edit}
                              className="flex size-[26px] items-center justify-center rounded-[7px] text-[#6B7078] transition-colors hover:bg-black/[0.06] hover:text-[#0B0C0E] dark:hover:bg-white/[0.07] dark:hover:text-white"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </Link>
                          </div>
                        </div>

                        {expanded ? (
                          <div className="flex gap-5 pb-4 pl-[47px] pr-[18px]">
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#6B7078]">
                                {text.outreachAngle}
                              </div>
                              <p className="mt-[7px] max-w-[620px] text-[12px] leading-[1.6] text-[#40454E] dark:text-[#C0C4CB]">
                                {campaign.outreachAngle ?? "—"}
                              </p>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/campaigns/${campaign.id}/edit`}
                                  className="inline-flex h-[30px] items-center gap-1.5 rounded-[9px] border border-black/[0.09] bg-white px-[11px] text-[12.5px] text-[#40454E] transition-colors hover:border-black/[0.16] dark:border-white/10 dark:bg-[#111216] dark:text-[#D0D3D8]"
                                >
                                  <Pencil className="size-3 opacity-60" />
                                  {text.edit}
                                </Link>

                                <Link
                                  href={`/find-leads?campaign=${campaign.id}`}
                                  className="inline-flex h-[30px] items-center gap-1.5 rounded-[9px] border border-black/[0.09] bg-white px-[11px] text-[12.5px] text-[#40454E] transition-colors hover:border-black/[0.16] dark:border-white/10 dark:bg-[#111216] dark:text-[#D0D3D8]"
                                >
                                  <Search className="size-3 opacity-60" />
                                  {text.findLeads}
                                </Link>

                                <Link
                                  href={action.href}
                                  className="inline-flex h-[30px] items-center gap-1.5 rounded-[9px] bg-[#EAEEFB] px-[11px] text-[12.5px] font-medium text-[#002BBA] transition-colors hover:bg-[#DFE5F8] dark:bg-[#12215A] dark:text-[#A9B8FF] dark:hover:bg-[#172766]"
                                >
                                  <Mail className="size-3" />
                                  {action.label}
                                </Link>
                              </div>
                            </div>

                            <div className="w-[236px] shrink-0">
                              <div className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#6B7078]">
                                {text.status}
                              </div>
                              <div className="mt-2 flex flex-col">
                                <MetricRow
                                  label={text.draftsReady}
                                  value={campaign.drafts}
                                />
                                <MetricRow
                                  label={text.dueFollowUps}
                                  value={campaign.due || "—"}
                                  warning={campaign.due > 0}
                                />
                                <MetricRow
                                  label={text.lastActivity}
                                  value={formatActivity(
                                    campaign.lastActivityAt,
                                    language
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  }
                )
              )}

              <Link
                href="/leads"
                className="flex items-center gap-[11px] bg-[#FDFDFE] px-[18px] py-3 transition-colors hover:bg-[#F7F8FA] dark:bg-white/[0.015] dark:hover:bg-white/[0.03]"
              >
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[8px] border border-dashed border-black/20 dark:border-white/20">
                  <Users className="size-3 text-[#6B7078]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-medium tracking-[-0.01em] text-[#0B0C0E] dark:text-white">
                    {unassignedCount} {unassignedCount === 1 ? text.noCampaignLead : text.noCampaignLeads}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#6B7078]">
                    {text.assignSub}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-[#002BBA]">
                  {text.assign}
                  <ArrowRight className="size-3" />
                </span>
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-black/[0.07] bg-[#FDFDFE] px-[18px] py-2.5 dark:border-white/[0.08] dark:bg-white/[0.015]">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[#6B7078]">
              {visibleCampaigns.length} {text.campaigns} · {sumLeads} Leads · {sumContacted} {text.contacted.toLowerCase()}
            </span>

            {bestCampaign ? (
              <span className="text-[11.5px] text-[#6B7078]">
                {text.bestRate}: <span className="font-medium text-[#0B0C0E] dark:text-white">{bestCampaign.name}</span>
              </span>
            ) : null}
          </div>
        </section>

        {/* RIGHT RAIL */}

        <aside className="flex min-h-0 flex-col gap-3.5 xl:w-[336px]">
          <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,.03)] dark:border-white/10 dark:bg-[#0F1013] xl:min-h-0">
            <div className="shrink-0 px-[18px] pb-3 pt-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-3.5 text-[#002BBA]" />
                <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#0B0C0E] dark:text-white">
                  {text.ideas}
                </h2>
              </div>
              <p className="mt-1 text-[11.5px] leading-[1.45] text-[#6B7078] dark:text-[#91969F]">
                {text.ideasSub}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-2.5 pb-2.5">
              {ideas.map((idea) => (
                <Link
                  key={idea.id}
                  href={`/campaigns/new?idea=${encodeURIComponent(idea.id)}${idea.geography ? `&geo=${encodeURIComponent(idea.geography)}` : ""}`}
                  className="block rounded-[11px] px-2.5 py-[11px] transition-colors hover:bg-[#F7F8FA] dark:hover:bg-white/[0.035]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-[0.10em] text-[#6B7078]">
                      {idea.category}
                    </span>
                    <span className={`rounded-[6px] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] ${ideaFitClass(idea.fit)}`}>
                      {idea.fit}
                    </span>
                    <span className="ml-auto flex items-center gap-[5px] whitespace-nowrap text-[11px] text-[#002BBA]">
                      {text.use}
                      <ArrowRight className="size-[11px]" />
                    </span>
                  </div>
                  <div className="mt-[5px] text-[12.5px] font-medium tracking-[-0.01em] text-[#0B0C0E] dark:text-white">
                    {idea.name}
                  </div>
                  <div className="mt-[3px] text-[11px] leading-[1.5] text-[#6B7078] dark:text-[#91969F]">
                    {idea.description}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {attentionCampaign ? (
            <section className="shrink-0 rounded-[16px] bg-[#0B0C0E] px-[18px] py-4 text-white dark:border dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-white/60">
                  {text.attention}
                </div>
                <span className="rounded-[6px] bg-white/[0.14] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em]">
                  {text.oneCampaign}
                </span>
              </div>

              <h3 className="mt-[11px] text-[14.5px] font-semibold tracking-[-0.015em]">
                {attentionCampaign.name}
              </h3>
              <p className="mt-[5px] text-[11.5px] leading-[1.45] text-white/70">
                {text.attentionBody(
                  attentionCampaign.leads
                )}
              </p>

              {draftResult ? (
                <p className="mt-2 font-mono text-[9.5px] text-white/60">
                  {draftResult}
                </p>
              ) : null}

              <div className="mt-[13px] flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void createCampaignDrafts(
                      attentionCampaign
                    )
                  }
                  disabled={
                    draftingCampaignId !== null
                  }
                  className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-white px-2 text-[12.5px] font-medium text-[#0B0C0E] transition-opacity hover:bg-white/90 disabled:cursor-wait disabled:opacity-65"
                >
                  {draftingCampaignId === attentionCampaign.id ? (
                    <Loader2 className="size-[13px] animate-spin" />
                  ) : (
                    <WandSparkles className="size-[13px]" />
                  )}
                  <span className="truncate">
                    {draftingCampaignId === attentionCampaign.id
                      ? text.draftsWorking
                      : text.createDrafts}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void pauseCampaign(
                      attentionCampaign.id
                    )
                  }
                  disabled={
                    pausingCampaignId !== null
                  }
                  className="h-8 shrink-0 rounded-[9px] border border-white/[0.18] px-3 text-[12.5px] text-white/80 transition-colors hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-60"
                >
                  {pausingCampaignId === attentionCampaign.id
                    ? text.pausing
                    : text.pause}
                </button>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-t border-black/[0.07] py-[7px] dark:border-white/[0.08]">
      <span className="text-[11.5px] text-[#6B7078] dark:text-[#91969F]">
        {label}
      </span>
      <span
        className={`font-mono text-[11.5px] ${
          warning
            ? "font-medium text-[#9A5106] dark:text-amber-300"
            : "text-[#0B0C0E] dark:text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
