import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const OUTREACH_MODEL = "gpt-5.6-luna";

const OutreachDraftSchema = z.object({
  subject: z.string().max(60),
  body: z.string(),
  followUpBody: z.string(),
  personalizationPoints: z.array(z.string()).max(5),
});

export type GeneratedOutreachDraft = z.infer<typeof OutreachDraftSchema> & {
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export type GenerateOutreachDraftInput = {
  companyName: string;
  industry?: string | null;
  location?: string | null;
  contactName?: string | null;
  contactJobTitle?: string | null;
  contactSalutation?: "HERR" | "FRAU" | null;
  websiteUrl?: string | null;
  campaignName?: string | null;
  campaignOutreachAngle?: string | null;
  campaignEmailTone?: string | null;
  researchSummary?: string | null;
  structuralScore?: number | null;
  visualScore?: number | null;
  opportunityScore?: number | null;
  redesignPotential?: number | null;
  visualStrengths?: string[];
  visualWeaknesses?: string[];
  redesignReason?: string | null;
  suggestedOutreachAngle?: string | null;
  hasCustomerPreview?: boolean;
  language?: "de" | "en";
  senderName?: string | null;
  senderRole?: string | null;
  senderCompany?: string | null;
  senderWebsite?: string | null;
  senderEmail?: string | null;
  verifiedEvidence?: string[];
  primaryHook?: {
    category?: string | null;
    strength?: number | null;
    value?: string | null;
    evidence?: string | null;
    sentence?: string | null;
  } | null;
};

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing from the environment.");
  return new OpenAI({ apiKey });
}

function optionalLine(
  label: string,
  value: string | number | null | undefined,
) {
  if (value === null || value === undefined || value === "") return null;
  return `${label}: ${value}`;
}

function getLastName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  const particles = new Set(["von", "van", "de", "der", "den", "zu", "zur"]);
  let start = parts.length - 1;
  while (start > 0 && particles.has(parts[start - 1].toLowerCase())) start -= 1;
  return parts.slice(start).join(" ");
}

function getPreferredGreeting(input: GenerateOutreachDraftInput) {
  const name = input.contactName?.trim();
  if (input.language !== "de") return name ? `Hello ${name},` : "Hello,";
  if (name && input.contactSalutation === "HERR") {
    return `Sehr geehrter Herr ${getLastName(name)},`;
  }
  if (name && input.contactSalutation === "FRAU") {
    return `Sehr geehrte Frau ${getLastName(name)},`;
  }
  return "Guten Tag,";
}

