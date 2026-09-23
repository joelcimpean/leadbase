"use client";

import Link from "next/link";

import {
  Check,
  Loader2,
  LockKeyhole,
  Sparkles,
  Zap,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  analyzeLeadWebsite,
} from "../analysis-actions";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Button,
} from "@/components/ui/button";

import {
  CreditEstimatePill,
} from "@/components/credit-estimate-pill";
import { useLeadbasePlan } from "@/hooks/use-leadbase-plan";

/* =========================================================
   TYPES
========================================================= */

type AnalyzeWebsiteButtonProps = {
  leadId: string;
  hasWebsite: boolean;
};

/* =========================================================
   SUCCESS SOUND
========================================================= */

function createAudioContext() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return new AudioContext();
}

function playSuccessChime(
  audioContext: AudioContext
) {
  if (
    audioContext.state ===
    "suspended"
  ) {
    void audioContext.resume();
  }

  const now =
    audioContext.currentTime;

  const masterGain =
    audioContext.createGain();

  masterGain.gain.setValueAtTime(
    0.0001,
    now
  );

  masterGain.gain.exponentialRampToValueAtTime(
    0.18,
    now + 0.015
  );

  masterGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.7
  );

  masterGain.connect(
    audioContext.destination
  );

  /* =======================================================
     TONE 1
  ======================================================= */

  const firstOscillator =
    audioContext.createOscillator();

  const firstGain =
    audioContext.createGain();

  firstOscillator.type =
    "sine";

  firstOscillator.frequency.setValueAtTime(
    783.99,
    now
  );

  firstGain.gain.setValueAtTime(
    0.0001,
    now
  );

  firstGain.gain.exponentialRampToValueAtTime(
    0.65,
    now + 0.01
  );

  firstGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.26
  );

  firstOscillator.connect(
    firstGain
  );

  firstGain.connect(
    masterGain
  );

  firstOscillator.start(
    now
  );

  firstOscillator.stop(
    now + 0.28
  );

  /* =======================================================
     TONE 2
  ======================================================= */

  const secondOscillator =
    audioContext.createOscillator();

  const secondGain =
    audioContext.createGain();

  secondOscillator.type =
    "sine";

  secondOscillator.frequency.setValueAtTime(
    1174.66,
    now + 0.1
  );

  secondGain.gain.setValueAtTime(
    0.0001,
    now
  );

  secondGain.gain.setValueAtTime(
    0.0001,
    now + 0.09
  );

  secondGain.gain.exponentialRampToValueAtTime(
    0.82,
    now + 0.12
  );

  secondGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.5
  );

  secondOscillator.connect(
    secondGain
  );

  secondGain.connect(
    masterGain
  );

  secondOscillator.start(
    now + 0.09
  );

  secondOscillator.stop(
    now + 0.52
  );

  /* =======================================================
     SUBTLE HIGH CHIME
  ======================================================= */

  const shimmerOscillator =
    audioContext.createOscillator();

  const shimmerGain =
    audioContext.createGain();

  shimmerOscillator.type =
    "sine";

  shimmerOscillator.frequency.setValueAtTime(
    1567.98,
    now + 0.13
  );

  shimmerGain.gain.setValueAtTime(
    0.0001,
    now
  );

  shimmerGain.gain.setValueAtTime(
    0.0001,
    now + 0.12
  );

  shimmerGain.gain.exponentialRampToValueAtTime(
    0.22,
    now + 0.15
  );

  shimmerGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.62
  );

  shimmerOscillator.connect(
    shimmerGain
  );

  shimmerGain.connect(
    masterGain
  );

  shimmerOscillator.start(
    now + 0.12
  );

  shimmerOscillator.stop(
    now + 0.64
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export function AnalyzeWebsiteButton({
  leadId,
  hasWebsite,
}: AnalyzeWebsiteButtonProps) {
  const { language } = useLanguage();
  const { planId, remainingCredits, loading: planLoading } = useLeadbasePlan();
  const noCredits = !planLoading && remainingCredits !== null && remainingCredits <= 0;
  const gateClassName = "inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/40";

  if (!planLoading && planId === "free") {
    return (
      <Link href="/profile?dialog=plan" className={gateClassName}>
        <LockKeyhole className="size-4" />
        {language === "de" ? "Analyse · ab Starter" : "Analyze · Starter+"}
      </Link>
    );
  }

  if (noCredits) {
    return (
      <Link href="/profile?dialog=credits" className={gateClassName}>
        <Zap className="size-4" />
        {language === "de" ? "Keine Credits · kaufen" : "No Credits · Buy Credits"}
      </Link>
    );
  }

  return <AnalyzeWebsiteButtonInner leadId={leadId} hasWebsite={hasWebsite} />;
}

function AnalyzeWebsiteButtonInner({
  leadId,
  hasWebsite,
}: AnalyzeWebsiteButtonProps) {
  const audioContextRef =
    useRef<AudioContext | null>(
      null
    );

  const unlockAudio =
    useCallback(() => {
      try {
        if (
          !audioContextRef.current
        ) {
          audioContextRef.current =
            createAudioContext();
        }

        const context =
          audioContextRef.current;

        if (
          context?.state ===
          "suspended"
        ) {
          void context.resume();
        }
      } catch (error) {
        console.warn(
          "Could not initialize analysis success sound:",
          error
        );
      }
    }, []);

  const handleComplete =
    useCallback(() => {
      const context =
        audioContextRef.current;

      if (!context) {
        return;
      }

      try {
        playSuccessChime(
          context
        );
      } catch (error) {
        console.warn(
          "Could not play analysis success sound:",
          error
        );
      }
    }, []);

  return (
    <form
      action={
        analyzeLeadWebsite
      }
      onSubmitCapture={
        unlockAudio
      }
    >
      <input
        type="hidden"
        name="leadId"
        value={
          leadId
        }
      />

      <input
        type="hidden"
        name="forceEvidenceAudit"
        value="1"
      />

      <AnalyzeButtonContent
        hasWebsite={
          hasWebsite
        }
        onComplete={
          handleComplete
        }
      />
    </form>
  );
}

/* =========================================================
   BUTTON CONTENT
========================================================= */

function AnalyzeButtonContent({
  hasWebsite,
  onComplete,
}: {
  hasWebsite: boolean;
  onComplete: () => void;
}) {
  const {
    language,
  } =
    useLanguage();

  const {
    pending,
  } =
    useFormStatus();

  const wasPendingRef =
    useRef(
      false
    );

  const [
    showSuccess,
    setShowSuccess,
  ] =
    useState(
      false
    );

  const text =
    language ===
    "de"
      ? {
          analyzing:
            "Wird analysiert...",

          complete:
            "Analyse abgeschlossen",

          website:
            "Website analysieren",

          opportunity:
            "Potenzial analysieren",
        }
      : {
          analyzing:
            "Analyzing...",

          complete:
            "Analysis complete",

          website:
            "Analyze website",

          opportunity:
            "Analyze opportunity",
        };

  useEffect(
    () => {
      if (
        pending
      ) {
        wasPendingRef.current =
          true;

        setShowSuccess(
          false
        );

        return;
      }

      if (
        wasPendingRef.current
      ) {
        wasPendingRef.current =
          false;

        setShowSuccess(
          true
        );

        onComplete();

        const timeoutId =
          window.setTimeout(
            () => {
              setShowSuccess(
                false
              );
            },
            1800
          );

        return () => {
          window.clearTimeout(
            timeoutId
          );
        };
      }
    },
    [
      pending,
      onComplete,
    ]
  );

  return (
    <Button
      type="submit"
      variant="outline"
      disabled={
        pending ||
        showSuccess
      }
      className="h-9 gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />

          {
            text.analyzing
          }
        </>
      ) : showSuccess ? (
        <>
          <Check className="size-4 text-emerald-600" />

          {
            text.complete
          }
        </>
      ) : (
        <>
          <Sparkles className="size-4" />

          {hasWebsite
            ? text.website
            : text.opportunity}

          <CreditEstimatePill
            feature="lead_analysis"
            language={language}
            hideOnSmall
          />
        </>
      )}
    </Button>
  );
}