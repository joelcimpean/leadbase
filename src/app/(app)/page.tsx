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
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  DashboardMotion,
} from "@/components/dashboard-motion";

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
  return new Intl.DateTimeFormat(
    getLocale(
      language
    ),
    {
      timeZone:
        "Europe/Berlin",

      weekday:
        "long",

      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    }
  ).format(
    new Date()
  );
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
            name
          ),

          primary_contact:contacts (
            full_name,
            email,
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

  const commandItems =
    (
      activeFocus
        ? commandsByFocus.get(
            activeFocus
          ) ?? []
        : Array.from(
            commandByKey.values()
          )
    )
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
        activeFocus
          ? 30
          : 10
      );

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
        ) =>
          timestamp(
            b.completed_at ??
            b.started_at ??
            b.created_at
          ) -
          timestamp(
            a.completed_at ??
            a.started_at ??
            a.created_at
          )
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

  const summaryCards = [
    {
      label:
        copy.unreadReplies,

      value:
        unreadHumanReplyByLead.size,

      icon:
        MessageSquareReply,

      focus:
        "replies" as const,

      href:
        "/?focus=replies#dashboard-focus",

      accent:
        unreadHumanReplyByLead.size >
        0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-muted-foreground",
    },

    {
      label:
        copy.hotLeads,

      value:
        hotLeads.length,

      icon:
        Flame,

      focus:
        "hot" as const,

      href:
        "/?focus=hot#dashboard-focus",

      accent:
        hotLeads.length >
        0
          ? "text-orange-600 dark:text-orange-400"
          : "text-muted-foreground",
    },

    {
      label:
        copy.followUps,

      value:
        followUpsDue.length,

      icon:
        CalendarClock,

      focus:
        "followups" as const,

      href:
        "/?focus=followups#dashboard-focus",

      accent:
        followUpsDue.length >
        0
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground",
    },

    {
      label:
        copy.emailIssues,

      value:
        emailIssueLeads.length,

      icon:
        ShieldAlert,

      focus:
        "email-issues" as const,

      href:
        "/?focus=email-issues#dashboard-focus",

      accent:
        emailIssueLeads.length >
        0
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground",
    },

    {
      label:
        copy.drafts,

      value:
        readyDraftLeads.length,

      icon:
        Mail,

      focus:
        "drafts" as const,

      href:
        "/?focus=drafts#dashboard-focus",

      accent:
        readyDraftLeads.length >
        0
          ? "text-blue-600 dark:text-blue-400"
          : "text-muted-foreground",
    },

    {
      label:
        copy.ooo,

      value:
        oooReturningToday.length,

      icon:
        BellRing,

      focus:
        "ooo" as const,

      href:
        "/?focus=ooo#dashboard-focus",

      accent:
        oooReturningToday.length >
        0
          ? "text-violet-600 dark:text-violet-400"
          : "text-muted-foreground",
    },
  ];

  const activeFocusLabel =
    activeFocus
      ? summaryCards.find(
          (
            card
          ) =>
            card.focus ===
            activeFocus
        )?.label ?? null
      : null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <DashboardMotion>
      <div className="leadbase-page-surface relative min-h-full overflow-hidden">
        <div className="leadbase-dashboard-grid absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header data-leadbase-reveal className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/[0.045] px-2.5 py-1 text-xs font-medium text-primary">
            <span className="leadbase-live-dot size-1.5 rounded-full bg-primary" />

            {copy.eyebrow}
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {
              copy.title
            }
          </h1>

          <p className="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {
              copy.description
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="h-9 rounded-xl border-border/70 bg-background/80 px-3 font-normal shadow-sm backdrop-blur"
          >
            {
              formatToday(
                language
              )
            }
          </Badge>

          <Link
            href="/analytics"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-3 text-xs font-medium shadow-sm backdrop-blur transition-all hover:-translate-y-px hover:border-primary/20 hover:bg-accent/70 hover:text-primary"
          >
            <BarChart3 className="size-3.5" />

            {
              copy.analytics
            }
          </Link>

          <Link
            href="/inbox"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-3 text-xs font-medium shadow-sm backdrop-blur transition-all hover:-translate-y-px hover:border-primary/20 hover:bg-accent/70 hover:text-primary"
          >
            <Inbox className="size-3.5" />

            {
              copy.viewInbox
            }
          </Link>
        </div>
      </header>

      {/* ===================================================
          TODAY SUMMARY
      =================================================== */}

      <section data-leadbase-reveal data-anime-stagger className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map(
          (
            card
          ) => {
            const Icon =
              card.icon;

            return (
              <Link
                key={
                  card.label
                }
                href={
                  card.href
                }
                className="group min-w-0"
                data-motion-lift="true"
                data-motion-press="true"
              >
                <Card
                  className={`leadbase-kpi-card h-full min-w-0 py-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/20 group-hover:shadow-[0_14px_36px_color-mix(in_srgb,var(--primary)_8%,transparent)] ${
                    activeFocus ===
                    card.focus
                      ? "border-primary/35 ring-1 ring-primary/10"
                      : "border-border/70"
                  }`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {
                          card.label
                        }
                      </p>

                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.055]">
                        <Icon
                          className={`size-4 shrink-0 ${card.accent}`}
                        />
                      </span>
                    </div>

                    <p data-motion-count className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
                      {
                        card.value
                      }
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          }
        )}
      </section>

      {/* ===================================================
          FOCUS + HOT LEADS
      =================================================== */}

      <section id="dashboard-focus" data-leadbase-reveal className="mt-4 scroll-mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="leadbase-panel min-w-0 border-border/70">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />

                  <h2 className="text-sm font-semibold">
                    {
                      activeFocusLabel ??
                      copy.focus
                    }
                  </h2>
                </div>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {
                    activeFocusLabel
                      ? de
                        ? `Nur ${activeFocusLabel.toLowerCase()} werden hier angezeigt.`
                        : `Only ${activeFocusLabel.toLowerCase()} are shown here.`
                      : copy.focusDescription
                  }
                </p>
              </div>

              <Link
                href={
                  activeFocus
                    ? "/#dashboard-focus"
                    : "/leads"
                }
                className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {
                  activeFocus
                    ? de
                      ? "Filter zurücksetzen"
                      : "Clear filter"
                    : copy.viewAllLeads
                }
              </Link>
            </div>

            {commandItems.length ===
            0 ? (
              <div className="flex min-h-64 items-center justify-center p-6 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-xl border">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  <p className="mt-4 text-sm font-medium">
                    {
                      copy.nothingUrgent
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {
                      copy.nothingUrgentDescription
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div data-motion-list-stagger className="divide-y">
                {commandItems.map(
                  (
                    item
                  ) => (
                    <Link
                      key={
                        item.key
                      }
                      href={
                        item.href
                      }
                      className="group flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:items-center sm:px-5"
                    >
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background sm:mt-0">
                        <CircleDot className="size-3.5 text-muted-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold">
                            {
                              item.title
                            }
                          </p>

                          <Badge
                            variant="outline"
                            className={`shrink-0 rounded-full text-[10px] ${item.badgeClass}`}
                          >
                            {
                              item.badge
                            }
                          </Badge>
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground sm:truncate">
                          {
                            item.description
                          }
                        </p>
                      </div>

                      <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:mt-0" />
                    </Link>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="leadbase-panel min-w-0 border-border/70">
          <CardContent className="p-0">
            <div className="border-b px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-orange-600 dark:text-orange-400" />

                <h2 className="text-sm font-semibold">
                  {
                    copy.hotNow
                  }
                </h2>
              </div>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {
                  copy.hotNowDescription
                }
              </p>
            </div>

            {hotLeads.length ===
            0 ? (
              <div className="flex min-h-64 items-center justify-center px-5 py-8 text-center">
                <div>
                  <Flame className="mx-auto size-5 text-muted-foreground" />

                  <p className="mt-3 text-sm font-medium">
                    {
                      copy.noHot
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {hotLeads
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      lead
                    ) => {
                      const score =
                        Number(
                          lead.hot_lead_score ??
                            0
                        );

                      const preview =
                        previewByLead.get(
                          lead.id
                        );

                      return (
                        <Link
                          key={
                            lead.id
                          }
                          href={`/leads/${lead.id}`}
                          className="group block px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5"
                        >
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {companyNameByLeadId.get(
                                  lead.id
                                )}
                              </p>

                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {preview?.sessions.size
                                  ? de
                                    ? `${preview.sessions.size} externe Preview-Session${preview.sessions.size === 1 ? "" : "s"}`
                                    : `${preview.sessions.size} external preview session${preview.sessions.size === 1 ? "" : "s"}`
                                  : statusLabel(
                                      lead.status,
                                      language
                                    )}
                              </p>
                            </div>

                            <Badge
                              variant="outline"
                              className="shrink-0 rounded-full border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300"
                            >
                              🔥{" "}
                              {
                                score
                              }{" "}
                              HOT
                            </Badge>
                          </div>
                        </Link>
                      );
                    }
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ===================================================
          BUSINESS OVERVIEW
      =================================================== */}

      <section data-leadbase-reveal className="mt-4">
        <div>
          <h2 className="text-sm font-semibold">
            {
              copy.overview
            }
          </h2>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <MetricCard
            label={
              copy.pipelineValue
            }
            value={
              formatCurrency(
                pipelineValue,
                language
              )
            }
            icon={
              Users
            }
          />

          <MetricCard
            label={
              copy.booked
            }
            value={
              formatCurrency(
                bookedValue,
                language
              )
            }
            icon={
              BriefcaseBusiness
            }
          />

          <MetricCard
            label={
              copy.paid
            }
            value={
              formatCurrency(
                paidRevenue,
                language
              )
            }
            icon={
              Banknote
            }
          />

          <MetricCard
            label={
              copy.outstanding
            }
            value={
              formatCurrency(
                outstanding,
                language
              )
            }
            icon={
              WalletCards
            }
          />

          <MetricCard
            label={
              copy.sent
            }
            value={
              String(
                sentEmailsResult.count ??
                  0
              )
            }
            icon={
              Mail
            }
          />
        </div>
      </section>

      {/* ===================================================
          PIPELINE + PROJECTS
      =================================================== */}

      <section data-leadbase-reveal className="mt-4 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <Card className="leadbase-panel min-w-0 border-border/70">
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold">
              {
                copy.pipeline
              }
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {
                copy.pipelineDescription
              }
            </p>

            <div className="mt-5 space-y-4">
              {pipelineStatuses.map(
                (
                  status
                ) => {
                  const value =
                    statusCounts.get(
                      status
                    ) ??
                    0;

                  const percentage =
                    leads.length >
                    0
                      ? Math.round(
                          value /
                            leads.length *
                            100
                        )
                      : 0;

                  return (
                    <div
                      key={
                        status
                      }
                    >
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-muted-foreground">
                          {statusLabel(
                            status,
                            language
                          )}
                        </span>

                        <span className="font-medium">
                          {
                            value
                          }
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${pipelineBarClass(
                            status
                          )}`}
                          style={{
                            width:
                              `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="leadbase-panel min-w-0 border-border/70">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold">
                  {
                    copy.projects
                  }
                </h2>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {
                    copy.projectsDescription
                  }
                </p>
              </div>

              <Link
                href="/projects"
                className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {
                  copy.allProjects
                }
              </Link>
            </div>

            {recentProjects.length ===
            0 ? (
              <div className="flex min-h-64 items-center justify-center p-6 text-center">
                <div>
                  <BriefcaseBusiness className="mx-auto size-5 text-muted-foreground" />

                  <p className="mt-3 text-sm font-medium">
                    {de
                      ? "Noch keine Projekte"
                      : "No projects yet"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
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
                        className="group block px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="min-w-0 truncate text-sm font-semibold">
                                {
                                  project.project_name
                                }
                              </p>

                              <Badge
                                variant="outline"
                                className="shrink-0 rounded-full text-[10px]"
                              >
                                {projectStatusLabel(
                                  project.status,
                                  language
                                )}
                              </Badge>
                            </div>

                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {
                                project.client_name
                              }
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                              <span>
                                {de
                                  ? "Wert"
                                  : "Value"}
                                :{" "}
                                <strong className="font-medium text-foreground">
                                  {formatCurrency(
                                    total,
                                    language
                                  )}
                                </strong>
                              </span>

                              <span>
                                {de
                                  ? "Bezahlt"
                                  : "Paid"}
                                :{" "}
                                <strong className="font-medium text-foreground">
                                  {formatCurrency(
                                    paid,
                                    language
                                  )}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ===================================================
          QUICK ACTIONS
      =================================================== */}

      <section data-leadbase-reveal className="mt-4 grid gap-3 sm:grid-cols-3">
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
              ? "Neue Unternehmen recherchieren und direkt einer Kampagne zuordnen."
              : "Research new companies and assign them directly to a campaign."
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
              ? "Echte Antworten, Rückfragen und OOO-Mails prüfen."
              : "Review real replies, questions and out-of-office messages."
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
              ? "HOT Scores, Preview-Signale und offene Drafts bearbeiten."
              : "Work HOT scores, preview signals and pending drafts."
          }
        />
      </section>
        </div>
      </div>
    </DashboardMotion>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  label,
  value,
  icon:
    Icon,
}: {
  label:
    string;

  value:
    string;

  icon:
    typeof Users;
}) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {
              label
            }
          </p>

          <Icon className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <p className="mt-4 break-words text-xl font-semibold tracking-tight">
          {
            value
          }
        </p>
      </CardContent>
    </Card>
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
      className="group min-w-0"
    >
      <Card className="leadbase-panel h-full border-border/70 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/20 group-hover:shadow-[0_16px_40px_color-mix(in_srgb,var(--primary)_7%,transparent)]">
        <CardContent className="flex h-full items-start justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <div className="flex size-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.055] text-primary">
              <Icon className="size-4" />
            </div>

            <p className="mt-4 text-sm font-semibold">
              {
                title
              }
            </p>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {
                description
              }
            </p>
          </div>

          <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}
