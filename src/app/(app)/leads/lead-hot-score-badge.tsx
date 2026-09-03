"use client";

import {
  Flame,
  TrendingUp,
} from "lucide-react";

import {
  useLanguage,
} from "@/components/language-provider";

/* =========================================================
   TYPES
========================================================= */

export type HotLeadSummary = {
  score:
    number;

  level:
    "COLD"
    | "COOL"
    | "WARM"
    | "HOT";

  reasons:
    {
      key:
        string;

      label:
        string;

      points:
        number;
    }[];

  priorityRaised:
    boolean;
};

/* =========================================================
   I18N
========================================================= */

const ENGLISH_REASON_LABELS:
  Record<
    string,
    string
  > = {
  opportunity:
    "Opportunity score",

  email_verified:
    "Email verified on website",

  email_domain:
    "Email domain matches",

  email_valid:
    "Plausible email",

  email_risk:
    "Unsafe email",

  preview_viewed:
    "Customer preview opened",

  outreach_click:
    "Outreach link opened",

  preview_engaged:
    "Engaged with preview",

  preview_repeat:
    "Returned to preview",

  preview_duration:
    "Preview viewing time",

  preview_scroll:
    "Preview scroll depth",

  preview_interaction:
    "Interacted with preview",

  reply_interested:
    "Reply classified as interested",

  reply_question:
    "Customer asked a question",

  reply_later:
    "Customer requested later follow-up",

  reply_neutral:
    "Real customer reply received",

  reply_negative:
    "Clear rejection detected",

  reply_bounce:
    "Email bounced",

  status_replied:
    "Lead replied",
};

function reasonLabel({
  key,
  fallback,
  language,
}: {
  key:
    string;

  fallback:
    string;

  language:
    "de"
    | "en";
}) {
  if (
    language ===
    "en"
  ) {
    return (
      ENGLISH_REASON_LABELS[
        key
      ] ??
      fallback
    );
  }

  return fallback;
}

/* =========================================================
   COMPONENT
========================================================= */

export function LeadHotScoreIndicator({
  summary,
}: {
  summary:
    HotLeadSummary;
}) {
  const {
    language,
  } =
    useLanguage();

  if (
    summary.level ===
      "COLD"
  ) {
    return null;
  }

  const hot =
    summary.level ===
    "HOT";

  const warm =
    summary.level ===
    "WARM";

  const label =
    language ===
    "en"
      ? hot
        ? "HOT"
        : warm
          ? "WARM"
          : "ACTIVE"
      : hot
        ? "HOT"
        : warm
          ? "Warm"
          : "Aktiv";

  const tooltip =
    summary.reasons
      .slice(
        0,
        5
      )
      .map(
        (
          reason
        ) =>
          `${reason.points > 0 ? "+" : ""}${reason.points} · ${reasonLabel({
            key:
              reason.key,

            fallback:
              reason.label,

            language,
          })}`
      )
      .join(
        "\n"
      );

  return (
    <span
      title={
        tooltip ||
        (
          language ===
          "de"
            ? "Hot Lead Score"
            : "Hot lead score"
        )
      }
      className={`inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-1.5 text-[9px] font-bold ${
        hot
          ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300"
          : warm
            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
            : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
      }`}
    >
      {hot ? (
        <Flame className="size-2.5" />
      ) : (
        <TrendingUp className="size-2.5" />
      )}

      <span>
        {
          summary.score
        }
      </span>

      <span>
        {
          label
        }
      </span>
    </span>
  );
}
