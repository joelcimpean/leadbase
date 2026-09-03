"use client";

import {
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Eye,
  Link2,
  Link2Off,
  Loader2,
  MapPin,
  MousePointer2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
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

/* =========================================================
   COMPONENT
========================================================= */

export function RedesignPreviewActions({
  leadId,
  initialGenerationIndex,
}: RedesignPreviewActionsProps) {
  const {
    language,
  } =
    useLanguage();

  const text =
    copy[
      language
    ];

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

  /* =======================================================
     GENERATE
  ======================================================= */

  async function generate() {
    if (
      generating
    ) {
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
            className="fixed inset-0 z-[9999] flex items-end justify-center overflow-y-auto bg-black/45 p-0 backdrop-blur-[4px] sm:items-center sm:p-6"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="preview-visits-title"
              className="relative my-0 w-full max-h-[calc(100dvh-24px)] overflow-y-auto rounded-t-[26px] border bg-background shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:my-auto sm:max-w-[760px] sm:rounded-[26px]"
            >
              <button
                type="button"
                onClick={() =>
                  setVisitsOpen(
                    false
                  )
                }
                aria-label="Dialog schließen"
                className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:right-5 sm:top-5"
              >
                <X className="size-4" />
              </button>

              <div className="border-b px-5 pb-5 pt-6 pr-16 sm:px-7 sm:pb-6 sm:pt-7 sm:pr-20">
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

              <div className="grid grid-cols-2 gap-2 border-b bg-muted/20 p-4 sm:grid-cols-4 sm:p-5">
                <div className="rounded-xl border bg-background p-3">
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

                <div className="rounded-xl border bg-background p-3">
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

                <div className="rounded-xl border bg-background p-3">
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

                <div className="rounded-xl border bg-background p-3">
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
                  <div className="rounded-xl border border-dashed px-5 py-10 text-center">
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
                            className="rounded-xl border bg-background p-3.5 sm:p-4"
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
                  <div className="mt-4 rounded-xl border bg-muted/20 px-3.5 py-3">
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
      <div className="col-span-2 min-w-0 sm:col-auto">
        <div className="inline-flex h-10 items-center gap-2 rounded-lg border bg-background px-4 text-sm text-muted-foreground sm:h-9">
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

  return (
    <>
      <div className="col-span-2 min-w-0 sm:col-auto">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {variants.length ===
          0 ? (
            <button
              type="button"
              disabled={
                generating
              }
              onClick={() =>
                void generate()
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 sm:h-9"
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}

              {generating
                ? text.generating
                : text.generate}
            </button>
          ) : (
            <>
              {/* =============================================
                  VARIANT DROPDOWN
              ============================================= */}

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
                  className="inline-flex h-10 min-w-[180px] items-center justify-between gap-3 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted sm:h-9"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {selectedVariant
                      ?.selected ? (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="size-2.5" />
                      </span>
                    ) : null}

                    <span className="truncate">
                      {text.variant}{" "}
                      {
                        selectedVariant
                          ?.generationIndex
                      }
                    </span>
                  </span>

                  <ChevronDown
                    className={`size-4 shrink-0 transition-transform duration-200 ${
                      variantsOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {variantsOpen ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[290px] overflow-hidden rounded-xl border bg-popover p-1.5 shadow-xl">
                    <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
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

                          return (
                            <div
                              key={
                                variant.id
                              }
                              className={`flex items-center gap-1 rounded-lg ${
                                variant.selected
                                  ? "bg-emerald-500/10"
                                  : "hover:bg-muted"
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
                                className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left"
                              >
                                <span
                                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                                    variant.selected
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-border"
                                  }`}
                                >
                                  {variant.selected ? (
                                    <Check className="size-3" />
                                  ) : selecting ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : null}
                                </span>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {text.variant}{" "}
                                    {
                                      variant.generationIndex
                                    }
                                  </p>

                                  <p className="truncate text-[11px] text-muted-foreground">
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
                                className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background transition-colors hover:bg-muted"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* =============================================
                  OPEN DESIGN
              ============================================= */}

              {selectedVariant ? (
                <a
                  href={
                    selectedVariant.previewUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-10 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-muted sm:size-9"
                  title={
                    text.open
                  }
                >
                  <ExternalLink className="size-4" />
                </a>
              ) : null}

              {/* =============================================
                  EDIT DESIGN
              ============================================= */}

              {selectedVariant ? (
                <a
                  href={`/design-preview/${encodeURIComponent(
                    selectedVariant.id
                  )}/edit`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted sm:h-9"
                  title={
                    text.edit
                  }
                >
                  <Pencil className="size-4" />

                  <span className="hidden xl:inline">
                    {
                      text.edit
                    }
                  </span>
                </a>
              ) : null}

              {/* =============================================
                  NEW VARIANT
              ============================================= */}

              <button
                type="button"
                disabled={
                  generating
                }
                onClick={() =>
                  void generate()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 sm:h-9"
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}

                <span className="hidden sm:inline">
                  {
                    text.regenerate
                  }
                </span>
              </button>

              {/* =============================================
                  CUSTOMER PREVIEW
              ============================================= */}

              {selectedVariant ? (
                <>
                  <button
                    type="button"
                    disabled={
                      shareLoading
                    }
                    onClick={() =>
                      void createOrCopyCustomerPreview()
                    }
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 ${
                      shareUrl
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-background hover:bg-muted"
                    }`}
                  >
                    {shareLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : copied ? (
                      <Check className="size-4" />
                    ) : shareUrl ? (
                      <Link2 className="size-4" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}

                    {shareLoading
                      ? text.creatingClientPreview
                      : copied
                        ? text.copiedClientLink
                        : shareUrl
                          ? text.copyClientLink
                          : text.createClientPreview}
                  </button>

                  {shareUrl ? (
                    <>
                      <a
                        href={
                          shareUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        title={
                          text.openClientPreview
                        }
                        aria-label={
                          text.openClientPreview
                        }
                        className="flex size-10 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-muted sm:size-9"
                      >
                        <Eye className="size-4" />
                      </a>

                      <button
                        type="button"
                        disabled={
                          shareLoading
                        }
                        onClick={() =>
                          void deactivateCustomerPreview()
                        }
                        title={
                          text.deactivateClientPreview
                        }
                        aria-label={
                          text.deactivateClientPreview
                        }
                        className="flex size-10 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-60 sm:size-9"
                      >
                        <Link2Off className="size-4" />
                      </button>
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>

        {/* ===================================================
            GENERATING
        =================================================== */}

        {generating ? (
          <p className="mt-2 max-w-[420px] text-xs leading-5 text-muted-foreground">
            {
              text.generating
            }
          </p>
        ) : null}

        {/* ===================================================
            SHARE STATUS + VISITOR TRACKING
        =================================================== */}

        {shareUrl ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="size-3.5" />

              {
                text.active
              }
            </span>

            {visitSummary ? (
              <>
                <span className="font-medium text-foreground">
                  {visitSummary.externalVisitors ??
                    0}{" "}
                  {
                    text.external
                  }
                </span>

                <span>
                  {visitSummary.ownerSessions ??
                    0}{" "}
                  {
                    text.own
                  }
                </span>

                {(visitSummary.outreachSessions ??
                  0) >
                0 ? (
                  <span className="text-violet-700 dark:text-violet-300">
                    {visitSummary.outreachSessions}{" "}
                    {
                      text.outreach
                    }
                  </span>
                ) : null}
              </>
            ) : (
              <span>
                {viewCount}{" "}
                {viewCount ===
                1
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
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>
        ) : null}

        {/* ===================================================
            ERRORS
        =================================================== */}

        {error ? (
          <p className="mt-1.5 max-w-[520px] break-words text-xs leading-5 text-red-600 dark:text-red-400">
            {
              error
            }
          </p>
        ) : null}

        {shareError ? (
          <p className="mt-1.5 max-w-[520px] break-words text-xs leading-5 text-red-600 dark:text-red-400">
            {
              shareError
            }
          </p>
        ) : null}

        {visitError &&
        shareUrl ? (
          <p className="mt-1.5 max-w-[520px] break-words text-xs leading-5 text-amber-600 dark:text-amber-400">
            {
              visitError
            }
          </p>
        ) : null}

{shareUrl ? (
  <PreviewGifActions
    leadId={leadId}
    shareUrl={shareUrl}
  />
) : null}
      </div>

      {
        visitsModal
      }
    </>
  );
}
