import { NextResponse } from "next/server";

import {
  buildProposalPdfFromPublicProposal,
  proposalPdfFilename,
} from "@/lib/proposal-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const admin = createAdminClient();

  const { data: proposal, error } = await admin
    .from("proposals")
    .select("public_token, status, client_name, language")
    .eq("public_token", token)
    .maybeSingle();

  if (error || !proposal) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  try {
    const pdf = await buildProposalPdfFromPublicProposal({
      origin: new URL(request.url).origin,
      token,
      language: proposal.language === "en" ? "en" : "de",
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${proposalPdfFilename(
          proposal.client_name,
          proposal.language === "en" ? "en" : "de",
        )}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (pdfError) {
    console.error("Could not generate proposal PDF from selected template:", pdfError);
    return NextResponse.json(
      { error: "Could not generate PDF." },
      { status: 500 },
    );
  }
}
