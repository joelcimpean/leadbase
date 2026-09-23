"use client";

import { formatAccountMoney } from "@/lib/account-currency";

import Link from "next/link";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe2,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  deleteProject,
} from "./actions";

import {
  ProjectCreateDialog,
  ProjectEditDialog,
  type QuickProjectEditValue,
} from "@/components/quick-create-dialogs";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* =========================================================
   TYPES
========================================================= */

export type ProjectWorkspaceItem = {
  id: string;
  clientName: string;
  projectName: string;
  websiteUrl:
    | string
    | null;
  mediaUrl:
    | string
    | null;
  mediaMode:
    | string
    | null;
  status: string;
  totalValue: number;
  amountPaid: number;
  currency: string;
  startedAt:
    | string
    | null;
  completedAt:
    | string
    | null;
  notes:
    | string
    | null;
  createdAt: string;
};

type Language =
  | "de"
  | "en";

type ProjectFilter =
  | "ALL"
  | "ACTIVE"
  | "COMPLETED"
  | "OPEN";

/* =========================================================
   COPY
========================================================= */

const COPY = {
  de: {
    eyebrow:
      "Business",
    title:
      "Projekte",
    description:
      "Laufende und abgeschlossene Kundenprojekte, Zahlungen und echte Umsätze.",
    running:
      "laufend",
    completed:
      "abgeschlossen",
    outstanding:
      "offen",
    addProject:
      "Projekt hinzufügen",
    projectValue:
      "Projektwert",
    paid:
      "Bezahlt",
    inProgress:
      "In Arbeit",
    since:
      "seit",
    averageProject:
      "Ø Projektwert",
    projectsTotal:
      "Projekte gesamt",
    project:
      "Projekt",
    projects:
      "Projekte",
    remainingPayment:
      "Restzahlung",
    currentProject:
      "Laufendes Projekt",
    plannedProject:
      "Geplantes Projekt",
    completedProject:
      "Abgeschlossenes Projekt",
    cancelledProject:
      "Abgebrochenes Projekt",
    started:
      "Gestartet",
    completedAt:
      "Abgeschlossen",
    editProject:
      "Projekt öffnen",
    edit:
      "Bearbeiten",
    website:
      "Website",
    openWebsite:
      "Website öffnen",
    delete:
      "Projekt löschen",
    deleteTitle:
      "Projekt wirklich löschen?",
    deleteDescription:
      "Das Projekt und seine gespeicherten Projektdaten werden endgültig entfernt.",
    deleteConfirm:
      "Endgültig löschen",
    cancel:
      "Abbrechen",
    paymentOpen:
      "Offene Zahlung",
    paymentOpenSub:
      "Restzahlung im Projekt",
    paymentClear:
      "Keine offene Zahlung",
    paymentClearSub:
      "Alle erfassten Projektwerte sind vollständig bezahlt.",
    projectHistory:
      "Projektverlauf",
    projectHistorySub:
      "Kundenprojekte mit Wert, Zahlungsstand und Abschluss.",
    all:
      "Alle",
    active:
      "In Arbeit",
    finished:
      "Abgeschlossen",
    open:
      "Offen",
    projectClient:
      "Projekt · Kunde",
    value:
      "Wert",
    payment:
      "Zahlung",
    closing:
      "Abschluss",
    runs:
      "läuft",
    planned:
      "geplant",
    cancelled:
      "abgebrochen",
    fullyPaid:
      "Bezahlt",
    openAmount:
      "offen",
    largestProject:
      "Größtes Projekt",
    noProjects:
      "Noch keine Projekte",
    noProjectsSub:
      "Erstelle dein erstes Kundenprojekt. Projektwerte und Zahlungen erscheinen danach automatisch hier.",
    noFilteredProjects:
      "Keine Projekte in diesem Filter",
    noFilteredProjectsSub:
      "Wähle einen anderen Filter, um weitere Projekte zu sehen.",
    previewFallback:
      "Projektvorschau",
  },
  en: {
    eyebrow:
      "Business",
    title:
      "Projects",
    description:
      "Active and completed client projects, payments and real revenue.",
    running:
      "active",
    completed:
      "completed",
    outstanding:
      "outstanding",
    addProject:
      "Add project",
    projectValue:
      "Project value",
    paid:
      "Paid",
    inProgress:
      "In progress",
    since:
      "since",
    averageProject:
      "Avg. project value",
    projectsTotal:
      "projects total",
    project:
      "project",
    projects:
      "projects",
    remainingPayment:
      "remaining payment",
    currentProject:
      "Active project",
    plannedProject:
      "Planned project",
    completedProject:
      "Completed project",
    cancelledProject:
      "Cancelled project",
    started:
      "Started",
    completedAt:
      "Completed",
    editProject:
      "Open project",
    edit:
      "Edit",
    website:
      "Website",
    openWebsite:
      "Open website",
    delete:
      "Delete project",
    deleteTitle:
      "Delete this project?",
    deleteDescription:
      "The project and its saved project data will be permanently removed.",
    deleteConfirm:
      "Delete permanently",
    cancel:
      "Cancel",
    paymentOpen:
      "Outstanding payment",
    paymentOpenSub:
      "Remaining payment in project",
    paymentClear:
      "No outstanding payment",
    paymentClearSub:
      "All recorded project values are fully paid.",
    projectHistory:
      "Project history",
    projectHistorySub:
      "Client projects with value, payment state and completion.",
    all:
      "All",
    active:
      "In progress",
    finished:
      "Completed",
    open:
      "Outstanding",
    projectClient:
      "Project · client",
    value:
      "Value",
    payment:
      "Payment",
    closing:
      "Completion",
    runs:
      "active",
    planned:
      "planned",
    cancelled:
      "cancelled",
    fullyPaid:
      "Paid",
    openAmount:
      "outstanding",
    largestProject:
      "Largest project",
    noProjects:
      "No projects yet",
    noProjectsSub:
      "Create your first client project. Project values and payments will then appear here automatically.",
    noFilteredProjects:
      "No projects in this filter",
    noFilteredProjectsSub:
      "Choose another filter to see more projects.",
    previewFallback:
      "Project preview",
  },
} as const;

