"use client";

import {
  Check,
  Loader2,
  Sparkles,
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
  Button,
} from "@/components/ui/button";

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
    typeof window === "undefined"
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

  /*
   * Master volume.
   */

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
  const audioContextRef =
    useRef<AudioContext | null>(
      null
    );

  /*
   * Browsers can block audio that starts only after
   * a long asynchronous operation.
   *
   * Therefore we initialize/unlock the AudioContext
   * immediately when the user clicks Analyze.
   */

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

  /*
   * Called after the server action is finished.
   */

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

  useEffect(
    () => {
      /*
       * Server action started.
       */

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

      /*
       * Server action was pending before and has now finished.
       */

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

          Analyzing...
        </>
      ) : showSuccess ? (
        <>
          <Check className="size-4 text-emerald-600" />

          Analysis complete
        </>
      ) : (
        <>
          <Sparkles className="size-4" />

          {hasWebsite
            ? "Analyze website"
            : "Analyze opportunity"}
        </>
      )}
    </Button>
  );
}