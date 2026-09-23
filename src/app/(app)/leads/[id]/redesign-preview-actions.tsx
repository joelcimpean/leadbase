"use client";

import Link from "next/link";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Eye,
  Film,
  ImagePlus,
  Link2,
  Link2Off,
  LockKeyhole,
  Loader2,
  MapPin,
  MousePointer2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
    PreviewGifActions,
  } from "./preview-gif-actions";

import {
  createPortal,
} from "react-dom";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  CreditEstimatePill,
  designCreditEstimate,
} from "@/components/credit-estimate-pill";
import { useLeadbasePlan } from "@/hooks/use-leadbase-plan";

import {
  DESIGN_MODEL_OPTIONS,
  isDesignModelOption,
  type DesignMotionPreset,
  type DesignReasoningEffort,
} from "@/lib/design-generation-options";

import type {
  LeadbaseDesignDefaults,
} from "@/lib/design-defaults";
import { planAllowsFeature } from "@/lib/plan-entitlements";

/* =========================================================
   TYPES
========================================================= */

type RedesignPreviewActionsProps = {
  leadId:
    string;

  initialPreviewToken:
    | string
    | null;

  initialGenerationIndex:
    number;

  initialDesignDefaults:
    LeadbaseDesignDefaults;
};

type DesignVariant = {
  id:
    string;

  generationIndex:
    number;

  previewUrl:
    string;

  chatId:
    string;

  selected:
    boolean;

  selectedAt:
    | string
    | null;

  createdAt:
    string;

  motionApplied?:
    boolean;

  motionSourceGenerationIndex?:
    number | null;
};

type DesignResponse = {
  ok?:
    boolean;

  error?:
    string;

  exists?:
    boolean;

  generated?:
    boolean;

  previewId?:
    string;

  previewUrl?:
    string;

  selectedPreviewId?:
    string;

  selectedPreviewUrl?:
    string;

  generationIndex?:
    number;

  variants?:
    DesignVariant[];
};

type GenerateOptions = {
  motionPresetOverride?:
    DesignMotionPreset;
};

function getVariantBaseNumber(
  variant:
    DesignVariant
) {
  return variant.motionApplied &&
    variant.motionSourceGenerationIndex
    ? variant.motionSourceGenerationIndex
    : variant.generationIndex;
}

function buildVariantNumberMap(
  variants:
    DesignVariant[]
) {
  const numbers =
    new Map<
      string,
      string
    >();

  const motionCounts =
    new Map<
      number,
      number
    >();

  const ordered =
    [...variants].sort(
      (
        a,
        b
      ) =>
        a.generationIndex -
          b.generationIndex ||
        new Date(
          a.createdAt
        ).getTime() -
          new Date(
            b.createdAt
          ).getTime()
    );

  for (
    const variant of
      ordered
  ) {
    const baseNumber =
      getVariantBaseNumber(
        variant
      );

    if (
      !variant.motionApplied
    ) {
      numbers.set(
        variant.id,
        String(
          variant.generationIndex
        )
      );
      continue;
    }

    const nextCount =
      (motionCounts.get(
        baseNumber
      ) ?? 0) + 1;

    motionCounts.set(
      baseNumber,
      nextCount
    );

    numbers.set(
      variant.id,
      `${baseNumber}.${nextCount}`
    );
  }

  return numbers;
}

function getVariantDisplayName({
  variant,
  variantLabel,
  language,
  numberMap,
}: {
  variant:
    DesignVariant | null | undefined;
  variantLabel:
    string;
  language:
    "de" | "en";
  numberMap:
    Map<
      string,
      string
    >;
}) {
  if (
    !variant
  ) {
    return variantLabel;
  }

  const number =
    numberMap.get(
      variant.id
    ) ??
    String(
      getVariantBaseNumber(
        variant
      )
    );

  return `${variantLabel} ${number}${variant.motionApplied ? language === "de" ? " mit Motion" : " with motion" : ""}`;
}

type MotionEnhanceResponse = {
  ok?: boolean;
  error?: string;
  previewId?: string;
  model?: string;
};

type ShareResponse = {
  ok?:
    boolean;

  error?:
    string;

  shared?:
    boolean;

  previewId?:
    string;

  publicSlug?:
    string;

  shareUrl?:
    string;

  viewCount?:
    number;

  lastViewedAt?:
    | string
    | null;

  createdAt?:
    string;

  expiresAt?:
    | string
    | null;
};

type PreviewVisitSummary = {
  legacyViewCount?:
    number;

  externalSessions?:
    number;

  externalVisitors?:
    number;

  ownerSessions?:
    number;

  outreachSessions?:
    number;

  engagedExternalSessions?:
    number;

  lastViewedAt?:
    | string
    | null;
};

type PreviewVisit = {
  id:
    string;

  visitor_id:
    string;

  session_id:
    string;

  source:
    | "OWNER"
    | "OUTREACH"
    | "DIRECT";

  is_owner:
    boolean;

  is_engaged:
    boolean;

  first_seen_at:
    string;

  last_seen_at:
    string;

  engaged_at:
    | string
    | null;

  duration_seconds:
    number;

  max_scroll_percent:
    number;

  interaction_count:
    number;

  country_code:
    | string
    | null;

  country_region:
    | string
    | null;

  city:
    | string
    | null;

  timezone:
    | string
    | null;

  device_type:
    | string
    | null;

  browser_name:
    | string
    | null;

  os_name:
    | string
    | null;
};

type PreviewVisitsResponse = {
  ok?:
    boolean;

  error?:
    string;

  summary?:
    PreviewVisitSummary;

  visits?:
    PreviewVisit[];
};

/* =========================================================
   COPY
========================================================= */

