"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  BriefcaseBusiness,
  Building2,
  ImagePlus,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { createLead } from "@/app/(app)/leads/actions";
import { createCampaign } from "@/app/(app)/campaigns/actions";
import { createProject, deleteProject, updateProject } from "@/app/(app)/projects/actions";
import { IndustryAutocomplete } from "@/components/industry-autocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLeadbasePlan } from "@/hooks/use-leadbase-plan";
import { resolveFeatureAccess } from "@/lib/product-access";

export type QuickCreateCampaignOption = {
  id: string;
  name: string;
  status: string;
};

type Language = "de" | "en";

const triggerBase =
  "inline-flex h-[34px] items-center justify-center gap-[7px] rounded-[10px] bg-[#002BBA] px-3.5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,0.30)] transition-[background-color,transform] hover:bg-[#00229A] active:translate-y-px";

function ModalSubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: string;
}) {
  const { pending: isPending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={isPending}
      className="inline-flex h-[34px] items-center justify-center gap-[7px] rounded-[10px] bg-[#002BBA] px-3.5 text-[12.5px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,0.30)] transition-colors hover:bg-[#00229A] disabled:pointer-events-none disabled:opacity-65"
    >
      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      {isPending ? pending : children}
    </button>
  );
}

function AutoGrowCampaignTextarea({
  id,
  name,
  placeholder,
  minHeight = 78,
  maxHeight = 220,
}: {
  id: string;
  name: string;
  placeholder: string;
  minHeight?: number;
  maxHeight?: number;
}) {
  function resize(
    textarea: HTMLTextAreaElement
  ) {
    textarea.style.width = "100%";
    textarea.style.maxWidth = "100%";
    textarea.style.height = "0px";

    const nextHeight =
      Math.min(
        maxHeight,
        Math.max(
          minHeight,
          textarea.scrollHeight
        )
      );

    textarea.style.height =
      `${nextHeight}px`;

    textarea.style.overflowX =
      "hidden";

    textarea.style.overflowY =
      textarea.scrollHeight >
      maxHeight
        ? "auto"
        : "hidden";
  }

  return (
    <Textarea
      id={id}
      name={name}
      wrap="soft"
      rows={3}
      placeholder={placeholder}
      onInput={(event) =>
        resize(
          event.currentTarget
        )
      }
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        minHeight,
        maxHeight,
        overflowX:
          "hidden",
        whiteSpace:
          "pre-wrap",
        overflowWrap:
          "anywhere",
        wordBreak:
          "break-word",
      }}
      className="block w-full min-w-0 max-w-full resize-none overflow-x-hidden whitespace-pre-wrap break-words [field-sizing:fixed] rounded-[9px] border-black/[0.09] bg-[#F7F8FA] text-[12.5px]"
    />
  );
}

function CancelButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-[34px] items-center justify-center rounded-[10px] border border-black/[0.09] bg-white px-3 text-[12.5px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] dark:border-white/10 dark:bg-[#111216] dark:text-[#D7D9DE] dark:hover:bg-white/[0.05]"
    >
      {label}
    </button>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#EAEEFB] text-[#002BBA]">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-[#0B0C0E] dark:text-white">{title}</h3>
        <p className="mt-0.5 text-[11.5px] leading-5 text-[#6B7078] dark:text-[#969BA4]">{description}</p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  name,
  placeholder,
  type = "text",
  required,
  min,
  max,
  step,
  defaultValue,
}: {
  id: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  defaultValue?: string | number;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]">
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        className="h-9 rounded-[9px] border-black/[0.09] bg-[#F7F8FA] text-[12.5px] focus-visible:border-[#002BBA] focus-visible:ring-[#002BBA]/10"
      />
    </div>
  );
}

