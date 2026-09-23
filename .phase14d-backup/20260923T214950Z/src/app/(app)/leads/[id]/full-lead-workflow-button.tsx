"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleAlert,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";

import type { AppLanguage } from "@/lib/i18n";

type WorkflowStep =
  | "analysis"
  | "design"
  | "outreach"
  | "call_prep"
  | "proposal";

type SafeRun = {
  id: string;
  lead_id: string;
  mode: "one_time_50_credit_demo" | "normal_credits";
  status: "running" | "completed" | "failed";
  current_step: string;
  steps: Record<string, { status?: string; error?: string } | unknown> | null;
  fixed_credits: number | null;
  credits_charged: number;
  provider_cost_usd: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

type WorkflowState = {
  ok: true;
  planId: string;
  enabled: boolean;
  mode: "one_time_50_credit_demo" | "normal_credits";
  fixedCredits: number | null;
  availableCredits: number;
  emailVerified: boolean;
  hasWebsite: boolean;
  companyName: string;
  run: SafeRun | null;
  demoClaim: SafeRun | null;
  steps: WorkflowStep[];
};

type ErrorState = {
  ok: false;
  error: string;
  code?: string;
};

const STEP_ORDER: WorkflowStep[] = [
  "analysis",
  "design",
  "outreach",
  "call_prep",
  "proposal",
];

function stepStatus(run: SafeRun | null, step: WorkflowStep) {
  if (!run?.steps || typeof run.steps !== "object") return null;
  const value = run.steps[step];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return typeof (value as { status?: unknown }).status === "string"
    ? String((value as { status?: unknown }).status)
    : null;
}

export function FullLeadWorkflowButton({
  leadId,
  companyName,
  hasWebsite,
  language,
}: {
  leadId: string;
  companyName: string;
  hasWebsite: boolean;
  language: AppLanguage;
}) {
  const router = useRouter();
  const de = language === "de";
  const [state, setState] = useState<WorkflowState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const mounted = useRef(true);
  const driving = useRef(false);

  const load = useCallback(async (quiet = false) => {
    try {
      const response = await fetch(
        `/api/leads/${encodeURIComponent(leadId)}/full-workflow`,
        { cache: "no-store" },
      );
      const json = await response.json() as WorkflowState | ErrorState;
      if (!response.ok || !json.ok) {
        const message =
          json.ok === false
            ? json.error
            : "Could not load workflow state.";
        if (!quiet) setLoadError(message);
        return;
      }
      if (!mounted.current) return;
      setState(json);
      setLoadError(null);
    } catch (error) {
      if (!quiet && mounted.current) {
        setLoadError(error instanceof Error ? error.message : "Could not load workflow state.");
      }
    }
  }, [leadId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const activeRun = state?.run?.status === "running"
    ? state.run
    : state?.demoClaim?.status === "running" && state.demoClaim.lead_id === leadId
      ? state.demoClaim
      : null;

  useEffect(() => {
    if (!activeRun && !starting) return;
    const timer = window.setInterval(() => void load(true), 1600);
    return () => window.clearInterval(timer);
  }, [activeRun, starting, load]);

  const completedRun = state?.run?.status === "completed" ? state.run : null;
  const freeMode = state?.mode === "one_time_50_credit_demo";
  const globalDemoClaim = state?.demoClaim ?? null;
  const demoUsedElsewhere = Boolean(
    freeMode &&
    globalDemoClaim?.status === "completed" &&
    globalDemoClaim.lead_id !== leadId,
  );
  const demoRunningElsewhere = Boolean(
    freeMode &&
    globalDemoClaim?.status === "running" &&
    globalDemoClaim.lead_id !== leadId,
  );

  const disabledReason = useMemo(() => {
    if (!hasWebsite || state?.hasWebsite === false) {
      return de ? "Für diesen Workflow wird eine Website benötigt." : "This workflow needs a website.";
    }
    if (!state) return loadError;
    if (!state.enabled) return de ? "Nicht in deinem Plan enthalten." : "Not included in your plan.";
    if (freeMode && !state.emailVerified) {
      return de ? "Bestätige zuerst deine E-Mail-Adresse." : "Verify your email first.";
    }
    if (demoUsedElsewhere) {
      return de ? "Der kostenlose Workflow wurde bereits verwendet." : "The free workflow has already been used.";
    }
    if (demoRunningElsewhere) {
      return de ? "Der kostenlose Workflow läuft bereits bei einem anderen Lead." : "The free workflow is already running on another lead.";
    }
    if (freeMode && state.availableCredits < 50 && !activeRun && !completedRun) {
      return de ? "Für den kostenlosen Workflow werden 50 Credits benötigt." : "The free workflow needs 50 Credits.";
    }
    return null;
  }, [activeRun, completedRun, de, demoRunningElsewhere, demoUsedElsewhere, freeMode, hasWebsite, loadError, state]);

  const driveWorkflow = useCallback(async (closeDialog: boolean) => {
    if (driving.current) return;
    driving.current = true;
    setStarting(true);
    setLoadError(null);
    if (closeDialog) setOpen(false);

    try {
      let finished = false;

      // One request owns one expensive workflow step. This avoids keeping the
      // entire analysis + ~3 minute design + remaining AI work inside a single
      // serverless request. The server atomically prevents duplicate step work.
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const response = await fetch(
          `/api/leads/${encodeURIComponent(leadId)}/full-workflow`,
          { method: "POST" },
        );
        const json = await response.json() as {
          ok?: boolean;
          error?: string;
          done?: boolean;
          busy?: boolean;
          run?: SafeRun;
        };

        if (!response.ok || !json.ok) {
          throw new Error(json.error || "Full workflow failed.");
        }

        await load(true);

        if (json.done || json.run?.status === "completed") {
          finished = true;
          break;
        }

        if (json.run?.status === "failed") {
          throw new Error(json.run.error_message || "Full workflow failed.");
        }

        if (json.busy) {
          await new Promise((resolve) => window.setTimeout(resolve, 1600));
        }
      }

      if (!finished) {
        throw new Error(
          de
            ? "Der Workflow konnte nicht innerhalb des erwarteten Zeitfensters abgeschlossen werden."
            : "The workflow did not finish within the expected time window.",
        );
      }

      await load(true);
      router.refresh();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Full workflow failed.");
      await load(true);
    } finally {
      driving.current = false;
      if (mounted.current) setStarting(false);
    }
  }, [de, leadId, load, router]);

  function startWorkflow() {
    void driveWorkflow(true);
  }

  // If the page is reloaded or revisited while a workflow is between steps,
  // continue it automatically. A second tab is safe: the server step-claim RPC
  // lets only one request own an expensive step at a time.
  useEffect(() => {
    if (!activeRun || starting || driving.current) return;
    void driveWorkflow(false);
  }, [activeRun, driveWorkflow, starting]);

  if (state && !state.enabled) return null;

  const run = activeRun ?? (starting ? state?.run ?? null : null);
  const buttonLabel = completedRun
    ? (de ? "Workflow abgeschlossen" : "Workflow complete")
    : activeRun || starting
      ? (de ? "Workflow läuft…" : "Workflow running…")
      : freeMode
        ? (de ? "Kompletten AI-Workflow starten · 50 Credits" : "Run full AI workflow · 50 Credits")
        : (de ? "Kompletten AI-Workflow starten" : "Run full AI workflow");

  return (
    <>
      <div className="min-w-0 max-[980px]:w-full">
        <button
          type="button"
          onClick={() => {
            if (completedRun) return;
            if (!disabledReason && !activeRun && !starting) setOpen(true);
          }}
          disabled={Boolean(disabledReason) || Boolean(activeRun) || starting || Boolean(completedRun)}
          title={disabledReason ?? undefined}
          className="flex h-[34px] items-center gap-2 rounded-[10px] border border-[#002BBA]/20 bg-[#EEF2FF] px-3 text-[12px] font-medium text-[#002BBA] transition-colors hover:bg-[#E4EAFF] disabled:cursor-not-allowed disabled:opacity-55 dark:border-[#4967D8]/30 dark:bg-[#14204A] dark:text-[#91A5FF] max-[980px]:w-full max-[980px]:justify-center"
        >
          {activeRun || starting ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : completedRun ? (
            <Check className="size-3.5" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          <span className="truncate">{buttonLabel}</span>
        </button>

        {(activeRun || starting) ? (
          <div className="mt-2 w-full max-w-[390px] rounded-[10px] border border-black/[0.07] bg-white px-3 py-2.5 text-[10.5px] shadow-sm dark:border-white/[0.08] dark:bg-[#121316]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-medium">{de ? "Workflow-Fortschritt" : "Workflow progress"}</span>
              <span className="font-mono text-[8.5px] uppercase tracking-[.06em] text-[#6B7078]">
                {run?.current_step === "finalizing"
                  ? (de ? "Abschluss" : "Finalizing")
                  : run?.current_step || (de ? "Startet" : "Starting")}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {STEP_ORDER.map((step) => {
                const status = stepStatus(run ?? null, step);
                const current = run?.current_step === step;
                const done = status === "completed" || status === "skipped";
                return (
                  <div key={step} className="min-w-0">
                    <div className={`h-1 rounded-full ${done ? "bg-[#2F6B3A]" : current ? "bg-[#002BBA]" : "bg-black/[0.08] dark:bg-white/[0.10]"}`} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className="mt-2 flex max-w-[430px] items-start gap-1.5 text-[10.5px] leading-4 text-[#A33A2B]">
            <CircleAlert className="mt-0.5 size-3 shrink-0" />
            <span>{loadError}</span>
          </div>
        ) : disabledReason && !loadError ? (
          <div className="mt-1.5 max-w-[430px] text-[9.5px] text-[#6B7078]">{disabledReason}</div>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 px-4 backdrop-blur-[2px]">
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[500px] rounded-[18px] border border-black/[0.08] bg-white p-5 text-[#0B0C0E] shadow-[0_24px_80px_rgba(0,0,0,.24)] dark:border-white/[0.10] dark:bg-[#121316] dark:text-white"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#EEF2FF] text-[#002BBA] dark:bg-[#14204A] dark:text-[#91A5FF]">
                <Sparkles className="size-4" />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-[8px] text-[#6B7078] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
              >
                <X className="size-4" />
              </button>
            </div>

            <h2 className="mt-4 text-[19px] font-semibold tracking-[-0.02em]">
              {freeMode
                ? (de ? "Alle 50 kostenlosen Credits verwenden?" : "Use all 50 free Credits?")
                : (de ? "Kompletten AI-Workflow starten?" : "Run the full AI workflow?")}
            </h2>
            <p className="mt-2 text-[12.5px] leading-5 text-[#6B7078] dark:text-[#A8ABB2]">
              {freeMode
                ? (de
                  ? `Leadbase verwendet deine 50 kostenlosen Credits, um für ${companyName} Website-Analyse, Standard-Sol-Design, personalisierten Outreach-Entwurf, Call Prep und einen Angebots-Startentwurf vorzubereiten.`
                  : `Leadbase will use your 50 free Credits to prepare website analysis, a Standard Sol design, personalized outreach draft, call prep and a proposal starting draft for ${companyName}.`)
                : (de
                  ? `Leadbase führt für ${companyName} dieselben Schritte aus. Die einzelnen AI-Aktionen werden normal nach tatsächlicher Nutzung in Credits berechnet.`
                  : `Leadbase will run the same steps for ${companyName}. Each AI action uses normal Credits based on actual usage.`)}
            </p>
            <p className="mt-2 rounded-[9px] bg-[#F6F7F9] px-3 py-2 text-[10.5px] leading-4 text-[#40454E] dark:bg-white/[0.05] dark:text-[#C7CAD0]">
              {de
                ? "Es wird nichts automatisch an den Kunden gesendet. Outreach und Angebot bleiben Entwürfe und müssen von dir geprüft werden."
                : "Nothing is sent to the client automatically. Outreach and proposal stay as drafts for you to review."}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-[9px] border border-black/[0.09] px-3.5 text-[12px] font-medium hover:bg-black/[0.03] dark:border-white/[0.10] dark:hover:bg-white/[0.05]"
              >
                {de ? "Abbrechen" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => void startWorkflow()}
                className="h-9 rounded-[9px] bg-[#002BBA] px-3.5 text-[12px] font-medium text-white hover:bg-[#00229A]"
              >
                {freeMode
                  ? (de ? "Full Workflow starten · 50 Credits" : "Run full workflow · 50 Credits")
                  : (de ? "Full Workflow starten" : "Run full workflow")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
