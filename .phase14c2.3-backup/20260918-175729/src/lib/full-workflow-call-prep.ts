import "server-only";

import {
  generateCallPrep,
  type CallPrepLanguage,
} from "@/lib/call-prep";
import {
  assertAiUsageAvailable,
  recordAiUsage,
  releaseAiUsageReservation,
} from "@/lib/ai-usage";
import { createClient } from "@/lib/supabase/server";

function getSingleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function safeJson(value: unknown, maxLength = 4500) {
  if (value === null || value === undefined) return null;
  try {
    const text = JSON.stringify(value, null, 2);
    return text.length <= maxLength ? text : `${text.slice(0, maxLength)}\n…`;
  } catch {
    return null;
  }
}

function trimText(value: string | null | undefined, maxLength = 3200) {
  const clean = value?.trim() ?? "";
  return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength)}\n…`;
}

export async function generateAndSaveWorkflowCallPrep(input: {
  leadId: string;
  language: CallPrepLanguage;
}) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized.");

  const [leadResult, draftResult, messagesResult, visitsResult] = await Promise.all([
    supabase
      .from("leads")
      .select(`
        id,status,priority,website_score,opportunity_score,visual_score,
        redesign_potential,research_summary,website_findings,visual_analysis,notes,
        call_prep_snapshot,call_prep_generated_at,
        company:companies (id,name,website_url,industry,location,description),
        primary_contact:contacts (id,full_name,job_title,email)
      `)
      .eq("id", input.leadId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("outreach_drafts")
      .select("subject,body,follow_up_body,status,created_at")
      .eq("user_id", user.id)
      .eq("lead_id", input.leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("email_messages")
      .select("direction,from_name,from_email,subject,body_text,received_at,reply_classification,reply_classification_reason")
      .eq("user_id", user.id)
      .eq("lead_id", input.leadId)
      .order("received_at", { ascending: false })
      .limit(12),
    supabase
      .from("design_preview_visits")
      .select("session_id,is_owner,is_engaged,duration_seconds,max_scroll_percent,last_seen_at")
      .eq("user_id", user.id)
      .eq("lead_id", input.leadId),
  ]);

  if (leadResult.error || !leadResult.data) {
    throw new Error(leadResult.error?.message ?? "Lead not found.");
  }

  const lead = leadResult.data;

  // Never overwrite a call-prep document the freelancer already has. This also
  // makes a technical workflow retry idempotent if the previous attempt saved
  // call prep successfully but failed immediately afterwards.
  if (lead.call_prep_snapshot) {
    return {
      status: "skipped" as const,
      generatedAt: lead.call_prep_generated_at ?? null,
      reason: "Call prep already exists for this lead.",
    };
  }

  const company = getSingleRelation(lead.company);
  const contact = getSingleRelation(lead.primary_contact);
  if (!company) throw new Error("Company data is missing.");

  const messages = messagesResult.data ?? [];
  const latestIncoming = messages.find((message) => message.direction === "INCOMING") ?? null;
  const chronological = [...messages].reverse();
  const conversationContext = chronological.length > 0
    ? chronological.map((message) => [
        `${message.direction === "INCOMING" ? "PROSPECT" : "USER"} — ${message.from_name ?? message.from_email ?? ""}`,
        message.subject ? `Subject: ${message.subject}` : null,
        trimText(message.body_text, 2200),
      ].filter(Boolean).join("\n")).join("\n\n--------------------\n\n")
    : null;

  const externalVisits = (visitsResult.data ?? []).filter((visit) => !visit.is_owner);
  const externalSessions = new Set(externalVisits.map((visit) => visit.session_id));
  const engagedSessions = new Set(
    externalVisits.filter((visit) => Boolean(visit.is_engaged)).map((visit) => visit.session_id),
  );
  const maxDurationSeconds = externalVisits.reduce(
    (current, visit) => Math.max(current, Number(visit.duration_seconds ?? 0)),
    0,
  );
  const maxScrollPercent = Math.round(externalVisits.reduce(
    (current, visit) => Math.max(current, Number(visit.max_scroll_percent ?? 0)),
    0,
  ));
  const latestSeenAt = externalVisits
    .map((visit) => visit.last_seen_at)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  const websiteContext = [
    lead.website_score !== null ? `Website score: ${lead.website_score}` : null,
    lead.opportunity_score !== null ? `Opportunity score: ${lead.opportunity_score}` : null,
    lead.visual_score !== null ? `Visual score: ${lead.visual_score}` : null,
    lead.redesign_potential !== null ? `Redesign potential: ${lead.redesign_potential}` : null,
    safeJson(lead.website_findings),
    safeJson(lead.visual_analysis),
  ].filter(Boolean).join("\n\n");

  const draft = draftResult.data;
  const outreachContext = draft
    ? [
        draft.subject ? `Subject: ${draft.subject}` : null,
        trimText(draft.body, 4200),
        draft.follow_up_body ? `Follow-up:\n${trimText(draft.follow_up_body, 2200)}` : null,
        draft.status ? `Draft status: ${draft.status}` : null,
      ].filter(Boolean).join("\n\n")
    : null;

  const latestReplyContext = latestIncoming
    ? [
        latestIncoming.reply_classification
          ? `Classification: ${latestIncoming.reply_classification}`
          : null,
        latestIncoming.reply_classification_reason
          ? `Reason: ${latestIncoming.reply_classification_reason}`
          : null,
        latestIncoming.received_at
          ? `Received at: ${latestIncoming.received_at}`
          : null,
      ].filter(Boolean).join("\n")
    : null;

  const previewContext = [
    `External preview sessions: ${externalSessions.size}`,
    `Engaged external sessions: ${engagedSessions.size}`,
    `Maximum observed duration: ${maxDurationSeconds}s`,
    `Maximum observed scroll: ${maxScrollPercent}%`,
    latestSeenAt
      ? `Latest external preview activity: ${latestSeenAt}`
      : "A customer preview was prepared by the full workflow; no external visit is recorded yet.",
  ].join("\n");

  const usageGuard = await assertAiUsageAvailable(user.id, {
    feature: "call_prep",
    model: "gpt-5.6-luna",
    reasoningEffort: "low",
    metadata: { leadId: input.leadId, source: "full_lead_workflow" },
  });

  try {
    const generated = await generateCallPrep({
      language: input.language,
      companyName: company.name,
      companyDescription: company.description,
      industry: company.industry,
      location: company.location,
      websiteUrl: company.website_url,
      contactName: contact?.full_name,
      contactJobTitle: contact?.job_title,
      leadStatus: lead.status,
      priority: lead.priority,
      notes: lead.notes,
      researchSummary: lead.research_summary,
      websiteContext: websiteContext || null,
      outreachContext,
      conversationContext,
      latestReplyContext,
      previewContext,
    });

    const prep = {
      summary: generated.summary,
      currentSituation: generated.currentSituation,
      talkingPoints: generated.talkingPoints,
      discoveryQuestions: generated.discoveryQuestions,
      likelyObjections: generated.likelyObjections,
      cautionNotes: generated.cautionNotes,
      nextStep: generated.nextStep,
    };

    const callContext = {
      companyName: company.name,
      contactName: contact?.full_name ?? null,
      contactJobTitle: contact?.job_title ?? null,
      websiteUrl: company.website_url ?? null,
      leadStatus: lead.status ?? null,
      latestReplyClassification: latestIncoming?.reply_classification ?? null,
      latestReplyReason: latestIncoming?.reply_classification_reason ?? null,
      preview: {
        externalSessions: externalSessions.size,
        engagedSessions: engagedSessions.size,
        maxDurationSeconds,
        maxScrollPercent,
        latestSeenAt,
      },
    };

    const generatedAt = new Date().toISOString();
    const snapshot = {
      version: 1,
      language: input.language,
      prep,
      context: callContext,
    };

    const { error: saveError } = await supabase
      .from("leads")
      .update({
        call_prep_snapshot: snapshot,
        call_prep_generated_at: generatedAt,
      })
      .eq("id", input.leadId)
      .eq("user_id", user.id);

    if (saveError) throw new Error(saveError.message);

    await recordAiUsage({
      userId: user.id,
      feature: "call_prep",
      model: generated.model,
      usage: generated.usage,
      requestKey: `workflow-call-prep:${input.leadId}:${generatedAt}`,
      reservationKey: usageGuard.reservationKey,
      metadata: { leadId: input.leadId, source: "full_lead_workflow" },
    });

    return { status: "created" as const, generatedAt, prep };
  } catch (error) {
    await releaseAiUsageReservation(user.id, usageGuard.reservationKey);
    throw error;
  }
}
