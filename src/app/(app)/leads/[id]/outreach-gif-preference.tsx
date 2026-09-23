"use client";

import {
  Film,
  Loader2,
} from "lucide-react";

import {
  useState,
  useTransition,
} from "react";

import {
  updateLeadOutreachGifPreference,
} from "../outreach-actions";

import {
  useAppNotifications,
} from "@/components/app-notifications";

import {
  useLanguage,
} from "@/components/language-provider";

/* =========================================================
   COMPONENT
========================================================= */

export function OutreachGifPreference({
  leadId,
  initialEnabled,
  gifReady,
}: {
  leadId:
    string;

  initialEnabled:
    boolean;

  gifReady:
    boolean;
}) {
  const {
    language,
  } =
    useLanguage();

  const {
    notify,
  } =
    useAppNotifications();

  const [
    enabled,
    setEnabled,
  ] =
    useState(
      initialEnabled
    );

  const [
    pending,
    startTransition,
  ] =
    useTransition();

  const text =
    language ===
      "de"
      ? {
          title:
            "GIF im Outreach",

          description:
            gifReady
              ? "Der animierte Preview-Teaser wird für diesen Lead im Outreach verwendet."
              : "Sobald ein GIF bereit ist, kann es im Outreach verwendet werden.",

          on:
            "Aktiv",

          off:
            "Aus",

          saved:
            "GIF-Einstellung gespeichert",

          saveError:
            "GIF-Einstellung konnte nicht gespeichert werden.",
        }
      : {
          title:
            "GIF in outreach",

          description:
            gifReady
              ? "The animated preview teaser will be used for this lead's outreach."
              : "Once a GIF is ready, it can be used in outreach.",

          on:
            "On",

          off:
            "Off",

          saved:
            "GIF preference saved",

          saveError:
            "GIF preference could not be saved.",
        };

  if (!gifReady) {
    return null;
  }

  function togglePreference() {
    if (
      pending
    ) {
      return;
    }

    const next =
      !enabled;

    setEnabled(
      next
    );

    startTransition(
      async () => {
        const result =
          await updateLeadOutreachGifPreference(
            leadId,
            next
          );

        if (
          !result.ok
        ) {
          setEnabled(
            !next
          );

          notify({
            variant:
              "error",

            title:
              text.saveError,

            description:
              result.error,
          });

          return;
        }

        notify({
          variant:
            "success",

          title:
            text.saved,

          description:
            `${text.title}: ${next ? text.on : text.off}`,
        });
      }
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/20">
          <Film className="size-3.5" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold">
              {
                text.title
              }
            </p>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                enabled
                  ? "bg-[#EAEEFB] text-[#002BBA] dark:bg-[#002BBA]/20 dark:text-[#8EA6FF]"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {enabled
                ? text.on
                : text.off}
            </span>
          </div>

          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {
              text.description
            }
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={
          enabled
        }
        disabled={
          pending
        }
        onClick={
          togglePreference
        }
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60 ${
          enabled
            ? "border-[#002BBA] bg-[#002BBA]"
            : "border-border bg-muted"
        }`}
      >
        <span
          className={`flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
            enabled
              ? "translate-x-[19px]"
              : "translate-x-[1px]"
          }`}
        >
          {pending ? (
            <Loader2 className="size-3 animate-spin text-neutral-700" />
          ) : null}
        </span>
      </button>
    </div>
  );
}
