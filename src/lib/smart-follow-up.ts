import type {
  SupabaseClient,
} from "@supabase/supabase-js";

/* =========================================================
   TYPES
========================================================= */

export type SmartFollowUpMode =
  | "STANDARD"
  | "VIEWED"
  | "ENGAGED"
  | "REPEAT"
  | "OOO"
  | "REQUESTED"
  | "STOPPED";

export type SmartFollowUpPreview = {
  externalSessions:
    number;

  engagedExternalSessions:
    number;

  maxDurationSeconds:
    number;

  maxScrollPercent:
    number;

  latestExternalSeenAt:
    string
    | null;
};

export type SmartFollowUpReply = {
  classification:
    string
    | null;

  automatic:
    boolean;

  followUpAt:
    string
    | null;
};

export type SmartFollowUpPlan = {
  mode:
    SmartFollowUpMode;

  nextFollowUpAt:
    string
    | null;

  reason:
    string;
};

/* =========================================================
   TIME
========================================================= */

const DAY_MS =
  24 *
  60 *
  60 *
  1000;

function validTime(
  value:
    string
    | null
    | undefined
) {
  if (
    !value
  ) {
    return null;
  }

  const time =
    new Date(
      value
    ).getTime();

  return Number.isFinite(
    time
  )
    ? time
    : null;
}

function addDays(
  value:
    string,
  days:
    number
) {
  const time =
    validTime(
      value
    );

  if (
    time ===
    null
  ) {
    return null;
  }

  return new Date(
    time +
      days *
        DAY_MS
  ).toISOString();
}

function laterOf(
  first:
    string
    | null,
  second:
    string
    | null
) {
  const firstTime =
    validTime(
      first
    );

  const secondTime =
    validTime(
      second
    );

  if (
    firstTime ===
    null
  ) {
    return second;
  }

  if (
    secondTime ===
    null
  ) {
    return first;
  }

  return firstTime >=
    secondTime
    ? first
    : second;
}

function earlierOf(
  first:
    string
    | null,
  second:
    string
    | null
) {
  const firstTime =
    validTime(
      first
    );

  const secondTime =
    validTime(
      second
    );

  if (
    firstTime ===
    null
  ) {
    return second;
  }

  if (
    secondTime ===
    null
  ) {
    return first;
  }

  return firstTime <=
    secondTime
    ? first
    : second;
}

function hoursAfter(
  value:
    string
    | null,
  hours:
    number
) {
  const time =
    validTime(
      value
    );

  if (
    time ===
    null
  ) {
    return null;
  }

  return new Date(
    time +
      hours *
        60 *
        60 *
        1000
  ).toISOString();
}

/* =========================================================
   CALCULATE
========================================================= */

