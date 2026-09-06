"use client";

import {
  Check,
  Loader2,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useFormStatus,
} from "react-dom";

import {
  acceptProposal,
} from "./actions";

type ProposalAcceptanceFlowProps = {
  token: string;
  title: string;
  clientName: string;
  priceLabel: string;
  accentColor: string;
};

function FinalAcceptButton({
  accentColor,
  enabled,
}: {
  accentColor: string;
  enabled: boolean;
}) {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={
        pending || !enabled
      }
      aria-busy={pending}
      style={{
        backgroundColor:
          accentColor,
        borderColor:
          accentColor,
      }}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Wird bestätigt…
        </>
      ) : (
        <>
          <Check className="size-4" />
          Verbindlich annehmen
        </>
      )}
    </button>
  );
}

export function ProposalAcceptanceFlow({
  token,
  title,
  clientName,
  priceLabel,
  accentColor,
}: ProposalAcceptanceFlowProps) {
  const [open, setOpen] =
    useState(false);

  const [name, setName] =
    useState("");

  const [confirmed, setConfirmed] =
    useState(false);

  function resetAcceptance() {
    setName("");
    setConfirmed(false);
  }

  function closeModal() {
    resetAcceptance();
    setOpen(false);
  }

  function openModal() {
    resetAcceptance();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        closeModal();
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [open]);

  const canSubmit =
    name.trim().length >= 2 &&
    confirmed;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        style={{
          backgroundColor:
            accentColor,
          borderColor:
            accentColor,
        }}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Angebot annehmen
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proposal-acceptance-title"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="w-full rounded-t-[28px] bg-white shadow-2xl sm:max-w-[560px] sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-5 border-b border-black/10 px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Schritt 2 von 2
                </p>
                <h2
                  id="proposal-acceptance-title"
                  className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950"
                >
                  Angebot bestätigen
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Schließen"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-black/10 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              action={acceptProposal}
              className="px-5 py-6 sm:px-7"
            >
              <input
                type="hidden"
                name="token"
                value={token}
              />

              <div className="grid gap-3 rounded-2xl border border-black/10 bg-[#f7f7f5] p-4 text-sm">
                <div className="flex items-start justify-between gap-6">
                  <span className="text-zinc-500">
                    Angebot
                  </span>
                  <span className="text-right font-medium text-zinc-950">
                    {title}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-6">
                  <span className="text-zinc-500">
                    Unternehmen
                  </span>
                  <span className="text-right font-medium text-zinc-950">
                    {clientName}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-6 border-t border-black/10 pt-3">
                  <span className="text-zinc-500">
                    Projektpreis
                  </span>
                  <span className="text-right text-base font-semibold text-zinc-950">
                    {priceLabel}
                  </span>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-zinc-950">
                  Ihr vollständiger Name
                </span>
                <input
                  name="acceptedByName"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  autoComplete="name"
                  required
                  minLength={2}
                  placeholder="Max Mustermann"
                  className="mt-2 h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-black/35"
                />
              </label>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4 transition-colors hover:bg-zinc-50">
                <input
                  type="checkbox"
                  name="acceptanceConfirmed"
                  value="yes"
                  checked={confirmed}
                  onChange={(event) =>
                    setConfirmed(
                      event.target.checked
                    )
                  }
                  required
                  className="mt-0.5 size-4 shrink-0 accent-black"
                />
                <span className="text-sm leading-6 text-zinc-700">
                  Ich akzeptiere dieses Angebot verbindlich.
                </span>
              </label>

              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Erst mit dem nächsten Klick wird das Angebot angenommen. Danach erhalten Sie automatisch eine Bestätigungs-PDF per E-Mail.
              </p>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-black/15 bg-white px-5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
                >
                  Zurück
                </button>

                <FinalAcceptButton
                  accentColor={
                    accentColor
                  }
                  enabled={canSubmit}
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
