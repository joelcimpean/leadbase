import {
  NextResponse,
} from "next/server";

import {
  calculateHotLeadScore,
  shouldRaisePriority,
} from "@/lib/hot-lead-score";

import {
  calculateSmartFollowUpPlan,
} from "@/lib/smart-follow-up";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type LeadRow = {
  id:
    string;

  status:
    string;

  priority:
    string
    | null;

  opportunity_score:
    number
    | null;

  last_contacted_at:
    string
    | null;

  next_follow_up_at:
    string
    | null;

  primary_contact:
    | {
        email_quality_status:
          string
          | null;
      }
    | {
        email_quality_status:
          string
          | null;
      }[]
    | null;
};

function getSingleRelation<T>(
  value:
    | T
    | T[]
    | null
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

  return value;
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
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
    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Unauthorized.",
      },
      {
        status:
          401,
      }
    );
  }

  const admin =
    createAdminClient();

  const [
    leadsResult,
    visitsResult,
    messagesResult,
  ] =
    await Promise.all([
      admin
        .from(
          "leads"
        )
        .select(`
          id,
          status,
          priority,
          opportunity_score,
          last_contacted_at,
          next_follow_up_at,

          primary_contact:contacts (
            email_quality_status
          )
        `)
        .eq(
          "user_id",
          user.id
        ),

      admin
        .from(
          "design_preview_visits"
        )
        .select(`
          lead_id,
          visitor_id,
          session_id,
          source,
          is_owner,
          is_engaged,
          duration_seconds,
          max_scroll_percent,
          interaction_count,
          last_seen_at
        `)
        .eq(
          "user_id",
          user.id
        ),

      admin
        .from(
          "email_messages"
        )
        .select(`
          lead_id,
          received_at,
          is_automatic_reply,
          reply_classification,
          reply_classification_confidence,
          reply_follow_up_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "direction",
          "INCOMING"
        )
        .order(
          "received_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    leadsResult.error
  ) {
    console.error(
      "Could not load leads for hot score:",
      leadsResult.error
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Could not calculate hot leads.",
      },
      {
        status:
          500,
      }
    );
  }

  if (
    visitsResult.error
  ) {
    console.error(
      "Could not load preview visits for hot score:",
      visitsResult.error
    );
  }

  if (
    messagesResult.error
  ) {
    console.error(
      "Could not load reply intelligence for hot score:",
      messagesResult.error
    );
  }

  const previewByLead =
    new Map<
      string,
      {
        externalVisitors:
          Set<string>;

        externalSessions:
          Set<string>;

        outreachSessions:
          number;

        engagedExternalSessions:
          number;

        maxDurationSeconds:
          number;

        maxScrollPercent:
          number;

        maxInteractionCount:
          number;

        latestExternalSeenAt:
          string
          | null;
      }
    >();

  for (
    const visit of
      visitsResult.data ??
      []
  ) {
    if (
      visit.is_owner
    ) {
      continue;
    }

    const current =
      previewByLead.get(
        visit.lead_id
      ) ??
      {
        externalVisitors:
          new Set<string>(),

        externalSessions:
          new Set<string>(),

        outreachSessions:
          0,

        engagedExternalSessions:
          0,

        maxDurationSeconds:
          0,

        maxScrollPercent:
          0,

        maxInteractionCount:
          0,

        latestExternalSeenAt:
          null,
      };

    current.externalVisitors.add(
      visit.visitor_id
    );

    current.externalSessions.add(
      visit.session_id
    );

    if (
      visit.source ===
      "OUTREACH"
    ) {
      current.outreachSessions +=
        1;
    }

    if (
      visit.is_engaged
    ) {
      current.engagedExternalSessions +=
        1;
    }

    current.maxDurationSeconds =
      Math.max(
        current.maxDurationSeconds,
        Number(
          visit.duration_seconds ??
            0
        )
      );

    current.maxScrollPercent =
      Math.max(
        current.maxScrollPercent,
        Number(
          visit.max_scroll_percent ??
            0
        )
      );

    current.maxInteractionCount =
      Math.max(
        current.maxInteractionCount,
        Number(
          visit.interaction_count ??
            0
        )
      );

    if (
      visit.last_seen_at
    ) {
      const currentLatest =
        current.latestExternalSeenAt
          ? new Date(
              current.latestExternalSeenAt
            ).getTime()
          : 0;

      const visitLatest =
        new Date(
          visit.last_seen_at
        ).getTime();

      if (
        visitLatest >
        currentLatest
      ) {
        current.latestExternalSeenAt =
          visit.last_seen_at;
      }
    }

    previewByLead.set(
      visit.lead_id,
      current
    );
  }

  const latestReplyByLead =
    new Map<
      string,
      {
        classification:
          string
          | null;

        confidence:
          number
          | null;

        automatic:
          boolean;

        followUpAt:
          string
          | null;
      }
    >();

  for (
    const message of
      messagesResult.data ??
      []
  ) {
    if (
      latestReplyByLead.has(
        message.lead_id
      )
    ) {
      continue;
    }

    latestReplyByLead.set(
      message.lead_id,
      {
        classification:
          message
            .reply_classification,

        confidence:
          message
            .reply_classification_confidence,

        automatic:
          Boolean(
            message
              .is_automatic_reply
          ),

        followUpAt:
          message
            .reply_follow_up_at,
      }
    );
  }

  const summaries:
    Record<
      string,
      {
        score:
          number;

        level:
          string;

        reasons:
          {
            key:
              string;

            label:
              string;

            points:
              number;
          }[];

        priorityRaised:
          boolean;
      }
    > =
    {};

  for (
    const rawLead of
      leadsResult.data ??
      []
  ) {
    const lead =
      rawLead as LeadRow;

    const contact =
      getSingleRelation(
        lead.primary_contact
      );

    const preview =
      previewByLead.get(
        lead.id
      );

    const result =
      calculateHotLeadScore({
        leadStatus:
          lead.status,

        opportunityScore:
          lead.opportunity_score,

        emailQualityStatus:
          contact
            ?.email_quality_status ??
          null,

        preview: {
          externalVisitors:
            preview
              ?.externalVisitors
              .size ??
            0,

          externalSessions:
            preview
              ?.externalSessions
              .size ??
            0,

          outreachSessions:
            preview
              ?.outreachSessions ??
            0,

          engagedExternalSessions:
            preview
              ?.engagedExternalSessions ??
            0,

          maxDurationSeconds:
            preview
              ?.maxDurationSeconds ??
            0,

          maxScrollPercent:
            preview
              ?.maxScrollPercent ??
            0,

          maxInteractionCount:
            preview
              ?.maxInteractionCount ??
            0,
        },

        latestReply:
          latestReplyByLead.get(
            lead.id
          ) ??
          null,
      });

    const raisePriority =
      shouldRaisePriority({
        currentPriority:
          lead.priority,

        recommendedPriority:
          result
            .recommendedPriority,
      });

    const smartPlan =
      calculateSmartFollowUpPlan({
        leadStatus:
          lead.status,

        lastContactedAt:
          lead.last_contacted_at,

        currentFollowUpAt:
          lead.next_follow_up_at,

        preview: {
          externalSessions:
            preview
              ?.externalSessions
              .size ??
            0,

          engagedExternalSessions:
            preview
              ?.engagedExternalSessions ??
            0,

          maxDurationSeconds:
            preview
              ?.maxDurationSeconds ??
            0,

          maxScrollPercent:
            preview
              ?.maxScrollPercent ??
            0,

          latestExternalSeenAt:
            preview
              ?.latestExternalSeenAt ??
            null,
        },

        latestReply:
          latestReplyByLead.get(
            lead.id
          )
            ? {
                classification:
                  latestReplyByLead.get(
                    lead.id
                  )?.classification ??
                  null,

                automatic:
                  latestReplyByLead.get(
                    lead.id
                  )?.automatic ??
                  false,

                followUpAt:
                  latestReplyByLead.get(
                    lead.id
                  )?.followUpAt ??
                  null,
              }
            : null,
      });

    const updatePayload: {
      hot_lead_score:
        number;

      hot_lead_level:
        string;

      hot_lead_reasons:
        unknown;

      hot_lead_updated_at:
        string;

      priority?:
        string;

      next_follow_up_at:
        string
        | null;

      smart_follow_up_mode:
        string;

      smart_follow_up_reason:
        string;

      smart_follow_up_updated_at:
        string;
    } = {
      hot_lead_score:
        result.score,

      hot_lead_level:
        result.level,

      hot_lead_reasons:
        result.reasons,

      hot_lead_updated_at:
        new Date()
          .toISOString(),

      next_follow_up_at:
        smartPlan
          .nextFollowUpAt,

      smart_follow_up_mode:
        smartPlan.mode,

      smart_follow_up_reason:
        smartPlan.reason,

      smart_follow_up_updated_at:
        new Date()
          .toISOString(),
    };

    if (
      raisePriority
    ) {
      updatePayload.priority =
        result
          .recommendedPriority;
    }

    const {
      error:
        updateError,
    } =
      await admin
        .from(
          "leads"
        )
        .update(
          updatePayload
        )
        .eq(
          "id",
          lead.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      updateError
    ) {
      console.error(
        `Could not persist hot score for lead ${lead.id}:`,
        updateError
      );
    }

    summaries[
      lead.id
    ] =
      {
        score:
          result.score,

        level:
          result.level,

        reasons:
          result.reasons.slice(
            0,
            5
          ),

        priorityRaised:
          raisePriority,
      };
  }

  return NextResponse.json({
    ok:
      true,

    leads:
      summaries,
  });
}
