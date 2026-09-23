import "server-only";

import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import {
  assertAiUsageAvailable,
  recordAiUsage,
  releaseAiUsageReservation,
} from "@/lib/ai-usage";
import { createClient } from "@/lib/supabase/server";
import type { AppLanguage } from "@/lib/i18n";
import { getLeadAiContextPolicy } from "@/lib/ai-context-policy";
import { readLeadbaseBrandKit } from "@/lib/brand-kit";

const MODEL = "gpt-5.6-luna";

const WorkflowProposalSchema = z.object({
  title: z.string().min(1).max(180),
  introText: z.string().min(1).max(1800),
  scope: z.array(z.string().min(1).max(420)).min(3).max(10),
  notes: z.string().max(1800).nullable(),
});

function getSingleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function proposalNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `WF-${date}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function generateAndSaveWorkflowProposal(input: {
  leadId: string;
  language: AppLanguage;
}) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized.");

  const { data: existing, error: existingError } = await supabase
    .from("proposals")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("lead_id", input.leadId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) {
    return {
      status: "skipped" as const,
      proposalId: existing.id,
      reason: "A proposal already exists for this lead.",
    };
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(`
      id,estimated_project_value,currency,research_summary,website_findings,
      opportunity_score,redesign_potential,notes,
      company:companies (name,website_url,industry,location,description),
      primary_contact:contacts (full_name,job_title,email)
    `)
    .eq("id", input.leadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (leadError || !lead) {
    throw new Error(leadError?.message ?? "Lead not found.");
  }

  const company = getSingleRelation(lead.company);
  const contact = getSingleRelation(lead.primary_contact);
  if (!company) throw new Error("Company data is missing.");

  const aiContextPolicy = await getLeadAiContextPolicy(user.id);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing.");

  const usageGuard = await assertAiUsageAvailable(user.id, {
    feature: "proposal_autofill",
    model: MODEL,
    reasoningEffort: "low",
    metadata: { leadId: input.leadId, source: "full_lead_workflow" },
  });

  try {
    const openai = new OpenAI({ apiKey, maxRetries: 1 });
    const response = await openai.responses.parse({
      model: MODEL,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content: `
You create a PRIVATE STARTING DRAFT for a freelancer's proposal.
${input.language === "de" ? "Write every customer-facing field in natural German." : "Write every customer-facing field in natural English."}

Rules:
- Use only the supplied company and website-analysis context.
- Never claim that the prospect agreed to scope, price, timing or requirements.
- Never invent legal terms, guarantees, deadlines, testimonials or deliverables that are not supported.
- Keep the scope concrete enough to edit, but frame uncertain items as a proposed direction.
- This draft is never sent automatically. The freelancer must review and edit it.
- Do not include markdown inside fields.
          `.trim(),
        },
        {
          role: "user",
          content: `
COMPANY
Name: ${company.name ?? ""}
Website: ${company.website_url ?? ""}
Industry: ${company.industry ?? ""}
Location: ${company.location ?? ""}
Description: ${company.description ?? ""}

CONTACT
Name: ${contact?.full_name ?? ""}
Role: ${contact?.job_title ?? ""}

LEAD CONTEXT
Research: ${aiContextPolicy.allowResearchSummary ? lead.research_summary ?? "" : ""}
Website findings: ${aiContextPolicy.allowStructuralFindings ? JSON.stringify(lead.website_findings ?? null).slice(0, 8000) : ""}
Opportunity score: ${aiContextPolicy.allowStructuralFindings ? lead.opportunity_score ?? "" : ""}
Redesign potential: ${aiContextPolicy.planId !== "free" ? lead.redesign_potential ?? "" : ""}
User notes: ${aiContextPolicy.allowUserNotes ? lead.notes ?? "" : ""}

Create a conservative proposal starting draft that the freelancer can review later.
          `.trim(),
        },
      ],
      text: {
        format: zodTextFormat(WorkflowProposalSchema, "workflow_proposal_draft"),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) throw new Error("Proposal draft generation returned no structured result.");

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const brandKit = readLeadbaseBrandKit(metadata);
    const accentColor = brandKit.brandColor;
    const logoUrl = brandKit.logoUrl;
    const logoPath = brandKit.logoPath;
    const now = new Date().toISOString();
    const proposalId = randomUUID();

    const { error: saveError } = await supabase
      .from("proposals")
      .insert({
        id: proposalId,
        user_id: user.id,
        lead_id: input.leadId,
        public_token: randomUUID(),
        title: parsed.title,
        proposal_number: proposalNumber(),
        client_name: company.name,
        language: input.language,
        contact_name: contact?.full_name ?? null,
        contact_email: contact?.email ?? null,
        website_url: company.website_url ?? null,
        intro_text: parsed.introText,
        scope: parsed.scope,
        timeline_text: null,
        price: Number(lead.estimated_project_value ?? 0),
        currency: lead.currency ?? "USD",
        valid_until: null,
        notes: [
          parsed.notes?.trim() || null,
          input.language === "de"
            ? "AI-Startentwurf aus dem Full Lead Workflow. Vor dem Versand vollständig prüfen und bearbeiten."
            : "AI starting draft from the Full Lead Workflow. Review and edit fully before sending.",
        ].filter(Boolean).join("\n\n"),
        custom_sections: [],
        accent_color: accentColor,
        logo_path: logoPath,
        logo_url: logoUrl,
        first_time_client: true,
        design_template: "minimal",
        revision: 1,
        status: "DRAFT",
        updated_at: now,
      });

    if (saveError) throw new Error(saveError.message);

    await recordAiUsage({
      userId: user.id,
      feature: "proposal_autofill",
      model: MODEL,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        input_tokens_details: response.usage?.input_tokens_details ?? null,
      },
      requestKey: `workflow-proposal:${proposalId}:${response.id}`,
      reservationKey: usageGuard.reservationKey,
      metadata: { leadId: input.leadId, proposalId, source: "full_lead_workflow" },
    });

    return {
      status: "created" as const,
      proposalId,
    };
  } catch (error) {
    await releaseAiUsageReservation(user.id, usageGuard.reservationKey);
    throw error;
  }
}