export function calculateSmartFollowUpPlan({
  leadStatus,
  lastContactedAt,
  currentFollowUpAt,
  preview,
  latestReply,
}: {
  leadStatus:
    string
    | null;

  lastContactedAt:
    string
    | null;

  currentFollowUpAt:
    string
    | null;

  preview:
    SmartFollowUpPreview;

  latestReply:
    SmartFollowUpReply
    | null;
}): SmartFollowUpPlan {
  /* -------------------------------------------------------
     CLOSED / FORBIDDEN
  ------------------------------------------------------- */

  if (
    leadStatus ===
      "LOST" ||
    leadStatus ===
      "WON" ||
    leadStatus ===
      "DO_NOT_CONTACT"
  ) {
    return {
      mode:
        "STOPPED",

      nextFollowUpAt:
        null,

      reason:
        "Follow-up stopped because the lead is closed or must not be contacted.",
    };
  }

  /* -------------------------------------------------------
     HUMAN REPLY

     A normal cold follow-up must never continue after a
     real person replied.

     FOLLOW_UP_LATER is the one exception: the person
     explicitly requested another contact.
  ------------------------------------------------------- */

  if (
    latestReply &&
    !latestReply.automatic
  ) {
    if (
      latestReply
        .classification ===
        "FOLLOW_UP_LATER" &&
      latestReply.followUpAt
    ) {
      return {
        mode:
          "REQUESTED",

        nextFollowUpAt:
          latestReply
            .followUpAt,

        reason:
          "Customer explicitly requested to be contacted again later.",
      };
    }

    return {
      mode:
        "STOPPED",

      nextFollowUpAt:
        null,

      reason:
        "Cold follow-up stopped because a real customer reply was received.",
    };
  }

  /* -------------------------------------------------------
     AUTOMATIC REPLY
  ------------------------------------------------------- */

  if (
    latestReply
      ?.classification ===
      "BOUNCE"
  ) {
    return {
      mode:
        "STOPPED",

      nextFollowUpAt:
        null,

      reason:
        "Follow-up stopped because the email bounced.",
    };
  }

  if (
    latestReply?.automatic &&
    latestReply
      .classification ===
      "OUT_OF_OFFICE"
  ) {
    return {
      mode:
        "OOO",

      nextFollowUpAt:
        latestReply
          .followUpAt ??
        currentFollowUpAt,

      reason:
        "Follow-up postponed until after the automatic out-of-office period.",
    };
  }

  /* -------------------------------------------------------
     NO ORIGINAL SEND YET
  ------------------------------------------------------- */

  if (
    !lastContactedAt
  ) {
    return {
      mode:
        "STANDARD",

      nextFollowUpAt:
        currentFollowUpAt,

      reason:
        "No sent outreach exists yet.",
    };
  }

  const standardDue =
    addDays(
      lastContactedAt,
      5
    );

  /*
   * Preserve an existing earlier date. Smart engagement
   * signals only bring a normal cold follow-up forward;
   * they never push it later.
   */
  const baseline =
    currentFollowUpAt ??
    standardDue;

  /* -------------------------------------------------------
     REPEAT / STRONG ENGAGEMENT

     Earliest: 2 days after initial outreach.
     Also wait at least 12h after the latest preview signal,
     so the follow-up never feels instant or creepy.
  ------------------------------------------------------- */

  const strongEngagement =
    preview
      .externalSessions >=
      2 ||
    preview
      .maxDurationSeconds >=
      60 ||
    preview
      .maxScrollPercent >=
      80;

  if (
    strongEngagement
  ) {
    const afterSend =
      addDays(
        lastContactedAt,
        2
      );

    const afterSignal =
      hoursAfter(
        preview
          .latestExternalSeenAt,
        12
      );

    const candidate =
      laterOf(
        afterSend,
        afterSignal
      );

    return {
      mode:
        "REPEAT",

      nextFollowUpAt:
        earlierOf(
          baseline,
          candidate
        ),

      reason:
        "Preview was revisited or showed strong engagement, so the follow-up was brought forward safely.",
    };
  }

  /* -------------------------------------------------------
     ENGAGED

     Earliest: 3 days after send.
     At least 18h after the latest preview interaction.
  ------------------------------------------------------- */

  if (
    preview
      .engagedExternalSessions >
      0
  ) {
    const afterSend =
      addDays(
        lastContactedAt,
        3
      );

    const afterSignal =
      hoursAfter(
        preview
          .latestExternalSeenAt,
        18
      );

    const candidate =
      laterOf(
        afterSend,
        afterSignal
      );

    return {
      mode:
        "ENGAGED",

      nextFollowUpAt:
        earlierOf(
          baseline,
          candidate
        ),

      reason:
        "Customer engaged with the preview, so the follow-up was brought forward moderately.",
    };
  }

  /* -------------------------------------------------------
     VIEWED

     Earliest: 4 days after send.
     At least 24h after the preview open.
  ------------------------------------------------------- */

  if (
    preview
      .externalSessions >
      0
  ) {
    const afterSend =
      addDays(
        lastContactedAt,
        4
      );

    const afterSignal =
      hoursAfter(
        preview
          .latestExternalSeenAt,
        24
      );

    const candidate =
      laterOf(
        afterSend,
        afterSignal
      );

    return {
      mode:
        "VIEWED",

      nextFollowUpAt:
        earlierOf(
          baseline,
          candidate
        ),

      reason:
        "Customer opened the preview, so the normal follow-up was moved slightly earlier.",
    };
  }

  return {
    mode:
      "STANDARD",

    nextFollowUpAt:
      baseline,

    reason:
      "No customer engagement signal yet; standard 5-day follow-up remains.",
  };
}

