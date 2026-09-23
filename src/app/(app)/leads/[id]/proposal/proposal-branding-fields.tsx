"use client";

import {
  useState,
} from "react";

import {
  Input,
} from "@/components/ui/input";

export function ProposalBrandingFields({
  defaultAccentColor,
  globalAccentColor,
  currentLogoUrl,
  firstTimeClient,
  isGerman,
  disabled = false,
}: {
  defaultAccentColor: string;
  globalAccentColor: string;
  currentLogoUrl?: string | null;
  firstTimeClient: boolean;
  isGerman: boolean;
  disabled?: boolean;
}) {
  const [accentColor, setAccentColor] =
    useState(
      /^#[0-9A-F]{6}$/i.test(defaultAccentColor)
        ? defaultAccentColor.toUpperCase()
        : "#002BBA"
    );

  const [colorTouched, setColorTouched] = useState(false);
  const [brandColorScope, setBrandColorScope] = useState<"proposal" | "global">("proposal");
  const normalizedGlobalAccent = /^#[0-9A-F]{6}$/i.test(globalAccentColor)
    ? globalAccentColor.toUpperCase()
    : "#002BBA";
  const normalizedAccent = /^#[0-9A-F]{6}$/i.test(accentColor)
    ? accentColor.toUpperCase()
    : "#002BBA";
  const showBrandChoice = colorTouched && normalizedAccent !== normalizedGlobalAccent;

  return (
    <div>
      <div>
        <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">
          {isGerman
            ? "Branding & Konditionen"
            : "Branding & terms"}
        </h3>
        <p className="mt-1 text-[11.5px] text-[#6B7078]">
          {isGerman
            ? "Logo, Akzentfarbe und Erstkunden-Garantie für dieses Angebot."
            : "Logo, accent color and first-time-client guarantee for this proposal."}
        </p>
      </div>

      <div className="mt-[14px] grid gap-4 md:grid-cols-2">
        <div className="rounded-[12px] border border-black/[0.08] p-3.5 dark:border-white/[0.08]">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
            {isGerman
              ? "Angebotsfarbe"
              : "Proposal color"}
          </div>

          <div className="mt-2 flex items-center gap-2.5">
            <input
              aria-label={isGerman ? "Angebotsfarbe auswählen" : "Choose proposal color"}
              type="color"
              value={accentColor}
              disabled={disabled}
              onChange={(event) => {
                setAccentColor(event.target.value.toUpperCase());
                setColorTouched(true);
                setBrandColorScope("proposal");
              }}
              className="size-9 cursor-pointer rounded-[9px] border border-black/[0.09] bg-white p-1 disabled:opacity-50 dark:border-white/[0.10] dark:bg-[#15161A]"
            />

            <Input
              id="accentColor"
              name="accentColor"
              value={accentColor}
              disabled={disabled}
              onChange={(event) => {
                setAccentColor(event.target.value);
                setColorTouched(true);
                setBrandColorScope("proposal");
              }}
              onBlur={() =>
                setAccentColor(
                  /^#[0-9A-F]{6}$/i.test(accentColor)
                    ? accentColor.toUpperCase()
                    : "#002BBA"
                )
              }
              maxLength={7}
              pattern="#[0-9A-Fa-f]{6}"
              className="h-9 rounded-[9px] font-mono text-[12px] uppercase"
            />
          </div>
        </div>

        <input type="hidden" name="brandColorScope" value={showBrandChoice ? brandColorScope : "proposal"} />

        <div className="rounded-[12px] border border-black/[0.08] p-3.5 dark:border-white/[0.08]">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-[#6B7078]">
            {isGerman
              ? "Logo im Angebot"
              : "Proposal logo"}
          </div>

          <Input
            id="logoFile"
            name="logoFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled}
            className="mt-2 h-9 rounded-[9px] text-[11px]"
          />

          {currentLogoUrl ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[9px] bg-[#F7F8FA] p-2.5 dark:bg-white/[0.04]">
              <img
                src={currentLogoUrl}
                alt="Proposal logo"
                className="max-h-10 max-w-[180px] object-contain object-left"
              />

              <label className="flex cursor-pointer items-center gap-2 text-[10.5px] text-[#6B7078]">
                <input
                  type="checkbox"
                  name="removeLogo"
                  value="1"
                  disabled={disabled}
                  className="size-3.5 rounded border"
                />
                {isGerman
                  ? "Entfernen"
                  : "Remove"}
              </label>
            </div>
          ) : null}
        </div>
      </div>

      {showBrandChoice ? (
        <div className="mt-3 rounded-[12px] border border-[#002BBA]/20 bg-[#F7F9FF] p-3.5 dark:bg-[#002BBA]/10">
          <p className="text-[12px] font-medium">{isGerman ? "Soll diese Farbe nur für dieses Angebot gelten?" : "Should this color apply only to this proposal?"}</p>
          <p className="mt-1 text-[10.5px] leading-5 text-[#6B7078]">{isGerman ? "Deine globale Brand Color bleibt unverändert, außer du übernimmst diese Farbe bewusst überall." : "Your global Brand Color stays unchanged unless you explicitly use this color everywhere."}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setBrandColorScope("proposal")} className={`h-9 rounded-[9px] border px-3 text-[11px] font-medium ${brandColorScope === "proposal" ? "border-[#002BBA] bg-[#002BBA] text-white" : "border-black/10 bg-white dark:border-white/10 dark:bg-white/[.04]"}`}>{isGerman ? "Nur dieses Angebot" : "Only this proposal"}</button>
            <button type="button" onClick={() => setBrandColorScope("global")} className={`h-9 rounded-[9px] border px-3 text-[11px] font-medium ${brandColorScope === "global" ? "border-[#002BBA] bg-[#002BBA] text-white" : "border-black/10 bg-white dark:border-white/10 dark:bg-white/[.04]"}`}>{isGerman ? "Als Brand Color überall nutzen" : "Use as my brand color everywhere"}</button>
          </div>
        </div>
      ) : null}

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[12px] border border-black/[0.08] p-3.5 dark:border-white/[0.08]">
        <input
          type="checkbox"
          name="firstTimeClient"
          value="1"
          defaultChecked={firstTimeClient}
          disabled={disabled}
          className="mt-0.5 size-4 rounded border accent-[#002BBA]"
        />

        <span>
          <span className="block text-[12.5px] font-medium">
            {isGerman
              ? "Erstkunde · Geld-zurück-Garantie anzeigen"
              : "First-time client · show money-back guarantee"}
          </span>
          <span className="mt-1 block text-[11px] leading-5 text-[#6B7078]">
            {isGerman
              ? "Bei Folgeprojekten deaktivieren. Die Garantie verschwindet dann aus Web-Angebot und PDF."
              : "Disable for repeat projects. The guarantee then disappears from the web proposal and PDF."}
          </span>
        </span>
      </label>
    </div>
  );
}
