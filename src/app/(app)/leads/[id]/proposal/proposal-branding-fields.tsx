"use client";

import {
  useState,
} from "react";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

type ProposalBrandingFieldsProps = {
  defaultAccentColor: string;
  currentLogoUrl?: string | null;
  firstTimeClient: boolean;
  isGerman: boolean;
  disabled?: boolean;
};

function normalizeColor(
  value: string
) {
  const trimmed =
    value.trim();

  return /^#[0-9A-F]{6}$/i.test(
    trimmed
  )
    ? trimmed.toUpperCase()
    : "#002BBA";
}

export function ProposalBrandingFields({
  defaultAccentColor,
  currentLogoUrl,
  firstTimeClient,
  isGerman,
  disabled = false,
}: ProposalBrandingFieldsProps) {
  const [accentColor, setAccentColor] =
    useState(
      normalizeColor(
        defaultAccentColor
      )
    );

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="accentColor">
          {isGerman
            ? "Angebotsfarbe"
            : "Proposal color"}
        </Label>

        <div className="flex items-center gap-3">
          <input
            aria-label={
              isGerman
                ? "Angebotsfarbe auswählen"
                : "Choose proposal color"
            }
            type="color"
            value={accentColor}
            disabled={disabled}
            onChange={(event) =>
              setAccentColor(
                event.target.value.toUpperCase()
              )
            }
            className="h-10 w-12 cursor-pointer rounded-lg border bg-background p-1 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <Input
            id="accentColor"
            name="accentColor"
            value={accentColor}
            disabled={disabled}
            onChange={(event) =>
              setAccentColor(
                event.target.value
              )
            }
            onBlur={() =>
              setAccentColor(
                normalizeColor(
                  accentColor
                )
              )
            }
            maxLength={7}
            pattern="#[0-9A-Fa-f]{6}"
            className="font-mono uppercase"
          />
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          {isGerman
            ? "Wird für Akzente, Buttons und die Angebots-PDF verwendet."
            : "Used for accents, buttons, and the proposal PDF."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logoFile">
          {isGerman
            ? "Logo im Angebot"
            : "Proposal logo"}
        </Label>

        <Input
          id="logoFile"
          name="logoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled}
        />

        <p className="text-xs leading-5 text-muted-foreground">
          {isGerman
            ? "PNG, JPG oder WebP · maximal 2 MB. Ohne Upload bleibt „Joel Cimpean“ als Wortmarke stehen."
            : "PNG, JPG, or WebP · max. 2 MB. Without an upload, “Joel Cimpean” remains as the wordmark."}
        </p>

        {currentLogoUrl ? (
          <div className="mt-3 rounded-xl border bg-muted/20 p-3">
            <img
              src={currentLogoUrl}
              alt="Proposal logo"
              className="max-h-20 max-w-[360px] object-contain object-left"
            />

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="removeLogo"
                value="1"
                disabled={disabled}
                className="size-4 rounded border"
              />
              {isGerman
                ? "Logo entfernen"
                : "Remove logo"}
            </label>
          </div>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
          <input
            type="checkbox"
            name="firstTimeClient"
            value="1"
            defaultChecked={firstTimeClient}
            disabled={disabled}
            className="mt-0.5 size-4 rounded border"
          />

          <span>
            <span className="block text-sm font-medium">
              {isGerman
                ? "Erstkunde · Geld-zurück-Garantie anzeigen"
                : "First-time client · show money-back guarantee"}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {isGerman
                ? "Bei Folgeprojekten einfach deaktivieren. Dann erscheint die Garantie weder im Web-Angebot noch in der PDF."
                : "Disable this for repeat projects. The guarantee will then be hidden from both the web proposal and PDF."}
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
