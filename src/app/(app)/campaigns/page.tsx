import {
  CampaignsWorkspace,
  type CampaignWorkspaceIdea,
  type CampaignWorkspaceRow,
} from "./campaigns-workspace";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

import {
  getCampaignIdeaCategoryLabel,
  getCampaignIdeaDescription,
  getCampaignIdeaFitLabel,
  localizeCampaignStrategyText,
} from "@/lib/acquisition-i18n";

import {
  CAMPAIGN_IDEAS,
} from "@/lib/campaign-ideas";

import {
  getAppLanguage,
} from "@/lib/i18n-server";

import {
  createClient,
} from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type LeadRow = {
  id: string;
  campaign_id: string | null;
  status: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  hot_lead_score: number | null;
  hot_lead_level: string | null;
};

type IncomingMessageRow = {
  lead_id: string | null;
  is_automatic_reply: boolean | null;
  reply_classification: string | null;
  received_at: string | null;
};

type DraftRow = {
  lead_id: string | null;
  status: string | null;
  sent_at: string | null;
};

const CONTACTED_STATUSES = new Set([
  "CONTACTED",
  "REPLIED",
  "CALL_BOOKED",
  "PROPOSAL",
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
]);

const CLOSED_FOLLOW_UP_STATUSES = new Set([
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
]);

const NON_HUMAN_REPLY_CLASSES = new Set([
  "OUT_OF_OFFICE",
  "BOUNCE",
]);

function isHumanReply(
  message: IncomingMessageRow
) {
  return (
    !message.is_automatic_reply &&
    !NON_HUMAN_REPLY_CLASSES.has(
      message.reply_classification ?? ""
    )
  );
}

function latestIso(
  current: string | null,
  candidate: string | null
) {
  if (!candidate) {
    return current;
  }

  if (!current) {
    return candidate;
  }

  return new Date(candidate).getTime() >
    new Date(current).getTime()
    ? candidate
    : current;
}

/* =========================================================
   PAGE
========================================================= */

