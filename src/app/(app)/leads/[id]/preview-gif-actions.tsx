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
      <div className="mt-2 inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />

        {
          text.label
        }
      </div>
    );
  }

  return (
    <div className="mt-2 max-w-[620px] overflow-hidden rounded-xl border bg-muted/10">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Film className="size-3.5 text-muted-foreground" />

          <p className="text-xs font-semibold">
            {
              text.label
            }
          </p>

          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              status ===
              "READY"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : status ===
                    "FAILED"
                  ? "bg-red-500/10 text-red-700 dark:text-red-300"
                  : "bg-muted text-muted-foreground"
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
            <span className="text-[10px] text-muted-foreground">
              {
                sizeLabel
              }
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
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
              className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted"
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
              generating
            }
            onClick={() =>
              void generate()
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="border-t p-3">
          <a
            href={
              shareUrl
            }
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border bg-white"
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
              className="text-[11px] font-medium underline-offset-4 hover:underline"
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
