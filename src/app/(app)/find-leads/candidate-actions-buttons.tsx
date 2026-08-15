"use client";

import {
  Loader2,
  UserPlus,
  X,
} from "lucide-react";

import { useFormStatus } from "react-dom";

import {
  rejectCandidate,
  saveCandidateAsLead,
} from "./candidate-actions";

import { Button } from "@/components/ui/button";

export function CandidateActions({
  candidateId,
}: {
  candidateId: string;
}) {
  return (
    <div className="mt-5 flex items-center gap-2 border-t pt-4">
      <form action={saveCandidateAsLead}>
        <input
          type="hidden"
          name="candidateId"
          value={candidateId}
        />

        <SaveButton />
      </form>

      <form action={rejectCandidate}>
        <input
          type="hidden"
          name="candidateId"
          value={candidateId}
        />

        <RejectButton />
      </form>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      disabled={pending}
      className="gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <UserPlus className="size-3.5" />
          Add to leads
        </>
      )}
    </Button>
  );
}

function RejectButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      disabled={pending}
      className="gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Rejecting...
        </>
      ) : (
        <>
          <X className="size-3.5" />
          Reject
        </>
      )}
    </Button>
  );
}