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
  ArrowDownUp,
  Command,
  CalendarX2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Folder,
  FolderOpen,
  Film,
  Megaphone,
  GripVertical,
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
  cancelScheduledOutreachForBulk,
  generateLeadOutreachDraftForBulk,
} from "./outreach-actions";

import {
  BulkOutreachScheduleDialog,
} from "./bulk-outreach-schedule-dialog";

import {
  bulkDeleteLeads,
} from "./bulk-actions";

import {
  LeadPreviewVisitsButton,
  type LeadPreviewSummary,
} from "./lead-preview-visits-button";

import {
  LeadHotScoreIndicator,
  type HotLeadSummary,
} from "./lead-hot-score-indicator";

import {
  useLanguage,
} from "@/components/language-provider";

import darkStyles from "@/components/leadbase-route-dark-polish.module.css";

import {
  useAppNotifications,
} from "@/components/app-notifications";

import {
  useAppBackgroundTasks,
} from "@/components/app-background-tasks";

import { useLeadbasePlan } from "@/hooks/use-leadbase-plan";
import { planAllowsFeature } from "@/lib/plan-entitlements";

import {
  LeadCreateDialog,
  type QuickCreateCampaignOption,
} from "@/components/quick-create-dialogs";

import {
  createClient as createBrowserSupabaseClient,
} from "@/lib/supabase/client";

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

  createdAt:
    string;

  sortOrder:
    | number
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

type ShareCreateResponse = {
  ok?:
    boolean;

  shared?:
    boolean;

  shareUrl?:
    string;

  error?:
    string;
};

