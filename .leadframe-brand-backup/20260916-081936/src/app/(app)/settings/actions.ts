"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  sendDueFollowUpsForUser,
} from "@/lib/follow-up-worker";
import {
  cancelPendingFollowUps,
} from "@/lib/outreach-pipeline";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   CONFIG
========================================================= */

const ALLOWED_RETENTION_DAYS =
  new Set([
    7,
    14,
    30,
    90,
  ]);

const MIN_FOLLOW_UP_DELAY_DAYS = 1;
const MAX_FOLLOW_UP_DELAY_DAYS = 30;


type NotificationPayload = {
  variant:
    "success"
    | "info"
    | "warning"
    | "error";

  title:
    string;

  description?:
    string;

  items?:
    {
      title:
        string;

      description?:
        string;

      href?:
        string;
    }[];

  action?:
    {
      label:
        string;

      href:
        string;
    };

  durationMs?:
    number;
};

/* =========================================================
   NOTIFICATION REDIRECT
========================================================= */

function redirectWithNotice(
  path:
    string,
  notification:
    NotificationPayload
) {
  const params =
    new URLSearchParams();

  params.set(
    "notice",
    JSON.stringify(
      notification
    )
  );

  redirect(
    `${path}?${params.toString()}#follow-ups`
  );
}

/* =========================================================
   UPDATE TRASH RETENTION
========================================================= */

export async function updateInboxPreferences(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    return;
  }

  const rawValue =
    formData.get(
      "trashRetentionDays"
    );

  if (
    typeof rawValue !==
    "string"
  ) {
    return;
  }

  let trashRetentionDays:
    number | null;

  if (
    rawValue ===
    "never"
  ) {
    trashRetentionDays =
      null;
  } else {
    const value =
      Number(
        rawValue
      );

    if (
      !ALLOWED_RETENTION_DAYS.has(
        value
      )
    ) {
      return;
    }

    trashRetentionDays =
      value;
  }

  const {
    error,
  } =
    await supabase
      .from(
        "inbox_preferences"
      )
      .upsert(
        {
          user_id:
            user.id,

          trash_retention_days:
            trashRetentionDays,
        },
        {
          onConflict:
            "user_id",
        }
      );

  if (
    error
  ) {
    console.error(
      "Could not update inbox preferences:",
      error
    );

    return;
  }

  revalidatePath(
    "/settings"
  );

  revalidatePath(
    "/inbox"
  );
}


/* =========================================================
   UPDATE DEFAULT FOLLOW-UP DELAY
========================================================= */

export async function updateFollowUpDelay(
  formData:
    FormData
) {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const rawValue =
    formData.get(
      "followUpDelayDays"
    );

  const value =
    typeof rawValue ===
      "string"
      ? Number(
          rawValue
        )
      : Number.NaN;

  if (
    !Number.isInteger(
      value
    ) ||
    value <
      MIN_FOLLOW_UP_DELAY_DAYS ||
    value >
      MAX_FOLLOW_UP_DELAY_DAYS
  ) {
    redirectWithNotice(
      "/settings",
      {
        variant:
          "warning",

        title:
          language ===
          "de"
            ? "Ungültige Follow-up-Verzögerung"
            : "Invalid follow-up delay",

        description:
          language ===
          "de"
            ? "Wähle einen Wert zwischen 1 und 30 Tagen."
            : "Choose a value between 1 and 30 days.",
      }
    );
  }

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "outreach_preferences"
      )
      .upsert(
        {
          user_id:
            user.id,

          follow_up_delay_days:
            value,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "user_id",
        }
      );

  if (
    error
  ) {
    console.error(
      "Could not update follow-up delay preference:",
      error
    );

    redirectWithNotice(
      "/settings",
      {
        variant:
          "error",

        title:
          language ===
          "de"
            ? "Follow-up-Verzögerung konnte nicht gespeichert werden"
            : "Follow-up delay could not be saved",

        description:
          error.message,
      }
    );
  }

  revalidatePath(
    "/settings"
  );

  redirectWithNotice(
    "/settings",
    {
      variant:
        "success",

      title:
        language ===
        "de"
          ? "Follow-up-Verzögerung gespeichert"
          : "Follow-up delay saved",

      description:
        language ===
        "de"
          ? `Neue Outreach-Mails planen ihr Standard-Follow-up nach ${value} ${value === 1 ? "Tag" : "Tagen"}.`
          : `New outreach emails will schedule their default follow-up after ${value} ${value === 1 ? "day" : "days"}.`,
    }
  );
}

/* =========================================================
   AUTOMATIC FOLLOW-UPS ON / OFF
========================================================= */