function normalizeTextBlock(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildSenderContext(input: GenerateOutreachDraftInput) {
  return [
    optionalLine("Name", input.senderName),
    optionalLine("Role", input.senderRole),
    optionalLine("Company", input.senderCompany),
    optionalLine("Website", input.senderWebsite),
    optionalLine("Email", input.senderEmail),
  ]
    .filter(Boolean)
    .join("\n") || "No additional sender profile information was provided.";
}

function buildSystemPrompt(input: GenerateOutreachDraftInput, greeting: string) {
  const sender = buildSenderContext(input);
  if (input.language === "de") {
    return `
Du schreibst kurze, persönliche B2B-Outreach-E-Mails für einen Leadbase-Nutzer.

ABSENDER
${sender}

Schreibe ausschließlich auf natürlichem, professionellem Deutsch und verwende die höfliche Sie-Ansprache. Die Nachricht soll wie eine echte persönliche Geschäftsmail wirken, nicht wie KI, ein Audit oder ein Sales-Skript. Erfinde nichts und verwende nur Informationen aus dem bereitgestellten Lead-Kontext.

ANREDE
Die erste Zeile MUSS exakt lauten:
${greeting}
Ändere diese Anrede nicht. Ergänze niemals selbst Herr/Frau, wenn es nicht eindeutig vorgegeben ist.

INHALT
- Nutze maximal 1–2 konkrete, glaubwürdige Beobachtungen.
- Formuliere Chancen respektvoll und indirekt; keine harte Kritik.
- Keine internen Scores, Analysebegriffe oder KI-Hinweise.
- Technische Fakten (Performance, Ladezeit, kaputte Links, Formular, HTTPS, Meta-Daten) dürfen NUR verwendet werden, wenn sie unten ausdrücklich als VERIFIED EVIDENCE geliefert werden.
- Zahlen/Werte aus VERIFIED EVIDENCE exakt übernehmen. Nichts runden, verändern, verstärken oder rechtlich bewerten.
- Wenn keine VERIFIED EVIDENCE vorhanden ist, keine technischen Probleme behaupten.
- Normalerweise zwei kurze Absätze, ca. 55–90 Wörter.
- Niedrigschwelliger CTA, kein aggressiver Termin- oder Verkaufsdruck.
- Betreff kurz, neutral, maximal ca. 6 Wörter.
- Erzeuge KEINE Signatur; Leadbase hängt die gespeicherte Signatur des Nutzers automatisch an.

DESIGNVORSCHAU
${input.hasCustomerPreview ? "Eine Kundenvorschau existiert. Erwähne sie im Haupttext NICHT; Leadbase hängt den Vorschau-Absatz und Link kontrolliert an. Im Follow-up darfst du natürlich auf die bereits gesendete Vorschau Bezug nehmen, aber keine URL selbst einfügen." : "Es existiert keine Kundenvorschau. Behaupte oder verspreche keine bereits vorhandene Vorschau."}

FOLLOW-UP
Schreibe zusätzlich ein kurzes, freundliches Follow-up von ca. 40–60 Wörtern. Kein Druck, keine erneute Analyse und keine erfundenen Informationen.

PERSONALIZATION POINTS
Gib 3 bis maximal 5 kurze interne Stichpunkte zurück. Sie müssen sachlich sein und dürfen keine erfundenen Details enthalten.
    `.trim();
  }

  return `
You write short, personal B2B outreach emails for a Leadbase user.

SENDER
${sender}

Write exclusively in natural, professional English. The message must feel like a genuine one-to-one business email, never like AI copy, a website audit, or a sales script. Never invent facts; use only information supported by the lead context.

GREETING
The first line MUST be exactly:
${greeting}
Do not change it. Never infer a title, gender, or honorific.

CONTENT
- Use at most 1–2 strong, concrete observations.
- Frame opportunities respectfully and indirectly; do not insult the current website.
- Never mention internal scores, AI, analysis systems, or databases.
- Technical claims (performance, load time, broken links, forms, HTTPS, metadata) may ONLY be used when explicitly supplied below as VERIFIED EVIDENCE.
- Preserve every measured value exactly. Never round, alter, exaggerate, or turn an observation into a legal claim.
- If VERIFIED EVIDENCE is empty, do not claim technical problems.
- Usually two short paragraphs, about 55–90 words.
- Use a low-friction call to action; no aggressive meeting or sales pressure.
- Keep the subject neutral and human, usually no more than about 6 words.
- Do NOT generate a signature; Leadbase appends the user's saved signature automatically.

DESIGN PREVIEW
${input.hasCustomerPreview ? "A client preview already exists. Do NOT mention it in the main email; Leadbase appends the controlled preview paragraph and URL. The follow-up may naturally refer to the preview that was already sent, but must not insert a URL itself." : "No client preview exists. Do not claim or promise that a preview already exists."}

FOLLOW-UP
Also write a short, friendly follow-up of about 40–60 words. No pressure, no repeated audit, and no invented information.

PERSONALIZATION POINTS
Return 3 to 5 short internal notes. Keep them factual and never invent details.
  `.trim();
}

function buildContext(input: GenerateOutreachDraftInput) {
  const labels = input.language === "de"
    ? {
        company: "Unternehmen",
        industry: "Branche",
        location: "Standort",
        contact: "Ansprechpartner",
        position: "Position",
        website: "Website",
        campaign: "Kampagne",
        angle: "Kampagnen-Ansatz",
        tone: "Gewünschter Ton",
        summary: "Recherche-Zusammenfassung",
        redesignReason: "Redesign-Grund",
        suggestedAngle: "Vorgeschlagener Outreach-Ansatz",
        preview: "Designvorschau vorhanden",
        strengths: "Visuelle Stärken",
        weaknesses: "Visuelle Schwächen",
        yes: "Ja",
        no: "Nein",
      }
    : {
        company: "Company",
        industry: "Industry",
        location: "Location",
        contact: "Contact",
        position: "Role",
        website: "Website",
        campaign: "Campaign",
        angle: "Campaign angle",
        tone: "Preferred tone",
        summary: "Research summary",
        redesignReason: "Redesign reason",
        suggestedAngle: "Suggested outreach angle",
        preview: "Client preview available",
        strengths: "Visual strengths",
        weaknesses: "Visual weaknesses",
        yes: "Yes",
        no: "No",
      };

  return [
    optionalLine(labels.company, input.companyName),
    optionalLine(labels.industry, input.industry),
    optionalLine(labels.location, input.location),
    optionalLine(labels.contact, input.contactName),
    optionalLine(labels.position, input.contactJobTitle),
    optionalLine(labels.website, input.websiteUrl),
    optionalLine(labels.campaign, input.campaignName),
    optionalLine(labels.angle, input.campaignOutreachAngle),
    optionalLine(labels.tone, input.campaignEmailTone),
    optionalLine(labels.summary, input.researchSummary),
    optionalLine("Structural score", input.structuralScore),
    optionalLine("Visual score", input.visualScore),
    optionalLine("Opportunity score", input.opportunityScore),
    optionalLine("Redesign potential", input.redesignPotential),
    optionalLine(labels.redesignReason, input.redesignReason),
    optionalLine(labels.suggestedAngle, input.suggestedOutreachAngle),
    optionalLine(labels.preview, input.hasCustomerPreview ? labels.yes : labels.no),
    input.visualStrengths?.length
      ? `${labels.strengths}: ${input.visualStrengths.join(" | ")}`
      : null,
    input.visualWeaknesses?.length
      ? `${labels.weaknesses}: ${input.visualWeaknesses.join(" | ")}`
      : null,
    input.primaryHook?.evidence
      ? `PRIMARY VERIFIED HOOK: ${input.primaryHook.category ?? "evidence"} | strength ${input.primaryHook.strength ?? 0} | value ${input.primaryHook.value ?? ""} | ${input.primaryHook.evidence}`
      : null,
    input.verifiedEvidence?.length
      ? `VERIFIED EVIDENCE (use exactly; do not infer beyond these facts):\n- ${input.verifiedEvidence.join("\n- ")}`
      : `VERIFIED EVIDENCE: none`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateOutreachDraft(
  input: GenerateOutreachDraftInput,
): Promise<GeneratedOutreachDraft> {
  const openai = createOpenAIClient();
  const language: "de" | "en" = input.language === "de" ? "de" : "en";
  const normalizedInput: GenerateOutreachDraftInput = { ...input, language };
  const preferredGreeting = getPreferredGreeting(normalizedInput);
  const context = buildContext(normalizedInput);

  const response = await openai.responses.parse({
    model: OUTREACH_MODEL,
    reasoning: { effort: "low" },
    input: [
      { role: "system", content: buildSystemPrompt(normalizedInput, preferredGreeting) },
      {
        role: "user",
        content: language === "de"
          ? `Erstelle jetzt einen personalisierten Outreach-Entwurf. Verwende ausschließlich Informationen, die durch den folgenden Kontext gestützt werden. Erfinde nichts.\n\nKONTEXT:\n${context}`
          : `Create a personalized outreach draft now. Use only information supported by the context below. Do not invent anything.\n\nCONTEXT:\n${context}`,
      },
    ],
    text: { format: zodTextFormat(OutreachDraftSchema, "outreach_draft") },
  });

  const parsed = response.output_parsed;
  if (!parsed) throw new Error("Outreach generation returned no structured result.");

  return {
    subject: parsed.subject.trim(),
    body: normalizeTextBlock(parsed.body),
    followUpBody: normalizeTextBlock(parsed.followUpBody),
    personalizationPoints: parsed.personalizationPoints,
    model: OUTREACH_MODEL,
    usage: {
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    },
  };
}
