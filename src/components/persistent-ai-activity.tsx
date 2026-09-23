"use client";

import Link from "next/link";
import {
  FileText,
  Loader2,
  MessageSquareText,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAppNotifications } from "@/components/app-notifications";
import { useLanguage } from "@/components/language-provider";

type OperationStatus = "running" | "completed" | "failed";

type PersistentOperation = {
  id: string;
  source: "ai" | "workflow";
  feature: string;
  model: string | null;
  reasoningEffort: string | null;
  status: OperationStatus;
  stage: string;
  leadId: string | null;
  workflowRunId: string | null;
  creditsReserved: number;
  creditsCharged: number;
  retryCount: number;
  errorCategory: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  href: string | null;
};

type ApiResponse =
  | { ok: true; items: PersistentOperation[] }
  | { ok: false; error: string; code?: string };

const FEATURE_COPY: Record<
  string,
  {
    en: string[];
    de: string[];
    tipEn: string;
    tipDe: string;
  }
> = {
  lead_analysis: {
    en: [
      "Analyzing the website…",
      "Reviewing the mobile experience…",
      "Checking the strongest opportunities…",
    ],
    de: [
      "Website wird analysiert…",
      "Mobile Experience wird geprüft…",
      "Die stärksten Chancen werden geprüft…",
    ],
    tipEn: "Visual and evidence findings stay attached to the lead.",
    tipDe: "Visual- und Evidence-Ergebnisse bleiben am Lead gespeichert.",
  },
  design_generation: {
    en: [
      "Generating the design…",
      "Building the visual direction…",
      "Refining layout and hierarchy…",
      "Convincing the pixels to cooperate…",
    ],
    de: [
      "Design wird erstellt…",
      "Visuelle Richtung wird aufgebaut…",
      "Layout und Hierarchie werden verfeinert…",
      "Die Pixel werden zur Mitarbeit überredet…",
    ],
    tipEn: "Finished designs can be turned into an outreach GIF.",
    tipDe: "Fertige Designs können später als Outreach-GIF genutzt werden.",
  },
  design_motion: {
    en: ["Enhancing motion…", "Refining transitions…", "Checking the final animation…"],
    de: ["Motion wird verbessert…", "Übergänge werden verfeinert…", "Finale Animation wird geprüft…"],
    tipEn: "Motion is applied only after the base design is ready.",
    tipDe: "Motion wird erst auf das fertige Basis-Design angewendet.",
  },
  outreach_generation: {
    en: ["Preparing outreach…", "Finding useful talking points…", "Writing a concise opener…"],
    de: ["Outreach wird vorbereitet…", "Nützliche Gesprächspunkte werden gesucht…", "Ein prägnanter Einstieg wird geschrieben…"],
    tipEn: "Nothing is sent automatically — you stay in control of the draft.",
    tipDe: "Nichts wird automatisch gesendet — du behältst die Kontrolle über den Entwurf.",
  },
  call_prep: {
    en: ["Preparing Call Prep…", "Reviewing the conversation…", "Organizing objections and next steps…"],
    de: ["Call Prep wird vorbereitet…", "Konversation wird geprüft…", "Einwände und nächste Schritte werden sortiert…"],
    tipEn: "Useful customer replies can make Call Prep more specific.",
    tipDe: "Nützliche Kundenantworten können Call Prep deutlich konkreter machen.",
  },
  proposal_autofill: {
    en: ["Preparing the proposal…", "Structuring the scope…", "Polishing the proposal draft…"],
    de: ["Angebot wird vorbereitet…", "Leistungsumfang wird strukturiert…", "Angebotsentwurf wird verfeinert…"],
    tipEn: "The proposal remains a draft until you decide to send it.",
    tipDe: "Das Angebot bleibt ein Entwurf, bis du es selbst versendest.",
  },
  ai_lead_search: {
    en: ["Finding companies…", "Checking the search intent…", "Preparing candidate leads…"],
    de: ["Unternehmen werden gesucht…", "Suchintention wird geprüft…", "Lead-Kandidaten werden vorbereitet…"],
    tipEn: "Review candidates before saving them into your workspace.",
    tipDe: "Prüfe Kandidaten, bevor du sie in deinem Workspace speicherst.",
  },
  full_lead_workflow: {
    en: ["Running the full workflow…", "Preparing the next step…", "Keeping progress synced…"],
    de: ["Full Workflow läuft…", "Nächster Schritt wird vorbereitet…", "Fortschritt wird synchronisiert…"],
    tipEn: "You can keep working elsewhere — workflow progress is stored on the server.",
    tipDe: "Du kannst weiterarbeiten — der Workflow-Fortschritt bleibt auf dem Server gespeichert.",
  },
};

