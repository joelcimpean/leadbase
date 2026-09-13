import type { AppLanguage } from "@/lib/i18n";
import type { CampaignIdea } from "@/lib/campaign-ideas";

export type CampaignMarket =
  | "dach"
  | "usca"
  | "ukie"
  | "iberia"
  | "france"
  | "benelux"
  | "nordics"
  | "global";

const MARKET_ALIASES: Array<{ market: CampaignMarket; values: string[] }> = [
  { market: "dach", values: ["germany", "deutschland", "austria", "österreich", "oesterreich", "switzerland", "schweiz", "suisse", "svizzera", ", de", ", at", ", ch"] },
  { market: "usca", values: ["united states", "usa", "u.s.", "canada", ", us", ", ca"] },
  { market: "ukie", values: ["united kingdom", "uk", "england", "scotland", "wales", "northern ireland", "ireland", ", gb", ", ie"] },
  { market: "iberia", values: ["spain", "españa", "espana", "portugal", ", es", ", pt"] },
  { market: "france", values: ["france", "frankreich", ", fr"] },
  { market: "benelux", values: ["netherlands", "nederland", "belgium", "belgique", "belgië", "luxembourg", ", nl", ", be", ", lu"] },
  { market: "nordics", values: ["denmark", "sweden", "norway", "finland", "iceland", "danmark", "sverige", "norge", "suomi", ", dk", ", se", ", no", ", fi", ", is"] },
];

const MARKET_RANKING: Record<CampaignMarket, string[]> = {
  dach: ["shk", "photovoltaik", "gartenbau", "elektriker", "immobilienmakler", "hausverwaltung", "consulting", "it-dienstleister"],
  usca: ["elektriker", "shk", "gartenbau", "photovoltaik", "immobilienmakler", "consulting", "it-dienstleister", "hausverwaltung"],
  ukie: ["shk", "elektriker", "gartenbau", "photovoltaik", "immobilienmakler", "consulting", "it-dienstleister", "hausverwaltung"],
  iberia: ["photovoltaik", "immobilienmakler", "shk", "gartenbau", "elektriker", "consulting", "it-dienstleister", "hausverwaltung"],
  france: ["photovoltaik", "shk", "gartenbau", "immobilienmakler", "elektriker", "consulting", "it-dienstleister", "hausverwaltung"],
  benelux: ["elektriker", "photovoltaik", "shk", "gartenbau", "immobilienmakler", "consulting", "it-dienstleister", "hausverwaltung"],
  nordics: ["elektriker", "shk", "photovoltaik", "gartenbau", "consulting", "it-dienstleister", "immobilienmakler", "hausverwaltung"],
  global: ["it-dienstleister", "consulting", "immobilienmakler", "elektriker", "photovoltaik", "gartenbau", "shk", "hausverwaltung"],
};

const ENGLISH_NAMES: Record<string, string> = {
  photovoltaik: "Solar / Photovoltaics",
  gartenbau: "Landscaping",
  elektriker: "Electricians",
  shk: "HVAC / Heat Pumps",
  immobilienmakler: "Real Estate Agents",
  hausverwaltung: "Property Management",
  consulting: "Business Consulting",
  "it-dienstleister": "IT Services",
};

const ENGLISH_INDUSTRIES: Record<string, string> = {
  photovoltaik: "Solar / Photovoltaics",
  gartenbau: "Landscaping",
  elektriker: "Electrical Contractors",
  shk: "HVAC / Heating / Plumbing",
  immobilienmakler: "Real Estate Agents",
  hausverwaltung: "Property Management",
  consulting: "Business Consulting",
  "it-dienstleister": "IT Services",
};

const MARKET_NAMES: Partial<Record<CampaignMarket, Record<string, string>>> = {
  ukie: { immobilienmakler: "Estate Agents", gartenbau: "Landscaping & Garden Services", shk: "Heating / Plumbing / Heat Pumps" },
  iberia: { immobilienmakler: "Real Estate Agencies", shk: "HVAC / Heat Pumps", gartenbau: "Landscaping & Outdoor Services" },
  usca: { immobilienmakler: "Realtors / Real Estate", shk: "HVAC Contractors", gartenbau: "Landscaping Companies" },
};

export function detectCampaignMarket(location: string | null | undefined): CampaignMarket {
  const normalized = (location ?? "").trim().toLocaleLowerCase("en-US");
  if (!normalized) return "global";
  for (const entry of MARKET_ALIASES) {
    if (entry.values.some((value) => normalized.includes(value))) return entry.market;
  }
  return "global";
}

export function locationPrimaryLabel(location: string | null | undefined) {
  return (location ?? "").split(",")[0]?.trim() || "";
}

export function campaignIdeaDisplayName(idea: CampaignIdea, language: AppLanguage, market: CampaignMarket) {
  if (language === "de") return idea.name;
  return MARKET_NAMES[market]?.[idea.id] ?? ENGLISH_NAMES[idea.id] ?? idea.name;
}

export function campaignIdeaIndustry(idea: CampaignIdea, language: AppLanguage) {
  return language === "de" ? idea.industry : ENGLISH_INDUSTRIES[idea.id] ?? idea.industry;
}

export function campaignIdeaLocationDescription(
  idea: CampaignIdea,
  location: string | null | undefined,
  language: AppLanguage,
  market: CampaignMarket,
) {
  const place = locationPrimaryLabel(location);
  const base = language === "de"
    ? `${idea.name} passt gut zu regionalem Website-Outreach.`
    : `${campaignIdeaDisplayName(idea, language, market)} is a strong fit for local website outreach.`;
  if (!place) return base;
  return language === "de"
    ? `${base} Für dein Profil empfehlen wir zuerst ${place} und das direkte Umland.`
    : `${base} Based on your profile, start with ${place} and the surrounding area.`;
}

export function rankCampaignIdeasForLocation<T extends CampaignIdea>(ideas: T[], location: string | null | undefined) {
  const market = detectCampaignMarket(location);
  const ranking = MARKET_RANKING[market];
  const order = new Map(ranking.map((id, index) => [id, index]));
  return [...ideas].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
}

export function suggestedCampaignGeography(location: string | null | undefined) {
  return (location ?? "").trim();
}
