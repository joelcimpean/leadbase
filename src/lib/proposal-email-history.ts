import {
  isAutomaticReply,
} from "@/lib/email-message-classification";

export type ProposalHistoryMessage = {
  direction?: string | null;
  subject?: string | null;
  body_text?: string | null;
  received_at?: string | null;
  reply_classification?: string | null;
};

export type ProposalHistoryAssessment = {
  ready: boolean;
  reason:
    | "READY"
    | "NO_MESSAGES"
    | "NO_OUTGOING"
    | "NO_CUSTOMER_REPLY"
    | "LATEST_REPLY_NOT_USEFUL";
};

const BLOCKED_REPLY_CLASSIFICATIONS = new Set([
  "OUT_OF_OFFICE",
  "BOUNCE",
  "NOT_INTERESTED",
]);

function normalizedTextLength(
  value?: string | null
) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .length;
}

function messageTime(
  value?: string | null
) {
  const time = value
    ? new Date(value).getTime()
    : 0;

  return Number.isFinite(time)
    ? time
    : 0;
}

export function isUsefulIncomingProposalMessage(
  message: ProposalHistoryMessage
) {
  if (message.direction !== "INCOMING") {
    return false;
  }

  const classification =
    message.reply_classification
      ?.trim()
      .toUpperCase() ?? "";

  if (
    classification &&
    BLOCKED_REPLY_CLASSIFICATIONS.has(
      classification
    )
  ) {
    return false;
  }

  if (
    isAutomaticReply({
      subject: message.subject,
      body: message.body_text,
    })
  ) {
    return false;
  }

  /*
   * Keep this deliberately low enough for concise human replies
   * like "Ja, gerne." while still rejecting empty/noise messages.
   */
  return (
    normalizedTextLength(
      message.body_text
    ) >= 8
  );
}

export function isUsefulOutgoingProposalMessage(
  message: ProposalHistoryMessage
) {
  return (
    message.direction === "OUTGOING" &&
    normalizedTextLength(
      message.body_text
    ) >= 30
  );
}

export function assessProposalEmailHistory(
  messages:
    ProposalHistoryMessage[]
) : ProposalHistoryAssessment {
  if (messages.length === 0) {
    return {
      ready: false,
      reason: "NO_MESSAGES",
    };
  }

  if (
    !messages.some(
      isUsefulOutgoingProposalMessage
    )
  ) {
    return {
      ready: false,
      reason: "NO_OUTGOING",
    };
  }

  const incoming =
    messages
      .filter(
        (message) =>
          message.direction ===
          "INCOMING"
      )
      .sort(
        (a, b) =>
          messageTime(
            b.received_at
          ) -
          messageTime(
            a.received_at
          )
      );

  if (incoming.length === 0) {
    return {
      ready: false,
      reason: "NO_CUSTOMER_REPLY",
    };
  }

  if (
    !isUsefulIncomingProposalMessage(
      incoming[0]
    )
  ) {
    return {
      ready: false,
      reason:
        "LATEST_REPLY_NOT_USEFUL",
    };
  }

  return {
    ready: true,
    reason: "READY",
  };
}

export function filterProposalHistoryForAi<
  T extends ProposalHistoryMessage
>(
  messages: T[]
): T[] {
  return messages.filter(
    (message) =>
      isUsefulOutgoingProposalMessage(
        message
      ) ||
      isUsefulIncomingProposalMessage(
        message
      )
  );
}