/* =========================================================
   HELPERS
========================================================= */

function localeFor(
  language:
    Language
) {
  return language ===
    "de"
    ? "de-DE"
    : "en-GB";
}

function formatMoney(
  value: number,
  currency: string,
  language: Language
) {
  return formatAccountMoney(value, currency || "EUR", language);
}

function formatPercent(
  value: number
) {
  return `${Math.round(
    value
  )} %`;
}

function formatFullDate(
  value:
    | string
    | null,
  language:
    Language
) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      localeFor(
        language
      ),
      {
        day:
          "2-digit",
        month:
          "long",
        year:
          "numeric",
      }
    ).format(
      new Date(
        value
      )
    );
  } catch {
    return "—";
  }
}

function formatShortDate(
  value:
    | string
    | null,
  language:
    Language
) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      localeFor(
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
  } catch {
    return "—";
  }
}

function formatMonthYear(
  value:
    | string
    | null,
  language:
    Language
) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      localeFor(
        language
      ),
      {
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
  } catch {
    return "—";
  }
}

function projectYear(
  project:
    ProjectWorkspaceItem
) {
  const source =
    project.completedAt ??
    project.startedAt ??
    project.createdAt;

  const date =
    new Date(
      source
    );

  return Number.isFinite(
    date.getTime()
  )
    ? String(
        date.getFullYear()
      )
    : "—";
}

function normalizeUrl(
  value: string
) {
  return value.startsWith(
    "http://"
  ) ||
    value.startsWith(
      "https://"
    )
    ? value
    : `https://${value}`;
}

function displayDomain(
  value:
    | string
    | null
) {
  if (!value) {
    return "";
  }

  return value
    .replace(
      /^https?:\/\//i,
      ""
    )
    .replace(
      /^www\./i,
      ""
    )
    .replace(
      /\/.*$/,
      ""
    );
}

function openValue(
  project:
    ProjectWorkspaceItem
) {
  return Math.max(
    0,
    project.totalValue -
      project.amountPaid
  );
}

function isRevenueProject(
  project:
    ProjectWorkspaceItem
) {
  return (
    project.status !==
    "CANCELLED"
  );
}

