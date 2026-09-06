import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Eye,
  Flame,
  Mail,
  MessageSquareReply,
  Minus,
  MousePointerClick,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type AppLanguage =
  | "de"
  | "en";

type AnalyticsRange =
  | "7"
  | "30"
  | "90"
  | "all";

type AnalyticsPageProps = {
  searchParams:
    Promise<{
      range?:
        string;
    }>;
};

type CampaignRow = {
  id:
    string;

  name:
    string;

  status:
    string;
};

type LeadRow = {
  id:
    string;

  campaign_id:
    string
    | null;

  status:
    string;

  estimated_project_value:
    number
    | null;

  hot_lead_score:
    number
    | null;

  hot_lead_level:
    string
    | null;
};

type DraftRow = {
  lead_id:
    string;

  sent_at:
    string
    | null;

  follow_up_sent_at:
    string
    | null;
};

type MessageRow = {
  lead_id:
    string;

  direction:
    string;

  received_at:
    string;

  is_automatic_reply:
    boolean;

  reply_classification:
    string
    | null;
};

type VisitRow = {
  lead_id:
    string;

  visitor_id:
    string;

  session_id:
    string;

  source:
    string;

  is_owner:
    boolean;

  is_engaged:
    boolean;

  last_seen_at:
    string;
};

type Metrics = {
  contacted:
    number;

  viewed:
    number;

  replied:
    number;

  interested:
    number;

  won:
    number;

  hot:
    number;

  engaged:
    number;

  questions:
    number;

  wonEstimatedValue:
    number;

  replyRate:
    number;

  previewRate:
    number;

  interestedRate:
    number;

  wonRate:
    number;
};

/* =========================================================
   HELPERS
========================================================= */

function percent(
  numerator:
    number,
  denominator:
    number
) {
  if (
    denominator <=
    0
  ) {
    return 0;
  }

  return Math.round(
    numerator /
      denominator *
      100
  );
}

function formatPercent(
  value:
    number
) {
  return `${value}%`;
}

function formatCurrency(
  value:
    number,
  language:
    AppLanguage
) {
  return new Intl.NumberFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-GB",
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

function normalizeRange(
  value:
    string
    | undefined
): AnalyticsRange {
  if (
    value ===
      "7" ||
    value ===
      "30" ||
    value ===
      "90" ||
    value ===
      "all"
  ) {
    return value;
  }

  return "30";
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

function rangeDays(
  range:
    AnalyticsRange
) {
  if (
    range ===
    "all"
  ) {
    return null;
  }

  return Number(
    range
  );
}

function rangeBounds(
  range:
    AnalyticsRange
) {
  const days =
    rangeDays(
      range
    );

  if (
    days ===
    null
  ) {
    return {
      start:
        null,

      end:
        null,

      previousStart:
        null,

      previousEnd:
        null,
    };
  }

  const end =
    new Date();

  const start =
    new Date(
      end.getTime() -
        days *
          24 *
          60 *
          60 *
          1000
    );

  const previousEnd =
    start;

  const previousStart =
    new Date(
      previousEnd.getTime() -
        days *
          24 *
          60 *
          60 *
          1000
    );

  return {
    start:
      start.toISOString(),

    end:
      end.toISOString(),

    previousStart:
      previousStart.toISOString(),

    previousEnd:
      previousEnd.toISOString(),
  };
}

function isInsideRange({
  value,
  start,
  end,
}: {
  value:
    string
    | null
    | undefined;

  start:
    string
    | null;

  end:
    string
    | null;
}) {
  if (
    !value
  ) {
    return false;
  }

  if (
    !start ||
    !end
  ) {
    return true;
  }

  const time =
    timestamp(
      value
    );

  return (
    time >=
      timestamp(
        start
      ) &&
    time <
      timestamp(
        end
      )
  );
}

function campaignStatusLabel(
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
    case "ACTIVE":
      return de
        ? "Aktiv"
        : "Active";

    case "DRAFT":
      return de
        ? "Entwurf"
        : "Draft";

    case "PAUSED":
      return de
        ? "Pausiert"
        : "Paused";

    case "ARCHIVED":
      return de
        ? "Archiviert"
        : "Archived";

    default:
      return status;
  }
}

function campaignStatusClass(
  status:
    string
) {
  switch (
    status
  ) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";

    case "PAUSED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";

    default:
      return "";
  }
}

