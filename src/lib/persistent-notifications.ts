import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type PersistentNotificationKind =
  | "PROPOSAL_ACCEPTED"
  | "PROPOSAL_DECLINED"
  | "PROPOSAL_PDF_FAILED"
  | "INFO";

type CreatePersistentNotificationInput = {
  userId: string;
  kind: PersistentNotificationKind;
  title: string;
  description?: string | null;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  dedupeKey?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createPersistentNotification({
  userId,
  kind,
  title,
  description = null,
  href = null,
  entityType = null,
  entityId = null,
  dedupeKey = null,
  metadata = {},
}: CreatePersistentNotificationInput) {
  const admin =
    createAdminClient();

  const payload = {
    user_id: userId,
    kind,
    title: title.trim().slice(0, 180),
    description:
      description?.trim().slice(0, 1000) || null,
    href:
      href?.startsWith("/")
        ? href
        : null,
    entity_type:
      entityType?.trim().slice(0, 80) || null,
    entity_id:
      entityId?.trim().slice(0, 200) || null,
    dedupe_key:
      dedupeKey?.trim().slice(0, 240) || null,
    metadata,
  };

  const {
    error,
  } = await admin
    .from("app_notifications")
    .insert(payload);

  // 23505 = unique_violation. A repeated public proposal action
  // should not create duplicate notifications.
  if (
    error &&
    error.code !== "23505"
  ) {
    console.error(
      "Could not create persistent notification:",
      error
    );
  }
}