export async function updateAutomaticFollowUps(
  formData:
    FormData
) {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const rawEnabled =
    formData.get(
      "enabled"
    );

  if (
    rawEnabled !==
      "true" &&
    rawEnabled !==
      "false"
  ) {
    return;
  }

  const enabled =
    rawEnabled ===
    "true";

  const {
    data: {
      user,
    },

    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "outreach_preferences"
      )
      .upsert(
        {
          user_id:
            user.id,

          automatic_follow_ups:
            enabled,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "user_id",
        }
      );

  if (
    error
  ) {
    console.error(
      "Could not update automatic follow-up preference:",
      error
    );

    redirectWithNotice(
      "/settings",
      {
        variant:
          "error",

        title:
          language ===
          "de"
            ? "Follow-up-Automation konnte nicht geändert werden"
            : "Follow-up automation could not be changed",

        description:
          error.message,
      }
    );
  }

  revalidatePath(
    "/settings"
  );

  revalidatePath(
    "/"
  );

  redirectWithNotice(
    "/settings",
    {
      variant:
        "success",

      title:
        enabled
          ? language ===
              "de"
            ? "Automatische Follow-ups aktiviert"
            : "Automatic follow-ups enabled"
          : language ===
              "de"
            ? "Automatische Follow-ups deaktiviert"
            : "Automatic follow-ups disabled",

      description:
        enabled
          ? language ===
              "de"
            ? "Fällige Follow-ups werden ab jetzt vom bestehenden Cron verarbeitet."
            : "Due follow-ups will now be processed by the existing cron."
          : language ===
              "de"
            ? "Fällige Follow-ups werden nicht mehr automatisch versendet."
            : "Due follow-ups will no longer be sent automatically.",
    }
  );
}

/* =========================================================
   STOP SCHEDULED FOLLOW-UPS
========================================================= */

export async function stopSingleScheduledFollowUp(
  leadId:
    string,
  _formData:
    FormData
) {
  const normalizedLeadId =
    leadId.trim();

  if (
    !normalizedLeadId
  ) {
    return;
  }

  const formData =
    new FormData();

  formData.set(
    "stopLeadId",
    normalizedLeadId
  );

  return stopScheduledFollowUps(
    formData
  );
}

