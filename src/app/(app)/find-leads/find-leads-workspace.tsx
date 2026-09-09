"use client";

import Link from "next/link";

import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Globe2,
  History,
  Loader2,
  MapPin,
  Megaphone,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  useRouter,
} from "next/navigation";

import {
  CandidateActions,
} from "./candidate-actions-buttons";

import darkStyles from "@/components/leadbase-route-dark-polish.module.css";

import {
  runLeadSearch,
} from "./actions";

import {
  IndustryAutocomplete,
} from "@/components/industry-autocomplete";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/* =========================================================
   TYPES
========================================================= */

export type FindLeadsCampaign = {
  id: string;

  name: string;

  targetIndustry:
    | string
    | null;

  targetGeography:
    | string
    | null;

  status: string;

  leadCount: number;
};

export type FindLeadsRun = {
  id: string;

  campaignId:
    | string
    | null;

  campaignName: string;

  query: string;

  industry: string;

  location: string;

  limit: number;

  results: number;

  status: string;

  errorMessage:
    | string
    | null;

  createdAt: string;

  when: string;

  discoveredCount:
    number;

  savedCount:
    number;

  rejectedCount:
    number;
};

export type FindLeadsCandidate = {
  id: string;

  name: string;

  websiteUrl:
    | string
    | null;

  phone:
    | string
    | null;

  address:
    | string
    | null;

  mapsUrl:
    | string
    | null;

  rating:
    | number
    | null;

  reviewCount:
    | number
    | null;

  primaryType:
    | string
    | null;
};

type SearchContext = {
  industries: string[];

  location: string;

  resultLimit:
    number;
};

type AiSearchResponse = {
  ok?: boolean;

  error?: string;

  needsClarification?:
    boolean;

  assistantMessage?:
    string;

  searchId?:
    string;

  intent?:
    SearchContext;
};

type HistoryRun = {
  id: string;

  campaignId:
    | string
    | null;

  campaignName: string;

  query: string;

  industry: string;

  location: string;

  limit: number;

  results: number;

  status: string;

  errorMessage:
    | string
    | null;

  createdAt: string;
};

type HistoryResponse = {
  ok?: boolean;

  error?: string;

  runs?: HistoryRun[];

  total?: number;

  hasMore?: boolean;
};

/* =========================================================
   COPY
========================================================= */

const copy = {
  de: {
    eyebrow:
      "Akquise",

    title:
      "Leads finden",

    waiting:
      "Unternehmen warten auf Prüfung",

    description:
      "Finde Unternehmen, die zu einer deiner Kampagnen passen, und prüfe sie, bevor du sie deinem CRM hinzufügst.",

    campaigns:
      "Kampagnen",

    history:
      "Suchverlauf",

    newSearch:
      "Neue Suche",

    googlePlacesHint:
      "Google Places · Ergebnisse landen zur Prüfung, nicht direkt im CRM.",

    criteria:
      "Kriterien",

    prompt:
      "Prompt",

    campaign:
      "Kampagne",

    results:
      "Ergebnisse",

    companies:
      "Firmen",

    industry:
      "Branche",

    location:
      "Standort",

    campaignHelp:
      "Neue Leads werden dieser Kampagne zugeordnet.",

    limitHelp:
      "Limit pro Lauf.",

    industryHelp:
      "Aus der Kampagne übernommen · für diese Suche änderbar.",

    locationHelp:
      "Vor dem Start anpassbar.",

    examples:
      "Zum Beispiel",

    exampleOne:
      "30 Handwerker in Albstadt",

    exampleTwo:
      "20 Gartenbauer in Balingen",

    exampleThree:
      "15 Elektriker in Hechingen",

    promptHint:
      "Der Prompt wird in Branche, Standort und Limit übersetzt.",

    query:
      "Suchanfrage",

    findLeads:
      "Leads finden",

    assigned:
      "gespeicherte Unternehmen werden",

    assignedTail:
      "zugeordnet.",

    recent:
      "Letzte Suchen",

    recentDescription:
      "Deine zuletzt durchgeführten Unternehmenssuchen.",

    runs:
      "Läufe",

    hits:
      "Treffer",

    all:
      "Alle",

    allRunsTitle:
      "Alle Suchläufe",

    allRunsDescription:
      "Deine vollständige Suchhistorie. Weitere Läufe werden erst beim Öffnen nachgeladen.",

    loadMore:
      "Mehr laden",

    loadingHistory:
      "Suchverlauf wird geladen …",

    historyLoadError:
      "Der Suchverlauf konnte nicht geladen werden.",

    noHistory:
      "Noch keine Suchläufe vorhanden.",

    latest:
      "Letzter Lauf",

    completed:
      "Abgeschlossen",

    running:
      "Läuft",

    failed:
      "Fehlgeschlagen",

    waitingForReview:
      "Zur Prüfung",

    of:
      "von",

    alreadyInCrm:
      "bereits ins CRM übernommen",

    reviewResults:
      "Ergebnisse prüfen",

    repeat:
      "Wiederholen",

    targetCampaign:
      "Ziel-Kampagne",

    active:
      "Aktiv",

    leadsInCampaign:
      "Leads in Kampagne",

    source:
      "Quelle",

    hitsPerRun:
      "Treffer je Lauf",

    lastRuns:
      "Letzte",

    searches:
      "Suchen",

    resultAgainstLimit:
      "Ergebnis gegen Limit",

    average:
      "Ø",

    bestRun:
      "Bester Lauf",

    limitUsually:
      "Limit meist",

    createCampaign:
      "Erstelle zuerst eine Kampagne, damit Leadbase neue Unternehmen einer echten Kampagne zuordnen kann.",

    createCampaignAction:
      "Kampagne erstellen",

    noChartData:
      "Noch keine Suchdaten",

    promptPlaceholder:
      "Finde 30 Gartenbauer in Balingen …",

    aiClarification:
      "Rückfrage",

    reviewTitle:
      "Unternehmen prüfen",

    reviewDescription:
      "Speichere passende Unternehmen als Lead oder lehne sie ab.",

    noCandidates:
      "Für diesen Suchlauf warten keine Unternehmen mehr auf Prüfung.",

    website:
      "Website",

    maps:
      "Google Maps",

    phone:
      "Telefon",

    searchFailed:
      "Die Suche ist fehlgeschlagen. Bitte versuche es erneut.",

    noCampaign:
      "Keine Kampagne",
  },

  en: {
    eyebrow:
      "Acquisition",

    title:
      "Find Leads",

    waiting:
      "companies waiting for review",

    description:
      "Find companies that fit one of your campaigns and review them before adding them to your CRM.",

    campaigns:
      "Campaigns",

    history:
      "Search history",

    newSearch:
      "New search",

    googlePlacesHint:
      "Google Places · Results go to review, not directly into the CRM.",

    criteria:
      "Criteria",

    prompt:
      "Prompt",

    campaign:
      "Campaign",

    results:
      "Results",

    companies:
      "companies",

    industry:
      "Industry",

    location:
      "Location",

    campaignHelp:
      "New leads will be assigned to this campaign.",

    limitHelp:
      "Limit per run.",

    industryHelp:
      "Taken from the campaign · editable for this search.",

    locationHelp:
      "Adjustable before starting.",

    examples:
      "For example",

    exampleOne:
      "30 trades companies in Albstadt",

    exampleTwo:
      "20 landscapers in Balingen",

    exampleThree:
      "15 electricians in Hechingen",

    promptHint:
      "The prompt is translated into industry, location and limit.",

    query:
      "Search query",

    findLeads:
      "Find leads",

    assigned:
      "saved companies are assigned to",

    assignedTail:
      ".",

    recent:
      "Recent searches",

    recentDescription:
      "Your most recently completed company searches.",

    runs:
      "runs",

    hits:
      "hits",

    all:
      "All",

    allRunsTitle:
      "All search runs",

    allRunsDescription:
      "Your complete search history. More runs are loaded only when you open this view.",

    loadMore:
      "Load more",

    loadingHistory:
      "Loading search history …",

    historyLoadError:
      "Search history could not be loaded.",

    noHistory:
      "No search runs yet.",

    latest:
      "Latest run",

    completed:
      "Completed",

    running:
      "Running",

    failed:
      "Failed",

    waitingForReview:
      "To review",

    of:
      "of",

    alreadyInCrm:
      "already added to CRM",

    reviewResults:
      "Review results",

    repeat:
      "Repeat",

    targetCampaign:
      "Target campaign",

    active:
      "Active",

    leadsInCampaign:
      "Leads in campaign",

    source:
      "Source",

    hitsPerRun:
      "Hits per run",

    lastRuns:
      "Last",

    searches:
      "searches",

    resultAgainstLimit:
      "Result against limit",

    average:
      "Avg",

    bestRun:
      "Best run",

    limitUsually:
      "Usual limit",

    createCampaign:
      "Create a campaign first so Leadbase can assign newly found companies to a real campaign.",

    createCampaignAction:
      "Create campaign",

    noChartData:
      "No search data yet",

    promptPlaceholder:
      "Find 30 landscapers in Balingen …",

    aiClarification:
      "Follow-up",

    reviewTitle:
      "Review companies",

    reviewDescription:
      "Save matching companies as leads or reject them.",

    noCandidates:
      "No companies from this search are waiting for review.",

    website:
      "Website",

    maps:
      "Google Maps",

    phone:
      "Phone",

    searchFailed:
      "The search failed. Please try again.",

    noCampaign:
      "No campaign",
  },
} as const;