/* =========================================================
   TARGETED RECALCULATION

   Used by preview tracking only after a meaningful threshold
   is crossed. This avoids a DB recalculation on every 10s
   tracking heartbeat.
========================================================= */

export async function recalculateSmartFollowUpForLead({
  supabase,
  userId,
  leadId,
}: {
  supabase:
    SupabaseClient;

  userId:
    string;

  leadId:
    string;
}) {
  const [
    leadResult,
    visitsResult,
    replyResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "leads"
        )
        .select(`
          id,
          status,
          last_contacted_at,
          next_follow_up_at
        `)
        .eq(
          "id",
          leadId
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle(),

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
          "lead_id",
          leadId
        )
        .eq(
          "user_id",
          userId
        ),

      supabase
        .from(
          "email_messages"
        )
        .select(`
          reply_classification,
          is_automatic_reply,
          reply_follow_up_at,
          received_at
        `)
        .eq(
          "lead_id",
          leadId
        )
        .eq(
          "user_id",
          userId
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
        )
        .limit(
          1
        )
        .maybeSingle(),
    ]);

  if (
    leadResult.error ||
    !leadResult.data
  ) {
    return null;
  }

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

  const sessions =
    new Set(
      externalVisits.map(
        (
          visit
        ) =>
          visit.session_id
      )
    );

  const latestExternalSeenAt =
    externalVisits
      .map(
        (
          visit
        ) =>
          visit.last_seen_at
      )
      .filter(
        Boolean
      )
      .sort()
      .at(
        -1
      ) ??
    null;

  const plan =
    calculateSmartFollowUpPlan({
      leadStatus:
        leadResult.data
          .status,

      lastContactedAt:
        leadResult.data
          .last_contacted_at,

      currentFollowUpAt:
        leadResult.data
          .next_follow_up_at,

      preview: {
        externalSessions:
          sessions.size,

        engagedExternalSessions:
          externalVisits.filter(
            (
              visit
            ) =>
              visit.is_engaged
          ).length,

        maxDurationSeconds:
          Math.max(
            0,
            ...externalVisits.map(
              (
                visit
              ) =>
                Number(
                  visit.duration_seconds ??
                    0
                )
            )
          ),

        maxScrollPercent:
          Math.max(
            0,
            ...externalVisits.map(
              (
                visit
              ) =>
                Number(
                  visit.max_scroll_percent ??
                    0
                )
            )
          ),

        latestExternalSeenAt,
      },

      latestReply:
        replyResult.data
          ? {
              classification:
                replyResult.data
                  .reply_classification,

              automatic:
                Boolean(
                  replyResult.data
                    .is_automatic_reply
                ),

              followUpAt:
                replyResult.data
                  .reply_follow_up_at,
            }
          : null,
    });

  const {
    error:
      updateError,
  } =
    await supabase
      .from(
        "leads"
      )
      .update({
        next_follow_up_at:
          plan.nextFollowUpAt,

        smart_follow_up_mode:
          plan.mode,

        smart_follow_up_reason:
          plan.reason,

        smart_follow_up_updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        leadId
      )
      .eq(
        "user_id",
        userId
      );

  if (
    updateError
  ) {
    console.error(
      "Could not update smart follow-up:",
      updateError
    );

    return null;
  }

  return plan;
}

/* =========================================================
   TRACKING THRESHOLDS
========================================================= */

export function shouldRecalculateFromPreviewUpdate({
  existingEngaged,
  existingDurationSeconds,
  existingScrollPercent,
  nextEngaged,
  nextDurationSeconds,
  nextScrollPercent,
}: {
  existingEngaged:
    boolean;

  existingDurationSeconds:
    number;

  existingScrollPercent:
    number;

  nextEngaged:
    boolean;

  nextDurationSeconds:
    number;

  nextScrollPercent:
    number;
}) {
  if (
    !existingEngaged &&
    nextEngaged
  ) {
    return true;
  }

  if (
    existingDurationSeconds <
      60 &&
    nextDurationSeconds >=
      60
  ) {
    return true;
  }

  if (
    existingScrollPercent <
      80 &&
    nextScrollPercent >=
      80
  ) {
    return true;
  }

  return false;
}
