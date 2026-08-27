"use client";

import {
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Link2,
  Link2Off,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/language-provider";

/* =========================================================
   TYPES
========================================================= */

type RedesignPreviewActionsProps = {
  leadId: string;

  initialPreviewToken:
    | string
    | null;

  initialGenerationIndex:
    number;
};

type DesignVariant = {
  id: string;

  generationIndex: number;

  previewUrl: string;

  chatId: string;

  selected: boolean;

  selectedAt:
    | string
    | null;

  createdAt: string;
};

type DesignResponse = {
  ok?: boolean;

  error?: string;

  exists?: boolean;

  generated?: boolean;

  previewId?: string;

  previewUrl?: string;

  selectedPreviewId?: string;

  selectedPreviewUrl?: string;

  generationIndex?: number;

  variants?: DesignVariant[];
};

type ShareResponse = {
  ok?: boolean;

  error?: string;

  shared?: boolean;

  previewId?: string;

  publicSlug?: string;

  shareUrl?: string;

  viewCount?: number;

  lastViewedAt?:
    | string
    | null;

  createdAt?: string;

  expiresAt?:
    | string
    | null;
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
  },
} as const;

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

    /*
     * Prevent the old variant's public link from appearing
     * while the newly selected variant is loading.
     */
    setShareUrl(
      null
    );

    setViewCount(
      0
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

     NEW SYSTEM:
     This no longer uses the old previewToken.

     The API resolves the CURRENT selected
     design_mockup_variant directly.
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

          /*
           * The route always resolves the current selected
           * variant. Still check previewId defensively.
           */
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

     Important:
     Even when a public URL already exists we POST again.

     That means edits made in DesignEditor are copied into
     the public preview before its link is copied.
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

                NEW:
                Visible for every selected Sol design.
                No old previewToken required.
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
          SHARE STATUS
      =================================================== */}

      {shareUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-3.5" />

            {
              text.active
            }
          </span>

          <span>
            {viewCount}{" "}
            {viewCount ===
            1
              ? text.view
              : text.views}
          </span>
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
    </div>
  );
}