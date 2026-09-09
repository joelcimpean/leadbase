import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Banknote,
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Flame,
  Inbox,
  Mail,
  MessageSquareReply,
  Search,
  ShieldAlert,
  Sparkles,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";

import {
  Badge,
} from "@/components/ui/badge";

import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/ui/status-badge";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  DashboardMotion,
} from "@/components/dashboard-motion";

import {
  DashboardDailyStreak,
} from "@/components/dashboard-daily-streak";

import {
  DashboardFocusWorkspace,
  DashboardSummaryStrip,
  type DashboardCommandGroups,
  type DashboardSummaryCard,
} from "@/components/dashboard-command-center";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  listScheduledFollowUpsForUser,
} from "@/lib/follow-up-worker";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type AppLanguage =
  | "de"
  | "en";

type DashboardFocus =
  | "replies"
  | "hot"
  | "followups"
  | "email-issues"
  | "drafts"
  | "ooo";

type DashboardSearchParams = {
  focus?:
    | string
    | string[];
};

type DashboardPageProps = {
  searchParams?:
    Promise<DashboardSearchParams>;
};

type CommandItem = {
  key:
    string;

  priority:
    number;

  title:
    string;

  description:
    string;

  href:
    string;

  badge:
    string;

  badgeClass:
    string;

  sortTime:
    number;
};

type ContactRelation = {
  full_name:
    string
    | null;

  email:
    string
    | null;

  phone:
    string
    | null;

  email_quality_status:
    string
    | null;

  email_quality_detail:
    string
    | null;

  email_candidate:
    string
    | null;
};

type CompanyRelation = {
  name:
    string;

  industry:
    string
    | null;

  phone:
    string
    | null;
};

/* =========================================================
   CONSTANTS
========================================================= */

const CLOSED_STATUSES =
  new Set([
    "WON",
    "LOST",
    "NOT_A_FIT",
    "DO_NOT_CONTACT",
  ]);

const EMAIL_ISSUE_STATUSES =
  new Set([
    "MISSING",
    "INVALID",
    "PLACEHOLDER",
    "DOMAIN_MISMATCH",
    "SUSPICIOUS",
  ]);

/* =========================================================
   HELPERS
========================================================= */

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    Array.isArray(
      value
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return (
    value ??
    null
  );
}

function getLocale(
  language:
    AppLanguage
) {
  return language ===
    "de"
    ? "de-DE"
    : "en-GB";
}

function formatCurrency(
  value:
    number,
  language:
    AppLanguage
) {
  return new Intl.NumberFormat(
    getLocale(
      language
    ),
    {
      style:
        "currency",

      currency:
        "EUR",

      maximumFractionDigits:
        0,
    }
  ).format(
    value
  );
}

function formatDateTime(
  value:
    string
    | null,
  language:
    AppLanguage
) {
  if (
    !value
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    getLocale(
      language
    ),
    {
      timeZone:
        "Europe/Berlin",

      day:
        "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatToday(
  language:
    AppLanguage
) {
  const value =
    new Intl.DateTimeFormat(
      getLocale(
        language
      ),
      {
        timeZone:
          "Europe/Berlin",

        weekday:
          "short",

        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",
      }
    ).format(
      new Date()
    );

  return value
    .replace(
      /\./g,
      ""
    )
    .toUpperCase();
}

function timestamp(
  value:
    string
    | null
    | undefined
) {
  if (
    !value
  ) {
    return 0;
  }

  const result =
    new Date(
      value
    ).getTime();

  return Number.isFinite(
    result
  )
    ? result
    : 0;
}

function getTimeZoneOffsetMs(
  date:
    Date,
  timeZone:
    string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23",
      }
    ).formatToParts(
      date
    );

  const values =
    Object.fromEntries(
      parts
        .filter(
          (
            part
          ) =>
            part.type !==
            "literal"
        )
        .map(
          (
            part
          ) => [
            part.type,
            part.value,
          ]
        )
    );

  const zonedAsUtc =
    Date.UTC(
      Number(
        values.year
      ),
      Number(
        values.month
      ) -
        1,
      Number(
        values.day
      ),
      Number(
        values.hour
      ),
      Number(
        values.minute
      ),
      Number(
        values.second
      )
    );

  return (
    zonedAsUtc -
    date.getTime()
  );
}

function berlinLocalDateTimeToIso({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
}: {
  year:
    number;

  month:
    number;

  day:
    number;

  hour?:
    number;

  minute?:
    number;
}) {
  const wallClockAsUtc =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day,
        hour,
        minute,
        0
      )
    );

  const firstOffset =
    getTimeZoneOffsetMs(
      wallClockAsUtc,
      "Europe/Berlin"
    );

  let result =
    new Date(
      wallClockAsUtc.getTime() -
        firstOffset
    );

  const secondOffset =
    getTimeZoneOffsetMs(
      result,
      "Europe/Berlin"
    );

  result =
    new Date(
      wallClockAsUtc.getTime() -
        secondOffset
    );

  return result.toISOString();
}

function getBerlinDayBounds() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Berlin",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const values =
    Object.fromEntries(
      parts
        .filter(
          (
            part
          ) =>
            part.type !==
            "literal"
        )
        .map(
          (
            part
          ) => [
            part.type,
            part.value,
          ]
        )
    );

  const year =
    Number(
      values.year
    );

  const month =
    Number(
      values.month
    );

  const day =
    Number(
      values.day
    );

  const nextDay =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day +
          1
      )
    );

  return {
    start:
      berlinLocalDateTimeToIso({
        year,
        month,
        day,
      }),

    end:
      berlinLocalDateTimeToIso({
        year:
          nextDay.getUTCFullYear(),

        month:
          nextDay.getUTCMonth() +
          1,

        day:
          nextDay.getUTCDate(),
      }),
  };
}

function isInside(
  value:
    string
    | null
    | undefined,
  start:
    string,
  end:
    string
) {
  const valueTime =
    timestamp(
      value
    );

  return (
    valueTime >=
      timestamp(
        start
      ) &&
    valueTime <
      timestamp(
        end
      )
  );
}

function statusLabel(
  status:
    string,
  language:
    AppLanguage
) {
  const de =
    language ===
    "de";

  switch (
    status
  ) {
    case "NEW":
      return de
        ? "Neu"
        : "New";

    case "RESEARCHING":
      return de
        ? "Recherche"
        : "Researching";

    case "QUALIFIED":
      return de
        ? "Qualifiziert"
        : "Qualified";

    case "DRAFT_READY":
      return de
        ? "Entwurf bereit"
        : "Draft ready";

    case "CONTACTED":
      return de
        ? "Kontaktiert"
        : "Contacted";

    case "REPLIED":
      return de
        ? "Geantwortet"
        : "Replied";

    case "CALL_BOOKED":
      return de
        ? "Call gebucht"
        : "Call booked";

    case "PROPOSAL":
      return de
        ? "Angebot"
        : "Proposal";

    case "WON":
      return de
        ? "Gewonnen"
        : "Won";

    case "LOST":
      return de
        ? "Verloren"
        : "Lost";

    default:
      return status;
  }
}

function projectStatusLabel(
  status:
    string,
  language:
    AppLanguage
) {
  const de =
    language ===
    "de";

  switch (
    status
  ) {
    case "PLANNED":
      return de
        ? "Geplant"
        : "Planned";

    case "IN_PROGRESS":
      return de
        ? "In Arbeit"
        : "In progress";

    case "COMPLETED":
      return de
        ? "Abgeschlossen"
        : "Completed";

    case "CANCELLED":
      return de
        ? "Abgebrochen"
        : "Cancelled";

    default:
      return status;
  }
}