const copy = {
  de: {
    studioEyebrow:
      "Design Studio",

    studioTitle:
      "Design & Kundenvorschau",

    studioDescription:
      "Variante auswählen, Design bearbeiten und anschließend genau diese Version für den Kunden freigeben.",

    designVariantTitle:
      "Designvariante",

    designVariantDescription:
      "Die ausgewählte Variante wird für Outreach und Vorschau verwendet.",

    customerPreviewTitle:
      "Kundenvorschau",

    customerPreviewDescription:
      "Link ist aktiv und Besuchssignale werden getrennt ausgewertet.",

    generationTimedOut:
      "Die Design-Erstellung hat zu lange gedauert und wurde nach 3,5 Minuten abgebrochen. Bitte erneut versuchen oder die Qualität reduzieren.",

    motionFailed:
      "Die Motion-Effekte konnten nicht hinzugefügt werden.",

    motionDone:
      "Motion-Version erstellt. Das Original bleibt unverändert.",

    generate:
      "Redesign erstellen",

    generating:
      "Website wird gestaltet...",

    open:
      "Design öffnen",

    edit:
      "Design bearbeiten",

    regenerate:
      "Neue Variante",

    generationSettings:
      "Generierungseinstellungen",

    generationSettingsDescription:
      "Wähle Modell, Qualitätsstufe und Inspirationen für dieses Design.",

    settingsHidden:
      "Einstellungen ausblenden",

    settingsVisible:
      "Einstellungen anzeigen",

    modelLabel:
      "Design-KI",

    reasoningLabel:
      "Qualität",

    motionLabel:
      "Motion",

    inspirationLabel:
      "Inspiration / Briefing",

    inspirationPlaceholder:
      "z. B. weniger SaaS, mehr editorial, ruhiger premium Look, stärkere Typografie, bessere Hero-Komposition...",

    inspirationLinksLabel:
      "Inspiration-Links",

    inspirationLinksPlaceholder:
      "https://site-1.com\nhttps://site-2.com",

    inspirationImagesLabel:
      "Bild-URLs",

    inspirationImagesPlaceholder:
      "https://example.com/reference-1.jpg",

    modelHelp:
      "Astra für Premium-Designs, Sol/Terra/Luna für schnellere Runs.",

    reasoningLow:
      "Schnell",

    reasoningMedium:
      "High",

    reasoningHigh:
      "Max",

    motionNone:
      "Keine",

    motionSubtle:
      "Subtil",

    motionPremium:
      "Premium",

    enhanceMotion:
      "Enhance Motion",

    motionGenerating:
      "AI analysiert das ausgewählte Design und erstellt die Motion-Version...",

    designModelFailed:
      "Das gewählte Modell konnte nicht verwendet werden.",

    failed:
      "Das Redesign konnte nicht erstellt werden.",

    variants:
      "Designvarianten",

    variant:
      "Variante",

    selected:
      "Für Outreach",

    select:
      "Für Outreach auswählen",

    selecting:
      "Wird ausgewählt...",

    createClientPreview:
      "Kunden-Vorschau erstellen",

    creatingClientPreview:
      "Kunden-Vorschau wird erstellt...",

    copyClientLink:
      "Kunden-Link kopieren",

    copiedClientLink:
      "Link kopiert",

    openClientPreview:
      "Kunden-Vorschau öffnen",

    deactivateClientPreview:
      "Kunden-Vorschau deaktivieren",

    shareFailed:
      "Die Kunden-Vorschau konnte nicht erstellt werden.",

    deactivateFailed:
      "Die Kunden-Vorschau konnte nicht deaktiviert werden.",

    active:
      "Kunden-Vorschau aktiv",

    view:
      "Aufruf",

    views:
      "Aufrufe",

    external:
      "extern",

    own:
      "eigene",

    outreach:
      "aus Mail",

    visitDetails:
      "Besuchsdetails",

    visitDetailsTitle:
      "Vorschau-Besuche",

    visitDetailsDescription:
      "Hier siehst du getrennt, welche Aufrufe von deinem eingeloggten Leadbase-Browser kamen und welche extern waren.",

    refresh:
      "Aktualisieren",

    externalVisitors:
      "Externe Besucher",

    outreachVisits:
      "Outreach-Aufrufe",

    engaged:
      "Engagiert",

    ownViews:
      "Deine Aufrufe",

    likelyCustomer:
      "Wahrscheinlich Kunde",

    outreachLink:
      "Aus Outreach-Mail",

    externalVisitor:
      "Externer Besucher",

    directView:
      "Direkter Aufruf",

    yourView:
      "Du · Eigenaufruf",

    noDetailedVisits:
      "Noch keine zugeordneten Besuche",

    noDetailedVisitsDescription:
      "Das detaillierte Tracking beginnt erst ab dem neuen Tracking-System. Frühere Aufrufe können nicht rückwirkend dir oder einem Kunden zugeordnet werden.",

    legacyCounter:
      "Bisheriger einfacher Aufrufzähler",

    legacyCounterDescription:
      "Dieser alte Zähler konnte eigene und externe Aufrufe nicht unterscheiden.",

    locationUnknown:
      "Standort unbekannt",

    visible:
      "sichtbar",

    scroll:
      "Scroll",

    actions:
      "Aktionen",

    trackingUnavailable:
      "Besuchsdetails konnten nicht geladen werden.",
  },

  en: {
    studioEyebrow:
      "Design Studio",

    studioTitle:
      "Design & client preview",

    studioDescription:
      "Choose a variation, edit the design, then publish exactly that version for the client.",

    designVariantTitle:
      "Design variation",

    designVariantDescription:
      "The selected variation is used for outreach and the client preview.",

    customerPreviewTitle:
      "Client preview",

    customerPreviewDescription:
      "The link is active and visit signals are tracked separately.",

    generationTimedOut:
      "Design generation took too long and was stopped after 3.5 minutes. Try again or reduce the quality level.",

    motionFailed:
      "Motion effects could not be added.",

    motionDone:
      "Motion version created. The original stays unchanged.",

    generate:
      "Create redesign",

    generating:
      "Designing website...",

    open:
      "Open design",

    edit:
      "Edit design",

    regenerate:
      "New variation",

    generationSettings:
      "Generation settings",

    generationSettingsDescription:
      "Choose the model, quality level, and inspiration inputs for this design.",

    settingsHidden:
      "Hide settings",

    settingsVisible:
      "Show settings",

    modelLabel:
      "Design AI",

    reasoningLabel:
      "Quality",

    motionLabel:
      "Motion",

    inspirationLabel:
      "Inspiration / brief",

    inspirationPlaceholder:
      "e.g. less SaaS, more editorial, quiet premium look, stronger typography, better hero composition...",

    inspirationLinksLabel:
      "Inspiration links",

    inspirationLinksPlaceholder:
      "https://site-1.com\nhttps://site-2.com",

    inspirationImagesLabel:
      "Image URLs",

    inspirationImagesPlaceholder:
      "https://example.com/reference-1.jpg",

    modelHelp:
      "Use Astra for premium designs; Sol, Terra, or Luna for faster runs.",

    reasoningLow:
      "Fast",

    reasoningMedium:
      "High",

    reasoningHigh:
      "Max",

    motionNone:
      "None",

    motionSubtle:
      "Subtle",

    motionPremium:
      "Premium",

    enhanceMotion:
      "Enhance Motion",

    motionGenerating:
      "AI is analyzing the selected design and building the motion version...",

    designModelFailed:
      "The selected model could not be used.",

    failed:
      "The redesign could not be generated.",

    variants:
      "Design variations",

    variant:
      "Variation",

    selected:
      "For outreach",

    select:
      "Select for outreach",

    selecting:
      "Selecting...",

    createClientPreview:
      "Create client preview",

    creatingClientPreview:
      "Creating client preview...",

    copyClientLink:
      "Copy client link",

    copiedClientLink:
      "Link copied",

    openClientPreview:
      "Open client preview",

    deactivateClientPreview:
      "Disable client preview",

    shareFailed:
      "The client preview could not be created.",

    deactivateFailed:
      "The client preview could not be disabled.",

    active:
      "Client preview active",

    view:
      "view",

    views:
      "views",

    external:
      "external",

    own:
      "yours",

    outreach:
      "from email",

    visitDetails:
      "Visit details",

    visitDetailsTitle:
      "Preview visits",

    visitDetailsDescription:
      "See which visits came from your logged-in Leadbase browser and which were external.",

    refresh:
      "Refresh",

    externalVisitors:
      "External visitors",

    outreachVisits:
      "Outreach visits",

    engaged:
      "Engaged",

    ownViews:
      "Your visits",

    likelyCustomer:
      "Likely customer",

    outreachLink:
      "From outreach email",

    externalVisitor:
      "External visitor",

    directView:
      "Direct visit",

    yourView:
      "You · Own visit",

    noDetailedVisits:
      "No attributed visits yet",

    noDetailedVisitsDescription:
      "Detailed tracking only starts with the new tracking system. Older views cannot be attributed retroactively.",

    legacyCounter:
      "Previous simple view counter",

    legacyCounterDescription:
      "The old counter could not distinguish your own views from external visitors.",

    locationUnknown:
      "Location unknown",

    visible:
      "visible",

    scroll:
      "Scroll",

    actions:
      "actions",

    trackingUnavailable:
      "Visit details could not be loaded.",
  },
} as const;

/* =========================================================
   HELPERS
========================================================= */

