import {
    cookies,
  } from "next/headers";
  
  import {
    NextResponse,
  } from "next/server";
  
  import OpenAI from "openai";
  
  import {
    getStoredMaxiBestOfAccessToken,
    MAXIBESTOF_MCP_URL,
  } from "@/lib/maxibestof-oauth";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  /* =========================================================
     GET
  ========================================================= */
  
  export async function GET(
    request: Request
  ) {
    /* =======================================================
       LEADBASE AUTH
    ======================================================= */
  
    const supabase =
      await createClient();
  
    const {
      data: {
        user,
      },
  
      error:
        userError,
    } =
      await supabase.auth.getUser();
  
    if (
      userError ||
      !user
    ) {
      return NextResponse.redirect(
        new URL(
          "/login",
          request.url
        )
      );
    }
  
    /* =======================================================
       MAXIBESTOF TOKEN
    ======================================================= */
  
    const cookieStore =
      await cookies();
  
    const accessToken =
      getStoredMaxiBestOfAccessToken(
        cookieStore
      );
  
    if (
      !accessToken
    ) {
      return NextResponse.redirect(
        new URL(
          "/api/integrations/maxibestof/connect",
          request.url
        )
      );
    }
  
    /* =======================================================
       OPENAI
    ======================================================= */
  
    const apiKey =
      process.env
        .OPENAI_API_KEY;
  
    if (
      !apiKey
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "OPENAI_API_KEY is missing.",
        },
        {
          status:
            500,
        }
      );
    }
  
    const openai =
      new OpenAI({
        apiKey,
      });
  
    /* =======================================================
       REAL MCP TEST
    ======================================================= */
  
    try {
      const response =
        await openai.responses.create({
          model:
            process.env
              .OPENAI_REDESIGN_MODEL ??
            "gpt-5.6-terra",
  
          reasoning: {
            effort:
              "low",
          },
  
          tools: [
            {
              type:
                "mcp",
  
              server_label:
                "maxibestof",
  
              server_description:
                "Official MaxiBestOf design research library containing curated real websites, typography references, color palettes and UI section inspiration.",
  
              server_url:
                MAXIBESTOF_MCP_URL,
  
              authorization:
                accessToken,
  
              /*
               * MaxiBestOf is being used only for
               * design research in this private app.
               */
              require_approval:
                "never",
            },
          ],
  
          input: `
  You are testing the MaxiBestOf design research connection inside Leadbase.
  
  You MUST use the MaxiBestOf MCP tools.
  
  Research a redesign direction for a German carpentry / roofing / timber-construction company.
  
  Find useful real design inspiration for:
  
  - 3 strong website references
  - homepage hero composition
  - typography / font pairing
  - restrained premium color direction
  - services section
  - project / image showcase
  - process section
  - CTA
  - tasteful motion ideas
  
  The company is a traditional local craftsmanship business.
  
  Avoid:
  - SaaS design
  - generic AI landing pages
  - purple gradients
  - excessive glassmorphism
  
  Do not invent MaxiBestOf references.
  
  Keep the final answer reasonably concise.
          `.trim(),
        });
  
      return NextResponse.json({
        ok:
          true,
  
        message:
          "Leadbase successfully used MaxiBestOf through the OpenAI MCP tool.",
  
        research:
          response.output_text,
  
        responseId:
          response.id,
      });
    } catch (
      error
    ) {
      console.error(
        "Leadbase MaxiBestOf MCP test failed:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            error instanceof
              Error
              ? error.message
              : "MaxiBestOf MCP test failed.",
        },
        {
          status:
            500,
        }
      );
    }
  }