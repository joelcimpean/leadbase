import {
  NextResponse,
} from "next/server";

import {
  generateCallPrep,
  type CallPrepLanguage,
} from "@/lib/call-prep";

import {
  createClient,
} from "@/lib/supabase/server";

import { assertAiUsageAvailable, recordAiUsage } from "@/lib/ai-usage";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params:
    Promise<{
      id:
        string;
    }>;
};

type RequestBody = {
  language?:
    unknown;
};

type SavedCallPrep = {
  summary:
    string;

  currentSituation:
    string;

  talkingPoints:
    string[];

  discoveryQuestions:
    string[];

  likelyObjections: Array<{
    objection:
      string;

    response:
      string;
  }>;

  cautionNotes:
    string[];

  nextStep:
    string;
};

type SavedCallPrepContext = {
  companyName:
    string;

  contactName:
    string | null;

  contactJobTitle:
    string | null;

  websiteUrl:
    string | null;

  leadStatus:
    string | null;

  latestReplyClassification:
    string | null;

  latestReplyReason:
    string | null;

  preview: {
    externalSessions:
      number;

    engagedSessions:
      number;

    maxDurationSeconds:
      number;

    maxScrollPercent:
      number;

    latestSeenAt:
      string | null;
  };
};

type SavedCallPrepSnapshot = {
  version:
    1;

  language:
    CallPrepLanguage;

  prep:
    SavedCallPrep;

  context:
    SavedCallPrepContext;
};

/* =========================================================
   HELPERS
========================================================= */

function jsonError(
  error:
    string,
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
  value:
    unknown,
  maxLength = 4500
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  try {
    const text =
      JSON.stringify(
        value,
        null,
        2
      );

    if (
      text.length <=
      maxLength
    ) {
      return text;
    }

    return `${text.slice(
      0,
      maxLength
    )}\n…`;
  } catch {
    return null;
  }
}

function trimText(
  value:
    | string
    | null
    | undefined,
  maxLength = 3200
) {
  const clean =
    value?.trim() ??
    "";

  if (
    clean.length <=
    maxLength
  ) {
    return clean;
  }

  return `${clean.slice(
    0,
    maxLength
  )}\n…`;
}

function isRecord(
  value:
    unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
}

function readSavedSnapshot(
  value:
    unknown
): SavedCallPrepSnapshot | null {
  if (
    !isRecord(
      value
    ) ||
    value.version !== 1 ||
    (value.language !== "de" &&
      value.language !== "en") ||
    !isRecord(
      value.prep
    ) ||
    !isRecord(
      value.context
    )
  ) {
    return null;
  }

  const prep =
    value.prep;

  const context =
    value.context;

  if (
    typeof prep.summary !==
      "string" ||
    typeof prep.currentSituation !==
      "string" ||
    !Array.isArray(
      prep.talkingPoints
    ) ||
    !prep.talkingPoints.every(
      (item) =>
        typeof item ===
        "string"
    ) ||
    !Array.isArray(
      prep.discoveryQuestions
    ) ||
    !prep.discoveryQuestions.every(
      (item) =>
        typeof item ===
        "string"
    ) ||
    !Array.isArray(
      prep.likelyObjections
    ) ||
    !prep.likelyObjections.every(
      (item) =>
        isRecord(
          item
        ) &&
        typeof item.objection ===
          "string" &&
        typeof item.response ===
          "string"
    ) ||
    !Array.isArray(
      prep.cautionNotes
    ) ||
    !prep.cautionNotes.every(
      (item) =>
        typeof item ===
        "string"
    ) ||
    typeof prep.nextStep !==
      "string"
  ) {
    return null;
  }

  if (
    typeof context.companyName !==
      "string" ||
    !isRecord(
      context.preview
    )
  ) {
    return null;
  }

  return value as SavedCallPrepSnapshot;
}

