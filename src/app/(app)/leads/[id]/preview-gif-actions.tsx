"use client";

import {
  Check,
  ChevronDown,
  Film,
  Loader2,
  RefreshCw,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useAppNotifications,
} from "@/components/app-notifications";

import {
  useLanguage,
} from "@/components/language-provider";
import { useLeadbasePlan } from "@/hooks/use-leadbase-plan";
import { planAllowsFeature } from "@/lib/plan-entitlements";

/* =========================================================
   TYPES
========================================================= */

type PreviewGifActionsProps = {
  leadId:
    string;

  shareUrl:
    string;
};

type GifStatus =
  | "NOT_GENERATED"
  | "GENERATING"
  | "READY"
  | "FAILED";

type GifResponse = {
  ok?:
    boolean;

  exists?:
    boolean;

  status?:
    GifStatus;

  gifUrl?:
    string
    | null;

  generatedAt?:
    string
    | null;

  bytes?:
    number
    | null;

  error?:
    string
    | null;
};

/* =========================================================
   COMPONENT
========================================================= */

export function PreviewGifActions({
  leadId,
  shareUrl,
}: PreviewGifActionsProps) {
  const {
    language,
  } =
    useLanguage();

  const {
    notify,
  } =
    useAppNotifications();

  const {
    planId,
    loading: planLoading,
  } = useLeadbasePlan();
  const canUsePreviewGif = planAllowsFeature(planId, "preview_gif");

  const [
    status,
    setStatus,
  ] =
    useState<GifStatus>(
      "NOT_GENERATED"
    );

  const [
    gifUrl,
    setGifUrl,
  ] =
    useState<
      string
      | null
    >(
      null
    );

  const [
    bytes,
    setBytes,
  ] =
    useState<
      number
      | null
    >(
      null
    );

  const [
    loading,
    setLoading,
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
    expanded,
    setExpanded,
  ] =
    useState(
      false
    );

  const text =
    language ===
      "de"
      ? {
          label:
            "E-Mail-GIF",

          ready:
            "Bereit",

          missing:
            "Noch nicht erstellt",

          create:
            "Erstellen",

          regenerate:
            "Neu erstellen",

          generating:
            "Wird erstellt...",

          success:
            "Preview-GIF erstellt",

          successDescription:
            "Der animierte E-Mail-Teaser ist jetzt bereit.",

          failed:
            "GIF-Erstellung fehlgeschlagen",

          open:
            "GIF öffnen",

          preview:
            "Vorschau",

          size:
            "Größe",
        }
      : {
          label:
            "Email GIF",

          ready:
            "Ready",

          missing:
            "Not generated",

          create:
            "Create",

          regenerate:
            "Regenerate",

          generating:
            "Creating...",

          success:
            "Preview GIF created",

          successDescription:
            "The animated email teaser is ready.",

          failed:
            "GIF generation failed",

          open:
            "Open GIF",

          preview:
            "Preview",

          size:
            "Size",
        };

  const loadStatus =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/leads/${encodeURIComponent(
                leadId
              )}/preview-gif`,
              {
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as
              GifResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            return;
          }

          setStatus(
            result.status ??
            "NOT_GENERATED"
          );

          setGifUrl(
            result.gifUrl ??
            null
          );

          setBytes(
            result.bytes ??
            null
          );
        } catch (
          error
        ) {
          console.error(
            "Could not load preview GIF status:",
            error
          );
        } finally {
          setLoading(
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
      void loadStatus();
    },
    [
      loadStatus,
      shareUrl,
    ]
  );

  async function generate() {
    if (
      generating
    ) {
      return;
    }

    if (!canUsePreviewGif) {
      notify({
        variant: "warning",
        title: language === "de" ? "Pro-Feature" : "Pro feature",
        description:
          language === "de"
            ? "Preview-GIFs sind ab dem Pro-Plan verfügbar."
            : "Preview GIFs are available from the Pro plan.",
      });
      return;
    }

    setGenerating(
      true
    );

    setStatus(
      "GENERATING"
    );

    try {
      const response =
        await fetch(
          `/api/leads/${encodeURIComponent(
            leadId
          )}/preview-gif`,
          {
            method:
              "POST",
          }
        );

      const result =
        (await response.json()) as
          GifResponse;

      if (
        !response.ok ||
        !result.ok ||
        !result.gifUrl
      ) {
        throw new Error(
          result.error ??
          text.failed
        );
      }

      setStatus(
        "READY"
      );

      setGifUrl(
        result.gifUrl
      );

      setBytes(
        result.bytes ??
        null
      );

      setExpanded(
        true
      );

      notify({
        variant:
          "success",

        title:
          text.success,

        description:
          text.successDescription,
      });
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : text.failed;

      setStatus(
        "FAILED"
      );

      notify({
        variant:
          "error",

        title:
          text.failed,

        description:
          message,

        durationMs:
          12_000,
      });
    } finally {
      setGenerating(
        false
      );
    }
  }

  const sizeLabel =
    bytes
      ? bytes <
        1024 *
          1024
        ? `${Math.round(
            bytes /
              1024
          )} KB`
        : `${(
            bytes /
            1024 /
            1024
          ).toFixed(
            1
          )} MB`
      : null;

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-[10px] border border-black/[0.07] bg-[#FBFBFC] px-3 text-[10.5px] text-[#6B7078] dark:border-white/[0.08] dark:bg-white/[0.025]">
        <Loader2 className="size-3.5 animate-spin" />

        {
          text.label
        }
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-[10px] border border-black/[0.07] bg-[#FBFBFC] dark:border-white/[0.08] dark:bg-white/[0.025]">
      <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Film className="size-3.5 shrink-0 text-[#002BBA]" />

          <p className="whitespace-nowrap text-[11.5px] font-medium">
            {
              text.label
            }
          </p>

          <span
            className={`shrink-0 rounded-[6px] px-1.5 py-[2px] font-mono text-[8px] uppercase tracking-[0.05em] ${
              status ===
              "READY"
                ? "bg-[#EAEEFB] text-[#002BBA] dark:bg-[#002BBA]/20 dark:text-[#8EA6FF]"
                : status ===
                    "FAILED"
                  ? "bg-red-500/10 text-red-700 dark:text-red-300"
                  : "bg-black/[0.05] text-[#6B7078] dark:bg-white/[0.06]"
            }`}
          >
            {status ===
            "READY"
              ? text.ready
              : status ===
                  "GENERATING"
                ? text.generating
                : text.missing}
          </span>

          {sizeLabel ? (
            <span className="truncate text-[9.5px] text-[#6B7078]">
              {
                sizeLabel
              }
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {gifUrl ? (
            <button
              type="button"
              onClick={() =>
                setExpanded(
                  (
                    current
                  ) =>
                    !current
                )
              }
              className="inline-flex h-7 items-center gap-1 rounded-[8px] px-2 text-[10.5px] font-medium text-[#002BBA] transition-colors hover:bg-[#EAEEFB] hover:text-[#001E85]"
            >
              {
                text.preview
              }

              <ChevronDown
                className={`size-3 transition-transform ${
                  expanded
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>
          ) : null}

          <button
            type="button"
            disabled={
              generating ||
              planLoading ||
              !canUsePreviewGif
            }
            title={!canUsePreviewGif ? (language === "de" ? "Ab Pro" : "Pro+") : undefined}
            onClick={() =>
              void generate()
            }
            className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-[10.5px] font-medium text-[#40454E] transition-colors hover:border-black/[0.15] hover:bg-[#FDFDFE] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.10] dark:bg-[#15161A] dark:text-white"
          >
            {generating ? (
              <Loader2 className="size-3 animate-spin" />
            ) : gifUrl ? (
              <RefreshCw className="size-3" />
            ) : (
              <Film className="size-3" />
            )}

            {generating
              ? text.generating
              : gifUrl
                ? text.regenerate
                : text.create}
          </button>
        </div>
      </div>

      {gifUrl &&
      expanded ? (
        <div className="border-t border-black/[0.07] p-2.5 dark:border-white/[0.08]">
          <a
            href={
              shareUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-[9px] border border-black/[0.08] bg-white dark:border-white/[0.10]"
          >
            <img
              src={
                gifUrl
              }
              alt=""
              className="block aspect-[16/10] w-full object-cover"
            />
          </a>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[10px] text-muted-foreground">
              {text.size}:{" "}
              {
                sizeLabel ??
                "—"
              }
            </p>

            <a
              href={
                gifUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[7px] px-1.5 py-1 text-[10.5px] font-medium text-[#002BBA] transition-colors hover:bg-[#EAEEFB] hover:text-[#001E85]"
            >
              {
                text.open
              }
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
