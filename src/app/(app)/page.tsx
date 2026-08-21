import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  CalendarCheck,
  CircleCheck,
  Clock3,
  Mail,
  MessageSquareReply,
  ReceiptText,
  Search,
  Trophy,
  UserPlus,
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
  languageCopy,
  type AppLanguage,
} from "@/lib/i18n";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   PIPELINE
========================================================= */

const PIPELINE_STATUSES = [
  {
    status: "NEW",
    en: "New",
    de: "Neu",
  },

  {
    status: "RESEARCHING",
    en: "Researching",
    de: "Recherche",
  },

  {
    status: "QUALIFIED",
    en: "Qualified",
    de: "Qualifiziert",
  },

  {
    status: "DRAFT_READY",
    en: "Draft ready",
    de: "Entwurf bereit",
  },

  {
    status: "CONTACTED",
    en: "Contacted",
    de: "Kontaktiert",
  },

  {
    status: "REPLIED",
    en: "Replied",
    de: "Geantwortet",
  },

  {
    status: "CALL_BOOKED",
    en: "Call booked",
    de: "Call gebucht",
  },

  {
    status: "PROPOSAL",
    en: "Proposal",
    de: "Angebot",
  },

  {
    status: "WON",
    en: "Won",
    de: "Gewonnen",
  },
] as const;

const CLOSED_PIPELINE_STATUSES =
  new Set([
    "WON",
    "LOST",
    "NOT_A_FIT",
    "DO_NOT_CONTACT",
  ]);

/* =========================================================
   HELPERS
========================================================= */

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
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

  return value;
}

function getLocale(
  language:
    AppLanguage
) {
  return language ===
    "de"
    ? "de-DE"
    : "en-IE";
}