const DEFAULT_COPY = {
  en: ["Working with AI…", "Preparing the result…", "Finishing the request…"],
  de: ["AI arbeitet…", "Ergebnis wird vorbereitet…", "Anfrage wird abgeschlossen…"],
  tipEn: "Long-running AI actions stay visible while you navigate through Leadbase.",
  tipDe: "Länger laufende AI-Aktionen bleiben sichtbar, während du durch Leadbase navigierst.",
};

const WORKFLOW_STAGE_COPY: Record<string, { en: string[]; de: string[] }> = {
  queued: {
    en: ["Starting the workflow…", "Preparing the first step…"],
    de: ["Workflow wird gestartet…", "Erster Schritt wird vorbereitet…"],
  },
  analysis: {
    en: ["Analyzing the website…", "Reviewing the mobile experience…", "Collecting useful findings…"],
    de: ["Website wird analysiert…", "Mobile Experience wird geprüft…", "Nützliche Findings werden gesammelt…"],
  },
  design: {
    en: ["Generating the design…", "Building the visual direction…", "Refining the page…"],
    de: ["Design wird erstellt…", "Visuelle Richtung wird aufgebaut…", "Seite wird verfeinert…"],
  },
  outreach: {
    en: ["Preparing outreach…", "Finding useful talking points…", "Writing the draft…"],
    de: ["Outreach wird vorbereitet…", "Nützliche Gesprächspunkte werden gesucht…", "Entwurf wird geschrieben…"],
  },
  call_prep: {
    en: ["Preparing Call Prep…", "Organizing talking points…", "Preparing the next conversation…"],
    de: ["Call Prep wird vorbereitet…", "Gesprächspunkte werden sortiert…", "Nächstes Gespräch wird vorbereitet…"],
  },
  proposal: {
    en: ["Preparing the proposal…", "Structuring the scope…", "Finishing the proposal draft…"],
    de: ["Angebot wird vorbereitet…", "Leistungsumfang wird strukturiert…", "Angebotsentwurf wird fertiggestellt…"],
  },
  finalizing: {
    en: ["Finalizing the workflow…", "Saving the finished work…"],
    de: ["Workflow wird abgeschlossen…", "Fertige Ergebnisse werden gespeichert…"],
  },
};

