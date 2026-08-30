"use client";

import Link from "next/link";

import {
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
  CalendarClock,
  CalendarX2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Folder,
  FolderOpen,
  LayoutList,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Trash2,
  WandSparkles,
  X,
  MailPlus,
} from "lucide-react";


import {
  analyzeLeadWebsite,
} from "./analysis-actions";

import {
  cancelScheduledOutreachForBulk,
  generateLeadOutreachDraftForBulk,
  scheduleLeadOutreachForBulk,
} from "./outreach-actions";

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
  getLeadPriorityLabel,
  getLeadStatusLabel,
  leadsCopy,
} from "@/lib/leads-i18n";

/* =========================================================
   TYPES
========================================================= */

export type LeadTableRow = {
  id:
    string;

  companyName:
    string;

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

  status:
    string;

  priority:
    | string
    | null;

  analysisStatus:
    | string
    | null;

  lastContactedAt:
    | string
    | null;

  campaignId:
    | string
    | null;

  campaignName:
    | string
    | null;
};

type Progress = {
  current:
    number;

  total:
    number;
};

type ViewMode =
  | "compact"
  | "table";

type DesignResponse = {
  ok?:
    boolean;

  generated?:
    boolean;

  error?:
    string;
};

/* =========================================================
   STATUS
========================================================= */

function statusClass(
  status:
    string
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

    default:
      return "text-muted-foreground";
  }
}

/* =========================================================
   DATE
========================================================= */

function formatDate(
  value:
    | string
    | null,
  language:
    string
) {
  if (
    !value
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
    }
  ).format(
    new Date(
      value
    )
  );
}

/* =========================================================
   URL
========================================================= */

function normalizeUrl(
  value:
    string
) {
  return value.startsWith(
    "http"
  )
    ? value
    : `https://${value}`;
}

function getDefaultScheduledSendValue() {
  const date =
    new Date();

  date.setDate(
    date.getDate() +
      1
  );

  date.setHours(
    9,
    0,
    0,
    0
  );

  const pad =
    (value: number) =>
      String(
        value
      ).padStart(
        2,
        "0"
      );

  return `${date.getFullYear()}-${pad(
    date.getMonth() +
      1
  )}-${pad(
    date.getDate()
  )}T${pad(
    date.getHours()
  )}:${pad(
    date.getMinutes()
  )}`;
}

/* =========================================================
   CHECKBOX
========================================================= */

