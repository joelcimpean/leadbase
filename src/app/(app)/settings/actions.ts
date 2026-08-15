"use server";

import {
  revalidatePath,
} from "next/cache";

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