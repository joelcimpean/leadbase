"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

import { completeProductTour } from "@/app/onboarding/actions";
import { useLanguage } from "@/components/language-provider";

const steps = {
  de: [
    {
      target: "dashboard",
      title: "Dein Command Center",
      body: "Hier siehst du sofort, welche Antworten, Follow-ups, Entwürfe und HOT Leads heute deine Aufmerksamkeit brauchen.",
    },
    {
      target: "find-leads",
      title: "Neue Leads finden",
      body: "Suche neue Firmen nach Branche und Region. Leadbase prüft Duplikate und legt passende Leads direkt in deinem Workspace an.",
    },
    {
      target: "leads",
      title: "Analysieren & Designs bauen",
      body: "Öffne einen Lead, analysiere seine Website und erstelle im Design Studio neue Varianten, Inspirationen und Motion.",
    },
    {
      target: "inbox",
      title: "Inbox & Follow-ups",
      body: "Verbinde Gmail, beantworte Replies und lass geplante Follow-ups automatisch stoppen, sobald ein Lead reagiert.",
    },
    {
      target: "proposals",
      title: "Angebote & Projekte",
      body: "Erstelle Angebote aus dem Lead-Verlauf, sende die Online-Version und überführe angenommene Angebote in Projekte.",
    },
    {
      target: "analytics",
      title: "Was funktioniert wirklich?",
      body: "Analytics zeigt dir Funnel, Antwortquote und Kampagnenleistung, damit du deine Akquise gezielt verbesserst.",
    },
    {
      target: "account",
      title: "Dein Account",
      body: "Profil, Verbindungen, Sprache, Plan, Credits und Design-Defaults findest du hier. Danach bist du startklar.",
    },
  ],
  en: [
    {
      target: "dashboard",
      title: "Your command center",
      body: "See which replies, follow-ups, drafts and HOT leads need your attention today.",
    },
    {
      target: "find-leads",
      title: "Find new leads",
      body: "Search companies by industry and location. Leadbase checks duplicates and adds approved leads to your workspace.",
    },
    {
      target: "leads",
      title: "Analyze and build designs",
      body: "Open a lead, analyze its website and create new Design Studio variations with inspiration and motion.",
    },
    {
      target: "inbox",
      title: "Inbox and follow-ups",
      body: "Connect Gmail, reply to conversations and let scheduled follow-ups stop automatically as soon as a lead responds.",
    },
    {
      target: "proposals",
      title: "Proposals and projects",
      body: "Create proposals from the lead history, send the online version and turn accepted proposals into projects.",
    },
    {
      target: "analytics",
      title: "See what actually works",
      body: "Analytics shows your funnel, reply rate and campaign performance so you can improve outreach with real data.",
    },
    {
      target: "account",
      title: "Your account",
      body: "Profile, connections, language, plan, credits and design defaults live here. Then you're ready to work.",
    },
  ],
} as const;

type Rect = { left: number; top: number; width: number; height: number };

export function ProductTour() {
  const { language } = useLanguage();
  const activeSteps = steps[language];
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [closing, setClosing] = useState(false);
  const step = activeSteps[Math.min(index, activeSteps.length - 1)];

  useEffect(() => {
    function sync() {
      const element = document.querySelector<HTMLElement>(`[data-leadbase-tour="${step.target}"]`);
      if (!element) {
        setRect(null);
        return;
      }
      const value = element.getBoundingClientRect();
      setRect({ left: value.left - 6, top: value.top - 6, width: value.width + 12, height: value.height + 12 });
      element.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    const id = window.setTimeout(sync, 80);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [step.target]);

  useEffect(() => {
    setIndex((current) => Math.min(current, activeSteps.length - 1));
  }, [activeSteps.length]);

  async function finish() {
    if (closing) return;
    setClosing(true);
    try {
      await completeProductTour();
    } finally {
      window.location.reload();
    }
  }

  const cardPosition = useMemo(() => {
    if (!rect || typeof window === "undefined") return { left: 24, top: 90 };
    const cardWidth = 360;
    const gap = 14;
    let left = rect.left + rect.width + gap;
    let top = rect.top;
    if (left + cardWidth > window.innerWidth - 20) {
      left = Math.max(20, rect.left - cardWidth - gap);
    }
    top = Math.max(20, Math.min(window.innerHeight - 250, top));
    return { left, top };
  }, [rect]);

  const de = language === "de";

  return (
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label={de ? "Leadbase Schnellstart" : "Leadbase quick start"}>
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-[13px] ring-2 ring-white/90 shadow-[0_0_0_9999px_rgba(9,10,12,0.68)] transition-all duration-200"
          style={rect}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-black/65" />
      )}

      <div
        className="fixed w-[min(360px,calc(100vw-32px))] rounded-[14px] border border-black/[0.08] bg-white p-5 text-[#0B0C0E] shadow-[0_28px_64px_-22px_rgba(0,0,0,0.46)]"
        style={{ left: cardPosition.left, top: cardPosition.top }}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#002BBA]">{de ? "Schnellstart" : "Quick start"}</span>
          <span className="font-mono text-[9px] text-[#A3A8B0]">{index + 1} / {activeSteps.length}</span>
          <button type="button" onClick={() => void finish()} className="ml-auto flex size-7 items-center justify-center rounded-[8px] text-[#6B7078] hover:bg-[#F3F4F6]" aria-label={de ? "Tour schließen" : "Close tour"}><X className="size-3.5" /></button>
        </div>
        <h2 className="mt-3 text-[19px] font-semibold tracking-[-0.026em]">{step.title}</h2>
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[#6B7078]">{step.body}</p>
        <div className="mt-5 flex items-center gap-2">
          <button type="button" disabled={index === 0} onClick={() => setIndex((current) => Math.max(0, current - 1))} className="flex h-9 items-center gap-1.5 rounded-[9px] border border-[#DFE1E5] px-3 text-[12px] font-medium text-[#40454E] disabled:opacity-35"><ArrowLeft className="size-3.5" /> {de ? "Zurück" : "Back"}</button>
          <button type="button" onClick={() => index === activeSteps.length - 1 ? void finish() : setIndex((current) => current + 1)} className="ml-auto flex h-9 items-center gap-1.5 rounded-[9px] bg-[#002BBA] px-3.5 text-[12px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,0.30)]">
            {index === activeSteps.length - 1 ? <><Check className="size-3.5" /> {de ? "Fertig" : "Done"}</> : <>{de ? "Weiter" : "Next"} <ArrowRight className="size-3.5" /></>}
          </button>
        </div>
        <button type="button" onClick={() => void finish()} className="mt-3 text-[11.5px] text-[#6B7078] hover:text-[#0B0C0E]">{de ? "Tour überspringen" : "Skip tour"}</button>
      </div>
    </div>
  );
}
