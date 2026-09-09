"use client";

import {
  useRef,
  useState,
} from "react";

import {
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

export function ProjectMediaUploader({
  projectId,
  initialUrl,
  initialMode,
  language,
}: {
  projectId: string;
  initialUrl:
    string
    | null;
  initialMode:
    string
    | null;
  language:
    "de"
    | "en";
}) {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const de =
    language ===
    "de";

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState<string | null>(
      initialUrl
    );

  const [
    mode,
    setMode,
  ] =
    useState<
      "cover"
      | "logo"
    >(
      initialMode ===
        "logo"
        ? "logo"
        : "cover"
    );

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  function chooseFile(
    nextFile:
      File
      | null
  ) {
    setError(
      null
    );
    setFile(
      nextFile
    );

    if (
      nextFile
    ) {
      const objectUrl =
        URL.createObjectURL(
          nextFile
        );

      setPreviewUrl(
        objectUrl
      );
    }
  }

  async function changeMode(
    nextMode:
      "cover"
      | "logo"
  ) {
    setMode(
      nextMode
    );

    if (
      !previewUrl ||
      file ||
      busy
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/projects/${encodeURIComponent(
            projectId
          )}/media`,
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                mode:
                  nextMode,
              }),
          }
        );

      const result =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !result.ok
      ) {
        setError(
          result.error ??
            (de
              ? "Darstellung konnte nicht gespeichert werden."
              : "Display mode could not be saved.")
        );
      }
    } catch {
      setError(
        de
          ? "Darstellung konnte nicht gespeichert werden."
          : "Display mode could not be saved."
      );
    }
  }

  async function upload() {
    if (
      !file ||
      busy
    ) {
      return;
    }

    setBusy(
      true
    );
    setError(
      null
    );

    try {
      const formData =
        new FormData();

      formData.set(
        "file",
        file
      );
      formData.set(
        "mode",
        mode
      );

      const response =
        await fetch(
          `/api/projects/${encodeURIComponent(
            projectId
          )}/media`,
          {
            method:
              "POST",
            body:
              formData,
          }
        );

      const result =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
          mediaUrl?: string;
        };

      if (
        !response.ok ||
        !result.ok
      ) {
        setError(
          result.error ??
            (de
              ? "Upload fehlgeschlagen."
              : "Upload failed.")
        );
        return;
      }

      setFile(
        null
      );
      setPreviewUrl(
        result.mediaUrl ??
          previewUrl
      );
    } finally {
      setBusy(
        false
      );
    }
  }

  async function remove() {
    if (
      busy ||
      !previewUrl
    ) {
      return;
    }

    setBusy(
      true
    );
    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/projects/${encodeURIComponent(
            projectId
          )}/media`,
          {
            method:
              "DELETE",
          }
        );

      const result =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
        };

      if (
        response.ok &&
        result.ok
      ) {
        setPreviewUrl(
          null
        );
        setFile(
          null
        );
      } else {
        setError(
          result.error ??
            (de
              ? "Bild konnte nicht entfernt werden."
              : "Image could not be removed.")
        );
      }
    } finally {
      setBusy(
        false
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">
            {de
              ? "Projektbild / Logo"
              : "Project image / logo"}
          </h3>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {de
              ? "Optional. Verwende ein Showcase-Bild oder dein Kundenlogo für die Projektkarte."
              : "Optional. Add a showcase image or client logo to the project card."}
          </p>
        </div>

        <ImagePlus className="size-4 shrink-0 text-primary" />
      </div>

      <button
        type="button"
        onClick={() =>
          inputRef.current?.click()
        }
        className="group relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border/80 bg-muted/20 transition hover:border-primary/30 hover:bg-primary/[0.025]"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              previewUrl
            }
            alt=""
            className={`h-full w-full ${
              mode ===
              "logo"
                ? "object-contain p-8"
                : "object-cover"
            }`}
          />
        ) : (
          <div className="text-center text-muted-foreground">
            <Upload className="mx-auto size-5" />
            <p className="mt-2 text-xs font-medium">
              {de
                ? "Bild auswählen"
                : "Choose image"}
            </p>
            <p className="mt-1 text-[11px]">
              JPG, PNG, WebP oder GIF · max. 6 MB
            </p>
          </div>
        )}

        {previewUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
            <span className="rounded-lg bg-black/55 px-3 py-1.5 text-xs font-medium backdrop-blur">
              {de
                ? "Anderes Bild wählen"
                : "Choose another image"}
            </span>
          </div>
        ) : null}
      </button>

      <input
        ref={
          inputRef
        }
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(
          event
        ) =>
          chooseFile(
            event.target.files?.[0] ??
              null
          )
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            void changeMode(
              "cover"
            )
          }
          className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
            mode ===
            "cover"
              ? "border-primary/30 bg-primary/[0.06] text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          {de
            ? "Showcase · ausfüllen"
            : "Showcase · cover"}
        </button>

        <button
          type="button"
          onClick={() =>
            void changeMode(
              "logo"
            )
          }
          className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
            mode ===
            "logo"
              ? "border-primary/30 bg-primary/[0.06] text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          {de
            ? "Logo · einpassen"
            : "Logo · contain"}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-500">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={
            busy ||
            !file
          }
          onClick={
            upload
          }
          className="gap-2"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {de
            ? "Bild speichern"
            : "Save image"}
        </Button>

        {previewUrl ? (
          <Button
            type="button"
            variant="outline"
            disabled={
              busy
            }
            onClick={
              remove
            }
            className="gap-2 text-red-500 hover:text-red-500"
          >
            <Trash2 className="size-4" />
            {de
              ? "Entfernen"
              : "Remove"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