function buildInitialSentAtByLead(
  drafts:
    DraftRow[]
) {
  const result =
    new Map<
      string,
      string
    >();

  for (
    const draft of
      drafts
  ) {
    if (
      !draft.sent_at
    ) {
      continue;
    }

    const current =
      result.get(
        draft.lead_id
      );

    if (
      !current ||
      timestamp(
        draft.sent_at
      ) <
        timestamp(
          current
        )
    ) {
      result.set(
        draft.lead_id,
        draft.sent_at
      );
    }
  }

  return result;
}

function calculateMetrics({
  cohortLeadIds,
  leads,
  messages,
  visits,
}: {
  cohortLeadIds:
    Set<string>;

  leads:
    LeadRow[];

  messages:
    MessageRow[];

  visits:
    VisitRow[];
}): Metrics {
  const humanReplyLeadIds =
    new Set(
      messages
        .filter(
          (
            message
          ) =>
            cohortLeadIds.has(
              message.lead_id
            ) &&
            !message.is_automatic_reply &&
            message.reply_classification !==
              "BOUNCE"
        )
        .map(
          (
            message
          ) =>
            message.lead_id
        )
    );

  const interestedLeadIds =
    new Set(
      messages
        .filter(
          (
            message
          ) =>
            cohortLeadIds.has(
              message.lead_id
            ) &&
            !message.is_automatic_reply &&
            message.reply_classification ===
              "INTERESTED"
        )
        .map(
          (
            message
          ) =>
            message.lead_id
        )
    );

  const questionLeadIds =
    new Set(
      messages
        .filter(
          (
            message
          ) =>
            cohortLeadIds.has(
              message.lead_id
            ) &&
            !message.is_automatic_reply &&
            message.reply_classification ===
              "QUESTION"
        )
        .map(
          (
            message
          ) =>
            message.lead_id
        )
    );

  const viewedLeadIds =
    new Set(
      visits
        .filter(
          (
            visit
          ) =>
            cohortLeadIds.has(
              visit.lead_id
            ) &&
            !visit.is_owner
        )
        .map(
          (
            visit
          ) =>
            visit.lead_id
        )
    );

  const engagedLeadIds =
    new Set(
      visits
        .filter(
          (
            visit
          ) =>
            cohortLeadIds.has(
              visit.lead_id
            ) &&
            !visit.is_owner &&
            visit.is_engaged
        )
        .map(
          (
            visit
          ) =>
            visit.lead_id
        )
    );

  const cohortLeads =
    leads.filter(
      (
        lead
      ) =>
        cohortLeadIds.has(
          lead.id
        )
    );

  const wonLeads =
    cohortLeads.filter(
      (
        lead
      ) =>
        lead.status ===
        "WON"
    );

  const hot =
    cohortLeads.filter(
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
    ).length;

  const contacted =
    cohortLeadIds.size;

  const viewed =
    viewedLeadIds.size;

  const replied =
    humanReplyLeadIds.size;

  const interested =
    interestedLeadIds.size;

  const won =
    wonLeads.length;

  return {
    contacted,

    viewed,

    replied,

    interested,

    won,

    hot,

    engaged:
      engagedLeadIds.size,

    questions:
      questionLeadIds.size,

    wonEstimatedValue:
      wonLeads.reduce(
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
      ),

    replyRate:
      percent(
        replied,
        contacted
      ),

    previewRate:
      percent(
        viewed,
        contacted
      ),

    interestedRate:
      percent(
        interested,
        contacted
      ),

    wonRate:
      percent(
        won,
        contacted
      ),
  };
}

