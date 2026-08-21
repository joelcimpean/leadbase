"use client";

import {
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  ExternalLink,
  Eye,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  analyzeLeadWebsite,
} from "./analysis-actions";

import {
  bulkDeleteLeads,
} from "./bulk-actions";

import {
  useLanguage,
} from "@/components/language-provider";

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
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Input,
} from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  type AppLanguage,
} from "@/lib/i18n";

import {
  getLeadPriorityLabel,
  getLeadStatusLabel,
  leadsCopy,
} from "@/lib/leads-i18n";

/* =========================================================
   TYPES
========================================================= */

export type LeadTableRow = {
  id: string;

  companyName: string;

  industry:
    | string
    | null;

  location:
    | string
    | null;

  websiteUrl:
    | string
    | null;

  contactFormUrl:
    | string
    | null;

  contactEmail:
    | string
    | null;

  websiteScore:
    | number
    | null;

  opportunityScore:
    | number
    | null;

  status: string;

  priority:
    | string
    | null;

  lastContactedAt:
    | string
    | null;
};

type AnalyzeProgress = {
  current: number;

  total: number;
};

/* =========================================================
   STATUS
========================================================= */

function statusClass(
  status: string
) {
  switch (
    status
  ) {
    case "NEW":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400";

    case "RESEARCHING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400";

    case "QUALIFIED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400";

    case "NOT_A_FIT":
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";

    case "DRAFT_READY":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400";

    case "CONTACTED":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400";

    case "REPLIED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-400";

    case "CALL_BOOKED":
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-400";

    case "PROPOSAL":
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-400";

    case "WON":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400";

    case "LOST":
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";

    case "DO_NOT_CONTACT":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400";

    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300";
  }
}

/* =========================================================
   PRIORITY
========================================================= */

function priorityClass(
  priority:
    | string
    | null
) {
  switch (
    priority
  ) {
    case "HIGH":
      return "text-red-600 dark:text-red-400";

    case "MEDIUM":
      return "text-amber-600 dark:text-amber-400";

    case "LOW":
      return "text-muted-foreground";

    default:
      return "text-muted-foreground";
  }
}

/* =========================================================
   NEXT ACTION
========================================================= */

function getNextAction(
  status: string,
  language:
    AppLanguage
) {
  const text =
    leadsCopy[
      language
    ].table;

  switch (
    status
  ) {
    case "NEW":
      return text.nextStartResearch;

    case "RESEARCHING":
      return text.nextFinishResearch;

    case "QUALIFIED":
      return text.nextPrepareOutreach;

    case "DRAFT_READY":
      return text.nextReviewDraft;

    case "CONTACTED":
      return text.nextWaitForReply;

    case "REPLIED":
      return text.nextReviewReply;

    case "CALL_BOOKED":
      return text.nextPrepareCall;

    case "PROPOSAL":
      return text.nextFollowProposal;

    case "WON":
      return text.nextClientWon;

    case "LOST":
    case "NOT_A_FIT":
      return text.nextNoAction;

    case "DO_NOT_CONTACT":
      return text.nextBlocked;

    default:
      return text.nextReviewLead;
  }
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
  date:
    | string
    | null,
  language:
    AppLanguage
) {
  if (
    !date
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-IE",
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
      date
    )
  );
}

/* =========================================================
   URL
========================================================= */

function normalizeUrl(
  url: string
) {
  return url.startsWith(
    "http"
  )
    ? url
    : `https://${url}`;
}

/* =========================================================
   CHECKBOX
========================================================= */

function SelectionCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;

  indeterminate?: boolean;

  disabled?: boolean;

  label: string;

  onChange: () => void;
}) {
  const checkboxRef =
    useRef<HTMLInputElement>(
      null
    );

  useEffect(
    () => {
      if (
        !checkboxRef.current
      ) {
        return;
      }

      checkboxRef.current.indeterminate =
        indeterminate;
    },
    [
      indeterminate,
    ]
  );

  return (
    <input
      ref={
        checkboxRef
      }
      type="checkbox"
      checked={
        checked
      }
      disabled={
        disabled
      }
      aria-label={
        label
      }
      onChange={
        onChange
      }
      className="size-4 cursor-pointer rounded border-border accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

/* =========================================================
   TABLE
========================================================= */

export function LeadsTable({
  leads,
}: {
  leads:
    LeadTableRow[];
}) {
  const router =
    useRouter();

  const {
    language,
  } =
    useLanguage();

  const text =
    leadsCopy[
      language
    ];

  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const [
    status,
    setStatus,
  ] =
    useState(
      "ALL"
    );

  const [
    priority,
    setPriority,
  ] =
    useState(
      "ALL"
    );

  const [
    filtersOpen,
    setFiltersOpen,
  ] =
    useState(
      false
    );

  /* =======================================================
     SELECTION STATE
  ======================================================= */

  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<
      Set<string>
    >(
      () =>
        new Set()
    );

  /* =======================================================
     BULK ACTION STATE
  ======================================================= */

  const [
    analyzing,
    setAnalyzing,
  ] =
    useState(
      false
    );

  const [
    analyzeProgress,
    setAnalyzeProgress,
  ] =
    useState<AnalyzeProgress | null>(
      null
    );

  const [
    bulkMessage,
    setBulkMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] =
    useState(
      false
    );

  const [
    isDeleting,
    startDeleteTransition,
  ] =
    useTransition();

  /* =======================================================
     FILTER LEADS
  ======================================================= */

  const filteredLeads =
    useMemo(
      () => {
        const searchTerm =
          search
            .trim()
            .toLowerCase();

        return leads.filter(
          (
            lead
          ) => {
            const matchesSearch =
              !searchTerm ||
              lead.companyName
                .toLowerCase()
                .includes(
                  searchTerm
                ) ||
              lead.industry
                ?.toLowerCase()
                .includes(
                  searchTerm
                ) ||
              lead.location
                ?.toLowerCase()
                .includes(
                  searchTerm
                ) ||
              lead.contactEmail
                ?.toLowerCase()
                .includes(
                  searchTerm
                );

            const matchesStatus =
              status ===
                "ALL" ||
              lead.status ===
                status;

            const matchesPriority =
              priority ===
                "ALL" ||
              (
                priority ===
                "NONE"
                  ? lead.priority ===
                    null
                  : lead.priority ===
                    priority
              );

            return (
              matchesSearch &&
              matchesStatus &&
              matchesPriority
            );
          }
        );
      },
      [
        leads,
        search,
        status,
        priority,
      ]
    );

  /* =======================================================
     FILTER INFORMATION
  ======================================================= */

  const hasActiveFilters =
    search.trim() !==
      "" ||
    status !==
      "ALL" ||
    priority !==
      "ALL";

  function resetFilters() {
    setSearch(
      ""
    );

    setStatus(
      "ALL"
    );

    setPriority(
      "ALL"
    );
  }

  /* =======================================================
     SELECTION INFORMATION
  ======================================================= */

  const filteredLeadIds =
    useMemo(
      () =>
        filteredLeads.map(
          (
            lead
          ) =>
            lead.id
        ),
      [
        filteredLeads,
      ]
    );

  const visibleSelectedCount =
    filteredLeadIds.filter(
      (
        leadId
      ) =>
        selectedIds.has(
          leadId
        )
    ).length;

  const allVisibleSelected =
    filteredLeadIds.length >
      0 &&
    visibleSelectedCount ===
      filteredLeadIds.length;

  const someVisibleSelected =
    visibleSelectedCount >
      0 &&
    !allVisibleSelected;

  /* =======================================================
     TOGGLE SINGLE
  ======================================================= */

  function toggleLead(
    leadId: string
  ) {
    setBulkMessage(
      null
    );

    setSelectedIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(
            leadId
          )
        ) {
          next.delete(
            leadId
          );
        } else {
          next.add(
            leadId
          );
        }

        return next;
      }
    );
  }

  /* =======================================================
     TOGGLE ALL
  ======================================================= */

  function toggleAllVisible() {
    setBulkMessage(
      null
    );

    setSelectedIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        if (
          allVisibleSelected
        ) {
          for (
            const leadId of
            filteredLeadIds
          ) {
            next.delete(
              leadId
            );
          }
        } else {
          for (
            const leadId of
            filteredLeadIds
          ) {
            next.add(
              leadId
            );
          }
        }

        return next;
      }
    );
  }

  /* =======================================================
     CLEAR
  ======================================================= */

  function clearSelection() {
    setSelectedIds(
      new Set()
    );

    setBulkMessage(
      null
    );
  }

  /* =======================================================
     MOBILE CARD
  ======================================================= */

  function handleMobileCardClick(
    event:
      MouseEvent<HTMLDivElement>,
    leadId: string
  ) {
    const target =
      event.target;

    if (
      target instanceof
        Element &&
      target.closest(
        "button, a, input, select, textarea"
      )
    ) {
      return;
    }

    router.push(
      `/leads/${leadId}`
    );
  }

  /* =======================================================
     BULK ANALYZE
  ======================================================= */

  async function handleBulkAnalyze() {
    if (
      analyzing ||
      isDeleting ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    const leadIds =
      Array.from(
        selectedIds
      );

    setAnalyzing(
      true
    );

    setBulkMessage(
      null
    );

    setAnalyzeProgress({
      current:
        0,

      total:
        leadIds.length,
    });

    try {
      for (
        let index =
          0;
        index <
        leadIds.length;
        index +=
          1
      ) {
        const leadId =
          leadIds[
            index
          ];

        const formData =
          new FormData();

        formData.set(
          "leadId",
          leadId
        );

        await analyzeLeadWebsite(
          formData
        );

        setAnalyzeProgress({
          current:
            index +
            1,

          total:
            leadIds.length,
        });
      }

      setBulkMessage(
        leadIds.length ===
        1
          ? text.table
              .analysisOneFinished
          : text.table.analysisManyFinished.replace(
              "{count}",
              String(
                leadIds.length
              )
            )
      );

      setSelectedIds(
        new Set()
      );

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Bulk analysis failed:",
        error
      );

      setBulkMessage(
        text.table
          .analysisFailed
      );
    } finally {
      setAnalyzing(
        false
      );

      setAnalyzeProgress(
        null
      );
    }
  }

  /* =======================================================
     BULK DELETE
  ======================================================= */

  function handleBulkDelete() {
    if (
      selectedIds.size ===
        0 ||
      isDeleting ||
      analyzing
    ) {
      return;
    }

    const leadIds =
      Array.from(
        selectedIds
      );

    setBulkMessage(
      null
    );

    startDeleteTransition(
      async () => {
        try {
          const result =
            await bulkDeleteLeads(
              leadIds
            );

          if (
            !result.success
          ) {
            setBulkMessage(
              result.error
            );

            return;
          }

          setSelectedIds(
            new Set()
          );

          setDeleteDialogOpen(
            false
          );

          setBulkMessage(
            result.deletedCount ===
            1
              ? text.table
                  .deletedOne
              : text.table.deletedMany.replace(
                  "{count}",
                  String(
                    result.deletedCount
                  )
                )
          );

          router.refresh();
        } catch (
          error
        ) {
          console.error(
            "Bulk delete failed:",
            error
          );

          setBulkMessage(
            text.table
              .deleteFailed
          );
        }
      }
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* SEARCH + FILTERS */}

      <div className="mt-6 flex flex-col gap-3 md:mt-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }
            placeholder={
              text.table
                .searchPlaceholder
            }
            className="pl-9"
          />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
          <button
            type="button"
            onClick={() =>
              setFiltersOpen(
                (
                  current
                ) =>
                  !current
              )
            }
            className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors sm:flex-none ${
              filtersOpen
                ? "bg-muted text-foreground"
                : "bg-background hover:bg-muted/50"
            }`}
          >
            <SlidersHorizontal className="size-4" />

            {
              text.table
                .filters
            }
          </button>

          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              onClick={
                resetFilters
              }
              className="flex-1 sm:flex-none"
            >
              {
                text.table
                  .reset
              }
            </Button>
          ) : null}
        </div>
      </div>

      {/* FILTER PANEL */}

      {filtersOpen ? (
        <div className="mt-3 grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-end">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {
                text.common
                  .status
              }
            </p>

            <select
              value={
                status
              }
              onChange={(
                event
              ) =>
                setStatus(
                  event.target
                    .value
                )
              }
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-ring sm:h-9 xl:min-w-44"
            >
              <option value="ALL">
                {
                  text.table
                    .allStatuses
                }
              </option>

              {[
                "NEW",
                "RESEARCHING",
                "QUALIFIED",
                "NOT_A_FIT",
                "DRAFT_READY",
                "CONTACTED",
                "REPLIED",
                "CALL_BOOKED",
                "PROPOSAL",
                "WON",
                "LOST",
                "DO_NOT_CONTACT",
              ].map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {getLeadStatusLabel(
                      item,
                      language
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {
                text.common
                  .priority
              }
            </p>

            <select
              value={
                priority
              }
              onChange={(
                event
              ) =>
                setPriority(
                  event.target
                    .value
                )
              }
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-ring sm:h-9 xl:min-w-44"
            >
              <option value="ALL">
                {
                  text.table
                    .allPriorities
                }
              </option>

              <option value="HIGH">
                {
                  text.common
                    .priorityHigh
                }
              </option>

              <option value="MEDIUM">
                {
                  text.common
                    .priorityMedium
                }
              </option>

              <option value="LOW">
                {
                  text.common
                    .priorityLow
                }
              </option>

              <option value="NONE">
                {
                  text.common
                    .noPriority
                }
              </option>
            </select>
          </div>
        </div>
      ) : null}

      {/* BULK ACTION BAR */}

      {selectedIds.size >
      0 ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-xs font-semibold">
              {
                selectedIds.size
              }
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium">
                {selectedIds.size ===
                1
                  ? text.table
                      .selectedOne
                  : text.table.selectedMany.replace(
                      "{count}",
                      String(
                        selectedIds.size
                      )
                    )}
              </p>

              {selectedIds.size !==
              visibleSelectedCount ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {text.table.visibleWithFilters.replace(
                    "{count}",
                    String(
                      visibleSelectedCount
                    )
                  )}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {
                    text.table
                      .chooseAction
                  }
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="ghost"
              disabled={
                analyzing ||
                isDeleting
              }
              onClick={
                clearSelection
              }
              className="gap-2"
            >
              <X className="size-4" />

              {
                text.table
                  .clear
              }
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={
                analyzing ||
                isDeleting
              }
              onClick={
                handleBulkAnalyze
              }
              className="gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />

                  {analyzeProgress
                    ? `${analyzeProgress.current}/${analyzeProgress.total}`
                    : text.table
                        .analyzing}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />

                  <span className="sm:hidden">
                    {
                      text.table
                        .analyze
                    }
                  </span>

                  <span className="hidden sm:inline">
                    {
                      text.table
                        .analyzeSelected
                    }
                  </span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={
                analyzing ||
                isDeleting
              }
              onClick={() =>
                setDeleteDialogOpen(
                  true
                )
              }
              className="col-span-2 gap-2 sm:col-span-1"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}

              <span className="sm:hidden">
                {
                  text.table
                    .delete
                }
              </span>

              <span className="hidden sm:inline">
                {
                  text.table
                    .deleteSelected
                }
              </span>
            </Button>
          </div>
        </div>
      ) : null}

      {bulkMessage ? (
        <div className="mt-3 rounded-lg border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
          {
            bulkMessage
          }
        </div>
      ) : null}

      {/* MOBILE SELECT ALL */}

      {filteredLeads.length >
      0 ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border bg-background px-4 py-3 md:hidden">
          <div className="flex items-center gap-3">
            <SelectionCheckbox
              checked={
                allVisibleSelected
              }
              indeterminate={
                someVisibleSelected
              }
              disabled={
                analyzing ||
                isDeleting
              }
              label={
                text.table
                  .selectAllVisible
              }
              onChange={
                toggleAllVisible
              }
            />

            <div>
              <p className="text-sm font-medium">
                {
                  text.table
                    .selectVisible
                }
              </p>

              <p className="text-xs text-muted-foreground">
                {
                  filteredLeads.length
                }{" "}
                {filteredLeads.length ===
                1
                  ? text.table
                      .leadSingular
                  : text.table
                      .leadPlural}
              </p>
            </div>
          </div>

          {visibleSelectedCount >
          0 ? (
            <span className="text-xs font-medium text-muted-foreground">
              {
                visibleSelectedCount
              }{" "}
              {
                text.table
                  .selected
              }
            </span>
          ) : null}
        </div>
      ) : null}

      {/* MOBILE LEAD CARDS */}

      <div className="mt-3 space-y-3 md:hidden">
        {filteredLeads.length ===
        0 ? (
          <div className="rounded-xl border bg-background px-5 py-12 text-center">
            <p className="text-sm font-medium">
              {
                text.table
                  .noMatching
              }
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {
                text.table
                  .noMatchingDescription
              }
            </p>

            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={
                  resetFilters
                }
              >
                {
                  text.table
                    .clearFilters
                }
              </Button>
            ) : null}
          </div>
        ) : (
          filteredLeads.map(
            (
              lead
            ) => {
              const selected =
                selectedIds.has(
                  lead.id
                );

              return (
                <div
                  key={
                    lead.id
                  }
                  onClick={(
                    event
                  ) =>
                    handleMobileCardClick(
                      event,
                      lead.id
                    )
                  }
                  className={`cursor-pointer overflow-hidden rounded-xl border bg-background transition-colors active:bg-muted/60 ${
                    selected
                      ? "border-foreground/25 bg-muted/30"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3 px-4 py-4">
                    <div
                      className="pt-0.5"
                      onClick={(
                        event
                      ) =>
                        event.stopPropagation()
                      }
                    >
                      <SelectionCheckbox
                        checked={
                          selected
                        }
                        disabled={
                          analyzing ||
                          isDeleting
                        }
                        label={text.table.selectCompany.replace(
                          "{company}",
                          lead.companyName
                        )}
                        onChange={() =>
                          toggleLead(
                            lead.id
                          )
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold">
                            {
                              lead.companyName
                            }
                          </p>

                          <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0" />

                            <span className="truncate">
                              {lead.location ??
                                text.common
                                  .noLocation}
                            </span>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={text.table.actionsFor.replace(
                                  "{company}",
                                  lead.companyName
                                )}
                                className="-mr-2 -mt-2 shrink-0"
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/leads/${lead.id}`
                                )
                              }
                            >
                              <Eye className="size-4" />

                              {
                                text.common
                                  .openLead
                              }
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/leads/${lead.id}/edit`
                                )
                              }
                            >
                              <Pencil className="size-4" />

                              {
                                text.common
                                  .editLead
                              }
                            </DropdownMenuItem>

                            {lead.websiteUrl ? (
                              <>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      normalizeUrl(
                                        lead.websiteUrl!
                                      ),
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  <ExternalLink className="size-4" />

                                  {
                                    text.common
                                      .visitWebsite
                                  }
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`font-medium ${statusClass(
                            lead.status
                          )}`}
                        >
                          {getLeadStatusLabel(
                            lead.status,
                            language
                          )}
                        </Badge>

                        {lead.industry ? (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                            {
                              lead.industry
                            }
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-y">
                    <div className="border-r px-4 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {
                          text.common
                            .website
                        }
                      </p>

                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-lg font-semibold">
                          {lead.websiteScore !==
                          null
                            ? lead.websiteScore
                            : "—"}
                        </span>

                        {lead.websiteScore !==
                        null ? (
                          <span className="text-xs text-muted-foreground">
                            /100
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="px-4 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {
                          text.common
                            .opportunity
                        }
                      </p>

                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-lg font-semibold">
                          {lead.opportunityScore !==
                          null
                            ? lead.opportunityScore
                            : "—"}
                        </span>

                        {lead.opportunityScore !==
                        null ? (
                          <span className="text-xs text-muted-foreground">
                            /100
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 px-4 py-4">
                    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {
                          text.common
                            .priority
                        }
                      </span>

                      <span
                        className={`truncate text-right text-xs font-medium ${priorityClass(
                          lead.priority
                        )}`}
                      >
                        {getLeadPriorityLabel(
                          lead.priority,
                          language
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {
                          text.common
                            .contact
                        }
                      </span>

                      <span className="truncate text-right text-xs">
                        {lead.contactEmail
                          ? lead.contactEmail
                          : lead.contactFormUrl
                            ? text.common
                                .contactForm
                            : text.common
                                .noEmailFound}
                      </span>
                    </div>

                    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {
                          text.table
                            .lastContact
                        }
                      </span>

                      <span className="text-right text-xs">
                        {formatDate(
                          lead.lastContactedAt,
                          language
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {
                          text.table
                            .next
                        }
                      </span>

                      <span className="truncate text-right text-xs font-medium">
                        {getNextAction(
                          lead.status,
                          language
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t bg-muted/10 px-4 py-3">
                    {lead.websiteUrl ? (
                      <a
                        href={
                          normalizeUrl(
                            lead.websiteUrl
                          )
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ExternalLink className="size-3.5 shrink-0" />

                        <span className="truncate">
                          {
                            text.common
                              .website
                          }
                        </span>
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {
                          text.common
                            .noWebsite
                        }
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/leads/${lead.id}`
                        )
                      }
                      className="text-xs font-medium text-foreground"
                    >
                      {
                        text.common
                          .openLead
                      }{" "}
                      →
                    </button>
                  </div>
                </div>
              );
            }
          )
        )}
      </div>

      {/* DESKTOP TABLE */}

      <div className="mt-4 hidden overflow-x-auto rounded-xl border bg-background md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <div className="flex items-center justify-center">
                  <SelectionCheckbox
                    checked={
                      allVisibleSelected
                    }
                    indeterminate={
                      someVisibleSelected
                    }
                    disabled={
                      filteredLeads.length ===
                        0 ||
                      analyzing ||
                      isDeleting
                    }
                    label={
                      text.table
                        .selectAllVisible
                    }
                    onChange={
                      toggleAllVisible
                    }
                  />
                </div>
              </TableHead>

              <TableHead className="min-w-52">
                {
                  text.common
                    .company
                }
              </TableHead>

              <TableHead>
                {
                  text.common
                    .industry
                }
              </TableHead>

              <TableHead>
                {
                  text.common
                    .location
                }
              </TableHead>

              <TableHead>
                {
                  text.common
                    .website
                }
              </TableHead>

              <TableHead>
                {
                  text.common
                    .opportunity
                }
              </TableHead>

              <TableHead>
                {
                  text.common
                    .contact
                }
              </TableHead>

              <TableHead>
                {
                  text.common
                    .status
                }
              </TableHead>

              <TableHead>
                {
                  text.common
                    .priority
                }
              </TableHead>

              <TableHead>
                {
                  text.table
                    .lastContact
                }
              </TableHead>

              <TableHead className="min-w-36">
                {
                  text.table
                    .nextAction
                }
              </TableHead>

              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredLeads.length ===
            0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    12
                  }
                  className="h-44 text-center"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {
                        text.table
                          .noMatching
                      }
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {
                        text.table
                          .noMatchingDescription
                      }
                    </p>

                    {hasActiveFilters ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-4"
                        onClick={
                          resetFilters
                        }
                      >
                        {
                          text.table
                            .clearFilters
                        }
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map(
                (
                  lead
                ) => {
                  const selected =
                    selectedIds.has(
                      lead.id
                    );

                  return (
                    <TableRow
                      key={
                        lead.id
                      }
                      className={
                        selected
                          ? "bg-muted/35"
                          : undefined
                      }
                    >
                      <TableCell className="w-12">
                        <div className="flex items-center justify-center">
                          <SelectionCheckbox
                            checked={
                              selected
                            }
                            disabled={
                              analyzing ||
                              isDeleting
                            }
                            label={text.table.selectCompany.replace(
                              "{company}",
                              lead.companyName
                            )}
                            onChange={() =>
                              toggleLead(
                                lead.id
                              )
                            }
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/leads/${lead.id}`
                              )
                            }
                            className="cursor-pointer text-left font-medium transition-colors hover:text-muted-foreground hover:underline"
                          >
                            {
                              lead.companyName
                            }
                          </button>

                          {lead.websiteUrl ? (
                            <a
                              href={
                                normalizeUrl(
                                  lead.websiteUrl
                                )
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {
                                text.common
                                  .website
                              }

                              <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {
                                text.common
                                  .noWebsite
                              }
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {lead.industry ??
                          "—"}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {lead.location ??
                          "—"}
                      </TableCell>

                      <TableCell>
                        {lead.websiteScore !==
                        null ? (
                          <>
                            {
                              lead.websiteScore
                            }

                            <span className="text-muted-foreground">
                              /100
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {lead.opportunityScore !==
                        null ? (
                          <>
                            {
                              lead.opportunityScore
                            }

                            <span className="text-muted-foreground">
                              /100
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {lead.contactEmail
                          ? lead.contactEmail
                          : lead.contactFormUrl
                            ? text.common
                                .contactForm
                            : text.common
                                .noEmailFound}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`whitespace-nowrap font-medium ${statusClass(
                            lead.status
                          )}`}
                        >
                          {getLeadStatusLabel(
                            lead.status,
                            language
                          )}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {getLeadPriorityLabel(
                          lead.priority,
                          language
                        )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(
                          lead.lastContactedAt,
                          language
                        )}
                      </TableCell>

                      <TableCell>
                        {getNextAction(
                          lead.status,
                          language
                        )}
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={text.table.actionsFor.replace(
                                  "{company}",
                                  lead.companyName
                                )}
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/leads/${lead.id}`
                                )
                              }
                            >
                              <Eye className="size-4" />

                              {
                                text.common
                                  .openLead
                              }
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/leads/${lead.id}/edit`
                                )
                              }
                            >
                              <Pencil className="size-4" />

                              {
                                text.common
                                  .editLead
                              }
                            </DropdownMenuItem>

                            {lead.websiteUrl ? (
                              <>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      normalizeUrl(
                                        lead.websiteUrl!
                                      ),
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  <ExternalLink className="size-4" />

                                  {
                                    text.common
                                      .visitWebsite
                                  }
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                }
              )
            )}
          </TableBody>
        </Table>
      </div>

      {/* FOOTER */}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {
            filteredLeads.length
          }{" "}
          {filteredLeads.length ===
          1
            ? text.table
                .leadSingular
            : text.table
                .leadPlural}

          {filteredLeads.length !==
          leads.length
            ? ` ${text.table.of} ${leads.length}`
            : ""}
        </span>

        <span>
          Supabase
        </span>
      </div>

      {/* DELETE CONFIRMATION */}

      <AlertDialog
        open={
          deleteDialogOpen
        }
        onOpenChange={
          setDeleteDialogOpen
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedIds.size ===
              1
                ? text.table
                    .deleteDialogTitleOne
                : text.table.deleteDialogTitleMany.replace(
                    "{count}",
                    String(
                      selectedIds.size
                    )
                  )}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {
                text.table
                  .deleteDialogDescription
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                isDeleting
              }
            >
              {
                text.common
                  .cancel
              }
            </AlertDialogCancel>

            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={
                isDeleting
              }
              onClick={
                handleBulkDelete
              }
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />

                  {
                    text.table
                      .deleting
                  }
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />

                  {
                    text.table
                      .deleteLeads
                  }
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}