function pipelineBarClass(
  status:
    string
) {
  switch (
    status
  ) {
    case "WON":
      return "bg-emerald-500";

    case "REPLIED":
    case "CALL_BOOKED":
    case "PROPOSAL":
      return "bg-blue-500";

    case "CONTACTED":
    case "DRAFT_READY":
      return "bg-violet-500";

    default:
      return "bg-primary";
  }
}

function getQueryValue(
  value:
    | string
    | string[]
    | undefined
) {
  return Array.isArray(
    value
  )
    ? value[0] ?? ""
    : value ?? "";
}

function parseDashboardFocus(
  value: string
): DashboardFocus | null {
  switch (value) {
    case "replies":
    case "hot":
    case "followups":
    case "email-issues":
    case "drafts":
    case "ooo":
      return value;

    default:
      return null;
  }
}


function getProjectStatusTone(
  status:
    string
): StatusBadgeTone {
  switch (
    status
  ) {
    case "IN_PROGRESS":
      return "blue";

    case "COMPLETED":
      return "neutral";

    case "PAUSED":
      return "warning";

    case "CANCELLED":
      return "danger";

    default:
      return "neutral";
  }
}

function formatCompactDuration(
  seconds:
    number
) {
  const safe =
    Math.max(
      0,
      Math.round(
        seconds
      )
    );

  if (
    safe <
    60
  ) {
    return `${safe}s`;
  }

  const minutes =
    Math.floor(
      safe /
      60
    );

  const rest =
    safe %
    60;

  return rest
    ? `${minutes}m ${rest}s`
    : `${minutes}m`;
}

function getCommandChannel({
  href,
  language,
}: {
  href:
    string;

  language:
    AppLanguage;
}) {
  const de =
    language ===
    "de";

  if (
    href.startsWith(
      "/inbox"
    )
  ) {
    return "Inbox";
  }

  if (
    href.startsWith(
      "/projects"
    )
  ) {
    return de
      ? "Projekt"
      : "Project";
  }

  if (
    href.includes(
      "#outreach"
    )
  ) {
    return "E-Mail";
  }

  return de
    ? "Lead"
    : "Lead";
}

function getCommandActionLabel({
  href,
  language,
}: {
  href:
    string;

  language:
    AppLanguage;
}) {
  const de =
    language ===
    "de";

  if (
    href.startsWith(
      "/inbox"
    )
  ) {
    return de
      ? "Antwort öffnen"
      : "Open reply";
  }

  if (
    href.startsWith(
      "/projects"
    )
  ) {
    return de
      ? "Projekt öffnen"
      : "Open project";
  }

  if (
    href.includes(
      "#outreach"
    )
  ) {
    return de
      ? "Entwurf öffnen"
      : "Open draft";
  }

  return de
    ? "Öffnen"
    : "Open";
}

