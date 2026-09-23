import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  Globe2,
  Monitor,
  WalletCards,
} from "lucide-react";

import {
  ProjectEditButton,
  type QuickProjectEditValue,
} from "@/components/quick-create-dialogs";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";
import { formatAccountMoney, resolveAccountCurrency } from "@/lib/account-currency";
import { getLeadbasePlanAccess } from "@/lib/plan-access";
import { planAllowsFeature } from "@/lib/plan-entitlements";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function localeFor(
  language:
    "de" | "en"
) {
  return language ===
    "de"
    ? "de-DE"
    : "en-GB";
}

function money(
  value: number,
  currency: string,
  language: "de" | "en"
) {
  return formatAccountMoney(value, currency || "EUR", language);
}

function dateLabel(
  value:
    | string
    | null,
  language:
    "de" | "en"
) {
  if (
    !value
  ) {
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

function domain(
  value:
    | string
    | null
) {
  if (
    !value
  ) {
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

function url(
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

function statusCopy(
  status: string,
  language:
    "de" | "en"
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

function statusClass(
  status: string
) {
  switch (
    status
  ) {
    case "IN_PROGRESS":
      return "bg-[#EAEEFB] text-[#002BBA]";
    case "COMPLETED":
      return "bg-[#E9F0EA] text-[#2F6B3A]";
    case "CANCELLED":
      return "bg-black/[0.05] text-[#6B7078]";
    default:
      return "bg-black/[0.05] text-[#40454E]";
  }
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const [
    {
      id,
    },
    language,
    supabase,
  ] =
    await Promise.all([
      params,
      getAppLanguage(),
      createClient(),
    ]);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const planAccess = await getLeadbasePlanAccess(user.id);
  if (!planAllowsFeature(planAccess.planId, "project_creation")) {
    redirect("/projects");
  }

  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const storedProfile = userMetadata.leadbase_profile && typeof userMetadata.leadbase_profile === "object"
    ? userMetadata.leadbase_profile as Record<string, unknown>
    : null;
  const accountCurrency = resolveAccountCurrency({
    storedCurrency: storedProfile?.currency,
    currencyMode: storedProfile?.currencyMode,
    location: typeof storedProfile?.location === "string" ? storedProfile.location : null,
  }).currency;

  const {
    data:
      project,
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
        media_url,
        media_mode,
        status,
        total_value,
        amount_paid,
        currency,
        started_at,
        completed_at,
        notes,
        created_at
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

  if (
    error ||
    !project
  ) {
    notFound();
  }

  const de =
    language ===
    "de";

  const totalValue =
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
      totalValue -
        amountPaid
    );

  const paidPercent =
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
      : 0;

  const editProject:
    QuickProjectEditValue = {
    id:
      project.id,
    clientName:
      project.client_name,
    projectName:
      project.project_name,
    websiteUrl:
      project.website_url,
    mediaUrl:
      project.media_url,
    mediaMode:
      project.media_mode,
    status:
      project.status,
    totalValue,
    amountPaid,
    startedAt:
      project.started_at,
    completedAt:
      project.completed_at,
    notes:
      project.notes,
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-20px)] w-full max-w-[1540px] flex-col gap-[14px] px-4 py-4 sm:px-5 lg:px-6 lg:py-5 xl:px-[26px] xl:py-6">
      <WorkspacePageMotion />

      <header className="flex shrink-0 flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 text-[11.5px] text-[#6B7078] transition-colors hover:text-[#002BBA]"
            >
              <ArrowLeft className="size-3" />
              {de
                ? "Zurück zu Projekte"
                : "Back to projects"}
            </Link>

            <span className="h-3 w-px bg-black/[0.12]" />

            <span className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#002BBA]">
              {de
                ? "Business · Projekt"
                : "Business · Project"}
            </span>
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2.5">
            <h1 className="truncate text-[34px] font-semibold leading-none tracking-[-0.035em] text-[#0B0C0E] dark:text-white sm:text-[38px] xl:text-[42px]">
              {
                project.project_name
              }
            </h1>

            <span className={`rounded-[6px] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] ${statusClass(
              project.status
            )}`}>
              {
                statusCopy(
                  project.status,
                  language
                )
              }
            </span>
          </div>

          <p className="mt-[7px] text-[13px] text-[#6B7078] dark:text-[#9CA1AA]">
            {
              project.client_name
            }
            {
              project.website_url
                ? ` · ${domain(
                    project.website_url
                  )}`
                : ""
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {
            project.website_url
              ? (
                <a
                  href={
                    url(
                      project.website_url
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-[34px] items-center gap-[7px] rounded-[10px] border border-black/[0.09] bg-white px-3.5 text-[12.5px] font-medium text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE]"
                >
                  <ExternalLink className="size-3.5" />
                  {de
                    ? "Website öffnen"
                    : "Open website"}
                </a>
              )
              : null
          }

          <ProjectEditButton
            project={
              editProject
            }
            language={
              language
            }
            label={
              de
                ? "Projekt bearbeiten"
                : "Edit project"
            }
            returnTo={`/projects/${project.id}`}
            className="!border-[#002BBA] !bg-[#002BBA] !text-white hover:!bg-[#00229A]"
          />
        </div>
      </header>

      <section className="grid shrink-0 overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,.03)] dark:border-white/10 dark:bg-[#0F1013] sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label={
            de
              ? "Projektwert"
              : "Project value"
          }
          value={
            money(
              totalValue,
              project.currency || accountCurrency,
              language
            )
          }
        />

        <Metric
          label={
            de
              ? "Bezahlt"
              : "Paid"
          }
          value={
            money(
              amountPaid,
              project.currency || accountCurrency,
              language
            )
          }
          accent="green"
        />

        <Metric
          label={
            de
              ? "Offen"
              : "Outstanding"
          }
          value={
            money(
              outstanding,
              project.currency || accountCurrency,
              language
            )
          }
          accent={
            outstanding >
            0
              ? "amber"
              : "green"
          }
        />

        <Metric
          label={
            de
              ? "Zahlungsstand"
              : "Payment progress"
          }
          value={`${Math.round(
            paidPercent
          )} %`}
          footer={
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full rounded-full bg-[#2F6B3A]"
                style={{
                  width:
                    `${paidPercent}%`,
                }}
              />
            </div>
          }
        />
      </section>

      <div className="grid min-h-0 flex-1 gap-[14px] xl:grid-cols-[minmax(0,1.45fr)_390px]">
        <section className="min-h-0 overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,.03)] dark:border-white/10 dark:bg-[#0F1013]">
          <div className="relative flex h-[250px] items-center justify-center overflow-hidden border-b border-black/[0.07] bg-[linear-gradient(160deg,#E8EDFA,#F4F6FB)] dark:border-white/[0.08] dark:bg-[linear-gradient(160deg,#182033,#12151D)] xl:h-[310px]">
            {
              project.media_url
                ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      project.media_url
                    }
                    alt=""
                    className={`h-full w-full ${
                      project.media_mode ===
                      "logo"
                        ? "object-contain p-12"
                        : "object-cover"
                    }`}
                  />
                )
                : (
                  <div className="text-center text-[#6B7078]">
                    <Monitor className="mx-auto size-5" />
                    <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.08em]">
                      {de
                        ? "Kein Projektbild"
                        : "No project image"}
                    </p>
                  </div>
                )
            }
          </div>

          <div className="px-[18px] py-4">
            <div className="flex items-center gap-2">
              <FileText className="size-3.5 text-[#002BBA]" />
              <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-[#0B0C0E] dark:text-white">
                {de
                  ? "Projektübersicht"
                  : "Project overview"}
              </h2>
            </div>

            <div className="mt-3 rounded-[11px] bg-[#F7F8FA] px-3.5 py-3 dark:bg-white/[0.03]">
              <p className="whitespace-pre-wrap break-words text-[12px] leading-5 text-[#40454E] dark:text-[#C9CDD4]">
                {
                  project.notes ||
                  (de
                    ? "Für dieses Projekt sind noch keine Notizen hinterlegt."
                    : "No notes have been added to this project yet.")
                }
              </p>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-[14px]">
          <section className="rounded-[16px] border border-black/[0.08] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(11,12,14,.03)] dark:border-white/10 dark:bg-[#0F1013]">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
              {de
                ? "Projektstatus"
                : "Project status"}
            </p>

            <div className="mt-3 grid gap-3">
              <Fact
                icon={CalendarDays}
                label={
                  de
                    ? "Gestartet"
                    : "Started"
                }
                value={
                  dateLabel(
                    project.started_at,
                    language
                  )
                }
              />

              <Fact
                icon={CalendarDays}
                label={
                  de
                    ? "Abgeschlossen"
                    : "Completed"
                }
                value={
                  dateLabel(
                    project.completed_at,
                    language
                  )
                }
              />

              <Fact
                icon={WalletCards}
                label={
                  de
                    ? "Offener Betrag"
                    : "Outstanding"
                }
                value={
                  money(
                    outstanding,
                    project.currency || accountCurrency,
                    language
                  )
                }
              />

              {
                project.website_url
                  ? (
                    <Fact
                      icon={Globe2}
                      label="Website"
                      value={
                        domain(
                          project.website_url
                        )
                      }
                    />
                  )
                  : null
              }
            </div>
          </section>

          <section className="flex min-h-[150px] flex-1 flex-col rounded-[16px] bg-[#0B0C0E] px-[18px] py-4 text-white">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-white/60">
              {outstanding >
              0
                ? de
                  ? "Offene Zahlung"
                  : "Outstanding payment"
                : de
                  ? "Zahlung vollständig"
                  : "Payment complete"}
            </p>

            <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
              {
                money(
                  outstanding,
                  project.currency || accountCurrency,
                  language
                )
              }
            </p>

            <p className="mt-2 text-[11.5px] leading-5 text-white/65">
              {outstanding >
              0
                ? de
                  ? "Restzahlung für dieses Projekt."
                  : "Remaining payment for this project."
                : de
                  ? "Der erfasste Projektwert ist vollständig bezahlt."
                  : "The recorded project value is fully paid."}
            </p>

            <div className="mt-auto pt-4">
              <ProjectEditButton
                project={
                  editProject
                }
                language={
                  language
                }
                label={
                  de
                    ? "Projekt bearbeiten"
                    : "Edit project"
                }
                returnTo={`/projects/${project.id}`}
                className="!w-full !border-white !bg-white !text-[#0B0C0E] hover:!bg-white/90"
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  footer,
  accent,
}: {
  label: string;
  value: string;
  footer?: React.ReactNode;
  accent?:
    | "green"
    | "amber";
}) {
  return (
    <div className="min-w-0 border-black/[0.07] px-[18px] py-[15px] sm:border-r sm:last:border-r-0 dark:border-white/[0.08]">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
        {
          label
        }
      </p>

      <p className={`mt-1.5 truncate text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums ${
        accent ===
        "green"
          ? "text-[#2F6B3A]"
          : accent ===
            "amber"
            ? "text-[#9A5106]"
            : "text-[#0B0C0E] dark:text-white"
      }`}>
        {
          value
        }
      </p>

      {
        footer
      }
    </div>
  );
}

function Fact({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    React.ComponentType<{
      className?: string;
    }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.06] pb-3 last:border-b-0 last:pb-0 dark:border-white/[0.07]">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#EAEEFB] text-[#002BBA]">
        <Icon className="size-3.5" />
      </div>

      <div className="min-w-0">
        <p className="font-mono text-[8.5px] uppercase tracking-[0.09em] text-[#6B7078]">
          {
            label
          }
        </p>

        <p className="mt-1 truncate text-[12px] font-medium text-[#0B0C0E] dark:text-white">
          {
            value
          }
        </p>
      </div>
    </div>
  );
}