type PreviewGifGenerationResponse = {
  ok?:
    boolean;

  status?:
    string;

  gifUrl?:
    string;

  error?:
    string;
};

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
  switch (status) {
    case "NEW":
    case "RESEARCHING":
    case "QUALIFIED":
    case "DRAFT_READY":
    case "CALL_BOOKED":
    case "PROPOSAL":
      return "border-transparent bg-[#EAEEFB] text-[#002BBA]";

    case "WON":
      return "border-transparent bg-[#E9F0EA] text-[#2F6B3A]";

    case "CONTACTED":
    case "REPLIED":
    case "LOST":
    case "NOT_A_FIT":
    case "DO_NOT_CONTACT":
    default:
      return "border-transparent bg-black/[0.05] text-[#6B7078]";
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
  switch (priority) {
    case "HIGH":
      return "text-[#9A5106]";

    case "MEDIUM":
      return "text-[#40454E]";

    default:
      return "text-[#6B7078]";
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
      className="size-4 cursor-pointer rounded border-[#C9CDD3] accent-[#002BBA] disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export function LeadsTable({
  leads,
  groupOrder,
  campaignOptions,
}: {
  leads:
    LeadTableRow[];

  groupOrder:
    Record<string, number>;

  campaignOptions:
    QuickCreateCampaignOption[];
}) {
  const router =
    useRouter();

  const {
    language,
  } =
    useLanguage();

  const {
    notify,
  } =
    useAppNotifications();

  const backgroundTasks =
    useAppBackgroundTasks();

  const {
    planId,
    entitlements,
    loading: planLoading,
  } = useLeadbasePlan();

  const canBulkAnalyze = planAllowsFeature(planId, "bulk_analyze");
  const canBulkOutreach = planAllowsFeature(planId, "bulk_outreach");
  const canBulkDesign = planAllowsFeature(planId, "bulk_design");
  const canBulkGif = planAllowsFeature(planId, "preview_gif");

  const {
    analysisTask,
    startBulkAnalysis,
  } =
    backgroundTasks;

  /*
   * Compatibility bridge:
   *
   * Some Leadbase revisions expose the bulk-design dock controls
   * (`startBulkDesignTask`, `updateBulkDesignTask`,
   * `finishBulkDesignTask`) while older revisions only expose
   * the analysis/background queue API.
   *
   * The actual bulk-design loop below does not depend on these
   * helpers for generation. They only mirror progress into the
   * global background-task dock, so falling back to no-ops keeps
   * the existing design flow fully functional without forcing a
   * rewrite of the user's current background-task provider.
   */
  const {
    startBulkDesignTask =
      () => {},

    updateBulkDesignTask =
      () => {},

    finishBulkDesignTask =
      () => {},
  } =
    backgroundTasks as
      typeof backgroundTasks & {
        startBulkDesignTask?: (
          total:
            number,
          currentCompany?:
            string | null
        ) => void;

        updateBulkDesignTask?: (
          current:
            number,
          currentCompany?:
            string | null
        ) => void;

        finishBulkDesignTask?:
          () => void;
      };

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

          previewViews:
            "Vorschau",

          deleteTitle:
            "Leads löschen",

          deleteDescription:
            "Möchtest du wirklich {count} ausgewählte Leads löschen? Diese Aktion kann nicht rückgängig gemacht werden.",

          cancel:
            "Abbrechen",

          confirmDelete:
            "Leads löschen",
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

          previewViews:
            "Preview",

          deleteTitle:
            "Delete leads",

          deleteDescription:
            "Are you sure you want to delete {count} selected leads? This action cannot be undone.",

          cancel:
            "Cancel",

          confirmDelete:
            "Delete leads",
        };

  /* =======================================================
     CUSTOMER PREVIEW SUMMARIES
  ======================================================= */

  const [
    previewSummaries,
    setPreviewSummaries,
  ] =
    useState<
      Record<
        string,
        LeadPreviewSummary
      >
    >(
      {}
    );

  useEffect(
    () => {
      const controller =
        new AbortController();

      async function loadPreviewSummaries() {
        try {
          const response =
            await fetch(
              "/api/leads/preview-visits-summary",
              {
                cache:
                  "no-store",

                signal:
                  controller.signal,
              }
            );

          const contentType =
            response.headers.get(
              "content-type"
            ) ??
            "";

          if (
            !response.ok ||
            !contentType.includes(
              "application/json"
            )
          ) {
            return;
          }

          const result =
            (await response.json()) as {
              ok?:
                boolean;

              previews?:
                Record<
                  string,
                  LeadPreviewSummary
                >;
            };

          if (
            !result.ok
          ) {
            return;
          }

          setPreviewSummaries(
            result.previews ??
              {}
          );
        } catch (
          loadError
        ) {
          if (
            loadError instanceof
              DOMException &&
            loadError.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Could not load preview summaries:",
            loadError
          );
        }
      }

      void loadPreviewSummaries();

      return () => {
        controller.abort();
      };
    },
    []
  );

  /* =======================================================
     HOT LEAD SCORES
  ======================================================= */

  const [
    hotLeadSummaries,
    setHotLeadSummaries,
  ] =
    useState<
      Record<
        string,
        HotLeadSummary
      >
    >(
      {}
    );

  useEffect(
    () => {
      const controller =
        new AbortController();

      async function loadHotLeadScores() {
        try {
          const response =
            await fetch(
              "/api/leads/hot-scores",
              {
                cache:
                  "no-store",

                signal:
                  controller.signal,
              }
            );

          const contentType =
            response.headers.get(
              "content-type"
            ) ??
            "";

          if (
            !response.ok ||
            !contentType.includes(
              "application/json"
            )
          ) {
            return;
          }

          const result =
            (await response.json()) as {
              ok?:
                boolean;

              leads?:
                Record<
                  string,
                  HotLeadSummary
                >;
            };

          if (
            !result.ok
          ) {
            return;
          }

          setHotLeadSummaries(
            result.leads ??
              {}
          );
        } catch (
          loadError
        ) {
          if (
            loadError instanceof
              DOMException &&
            loadError.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Could not load hot lead scores:",
            loadError
          );
        }
      }

      void loadHotLeadScores();

      return () => {
        controller.abort();
      };
    },
    []
  );

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
    quickFilter,
    setQuickFilter,
  ] = useState<
    "ALL" |
    "HOT" |
    "DRAFT_READY" |
    "CONTACTED" |
    "NO_EMAIL"
  >("ALL");

  const [
    sortByHotScore,
    setSortByHotScore,
  ] = useState(false);

  const searchInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

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

            const matchesQuick =
              quickFilter === "ALL" ||
              (quickFilter === "HOT" &&
                hotLeadSummaries[lead.id]?.level === "HOT") ||
              (quickFilter === "DRAFT_READY" &&
                lead.status === "DRAFT_READY") ||
              (quickFilter === "CONTACTED" &&
                lead.status === "CONTACTED") ||
              (quickFilter === "NO_EMAIL" &&
                !lead.contactEmail);

            return (
              matchesSearch &&
              matchesStatus &&
              matchesPriority &&
              matchesQuick
            );
          }
        );
      },
      [
        leads,
        search,
        status,
        priority,
        quickFilter,
        hotLeadSummaries,
      ]
    );

  const hasActiveFilters =
    search.trim() !==
      "" ||
    status !==
      "ALL" ||
    priority !==
      "ALL" ||
    quickFilter !==
      "ALL" ||
    sortByHotScore;

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

    setQuickFilter(
      "ALL"
    );

    setSortByHotScore(
      false
    );
  }

  /* =======================================================
     CAMPAIGN GROUPS + MANUAL ORDER
  ======================================================= */

  const [
    leadOrderOverrides,
    setLeadOrderOverrides,
  ] = useState<Record<string, number>>({});

  const [
    groupOrderState,
    setGroupOrderState,
  ] = useState<Record<string, number>>(
    groupOrder
  );

  const [
    draggedLeadId,
    setDraggedLeadId,
  ] = useState<string | null>(null);

  const [
    draggedGroupKey,
    setDraggedGroupKey,
  ] = useState<string | null>(null);

  const [
    leadDropTarget,
    setLeadDropTarget,
  ] = useState<{
    groupKey: string;
    targetId: string;
    placeAfter: boolean;
  } | null>(null);

  const [
    groupDropTarget,
    setGroupDropTarget,
  ] = useState<{
    targetKey: string;
    placeAfter: boolean;
  } | null>(null);

  const browserSupabaseRef = useRef<
    ReturnType<typeof createBrowserSupabaseClient> | null
  >(null);

  const leadSaveQueueRef = useRef<
    Record<
      string,
      {
        desired: string[];
        timer: ReturnType<typeof setTimeout> | null;
        inFlight: boolean;
      }
    >
  >({});

  const groupSaveQueueRef = useRef<{
    desired: string[];
    timer: ReturnType<typeof setTimeout> | null;
    inFlight: boolean;
  }>({
    desired: [],
    timer: null,
    inFlight: false,
  });

  function getBrowserSupabase() {
    if (!browserSupabaseRef.current) {
      browserSupabaseRef.current =
        createBrowserSupabaseClient();
    }

    return browserSupabaseRef.current;
  }

  useEffect(() => {
    setGroupOrderState(
      groupOrder
    );
  }, [groupOrder]);

  useEffect(() => {
    return () => {
      Object.values(
        leadSaveQueueRef.current
      ).forEach((entry) => {
        if (entry.timer) {
          clearTimeout(entry.timer);
        }
      });

      if (
        groupSaveQueueRef.current.timer
      ) {
        clearTimeout(
          groupSaveQueueRef.current.timer
        );
      }
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        leads: LeadTableRow[];
        initialIndex: number;
      }
    >();

    let groupIndex = 0;

    for (const lead of filteredLeads) {
      const key =
        lead.campaignId ??
        "__none__";

      const existing =
        map.get(key);

      if (existing) {
        existing.leads.push(lead);
        continue;
      }

      map.set(key, {
        key,
        name:
          lead.campaignName ??
          ui.uncategorized,
        leads: [lead],
        initialIndex:
          groupIndex++,
      });
    }

    const list =
      Array.from(map.values());

    for (const group of list) {
      group.leads.sort((a, b) => {
        if (sortByHotScore) {
          const aHot = hotLeadSummaries[a.id]?.score ?? -1;
          const bHot = hotLeadSummaries[b.id]?.score ?? -1;

          if (aHot !== bHot) {
            return bHot - aHot;
          }
        }

        const aOverride =
          leadOrderOverrides[a.id];
        const bOverride =
          leadOrderOverrides[b.id];

        const aOrder =
          aOverride ??
          a.sortOrder;
        const bOrder =
          bOverride ??
          b.sortOrder;

        if (
          aOrder !== null &&
          aOrder !== undefined &&
          bOrder !== null &&
          bOrder !== undefined &&
          aOrder !== bOrder
        ) {
          return aOrder - bOrder;
        }

        if (
          aOrder !== null &&
          aOrder !== undefined
        ) {
          return -1;
        }

        if (
          bOrder !== null &&
          bOrder !== undefined
        ) {
          return 1;
        }

        return (
          Date.parse(b.createdAt) -
          Date.parse(a.createdAt)
        );
      });
    }

    list.sort((a, b) => {
      const aOrder =
        groupOrderState[a.key];
      const bOrder =
        groupOrderState[b.key];

      if (
        aOrder !== undefined &&
        bOrder !== undefined &&
        aOrder !== bOrder
      ) {
        return aOrder - bOrder;
      }

      if (aOrder !== undefined) {
        return -1;
      }

      if (bOrder !== undefined) {
        return 1;
      }

      return (
        a.initialIndex -
        b.initialIndex
      );
    });

    return list;
  }, [
    filteredLeads,
    groupOrderState,
    leadOrderOverrides,
    ui.uncategorized,
    sortByHotScore,
    hotLeadSummaries,
  ]);

  const manualSortingEnabled =
    viewMode === "compact" &&
    !hasActiveFilters;

  async function flushLeadOrder(
    groupKey: string
  ) {
    const entry =
      leadSaveQueueRef.current[groupKey];

    if (!entry || entry.inFlight) {
      return;
    }

    entry.inFlight = true;
    const snapshot = [...entry.desired];
    const snapshotKey = snapshot.join("|");

    const { error } =
      await getBrowserSupabase().rpc(
        "reorder_leadbase_leads",
        {
          p_group_key: groupKey,
          p_lead_ids: snapshot,
        }
      );

    entry.inFlight = false;

    if (error) {
      console.error(
        "Lead reorder failed:",
        error
      );

      setLeadOrderOverrides({});
      router.refresh();

      notify({
        title:
          language === "de"
            ? "Reihenfolge nicht gespeichert"
            : "Order not saved",
        description:
          language === "de"
            ? "Die Reihenfolge konnte nicht gespeichert werden."
            : "The order could not be saved.",
        variant: "error",
      });

      return;
    }

    if (
      entry.desired.join("|") !==
      snapshotKey
    ) {
      entry.timer = setTimeout(
        () => void flushLeadOrder(groupKey),
        40
      );
    }
  }

  function persistLeadOrder(
    groupKey: string,
    leadIds: string[]
  ) {
    const nextOverrides: Record<string, number> = {};

    leadIds.forEach((id, index) => {
      nextOverrides[id] =
        (index + 1) * 1000;
    });

    setLeadOrderOverrides((current) => ({
      ...current,
      ...nextOverrides,
    }));

    const existing =
      leadSaveQueueRef.current[groupKey] ?? {
        desired: [],
        timer: null,
        inFlight: false,
      };

    existing.desired = [...leadIds];

    if (existing.timer) {
      clearTimeout(existing.timer);
    }

    existing.timer = setTimeout(
      () => void flushLeadOrder(groupKey),
      140
    );

    leadSaveQueueRef.current[groupKey] =
      existing;
  }

  function moveLeadRelative(
    groupKey: string,
    sourceId: string,
    targetId: string,
    placeAfter: boolean
  ) {
    if (
      sourceId === targetId ||
      !manualSortingEnabled
    ) {
      return;
    }

    const group = groups.find(
      (item) => item.key === groupKey
    );

    if (!group) {
      return;
    }

    const ids = group.leads.map(
      (lead) => lead.id
    );

    const sourceIndex =
      ids.indexOf(sourceId);

    if (sourceIndex < 0) {
      return;
    }

    ids.splice(sourceIndex, 1);

    const targetIndex =
      ids.indexOf(targetId);

    if (targetIndex < 0) {
      return;
    }

    ids.splice(
      targetIndex +
        (placeAfter ? 1 : 0),
      0,
      sourceId
    );

    persistLeadOrder(
      groupKey,
      ids
    );
  }

  async function flushGroupOrder() {
    const queue =
      groupSaveQueueRef.current;

    if (
      queue.inFlight ||
      queue.desired.length === 0
    ) {
      return;
    }

    queue.inFlight = true;
    const snapshot = [...queue.desired];
    const snapshotKey = snapshot.join("|");

    const { error } =
      await getBrowserSupabase().rpc(
        "reorder_leadbase_groups",
        {
          p_group_keys: snapshot,
        }
      );

    queue.inFlight = false;

    if (error) {
      console.error(
        "Lead group reorder failed:",
        error
      );

      setGroupOrderState(groupOrder);
      router.refresh();

      notify({
        title:
          language === "de"
            ? "Gruppenreihenfolge nicht gespeichert"
            : "Group order not saved",
        description:
          language === "de"
            ? "Die Gruppenreihenfolge konnte nicht gespeichert werden."
            : "The group order could not be saved.",
        variant: "error",
      });

      return;
    }

    if (
      queue.desired.join("|") !==
      snapshotKey
    ) {
      queue.timer = setTimeout(
        () => void flushGroupOrder(),
        40
      );
    }
  }

  function persistGroupOrder(
    orderedKeys: string[]
  ) {
    const next: Record<string, number> = {};

    orderedKeys.forEach((key, index) => {
      next[key] =
        (index + 1) * 1000;
    });

    setGroupOrderState(next);

    const queue =
      groupSaveQueueRef.current;

    queue.desired = [...orderedKeys];

    if (queue.timer) {
      clearTimeout(queue.timer);
    }

    queue.timer = setTimeout(
      () => void flushGroupOrder(),
      140
    );
  }

  function moveGroupRelative(
    sourceKey: string,
    targetKey: string,
    placeAfter: boolean
  ) {
    if (
      sourceKey === targetKey ||
      !manualSortingEnabled
    ) {
      return;
    }

    const keys = groups.map(
      (group) => group.key
    );

    const sourceIndex =
      keys.indexOf(sourceKey);

    if (sourceIndex < 0) {
      return;
    }

    keys.splice(sourceIndex, 1);

    const targetIndex =
      keys.indexOf(targetKey);

    if (targetIndex < 0) {
      return;
    }

    keys.splice(
      targetIndex +
        (placeAfter ? 1 : 0),
      0,
      sourceKey
    );

    persistGroupOrder(keys);
  }

  const [
    collapsedGroups,
    setCollapsedGroups,
  ] = useState<Set<string>>(
    () => new Set()
  );

  const [
    collapsedGroupsHydrated,
    setCollapsedGroupsHydrated,
  ] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(
        "leadbase:leads:collapsed-groups:v1"
      );

      if (raw) {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          setCollapsedGroups(
            new Set(
              parsed.filter(
                (value): value is string =>
                  typeof value === "string"
              )
            )
          );
        }
      }
    } catch (error) {
      console.warn(
        "Could not restore collapsed lead groups:",
        error
      );
    } finally {
      setCollapsedGroupsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!collapsedGroupsHydrated) {
      return;
    }

    try {
      localStorage.setItem(
        "leadbase:leads:collapsed-groups:v1",
        JSON.stringify(
          Array.from(collapsedGroups)
        )
      );
    } catch (error) {
      console.warn(
        "Could not persist collapsed lead groups:",
        error
      );
    }
  }, [
    collapsedGroups,
    collapsedGroupsHydrated,
  ]);

  function toggleGroupOpen(
    key: string
  ) {
    setCollapsedGroups((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
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

  const analyzing =
    analysisTask.running;

  const analyzeProgress:
    Progress | null =
    analysisTask.running
      ? {
          current:
            analysisTask.current,

          total:
            analysisTask.total,
        }
      : null;


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
    generatingGifs,
    setGeneratingGifs,
  ] =
    useState(
      false
    );

  const [
    gifProgress,
    setGifProgress,
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
    scheduleDialogOpen,
    setScheduleDialogOpen,
  ] =
    useState(
      false
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
    generatingGifs ||
    drafting ||
    cancellingSchedules ||
    isDeleting;

  /* =======================================================
     BULK ANALYZE
  ======================================================= */

  function handleBulkAnalyze() {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    if (!canBulkAnalyze) {
      setBulkMessage(
        language === "de"
          ? "Bulk Analyze ist ab dem Starter-Plan verfügbar."
          : "Bulk Analyze is available from the Starter plan."
      );
      return;
    }

    if (selectedIds.size > entitlements.limits.bulkAnalyzeMaxLeads) {
      setBulkMessage(
        language === "de"
          ? `Dein Plan erlaubt maximal ${entitlements.limits.bulkAnalyzeMaxLeads} Leads pro Bulk-Analyse.`
          : `Your plan allows up to ${entitlements.limits.bulkAnalyzeMaxLeads} leads per bulk analysis.`
      );
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

    const started =
      startBulkAnalysis(
        selectedLeads.map(
          (
            lead
          ) => ({
            id:
              lead.id,

            companyName:
              lead.companyName,
          })
        )
      );

    if (
      !started
    ) {
      return;
    }

    setBulkMessage(
      language ===
        "de"
        ? "Analyse läuft im Hintergrund. Du kannst Leadbase weiter benutzen."
        : "Analysis is running in the background. You can keep using Leadbase."
    );

    setSelectedIds(
      new Set()
    );
  }

  async function ensurePublicPreviewAndGif(
    leadId:
      string
  ) {
    const shareResponse =
      await fetch(
        `/api/leads/${encodeURIComponent(
          leadId
        )}/redesign-preview/share`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({}),
        }
      );

    const shareResult =
      (
        await shareResponse.json()
      ) as ShareCreateResponse;

    if (
      !shareResponse.ok ||
      !shareResult.ok ||
      !shareResult.shareUrl
    ) {
      throw new Error(
        shareResult.error ??
        "Could not create customer preview."
      );
    }

    const gifResponse =
      await fetch(
        `/api/leads/${encodeURIComponent(
          leadId
        )}/preview-gif`,
        {
          method:
            "POST",
        }
      );

    const gifResult =
      (
        await gifResponse.json()
      ) as PreviewGifGenerationResponse;

    if (
      !gifResponse.ok ||
      !gifResult.ok ||
      !gifResult.gifUrl
    ) {
      throw new Error(
        gifResult.error ??
        "Could not create preview GIF."
      );
    }
  }

  /* =======================================================
     BULK DESIGN

     Important: design generation is intentionally separated
     from GIF generation. Bulk design never creates a GIF and
     never publishes a customer link. Review the variations
     first, then explicitly run Bulk GIF.
  ======================================================= */

  async function handleBulkDesign() {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    if (!canBulkDesign) {
      setBulkMessage(
        language === "de"
          ? "Bulk Design ist ab dem Pro-Plan verfügbar."
          : "Bulk Design is available from the Pro plan."
      );
      return;
    }

    if (selectedIds.size > entitlements.limits.bulkDesignMaxLeads) {
      setBulkMessage(
        language === "de"
          ? `Dein Plan erlaubt maximal ${entitlements.limits.bulkDesignMaxLeads} Leads pro Bulk-Design.`
          : `Your plan allows up to ${entitlements.limits.bulkDesignMaxLeads} leads per bulk design.`
      );
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

    startBulkDesignTask(
      eligible.length,
      eligible[0]?.companyName ?? null
    );

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

        updateBulkDesignTask(
          index,
          lead.companyName
        );

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
                    bulk: true,
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

        updateBulkDesignTask(
          index + 1,
          eligible[index + 1]?.companyName ?? null
        );
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

      notify({
        variant:
          failedCount >
            0
            ? "warning"
            : "success",

        title:
          language ===
            "de"
            ? "Design-Generierung abgeschlossen"
            : "Design generation complete",

        description:
          language ===
            "de"
            ? `${createdCount} erstellt · ${existingCount} vorhanden · ${skippedCount} übersprungen · ${failedCount} fehlgeschlagen · keine GIFs erzeugt`
            : `${createdCount} created · ${existingCount} existing · ${skippedCount} skipped · ${failedCount} failed · no GIFs generated`,
      });

      setSelectedIds(
        new Set()
      );

      router.refresh();
    } finally {
      finishBulkDesignTask();

      setDesigning(
        false
      );

      setDesignProgress(
        null
      );
    }
  }

  /* =======================================================
     BULK GIF

     Explicit second step after review. For every selected lead
     we first ensure the selected design has a live customer
     preview, then capture a fresh GIF from that latest snapshot.
  ======================================================= */

  async function handleBulkGif() {
    if (
      busy ||
      selectedIds.size ===
        0
    ) {
      return;
    }

    if (!canBulkGif) {
      setBulkMessage(
        language === "de"
          ? "Bulk GIF ist ab dem Pro-Plan verfügbar."
          : "Bulk GIF is available from the Pro plan."
      );
      return;
    }

    if (selectedIds.size > entitlements.limits.bulkGifMaxLeads) {
      setBulkMessage(
        language === "de"
          ? `Dein Plan erlaubt maximal ${entitlements.limits.bulkGifMaxLeads} Leads pro Bulk-GIF.`
          : `Your plan allows up to ${entitlements.limits.bulkGifMaxLeads} leads per bulk GIF.`
      );
      return;
    }

    const selectedLeads =
      leads.filter(
        (lead) =>
          selectedIds.has(
            lead.id
          )
      );

    setGeneratingGifs(
      true
    );

    setBulkMessage(
      null
    );

    setGifProgress({
      current: 0,
      total: selectedLeads.length,
    });

    let readyCount = 0;
    let failedCount = 0;

    try {
      for (
        let index = 0;
        index < selectedLeads.length;
        index += 1
      ) {
        const lead = selectedLeads[index];

        try {
          await ensurePublicPreviewAndGif(
            lead.id
          );
          readyCount += 1;
        } catch (error) {
          failedCount += 1;
          console.error(
            `Bulk GIF failed for ${lead.companyName}:`,
            error
          );
        }

        setGifProgress({
          current: index + 1,
          total: selectedLeads.length,
        });
      }

      setBulkMessage(
        language === "de"
          ? `GIF-Erstellung abgeschlossen: ${readyCount} bereit${failedCount ? ` · ${failedCount} fehlgeschlagen` : ""}`
          : `GIF generation complete: ${readyCount} ready${failedCount ? ` · ${failedCount} failed` : ""}`
      );

      notify({
        variant: failedCount > 0 ? "warning" : "success",
        title:
          language === "de"
            ? "GIF-Erstellung abgeschlossen"
            : "GIF generation complete",
        description:
          language === "de"
            ? `${readyCount} frische GIFs aus den aktuell ausgewählten Designs erstellt${failedCount ? ` · ${failedCount} fehlgeschlagen` : ""}`
            : `${readyCount} fresh GIFs created from the currently selected designs${failedCount ? ` · ${failedCount} failed` : ""}`,
      });

      setSelectedIds(
        new Set()
      );

      router.refresh();
    } finally {
      setGeneratingGifs(
        false
      );
      setGifProgress(
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

    if (!canBulkOutreach) {
      setBulkMessage(
        language === "de"
          ? "Bulk Outreach ist ab dem Starter-Plan verfügbar."
          : "Bulk Outreach is available from the Starter plan."
      );
      return;
    }

    if (selectedIds.size > entitlements.limits.bulkOutreachMaxLeads) {
      setBulkMessage(
        language === "de"
          ? `Dein Plan erlaubt maximal ${entitlements.limits.bulkOutreachMaxLeads} Leads pro Bulk-Outreach.`
          : `Your plan allows up to ${entitlements.limits.bulkOutreachMaxLeads} leads per bulk outreach run.`
      );
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

      notify({
        variant:
          failedCount >
          0
            ? "warning"
            : "success",

        title:
          language ===
            "de"
            ? "Draft-Generierung abgeschlossen"
            : "Draft generation complete",

        description:
          language ===
            "de"
            ? `${createdCount} erstellt · ${skippedCount} übersprungen · ${failedCount} fehlgeschlagen`
            : `${createdCount} created · ${skippedCount} skipped · ${failedCount} failed`,
      });

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
            <button
              type="button"
              aria-label={`Actions for ${lead.companyName}`}
              className="flex size-[26px] items-center justify-center rounded-[8px] text-[#6B7078] transition-colors hover:bg-black/[0.05] hover:text-[#0B0C0E]"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
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
            {text.common.openLead}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              router.push(
                `/leads/${lead.id}/edit`
              )
            }
          >
            <Pencil className="size-4" />
            {text.common.editLead}
          </DropdownMenuItem>

          {lead.websiteUrl ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    normalizeUrl(lead.websiteUrl!),
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                <ExternalLink className="size-4" />
                {text.common.visitWebsite}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const hotCount =
    Object.values(hotLeadSummaries).filter(
      (summary) => summary.level === "HOT"
    ).length;

  const draftReadyCount =
    leads.filter((lead) => lead.status === "DRAFT_READY").length;

  const contactedCount =
    leads.filter((lead) => lead.status === "CONTACTED").length;

  const noEmailCount =
    leads.filter((lead) => !lead.contactEmail).length;

  const filterCount =
    Number(status !== "ALL") +
    Number(priority !== "ALL");

  const headerCopy = language === "de"
    ? {
        eyebrow: "CRM · Lead-Bestand",
        description: "Prüfe Unternehmen, verfolge deinen Outreach und sieh, welche Leads als Nächstes deine Aufmerksamkeit brauchen.",
        groups: "Gruppen",
        signal: "mit Kaufsignal",
        planned: "Geplante Mails",
        add: "Lead hinzufügen",
        all: "Alle",
        hot: "Kaufsignal",
        draft: "Entwurf bereit",
        contacted: "Kontaktiert",
        noEmail: "Ohne E-Mail",
        hotScore: "Hot Score",
        filter: "Filter",
        company: "Unternehmen",
        scores: "Web / Opp",
        analysis: "Analyse",
        status: "Status",
        priority: "Prio",
        contact: "Kontakt",
        preview: "Preview",
        action: "Aktion",
        campaignOpen: "Kampagne öffnen",
        grouped: "Gruppiert nach Kampagne",
        sorted: sortByHotScore ? "Sortiert nach Hot Score" : "Manuelle Reihenfolge",
        live: "Supabase live",
        active: "Aktiv",
      }
    : {
        eyebrow: "CRM · Lead inventory",
        description: "Review companies, track outreach and see which leads need your attention next.",
        groups: "groups",
        signal: "with buying signal",
        planned: "Scheduled emails",
        add: "Add lead",
        all: "All",
        hot: "Signal",
        draft: "Draft ready",
        contacted: "Contacted",
        noEmail: "No email",
        hotScore: "Hot Score",
        filter: "Filter",
        company: "Company",
        scores: "Web / Opp",
        analysis: "Analysis",
        status: "Status",
        priority: "Prio",
        contact: "Contact",
        preview: "Preview",
        action: "Action",
        campaignOpen: "Open campaign",
        grouped: "Grouped by campaign",
        sorted: sortByHotScore ? "Sorted by Hot Score" : "Manual order",
        live: "Supabase live",
        active: "Active",
      };

  function QuickFilterButton({
    value,
    label,
    count,
  }: {
    value: "ALL" | "HOT" | "DRAFT_READY" | "CONTACTED" | "NO_EMAIL";
    label: string;
    count?: number;
  }) {
    const active = quickFilter === value;

    return (
      <button
        type="button"
        onClick={() => setQuickFilter(value)}
        className={`h-[26px] whitespace-nowrap rounded-[8px] px-2.5 text-[11.5px] transition-[background-color,color,box-shadow] ${
          active
            ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,0.12)]"
            : "text-[#6B7078] hover:text-[#0B0C0E]"
        }`}
      >
        {label}{count !== undefined ? ` ${count}` : ""}
      </button>
    );
  }

  return (
    <div className={`${darkStyles.route} leadbase-route-leads flex min-h-0 h-full flex-col bg-[#F6F7F9] px-[26px] py-[24px] text-[#0B0C0E] max-[800px]:px-4 max-[800px]:py-4`}>
      {/* HEADER */}
      <header className="flex shrink-0 items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#002BBA]">
            <span className="size-[5px] rounded-full bg-[#002BBA]" />
            {headerCopy.eyebrow}
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
            <h1 className="m-0 text-[42px] font-semibold leading-none tracking-[-0.035em]">Leads</h1>
            <span className="text-[15px] tracking-[-0.01em] text-[#6B7078]">
              <span className="tabular-nums">{leads.length}</span> Leads in <span className="tabular-nums">{groups.length}</span> {headerCopy.groups}
              {hotCount > 0 ? <> · <span className="tabular-nums">{hotCount}</span> {headerCopy.signal}</> : null}
            </span>
          </div>

          <p className="mt-[7px] max-w-[820px] text-[13.5px] leading-5 text-[#6B7078]">
            {headerCopy.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 max-[760px]:hidden">
          <Link
            href="/scheduled"
            className="flex h-[34px] items-center gap-[7px] rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE]"
          >
            <CalendarClock className="size-3.5 opacity-60" />
            {headerCopy.planned}
          </Link>

          <LeadCreateDialog
            campaigns={campaignOptions}
            language={language}
            label={headerCopy.add}
          />
        </div>
      </header>

      {/* TOOLBAR */}
      <section className="mt-4 flex shrink-0 items-center gap-2.5 rounded-[14px] border border-black/[0.08] bg-white p-[10px] shadow-[0_1px_2px_rgba(11,12,14,0.03)] max-[1120px]:flex-wrap">
        <div className="relative h-8 w-[268px] shrink-0 max-[700px]:w-full">
          <Search className="absolute left-[11px] top-1/2 size-3.5 -translate-y-1/2 text-[#6B7078]" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={text.table.searchPlaceholder}
            className="h-8 w-full rounded-[9px] border border-black/[0.07] bg-[#F7F8FA] pl-8 pr-10 text-[12.5px] outline-none transition-colors placeholder:text-[#6B7078] hover:border-black/[0.12] focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-[5px] bg-black/[0.05] px-1.5 py-[1px] font-mono text-[9px] text-[#6B7078]">⌘K</span>
        </div>

        <div className="flex shrink-0 rounded-[10px] bg-black/[0.045] p-[3px] max-[940px]:order-3 max-[940px]:w-full max-[940px]:overflow-x-auto">
          <QuickFilterButton value="ALL" label={headerCopy.all} count={leads.length} />
          <QuickFilterButton value="HOT" label={headerCopy.hot} count={hotCount} />
          <QuickFilterButton value="DRAFT_READY" label={headerCopy.draft} count={draftReadyCount} />
          <QuickFilterButton value="CONTACTED" label={headerCopy.contacted} count={contactedCount} />
          <QuickFilterButton value="NO_EMAIL" label={headerCopy.noEmail} count={noEmailCount} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 max-[940px]:ml-0">
          <div className="flex rounded-[9px] bg-black/[0.045] p-[3px]">
            <button
              type="button"
              onClick={() => changeView("compact")}
              className={`flex h-[26px] items-center gap-1.5 rounded-[7px] px-2.5 text-[11.5px] transition-[background-color,color,box-shadow] ${
                viewMode === "compact"
                  ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,0.12)]"
                  : "text-[#6B7078]"
              }`}
            >
              <LayoutList className="size-3" />
              {ui.compact}
            </button>
            <button
              type="button"
              onClick={() => changeView("table")}
              className={`flex h-[26px] items-center gap-1.5 rounded-[7px] px-2.5 text-[11.5px] transition-[background-color,color,box-shadow] ${
                viewMode === "table"
                  ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,0.12)]"
                  : "text-[#6B7078]"
              }`}
            >
              <Table2 className="size-3" />
              {ui.table}
            </button>
          </div>

          <span className="h-5 w-px bg-black/[0.09]" />

          <button
            type="button"
            onClick={() => setSortByHotScore((value) => !value)}
            className={`flex h-8 items-center gap-[7px] rounded-[9px] border px-[11px] text-[12px] transition-colors ${
              sortByHotScore
                ? "border-[#002BBA]/25 bg-[#EAEEFB] text-[#002BBA]"
                : "border-black/[0.09] bg-white text-[#40454E] hover:border-black/[0.16]"
            }`}
          >
            <ArrowDownUp className="size-3.5 opacity-60" />
            {headerCopy.hotScore}
          </button>

          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            className={`flex h-8 items-center gap-[7px] rounded-[9px] border px-[11px] text-[12px] transition-colors ${
              filtersOpen || filterCount > 0
                ? "border-[#002BBA]/25 bg-[#EAEEFB] text-[#002BBA]"
                : "border-black/[0.09] bg-white text-[#40454E] hover:border-black/[0.16]"
            }`}
          >
            <SlidersHorizontal className="size-3.5 opacity-60" />
            {headerCopy.filter}
            {filterCount > 0 ? (
              <span className="rounded-[5px] bg-white px-1.5 py-[1px] font-mono text-[9px] text-[#002BBA]">{filterCount}</span>
            ) : null}
          </button>
        </div>
      </section>

      {/* FILTER PANEL */}
      {filtersOpen ? (
        <section className="mt-2 grid shrink-0 gap-3 rounded-[13px] border border-black/[0.08] bg-white p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#6B7078]">{text.common.status}</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-8 rounded-[9px] border border-black/[0.09] bg-white px-2.5 text-[12px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10"
            >
              <option value="ALL">{text.table.allStatuses}</option>
              {["NEW","RESEARCHING","QUALIFIED","NOT_A_FIT","DRAFT_READY","CONTACTED","REPLIED","CALL_BOOKED","PROPOSAL","WON","LOST","DO_NOT_CONTACT"].map((item) => (
                <option key={item} value={item}>{getLeadStatusLabel(item, language)}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#6B7078]">{text.common.priority}</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="h-8 rounded-[9px] border border-black/[0.09] bg-white px-2.5 text-[12px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10"
            >
              <option value="ALL">{text.table.allPriorities}</option>
              <option value="HIGH">{text.common.priorityHigh}</option>
              <option value="MEDIUM">{text.common.priorityMedium}</option>
              <option value="LOW">{text.common.priorityLow}</option>
              <option value="NONE">{text.common.noPriority}</option>
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="h-8 rounded-[9px] border border-black/[0.09] bg-white px-3 text-[11.5px] text-[#40454E] hover:bg-[#FDFDFE]"
          >
            {text.table.reset}
          </button>
        </section>
      ) : null}

      {/* BULK ACTION BAR */}
      {selectedIds.size > 0 ? (
        <section className="mt-2 flex shrink-0 flex-wrap items-center gap-2 rounded-[12px] bg-[#002BBA] px-3.5 py-2.5 text-white shadow-[0_1px_2px_rgba(0,43,186,0.18)]">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-white/60">Auswahl</span>
          <span className="text-[12.5px] font-medium">{selectedIds.size === 1 ? text.table.selectedOne : text.table.selectedMany.replace("{count}", String(selectedIds.size))}</span>
          <span className="mx-1 h-4 w-px bg-white/20" />

          <button type="button" disabled={busy || planLoading || !canBulkAnalyze} title={!canBulkAnalyze ? (language === "de" ? "Ab Starter" : "Starter+") : undefined} onClick={handleBulkAnalyze} className="flex h-7 items-center gap-1.5 rounded-[8px] border border-white/25 bg-white/[0.12] px-2.5 text-[11.5px] hover:bg-white/[0.20] disabled:opacity-50">
            {analyzing ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            {analyzing && analyzeProgress ? `${analyzeProgress.current}/${analyzeProgress.total}` : text.table.analyzeSelected}
          </button>

          <button type="button" disabled={busy || planLoading || !canBulkDesign} title={!canBulkDesign ? (language === "de" ? "Ab Pro" : "Pro+") : undefined} onClick={handleBulkDesign} className="flex h-7 items-center gap-1.5 rounded-[8px] border border-white/25 bg-white/[0.12] px-2.5 text-[11.5px] hover:bg-white/[0.20] disabled:opacity-50">
            {designing ? <Loader2 className="size-3 animate-spin" /> : <WandSparkles className="size-3" />}
            {designing && designProgress ? `${designProgress.current}/${designProgress.total}` : ui.generateDesigns}
          </button>

          <button type="button" disabled={busy || planLoading || !canBulkGif} title={!canBulkGif ? (language === "de" ? "Ab Pro" : "Pro+") : undefined} onClick={handleBulkGif} className="flex h-7 items-center gap-1.5 rounded-[8px] border border-white/25 bg-white/[0.12] px-2.5 text-[11.5px] hover:bg-white/[0.20] disabled:opacity-50">
            {generatingGifs ? <Loader2 className="size-3 animate-spin" /> : <Film className="size-3" />}
            {generatingGifs && gifProgress ? `${gifProgress.current}/${gifProgress.total}` : (language === "de" ? "GIFs erstellen" : "Generate GIFs")}
          </button>

          <button type="button" disabled={busy || planLoading || !canBulkOutreach} title={!canBulkOutreach ? (language === "de" ? "Ab Starter" : "Starter+") : undefined} onClick={handleBulkDrafts} className="flex h-7 items-center gap-1.5 rounded-[8px] border border-white/25 bg-white/[0.12] px-2.5 text-[11.5px] hover:bg-white/[0.20] disabled:opacity-50">
            {drafting ? <Loader2 className="size-3 animate-spin" /> : <MailPlus className="size-3" />}
            {drafting && draftProgress ? `${draftProgress.current}/${draftProgress.total}` : (language === "de" ? "Entwürfe erstellen" : "Create drafts")}
          </button>

          <button type="button" disabled={busy} onClick={() => setScheduleDialogOpen(true)} className="flex h-7 items-center gap-1.5 rounded-[8px] border border-white/25 bg-white/[0.12] px-2.5 text-[11.5px] hover:bg-white/[0.20] disabled:opacity-50">
            <CalendarClock className="size-3" />
            {language === "de" ? "Später senden" : "Send later"}
          </button>

          <button type="button" disabled={busy} onClick={handleBulkCancelScheduledOutreach} className="flex h-7 items-center gap-1.5 rounded-[8px] border border-white/25 bg-white/[0.12] px-2.5 text-[11.5px] hover:bg-white/[0.20] disabled:opacity-50">
            {cancellingSchedules ? <Loader2 className="size-3 animate-spin" /> : <CalendarX2 className="size-3" />}
            {language === "de" ? "Versand stoppen" : "Cancel send"}
          </button>

          <button type="button" disabled={busy} onClick={() => setDeleteDialogOpen(true)} className="flex h-7 items-center gap-1.5 rounded-[8px] border border-white/25 bg-white/[0.12] px-2.5 text-[11.5px] hover:bg-white/[0.20] disabled:opacity-50">
            <Trash2 className="size-3" />
            {text.table.deleteSelected}
          </button>

          <button type="button" disabled={busy} onClick={clearSelection} className="ml-auto flex size-7 items-center justify-center rounded-[8px] text-white/65 hover:bg-white/10 hover:text-white">
            <X className="size-3.5" />
          </button>
        </section>
      ) : null}

      {bulkMessage ? (
        <div className="mt-2 shrink-0 rounded-[10px] border border-black/[0.07] bg-white px-3 py-2 text-[11.5px] text-[#6B7078]">{bulkMessage}</div>
      ) : null}

      {/* MAIN DATA SURFACE */}
      {viewMode === "compact" ? (
        <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,0.03)]">
          <div className="grid shrink-0 grid-cols-[36px_minmax(270px,1.7fr)_92px_106px_112px_72px_minmax(150px,1fr)_76px_78px_34px] items-center border-b border-black/[0.07] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.11em] text-[#6B7078] max-[1180px]:grid-cols-[36px_minmax(260px,1.7fr)_86px_104px_100px_minmax(140px,1fr)_70px_34px]">
            <SelectionCheckbox checked={allVisibleSelected} indeterminate={someVisibleSelected} disabled={busy} label={text.table.selectAllVisible} onChange={toggleAllVisible} />
            <span className="pl-1">{headerCopy.company}</span>
            <span className="text-center">{headerCopy.scores}</span>
            <span>{headerCopy.analysis}</span>
            <span>{headerCopy.status}</span>
            <span>{headerCopy.priority}</span>
            <span>{headerCopy.contact}</span>
            <span>{headerCopy.preview}</span>
            <span className="max-[1180px]:hidden">{language === "de" ? "Kontakt" : "Contacted"}</span>
            <span className="text-right">{headerCopy.action}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {groups.map((group) => {
              const collapsed = collapsedGroups.has(group.key);
              const groupSelectedCount = group.leads.filter((lead) => selectedIds.has(lead.id)).length;
              const allGroupSelected = group.leads.length > 0 && groupSelectedCount === group.leads.length;
              const someGroupSelected = groupSelectedCount > 0 && !allGroupSelected;

              return (
                <div key={group.key} className="relative">
                  {groupDropTarget?.targetKey === group.key && draggedGroupKey !== group.key ? (
                    <div className={`pointer-events-none absolute left-2 right-2 z-50 h-[3px] rounded-full bg-[#002BBA] ${groupDropTarget.placeAfter ? "-bottom-[2px]" : "-top-[2px]"}`}>
                      <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#002BBA]" />
                    </div>
                  ) : null}

                  <div
                    onDragOver={(event) => {
                      if (draggedGroupKey && manualSortingEnabled) {
                        event.preventDefault();
                        event.stopPropagation();
                        const bounds = event.currentTarget.getBoundingClientRect();
                        setGroupDropTarget({ targetKey: group.key, placeAfter: event.clientY > bounds.top + bounds.height / 2 });
                      }
                    }}
                    onDrop={(event) => {
                      if (!draggedGroupKey) return;
                      event.preventDefault();
                      event.stopPropagation();
                      const target = groupDropTarget?.targetKey === group.key ? groupDropTarget : { targetKey: group.key, placeAfter: false };
                      moveGroupRelative(draggedGroupKey, group.key, target.placeAfter);
                      setDraggedGroupKey(null);
                      setGroupDropTarget(null);
                    }}
                    className={`group/group grid h-[36px] grid-cols-[36px_minmax(0,1fr)_auto] items-center border-b border-black/[0.07] px-3 text-[12.5px] transition-colors ${allGroupSelected ? "bg-[#EAF0FF]" : someGroupSelected ? "bg-[#F1F4FF]" : "bg-[#F7F8FA]"}`}
                  >
                    <button
                      type="button"
                      draggable={manualSortingEnabled}
                      onDragStart={(event) => {
                        if (!manualSortingEnabled) { event.preventDefault(); return; }
                        setDraggedGroupKey(group.key);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", `group:${group.key}`);
                      }}
                      onDragEnd={() => { setDraggedGroupKey(null); setGroupDropTarget(null); }}
                      className={`flex size-5 items-center justify-center text-[#6B7078] transition-opacity ${manualSortingEnabled ? "cursor-grab opacity-0 group-hover/group:opacity-50 active:cursor-grabbing" : "opacity-0"}`}
                      aria-label={language === "de" ? `${group.name} verschieben` : `Move ${group.name}`}
                    >
                      <GripVertical className="size-3" />
                    </button>

                    <div className="flex min-w-0 items-center gap-2">
                      <button type="button" onClick={() => toggleGroupOpen(group.key)} className="flex size-5 shrink-0 items-center justify-center text-[#6B7078] hover:text-[#0B0C0E]">
                        {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
                      </button>
                      <Megaphone className="size-3.5 shrink-0 text-[#002BBA]" />
                      <SelectionCheckbox checked={allGroupSelected} indeterminate={someGroupSelected} disabled={busy} label={`Select ${group.name}`} onChange={() => toggleCampaignSelection(group.leads)} />
                      <span className="truncate font-semibold tracking-[-0.01em]">{group.name}</span>
                      <span className="shrink-0 rounded-[6px] bg-black/[0.05] px-2 py-[2px] font-mono text-[8.5px] text-[#6B7078]">{group.leads.length} Leads</span>
                    </div>

                    {group.key !== "__none__" ? (
                      <Link href={`/campaigns/${group.key}`} className="flex items-center gap-1.5 text-[11px] text-[#6B7078] hover:text-[#002BBA]">
                        {headerCopy.campaignOpen}
                        <ChevronRight className="size-3" />
                      </Link>
                    ) : null}
                  </div>

                  {!collapsed ? group.leads.map((lead) => {
                    const selected = selectedIds.has(lead.id);
                    const analyzed = lead.analysisStatus === "COMPLETED";
                    const preview = previewSummaries[lead.id];
                    const hot = hotLeadSummaries[lead.id];

                    return (
                      <div
                        key={lead.id}
                        onDragOver={(event) => {
                          if (draggedLeadId && manualSortingEnabled) {
                            event.preventDefault();
                            event.stopPropagation();
                            const bounds = event.currentTarget.getBoundingClientRect();
                            setLeadDropTarget({ groupKey: group.key, targetId: lead.id, placeAfter: event.clientY > bounds.top + bounds.height / 2 });
                          }
                        }}
                        onDrop={(event) => {
                          if (!draggedLeadId) return;
                          event.preventDefault();
                          event.stopPropagation();
                          const target = leadDropTarget?.targetId === lead.id ? leadDropTarget : { groupKey: group.key, targetId: lead.id, placeAfter: false };
                          moveLeadRelative(group.key, draggedLeadId, lead.id, target.placeAfter);
                          setDraggedLeadId(null);
                          setLeadDropTarget(null);
                        }}
                        className={`group/lead relative grid min-h-[46px] grid-cols-[36px_minmax(270px,1.7fr)_92px_106px_112px_72px_minmax(150px,1fr)_76px_78px_34px] items-center border-b border-black/[0.055] px-3 transition-colors last:border-b-0 max-[1180px]:grid-cols-[36px_minmax(260px,1.7fr)_86px_104px_100px_minmax(140px,1fr)_70px_34px] ${selected ? "bg-[#EAF0FF] hover:bg-[#E3EAFF]" : "hover:bg-[#F7F8FA]"} ${draggedLeadId === lead.id ? "opacity-60" : ""}`}
                      >
                        {leadDropTarget?.groupKey === group.key && leadDropTarget.targetId === lead.id && draggedLeadId !== lead.id ? (
                          <div className={`pointer-events-none absolute left-2 right-2 z-50 h-[3px] rounded-full bg-[#002BBA] ${leadDropTarget.placeAfter ? "-bottom-[2px]" : "-top-[2px]"}`}>
                            <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-[#002BBA]" />
                          </div>
                        ) : null}

                        <div className="flex items-center justify-center gap-1.5 pr-1">
                          <button
                            type="button"
                            draggable={manualSortingEnabled}
                            onDragStart={(event) => {
                              if (!manualSortingEnabled) { event.preventDefault(); return; }
                              setDraggedLeadId(lead.id);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", `lead:${lead.id}`);
                            }}
                            onDragEnd={() => { setDraggedLeadId(null); setLeadDropTarget(null); }}
                            className={`flex size-3.5 items-center justify-center text-[#6B7078] transition-opacity ${manualSortingEnabled ? "cursor-grab opacity-0 group-hover/lead:opacity-45 active:cursor-grabbing" : "opacity-0"}`}
                            aria-label={language === "de" ? `${lead.companyName} verschieben` : `Move ${lead.companyName}`}
                          >
                            <GripVertical className="size-3" />
                          </button>
                          <SelectionCheckbox checked={selected} disabled={busy} label={`Select ${lead.companyName}`} onChange={() => toggleLead(lead.id)} />
                        </div>

                        <Link href={`/leads/${lead.id}`} className="min-w-0 py-1.5 pl-1.5 pr-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-[12.5px] font-medium tracking-[-0.01em] hover:underline">{lead.companyName}</span>
                            {hot && hot.level !== "COLD" ? <LeadHotScoreIndicator summary={hot} /> : null}
                          </div>
                          <div className="mt-[2px] truncate text-[10.5px] text-[#6B7078]">{lead.location ?? lead.industry ?? "—"}</div>
                        </Link>

                        <div className="flex items-center justify-center gap-1 font-mono text-[11px] tabular-nums">
                          <span className="font-medium text-[#0B0C0E]">{lead.websiteScore ?? "—"}</span>
                          <span className="text-[#B1B5BB]">/</span>
                          <span className="text-[#6B7078]">{lead.opportunityScore ?? "—"}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10.5px] text-[#6B7078]">
                          <span className={`size-[5px] rounded-full ${analyzed ? "bg-[#2F6B3A]" : "bg-black/[0.18]"}`} />
                          {analyzed ? ui.analyzed : ui.notAnalyzed}
                        </div>

                        <div>
                          <Badge variant="outline" className={`whitespace-nowrap border-0 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.05em] ${statusClass(lead.status)}`}>
                            {getLeadStatusLabel(lead.status, language)}
                          </Badge>
                        </div>

                        <span className={`text-[10.5px] font-medium ${priorityClass(lead.priority)}`}>{getLeadPriorityLabel(lead.priority, language)}</span>

                        <div className="min-w-0 pr-2">
                          {lead.contactEmail ? (
                            <div className="flex min-w-0 items-center gap-1.5 text-[10.5px] text-[#6B7078]">
                              <Mail className="size-3 shrink-0" />
                              <span className="truncate">{lead.contactEmail}</span>
                            </div>
                          ) : (
                            <div className="flex min-w-0 items-center gap-1.5 text-[10.5px] text-[#6B7078]">
                              <Mail className="size-3 shrink-0 text-[#9A5106]" />
                              <span className="truncate">{lead.contactFormUrl ? text.common.contactForm : text.common.noEmailFound}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-[10.5px] text-[#6B7078]">
                          {preview ? <LeadPreviewVisitsButton summary={preview} /> : <span className="font-mono">0</span>}
                        </div>

                        <span className="font-mono text-[10px] text-[#6B7078] max-[1180px]:hidden">{formatDate(lead.lastContactedAt, language)}</span>

                        <div className="flex justify-end"><LeadActions lead={lead} /></div>
                      </div>
                    );
                  }) : null}
                </div>
              );
            })}

            {filteredLeads.length === 0 ? (
              <div className="py-8 pl-[52px] pr-5 text-left max-sm:px-4">
                <p className="text-[13px] font-medium">{text.table.noMatching}</p>
                <p className="mt-1 text-[11.5px] text-[#6B7078]">{text.table.noMatchingDescription}</p>
                {hasActiveFilters ? (
                  <button type="button" onClick={resetFilters} className="mt-3 h-8 rounded-[9px] border border-black/[0.09] bg-white px-3 text-[11.5px] text-[#40454E] hover:bg-[#FDFDFE]">{text.table.clearFilters}</button>
                ) : null}
              </div>
            ) : null}
          </div>

          <footer className="flex shrink-0 items-center justify-between border-t border-black/[0.07] bg-[#FDFDFE] px-4 py-2 text-[10.5px] text-[#6B7078]">
            <div className="flex items-center gap-3">
              <span className="font-mono uppercase tracking-[0.06em]">{filteredLeads.length} Leads · {groups.length} {headerCopy.groups}</span>
              <span>{headerCopy.grouped}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span>{headerCopy.sorted}</span>
              <span className="h-3 w-px bg-black/[0.14]" />
              <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em]">
                <span className="size-[5px] rounded-full bg-[#2F6B3A]" />
                {headerCopy.live}
              </span>
            </div>
          </footer>
        </section>
      ) : (
        <section className="mt-3 min-h-0 flex-1 overflow-auto rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,0.03)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12"><SelectionCheckbox checked={allVisibleSelected} indeterminate={someVisibleSelected} disabled={busy} label={text.table.selectAllVisible} onChange={toggleAllVisible} /></TableHead>
                <TableHead>{text.common.company}</TableHead>
                <TableHead>{ui.campaign}</TableHead>
                <TableHead>{ui.scores}</TableHead>
                <TableHead>{text.common.status}</TableHead>
                <TableHead>{text.common.priority}</TableHead>
                <TableHead>{ui.contact}</TableHead>
                <TableHead>{ui.previewViews}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} className={selectedIds.has(lead.id) ? "bg-[#EAF0FF] hover:bg-[#E3EAFF]" : undefined}>
                  <TableCell><SelectionCheckbox checked={selectedIds.has(lead.id)} disabled={busy} label={`Select ${lead.companyName}`} onChange={() => toggleLead(lead.id)} /></TableCell>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">{lead.companyName}</Link>
                    <p className="mt-0.5 max-w-[260px] truncate text-xs text-[#6B7078]">{lead.location ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-xs text-[#6B7078]">{lead.campaignName ?? ui.uncategorized}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{lead.websiteScore ?? "—"} <span className="text-[#B1B5BB]">/</span> {lead.opportunityScore ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={`border-0 text-[9px] ${statusClass(lead.status)}`}>{getLeadStatusLabel(lead.status, language)}</Badge></TableCell>
                  <TableCell><span className={`text-xs ${priorityClass(lead.priority)}`}>{getLeadPriorityLabel(lead.priority, language)}</span></TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-[#6B7078]">{lead.contactEmail ?? (lead.contactFormUrl ? text.common.contactForm : text.common.noEmailFound)}</TableCell>
                  <TableCell>{previewSummaries[lead.id] ? <LeadPreviewVisitsButton summary={previewSummaries[lead.id]} /> : <span className="text-xs text-[#6B7078]">—</span>}</TableCell>
                  <TableCell><LeadActions lead={lead} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <BulkOutreachScheduleDialog
        open={scheduleDialogOpen}
        leads={leads.filter((lead) => selectedIds.has(lead.id)).map((lead) => ({ id: lead.id, companyName: lead.companyName, contactEmail: lead.contactEmail }))}
        onOpenChange={setScheduleDialogOpen}
        onScheduled={() => { setSelectedIds(new Set()); router.refresh(); }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ui.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{ui.deleteDescription.replace("{count}", String(selectedIds.size))}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{ui.cancel}</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {ui.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}