/* =========================================================
   PAGE
========================================================= */

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const de =
    language ===
    "de";

  const params:
    DashboardSearchParams =
    searchParams
      ? await searchParams
      : {};

  const activeFocus =
    parseDashboardFocus(
      getQueryValue(
        params.focus
      )
    );

  const {
    data: {
      user,
    },

    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const {
    start:
      todayStart,
    end:
      tomorrowStart,
  } =
    getBerlinDayBounds();

  const recentPreviewCutoff =
    new Date(
      Date.now() -
        7 *
          24 *
          60 *
          60 *
          1000
    ).toISOString();


  const [
    leadsResult,
    draftsResult,
    messagesResult,
    visitsResult,
    sentEmailsResult,
    projectsResult,
    scheduledFollowUps,
  ] =
    await Promise.all([
      supabase
        .from(
          "leads"
        )
        .select(`
          id,
          status,
          priority,
          opportunity_score,
          estimated_project_value,
          last_contacted_at,
          next_follow_up_at,
          hot_lead_score,
          hot_lead_level,
          hot_lead_reasons,
          smart_follow_up_mode,
          smart_follow_up_reason,
          created_at,

          company:companies (
            name,
            industry,
            phone
          ),

          primary_contact:contacts (
            full_name,
            email,
            phone,
            email_quality_status,
            email_quality_detail,
            email_candidate
          )
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "outreach_drafts"
        )
        .select(`
          id,
          lead_id,
          status,
          subject,
          send_error,
          sent_at,
          created_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "email_messages"
        )
        .select(`
          id,
          lead_id,
          from_name,
          from_email,
          subject,
          received_at,
          is_unread,
          is_automatic_reply,
          reply_classification,
          reply_classification_confidence,
          reply_follow_up_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "direction",
          "INCOMING"
        )
        .order(
          "received_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          250
        ),

      supabase
        .from(
          "design_preview_visits"
        )
        .select(`
          lead_id,
          session_id,
          is_owner,
          is_engaged,
          duration_seconds,
          max_scroll_percent,
          source,
          first_seen_at,
          last_seen_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .gte(
          "last_seen_at",
          recentPreviewCutoff
        )
        .order(
          "last_seen_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "activities"
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
          user.id
        )
        .eq(
          "activity_type",
          "EMAIL_SENT"
        ),

      supabase
        .from(
          "client_projects"
        )
        .select(`
          id,
          client_name,
          project_name,
          status,
          total_value,
          amount_paid,
          currency,
          started_at,
          completed_at,
          created_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      /*
       * Use the exact same follow-up reconciliation as Settings.
       * This prevents manually stopped or already-sent follow-ups
       * from lingering in the Daily Command Center.
       */
      listScheduledFollowUpsForUser(
        user.id,
        100
      ),
    ]);

  for (
    const [
      label,
      error,
    ] of [
      [
        "leads",
        leadsResult.error,
      ],
      [
        "drafts",
        draftsResult.error,
      ],
      [
        "messages",
        messagesResult.error,
      ],
      [
        "preview visits",
        visitsResult.error,
      ],
      [
        "projects",
        projectsResult.error,
      ],
    ] as const
  ) {
    if (
      error
    ) {
      console.error(
        `Could not load dashboard ${label}:`,
        error
      );
    }
  }

  const leads =
    leadsResult.data ??
    [];

  const drafts =
    draftsResult.data ??
    [];

  const messages =
    messagesResult.data ??
    [];


  const visits =
    visitsResult.data ??
    [];

  const projects =
    projectsResult.data ??
    [];

  /* =======================================================
     LEAD LOOKUPS
  ======================================================= */

  const leadById =
    new Map<
      string,
      (
        typeof leads
      )[number]
    >();

  const companyNameByLeadId =
    new Map<
      string,
      string
    >();

  for (
    const lead of
      leads
  ) {
    leadById.set(
      lead.id,
      lead
    );

    const company =
      getSingleRelation<
        CompanyRelation
      >(
        lead.company
      );

    companyNameByLeadId.set(
      lead.id,
      company?.name ??
        (
          de
            ? "Unbekanntes Unternehmen"
            : "Unknown company"
        )
    );
  }

  /* =======================================================
     LATEST DRAFT BY LEAD
  ======================================================= */

  const latestDraftByLead =
    new Map<
      string,
      (
        typeof drafts
      )[number]
    >();

  for (
    const draft of
      drafts
  ) {
    if (
      !draft.lead_id ||
      latestDraftByLead.has(
        draft.lead_id
      )
    ) {
      continue;
    }

    latestDraftByLead.set(
      draft.lead_id,
      draft
    );
  }

  /* =======================================================
     LATEST / UNREAD HUMAN REPLIES
  ======================================================= */

  const latestMessageByLead =
    new Map<
      string,
      (
        typeof messages
      )[number]
    >();

  const unreadHumanReplyByLead =
    new Map<
      string,
      (
        typeof messages
      )[number]
    >();

  const latestOooByLead =
    new Map<
      string,
      (
        typeof messages
      )[number]
    >();

  for (
    const message of
      messages
  ) {
    if (
      !latestMessageByLead.has(
        message.lead_id
      )
    ) {
      latestMessageByLead.set(
        message.lead_id,
        message
      );
    }

    const humanReply =
      !message.is_automatic_reply &&
      message.reply_classification !==
        "BOUNCE";

    if (
      humanReply &&
      message.is_unread &&
      !unreadHumanReplyByLead.has(
        message.lead_id
      )
    ) {
      unreadHumanReplyByLead.set(
        message.lead_id,
        message
      );
    }

    if (
      message.is_automatic_reply &&
      message.reply_classification ===
        "OUT_OF_OFFICE" &&
      !latestOooByLead.has(
        message.lead_id
      )
    ) {
      latestOooByLead.set(
        message.lead_id,
        message
      );
    }
  }

  /* =======================================================
     PREVIEW SIGNALS
  ======================================================= */

  const previewByLead =
    new Map<
      string,
      {
        sessions:
          Set<string>;

        engaged:
          boolean;

        maxDuration:
          number;

        maxScroll:
          number;

        latestSeen:
          string
          | null;

        outreach:
          boolean;
      }
    >();

  for (
    const visit of
      visits
  ) {
    if (
      visit.is_owner
    ) {
      continue;
    }

    const current =
      previewByLead.get(
        visit.lead_id
      ) ??
      {
        sessions:
          new Set<string>(),

        engaged:
          false,

        maxDuration:
          0,

        maxScroll:
          0,

        latestSeen:
          null,

        outreach:
          false,
      };

    current.sessions.add(
      visit.session_id
    );

    current.engaged =
      current.engaged ||
      Boolean(
        visit.is_engaged
      );

    current.maxDuration =
      Math.max(
        current.maxDuration,
        Number(
          visit.duration_seconds ??
            0
        )
      );

    current.maxScroll =
      Math.max(
        current.maxScroll,
        Number(
          visit.max_scroll_percent ??
            0
        )
      );

    current.outreach =
      current.outreach ||
      visit.source ===
        "OUTREACH";

    if (
      !current.latestSeen ||
      timestamp(
        visit.last_seen_at
      ) >
        timestamp(
          current.latestSeen
        )
    ) {
      current.latestSeen =
        visit.last_seen_at;
    }

    previewByLead.set(
      visit.lead_id,
      current
    );
  }

  /* =======================================================
     COMMAND CENTER COUNTS
  ======================================================= */

  const openLeads =
    leads.filter(
      (
        lead
      ) =>
        !CLOSED_STATUSES.has(
          lead.status
        )
    );

  const hotLeads =
    openLeads
      .filter(
        (
          lead
        ) =>
          lead.hot_lead_level ===
            "HOT" ||
          Number(
            lead.hot_lead_score ??
              0
          ) >=
            70
      )
      .sort(
        (
          a,
          b
        ) =>
          Number(
            b.hot_lead_score ??
              0
          ) -
          Number(
            a.hot_lead_score ??
              0
          )
      );

  const followUpsDue =
    scheduledFollowUps
      .filter(
        (
          candidate
        ) =>
          timestamp(
            candidate.nextFollowUpAt
          ) <
            timestamp(
              tomorrowStart
            )
      )
      .sort(
        (
          a,
          b
        ) =>
          timestamp(
            a.nextFollowUpAt
          ) -
          timestamp(
            b.nextFollowUpAt
          )
      );

  const emailIssueLeads =
    openLeads.filter(
      (
        lead
      ) => {
        const contact =
          getSingleRelation<
            ContactRelation
          >(
            lead.primary_contact
          );

        return EMAIL_ISSUE_STATUSES.has(
          contact
            ?.email_quality_status ??
            ""
        );
      }
    );

  const readyDraftLeads =
    openLeads.filter(
      (
        lead
      ) => {
        const draft =
          latestDraftByLead.get(
            lead.id
          );

        const contact =
          getSingleRelation<
            ContactRelation
          >(
            lead.primary_contact
          );

        const emailStatus =
          contact
            ?.email_quality_status ??
          "";

        const emailBlocked =
          emailStatus ===
            "MISSING" ||
          emailStatus ===
            "INVALID" ||
          emailStatus ===
            "PLACEHOLDER";

        return (
          Boolean(
            draft
          ) &&
          !draft?.sent_at &&
          (
            draft?.status ===
              "DRAFT" ||
            draft?.status ===
              "APPROVED"
          ) &&
          !draft?.send_error &&
          !emailBlocked
        );
      }
    );

  const oooReturningToday =
    Array.from(
      latestOooByLead.entries()
    ).filter(
      (
        [
          leadId,
          message,
        ]
      ) => {
        const lead =
          leadById.get(
            leadId
          );

        return (
          Boolean(
            lead
          ) &&
          !CLOSED_STATUSES.has(
            lead?.status ??
              ""
          ) &&
          isInside(
            message.reply_follow_up_at,
            todayStart,
            tomorrowStart
          )
        );
      }
    );

  const activeProjects =
    projects.filter(
      (
        project
      ) =>
        project.status ===
          "IN_PROGRESS" ||
        project.status ===
          "PLANNED"
    );

  /* =======================================================
     COMMAND QUEUE
  ======================================================= */

  const commandByKey =
    new Map<
      string,
      CommandItem
    >();

  const commandsByFocus =
    new Map<
      DashboardFocus,
      CommandItem[]
    >();

  function addCommand(
    item:
      CommandItem
  ) {
    const existing =
      commandByKey.get(
        item.key
      );

    if (
      !existing ||
      item.priority >
        existing.priority
    ) {
      commandByKey.set(
        item.key,
        item
      );
    }
  }

  function addFocusedCommand(
    focus:
      DashboardFocus,
    item:
      CommandItem
  ) {
    const existing =
      commandsByFocus.get(
        focus
      ) ?? [];

    existing.push(
      item
    );

    commandsByFocus.set(
      focus,
      existing
    );

    addCommand(
      item
    );
  }

  /* -------------------------------------------------------
     1) UNREAD HUMAN REPLIES
  ------------------------------------------------------- */

  for (
    const [
      leadId,
      message,
    ] of
      unreadHumanReplyByLead.entries()
  ) {
    const companyName =
      companyNameByLeadId.get(
        leadId
      ) ??
      (
        de
          ? "Unbekanntes Unternehmen"
          : "Unknown company"
      );

    const classification =
      message.reply_classification;

    const badge =
      classification ===
        "INTERESTED"
        ? de
          ? "Interessiert"
          : "Interested"
        : classification ===
            "QUESTION"
          ? de
            ? "Rückfrage"
            : "Question"
          : de
            ? "Neue Antwort"
            : "New reply";

    addFocusedCommand("replies", {
      key:
        `lead:${leadId}`,

      priority:
        classification ===
          "INTERESTED"
          ? 120
          : classification ===
              "QUESTION"
            ? 115
            : 110,

      title:
        companyName,

      description:
        message.subject ??
        (
          de
            ? "Neue ungelesene Kundenantwort"
            : "New unread customer reply"
        ),

      href:
        `/inbox?lead=${encodeURIComponent(
          leadId
        )}`,

      badge,

      badgeClass:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",

      sortTime:
        timestamp(
          message.received_at
        ),
    });
  }

  /* -------------------------------------------------------
     2) OOO RETURNS TODAY
  ------------------------------------------------------- */

  for (
    const [
      leadId,
      message,
    ] of
      oooReturningToday
  ) {
    addFocusedCommand("ooo", {
      key:
        `lead:${leadId}`,

      priority:
        105,

      title:
        companyNameByLeadId.get(
          leadId
        ) ??
        (
          de
            ? "Unbekanntes Unternehmen"
            : "Unknown company"
        ),

      description:
        de
          ? "Abwesenheit endet heute – Follow-up kann wieder sinnvoll sein."
          : "Out-of-office period ends today — follow-up is relevant again.",

      href:
        `/leads/${leadId}#outreach`,

      badge:
        de
          ? "Wieder da"
          : "Back today",

      badgeClass:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300",

      sortTime:
        timestamp(
          message.reply_follow_up_at
        ),
    });
  }

  /* -------------------------------------------------------
     3) DUE / OVERDUE FOLLOW-UPS
  ------------------------------------------------------- */

  for (
    const lead of
      followUpsDue
  ) {
    const overdue =
      timestamp(
        lead.nextFollowUpAt
      ) <
      timestamp(
        todayStart
      );

    addFocusedCommand("followups", {
      key:
        `lead:${lead.leadId}`,

      priority:
        overdue
          ? 100
          : 95,

      title:
        lead.companyName ||
        (
          de
            ? "Unbekanntes Unternehmen"
            : "Unknown company"
        ),

      description:
        overdue
          ? de
            ? `Follow-up überfällig · ${formatDateTime(
                lead.nextFollowUpAt,
                language
              )}`
            : `Follow-up overdue · ${formatDateTime(
                lead.nextFollowUpAt,
                language
              )}`
          : de
            ? `Follow-up heute · ${formatDateTime(
                lead.nextFollowUpAt,
                language
              )}`
            : `Follow-up today · ${formatDateTime(
                lead.nextFollowUpAt,
                language
              )}`,

      href:
        `/leads/${lead.leadId}#outreach`,

      badge:
        overdue
          ? de
            ? "Überfällig"
            : "Overdue"
          : de
            ? "Heute"
            : "Today",

      badgeClass:
        overdue
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",

      sortTime:
        timestamp(
          lead.nextFollowUpAt
        ),
    });
  }

  /* -------------------------------------------------------
     4) HOT LEADS
  ------------------------------------------------------- */

  for (
    const lead of
      hotLeads
  ) {
    const preview =
      previewByLead.get(
        lead.id
      );

    const score =
      Number(
        lead.hot_lead_score ??
          0
      );

    addFocusedCommand("hot", {
      key:
        `lead:${lead.id}`,

      priority:
        85 +
        Math.min(
          10,
          Math.floor(
            score /
              10
          )
        ),

      title:
        companyNameByLeadId.get(
          lead.id
        ) ??
        (
          de
            ? "Unbekanntes Unternehmen"
            : "Unknown company"
        ),

      description:
        preview?.sessions.size
          ? de
            ? `Hot Score ${score} · ${preview.sessions.size} externe Preview-Session${preview.sessions.size === 1 ? "" : "s"}`
            : `Hot score ${score} · ${preview.sessions.size} external preview session${preview.sessions.size === 1 ? "" : "s"}`
          : de
            ? `Hot Score ${score} · jetzt priorisieren`
            : `Hot score ${score} · prioritize now`,

      href:
        `/leads/${lead.id}`,

      badge:
        `🔥 ${score} HOT`,

      badgeClass:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300",

      sortTime:
        timestamp(
          preview?.latestSeen
        ),
    });
  }

  /* -------------------------------------------------------
     5) EMAIL ISSUES
  ------------------------------------------------------- */

  for (
    const lead of
      emailIssueLeads
  ) {
    const contact =
      getSingleRelation<
        ContactRelation
      >(
        lead.primary_contact
      );

    addFocusedCommand("email-issues", {
      key:
        `lead:${lead.id}`,

      priority:
        75,

      title:
        companyNameByLeadId.get(
          lead.id
        ) ??
        (
          de
            ? "Unbekanntes Unternehmen"
            : "Unknown company"
        ),

      description:
        contact
          ?.email_quality_detail ??
        (
          de
            ? "Empfängeradresse sollte vor dem nächsten Versand geprüft werden."
            : "Recipient email should be checked before the next send."
        ),

      href:
        `/leads/${lead.id}#outreach`,

      badge:
        de
          ? "E-Mail prüfen"
          : "Check email",

      badgeClass:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",

      sortTime:
        timestamp(
          lead.created_at
        ),
    });
  }

  /* -------------------------------------------------------
     6) DRAFTS TO REVIEW
  ------------------------------------------------------- */

  for (
    const lead of
      readyDraftLeads
  ) {
    const draft =
      latestDraftByLead.get(
        lead.id
      );

    addFocusedCommand("drafts", {
      key:
        `lead:${lead.id}`,

      priority:
        65,

      title:
        companyNameByLeadId.get(
          lead.id
        ) ??
        (
          de
            ? "Unbekanntes Unternehmen"
            : "Unknown company"
        ),

      description:
        draft?.subject ??
        (
          de
            ? "Outreach-Entwurf wartet auf Prüfung."
            : "Outreach draft is waiting for review."
        ),

      href:
        `/leads/${lead.id}#outreach`,

      badge:
        draft?.status ===
          "APPROVED"
          ? de
            ? "Freigegeben"
            : "Approved"
          : de
            ? "Entwurf"
            : "Draft",

      badgeClass:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",

      sortTime:
        timestamp(
          draft?.created_at
        ),
    });
  }

  /* -------------------------------------------------------
     7) ACTIVE PROJECTS
  ------------------------------------------------------- */

  for (
    const project of
      activeProjects
  ) {
    addCommand({
      key:
        `project:${project.id}`,

      priority:
        project.status ===
          "IN_PROGRESS"
          ? 58
          : 50,

      title:
        project.project_name,

      description:
        `${project.client_name} · ${projectStatusLabel(
          project.status,
          language
        )}`,

      href:
        `/projects/${project.id}/edit`,

      badge:
        de
          ? "Projekt"
          : "Project",

      badgeClass:
        "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",

      sortTime:
        timestamp(
          project.started_at ??
          project.created_at
        ),
    });
  }

  function sortedCommands(
    items:
      CommandItem[],
    limit:
      number
  ) {
    return [
      ...items,
    ]
      .sort(
        (
          a,
          b
        ) =>
          b.priority -
            a.priority ||
          b.sortTime -
            a.sortTime
      )
      .slice(
        0,
        limit
      );
  }

  const dashboardCommandGroups:
    DashboardCommandGroups = {
      all:
        sortedCommands(
          Array.from(
            commandByKey.values()
          ),
          10
        ),

      replies:
        sortedCommands(
          commandsByFocus.get(
            "replies"
          ) ?? [],
          30
        ),

      hot:
        sortedCommands(
          commandsByFocus.get(
            "hot"
          ) ?? [],
          30
        ),

      followups:
        sortedCommands(
          commandsByFocus.get(
            "followups"
          ) ?? [],
          30
        ),

      "email-issues":
        sortedCommands(
          commandsByFocus.get(
            "email-issues"
          ) ?? [],
          30
        ),

      drafts:
        sortedCommands(
          commandsByFocus.get(
            "drafts"
          ) ?? [],
          30
        ),

      ooo:
        sortedCommands(
          commandsByFocus.get(
            "ooo"
          ) ?? [],
          30
        ),
    };

  /* =======================================================
     PIPELINE
  ======================================================= */

  const pipelineStatuses = [
    "NEW",
    "RESEARCHING",
    "QUALIFIED",
    "DRAFT_READY",
    "CONTACTED",
    "REPLIED",
    "CALL_BOOKED",
    "PROPOSAL",
    "WON",
  ];

  const statusCounts =
    new Map<
      string,
      number
    >();

  for (
    const lead of
      leads
  ) {
    statusCounts.set(
      lead.status,
      (
        statusCounts.get(
          lead.status
        ) ??
        0
      ) +
        1
    );
  }

  /* =======================================================
     BUSINESS METRICS
  ======================================================= */

  const revenueProjects =
    projects.filter(
      (
        project
      ) =>
        project.status !==
        "CANCELLED"
    );

  const bookedValue =
    revenueProjects.reduce(
      (
        total,
        project
      ) =>
        total +
        Number(
          project.total_value ??
            0
        ),
      0
    );

  const paidRevenue =
    revenueProjects.reduce(
      (
        total,
        project
      ) =>
        total +
        Number(
          project.amount_paid ??
            0
        ),
      0
    );

  const outstanding =
    revenueProjects.reduce(
      (
        total,
        project
      ) =>
        total +
        Math.max(
          0,
          Number(
            project.total_value ??
              0
          ) -
            Number(
              project.amount_paid ??
                0
            )
        ),
      0
    );

  const pipelineValue =
    openLeads.reduce(
      (
        total,
        lead
      ) =>
        total +
        Number(
          lead.estimated_project_value ??
            0
        ),
      0
    );

  const recentProjects =
    [
      ...projects,
    ]
      .sort(
        (
          a,
          b
        ) => {
          const activeRank =
            (
              project:
                typeof a
            ) =>
              project.status ===
                "IN_PROGRESS"
                ? 0
                : project.status ===
                    "PLANNED"
                  ? 1
                  : 2;

          const rankDifference =
            activeRank(
              a
            ) -
            activeRank(
              b
            );

          if (
            rankDifference !==
            0
          ) {
            return rankDifference;
          }

          const valueDifference =
            Number(
              b.total_value ??
                0
            ) -
            Number(
              a.total_value ??
                0
            );

          if (
            valueDifference !==
            0
          ) {
            return valueDifference;
          }

          return a.project_name.localeCompare(
            b.project_name,
            de
              ? "de"
              : "en"
          );
        }
      )
      .slice(
        0,
        4
      );

  /* =======================================================
     COPY
  ======================================================= */

  const copy =
    de
      ? {
          eyebrow:
            "Daily Command Center",

          title:
            "Heute",

          description:
            "Das Wichtigste aus Inbox, Follow-ups, Preview-Signalen und Projekten – priorisiert an einem Ort.",

          unreadReplies:
            "Neue Antworten",

          hotLeads:
            "HOT Leads",

          followUps:
            "Follow-ups fällig",

          emailIssues:
            "E-Mail prüfen",

          drafts:
            "Entwürfe bereit",

          ooo:
            "Heute wieder da",

          focus:
            "Dein Fokus",

          focusDescription:
            "Leadbase sortiert die wichtigsten Aktionen nach Dringlichkeit und Kaufsignal.",

          nothingUrgent:
            "Aktuell nichts Dringendes.",

          nothingUrgentDescription:
            "Neue Antworten, Follow-ups und starke Preview-Signale erscheinen automatisch hier.",

          hotNow:
            "Hot Leads",

          hotNowDescription:
            "Die stärksten aktuell offenen Kauf- und Engagement-Signale.",

          noHot:
            "Noch keine HOT Leads.",

          overview:
            "Business-Übersicht",

          pipelineValue:
            "Pipeline",

          booked:
            "Gebuchter Wert",

          paid:
            "Bezahlt",

          outstanding:
            "Offen",

          sent:
            "E-Mails gesendet",

          pipeline:
            "Sales Pipeline",

          pipelineDescription:
            "Aktuelle Verteilung deiner Leads über die Vertriebsstufen.",

          projects:
            "Aktuelle Projekte",

          projectsDescription:
            "Letzte Kundenprojekte und ihr finanzieller Stand.",

          allProjects:
            "Alle Projekte",

          viewAllLeads:
            "Alle Leads",

          viewInbox:
            "Inbox öffnen",

          analytics:
            "Analytics",
        }
      : {
          eyebrow:
            "Daily Command Center",

          title:
            "Today",

          description:
            "The most important inbox, follow-up, preview and project signals — prioritized in one place.",

          unreadReplies:
            "New replies",

          hotLeads:
            "HOT leads",

          followUps:
            "Follow-ups due",

          emailIssues:
            "Email issues",

          drafts:
            "Drafts ready",

          ooo:
            "Back today",

          focus:
            "Your focus",

          focusDescription:
            "Leadbase ranks the most important actions by urgency and buying signal.",

          nothingUrgent:
            "Nothing urgent right now.",

          nothingUrgentDescription:
            "New replies, due follow-ups and strong preview signals will automatically appear here.",

          hotNow:
            "Hot leads",

          hotNowDescription:
            "The strongest current buying and engagement signals.",

          noHot:
            "No HOT leads yet.",

          overview:
            "Business overview",

          pipelineValue:
            "Pipeline",

          booked:
            "Booked value",

          paid:
            "Paid",

          outstanding:
            "Outstanding",

          sent:
            "Emails sent",

          pipeline:
            "Sales pipeline",

          pipelineDescription:
            "Current distribution of leads across your sales stages.",

          projects:
            "Current projects",

          projectsDescription:
            "Recent client projects and their financial status.",

          allProjects:
            "All projects",

          viewAllLeads:
            "View all leads",

          viewInbox:
            "Open inbox",

          analytics:
            "Analytics",
        };



  /* =======================================================
     CONCEPT → REAL DATA MAPPING
  ======================================================= */

  const featuredHotLead =
    hotLeads[0] ??
    null;

  const featuredHotCompany =
    featuredHotLead
      ? getSingleRelation<
          CompanyRelation
        >(
          featuredHotLead.company
        )
      : null;

  const featuredHotContact =
    featuredHotLead
      ? getSingleRelation<
          ContactRelation
        >(
          featuredHotLead.primary_contact
        )
      : null;

  const featuredHotPreview =
    featuredHotLead
      ? previewByLead.get(
          featuredHotLead.id
        ) ??
        null
      : null;

  const featuredHotDraft =
    featuredHotLead
      ? latestDraftByLead.get(
          featuredHotLead.id
        ) ??
        null
      : null;

  const featuredHotReply =
    featuredHotLead
      ? unreadHumanReplyByLead.get(
          featuredHotLead.id
        ) ??
        null
      : null;


  const allCommandCount =
    commandByKey.size;

  const timeCriticalCount =
    Array.from(
      commandByKey.values()
    ).filter(
      (
        item
      ) =>
        item.priority >=
        95
    ).length;


  const maximumPipelineCount =
    Math.max(
      1,
      ...pipelineStatuses.map(
        (
          status
        ) =>
          statusCounts.get(
            status
          ) ??
          0
      )
    );

  const contactedForRate =
    (
      statusCounts.get(
        "CONTACTED"
      ) ??
      0
    ) +
    (
      statusCounts.get(
        "REPLIED"
      ) ??
      0
    );

  const responseRate =
    contactedForRate >
    0
      ? (
          (
            statusCounts.get(
              "REPLIED"
            ) ??
            0
          ) /
          contactedForRate *
          100
        )
      : 0;

  const paidProgress =
    bookedValue >
    0
      ? Math.min(
          100,
          Math.round(
            paidRevenue /
              bookedValue *
              100
          )
        )
      : 0;

  const summaryMeta =
    new Map<
      DashboardFocus,
      string
    >([
      [
        "replies",
        unreadHumanReplyByLead.size >
        0
          ? de
            ? `${unreadHumanReplyByLead.size} ungelesen`
            : `${unreadHumanReplyByLead.size} unread`
          : de
            ? "Inbox leer"
            : "Inbox clear",
      ],
      [
        "hot",
        featuredHotLead
          ? `Score ${Number(
              featuredHotLead.hot_lead_score ??
                0
            )}`
          : de
            ? "keine HOT Leads"
            : "no HOT leads",
      ],
      [
        "followups",
        followUpsDue[0]
          ? de
            ? `nächster ${formatDateTime(
                followUpsDue[0]
                  .nextFollowUpAt,
                language
              )}`
            : `next ${formatDateTime(
                followUpsDue[0]
                  .nextFollowUpAt,
                language
              )}`
          : de
            ? "nichts fällig"
            : "nothing due",
      ],
      [
        "email-issues",
        emailIssueLeads.length >
        0
          ? de
            ? "vor Versand prüfen"
            : "check before send"
          : de
            ? "alles sauber"
            : "all clear",
      ],
      [
        "drafts",
        readyDraftLeads.length >
        0
          ? de
            ? "zum Freigeben"
            : "ready to review"
          : de
            ? "keine offenen"
            : "none pending",
      ],
      [
        "ooo",
        oooReturningToday.length >
        0
          ? de
            ? "heute wieder da"
            : "back today"
          : de
            ? "keine Rückkehr"
            : "none returning",
      ],
    ]);

  const summaryCards:
    DashboardSummaryCard[] = [
      {
        label:
          copy.unreadReplies,
        value:
          unreadHumanReplyByLead.size,
        meta:
          summaryMeta.get(
            "replies"
          ) ?? "",
        focus:
          "replies",
      },
      {
        label:
          copy.hotLeads,
        value:
          hotLeads.length,
        meta:
          summaryMeta.get(
            "hot"
          ) ?? "",
        focus:
          "hot",
      },
      {
        label:
          copy.followUps,
        value:
          followUpsDue.length,
        meta:
          summaryMeta.get(
            "followups"
          ) ?? "",
        focus:
          "followups",
      },
      {
        label:
          copy.drafts,
        value:
          readyDraftLeads.length,
        meta:
          summaryMeta.get(
            "drafts"
          ) ?? "",
        focus:
          "drafts",
      },
      {
        label:
          copy.emailIssues,
        value:
          emailIssueLeads.length,
        meta:
          summaryMeta.get(
            "email-issues"
          ) ?? "",
        focus:
          "email-issues",
      },
      {
        label:
          copy.ooo,
        value:
          oooReturningToday.length,
        meta:
          summaryMeta.get(
            "ooo"
          ) ?? "",
        focus:
          "ooo",
      },
    ];

  const focusTabs: {
    label:
      string;
    focus:
      DashboardFocus
      | null;
    count:
      number;
  }[] = [
    {
      label:
        de
          ? "Alle"
          : "All",
      focus:
        null,
      count:
        allCommandCount,
    },
    {
      label:
        de
          ? "Follow-ups"
          : "Follow-ups",
      focus:
        "followups",
      count:
        followUpsDue.length,
    },
    {
      label:
        de
          ? "Entwürfe"
          : "Drafts",
      focus:
        "drafts",
      count:
        readyDraftLeads.length,
    },
    {
      label:
        "HOT",
      focus:
        "hot",
      count:
        hotLeads.length,
    },
  ];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <DashboardMotion>
      <div className="min-h-full bg-[#F6F7F9] text-[#0B0C0E] dark:bg-[#090A0C] dark:text-[#F7F7F8] xl:h-full xl:overflow-hidden">
        <div className="flex w-full flex-col px-4 py-4 sm:px-5 lg:px-[22px] lg:py-[18px] xl:h-full">
          {/* =================================================
              HEADER
          ================================================= */}

          <header
            data-leadbase-reveal
            className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                {copy.eyebrow}
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h1 className="text-[34px] font-semibold leading-none tracking-[-0.045em] sm:text-[38px]">
                  {copy.title}
                </h1>

                <p className="text-sm text-[#6B7078] dark:text-muted-foreground">
                  {allCommandCount}{" "}
                  {de
                    ? "Aktionen priorisiert"
                    : "prioritized actions"}
                  {" · "}
                  {timeCriticalCount}{" "}
                  {de
                    ? "zeitkritisch"
                    : "time-sensitive"}
                </p>
              </div>

              <p className="mt-1.5 max-w-2xl text-[11.5px] leading-4.5 text-[#6B7078] dark:text-muted-foreground">
                {copy.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-[34px] items-center gap-2 rounded-[10px] border border-border bg-card px-3 font-mono text-[10px] uppercase tracking-[0.04em] text-[#6B7078] shadow-[0_1px_2px_rgba(11,12,14,0.02)]  dark:text-muted-foreground">
                <CalendarClock className="size-3.5 opacity-60" />
                {formatToday(
                  language
                )}
              </div>

              <Link
                href="/analytics"
                className="inline-flex h-[34px] items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-[13px] font-medium text-[#40454E] shadow-[0_1px_2px_rgba(11,12,14,0.02)] transition hover:border-black/15 hover:bg-[#FDFDFE]  dark:text-[#D7D9DE] dark:hover:bg-white/[0.06]"
              >
                <BarChart3 className="size-3.5 opacity-60" />
                {copy.analytics}
              </Link>

              <Link
                href="/inbox"
                className="inline-flex h-[34px] items-center gap-2 rounded-[10px] bg-primary px-3.5 text-[13px] font-medium text-primary-foreground shadow-[0_1px_2px_rgba(0,43,186,0.28)] transition hover:bg-[#00229A]"
              >
                <Inbox className="size-3.5" />
                {copy.viewInbox}
              </Link>
            </div>
          </header>

          {/* =================================================
              SUMMARY STRIP
          ================================================= */}

          <DashboardSummaryStrip
            cards={
              summaryCards
            }
            initialFocus={
              activeFocus
            }
          />

          {/* =================================================
              MAIN COMMAND CENTER
          ================================================= */}

          <section
            data-leadbase-reveal
            className="mt-3 grid gap-3 xl:min-h-0 xl:flex-1 xl:grid-cols-[286px_minmax(0,1fr)_360px]"
          >
            {/* LEFT RAIL */}
            <div className="flex min-w-0 flex-col gap-4 xl:min-h-0">
              <div className="rounded-[15px] bg-[#0B0C0E] p-3.5 text-white shadow-[0_1px_2px_rgba(11,12,14,0.12)] dark:border dark:border-white/10">
                {featuredHotLead ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/60">
                        <Flame className="size-3" />
                        {de
                          ? "Hot Lead"
                          : "Hot lead"}
                      </div>

                      <div className="font-mono text-[9px] text-white/40">
                        1 / {openLeads.length}
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">
                          {
                            featuredHotCompany
                              ?.name ??
                            companyNameByLeadId.get(
                              featuredHotLead.id
                            )
                          }
                        </p>

                        <p className="mt-1 truncate text-[11px] text-white/55">
                          {statusLabel(
                            featuredHotLead.status,
                            language
                          )}
                          {featuredHotCompany
                            ?.industry
                            ? ` · ${featuredHotCompany.industry}`
                            : ""}
                        </p>
                      </div>

                      <div
                        className="flex size-[54px] shrink-0 items-center justify-center rounded-full p-[5px]"
                        style={{
                          background:
                            `conic-gradient(#3B5BE0 0 ${Math.max(
                              0,
                              Math.min(
                                100,
                                Number(
                                  featuredHotLead.hot_lead_score ??
                                    0
                                )
                              )
                            )}%, rgba(255,255,255,.12) ${Math.max(
                              0,
                              Math.min(
                                100,
                                Number(
                                  featuredHotLead.hot_lead_score ??
                                    0
                                )
                              )
                            )}% 100%)`,
                        }}
                      >
                        <div className="flex size-full items-center justify-center rounded-full bg-[#0B0C0E] font-mono text-[13px] font-medium">
                          {Number(
                            featuredHotLead.hot_lead_score ??
                              0
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {featuredHotPreview
                        ?.sessions.size ? (
                        <div className="flex items-center gap-2 text-[11px] text-white/70">
                          <CircleDot className="size-3 shrink-0 text-white/55" />
                          <span className="min-w-0 truncate">
                            {featuredHotPreview.sessions.size}{" "}
                            {de
                              ? `Preview-Session${featuredHotPreview.sessions.size === 1 ? "" : "s"}`
                              : `preview session${featuredHotPreview.sessions.size === 1 ? "" : "s"}`}
                            {featuredHotPreview.latestSeen
                              ? ` · ${formatDateTime(
                                  featuredHotPreview.latestSeen,
                                  language
                                )}`
                              : ""}
                          </span>
                        </div>
                      ) : null}

                      {featuredHotPreview &&
                      featuredHotPreview.maxScroll >
                        0 ? (
                        <div className="flex items-center gap-2 text-[11px] text-white/70">
                          <ArrowRight className="size-3 shrink-0 rotate-90 text-white/55" />
                          <span>
                            {de
                              ? "Max. Scrolltiefe"
                              : "Max scroll depth"}
                            {" "}
                            {Math.round(
                              featuredHotPreview.maxScroll
                            )}
                            %
                            {featuredHotPreview.maxDuration >
                            0
                              ? ` · ${formatCompactDuration(
                                  featuredHotPreview.maxDuration
                                )}`
                              : ""}
                          </span>
                        </div>
                      ) : null}

                      {!featuredHotPreview
                        ?.sessions.size &&
                      !featuredHotPreview
                        ?.maxScroll ? (
                        <div className="flex items-center gap-2 text-[11px] text-white/60">
                          <Sparkles className="size-3 shrink-0" />
                          <span>
                            {de
                              ? "HOT Score aus realen Lead-Signalen"
                              : "HOT score from real lead signals"}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {featuredHotReply ? (
                        <Link
                          href={`/inbox?lead=${encodeURIComponent(
                            featuredHotLead.id
                          )}`}
                          className="inline-flex h-8 min-w-0 flex-1 items-center justify-center rounded-[9px] bg-white px-3 text-[12px] font-medium text-[#0B0C0E] transition hover:bg-white/90"
                        >
                          {de
                            ? "Antwort öffnen"
                            : "Open reply"}
                        </Link>
                      ) : featuredHotDraft &&
                        !featuredHotDraft.sent_at ? (
                        <Link
                          href={`/leads/${featuredHotLead.id}#outreach`}
                          className="inline-flex h-8 min-w-0 flex-1 items-center justify-center rounded-[9px] bg-white px-3 text-[12px] font-medium text-[#0B0C0E] transition hover:bg-white/90"
                        >
                          {de
                            ? "Entwurf öffnen"
                            : "Open draft"}
                        </Link>
                      ) : (
                        <Link
                          href={`/leads/${featuredHotLead.id}`}
                          className="inline-flex h-8 min-w-0 flex-1 items-center justify-center rounded-[9px] bg-white px-3 text-[12px] font-medium text-[#0B0C0E] transition hover:bg-white/90"
                        >
                          {de
                            ? "HOT Lead prüfen"
                            : "Review HOT lead"}
                        </Link>
                      )}

                      <Link
                        href={`/leads/${featuredHotLead.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-[9px] border border-white/[0.18] px-3 text-[12px] text-white/80 transition hover:bg-white/[0.08]"
                      >
                        {de
                          ? "Lead öffnen"
                          : "Open lead"}
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[200px] flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/55">
                        <Flame className="size-3" />
                        {de
                          ? "Hot Lead"
                          : "Hot lead"}
                      </div>

                      <p className="mt-5 text-[16px] font-semibold">
                        {copy.noHot}
                      </p>

                      <p className="mt-2 text-[11px] leading-5 text-white/50">
                        {de
                          ? "Sobald ein Lead echte starke Signale erreicht, erscheint er hier."
                          : "A lead appears here as soon as it reaches real strong signals."}
                      </p>
                    </div>

                    <Link
                      href="/leads"
                      className="mt-5 inline-flex h-8 items-center justify-center rounded-[9px] bg-white px-3 text-[12px] font-medium text-[#0B0C0E]"
                    >
                      {copy.viewAllLeads}
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-[15px] border border-border bg-card p-3.5 shadow-[var(--lb-shadow-xs)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[13px] font-semibold tracking-[-0.01em]">
                    {copy.pipeline}
                  </h2>

                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#6B7078]">
                    {leads.length}{" "}
                    {de
                      ? "Leads"
                      : "leads"}
                  </span>
                </div>

                <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between gap-2.5">
                  {pipelineStatuses.map(
                    (
                      status
                    ) => {
                      const value =
                        statusCounts.get(
                          status
                        ) ??
                        0;

                      const width =
                        value >
                        0
                          ? Math.max(
                              3,
                              Math.round(
                                value /
                                  maximumPipelineCount *
                                  100
                              )
                            )
                          : 0;

                      const emphasized =
                        status ===
                          "CONTACTED" ||
                        status ===
                          "DRAFT_READY";

                      return (
                        <div
                          key={
                            status
                          }
                          className="grid grid-cols-[80px_minmax(0,1fr)_24px] items-center gap-2.5"
                        >
                          <span
                            className={`truncate text-[10.5px] ${
                              emphasized
                                ? "font-medium text-foreground"
                                : "text-[#565B63] dark:text-muted-foreground"
                            }`}
                          >
                            {statusLabel(
                              status,
                              language
                            )}
                          </span>

                          <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.055] dark:bg-white/[0.07]">
                            <div
                              className={`h-full rounded-full ${
                                emphasized
                                  ? "bg-primary"
                                  : "bg-primary/45"
                              }`}
                              style={{
                                width:
                                  `${width}%`,
                              }}
                            />
                          </div>

                          <span className={`text-right font-mono text-[10px] tabular-nums ${value ? "text-foreground" : "text-[#8B9097]"}`}>
                            {value}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-2.5 dark:border-white/[0.07]">
                  <span className="text-[10.5px] text-[#6B7078]">
                    {de
                      ? "Antwortquote"
                      : "Reply rate"}
                  </span>

                  <span className="font-mono text-[10.5px] font-medium text-primary">
                    {new Intl.NumberFormat(
                      de
                        ? "de-DE"
                        : "en-GB",
                      {
                        minimumFractionDigits:
                          1,
                        maximumFractionDigits:
                          1,
                      }
                    ).format(
                      responseRate
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* CENTER */}
            <div className="flex min-w-0 flex-col gap-2.5 xl:min-h-0">
              <DashboardFocusWorkspace
                initialFocus={
                  activeFocus
                }
                groups={
                  dashboardCommandGroups
                }
                tabs={
                  focusTabs
                }
                language={
                  language
                }
                title={
                  copy.focus
                }
                description={
                  copy.focusDescription
                }
                emptyTitle={
                  copy.nothingUrgent
                }
                emptyDescription={
                  copy.nothingUrgentDescription
                }
              />

              <div className="grid gap-2 sm:grid-cols-3">
                <QuickAction
                  href="/find-leads"
                  icon={
                    Search
                  }
                  title={
                    de
                      ? "Neue Leads finden"
                      : "Find new leads"
                  }
                  description={
                    de
                      ? "Recherche starten"
                      : "Start research"
                  }
                />

                <QuickAction
                  href="/inbox"
                  icon={
                    Inbox
                  }
                  title={
                    de
                      ? "Inbox bearbeiten"
                      : "Work the inbox"
                  }
                  description={
                    de
                      ? "Antworten & Rückfragen"
                      : "Replies & questions"
                  }
                />

                <QuickAction
                  href="/leads"
                  icon={
                    UserRoundCheck
                  }
                  title={
                    de
                      ? "Leads priorisieren"
                      : "Prioritize leads"
                  }
                  description={
                    de
                      ? "HOT Scores prüfen"
                      : "Review HOT scores"
                  }
                />
              </div>
            </div>

            {/* RIGHT RAIL */}
            <div className="flex min-w-0 flex-col gap-2.5 xl:min-h-0">
              <div className="rounded-[15px] border border-border bg-card p-3.5 shadow-[0_1px_2px_rgba(11,12,14,0.03)] ">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#6B7078]">
                    {copy.overview}
                  </span>

                  <span className="font-mono text-[9px] text-[#7D828A]">
                    {new Date().getFullYear()}
                  </span>
                </div>

                <div className="mt-3.5 flex items-end gap-3">
                  <p className="text-[28px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                    {formatCurrency(
                      bookedValue,
                      language
                    )}
                  </p>

                  <span className="pb-0.5 text-[11px] text-[#6B7078]">
                    {copy.booked.toLowerCase()}
                  </span>
                </div>

                <div className="mt-3.5 h-[7px] overflow-hidden rounded-full bg-black/[0.055] dark:bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width:
                        `${paidProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <BusinessMetric
                    label={
                      copy.paid
                    }
                    value={
                      formatCurrency(
                        paidRevenue,
                        language
                      )
                    }
                  />

                  <BusinessMetric
                    label={
                      copy.outstanding
                    }
                    value={
                      formatCurrency(
                        outstanding,
                        language
                      )
                    }
                    accent
                  />

                  <BusinessMetric
                    label={
                      copy.sent
                    }
                    value={
                      String(
                        sentEmailsResult.count ??
                          0
                      )
                    }
                  />
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-3 text-[10.5px] dark:border-white/[0.07]">
                  <span className="text-[#6B7078]">
                    {copy.pipelineValue}
                  </span>

                  <span className="font-mono font-medium text-foreground">
                    {formatCurrency(
                      pipelineValue,
                      language
                    )}
                  </span>
                </div>
              </div>

              <DashboardDailyStreak />

              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[15px] border border-border bg-card shadow-[var(--lb-shadow-xs)]">
                <div className="flex items-center justify-between px-3.5 pb-2.5 pt-3.5">
                  <h2 className="text-[13px] font-semibold tracking-[-0.01em]">
                    {copy.projects}
                  </h2>

                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                  >
                    {de
                      ? "Alle"
                      : "All"}
                    <ArrowRight className="size-3" />
                  </Link>
                </div>

                {recentProjects.length ===
                0 ? (
                  <div className="px-[18px] pb-[18px] text-[11px] text-[#6B7078]">
                    {de
                      ? "Noch keine Projekte"
                      : "No projects yet"}
                  </div>
                ) : (
                  <div className="px-2.5 pb-2.5">
                    {recentProjects.map(
                      (
                        project
                      ) => {
                        const total =
                          Number(
                            project.total_value ??
                              0
                          );

                        const paid =
                          Number(
                            project.amount_paid ??
                              0
                          );

                        return (
                          <Link
                            key={
                              project.id
                            }
                            href={`/projects/${project.id}/edit`}
                            className="group flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 transition hover:bg-[#F7F8FA] dark:hover:bg-white/[0.035]"
                          >
                            <span
                              className={`h-8 w-[3px] shrink-0 rounded-full ${
                                project.status ===
                                "IN_PROGRESS"
                                  ? "bg-primary"
                                  : "bg-black/[0.14] dark:bg-white/[0.16]"
                              }`}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <p className="truncate text-[12px] font-medium tracking-[-0.01em]">
                                  {project.project_name}
                                </p>

                                <StatusBadge
                                  tone={
                                    getProjectStatusTone(
                                      project.status
                                    )
                                  }
                                >
                                  {projectStatusLabel(
                                    project.status,
                                    language
                                  )}
                                </StatusBadge>
                              </div>

                              <p className="mt-0.5 truncate text-[10px] text-[#6B7078]">
                                {project.client_name}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="font-mono text-[10.5px] tabular-nums">
                                {formatCurrency(
                                  total,
                                  language
                                )}
                              </p>

                              <p className="mt-0.5 font-mono text-[8.5px] text-[#7E838B]">
                                {formatCurrency(
                                  paid,
                                  language
                                )}{" "}
                                {de
                                  ? "bezahlt"
                                  : "paid"}
                              </p>
                            </div>
                          </Link>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardMotion>
  );
}

/* =========================================================
   SMALL BUSINESS METRIC
========================================================= */

function BusinessMetric({
  label,
  value,
  accent = false,
}: {
  label:
    string;

  value:
    string;

  accent?:
    boolean;
}) {
  return (
    <div className="min-w-0 rounded-[11px] bg-[#F7F8FA] px-3 py-2.5 dark:bg-white/[0.045]">
      <p className="truncate text-[9.5px] text-[#6B7078]">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-[13px] font-semibold tracking-[-0.02em] tabular-nums ${
          accent
            ? "text-primary"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  href,
  icon:
    Icon,
  title,
  description,
}: {
  href:
    string;

  icon:
    typeof Users;

  title:
    string;

  description:
    string;
}) {
  return (
    <Link
      href={
        href
      }
      className="group flex min-h-[54px] min-w-0 items-center gap-2.5 rounded-[13px] border border-border bg-card px-2.5 py-2 shadow-[0_1px_2px_rgba(11,12,14,0.03)] transition hover:border-primary/30 hover:shadow-[0_4px_14px_-6px_rgba(0,43,186,0.20)]"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#EAEEFB] text-primary dark:bg-primary/15">
        <Icon className="size-4" />
      </span>

      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block truncate whitespace-nowrap text-[10.5px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
          {title}
        </span>

        <span className="mt-1 block truncate whitespace-nowrap text-[8.5px] leading-[1.15] text-[#6B7078] dark:text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  );
}
