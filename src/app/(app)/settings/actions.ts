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
    `${path}?${params.toString()}`
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
   SEND ALL DUE FOLLOW-UPS NOW
========================================================= */

export async function sendDueFollowUpsNow() {
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

  try {
    const result =
      await sendDueFollowUpsForUser({
        userId:
          user.id,

        limit:
          25,
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
              item.reason ??
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
              ? "Follow-ups erfolgreich gesendet"
              : "Follow-ups sent successfully",

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