/* =========================================================
   TYPEWRITER
========================================================= */

const placeholderExamples = {
  de: [
    "Finde 30 Gartenbauer in Balingen …",
    "Finde 25 Sanitärbetriebe in Stuttgart …",
    "Finde 15 Elektriker in Hechingen …",
  ],

  en: [
    "Find 30 landscapers in Balingen …",
    "Find 25 plumbing companies in Stuttgart …",
    "Find 15 electricians in Hechingen …",
  ],
} as const;

/* =========================================================
   HELPERS
========================================================= */

function statusLabel(
  status: string,
  language:
    "de" | "en"
) {
  const text =
    copy[
      language
    ];

  switch (
    status
  ) {
    case "RUNNING":
      return text.running;

    case "FAILED":
      return text.failed;

    default:
      return text.completed;
  }
}

function statusStyle(
  status: string
) {
  switch (
    status
  ) {
    case "RUNNING":
      return "bg-[#EAEEFB] text-[#002BBA]";

    case "FAILED":
      return "bg-[#FDF0E3] text-[#9A5106]";

    default:
      return "bg-[#E9F0EA] text-[#2F6B3A]";
  }
}

function runRatio(
  run: FindLeadsRun
) {
  return Math.max(
    0,
    Math.min(
      1,
      run.results /
        Math.max(
          1,
          run.limit
        )
    )
  );
}

function barColor(
  ratio: number
) {
  if (
    ratio >=
    0.9
  ) {
    return "#002BBA";
  }

  if (
    ratio >=
    0.4
  ) {
    return "#4C66D4";
  }

  if (
    ratio >=
    0.15
  ) {
    return "#9FB0EA";
  }

  return "#D5DCF5";
}

function modeValue(
  values:
    number[]
) {
  if (
    values.length ===
    0
  ) {
    return 20;
  }

  const counts =
    new Map<
      number,
      number
    >();

  for (
    const value of
      values
  ) {
    counts.set(
      value,
      (
        counts.get(
          value
        ) ??
        0
      ) + 1
    );
  }

  return [
    ...counts.entries(),
  ].sort(
    (
      a,
      b
    ) =>
      b[1] -
        a[1] ||
      b[0] -
        a[0]
  )[0]?.[0] ??
    20;
}

function formatHistoryDate(
  value: string,
  language:
    "de" | "en"
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    language === "de"
      ? "de-DE"
      : "en-GB",
    {
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
    date
  );
}

function shortBestRunLabel(
  run:
    FindLeadsRun | null
) {
  if (
    !run
  ) {
    return "—";
  }

  const location =
    run.location
      .replace(
        /^Landkreis\s+/i,
        ""
      )
      .trim();

  if (
    location
  ) {
    return `${location} · ${run.results}`;
  }

  return `${run.query} · ${run.results}`;
}

/* =========================================================
   SERVER ACTION BUTTONS
========================================================= */

function CriteriaSubmitButton({
  label,
}: {
  label: string;
}) {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending
      }
      className="flex h-9 shrink-0 items-center gap-2 rounded-[10px] bg-white px-4 text-[13px] font-semibold text-[#002BBA] transition-colors hover:bg-white/90 disabled:pointer-events-none disabled:opacity-70"
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Search className="size-3.5" />
      )}

      {
        label
      }
    </button>
  );
}