function formatElapsed(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

function featureLabel(feature: string, de: boolean) {
  const labels: Record<string, [string, string]> = {
    lead_analysis: ["Website analysis", "Website-Analyse"],
    design_generation: ["Design generation", "Design-Erstellung"],
    design_motion: ["Motion enhancement", "Motion-Verbesserung"],
    outreach_generation: ["Outreach generation", "Outreach-Erstellung"],
    follow_up_generation: ["Follow-up generation", "Follow-up-Erstellung"],
    reply_generation: ["AI reply", "AI-Antwort"],
    reply_intelligence: ["Reply analysis", "Antwort-Analyse"],
    proposal_autofill: ["Proposal draft", "Angebotsentwurf"],
    competitor_research: ["Competitor research", "Wettbewerber-Recherche"],
    call_prep: ["Call Prep", "Call Prep"],
    ai_lead_search: ["Lead search", "Lead-Suche"],
    full_lead_workflow: ["Full Lead Workflow", "Full Lead Workflow"],
  };
  const pair = labels[feature] ?? ["AI task", "AI-Aufgabe"];
  return de ? pair[1] : pair[0];
}

function FeatureIcon({ feature }: { feature: string }) {
  if (feature === "design_generation" || feature === "design_motion") {
    return <WandSparkles className="size-4" />;
  }
  if (feature === "outreach_generation" || feature === "reply_generation" || feature === "call_prep") {
    return <MessageSquareText className="size-4" />;
  }
  if (feature === "proposal_autofill") return <FileText className="size-4" />;
  if (feature === "lead_analysis" || feature === "ai_lead_search") return <Search className="size-4" />;
  return <Sparkles className="size-4" />;
}

export function PersistentAiActivityRows() {
  const { language } = useLanguage();
  const { notify } = useAppNotifications();
  const de = language === "de";
  const [items, setItems] = useState<PersistentOperation[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const initialized = useRef(false);
  const previous = useRef(new Map<string, OperationStatus>());

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/ai-operations", { cache: "no-store" });
      const json = (await response.json()) as ApiResponse;
      if (!response.ok || !json.ok) return;

      const next = new Map(json.items.map((item) => [item.id, item.status] as const));
      if (initialized.current) {
        for (const item of json.items) {
          const before = previous.current.get(item.id);
          if (before === "running" && item.status === "completed") {
            notify({
              variant: "success",
              title: de ? `${featureLabel(item.feature, true)} abgeschlossen` : `${featureLabel(item.feature, false)} complete`,
              description: de ? "Das Ergebnis ist jetzt bereit." : "The result is ready.",
              ...(item.href
                ? { action: { label: de ? "Öffnen" : "Open", href: item.href } }
                : {}),
            });
          }
          if (before === "running" && item.status === "failed") {
            notify({
              variant: "error",
              title: de ? `${featureLabel(item.feature, true)} fehlgeschlagen` : `${featureLabel(item.feature, false)} failed`,
              description:
                item.errorMessage ||
                (de ? "Die Aktion kann sicher erneut versucht werden." : "You can safely retry this action."),
              ...(item.href
                ? { action: { label: de ? "Öffnen" : "Open", href: item.href } }
                : {}),
            });
          }
        }
      }

      previous.current = next;
      initialized.current = true;
      setItems(json.items);
    } catch {
      // Progress is supplemental. The original feature remains usable if this poll fails.
    }
  }, [de, notify]);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 2_000);
    return () => window.clearInterval(poll);
  }, [load]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(tick);
  }, []);

  const running = useMemo(
    () => items.filter((item) => item.status === "running").slice(0, 2),
    [items],
  );

  if (running.length === 0) return null;

  return (
    <>
      {running.map((item) => {
        const started = new Date(item.startedAt).getTime();
        const elapsedSeconds = Number.isFinite(started)
          ? Math.max(0, (now - started) / 1_000)
          : 0;
        const base = FEATURE_COPY[item.feature] ?? DEFAULT_COPY;
        const stage = item.source === "workflow"
          ? WORKFLOW_STAGE_COPY[item.stage] ?? null
          : null;
        const copy = stage ? (de ? stage.de : stage.en) : (de ? base.de : base.en);
        const copyIndex = copy.length > 0
          ? Math.floor(elapsedSeconds / 6) % copy.length
          : 0;
        const message = copy[copyIndex] ?? (de ? "AI arbeitet…" : "AI is working…");
        const tip = de ? base.tipDe : base.tipEn;

        const card = (
          <div className="min-w-0 rounded-xl border border-border/70 bg-background/95 p-3 shadow-lg shadow-black/10 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.08] text-primary">
                <FeatureIcon feature={item.feature} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-semibold">{featureLabel(item.feature, de)}</p>
                  <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-primary">
                    {formatElapsed(elapsedSeconds)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{message}</p>
                <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-muted-foreground/80">{tip}</p>
              </div>

              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.id} href={item.href} className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            {card}
          </Link>
        ) : (
          <div key={item.id}>{card}</div>
        );
      })}
    </>
  );
}
