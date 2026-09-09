"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  error?: string;
};

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return { supabase, user };
}

function revalidateNotifications() {
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const auth = await authenticatedClient();
  if (!auth) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const { error } = await auth.supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", auth.user.id)
    .is("read_at", null);

  if (error) {
    console.error("Could not mark notifications read:", error);
    return { ok: false, error: "Benachrichtigungen konnten nicht aktualisiert werden." };
  }

  revalidateNotifications();
  return { ok: true };
}

export async function markNotificationReadById(id: string): Promise<ActionResult> {
  const auth = await authenticatedClient();
  if (!auth) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const cleanId = typeof id === "string" ? id.trim() : "";
  if (!cleanId) {
    return { ok: false, error: "Ungültige Benachrichtigung." };
  }

  const { error } = await auth.supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", cleanId)
    .eq("user_id", auth.user.id);

  if (error) {
    console.error("Could not mark notification read:", error);
    return { ok: false, error: "Benachrichtigung konnte nicht aktualisiert werden." };
  }

  revalidateNotifications();
  return { ok: true };
}

// Kept for backwards compatibility with the previous form-action page.
export async function markNotificationRead(formData: FormData): Promise<ActionResult> {
  const id = formData.get("id");
  if (typeof id !== "string") {
    return { ok: false, error: "Ungültige Benachrichtigung." };
  }

  return markNotificationReadById(id);
}

export async function clearReadNotifications(): Promise<ActionResult> {
  const auth = await authenticatedClient();
  if (!auth) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const { error } = await auth.supabase
    .from("app_notifications")
    .delete()
    .eq("user_id", auth.user.id)
    .not("read_at", "is", null);

  if (error) {
    console.error("Could not clear read notifications:", error);
    return { ok: false, error: "Gelesene Benachrichtigungen konnten nicht gelöscht werden." };
  }

  revalidateNotifications();
  return { ok: true };
}
