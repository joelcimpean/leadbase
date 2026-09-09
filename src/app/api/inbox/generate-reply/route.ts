import {
    NextResponse,
  } from "next/server";
  
  import {
    generateReply,
  } from "@/lib/reply-generation";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  import {
    assertAiUsageAvailable,
    recordAiUsage,
  } from "@/lib/ai-usage";
  
  export const runtime =
    "nodejs";
  
  export const dynamic =
    "force-dynamic";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type GenerateReplyRequest = {
    leadId?: unknown;
  
    replyToMessageId?: unknown;
  };
  
  /* =========================================================
     HELPERS
  ========================================================= */
  
  function jsonError(
    error: string,
    status = 400
  ) {
    return NextResponse.json(
      {
        ok:
          false,
  
        error,
      },
      {
        status,
      }
    );
  }
  
  function getSingleRelation<T>(
    value:
      | T
      | T[]
      | null
      | undefined
  ): T | null {
    if (
      Array.isArray(
        value
      )
    ) {
      return (
        value[0] ??
        null
      );
    }
  
    return (
      value ??
      null
    );
  }
  
  function safeJson(
    value: unknown,
    maxLength = 6000
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }
  
    try {
      const result =
        JSON.stringify(
          value,
          null,
          2
        );
  
      if (
        result.length <=
        maxLength
      ) {
        return result;
      }
  
      return `${result.slice(
        0,
        maxLength
      )}\n…`;
    } catch {
      return null;
    }
  }
  
  function trimMessage(
    value:
      | string
      | null
      | undefined
  ) {
    const result =
      value
        ?.trim() ??
      "";
  
    if (
      result.length <=
      4000
    ) {
      return result;
    }
  
    return `${result.slice(
      0,
      4000
    )}\n…`;
  }
  
  /* =========================================================
     POST
  ========================================================= */
  
  export async function POST(
    request: Request
  ) {
    try {
      /* =====================================================
         INPUT
      ===================================================== */
  
      let payload:
        GenerateReplyRequest;
  
      try {
        payload =
          await request.json();
      } catch {
        return jsonError(
          "Invalid JSON request."
        );
      }
  
      if (
        typeof payload.leadId !==
          "string" ||
        !payload.leadId ||
        typeof payload.replyToMessageId !==
          "string" ||
        !payload.replyToMessageId
      ) {
        return jsonError(
          "Invalid generation request."
        );
      }
  
      const leadId =
        payload.leadId;
  
      const replyToMessageId =
        payload.replyToMessageId;
  
      /* =====================================================
         AUTH
      ===================================================== */
  
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
        return jsonError(
          "Not authenticated.",
          401
        );
      }
  
      /* =====================================================
         VERIFY TARGET
      ===================================================== */
  
      const {
        data:
          replyTarget,
  
        error:
          replyTargetError,
      } =
        await supabase
          .from(
            "email_messages"
          )
          .select(`
            id,
            lead_id,
            direction
          `)
          .eq(
            "id",
            replyToMessageId
          )
          .eq(
            "lead_id",
            leadId
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "direction",
            "INCOMING"
          )
          .maybeSingle();
  
      if (
        replyTargetError
      ) {
        console.error(
          "Could not verify reply target:",
          replyTargetError
        );
  
        return jsonError(
          "Could not verify the customer message.",
          500
        );
      }
  
      if (
        !replyTarget
      ) {
        return jsonError(
          "The customer message could not be found.",
          404
        );
      }
  
      /* =====================================================
         LOAD LEAD
      ===================================================== */
  
      const {
        data:
          lead,
  
        error:
          leadError,
      } =
        await supabase
          .from(
            "leads"
          )
          .select(`
            id,
            research_summary,
            website_findings,
            website_score,
            opportunity_score,
            visual_score,
            redesign_potential,
            visual_analysis,
  
            company:companies (
              id,
              name,
              website_url,
              industry,
              location,
              description
            ),
  
            primary_contact:contacts (
              id,
              full_name,
              job_title,
              salutation,
              email
            )
          `)
          .eq(
            "id",
            leadId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();
  
      if (
        leadError
      ) {
        console.error(
          "Could not load lead for reply generation:",
          leadError
        );
  
        return jsonError(
          "Could not load the lead.",
          500
        );
      }
  
      if (
        !lead
      ) {
        return jsonError(
          "Lead not found.",
          404
        );
      }
  
      const company =
        getSingleRelation(
          lead.company
        );
  
      const contact =
        getSingleRelation(
          lead.primary_contact
        );
  
      if (
        !company
      ) {
        return jsonError(
          "Company data is missing."
        );
      }
  
      /* =====================================================
         LOAD LATEST OUTREACH
      ===================================================== */
  
      const {
        data:
          latestDraft,
  
        error:
          draftError,
      } =
        await supabase
          .from(
            "outreach_drafts"
          )
          .select(`
            id,
            subject,
            body,
            follow_up_body,
            sent_at
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "lead_id",
            leadId
          )
          .eq(
            "status",
            "SENT"
          )
          .order(
            "sent_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            1
          )
          .maybeSingle();
  
      if (
        draftError
      ) {
        console.error(
          "Could not load outreach context:",
          draftError
        );
      }
  
      /* =====================================================
         LOAD CONVERSATION
      ===================================================== */
  
      const {
        data:
          messages,
  
        error:
          messagesError,
      } =
        await supabase
          .from(
            "email_messages"
          )
          .select(`
            id,
            direction,
            from_name,
            from_email,
            to_email,
            subject,
            body_text,
            received_at
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "lead_id",
            leadId
          )
          .order(
            "received_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            16
          );
  
      if (
        messagesError
      ) {
        console.error(
          "Could not load conversation context:",
          messagesError
        );
  
        return jsonError(
          "Could not load the conversation.",
          500
        );
      }
  
      const chronological =
        [
          ...(
            messages ??
            []
          ),
        ].reverse();
  
      const conversation =
        chronological
          .map(
            (
              message
            ) => {
              const direction =
                message.direction ===
                "INCOMING"
                  ? "KUNDE"
                  : "JOEL";
  
              const sender =
                message.from_name ??
                message.from_email ??
                "";
  
              return [
                `${direction} — ${sender}`,
  
                message.subject
                  ? `Betreff: ${message.subject}`
                  : null,
  
                trimMessage(
                  message.body_text
                ),
              ]
                .filter(Boolean)
                .join(
                  "\n"
                );
            }
          )
          .join(
            "\n\n--------------------\n\n"
          );
  
      /* =====================================================
         WEBSITE CONTEXT
      ===================================================== */
  
      const websiteContext = [
        lead.website_score !==
        null
          ? `Website Score: ${lead.website_score}`
          : null,
  
        lead.opportunity_score !==
        null
          ? `Opportunity Score: ${lead.opportunity_score}`
          : null,
  
        lead.visual_score !==
        null
          ? `Visual Score: ${lead.visual_score}`
          : null,
  
        lead.redesign_potential !==
        null
          ? `Redesign Potential: ${lead.redesign_potential}`
          : null,
  
        safeJson(
          lead.website_findings,
          3500
        ),
  
        safeJson(
          lead.visual_analysis,
          3500
        ),
      ]
        .filter(Boolean)
        .join(
          "\n\n"
        );
  
      /* =====================================================
         GENERATE
      ===================================================== */
  
      await assertAiUsageAvailable(user.id);

      const generated =
        await generateReply({
          companyName:
            company.name,
  
          companyDescription:
            company.description,
  
          industry:
            company.industry,
  
          location:
            company.location,
  
          websiteUrl:
            company.website_url,
  
          contactName:
            contact?.full_name,
  
          contactJobTitle:
            contact?.job_title,
  
          contactSalutation:
            contact?.salutation,
  
          researchSummary:
            lead.research_summary,
  
          websiteContext,
  
          originalSubject:
            latestDraft?.subject,
  
          originalOutreach:
            latestDraft?.body,
  
          followUp:
            latestDraft?.follow_up_body,
  
          conversation,
        });
  
      /* =====================================================
         RESPONSE
      ===================================================== */
  
      await recordAiUsage({
        userId: user.id,
        feature: "reply_generation",
        model: generated.model,
        usage: generated.usage,
        metadata: {
          leadId: typeof leadId === "string" ? leadId : null,
          replyToMessageId: typeof replyToMessageId === "string" ? replyToMessageId : null,
        },
      });

      return NextResponse.json({
        ok:
          true,
  
        body:
          generated.body,
  
        model:
          generated.model,
  
        usage:
          generated.usage,
      });
    } catch (error) {
      console.error(
        "Generate reply endpoint failed:",
        error
      );
  
      return jsonError(
        error instanceof Error
          ? error.message
          : "Reply generation failed.",
        500
      );
    }
  }