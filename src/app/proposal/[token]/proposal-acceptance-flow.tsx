"use client";

import {
  ArrowRight,
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
  expectedName: string;
  confirmationEmail?: string;
  mode?: "cta" | "rail";
  isGerman?: boolean;
};

function FinalAcceptButton({
  accentColor,
  enabled,
  isGerman,
}: {
  accentColor: string;
  enabled: boolean;
  isGerman: boolean;
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
      }}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] px-4 text-[11.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          {isGerman ? "Wird bestätigt…" : "Confirming…"}
        </>
      ) : (
        <>
          <Check className="size-3.5" />
          {isGerman ? "Verbindlich annehmen" : "Accept proposal"}
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
  expectedName,
  confirmationEmail = "",
  mode = "cta",
  isGerman = true,
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
        setName("");
        setConfirmed(false);
        setOpen(false);
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
  }, [
    open,
  ]);

  const normalizeName = (value: string) =>
    value
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("de-DE");

  const nameMatches =
    normalizeName(name) ===
    normalizeName(expectedName);

  const canSubmit =
    nameMatches && confirmed;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        style={{
          backgroundColor:
            accentColor,
        }}
        className={[
          "inline-flex items-center justify-center font-medium text-white transition-opacity hover:opacity-90",
          mode === "rail"
            ? "h-9 w-full rounded-[9px] px-3 text-[10.5px]"
            : "h-10 gap-2 rounded-full px-4 text-[11.5px]",
        ].join(" ")}
      >
        {isGerman ? "Angebot annehmen" : "Accept proposal"}
        {mode === "cta" ? (
          <ArrowRight className="size-3.5" />
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0E1013]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5"
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
          <div className="w-full overflow-hidden rounded-t-[18px] border border-black/[0.10] bg-[#FFFDFB] shadow-[0_38px_80px_-28px_rgba(11,12,14,0.48)] sm:max-w-[500px] sm:rounded-[18px]">
            <div className="border-b border-black/[0.08] px-5 pb-4 pt-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8A857D]">
                  {isGerman ? "Zusage bestätigen" : "Confirm acceptance"}
                </p>

                <button
                  type="button"
                  onClick={closeModal}
                  aria-label={isGerman ? "Schließen" : "Close"}
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] text-[#8A857D] transition-colors hover:bg-black/[0.05] hover:text-[#14161A]"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <h2
                id="proposal-acceptance-title"
                className="mt-2.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.015em] text-[#14161A]"
                style={{
                  fontFamily:
                    '"Instrument Serif", Georgia, serif',
                }}
              >
                {title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-[#6B6660]">
                <span>
                  {clientName}
                </span>
                <span className="h-2.5 w-px bg-black/[0.14]" />
                <span className="font-mono font-medium text-[#14161A]">
                  {priceLabel}
                </span>
              </div>
            </div>

            <form
              action={acceptProposal}
              className="px-5 py-5 sm:px-6"
            >
              <input
                type="hidden"
                name="token"
                value={token}
              />

              <label className="block">
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8A857D]">
                  {isGerman ? "Ihr Name" : "Your name"}
                </span>
                <input
                  name="acceptedByName"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  autoComplete="off"
                  spellCheck={false}
                  required
                  minLength={2}
                  placeholder={isGerman ? "Max Mustermann" : "Your full name"}
                  className={[
                    "mt-2 h-10 w-full rounded-[10px] border bg-white px-3 text-[12px] text-[#14161A] outline-none transition-colors placeholder:text-[#A39E96]",
                    name.length > 0 && !nameMatches
                      ? "border-[#9A5106]/45 focus:border-[#9A5106]"
                      : "border-black/[0.14] focus:border-black/[0.34]",
                  ].join(" ")}
                />
                <span
                  className={[
                    "mt-1.5 block text-[9.5px] leading-[1.5]",
                    name.length > 0 && !nameMatches
                      ? "text-[#9A5106]"
                      : "text-[#8A857D]",
                  ].join(" ")}
                >
                  {name.length > 0 && !nameMatches
                    ? isGerman
                      ? `Der Name muss mit „${expectedName}“ übereinstimmen.`
                      : `The name must match “${expectedName}”.`
                    : isGerman
                      ? `Bitte geben Sie den Namen exakt wie im Angebot ein: ${expectedName}.`
                      : `Please enter the name exactly as shown in the proposal: ${expectedName}.`}
                </span>
              </label>

              <label className="relative mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-black/[0.08] bg-[#F4F2ED] p-3 transition-colors hover:border-black/[0.14]">
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
                  className="sr-only"
                />

                <span
                  className="mt-0.5 flex size-[17px] shrink-0 items-center justify-center rounded-[5px] border"
                  style={{
                    backgroundColor:
                      confirmed
                        ? accentColor
                        : "#FFFFFF",
                    borderColor:
                      confirmed
                        ? accentColor
                        : "rgba(20,22,26,.22)",
                  }}
                >
                  {confirmed ? (
                    <Check className="size-2.5 text-white" />
                  ) : null}
                </span>

                <span className="text-[10.5px] leading-[1.6] text-[#3A3E46]">
                  {isGerman
                    ? "Ich nehme das Angebot verbindlich an und bestätige Leistungsumfang, Preis und Rahmenbedingungen."
                    : "I accept this proposal and confirm the scope, price and terms."}
                </span>
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <FinalAcceptButton
                  accentColor={
                    accentColor
                  }
                  enabled={canSubmit}
                  isGerman={isGerman}
                />

                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-10 items-center justify-center rounded-[10px] border border-black/[0.14] px-4 text-[11px] text-[#6B6660] transition-colors hover:border-black/[0.28] hover:text-[#14161A]"
                >
                  {isGerman ? "Abbrechen" : "Cancel"}
                </button>
              </div>

              <p className="mt-3 text-[9.5px] leading-[1.55] text-[#8A857D]">
                {isGerman
                  ? `Nach der Zusage erhalten Sie eine PDF-Kopie${confirmationEmail ? ` an ${confirmationEmail}` : " per E-Mail"}. Keine digitale Signatur erforderlich.`
                  : `After acceptance, you will receive a PDF copy${confirmationEmail ? ` at ${confirmationEmail}` : " by email"}. No digital signature is required.`}
              </p>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
