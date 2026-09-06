import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  assessEmailQuality,
} from "@/lib/email-quality";

import {
  sendGmailMessage,
} from "@/lib/gmail-send";

import {
  getOutreachQualityBlockingMessage,
  loadOutreachQuality,
} from "@/lib/outreach-quality";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

/* =========================================================
   CONFIG
========================================================= */

const GMAIL_SEND_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

const CLOSED_STATUSES =
  new Set([
    "WON",
    "LOST",
    "NOT_A_FIT",
    "DO_NOT_CONTACT",
  ]);

const PROTECTED_EARLY_SEND_MODES =
  new Set([
    "OOO",
    "REQUESTED",
  ]);

/* =========================================================
   TYPES
========================================================= */

type FollowUpRunResult = {
  checked:
    number;

  sent:
    number;

  skipped:
    number;

  failed:
    number;

  results:
    {
      leadId:
        string;

      companyName:
        string;

      draftId:
        string
        | null;

      result:
        "SENT"
        | "SKIPPED"
        | "FAILED";

      reason?:
        string;
    }[];
};

export type ScheduledFollowUpCandidate = {
  leadId:
    string;

  companyName:
    string;

  nextFollowUpAt:
    string;

  smartFollowUpMode:
    string
    | null;
};

type GmailConnection = {
  email_address:
    string;

  encrypted_refresh_token:
    string;

  scopes:
    unknown;
};

/* =========================================================
   HELPERS
========================================================= */

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