export async function stopScheduledFollowUps(
  formData:
    FormData
) {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const {
    data: {
      user,
    },

    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const singleLeadId =
    formData.get(
      "stopLeadId"
    );

  const selectedLeadIds =
    typeof singleLeadId ===
      "string" &&
    singleLeadId.trim()
      ? [
          singleLeadId.trim(),
        ]
      : Array.from(
          new Set(
            formData
              .getAll(
                "leadIds"
              )
              .filter(
                (
                  value
                ): value is string =>
                  typeof value ===
                  "string"
              )
              .map(
                (
                  value
                ) =>
                  value.trim()
              )
              .filter(
                Boolean
              )
          )
        );

  if (
    selectedLeadIds.length ===
    0
  ) {
    redirectWithNotice(
      "/settings",
      {
        variant:
          "warning",

        title:
          language ===
          "de"
            ? "Keine Follow-ups ausgewählt"
            : "No follow-ups selected",

        description:
          language ===
          "de"
            ? "Wähle mindestens ein Follow-up aus, das nicht mehr gesendet werden soll."
            : "Select at least one follow-up that should no longer be sent.",
      }
    );
  }

  const stoppedAt =
    new Date()
      .toISOString();

  const {
    data:
      stopped,
    error,
  } =
    await supabase
      .from(
        "leads"
      )
      .update({
        next_follow_up_at:
          null,

        smart_follow_up_mode:
          "STOPPED",

        smart_follow_up_reason:
          "Manually stopped in Settings.",

        smart_follow_up_updated_at:
          stoppedAt,

        manual_follow_up_stopped_at:
          stoppedAt,
      })
      .eq(
        "user_id",
        user.id
      )
      .in(
        "id",
        selectedLeadIds
      )
      .not(
        "next_follow_up_at",
        "is",
        null
      )
      .select(
        "id"
      );

  if (
    error
  ) {
    console.error(
      "Could not stop scheduled follow-ups:",
      error
    );

    redirectWithNotice(
      "/settings",
      {
        variant:
          "error",

        title:
          language ===
          "de"
            ? "Follow-up konnte nicht gestoppt werden"
            : "Follow-up could not be stopped",

        description:
          error.message,
      }
    );
  }

  revalidatePath(
    "/settings"
  );

  revalidatePath(
    "/leads"
  );

  revalidatePath(
    "/"
  );

  await Promise.all((stopped ?? []).map((row) =>
    cancelPendingFollowUps({
      supabase,
      userId: user.id,
      leadId: row.id,
      reason: "manual_stop",
      detail: "Manually stopped in Settings.",
    })
  ));

  const stoppedCount =
    stopped?.length ??
    0;

  redirectWithNotice(
    "/settings",
    {
      variant:
        "success",

      title:
        language ===
        "de"
          ? stoppedCount ===
              1
            ? "Follow-up gestoppt"
            : `${stoppedCount} Follow-ups gestoppt`
          : stoppedCount ===
              1
            ? "Follow-up stopped"
            : `${stoppedCount} follow-ups stopped`,

      description:
        language ===
        "de"
          ? "Diese Leads werden in der Liste nicht mehr angezeigt und nicht automatisch nachgefasst."
          : "These leads will no longer appear in the list and will not be followed up automatically.",
    }
  );
}

/* =========================================================
   SEND ALL DUE FOLLOW-UPS NOW
========================================================= */

export async function sendScheduledFollowUpsNow(
  formData:
    FormData
) {
  const [
    supabase,
    language,
  ] =
    await Promise.all([
      createClient(),
      getAppLanguage(),
    ]);

  const {
    data: {
      user,
    },

    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const selectedLeadIds =
    Array.from(
      new Set(
        formData
          .getAll(
            "leadIds"
          )
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
              "string"
          )
          .map(
            (
              value
            ) =>
              value.trim()
          )
          .filter(
            Boolean
          )
      )
    );

  if (
    selectedLeadIds.length ===
      0
  ) {
    redirectWithNotice(
      "/settings",
      {
        variant:
          "warning",

        title:
          language ===
          "de"
            ? "Keine Follow-ups ausgewählt"
            : "No follow-ups selected",

        description:
          language ===
          "de"
            ? "Wähle mindestens ein geplantes Follow-up aus."
            : "Select at least one scheduled follow-up.",
      }
    );
  }

  try {
    const result =
      await sendDueFollowUpsForUser({
        userId:
          user.id,

        limit:
          Math.min(
            100,
            selectedLeadIds.length
          ),

        allowEarlySend:
          true,

        leadIds:
          selectedLeadIds,
      });

    revalidatePath(
      "/settings"
    );

    revalidatePath(
      "/"
    );

    revalidatePath(
      "/leads"
    );

    const issueItems =
      result.results
        .filter(
          (
            item
          ) =>
            item.result !==
            "SENT"
        )
        .slice(
          0,
          5
        )
        .map(
          (
            item
          ) => ({
            title:
              item.companyName,

            description:
              item.reason
                ?.toLowerCase()
                .includes(
                  "gmail api rate limit"
                )
                ? language ===
                    "de"
                  ? "Gmail-Limit erreicht. Diese Mail wurde nicht als gesendet markiert. Warte etwa eine Minute und versuche sie dann erneut; Leadbase hat den restlichen Batch vorsichtshalber gestoppt."
                  : "Gmail rate limit reached. This email was not marked as sent. Wait about a minute and retry; Leadbase stopped the remaining batch as a precaution."
                : item.reason ??
                  (
                    language ===
                    "de"
                      ? "Follow-up wurde nicht versendet."
                      : "Follow-up was not sent."
                  ),

            href:
              `/leads/${item.leadId}`,
          })
        );

    const issueCount =
      result.skipped +
      result.failed;

    const allFailed =
      result.sent ===
        0 &&
      result.failed >
        0;

    redirectWithNotice(
      "/settings",
      {
        variant:
          allFailed
            ? "error"
            : issueCount >
                0
              ? "warning"
              : "success",

        title:
          issueCount >
          0
            ? language ===
                "de"
              ? "Follow-ups verarbeitet – nicht alle wurden gesendet"
              : "Follow-ups processed — some were not sent"
            : language ===
                "de"
              ? "Follow-ups jetzt gesendet"
              : "Follow-ups sent now",

        description:
          language ===
          "de"
            ? `${result.sent} gesendet · ${result.skipped} übersprungen · ${result.failed} fehlgeschlagen`
            : `${result.sent} sent · ${result.skipped} skipped · ${result.failed} failed`,

        items:
          issueItems,

        durationMs:
          issueCount >
          0
            ? 14_000
            : 7_000,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Bulk follow-up send failed:",
      error
    );

    redirectWithNotice(
      "/settings",
      {
        variant:
          "error",

        title:
          language ===
          "de"
            ? "Follow-ups konnten nicht verarbeitet werden"
            : "Follow-ups could not be processed",

        description:
          error instanceof
            Error
            ? error.message
            : language ===
                "de"
              ? "Unbekannter Fehler"
              : "Unknown error",
      }
    );
  }
}