function formatConversation(
  messages:
    Array<{
      direction:
        string | null;
      from_name:
        string | null;
      from_email:
        string | null;
      subject:
        string | null;
      body_text:
        string | null;
      received_at:
        string | null;
    }>
) {
  return messages
    .map(
      (
        message
      ) => {
        const direction =
          message.direction ===
          "INCOMING"
            ? "PROSPECT"
            : "JOEL";

        return [
          `${direction} — ${message.from_name ?? message.from_email ?? ""}`,

          message.subject
            ? `Subject: ${message.subject}`
            : null,

          trimText(
            message.body_text,
            2400
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
}

/* =========================================================
   GET — LOAD SAVED PREP
========================================================= */

export async function GET(
  _request:
    Request,
  context:
    RouteContext
) {
  try {
    const {
      id,
    } =
      await context.params;

    if (
      !id
    ) {
      return jsonError(
        "Lead id is missing."
      );
    }

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

    const {
      data:
        lead,
      error,
    } =
      await supabase
        .from(
          "leads"
        )
        .select(`
          call_prep_snapshot,
          call_prep_generated_at
        `)
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "Could not load saved call prep:",
        error
      );

      return jsonError(
        "Could not load saved call prep.",
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

    const snapshot =
      readSavedSnapshot(
        lead.call_prep_snapshot
      );

    if (
      !snapshot
    ) {
      return NextResponse.json({
        ok:
          true,

        found:
          false,
      });
    }

    return NextResponse.json({
      ok:
        true,

      found:
        true,

      prep:
        snapshot.prep,

      context:
        snapshot.context,

      generatedAt:
        lead.call_prep_generated_at ??
        null,
    });
  } catch (error) {
    console.error(
      "Saved call prep load failed:",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Saved call prep load failed.",
      500
    );
  }
}

/* =========================================================
   POST — GENERATE + SAVE
========================================================= */

export async function POST(
  request:
    Request,
  context:
    RouteContext
) {
  try {
    const {
      id,
    } =
      await context.params;

    if (
      !id
    ) {
      return jsonError(
        "Lead id is missing."
      );
    }

    let payload:
      RequestBody = {};

    try {
      payload =
        await request.json();
    } catch {
      payload = {};
    }

    const language:
      CallPrepLanguage =
      payload.language ===
      "en"
        ? "en"
        : "de";

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

    const [
      leadResult,
      draftResult,
      messagesResult,
      visitsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "leads"
          )
          .select(`
            id,
            status,
            priority,
            website_score,
            opportunity_score,
            visual_score,
            redesign_potential,
            research_summary,
            website_findings,
            visual_analysis,
            notes,

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
            id
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle(),

        supabase
          .from(
            "outreach_drafts"
          )
          .select(`
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
            id
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
          .maybeSingle(),

        supabase
          .from(
            "email_messages"
          )
          .select(`
            direction,
            from_name,
            from_email,
            subject,
            body_text,
            received_at,
            reply_classification,
            reply_classification_confidence,
            reply_classification_reason
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "lead_id",
            id
          )
          .order(
            "received_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            18
          ),

        supabase
          .from(
            "design_preview_visits"
          )
          .select(`
            session_id,
            is_owner,
            is_engaged,
            duration_seconds,
            max_scroll_percent,
            last_seen_at
          `)
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "lead_id",
            id
          ),
      ]);

    if (
      leadResult.error
    ) {
      console.error(
        "Could not load lead for call prep:",
        leadResult.error
      );

      return jsonError(
        "Could not load the lead.",
        500
      );
    }

    const lead =
      leadResult.data;

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
        "Company data is missing.",
        400
      );
    }

    if (
      draftResult.error
    ) {
      console.error(
        "Could not load outreach for call prep:",
        draftResult.error
      );
    }

    if (
      messagesResult.error
    ) {
      console.error(
        "Could not load messages for call prep:",
        messagesResult.error
      );
    }

    if (
      visitsResult.error
    ) {
      console.error(
        "Could not load preview visits for call prep:",
        visitsResult.error
      );
    }

    const messages =
      messagesResult.data ??
      [];

    const chronological =
      [
        ...messages,
      ].reverse();

    const latestIncoming =
      messages.find(
        (
          message
        ) =>
          message.direction ===
          "INCOMING"
      ) ??
      null;

    const externalVisits =
      (
        visitsResult.data ??
        []
      ).filter(
        (
          visit
        ) =>
          !visit.is_owner
      );

    const externalSessions =
      new Set(
        externalVisits.map(
          (
            visit
          ) =>
            visit.session_id
        )
      );

    const engagedSessions =
      new Set(
        externalVisits
          .filter(
            (
              visit
            ) =>
              Boolean(
                visit.is_engaged
              )
          )
          .map(
            (
              visit
            ) =>
              visit.session_id
          )
      );

    const maxDurationSeconds =
      externalVisits.reduce(
        (
          current,
          visit
        ) =>
          Math.max(
            current,
            Number(
              visit.duration_seconds ??
              0
            )
          ),
        0
      );

    const maxScrollPercent =
      externalVisits.reduce(
        (
          current,
          visit
        ) =>
          Math.max(
            current,
            Number(
              visit.max_scroll_percent ??
              0
            )
          ),
        0
      );

    const latestPreviewSeenAt =
      externalVisits
        .map(
          (
            visit
          ) =>
            visit.last_seen_at
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(
              value
            )
        )
        .sort()
        .at(-1) ??
      null;

    const websiteContext = [
      lead.website_score !==
      null
        ? `Website score: ${lead.website_score}`
        : null,

      lead.opportunity_score !==
      null
        ? `Opportunity score: ${lead.opportunity_score}`
        : null,

      lead.visual_score !==
      null
        ? `Visual score: ${lead.visual_score}`
        : null,

      lead.redesign_potential !==
      null
        ? `Redesign potential: ${lead.redesign_potential}`
        : null,

      safeJson(
        lead.website_findings
      ),

      safeJson(
        lead.visual_analysis
      ),
    ]
      .filter(Boolean)
      .join(
        "\n\n"
      );

    const outreachContext =
      draftResult.data
        ? [
            draftResult.data.subject
              ? `Subject: ${draftResult.data.subject}`
              : null,

            trimText(
              draftResult.data.body,
              4200
            ),

            draftResult.data.follow_up_body
              ? `Follow-up:\n${trimText(
                  draftResult.data.follow_up_body,
                  2400
                )}`
              : null,

            draftResult.data.sent_at
              ? `Sent at: ${draftResult.data.sent_at}`
              : null,
          ]
            .filter(Boolean)
            .join(
              "\n\n"
            )
        : null;

    const latestReplyContext =
      latestIncoming
        ? [
            latestIncoming.reply_classification
              ? `Classification: ${latestIncoming.reply_classification}`
              : null,

            latestIncoming.reply_classification_confidence !==
            null
              ? `Confidence: ${latestIncoming.reply_classification_confidence}`
              : null,

            latestIncoming.reply_classification_reason
              ? `Reason: ${latestIncoming.reply_classification_reason}`
              : null,

            latestIncoming.received_at
              ? `Received at: ${latestIncoming.received_at}`
              : null,
          ]
            .filter(Boolean)
            .join(
              "\n"
            )
        : null;

    const previewContext = [
      `External preview sessions: ${externalSessions.size}`,
      `Engaged external sessions: ${engagedSessions.size}`,
      `Maximum observed duration: ${maxDurationSeconds}s`,
      `Maximum observed scroll: ${Math.round(
        maxScrollPercent
      )}%`,
      latestPreviewSeenAt
        ? `Latest external preview activity: ${latestPreviewSeenAt}`
        : "No external preview activity recorded.",
    ].join(
      "\n"
    );

    await assertAiUsageAvailable(user.id);

    const generated =
      await generateCallPrep({
        language,
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
        leadStatus:
          lead.status,
        priority:
          lead.priority,
        notes:
          lead.notes,
        researchSummary:
          lead.research_summary,
        websiteContext:
          websiteContext ||
          null,
        outreachContext,
        conversationContext:
          chronological.length >
          0
            ? formatConversation(
                chronological
              )
            : null,
        latestReplyContext,
        previewContext,
      });

    const prep:
      SavedCallPrep = {
        summary:
          generated.summary,
        currentSituation:
          generated.currentSituation,
        talkingPoints:
          generated.talkingPoints,
        discoveryQuestions:
          generated.discoveryQuestions,
        likelyObjections:
          generated.likelyObjections,
        cautionNotes:
          generated.cautionNotes,
        nextStep:
          generated.nextStep,
      };

    const callContext:
      SavedCallPrepContext = {
        companyName:
          company.name,
        contactName:
          contact?.full_name ??
          null,
        contactJobTitle:
          contact?.job_title ??
          null,
        websiteUrl:
          company.website_url ??
          null,
        leadStatus:
          lead.status ??
          null,
        latestReplyClassification:
          latestIncoming?.reply_classification ??
          null,
        latestReplyReason:
          latestIncoming?.reply_classification_reason ??
          null,
        preview: {
          externalSessions:
            externalSessions.size,
          engagedSessions:
            engagedSessions.size,
          maxDurationSeconds,
          maxScrollPercent:
            Math.round(
              maxScrollPercent
            ),
          latestSeenAt:
            latestPreviewSeenAt,
        },
      };

    const generatedAt =
      new Date().toISOString();

    const snapshot:
      SavedCallPrepSnapshot = {
        version:
          1,
        language,
        prep,
        context:
          callContext,
      };

    const {
      error:
        saveError,
    } =
      await supabase
        .from(
          "leads"
        )
        .update({
          call_prep_snapshot:
            snapshot,
          call_prep_generated_at:
            generatedAt,
        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      saveError
    ) {
      console.error(
        "Could not save call prep:",
        saveError
      );

      return jsonError(
        "Call prep was generated but could not be saved.",
        500
      );
    }

    await recordAiUsage({
      userId: user.id,
      feature: "call_prep",
      model: generated.model,
      usage: generated.usage,
      metadata: { leadId: id },
    });

    return NextResponse.json({
      ok:
        true,

      prep,

      context:
        callContext,

      generatedAt,

      model:
        generated.model,

      usage:
        generated.usage,
    });
  } catch (error) {
    console.error(
      "Call prep generation failed:",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Call prep generation failed.",
      500
    );
  }
}
