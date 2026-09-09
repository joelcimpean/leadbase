"use client";

import {
  useState,
} from "react";

import {
  Pencil,
  Save,
} from "lucide-react";

import {
  updateLeadDetails,
} from "@/app/(app)/leads/actions";

import {
  PendingSubmitButton,
} from "@/components/pending-submit-button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

import type {
  AppLanguage,
} from "@/lib/i18n";

export type LeadEditDialogCampaign = {
  id: string;
  name: string;
  status: string | null;
};

export type LeadEditDialogValue = {
  id: string;
  campaignId: string | null;
  priority: string | null;
  estimatedProjectValue: number | null;
  notes: string | null;

  company: {
    name: string;
    websiteUrl: string | null;
    industry: string | null;
    location: string | null;
    phone: string | null;
    description: string | null;
    contactFormUrl: string | null;
    linkedinUrl: string | null;
    instagramUrl: string | null;
  };

  contact: {
    fullName: string | null;
    jobTitle: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
  } | null;
};

export function LeadEditDialog({
  language,
  lead,
  campaigns,
  variant = "header",
}: {
  language: AppLanguage;
  lead: LeadEditDialogValue;
  campaigns: LeadEditDialogCampaign[];
  variant?: "header" | "text";
}) {
  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const de =
    language ===
    "de";

  const copy =
    de
      ? {
          eyebrow:
            "CRM · LEAD",
          title:
            "Lead bearbeiten",
          description:
            "Unternehmens-, Kontakt- und Opportunity-Daten bearbeiten, ohne den Lead-Workspace zu verlassen.",
          company:
            "Unternehmen",
          companyDescription:
            "Stammdaten und öffentliche Unternehmensinformationen.",
          contact:
            "Hauptkontakt",
          contactDescription:
            "Ansprechpartner und Kontaktdaten.",
          opportunity:
            "Opportunity",
          opportunityDescription:
            "Kampagne, Priorität, Wert und interne Notizen.",
          companyName:
            "Unternehmensname",
          website:
            "Website",
          industry:
            "Branche",
          location:
            "Standort",
          companyPhone:
            "Firmentelefon",
          contactForm:
            "Kontaktformular",
          companyDescriptionLabel:
            "Unternehmensbeschreibung",
          contactPerson:
            "Ansprechpartner",
          jobTitle:
            "Position",
          email:
            "E-Mail",
          phone:
            "Telefon",
          campaign:
            "Kampagne",
          noCampaign:
            "Keine Kampagne",
          priority:
            "Priorität",
          noPriority:
            "Keine Priorität",
          low:
            "Niedrig",
          medium:
            "Mittel",
          high:
            "Hoch",
          estimated:
            "Geschätzter Projektwert",
          notes:
            "Notizen",
          cancel:
            "Abbrechen",
          save:
            "Änderungen speichern",
          saving:
            "Speichert …",
          edit:
            "Bearbeiten",
        }
      : {
          eyebrow:
            "CRM · LEAD",
          title:
            "Edit lead",
          description:
            "Update company, contact and opportunity data without leaving the lead workspace.",
          company:
            "Company",
          companyDescription:
            "Core company and public business information.",
          contact:
            "Primary contact",
          contactDescription:
            "Decision-maker and contact details.",
          opportunity:
            "Opportunity",
          opportunityDescription:
            "Campaign, priority, value and internal notes.",
          companyName:
            "Company name",
          website:
            "Website",
          industry:
            "Industry",
          location:
            "Location",
          companyPhone:
            "Company phone",
          contactForm:
            "Contact form",
          companyDescriptionLabel:
            "Company description",
          contactPerson:
            "Contact person",
          jobTitle:
            "Job title",
          email:
            "Email",
          phone:
            "Phone",
          campaign:
            "Campaign",
          noCampaign:
            "No campaign",
          priority:
            "Priority",
          noPriority:
            "No priority",
          low:
            "Low",
          medium:
            "Medium",
          high:
            "High",
          estimated:
            "Estimated project value",
          notes:
            "Notes",
          cancel:
            "Cancel",
          save:
            "Save changes",
          saving:
            "Saving …",
          edit:
            "Edit",
        };

  return (
    <>
      {variant ===
      "text" ? (
        <button
          type="button"
          onClick={() =>
            setOpen(
              true
            )
          }
          className="text-[11px] font-medium text-[#002BBA] transition-colors hover:text-[#001E85]"
        >
          {
            copy.edit
          }
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            setOpen(
              true
            )
          }
          className="flex h-[34px] items-center gap-[7px] rounded-[10px] border border-black/[0.09] bg-white px-3 text-[13px] text-[#40454E] transition-colors hover:border-black/[0.16] hover:bg-[#FDFDFE] dark:border-white/10 dark:bg-[#111216] dark:text-[#D7D9DE]"
        >
          <Pencil className="size-3.5 opacity-60" />
          {
            copy.edit
          }
        </button>
      )}

      <Dialog
        open={
          open
        }
        onOpenChange={
          setOpen
        }
      >
        <DialogContent
          className="flex max-h-[min(860px,calc(100dvh-28px))] w-[min(920px,calc(100vw-28px))] max-w-none flex-col gap-0 overflow-hidden p-0"
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b border-black/[0.07] px-[18px] py-4 dark:border-white/[0.08]">
            <div className="font-mono text-[9px] uppercase tracking-[0.11em] text-[#002BBA]">
              {
                copy.eyebrow
              }
            </div>

            <DialogTitle className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">
              {
                copy.title
              }
            </DialogTitle>

            <DialogDescription className="max-w-[650px]">
              {
                copy.description
              }
            </DialogDescription>
          </DialogHeader>

          <form
            action={
              updateLeadDetails
            }
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <input
              type="hidden"
              name="leadId"
              value={
                lead.id
              }
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-4 [scrollbar-gutter:stable]">
              <EditSection
                title={
                  copy.company
                }
                description={
                  copy.companyDescription
                }
              >
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field
                    name="companyName"
                    label={`${copy.companyName} *`}
                    defaultValue={
                      lead.company.name
                    }
                    required
                  />

                  <Field
                    name="websiteUrl"
                    label={
                      copy.website
                    }
                    defaultValue={
                      lead.company.websiteUrl
                    }
                  />

                  <Field
                    name="industry"
                    label={
                      copy.industry
                    }
                    defaultValue={
                      lead.company.industry
                    }
                  />

                  <Field
                    name="location"
                    label={
                      copy.location
                    }
                    defaultValue={
                      lead.company.location
                    }
                  />

                  <Field
                    name="companyPhone"
                    label={
                      copy.companyPhone
                    }
                    defaultValue={
                      lead.company.phone
                    }
                  />

                  <Field
                    name="contactFormUrl"
                    label={
                      copy.contactForm
                    }
                    defaultValue={
                      lead.company.contactFormUrl
                    }
                  />

                  <Field
                    name="companyLinkedinUrl"
                    label="LinkedIn"
                    defaultValue={
                      lead.company.linkedinUrl
                    }
                  />

                  <Field
                    name="instagramUrl"
                    label="Instagram"
                    defaultValue={
                      lead.company.instagramUrl
                    }
                  />
                </div>

                <div className="mt-3.5">
                  <FieldLabel>
                    {
                      copy.companyDescriptionLabel
                    }
                  </FieldLabel>

                  <Textarea
                    name="description"
                    defaultValue={
                      lead.company.description ??
                      ""
                    }
                    className="mt-1.5 min-h-[88px] resize-y rounded-[9px] border-black/[0.09] bg-[#F7F8FA] text-[12.5px] dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </div>
              </EditSection>

              <EditSection
                title={
                  copy.contact
                }
                description={
                  copy.contactDescription
                }
              >
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field
                    name="contactPerson"
                    label={
                      copy.contactPerson
                    }
                    defaultValue={
                      lead.contact?.fullName
                    }
                  />

                  <Field
                    name="jobTitle"
                    label={
                      copy.jobTitle
                    }
                    defaultValue={
                      lead.contact?.jobTitle
                    }
                  />

                  <Field
                    name="email"
                    type="email"
                    label={
                      copy.email
                    }
                    defaultValue={
                      lead.contact?.email
                    }
                  />

                  <Field
                    name="contactPhone"
                    label={
                      copy.phone
                    }
                    defaultValue={
                      lead.contact?.phone
                    }
                  />

                  <Field
                    name="contactLinkedinUrl"
                    label="LinkedIn"
                    defaultValue={
                      lead.contact?.linkedinUrl
                    }
                  />
                </div>
              </EditSection>

              <EditSection
                title={
                  copy.opportunity
                }
                description={
                  copy.opportunityDescription
                }
              >
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <FieldLabel>
                      {
                        copy.campaign
                      }
                    </FieldLabel>

                    <select
                      name="campaignId"
                      defaultValue={
                        lead.campaignId ??
                        ""
                      }
                      className="mt-1.5 h-9 w-full rounded-[9px] border border-black/[0.09] bg-[#F7F8FA] px-3 text-[12.5px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <option value="">
                        {
                          copy.noCampaign
                        }
                      </option>

                      {campaigns.map(
                        (
                          campaign
                        ) => (
                          <option
                            key={
                              campaign.id
                            }
                            value={
                              campaign.id
                            }
                          >
                            {
                              campaign.name
                            }
                            {campaign.status &&
                            campaign.status !==
                              "ACTIVE"
                              ? ` · ${campaign.status}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <FieldLabel>
                      {
                        copy.priority
                      }
                    </FieldLabel>

                    <select
                      name="priority"
                      defaultValue={
                        lead.priority ??
                        ""
                      }
                      className="mt-1.5 h-9 w-full rounded-[9px] border border-black/[0.09] bg-[#F7F8FA] px-3 text-[12.5px] outline-none focus:border-[#002BBA] focus:ring-[3px] focus:ring-[#002BBA]/10 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <option value="">
                        {
                          copy.noPriority
                        }
                      </option>
                      <option value="LOW">
                        {
                          copy.low
                        }
                      </option>
                      <option value="MEDIUM">
                        {
                          copy.medium
                        }
                      </option>
                      <option value="HIGH">
                        {
                          copy.high
                        }
                      </option>
                    </select>
                  </div>

                  <Field
                    name="estimatedProjectValue"
                    type="number"
                    min="0"
                    step="1"
                    label={
                      copy.estimated
                    }
                    defaultValue={
                      lead.estimatedProjectValue !==
                      null
                        ? String(
                            lead.estimatedProjectValue
                          )
                        : ""
                    }
                  />
                </div>

                <div className="mt-3.5">
                  <FieldLabel>
                    {
                      copy.notes
                    }
                  </FieldLabel>

                  <Textarea
                    name="notes"
                    defaultValue={
                      lead.notes ??
                      ""
                    }
                    className="mt-1.5 min-h-[100px] resize-y rounded-[9px] border-black/[0.09] bg-[#F7F8FA] text-[12.5px] dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </div>
              </EditSection>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/[0.07] bg-white px-[18px] py-3 dark:border-white/[0.08] dark:bg-[#111216]">
              <button
                type="button"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                className="h-[34px] rounded-[9px] border border-black/[0.09] bg-white px-3.5 text-[12px] font-medium text-[#40454E] transition-colors hover:bg-[#F7F8FA] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#D7D9DE]"
              >
                {
                  copy.cancel
                }
              </button>

              <PendingSubmitButton
                pendingText={
                  copy.saving
                }
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-[#002BBA] px-3.5 text-[12px] font-medium text-white shadow-[0_1px_2px_rgba(0,43,186,0.30)] transition-colors hover:bg-[#00229A]"
              >
                <Save className="size-3.5" />
                {
                  copy.save
                }
              </PendingSubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="border-b border-black/[0.07] py-4 first:pt-0 last:border-b-0 last:pb-0 dark:border-white/[0.08]">
      <div>
        <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">
          {
            title
          }
        </h3>

        <p className="mt-0.5 text-[11px] leading-4.5 text-[#6B7078]">
          {
            description
          }
        </p>
      </div>

      <div className="mt-3.5">
        {
          children
        }
      </div>
    </section>
  );
}

function FieldLabel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <Label className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]">
      {
        children
      }
    </Label>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
  min,
  step,
}: {
  name: string;
  label: string;
  defaultValue?:
    | string
    | null;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <div className="min-w-0">
      <Label
        htmlFor={
          name
        }
        className="font-mono text-[9px] uppercase tracking-[0.09em] text-[#6B7078]"
      >
        {
          label
        }
      </Label>

      <Input
        id={
          name
        }
        name={
          name
        }
        type={
          type
        }
        min={
          min
        }
        step={
          step
        }
        required={
          required
        }
        defaultValue={
          defaultValue ??
          ""
        }
        className="mt-1.5 h-9 rounded-[9px] border-black/[0.09] bg-[#F7F8FA] text-[12.5px] dark:border-white/10 dark:bg-white/[0.04]"
      />
    </div>
  );
}