function statusPriority(
  status: string
) {
  switch (status) {
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

function sortTimestamp(
  project:
    ProjectWorkspaceItem
) {
  const source =
    project.completedAt ??
    project.startedAt ??
    project.createdAt;

  const timestamp =
    new Date(
      source
    ).getTime();

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}

function statusLabel(
  project:
    ProjectWorkspaceItem,
  language:
    Language
) {
  const text =
    COPY[
      language
    ];

  switch (
    project.status
  ) {
    case "IN_PROGRESS":
      return text.inProgress;
    case "PLANNED":
      return text.plannedProject;
    case "COMPLETED":
      return text.completed;
    case "CANCELLED":
      return text.cancelled;
    default:
      return project.status;
  }
}

function statusBadgeClass(
  status: string
) {
  switch (
    status
  ) {
    case "IN_PROGRESS":
      return "bg-[#EAEEFB] text-[#002BBA] dark:bg-blue-950/50 dark:text-blue-300";
    case "COMPLETED":
      return "bg-[#E9F0EA] text-[#2F6B3A] dark:bg-emerald-950/50 dark:text-emerald-300";
    case "PLANNED":
      return "bg-black/[0.05] text-[#40454E] dark:bg-white/[0.08] dark:text-[#C9CDD4]";
    case "CANCELLED":
      return "bg-black/[0.05] text-[#6B7078] dark:bg-white/[0.08] dark:text-[#9CA1AA]";
    default:
      return "bg-black/[0.05] text-[#6B7078] dark:bg-white/[0.08] dark:text-[#9CA1AA]";
  }
}

function featuredMetaLabel(
  project:
    ProjectWorkspaceItem,
  language:
    Language
) {
  const text =
    COPY[
      language
    ];

  switch (
    project.status
  ) {
    case "IN_PROGRESS":
      return text.currentProject;
    case "PLANNED":
      return text.plannedProject;
    case "COMPLETED":
      return text.completedProject;
    case "CANCELLED":
      return text.cancelledProject;
    default:
      return project.status;
  }
}

function closingLabel(
  project:
    ProjectWorkspaceItem,
  language:
    Language
) {
  const text =
    COPY[
      language
    ];

  if (
    project.status ===
    "IN_PROGRESS"
  ) {
    return text.runs;
  }

  if (
    project.status ===
    "PLANNED"
  ) {
    return text.planned;
  }

  if (
    project.status ===
    "CANCELLED"
  ) {
    return text.cancelled;
  }

  return (
    formatShortDate(
      project.completedAt,
      language
    ) ||
    "—"
  );
}

/* =========================================================
   WORKSPACE
========================================================= */

export function ProjectsWorkspace({
  language,
  projects,
  accountCurrency,
}: {
  language:
    Language;
  projects:
    ProjectWorkspaceItem[];
  accountCurrency: string;
}) {
  const router =
    useRouter();

  const text =
    COPY[
      language
    ];

  const [
    filter,
    setFilter,
  ] =
    useState<ProjectFilter>(
      "ALL"
    );

  const [
    deleteCandidate,
    setDeleteCandidate,
  ] =
    useState<ProjectWorkspaceItem | null>(
      null
    );

  const [
    editCandidate,
    setEditCandidate,
  ] =
    useState<ProjectWorkspaceItem | null>(
      null
    );

  const [
    deleting,
    startDeleteTransition,
  ] =
    useTransition();

  const sortedProjects =
    useMemo(
      () =>
        [
          ...projects,
        ].sort(
          (
            a,
            b
          ) => {
            const statusDifference =
              statusPriority(
                a.status
              ) -
              statusPriority(
                b.status
              );

            if (
              statusDifference !==
              0
            ) {
              return statusDifference;
            }

            return (
              sortTimestamp(
                b
              ) -
              sortTimestamp(
                a
              )
            );
          }
        ),
      [
        projects,
      ]
    );

  const revenueProjects =
    useMemo(
      () =>
        sortedProjects.filter(
          isRevenueProject
        ),
      [
        sortedProjects,
      ]
    );

  const totals =
    useMemo(
      () => {
        const totalValue =
          revenueProjects.reduce(
            (
              total,
              project
            ) =>
              total +
              project.totalValue,
            0
          );

        const amountPaid =
          revenueProjects.reduce(
            (
              total,
              project
            ) =>
              total +
              project.amountPaid,
            0
          );

        const outstanding =
          revenueProjects.reduce(
            (
              total,
              project
            ) =>
              total +
              openValue(
                project
              ),
            0
          );

        const active =
          revenueProjects.filter(
            (
              project
            ) =>
              project.status ===
              "IN_PROGRESS"
          );

        const completed =
          revenueProjects.filter(
            (
              project
            ) =>
              project.status ===
              "COMPLETED"
          );

        const open =
          revenueProjects.filter(
            (
              project
            ) =>
              openValue(
                project
              ) >
              0
          );

        const average =
          revenueProjects.length >
          0
            ? totalValue /
              revenueProjects.length
            : 0;

        const values =
          revenueProjects
            .map(
              (
                project
              ) =>
                project.totalValue
            )
            .filter(
              (
                value
              ) =>
                value >
                0
            );

        const earliestCompleted =
          completed
            .map(
              (
                project
              ) =>
                project.completedAt
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(
                  value
                )
            )
            .sort(
              (
                a,
                b
              ) =>
                new Date(
                  a
                ).getTime() -
                new Date(
                  b
                ).getTime()
            )[0] ??
          null;

        return {
          totalValue,
          amountPaid,
          outstanding,
          active,
          completed,
          open,
          average,
          minValue:
            values.length >
            0
              ? Math.min(
                  ...values
                )
              : 0,
          maxValue:
            values.length >
            0
              ? Math.max(
                  ...values
                )
              : 0,
          earliestCompleted,
          paidPercent:
            totalValue >
            0
              ? Math.min(
                  100,
                  Math.max(
                    0,
                    amountPaid /
                      totalValue *
                      100
                  )
                )
              : 0,
        };
      },
      [
        revenueProjects,
      ]
    );

  const featuredProject =
    totals.active[0] ??
    sortedProjects.find(
      (
        project
      ) =>
        project.status ===
        "PLANNED"
    ) ??
    sortedProjects[0] ??
    null;

  const outstandingProject =
    sortedProjects
      .filter(
        isRevenueProject
      )
      .filter(
        (
          project
        ) =>
          openValue(
            project
          ) >
          0
      )
      .sort(
        (
          a,
          b
        ) =>
          openValue(
            b
          ) -
          openValue(
            a
          )
      )[0] ??
    null;

  const counts =
    useMemo(
      () => ({
        ALL:
          sortedProjects.length,
        ACTIVE:
          sortedProjects.filter(
            (
              project
            ) =>
              project.status ===
              "IN_PROGRESS"
          ).length,
        COMPLETED:
          sortedProjects.filter(
            (
              project
            ) =>
              project.status ===
              "COMPLETED"
          ).length,
        OPEN:
          sortedProjects.filter(
            (
              project
            ) =>
              isRevenueProject(
                project
              ) &&
              openValue(
                project
              ) >
                0
          ).length,
      }),
      [
        sortedProjects,
      ]
    );

  const visibleProjects =
    useMemo(
      () =>
        sortedProjects.filter(
          (
            project
          ) => {
            switch (
              filter
            ) {
              case "ACTIVE":
                return (
                  project.status ===
                  "IN_PROGRESS"
                );
              case "COMPLETED":
                return (
                  project.status ===
                  "COMPLETED"
                );
              case "OPEN":
                return (
                  isRevenueProject(
                    project
                  ) &&
                  openValue(
                    project
                  ) >
                    0
                );
              default:
                return true;
            }
          }
        ),
      [
        filter,
        sortedProjects,
      ]
    );

  const yearGroups =
    useMemo(
      () => {
        const groups =
          new Map<
            string,
            ProjectWorkspaceItem[]
          >();

        for (
          const project
          of visibleProjects
        ) {
          const year =
            projectYear(
              project
            );

          const current =
            groups.get(
              year
            ) ??
            [];

          current.push(
            project
          );

          groups.set(
            year,
            current
          );
        }

        return Array.from(
          groups.entries()
        );
      },
      [
        visibleProjects,
      ]
    );

  const largestProject =
    revenueProjects
      .slice()
      .sort(
        (
          a,
          b
        ) =>
          b.totalValue -
          a.totalValue
      )[0] ??
    null;

  function toQuickEditValue(
    project:
      ProjectWorkspaceItem
  ): QuickProjectEditValue {
    return {
      id:
        project.id,
      clientName:
        project.clientName,
      projectName:
        project.projectName,
      websiteUrl:
        project.websiteUrl,
      mediaUrl:
        project.mediaUrl,
      mediaMode:
        project.mediaMode,
      status:
        project.status,
      totalValue:
        project.totalValue,
      amountPaid:
        project.amountPaid,
      startedAt:
        project.startedAt,
      completedAt:
        project.completedAt,
      notes:
        project.notes,
    };
  }

  function performDelete() {
    if (
      !deleteCandidate ||
      deleting
    ) {
      return;
    }

    const projectId =
      deleteCandidate.id;

    startDeleteTransition(
      async () => {
        await deleteProject(
          projectId
        );

        setDeleteCandidate(
          null
        );

        router.refresh();
      }
    );
  }

  if (
    projects.length ===
    0
  ) {
    return (
      <div className="flex w-full flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6 lg:py-5 xl:px-[26px] xl:py-6">
        <ProjectsHeader
          language={
            language
          }
          accountCurrency={
            accountCurrency
          }
          running={
            0
          }
          completed={
            0
          }
          outstanding={
            0
          }
        />

        <section className="rounded-[16px] border border-black/[0.08] bg-white px-[18px] py-8 shadow-[0_1px_2px_rgba(11,12,14,.03)] dark:border-white/10 dark:bg-[#0F1013]">
          <div className="max-w-[460px]">
            <p className="text-[13px] font-medium text-[#0B0C0E] dark:text-white">
              {
                text.noProjects
              }
            </p>

            <p className="mt-1.5 text-[11.5px] leading-5 text-[#6B7078] dark:text-[#91969F]">
              {
                text.noProjectsSub
              }
            </p>

            <ProjectCreateDialog
              language={
                language
              }
              label={
                text.addProject
              }
              triggerClassName="mt-4 !h-[34px] !rounded-[10px] !px-3.5 !text-[13px]"
            />
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex min-h-[calc(100vh-20px)] w-full max-w-[1540px] flex-col gap-[14px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5 xl:px-[26px] xl:py-6">
        <ProjectsHeader
          language={
            language
          }
          accountCurrency={
            accountCurrency
          }
          running={
            totals.active.length
          }
          completed={
            totals.completed.length
          }
          outstanding={
            totals.outstanding
          }
        />

        {/* =================================================
            SEGMENTED PROJECT METRICS
        ================================================= */}

        <section className="flex shrink-0 overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,.03)] dark:border-white/10 dark:bg-[#0F1013]">
          <MetricSegment
            label={
              text.projectValue
            }
            value={
              formatMoney(
                totals.totalValue,
                accountCurrency,
                language
              )
            }
            hint={`${revenueProjects.length} ${text.projectsTotal}`}
            className="flex-[1.25]"
          />

          <MetricDivider />

          <MetricSegment
            label={
              text.paid
            }
            value={
              formatMoney(
                totals.amountPaid,
                accountCurrency,
                language
              )
            }
            className="flex-[1.1]"
            footer={
              <div className="flex items-center gap-[7px]">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-[#2F6B3A] transition-[width] duration-500"
                    style={{
                      width:
                        `${totals.paidPercent}%`,
                    }}
                  />
                </div>

                <span className="font-mono text-[10px] tabular-nums text-[#6B7078] dark:text-[#91969F]">
                  {
                    formatPercent(
                      totals.paidPercent
                    )
                  }
                </span>
              </div>
            }
          />

          <MetricDivider />

          <MetricSegment
            label={
              text.outstanding
            }
            value={
              formatMoney(
                totals.outstanding,
                accountCurrency,
                language
              )
            }
            hint={`${totals.open.length} ${totals.open.length === 1 ? text.project : text.projects} · ${text.remainingPayment}`}
            className="flex-1 bg-[linear-gradient(180deg,rgba(154,81,6,.045),rgba(154,81,6,0))]"
            labelClassName="text-[#9A5106]"
            valueClassName="text-[#9A5106]"
          />

          <MetricDivider />

          <MetricSegment
            label={
              text.inProgress
            }
            value={
              String(
                totals.active.length
              )
            }
            hint={
              totals.active[0]
                ?.clientName ??
              "—"
            }
            className="flex-[0.85] bg-[linear-gradient(180deg,rgba(0,43,186,.035),rgba(0,43,186,0))]"
            labelClassName="text-[#002BBA]"
            valueClassName="text-[#002BBA]"
          />

          <MetricDivider />

          <MetricSegment
            label={
              text.completed
            }
            value={
              String(
                totals.completed.length
              )
            }
            hint={
              totals.earliestCompleted
                ? `${text.since} ${formatMonthYear(
                    totals.earliestCompleted,
                    language
                  )}`
                : "—"
            }
            className="flex-[0.85]"
          />

          <MetricDivider />

          <MetricSegment
            label={
              text.averageProject
            }
            value={
              formatMoney(
                totals.average,
                accountCurrency,
                language
              )
            }
            hint={
              totals.minValue >
                0 &&
              totals.maxValue >
                0
                ? `${formatMoney(
                    totals.minValue,
                    accountCurrency,
                    language
                  )} – ${formatMoney(
                    totals.maxValue,
                    accountCurrency,
                    language
                  )}`
                : "—"
            }
            className="flex-[0.9]"
          />
        </section>

        {/* =================================================
            MAIN WORKSPACE
        ================================================= */}

        <div className="grid min-h-0 flex-1 gap-[14px] xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[398px_minmax(0,1fr)]">
          {/* LEFT RAIL */}

          <div className="flex min-h-0 flex-col gap-[14px]">
            {
              featuredProject
                ? (
                  <FeaturedProjectCard
                    project={
                      featuredProject
                    }
                    language={
                      language
                    }
                    onEdit={
                      () =>
                        setEditCandidate(
                          featuredProject
                        )
                    }
                    onDelete={
                      () =>
                        setDeleteCandidate(
                          featuredProject
                        )
                    }
                  />
                )
                : null
            }

            <OutstandingPaymentCard
              project={
                outstandingProject
              }
              accountCurrency={
                accountCurrency
              }
              totalOutstanding={
                totals.outstanding
              }
              totalPaid={
                totals.amountPaid
              }
              language={
                language
              }
            />
          </div>

          {/* PROJECT HISTORY */}

          <section className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,.03)] dark:border-white/10 dark:bg-[#0F1013] xl:min-h-0">
            <div className="flex shrink-0 items-start justify-between gap-4 px-[18px] pb-[13px] pt-4">
              <div>
                <h2 className="text-[14.5px] font-semibold tracking-[-0.015em] text-[#0B0C0E] dark:text-white">
                  {
                    text.projectHistory
                  }
                </h2>

                <p className="mt-[3px] text-[12px] text-[#6B7078] dark:text-[#91969F]">
                  {
                    text.projectHistorySub
                  }
                </p>
              </div>

              <div className="flex shrink-0 rounded-[10px] bg-black/[0.045] p-[3px] dark:bg-white/[0.06]">
                <FilterButton
                  active={
                    filter ===
                    "ALL"
                  }
                  onClick={
                    () =>
                      setFilter(
                        "ALL"
                      )
                  }
                >
                  {text.all}{" "}
                  {
                    counts.ALL
                  }
                </FilterButton>

                <FilterButton
                  active={
                    filter ===
                    "ACTIVE"
                  }
                  onClick={
                    () =>
                      setFilter(
                        "ACTIVE"
                      )
                  }
                >
                  {text.active}{" "}
                  {
                    counts.ACTIVE
                  }
                </FilterButton>

                <FilterButton
                  active={
                    filter ===
                    "COMPLETED"
                  }
                  onClick={
                    () =>
                      setFilter(
                        "COMPLETED"
                      )
                  }
                >
                  {text.finished}{" "}
                  {
                    counts.COMPLETED
                  }
                </FilterButton>

                <FilterButton
                  active={
                    filter ===
                    "OPEN"
                  }
                  onClick={
                    () =>
                      setFilter(
                        "OPEN"
                      )
                  }
                >
                  {text.open}{" "}
                  {
                    counts.OPEN
                  }
                </FilterButton>
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-auto">
              <div className="min-w-[790px]">
                <div className="grid grid-cols-[minmax(0,1fr)_112px_122px_124px_28px] items-center gap-x-[14px] border-y border-black/[0.07] bg-[#FDFDFE] px-[18px] py-[9px] dark:border-white/[0.08] dark:bg-white/[0.015]">
                  <TableLabel>
                    {
                      text.projectClient
                    }
                  </TableLabel>

                  <TableLabel>
                    {
                      text.value
                    }
                  </TableLabel>

                  <TableLabel>
                    {
                      text.payment
                    }
                  </TableLabel>

                  <TableLabel>
                    {
                      text.closing
                    }
                  </TableLabel>

                  <div />
                </div>

                {
                  visibleProjects.length ===
                  0
                    ? (
                      <div className="px-[18px] py-10">
                        <p className="text-[13px] font-medium text-[#0B0C0E] dark:text-white">
                          {
                            text.noFilteredProjects
                          }
                        </p>

                        <p className="mt-1.5 text-[11.5px] text-[#6B7078] dark:text-[#91969F]">
                          {
                            text.noFilteredProjectsSub
                          }
                        </p>
                      </div>
                    )
                    : yearGroups.map(
                        (
                          [
                            year,
                            groupProjects,
                          ]
                        ) => {
                          const groupValue =
                            groupProjects.reduce(
                              (
                                total,
                                project
                              ) =>
                                total +
                                project.totalValue,
                              0
                            );

                          return (
                            <div
                              key={
                                year
                              }
                            >
                              <div className="flex items-center gap-[11px] border-b border-black/[0.06] bg-[#F7F8FA] px-[18px] py-2 dark:border-white/[0.07] dark:bg-white/[0.025]">
                                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.11em] text-[#0B0C0E] dark:text-white">
                                  {
                                    year
                                  }
                                </span>

                                <span className="font-mono text-[9.5px] text-[#6B7078] dark:text-[#91969F]">
                                  {
                                    groupProjects.length
                                  }{" "}
                                  {
                                    groupProjects.length ===
                                    1
                                      ? text.project
                                      : text.projects
                                  }{" "}
                                  ·{" "}
                                  {
                                    formatMoney(
                                      groupValue,
                                      accountCurrency,
                                      language
                                    )
                                  }
                                </span>
                              </div>

                              {
                                groupProjects.map(
                                  (
                                    project
                                  ) => (
                                    <ProjectHistoryRow
                                      key={
                                        project.id
                                      }
                                      project={
                                        project
                                      }
                                      language={
                                        language
                                      }
                                      onEdit={
                                        () =>
                                          setEditCandidate(
                                            project
                                          )
                                      }
                                      onDelete={
                                        () =>
                                          setDeleteCandidate(
                                            project
                                          )
                                      }
                                    />
                                  )
                                )
                              }
                            </div>
                          );
                        }
                      )
                }
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-black/[0.07] bg-[#FDFDFE] px-[18px] py-2.5 dark:border-white/[0.08] dark:bg-white/[0.015]">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[#6B7078] dark:text-[#91969F]">
                {
                  visibleProjects.length
                }{" "}
                {
                  visibleProjects.length ===
                  1
                    ? text.project
                    : text.projects
                }{" "}
                ·{" "}
                {
                  formatMoney(
                    visibleProjects.reduce(
                      (
                        total,
                        project
                      ) =>
                        total +
                        project.totalValue,
                      0
                    ),
                    accountCurrency,
                    language
                  )
                }
              </span>

              {
                largestProject
                  ? (
                    <span className="truncate text-right text-[11.5px] text-[#6B7078] dark:text-[#91969F]">
                      {
                        text.largestProject
                      }
                      :{" "}
                      <span className="font-medium text-[#0B0C0E] dark:text-white">
                        {
                          largestProject.clientName
                        }{" "}
                        ·{" "}
                        {
                          formatMoney(
                            largestProject.totalValue,
                            largestProject.currency,
                            language
                          )
                        }
                      </span>
                    </span>
                  )
                  : null
              }
            </div>
          </section>
        </div>
      </div>

      <ProjectEditDialog
        project={
          editCandidate
            ? toQuickEditValue(
                editCandidate
              )
            : null
        }
        language={
          language
        }
        open={
          Boolean(
            editCandidate
          )
        }
        onOpenChange={
          (
            open
          ) => {
            if (
              !open
            ) {
              setEditCandidate(
                null
              );
            }
          }
        }
        returnTo="/projects"
      />

      <AlertDialog
        open={
          Boolean(
            deleteCandidate
          )
        }
        onOpenChange={
          (
            open
          ) => {
            if (
              !open &&
              !deleting
            ) {
              setDeleteCandidate(
                null
              );
            }
          }
        }
      >
        <AlertDialogContent className="max-w-[430px] rounded-[16px] border-black/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {
                text.deleteTitle
              }
            </AlertDialogTitle>

            <AlertDialogDescription>
              {
                deleteCandidate
                  ? `${text.deleteDescription} “${deleteCandidate.projectName}”`
                  : text.deleteDescription
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                deleting
              }
            >
              {
                text.cancel
              }
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={
                deleting
              }
              onClick={
                (
                  event
                ) => {
                  event.preventDefault();
                  performDelete();
                }
              }
              className="bg-[#9A5106] text-white hover:bg-[#853F02]"
            >
              {
                deleting
                  ? "…"
                  : text.deleteConfirm
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* =========================================================
   HEADER
========================================================= */

function ProjectsHeader({
  language,
  accountCurrency,
  running,
  completed,
  outstanding,
}: {
  language:
    Language;
  accountCurrency: string;
  running: number;
  completed: number;
  outstanding: number;
}) {
  const text =
    COPY[
      language
    ];

  return (
    <header className="flex shrink-0 flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#002BBA]">
          <span className="size-[5px] rounded-full bg-[#002BBA]" />
          {
            text.eyebrow
          }
        </div>

        <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
          <h1 className="text-[34px] font-semibold leading-none tracking-[-0.035em] text-[#0B0C0E] dark:text-white sm:text-[38px] xl:text-[42px]">
            {
              text.title
            }
          </h1>

          <span className="text-[13px] tracking-[-0.01em] text-[#6B7078] dark:text-[#9CA1AA] sm:text-[14px] xl:text-[15px]">
            {
              running
            }{" "}
            {
              text.running
            }{" "}
            ·{" "}
            {
              completed
            }{" "}
            {
              text.completed
            }{" "}
            ·{" "}
            {
              formatMoney(
                outstanding,
                accountCurrency,
                language
              )
            }{" "}
            {
              text.outstanding
            }
          </span>
        </div>

        <p className="mt-[7px] max-w-[760px] text-[13px] leading-5 text-[#6B7078] dark:text-[#9CA1AA] sm:text-[13.5px]">
          {
            text.description
          }
        </p>
      </div>

      <ProjectCreateDialog
        language={
          language
        }
        label={
          text.addProject
        }
        triggerClassName="!h-[34px] !rounded-[10px] !px-3.5 !text-[13px] !font-medium !shadow-[0_1px_2px_rgba(0,43,186,.30)]"
      />
    </header>
  );
}

/* =========================================================
   METRIC STRIP
========================================================= */

function MetricDivider() {
  return (
    <div className="my-[14px] w-px shrink-0 bg-black/[0.07] dark:bg-white/[0.08]" />
  );
}

function MetricSegment({
  label,
  value,
  hint,
  footer,
  className = "",
  labelClassName = "",
  valueClassName = "",
}: {
  label: string;
  value: string;
  hint?: string;
  footer?:
    React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`min-w-0 px-5 py-[15px] ${className}`}>
      <p className={`font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078] dark:text-[#91969F] ${labelClassName}`}>
        {
          label
        }
      </p>

      <p className={`mt-1.5 truncate text-[27px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#0B0C0E] dark:text-white ${valueClassName}`}>
        {
          value
        }
      </p>

      {
        footer
          ? (
            <div className="mt-2">
              {
                footer
              }
            </div>
          )
          : (
            <p className="mt-1.5 truncate text-[11px] text-[#6B7078] dark:text-[#91969F]">
              {
                hint ??
                "—"
              }
            </p>
          )
      }
    </div>
  );
}

/* =========================================================
   FEATURED PROJECT
========================================================= */

function FeaturedProjectCard({
  project,
  language,
  onEdit,
  onDelete,
}: {
  project:
    ProjectWorkspaceItem;
  language:
    Language;
  onEdit:
    () => void;
  onDelete:
    () => void;
}) {
  const text =
    COPY[
      language
    ];

  const projectOpen =
    openValue(
      project
    );

  const paidPercent =
    project.totalValue >
    0
      ? Math.min(
          100,
          Math.max(
            0,
            project.amountPaid /
              project.totalValue *
              100
          )
        )
      : 0;

  const openPercent =
    project.totalValue >
    0
      ? Math.min(
          100,
          Math.max(
            0,
            projectOpen /
              project.totalValue *
              100
          )
        )
      : 0;

  const domain =
    displayDomain(
      project.websiteUrl
    );

  return (
    <article className="shrink-0 overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,.03)] dark:border-white/10 dark:bg-[#0F1013]">
      <div className="relative flex h-[138px] flex-col items-center justify-center gap-[7px] overflow-hidden border-b border-black/[0.07] bg-[linear-gradient(160deg,#E8EDFA,#F4F6FB)] dark:border-white/[0.08] dark:bg-[linear-gradient(160deg,#182033,#12151D)] 2xl:h-[150px]">
        {
          project.mediaUrl
            ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  project.mediaUrl
                }
                alt=""
                className={`absolute inset-0 h-full w-full ${
                  project.mediaMode ===
                  "logo"
                    ? "object-contain p-10"
                    : "object-cover"
                }`}
              />
            )
            : (
              <>
                <Monitor className="size-[18px] text-[#8B93A8]" />

                <span className="max-w-[82%] truncate font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#6B7078] dark:text-[#A6ABB4]">
                  {
                    domain ||
                    text.previewFallback
                  }
                </span>
              </>
            )
        }
      </div>

      <div className="px-[17px] pb-[17px] pt-[15px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={`rounded-[6px] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] ${statusBadgeClass(
                project.status
              )}`}>
                {
                  statusLabel(
                    project,
                    language
                  )
                }
              </span>

              <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[#6B7078] dark:text-[#91969F]">
                {
                  featuredMetaLabel(
                    project,
                    language
                  )
                }
              </span>
            </div>

            <h2 className="mt-[9px] text-[16px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#0B0C0E] dark:text-white">
              {
                project.projectName
              }
            </h2>

            <p className="mt-1 text-[12px] text-[#6B7078] dark:text-[#91969F]">
              {
                project.clientName
              }
            </p>
          </div>

          <ProjectMenu
            project={
              project
            }
            language={
              language
            }
            onEdit={
              onEdit
            }
            onDelete={
              onDelete
            }
          />
        </div>

        <div className="mt-[14px] flex items-end justify-between gap-3">
          <div className="shrink-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#6B7078] dark:text-[#91969F]">
              {
                text.projectValue
              }
            </p>

            <p className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-[#0B0C0E] dark:text-white">
              {
                formatMoney(
                  project.totalValue,
                  project.currency,
                  language
                )
              }
            </p>
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
              <div
                className="h-full bg-[#2F6B3A]"
                style={{
                  width:
                    `${paidPercent}%`,
                }}
              />

              <div
                className="h-full bg-[#E4C79E]"
                style={{
                  width:
                    `${openPercent}%`,
                }}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[9.5px] tabular-nums">
              <span className="truncate text-[#2F6B3A]">
                {
                  formatMoney(
                    project.amountPaid,
                    project.currency,
                    language
                  )
                }{" "}
                {
                  text.paid.toLowerCase()
                }
              </span>

              <span className="truncate text-right text-[#9A5106]">
                {
                  formatMoney(
                    projectOpen,
                    project.currency,
                    language
                  )
                }{" "}
                {
                  text.openAmount
                }
              </span>
            </div>
          </div>
        </div>

        <div className="mt-[14px] flex flex-col gap-2 border-t border-black/[0.07] pt-3 dark:border-white/[0.08]">
          {
            project.startedAt
              ? (
                <div className="flex items-center gap-[9px] text-[11.5px] text-[#40454E] dark:text-[#D2D5DB]">
                  <CalendarDays className="size-3 shrink-0 text-[#6B7078]" />
                  <span className="truncate">
                    {
                      text.started
                    }{" "}
                    {
                      formatFullDate(
                        project.startedAt,
                        language
                      )
                    }
                  </span>
                </div>
              )
              : null
          }

          {
            project.notes
              ? (
                <div className="flex items-start gap-[9px] text-[11.5px] leading-[1.55] text-[#6B7078] dark:text-[#91969F]">
                  <FileText className="mt-[3px] size-3 shrink-0" />

                  <p className="line-clamp-2 min-w-0 whitespace-pre-wrap break-words">
                    {
                      project.notes
                    }
                  </p>
                </div>
              )
              : null
          }
        </div>

        <div className="mt-[15px] flex gap-2">
          <Link
            href={`/projects/${project.id}`}
            className="flex h-[34px] flex-1 items-center justify-center rounded-[10px] bg-[#002BBA] px-3 text-[12.5px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,.30)] transition-colors hover:bg-[#00229A]"
          >
            {
              text.editProject
            }
          </Link>

          {
            project.websiteUrl
              ? (
                <a
                  href={
                    normalizeUrl(
                      project.websiteUrl
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-[34px] items-center gap-[7px] rounded-[10px] border border-black/[0.09] bg-white px-3 text-[12.5px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] dark:border-white/10 dark:bg-[#111216] dark:text-[#D7D9DE]"
                >
                  <ExternalLink className="size-3 opacity-60" />
                  {
                    text.website
                  }
                </a>
              )
              : null
          }
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   OUTSTANDING PAYMENT
========================================================= */

function OutstandingPaymentCard({
  project,
  accountCurrency,
  totalOutstanding,
  totalPaid,
  language,
}: {
  project:
    | ProjectWorkspaceItem
    | null;
  accountCurrency: string;
  totalOutstanding: number;
  totalPaid: number;
  language:
    Language;
}) {
  const text =
    COPY[
      language
    ];

  return (
    <section className="flex min-h-[170px] flex-1 flex-col rounded-[16px] bg-[#0B0C0E] px-[18px] py-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-white/60">
          {
            project
              ? text.paymentOpen
              : text.paymentClear
          }
        </p>

        <span className="rounded-[6px] bg-white/[0.14] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-white">
          {
            project
              ? `1 ${text.project}`
              : `${COPY[language].paid}`
          }
        </span>
      </div>

      <div className="mt-[11px] flex flex-wrap items-baseline gap-2">
        <span className="text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
          {
            formatMoney(
              project
                ? openValue(
                    project
                  )
                : totalPaid,
              project
                ?.currency ??
                accountCurrency,
              language
            )
          }
        </span>

        <span className="text-[11.5px] text-white/60">
          {
            project
              ? text.paymentOpenSub
              : text.paymentClearSub
          }
        </span>
      </div>

      <p className="mt-1.5 line-clamp-2 text-[11.5px] text-white/70">
        {
          project
            ? `${project.clientName} · ${project.projectName}`
            : text.paymentClearSub
        }
      </p>

      <div className="mt-auto flex gap-2 pt-[14px]">
        {
          project
            ? (
              <>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex h-[31px] flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-white px-3 text-[12.5px] font-medium text-[#0B0C0E] transition-colors hover:bg-white/90"
                >
                  <Pencil className="size-3" />
                  {
                    text.edit
                  }
                </Link>

                {
                  project.websiteUrl
                    ? (
                      <a
                        href={
                          normalizeUrl(
                            project.websiteUrl
                          )
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-[31px] items-center gap-1.5 rounded-[9px] border border-white/[0.18] px-3 text-[12.5px] text-white/80 transition-colors hover:bg-white/[0.08]"
                      >
                        {
                          text.website
                        }
                      </a>
                    )
                    : null
                }
              </>
            )
            : (
              <Link
                href="/projects"
                className="flex h-[31px] flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-white px-3 text-[12.5px] font-medium text-[#0B0C0E]"
              >
                <Check className="size-3" />
                {
                  text.paymentClear
                }
              </Link>
            )
        }
      </div>
    </section>
  );
}

/* =========================================================
   HISTORY ROW
========================================================= */

function ProjectHistoryRow({
  project,
  language,
  onEdit,
  onDelete,
}: {
  project:
    ProjectWorkspaceItem;
  language:
    Language;
  onEdit:
    () => void;
  onDelete:
    () => void;
}) {
  const text =
    COPY[
      language
    ];

  const projectOpen =
    openValue(
      project
    );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_112px_122px_124px_28px] items-center gap-x-[14px] border-b border-black/[0.05] px-[18px] py-2.5 transition-colors hover:bg-[#F7F8FA] dark:border-white/[0.06] dark:hover:bg-white/[0.025]">
      <div className="flex min-w-0 items-center gap-[11px]">
        <span
          className={`h-[26px] w-[3px] shrink-0 rounded-full ${
            project.status ===
            "IN_PROGRESS"
              ? "bg-[#002BBA]"
              : "bg-black/[0.12] dark:bg-white/[0.16]"
          }`}
        />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-[7px]">
            <Link
              href={`/projects/${project.id}/edit`}
              className="truncate text-[12.5px] font-medium tracking-[-0.01em] text-[#0B0C0E] hover:text-[#002BBA] dark:text-white"
            >
              {
                project.projectName
              }
            </Link>

            {
              project.status ===
              "IN_PROGRESS"
                ? (
                  <span className="shrink-0 rounded-[6px] bg-[#EAEEFB] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-[#002BBA] dark:bg-blue-950/50 dark:text-blue-300">
                    {
                      text.inProgress
                    }
                  </span>
                )
                : null
            }
          </div>

          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            <span className="truncate text-[10.5px] text-[#6B7078] dark:text-[#91969F]">
              {
                project.clientName
              }
            </span>

            {
              project.websiteUrl
                ? (
                  <a
                    href={
                      normalizeUrl(
                        project.websiteUrl
                      )
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 shrink items-center gap-1 font-mono text-[9.5px] text-[#002BBA] hover:text-[#001E85]"
                    onClick={
                      (
                        event
                      ) =>
                        event.stopPropagation()
                    }
                  >
                    <ExternalLink className="size-[9px] shrink-0" />

                    <span className="max-w-[190px] truncate">
                      {
                        displayDomain(
                          project.websiteUrl
                        )
                      }
                    </span>
                  </a>
                )
                : null
            }
          </div>
        </div>
      </div>

      <div className="font-mono text-[12px] font-medium tabular-nums text-[#0B0C0E] dark:text-white">
        {
          formatMoney(
            project.totalValue,
            project.currency,
            language
          )
        }
      </div>

      <div>
        <span
          className={`inline-flex whitespace-nowrap rounded-[6px] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] ${
            projectOpen <=
            0
              ? "bg-[#E9F0EA] text-[#2F6B3A] dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-[#FDF0E3] text-[#9A5106] dark:bg-amber-950/50 dark:text-amber-300"
          }`}
        >
          {
            projectOpen <=
            0
              ? text.fullyPaid
              : `${formatMoney(
                  projectOpen,
                  project.currency,
                  language
                )} ${text.openAmount}`
          }
        </span>
      </div>

      <div className="truncate font-mono text-[10.5px] text-[#6B7078] dark:text-[#91969F]">
        {
          closingLabel(
            project,
            language
          )
        }
      </div>

      <ProjectMenu
        project={
          project
        }
        language={
          language
        }
        onEdit={
          onEdit
        }
        onDelete={
          onDelete
        }
        compact
      />
    </div>
  );
}

/* =========================================================
   PROJECT MENU
========================================================= */

function ProjectMenu({
  project,
  language,
  onEdit,
  onDelete,
  compact = false,
}: {
  project:
    ProjectWorkspaceItem;
  language:
    Language;
  onEdit:
    () => void;
  onDelete:
    () => void;
  compact?: boolean;
}) {
  const text =
    COPY[
      language
    ];

  const triggerClassName =
    `flex shrink-0 items-center justify-center text-[#6B7078] transition-colors hover:bg-black/[0.06] hover:text-[#0B0C0E] dark:text-[#91969F] dark:hover:bg-white/[0.06] dark:hover:text-white ${
      compact
        ? "size-6 rounded-[7px]"
        : "size-7 rounded-[8px]"
    }`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Project actions"
            className={
              triggerClassName
            }
          />
        }
      >
        <MoreHorizontal
          className="size-3.5"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-44 rounded-[12px]"
      >
        <DropdownMenuItem
          onClick={
            onEdit
          }
          className="gap-2"
        >
          <Pencil className="size-3.5" />
          {
            text.edit
          }
        </DropdownMenuItem>

        {
          project.websiteUrl
            ? (
              <DropdownMenuItem
                onClick={
                  () =>
                    window.open(
                      normalizeUrl(
                        project.websiteUrl!
                      ),
                      "_blank",
                      "noopener,noreferrer"
                    )
                }
                className="gap-2"
              >
                <Globe2 className="size-3.5" />
                {
                  text.openWebsite
                }
              </DropdownMenuItem>
            )
            : null
        }

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={
            onDelete
          }
          className="gap-2 text-[#9A5106] focus:bg-[#FDF0E3] focus:text-[#9A5106]"
        >
          <Trash2 className="size-3.5" />
          {
            text.delete
          }
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* =========================================================
   SMALL PRIMITIVES
========================================================= */

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick:
    () => void;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`h-[26px] whitespace-nowrap rounded-[8px] px-2.5 text-[11.5px] transition-all ${
        active
          ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,.12)] dark:bg-[#1A1B20] dark:text-white"
          : "text-[#6B7078] hover:text-[#0B0C0E] dark:text-[#91969F] dark:hover:text-white"
      }`}
    >
      {
        children
      }
    </button>
  );
}

function TableLabel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#6B7078] dark:text-[#898E97]">
      {
        children
      }
    </div>
  );
}
