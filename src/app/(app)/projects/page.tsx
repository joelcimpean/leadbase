import Link from "next/link";

import {
  Banknote,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  Globe2,
  Pencil,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import {
  deleteProject,
} from "./actions";

import {
  Badge,
} from "@/components/ui/badge";

import {
  buttonVariants,
} from "@/components/ui/button";

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
   HELPERS
========================================================= */

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
  currency: string,
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

      currency,

      maximumFractionDigits:
        0,
    }
  ).format(
    value
  );
}

function formatDate(
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

function normalizeUrl(
  url: string
) {
  return url.startsWith(
    "http"
  )
    ? url
    : `https://${url}`;
}

function statusClass(
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

function projectStatusPriority(
  status: string
) {
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
}

function projectSortTimestamp(
  project: {
    started_at:
      | string
      | null;

    completed_at:
      | string
      | null;

    created_at:
      string;
  }
) {
  const date =
    project.completed_at ??
    project.started_at ??
    project.created_at;

  const timestamp =
    new Date(
      date
    ).getTime();

  return Number.isNaN(
    timestamp
  )
    ? 0
    : timestamp;
}

/* =========================================================
   PAGE
========================================================= */

export default async function ProjectsPage() {
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
    ].projects;

  const {
    data:
      projects,

    error,
  } =
    await supabase
      .from(
        "client_projects"
      )
      .select(`
        id,
        client_name,
        project_name,
        website_url,
        status,
        total_value,
        amount_paid,
        currency,
        started_at,
        completed_at,
        notes,
        created_at
      `);

  if (
    error
  ) {
    console.error(
      "Could not load client projects:",
      error
    );
  }

  const rows = [
    ...(projects ??
      []),
  ].sort(
    (
      a,
      b
    ) => {
      const statusDifference =
        projectStatusPriority(
          a.status
        ) -
        projectStatusPriority(
          b.status
        );

      if (
        statusDifference !==
        0
      ) {
        return statusDifference;
      }

      return (
        projectSortTimestamp(
          b
        ) -
        projectSortTimestamp(
          a
        )
      );
    }
  );

  const revenueRows =
    rows.filter(
      (
        project
      ) =>
        project.status !==
        "CANCELLED"
    );

  const totalRevenue =
    revenueRows.reduce(
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

  const totalPaid =
    revenueRows.reduce(
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
    revenueRows.reduce(
      (
        total,
        project
      ) => {
        const value =
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
          total +
          Math.max(
            0,
            value -
              paid
          )
        );
      },
      0
    );

  const completedProjects =
    revenueRows.filter(
      (
        project
      ) =>
        project.status ===
        "COMPLETED"
    ).length;

  function getStatusLabel(
    status: string
  ) {
    switch (
      status
    ) {
      case "PLANNED":
        return text.statusPlanned;

      case "IN_PROGRESS":
        return text.statusInProgress;

      case "COMPLETED":
        return text.statusCompleted;

      case "CANCELLED":
        return text.statusCancelled;

      default:
        return status;
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
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

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {
              text.description
            }
          </p>
        </div>

        <Link
          href="/projects/new"
          className={buttonVariants({
            className:
              "w-full gap-2 sm:w-fit",
          })}
        >
          <Plus className="size-4" />

          {
            text.addProject
          }
        </Link>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 md:mt-8 xl:grid-cols-4">
        <StatCard
          icon={
            CircleDollarSign
          }
          label={
            text.projectValue
          }
          value={
            formatCurrency(
              totalRevenue,
              "EUR",
              language
            )
          }
        />

        <StatCard
          icon={
            Banknote
          }
          label={
            text.paid
          }
          value={
            formatCurrency(
              totalPaid,
              "EUR",
              language
            )
          }
        />

        <StatCard
          icon={
            WalletCards
          }
          label={
            text.outstanding
          }
          value={
            formatCurrency(
              outstanding,
              "EUR",
              language
            )
          }
        />

        <StatCard
          icon={
            ReceiptText
          }
          label={
            text.completed
          }
          value={
            String(
              completedProjects
            )
          }
        />
      </section>

      <section className="mt-6 md:mt-8">
        <div>
          <h2 className="text-sm font-semibold">
            {
              text.clientProjects
            }
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            {
              text.clientProjectsDescription
            }
          </p>
        </div>

        {rows.length ===
        0 ? (
          <Card className="mt-4 border-dashed shadow-none">
            <CardContent className="flex min-h-64 items-center justify-center p-6 text-center">
              <div className="max-w-sm">
                <div className="mx-auto flex size-10 items-center justify-center rounded-lg border">
                  <ReceiptText className="size-4 text-muted-foreground" />
                </div>

                <h3 className="mt-4 text-sm font-semibold">
                  {
                    text.noProjects
                  }
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {
                    text.noProjectsDescription
                  }
                </p>

                <Link
                  href="/projects/new"
                  className={buttonVariants({
                    className:
                      "mt-5 gap-2",
                  })}
                >
                  <Plus className="size-4" />

                  {
                    text.addFirstProject
                  }
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {rows.map(
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

                const open =
                  Math.max(
                    0,
                    total -
                      paid
                  );

                return (
                  <Card
                    key={
                      project.id
                    }
                    className="min-w-0 shadow-none"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-base font-semibold">
                            {
                              project.project_name
                            }
                          </p>

                          <p className="mt-1 break-words text-sm text-muted-foreground">
                            {
                              project.client_name
                            }
                          </p>
                        </div>

                        <Badge
                          variant="outline"
                          className={`shrink-0 ${statusClass(
                            project.status
                          )}`}
                        >
                          {getStatusLabel(
                            project.status
                          )}
                        </Badge>
                      </div>

                      {project.website_url ? (
                        <a
                          href={
                            normalizeUrl(
                              project.website_url
                            )
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Globe2 className="size-3.5 shrink-0" />

                          <span className="truncate">
                            {project.website_url
                              .replace(
                                /^https?:\/\//,
                                ""
                              )
                              .replace(
                                /\/$/,
                                ""
                              )}
                          </span>

                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      ) : null}

                      <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg border">
                        <ProjectMoney
                          label={
                            text.value
                          }
                          value={
                            formatCurrency(
                              total,
                              project.currency,
                              language
                            )
                          }
                        />

                        <ProjectMoney
                          label={
                            text.paid
                          }
                          value={
                            formatCurrency(
                              paid,
                              project.currency,
                              language
                            )
                          }
                          border
                        />

                        <ProjectMoney
                          label={
                            text.open
                          }
                          value={
                            formatCurrency(
                              open,
                              project.currency,
                              language
                            )
                          }
                          border
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        {project.started_at ? (
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" />

                            {
                              text.started
                            }{" "}
                            {formatDate(
                              project.started_at,
                              language
                            )}
                          </span>
                        ) : null}

                        {project.completed_at ? (
                          <span>
                            {
                              text.completedDate
                            }{" "}
                            {formatDate(
                              project.completed_at,
                              language
                            )}
                          </span>
                        ) : null}
                      </div>

                      {project.notes ? (
                        <p className="mt-4 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                          {
                            project.notes
                          }
                        </p>
                      ) : null}

                      <div className="mt-5 border-t pt-4">
                        {project.website_url ? (
                          <a
                            href={
                              normalizeUrl(
                                project.website_url
                              )
                            }
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants({
                              variant:
                                "outline",

                              className:
                                "mb-2 h-10 w-full gap-2 sm:h-9",
                            })}
                          >
                            <Globe2 className="size-3.5" />

                            {
                              text.visitWebsite
                            }

                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/projects/${project.id}/edit`}
                            className={buttonVariants({
                              variant:
                                "outline",

                              className:
                                "h-10 w-full gap-2 sm:h-9",
                            })}
                          >
                            <Pencil className="size-3.5" />

                            {
                              text.edit
                            }
                          </Link>

                          <form
                            action={
                              deleteProject.bind(
                                null,
                                project.id
                              )
                            }
                          >
                            <button
                              type="submit"
                              className="h-10 w-full rounded-md border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:h-9 dark:border-red-900 dark:hover:bg-red-950/40"
                            >
                              {
                                text.delete
                              }
                            </button>
                          </form>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon:
    React.ElementType;

  label: string;

  value: string;
}) {
  return (
    <Card className="min-w-0 shadow-none">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
            {
              label
            }
          </p>

          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>

        <p className="mt-4 break-words text-xl font-semibold tracking-tight sm:mt-5 sm:text-2xl">
          {
            value
          }
        </p>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   PROJECT MONEY
========================================================= */

function ProjectMoney({
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
      className={`min-w-0 px-3 py-3 ${
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

      <p className="mt-1 truncate text-sm font-semibold">
        {
          value
        }
      </p>
    </div>
  );
}