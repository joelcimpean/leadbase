import "server-only";

import type {
  GmailInlineImage,
} from "@/lib/gmail-send";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

/* =========================================================
   CONFIG
========================================================= */

const PREVIEW_GIF_BUCKET =
  "preview-gifs";

export const OUTREACH_PREVIEW_GIF_CID =
  "leadbase-preview-gif";

/* =========================================================
   LOAD INLINE GIF
========================================================= */

export async function loadOutreachPreviewGifInlineImage(
  storagePath:
    string
): Promise<
  GmailInlineImage
  | null
> {
  const cleanPath =
    storagePath.trim();

  if (
    !cleanPath
  ) {
    return null;
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .storage
      .from(
        PREVIEW_GIF_BUCKET
      )
      .download(
        cleanPath
      );

  if (
    error ||
    !data
  ) {
    console.error(
      "Could not download outreach preview GIF:",
      error
    );

    return null;
  }

  const arrayBuffer =
    await data.arrayBuffer();

  const content =
    Buffer.from(
      arrayBuffer
    );

  if (
    content.byteLength <
    1000
  ) {
    console.error(
      "Outreach preview GIF is unexpectedly small."
    );

    return null;
  }

  return {
    filename:
      "website-preview.gif",

    contentType:
      "image/gif",

    content,

    contentId:
      OUTREACH_PREVIEW_GIF_CID,
  };
}
