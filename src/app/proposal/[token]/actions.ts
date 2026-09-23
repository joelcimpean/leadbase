"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  headers,
} from "next/headers";

import {
  redirect,
} from "next/navigation";

import {
  sendGmailMessageWithAttachments,
} from "@/lib/gmail-send";

import {
  createPersistentNotification,
} from "@/lib/persistent-notifications";

import {
  buildProposalPdfFromPublicProposal,
  proposalPdfFilename,
} from "@/lib/proposal-pdf";

import {
  ensureProjectFromAcceptedProposal,
} from "@/lib/proposal-project";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  normalizeProposalSections,
} from "@/lib/proposal-sections";

const GMAIL_SEND_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

function acceptanceStatement(
  language: "de" | "en"
) {
  return language === "de"
    ? "Ich akzeptiere dieses Angebot verbindlich."
    : "I accept this proposal as binding.";
}

function text(
  formData: FormData,
  key: string
) {
  const value =
    formData.get(key);

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}


function normalizeAcceptanceName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("de-DE");
}

function cleanError(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message
      .replace(/[\r\n]+/g, " ")
      .slice(0, 500);
  }

  return "Unknown error";
}

function scopeItems(
  value: unknown
) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0
      )
    : [];
}

function requestOrigin(requestHeaders: { get(name: string): string | null }) {
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}`;
}

function publicPath(
  token: string,
  query: string
) {
  return `/proposal/${encodeURIComponent(
    token
  )}?${query}`;
}

export async function acceptProposal(
  formData: FormData
) {
  const token =
    text(
      formData,
      "token"
    );

  if (!token) {
    redirect("/");
  }

  const acceptedByName =
    text(
      formData,
      "acceptedByName"
    );

  const acceptanceConfirmed =
    text(
      formData,
      "acceptanceConfirmed"
    ) === "yes";

  if (
    acceptedByName.length < 2 ||
    !acceptanceConfirmed
  ) {
    redirect(
      publicPath(
        token,
        "error=acceptance-confirmation-required"
      )
    );
  }

  const requestHeaders =
    await headers();

  const acceptedUserAgent =
    requestHeaders
      .get("user-agent")
      ?.slice(0, 500) ??
    null;

  const admin =
    createAdminClient();

  const {
    data: proposal,
    error: proposalError,
  } =
    await admin
      .from("proposals")
      .select(`
        id,
        user_id,
        lead_id,
        public_token,
        status,
        revision,
        title,
        proposal_number,
        client_name,
        contact_name,
        contact_email,
        website_url,
        intro_text,
        scope,
        timeline_text,
        price,
        currency,
        valid_until,
        notes,
        custom_sections,
        accent_color,
        logo_url,
        first_time_client,
        language,
        created_at,
        accepted_at,
        accepted_by_name,
        pdf_emailed_at
      `)
      .eq("public_token", token)
      .maybeSingle();

  if (
    proposalError ||
    !proposal
  ) {
    redirect(
      publicPath(
        token,
        "error=not-found"
      )
    );
  }

  const proposalLanguage:
    "de" | "en" =
      proposal.language === "en"
        ? "en"
        : "de";

  const expectedAcceptanceName =
    proposal.contact_name?.trim() ||
    proposal.client_name.trim();

  if (
    !expectedAcceptanceName ||
    normalizeAcceptanceName(acceptedByName) !==
      normalizeAcceptanceName(expectedAcceptanceName)
  ) {
    redirect(
      publicPath(
        token,
        "error=acceptance-name-mismatch"
      )
    );
  }

  const isGermanProposal =
    proposalLanguage === "de";

  const acceptedStatement =
    acceptanceStatement(
      proposalLanguage
    );

  if (
    proposal.status ===
    "DECLINED"
  ) {
    redirect(
      publicPath(
        token,
        "error=already-declined"
      )
    );
  }

  const acceptedAt =
    proposal.accepted_at ??
    new Date().toISOString();

  if (
    proposal.status !==
    "ACCEPTED"
  ) {
    const {
      error: acceptError,
    } =
      await admin
        .from("proposals")
        .update({
          status:
            "ACCEPTED",
          responded_at:
            acceptedAt,
          accepted_at:
            acceptedAt,
          accepted_by_name:
            acceptedByName,
          acceptance_statement:
            acceptedStatement,
          accepted_user_agent:
            acceptedUserAgent,
          declined_at:
            null,
          pdf_email_error:
            null,
          updated_at:
            acceptedAt,
        })
        .eq("id", proposal.id);

    if (acceptError) {
      console.error(
        "Could not accept proposal:",
        acceptError
      );

      redirect(
        publicPath(
          token,
          "error=accept-failed"
        )
      );
    }
  }

  const effectiveAcceptedByName =
    proposal.status === "ACCEPTED"
      ? proposal.accepted_by_name ??
        acceptedByName
      : acceptedByName;

  const projectResult =
    await ensureProjectFromAcceptedProposal({
      proposalId: proposal.id,
      userId: proposal.user_id,
      leadId: proposal.lead_id,
      clientName: proposal.client_name,
      title: proposal.title,
      websiteUrl: proposal.website_url,
      price: Number(proposal.price ?? 0),
      currency: proposal.currency ?? "EUR",
      notes: proposal.notes,
      acceptedAt,
    });

  if (projectResult.error) {
    await createPersistentNotification({
      userId: proposal.user_id,
      kind: "INFO",
      title: `Projekt konnte nicht automatisch angelegt werden · ${proposal.client_name}`,
      description: `Das Angebot wurde angenommen, aber das Projekt konnte nicht automatisch erstellt werden. ${projectResult.error}`,
      href: `/leads/${proposal.lead_id}/proposal`,
      entityType: "proposal",
      entityId: proposal.id,
      dedupeKey: `proposal:${proposal.id}:r${proposal.revision ?? 1}:project-create-failed`,
      metadata: {
        proposalId: proposal.id,
        leadId: proposal.lead_id,
      },
    });
  }

  await createPersistentNotification({
    userId:
      proposal.user_id,
    kind:
      "PROPOSAL_ACCEPTED",
    title:
      `Angebot angenommen · ${proposal.client_name}${(proposal.revision ?? 1) > 1 ? ` · V${proposal.revision}` : ""}`,
    description:
      `${effectiveAcceptedByName} hat das Angebot „${proposal.title}“${(proposal.revision ?? 1) > 1 ? ` in Version ${proposal.revision}` : ""} verbindlich angenommen.${projectResult.projectId ? " Leadbase hat automatisch ein geplantes Projekt angelegt und den Lead auf Gewonnen gesetzt." : projectResult.upgradeRequired ? " Der Lead wurde auf Gewonnen gesetzt. Ein Projekt wird im Free-Plan nicht automatisch angelegt; dafür ist Starter oder höher erforderlich." : ""}`,
    href:
      `/leads/${proposal.lead_id}/proposal`,
    entityType:
      "proposal",
    entityId:
      proposal.id,
    dedupeKey:
      `proposal:${proposal.id}:r${proposal.revision ?? 1}:accepted`,
    metadata: {
      proposalId:
        proposal.id,
      leadId:
        proposal.lead_id,
      publicToken:
        proposal.public_token,
    },
  });

  if (
    proposal.pdf_emailed_at
  ) {
    revalidatePath(
      `/proposal/${token}`
    );

    redirect(
      publicPath(
        token,
        "accepted=1"
      )
    );
  }

  let emailError:
    | string
    | null =
      null;

  try {
    if (
      !proposal.contact_email
        ?.trim()
    ) {
      throw new Error(
        "No client email is stored for this proposal."
      );
    }

    const {
      data: gmailConnection,
      error:
        gmailConnectionError,
    } =
      await admin
        .from(
          "gmail_connections"
        )
        .select(`
          email_address,
          encrypted_refresh_token,
          scopes
        `)
        .eq(
          "user_id",
          proposal.user_id
        )
        .maybeSingle();

    if (
      gmailConnectionError ||
      !gmailConnection
    ) {
      throw new Error(
        "Gmail is not connected."
      );
    }

    const scopes =
      Array.isArray(
        gmailConnection.scopes
      )
        ? gmailConnection.scopes
        : [];

    if (
      !scopes.includes(
        GMAIL_SEND_SCOPE
      )
    ) {
      throw new Error(
        "Gmail connection has no send permission."
      );
    }

    const pdf =
      await buildProposalPdfFromPublicProposal({
        origin: requestOrigin(requestHeaders),
        token,
        language: proposalLanguage,
      });

    const greeting =
      proposal.contact_name
        ? isGermanProposal
          ? `Guten Tag ${proposal.contact_name},`
          : `Hello ${proposal.contact_name},`
        : isGermanProposal
          ? "Guten Tag,"
          : "Hello,";

    const body =
      isGermanProposal
        ? [
            greeting,
            "",
            `vielen Dank für die verbindliche Annahme des Angebots „${proposal.title}“ durch ${effectiveAcceptedByName}.`,
            "",
            "Im Anhang finden Sie die bestätigte Angebots-PDF für Ihre Unterlagen.",
            "",
            "Ich melde mich separat mit den nächsten Schritten zum Projektstart.",
            "",
            "Mit freundlichen Grüßen,",
            "",
            "Joel Cimpean",
            "hello@joelcimpean.com / joelcimpean.com",
          ].join("\n")
        : [
            greeting,
            "",
            `thank you for accepting the proposal “${proposal.title}” as ${effectiveAcceptedByName}.`,
            "",
            "The confirmed proposal PDF is attached for your records.",
            "",
            "I will follow up separately with the next steps for the project start.",
            "",
            "Kind regards,",
            "",
            "Joel Cimpean",
            "hello@joelcimpean.com / joelcimpean.com",
          ].join("\n");

    await sendGmailMessageWithAttachments({
      fromEmail:
        gmailConnection.email_address,
      toEmail:
        proposal.contact_email,
      subject:
        isGermanProposal
          ? `Bestätigung Ihres Angebots – ${proposal.client_name}`
          : `Proposal confirmation – ${proposal.client_name}`,
      body,
      attachments: [
        {
          filename:
            proposalPdfFilename(
              proposal.client_name,
              proposalLanguage
            ),
          contentType:
            "application/pdf",
          content:
            pdf,
        },
      ],
      encryptedRefreshToken:
        gmailConnection.encrypted_refresh_token,
    });

    const {
      error: emailStatusError,
    } =
      await admin
        .from("proposals")
        .update({
          pdf_emailed_at:
            new Date().toISOString(),
          pdf_email_error:
            null,
        })
        .eq("id", proposal.id);

    if (emailStatusError) {
      console.error(
        "Could not mark proposal PDF as emailed:",
        emailStatusError
      );
    }
  } catch (error) {
    emailError =
      cleanError(error);

    console.error(
      "Proposal acceptance PDF email failed:",
      error
    );

    await admin
      .from("proposals")
      .update({
        pdf_email_error:
          emailError,
      })
      .eq("id", proposal.id);

    await createPersistentNotification({
      userId:
        proposal.user_id,
      kind:
        "PROPOSAL_PDF_FAILED",
      title:
        `PDF-Mail fehlgeschlagen · ${proposal.client_name}`,
      description:
        `Das Angebot wurde angenommen, aber die Bestätigungs-PDF konnte nicht automatisch per E-Mail gesendet werden.${emailError ? ` ${emailError}` : ""}`,
      href:
        `/leads/${proposal.lead_id}/proposal`,
      entityType:
        "proposal",
      entityId:
        proposal.id,
      dedupeKey:
        `proposal:${proposal.id}:r${proposal.revision ?? 1}:pdf-email-failed`,
      metadata: {
        proposalId:
          proposal.id,
        leadId:
          proposal.lead_id,
      },
    });
  }

  revalidatePath(
    `/proposal/${token}`
  );

  revalidatePath(
    `/leads/${proposal.lead_id}`
  );

  revalidatePath(
    `/leads/${proposal.lead_id}/proposal`
  );

  redirect(
    publicPath(
      token,
      emailError
        ? "accepted=1&pdfEmail=failed"
        : "accepted=1&pdfEmail=sent"
    )
  );
}

export async function declineProposal(
  formData: FormData
) {
  const token =
    text(
      formData,
      "token"
    );

  if (!token) {
    redirect("/");
  }

  const admin =
    createAdminClient();

  const {
    data: proposal,
    error,
  } =
    await admin
      .from("proposals")
      .select(`
        id,
        user_id,
        lead_id,
        public_token,
        status,
        revision,
        title,
        client_name
      `)
      .eq("public_token", token)
      .maybeSingle();

  if (
    error ||
    !proposal
  ) {
    redirect(
      publicPath(
        token,
        "error=not-found"
      )
    );
  }

  if (
    proposal.status ===
    "ACCEPTED"
  ) {
    redirect(
      publicPath(
        token,
        "error=already-accepted"
      )
    );
  }

  const now =
    new Date().toISOString();

  const {
    error: updateError,
  } =
    await admin
      .from("proposals")
      .update({
        status:
          "DECLINED",
        responded_at:
          now,
        declined_at:
          now,
        accepted_at:
          null,
        updated_at:
          now,
      })
      .eq("id", proposal.id);

  if (updateError) {
    console.error(
      "Could not decline proposal:",
      updateError
    );

    redirect(
      publicPath(
        token,
        "error=decline-failed"
      )
    );
  }

  await createPersistentNotification({
    userId:
      proposal.user_id,
    kind:
      "PROPOSAL_DECLINED",
    title:
      `Angebot abgelehnt · ${proposal.client_name}${(proposal.revision ?? 1) > 1 ? ` · V${proposal.revision}` : ""}`,
    description:
      `Der Kunde hat das Angebot „${proposal.title}“${(proposal.revision ?? 1) > 1 ? ` in Version ${proposal.revision}` : ""} abgelehnt. Öffne den Lead, um den nächsten Schritt zu planen.`,
    href:
      `/leads/${proposal.lead_id}/proposal`,
    entityType:
      "proposal",
    entityId:
      proposal.id,
    dedupeKey:
      `proposal:${proposal.id}:r${proposal.revision ?? 1}:declined`,
    metadata: {
      proposalId:
        proposal.id,
      leadId:
        proposal.lead_id,
      publicToken:
        proposal.public_token,
    },
  });

  revalidatePath(
    `/proposal/${token}`
  );

  revalidatePath(
    `/leads/${proposal.lead_id}`
  );

  revalidatePath(
    `/leads/${proposal.lead_id}/proposal`
  );

  redirect(
    publicPath(
      token,
      "declined=1"
    )
  );
}
