import {
  NextResponse,
} from "next/server";

import {
  buildProposalPdf,
  proposalPdfFilename,
} from "@/lib/proposal-pdf";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  normalizeProposalSections,
} from "@/lib/proposal-sections";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

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

export async function GET(
  _request: Request,
  context: RouteContext
) {
  const { token } =
    await context.params;

  const admin =
    createAdminClient();

  const {
    data: proposal,
    error,
  } =
    await admin
      .from("proposals")
      .select(`
        public_token,
        status,
        title,
        client_name,
        contact_name,
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
        created_at,
        accepted_at,
        accepted_by_name,
        acceptance_statement
      `)
      .eq("public_token", token)
      .maybeSingle();

  if (
    error ||
    !proposal ||
    proposal.status !==
      "ACCEPTED"
  ) {
    return NextResponse.json(
      {
        error:
          "Accepted proposal not found.",
      },
      {
        status: 404,
      }
    );
  }

  try {
    const pdf =
      await buildProposalPdf({
        title:
          proposal.title,
        clientName:
          proposal.client_name,
        contactName:
          proposal.contact_name,
        websiteUrl:
          proposal.website_url,
        introText:
          proposal.intro_text,
        scope:
          scopeItems(
            proposal.scope
          ),
        timelineText:
          proposal.timeline_text,
        price:
          Number(
            proposal.price ?? 0
          ),
        currency:
          proposal.currency ??
          "EUR",
        validUntil:
          proposal.valid_until,
        notes:
          proposal.notes,
        customSections:
          normalizeProposalSections(
            proposal.custom_sections
          ),
        accentColor:
          proposal.accent_color,
        logoUrl:
          proposal.logo_url,
        firstTimeClient:
          proposal.first_time_client !==
          false,
        issuedAt:
          proposal.created_at,
        acceptedAt:
          proposal.accepted_at,
        acceptedByName:
          proposal.accepted_by_name,
        acceptanceStatement:
          proposal.acceptance_statement,
        publicToken:
          proposal.public_token,
      });

    return new NextResponse(
      new Uint8Array(pdf),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            `attachment; filename="${proposalPdfFilename(
              proposal.client_name
            )}"`,
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (pdfError) {
    console.error(
      "Could not generate proposal PDF:",
      pdfError
    );

    return NextResponse.json(
      {
        error:
          "Could not generate PDF.",
      },
      {
        status: 500,
      }
    );
  }
}