function getConceptSlug(
  value:
    string
    | null
) {
  if (
    !value
  ) {
    return null;
  }

  try {
    const url =
      new URL(
        value
      );

    const match =
      url.pathname.match(
        /^\/concept\/([^/]+)/
      );

    return match?.[1]
      ? decodeURIComponent(
          match[1]
        )
      : null;
  } catch {
    const match =
      value.match(
        /\/concept\/([^/?#]+)/
      );

    return match?.[1]
      ? decodeURIComponent(
          match[1]
        )
      : null;
  }
}

function formatVisitDate(
  value:
    string,
  language:
    "de"
    | "en"
) {
  try {
    return new Intl.DateTimeFormat(
      language ===
        "de"
        ? "de-DE"
        : "en-US",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        year:
          "2-digit",

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
  } catch {
    return value;
  }
}

function formatDuration(
  seconds:
    number,
  language:
    "de"
    | "en"
) {
  if (
    seconds <
      60
  ) {
    return `${seconds}s`;
  }

  const minutes =
    Math.floor(
      seconds /
        60
    );

  const rest =
    seconds %
    60;

  if (
    rest ===
      0
  ) {
    return language ===
      "de"
      ? `${minutes} Min.`
      : `${minutes} min`;
  }

  return language ===
    "de"
    ? `${minutes} Min. ${rest}s`
    : `${minutes} min ${rest}s`;
}

function getVisitLocation(
  visit:
    PreviewVisit,
  fallback:
    string
) {
  const parts =
    [
      visit.city,
      visit.country_region,
      visit.country_code,
    ].filter(
      (
        value
      ): value is string =>
        Boolean(
          value
        )
    );

  return parts.length >
    0
    ? parts.join(
        ", "
      )
    : fallback;
}

function parseLines(
  value:
    string
) {
  return value
    .split(/\r?\n/)
    .map((entry) =>
      entry.trim()
    )
    .filter(Boolean);
}

function getModelLabel(
  model:
    string
) {
  switch (model) {
    case "gpt-6-astra":
      return "GPT-6 Astra";

    case "gpt-5.6-sol":
      return "GPT-5.6 Sol";

    case "gpt-5.6-terra":
      return "GPT-5.6 Terra";

    case "gpt-5.6-luna":
      return "GPT-5.6 Luna";

    case "gpt-5-mini":
      return "GPT-5 Mini";

    default:
      return model;
  }
}

function getReasoningLabel(
  value:
    DesignReasoningEffort,
  text:
    (typeof copy)[keyof typeof copy]
) {
  switch (value) {
    case "low":
      return text.reasoningLow;

    case "medium":
      return text.reasoningMedium;

    case "high":
    default:
      return text.reasoningHigh;
  }
}

function getMotionLabel(
  value:
    DesignMotionPreset,
  text:
    (typeof copy)[keyof typeof copy]
) {
  switch (value) {
    case "subtle":
      return text.motionSubtle;

    case "premium":
      return text.motionPremium;

    case "none":
    default:
      return text.motionNone;
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export function RedesignPreviewActions({
  leadId,
  initialGenerationIndex,
  initialDesignDefaults,
}: RedesignPreviewActionsProps) {
  const {
    language,
  } =
    useLanguage();

  const text =
    copy[
      language
    ];

  const {
    planId,
    entitlements,
    remainingCredits,
    loading: planLoading,
  } = useLeadbasePlan();

  const freeDesignLocked = !planLoading && planId === "free";
  const noCredits =
    !planLoading &&
    planId !== "free" &&
    remainingCredits !== null &&
    remainingCredits <= 0;

  const canGenerateDesign =
    planAllowsFeature(planId, "design_generation");
  const canUseMotion =
    planAllowsFeature(planId, "design_motion");
  const allowedDesignModels = useMemo(
    () => new Set(entitlements.userSelectableDesignModels),
    [entitlements.userSelectableDesignModels]
  );
  const reasoningOrder = ["low", "medium", "high"] as const;
  const maxReasoningIndex = Math.max(
    0,
    reasoningOrder.indexOf(
      entitlements.maxDesignReasoning as (typeof reasoningOrder)[number]
    )
  );
  const isReasoningAllowed = (value: DesignReasoningEffort) =>
    reasoningOrder.indexOf(value) <= maxReasoningIndex;

  const dropdownRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /* =======================================================
     DESIGNS
  ======================================================= */

  const [
    variants,
    setVariants,
  ] =
    useState<
      DesignVariant[]
    >(
      []
    );

  const [
    generationIndex,
    setGenerationIndex,
  ] =
    useState(
      initialGenerationIndex
    );

  const [
    loadingDesigns,
    setLoadingDesigns,
  ] =
    useState(
      true
    );

  const [
    generating,
    setGenerating,
  ] =
    useState(
      false
    );

  const [
    motionEnhancing,
    setMotionEnhancing,
  ] =
    useState(
      false
    );

  const [
    motionMessage,
    setMotionMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    selectingId,
    setSelectingId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    variantsOpen,
    setVariantsOpen,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    settingsOpen,
    setSettingsOpen,
  ] =
    useState(
      false
    );

  const [
    designModel,
    setDesignModel,
  ] =
    useState(
      initialDesignDefaults.designModel
    );

  const [
    reasoningEffort,
    setReasoningEffort,
  ] =
    useState<
      DesignReasoningEffort
    >(
      initialDesignDefaults.reasoningEffort
    );

  const [
    motionPreset,
    setMotionPreset,
  ] =
    useState<
      DesignMotionPreset
    >(
      initialDesignDefaults.motionPreset
    );

  const [
    inspirationMemo,
    setInspirationMemo,
  ] =
    useState(
      ""
    );

  const [
    inspirationLinksValue,
    setInspirationLinksValue,
  ] =
    useState(
      ""
    );

  type InspirationUpload = {
    path: string;
    url: string;
    name: string;
    size: number;
  };

  const [
    inspirationImages,
    setInspirationImages,
  ] = useState<InspirationUpload[]>([]);

  const [
    imageUploading,
    setImageUploading,
  ] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const motionSelectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (planLoading || !canGenerateDesign) return;

    if (!allowedDesignModels.has(designModel)) {
      const fallback = entitlements.userSelectableDesignModels[0];
      if (fallback && isDesignModelOption(fallback)) {
        setDesignModel(fallback);
      }
    }

    if (!isReasoningAllowed(reasoningEffort)) {
      setReasoningEffort(reasoningOrder[maxReasoningIndex] ?? "low");
    }

    if (!canUseMotion && motionPreset !== "none") {
      setMotionPreset("none");
    }
  }, [
    planLoading,
    canGenerateDesign,
    canUseMotion,
    designModel,
    reasoningEffort,
    motionPreset,
    allowedDesignModels,
    entitlements.userSelectableDesignModels,
    maxReasoningIndex,
  ]);

  /* =======================================================
     SHARE
  ======================================================= */

  const [
    shareUrl,
    setShareUrl,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    viewCount,
    setViewCount,
  ] =
    useState(
      0
    );

  const [
    shareLoading,
    setShareLoading,
  ] =
    useState(
      false
    );

  const [
    copied,
    setCopied,
  ] =
    useState(
      false
    );

  const [
    shareError,
    setShareError,
  ] =
    useState<
      string | null
    >(
      null
    );

  /* =======================================================
     VISITS
  ======================================================= */

  const [
    visitSummary,
    setVisitSummary,
  ] =
    useState<
      PreviewVisitSummary | null
    >(
      null
    );

  const [
    visits,
    setVisits,
  ] =
    useState<
      PreviewVisit[]
    >(
      []
    );

  const [
    visitsLoading,
    setVisitsLoading,
  ] =
    useState(
      false
    );

  const [
    visitsOpen,
    setVisitsOpen,
  ] =
    useState(
      false
    );

  const [
    visitError,
    setVisitError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    mounted,
    setMounted,
  ] =
    useState(
      false
    );

  /* =======================================================
     SELECTED
  ======================================================= */

  const selectedVariant =
    useMemo(
      () =>
        variants.find(
          (
            variant
          ) =>
            variant.selected
        ) ??
        variants[0] ??
        null,
      [
        variants,
      ]
    );

  const selectedVariantId =
    selectedVariant
      ?.id ??
    null;

  const variantNumberMap =
    useMemo(
      () =>
        buildVariantNumberMap(
          variants
        ),
      [
        variants,
      ]
    );

  const conceptSlug =
    useMemo(
      () =>
        getConceptSlug(
          shareUrl
        ),
      [
        shareUrl,
      ]
    );

  /* =======================================================
     MOUNT
  ======================================================= */

  useEffect(
    () => {
      setMounted(
        true
      );

      return () => {
        setMounted(
          false
        );
      };
    },
    []
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(
        "leadbase-design-inspiration-v1"
      );
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        inspirationMemo?: string;
        inspirationLinksValue?: string;
      };
      if (typeof parsed.inspirationMemo === "string") {
        setInspirationMemo(parsed.inspirationMemo);
      }
      if (typeof parsed.inspirationLinksValue === "string") {
        setInspirationLinksValue(parsed.inspirationLinksValue);
      }
    } catch (storageError) {
      console.warn("Could not restore design inspiration:", storageError);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "leadbase-design-inspiration-v1",
        JSON.stringify({ inspirationMemo, inspirationLinksValue })
      );
    } catch (storageError) {
      console.warn("Could not persist design inspiration:", storageError);
    }
  }, [inspirationMemo, inspirationLinksValue]);

  /* =======================================================
     CLOSE DROPDOWN
  ======================================================= */

  useEffect(
    () => {
      function handlePointerDown(
        event:
          MouseEvent
      ) {
        const target =
          event.target;

        if (
          !(target instanceof
            Node)
        ) {
          return;
        }

        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(
            target
          )
        ) {
          setVariantsOpen(
            false
          );
        }
      }

      document.addEventListener(
        "mousedown",
        handlePointerDown
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown
        );
      };
    },
    []
  );

  /* =======================================================
     VISIT MODAL ESCAPE / BODY LOCK
  ======================================================= */

  useEffect(
    () => {
      if (
        !visitsOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function handleKeyDown(
        event:
          KeyboardEvent
      ) {
        if (
          event.key ===
            "Escape"
        ) {
          setVisitsOpen(
            false
          );
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      visitsOpen,
    ]
  );

  /* =======================================================
     LOAD DESIGNS
  ======================================================= */

  const loadDesigns =
    useCallback(
      async (
        signal?:
          AbortSignal
      ) => {
        try {
          const response =
            await fetch(
              `/api/leads/${encodeURIComponent(
                leadId
              )}/redesign-v2`,
              {
                cache:
                  "no-store",

                signal,
              }
            );

          if (
            !response.ok
          ) {
            return;
          }

          const result =
            (await response.json()) as
              DesignResponse;

          if (
            !result.ok
          ) {
            return;
          }

          const nextVariants =
            result.variants ??
            [];

          setVariants(
            nextVariants
          );

          setGenerationIndex(
            result.generationIndex ??
            nextVariants[0]
              ?.generationIndex ??
            0
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
            "Could not load redesign variants:",
            loadError
          );
        } finally {
          setLoadingDesigns(
            false
          );
        }
      },
      [
        leadId,
      ]
    );

  useEffect(
    () => {
      const controller =
        new AbortController();

      void loadDesigns(
        controller.signal
      );

      return () => {
        controller.abort();
      };
    },
    [
      loadDesigns,
    ]
  );

  async function uploadInspirationFiles(files: File[]) {
    if (!files.length || imageUploading) return;
    const available = Math.max(0, 5 - inspirationImages.length);
    const picked = files.slice(0, available);
    if (!picked.length) {
      setError(language === "de" ? "Maximal 5 Referenzbilder sind erlaubt." : "A maximum of 5 reference images is allowed.");
      return;
    }
    setImageUploading(true);
    setError(null);
    try {
      const uploaded: InspirationUpload[] = [];
      for (const file of picked) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
          throw new Error(language === "de" ? `${file.name}: nur PNG/JPG/WebP bis 3 MB.` : `${file.name}: PNG/JPG/WebP only, max 3 MB.`);
        }
        const data = new FormData();
        data.append("file", file);
        const response = await fetch("/api/design-inspiration", { method: "POST", body: data });
        const result = (await response.json()) as { ok?: boolean; error?: string; path?: string; url?: string; name?: string; size?: number };
        if (!response.ok || !result.ok || !result.path || !result.url) throw new Error(result.error ?? "Upload failed.");
        uploaded.push({ path: result.path, url: result.url, name: result.name ?? file.name, size: result.size ?? file.size });
      }
      setInspirationImages((current) => [...current, ...uploaded].slice(0, 5));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setImageUploading(false);
    }
  }

  async function removeInspirationImage(image: InspirationUpload) {
    setInspirationImages((current) => current.filter((item) => item.path !== image.path));
    try {
      await fetch("/api/design-inspiration", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: image.path }),
      });
    } catch {
      // The private object expires from the UI even if cleanup has to be retried later.
    }
  }

  /* =======================================================
     GENERATE
  ======================================================= */

  async function generate(
    options?:
      GenerateOptions
  ) {
    if (
      generating
    ) {
      return;
    }

    if (!canGenerateDesign) {
      setError(
        language === "de"
          ? "AI-Designs sind ab dem Starter-Plan verfügbar."
          : "AI designs are available from the Starter plan."
      );
      return;
    }

    setGenerating(
      true
    );

    setError(
      null
    );

    setVariantsOpen(
      false
    );

    const effectiveMotionPreset =
      options
        ?.motionPresetOverride ??
      motionPreset;


    try {
      const response =
        await fetch(
          `/api/leads/${encodeURIComponent(
            leadId
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
                  variants.length >
                  0,

                designModel,

                reasoningEffort,

                motionPreset:
                  effectiveMotionPreset,

                inspirationMemo:
                  inspirationMemo.trim() ||
                  null,

                inspirationLinks:
                  parseLines(
                    inspirationLinksValue
                  ),

                inspirationImages:
                  inspirationImages.map((image) => image.path),
              }),
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) ??
        "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          text.failed
        );
      }

      const result =
        (await response.json()) as
          DesignResponse;

      if (
        !response.ok ||
        !result.ok ||
        !result.previewUrl
      ) {
        throw new Error(
          result.error ??
          text.failed
        );
      }

      setGenerationIndex(
        result.generationIndex ??
        generationIndex +
          1
      );

      if (
        effectiveMotionPreset !== "none" &&
        result.previewId
      ) {
        const motionResponse = await fetch(
          `/api/design-preview/${encodeURIComponent(result.previewId)}/enhance-motion`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              designModel,
              reasoningEffort,
              motionPreset: effectiveMotionPreset,
            }),
          }
        );
        const motionResult = (await motionResponse.json()) as MotionEnhanceResponse;
        if (!motionResponse.ok || !motionResult.ok) {
          throw new Error(motionResult.error ?? text.motionFailed);
        }
        setMotionMessage(
          language === "de"
            ? "Gespeichertes Motion-Preset wurde automatisch angewendet. Zusätzliche Credits wurden verwendet."
            : "Your saved motion preset was applied automatically. Additional credits were used."
        );
      }

      await loadDesigns();
    } catch (
      generateError
    ) {
      console.error(
        "Could not generate redesign:",
        generateError
      );

      setError(
        generateError instanceof
          Error
          ? generateError.message
          : text.failed
      );
    } finally {
      setGenerating(
        false
      );
    }
  }

  /* =======================================================
     ENHANCE EXISTING DESIGN WITH MOTION
  ======================================================= */

  async function enhanceMotion() {
    if (
      !selectedVariantId ||
      motionEnhancing ||
      generating
    ) {
      return;
    }

    if (!canUseMotion) {
      setError(
        language === "de"
          ? "Enhance Motion ist ab dem Pro-Plan verfügbar."
          : "Enhance Motion is available from the Pro plan."
      );
      return;
    }

    if (motionPreset === "none") {
      setSettingsOpen(true);
      setMotionMessage(null);
      setError(
        language === "de"
          ? "Wähle zuerst unter Motion „Subtle“ oder „Premium“. Danach kannst du Enhance Motion starten."
          : "Choose Subtle or Premium under Motion first. Then run Enhance Motion."
      );
      window.setTimeout(() => {
        motionSelectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        motionSelectRef.current?.focus();
      }, 50);
      return;
    }

    setMotionEnhancing(
      true
    );

    setError(
      null
    );

    setMotionMessage(
      null
    );


    try {
      const response =
        await fetch(
          `/api/design-preview/${encodeURIComponent(
            selectedVariantId
          )}/enhance-motion`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                designModel,

                reasoningEffort,

                motionPreset,
              }),
          }
        );

      const result =
        (await response.json()) as
          MotionEnhanceResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
          text.motionFailed
        );
      }

      setMotionMessage(
        text.motionDone
      );

      await loadDesigns();
    } catch (
      motionError
    ) {
      console.error(
        "Could not enhance design motion:",
        motionError
      );

      setError(
        motionError instanceof
          Error
          ? motionError.message
          : text.motionFailed
      );
    } finally {
      setMotionEnhancing(
        false
      );
    }
  }

  /* =======================================================
     SELECT VARIANT
  ======================================================= */

  async function selectVariant(
    previewId:
      string
  ) {
    if (
      selectingId
    ) {
      return;
    }

    setSelectingId(
      previewId
    );

    setError(
      null
    );

    setShareError(
      null
    );

    setShareUrl(
      null
    );

    setViewCount(
      0
    );

    setVisitSummary(
      null
    );

    setVisits(
      []
    );

    setVisitError(
      null
    );

    setCopied(
      false
    );

    try {
      const response =
        await fetch(
          `/api/leads/${encodeURIComponent(
            leadId
          )}/redesign-v2`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                previewId,
              }),
          }
        );

      const result =
        (await response.json()) as
          DesignResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
          text.failed
        );
      }

      setVariants(
        (
          current
        ) =>
          current.map(
            (
              variant
            ) => ({
              ...variant,

              selected:
                variant.id ===
                previewId,
            })
          )
      );

      setVariantsOpen(
        false
      );
    } catch (
      selectError
    ) {
      console.error(
        "Could not select redesign:",
        selectError
      );

      setError(
        selectError instanceof
          Error
          ? selectError.message
          : text.failed
      );

      await loadDesigns();
    } finally {
      setSelectingId(
        null
      );
    }
  }

  /* =======================================================
     LOAD CUSTOMER SHARE
  ======================================================= */

  const loadShare =
    useCallback(
      async (
        signal?:
          AbortSignal
      ) => {
        if (
          !selectedVariantId
        ) {
          setShareUrl(
            null
          );

          setViewCount(
            0
          );

          setVisitSummary(
            null
          );

          setVisits(
            []
          );

          return;
        }

        try {
          const response =
            await fetch(
              `/api/leads/${encodeURIComponent(
                leadId
              )}/redesign-preview/share`,
              {
                cache:
                  "no-store",

                signal,
              }
            );

          if (
            !response.ok
          ) {
            return;
          }

          const result =
            (await response.json()) as
              ShareResponse;

          if (
            result.ok &&
            result.shared &&
            result.shareUrl &&
            (
              !result.previewId ||
              result.previewId ===
                selectedVariantId
            )
          ) {
            setShareUrl(
              result.shareUrl
            );

            setViewCount(
              result.viewCount ??
              0
            );

            return;
          }

          setShareUrl(
            null
          );

          setViewCount(
            0
          );

          setVisitSummary(
            null
          );

          setVisits(
            []
          );

          setCopied(
            false
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
            "Could not load customer preview:",
            loadError
          );
        }
      },
      [
        leadId,
        selectedVariantId,
      ]
    );

  useEffect(
    () => {
      const controller =
        new AbortController();

      void loadShare(
        controller.signal
      );

      return () => {
        controller.abort();
      };
    },
    [
      loadShare,
    ]
  );

  /* =======================================================
     LOAD VISITS
  ======================================================= */

  const loadVisits =
    useCallback(
      async (
        signal?:
          AbortSignal
      ) => {
        if (
          !conceptSlug
        ) {
          setVisitSummary(
            null
          );

          setVisits(
            []
          );

          setVisitError(
            null
          );

          return;
        }

        setVisitsLoading(
          true
        );

        setVisitError(
          null
        );

        try {
          const response =
            await fetch(
              `/api/concept/${encodeURIComponent(
                conceptSlug
              )}/visits`,
              {
                cache:
                  "no-store",

                signal,
              }
            );

          const result =
            (await response.json()) as
              PreviewVisitsResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
              text.trackingUnavailable
            );
          }

          setVisitSummary(
            result.summary ??
            null
          );

          setVisits(
            result.visits ??
            []
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
            "Could not load preview visits:",
            loadError
          );

          setVisitError(
            loadError instanceof
              Error
              ? loadError.message
              : text.trackingUnavailable
          );
        } finally {
          setVisitsLoading(
            false
          );
        }
      },
      [
        conceptSlug,
        text.trackingUnavailable,
      ]
    );

  useEffect(
    () => {
      if (
        !conceptSlug
      ) {
        return;
      }

      const controller =
        new AbortController();

      void loadVisits(
        controller.signal
      );

      return () => {
        controller.abort();
      };
    },
    [
      conceptSlug,
      loadVisits,
    ]
  );

  /*
   * If you open the customer preview in a new tab and then
   * return to the lead, refresh the visit data automatically.
   */
  useEffect(
    () => {
      if (
        !conceptSlug
      ) {
        return;
      }

      function handleFocus() {
        void loadVisits();
      }

      window.addEventListener(
        "focus",
        handleFocus
      );

      return () => {
        window.removeEventListener(
          "focus",
          handleFocus
        );
      };
    },
    [
      conceptSlug,
      loadVisits,
    ]
  );

  /* =======================================================
     COPY LINK
  ======================================================= */

  async function copyLink(
    url:
      string
  ) {
    try {
      await navigator.clipboard.writeText(
        url
      );

      setCopied(
        true
      );

      window.setTimeout(
        () => {
          setCopied(
            false
          );
        },
        1800
      );
    } catch (
      copyError
    ) {
      console.error(
        "Could not copy customer preview:",
        copyError
      );
    }
  }

  /* =======================================================
     CREATE / REFRESH / COPY CUSTOMER PREVIEW
  ======================================================= */

  async function createOrCopyCustomerPreview() {
    if (
      !selectedVariantId ||
      shareLoading
    ) {
      return;
    }

    /*
     * Existing client preview:
     * copying the link must be instant and must NOT call the share
     * endpoint again or show "Creating client preview...".
     */
    if (
      shareUrl
    ) {
      setShareError(
        null
      );

      setCopied(
        false
      );

      await copyLink(
        shareUrl
      );

      return;
    }

    /*
     * No client preview exists yet:
     * only this path creates one and may show the creation/loading state.
     */
    setShareLoading(
      true
    );

    setShareError(
      null
    );

    setCopied(
      false
    );

    try {
      const response =
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
              JSON.stringify({
                previewId:
                  selectedVariantId,
              }),
          }
        );

      const result =
        (await response.json()) as
          ShareResponse;

      if (
        !response.ok ||
        !result.ok ||
        !result.shareUrl
      ) {
        throw new Error(
          result.error ??
          text.shareFailed
        );
      }

      setShareUrl(
        result.shareUrl
      );

      setViewCount(
        result.viewCount ??
          0
      );

      await copyLink(
        result.shareUrl
      );
    } catch (
      customerPreviewError
    ) {
      console.error(
        "Could not create customer preview:",
        customerPreviewError
      );

      setShareError(
        customerPreviewError instanceof
          Error
          ? customerPreviewError.message
          : text.shareFailed
      );
    } finally {
      setShareLoading(
        false
      );
    }
  }

  /* =======================================================
     DEACTIVATE CUSTOMER PREVIEW
  ======================================================= */

  async function deactivateCustomerPreview() {
    if (
      !selectedVariantId ||
      !shareUrl ||
      shareLoading
    ) {
      return;
    }

    setShareLoading(
      true
    );

    setShareError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/leads/${encodeURIComponent(
            leadId
          )}/redesign-preview/share`,
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                previewId:
                  selectedVariantId,
              }),
          }
        );

      const result =
        (await response.json()) as
          ShareResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
          text.deactivateFailed
        );
      }

      setShareUrl(
        null
      );

      setViewCount(
        0
      );

      setVisitSummary(
        null
      );

      setVisits(
        []
      );

      setVisitError(
        null
      );

      setVisitsOpen(
        false
      );

      setCopied(
        false
      );
    } catch (
      deactivateError
    ) {
      console.error(
        "Could not disable customer preview:",
        deactivateError
      );

      setShareError(
        deactivateError instanceof
          Error
          ? deactivateError.message
          : text.deactivateFailed
      );
    } finally {
      setShareLoading(
        false
      );
    }
  }

  /* =======================================================
     VISIT LABEL
  ======================================================= */

  function getVisitLabel(
    visit:
      PreviewVisit
  ) {
    if (
      visit.is_owner
    ) {
      return text.yourView;
    }

    if (
      visit.source ===
        "OUTREACH" &&
      visit.is_engaged
    ) {
      return text.likelyCustomer;
    }

    if (
      visit.source ===
        "OUTREACH"
    ) {
      return text.outreachLink;
    }

    if (
      visit.is_engaged
    ) {
      return text.externalVisitor;
    }

    return text.directView;
  }

  /* =======================================================
     MODAL
  ======================================================= */

  const visitsModal =
    visitsOpen &&
    mounted
      ? createPortal(
          <div
            role="presentation"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                  event.currentTarget
              ) {
                setVisitsOpen(
                  false
                );
              }
            }}
            className="fixed inset-0 z-[9999] flex items-end justify-center overflow-y-auto bg-background/65 p-0 backdrop-blur-[10px] sm:items-center sm:p-6"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="preview-visits-title"
              className="relative my-0 w-full max-h-[calc(100dvh-24px)] overflow-y-auto rounded-t-[30px] border bg-card shadow-[0_30px_100px_rgba(0,0,0,.24)] sm:my-auto sm:max-w-[880px] sm:rounded-[30px]"
            >
              <button
                type="button"
                onClick={() =>
                  setVisitsOpen(
                    false
                  )
                }
                aria-label="Dialog schließen"
                className="absolute right-4 top-4 z-20 flex size-10 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-all hover:border-primary/20 hover:bg-primary/[0.04] hover:text-foreground sm:right-5 sm:top-5"
              >
                <X className="size-4" />
              </button>

              <div className="border-b bg-gradient-to-br from-primary/[0.055] via-card to-card px-5 pb-6 pt-7 pr-16 sm:px-7 sm:pb-7 sm:pt-8 sm:pr-20">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600" />

                  <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
                    {text.active}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2
                      id="preview-visits-title"
                      className="text-xl font-semibold tracking-tight sm:text-2xl"
                    >
                      {
                        text.visitDetailsTitle
                      }
                    </h2>

                    <p className="mt-2 max-w-[590px] text-sm leading-6 text-muted-foreground">
                      {
                        text.visitDetailsDescription
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      visitsLoading
                    }
                    onClick={() =>
                      void loadVisits()
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`size-3.5 ${
                        visitsLoading
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    {
                      text.refresh
                    }
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 border-b bg-muted/10 p-4 sm:grid-cols-4 sm:p-5">
                <div className="rounded-2xl border bg-background p-3.5 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {
                      text.externalVisitors
                    }
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {visitSummary
                      ?.externalVisitors ??
                      0}
                  </p>
                </div>

                <div className="rounded-2xl border bg-background p-3.5 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {
                      text.outreachVisits
                    }
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {visitSummary
                      ?.outreachSessions ??
                      0}
                  </p>
                </div>

                <div className="rounded-2xl border bg-background p-3.5 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {
                      text.engaged
                    }
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {visitSummary
                      ?.engagedExternalSessions ??
                      0}
                  </p>
                </div>

                <div className="rounded-2xl border bg-background p-3.5 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {
                      text.ownViews
                    }
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {visitSummary
                      ?.ownerSessions ??
                      0}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {visitError ? (
                  <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs leading-5 text-red-600 dark:text-red-400">
                    {
                      visitError
                    }
                  </p>
                ) : null}

                {visits.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed bg-muted/10 px-5 py-12 text-center">
                    <Eye className="mx-auto size-5 text-muted-foreground" />

                    <p className="mt-2 text-sm font-medium">
                      {
                        text.noDetailedVisits
                      }
                    </p>

                    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                      {
                        text.noDetailedVisitsDescription
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visits.map(
                      (
                        visit
                      ) => {
                        const likelyCustomer =
                          !visit.is_owner &&
                          visit.source ===
                            "OUTREACH" &&
                          visit.is_engaged;

                        return (
                          <div
                            key={
                              visit.id
                            }
                            className="rounded-2xl border bg-background p-4 transition-colors hover:border-primary/20 hover:bg-primary/[0.02] sm:p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                      visit.is_owner
                                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                        : likelyCustomer
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                          : "bg-muted text-foreground"
                                    }`}
                                  >
                                    {getVisitLabel(
                                      visit
                                    )}
                                  </span>

                                  {visit.source ===
                                  "OUTREACH" &&
                                  !visit.is_owner ? (
                                    <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                                      {
                                        text.outreachLink
                                      }
                                    </span>
                                  ) : null}
                                </div>

                                <p className="mt-2 text-xs text-muted-foreground">
                                  {formatVisitDate(
                                    visit.first_seen_at,
                                    language
                                  )}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-xs font-medium">
                                  {visit.device_type ??
                                    "—"}
                                </p>

                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  {visit.browser_name ??
                                    "—"}{" "}
                                  ·{" "}
                                  {visit.os_name ??
                                    "—"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <MapPin className="size-3.5 shrink-0" />

                                <span className="truncate">
                                  {getVisitLocation(
                                    visit,
                                    text.locationUnknown
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock3 className="size-3.5 shrink-0" />

                                <span>
                                  {formatDuration(
                                    visit.duration_seconds,
                                    language
                                  )}{" "}
                                  {
                                    text.visible
                                  }
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <MousePointer2 className="size-3.5 shrink-0" />

                                <span>
                                  {visit.max_scroll_percent}%{" "}
                                  {
                                    text.scroll
                                  }{" "}
                                  ·{" "}
                                  {visit.interaction_count}{" "}
                                  {
                                    text.actions
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {viewCount >
                0 ? (
                  <div className="mt-4 rounded-2xl border bg-muted/15 px-4 py-3.5">
                    <p className="text-xs font-medium">
                      {text.legacyCounter}:{" "}
                      {
                        viewCount
                      }
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {
                        text.legacyCounterDescription
                      }
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loadingDesigns
  ) {
    return (
      <div className="leadbase-workspace-card min-w-0 rounded-[24px] border p-5 sm:p-6">
        <div className="flex min-h-24 items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/20 px-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />

          {
            text.generating
          }
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  const hasInspiration =
    Boolean(
      inspirationMemo.trim() ||
      inspirationLinksValue.trim() ||
      inspirationImages.length > 0
    );

  const selectedVariantLabel =
    getVariantDisplayName({
      variant:
        selectedVariant,

      variantLabel:
        text.variant,

      language,

      numberMap:
        variantNumberMap,
    });

  return (
    <>
      <section className="min-w-0 overflow-visible rounded-[16px] border border-black/[0.08] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(11,12,14,0.03)] dark:border-white/[0.08] dark:bg-[#111216]">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="size-3.5 shrink-0 text-[#002BBA]" />

            <h2 className="whitespace-nowrap text-[13.5px] font-semibold tracking-[-0.01em]">
              {
                language === "de"
                  ? "Design Studio"
                  : "Design Studio"
              }
            </h2>

            <span className="truncate text-[11.5px] text-[#6B7078]">
              {
                language === "de"
                  ? "Variante wählen, bearbeiten, für den Kunden freigeben."
                  : "Choose a variation, edit it, then publish exactly that version for the client."
              }
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setSettingsOpen(
                (
                  current
                ) =>
                  !current
              )
            }
            className="flex shrink-0 items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#6B7078] transition-colors hover:text-[#0B0C0E] dark:hover:text-white"
          >
            {
              language === "de"
                ? "Einstellungen"
                : "Settings"
            }

            <ChevronDown
              className={`size-3 transition-transform duration-200 ${
                settingsOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>
        </div>

        {freeDesignLocked ? (
          <div className="mt-3 flex flex-col gap-3 rounded-[11px] border border-[#002BBA]/12 bg-[#EAEEFB]/45 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-[#8EA6FF]/15 dark:bg-[#002BBA]/10">
            <div className="flex min-w-0 items-start gap-2.5">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-[#002BBA] dark:text-[#8EA6FF]" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium text-[#0B0C0E] dark:text-white">
                  {language === "de" ? "Demo-Design ist im Free-Plan schreibgeschützt" : "Demo design is view-only on Free"}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-4 text-[#6B7078]">
                  {language === "de"
                    ? "Bearbeiten, neu generieren, Modelle, Qualität, Motion und Inspiration sind ab Starter verfügbar."
                    : "Editing, regeneration, models, quality, motion and inspiration are available from Starter."}
                </p>
              </div>
            </div>
            <Link href="/profile?dialog=plan" className="inline-flex h-8 shrink-0 items-center justify-center rounded-[8px] bg-[#002BBA] px-3 text-[11px] font-medium text-white hover:bg-[#00229A]">
              {language === "de" ? "Auf Starter upgraden" : "Upgrade to Starter"}
            </Link>
          </div>
        ) : null}

        {/* =================================================
            MAIN TOOLBAR
        ================================================= */}

        <div className="mt-[14px] flex min-w-0 flex-wrap items-center gap-2">
          {variants.length === 0 ? (
            freeDesignLocked ? (
              <Link href="/profile?dialog=plan" className="inline-flex h-[34px] items-center justify-center gap-2 rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] font-medium text-[#40454E] transition-colors hover:border-[#002BBA]/30 hover:text-[#002BBA] dark:border-white/[0.10] dark:bg-[#111216] dark:text-white">
                <LockKeyhole className="size-3.5" />
                {language === "de" ? "Design ab Starter" : "Design · Starter+"}
              </Link>
            ) : noCredits ? (
              <Link href="/profile?dialog=credits" className="inline-flex h-[34px] items-center justify-center gap-2 rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] font-medium text-[#40454E] transition-colors hover:border-[#002BBA]/30 hover:text-[#002BBA] dark:border-white/[0.10] dark:bg-[#111216] dark:text-white">
                <Zap className="size-3.5" />
                {language === "de" ? "Keine Credits · kaufen" : "No Credits · Buy Credits"}
              </Link>
            ) : (
              <button
                type="button"
                disabled={generating || planLoading || !canGenerateDesign}
                onClick={() => void generate()}
                className="inline-flex h-[34px] items-center justify-center gap-2 rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] font-medium text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.10] dark:bg-[#111216] dark:text-white dark:hover:bg-white/[0.04]"
              >
                {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 opacity-70" />}
                {generating ? text.generating : text.generate}
                {!generating ? (
                  <CreditEstimatePill estimate={designCreditEstimate(designModel, reasoningEffort)} language={language} hideOnSmall />
                ) : null}
              </button>
            )
          ) : (
            <>
              {/* VARIANT */}

              <div
                ref={
                  dropdownRef
                }
                className="relative"
              >
                <button
                  type="button"
                  onClick={() =>
                    setVariantsOpen(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  className="flex h-[34px] min-w-[200px] max-w-[300px] items-center gap-[9px] rounded-[10px] border border-black/[0.09] bg-[#F7F8FA] px-3 text-[13px] font-medium text-[#0B0C0E] transition-colors hover:border-black/[0.16] dark:border-white/[0.10] dark:bg-white/[0.04] dark:text-white"
                >
                  <span className="relative size-3.5 shrink-0 text-[#002BBA]">
                    <span className="absolute left-0 top-[1px] h-[7px] w-[11px] rounded-[2px] border border-current" />
                    <span className="absolute bottom-[1px] right-0 h-[7px] w-[11px] rounded-[2px] border border-current bg-[#F7F8FA] dark:bg-[#15161A]" />
                  </span>

                  <span className="min-w-0 flex-1 truncate text-left">
                    {
                      selectedVariantLabel
                    }
                  </span>

                  <ChevronDown
                    className={`size-3 shrink-0 text-[#6B7078] transition-transform duration-200 ${
                      variantsOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {variantsOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[300px] overflow-hidden rounded-[11px] border border-black/[0.08] bg-white p-1.5 shadow-[0_12px_36px_rgba(11,12,14,0.14)] dark:border-white/[0.10] dark:bg-[#15161A]">
                    <p className="px-2 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-[#6B7078]">
                      {
                        text.variants
                      }
                    </p>

                    <div className="max-h-72 overflow-y-auto">
                      {variants.map(
                        (
                          variant
                        ) => {
                          const selecting =
                            selectingId ===
                            variant.id;

                          const label =
                            getVariantDisplayName({
                              variant,

                              variantLabel:
                                text.variant,

                              language,

                              numberMap:
                                variantNumberMap,
                            });

                          return (
                            <div
                              key={
                                variant.id
                              }
                              className={`flex items-center gap-1 rounded-[9px] ${
                                variant.selected
                                  ? "bg-[#EAEEFB]"
                                  : "hover:bg-[#F7F8FA] dark:hover:bg-white/[0.05]"
                              }`}
                            >
                              <button
                                type="button"
                                disabled={
                                  variant.selected ||
                                  Boolean(
                                    selectingId
                                  )
                                }
                                onClick={() =>
                                  void selectVariant(
                                    variant.id
                                  )
                                }
                                className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left"
                              >
                                <span
                                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                                    variant.selected
                                      ? "border-[#002BBA] bg-[#002BBA] text-white"
                                      : "border-black/[0.12] dark:border-white/[0.16]"
                                  }`}
                                >
                                  {variant.selected ? (
                                    <Check className="size-3" />
                                  ) : selecting ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : null}
                                </span>

                                <div className="min-w-0">
                                  <p className="truncate text-[12px] font-medium">
                                    {
                                      label
                                    }
                                  </p>

                                  <p className="mt-0.5 truncate text-[9.5px] text-[#6B7078]">
                                    {variant.selected
                                      ? text.selected
                                      : selecting
                                        ? text.selecting
                                        : text.select}
                                  </p>
                                </div>
                              </button>

                              <a
                                href={
                                  variant.previewUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-[7px] border border-black/[0.08] bg-white text-[#6B7078] transition-colors hover:border-black/[0.16] hover:text-[#0B0C0E] dark:border-white/[0.10] dark:bg-[#15161A] dark:hover:text-white"
                                title={
                                  text.open
                                }
                              >
                                <ExternalLink className="size-3" />
                              </a>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* OPEN */}

              {selectedVariant ? (
                <a
                  href={
                    selectedVariant.previewUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-black/[0.09] bg-white text-[#6B7078] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] hover:text-[#0B0C0E] dark:border-white/[0.10] dark:bg-[#111216] dark:hover:text-white"
                  title={
                    text.open
                  }
                >
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}

              <div className="mx-0.5 h-5 w-px shrink-0 bg-black/[0.09] dark:bg-white/[0.10]" />

              {/* EDIT */}

              {selectedVariant ? (
                freeDesignLocked ? (
                  <Link href="/profile?dialog=plan" className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-[#002BBA]/30 hover:text-[#002BBA] dark:border-white/[0.10] dark:bg-[#111216] dark:text-white">
                    <LockKeyhole className="size-3.5 opacity-70" />
                    {language === "de" ? "Bearbeiten · Starter" : "Edit · Starter"}
                  </Link>
                ) : (
                  <a
                    href={`/design-preview/${encodeURIComponent(selectedVariant.id)}/edit`}
                    className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] dark:border-white/[0.10] dark:bg-[#111216] dark:text-white"
                  >
                    <Pencil className="size-3.5 opacity-60" />
                    {text.edit}
                  </a>
                )
              ) : null}

              {/* NEW VARIATION */}

              {freeDesignLocked ? (
                <Link href="/profile?dialog=plan" className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-[#002BBA]/30 hover:text-[#002BBA] dark:border-white/[0.10] dark:bg-[#111216] dark:text-white">
                  <LockKeyhole className="size-3.5" />
                  {language === "de" ? "Neu generieren · Starter" : "Regenerate · Starter"}
                </Link>
              ) : noCredits ? (
                <Link href="/profile?dialog=credits" className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-[#002BBA]/30 hover:text-[#002BBA] dark:border-white/[0.10] dark:bg-[#111216] dark:text-white">
                  <Zap className="size-3.5" />
                  {language === "de" ? "Keine Credits · kaufen" : "No Credits · Buy Credits"}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={generating || planLoading || !canGenerateDesign}
                  onClick={() => void generate()}
                  className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.10] dark:bg-[#111216] dark:text-white"
                >
                  {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 opacity-60" />}
                  {text.regenerate}
                  {!generating ? <CreditEstimatePill estimate={designCreditEstimate(designModel, reasoningEffort)} language={language} hideOnSmall /> : null}
                </button>
              )}

              <div className="basis-full flex items-center gap-2">
                {/* ENHANCE MOTION */}

                {selectedVariant ? (
                  freeDesignLocked ? (
                    <Link href="/profile?dialog=plan" className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] bg-[#EAEEFB] px-3 text-[13px] font-medium text-[#002BBA] transition-colors hover:bg-[#DFE5F8] dark:bg-[#002BBA]/20 dark:text-[#8EA6FF]">
                      <LockKeyhole className="size-3.5" />
                      {language === "de" ? "Motion · Pro+" : "Motion · Pro+"}
                    </Link>
                  ) : noCredits && canUseMotion ? (
                    <Link href="/profile?dialog=credits" className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] bg-[#EAEEFB] px-3 text-[13px] font-medium text-[#002BBA] transition-colors hover:bg-[#DFE5F8] dark:bg-[#002BBA]/20 dark:text-[#8EA6FF]">
                      <Zap className="size-3.5" />
                      {language === "de" ? "Keine Credits · kaufen" : "No Credits · Buy Credits"}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={generating || motionEnhancing || !canUseMotion}
                      onClick={() => void enhanceMotion()}
                      className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] bg-[#EAEEFB] px-3 text-[13px] font-medium text-[#002BBA] transition-colors hover:bg-[#DFE5F8] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#002BBA]/20 dark:text-[#8EA6FF] dark:hover:bg-[#002BBA]/28"
                    >
                      {motionEnhancing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      {text.enhanceMotion}
                      {!motionEnhancing ? <CreditEstimatePill feature="design_motion" language={language} hideOnSmall /> : null}
                    </button>
                  )
                ) : null}

                {/* CLIENT PREVIEW */}

                {selectedVariant ? (
                  <button
                    type="button"
                    disabled={
                      shareLoading
                    }
                    onClick={() =>
                      void createOrCopyCustomerPreview()
                    }
                    className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-[10px] bg-[#EAEEFB] px-3 text-[13px] font-medium text-[#002BBA] transition-colors hover:bg-[#DFE5F8] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#002BBA]/20 dark:text-[#8EA6FF] dark:hover:bg-[#002BBA]/28"
                  >
                    {shareLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : copied ? (
                      <Check className="size-3.5" />
                    ) : shareUrl ? (
                      <Link2 className="size-3.5" />
                    ) : (
                      <ShieldCheck className="size-3.5" />
                    )}

                    {shareLoading &&
                    !shareUrl
                      ? text.creatingClientPreview
                      : copied
                        ? text.copiedClientLink
                        : shareUrl
                          ? text.copyClientLink
                          : text.createClientPreview}
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* =================================================
            GENERATION META
        ================================================= */}

        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 border-t border-black/[0.07] pt-3 dark:border-white/[0.08]">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#6B7078]">
            {
              language === "de"
                ? "Generierung"
                : "Generation"
            }
          </span>

          <span className="rounded-[6px] bg-black/[0.05] px-2 py-[3px] font-mono text-[10px] uppercase text-[#40454E] dark:bg-white/[0.06] dark:text-[#B9BDC5]">
            {
              getModelLabel(
                designModel
              )
            }
          </span>

          <span className="rounded-[6px] bg-black/[0.05] px-2 py-[3px] font-mono text-[10px] uppercase text-[#40454E] dark:bg-white/[0.06] dark:text-[#B9BDC5]">
            {
              language === "de"
                ? "Qualität"
                : "Quality"
            }{" "}
            {
              getReasoningLabel(
                reasoningEffort,
                text
              )
            }
          </span>

          <span className="rounded-[6px] bg-black/[0.05] px-2 py-[3px] font-mono text-[10px] uppercase text-[#40454E] dark:bg-white/[0.06] dark:text-[#B9BDC5]">
            {
              language === "de"
                ? "Inspiration"
                : "Inspiration"
            }{" "}
            {
              hasInspiration
                ? language === "de"
                  ? "Aktiv"
                  : "Active"
                : language === "de"
                  ? "Keine"
                  : "None"
            }
          </span>

          <span className="min-w-0 truncate text-[11px] text-[#6B7078]">
            {
              text.modelHelp
            }
          </span>
        </div>

        {/* =================================================
            CLIENT PREVIEW + EMAIL GIF
            Visible in the default studio — not hidden in Settings.
        ================================================= */}

        <div className="mt-3 grid grid-cols-2 items-start gap-2.5 border-t border-black/[0.07] pt-3 max-[900px]:grid-cols-1 dark:border-white/[0.08]">
          {/* CLIENT PREVIEW */}

          <div className="flex min-h-[44px] min-w-0 self-start items-center gap-2.5 rounded-[10px] border border-black/[0.07] bg-[#FBFBFC] px-3 dark:border-white/[0.08] dark:bg-white/[0.025]">
            <ShieldCheck
              className={`size-3.5 shrink-0 ${
                shareUrl
                  ? "text-[#002BBA]"
                  : "text-[#8A9099]"
              }`}
            />

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[11.5px] font-medium text-[#0B0C0E] dark:text-white">
                  {
                    language === "de"
                      ? "Kunden-Vorschau"
                      : "Client preview"
                  }
                </span>

                <span
                  className={`shrink-0 rounded-[6px] px-1.5 py-[2px] font-mono text-[8px] uppercase tracking-[0.05em] ${
                    shareUrl
                      ? "bg-[#EAEEFB] text-[#002BBA] dark:bg-[#002BBA]/20 dark:text-[#8EA6FF]"
                      : "bg-black/[0.05] text-[#6B7078] dark:bg-white/[0.06]"
                  }`}
                >
                  {shareUrl
                    ? language === "de"
                      ? "Aktiv"
                      : "Active"
                    : language === "de"
                      ? "Nicht erstellt"
                      : "Not created"}
                </span>
              </div>

              <p className="mt-0.5 truncate text-[9.5px] text-[#6B7078]">
                {shareUrl
                  ? `${viewCount} ${
                      viewCount === 1
                        ? text.view
                        : text.views
                    }`
                  : language === "de"
                    ? "Erstelle zuerst den Kunden-Link."
                    : "Create the client link first."}
              </p>
            </div>

            {shareUrl ? (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={
                    visitsLoading
                  }
                  onClick={() => {
                    setVisitsOpen(
                      true
                    );

                    void loadVisits();
                  }}
                  className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[10.5px] font-medium text-[#002BBA] transition-[background-color,color,transform] duration-150 hover:bg-[#EAEEFB] hover:text-[#001E85] active:scale-[0.98] disabled:opacity-50"
                >
                  {visitsLoading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Eye className="size-3" />
                  )}

                  {
                    text.visitDetails
                  }
                </button>

                <a
                  href={
                    shareUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[10.5px] font-medium text-[#002BBA] transition-[background-color,color,transform] duration-150 hover:bg-[#EAEEFB] hover:text-[#001E85] active:scale-[0.98]"
                >
                  {
                    language === "de"
                      ? "Öffnen"
                      : "Open"
                  }

                  <ExternalLink className="size-3" />
                </a>
              </div>
            ) : null}
          </div>

          {/* EMAIL GIF */}

          {shareUrl ? (
            <PreviewGifActions
              leadId={
                leadId
              }
              shareUrl={
                shareUrl
              }
            />
          ) : (
            <div className="flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-[10px] border border-black/[0.07] bg-[#FBFBFC] px-3 dark:border-white/[0.08] dark:bg-white/[0.025]">
              <Film className="size-3.5 shrink-0 text-[#8A9099]" />

              <div className="min-w-0">
                <p className="text-[11.5px] font-medium">
                  {
                    language === "de"
                      ? "E-Mail-GIF"
                      : "Email GIF"
                  }
                </p>

                <p className="mt-0.5 truncate text-[9.5px] text-[#6B7078]">
                  {
                    language === "de"
                      ? "Kunden-Vorschau zuerst erstellen."
                      : "Create the client preview first."
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            GENERATION / MOTION STATUS
        ================================================= */}

        {generating ? (
          <p className="mt-2 text-[10.5px] leading-5 text-[#6B7078]">
            {
              text.generating
            }
          </p>
        ) : null}

        {motionEnhancing ? (
          <p className="mt-2 text-[10.5px] leading-5 text-[#6B7078]">
            {
              text.motionGenerating
            }
          </p>
        ) : null}

        {motionMessage ? (
          <p className="mt-2 text-[10.5px] leading-5 text-[#2F6B3A]">
            {
              motionMessage
            }
          </p>
        ) : null}

        {error ? (
          <p className="mt-2 break-words text-[10.5px] leading-5 text-red-600 dark:text-red-400">
            {
              error
            }
          </p>
        ) : null}

        {shareError ? (
          <p className="mt-2 break-words text-[10.5px] leading-5 text-red-600 dark:text-red-400">
            {
              shareError
            }
          </p>
        ) : null}

        {visitError &&
        shareUrl ? (
          <p className="mt-2 break-words text-[10.5px] leading-5 text-amber-600 dark:text-amber-400">
            {
              visitError
            }
          </p>
        ) : null}

        {/* =================================================
            SETTINGS / SECONDARY FUNCTIONALITY
            Hidden by default so the default Studio stays 1:1
            with the approved Lead Detail design.
        ================================================= */}

        {settingsOpen ? (
          <div className="mt-4 border-t border-black/[0.07] pt-4 dark:border-white/[0.08]">
            {freeDesignLocked ? (
              <div className="flex flex-col gap-3 rounded-[11px] border border-black/[0.08] bg-[#F7F8FA] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.08] dark:bg-white/[0.04]">
                <div className="flex items-start gap-2.5">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#002BBA] dark:text-[#8EA6FF]" />
                  <div>
                    <p className="text-[12px] font-medium">{language === "de" ? "Design-Einstellungen ab Starter" : "Design settings from Starter"}</p>
                    <p className="mt-0.5 text-[10.5px] leading-4 text-[#6B7078]">{language === "de" ? "Modelle, Qualität, Motion, Briefing, Links und Referenzbilder sind im Free-Demo-Design schreibgeschützt." : "Models, quality, motion, briefing, links and reference images are read-only in the Free demo design."}</p>
                  </div>
                </div>
                <Link href="/profile?dialog=plan" className="inline-flex h-8 shrink-0 items-center justify-center rounded-[8px] bg-[#002BBA] px-3 text-[11px] font-medium text-white hover:bg-[#00229A]">{language === "de" ? "Starter ansehen" : "View Starter"}</Link>
              </div>
            ) : (
            <div className="grid gap-3 xl:grid-cols-3">
              <label className="space-y-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#6B7078]">
                  {
                    text.modelLabel
                  }
                </span>

                <select
                  disabled={planLoading || !canGenerateDesign}
                  value={
                    designModel
                  }
                  onChange={(event) => {
                    const nextModel = event.target.value;
                    if (isDesignModelOption(nextModel)) {
                      setDesignModel(nextModel);
                    }
                  }}
                  className="h-9 w-full rounded-[9px] border border-black/[0.09] bg-white px-2.5 text-[12px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/[0.10] dark:bg-[#15161A]"
                >
                  {DESIGN_MODEL_OPTIONS.map(
                    (
                      model
                    ) => (
                      <option
                        key={
                          model
                        }
                        value={
                          model
                        }
                        disabled={
                          !allowedDesignModels.has(model)
                        }
                      >
                        {getModelLabel(model)}{model === "gpt-6-astra" ? " · Scale" : ""}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#6B7078]">
                  {
                    text.reasoningLabel
                  }
                </span>

                <select
                  disabled={planLoading || !canGenerateDesign}
                  value={
                    reasoningEffort
                  }
                  onChange={(event) =>
                    setReasoningEffort(
                      event.target.value as DesignReasoningEffort
                    )
                  }
                  className="h-9 w-full rounded-[9px] border border-black/[0.09] bg-white px-2.5 text-[12px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/[0.10] dark:bg-[#15161A]"
                >
                  <option value="low">
                    {
                      text.reasoningLow
                    }
                  </option>

                  <option value="medium" disabled={!isReasoningAllowed("medium")}>
                    {
                      text.reasoningMedium
                    }
                  </option>

                  <option value="high" disabled={!isReasoningAllowed("high")}>
                    {
                      text.reasoningHigh
                    } · Pro+
                  </option>
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#6B7078]">
                  {
                    text.motionLabel
                  }
                </span>

                <select
                  ref={motionSelectRef}
                  disabled={planLoading || !canGenerateDesign}
                  value={
                    motionPreset
                  }
                  onChange={(event) =>
                    setMotionPreset(
                      event.target.value as DesignMotionPreset
                    )
                  }
                  className="h-9 w-full rounded-[9px] border border-black/[0.09] bg-white px-2.5 text-[12px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/[0.10] dark:bg-[#15161A]"
                >
                  <option value="none">
                    {
                      text.motionNone
                    }
                  </option>

                  <option value="subtle" disabled={!canUseMotion}>
                    {
                      text.motionSubtle
                    } · Pro+
                  </option>

                  <option value="premium" disabled={!canUseMotion}>
                    {
                      text.motionPremium
                    } · Pro+
                  </option>
                </select>
                {motionPreset !== "none" ? (
                  <span className="block text-[10.5px] leading-4 text-[#9A5106]">
                    {language === "de"
                      ? "Dieses Preset wird bei neuen Designs automatisch angewendet und startet einen zusätzlichen AI-Schritt. Das verbraucht zusätzliche Credits."
                      : "This preset is automatically applied to new designs and runs an additional AI step, using extra credits."}
                  </span>
                ) : null}
              </label>

              <label className="space-y-1.5 xl:col-span-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#6B7078]">
                  {
                    text.inspirationLabel
                  }
                </span>

                <textarea
                  value={
                    inspirationMemo
                  }
                  onChange={(event) =>
                    setInspirationMemo(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder={
                    text.inspirationPlaceholder
                  }
                  className="w-full rounded-[9px] border border-black/[0.09] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/[0.10] dark:bg-[#15161A]"
                />
              </label>

              <label className="space-y-1.5 xl:col-span-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#6B7078]">
                  {
                    text.inspirationLinksLabel
                  }
                </span>

                <textarea
                  value={
                    inspirationLinksValue
                  }
                  onChange={(event) =>
                    setInspirationLinksValue(
                      event.target.value
                    )
                  }
                  rows={2}
                  placeholder={
                    text.inspirationLinksPlaceholder
                  }
                  className="w-full rounded-[9px] border border-black/[0.09] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/[0.10] dark:bg-[#15161A]"
                />
              </label>

              <div className="space-y-1.5 xl:col-span-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#6B7078]">
                    {language === "de" ? "Referenzbilder" : "Reference images"}
                  </span>
                  <span className="text-[10px] text-[#6B7078]">{inspirationImages.length}/5</span>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void uploadInspirationFiles(Array.from(event.target.files ?? []));
                    event.currentTarget.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={imageUploading || inspirationImages.length >= 5}
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void uploadInspirationFiles(Array.from(event.dataTransfer.files ?? []));
                  }}
                  className="flex min-h-[86px] w-full items-center justify-center gap-2 rounded-[9px] border border-dashed border-black/[0.14] bg-[#F7F8FA] px-4 py-3 text-[11.5px] text-[#40454E] outline-none transition hover:border-[#002BBA]/45 focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.14] dark:bg-white/[0.03]"
                >
                  {imageUploading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4 text-[#002BBA]" />}
                  <span>
                    {language === "de"
                      ? "Bilder hier ablegen oder auswählen · PNG/JPG/WebP · max. 3 MB"
                      : "Drop images here or choose files · PNG/JPG/WebP · max 3 MB"}
                  </span>
                </button>
                {inspirationImages.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {inspirationImages.map((image) => (
                      <div key={image.path} className="group relative overflow-hidden rounded-[9px] border border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-[#15161A]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt="" className="h-20 w-full object-cover" />
                        <div className="flex items-center gap-1.5 px-2 py-1.5">
                          <ImagePlus className="size-3 shrink-0 text-[#6B7078]" />
                          <span className="min-w-0 flex-1 truncate text-[9.5px] text-[#40454E] dark:text-white/75">{image.name}</span>
                          <button type="button" aria-label="Remove image" onClick={() => void removeInspirationImage(image)} className="rounded p-0.5 text-[#6B7078] hover:bg-black/[0.05] hover:text-red-600 dark:hover:bg-white/[0.08]">
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="text-[10.5px] leading-4 text-[#9A5106]">
                  {language === "de"
                    ? "Die Bilder werden der Design-AI als visuelle Inspiration mitgegeben. Bildinputs erhöhen den AI-Input und können zusätzliche Credits verbrauchen. Sie werden nicht als Kunden-Assets in das Design übernommen."
                    : "Images are passed to the design AI as visual inspiration. Image inputs increase AI usage and can use additional credits. They are not reused as client assets."}
                </p>
              </div>
            </div>
            )}

            {/* ACTIVE CLIENT PREVIEW + VISITS */}

            {shareUrl ? (
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[11px] border border-[#002BBA]/10 bg-[#EAEEFB]/45 px-3 py-2.5 text-[10.5px]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#002BBA]">
                  <ShieldCheck className="size-3.5" />

                  {
                    text.active
                  }
                </span>

                {visitSummary ? (
                  <>
                    <span className="text-[#40454E]">
                      <strong className="font-medium text-[#0B0C0E] dark:text-white">
                        {
                          visitSummary.externalVisitors ??
                          0
                        }
                      </strong>{" "}
                      {
                        text.external
                      }
                    </span>

                    <span className="text-[#6B7078]">
                      {
                        visitSummary.ownerSessions ??
                        0
                      }{" "}
                      {
                        text.own
                      }
                    </span>

                    {(visitSummary.outreachSessions ??
                      0) >
                    0 ? (
                      <span className="text-[#002BBA]">
                        {
                          visitSummary.outreachSessions
                        }{" "}
                        {
                          text.outreach
                        }
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-[#6B7078]">
                    {
                      viewCount
                    }{" "}
                    {viewCount === 1
                      ? text.view
                      : text.views}
                  </span>
                )}

                <button
                  type="button"
                  disabled={
                    visitsLoading
                  }
                  onClick={() => {
                    setVisitsOpen(
                      true
                    );

                    void loadVisits();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[10.5px] text-[#002BBA] transition-colors hover:bg-[#EAEEFB] hover:text-[#001E85] disabled:opacity-50"
                >
                  {visitsLoading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Eye className="size-3" />
                  )}

                  {
                    text.visitDetails
                  }
                </button>

                <a
                  href={
                    shareUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[10.5px] text-[#002BBA] transition-colors hover:bg-[#EAEEFB] hover:text-[#001E85]"
                >
                  {
                    text.openClientPreview
                  }

                  <ExternalLink className="size-3" />
                </a>

                <button
                  type="button"
                  disabled={
                    shareLoading
                  }
                  onClick={() =>
                    void deactivateCustomerPreview()
                  }
                  className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[10.5px] text-[#6B7078] transition-colors hover:bg-red-500/[0.06] hover:text-red-600 disabled:opacity-50"
                >
                  <Link2Off className="size-3" />

                  {
                    text.deactivateClientPreview
                  }
                </button>
              </div>
            ) : null}

          </div>
        ) : null}
      </section>

      {
        visitsModal
      }
    </>
  );
}