function SelectionCheckbox({
  checked,
  indeterminate =
    false,
  disabled =
    false,
  label,
  onChange,
}: {
  checked:
    boolean;

  indeterminate?:
    boolean;

  disabled?:
    boolean;

  label:
    string;

  onChange:
    () => void;
}) {
  const ref =
    useRef<HTMLInputElement>(
      null
    );

  useEffect(
    () => {
      if (
        ref.current
      ) {
        ref.current.indeterminate =
          indeterminate;
      }
    },
    [
      indeterminate,
    ]
  );

  return (
    <input
      ref={
        ref
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
   COMPONENT
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

  const ui =
    language ===
    "de"
      ? {
          compact:
            "Kompakt",

          table:
            "Tabelle",

          uncategorized:
            "Ohne Kampagne",

          generateDesigns:
            "Designs erstellen",

          generating:
            "Designs werden erstellt",

          noDesignEligible:
            "Keiner der ausgewählten Leads kann aktuell designt werden. Die Website muss zuerst vollständig analysiert sein.",

          designsFinished:
            "Design-Erstellung abgeschlossen",

          created:
            "neu erstellt",

          existing:
            "bereits vorhanden",

          skipped:
            "übersprungen",

          failed:
            "fehlgeschlagen",

          analyzed:
            "Analysiert",

          notAnalyzed:
            "Nicht analysiert",

          campaign:
            "Kampagne",

          scores:
            "Scores",

          contact:
            "Kontakt",

          open:
            "Öffnen",

          leads:
            "Leads",
        }
      : {
          compact:
            "Compact",

          table:
            "Table",

          uncategorized:
            "No campaign",

          generateDesigns:
            "Generate designs",

          generating:
            "Generating designs",

          noDesignEligible:
            "None of the selected leads can currently be designed. The website must be fully analyzed first.",

          designsFinished:
            "Design generation complete",

          created:
            "created",

          existing:
            "already existed",

          skipped:
            "skipped",

          failed:
            "failed",

          analyzed:
            "Analyzed",

          notAnalyzed:
            "Not analyzed",

          campaign:
            "Campaign",

          scores:
            "Scores",

          contact:
            "Contact",

          open:
            "Open",

          leads:
            "Leads",
        };

  /* =======================================================
     VIEW
  ======================================================= */

  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      "compact"
    );

  useEffect(
    () => {
      const stored =
        window.localStorage.getItem(
          "leadbase-leads-view"
        );

      if (
        stored ===
          "compact" ||
        stored ===
          "table"
      ) {
        setViewMode(
          stored
        );
      }
    },
    []
  );

  function changeView(
    value:
      ViewMode
  ) {
    setViewMode(
      value
    );

    window.localStorage.setItem(
      "leadbase-leads-view",
      value
    );
  }

  /* =======================================================
     FILTER
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
              lead.campaignName
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
     CAMPAIGN GROUPS
  ======================================================= */

  const groups =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            {
              key:
                string;

              name:
                string;

              leads:
                LeadTableRow[];
            }
          >();

        for (
          const lead of
            filteredLeads
        ) {
          const key =
            lead.campaignId ??
            "__none__";

          const existing =
            map.get(
              key
            );

          if (
            existing
          ) {
            existing.leads.push(
              lead
            );

            continue;
          }

          map.set(
            key,
            {
              key,

              name:
                lead.campaignName ??
                ui.uncategorized,

              leads:
                [
                  lead,
                ],
            }
          );
        }

        return Array.from(
          map.values()
        );
      },
      [
        filteredLeads,
        ui.uncategorized,
      ]
    );

  const [
    collapsedGroups,
    setCollapsedGroups,
  ] =
    useState<
      Set<string>
    >(
      () =>
        new Set()
    );

  function toggleGroupOpen(
    key:
      string
  ) {
    setCollapsedGroups(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(
            key
          )
        ) {
          next.delete(
            key
          );
        } else {
          next.add(
            key
          );
        }

        return next;
      }
    );
  }

  /* =======================================================
     SELECTION
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

  function toggleLead(
    leadId:
      string
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

  const filteredIds =
    filteredLeads.map(
      (
        lead
      ) =>
        lead.id
    );

  const visibleSelected =
    filteredIds.filter(
      (
        id
      ) =>
        selectedIds.has(
          id
        )
    ).length;

  const allVisibleSelected =
    filteredIds.length >
      0 &&
    visibleSelected ===
      filteredIds.length;

  const someVisibleSelected =
    visibleSelected >
      0 &&
    !allVisibleSelected;

  function toggleAllVisible() {
    setSelectedIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        for (
          const id of
            filteredIds
        ) {
          if (
            allVisibleSelected
          ) {
            next.delete(
              id
            );
          } else {
            next.add(
              id
            );
          }
        }

        return next;
      }
    );
  }

  function toggleCampaignSelection(
    campaignLeads:
      LeadTableRow[]
  ) {
    const ids =
      campaignLeads.map(
        (
          lead
        ) =>
          lead.id
      );

    const allSelected =
      ids.every(
        (
          id
        ) =>
          selectedIds.has(
            id
          )
      );

    setSelectedIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        for (
          const id of
            ids
        ) {
          if (
            allSelected
          ) {
            next.delete(
              id
            );
          } else {
            next.add(
              id
            );
          }
        }

        return next;
      }
    );
  }

  function clearSelection() {
    setSelectedIds(
      new Set()
    );

    setBulkMessage(
      null
    );
  }

  /* =======================================================
     BULK STATE
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
    useState<Progress | null>(
      null
    );


  const [
    designing,
    setDesigning,
  ] =
    useState(
      false
    );

  const [
    designProgress,
    setDesignProgress,
  ] =
    useState<Progress | null>(
      null
    );

  const [
    drafting,
    setDrafting,
  ] =
    useState(
      false
    );

  const [
    draftProgress,
    setDraftProgress,
  ] =
    useState<Progress | null>(
      null
    );


  const [
    scheduling,
    setScheduling,
  ] =
    useState(
      false
    );

  const [
    scheduleProgress,
    setScheduleProgress,
  ] =
    useState<Progress | null>(
      null
    );

  const [
    scheduleValue,
    setScheduleValue,
  ] =
    useState(
      getDefaultScheduledSendValue
    );

  const [
    cancellingSchedules,
    setCancellingSchedules,
  ] =
    useState(
      false
    );

  const [
    bulkMessage,
    setBulkMessage,
  ] =
    useState<
      string
      | null
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

  const busy =
    analyzing ||
    designing ||
    drafting ||
    scheduling ||
    cancellingSchedules ||
    isDeleting;

  /* =======================================================
     BULK ANALYZE
  ======================================================= */

  async function handleBulkAnalyze() {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    const ids =
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
        ids.length,
    });

    try {
      for (
        let index =
          0;
        index <
          ids.length;
        index +=
          1
      ) {
        const formData =
          new FormData();

        formData.set(
          "leadId",
          ids[
            index
          ]
        );

        await analyzeLeadWebsite(
          formData
        );

        setAnalyzeProgress({
          current:
            index +
            1,

          total:
            ids.length,
        });
      }

      setBulkMessage(
        ids.length ===
          1
          ? text.table
              .analysisOneFinished
          : text.table.analysisManyFinished.replace(
              "{count}",
              String(
                ids.length
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
     BULK DESIGN
  ======================================================= */

  async function handleBulkDesign() {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    const selectedLeads =
      leads.filter(
        (
          lead
        ) =>
          selectedIds.has(
            lead.id
          )
      );

    const eligible =
      selectedLeads.filter(
        (
          lead
        ) =>
          lead.analysisStatus ===
            "COMPLETED" &&
          Boolean(
            lead.websiteUrl
          )
      );

    const skippedCount =
      selectedLeads.length -
      eligible.length;

    if (
      eligible.length ===
        0
    ) {
      setBulkMessage(
        ui.noDesignEligible
      );

      return;
    }

    setDesigning(
      true
    );

    setBulkMessage(
      null
    );

    setDesignProgress({
      current:
        0,

      total:
        eligible.length,
    });

    let createdCount =
      0;

    let existingCount =
      0;

    let failedCount =
      0;

    try {
      for (
        let index =
          0;
        index <
          eligible.length;
        index +=
          1
      ) {
        const lead =
          eligible[
            index
          ];

        try {
          const response =
            await fetch(
              `/api/leads/${encodeURIComponent(
                lead.id
              )}/redesign-v2`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    regenerate:
                      false,
                  }),
              }
            );

          const result =
            (
              await response.json()
            ) as
              DesignResponse;

          if (
            !response.ok ||
            result.ok ===
              false
          ) {
            failedCount +=
              1;

            console.error(
              `Design generation failed for ${lead.companyName}:`,
              result.error
            );
          } else if (
            result.generated ===
              false
          ) {
            existingCount +=
              1;
          } else {
            createdCount +=
              1;
          }
        } catch (
          error
        ) {
          failedCount +=
            1;

          console.error(
            `Design generation failed for ${lead.companyName}:`,
            error
          );
        }

        setDesignProgress({
          current:
            index +
            1,

          total:
            eligible.length,
        });
      }

      const parts =
        [
          `${createdCount} ${ui.created}`,

          existingCount >
            0
            ? `${existingCount} ${ui.existing}`
            : null,

          skippedCount >
            0
            ? `${skippedCount} ${ui.skipped}`
            : null,

          failedCount >
            0
            ? `${failedCount} ${ui.failed}`
            : null,
        ].filter(
          Boolean
        );

      setBulkMessage(
        `${ui.designsFinished}: ${parts.join(
          " · "
        )}`
      );

      setSelectedIds(
        new Set()
      );

      router.refresh();
    } finally {
      setDesigning(
        false
      );

      setDesignProgress(
        null
      );
    }
  }

  /* =======================================================
     BULK OUTREACH DRAFTS
  ======================================================= */

  async function handleBulkDrafts() {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    const ids =
      Array.from(
        selectedIds
      );

    setDrafting(
      true
    );

    setBulkMessage(
      null
    );

    setDraftProgress({
      current:
        0,

      total:
        ids.length,
    });

    let createdCount =
      0;

    let skippedCount =
      0;

    let failedCount =
      0;

    try {
      for (
        let index =
          0;
        index <
          ids.length;
        index +=
          1
      ) {
        const leadId =
          ids[
            index
          ];

        try {
          const result =
            await generateLeadOutreachDraftForBulk(
              leadId
            );

          if (
            !result.success
          ) {
            failedCount +=
              1;
          } else if (
            result.status ===
              "created"
          ) {
            createdCount +=
              1;
          } else {
            skippedCount +=
              1;
          }
        } catch (
          error
        ) {
          console.error(
            `Bulk draft generation failed for ${leadId}:`,
            error
          );

          failedCount +=
            1;
        }

        setDraftProgress({
          current:
            index +
            1,

          total:
            ids.length,
        });
      }

      const parts =
        [
          `${createdCount} Drafts erstellt`,

          skippedCount >
            0
            ? `${skippedCount} übersprungen`
            : null,

          failedCount >
            0
            ? `${failedCount} fehlgeschlagen`
            : null,
        ].filter(
          Boolean
        );

      setBulkMessage(
        parts.join(
          " · "
        )
      );

      setSelectedIds(
        new Set()
      );

      router.refresh();
    } finally {
      setDrafting(
        false
      );

      setDraftProgress(
        null
      );
    }
  }

  /* =======================================================
     BULK SCHEDULE OUTREACH
  ======================================================= */

  async function handleBulkScheduleOutreach() {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    const localDate =
      new Date(
        scheduleValue
      );

    if (
      !scheduleValue ||
      !Number.isFinite(
        localDate.getTime()
      ) ||
      localDate.getTime() <=
        Date.now() +
          30_000
    ) {
      setBulkMessage(
        language ===
          "de"
          ? "Bitte wähle eine zukünftige Sendezeit."
          : "Please choose a future send time."
      );

      return;
    }

    const ids =
      Array.from(
        selectedIds
      );

    const scheduledForIso =
      localDate.toISOString();

    setScheduling(
      true
    );

    setBulkMessage(
      null
    );

    setScheduleProgress({
      current:
        0,
      total:
        ids.length,
    });

    let scheduledCount =
      0;

    let skippedCount =
      0;

    let failedCount =
      0;

    try {
      for (
        let index =
          0;
        index <
          ids.length;
        index +=
          1
      ) {
        const leadId =
          ids[
            index
          ];

        try {
          const result =
            await scheduleLeadOutreachForBulk(
              leadId,
              scheduledForIso
            );

          if (
            !result.success
          ) {
            failedCount +=
              1;

            console.error(
              `Could not schedule outreach for ${leadId}:`,
              result.error
            );
          } else if (
            result.status ===
              "scheduled"
          ) {
            scheduledCount +=
              1;
          } else {
            skippedCount +=
              1;
          }
        } catch (
          error
        ) {
          failedCount +=
            1;

          console.error(
            `Could not schedule outreach for ${leadId}:`,
            error
          );
        }

        setScheduleProgress({
          current:
            index +
            1,
          total:
            ids.length,
        });
      }

      const formattedTime =
        new Intl.DateTimeFormat(
          language ===
            "de"
            ? "de-DE"
            : "en-IE",
          {
            weekday:
              "short",
            day:
              "2-digit",
            month:
              "2-digit",
            hour:
              "2-digit",
            minute:
              "2-digit",
          }
        ).format(
          localDate
        );

      const parts =
        [
          language ===
            "de"
            ? `${scheduledCount} geplant für ${formattedTime}`
            : `${scheduledCount} scheduled for ${formattedTime}`,

          skippedCount >
            0
            ? language ===
                "de"
              ? `${skippedCount} übersprungen`
              : `${skippedCount} skipped`
            : null,

          failedCount >
            0
            ? language ===
                "de"
              ? `${failedCount} fehlgeschlagen`
              : `${failedCount} failed`
            : null,
        ].filter(
          Boolean
        );

      setBulkMessage(
        parts.join(
          " · "
        )
      );

      setSelectedIds(
        new Set()
      );

      router.refresh();
    } finally {
      setScheduling(
        false
      );

      setScheduleProgress(
        null
      );
    }
  }

  async function handleBulkCancelScheduledOutreach() {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    const ids =
      Array.from(
        selectedIds
      );

    setCancellingSchedules(
      true
    );

    setBulkMessage(
      null
    );

    let cancelledCount =
      0;

    let failedCount =
      0;

    try {
      for (
        const leadId of
          ids
      ) {
        try {
          const result =
            await cancelScheduledOutreachForBulk(
              leadId
            );

          if (
            !result.success
          ) {
            failedCount +=
              1;
          } else {
            cancelledCount +=
              result.cancelled;
          }
        } catch (
          error
        ) {
          failedCount +=
            1;

          console.error(
            `Could not cancel scheduled outreach for ${leadId}:`,
            error
          );
        }
      }

      setBulkMessage(
        language ===
          "de"
          ? `${cancelledCount} geplante Sendungen gestoppt${
              failedCount >
                0
                ? ` · ${failedCount} fehlgeschlagen`
                : ""
            }`
          : `${cancelledCount} scheduled sends cancelled${
              failedCount >
                0
                ? ` · ${failedCount} failed`
                : ""
            }`
      );

      setSelectedIds(
        new Set()
      );

      router.refresh();
    } finally {
      setCancellingSchedules(
        false
      );
    }
  }

  /* =======================================================
     BULK DELETE
  ======================================================= */

  function handleBulkDelete() {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    const ids =
      Array.from(
        selectedIds
      );

    startDeleteTransition(
      async () => {
        try {
          const result =
            await bulkDeleteLeads(
              ids
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
     LEAD ACTION MENU
  ======================================================= */

  function LeadActions({
    lead,
  }: {
    lead:
      LeadTableRow;
  }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${lead.companyName}`}
              className="size-8"
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
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* ===================================================
          CONTROLS
      =================================================== */}

      <div className="mt-6 flex flex-col gap-3 md:mt-8 lg:flex-row lg:items-center lg:justify-between">
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

        <div className="flex flex-wrap items-center gap-2">
          {/* VIEW MODE */}

          <div className="inline-flex rounded-lg border bg-background p-1">
            <button
              type="button"
              onClick={() =>
                changeView(
                  "compact"
                )
              }
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                viewMode ===
                "compact"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="size-3.5" />

              {
                ui.compact
              }
            </button>

            <button
              type="button"
              onClick={() =>
                changeView(
                  "table"
                )
              }
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                viewMode ===
                "table"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Table2 className="size-3.5" />

              {
                ui.table
              }
            </button>
          </div>

          <Link
            href="/scheduled"
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            <CalendarClock className="size-4" />

            {language ===
              "de"
              ? "Geplante Mails"
              : "Scheduled emails"}
          </Link>

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
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted/50"
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
            >
              {
                text.table
                  .reset
              }
            </Button>
          ) : null}
        </div>
      </div>

      {/* ===================================================
          FILTER PANEL
      =================================================== */}

      {filtersOpen ? (
        <div className="mt-3 grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
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
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
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
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
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

      {/* ===================================================
          BULK BAR
      =================================================== */}

      {selectedIds.size >
      0 ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg border bg-background text-xs font-semibold">
              {
                selectedIds.size
              }
            </div>

            <div>
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

              <p className="text-xs text-muted-foreground">
                {
                  text.table
                    .chooseAction
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={
                busy
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
                busy
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

                  {
                    text.table
                      .analyzeSelected
                  }
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={
                busy
              }
              onClick={
                handleBulkDesign
              }
              className="gap-2"
            >
              {designing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />

                  {designProgress
                    ? `${designProgress.current}/${designProgress.total}`
                    : ui.generating}
                </>
              ) : (
                <>
                  <WandSparkles className="size-4" />

                  {
                    ui.generateDesigns
                  }
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={
                busy
              }
              onClick={
                handleBulkDrafts
              }
              className="gap-2"
            >
              {drafting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />

                  {draftProgress
                    ? `${draftProgress.current}/${draftProgress.total}`
                    : "Drafts werden erstellt"}
                </>
              ) : (
                <>
                  <MailPlus className="size-4" />

                  Drafts erstellen
                </>
              )}
            </Button>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-1.5">
              <Input
                type="datetime-local"
                value={
                  scheduleValue
                }
                onChange={(
                  event
                ) =>
                  setScheduleValue(
                    event.target.value
                  )
                }
                disabled={
                  busy
                }
                aria-label={
                  language ===
                    "de"
                    ? "Sendezeit"
                    : "Send time"
                }
                className="h-8 w-[190px] border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
              />

              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={
                  busy
                }
                onClick={
                  handleBulkScheduleOutreach
                }
                className="gap-2"
              >
                {scheduling ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />

                    {scheduleProgress
                      ? `${scheduleProgress.current}/${scheduleProgress.total}`
                      : language ===
                          "de"
                        ? "Plane..."
                        : "Scheduling..."}
                  </>
                ) : (
                  <>
                    <CalendarClock className="size-4" />

                    {language ===
                      "de"
                      ? "Später senden"
                      : "Send later"}
                  </>
                )}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={
                  busy
                }
                onClick={
                  handleBulkCancelScheduledOutreach
                }
                className="gap-2"
                title={
                  language ===
                    "de"
                    ? "Geplanten Outreach für die Auswahl stoppen"
                    : "Cancel scheduled outreach for selection"
                }
              >
                {cancellingSchedules ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CalendarX2 className="size-4" />
                )}

                {language ===
                  "de"
                  ? "Versand stoppen"
                  : "Cancel send"}
              </Button>
            </div>

            <Button
              type="button"
              variant="destructive"
              disabled={
                busy
              }
              onClick={() =>
                setDeleteDialogOpen(
                  true
                )
              }
              className="gap-2"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}

              {
                text.table
                  .deleteSelected
              }
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




      {/* ===================================================
          SELECT ALL
      =================================================== */}

      {filteredLeads.length >
      0 ? (
        <div className="mt-4 flex items-center gap-3 px-1 text-xs text-muted-foreground">
          <SelectionCheckbox
            checked={
              allVisibleSelected
            }
            indeterminate={
              someVisibleSelected
            }
            disabled={
              busy
            }
            label={
              text.table
                .selectAllVisible
            }
            onChange={
              toggleAllVisible
            }
          />

          <span>
            {
              filteredLeads.length
            }{" "}
            {
              ui.leads
            }
          </span>
        </div>
      ) : null}

      {/* ===================================================
          COMPACT VIEW
      =================================================== */}

      {viewMode ===
      "compact" ? (
        <div className="mt-3 space-y-3">
          {groups.map(
            (
              group
            ) => {
              const collapsed =
                collapsedGroups.has(
                  group.key
                );

              const groupSelectedCount =
                group.leads.filter(
                  (
                    lead
                  ) =>
                    selectedIds.has(
                      lead.id
                    )
                ).length;

              const allGroupSelected =
                group.leads.length >
                  0 &&
                groupSelectedCount ===
                  group.leads.length;

              const someGroupSelected =
                groupSelectedCount >
                  0 &&
                !allGroupSelected;

              return (
                <div
                  key={
                    group.key
                  }
                  className="overflow-hidden rounded-xl border bg-background"
                >
                  {/* CAMPAIGN HEADER */}

                  <div className="flex items-center gap-3 border-b bg-muted/20 px-3 py-2.5 sm:px-4">
                    <SelectionCheckbox
                      checked={
                        allGroupSelected
                      }
                      indeterminate={
                        someGroupSelected
                      }
                      disabled={
                        busy
                      }
                      label={`Select ${group.name}`}
                      onChange={() =>
                        toggleCampaignSelection(
                          group.leads
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        toggleGroupOpen(
                          group.key
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      {collapsed ? (
                        <Folder className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                      )}

                      <span className="truncate text-sm font-semibold">
                        {
                          group.name
                        }
                      </span>

                      <span className="shrink-0 rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {
                          group.leads.length
                        }
                      </span>

                      <span className="ml-auto">
                        {collapsed ? (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </span>
                    </button>
                  </div>

                  {!collapsed ? (
                    <div className="divide-y">
                      {group.leads.map(
                        (
                          lead
                        ) => {
                          const selected =
                            selectedIds.has(
                              lead.id
                            );

                          const analyzed =
                            lead.analysisStatus ===
                            "COMPLETED";

                          return (
                            <div
                              key={
                                lead.id
                              }
                              className={`flex flex-col gap-3 px-3 py-3 transition-colors hover:bg-muted/20 sm:px-4 lg:flex-row lg:items-center ${
                                selected
                                  ? "bg-muted/30"
                                  : ""
                              }`}
                            >
                              <div className="flex min-w-0 items-start gap-3 lg:flex-[1.4]">
                                <div className="pt-1">
                                  <SelectionCheckbox
                                    checked={
                                      selected
                                    }
                                    disabled={
                                      busy
                                    }
                                    label={`Select ${lead.companyName}`}
                                    onChange={() =>
                                      toggleLead(
                                        lead.id
                                      )
                                    }
                                  />
                                </div>

                                <Link
  href={`/leads/${lead.id}`}
  className="min-w-0 text-left"
>
  <p className="truncate text-sm font-semibold hover:underline">
    {
      lead.companyName
    }
  </p>

  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
    {lead.location ? (
      <span className="inline-flex min-w-0 items-center gap-1">
        <MapPin className="size-3 shrink-0" />

        <span className="truncate">
          {
            lead.location
          }
        </span>
      </span>
    ) : null}

    {lead.industry ? (
      <span className="truncate">
        {
          lead.industry
        }
      </span>
    ) : null}
  </div>
</Link>
                              </div>

                              {/* SCORES */}

                              <div className="flex shrink-0 items-center gap-4 lg:w-[150px]">
                                <div>
                                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                                    Web
                                  </p>

                                  <p className="text-sm font-semibold">
                                    {lead.websiteScore ??
                                      "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
                                    Opp.
                                  </p>

                                  <p className="text-sm font-semibold">
                                    {lead.opportunityScore ??
                                      "—"}
                                  </p>
                                </div>
                              </div>

                              {/* ANALYSIS */}

                              <div className="shrink-0 lg:w-[115px]">
                                <div
                                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                                    analyzed
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${
                                      analyzed
                                        ? "bg-emerald-500"
                                        : "bg-muted-foreground/40"
                                    }`}
                                  />

                                  {analyzed
                                    ? ui.analyzed
                                    : ui.notAnalyzed}
                                </div>
                              </div>

                              {/* STATUS */}

                              <div className="shrink-0 lg:w-[125px]">
                                <Badge
                                  variant="outline"
                                  className={`whitespace-nowrap text-[10px] ${statusClass(
                                    lead.status
                                  )}`}
                                >
                                  {getLeadStatusLabel(
                                    lead.status,
                                    language
                                  )}
                                </Badge>
                              </div>

                              {/* PRIORITY */}

                              <div className="shrink-0 lg:w-[80px]">
                                <span
                                  className={`text-[11px] font-medium ${priorityClass(
                                    lead.priority
                                  )}`}
                                >
                                  {getLeadPriorityLabel(
                                    lead.priority,
                                    language
                                  )}
                                </span>
                              </div>

                              {/* CONTACT */}

                              <div className="min-w-0 lg:w-[180px]">
                                {lead.contactEmail ? (
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="size-3 shrink-0 text-muted-foreground" />

                                    <span className="truncate text-[11px] text-muted-foreground">
                                      {
                                        lead.contactEmail
                                      }
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">
                                    {lead.contactFormUrl
                                      ? text.common
                                          .contactForm
                                      : text.common
                                          .noEmailFound}
                                  </span>
                                )}
                              </div>

                              {/* DATE */}

                              <div className="shrink-0 lg:w-[70px]">
                                <span className="text-[11px] text-muted-foreground">
                                  {formatDate(
                                    lead.lastContactedAt,
                                    language
                                  )}
                                </span>
                              </div>

                              <div className="ml-auto shrink-0">
                                <LeadActions
                                  lead={
                                    lead
                                  }
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : null}
                </div>
              );
            }
          )}

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
          ) : null}
        </div>
      ) : null}

      {/* ===================================================
          TABLE VIEW
      =================================================== */}

      {viewMode ===
      "table" ? (
        <div className="mt-3 overflow-x-auto rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <SelectionCheckbox
                    checked={
                      allVisibleSelected
                    }
                    indeterminate={
                      someVisibleSelected
                    }
                    disabled={
                      busy
                    }
                    label={
                      text.table
                        .selectAllVisible
                    }
                    onChange={
                      toggleAllVisible
                    }
                  />
                </TableHead>

                <TableHead>
                  {
                    text.common
                      .company
                  }
                </TableHead>

                <TableHead>
                  {
                    ui.campaign
                  }
                </TableHead>

                <TableHead>
                  {
                    ui.scores
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
                    ui.contact
                  }
                </TableHead>

                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredLeads.map(
                (
                  lead
                ) => (
                  <TableRow
                    key={
                      lead.id
                    }
                    className={
                      selectedIds.has(
                        lead.id
                      )
                        ? "bg-muted/30"
                        : undefined
                    }
                  >
                    <TableCell>
                      <SelectionCheckbox
                        checked={
                          selectedIds.has(
                            lead.id
                          )
                        }
                        disabled={
                          busy
                        }
                        label={`Select ${lead.companyName}`}
                        onChange={() =>
                          toggleLead(
                            lead.id
                          )
                        }
                      />
                    </TableCell>

                    <TableCell>
                    <Link
  href={`/leads/${lead.id}`}
  className="text-left font-medium hover:underline"
>
  {
    lead.companyName
  }
</Link>

                      <p className="mt-0.5 max-w-[260px] truncate text-xs text-muted-foreground">
                        {lead.location ??
                          "—"}
                      </p>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {lead.campaignName ??
                        ui.uncategorized}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-xs">
                      <span className="font-semibold">
                        {lead.websiteScore ??
                          "—"}
                      </span>

                      <span className="mx-1.5 text-muted-foreground">
                        /
                      </span>

                      <span className="font-semibold">
                        {lead.opportunityScore ??
                          "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`whitespace-nowrap text-[10px] ${statusClass(
                          lead.status
                        )}`}
                      >
                        {getLeadStatusLabel(
                          lead.status,
                          language
                        )}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`text-xs font-medium ${priorityClass(
                          lead.priority
                        )}`}
                      >
                        {getLeadPriorityLabel(
                          lead.priority,
                          language
                        )}
                      </span>
                    </TableCell>

                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {lead.contactEmail ??
                        (
                          lead.contactFormUrl
                            ? text.common
                                .contactForm
                            : text.common
                                .noEmailFound
                        )}
                    </TableCell>

                    <TableCell>
                      <LeadActions
                        lead={
                          lead
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              )}

              {filteredLeads.length ===
              0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      8
                    }
                    className="h-40 text-center text-sm text-muted-foreground"
                  >
                    {
                      text.table
                        .noMatching
                    }
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {/* ===================================================
          FOOTER
      =================================================== */}

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {
            filteredLeads.length
          }{" "}
          {
            ui.leads
          }

          {filteredLeads.length !==
          leads.length
            ? ` / ${leads.length}`
            : ""}
        </span>

        <span>
          Supabase
        </span>
      </div>

      {/* ===================================================
          DELETE DIALOG
      =================================================== */}

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