function isReasonableEmail(
  value:
    string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function errorMessage(
  error:
    unknown
) {
  if (
    error instanceof
      Error
  ) {
    return error.message.slice(
      0,
      1500
    );
  }

  return "UNKNOWN_ERROR";
}

function isGmailQuotaError(
  error:
    unknown
) {
  const message =
    errorMessage(
      error
    ).toLowerCase();

  return (
    message.includes(
      "quota exceeded"
    ) ||
    message.includes(
      "units per minute per user"
    ) ||
    message.includes(
      "userratelimitexceeded"
    ) ||
    message.includes(
      "rate limit exceeded"
    )
  );
}

function gmailQuotaReason() {
  return "Gmail API rate limit reached. This follow-up was not marked as sent. Wait about a minute and retry; Leadbase stopped the remaining batch to avoid duplicate or repeated requests.";
}

function sleep(
  milliseconds:
    number
) {
  return new Promise<void>(
    (
      resolve
    ) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function canSendBeforeScheduledTime({
  nextFollowUpAt,
  smartFollowUpMode,
  nowMs,
}: {
  nextFollowUpAt:
    string
    | null;

  smartFollowUpMode:
    string
    | null;

  nowMs:
    number;
}) {
  if (
    !nextFollowUpAt
  ) {
    return false;
  }

  const scheduledTime =
    new Date(
      nextFollowUpAt
    ).getTime();

  if (
    !Number.isFinite(
      scheduledTime
    )
  ) {
    return false;
  }

  if (
    scheduledTime <=
      nowMs
  ) {
    return true;
  }

  return !PROTECTED_EARLY_SEND_MODES.has(
    smartFollowUpMode ??
      ""
  );
}

async function loadGmailConnection({
  supabase,
  userId,
}: {
  supabase:
    SupabaseClient;

  userId:
    string;
}): Promise<GmailConnection> {
  const {
    data,
    error,
  } =
    await supabase
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
        userId
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw new Error(
      "Gmail connection could not be loaded."
    );
  }

  const scopes =
    Array.isArray(
      data.scopes
    )
      ? data.scopes
      : [];

  if (
    !scopes.includes(
      GMAIL_SEND_SCOPE
    )
  ) {
    throw new Error(
      "Gmail send permission is missing."
    );
  }

  return data as GmailConnection;
}

/* =========================================================
   COUNT DUE
========================================================= */

export async function countDueFollowUpsForUser(
  userId:
    string
) {
  const candidates =
    await listScheduledFollowUpsForUser(
      userId
    );

  const nowMs =
    Date.now();

  return candidates.filter(
    (
      candidate
    ) => {
      const scheduledMs =
        new Date(
          candidate.nextFollowUpAt
        ).getTime();

      return (
        Number.isFinite(
          scheduledMs
        ) &&
        scheduledMs <=
          nowMs
      );
    }
  ).length;
}

/* =========================================================
   COUNT MANUALLY SENDABLE FOLLOW-UPS

   Includes normal scheduled follow-ups that are planned for
   later today / later in the sequence. Explicit OOO and
   customer-requested future dates stay protected.
========================================================= */

export async function listScheduledFollowUpsForUser(
  userId:
    string,
  limit =
    100
): Promise<
  ScheduledFollowUpCandidate[]
> {
  const supabase =
    createAdminClient();

  const nowMs =
    Date.now();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "leads"
      )
      .select(`
        id,
        status,
        next_follow_up_at,
        smart_follow_up_mode,
        manual_follow_up_stopped_at,

        company:companies (
          name
        )
      `)
      .eq(
        "user_id",
        userId
      )
      .not(
        "next_follow_up_at",
        "is",
        null
      )
      .is(
        "manual_follow_up_stopped_at",
        null
      )
      .order(
        "next_follow_up_at",
        {
          ascending:
            true,
        }
      )
      .limit(
        Math.max(
          1,
          Math.min(
            limit,
            100
          )
        )
      );

  if (
    error
  ) {
    console.error(
      "Could not load scheduled follow-ups:",
      error
    );

    return [];
  }

  const activeLeads =
    (
      data ??
      []
    ).filter(
      (
        lead
      ) =>
        !CLOSED_STATUSES.has(
          lead.status
        ) &&
        canSendBeforeScheduledTime({
          nextFollowUpAt:
            lead.next_follow_up_at,

          smartFollowUpMode:
            lead.smart_follow_up_mode,

          nowMs,
        })
    );

  if (
    activeLeads.length ===
    0
  ) {
    return [];
  }

  const leadIds =
    activeLeads.map(
      (
        lead
      ) =>
        lead.id
    );

  /*
   * A lead-level next_follow_up_at is only a schedule. Before
   * showing it in Settings, reconcile that schedule against
   * the actual outreach draft and synced outbound Gmail history.
   *
   * This prevents already-sent follow-ups from reappearing when
   * an older send path failed to clear next_follow_up_at.
   */
  const [
    draftResult,
    outgoingResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "outreach_drafts"
        )
        .select(`
          lead_id,
          status,
          sent_at,
          follow_up_body,
          follow_up_sent_at,
          follow_up_sending_started_at,
          created_at
        `)
        .eq(
          "user_id",
          userId
        )
        .in(
          "lead_id",
          leadIds
        )
        .eq(
          "status",
          "SENT"
        )
        .not(
          "follow_up_body",
          "is",
          null
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "email_messages"
        )
        .select(`
          lead_id,
          direction,
          received_at
        `)
        .eq(
          "user_id",
          userId
        )
        .in(
          "lead_id",
          leadIds
        )
        .eq(
          "direction",
          "OUTGOING"
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
    draftResult.error
  ) {
    console.error(
      "Could not reconcile follow-up drafts:",
      draftResult.error
    );

    /*
     * Be conservative: if Leadbase cannot verify an unsent
     * follow-up draft, do not offer a potentially duplicate send.
     */
    return [];
  }

  if (
    outgoingResult.error
  ) {
    console.error(
      "Could not reconcile outbound email history:",
      outgoingResult.error
    );
  }

  type FollowUpDraftState = {
    lead_id:
      string;

    sent_at:
      string
      | null;

    follow_up_body:
      string
      | null;

    follow_up_sent_at:
      string
      | null;

    follow_up_sending_started_at:
      string
      | null;
  };

  const latestDraftByLead =
    new Map<
      string,
      FollowUpDraftState
    >();

  for (
    const draft of
      draftResult.data ??
      []
  ) {
    if (
      !latestDraftByLead.has(
        draft.lead_id
      )
    ) {
      latestDraftByLead.set(
        draft.lead_id,
        draft as FollowUpDraftState
      );
    }
  }

  const outgoingByLead =
    new Map<
      string,
      string[]
    >();

  if (
    !outgoingResult.error
  ) {
    for (
      const message of
        outgoingResult.data ??
        []
    ) {
      if (
        !message.lead_id ||
        !message.received_at
      ) {
        continue;
      }

      const existing =
        outgoingByLead.get(
          message.lead_id
        ) ??
        [];

      existing.push(
        message.received_at
      );

      outgoingByLead.set(
        message.lead_id,
        existing
      );
    }
  }

  const staleSentLeadIds:
    string[] =
    [];

  const candidates =
    activeLeads.flatMap(
      (
        lead
      ) => {
        if (
          !lead.next_follow_up_at
        ) {
          return [];
        }

        const draft =
          latestDraftByLead.get(
            lead.id
          );

        /*
         * No matching sent outreach draft means there is no
         * verifiable follow-up that can safely be sent.
         */
        if (
          !draft ||
          !draft.follow_up_body
            ?.trim()
        ) {
          return [];
        }

        const initialSentAtMs =
          draft.sent_at
            ? new Date(
                draft.sent_at
              ).getTime()
            : Number.NaN;

        const hasLaterSyncedOutbound =
          Number.isFinite(
            initialSentAtMs
          ) &&
          (
            outgoingByLead.get(
              lead.id
            ) ??
            []
          ).some(
            (
              receivedAt
            ) => {
              const time =
                new Date(
                  receivedAt
                ).getTime();

              return (
                Number.isFinite(
                  time
                ) &&
                time >
                  initialSentAtMs +
                    5 * 60_000
              );
            }
          );

        const alreadySent =
          Boolean(
            draft.follow_up_sent_at
          ) ||
          hasLaterSyncedOutbound;

        if (
          alreadySent
        ) {
          staleSentLeadIds.push(
            lead.id
          );

          return [];
        }

        /*
         * If another process is currently sending it, do not
         * expose it as manually sendable and risk a duplicate.
         */
        if (
          draft.follow_up_sending_started_at
        ) {
          return [];
        }

        const company =
          getSingleRelation<{
            name:
              string;
          }>(
            lead.company
          );

        return [
          {
            leadId:
              lead.id,

            companyName:
              company?.name ??
              "Unknown company",

            nextFollowUpAt:
              lead.next_follow_up_at,

            smartFollowUpMode:
              lead.smart_follow_up_mode,
          },
        ];
      }
    );

  if (
    staleSentLeadIds.length >
    0
  ) {
    const reconciledAt =
      new Date()
        .toISOString();

    const {
      error:
        reconcileError,
    } =
      await supabase
        .from(
          "leads"
        )
        .update({
          next_follow_up_at:
            null,

          smart_follow_up_mode:
            "STOPPED",

          smart_follow_up_reason:
            "Follow-up already sent; stale schedule reconciled.",

          smart_follow_up_updated_at:
            reconciledAt,
        })
        .eq(
          "user_id",
          userId
        )
        .in(
          "id",
          Array.from(
            new Set(
              staleSentLeadIds
            )
          )
        );

    if (
      reconcileError
    ) {
      console.error(
        "Could not clear stale sent follow-up schedules:",
        reconcileError
      );
    }
  }

  return candidates;
}

export async function countScheduledFollowUpsForUser(
  userId:
    string
) {
  const candidates =
    await listScheduledFollowUpsForUser(
      userId
    );

  return candidates.length;
}

/* =========================================================
   SEND DUE FOLLOW-UPS FOR ONE USER
========================================================= */

export async function sendDueFollowUpsForUser({
  userId,
  limit = 20,
  allowEarlySend = false,
  leadIds,
}: {
  userId:
    string;

  limit?:
    number;

  allowEarlySend?:
    boolean;

  leadIds?:
    string[];
}): Promise<FollowUpRunResult> {
  const supabase =
    createAdminClient();

  const result:
    FollowUpRunResult = {
    checked:
      0,

    sent:
      0,

    skipped:
      0,

    failed:
      0,

    results:
      [],
  };

  const now =
    new Date()
      .toISOString();

  const normalizedLeadIds =
    leadIds ===
    undefined
      ? null
      : Array.from(
          new Set(
            leadIds
              .map(
                (
                  value
                ) =>
                  value.trim()
              )
              .filter(
                Boolean
              )
          )
        );

  if (
    normalizedLeadIds &&
    normalizedLeadIds.length ===
      0
  ) {
    return result;
  }

  let followUpQuery =
    supabase
      .from(
        "leads"
      )
      .select(`
        id,
        status,
        next_follow_up_at,
        smart_follow_up_mode,
        manual_follow_up_stopped_at,

        company:companies (
          name,
          website_url
        ),

        primary_contact:contacts (
          id,
          email,
          email_quality_status,
          email_quality_detail,
          email_source_url,
          email_candidate,
          email_candidate_source_url
        )
      `)
      .eq(
        "user_id",
        userId
      )
      .not(
        "next_follow_up_at",
        "is",
        null
      )
      .is(
        "manual_follow_up_stopped_at",
        null
      );

  if (
    normalizedLeadIds
  ) {
    followUpQuery =
      followUpQuery.in(
        "id",
        normalizedLeadIds
      );
  }

  if (
    !allowEarlySend
  ) {
    followUpQuery =
      followUpQuery.lte(
        "next_follow_up_at",
        now
      );
  }

  const {
    data:
      dueLeads,
    error:
      dueLeadError,
  } =
    await followUpQuery
      .order(
        "next_follow_up_at",
        {
          ascending:
            true,
        }
      )
      .limit(
        Math.max(
          1,
          Math.min(
            limit,
            100
          )
        )
      );

  if (
    dueLeadError
  ) {
    throw new Error(
      `Could not load due follow-ups: ${dueLeadError.message}`
    );
  }

  const nowMs =
    Date.now();

  const activeDueLeads =
    (
      dueLeads ??
      []
    ).filter(
      (
        lead
      ) =>
        !CLOSED_STATUSES.has(
          lead.status
        ) &&
        (
          !allowEarlySend ||
          canSendBeforeScheduledTime({
            nextFollowUpAt:
              lead.next_follow_up_at,

            smartFollowUpMode:
              lead.smart_follow_up_mode,

            nowMs,
          })
        )
    );

  result.checked =
    activeDueLeads.length;

  if (
    activeDueLeads.length ===
    0
  ) {
    return result;
  }

  let gmailConnection:
    GmailConnection;

  try {
    gmailConnection =
      await loadGmailConnection({
        supabase,

        userId,
      });
  } catch (
    error
  ) {
    const reason =
      errorMessage(
        error
      );

    result.failed =
      activeDueLeads.length;

    result.results =
      activeDueLeads.map(
        (
          lead
        ) => {
          const company =
            getSingleRelation<{
              name:
                string;
            }>(
              lead.company
            );

          return {
            leadId:
              lead.id,

            companyName:
              company?.name ??
              "Unknown company",

            draftId:
              null,

            result:
              "FAILED" as const,

            reason,
          };
        }
      );

    return result;
  }

  let gmailQuotaBlocked =
    false;

  let successfulSendsInRun =
    0;

  for (
    const lead of
      activeDueLeads
  ) {
    const initialCompany =
      getSingleRelation<{
        name:
          string;

        website_url:
          string
          | null;
      }>(
        lead.company
      );

    const companyName =
      initialCompany?.name ??
      "Unknown company";

    let draftId:
      string
      | null =
      null;

    if (
      gmailQuotaBlocked
    ) {
      result.skipped +=
        1;

      result.results.push({
        leadId:
          lead.id,

        companyName,

        draftId:
          null,

        result:
          "SKIPPED",

        reason:
          gmailQuotaReason(),
      });

      continue;
    }

    try {
      /*
       * Re-check the current lead state immediately before
       * doing any work. This protects against a reply / OOO
       * update racing with a manual or cron follow-up run.
       */
      const {
        data:
          freshLead,
        error:
          freshLeadError,
      } =
        await supabase
          .from(
            "leads"
          )
          .select(`
            id,
            status,
            next_follow_up_at,
            smart_follow_up_mode,
            manual_follow_up_stopped_at,

            company:companies (
              name,
              website_url
            ),

            primary_contact:contacts (
              id,
              email,
              email_quality_status,
              email_quality_detail,
              email_source_url,
              email_candidate,
              email_candidate_source_url
            )
          `)
          .eq(
            "id",
            lead.id
          )
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

      if (
        freshLeadError ||
        !freshLead
      ) {
        throw new Error(
          freshLeadError?.message ??
          "Lead could not be reloaded."
        );
      }

      const nextFollowUpAt =
        freshLead
          .next_follow_up_at;

      const nextFollowUpTime =
        nextFollowUpAt
          ? new Date(
              nextFollowUpAt
            ).getTime()
          : Number.NaN;

      const nextFollowUpIsValid =
        Number.isFinite(
          nextFollowUpTime
        );

      const nextFollowUpIsFuture =
        nextFollowUpIsValid &&
        nextFollowUpTime >
          Date.now();

      const protectedEarlySend =
        allowEarlySend &&
        nextFollowUpIsFuture &&
        PROTECTED_EARLY_SEND_MODES.has(
          freshLead
            .smart_follow_up_mode ??
            ""
        );

      if (
        CLOSED_STATUSES.has(
          freshLead.status
        ) ||
        freshLead.manual_follow_up_stopped_at ||
        !nextFollowUpAt ||
        !nextFollowUpIsValid ||
        (
          !allowEarlySend &&
          nextFollowUpIsFuture
        ) ||
        protectedEarlySend
      ) {
        result.skipped +=
          1;

        result.results.push({
          leadId:
            lead.id,

          companyName,

          draftId:
            null,

          result:
            "SKIPPED",

          reason:
            protectedEarlySend
              ? "Future follow-up is protected by an out-of-office or customer-requested contact date."
              : allowEarlySend
                ? "Follow-up can no longer be sent."
                : "Follow-up is no longer due.",
        });

        continue;
      }

      const company =
        getSingleRelation<{
          name:
            string;

          website_url:
            string
            | null;
        }>(
          freshLead.company
        );

      const contact =
        getSingleRelation<{
          id:
            string;

          email:
            string
            | null;

          email_quality_status:
            string
            | null;

          email_quality_detail:
            string
            | null;

          email_source_url:
            string
            | null;

          email_candidate:
            string
            | null;

          email_candidate_source_url:
            string
            | null;
        }>(
          freshLead.primary_contact
        );

      const recipientEmail =
        contact
          ?.email
          ?.trim()
          .toLowerCase();

      if (
        !recipientEmail ||
        !isReasonableEmail(
          recipientEmail
        )
      ) {
        result.skipped +=
          1;

        result.results.push({
          leadId:
            lead.id,

          companyName,

          draftId:
            null,

          result:
            "SKIPPED",

          reason:
            "Lead has no valid recipient email.",
        });

        continue;
      }

      const assessment =
        assessEmailQuality({
          currentEmail:
            contact?.email ??
            null,

          websiteUrl:
            company
              ?.website_url ??
            null,

          discoveredEmail:
            contact
              ?.email_candidate ??
            (
              contact
                ?.email_quality_status ===
                "VERIFIED_WEBSITE"
                ? contact.email
                : null
            ),

          discoveredEmailSourceUrl:
            contact
              ?.email_candidate_source_url ??
            contact
              ?.email_source_url ??
            null,
        });

      if (
        assessment.blocksSending
      ) {
        result.skipped +=
          1;

        result.results.push({
          leadId:
            lead.id,

          companyName,

          draftId:
            null,

          result:
            "SKIPPED",

          reason:
            `Email safety: ${assessment.detail}`,
        });

        continue;
      }

      const {
        data:
          draft,
        error:
          draftError,
      } =
        await supabase
          .from(
            "outreach_drafts"
          )
          .select(`
            id,
            status,
            subject,
            follow_up_body,
            follow_up_sent_at,
            follow_up_sending_started_at,
            created_at
          `)
          .eq(
            "user_id",
            userId
          )
          .eq(
            "lead_id",
            lead.id
          )
          .eq(
            "status",
            "SENT"
          )
          .is(
            "follow_up_sent_at",
            null
          )
          .not(
            "follow_up_body",
            "is",
            null
          )
          .order(
            "created_at",
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
        throw new Error(
          draftError.message
        );
      }

      if (
        !draft ||
        !draft.follow_up_body
          ?.trim()
      ) {
        result.skipped +=
          1;

        result.results.push({
          leadId:
            lead.id,

          companyName,

          draftId:
            null,

          result:
            "SKIPPED",

          reason:
            "No unsent follow-up draft exists.",
        });

        continue;
      }

      draftId =
        draft.id;

      let quality;

      try {
        quality =
          await loadOutreachQuality({
            supabase,

            userId,

            leadId:
              lead.id,

            draftId:
              draft.id,
          });
      } catch (
        error
      ) {
        const message =
          `Pre-send quality check failed: ${errorMessage(
            error
          )}`;

        await supabase
          .from(
            "outreach_drafts"
          )
          .update({
            follow_up_send_error:
              message,
          })
          .eq(
            "id",
            draft.id
          )
          .eq(
            "user_id",
            userId
          );

        result.skipped +=
          1;

        result.results.push({
          leadId:
            lead.id,

          companyName,

          draftId:
            draft.id,

          result:
            "SKIPPED",

          reason:
            message,
        });

        continue;
      }

      const qualityError =
        getOutreachQualityBlockingMessage(
          quality
        );

      if (
        qualityError
      ) {
        const message =
          `Quality gate: ${qualityError}`;

        await supabase
          .from(
            "outreach_drafts"
          )
          .update({
            follow_up_send_error:
              message,
          })
          .eq(
            "id",
            draft.id
          )
          .eq(
            "user_id",
            userId
          );

        result.skipped +=
          1;

        result.results.push({
          leadId:
            lead.id,

          companyName,

          draftId:
            draft.id,

          result:
            "SKIPPED",

          reason:
            message,
        });

        continue;
      }

      const startedAt =
        new Date()
          .toISOString();

      const {
        data:
          claimed,
        error:
          claimError,
      } =
        await supabase
          .from(
            "outreach_drafts"
          )
          .update({
            follow_up_sending_started_at:
              startedAt,

            follow_up_send_error:
              null,
          })
          .eq(
            "id",
            draft.id
          )
          .eq(
            "user_id",
            userId
          )
          .eq(
            "status",
            "SENT"
          )
          .is(
            "follow_up_sent_at",
            null
          )
          .is(
            "follow_up_sending_started_at",
            null
          )
          .select(
            "id"
          )
          .maybeSingle();

      if (
        claimError
      ) {
        throw new Error(
          claimError.message
        );
      }

      if (
        !claimed
      ) {
        result.skipped +=
          1;

        result.results.push({
          leadId:
            lead.id,

          companyName,

          draftId:
            draft.id,

          result:
            "SKIPPED",

          reason:
            "Follow-up is already sending or was already sent.",
        });

        continue;
      }

      let gmailResult: {
        messageId:
          string;

        threadId:
          string
          | null;
      };

      try {
        gmailResult =
          await sendGmailMessage({
            fromEmail:
              gmailConnection.email_address,

            toEmail:
              recipientEmail,

            subject:
              draft.subject,

            body:
              draft.follow_up_body,

            encryptedRefreshToken:
              gmailConnection.encrypted_refresh_token,
          });
      } catch (
        error
      ) {
        const quotaError =
          isGmailQuotaError(
            error
          );

        const message =
          quotaError
            ? gmailQuotaReason()
            : errorMessage(
                error
              );

        if (
          quotaError
        ) {
          gmailQuotaBlocked =
            true;
        }

        await supabase
          .from(
            "outreach_drafts"
          )
          .update({
            follow_up_sending_started_at:
              null,

            follow_up_send_error:
              message,
          })
          .eq(
            "id",
            draft.id
          )
          .eq(
            "user_id",
            userId
          );

        result.failed +=
          1;

        result.results.push({
          leadId:
            lead.id,

          companyName,

          draftId:
            draft.id,

          result:
            "FAILED",

          reason:
            message,
        });

        continue;
      }

      const sentAt =
        new Date()
          .toISOString();

      const {
        error:
          draftUpdateError,
      } =
        await supabase
          .from(
            "outreach_drafts"
          )
          .update({
            follow_up_sent_at:
              sentAt,

            follow_up_sent_to:
              recipientEmail,

            gmail_follow_up_message_id:
              gmailResult.messageId,

            gmail_follow_up_thread_id:
              gmailResult.threadId,

            follow_up_sending_started_at:
              null,

            follow_up_send_error:
              null,
          })
          .eq(
            "id",
            draft.id
          )
          .eq(
            "user_id",
            userId
          )
          .is(
            "follow_up_sent_at",
            null
          );

      if (
        draftUpdateError
      ) {
        /*
         * Gmail already accepted the email. Never make this
         * follow-up retryable here, otherwise a duplicate send
         * could happen.
         */
        console.error(
          `CRITICAL: Follow-up ${draft.id} was sent but could not be marked sent:`,
          draftUpdateError
        );

        result.failed +=
          1;

        result.results.push({
          leadId:
            lead.id,

          companyName,

          draftId:
            draft.id,

          result:
            "FAILED",

          reason:
            "Gmail sent the message, but Leadbase could not persist the sent state. Do not retry this lead manually.",
        });

        continue;
      }

      const {
        error:
          leadUpdateError,
      } =
        await supabase
          .from(
            "leads"
          )
          .update({
            last_contacted_at:
              sentAt,

            next_follow_up_at:
              null,

            smart_follow_up_mode:
              "STOPPED",

            smart_follow_up_reason:
              "Follow-up sent.",

            smart_follow_up_updated_at:
              sentAt,
          })
          .eq(
            "id",
            lead.id
          )
          .eq(
            "user_id",
            userId
          );

      if (
        leadUpdateError
      ) {
        console.error(
          `Follow-up sent but lead ${lead.id} could not be updated:`,
          leadUpdateError
        );
      }

      const {
        error:
          activityError,
      } =
        await supabase
          .from(
            "activities"
          )
          .insert({
            user_id:
              userId,

            lead_id:
              lead.id,

            activity_type:
              "EMAIL_SENT",

            title:
              "Follow-up email sent",

            description:
              `Follow-up email sent to ${recipientEmail}.`,
          });

      if (
        activityError
      ) {
        console.error(
          "Follow-up sent but activity logging failed:",
          activityError
        );
      }

      result.sent +=
        1;

      result.results.push({
        leadId:
          lead.id,

        companyName,

        draftId:
          draft.id,

        result:
          "SENT",
      });

      successfulSendsInRun +=
        1;

      /*
       * Avoid bursting the Gmail API when several selected
       * follow-ups are processed in one manual run.
       */
      if (
        successfulSendsInRun >
        0
      ) {
        await sleep(
          1250
        );
      }
    } catch (
      error
    ) {
      result.failed +=
        1;

      result.results.push({
        leadId:
          lead.id,

        companyName,

        draftId,

        result:
          "FAILED",

        reason:
          errorMessage(
            error
          ),
      });
    }
  }

  return result;
}

/* =========================================================
   AUTOMATIC WORKER

   Only users who explicitly enabled automatic follow-ups
   are processed. Default is OFF.
========================================================= */

export async function runAutomaticFollowUpWorker({
  maxUsers = 10,
  perUserLimit = 10,
}: {
  maxUsers?:
    number;

  perUserLimit?:
    number;
} = {}) {
  const supabase =
    createAdminClient();

  const {
    data:
      preferences,
    error,
  } =
    await supabase
      .from(
        "outreach_preferences"
      )
      .select(
        "user_id"
      )
      .eq(
        "automatic_follow_ups",
        true
      )
      .limit(
        maxUsers
      );

  if (
    error
  ) {
    /*
     * During rollout, the cron must continue handling the
     * existing scheduled-email worker even if the migration
     * has not been installed yet.
     */
    console.error(
      "Could not load automatic follow-up preferences:",
      error
    );

    return {
      enabledUsers:
        0,

      checked:
        0,

      sent:
        0,

      skipped:
        0,

      failed:
        0,
    };
  }

  let checked =
    0;

  let sent =
    0;

  let skipped =
    0;

  let failed =
    0;

  for (
    const preference of
      preferences ??
      []
  ) {
    const result =
      await sendDueFollowUpsForUser({
        userId:
          preference.user_id,

        limit:
          perUserLimit,
      });

    checked +=
      result.checked;

    sent +=
      result.sent;

    skipped +=
      result.skipped;

    failed +=
      result.failed;
  }

  return {
    enabledUsers:
      preferences
        ?.length ??
      0,

    checked,

    sent,

    skipped,

    failed,
  };
}