function formatCurrency(
  value: number,
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

function formatRelativeTime(
  value:
    | string
    | null,

  language:
    AppLanguage
) {
  if (
    !value
  ) {
    return "";
  }

  const timestamp =
    new Date(
      value
    ).getTime();

  if (
    Number.isNaN(
      timestamp
    )
  ) {
    return "";
  }

  const difference =
    timestamp -
    Date.now();

  const absoluteSeconds =
    Math.abs(
      Math.round(
        difference /
          1000
      )
    );

  const formatter =
    new Intl.RelativeTimeFormat(
      getLocale(
        language
      ),
      {
        numeric:
          "auto",
      }
    );

  if (
    absoluteSeconds <
    60
  ) {
    return formatter.format(
      0,
      "second"
    );
  }

  const minutes =
    Math.round(
      difference /
        60000
    );

  if (
    Math.abs(
      minutes
    ) <
    60
  ) {
    return formatter.format(
      minutes,
      "minute"
    );
  }

  const hours =
    Math.round(
      difference /
        3600000
    );

  if (
    Math.abs(
      hours
    ) <
    24
  ) {
    return formatter.format(
      hours,
      "hour"
    );
  }

  const days =
    Math.round(
      difference /
        86400000
    );

  if (
    Math.abs(
      days
    ) <
    7
  ) {
    return formatter.format(
      days,
      "day"
    );
  }

  return new Intl.DateTimeFormat(
    getLocale(
      language
    ),
    {
      day:
        "2-digit",

      month:
        "short",
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatShortDate(
  value:
    | string
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
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}

function projectStatusClass(
  status: string
) {
  switch (
    status
  ) {
    case "PLANNED":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400";

    case "IN_PROGRESS":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400";

    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "CANCELLED":
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";

    default:
      return "";
  }
}

/* =========================================================
   PAGE
========================================================= */

export default async function DashboardPage() {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const text =
    languageCopy[
      language
    ].dashboard;

  const projectText =
    languageCopy[
      language
    ].projects;

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
    leadsResult,
    draftsResult,
    incomingMessagesResult,
    sentEmailsResult,
    activitiesResult,
    projectsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "leads"
        )
        .select(`
          id,
          status,
          estimated_project_value,
          created_at,

          company:companies (
            name
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
          status
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
          direction
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
          "activities"
        )
        .select(`
          id,
          lead_id,
          activity_type,
          title,
          description,
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
        )
        .limit(
          6
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
    ]);

  if (
    leadsResult.error
  ) {
    console.error(
      "Could not load dashboard leads:",
      leadsResult.error
    );
  }

  if (
    draftsResult.error
  ) {
    console.error(
      "Could not load dashboard drafts:",
      draftsResult.error
    );
  }

  if (
    incomingMessagesResult.error
  ) {
    console.error(
      "Could not load dashboard replies:",
      incomingMessagesResult.error
    );
  }

  if (
    sentEmailsResult.error
  ) {
    console.error(
      "Could not load dashboard email count:",
      sentEmailsResult.error
    );
  }

  if (
    activitiesResult.error
  ) {
    console.error(
      "Could not load dashboard activities:",
      activitiesResult.error
    );
  }

  if (
    projectsResult.error
  ) {
    console.error(
      "Could not load dashboard projects:",
      projectsResult.error
    );
  }

  const leads =
    leadsResult.data ??
    [];

  const drafts =
    draftsResult.data ??
    [];

  const incomingMessages =
    incomingMessagesResult.data ??
    [];

  const activities =
    activitiesResult.data ??
    [];

  const projects =
    projectsResult.data ??
    [];

  /* =======================================================
     STATUS COUNTS
  ======================================================= */

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
     DRAFTS
  ======================================================= */

  const draftReadyLeadIds =
    new Set<string>();

  for (
    const draft of
    drafts
  ) {
    if (
      draft.status ===
        "DRAFT" &&
      draft.lead_id
    ) {
      draftReadyLeadIds.add(
        draft.lead_id
      );
    }
  }

  /* =======================================================
     REPLIES
  ======================================================= */

  const repliedLeadIds =
    new Set<string>();

  for (
    const message of
    incomingMessages
  ) {
    if (
      message.lead_id
    ) {
      repliedLeadIds.add(
        message.lead_id
      );
    }
  }

  /* =======================================================
     PIPELINE VALUE
  ======================================================= */

  const pipelineValue =
    leads.reduce(
      (
        total,
        lead
      ) => {
        if (
          CLOSED_PIPELINE_STATUSES.has(
            lead.status
          )
        ) {
          return total;
        }

        const value =
          Number(
            lead.estimated_project_value ??
              0
          );

        if (
          !Number.isFinite(
            value
          )
        ) {
          return total;
        }

        return (
          total +
          value
        );
      },
      0
    );

  /* =======================================================
     COMPANY NAMES
  ======================================================= */

  const companyNamesByLeadId =
    new Map<
      string,
      string
    >();

  for (
    const lead of
    leads
  ) {
    const company =
      getSingleRelation(
        lead.company
      );

    companyNamesByLeadId.set(
      lead.id,
      company?.name ??
        text.unknownCompany
    );
  }

  /* =======================================================
     PROJECT METRICS
  ======================================================= */

  const revenueProjects =
    projects.filter(
      (
        project
      ) =>
        project.status !==
        "CANCELLED"
    );

  const bookedProjectValue =
    revenueProjects.reduce(
      (
        total,
        project
      ) => {
        const value =
          Number(
            project.total_value ??
              0
          );

        return Number.isFinite(
          value
        )
          ? total +
              value
          : total;
      },
      0
    );

  const paidRevenue =
    revenueProjects.reduce(
      (
        total,
        project
      ) => {
        const value =
          Number(
            project.amount_paid ??
              0
          );

        return Number.isFinite(
          value
        )
          ? total +
              value
          : total;
      },
      0
    );

  const outstandingRevenue =
    revenueProjects.reduce(
      (
        total,
        project
      ) => {
        const projectValue =
          Number(
            project.total_value ??
              0
          );

        const amountPaid =
          Number(
            project.amount_paid ??
              0
          );

        if (
          !Number.isFinite(
            projectValue
          ) ||
          !Number.isFinite(
            amountPaid
          )
        ) {
          return total;
        }

        return (
          total +
          Math.max(
            0,
            projectValue -
              amountPaid
          )
        );
      },
      0
    );

  const completedProjects =
    revenueProjects.filter(
      (
        project
      ) =>
        project.status ===
        "COMPLETED"
    ).length;

  const recentProjects =
    [
      ...projects,
    ]
      .sort(
        (
          a,
          b
        ) => {
          const priority = (
            status: string
          ) => {
            switch (
              status
            ) {
              case "IN_PROGRESS":
                return 0;

              case "PLANNED":
                return 1;

              case "COMPLETED":
                return 2;

              case "CANCELLED":
                return 3;

              default:
                return 4;
            }
          };

          const statusDifference =
            priority(
              a.status
            ) -
            priority(
              b.status
            );

          if (
            statusDifference !==
            0
          ) {
            return statusDifference;
          }

          const aDate =
            a.completed_at ??
            a.started_at ??
            a.created_at;

          const bDate =
            b.completed_at ??
            b.started_at ??
            b.created_at;

          return (
            new Date(
              bDate
            ).getTime() -
            new Date(
              aDate
            ).getTime()
          );
        }
      )
      .slice(
        0,
        4
      );

  /* =======================================================
     STATS
  ======================================================= */

  const stats = [
    {
      label:
        text.newLeads,

      value:
        String(
          statusCounts.get(
            "NEW"
          ) ??
            0
        ),

      icon:
        UserPlus,
    },

    {
      label:
        text.qualified,

      value:
        String(
          statusCounts.get(
            "QUALIFIED"
          ) ??
            0
        ),

      icon:
        CircleCheck,
    },

    {
      label:
        text.draftsReady,

      value:
        String(
          draftReadyLeadIds.size
        ),

      icon:
        Clock3,
    },

    {
      label:
        text.emailsSent,

      value:
        String(
          sentEmailsResult.count ??
            0
        ),

      icon:
        Mail,
    },

    {
      label:
        text.replies,

      value:
        String(
          repliedLeadIds.size
        ),

      icon:
        MessageSquareReply,
    },

    {
      label:
        text.callsBooked,

      value:
        String(
          statusCounts.get(
            "CALL_BOOKED"
          ) ??
            0
        ),

      icon:
        CalendarCheck,
    },

    {
      label:
        text.wonClients,

      value:
        String(
          statusCounts.get(
            "WON"
          ) ??
            0
        ),

      icon:
        Trophy,
    },

    {
      label:
        text.pipelineValue,

      value:
        formatCurrency(
          pipelineValue,
          language
        ),

      icon:
        ArrowUpRight,
    },
  ];

  const businessStats = [
    {
      label:
        text.bookedValue,

      value:
        formatCurrency(
          bookedProjectValue,
          language
        ),

      description:
        text.bookedValueDescription,

      icon:
        BriefcaseBusiness,
    },

    {
      label:
        text.paidRevenue,

      value:
        formatCurrency(
          paidRevenue,
          language
        ),

      description:
        text.paidRevenueDescription,

      icon:
        Banknote,
    },

    {
      label:
        text.outstanding,

      value:
        formatCurrency(
          outstandingRevenue,
          language
        ),

      description:
        text.outstandingDescription,

      icon:
        WalletCards,
    },

    {
      label:
        text.completedProjects,

      value:
        String(
          completedProjects
        ),

      description:
        text.completedProjectsDescription,

      icon:
        ReceiptText,
    },
  ];

  const draftDescription =
    draftReadyLeadIds.size ===
    0
      ? text.noDraftsWaiting
      : draftReadyLeadIds.size ===
          1
        ? text.oneDraftWaiting
        : text.manyDraftsWaiting.replace(
            "{count}",
            String(
              draftReadyLeadIds.size
            )
          );

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {
              text.eyebrow
            }
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {
              text.title
            }
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {
              text.description
            }
          </p>
        </div>

        <Badge
          variant="outline"
          className="h-8 w-fit shrink-0 rounded-lg px-3 font-normal"
        >
          {
            text.privateWorkspace
          }
        </Badge>
      </header>

      {/* ===================================================
          SALES PIPELINE
      =================================================== */}

      <section className="mt-6 md:mt-8">
        <div>
          <h2 className="text-sm font-semibold">
            {
              text.salesPipeline
            }
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            {
              text.salesPipelineDescription
            }
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {stats.map(
            (
              stat
            ) => {
              const Icon =
                stat.icon;

              return (
                <Card
                  key={
                    stat.label
                  }
                  className="min-w-0 shadow-none"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-xs leading-5 text-muted-foreground sm:text-sm">
                        {
                          stat.label
                        }
                      </p>

                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                    </div>

                    <p className="mt-4 break-words text-xl font-semibold tracking-tight sm:mt-5 sm:text-2xl">
                      {
                        stat.value
                      }
                    </p>
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      </section>

      {/* ===================================================
          REVENUE
      =================================================== */}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">
              {
                text.revenueProjects
              }
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {
                text.revenueProjectsDescription
              }
            </p>
          </div>

          <Link
            href="/projects"
            className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {
              text.viewProjects
            }
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {businessStats.map(
            (
              stat
            ) => {
              const Icon =
                stat.icon;

              return (
                <Link
                  key={
                    stat.label
                  }
                  href="/projects"
                  className="group min-w-0"
                >
                  <Card className="h-full min-w-0 shadow-none transition-colors group-hover:border-foreground/30">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-xs leading-5 text-muted-foreground sm:text-sm">
                          {
                            stat.label
                          }
                        </p>

                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
                          <Icon className="size-4 text-muted-foreground" />
                        </div>
                      </div>

                      <p className="mt-4 break-words text-xl font-semibold tracking-tight sm:mt-5 sm:text-2xl">
                        {
                          stat.value
                        }
                      </p>

                      <p className="mt-2 hidden text-xs leading-5 text-muted-foreground sm:block">
                        {
                          stat.description
                        }
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            }
          )}
        </div>
      </section>

      {/* ===================================================
          ACTIVITY + PIPELINE
      =================================================== */}

      <section className="mt-6 grid gap-4 md:mt-8 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="min-w-0 shadow-none">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  {
                    text.recentActivity
                  }
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {
                    text.recentActivityDescription
                  }
                </p>
              </div>

              <Link
                href="/leads"
                className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {
                  text.viewLeads
                }
              </Link>
            </div>

            {activities.length ===
            0 ? (
              <div className="flex min-h-60 items-center justify-center px-5 py-10 sm:min-h-72">
                <div className="max-w-xs text-center">
                  <div className="mx-auto flex size-9 items-center justify-center rounded-lg border">
                    <Users className="size-4 text-muted-foreground" />
                  </div>

                  <p className="mt-4 text-sm font-medium">
                    {
                      text.noActivity
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {
                      text.noActivityDescription
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {activities.map(
                  (
                    activity,
                    index
                  ) => {
                    const companyName =
                      activity.lead_id
                        ? companyNamesByLeadId.get(
                            activity.lead_id
                          ) ??
                          text.unknownCompany
                        : text.unknownCompany;

                    const content = (
                      <>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Users className="size-4 text-muted-foreground" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {
                                companyName
                              }
                            </p>

                            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground sm:truncate">
                              {activity.title ??
                                text.activityFallback}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground sm:text-xs">
                          {formatRelativeTime(
                            activity.created_at,
                            language
                          )}
                        </span>
                      </>
                    );

                    return activity.lead_id ? (
                      <Link
                        key={
                          activity.id
                        }
                        href={`/leads/${activity.lead_id}`}
                        className={`flex items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:items-center sm:gap-4 sm:px-5 ${
                          index !==
                          activities.length -
                            1
                            ? "border-b"
                            : ""
                        }`}
                      >
                        {
                          content
                        }
                      </Link>
                    ) : (
                      <div
                        key={
                          activity.id
                        }
                        className={`flex items-start justify-between gap-3 px-4 py-4 sm:items-center sm:gap-4 sm:px-5 ${
                          index !==
                          activities.length -
                            1
                            ? "border-b"
                            : ""
                        }`}
                      >
                        {
                          content
                        }
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-none">
          <CardContent className="p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold">
                {
                  text.pipeline
                }
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                {
                  text.pipelineDescription
                }
              </p>
            </div>

            <div className="mt-5 space-y-4 sm:mt-6">
              {PIPELINE_STATUSES.map(
                (
                  pipelineStatus
                ) => (
                  <PipelineRow
                    key={
                      pipelineStatus.status
                    }
                    label={
                      language ===
                      "de"
                        ? pipelineStatus.de
                        : pipelineStatus.en
                    }
                    value={
                      statusCounts.get(
                        pipelineStatus.status
                      ) ??
                      0
                    }
                    total={
                      leads.length
                    }
                  />
                )
              )}
            </div>

            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {
                    text.totalLeads
                  }
                </span>

                <span className="font-medium">
                  {
                    leads.length
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ===================================================
          RECENT PROJECTS
      =================================================== */}

      <section className="mt-4">
        <Card className="min-w-0 shadow-none">
          <CardContent className="p-0">
            <div className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:items-center sm:px-5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  {
                    text.recentProjects
                  }
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  {
                    text.recentProjectsDescription
                  }
                </p>
              </div>

              <Link
                href="/projects"
                className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {
                  text.allProjects
                }
              </Link>
            </div>

            {recentProjects.length ===
            0 ? (
              <div className="flex min-h-40 items-center justify-center px-5 py-8 text-center">
                <div className="max-w-sm">
                  <BriefcaseBusiness className="mx-auto size-5 text-muted-foreground" />

                  <p className="mt-3 text-sm font-medium">
                    {
                      text.noProjects
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {
                      text.noProjectsDescription
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {recentProjects.map(
                  (
                    project
                  ) => {
                    const projectValue =
                      Number(
                        project.total_value ??
                          0
                      );

                    const amountPaid =
                      Number(
                        project.amount_paid ??
                          0
                      );

                    const outstanding =
                      Math.max(
                        0,
                        projectValue -
                          amountPaid
                      );

                    let statusLabel =
                      project.status;

                    switch (
                      project.status
                    ) {
                      case "PLANNED":
                        statusLabel =
                          projectText.statusPlanned;
                        break;

                      case "IN_PROGRESS":
                        statusLabel =
                          projectText.statusInProgress;
                        break;

                      case "COMPLETED":
                        statusLabel =
                          projectText.statusCompleted;
                        break;

                      case "CANCELLED":
                        statusLabel =
                          projectText.statusCancelled;
                        break;
                    }

                    return (
                      <Link
                        key={
                          project.id
                        }
                        href={`/projects/${project.id}/edit`}
                        className="group block px-4 py-4 transition-colors hover:bg-muted/30 sm:px-5"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <p className="min-w-0 break-words text-sm font-medium">
                                {
                                  project.project_name
                                }
                              </p>

                              <Badge
                                variant="outline"
                                className={`shrink-0 ${projectStatusClass(
                                  project.status
                                )}`}
                              >
                                {
                                  statusLabel
                                }
                              </Badge>
                            </div>

                            <p className="mt-1 break-words text-xs text-muted-foreground">
                              {
                                project.client_name
                              }
                            </p>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {project.completed_at
                                ? `${text.completed} ${formatShortDate(
                                    project.completed_at,
                                    language
                                  )}`
                                : project.started_at
                                  ? `${text.started} ${formatShortDate(
                                      project.started_at,
                                      language
                                    )}`
                                  : text.noProjectDate}
                            </p>
                          </div>

                          <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </div>

                        <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border sm:max-w-md">
                          <ProjectAmount
                            label={
                              text.value
                            }
                            value={
                              formatCurrency(
                                projectValue,
                                language
                              )
                            }
                          />

                          <ProjectAmount
                            label={
                              text.paid
                            }
                            value={
                              formatCurrency(
                                amountPaid,
                                language
                              )
                            }
                            border
                          />

                          <ProjectAmount
                            label={
                              text.open
                            }
                            value={
                              formatCurrency(
                                outstanding,
                                language
                              )
                            }
                            border
                          />
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

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Link
          href="/find-leads"
          className="group min-w-0"
        >
          <Card className="h-full shadow-none transition-colors group-hover:border-foreground/30">
            <CardContent className="flex min-h-36 items-start justify-between gap-4 p-4 sm:min-h-40 sm:items-center sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex size-9 items-center justify-center rounded-lg border">
                  <Search className="size-4" />
                </div>

                <h2 className="mt-4 text-sm font-semibold sm:mt-5">
                  {
                    text.findNewLeads
                  }
                </h2>

                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  {
                    text.findNewLeadsDescription
                  }
                </p>
              </div>

              <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:mt-0" />
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/leads"
          className="group min-w-0"
        >
          <Card className="h-full shadow-none transition-colors group-hover:border-foreground/30">
            <CardContent className="flex min-h-36 items-start justify-between gap-4 p-4 sm:min-h-40 sm:items-center sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex size-9 items-center justify-center rounded-lg border">
                  <Mail className="size-4" />
                </div>

                <h2 className="mt-4 text-sm font-semibold sm:mt-5">
                  {
                    text.draftsWaiting
                  }
                </h2>

                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  {
                    draftDescription
                  }
                </p>
              </div>

              <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:mt-0" />
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}

/* =========================================================
   PIPELINE ROW
========================================================= */

function PipelineRow({
  label,
  value,
  total,
}: {
  label: string;

  value: number;

  total: number;
}) {
  const percentage =
    total >
    0
      ? Math.round(
          (
            value /
            total
          ) *
            100
        )
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="truncate">
          {
            label
          }
        </span>

        <span className="shrink-0 text-muted-foreground">
          {
            value
          }
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all"
          style={{
            width:
              `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   PROJECT AMOUNT
========================================================= */

function ProjectAmount({
  label,
  value,
  border = false,
}: {
  label: string;

  value: string;

  border?: boolean;
}) {
  return (
    <div
      className={`min-w-0 px-3 py-2.5 ${
        border
          ? "border-l"
          : ""
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {
          label
        }
      </p>

      <p className="mt-1 truncate text-xs font-semibold sm:text-sm">
        {
          value
        }
      </p>
    </div>
  );
}