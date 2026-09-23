"use server";

import { revalidatePath } from "next/cache";

import { sendProposalToClient } from "../leads/[id]/proposal/actions";
import { ensureProjectFromAcceptedProposal } from "@/lib/proposal-project";
import { createClient } from "@/lib/supabase/server";

export async function resendProposalFromList(formData: FormData) {
  await sendProposalToClient(formData);
}

export async function deleteDraftProposal(proposalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const { data: proposal, error: loadError } = await supabase
    .from("proposals")
    .select("id,lead_id,status,sent_at,accepted_at,declined_at")
    .eq("id", proposalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (loadError || !proposal) {
    return {
      ok: false as const,
      error: loadError?.message || "Proposal not found.",
    };
  }

  const isDraft =
    proposal.status === "DRAFT" &&
    !proposal.sent_at &&
    !proposal.accepted_at &&
    !proposal.declined_at;

  if (!isDraft) {
    return {
      ok: false as const,
      error: "Only unsent drafts can be deleted here.",
    };
  }

  const { error } = await supabase
    .from("proposals")
    .delete()
    .eq("id", proposal.id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/proposals");
  revalidatePath(`/leads/${proposal.lead_id}`);
  return { ok: true as const };
}

export async function ensureProposalProjectFromList(proposalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const { data: proposal, error } = await supabase
    .from("proposals")
    .select(`
      id,
      lead_id,
      status,
      client_name,
      title,
      website_url,
      price,
      currency,
      notes,
      accepted_at
    `)
    .eq("id", proposalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !proposal) {
    return { ok: false as const, error: error?.message || "Proposal not found." };
  }

  if (proposal.status !== "ACCEPTED" || !proposal.accepted_at) {
    return { ok: false as const, error: "Proposal is not accepted." };
  }

  const result = await ensureProjectFromAcceptedProposal({
    proposalId: proposal.id,
    userId: user.id,
    leadId: proposal.lead_id,
    clientName: proposal.client_name || "Client",
    title: proposal.title || "Project",
    websiteUrl: proposal.website_url,
    price: Number(proposal.price ?? 0),
    currency: proposal.currency,
    notes: proposal.notes,
    acceptedAt: proposal.accepted_at,
  });

  if (result.upgradeRequired) {
    return {
      ok: false as const,
      error: "The lead was marked Won. Upgrade to Starter to manage it as a project.",
    };
  }

  if (result.error || !result.projectId) {
    return { ok: false as const, error: result.error || "Project could not be created." };
  }

  revalidatePath("/proposals");
  revalidatePath(`/leads/${proposal.lead_id}`);
  revalidatePath("/projects");

  return { ok: true as const, projectId: result.projectId };
}
