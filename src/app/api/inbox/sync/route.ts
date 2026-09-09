import {
  revalidatePath,
} from "next/cache";

import {
  NextResponse,
} from "next/server";

import {
  setGmailQuotaCooldownForCurrentUser,
  syncGmailRepliesForCurrentUser,
} from "@/lib/gmail-sync";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function isGmailQuotaError(
  error: unknown
) {
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? "");

  return (
    message.includes(
      "Quota exceeded"
    ) ||
    message.includes(
      "Total Query Cost"
    ) ||
    message.includes(
      "Units per minute per user"
    )
  );
}

function revalidateInboxSurfaces() {
  revalidatePath("/inbox");
  revalidatePath("/leads");
  revalidatePath("/campaigns");
  revalidatePath("/", "layout");
}

export async function POST() {
  try {
    const result =
      await syncGmailRepliesForCurrentUser({
        mode: "auto",
      });

    if (
      "skipped" in result &&
      result.skipped
    ) {
      return NextResponse.json({
        ok: true,
        newReplies: 0,
        skipped: true,
      });
    }

    if (
      result.newReplies > 0
    ) {
      revalidateInboxSurfaces();
    }

    return NextResponse.json({
      ok: true,
      newReplies:
        result.newReplies,
    });
  } catch (error) {
    if (
      isGmailQuotaError(error)
    ) {
      console.warn(
        "Automatic inbox sync paused: Gmail per-user quota reached."
      );

      await setGmailQuotaCooldownForCurrentUser();

      return NextResponse.json({
        ok: false,
        newReplies: 0,
        error:
          "GMAIL_QUOTA_COOLDOWN",
      });
    }

    console.error(
      "Automatic inbox sync failed:",
      error
    );

    return NextResponse.json({
      ok: false,
      newReplies: 0,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    });
  }
}