function ModalShell({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-auto max-h-[calc(100dvh-32px)] max-w-[760px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-black/[0.07] px-[18px] py-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.11em] text-[#002BBA]">
            <span className="size-[5px] rounded-full bg-[#002BBA]" />
            {eyebrow}
          </div>
          <DialogTitle className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">{title}</DialogTitle>
          <DialogDescription className="max-w-[620px] text-[11.5px] leading-5">{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function LeadCreateDialog({
  campaigns,
  language,
  label,
  freeLeadLimitReached = false,
}: {
  campaigns: QuickCreateCampaignOption[];
  language: Language;
  label: string;
  freeLeadLimitReached?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [gateMode, setGateMode] = useState(freeLeadLimitReached);
  const previousLimitRef = useRef(freeLeadLimitReached);
  const de = language === "de";

  useEffect(() => {
    const becameLocked = !previousLimitRef.current && freeLeadLimitReached;
    previousLimitRef.current = freeLeadLimitReached;

    // A successful quick-create can revalidate the same /leads route while this
    // client component stays mounted. Close the form instead of replacing it
    // with the lock screen immediately after the first lead was created.
    if (becameLocked && open && !gateMode) {
      setOpen(false);
    }
  }, [freeLeadLimitReached, gateMode, open]);

  function openCreateDialog() {
    setGateMode(freeLeadLimitReached);
    setOpen(true);
  }

  return (
    <>
      <button type="button" onClick={openCreateDialog} className={triggerBase}>
        <Plus className="size-3.5" />
        {label}
      </button>

      <ModalShell
        open={open}
        onOpenChange={setOpen}
        eyebrow="CRM"
        title={gateMode ? (de ? "Free-Lead bereits verwendet" : "Free lead already used") : (de ? "Lead hinzufügen" : "Add lead")}
        description={gateMode ? (de ? "Free enthält genau einen Demo-Lead. Das Löschen dieses Leads setzt den kostenlosen Slot nicht zurück." : "Free includes exactly one demo lead. Deleting that lead does not reset the free slot.") : (de ? "Unternehmen direkt zum CRM hinzufügen, ohne den aktuellen Leads-Workspace zu verlassen." : "Add a company directly to the CRM without leaving the current leads workspace.")}
      >
        {gateMode ? (
          <div className="px-[18px] py-5">
            <div className="rounded-[11px] border border-black/[0.08] bg-[#F7F8FA] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[12.5px] font-medium">{de ? "Dein Demo-Workspace bleibt auf einen echten Lead begrenzt." : "Your demo workspace stays limited to one real lead."}</p>
              <p className="mt-1.5 text-[11.5px] leading-5 text-[#6B7078] dark:text-[#A6ABB4]">{de ? "Du kannst den bestehenden Lead vollständig im Free-Flow testen. Zusätzliche Leads sind ab Starter verfügbar." : "You can complete the full Free flow with your existing lead. Additional leads are available from Starter."}</p>
              <button type="button" onClick={() => { setOpen(false); window.location.href = "/profile?dialog=plan"; }} className="mt-4 inline-flex h-[34px] items-center rounded-[10px] bg-[#002BBA] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#00229A]">
                {de ? "Auf Starter upgraden" : "Upgrade to Starter"}
              </button>
            </div>
          </div>
        ) : (
        <form action={createLead} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-[18px] py-4">
            <SectionTitle
              icon={Building2}
              title={de ? "Unternehmensdaten" : "Company information"}
              description={de ? "Nur der Firmenname ist erforderlich. Fehlende Daten können später recherchiert werden." : "Only the company name is required. Missing information can be researched later."}
            />

            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <Field id="qc-companyName" label={de ? "Firmenname *" : "Company name *"} name="companyName" placeholder="Muster Gartenbau GmbH" required />
              <Field id="qc-websiteUrl" label="Website" name="websiteUrl" placeholder="https://example.com" />
              <Field id="qc-industry" label={de ? "Branche" : "Industry"} name="industry" placeholder={de ? "z. B. Gartenbau" : "e.g. Landscaping"} />
              <Field id="qc-location" label={de ? "Standort" : "Location"} name="location" placeholder="Balingen" />
            </div>

            <div className="my-4 h-px bg-black/[0.07] dark:bg-white/[0.08]" />

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="qc-campaignId" className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]">{de ? "Kampagne" : "Campaign"}</Label>
                <select
                  id="qc-campaignId"
                  name="campaignId"
                  defaultValue=""
                  className="h-9 w-full rounded-[9px] border border-black/[0.09] bg-[#F7F8FA] px-3 text-[12.5px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <option value="">{de ? "Keine Kampagne" : "No campaign"}</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}{campaign.status !== "ACTIVE" ? ` · ${campaign.status.toLowerCase()}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div />
              <Field id="qc-contactPerson" label={de ? "Ansprechpartner" : "Contact person"} name="contactPerson" placeholder="Max Mustermann" />
              <Field id="qc-email" label={de ? "Öffentliche E-Mail" : "Public email"} name="email" type="email" placeholder="max@example.com" />
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/[0.07] bg-[#FDFDFE] px-[18px] py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <CancelButton onClick={() => setOpen(false)} label={de ? "Abbrechen" : "Cancel"} />
            <ModalSubmitButton pending={de ? "Wird hinzugefügt …" : "Adding …"}>{de ? "Lead hinzufügen" : "Add lead"}</ModalSubmitButton>
          </div>
        </form>
        )}
      </ModalShell>
    </>
  );
}

export function CampaignCreateDialog({
  language,
  label,
}: {
  language: Language;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const de = language === "de";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerBase}>
        <Plus className="size-3.5" />
        {label}
      </button>

      <ModalShell
        open={open}
        onOpenChange={setOpen}
        eyebrow="Outreach"
        title={de ? "Kampagne erstellen" : "Create campaign"}
        description={de ? "Eine konkrete Zielgruppe definieren, ohne den Kampagnen-Workspace zu verlassen." : "Define a specific target group without leaving the campaign workspace."}
      >
        <form action={createCampaign} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto [scrollbar-gutter:stable] px-[18px] py-4">
            <SectionTitle
              icon={Megaphone}
              title={de ? "Kampagnenbasis" : "Campaign basics"}
              description={de ? "Eine Kampagne entspricht einer konkreten Branche und Region." : "One campaign represents one specific industry and region."}
            />

            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <Field id="qc-campaign-name" label={de ? "Kampagnenname *" : "Campaign name *"} name="name" placeholder="Photovoltaik – Karlsruhe" required />

              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="qc-targetIndustry" className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]">{de ? "Zielbranche" : "Target industry"}</Label>
                <IndustryAutocomplete id="qc-targetIndustry" name="targetIndustry" placeholder={de ? "z. B. Solar, Gartenbau, Elektriker …" : "e.g. Solar, Landscaping, Electricians …"} />
              </div>

              <Field id="qc-targetGeography" label={de ? "Zielregion" : "Target geography"} name="targetGeography" placeholder="Karlsruhe" />
              <Field id="qc-companySizePreference" label={de ? "Unternehmensgröße" : "Company-size preference"} name="companySizePreference" placeholder={de ? "z. B. 2–30 Mitarbeiter" : "e.g. 2–30 employees"} />
              <Field id="qc-targetRoles" label={de ? "Zielrollen" : "Target roles"} name="targetRoles" placeholder={de ? "Inhaber, Geschäftsführer" : "Owner, Managing Director"} />

              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="qc-campaign-status" className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]">Status</Label>
                <select id="qc-campaign-status" name="status" defaultValue="DRAFT" className="h-9 w-full rounded-[9px] border border-black/[0.09] bg-[#F7F8FA] px-3 text-[12.5px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/10 dark:bg-white/[0.04]">
                  <option value="DRAFT">{de ? "Entwurf" : "Draft"}</option>
                  <option value="ACTIVE">{de ? "Aktiv" : "Active"}</option>
                  <option value="PAUSED">{de ? "Pausiert" : "Paused"}</option>
                </select>
              </div>
            </div>

            <div className="my-4 h-px bg-black/[0.07] dark:bg-white/[0.08]" />

            <div className="grid gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="qc-researchCriteria" className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]">{de ? "Recherchekriterien" : "Research criteria"}</Label>
                <AutoGrowCampaignTextarea
                  id="qc-researchCriteria"
                  name="researchCriteria"
                  minHeight={78}
                  maxHeight={220}
                  placeholder={de ? "Welche Unternehmen sind vielversprechend?" : "What makes a promising lead?"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qc-websiteCriteria" className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]">{de ? "Website-Kriterien" : "Website criteria"}</Label>
                <AutoGrowCampaignTextarea
                  id="qc-websiteCriteria"
                  name="websiteCriteria"
                  minHeight={78}
                  maxHeight={220}
                  placeholder={de ? "Welche Website-Signale sind relevant?" : "Which website signals matter?"}
                />
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field id="qc-followUpDays" label={de ? "Follow-up nach" : "Follow-up after"} name="followUpDays" type="number" min="0" max="365" step="1" defaultValue={5} />
                <Field id="qc-emailTone" label={de ? "E-Mail-Ton" : "Email tone"} name="emailTone" placeholder={de ? "Kurz, persönlich" : "Short, personal"} />
              </div>

              <div className="mt-0 space-y-1.5">
                <Label htmlFor="qc-outreachAngle" className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]">{de ? "Outreach-Ansatz" : "Outreach angle"}</Label>
                <AutoGrowCampaignTextarea
                  id="qc-outreachAngle"
                  name="outreachAngle"
                  minHeight={92}
                  maxHeight={220}
                  placeholder={de ? "Welchen konkreten Winkel soll die Ansprache nutzen?" : "Which concrete angle should outreach use?"}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/[0.07] bg-[#FDFDFE] px-[18px] py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <CancelButton onClick={() => setOpen(false)} label={de ? "Abbrechen" : "Cancel"} />
            <ModalSubmitButton pending={de ? "Wird erstellt …" : "Creating …"}>{de ? "Kampagne erstellen" : "Create campaign"}</ModalSubmitButton>
          </div>
        </form>
      </ModalShell>
    </>
  );
}


export type QuickProjectEditValue = {
  id: string;
  clientName: string;
  projectName: string;
  websiteUrl: string | null;
  mediaUrl: string | null;
  mediaMode: string | null;
  status: string;
  totalValue: number;
  amountPaid: number;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
};

function ProjectMediaModeButtons({
  mode,
  onChange,
  disabled = false,
  language,
}: {
  mode: "cover" | "logo";
  onChange: (mode: "cover" | "logo") => void;
  disabled?: boolean;
  language: Language;
}) {
  const de = language === "de";

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("cover")}
        className={`h-[34px] rounded-[9px] border px-3 text-[11.5px] font-medium transition-colors disabled:opacity-50 ${
          mode === "cover"
            ? "border-[#002BBA]/30 bg-[#EAEEFB] text-[#002BBA]"
            : "border-black/[0.09] bg-white text-[#6B7078] hover:border-black/[0.16] hover:text-[#0B0C0E] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#A6ABB4]"
        }`}
      >
        {de ? "Cover · ausfüllen" : "Cover · fill"}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("logo")}
        className={`h-[34px] rounded-[9px] border px-3 text-[11.5px] font-medium transition-colors disabled:opacity-50 ${
          mode === "logo"
            ? "border-[#002BBA]/30 bg-[#EAEEFB] text-[#002BBA]"
            : "border-black/[0.09] bg-white text-[#6B7078] hover:border-black/[0.16] hover:text-[#0B0C0E] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#A6ABB4]"
        }`}
      >
        {de ? "Logo · einpassen" : "Logo · contain"}
      </button>
    </div>
  );
}

