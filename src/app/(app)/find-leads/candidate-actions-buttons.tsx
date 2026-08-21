"use client";

import {
  Loader2,
  UserPlus,
  X,
} from "lucide-react";

import {
  useFormStatus,
} from "react-dom";

import {
  rejectCandidate,
  saveCandidateAsLead,
} from "./candidate-actions";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Button,
} from "@/components/ui/button";

import {
  acquisitionCopy,
} from "@/lib/acquisition-i18n";

/* =========================================================
   COMPONENT
========================================================= */

export function CandidateActions({
  candidateId,
}: {
  candidateId: string;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 border-t pt-4 sm:flex sm:items-center">
      <form
        action={
          saveCandidateAsLead
        }
        className="min-w-0"
      >
        <input
          type="hidden"
          name="candidateId"
          value={
            candidateId
          }
        />

        <SaveButton />
      </form>

      <form
        action={
          rejectCandidate
        }
        className="min-w-0"
      >
        <input
          type="hidden"
          name="candidateId"
          value={
            candidateId
          }
        />

        <RejectButton />
      </form>
    </div>
  );
}

/* =========================================================
   SAVE BUTTON
========================================================= */

function SaveButton() {
  const {
    language,
  } =
    useLanguage();

  const text =
    acquisitionCopy[
      language
    ].findLeads;

  const {
    pending,
  } =
    useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      disabled={
        pending
      }
      className="h-10 w-full gap-2 sm:h-8 sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />

          {
            text.adding
          }
        </>
      ) : (
        <>
          <UserPlus className="size-3.5" />

          {
            text.addToLeads
          }
        </>
      )}
    </Button>
  );
}

/* =========================================================
   REJECT BUTTON
========================================================= */

function RejectButton() {
  const {
    language,
  } =
    useLanguage();

  const text =
    acquisitionCopy[
      language
    ].findLeads;

  const {
    pending,
  } =
    useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      disabled={
        pending
      }
      className="h-10 w-full gap-2 sm:h-8 sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />

          {
            text.rejecting
          }
        </>
      ) : (
        <>
          <X className="size-3.5" />

          {
            text.reject
          }
        </>
      )}
    </Button>
  );
}