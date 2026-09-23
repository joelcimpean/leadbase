import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  FileText,
  Mail,
  MessageSquareReply,
  Search,
  Target,
  WandSparkles,
} from "lucide-react";

import { getAppLanguage } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import { formatAccountMoney, resolveAccountCurrency } from "@/lib/account-currency";

import styles from "./analytics-precision.module.css";

type AppLanguage = "de" | "en";
type AnalyticsRange = "7" | "30" | "90" | "all";

type AnalyticsPageProps = {
  searchParams: Promise<{
    range?: string;
    campaign?: string;
  }>;
};

type CampaignRow = {
  id: string;
  name: string;
  status: string;
};

type LeadRow = {
  id: string;
  campaign_id: string | null;
  status: string;
  estimated_project_value: number | null;
  hot_lead_score: number | null;
  hot_lead_level: string | null;
  created_at: string;
};

type DraftRow = {
  lead_id: string;
  status: string | null;
  sent_at: string | null;
  follow_up_sent_at: string | null;
  created_at: string;
};

type MessageRow = {
  lead_id: string;
  direction: string;
  received_at: string;
  is_automatic_reply: boolean | null;
  reply_classification: string | null;
};

type ActivityMessage = {
  direction: string;
  received_at: string;
  is_automatic_reply: boolean | null;
  reply_classification: string | null;
};

type VisitRow = {
  lead_id: string;
  visitor_id: string;
  session_id: string;
  source: string;
  is_owner: boolean;
  is_engaged: boolean;
  last_seen_at: string;
};