export default async function CampaignsPage() {
  const language =
    await getAppLanguage();

  const supabase =
    await createClient();

  const [
    campaignsResult,
    leadsResult,
    messagesResult,
    draftsResult,
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select(`
        id,
        name,
        target_industry,
        target_geography,
        company_size_preference,
        target_roles,
        outreach_angle,
        follow_up_days,
        status,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("leads")
      .select(`
        id,
        campaign_id,
        status,
        last_contacted_at,
        next_follow_up_at,
        hot_lead_score,
        hot_lead_level
      `),

    supabase
      .from("email_messages")
      .select(`
        lead_id,
        is_automatic_reply,
        reply_classification,
        received_at
      `)
      .eq("direction", "INCOMING")
      .order("received_at", {
        ascending: false,
      }),

    supabase
      .from("outreach_drafts")
      .select(`
        lead_id,
        status,
        sent_at
      `),
  ]);

  if (campaignsResult.error) {
    console.error(
      "Could not load campaigns:",
      campaignsResult.error
    );
  }

  if (leadsResult.error) {
    console.error(
      "Could not load campaign lead metrics:",
      leadsResult.error
    );
  }

  if (messagesResult.error) {
    console.error(
      "Could not load campaign reply metrics:",
      messagesResult.error
    );
  }

  if (draftsResult.error) {
    console.error(
      "Could not load campaign draft metrics:",
      draftsResult.error
    );
  }

  const campaignRows =
    campaignsResult.data ?? [];

  const leadRows =
    (leadsResult.data ?? []) as LeadRow[];

  const incomingRows =
    (messagesResult.data ?? []) as IncomingMessageRow[];

  const draftRows =
    (draftsResult.data ?? []) as DraftRow[];

  const leadsByCampaign =
    new Map<string, LeadRow[]>();

  const leadById =
    new Map<string, LeadRow>();

  for (const lead of leadRows) {
    leadById.set(
      lead.id,
      lead
    );

    if (!lead.campaign_id) {
      continue;
    }

    const current =
      leadsByCampaign.get(
        lead.campaign_id
      ) ?? [];

    current.push(lead);

    leadsByCampaign.set(
      lead.campaign_id,
      current
    );
  }

  const humanReplyLeadIds =
    new Set<string>();

  const latestReplyByLead =
    new Map<string, string>();

  for (const message of incomingRows) {
    if (
      !message.lead_id ||
      !isHumanReply(message)
    ) {
      continue;
    }

    humanReplyLeadIds.add(
      message.lead_id
    );

    if (message.received_at) {
      const previous =
        latestReplyByLead.get(
          message.lead_id
        );

      if (
        !previous ||
        new Date(
          message.received_at
        ).getTime() >
          new Date(previous).getTime()
      ) {
        latestReplyByLead.set(
          message.lead_id,
          message.received_at
        );
      }
    }
  }

  const draftsByLead =
    new Map<string, DraftRow[]>();

  for (const draft of draftRows) {
    if (!draft.lead_id) {
      continue;
    }

    const current =
      draftsByLead.get(
        draft.lead_id
      ) ?? [];

    current.push(draft);

    draftsByLead.set(
      draft.lead_id,
      current
    );
  }

  const now = Date.now();

  const workspaceRows:
    CampaignWorkspaceRow[] =
    campaignRows.map(
      (campaign) => {
        const campaignLeads =
          leadsByCampaign.get(
            campaign.id
          ) ?? [];

        const contactedLeads =
          campaignLeads.filter(
            (lead) =>
              Boolean(
                lead.last_contacted_at
              ) ||
              CONTACTED_STATUSES.has(
                lead.status ?? ""
              )
          );

        const replyLeads =
          campaignLeads.filter(
            (lead) =>
              humanReplyLeadIds.has(
                lead.id
              )
          );

        const hotLeads =
          campaignLeads.filter(
            (lead) =>
              lead.hot_lead_level ===
                "HOT" ||
              (lead.hot_lead_score ?? 0) >=
                70
          );

        const dueLeads =
          campaignLeads.filter(
            (lead) => {
              if (
                !lead.next_follow_up_at ||
                CLOSED_FOLLOW_UP_STATUSES.has(
                  lead.status ?? ""
                )
              ) {
                return false;
              }

              return (
                new Date(
                  lead.next_follow_up_at
                ).getTime() <= now
              );
            }
          );

        const draftLeadIds =
          campaignLeads
            .filter((lead) =>
              (
                draftsByLead.get(
                  lead.id
                ) ?? []
              ).some(
                (draft) =>
                  draft.status ===
                    "DRAFT" &&
                  !draft.sent_at
              )
            )
            .map((lead) => lead.id);

        let lastActivityAt:
          string | null = null;

        for (const lead of campaignLeads) {
          lastActivityAt = latestIso(
            lastActivityAt,
            lead.last_contacted_at
          );

          lastActivityAt = latestIso(
            lastActivityAt,
            latestReplyByLead.get(
              lead.id
            ) ?? null
          );
        }

        const latestReplyLeadId =
          replyLeads
            .slice()
            .sort((a, b) => {
              const aDate =
                latestReplyByLead.get(
                  a.id
                ) ?? "";
              const bDate =
                latestReplyByLead.get(
                  b.id
                ) ?? "";

              return (
                new Date(bDate).getTime() -
                new Date(aDate).getTime()
              );
            })[0]?.id ?? null;

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status ?? "DRAFT",
          industry:
            campaign.target_industry,
          region:
            campaign.target_geography,
          followUpDays:
            campaign.follow_up_days ?? 5,
          outreachAngle:
            campaign.outreach_angle
              ? localizeCampaignStrategyText(
                  campaign.outreach_angle,
                  language
                )
              : null,
          leadIds:
            campaignLeads.map(
              (lead) => lead.id
            ),
          leads:
            campaignLeads.length,
          contacted:
            contactedLeads.length,
          replies:
            replyLeads.length,
          hot:
            hotLeads.length,
          drafts:
            draftLeadIds.length,
          due:
            dueLeads.length,
          lastActivityAt,
          firstDueLeadId:
            dueLeads[0]?.id ?? null,
          firstDraftLeadId:
            draftLeadIds[0] ?? null,
          latestReplyLeadId,
        };
      }
    );

  const existingIndustries =
    new Set(
      campaignRows
        .map((campaign) =>
          campaign.target_industry
            ?.toLowerCase()
            .trim()
        )
        .filter(
          (
            industry
          ): industry is string =>
            Boolean(industry)
        )
    );

  const ideas:
    CampaignWorkspaceIdea[] =
    CAMPAIGN_IDEAS.filter(
      (idea) =>
        !existingIndustries.has(
          idea.industry
            .toLowerCase()
            .trim()
        )
    )
      .slice(0, 6)
      .map((idea) => ({
        id: idea.id,
        name: idea.name,
        category:
          getCampaignIdeaCategoryLabel(
            idea.category,
            language
          ),
        fit:
          getCampaignIdeaFitLabel(
            idea.fit,
            language
          ),
        description:
          getCampaignIdeaDescription(
            idea.name,
            idea.description,
            language
          ),
      }));

  const unassignedCount =
    leadRows.filter(
      (lead) =>
        !lead.campaign_id
    ).length;

  return (
    <div className="leadbase-route-campaigns min-h-full">
      <WorkspacePageMotion />

      <CampaignsWorkspace
        language={language}
        campaigns={workspaceRows}
        ideas={ideas}
        unassignedCount={unassignedCount}
      />
    </div>
  );
}