function rangeLabel(
  range:
    AnalyticsRange,
  language:
    AppLanguage
) {
  const de =
    language ===
    "de";

  switch (
    range
  ) {
    case "7":
      return de
        ? "Letzte 7 Tage"
        : "Last 7 days";

    case "30":
      return de
        ? "Letzte 30 Tage"
        : "Last 30 days";

    case "90":
      return de
        ? "Letzte 90 Tage"
        : "Last 90 days";

    default:
      return de
        ? "Gesamter Zeitraum"
        : "All time";
  }
}

/* =========================================================
   PAGE
========================================================= */

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const [
    supabase,
    language,
    resolvedSearchParams,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
      searchParams,
    ]);

  const range =
    normalizeRange(
      resolvedSearchParams.range
    );

  const bounds =
    rangeBounds(
      range
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

  const [
    campaignsResult,
    leadsResult,
    draftsResult,
    messagesResult,
    visitsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "campaigns"
        )
        .select(`
          id,
          name,
          status
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "name",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "leads"
        )
        .select(`
          id,
          campaign_id,
          status,
          estimated_project_value,
          hot_lead_score,
          hot_lead_level
        `)
        .eq(
          "user_id",
          user.id
        ),

      supabase
        .from(
          "outreach_drafts"
        )
        .select(`
          lead_id,
          sent_at,
          follow_up_sent_at
        `)
        .eq(
          "user_id",
          user.id
        ),

      supabase
        .from(
          "email_messages"
        )
        .select(`
          lead_id,
          direction,
          received_at,
          is_automatic_reply,
          reply_classification
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "direction",
          "INCOMING"
        ),

      supabase
        .from(
          "design_preview_visits"
        )
        .select(`
          lead_id,
          visitor_id,
          session_id,
          source,
          is_owner,
          is_engaged,
          last_seen_at
        `)
        .eq(
          "user_id",
          user.id
        ),
    ]);

  for (
    const [
      label,
      error,
    ] of [
      [
        "campaigns",
        campaignsResult.error,
      ],
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
    ] as const
  ) {
    if (
      error
    ) {
      console.error(
        `Could not load analytics ${label}:`,
        error
      );
    }
  }

  const campaigns =
    (
      campaignsResult.data ??
      []
    ) as CampaignRow[];

  const leads =
    (
      leadsResult.data ??
      []
    ) as LeadRow[];

  const drafts =
    (
      draftsResult.data ??
      []
    ) as DraftRow[];

  const messages =
    (
      messagesResult.data ??
      []
    ) as MessageRow[];

  const visits =
    (
      visitsResult.data ??
      []
    ) as VisitRow[];

  /*
   * Cohort analytics:
   * The selected period is based on the FIRST outreach send
   * date for each lead. We then measure what happened to
   * those leads.
   */
  const initialSentAtByLead =
    buildInitialSentAtByLead(
      drafts
    );

  const currentCohortLeadIds =
    new Set(
      Array.from(
        initialSentAtByLead.entries()
      )
        .filter(
          (
            [
              ,
              sentAt,
            ]
          ) =>
            isInsideRange({
              value:
                sentAt,

              start:
                bounds.start,

              end:
                bounds.end,
            })
        )
        .map(
          (
            [
              leadId,
            ]
          ) =>
            leadId
        )
    );

  const previousCohortLeadIds =
    range ===
      "all"
      ? new Set<string>()
      : new Set(
          Array.from(
            initialSentAtByLead.entries()
          )
            .filter(
              (
                [
                  ,
                  sentAt,
                ]
              ) =>
                isInsideRange({
                  value:
                    sentAt,

                  start:
                    bounds.previousStart,

                  end:
                    bounds.previousEnd,
                })
            )
            .map(
              (
                [
                  leadId,
                ]
              ) =>
                leadId
            )
        );

  const currentMetrics =
    calculateMetrics({
      cohortLeadIds:
        currentCohortLeadIds,

      leads,

      messages,

      visits,
    });

  const previousMetrics =
    range ===
      "all"
      ? null
      : calculateMetrics({
          cohortLeadIds:
            previousCohortLeadIds,

          leads,

          messages,

          visits,
        });

  const copy =
    language ===
    "de"
      ? {
          eyebrow:
            "Performance",

          title:
            "Analytics",

          description:
            "Sieh, welche Kampagnen, Vorschauen und Antworten tatsächlich zu Interesse und Kunden führen.",

          cohort:
            "Kohorte",

          cohortDescription:
            "Zeitraum basiert auf dem ersten Outreach-Versand pro Lead. Ergebnisse dieser Leads werden bis heute berücksichtigt.",

          sent:
            "Leads kontaktiert",

          replyRate:
            "Antwortquote",

          previewRate:
            "Preview-View-Rate",

          interestedRate:
            "Interessiert-Rate",

          wonRate:
            "Won-Rate",

          wonValue:
            "Gewonnener Schätzwert",

          funnel:
            "Outreach Funnel",

          funnelDescription:
            "Vom ersten Outreach bis zum gewonnenen Lead für die ausgewählte Kohorte.",

          campaigns:
            "Kampagnen-Performance",

          campaignsDescription:
            "Vergleiche deine Kampagnen nach echten Sales-Signalen im ausgewählten Zeitraum.",

          campaign:
            "Kampagne",

          leads:
            "Leads",

          contacted:
            "Kontaktiert",

          viewed:
            "Gesehen",

          replied:
            "Geantwortet",

          interested:
            "Interessiert",

          won:
            "Gewonnen",

          hot:
            "HOT",

          estimated:
            "Pipeline-Wert",

          noCampaigns:
            "Noch keine Kampagnen vorhanden.",

          note:
            "E-Mail-Open-Rate ist noch nicht enthalten. Leadbase misst aktuell echte Preview-Aufrufe statt unzuverlässiger Tracking-Pixel-Opens.",

          dashboard:
            "Dashboard",

          previous:
            "vs. vorheriger Zeitraum",
        }
      : {
          eyebrow:
            "Performance",

          title:
            "Analytics",

          description:
            "See which campaigns, previews and replies actually turn into interest and customers.",

          cohort:
            "Cohort",

          cohortDescription:
            "The selected range is based on each lead’s first outreach send. Outcomes for those leads are measured through today.",

          sent:
            "Leads contacted",

          replyRate:
            "Reply rate",

          previewRate:
            "Preview view rate",

          interestedRate:
            "Interested rate",

          wonRate:
            "Won rate",

          wonValue:
            "Won estimated value",

          funnel:
            "Outreach funnel",

          funnelDescription:
            "From first outreach to a won lead for the selected cohort.",

          campaigns:
            "Campaign performance",

          campaignsDescription:
            "Compare campaigns using real sales signals in the selected period.",

          campaign:
            "Campaign",

          leads:
            "Leads",

          contacted:
            "Contacted",

          viewed:
            "Viewed",

          replied:
            "Replied",

          interested:
            "Interested",

          won:
            "Won",

          hot:
            "HOT",

          estimated:
            "Pipeline value",

          noCampaigns:
            "No campaigns yet.",

          note:
            "Email open rate is not included yet. Leadbase currently measures real preview visits instead of unreliable tracking-pixel opens.",

          dashboard:
            "Dashboard",

          previous:
            "vs. previous period",
        };

  const funnel = [
    {
      key:
        "sent",

      label:
        copy.contacted,

      value:
        currentMetrics.contacted,

      percent:
        currentMetrics.contacted >
        0
          ? 100
          : 0,

      icon:
        Mail,
    },

    {
      key:
        "viewed",

      label:
        copy.viewed,

      value:
        currentMetrics.viewed,

      percent:
        currentMetrics.previewRate,

      icon:
        Eye,
    },

    {
      key:
        "replied",

      label:
        copy.replied,

      value:
        currentMetrics.replied,

      percent:
        currentMetrics.replyRate,

      icon:
        MessageSquareReply,
    },

    {
      key:
        "interested",

      label:
        copy.interested,

      value:
        currentMetrics.interested,

      percent:
        currentMetrics.interestedRate,

      icon:
        Target,
    },

    {
      key:
        "won",

      label:
        copy.won,

      value:
        currentMetrics.won,

      percent:
        currentMetrics.wonRate,

      icon:
        Trophy,
    },
  ];

  const leadsByCampaign =
    new Map<
      string,
      LeadRow[]
    >();

  for (
    const lead of
      leads
  ) {
    if (
      !lead.campaign_id
    ) {
      continue;
    }

    const current =
      leadsByCampaign.get(
        lead.campaign_id
      ) ??
      [];

    current.push(
      lead
    );

    leadsByCampaign.set(
      lead.campaign_id,
      current
    );
  }

  const campaignRows =
    campaigns
      .map(
        (
          campaign
        ) => {
          const campaignLeads =
            leadsByCampaign.get(
              campaign.id
            ) ??
            [];

          const campaignCurrentLeadIds =
            new Set(
              campaignLeads
                .filter(
                  (
                    lead
                  ) =>
                    currentCohortLeadIds.has(
                      lead.id
                    )
                )
                .map(
                  (
                    lead
                  ) =>
                    lead.id
                )
            );

          const metrics =
            calculateMetrics({
              cohortLeadIds:
                campaignCurrentLeadIds,

              leads,

              messages,

              visits,
            });

          const pipelineValue =
            campaignLeads
              .filter(
                (
                  lead
                ) =>
                  campaignCurrentLeadIds.has(
                    lead.id
                  )
              )
              .reduce(
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

          return {
            campaign,

            totalAssigned:
              campaignLeads.length,

            ...metrics,

            pipelineValue,
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.interested -
            a.interested ||
          b.replied -
            a.replied ||
          b.contacted -
            a.contacted
      );

  const ranges: {
    value:
      AnalyticsRange;

    label:
      string;
  }[] = [
    {
      value:
        "7",

      label:
        "7D",
    },

    {
      value:
        "30",

      label:
        "30D",
    },

    {
      value:
        "90",

      label:
        "90D",
    },

    {
      value:
        "all",

      label:
        language ===
          "de"
          ? "Gesamt"
          : "All",
    },
  ];

  return (
    <div className="leadbase-workspace-page min-h-full"><WorkspacePageMotion /><div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header data-workspace-reveal className="leadbase-workspace-header flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {
              copy.eyebrow
            }
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {
              copy.title
            }
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {
              copy.description
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="leadbase-workspace-segmented inline-flex rounded-xl p-1">
            {ranges.map(
              (
                option
              ) => (
                <Link
                  key={
                    option.value
                  }
                  href={`/analytics?range=${option.value}`}
                  data-motion-segment-active={range === option.value ? "true" : undefined}
                  className={`inline-flex h-7 min-w-10 items-center justify-center rounded-md px-2.5 text-xs font-medium transition-colors ${
                    range ===
                    option.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {
                    option.label
                  }
                </Link>
              )
            )}
          </div>

          <Link
            href="/"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <BarChart3 className="size-4" />

            {
              copy.dashboard
            }
          </Link>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge
          variant="outline"
          className="rounded-full font-medium"
        >
          {
            rangeLabel(
              range,
              language
            )
          }
        </Badge>

        <span>
          {
            copy.cohortDescription
          }
        </span>
      </div>

      {/* ===================================================
          KPIs
      =================================================== */}

      <section data-workspace-reveal data-anime-stagger className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label={
            copy.sent
          }
          value={
            String(
              currentMetrics.contacted
            )
          }
          trend={
            previousMetrics
              ? currentMetrics.contacted -
                previousMetrics.contacted
              : null
          }
          trendType="count"
          previousLabel={
            copy.previous
          }
          icon={
            Mail
          }
        />

        <MetricCard
          label={
            copy.replyRate
          }
          value={
            formatPercent(
              currentMetrics.replyRate
            )
          }
          trend={
            previousMetrics
              ? currentMetrics.replyRate -
                previousMetrics.replyRate
              : null
          }
          trendType="points"
          previousLabel={
            copy.previous
          }
          icon={
            MessageSquareReply
          }
        />

        <MetricCard
          label={
            copy.previewRate
          }
          value={
            formatPercent(
              currentMetrics.previewRate
            )
          }
          trend={
            previousMetrics
              ? currentMetrics.previewRate -
                previousMetrics.previewRate
              : null
          }
          trendType="points"
          previousLabel={
            copy.previous
          }
          icon={
            Eye
          }
        />

        <MetricCard
          label={
            copy.interestedRate
          }
          value={
            formatPercent(
              currentMetrics.interestedRate
            )
          }
          trend={
            previousMetrics
              ? currentMetrics.interestedRate -
                previousMetrics.interestedRate
              : null
          }
          trendType="points"
          previousLabel={
            copy.previous
          }
          icon={
            Target
          }
        />

        <MetricCard
          label={
            copy.wonRate
          }
          value={
            formatPercent(
              currentMetrics.wonRate
            )
          }
          trend={
            previousMetrics
              ? currentMetrics.wonRate -
                previousMetrics.wonRate
              : null
          }
          trendType="points"
          previousLabel={
            copy.previous
          }
          icon={
            Trophy
          }
        />

        <MetricCard
          label={
            copy.wonValue
          }
          value={
            formatCurrency(
              currentMetrics.wonEstimatedValue,
              language
            )
          }
          trend={
            previousMetrics
              ? currentMetrics.wonEstimatedValue -
                previousMetrics.wonEstimatedValue
              : null
          }
          trendType="currency"
          previousLabel={
            copy.previous
          }
          language={
            language
          }
          icon={
            CheckCircle2
          }
        />
      </section>

      {/* ===================================================
          FUNNEL + CAMPAIGNS
      =================================================== */}

      <section data-workspace-reveal className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <Card className="leadbase-workspace-card min-w-0">
          <CardContent className="p-4 sm:p-5">
            <h2 className="text-sm font-semibold">
              {
                copy.funnel
              }
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {
                copy.funnelDescription
              }
            </p>

            <div className="mt-6 space-y-5">
              {funnel.map(
                (
                  item,
                  index
                ) => {
                  const Icon =
                    item.icon;

                  return (
                    <div
                      key={
                        item.key
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
                          <Icon className="size-3.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="font-medium">
                              {
                                item.label
                              }
                            </span>

                            <span className="text-muted-foreground">
                              {
                                item.value
                              }{" "}
                              ·{" "}
                              {
                                item.percent
                              }
                              %
                            </span>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              data-motion-progress
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width:
                                  `${Math.max(
                                    item.value >
                                    0
                                      ? 4
                                      : 0,
                                    item.percent
                                  )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {index <
                      funnel.length -
                        1 ? (
                        <div className="ml-4 mt-2 h-3 border-l" />
                      ) : null}
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="leadbase-workspace-card min-w-0">
          <CardContent className="p-0">
            <div className="border-b px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold">
                {
                  copy.campaigns
                }
              </h2>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {
                  copy.campaignsDescription
                }
              </p>
            </div>

            {campaignRows.length ===
            0 ? (
              <div className="flex min-h-64 items-center justify-center p-6 text-center">
                <div>
                  <Users className="mx-auto size-5 text-muted-foreground" />

                  <p className="mt-3 text-sm font-medium">
                    {
                      copy.noCampaigns
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-left text-xs">
                  <thead className="border-b bg-muted/25 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium sm:px-5">
                        {
                          copy.campaign
                        }
                      </th>

                      <th className="px-3 py-3 font-medium">
                        {
                          copy.leads
                        }
                      </th>

                      <th className="px-3 py-3 font-medium">
                        {
                          copy.contacted
                        }
                      </th>

                      <th className="px-3 py-3 font-medium">
                        {
                          copy.viewed
                        }
                      </th>

                      <th className="px-3 py-3 font-medium">
                        {
                          copy.replied
                        }
                      </th>

                      <th className="px-3 py-3 font-medium">
                        {
                          copy.interested
                        }
                      </th>

                      <th className="px-3 py-3 font-medium">
                        {
                          copy.hot
                        }
                      </th>

                      <th className="px-3 py-3 font-medium">
                        {
                          copy.won
                        }
                      </th>

                      <th className="px-3 py-3 font-medium">
                        {
                          copy.estimated
                        }
                      </th>

                      <th className="w-10 px-3 py-3" />
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {campaignRows.map(
                      (
                        row
                      ) => (
                        <tr
                          key={
                            row.campaign.id
                          }
                          className="transition-colors hover:bg-muted/20"
                        >
                          <td className="px-4 py-4 sm:px-5">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="max-w-[220px] truncate font-semibold">
                                {
                                  row.campaign.name
                                }
                              </span>

                              <Badge
                                variant="outline"
                                className={`shrink-0 rounded-full text-[9px] ${campaignStatusClass(
                                  row.campaign.status
                                )}`}
                              >
                                {campaignStatusLabel(
                                  row.campaign.status,
                                  language
                                )}
                              </Badge>
                            </div>
                          </td>

                          <td className="px-3 py-4">
                            <p className="font-medium">
                              {
                                row.contacted
                              }
                            </p>

                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {row.totalAssigned}{" "}
                              {language ===
                              "de"
                                ? "gesamt"
                                : "total"}
                            </p>
                          </td>

                          <td className="px-3 py-4 font-medium">
                            {
                              row.contacted
                            }
                          </td>

                          <td className="px-3 py-4">
                            <MetricCell
                              value={
                                row.viewed
                              }
                              rate={
                                row.previewRate
                              }
                            />
                          </td>

                          <td className="px-3 py-4">
                            <MetricCell
                              value={
                                row.replied
                              }
                              rate={
                                row.replyRate
                              }
                            />
                          </td>

                          <td className="px-3 py-4">
                            <MetricCell
                              value={
                                row.interested
                              }
                              rate={
                                row.interestedRate
                              }
                            />
                          </td>

                          <td className="px-3 py-4">
                            {row.hot >
                            0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-orange-700 dark:text-orange-300">
                                <Flame className="size-3" />

                                {
                                  row.hot
                                }
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                0
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-4 font-medium">
                            {
                              row.won
                            }
                          </td>

                          <td className="px-3 py-4 font-medium">
                            {formatCurrency(
                              row.pipelineValue,
                              language
                            )}
                          </td>

                          <td className="px-3 py-4">
                            <Link
                              href={`/campaigns/${row.campaign.id}`}
                              className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
                            >
                              <ArrowRight className="size-3.5" />
                            </Link>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ===================================================
          SECONDARY SIGNALS
      =================================================== */}

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <SignalCard
          label={
            language ===
            "de"
              ? "Preview Engagement"
              : "Preview engagement"
          }
          value={
            String(
              currentMetrics.engaged
            )
          }
          description={
            language ===
            "de"
              ? "Leads der ausgewählten Kohorte mit mindestens einer engagierten externen Preview-Session."
              : "Leads in the selected cohort with at least one engaged external preview session."
          }
          icon={
            MousePointerClick
          }
        />

        <SignalCard
          label={
            language ===
            "de"
              ? "Rückfragen"
              : "Questions"
          }
          value={
            String(
              currentMetrics.questions
            )
          }
          description={
            language ===
            "de"
              ? "Echte Antworten in der Kohorte, die Leadbase als konkrete Rückfrage erkannt hat."
              : "Real replies in the cohort that Leadbase classified as a concrete question."
          }
          icon={
            MessageSquareReply
          }
        />

        <SignalCard
          label={
            language ===
            "de"
              ? "HOT Leads"
              : "HOT leads"
          }
          value={
            String(
              currentMetrics.hot
            )
          }
          description={
            language ===
            "de"
              ? "Leads der Kohorte mit einem aktuellen Hot Lead Score von mindestens 70."
              : "Cohort leads with a current hot lead score of at least 70."
          }
          icon={
            Flame
          }
        />
      </section>

      <p className="mt-5 rounded-lg border bg-muted/20 px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">
        {
          copy.note
        }
      </p>
    </div></div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function MetricCard({
  label,
  value,
  trend,
  trendType,
  previousLabel,
  language = "en",
  icon:
    Icon,
}: {
  label:
    string;

  value:
    string;

  trend:
    number
    | null;

  trendType:
    "count"
    | "points"
    | "currency";

  previousLabel:
    string;

  language?:
    AppLanguage;

  icon:
    typeof Mail;
}) {
  let trendText =
    "";

  if (
    trend !==
    null
  ) {
    if (
      trendType ===
      "points"
    ) {
      trendText =
        `${trend > 0 ? "+" : ""}${trend} pp`;
    } else if (
      trendType ===
      "currency"
    ) {
      trendText =
        `${trend > 0 ? "+" : ""}${formatCurrency(
          trend,
          language
        )}`;
    } else {
      trendText =
        `${trend > 0 ? "+" : ""}${trend}`;
    }
  }

  const positive =
    trend !==
      null &&
    trend >
      0;

  const negative =
    trend !==
      null &&
    trend <
      0;

  return (
    <Card className="leadbase-workspace-card min-w-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {
              label
            }
          </p>

          <Icon className="size-4 shrink-0 text-muted-foreground" />
        </div>

        <p data-motion-count className="mt-4 break-words text-2xl font-semibold tracking-tight">
          {
            value
          }
        </p>

        {trend !==
        null ? (
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px]">
            {positive ? (
              <ArrowUpRight className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : negative ? (
              <ArrowDownRight className="size-3 shrink-0 text-red-600 dark:text-red-400" />
            ) : (
              <Minus className="size-3 shrink-0 text-muted-foreground" />
            )}

            <span
              className={
                positive
                  ? "font-medium text-emerald-700 dark:text-emerald-300"
                  : negative
                    ? "font-medium text-red-700 dark:text-red-300"
                    : "font-medium text-muted-foreground"
              }
            >
              {
                trendText
              }
            </span>

            <span className="min-w-0 truncate text-muted-foreground">
              {
                previousLabel
              }
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricCell({
  value,
  rate,
}: {
  value:
    number;

  rate:
    number;
}) {
  return (
    <div>
      <p className="font-medium">
        {
          value
        }
      </p>

      <p className="mt-0.5 text-[10px] text-muted-foreground">
        {
          rate
        }
        %
      </p>
    </div>
  );
}

function SignalCard({
  label,
  value,
  description,
  icon:
    Icon,
}: {
  label:
    string;

  value:
    string;

  description:
    string;

  icon:
    typeof Mail;
}) {
  return (
    <Card className="leadbase-workspace-card min-w-0">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {
                label
              }
            </p>

            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {
                value
              }
            </p>
          </div>

          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border">
            <Icon className="size-4" />
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          {
            description
          }
        </p>
      </CardContent>
    </Card>
  );
}