function ProjectCreateMediaFields({
  language,
}: {
  language: Language;
}) {
  const de = language === "de";

  const pickerRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const committedRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    mode,
    setMode,
  ] =
    useState<"cover" | "logo">(
      "cover"
    );

  const [
    committed,
    setCommitted,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  function clearCommittedFile() {
    if (!committedRef.current) {
      return;
    }

    try {
      const empty =
        new DataTransfer();

      committedRef.current.files =
        empty.files;
    } catch {
      committedRef.current.value =
        "";
    }
  }

  function chooseFile(
    file:
      | File
      | null
  ) {
    setError(
      null
    );

    setCommitted(
      false
    );

    clearCommittedFile();

    if (
      previewUrl?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    if (
      !file
    ) {
      setSelectedFile(
        null
      );
      setPreviewUrl(
        null
      );
      return;
    }

    const allowed =
      new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ]);

    if (
      !allowed.has(
        file.type
      )
    ) {
      setError(
        de
          ? "Bitte JPG, PNG, WebP oder GIF verwenden."
          : "Please use JPG, PNG, WebP or GIF."
      );
      return;
    }

    if (
      file.size >
      6 * 1024 * 1024
    ) {
      setError(
        de
          ? "Das Bild darf maximal 6 MB groß sein."
          : "The image must be 6 MB or smaller."
      );
      return;
    }

    setSelectedFile(
      file
    );

    setPreviewUrl(
      URL.createObjectURL(
        file
      )
    );
  }

  function commitFile() {
    if (
      !selectedFile ||
      !committedRef.current
    ) {
      return;
    }

    try {
      const transfer =
        new DataTransfer();

      transfer.items.add(
        selectedFile
      );

      committedRef.current.files =
        transfer.files;

      setCommitted(
        true
      );
      setError(
        null
      );
    } catch {
      setError(
        de
          ? "Das Bild konnte nicht übernommen werden."
          : "The image could not be staged."
      );
    }
  }

  function removeFile() {
    if (
      previewUrl?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setPreviewUrl(
      null
    );
    setSelectedFile(
      null
    );
    setCommitted(
      false
    );
    setError(
      null
    );

    clearCommittedFile();

    if (
      pickerRef.current
    ) {
      pickerRef.current.value =
        "";
    }
  }

  return (
    <div className="mt-4 border-t border-black/[0.07] pt-4 dark:border-white/[0.08]">
      <SectionTitle
        icon={ImagePlus}
        title={
          de
            ? "Projektbild / Logo"
            : "Project image / logo"
        }
        description={
          de
            ? "Optional. Verwende ein Cover-Bild oder Kundenlogo für die Projektansicht."
            : "Optional. Add a cover image or client logo to the project view."
        }
      />

      <input
        ref={committedRef}
        type="file"
        name="projectMedia"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      <input
        type="hidden"
        name="mediaMode"
        value={mode}
      />

      <button
        type="button"
        onClick={() =>
          pickerRef.current?.click()
        }
        className="group relative mt-3.5 flex h-[150px] w-full items-center justify-center overflow-hidden rounded-[11px] border border-dashed border-black/[0.12] bg-[#F7F8FA] transition-colors hover:border-[#002BBA]/30 hover:bg-[#F5F7FD] dark:border-white/12 dark:bg-white/[0.025]"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className={`h-full w-full ${
              mode === "logo"
                ? "object-contain p-7"
                : "object-cover"
            }`}
          />
        ) : (
          <div className="text-center text-[#6B7078]">
            <Upload className="mx-auto size-4" />
            <p className="mt-2 text-[11.5px] font-medium">
              {de
                ? "Bild auswählen"
                : "Choose image"}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.06em] text-[#8B9098]">
              JPG · PNG · WEBP · GIF · MAX 6 MB
            </p>
          </div>
        )}

        {previewUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
            <span className="rounded-[8px] bg-black/60 px-2.5 py-1.5 text-[11px] font-medium backdrop-blur">
              {de
                ? "Anderes Bild wählen"
                : "Choose another image"}
            </span>
          </div>
        ) : null}
      </button>

      <input
        ref={pickerRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) =>
          chooseFile(
            event.target.files?.[0] ??
              null
          )
        }
      />

      <div className="mt-2.5">
        <ProjectMediaModeButtons
          mode={mode}
          onChange={setMode}
          language={language}
        />
      </div>

      {error ? (
        <p className="mt-2 text-[11px] text-red-500">
          {error}
        </p>
      ) : null}

      {committed ? (
        <p className="mt-2 text-[10.5px] text-[#2F6B3A]">
          {de
            ? "Bild wird zusammen mit dem Projekt gespeichert."
            : "Image will be saved with the project."}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            !selectedFile ||
            committed
          }
          onClick={
            commitFile
          }
          className="inline-flex h-[32px] items-center gap-1.5 rounded-[9px] bg-[#002BBA] px-3 text-[11.5px] font-medium text-white transition-colors hover:bg-[#00229A] disabled:pointer-events-none disabled:opacity-45"
        >
          <Upload className="size-3" />
          {de
            ? "Bild speichern"
            : "Save image"}
        </button>

        {previewUrl ? (
          <button
            type="button"
            onClick={
              removeFile
            }
            className="inline-flex h-[32px] items-center gap-1.5 rounded-[9px] border border-black/[0.09] bg-white px-3 text-[11.5px] text-[#9A5106] transition-colors hover:bg-[#FDF0E3] dark:border-white/10 dark:bg-white/[0.03]"
          >
            <Trash2 className="size-3" />
            {de
              ? "Entfernen"
              : "Remove"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProjectEditMediaFields({
  projectId,
  initialUrl,
  initialMode,
  language,
}: {
  projectId: string;
  initialUrl: string | null;
  initialMode: string | null;
  language: Language;
}) {
  const router =
    useRouter();

  const de =
    language ===
    "de";

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState<string | null>(
      initialUrl
    );

  const [
    mode,
    setMode,
  ] =
    useState<"cover" | "logo">(
      initialMode ===
        "logo"
        ? "logo"
        : "cover"
    );

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  function chooseFile(
    nextFile:
      | File
      | null
  ) {
    setError(
      null
    );

    if (
      previewUrl?.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setFile(
      nextFile
    );

    if (
      nextFile
    ) {
      setPreviewUrl(
        URL.createObjectURL(
          nextFile
        )
      );
    }
  }

  async function changeMode(
    nextMode:
      "cover"
      | "logo"
  ) {
    setMode(
      nextMode
    );

    if (
      !previewUrl ||
      file ||
      busy
    ) {
      return;
    }

    try {
      await fetch(
        `/api/projects/${encodeURIComponent(
          projectId
        )}/media`,
        {
          method:
            "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              mode:
                nextMode,
            }),
        }
      );

      router.refresh();
    } catch {
      // The selected mode stays usable in the modal even if persistence fails.
    }
  }

  async function saveImage() {
    if (
      !file ||
      busy
    ) {
      return;
    }

    setBusy(
      true
    );
    setError(
      null
    );

    try {
      const formData =
        new FormData();

      formData.set(
        "file",
        file
      );

      formData.set(
        "mode",
        mode
      );

      const response =
        await fetch(
          `/api/projects/${encodeURIComponent(
            projectId
          )}/media`,
          {
            method:
              "POST",
            body:
              formData,
          }
        );

      const result =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
          mediaUrl?: string;
        };

      if (
        !response.ok ||
        !result.ok
      ) {
        setError(
          result.error ??
            (de
              ? "Upload fehlgeschlagen."
              : "Upload failed.")
        );
        return;
      }

      setFile(
        null
      );

      if (
        result.mediaUrl
      ) {
        setPreviewUrl(
          result.mediaUrl
        );
      }

      router.refresh();
    } finally {
      setBusy(
        false
      );
    }
  }

  async function removeImage() {
    if (
      busy ||
      !previewUrl
    ) {
      return;
    }

    setBusy(
      true
    );
    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/projects/${encodeURIComponent(
            projectId
          )}/media`,
        {
          method:
            "DELETE",
        }
      );

      if (
        !response.ok
      ) {
        setError(
          de
            ? "Bild konnte nicht entfernt werden."
            : "Image could not be removed."
        );
        return;
      }

      setPreviewUrl(
        null
      );
      setFile(
        null
      );

      if (
        inputRef.current
      ) {
        inputRef.current.value =
          "";
      }

      router.refresh();
    } finally {
      setBusy(
        false
      );
    }
  }

  return (
    <div className="mt-4 border-t border-black/[0.07] pt-4 dark:border-white/[0.08]">
      <SectionTitle
        icon={ImagePlus}
        title={
          de
            ? "Projektbild / Logo"
            : "Project image / logo"
        }
        description={
          de
            ? "Cover oder Logo direkt für dieses Projekt aktualisieren."
            : "Update this project's cover or logo directly."
        }
      />

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          inputRef.current?.click()
        }
        className="group relative mt-3.5 flex h-[150px] w-full items-center justify-center overflow-hidden rounded-[11px] border border-dashed border-black/[0.12] bg-[#F7F8FA] transition-colors hover:border-[#002BBA]/30 hover:bg-[#F5F7FD] disabled:opacity-60 dark:border-white/12 dark:bg-white/[0.025]"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className={`h-full w-full ${
              mode === "logo"
                ? "object-contain p-7"
                : "object-cover"
            }`}
          />
        ) : (
          <div className="text-center text-[#6B7078]">
            <Upload className="mx-auto size-4" />
            <p className="mt-2 text-[11.5px] font-medium">
              {de
                ? "Bild auswählen"
                : "Choose image"}
            </p>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) =>
          chooseFile(
            event.target.files?.[0] ??
              null
          )
        }
      />

      <div className="mt-2.5">
        <ProjectMediaModeButtons
          mode={mode}
          onChange={(nextMode) =>
            void changeMode(
              nextMode
            )
          }
          disabled={busy}
          language={language}
        />
      </div>

      {error ? (
        <p className="mt-2 text-[11px] text-red-500">
          {error}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            busy ||
            !file
          }
          onClick={() =>
            void saveImage()
          }
          className="inline-flex h-[32px] items-center gap-1.5 rounded-[9px] bg-[#002BBA] px-3 text-[11.5px] font-medium text-white transition-colors hover:bg-[#00229A] disabled:pointer-events-none disabled:opacity-45"
        >
          {busy ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Upload className="size-3" />
          )}
          {de
            ? "Bild speichern"
            : "Save image"}
        </button>

        {previewUrl ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void removeImage()
            }
            className="inline-flex h-[32px] items-center gap-1.5 rounded-[9px] border border-black/[0.09] bg-white px-3 text-[11.5px] text-[#9A5106] transition-colors hover:bg-[#FDF0E3] disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <Trash2 className="size-3" />
            {de
              ? "Entfernen"
              : "Remove"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProjectFields({
  language,
  project,
  prefix,
}: {
  language: Language;
  project?: QuickProjectEditValue;
  prefix: string;
}) {
  const de =
    language ===
    "de";

  return (
    <>
      <SectionTitle
        icon={BriefcaseBusiness}
        title={
          de
            ? "Projektinformationen"
            : "Project information"
        }
        description={
          de
            ? "Kunde, Projektwert, Status und optionale Projektdetails."
            : "Client, project value, status and optional project details."
        }
      />

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <Field
          id={`${prefix}-clientName`}
          label={de ? "Kunde *" : "Client *"}
          name="clientName"
          placeholder={de ? "Kundenname" : "Client name"}
          defaultValue={project?.clientName}
          required
        />

        <Field
          id={`${prefix}-projectName`}
          label={de ? "Projekt *" : "Project *"}
          name="projectName"
          placeholder={de ? "Website Redesign" : "Website redesign"}
          defaultValue={project?.projectName}
          required
        />

        <div className="sm:col-span-2">
          <Field
            id={`${prefix}-website`}
            label="Website"
            name="websiteUrl"
            type="url"
            placeholder="https://example.com"
            defaultValue={project?.websiteUrl ?? ""}
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label
            htmlFor={`${prefix}-status`}
            className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]"
          >
            Status
          </Label>

          <select
            id={`${prefix}-status`}
            name="status"
            defaultValue={project?.status ?? ""}
            required
            className="h-9 w-full rounded-[9px] border border-black/[0.09] bg-[#F7F8FA] px-3 text-[12.5px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <option value="" disabled>
              {de
                ? "Status auswählen"
                : "Select status"}
            </option>
            <option value="PLANNED">
              {de
                ? "Geplant"
                : "Planned"}
            </option>
            <option value="IN_PROGRESS">
              {de
                ? "In Arbeit"
                : "In progress"}
            </option>
            <option value="COMPLETED">
              {de
                ? "Abgeschlossen"
                : "Completed"}
            </option>
            <option value="CANCELLED">
              {de
                ? "Abgebrochen"
                : "Cancelled"}
            </option>
          </select>
        </div>

        <Field
          id={`${prefix}-totalValue`}
          label={de ? "Projektwert" : "Project value"}
          name="totalValue"
          type="number"
          min="0"
          step="0.01"
          placeholder="1500"
          defaultValue={project?.totalValue}
        />

        <Field
          id={`${prefix}-amountPaid`}
          label={de ? "Bereits bezahlt" : "Already paid"}
          name="amountPaid"
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          defaultValue={project?.amountPaid}
        />

        <Field
          id={`${prefix}-startedAt`}
          label={de ? "Gestartet" : "Started"}
          name="startedAt"
          type="date"
          defaultValue={project?.startedAt ?? ""}
        />

        <Field
          id={`${prefix}-completedAt`}
          label={de ? "Abgeschlossen" : "Completed"}
          name="completedAt"
          type="date"
          defaultValue={project?.completedAt ?? ""}
        />
      </div>

      <div className="mt-3.5 space-y-1.5">
        <Label
          htmlFor={`${prefix}-notes`}
          className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]"
        >
          {de
            ? "Notizen"
            : "Notes"}
        </Label>

        <Textarea
          id={`${prefix}-notes`}
          name="notes"
          defaultValue={project?.notes ?? ""}
          placeholder={
            de
              ? "Optionale Projektnotizen"
              : "Optional project notes"
          }
          className="h-[92px] min-h-[92px] max-h-[92px] resize-none overflow-y-auto [field-sizing:fixed] rounded-[9px] border-black/[0.09] bg-[#F7F8FA] text-[12.5px]"
        />
      </div>
    </>
  );
}

export function ProjectEditDialog({
  project,
  language,
  open,
  onOpenChange,
  returnTo,
  onDelete,
}: {
  project: QuickProjectEditValue | null;
  language: Language;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo?: string;
  onDelete?: () => void;
}) {
  const de =
    language ===
    "de";

  if (
    !project
  ) {
    return null;
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={de ? "Projekte" : "Projects"}
      title={de ? "Projekt bearbeiten" : "Edit project"}
      description={
        de
          ? "Projektdaten aktualisieren, ohne den aktuellen Workspace zu verlassen."
          : "Update project data without leaving the current workspace."
      }
    >
      <form
        action={updateProject}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <input
          type="hidden"
          name="projectId"
          value={project.id}
        />

        {returnTo ? (
          <input
            type="hidden"
            name="returnTo"
            value={returnTo}
          />
        ) : null}

        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto [scrollbar-gutter:stable] px-[18px] py-4">
          <ProjectFields
            language={language}
            project={project}
            prefix={`qe-${project.id}`}
          />

          <ProjectEditMediaFields
            projectId={project.id}
            initialUrl={project.mediaUrl}
            initialMode={project.mediaMode}
            language={language}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.07] bg-[#FDFDFE] px-[18px] py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-[#B42318]/18 bg-white px-3 text-[12px] font-medium text-[#B42318] transition-colors hover:bg-[#B42318]/[0.045] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#B42318]/10 dark:bg-white/[0.03]"
              >
                <Trash2 className="size-3.5" />
                {de ? "Projekt löschen" : "Delete project"}
              </button>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <CancelButton
              onClick={() =>
                onOpenChange(
                  false
                )
              }
              label={de ? "Abbrechen" : "Cancel"}
            />

            <ModalSubmitButton
              pending={de ? "Speichert …" : "Saving …"}
            >
              {de
                ? "Projekt speichern"
                : "Save project"}
            </ModalSubmitButton>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

export function ProjectEditButton({
  project,
  language,
  label,
  className = "",
  returnTo,
}: {
  project: QuickProjectEditValue;
  language: Language;
  label?: string;
  className?: string;
  returnTo?: string;
}) {
  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const [
    deleteOpen,
    setDeleteOpen,
  ] =
    useState(
      false
    );

  const [
    deleting,
    startDeleteTransition,
  ] =
    useTransition();

  const router =
    useRouter();

  const de =
    language ===
    "de";

  function performDelete() {
    startDeleteTransition(
      async () => {
        await deleteProject(
          project.id
        );

        setDeleteOpen(
          false
        );

        router.push(
          "/projects"
        );
        router.refresh();
      }
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(
            true
          )
        }
        className={`inline-flex h-[34px] items-center justify-center gap-[7px] rounded-[10px] border border-black/[0.09] bg-white px-3.5 text-[12.5px] font-medium text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] dark:border-white/10 dark:bg-[#111216] dark:text-[#D7D9DE] ${className}`}
      >
        {label ??
          (de
            ? "Projekt bearbeiten"
            : "Edit project")}
      </button>

      <ProjectEditDialog
        project={project}
        language={language}
        open={open}
        onOpenChange={setOpen}
        returnTo={returnTo}
        onDelete={() => {
          setOpen(false);
          setDeleteOpen(true);
        }}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          if (!deleting) {
            setDeleteOpen(nextOpen);
          }
        }}
      >
        <AlertDialogContent className="max-w-[430px] rounded-[16px] border-black/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {de
                ? "Projekt wirklich löschen?"
                : "Delete this project?"}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {de
                ? `„${project.projectName}“ wird dauerhaft gelöscht. Dieser Vorgang lässt sich nicht rückgängig machen.`
                : `“${project.projectName}” will be permanently deleted. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
            >
              {de
                ? "Abbrechen"
                : "Cancel"}
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                performDelete();
              }}
              className="bg-[#B42318] text-white hover:bg-[#961D14]"
            >
              {deleting
                ? "…"
                : de
                  ? "Endgültig löschen"
                  : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ProjectCreateDialog({
  language,
  label,
  triggerClassName = "",
  triggerVariant = "primary",
  triggerDescription,
  defaultClientName = "",
  defaultWebsiteUrl = "",
  defaultProjectName = "",
  defaultStatus = "",
  returnTo,
  sourceProposalId,
}: {
  language: Language;
  label: string;
  triggerClassName?: string;
  triggerVariant?: "primary" | "nextStep";
  triggerDescription?: string;
  defaultClientName?: string;
  defaultWebsiteUrl?: string;
  defaultProjectName?: string;
  defaultStatus?: string;
  returnTo?: string;
  sourceProposalId?: string | null;
}) {
  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const { planId, loading: planLoading } = useLeadbasePlan();
  const projectAccess = resolveFeatureAccess({
    planId,
    feature: "project_creation",
  });
  const projectCreationLocked = !planLoading && projectAccess.status !== "available";

  const de =
    language ===
    "de";

  const nextStepTrigger =
    triggerVariant ===
    "nextStep";

  const defaults:
    QuickProjectEditValue = {
      id:
        "new",
      clientName:
        defaultClientName,
      projectName:
        defaultProjectName,
      websiteUrl:
        defaultWebsiteUrl ||
        null,
      mediaUrl:
        null,
      mediaMode:
        "cover",
      status:
        defaultStatus,
      totalValue:
        0,
      amountPaid:
        0,
      startedAt:
        null,
      completedAt:
        null,
      notes:
        null,
    };

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(
            true
          )
        }
        className={
          nextStepTrigger
            ? `flex h-[52px] min-w-0 items-center gap-2.5 rounded-[11px] border border-white/[0.18] bg-white/[0.12] px-3 text-left text-white transition-colors hover:bg-white/[0.20] ${triggerClassName}`
            : `${triggerBase} ${triggerClassName}`
        }
      >
        {nextStepTrigger ? (
          <BriefcaseBusiness className="size-3.5 shrink-0" />
        ) : (
          <Plus className="size-3.5 shrink-0" />
        )}

        {nextStepTrigger ? (
          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium">
              {label}
            </div>

            {triggerDescription ? (
              <div className="truncate text-[9.5px] text-white/70">
                {triggerDescription}
              </div>
            ) : null}
          </div>
        ) : (
          label
        )}
      </button>

      <ModalShell
        open={open}
        onOpenChange={setOpen}
        eyebrow={de ? "Projekte" : "Projects"}
        title={projectCreationLocked ? (de ? "Projekte ab Starter" : "Projects from Starter") : (de ? "Projekt hinzufügen" : "Add project")}
        description={
          projectCreationLocked
            ? (de ? "Gewonnene Free-Leads bekommen automatisch ein Projekt, aber die Projektverwaltung ist ab Starter verfügbar." : "Won Free leads still get an automatic project, but project management is available from Starter.")
            : de
              ? "Ein Kundenprojekt direkt erfassen, ohne den Projekte-Workspace zu verlassen."
              : "Create a client project directly without leaving the projects workspace."
        }
      >
        {projectCreationLocked ? (
          <div className="px-[18px] py-5">
            <div className="rounded-[11px] border border-black/[0.08] bg-[#F7F8FA] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[12.5px] font-medium">{de ? "Upgrade auf Starter, um Projekte zu verwalten." : "Upgrade to Starter to create and manage projects."}</p>
              <p className="mt-1.5 text-[11.5px] leading-5 text-[#6B7078] dark:text-[#A6ABB4]">{de ? "Wenn dein Free-Lead ein Angebot annimmt, legt Leadbase das Projekt trotzdem automatisch an. Zum Öffnen und Verwalten brauchst du Starter." : "When your Free lead accepts a proposal, Leadbase still creates the project automatically. Starter is required to open and manage it."}</p>
              <button type="button" onClick={() => { setOpen(false); window.location.href = "/profile?dialog=plan"; }} className="mt-4 inline-flex h-[34px] items-center rounded-[10px] bg-[#002BBA] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#00229A]">
                {de ? "Auf Starter upgraden" : "Upgrade to Starter"}
              </button>
            </div>
          </div>
        ) : (
        <form
          action={createProject}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {returnTo ? (
            <input
              type="hidden"
              name="returnTo"
              value={returnTo}
            />
          ) : null}

          {sourceProposalId ? (
            <input
              type="hidden"
              name="sourceProposalId"
              value={sourceProposalId}
            />
          ) : null}

          <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto [scrollbar-gutter:stable] px-[18px] py-4">
            <ProjectFields
              language={language}
              project={defaults}
              prefix="qc"
            />

            <ProjectCreateMediaFields
              language={language}
            />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/[0.07] bg-[#FDFDFE] px-[18px] py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <CancelButton
              onClick={() =>
                setOpen(
                  false
                )
              }
              label={de ? "Abbrechen" : "Cancel"}
            />

            <ModalSubmitButton
              pending={de ? "Wird hinzugefügt …" : "Adding …"}
            >
              {de
                ? "Projekt hinzufügen"
                : "Add project"}
            </ModalSubmitButton>
          </div>
        </form>
        )}
      </ModalShell>
    </>
  );
}
