import { redirect } from "next/navigation";

import { NotificationsPrecisionClient } from "./notifications-precision-client";
import { WorkspacePageMotion } from "@/components/workspace-page-motion";
import { createClient } from "@/lib/supabase/server";

export type NotificationPageItem = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
  entity: string | null;
  entityMeta: string | null;
};

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
};

type ProposalRow = {
  id: string;
  lead_id: string | null;
  title: string | null;
  client_name: string | null;
  contact_name: string | null;
  price: number | string | null;
  currency: string | null;
  status: string | null;
  valid_until: string | null;
  sent_at: string | null;
};

function proposalIdFor(notification: NotificationRow) {
  if (
    notification.entity_type === "proposal" &&
    notification.entity_id
  ) {
    return notification.entity_id;
  }

  const metadataId = notification.metadata?.proposalId;
  return typeof metadataId === "string" && metadataId ? metadataId : null;
}

function fallbackEntity(title: string) {
  const parts = title.split(" · ");
  return parts.length > 1 ? parts.slice(1).join(" · ") : null;
}

function formatMoney(value: number | string | null, currency: string | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency || "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString("de-DE")} €`;
  }
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("app_notifications")
    .select(`
      id,
      kind,
      title,
      description,
      href,
      read_at,
      created_at,
      entity_type,
      entity_id,
      metadata
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Could not load notifications:", error);
  }

  const rows = (data ?? []) as NotificationRow[];
  const proposalIds = Array.from(
    new Set(rows.map(proposalIdFor).filter((id): id is string => Boolean(id)))
  );

  const proposalById = new Map<string, ProposalRow>();

  if (proposalIds.length > 0) {
    const { data: proposals, error: proposalError } = await supabase
      .from("proposals")
      .select(`
        id,
        lead_id,
        title,
        client_name,
        contact_name,
        price,
        currency,
        status,
        valid_until,
        sent_at
      `)
      .eq("user_id", user.id)
      .in("id", proposalIds);

    if (proposalError) {
      console.error("Could not load notification proposal context:", proposalError);
    }

    for (const proposal of (proposals ?? []) as ProposalRow[]) {
      proposalById.set(proposal.id, proposal);
    }
  }

  const notifications: NotificationPageItem[] = rows.map((notification) => {
    const proposalId = proposalIdFor(notification);
    const proposal = proposalId ? proposalById.get(proposalId) ?? null : null;
    const money = proposal ? formatMoney(proposal.price, proposal.currency) : null;
    const contact = proposal?.contact_name?.trim() || null;
    const entityMeta = [money, contact].filter(Boolean).join(" · ") || null;

    return {
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      description: notification.description,
      href: notification.href,
      readAt: notification.read_at,
      createdAt: notification.created_at,
      entity: proposal?.client_name?.trim() || fallbackEntity(notification.title),
      entityMeta,
    };
  });

  return (
    <div className="leadbase-workspace-page leadbase-route-notifications h-full min-h-0">
      <WorkspacePageMotion />
      <NotificationsPrecisionClient initialNotifications={notifications} />
    </div>
  );
}