function RepeatButton({
  run,
  label,
  compact = false,
}: {
  run:
    FindLeadsRun;

  label: string;

  compact?:
    boolean;
}) {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending
      }
      aria-label={
        label
      }
      title={
        label
      }
      className={
        compact
          ? "flex size-6 items-center justify-center rounded-[7px] text-[#6B7078] transition-colors hover:bg-black/[0.06] hover:text-[#0B0C0E] disabled:opacity-50"
          : "flex h-8 items-center gap-1.5 rounded-[9px] border border-white/[0.18] px-3 text-[12.5px] text-white/80 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
      }
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <RefreshCcw className="size-3.5" />
      )}

      {!compact ? (
        <span>
          {
            label
          }
        </span>
      ) : null}
    </button>
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export function FindLeadsWorkspace({
  language,
  campaigns,
  runs,
  totalPendingCount,
  activeRunId,
  candidates,
  initialReviewOpen,
  pageError,
}: {
  language:
    "de" | "en";

  campaigns:
    FindLeadsCampaign[];

  runs:
    FindLeadsRun[];

  totalPendingCount:
    number;

  activeRunId:
    | string
    | null;

  candidates:
    FindLeadsCandidate[];

  initialReviewOpen:
    boolean;

  pageError:
    | string
    | null;
}) {
  const router =
    useRouter();

  const text =
    copy[
      language
    ];

  const activeCampaigns =
    useMemo(
      () =>
        campaigns.filter(
          (
            campaign
          ) =>
            campaign.status !==
            "ARCHIVED"
        ),
      [
        campaigns,
      ]
    );

  const defaultCampaign =
    activeCampaigns.find(
      (
        campaign
      ) =>
        campaign.status ===
        "ACTIVE"
    ) ??
    activeCampaigns[0] ??
    null;

  const [
    mode,
    setMode,
  ] =
    useState<
      "criteria" |
      "prompt"
    >(
      "criteria"
    );

  const [
    campaignId,
    setCampaignId,
  ] =
    useState(
      defaultCampaign?.id ??
        ""
    );

  const selectedCampaign =
    activeCampaigns.find(
      (
        campaign
      ) =>
        campaign.id ===
        campaignId
    ) ??
    defaultCampaign;

  const [
    industry,
    setIndustry,
  ] =
    useState(
      selectedCampaign
        ?.targetIndustry ??
        ""
    );

  const [
    location,
    setLocation,
  ] =
    useState(
      selectedCampaign
        ?.targetGeography ??
        ""
    );

  const [
    resultLimit,
    setResultLimit,
  ] =
    useState(
      20
    );

  const [
    prompt,
    setPrompt,
  ] =
    useState(
      ""
    );

  const [
    animatedPlaceholder,
    setAnimatedPlaceholder,
  ] =
    useState(
      ""
    );

  const [
    promptLoading,
    setPromptLoading,
  ] =
    useState(
      false
    );

  const [
    promptContext,
    setPromptContext,
  ] =
    useState<
      SearchContext | null
    >(
      null
    );

  const [
    clarification,
    setClarification,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    reviewOpen,
    setReviewOpen,
  ] =
    useState(
      initialReviewOpen
    );

  const [
    historyOpen,
    setHistoryOpen,
  ] =
    useState(
      false
    );

  const [
    historyRuns,
    setHistoryRuns,
  ] =
    useState<
      HistoryRun[]
    >(
      []
    );

  const [
    historyTotal,
    setHistoryTotal,
  ] =
    useState(
      0
    );

  const [
    historyHasMore,
    setHistoryHasMore,
  ] =
    useState(
      false
    );

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(
      false
    );

  const [
    historyError,
    setHistoryError,
  ] =
    useState<
      string | null
    >(
      null
    );

  useEffect(
    () => {
      setReviewOpen(
        initialReviewOpen
      );
    },
    [
      initialReviewOpen,
    ]
  );

  /* =======================================================
     URL CAMPAIGN
  ======================================================= */

  useEffect(
    () => {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const requested =
        params.get(
          "campaign"
        );

      if (
        !requested
      ) {
        return;
      }

      const campaign =
        activeCampaigns.find(
          (
            item
          ) =>
            item.id ===
            requested
        );

      if (
        !campaign
      ) {
        return;
      }

      setCampaignId(
        campaign.id
      );

      setIndustry(
        campaign.targetIndustry ??
          ""
      );

      setLocation(
        campaign.targetGeography ??
          ""
      );
    },
    [
      activeCampaigns,
    ]
  );

  /* =======================================================
     CAMPAIGN CHANGE
  ======================================================= */

  function selectCampaign(
    nextId: string
  ) {
    setCampaignId(
      nextId
    );

    const campaign =
      activeCampaigns.find(
        (
          item
        ) =>
          item.id ===
          nextId
      ) ??
      null;

    setIndustry(
      campaign
        ?.targetIndustry ??
        ""
    );

    setLocation(
      campaign
        ?.targetGeography ??
        ""
    );
  }

  /* =======================================================
     TYPEWRITER — NO STATIC FALLBACK FLASH
  ======================================================= */

  useEffect(
    () => {
      setAnimatedPlaceholder(
        ""
      );

      const examples =
        placeholderExamples[
          language
        ];

      const reducedMotion =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

      if (
        reducedMotion
      ) {
        setAnimatedPlaceholder(
          examples[0]
        );
        return;
      }

      let exampleIndex =
        0;

      let characterIndex =
        0;

      let deleting =
        false;

      let cancelled =
        false;

      let timer:
        number | null =
        null;

      const schedule = (
        delay:
          number
      ) => {
        timer =
          window.setTimeout(
            step,
            delay
          );
      };

      const step = () => {
        if (
          cancelled
        ) {
          return;
        }

        const current =
          examples[
            exampleIndex
          ];

        if (
          !deleting
        ) {
          characterIndex =
            Math.min(
              current.length,
              characterIndex +
                1
            );

          setAnimatedPlaceholder(
            current.slice(
              0,
              characterIndex
            )
          );

          if (
            characterIndex >=
            current.length
          ) {
            deleting =
              true;

            schedule(
              1450
            );
          } else {
            schedule(
              42
            );
          }

          return;
        }

        characterIndex =
          Math.max(
            0,
            characterIndex -
              1
          );

        setAnimatedPlaceholder(
          current.slice(
            0,
            characterIndex
          )
        );

        if (
          characterIndex ===
          0
        ) {
          deleting =
            false;

          exampleIndex =
            (
              exampleIndex +
              1
            ) %
            examples.length;

          schedule(
            320
          );
        } else {
          schedule(
            24
          );
        }
      };

      schedule(
        450
      );

      return () => {
        cancelled =
          true;

        if (
          timer !==
          null
        ) {
          window.clearTimeout(
            timer
          );
        }
      };
    },
    [
      language,
    ]
  );

  /* =======================================================
     PROMPT SEARCH
  ======================================================= */

  async function submitPrompt(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const clean =
      prompt.trim();

    if (
      !clean ||
      !campaignId ||
      promptLoading
    ) {
      return;
    }

    setPromptLoading(
      true
    );

    setClarification(
      null
    );

    try {
      const response =
        await fetch(
          "/api/find-leads/ai-search",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                prompt:
                  clean,

                campaignId,

                language,

                context:
                  promptContext,
              }),
          }
        );

      const result =
        await response.json() as
          AiSearchResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            text.searchFailed
        );
      }

      if (
        result.intent
      ) {
        setPromptContext(
          result.intent
        );
      }

      if (
        result.needsClarification
      ) {
        setClarification(
          result.assistantMessage ??
          ""
        );

        setPrompt(
          ""
        );

        return;
      }

      if (
        result.searchId
      ) {
        router.push(
          `/find-leads?search=${encodeURIComponent(
            result.searchId
          )}`
        );

        router.refresh();
      }
    } catch (
      error
    ) {
      setClarification(
        error instanceof
          Error
          ? error.message
          : text.searchFailed
      );
    } finally {
      setPromptLoading(
        false
      );
    }
  }

  /* =======================================================
     FULL SEARCH HISTORY — LAZY + PAGINATED
  ======================================================= */

  async function loadHistoryPage(
    offset:
      number
  ) {
    if (
      historyLoading
    ) {
      return;
    }

    setHistoryLoading(
      true
    );

    setHistoryError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/find-leads/history?offset=${offset}&limit=30`,
          {
            cache:
              "no-store",
          }
        );

      const result =
        await response.json() as
          HistoryResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
          text.historyLoadError
        );
      }

      const nextRuns =
        result.runs ??
        [];

      setHistoryRuns(
        (
          current
        ) =>
          offset ===
          0
            ? nextRuns
            : [
                ...current,
                ...nextRuns,
              ]
      );

      setHistoryTotal(
        result.total ??
        (
          offset +
          nextRuns.length
        )
      );

      setHistoryHasMore(
        Boolean(
          result.hasMore
        )
      );
    } catch (
      error
    ) {
      setHistoryError(
        error instanceof
          Error
          ? error.message
          : text.historyLoadError
      );
    } finally {
      setHistoryLoading(
        false
      );
    }
  }

  function openHistory() {
    setHistoryOpen(
      true
    );

    if (
      historyRuns.length ===
        0 &&
      !historyLoading
    ) {
      void loadHistoryPage(
        0
      );
    }
  }

  /* =======================================================
     REVIEW
  ======================================================= */

  function openRunReview(
    runId: string
  ) {
    if (
      runId ===
      activeRunId
    ) {
      setReviewOpen(
        true
      );

      return;
    }

    router.push(
      `/find-leads?search=${encodeURIComponent(
        runId
      )}&review=1`
    );
  }

  /* =======================================================
     DERIVED
  ======================================================= */

  const latestRun =
    runs[0] ??
    null;

  const currentRun =
    runs.find(
      (
        run
      ) =>
        run.id ===
        activeRunId
    ) ??
    latestRun;

  const recentHitCount =
    runs.reduce(
      (
        total,
        run
      ) =>
        total +
        run.results,
      0
    );

  const averageResults =
    runs.length >
      0
      ? runs.reduce(
          (
            total,
            run
          ) =>
            total +
            run.results,
          0
        ) /
        runs.length
      : 0;

  const bestRun =
    runs.reduce<
      FindLeadsRun | null
    >(
      (
        best,
        run
      ) =>
        !best ||
        run.results >
          best.results
          ? run
          : best,
      null
    );

  const commonLimit =
    modeValue(
      runs.map(
        (
          run
        ) =>
          run.limit
      )
    );

  const querySummary =
    mode ===
      "prompt" &&
    prompt.trim()
      ? prompt.trim()
      : [
          industry.trim(),
          location.trim(),
        ]
          .filter(
            Boolean
          )
          .join(
            " in "
          ) ||
        (
          language ===
            "de"
            ? "Neue Unternehmenssuche"
            : "New company search"
        );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <div className={`${darkStyles.route} leadbase-route-find-leads min-h-full bg-[#F6F7F9] px-[26px] py-[24px] text-[#0B0C0E]`}>
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="flex items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#002BBA]">
              <span className="size-[5px] rounded-full bg-[#002BBA]" />

              {
                text.eyebrow
              }
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
              <h1 className="m-0 text-[42px] font-semibold leading-none tracking-[-0.035em]">
                {
                  text.title
                }
              </h1>

              <span className="text-[15px] tracking-[-0.01em] text-[#6B7078]">
                <span className="tabular-nums">
                  {
                    totalPendingCount
                  }
                </span>{" "}
                {
                  text.waiting
                }
              </span>
            </div>

            <p className="mt-[7px] max-w-[820px] text-[13.5px] leading-5 text-[#6B7078]">
              {
                text.description
              }
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/campaigns"
              className="flex h-[34px] items-center gap-[7px] whitespace-nowrap rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE]"
            >
              <Megaphone className="size-3.5 opacity-60" />

              {
                text.campaigns
              }
            </Link>

            <button
              type="button"
              onClick={() => {
                document
                  .getElementById(
                    "leadbase-find-leads-history"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",

                    block:
                      "nearest",
                  });
              }}
              className="flex h-[34px] items-center gap-[7px] whitespace-nowrap rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE]"
            >
              <Clock3 className="size-3.5 opacity-60" />

              {
                text.history
              }
            </button>
          </div>
        </header>

        {pageError ? (
          <div className="mt-3 rounded-[10px] bg-[#FDF0E3] px-3 py-2 text-[11.5px] text-[#9A5106]">
            {
              pageError
            }
          </div>
        ) : null}

        {/* =================================================
            MAIN WORKSPACE
        ================================================= */}

        <div className={`mt-4 flex gap-4 max-[1180px]:flex-col ${runs.length === 0 ? "min-h-0 items-start" : "min-h-[calc(100dvh-168px)]"}`}>
          {/* ===============================================
              LEFT / CENTER
          =============================================== */}

          <div className="flex min-w-0 flex-1 flex-col gap-3.5">
            {/* =============================================
                SEARCH SURFACE
            ============================================= */}

            <section className="shrink-0 rounded-[16px] border border-black/[0.08] bg-white px-4 py-[18px] shadow-[0_1px_2px_rgba(11,12,14,0.03)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-[9px]">
                  <Search className="size-[15px] shrink-0 text-[#002BBA]" />

                  <h2 className="whitespace-nowrap text-[14.5px] font-semibold tracking-[-0.015em]">
                    {
                      text.newSearch
                    }
                  </h2>

                  <span className="truncate text-[12px] text-[#6B7078]">
                    {
                      text.googlePlacesHint
                    }
                  </span>
                </div>

                <div className="flex shrink-0 rounded-[10px] bg-black/[0.045] p-[3px]">
                  <button
                    type="button"
                    onClick={() =>
                      setMode(
                        "criteria"
                      )
                    }
                    className={`h-[26px] rounded-[8px] px-3 text-[11.5px] transition-[background,color,box-shadow] ${
                      mode ===
                      "criteria"
                        ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,0.12)]"
                        : "text-[#6B7078]"
                    }`}
                  >
                    {
                      text.criteria
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMode(
                        "prompt"
                      )
                    }
                    className={`h-[26px] rounded-[8px] px-3 text-[11.5px] transition-[background,color,box-shadow] ${
                      mode ===
                      "prompt"
                        ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,0.12)]"
                        : "text-[#6B7078]"
                    }`}
                  >
                    {
                      text.prompt
                    }
                  </button>
                </div>
              </div>

              {activeCampaigns.length ===
              0 ? (
                <div className="mt-4 flex items-center justify-between gap-4 rounded-[12px] border border-dashed border-black/[0.10] bg-[#F7F8FA] px-4 py-3.5 max-[680px]:items-start max-[680px]:flex-col">
                  <p className="min-w-0 text-[12px] leading-5 text-[#6B7078]">
                    {text.createCampaign}
                  </p>
                  <Link
                    href="/campaigns/new"
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] bg-[#002BBA] px-3 text-[11.5px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,.25)] transition-colors hover:bg-[#00229A]"
                  >
                    <Megaphone className="size-3.5" />
                    {text.createCampaignAction}
                  </Link>
                </div>
              ) : mode ===
                "criteria" ? (
                <form
                  action={
                    runLeadSearch
                  }
                  className="mt-4"
                >
                  <div className="grid grid-cols-4 items-start gap-3 max-[1120px]:grid-cols-2 max-[720px]:grid-cols-1">
                    {/* CAMPAIGN */}

                    <div className="grid min-w-0 grid-rows-[14px_36px_minmax(32px,auto)]">
                      <label
                        htmlFor="leadbase-find-campaign"
                        className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]"
                      >
                        {
                          text.campaign
                        }
                      </label>

                      <div className="relative flex h-9 min-w-0 items-center gap-[9px] overflow-hidden rounded-[10px] border border-black/[0.09] bg-white px-[9px] transition-colors hover:border-black/[0.16]">
                        <Target className="size-3.5 shrink-0 text-[#002BBA]" />

                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                          {
                            selectedCampaign?.name ??
                            text.noCampaign
                          }
                        </span>

                        {selectedCampaign?.status ===
                        "ACTIVE" ? (
                          <span className="shrink-0 rounded-[6px] bg-[#EAEEFB] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-[#002BBA]">
                            {
                              text.active
                            }
                          </span>
                        ) : null}

                        <ChevronDown className="size-3 shrink-0 text-[#6B7078]" />

                        <select
                          id="leadbase-find-campaign"
                          name="campaignId"
                          value={
                            campaignId
                          }
                          onChange={(
                            event
                          ) =>
                            selectCampaign(
                              event.target
                                .value
                            )
                          }
                          className="absolute inset-0 cursor-pointer opacity-0"
                          required
                        >
                          {activeCampaigns.map(
                            (
                              campaign
                            ) => (
                              <option
                                key={
                                  campaign.id
                                }
                                value={
                                  campaign.id
                                }
                              >
                                {
                                  campaign.name
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <p className="pt-1.5 text-[10.5px] leading-4 text-[#6B7078]">
                        {
                          text.campaignHelp
                        }
                      </p>
                    </div>

                    {/* LIMIT */}

                    <div className="grid min-w-0 grid-rows-[14px_36px_minmax(32px,auto)]">
                      <label
                        htmlFor="leadbase-find-limit"
                        className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]"
                      >
                        {
                          text.results
                        }
                      </label>

                      <div className="relative flex h-9 items-center gap-[9px] rounded-[10px] border border-black/[0.09] bg-white px-[9px] transition-colors hover:border-black/[0.16]">
                        <span className="font-mono text-[12.5px] font-medium tabular-nums">
                          {
                            resultLimit
                          }
                        </span>

                        <span className="text-[12px] text-[#6B7078]">
                          {
                            text.companies
                          }
                        </span>

                        <ChevronDown className="ml-auto size-3 text-[#6B7078]" />

                        <select
                          id="leadbase-find-limit"
                          name="resultLimit"
                          value={
                            resultLimit
                          }
                          onChange={(
                            event
                          ) =>
                            setResultLimit(
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          className="absolute inset-0 cursor-pointer opacity-0"
                        >
                          {[
                            10,
                            15,
                            20,
                            25,
                            30,
                            40,
                            50,
                            60,
                          ].map(
                            (
                              value
                            ) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {
                                  value
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <p className="pt-1.5 text-[10.5px] leading-4 text-[#6B7078]">
                        {
                          text.limitHelp
                        }
                      </p>
                    </div>

                    {/* INDUSTRY */}

                    <div className="grid min-w-0 grid-rows-[14px_36px_minmax(32px,auto)]">
                      <label
                        htmlFor="leadbase-find-industry"
                        className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]"
                      >
                        {
                          text.industry
                        }
                      </label>

                      <div className="relative [&>div>div>svg:first-child]:hidden [&_input]:h-9 [&_input]:rounded-[10px] [&_input]:border-black/[0.09] [&_input]:bg-white [&_input]:pl-9 [&_input]:pr-9 [&_input]:text-[12.5px] [&_input]:shadow-none [&_input]:hover:border-black/[0.16] [&_input]:focus-visible:ring-[3px] [&_input]:focus-visible:ring-[#002BBA]/10">
                        <BriefcaseBusiness className="pointer-events-none absolute left-[11px] top-1/2 z-20 size-3.5 -translate-y-1/2 text-[#6B7078]" />

                        <IndustryAutocomplete
                          id="leadbase-find-industry"
                          name="industry"
                          value={
                            industry
                          }
                          onValueChange={
                            setIndustry
                          }
                          required
                        />
                      </div>

                      <p className="pt-1.5 text-[10.5px] leading-4 text-[#6B7078]">
                        {
                          text.industryHelp
                        }
                      </p>
                    </div>

                    {/* LOCATION */}

                    <div className="grid min-w-0 grid-rows-[14px_36px_minmax(32px,auto)]">
                      <label
                        htmlFor="leadbase-find-location"
                        className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]"
                      >
                        {
                          text.location
                        }
                      </label>

                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-[11px] top-1/2 z-10 size-3.5 -translate-y-1/2 text-[#6B7078]" />

                        <input
                          id="leadbase-find-location"
                          name="location"
                          value={
                            location
                          }
                          onChange={(
                            event
                          ) =>
                            setLocation(
                              event.target
                                .value
                            )
                          }
                          required
                          className="h-9 w-full rounded-[10px] border border-black/[0.09] bg-white pl-9 pr-2.5 text-[12.5px] outline-none transition-colors hover:border-black/[0.16] focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10"
                        />
                      </div>

                      <p className="pt-1.5 text-[10.5px] leading-4 text-[#6B7078]">
                        {
                          text.locationHelp
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3.5 rounded-[13px] bg-[linear-gradient(96deg,#002BBA,#1D3FCB)] px-3.5 py-3 text-white">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-white/70">
                        {
                          text.query
                        }
                      </div>

                      <div className="mt-[5px] truncate text-[15px] font-semibold tracking-[-0.015em]">
                        {
                          querySummary
                        }
                      </div>

                      <div className="mt-[3px] truncate text-[11.5px] text-white/80">
                        <span className="tabular-nums">
                          {
                            resultLimit
                          }
                        </span>{" "}
                        {
                          text.companies
                        }{" "}
                        ·{" "}
                        {
                          text.assigned
                        }{" "}
                        {
                          selectedCampaign?.name ??
                          text.noCampaign
                        }{" "}
                        {
                          text.assignedTail
                        }
                      </div>
                    </div>

                    <CriteriaSubmitButton
                      label={
                        text.findLeads
                      }
                    />
                  </div>
                </form>
              ) : (
                <form
                  onSubmit={
                    submitPrompt
                  }
                  className="mt-4"
                >
                  <div className="flex h-[52px] items-center gap-3 rounded-[12px] border border-black/[0.09] bg-[#F7F8FA] px-3">
                    <Sparkles className="size-4 shrink-0 text-[#002BBA]" />

                    <input
                      value={
                        prompt
                      }
                      onChange={(
                        event
                      ) =>
                        setPrompt(
                          event.target
                            .value
                        )
                      }
                      placeholder={
                        animatedPlaceholder.length >
                        0
                          ? animatedPlaceholder
                          : "\u00A0"
                      }
                      className="min-w-0 flex-1 bg-transparent text-[15px] tracking-[-0.01em] text-[#0B0C0E] outline-none placeholder:text-[#6B7078]"
                    />

                    <div className="relative flex h-8 max-w-[280px] shrink-0 items-center gap-2 rounded-[9px] border border-black/[0.09] bg-white px-2.5">
                      <Target className="size-3.5 shrink-0 text-[#002BBA]" />

                      <span className="truncate text-[12.5px] font-medium">
                        {
                          selectedCampaign?.name ??
                          text.noCampaign
                        }
                      </span>

                      <ChevronDown className="size-3 shrink-0 text-[#6B7078]" />

                      <select
                        value={
                          campaignId
                        }
                        onChange={(
                          event
                        ) =>
                          selectCampaign(
                            event.target
                              .value
                          )
                        }
                        className="absolute inset-0 cursor-pointer opacity-0"
                      >
                        {activeCampaigns.map(
                          (
                            campaign
                          ) => (
                            <option
                              key={
                                campaign.id
                              }
                              value={
                                campaign.id
                              }
                            >
                              {
                                campaign.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        promptLoading ||
                        !prompt.trim() ||
                        !campaignId
                      }
                      className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#002BBA] text-white shadow-[0_1px_2px_rgba(0,43,186,0.30)] transition-colors hover:bg-[#00229A] disabled:pointer-events-none disabled:opacity-40"
                    >
                      {promptLoading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-[auto_auto_auto_auto_minmax(190px,1fr)] items-center gap-2 max-[980px]:grid-cols-[auto_auto_auto_minmax(180px,1fr)]">
                    <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
                      {
                        text.examples
                      }
                    </span>

                    {[
                      text.exampleOne,
                      text.exampleTwo,
                      text.exampleThree,
                    ].map(
                      (
                        example
                      ) => (
                        <button
                          key={
                            example
                          }
                          type="button"
                          onClick={() =>
                            setPrompt(
                              example
                            )
                          }
                          className="shrink-0 rounded-[8px] border border-black/[0.07] bg-[#F7F8FA] px-2.5 py-1.5 text-[12px] text-[#40454E] transition-colors hover:border-[#002BBA]/35 hover:text-[#002BBA]"
                        >
                          {
                            example
                          }
                        </button>
                      )
                    )}

                    <span className="min-w-0 whitespace-normal text-right text-[11px] leading-4 text-[#6B7078]">
                      {
                        text.promptHint
                      }
                    </span>
                  </div>

                  {clarification ? (
                    <div className="mt-3 rounded-[10px] border border-black/[0.07] bg-[#F7F8FA] px-3 py-2.5">
                      <div className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-[#002BBA]">
                        {
                          text.aiClarification
                        }
                      </div>

                      <p className="mt-1 text-[11.5px] leading-5 text-[#40454E]">
                        {
                          clarification
                        }
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center gap-3.5 rounded-[13px] bg-[linear-gradient(96deg,#002BBA,#1D3FCB)] px-3.5 py-3 text-white">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-white/70">
                        {
                          text.query
                        }
                      </div>

                      <div className="mt-[5px] truncate text-[15px] font-semibold tracking-[-0.015em]">
                        {
                          querySummary
                        }
                      </div>

                      <div className="mt-[3px] truncate text-[11.5px] text-white/80">
                        {
                          selectedCampaign?.name ??
                          text.noCampaign
                        }
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        promptLoading ||
                        !prompt.trim() ||
                        !campaignId
                      }
                      className="flex h-9 shrink-0 items-center gap-2 rounded-[10px] bg-white px-4 text-[13px] font-semibold text-[#002BBA] transition-colors hover:bg-white/90 disabled:pointer-events-none disabled:opacity-60"
                    >
                      {promptLoading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Search className="size-3.5" />
                      )}

                      {
                        text.findLeads
                      }
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* =============================================
                RECENT SEARCHES
            ============================================= */}

            <section
              id="leadbase-find-leads-history"
              className={`flex flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,0.03)] ${runs.length === 0 ? "h-[210px] flex-none" : "min-h-[360px] flex-1"}`}
            >
              <div className="flex shrink-0 items-center justify-between gap-4 px-[18px] pb-3 pt-4">
                <div>
                  <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
                    {
                      text.recent
                    }
                  </h2>

                  <p className="mt-[3px] text-[11.5px] text-[#6B7078]">
                    {
                      text.recentDescription
                    }
                  </p>
                </div>

                <div className="flex items-center gap-3.5">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#6B7078]">
                    <span className="tabular-nums">
                      {
                        runs.length
                      }
                    </span>{" "}
                    {
                      text.runs
                    }{" "}
                    ·{" "}
                    <span className="tabular-nums">
                      {
                        recentHitCount
                      }
                    </span>{" "}
                    {
                      text.hits
                    }
                  </span>

                  <button
                    type="button"
                    onClick={
                      openHistory
                    }
                    className="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[11.5px] text-[#002BBA] transition-[background-color,color,transform] duration-150 hover:bg-[#EAEEFB] hover:text-[#001E85] active:scale-[0.98]"
                  >
                    {
                      text.all
                    }

                    <ExternalLink className="size-3" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto px-2.5 pb-2.5">
                {runs.length ===
                0 ? (
                  <div className="px-2 py-8">
                    <p className="text-[13px] font-medium">
                      {
                        language ===
                          "de"
                          ? "Noch keine Suchläufe"
                          : "No search runs yet"
                      }
                    </p>

                    <p className="mt-1 text-[11.5px] text-[#6B7078]">
                      {
                        language ===
                          "de"
                          ? "Starte oben deine erste Unternehmenssuche."
                          : "Start your first company search above."
                      }
                    </p>
                  </div>
                ) : (
                  runs.map(
                    (
                      run
                    ) => {
                      const ratio =
                        runRatio(
                          run
                        );

                      return (
                        <div
                          key={
                            run.id
                          }
                          className="grid grid-cols-[minmax(0,1fr)_148px_116px_104px_26px] items-center gap-x-3.5 rounded-[11px] px-2 py-[9px] transition-colors hover:bg-[#F7F8FA] max-[980px]:grid-cols-[minmax(0,1fr)_100px_90px_26px]"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openRunReview(
                                run.id
                              )
                            }
                            className="min-w-0 text-left"
                          >
                            <div className="truncate text-[12.5px] font-medium tracking-[-0.01em]">
                              {
                                run.query
                              }
                            </div>

                            <div className="mt-0.5 flex items-center gap-[7px] text-[10.5px] text-[#6B7078]">
                              <Target className="size-2.5 shrink-0" />

                              <span className="truncate">
                                {
                                  run.campaignName
                                }
                              </span>
                            </div>
                          </button>

                          <div className="whitespace-nowrap font-mono text-[10.5px] text-[#6B7078] max-[980px]:hidden">
                            {
                              run.when
                            }
                          </div>

                          <div>
                            <div className="flex items-baseline gap-[5px]">
                              <span className="font-mono text-[12px] font-medium tabular-nums">
                                {
                                  run.results
                                }
                              </span>

                              <span className="font-mono text-[10px] text-[#6B7078]">
                                /{" "}
                                {
                                  run.limit
                                }
                              </span>
                            </div>

                            <div className="mt-[5px] h-1 overflow-hidden rounded-full bg-black/[0.06]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width:
                                    `${Math.max(
                                      2,
                                      ratio *
                                        100
                                    )}%`,

                                  backgroundColor:
                                    barColor(
                                      ratio
                                    ),
                                }}
                              />
                            </div>
                          </div>

                          <div className="max-[980px]:hidden">
                            <span className={`whitespace-nowrap rounded-[6px] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] ${statusStyle(
                              run.status
                            )}`}>
                              {
                                statusLabel(
                                  run.status,
                                  language
                                )
                              }
                            </span>
                          </div>

                          <form
                            action={
                              runLeadSearch
                            }
                          >
                            <input
                              type="hidden"
                              name="campaignId"
                              value={
                                run.campaignId ??
                                ""
                              }
                            />

                            <input
                              type="hidden"
                              name="industry"
                              value={
                                run.industry
                              }
                            />

                            <input
                              type="hidden"
                              name="location"
                              value={
                                run.location
                              }
                            />

                            <input
                              type="hidden"
                              name="resultLimit"
                              value={
                                run.limit
                              }
                            />

                            <RepeatButton
                              run={
                                run
                              }
                              label={
                                text.repeat
                              }
                              compact
                            />
                          </form>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </section>
          </div>

          {/* ===============================================
              RIGHT RAIL
          =============================================== */}

          <aside className="flex w-[352px] shrink-0 flex-col gap-3.5 max-[1180px]:w-full max-[1180px]:grid max-[1180px]:grid-cols-3 max-[850px]:grid-cols-1">
            {/* LATEST RUN */}

            <section className="shrink-0 rounded-[16px] bg-[#0B0C0E] p-[18px] text-white max-[1180px]:min-h-[220px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[7px] font-mono text-[9.5px] uppercase tracking-[0.11em] text-white/60">
                  <History className="size-3" />

                  {
                    text.latest
                  }
                </div>

                {currentRun ? (
                  <span className={`rounded-[6px] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] ${
                    currentRun.status ===
                    "COMPLETED"
                      ? "bg-white/[0.14] text-white"
                      : currentRun.status ===
                        "RUNNING"
                        ? "bg-[#EAEEFB] text-[#002BBA]"
                        : "bg-[#FDF0E3] text-[#9A5106]"
                  }`}>
                    {
                      statusLabel(
                        currentRun.status,
                        language
                      )
                    }
                  </span>
                ) : null}
              </div>

              {currentRun ? (
                <>
                  <div className="mt-3.5">
                    <h2 className="text-[15px] font-semibold leading-[1.3] tracking-[-0.015em]">
                      {
                        currentRun.query
                      }
                    </h2>

                    <p className="mt-1.5 text-[11.5px] text-white/60">
                      {
                        currentRun.campaignName
                      }{" "}
                      ·{" "}
                      {
                        currentRun.when
                      }
                    </p>
                  </div>

                  <div className="mt-3.5 flex items-end gap-5">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.11em] text-white/60">
                        {
                          text.waitingForReview
                        }
                      </div>

                      <div className="mt-1 flex items-baseline gap-[5px]">
                        <span className="text-[26px] font-semibold tracking-[-0.03em] tabular-nums">
                          {
                            currentRun.discoveredCount
                          }
                        </span>

                        <span className="font-mono text-[11px] text-white/60">
                          {
                            text.of
                          }{" "}
                          {
                            currentRun.results
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 pb-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.14]">
                        <div
                          className="h-full rounded-full bg-[#3B5BE0]"
                          style={{
                            width:
                              `${Math.min(
                                100,
                                currentRun.results >
                                0
                                  ? (
                                      currentRun.discoveredCount /
                                      currentRun.results
                                    ) *
                                    100
                                  : 0
                              )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-1.5 text-[10.5px] text-white/60">
                        <span className="tabular-nums">
                          {
                            currentRun.savedCount
                          }
                        </span>{" "}
                        {
                          text.alreadyInCrm
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openRunReview(
                          currentRun.id
                        )
                      }
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-white text-[12.5px] font-medium text-[#0B0C0E] transition-colors hover:bg-white/90"
                    >
                      <Check className="size-3.5" />

                      {
                        text.reviewResults
                      }
                    </button>

                    <form
                      action={
                        runLeadSearch
                      }
                    >
                      <input
                        type="hidden"
                        name="campaignId"
                        value={
                          currentRun.campaignId ??
                          ""
                        }
                      />

                      <input
                        type="hidden"
                        name="industry"
                        value={
                          currentRun.industry
                        }
                      />

                      <input
                        type="hidden"
                        name="location"
                        value={
                          currentRun.location
                        }
                      />

                      <input
                        type="hidden"
                        name="resultLimit"
                        value={
                          currentRun.limit
                        }
                      />

                      <RepeatButton
                        run={
                          currentRun
                        }
                        label={
                          text.repeat
                        }
                      />
                    </form>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-[12px] text-white/60">
                  {
                    language ===
                      "de"
                      ? "Noch kein Suchlauf vorhanden."
                      : "No search run yet."
                  }
                </p>
              )}
            </section>

            {/* TARGET CAMPAIGN */}

            <section className="shrink-0 rounded-[16px] border border-black/[0.08] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(11,12,14,0.03)]">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
                  {
                    text.targetCampaign
                  }
                </div>

                {selectedCampaign?.status ===
                "ACTIVE" ? (
                  <span className="flex items-center gap-[5px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#002BBA]">
                    <span className="size-[5px] rounded-full bg-[#002BBA]" />

                    {
                      text.active
                    }
                  </span>
                ) : null}
              </div>

              <h2 className="mt-2.5 text-[14px] font-semibold tracking-[-0.015em]">
                {
                  selectedCampaign?.name ??
                  text.noCampaign
                }
              </h2>

              <div className="mt-3">
                {[
                  {
                    label:
                      text.leadsInCampaign,

                    value:
                      String(
                        selectedCampaign?.leadCount ??
                        0
                      ),

                    mono:
                      true,
                  },
                  {
                    label:
                      text.industry,

                    value:
                      selectedCampaign?.targetIndustry ??
                      "—",
                  },
                  {
                    label:
                      text.location,

                    value:
                      selectedCampaign?.targetGeography ??
                      "—",
                  },
                  {
                    label:
                      text.source,

                    value:
                      "Google Places",
                  },
                ].map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item.label
                      }
                      className="flex items-center justify-between gap-3 border-t border-black/[0.07] py-[9px]"
                    >
                      <span className="text-[11.5px] text-[#6B7078]">
                        {
                          item.label
                        }
                      </span>

                      <span className={`max-w-[210px] truncate text-right text-[11.5px] font-medium ${item.mono ? "font-mono tabular-nums" : ""}`}>
                        {
                          item.value
                        }
                      </span>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* BAR CHART */}

            <section className={`flex flex-col rounded-[16px] border border-black/[0.08] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(11,12,14,0.03)] max-[1180px]:min-h-[248px] ${runs.length === 0 ? "min-h-[248px] flex-none" : "min-h-0 flex-1"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">
                    {
                      text.hitsPerRun
                    }
                  </h2>

                  <p className="mt-[3px] text-[11.5px] text-[#6B7078]">
                    {
                      text.lastRuns
                    }{" "}
                    <span className="tabular-nums">
                      {
                        runs.length
                      }
                    </span>{" "}
                    {
                      text.searches
                    }{" "}
                    ·{" "}
                    {
                      text.resultAgainstLimit
                    }
                  </p>
                </div>

                <div className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#6B7078]">
                  {
                    text.average
                  }{" "}
                  <span className="tabular-nums">
                    {
                      averageResults.toLocaleString(
                        language ===
                          "de"
                          ? "de-DE"
                          : "en-GB",
                        {
                          maximumFractionDigits:
                            1,
                        }
                      )
                    }
                  </span>
                </div>
              </div>

              <div className="mt-4 flex min-h-[118px] flex-1 items-end gap-2">
                {runs.length === 0 ? (
                  <div className="flex h-full w-full items-center rounded-[10px] bg-[#F7F8FA] px-3.5">
                    <div>
                      <p className="text-[12px] font-medium text-[#0B0C0E]">{text.noChartData}</p>
                      <p className="mt-1 text-[10.5px] leading-4 text-[#6B7078]">
                        {language === "de" ? "Nach deiner ersten Suche erscheint hier der Vergleich der Treffer pro Lauf." : "After your first search, the hit comparison per run will appear here."}
                      </p>
                    </div>
                  </div>
                ) : runs.map(
                  (
                    run
                  ) => {
                    const ratio =
                      runRatio(
                        run
                      );

                    return (
                      <div
                        key={
                          run.id
                        }
                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                        title={`${run.query} · ${run.results}/${run.limit}`}
                      >
                        <span className="font-mono text-[9.5px] tabular-nums text-[#6B7078]">
                          {
                            run.results
                          }
                        </span>

                        <div
                          className="w-full rounded-t-[5px] rounded-b-[3px]"
                          style={{
                            height:
                              `${Math.max(
                                7,
                                ratio *
                                  100
                              )}%`,

                            backgroundColor:
                              barColor(
                                ratio
                              ),
                          }}
                        />
                      </div>
                    );
                  }
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-black/[0.07] pt-3">
                <span className="text-[11px] text-[#6B7078]">
                  {
                    text.bestRun
                  }:{" "}
                  <strong className="font-medium text-[#0B0C0E]">
                    {
                      shortBestRunLabel(
                        bestRun
                      )
                    }
                  </strong>
                </span>

                <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[#6B7078]">
                  {
                    text.limitUsually
                  }{" "}
                  <span className="tabular-nums">
                    {
                      commonLimit
                    }
                  </span>
                </span>
              </div>
            </section>
          </aside>
        </div>
      </div>

      {/* ===================================================
          COMPLETE SEARCH HISTORY
      =================================================== */}

      <Dialog
        open={
          historyOpen
        }
        onOpenChange={
          setHistoryOpen
        }
      >
        <DialogContent className="flex max-h-[82dvh] w-[min(860px,94vw)] max-w-none flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-black/[0.07] px-[18px] pb-4 pt-[18px]">
            <div className="flex items-start justify-between gap-5 pr-8">
              <div>
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.02em]">
                  {
                    text.allRunsTitle
                  }
                </DialogTitle>

                <DialogDescription className="mt-1 text-[11.5px] leading-5 text-[#6B7078]">
                  {
                    text.allRunsDescription
                  }
                </DialogDescription>
              </div>

              <div className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#6B7078]">
                <span className="tabular-nums">
                  {
                    historyTotal
                  }
                  {historyHasMore ? "+" : ""}
                </span>{" "}
                {
                  text.runs
                }
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5">
            {historyLoading &&
            historyRuns.length ===
              0 ? (
              <div className="flex min-h-[220px] items-center justify-center gap-2 text-[11.5px] text-[#6B7078]">
                <Loader2 className="size-3.5 animate-spin" />

                {
                  text.loadingHistory
                }
              </div>
            ) : historyError &&
              historyRuns.length ===
                0 ? (
              <div className="px-2 py-8">
                <p className="text-[13px] font-medium">
                  {
                    text.historyLoadError
                  }
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void loadHistoryPage(
                      0
                    )
                  }
                  className="mt-3 h-8 rounded-[9px] border border-black/[0.09] bg-white px-3 text-[11.5px] text-[#40454E] hover:border-black/[0.16]"
                >
                  {
                    text.repeat
                  }
                </button>
              </div>
            ) : historyRuns.length ===
              0 ? (
              <div className="px-2 py-8">
                <p className="text-[13px] font-medium">
                  {
                    text.noHistory
                  }
                </p>
              </div>
            ) : (
              <div>
                {historyRuns.map(
                  (
                    run
                  ) => {
                    const ratio =
                      Math.max(
                        0,
                        Math.min(
                          1,
                          run.results /
                            Math.max(
                              1,
                              run.limit
                            )
                        )
                      );

                    return (
                      <div
                        key={
                          run.id
                        }
                        className="grid grid-cols-[minmax(0,1fr)_150px_116px_104px] items-center gap-x-4 rounded-[11px] px-2.5 py-2.5 transition-colors hover:bg-[#F7F8FA] max-[700px]:grid-cols-[minmax(0,1fr)_95px]"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setHistoryOpen(
                              false
                            );

                            openRunReview(
                              run.id
                            );
                          }}
                          className="min-w-0 text-left"
                        >
                          <div className="truncate text-[12.5px] font-medium tracking-[-0.01em]">
                            {
                              run.query
                            }
                          </div>

                          <div className="mt-0.5 flex items-center gap-[7px] text-[10.5px] text-[#6B7078]">
                            <Target className="size-2.5 shrink-0" />

                            <span className="truncate">
                              {
                                run.campaignName
                              }
                            </span>
                          </div>
                        </button>

                        <div className="whitespace-nowrap font-mono text-[10.5px] text-[#6B7078] max-[700px]:hidden">
                          {
                            formatHistoryDate(
                              run.createdAt,
                              language
                            )
                          }
                        </div>

                        <div>
                          <div className="flex items-baseline gap-[5px]">
                            <span className="font-mono text-[12px] font-medium tabular-nums">
                              {
                                run.results
                              }
                            </span>

                            <span className="font-mono text-[10px] text-[#6B7078]">
                              /{" "}
                              {
                                run.limit
                              }
                            </span>
                          </div>

                          <div className="mt-[5px] h-1 overflow-hidden rounded-full bg-black/[0.06]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width:
                                  `${Math.max(
                                    2,
                                    ratio *
                                      100
                                  )}%`,

                                backgroundColor:
                                  barColor(
                                    ratio
                                  ),
                              }}
                            />
                          </div>
                        </div>

                        <div className="max-[700px]:hidden">
                          <span className={`whitespace-nowrap rounded-[6px] px-[7px] py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] ${statusStyle(
                            run.status
                          )}`}>
                            {
                              statusLabel(
                                run.status,
                                language
                              )
                            }
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}

                {historyHasMore ? (
                  <div className="flex justify-center border-t border-black/[0.07] px-3 pb-2 pt-3">
                    <button
                      type="button"
                      disabled={
                        historyLoading
                      }
                      onClick={() =>
                        void loadHistoryPage(
                          historyRuns.length
                        )
                      }
                      className="flex h-8 items-center gap-2 rounded-[9px] border border-black/[0.09] bg-white px-3 text-[11.5px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] disabled:pointer-events-none disabled:opacity-60"
                    >
                      {historyLoading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <History className="size-3.5 opacity-60" />
                      )}

                      {
                        text.loadMore
                      }
                    </button>
                  </div>
                ) : null}

                {historyError ? (
                  <p className="px-3 py-2 text-center text-[10.5px] text-[#9A5106]">
                    {
                      historyError
                    }
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================================================
          REVIEW SHEET
      =================================================== */}

      <Sheet
        open={
          reviewOpen
        }
        onOpenChange={
          setReviewOpen
        }
      >
        <SheetContent
          side="right"
          className="w-[min(520px,94vw)]"
        >
          <SheetHeader>
            <SheetTitle>
              {
                text.reviewTitle
              }
            </SheetTitle>

            <SheetDescription>
              {
                currentRun?.query ??
                text.reviewDescription
              }
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
            {candidates.length ===
            0 ? (
              <div className="rounded-[12px] border border-black/[0.08] bg-[#F7F8FA] p-4">
                <p className="text-[13px] font-medium">
                  {
                    text.noCandidates
                  }
                </p>

                <p className="mt-1 text-[11.5px] leading-5 text-[#6B7078]">
                  {
                    text.reviewDescription
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {candidates.map(
                  (
                    candidate
                  ) => (
                    <article
                      key={
                        candidate.id
                      }
                      className="rounded-[14px] border border-black/[0.08] bg-white p-4 shadow-[0_1px_2px_rgba(11,12,14,0.03)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">
                            {
                              candidate.name
                            }
                          </h3>

                          {candidate.primaryType ? (
                            <p className="mt-1 truncate text-[11px] text-[#6B7078]">
                              {
                                candidate.primaryType
                              }
                            </p>
                          ) : null}
                        </div>

                        {candidate.rating !==
                        null ? (
                          <div className="flex shrink-0 items-center gap-1 rounded-[8px] border border-black/[0.08] px-2 py-1 font-mono text-[10.5px]">
                            <Star className="size-3" />

                            {
                              candidate.rating
                            }

                            {candidate.reviewCount !==
                            null ? (
                              <span className="text-[#6B7078]">
                                (
                                {
                                  candidate.reviewCount
                                }
                                )
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {candidate.address ? (
                        <div className="mt-3 flex items-start gap-2 text-[11.5px] leading-5 text-[#6B7078]">
                          <MapPin className="mt-0.5 size-3.5 shrink-0" />

                          <span>
                            {
                              candidate.address
                            }
                          </span>
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {candidate.websiteUrl ? (
                          <a
                            href={
                              candidate.websiteUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 items-center gap-1.5 rounded-[9px] border border-black/[0.09] px-2.5 text-[11.5px] text-[#40454E] hover:border-black/[0.16]"
                          >
                            <Globe2 className="size-3.5 opacity-60" />

                            {
                              text.website
                            }
                          </a>
                        ) : null}

                        {candidate.mapsUrl ? (
                          <a
                            href={
                              candidate.mapsUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 items-center gap-1.5 rounded-[9px] border border-black/[0.09] px-2.5 text-[11.5px] text-[#40454E] hover:border-black/[0.16]"
                          >
                            <MapPin className="size-3.5 opacity-60" />

                            {
                              text.maps
                            }
                          </a>
                        ) : null}

                        {candidate.phone ? (
                          <a
                            href={`tel:${candidate.phone}`}
                            className="flex h-8 items-center gap-1.5 rounded-[9px] border border-black/[0.09] px-2.5 text-[11.5px] text-[#40454E] hover:border-black/[0.16]"
                          >
                            {
                              text.phone
                            }:{" "}
                            {
                              candidate.phone
                            }
                          </a>
                        ) : null}
                      </div>

                      <CandidateActions
                        candidateId={
                          candidate.id
                        }
                      />
                    </article>
                  )
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