type ProjectRow = {
  id: string;
  client_name: string | null;
  project_name: string | null;
  status: string;
  total_value: number | null;
  amount_paid: number | null;
  currency: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type Metrics = {
  contacted: number;
  viewed: number;
  replied: number;
  interested: number;
  won: number;
  hot: number;
  engaged: number;
  questions: number;
  wonEstimatedValue: number;
  replyRate: number;
  previewRate: number;
  interestedRate: number;
  wonRate: number;
};

type HeatCell = {
  outbound: number;
  replies: number;
  day: number;
  band: number;
};

const DAY_LABELS_DE = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"];
const DAY_LABELS_EN = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const BAND_LABELS = ["08–11", "11–14", "14–17", "17–20"];

function timestamp(value: string | null | undefined) {
  if (!value) return 0;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : 0;
}

function normalizeRange(value: string | undefined): AnalyticsRange {
  return value === "7" || value === "30" || value === "90" || value === "all"
    ? value
    : "30";
}

function rangeBounds(range: AnalyticsRange) {
  if (range === "all") return { start: null as string | null, end: null as string | null };
  const end = new Date();
  const start = new Date(end.getTime() - Number(range) * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function isInsideRange(value: string | null | undefined, start: string | null, end: string | null) {
  if (!value) return false;
  if (!start || !end) return true;
  const time = timestamp(value);
  return time >= timestamp(start) && time < timestamp(end);
}

function percent(numerator: number, denominator: number, digits = 0) {
  if (denominator <= 0) return 0;
  const factor = 10 ** digits;
  return Math.round((numerator / denominator) * 100 * factor) / factor;
}

function formatPercent(value: number, digits = value > 0 && value < 10 ? 1 : 0) {
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

function formatCurrency(value: number, language: AppLanguage, currency: string) {
  return formatAccountMoney(value, currency, language);
}

function rangeLabel(range: AnalyticsRange, language: AppLanguage) {
  const de = language === "de";
  if (range === "7") return de ? "Letzte 7 Tage" : "Last 7 days";
  if (range === "30") return de ? "Letzte 30 Tage" : "Last 30 days";
  if (range === "90") return de ? "Letzte 90 Tage" : "Last 90 days";
  return de ? "Gesamter Zeitraum" : "All time";
}

function campaignStatusLabel(status: string, language: AppLanguage) {
  const de = language === "de";
  if (status === "ACTIVE") return de ? "Aktiv" : "Active";
  if (status === "PAUSED") return de ? "Pausiert" : "Paused";
  if (status === "ARCHIVED") return de ? "Archiviert" : "Archived";
  if (status === "DRAFT") return de ? "Entwurf" : "Draft";
  return status;
}

function buildInitialSentAtByLead(drafts: DraftRow[]) {
  const result = new Map<string, string>();
  for (const draft of drafts) {
    if (!draft.sent_at) continue;
    const current = result.get(draft.lead_id);
    if (!current || timestamp(draft.sent_at) < timestamp(current)) {
      result.set(draft.lead_id, draft.sent_at);
    }
  }
  return result;
}

function buildHumanReplyLeadIds(messages: MessageRow[], cohortLeadIds: Set<string>) {
  return new Set(
    messages
      .filter(
        (message) =>
          cohortLeadIds.has(message.lead_id) &&
          !message.is_automatic_reply &&
          message.reply_classification !== "BOUNCE"
      )
      .map((message) => message.lead_id)
  );
}

function calculateMetrics({
  cohortLeadIds,
  leads,
  messages,
  visits,
}: {
  cohortLeadIds: Set<string>;
  leads: LeadRow[];
  messages: MessageRow[];
  visits: VisitRow[];
}): Metrics {
  const humanReplyLeadIds = buildHumanReplyLeadIds(messages, cohortLeadIds);

  const interestedLeadIds = new Set(
    messages
      .filter(
        (message) =>
          cohortLeadIds.has(message.lead_id) &&
          !message.is_automatic_reply &&
          message.reply_classification === "INTERESTED"
      )
      .map((message) => message.lead_id)
  );

  const questionLeadIds = new Set(
    messages
      .filter(
        (message) =>
          cohortLeadIds.has(message.lead_id) &&
          !message.is_automatic_reply &&
          message.reply_classification === "QUESTION"
      )
      .map((message) => message.lead_id)
  );

  const viewedLeadIds = new Set(
    visits
      .filter((visit) => cohortLeadIds.has(visit.lead_id) && !visit.is_owner)
      .map((visit) => visit.lead_id)
  );

  const engagedLeadIds = new Set(
    visits
      .filter(
        (visit) => cohortLeadIds.has(visit.lead_id) && !visit.is_owner && visit.is_engaged
      )
      .map((visit) => visit.lead_id)
  );

  const cohortLeads = leads.filter((lead) => cohortLeadIds.has(lead.id));
  const wonLeads = cohortLeads.filter((lead) => lead.status === "WON");
  const hot = cohortLeads.filter(
    (lead) => lead.hot_lead_level === "HOT" || Number(lead.hot_lead_score ?? 0) >= 70
  ).length;

  const contacted = cohortLeadIds.size;
  const viewed = viewedLeadIds.size;
  const replied = humanReplyLeadIds.size;
  const interested = new Set([
    ...interestedLeadIds,
    ...cohortLeads
      .filter((lead) => ["INTERESTED", "PROPOSAL", "WON"].includes(lead.status))
      .map((lead) => lead.id),
  ]).size;
  const won = wonLeads.length;

  return {
    contacted,
    viewed,
    replied,
    interested,
    won,
    hot,
    engaged: engagedLeadIds.size,
    questions: questionLeadIds.size,
    wonEstimatedValue: wonLeads.reduce(
      (sum, lead) => sum + Number(lead.estimated_project_value ?? 0),
      0
    ),
    replyRate: percent(replied, contacted, 1),
    previewRate: percent(viewed, contacted, 1),
    interestedRate: percent(interested, contacted, 1),
    wonRate: percent(won, contacted, 1),
  };
}

function localWeekdayIndex(date: Date) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function bandIndex(hour: number) {
  if (hour >= 8 && hour < 11) return 0;
  if (hour >= 11 && hour < 14) return 1;
  if (hour >= 14 && hour < 17) return 2;
  if (hour >= 17 && hour < 20) return 3;
  return -1;
}

function buildHeatmap(messages: ActivityMessage[]) {
  const cells = Array.from({ length: 4 }, (_, band) =>
    Array.from({ length: 7 }, (_, day): HeatCell => ({ outbound: 0, replies: 0, day, band }))
  );

  for (const message of messages) {
    const date = new Date(message.received_at);
    const band = bandIndex(date.getHours());
    if (band < 0) continue;
    const day = localWeekdayIndex(date);
    const cell = cells[band][day];
    if (message.direction === "OUTGOING") cell.outbound += 1;
    if (
      message.direction === "INCOMING" &&
      !message.is_automatic_reply &&
      message.reply_classification !== "BOUNCE"
    ) {
      cell.replies += 1;
    }
  }

  return cells;
}

function heatTone(value: number, max: number) {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.22) return 1;
  if (ratio <= 0.45) return 2;
  if (ratio <= 0.72) return 3;
  return 4;
}

function median(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 === 0 ? (valid[middle - 1] + valid[middle]) / 2 : valid[middle];
}

function daysBetween(start: string | null | undefined, end: string | null | undefined) {
  const a = timestamp(start);
  const b = timestamp(end);
  if (!a || !b || b < a) return null;
  return (b - a) / (24 * 60 * 60 * 1000);
}

function compactDays(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(1).replace(".", ",");
}

function uniqueByLead<T extends { lead_id: string }>(rows: T[]) {
  const ids = new Set<string>();
  for (const row of rows) ids.add(row.lead_id);
  return ids;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const [supabase, rawLanguage, params] = await Promise.all([
    createClient(),
    getAppLanguage(),
    searchParams,
  ]);

  const language = (rawLanguage === "en" ? "en" : "de") as AppLanguage;
  const de = language === "de";
  const range = normalizeRange(params.range);
  const bounds = rangeBounds(range);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const storedProfile = userMetadata.leadbase_profile && typeof userMetadata.leadbase_profile === "object"
    ? userMetadata.leadbase_profile as Record<string, unknown>
    : null;
  const accountCurrency = resolveAccountCurrency({
    storedCurrency: storedProfile?.currency,
    currencyMode: storedProfile?.currencyMode,
    location: typeof storedProfile?.location === "string" ? storedProfile.location : null,
  }).currency;

  const activityCutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const [
    campaignsResult,
    leadsResult,
    draftsResult,
    messagesResult,
    outreachActivityResult,
    visitsResult,
    projectsResult,
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id,name,status")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("leads")
      .select("id,campaign_id,status,estimated_project_value,hot_lead_score,hot_lead_level,created_at")
      .eq("user_id", user.id),
    supabase
      .from("outreach_drafts")
      .select("lead_id,status,sent_at,follow_up_sent_at,created_at")
      .eq("user_id", user.id),
    supabase
      .from("email_messages")
      .select("lead_id,direction,received_at,is_automatic_reply,reply_classification")
      .eq("user_id", user.id)
      .eq("direction", "INCOMING"),
    supabase
      .from("email_messages")
      .select("direction,received_at,is_automatic_reply,reply_classification")
      .eq("user_id", user.id)
      .gte("received_at", activityCutoff)
      .in("direction", ["INCOMING", "OUTGOING"])
      .order("received_at", { ascending: false })
      .limit(1200),
    supabase
      .from("design_preview_visits")
      .select("lead_id,visitor_id,session_id,source,is_owner,is_engaged,last_seen_at")
      .eq("user_id", user.id),
    supabase
      .from("client_projects")
      .select("id,client_name,project_name,status,total_value,amount_paid,currency,started_at,completed_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  for (const [label, error] of [
    ["campaigns", campaignsResult.error],
    ["leads", leadsResult.error],
    ["drafts", draftsResult.error],
    ["messages", messagesResult.error],
    ["outreach activity", outreachActivityResult.error],
    ["preview visits", visitsResult.error],
    ["projects", projectsResult.error],
  ] as const) {
    if (error) console.error(`Could not load analytics ${label}:`, error);
  }

  const campaigns = (campaignsResult.data ?? []) as CampaignRow[];
  const leads = (leadsResult.data ?? []) as LeadRow[];
  const drafts = (draftsResult.data ?? []) as DraftRow[];
  const messages = (messagesResult.data ?? []) as MessageRow[];
  const outreachActivity = (outreachActivityResult.data ?? []) as ActivityMessage[];
  const visits = (visitsResult.data ?? []) as VisitRow[];
  const projects = (projectsResult.data ?? []) as ProjectRow[];

  const requestedCampaign = params.campaign ?? "all";
  const validCampaignIds = new Set(campaigns.map((campaign) => campaign.id));
  const selectedCampaign =
    requestedCampaign === "none" || validCampaignIds.has(requestedCampaign)
      ? requestedCampaign
      : "all";

  const scopedLeads = leads.filter((lead) => {
    if (selectedCampaign === "all") return true;
    if (selectedCampaign === "none") return !lead.campaign_id;
    return lead.campaign_id === selectedCampaign;
  });
  const scopeLeadIds = new Set(scopedLeads.map((lead) => lead.id));

  const initialSentAtByLead = buildInitialSentAtByLead(drafts);
  const currentCohortLeadIds = new Set(
    Array.from(initialSentAtByLead.entries())
      .filter(
        ([leadId, sentAt]) =>
          scopeLeadIds.has(leadId) && isInsideRange(sentAt, bounds.start, bounds.end)
      )
      .map(([leadId]) => leadId)
  );

  const currentMetrics = calculateMetrics({
    cohortLeadIds: currentCohortLeadIds,
    leads,
    messages,
    visits,
  });

  const humanReplyLeadIds = buildHumanReplyLeadIds(messages, currentCohortLeadIds);
  const allSentLeadIds = new Set(initialSentAtByLead.keys());

  const found = scopedLeads.length;
  const analyzed = scopedLeads.filter(
    (lead) => lead.hot_lead_score !== null || !["NEW"].includes(lead.status)
  ).length;
  const proposalCount = scopedLeads.filter(
    (lead) => currentCohortLeadIds.has(lead.id) && ["PROPOSAL", "WON"].includes(lead.status)
  ).length;
  const wonCount = currentMetrics.won;

  const stepValues = [
    { label: de ? "Gefunden" : "Found", value: found, Icon: Search },
    { label: de ? "Analysiert" : "Analyzed", value: analyzed, Icon: Activity },
    { label: de ? "Kontaktiert" : "Contacted", value: currentMetrics.contacted, Icon: Mail },
    { label: de ? "Geantwortet" : "Replied", value: currentMetrics.replied, Icon: MessageSquareReply },
    { label: de ? "Interessiert" : "Interested", value: currentMetrics.interested, Icon: Target },
    { label: de ? "Angebot" : "Proposal", value: proposalCount, Icon: FileText },
    { label: de ? "Gewonnen" : "Won", value: wonCount, Icon: CircleCheck },
  ];

  const readyDraftLeadIds = uniqueByLead(
    drafts.filter(
      (draft) =>
        !draft.sent_at &&
        ["DRAFT_READY", "READY", "DRAFT"].includes(String(draft.status ?? ""))
    )
  );

  const leadsByCampaign = new Map<string, LeadRow[]>();
  for (const lead of leads) {
    const key = lead.campaign_id ?? "none";
    const list = leadsByCampaign.get(key) ?? [];
    list.push(lead);
    leadsByCampaign.set(key, list);
  }

  const campaignRows = [
    ...campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      leads: leadsByCampaign.get(campaign.id) ?? [],
    })),
    {
      id: "none",
      name: de ? "Ohne Kampagne" : "No campaign",
      status: "",
      leads: leadsByCampaign.get("none") ?? [],
    },
  ]
    .map((row) => {
      const rowLeadIds = new Set(row.leads.map((lead) => lead.id));
      const cohortIds = new Set(
        Array.from(currentCohortLeadIds).filter((leadId) => rowLeadIds.has(leadId))
      );
      const metrics = calculateMetrics({ cohortLeadIds: cohortIds, leads, messages, visits });
      const coverage = percent(metrics.contacted, row.leads.length, 0);
      return { ...row, metrics, coverage };
    })
    .filter((row) => (selectedCampaign === "all" ? true : row.id === selectedCampaign))
    .sort(
      (a, b) =>
        b.metrics.replyRate - a.metrics.replyRate ||
        b.metrics.replied - a.metrics.replied ||
        b.coverage - a.coverage
    );

  const bestCampaign = campaignRows
    .filter((row) => row.metrics.contacted > 0)
    .sort((a, b) => b.metrics.replyRate - a.metrics.replyRate)[0];

  const heatmap = buildHeatmap(outreachActivity);
  const maxOutbound = Math.max(0, ...heatmap.flat().map((cell) => cell.outbound));
  const bestReplyCells = heatmap
    .flat()
    .filter((cell) => cell.replies > 0)
    .sort((a, b) => b.replies - a.replies || b.outbound - a.outbound)
    .slice(0, 2);

  const highScoreReplyCount = scopedLeads.filter(
    (lead) => humanReplyLeadIds.has(lead.id) && Number(lead.hot_lead_score ?? 0) >= 70
  ).length;

  const untouchedCampaign = [
    ...campaigns.map((campaign) => ({
      name: campaign.name,
      untouched: (leadsByCampaign.get(campaign.id) ?? []).filter(
        (lead) => !allSentLeadIds.has(lead.id)
      ).length,
    })),
  ].sort((a, b) => b.untouched - a.untouched)[0];

  const followUpLeadIds = uniqueByLead(
    drafts.filter(
      (draft) => currentCohortLeadIds.has(draft.lead_id) && Boolean(draft.follow_up_sent_at)
    )
  );

  const booked = projects.reduce((sum, project) => sum + Number(project.total_value ?? 0), 0);
  const paid = projects.reduce((sum, project) => sum + Number(project.amount_paid ?? 0), 0);
  const outstanding = Math.max(0, booked - paid);
  const averageProject = projects.length > 0 ? booked / projects.length : 0;
  const outreachWon = currentMetrics.wonEstimatedValue;
  const networkRevenue = Math.max(0, booked - outreachWon);
  const pipelineEstimate = scopedLeads
    .filter(
      (lead) =>
        currentCohortLeadIds.has(lead.id) &&
        !["WON", "LOST", "DO_NOT_CONTACT"].includes(lead.status)
    )
    .reduce((sum, lead) => sum + Number(lead.estimated_project_value ?? 0), 0);

  const scoreCohorts = [
    { label: "80+", min: 80, max: 101 },
    { label: "70–79", min: 70, max: 80 },
    { label: "60–69", min: 60, max: 70 },
    { label: "40–59", min: 40, max: 60 },
    { label: "0–39", min: 0, max: 40 },
  ].map((bucket) => {
    const bucketLeads = scopedLeads.filter((lead) => {
      const score = Number(lead.hot_lead_score ?? 0);
      return score >= bucket.min && score < bucket.max;
    });
    const contactedIds = new Set(
      bucketLeads.filter((lead) => currentCohortLeadIds.has(lead.id)).map((lead) => lead.id)
    );
    const replies = Array.from(contactedIds).filter((id) => humanReplyLeadIds.has(id)).length;
    const rate = contactedIds.size > 0 ? percent(replies, contactedIds.size, 1) : null;
    const thin = contactedIds.size < 10;
    return { ...bucket, leads: bucketLeads.length, contacted: contactedIds.size, replies, rate, thin };
  });

  const firstDraftByLead = new Map<string, DraftRow>();
  for (const draft of drafts) {
    const current = firstDraftByLead.get(draft.lead_id);
    if (!current || timestamp(draft.created_at) < timestamp(current.created_at)) {
      firstDraftByLead.set(draft.lead_id, draft);
    }
  }

  const firstReplyByLead = new Map<string, MessageRow>();
  for (const message of messages) {
    if (message.is_automatic_reply || message.reply_classification === "BOUNCE") continue;
    const current = firstReplyByLead.get(message.lead_id);
    if (!current || timestamp(message.received_at) < timestamp(current.received_at)) {
      firstReplyByLead.set(message.lead_id, message);
    }
  }

  const draftToSendDays = median(
    Array.from(currentCohortLeadIds)
      .map((leadId) => {
        const draft = firstDraftByLead.get(leadId);
        return draft ? daysBetween(draft.created_at, initialSentAtByLead.get(leadId)) : null;
      })
      .filter((value): value is number => value !== null)
  );

  const sendToReplyDays = median(
    Array.from(currentCohortLeadIds)
      .map((leadId) => {
        const reply = firstReplyByLead.get(leadId);
        return reply ? daysBetween(initialSentAtByLead.get(leadId), reply.received_at) : null;
      })
      .filter((value): value is number => value !== null)
  );

  const velocity = [
    { label: de ? "Neu → Analysiert" : "New → analyzed", value: null, note: de ? `${analyzed} Leads` : `${analyzed} leads` },
    { label: de ? "Analysiert → Entwurf" : "Analyzed → draft", value: null, note: de ? `${readyDraftLeadIds.size} Entwürfe` : `${readyDraftLeadIds.size} drafts` },
    { label: de ? "Entwurf → Kontaktiert" : "Draft → contacted", value: draftToSendDays, note: de ? `${currentMetrics.contacted} Kontakte` : `${currentMetrics.contacted} contacts` },
    { label: de ? "Kontaktiert → Antwort" : "Contacted → reply", value: sendToReplyDays, note: de ? `${currentMetrics.replied} Antworten` : `${currentMetrics.replied} replies` },
    { label: de ? "Antwort → Angebot" : "Reply → proposal", value: null, note: de ? `${proposalCount} Angebote` : `${proposalCount} proposals` },
  ];

  const selectedCampaignName =
    selectedCampaign === "all"
      ? de
        ? "Alle Kampagnen"
        : "All campaigns"
      : selectedCampaign === "none"
        ? de
          ? "Ohne Kampagne"
          : "No campaign"
        : campaigns.find((campaign) => campaign.id === selectedCampaign)?.name ??
          (de ? "Alle Kampagnen" : "All campaigns");

  const rangeOptions: Array<{ value: AnalyticsRange; label: string }> = [
    { value: "7", label: "7D" },
    { value: "30", label: "30D" },
    { value: "90", label: "90D" },
    { value: "all", label: de ? "Gesamt" : "All" },
  ];

  const buildAnalyticsHref = (nextRange: AnalyticsRange, campaign = selectedCampaign) => {
    const query = new URLSearchParams();
    query.set("range", nextRange);
    if (campaign !== "all") query.set("campaign", campaign);
    return `/analytics?${query.toString()}`;
  };

  const coverageHint = currentMetrics.contacted > 0 ? `${currentMetrics.contacted} ${de ? "Kontakte" : "contacts"}` : de ? "Keine Kontakte" : "No contacts";
  const replyRate = currentMetrics.replyRate;

  const dayLabels = de ? DAY_LABELS_DE : DAY_LABELS_EN;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            {de ? "Akquise-Performance" : "Acquisition performance"}
          </div>
          <div className={styles.titleRow}>
            <h1>Analytics</h1>
            <span>
              {currentMetrics.contacted} {de ? "kontaktiert" : "contacted"} · {currentMetrics.replied} {de ? "Antworten" : "replies"} · {currentMetrics.won} {de ? "gewonnen" : "won"}
            </span>
          </div>
          <p>
            {de
              ? "Kohorte nach erstem Outreach-Versand. Ergebnisse dieser Leads werden bis heute mitgezählt."
              : "Cohort based on the first outreach send. Outcomes for those leads are counted through today."}
          </p>
        </div>

        <div className={styles.headerControls}>
          <details className={styles.campaignMenu}>
            <summary>
              <WandSparkles size={13} />
              <span>{selectedCampaignName}</span>
              <ChevronDown size={12} />
            </summary>
            <div className={styles.campaignPopover}>
              <Link href={buildAnalyticsHref(range, "all")}>
                {de ? "Alle Kampagnen" : "All campaigns"}
              </Link>
              {campaigns.map((campaign) => (
                <Link key={campaign.id} href={buildAnalyticsHref(range, campaign.id)}>
                  {campaign.name}
                </Link>
              ))}
              {(leadsByCampaign.get("none")?.length ?? 0) > 0 ? (
                <Link href={buildAnalyticsHref(range, "none")}>{de ? "Ohne Kampagne" : "No campaign"}</Link>
              ) : null}
            </div>
          </details>

          <div className={styles.rangeTabs}>
            {rangeOptions.map((option) => (
              <Link
                key={option.value}
                href={buildAnalyticsHref(option.value)}
                className={range === option.value ? styles.rangeActive : undefined}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <section className={`${styles.surface} ${styles.acquisition}`}>
        <div className={styles.sectionHeaderLine}>
          <div className={styles.sectionTitleWithMeta}>
            <h2>{de ? "Akquise-Strecke" : "Acquisition path"}</h2>
            <span>{de ? "Von gefunden bis gewonnen · Konversion je Schritt" : "From found to won · conversion by step"}</span>
          </div>
          <div className={styles.sectionMetaCluster}>
            <span className={styles.blueChip}>
              <WandSparkles size={11} />
              {readyDraftLeadIds.size} {de ? "Entwürfe bereit · noch nicht gesendet" : "drafts ready · not sent yet"}
            </span>
            <span className={styles.monoMeta}>{rangeLabel(range, language)} · {de ? "Kohorte" : "cohort"} {found} Leads</span>
          </div>
        </div>

        <div className={styles.stepsGrid}>
          {stepValues.map((step, index) => {
            const previous = index === 0 ? null : stepValues[index - 1].value;
            const share = percent(step.value, Math.max(found, 1), 0);
            const conversion = previous === null ? null : percent(step.value, previous, step.value > 0 && previous > 0 && percent(step.value, previous, 1) < 10 ? 1 : 0);
            const conversionValue = conversion ?? 0;
            const isBreak = index === 3 && previous !== null && previous > 0 && conversionValue < 20;
            const dim = step.value === 0;
            const Icon = step.Icon;
            return (
              <div key={step.label} className={`${styles.stepCell} ${isBreak ? styles.stepBreak : ""}`}>
                <div className={styles.stepLabel}>
                  <Icon size={12} className={dim ? styles.iconMuted : styles.iconBlue} />
                  <span>{step.label}</span>
                </div>
                <div className={styles.stepValueRow}>
                  <strong className={dim ? styles.valueMuted : undefined}>{step.value}</strong>
                  {step.value > 0 ? <span>{share}% v. {found}</span> : null}
                </div>
                <div className={styles.track}><span style={{ width: `${Math.max(step.value > 0 ? 3 : 0, share)}%` }} /></div>
                <div className={`${styles.stepFooter} ${isBreak ? styles.breakText : ""}`}>
                  <span>
                    {previous === null
                      ? de ? "Kohorte" : "Cohort"
                      : previous === 0
                        ? "—"
                        : `${formatPercent(conversionValue, conversionValue > 0 && conversionValue < 10 ? 1 : 0)} ${de ? "v. Schritt" : "of step"}`}
                  </span>
                  {isBreak ? <span className={styles.breakBadge}><CircleAlert size={9} />{de ? "Bruch" : "Drop"}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.middleGrid}>
        <div className={styles.bottleneck}>
          <div className={styles.darkEyebrow}><Activity size={12} />{de ? "Engstelle" : "Bottleneck"}</div>
          <h2>{de ? "Kontaktiert → Geantwortet" : "Contacted → replied"}</h2>
          <p>
            {de
              ? `${Math.max(0, currentMetrics.contacted - currentMetrics.replied)} von ${currentMetrics.contacted} kontaktierten Leads haben nicht geantwortet. Das ist aktuell der größte Verlust der Strecke.`
              : `${Math.max(0, currentMetrics.contacted - currentMetrics.replied)} of ${currentMetrics.contacted} contacted leads did not reply. This is currently the biggest loss in the path.`}
          </p>
          <div className={styles.replyRateBlock}>
            <div>
              <span className={styles.darkLabel}>{de ? "Antwortquote" : "Reply rate"}</span>
              <div className={styles.bigRate}>{formatPercent(replyRate, 1).replace(" %", "")}<small>%</small></div>
            </div>
            <div className={styles.darkProgressCol}>
              <div className={styles.darkTrack}><span style={{ width: `${Math.min(100, replyRate)}%` }} /></div>
              <span>{currentMetrics.replied} {de ? "Antworten" : "replies"} · {currentMetrics.questions} {de ? "echte Rückfragen" : "questions"}</span>
            </div>
          </div>
          <div className={styles.evidence}>
            <span className={styles.darkLabel}>{de ? "Belege aus deinen Daten" : "Evidence from your data"}</span>
            <div><CheckCircle2 size={12} className={styles.greenIcon} /><span>{highScoreReplyCount > 0 ? `${highScoreReplyCount} ${de ? "Antworten kamen von Leads mit Score ≥ 70 – die Priorisierung funktioniert." : "replies came from leads with score ≥ 70 – prioritization works."}` : de ? "Noch keine belastbare Antwort aus der Score-70+-Kohorte." : "No reliable reply from the score-70+ cohort yet."}</span></div>
            <div><CircleAlert size={12} className={styles.warmIcon} /><span>{untouchedCampaign && untouchedCampaign.untouched > 0 ? `${untouchedCampaign.untouched} ${de ? `Leads in ${untouchedCampaign.name} sind noch nie kontaktiert worden.` : `leads in ${untouchedCampaign.name} have never been contacted.`}` : de ? "Keine größere unkontaktierte Kampagnen-Lücke erkannt." : "No major untouched campaign gap detected."}</span></div>
            <div><CircleAlert size={12} className={styles.warmIcon} /><span>{de ? `Von ${currentMetrics.contacted} Kontakten haben ${followUpLeadIds.size} mindestens ein Follow-up erhalten.` : `${followUpLeadIds.size} of ${currentMetrics.contacted} contacts received at least one follow-up.`}</span></div>
          </div>
          <div className={styles.darkActions}>
            <Link href="/leads">{de ? "Follow-ups öffnen" : "Open follow-ups"}</Link>
            <Link href="/leads">{coverageHint}</Link>
          </div>
        </div>

        <div className={`${styles.surface} ${styles.heatmapCard}`}>
          <div className={styles.cardHeader}>
            <div>
              <h2>{de ? "Outreach-Aktivität & Antwortquote" : "Outreach activity & reply rate"}</h2>
              <p>{de ? "Kontakte je Zeitfenster · Farbe = Volumen, Punkt = Antwort erhalten" : "Contacts per time window · color = volume, dot = reply received"}</p>
            </div>
            <span className={styles.monoMeta}>{de ? "4 Wochen" : "4 weeks"}</span>
          </div>

          <div className={styles.heatmap}>
            {heatmap.map((row, band) => (
              <div key={BAND_LABELS[band]} className={styles.heatRow}>
                <span>{BAND_LABELS[band]}</span>
                {row.map((cell, day) => {
                  const tone = heatTone(cell.outbound, maxOutbound);
                  return (
                    <div
                      key={`${band}-${day}`}
                      className={`${styles.heatCell} ${styles[`heat${tone}` as keyof typeof styles] ?? ""}`}
                      title={`${dayLabels[day]} ${BAND_LABELS[band]} · ${cell.outbound} ${de ? "Kontakte" : "contacts"}${cell.replies > 0 ? ` · ${cell.replies} ${de ? "Antworten" : "replies"}` : ""}`}
                    >
                      {cell.replies > 0 ? <span /> : null}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className={styles.heatDays}>
              <span />
              {dayLabels.map((label) => <span key={label}>{label}</span>)}
            </div>
          </div>

          <div className={styles.heatFooter}>
            <span>
              {bestReplyCells.length > 0
                ? `${de ? "Antworten kamen aus" : "Replies came from"} ${bestReplyCells.map((cell) => `${dayLabels[cell.day][0]}${dayLabels[cell.day].slice(1).toLowerCase()} ${BAND_LABELS[cell.band]}`).join(de ? " und " : " and ")}`
                : de ? "Noch kein belastbares Antwort-Zeitfenster." : "No reliable reply window yet."}
            </span>
            <div className={styles.legend}><small>{de ? "WENIGER" : "LESS"}</small>{[0,1,2,3,4].map((tone) => <i key={tone} className={styles[`heat${tone}` as keyof typeof styles] ?? ""} />)}<small>{de ? "MEHR" : "MORE"}</small></div>
          </div>
        </div>

        <div className={`${styles.surface} ${styles.revenueCard}`}>
          <div className={styles.cardHeader}>
            <div>
              <h2>{de ? "Umsatz & Herkunft" : "Revenue & source"}</h2>
              <p>{de ? "Was die Akquise real eingebracht hat" : "What acquisition actually brought in"}</p>
            </div>
          </div>
          <div className={styles.revenueHero}><strong>{formatCurrency(booked, language, accountCurrency)}</strong><span>{de ? "gebucht" : "booked"}</span></div>
          <div className={styles.moneyTrack}><span style={{ width: `${booked > 0 ? Math.min(100, percent(paid, booked, 1)) : 0}%` }} /><i /></div>
          <div className={styles.moneyMeta}><span>{formatCurrency(paid, language, accountCurrency)} {de ? "bezahlt" : "paid"}</span><span>{formatCurrency(outstanding, language, accountCurrency)} {de ? "offen" : "open"}</span></div>
          <div className={styles.revenueRows}>
            <div><span>{de ? "Aus Outreach gewonnen" : "Won from outreach"}</span><strong className={outreachWon === 0 ? styles.warmNumber : undefined}>{formatCurrency(outreachWon, language, accountCurrency)}</strong></div>
            <div><span>{de ? "Aus Netzwerk / Bestand" : "From network / existing"}</span><strong>{formatCurrency(networkRevenue, language, accountCurrency)}</strong></div>
            <div><span>{de ? "Ø Projektwert" : "Avg project value"}</span><strong>{formatCurrency(averageProject, language, accountCurrency)}</strong></div>
            <div><span>{de ? "Pipeline-Schätzwert" : "Pipeline estimate"}</span><strong className={pipelineEstimate === 0 ? styles.mutedNumber : undefined}>{pipelineEstimate > 0 ? formatCurrency(pipelineEstimate, language, accountCurrency) : "—"}</strong></div>
          </div>
          <p className={styles.revenueFoot}>{outreachWon > 0 ? (de ? "Mindestens ein Lead hat die Strecke bis gewonnen geschlossen." : "At least one lead has closed the path through won.") : (de ? "Kein Umsatz stammt bisher eindeutig aus Leadbase-Outreach. Ein gewonnener Lead würde die Strecke erstmals vollständig schließen." : "No revenue is clearly attributable to Leadbase outreach yet. A won lead would close the path for the first time.")}</p>
        </div>
      </section>

      <section className={styles.campaignGrid}>
        <div className={`${styles.surface} ${styles.campaignTableCard}`}>
          <div className={styles.tableHeader}>
            <div><h2>{de ? "Kampagnen-Performance" : "Campaign performance"}</h2><p>{de ? "Sortiert nach Antwortquote · Kontaktabdeckung zeigt ungenutztes Potenzial" : "Sorted by reply rate · contact coverage shows unused potential"}</p></div>
            <Link href="/campaigns">{de ? "Kampagnen" : "Campaigns"}<ArrowRight size={12} /></Link>
          </div>
          <div className={styles.tableScroll}>
            <div className={styles.campaignTable}>
              <div className={styles.campaignHead}>
                <span>{de ? "Kampagne" : "Campaign"}</span><span>{de ? "Kontaktabdeckung" : "Coverage"}</span><span>{de ? "Antw." : "Replies"}</span><span>{de ? "Quote" : "Rate"}</span><span>HOT</span><span>{de ? "Gew." : "Won"}</span><span>{de ? "Umsatz" : "Revenue"}</span>
              </div>
              {campaignRows.map((row) => (
                <Link key={row.id} href={row.id === "none" ? "/leads" : `/campaigns/${row.id}`} className={styles.campaignRow}>
                  <div className={styles.campaignIdentity}><div><strong>{row.name}</strong>{row.status ? <em className={row.status === "PAUSED" ? styles.statusWarm : styles.statusBlue}>{campaignStatusLabel(row.status, language)}</em> : null}</div><span>{row.metrics.contacted} {de ? "von" : "of"} {row.leads.length} {de ? "kontaktiert" : "contacted"}</span></div>
                  <div className={styles.coverageCell}><div className={styles.miniTrack}><span style={{ width: `${row.coverage}%` }} /></div><small>{row.coverage} %</small></div>
                  <span className={row.metrics.replied > 0 ? styles.strongCell : styles.mutedCell}>{row.metrics.replied}</span>
                  <span className={row.metrics.replyRate > 0 ? styles.blueCell : styles.mutedCell}>{row.metrics.contacted > 0 ? formatPercent(row.metrics.replyRate, 1) : "—"}</span>
                  <span className={row.metrics.hot > 0 ? styles.warmCell : styles.mutedCell}>{row.metrics.hot}</span>
                  <span className={styles.mutedCell}>{row.metrics.won}</span>
                  <span className={styles.mutedCell}>{formatCurrency(row.metrics.wonEstimatedValue, language, accountCurrency)}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className={styles.tableFooter}><span>{bestCampaign ? `${de ? "Beste Quote:" : "Best rate:"} ${bestCampaign.name} (${formatPercent(bestCampaign.metrics.replyRate, 1)})` : de ? "Noch keine belastbare Kampagnenquote" : "No reliable campaign rate yet"}</span><span>{campaignRows.length} {de ? "Kampagnen" : "campaigns"} · {found} Leads</span></div>
        </div>

        <div className={`${styles.surface} ${styles.cohortCard}`}>
          <div className={styles.cardHeader}>
            <div><h2>{de ? "Zahlt sich der Hot Score aus?" : "Does the Hot Score pay off?"}</h2><p>{de ? "Antwortquote je Score-Kohorte" : "Reply rate by score cohort"}</p></div>
            <span className={styles.warmChip}>{de ? "Dünne Daten" : "Thin data"}</span>
          </div>
          <div className={styles.cohortRows}>
            {scoreCohorts.map((cohort) => (
              <div key={cohort.label}>
                <div><span>Score {cohort.label}</span><small>{cohort.contacted} {de ? "kontaktiert" : "contacted"} · {cohort.leads} Leads</small></div>
                <div className={styles.cohortRate}><div className={styles.miniTrack}><span style={{ width: `${cohort.rate !== null && !cohort.thin ? Math.min(100, cohort.rate * 4) : 0}%` }} /></div><strong className={cohort.rate !== null && !cohort.thin && cohort.rate > 0 ? styles.blueCell : styles.mutedCell}>{cohort.rate === null ? "—" : cohort.thin ? "n/a" : formatPercent(cohort.rate, 1)}</strong></div>
              </div>
            ))}
          </div>
          <p className={styles.cohortFoot}>{de ? "Die Kohorten füllen sich mit jedem Versand. Raten werden erst ab 10 Kontakten als belastbar hervorgehoben." : "Cohorts fill with every send. Rates are highlighted as reliable only from 10 contacts."}</p>
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <div className={`${styles.surface} ${styles.velocityCard}`}>
          <div className={styles.cardHeader}>
            <div><h2>{de ? "Pipeline-Geschwindigkeit" : "Pipeline velocity"}</h2><p>{de ? "Ø Liegezeit je Übergang · aus verfügbaren Zeitstempeln" : "Average dwell time per transition · from available timestamps"}</p></div>
            <span className={styles.monoMeta}>{de ? "Median · Tage" : "Median · days"}</span>
          </div>
          <div className={styles.velocityGrid}>
            {velocity.map((item) => {
              const slow = item.value !== null && item.value > 4;
              const width = item.value === null ? 0 : Math.min(100, (item.value / Math.max(sendToReplyDays ?? item.value, draftToSendDays ?? item.value, 1)) * 100);
              return (
                <div key={item.label}>
                  <span className={styles.velocityLabel}>{item.label}</span>
                  <div className={styles.velocityValue}><strong className={item.value === null ? styles.valueMuted : slow ? styles.warmNumber : undefined}>{compactDays(item.value)}</strong>{item.value !== null ? <small>{de ? "T" : "d"}</small> : null}</div>
                  <div className={styles.miniTrack}><span className={slow ? styles.warmFill : undefined} style={{ width: `${width}%` }} /></div>
                  <p>{item.note}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${styles.surface} ${styles.dataCard}`}>
          <div className={styles.cardHeader}><div><h2>{de ? "Datenlage" : "Data coverage"}</h2><p>{de ? "Woraus diese Auswertung besteht" : "What this analysis is based on"}</p></div></div>
          <div className={styles.dataRows}>
            <div><CheckCircle2 size={12} /><span>{de ? "Leads, Status, Scores, Kampagnen, Projekte" : "Leads, statuses, scores, campaigns, projects"}</span><strong>{de ? "Live" : "Live"}</strong></div>
            <div><CheckCircle2 size={12} /><span>{de ? "Gmail-Threads, Antworten, Follow-ups" : "Gmail threads, replies, follow-ups"}</span><strong>Live</strong></div>
            <div><Activity size={12} className={styles.dataBlue} /><span>{de ? "Kohorten & Antwortfenster aus Zeitstempeln" : "Cohorts & reply windows from timestamps"}</span><strong className={styles.dataBlue}>{de ? "Berechnet" : "Calculated"}</strong></div>
            <div><CheckCircle2 size={12} /><span>{de ? "Preview-Sessions je Lead" : "Preview sessions per lead"}</span><strong>{visits.length > 0 ? "Live" : de ? "Keine Daten" : "No data"}</strong></div>
            <div><CircleAlert size={12} className={styles.dataWarm} /><span>{de ? "Vollständige Status-Zeitstempel je Lead" : "Complete status timestamps per lead"}</span><strong className={styles.dataWarm}>{de ? "Teilweise" : "Partial"}</strong></div>
            <div><CircleAlert size={12} className={styles.dataMuted} /><span>{de ? "E-Mail-Open-Rate" : "Email open rate"}</span><strong className={styles.dataMuted}>{de ? "Nicht erhoben" : "Not tracked"}</strong></div>
          </div>
          <p className={styles.dataFoot}>{de ? "Leadbase misst echte Preview-Aufrufe statt unzuverlässiger Tracking-Pixel-Opens. Pipeline-Zeiten bleiben dort neutral, wo kein belastbarer Zeitstempel existiert." : "Leadbase measures real preview visits instead of unreliable tracking-pixel opens. Pipeline timing stays neutral where no reliable timestamp exists."}</p>
        </div>
      </section>
    </div>
  );
}
