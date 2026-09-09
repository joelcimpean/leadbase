import { redirect } from "next/navigation";

import { ProposalsPrecisionClient } from "./proposals-precision-client";
import { WorkspacePageMotion } from "@/components/workspace-page-motion";
import { getAppLanguage } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export type ProposalListStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired";

export type ProposalPageItem = {
  id: string;
  leadId: string;
  publicToken: string;
  company: string;
  contact: string | null;
  title: string;
  status: ProposalListStatus;
  value: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  validUntil: string | null;
  projectId: string | null;
  deliveryError: string | null;
};

export type ProposalLeadCandidate = {
  id: string;
  company: string;
  contact: string | null;
  estimatedValue: number;
  currency: string;
};

type ProposalRow = {
  id: string;
  lead_id: string;
  public_token: string;
  status: string | null;
  title: string | null;
  client_name: string | null;
  contact_name: string | null;
  price: number | string | null;
  currency: string | null;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
  delivery_email_error: string | null;
};

type LeadRow = {
  id: string;
  estimated_project_value: number | string | null;
  currency: string | null;
  company:
    | { name: string | null }
    | { name: string | null }[]
    | null;
  primary_contact:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

type ProjectRow = {
  id: string;
  source_proposal_id: string | null;
};

function single<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveStatus(row: ProposalRow, today: string): ProposalListStatus {
  if (row.accepted_at || row.status === "ACCEPTED") return "accepted";
  if (row.declined_at || row.status === "DECLINED") return "declined";

  if (
    row.sent_at &&
    row.valid_until &&
    row.valid_until.slice(0, 10) < today
  ) {
    return "expired";
  }

  if (row.sent_at || row.status === "SENT") return "sent";
  return "draft";
}

export default async function ProposalsPage() {
  const [supabase, language] = await Promise.all([
    createClient(),
    getAppLanguage(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: proposalData, error: proposalError } = await supabase
    .from("proposals")
    .select(`
      id,
      lead_id,
      public_token,
      status,
      title,
      client_name,
      contact_name,
      price,
      currency,
      valid_until,
      sent_at,
      accepted_at,
      declined_at,
      created_at,
      updated_at,
      delivery_email_error
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (proposalError) {
    console.error("Could not load proposals:", proposalError);
  }

  const proposals = (proposalData ?? []) as ProposalRow[];
  const proposalLeadIds = Array.from(
    new Set(proposals.map((proposal) => proposal.lead_id).filter(Boolean))
  );
  const proposalIds = proposals.map((proposal) => proposal.id);

  const [leadResult, projectResult, candidateResult] = await Promise.all([
    proposalLeadIds.length > 0
      ? supabase
          .from("leads")
          .select(`
            id,
            estimated_project_value,
            currency,
            company:companies (name),
            primary_contact:contacts (full_name)
          `)
          .eq("user_id", user.id)
          .in("id", proposalLeadIds)
      : Promise.resolve({ data: [] as LeadRow[], error: null }),
    proposalIds.length > 0
      ? supabase
          .from("client_projects")
          .select("id,source_proposal_id")
          .eq("user_id", user.id)
          .in("source_proposal_id", proposalIds)
      : Promise.resolve({ data: [] as ProjectRow[], error: null }),
    supabase
      .from("leads")
      .select(`
        id,
        estimated_project_value,
        currency,
        company:companies (name),
        primary_contact:contacts (full_name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  if (leadResult.error) {
    console.error("Could not load proposal lead context:", leadResult.error);
  }
  if (projectResult.error) {
    console.error("Could not load proposal project context:", projectResult.error);
  }
  if (candidateResult.error) {
    console.error("Could not load proposal lead candidates:", candidateResult.error);
  }

  const leadById = new Map<string, LeadRow>();
  for (const lead of (leadResult.data ?? []) as LeadRow[]) {
    leadById.set(lead.id, lead);
  }

  const projectByProposalId = new Map<string, string>();
  for (const project of (projectResult.data ?? []) as ProjectRow[]) {
    if (project.source_proposal_id) {
      projectByProposalId.set(project.source_proposal_id, project.id);
    }
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const items: ProposalPageItem[] = proposals.map((proposal) => {
    const lead = leadById.get(proposal.lead_id) ?? null;
    const company = single(lead?.company ?? null);
    const contact = single(lead?.primary_contact ?? null);

    return {
      id: proposal.id,
      leadId: proposal.lead_id,
      publicToken: proposal.public_token,
      company:
        proposal.client_name?.trim() ||
        company?.name?.trim() ||
        (language === "de" ? "Unbekannter Kunde" : "Unknown client"),
      contact:
        proposal.contact_name?.trim() || contact?.full_name?.trim() || null,
      title:
        proposal.title?.trim() ||
        (language === "de" ? "Angebot" : "Proposal"),
      status: deriveStatus(proposal, today),
      value:
        numberValue(proposal.price) ||
        numberValue(lead?.estimated_project_value),
      currency: proposal.currency || lead?.currency || "EUR",
      createdAt: proposal.created_at,
      updatedAt: proposal.updated_at,
      sentAt: proposal.sent_at,
      validUntil: proposal.valid_until,
      projectId: projectByProposalId.get(proposal.id) ?? null,
      deliveryError: proposal.delivery_email_error,
    };
  });

  const usedLeadIds = new Set(proposals.map((proposal) => proposal.lead_id));
  const candidates: ProposalLeadCandidate[] = (
    (candidateResult.data ?? []) as LeadRow[]
  )
    .filter((lead) => !usedLeadIds.has(lead.id))
    .map((lead) => ({
      id: lead.id,
      company:
        single(lead.company)?.name?.trim() ||
        (language === "de" ? "Unbekannter Kunde" : "Unknown client"),
      contact: single(lead.primary_contact)?.full_name?.trim() || null,
      estimatedValue: numberValue(lead.estimated_project_value),
      currency: lead.currency || "EUR",
    }));

  return (
    <div className="leadbase-workspace-page leadbase-route-proposals h-full min-h-0">
      <WorkspacePageMotion />
      <ProposalsPrecisionClient
        initialItems={items}
        candidates={candidates}
        language={language}
      />
    </div>
  );
}
