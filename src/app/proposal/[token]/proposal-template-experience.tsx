"use client";

import { useTransition } from "react";

import { ProposalTemplateDocument } from "@/components/proposal-template-document";
import type { ProposalDesignTemplate } from "@/lib/proposal-design-templates";

import { acceptProposal, declineProposal } from "./actions";

type CustomSection = {
  id: string;
  title: string;
  content: string;
};

type Props = {
  template: ProposalDesignTemplate;
  token: string;
  title: string;
  clientName: string;
  contactName: string;
  contactEmail: string;
  website: string;
  introText: string;
  scope: string[];
  timelineText: string;
  priceLabel: string;
  validUntil: string;
  notes: string;
  customSections: CustomSection[];
  firstTimeClient: boolean;
  accentColor: string;
  logoUrl: string | null;
  isGerman: boolean;
  isAccepted: boolean;
  isDeclined: boolean;
  acceptedAt: string | null;
  acceptedByName: string | null;
  proposalNumber: string;
  revision: number;
  expectedAcceptanceName: string;
  issuedDate?: string;
};

export function ProposalTemplateExperience(props: Props) {
  const [, startTransition] = useTransition();

  function accept(acceptedByName: string) {
    const formData = new FormData();
    formData.set("token", props.token);
    formData.set("acceptedByName", acceptedByName);
    formData.set("acceptanceConfirmed", "yes");

    startTransition(() => {
      void acceptProposal(formData);
    });
  }

  function decline() {
    const formData = new FormData();
    formData.set("token", props.token);

    startTransition(() => {
      void declineProposal(formData);
    });
  }

  return (
    <ProposalTemplateDocument
      template={props.template}
      title={props.title}
      clientName={props.clientName}
      contactName={props.contactName}
      contactEmail={props.contactEmail}
      website={props.website}
      introText={props.introText}
      scope={props.scope}
      timelineText={props.timelineText}
      priceLabel={props.priceLabel}
      validUntil={props.validUntil}
      notes={props.notes}
      customSections={props.customSections}
      firstTimeClient={props.firstTimeClient}
      accentColor={props.accentColor}
      logoUrl={props.logoUrl}
      isGerman={props.isGerman}
      isAccepted={props.isAccepted}
      isDeclined={props.isDeclined}
      acceptedAt={props.acceptedAt}
      acceptedByName={props.acceptedByName}
      proposalNumber={props.proposalNumber}
      revision={props.revision}
      expectedAcceptanceName={props.expectedAcceptanceName}
      issuedDate={props.issuedDate}
      pdfUrl={`/proposal/${encodeURIComponent(props.token)}/pdf`}
      onAccept={accept}
      onDecline={decline}
    />
  );
}
