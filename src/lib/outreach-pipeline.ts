import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type SuppressionReason = "bounce" | "unsubscribe" | "manual" | "complaint" | "invalid";
export type FollowUpCancelReason = "human_reply" | "bounce" | "unsubscribe" | "manual_stop" | "suppressed" | "lead_lost" | "lead_won";

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export async function isSuppressedEmail(input: {
  supabase: SupabaseClient;
  userId: string;
  email: string | null | undefined;
}) {
  const email = normalizeEmail(input.email);
  if (!email) return false;
  const { data, error } = await input.supabase
    .from("suppression_list")
    .select("id")
    .eq("user_id", input.userId)
    .eq("email", email)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function suppressEmail(input: {
  supabase: SupabaseClient;
  userId: string;
  email: string | null | undefined;
  reason: SuppressionReason;
  leadId?: string | null;
  source?: string | null;
}) {
  const email = normalizeEmail(input.email);
  if (!email) return;
  const { error } = await input.supabase.from("suppression_list").upsert({
    user_id: input.userId,
    lead_id: input.leadId ?? null,
    email,
    reason: input.reason,
    source: input.source ?? null,
    active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,email" });
  if (error) throw new Error(error.message);
}

export async function logFollowUpEvent(input: {
  supabase: SupabaseClient;
  userId: string;
  leadId: string;
  draftId?: string | null;
  status: "scheduled" | "processing" | "sent" | "cancelled" | "rescheduled";
  cancelReason?: FollowUpCancelReason | null;
  scheduledFor?: string | null;
  processingStartedAt?: string | null;
  sentAt?: string | null;
  cancelledAt?: string | null;
  rescheduledFrom?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await input.supabase.from("follow_up_events").insert({
    user_id: input.userId,
    lead_id: input.leadId,
    outreach_draft_id: input.draftId ?? null,
    status: input.status,
    cancel_reason: input.cancelReason ?? null,
    scheduled_for: input.scheduledFor ?? null,
    processing_started_at: input.processingStartedAt ?? null,
    sent_at: input.sentAt ?? null,
    cancelled_at: input.cancelledAt ?? null,
    rescheduled_from: input.rescheduledFrom ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) console.error("Could not write follow-up history event:", error);
}

export async function cancelPendingFollowUps(input: {
  supabase: SupabaseClient;
  userId: string;
  leadId: string;
  reason: FollowUpCancelReason;
  detail?: string | null;
}) {
  const now = new Date().toISOString();
  const { data: scheduled } = await input.supabase
    .from("scheduled_emails")
    .select("id,scheduled_for,outreach_draft_id")
    .eq("user_id", input.userId)
    .eq("lead_id", input.leadId)
    .eq("status", "SCHEDULED");

  const { error: scheduledError } = await input.supabase
    .from("scheduled_emails")
    .update({
      status: "CANCELLED",
      cancelled_at: now,
      last_error: input.detail ?? `Cancelled: ${input.reason}`,
    })
    .eq("user_id", input.userId)
    .eq("lead_id", input.leadId)
    .eq("status", "SCHEDULED");
  if (scheduledError) console.error("Could not cancel scheduled emails:", scheduledError);

  const { error: leadError } = await input.supabase
    .from("leads")
    .update({
      next_follow_up_at: null,
      smart_follow_up_mode: "STOPPED",
      smart_follow_up_reason: input.detail ?? `Follow-up stopped: ${input.reason}`,
      smart_follow_up_updated_at: now,
    })
    .eq("user_id", input.userId)
    .eq("id", input.leadId);
  if (leadError) console.error("Could not stop lead follow-up state:", leadError);

  await Promise.all((scheduled ?? []).map((row: any) => logFollowUpEvent({
    supabase: input.supabase,
    userId: input.userId,
    leadId: input.leadId,
    draftId: row.outreach_draft_id ?? null,
    status: "cancelled",
    cancelReason: input.reason,
    scheduledFor: row.scheduled_for ?? null,
    cancelledAt: now,
    metadata: { scheduledEmailId: row.id, detail: input.detail ?? null },
  })));
}

export async function assertOutboundAllowed(input: {
  supabase: SupabaseClient;
  userId: string;
  leadId: string;
  recipientEmail: string;
}) {
  if (await isSuppressedEmail({ supabase: input.supabase, userId: input.userId, email: input.recipientEmail })) {
    throw new Error("Recipient is on the suppression list.");
  }
  const { data: lead, error } = await input.supabase
    .from("leads")
    .select("status,next_follow_up_at,manual_follow_up_stopped_at,smart_follow_up_mode")
    .eq("user_id", input.userId)
    .eq("id", input.leadId)
    .maybeSingle();
  if (error || !lead) throw new Error(error?.message ?? "Lead could not be reloaded before sending.");
  const status = String(lead.status ?? "").toUpperCase();
  if (["REPLIED", "WON", "LOST", "NOT_A_FIT", "DO_NOT_CONTACT"].includes(status)) {
    throw new Error("Lead status blocks automatic outreach.");
  }
  if (lead.manual_follow_up_stopped_at) {
    throw new Error("Follow-ups were manually stopped for this lead.");
  }
  return lead;
}

export async function logSuccessfulOutreach(input: {
  supabase: SupabaseClient;
  userId: string;
  leadId: string;
  campaignId?: string | null;
  draftId?: string | null;
  channel?: string | null;
  sentAt: string;
  gmailMessageId: string;
  gmailThreadId?: string | null;
  sendId: string;
  sequenceStep: number;
  industry?: string | null;
  region?: string | null;
  auditId?: string | null;
  hookCategory?: string | null;
  hookStrength?: number | null;
  hookValue?: string | null;
  templateVersion?: string | null;
  subjectVariant?: string | null;
  openerVariant?: string | null;
  snapshot?: Record<string, unknown>;
}) {
  const payload = {
    user_id: input.userId,
    lead_id: input.leadId,
    campaign_id: input.campaignId ?? null,
    outreach_draft_id: input.draftId ?? null,
    channel: (input.channel ?? "email").toLowerCase(),
    status: "sent",
    sent_at: input.sentAt,
    industry: input.industry ?? null,
    region: input.region ?? null,
    hook_category: input.hookCategory ?? null,
    hook_strength: input.hookStrength ?? null,
    hook_value: input.hookValue ?? null,
    template_version: input.templateVersion ?? null,
    subject_variant: input.subjectVariant ?? null,
    opener_variant: input.openerVariant ?? null,
    sequence_step: input.sequenceStep,
    audit_id: input.auditId ?? null,
    gmail_message_id: input.gmailMessageId,
    gmail_thread_id: input.gmailThreadId ?? null,
    send_id: input.sendId,
    snapshot_json: input.snapshot ?? {},
  };

  const { data, error } = await input.supabase
    .from("outreach_events")
    .insert(payload)
    .select("id")
    .single();

  if (!error) return data?.id as string | undefined;

  // A retry after Gmail success must never create a second event and must not
  // mutate the immutable snapshot. Resolve the existing idempotent event.
  if ((error as { code?: string }).code === "23505") {
    const { data: existing, error: lookupError } = await input.supabase
      .from("outreach_events")
      .select("id")
      .eq("user_id", input.userId)
      .eq("send_id", input.sendId)
      .maybeSingle();
    if (lookupError) throw new Error(lookupError.message);
    return existing?.id as string | undefined;
  }

  throw new Error(error.message);
}

export async function markOutreachOutcome(input: {
  supabase: SupabaseClient;
  userId: string;
  leadId: string;
  gmailThreadId?: string | null;
  replyAt?: string | null;
  replyCategory?: string | null;
  bounced?: boolean;
  unsubscribed?: boolean;
}) {
  let query = input.supabase.from("outreach_events")
    .select("id")
    .eq("user_id", input.userId)
    .eq("lead_id", input.leadId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1);
  if (input.gmailThreadId) query = query.eq("gmail_thread_id", input.gmailThreadId);
  const { data: event } = await query.maybeSingle();
  if (!event?.id) return;
  const payload: Record<string, unknown> = {
    user_id: input.userId,
    event_id: event.id,
    updated_at: new Date().toISOString(),
  };
  if (input.replyAt) payload.first_reply_at = input.replyAt;
  if (input.replyCategory) payload.reply_category = input.replyCategory;
  if (input.bounced !== undefined) payload.bounced = input.bounced;
  if (input.unsubscribed !== undefined) payload.unsubscribed = input.unsubscribed;
  const category = (input.replyCategory ?? "").toUpperCase();
  if (["INTERESTED", "POSITIVE", "MEETING", "REQUESTED_CALLBACK"].includes(category)) payload.interested_at = input.replyAt ?? new Date().toISOString();
  const { error } = await input.supabase.from("outreach_outcomes").upsert(payload, { onConflict: "event_id" });
  if (error) console.error("Could not update outreach outcome:", error);
}

export function looksLikeUnsubscribe(input: { subject?: string | null; body?: string | null }) {
  const value = `${input.subject ?? ""}\n${input.body ?? ""}`.toLowerCase();
  return [
    "unsubscribe", "remove me", "do not contact", "don't contact", "stop emailing", "no more emails",
    "abmelden", "nicht mehr kontaktieren", "keine weiteren mails", "keine weiteren e-mails", "bitte löschen",
    "désabonner", "no me contactes", "baja", "no más correos",
  ].some((term) => value.includes(term));
}
