import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import { getLeadbasePlanAccess } from "@/lib/plan-access";
import { planAllowsFeature } from "@/lib/plan-entitlements";

type AcceptedProposalProjectInput = {
  proposalId: string;
  userId: string;
  leadId: string;
  clientName: string;
  title: string;
  websiteUrl?: string | null;
  price: number;
  currency?: string | null;
  notes?: string | null;
  acceptedAt: string;
};

type EnsureProjectResult = {
  projectId: string | null;
  created: boolean;
  upgradeRequired: boolean;
  error: string | null;
};

function cleanError(error: unknown) {
  if (error instanceof Error) {
    return error.message.replace(/[\r\n]+/g, " ").slice(0, 500);
  }

  return "Unknown project creation error";
}

export async function ensureProjectFromAcceptedProposal({
  proposalId,
  userId,
  leadId,
  clientName,
  title,
  websiteUrl = null,
  price,
  currency = "EUR",
  notes = null,
  acceptedAt,
}: AcceptedProposalProjectInput): Promise<EnsureProjectResult> {
  const admin = createAdminClient();

  try {
    const {
      data: existing,
      error: existingError,
    } = await admin
      .from("client_projects")
      .select("id")
      .eq("user_id", userId)
      .eq("source_proposal_id", proposalId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    let projectId = existing?.id ?? null;
    let created = false;
    let upgradeRequired = false;

    const planAccess = await getLeadbasePlanAccess(userId);
    const canCreateProject = planAllowsFeature(planAccess.planId, "project_creation");

    if (!projectId && canCreateProject) {
      const projectNotes = [
        `Automatisch aus angenommenem Leadbase-Angebot erstellt.`,
        `Annahme: ${new Date(acceptedAt).toLocaleString("de-DE", {
          timeZone: "Europe/Berlin",
        })}`,
        notes?.trim() || null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const {
        data: createdProject,
        error: createError,
      } = await admin
        .from("client_projects")
        .insert({
          user_id: userId,
          client_name: clientName,
          project_name: title,
          website_url: websiteUrl || null,
          status: "PLANNED",
          total_value: Number.isFinite(price) ? price : 0,
          amount_paid: 0,
          currency: currency || "EUR",
          started_at: null,
          completed_at: null,
          notes: projectNotes,
          source_proposal_id: proposalId,
        })
        .select("id")
        .single();

      if (createError || !createdProject) {
        throw createError ?? new Error("Project could not be created.");
      }

      projectId = createdProject.id;
      created = true;
    } else if (!projectId && !canCreateProject) {
      upgradeRequired = true;
    }

    const {
      error: leadUpdateError,
    } = await admin
      .from("leads")
      .update({
        status: "WON",
        next_follow_up_at: null,
      })
      .eq("id", leadId)
      .eq("user_id", userId);

    if (leadUpdateError) {
      console.error(
        "Proposal accepted, but lead could not be marked WON:",
        leadUpdateError
      );
    }

    return {
      projectId,
      created,
      upgradeRequired,
      error: null,
    };
  } catch (error) {
    return {
      projectId: null,
      created: false,
      upgradeRequired: false,
      error: cleanError(error),
    };
  }
}
