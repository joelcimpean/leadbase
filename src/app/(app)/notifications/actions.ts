"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

async function authenticatedClient() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    supabase,
    user,
  };
}

function revalidateNotifications() {
  revalidatePath(
    "/notifications"
  );

  revalidatePath(
    "/",
    "layout"
  );
}

export async function markAllNotificationsRead() {
  const auth =
    await authenticatedClient();

  if (!auth) {
    return;
  }

  const now =
    new Date().toISOString();

  const {
    error,
  } = await auth.supabase
    .from("app_notifications")
    .update({
      read_at: now,
    })
    .eq(
      "user_id",
      auth.user.id
    )
    .is(
      "read_at",
      null
    );

  if (error) {
    console.error(
      "Could not mark notifications read:",
      error
    );
  }

  revalidateNotifications();
}

export async function markNotificationRead(
  formData: FormData
) {
  const auth =
    await authenticatedClient();

  if (!auth) {
    return;
  }

  const id =
    formData.get("id");

  if (
    typeof id !== "string" ||
    !id
  ) {
    return;
  }

  const {
    error,
  } = await auth.supabase
    .from("app_notifications")
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq("id", id)
    .eq(
      "user_id",
      auth.user.id
    );

  if (error) {
    console.error(
      "Could not mark notification read:",
      error
    );
  }

  revalidateNotifications();
}

export async function clearReadNotifications() {
  const auth =
    await authenticatedClient();

  if (!auth) {
    return;
  }

  const {
    error,
  } = await auth.supabase
    .from("app_notifications")
    .delete()
    .eq(
      "user_id",
      auth.user.id
    )
    .not(
      "read_at",
      "is",
      null
    );

  if (error) {
    console.error(
      "Could not clear read notifications:",
      error
    );
  }

  revalidateNotifications();
}
