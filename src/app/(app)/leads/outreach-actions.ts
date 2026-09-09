"use server";

import {
  randomBytes,
} from "node:crypto";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  generateOutreachDraft,
} from "@/lib/outreach-generation";

import {
  sendGmailMessage,
  sendGmailThreadFollowUp,
} from "@/lib/gmail-send";

import {
  buildOutreachHtmlEmail,
} from "@/lib/outreach-email-html";

import {
  loadOutreachPreviewGifInlineImage,
  OUTREACH_PREVIEW_GIF_CID,
} from "@/lib/outreach-preview-gif";

import {
  assessEmailQuality,
} from "@/lib/email-quality";

import {
  getOutreachQualityBlockingMessage,
  loadOutreachQuality,
} from "@/lib/outreach-quality";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  assertAiUsageAvailable,
  recordAiUsage,
} from "@/lib/ai-usage";

/* =========================================================
   CONFIG
========================================================= */

const OUTREACH_SIGNATURE = [
  "Mit freundlichen Grüßen / Kind regards,",
  "",
  "Joel Cimpean",
  "hello@joelcimpean.com / joelcimpean.com",
].join("\n");

const SIGNATURE_MARKER =
  "Mit freundlichen Grüßen / Kind regards,";

const GMAIL_SEND_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

const FOLLOW_UP_DELAY_DAYS =
  5;

type ServerSupabaseClient =
  Awaited<
    ReturnType<
      typeof createClient
    >
  >;

/* =========================================================
   HELPERS
========================================================= */

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

function getRecord(
  value:
    unknown
): Record<
  string,
  unknown
> | null {
  if (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return null;
}

function getString(
  value:
    unknown
) {
  return typeof value ===
      "string"
    ? value
    : null;
}

function getStringArray(
  value:
    unknown
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item ===
      "string"
  );
}

function getLastName(
  fullName:
    string
) {
  const parts =
    fullName
      .trim()
      .split(
        /\s+/
      )
      .filter(
        Boolean
      );

  if (
    parts.length ===
    0
  ) {
    return "";
  }

  if (
    parts.length ===
    1
  ) {
    return parts[0];
  }

  const particles =
    new Set([
      "von",
      "van",
      "de",
      "der",
      "den",
      "zu",
      "zur",
    ]);

  let start =
    parts.length -
    1;

  while (
    start >
      0 &&
    particles.has(
      parts[
        start -
        1
      ].toLowerCase()
    )
  ) {
    start -=
      1;
  }

  return parts
    .slice(
      start
    )
    .join(
      " "
    );
}

function getGreeting(
  fullName:
    string,
  salutation:
    | "HERR"
    | "FRAU"
    | null
) {
  if (
    salutation ===
    "HERR"
  ) {
    return `Sehr geehrter Herr ${getLastName(
      fullName
    )},`;
  }

  if (
    salutation ===
    "FRAU"
  ) {
    return `Sehr geehrte Frau ${getLastName(
      fullName
    )},`;
  }

  return "Guten Tag,";
}

function normalizeTextBlock(
  value:
    string
) {
  return value
    .replace(
      /\r\n/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

function removeExistingSignature(
  value:
    string
) {
  const normalized =
    normalizeTextBlock(
      value
    );

  const signatureIndex =
    normalized.indexOf(
      SIGNATURE_MARKER
    );

  if (
    signatureIndex ===
      -1
  ) {
    return normalized;
  }

  return normalized
    .slice(
      0,
      signatureIndex
    )
    .trim();
}

function ensureSignature(
  value:
    string
) {
  const message =
    removeExistingSignature(
      value
    );

  if (
    !message
  ) {
    return OUTREACH_SIGNATURE;
  }

  return `${message}\n\n${OUTREACH_SIGNATURE}`;
}

function replaceOpeningGreeting(
  value:
    string,
  greeting:
    string
) {
  const normalized =
    value.replace(
      /\r\n/g,
      "\n"
    );

  const lines =
    normalized.split(
      "\n"
    );

  const firstMeaningfulIndex =
    lines.findIndex(
      (
        line
      ) =>
        line.trim()
          .length >
        0
    );

  if (
    firstMeaningfulIndex ===
    -1
  ) {
    return value;
  }

  const firstLine =
    lines[
      firstMeaningfulIndex
    ]
      .trim()
      .toLowerCase();

  const looksLikeGreeting =
    firstLine.startsWith(
      "guten tag"
    ) ||
    firstLine.startsWith(
      "sehr geehrter"
    ) ||
    firstLine.startsWith(
      "sehr geehrte"
    ) ||
    firstLine.startsWith(
      "hallo"
    );

  if (
    looksLikeGreeting
  ) {
    lines[
      firstMeaningfulIndex
    ] =
      greeting;

    return lines.join(
      "\n"
    );
  }

  return `${greeting}\n\n${normalized.trim()}`;
}

function isReasonableEmail(
  value:
    string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function getErrorMessage(
  error:
    unknown
) {
  if (
    error instanceof
      Error
  ) {
    return error.message;
  }

  return "Unknown email sending error.";
}

function revalidateLead(
  leadId:
    string
) {
  revalidatePath(
    `/leads/${leadId}`
  );

  revalidatePath(
    "/leads"
  );

  revalidatePath(
    "/campaigns"
  );
}

/* =========================================================
   EMAIL SAFETY
========================================================= */

async function loadLeadEmailSafety({
  supabase,
  userId,
  leadId,
}: {
  supabase:
    ServerSupabaseClient;

  userId:
    string;

  leadId:
    string;
}) {
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
        id,
        status,

        company:companies (
          id,
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
        leadId
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (
    error ||
    !lead
  ) {
    return {
      ok:
        false as const,

      error:
        error?.message ??
        "Lead not found.",
    };
  }

  const company =
    getSingleRelation(
      lead.company
    );

  const contact =
    getSingleRelation(
      lead.primary_contact
    );

  const assessment =
    assessEmailQuality({
      currentEmail:
        contact?.email ??
        null,

      websiteUrl:
        company?.website_url ??
        null,

      /*
       * When the analyzer found a different public address,
       * keep using it as the comparison candidate.
       *
       * When the current email itself was verified on the
       * website, pass it back as discovered evidence.
       */
      discoveredEmail:
        contact?.email_candidate ??
        (
          contact?.email_quality_status ===
            "VERIFIED_WEBSITE"
            ? contact.email
            : null
        ),

      discoveredEmailSourceUrl:
        contact?.email_candidate_source_url ??
        contact?.email_source_url ??
        null,
    });

  return {
    ok:
      true as const,

    lead,

    company,

    contact,

    assessment,
  };
}

async function setDraftEmailSafetyError({
  supabase,
  userId,
  leadId,
  draftId,
  message,
}: {
  supabase:
    ServerSupabaseClient;

  userId:
    string;

  leadId:
    string;

  draftId:
    string;

  message:
    string;
}) {
  const {
    error,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        send_error:
          message,
      })
      .eq(
        "id",
        draftId
      )
      .eq(
        "lead_id",
        leadId
      )
      .eq(
        "user_id",
        userId
      );

  if (
    error
  ) {
    console.error(
      "Could not save email safety error:",
      error
    );
  }
}

/* =========================================================
   FULL PRE-SEND QUALITY GATE
========================================================= */

async function getPreSendQualityOrError({
  supabase,
  userId,
  leadId,
  draftId,
}: {
  supabase:
    ServerSupabaseClient;

  userId:
    string;

  leadId:
    string;

  draftId:
    string;
}) {
  try {
    const quality =
      await loadOutreachQuality({
        supabase,

        userId,

        leadId,

        draftId,
      });

    return {
      ok:
        true as const,

      quality,
    };
  } catch (
    error
  ) {
    return {
      ok:
        false as const,

      error:
        error instanceof
          Error
          ? error.message
          : "Pre-send quality check failed.",
    };
  }
}

/* =========================================================
   PUBLIC BASE URL
========================================================= */

async function getPublicBaseUrl() {
  const configured =
    process.env
      .PUBLIC_PREVIEW_BASE_URL
      ?.trim();

  if (
    configured
  ) {
    return configured.replace(
      /\/+$/,
      ""
    );
  }

  /*
   * Outreach drafts are customer-facing. Never save a
   * localhost URL into an email draft, even when the draft
   * is generated during local development.
   */
  return "https://leadbase.joelcimpean.com";
}

/* =========================================================
   CUSTOMER PREVIEW
========================================================= */

function slugifyPreview(
  value:
    string
) {
  const result =
    value
      .normalize(
        "NFKD"
      )
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /ß/g,
        "ss"
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        48
      );

  return (
    result ||
    "designkonzept"
  );
}

function createPreviewSlug(
  companyName:
    string
) {
  const suffix =
    randomBytes(
      4
    ).toString(
      "hex"
    );

  return `${slugifyPreview(
    companyName
  )}-${suffix}`;
}

function isPublishableDesignSnapshot(
  value:
    unknown
) {
  const record =
    getRecord(
      value
    );

  if (
    !record
  ) {
    return false;
  }

  return (
    record.version ===
      3 &&
    record.renderMode ===
      "html" &&
    typeof record.html ===
      "string" &&
    record.html.trim()
      .length >=
      500
  );
}

async function getSelectedDesignForPreview({
  supabase,
  userId,
  leadId,
}: {
  supabase:
    ServerSupabaseClient;

  userId:
    string;

  leadId:
    string;
}) {
  const {
    data:
      selected,
    error:
      selectedError,
  } =
    await supabase
      .from(
        "design_mockup_variants"
      )
      .select(`
        id,
        source_snapshot,
        generation_index,
        selected,
        selected_at,
        created_at
      `)
      .eq(
        "user_id",
        userId
      )
      .eq(
        "lead_id",
        leadId
      )
      .eq(
        "selected",
        true
      )
      .order(
        "selected_at",
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
    selectedError
  ) {
    throw new Error(
      selectedError.message
    );
  }

  if (
    selected
  ) {
    return selected;
  }

  /*
   * Defensive fallback for older rows without a selected
   * variant. This mirrors the public-share route.
   */
  const {
    data:
      latest,
    error:
      latestError,
  } =
    await supabase
      .from(
        "design_mockup_variants"
      )
      .select(`
        id,
        source_snapshot,
        generation_index,
        selected,
        selected_at,
        created_at
      `)
      .eq(
        "user_id",
        userId
      )
      .eq(
        "lead_id",
        leadId
      )
      .order(
        "generation_index",
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
    latestError
  ) {
    throw new Error(
      latestError.message
    );
  }

  return latest;
}

async function getExistingPreviewForVariant({
  supabase,
  userId,
  variantId,
}: {
  supabase:
    ServerSupabaseClient;

  userId:
    string;

  variantId:
    string;
}) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "design_public_previews"
      )
      .select(`
        id,
        public_slug,
        view_count,
        last_viewed_at,
        expires_at,
        revoked_at
      `)
      .eq(
        "user_id",
        userId
      )
      .eq(
        "design_mockup_variant_id",
        variantId
      )
      .maybeSingle();

  if (
    error
  ) {
    throw new Error(
      error.message
    );
  }

  return data;
}

async function ensureActiveCustomerPreviewUrl({
  supabase,
  userId,
  leadId,
  companyName,
  websiteUrl,
}: {
  supabase:
    ServerSupabaseClient;

  userId:
    string;

  leadId:
    string;

  companyName:
    string;

  websiteUrl:
    string
    | null;
}) {
  const selected =
    await getSelectedDesignForPreview({
      supabase,
      userId,
      leadId,
    });

  if (
    !selected ||
    !isPublishableDesignSnapshot(
      selected.source_snapshot
    )
  ) {
    return null;
  }

  const baseUrl =
    await getPublicBaseUrl();

  if (
    !baseUrl
  ) {
    return null;
  }

  /*
   * Only one customer-facing design should be active for a
   * lead. Publishing a different selected variant revokes
   * older links.
   */
  const {
    error:
      revokeOtherError,
  } =
    await supabase
      .from(
        "design_public_previews"
      )
      .update({
        revoked_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "lead_id",
        leadId
      )
      .neq(
        "design_mockup_variant_id",
        selected.id
      )
      .is(
        "revoked_at",
        null
      );

  if (
    revokeOtherError
  ) {
    throw new Error(
      revokeOtherError.message
    );
  }

  const existing =
    await getExistingPreviewForVariant({
      supabase,
      userId,
      variantId:
        selected.id,
    });

  if (
    existing
  ) {
    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "design_public_previews"
        )
        .update({
          revoked_at:
            null,

          expires_at:
            null,

          source_snapshot:
            selected.source_snapshot,

          source_brand_name:
            companyName,

          source_website_url:
            websiteUrl,
        })
        .eq(
          "id",
          existing.id
        )
        .eq(
          "user_id",
          userId
        );

    if (
      updateError
    ) {
      throw new Error(
        updateError.message
      );
    }

    return `${baseUrl}/concept/${encodeURIComponent(
      existing.public_slug
    )}`;
  }

  let lastInsertError:
    string
    | null =
    null;

  for (
    let attempt =
      0;
    attempt <
      4;
    attempt +=
      1
  ) {
    const publicSlug =
      createPreviewSlug(
        companyName
      );

    const {
      data:
        created,
      error:
        createError,
    } =
      await supabase
        .from(
          "design_public_previews"
        )
        .insert({
          user_id:
            userId,

          lead_id:
            leadId,

          design_mockup_variant_id:
            selected.id,

          public_slug:
            publicSlug,

          source_snapshot:
            selected.source_snapshot,

          source_brand_name:
            companyName,

          source_website_url:
            websiteUrl,

          expires_at:
            null,

          revoked_at:
            null,
        })
        .select(
          "public_slug"
        )
        .single();

    if (
      !createError &&
      created
    ) {
      return `${baseUrl}/concept/${encodeURIComponent(
        created.public_slug
      )}`;
    }

    lastInsertError =
      createError?.message ??
      "Unknown preview insert error.";

    /*
     * Handles two requests creating the same variant share
     * at nearly the same time.
     */
    const concurrent =
      await getExistingPreviewForVariant({
        supabase,
        userId,
        variantId:
          selected.id,
      });

    if (
      concurrent
    ) {
      return `${baseUrl}/concept/${encodeURIComponent(
        concurrent.public_slug
      )}`;
    }
  }

  throw new Error(
    lastInsertError ??
    "Could not create customer preview."
  );
}

/* =========================================================
   OUTREACH TRACKING URL
========================================================= */

function getOutreachPreviewUrl(
  previewUrl:
    string
) {
  try {
    const url =
      new URL(
        previewUrl
      );

    url.searchParams.set(
      "src",
      "outreach"
    );

    return url.toString();
  } catch {
    const separator =
      previewUrl.includes(
        "?"
      )
        ? "&"
        : "?";

    return `${previewUrl}${separator}src=outreach`;
  }
}

/* =========================================================
   INSERT CUSTOMER PREVIEW INTO EMAIL
========================================================= */

function addCustomerPreviewToBody(
  value:
    string,
  previewUrl:
    string
    | null
) {
  const message =
    removeExistingSignature(
      value
    );

  if (
    !previewUrl
  ) {
    return message;
  }

  const trackedPreviewUrl =
    getOutreachPreviewUrl(
      previewUrl
    );

  if (
    message.includes(
      previewUrl
    ) ||
    message.includes(
      trackedPreviewUrl
    )
  ) {
    return message;
  }

  const previewBlock = [
    "Ich habe Ihnen auf Basis Ihres aktuellen Webauftritts außerdem eine unverbindliche Designvorschau vorbereitet. Sie zeigt eine mögliche Richtung – ein finales Konzept würde selbstverständlich noch individueller auf Ihr Unternehmen, Ihre Ziele und Inhalte abgestimmt werden:",
    trackedPreviewUrl,
  ].join(
    "\n"
  );

  return `${message}\n\n${previewBlock}`;
}

function addCustomerPreviewToFollowUp(
  value:
    string,
  previewUrl:
    string
    | null
) {
  const message =
    removeExistingSignature(
      value
    );

  if (
    !previewUrl
  ) {
    return message;
  }

  const trackedPreviewUrl =
    getOutreachPreviewUrl(
      previewUrl
    );

  if (
    message.includes(
      previewUrl
    ) ||
    message.includes(
      trackedPreviewUrl
    )
  ) {
    return message;
  }

  return `${message}\n\nHier ist die Vorschau noch einmal:\n${trackedPreviewUrl}`;
}

/* =========================================================
   OUTREACH CREATION CORE
========================================================= */

type CreateOutreachResult =
  | {
      status:
        "created";

      previewUrl:
        string
        | null;
    }
  | {
      status:
        "skipped";

      reason:
        string;
    };

async function createLeadOutreachDraft({
  supabase,
  userId,
  leadId,
  requirePreview,
  skipExistingDraft,
}: {
  supabase:
    ServerSupabaseClient;

  userId:
    string;

  leadId:
    string;

  requirePreview:
    boolean;

  skipExistingDraft:
    boolean;
}): Promise<CreateOutreachResult> {
  if (
    skipExistingDraft
  ) {
    const {
      data:
        existingDraft,
      error:
        existingDraftError,
    } =
      await supabase
        .from(
          "outreach_drafts"
        )
        .select(
          "id, status"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "lead_id",
          leadId
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
      existingDraftError
    ) {
      throw new Error(
        existingDraftError.message
      );
    }

    if (
      existingDraft
    ) {
      return {
        status:
          "skipped",

        reason:
          "A draft already exists for this lead.",
      };
    }
  }

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
        status,
        campaign_id,

        structural_score,
        visual_score,
        opportunity_score,
        redesign_potential,

        research_summary,
        visual_analysis,

        company:companies (
          id,
          name,
          industry,
          location,
          website_url,
          contact_form_url
        ),

        primary_contact:contacts (
          id,
          full_name,
          job_title,
          salutation,
          email
        ),

        campaign:campaigns (
          id,
          name,
          outreach_angle,
          email_tone
        )
      `)
      .eq(
        "id",
        leadId
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (
    leadError
  ) {
    throw new Error(
      leadError.message
    );
  }

  if (
    !lead
  ) {
    return {
      status:
        "skipped",

      reason:
        "Lead not found.",
    };
  }

  const company =
    getSingleRelation(
      lead.company
    );

  const contact =
    getSingleRelation(
      lead.primary_contact
    );

  const campaign =
    getSingleRelation(
      lead.campaign
    );

  if (
    !company
  ) {
    return {
      status:
        "skipped",

      reason:
        "Lead has no company.",
    };
  }

  let customerPreviewUrl:
    string
    | null =
    null;

  try {
    customerPreviewUrl =
      await ensureActiveCustomerPreviewUrl({
        supabase,
        userId,
        leadId:
          lead.id,
        companyName:
          company.name,
        websiteUrl:
          company.website_url,
      });
  } catch (
    error
  ) {
    console.error(
      `Could not create customer preview for lead ${lead.id}:`,
      error
    );

    if (
      requirePreview
    ) {
      return {
        status:
          "skipped",

        reason:
          "Customer preview could not be created.",
      };
    }
  }

  if (
    requirePreview &&
    !customerPreviewUrl
  ) {
    return {
      status:
        "skipped",

      reason:
        "No publishable redesign exists for this lead.",
    };
  }

  const visual =
    getRecord(
      lead.visual_analysis
    );

  const strengths =
    getStringArray(
      visual?.strengths
    );

  const weaknesses =
    getStringArray(
      visual?.weaknesses
    );

  const redesignReason =
    getString(
      visual?.redesignReason
    );

  const visualOutreachAngle =
    getString(
      visual?.outreachAngle
    );

  await assertAiUsageAvailable(userId);

  const generated =
    await generateOutreachDraft({
      companyName:
        company.name,

      industry:
        company.industry,

      location:
        company.location,

      contactName:
        contact?.full_name,

      contactJobTitle:
        contact?.job_title,

      contactSalutation:
        contact?.salutation ===
          "HERR" ||
        contact?.salutation ===
          "FRAU"
          ? contact.salutation
          : null,

      websiteUrl:
        company.website_url,

      campaignName:
        campaign?.name,

      campaignOutreachAngle:
        campaign?.outreach_angle,

      campaignEmailTone:
        campaign?.email_tone,

      researchSummary:
        lead.research_summary,

      structuralScore:
        lead.structural_score,

      visualScore:
        lead.visual_score,

      opportunityScore:
        lead.opportunity_score,

      redesignPotential:
        lead.redesign_potential,

      visualStrengths:
        strengths,

      visualWeaknesses:
        weaknesses,

      redesignReason,

      suggestedOutreachAngle:
        visualOutreachAngle,

      hasCustomerPreview:
        Boolean(
          customerPreviewUrl
        ),
    });

  const finalBody =
    ensureSignature(
      addCustomerPreviewToBody(
        generated.body,
        customerPreviewUrl
      )
    );

  const finalFollowUp =
    generated.followUpBody
      ?.trim()
      ? ensureSignature(
          addCustomerPreviewToFollowUp(
            generated.followUpBody,
            customerPreviewUrl
          )
        )
      : null;

  const channel =
    contact?.email
      ? "EMAIL"
      : company.contact_form_url
        ? "CONTACT_FORM"
        : "EMAIL";

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
      .insert({
        user_id:
          userId,

        lead_id:
          lead.id,

        campaign_id:
          lead.campaign_id,

        channel,

        language:
          "DE",

        subject:
          generated.subject,

        body:
          finalBody,

        follow_up_body:
          finalFollowUp,

        personalization_points:
          generated.personalizationPoints,

        status:
          "DRAFT",

        model:
          generated.model,

        input_tokens:
          generated.usage.inputTokens,

        output_tokens:
          generated.usage.outputTokens,

        total_tokens:
          generated.usage.totalTokens,
      })
      .select(
        "id"
      )
      .single();

  if (
    draftError ||
    !draft
  ) {
    throw new Error(
      draftError?.message ??
      "Could not save outreach draft."
    );
  }

  await recordAiUsage({
    userId,
    feature: "outreach_generation",
    model: generated.model,
    usage: generated.usage,
    requestKey: `outreach-draft:${draft.id}`,
    metadata: { leadId: lead.id, draftId: draft.id },
  });

  const earlyStatuses =
    new Set([
      "NEW",
      "RESEARCHING",
      "QUALIFIED",
    ]);

  if (
    earlyStatuses.has(
      lead.status
    )
  ) {
    const {
      error:
        statusError,
    } =
      await supabase
        .from(
          "leads"
        )
        .update({
          status:
            "DRAFT_READY",
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
      statusError
    ) {
      console.error(
        "Could not update lead status:",
        statusError
      );
    }
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
          "OUTREACH_DRAFT_GENERATED",

        title:
          "Outreach draft generated",

        description:
          customerPreviewUrl
            ? "A personalized German outreach draft with an automatically created customer preview was generated."
            : "A personalized German outreach draft was generated.",
      });

  if (
    activityError
  ) {
    console.error(
      "Could not create outreach activity:",
      activityError
    );
  }

  revalidateLead(
    lead.id
  );

  return {
    status:
      "created",

    previewUrl:
      customerPreviewUrl,
  };
}

/* =========================================================
   GENERATE OUTREACH — SINGLE LEAD
========================================================= */

export async function generateLeadOutreachDraft(
  formData:
    FormData
) {
  const leadId =
    formData.get(
      "leadId"
    );

  if (
    typeof leadId !==
      "string" ||
    !leadId
  ) {
    return;
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
    redirect(
      "/login"
    );
  }

  try {
    await createLeadOutreachDraft({
      supabase,
      userId:
        user.id,
      leadId,
      requirePreview:
        false,
      skipExistingDraft:
        false,
    });
  } catch (
    error
  ) {
    console.error(
      "Outreach generation failed:",
      error
    );

    return;
  }

  redirect(
    `/leads/${leadId}#outreach`
  );
}

/* =========================================================
   GENERATE OUTREACH — BULK ITEM
========================================================= */

export type BulkOutreachDraftResult =
  | {
      success:
        true;

      status:
        "created"
        | "skipped";

      reason?:
        string;
    }
  | {
      success:
        false;

      status:
        "failed";

      error:
        string;
    };

export async function generateLeadOutreachDraftForBulk(
  leadId:
    string
): Promise<BulkOutreachDraftResult> {
  if (
    typeof leadId !==
      "string" ||
    !leadId.trim()
  ) {
    return {
      success:
        false,

      status:
        "failed",

      error:
        "Invalid lead ID.",
    };
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
    return {
      success:
        false,

      status:
        "failed",

      error:
        "Unauthorized.",
    };
  }

  try {
    const result =
      await createLeadOutreachDraft({
        supabase,
        userId:
          user.id,
        leadId:
          leadId.trim(),
        requirePreview:
          true,
        skipExistingDraft:
          true,
      });

    if (
      result.status ===
        "skipped"
    ) {
      return {
        success:
          true,

        status:
          "skipped",

        reason:
          result.reason,
      };
    }

    return {
      success:
        true,

      status:
        "created",
    };
  } catch (
    error
  ) {
    console.error(
      `Bulk outreach generation failed for lead ${leadId}:`,
      error
    );

    return {
      success:
        false,

      status:
        "failed",

      error:
        getErrorMessage(
          error
        ),
    };
  }
}


/* =========================================================
   RESET SENT OUTREACH

   Use this when the original email went to a wrong /
   invalid recipient.

   This does NOT undo the Gmail message. It only resets the
   Leadbase state so the current draft can be reviewed,
   approved and sent again to the contact's CURRENT email.

   Any pending follow-up is cancelled. A new follow-up date
   will be scheduled automatically after the new send.
========================================================= */

export async function resetSentOutreachDraft(
  formData:
    FormData
) {
  const draftId =
    formData.get(
      "draftId"
    );

  const leadId =
    formData.get(
      "leadId"
    );

  if (
    typeof draftId !==
      "string" ||
    !draftId ||
    typeof leadId !==
      "string" ||
    !leadId
  ) {
    return;
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
    redirect(
      "/login"
    );
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
        follow_up_sent_at
      `)
      .eq(
        "id",
        draftId
      )
      .eq(
        "lead_id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    draftError ||
    !draft
  ) {
    console.error(
      "Could not load sent outreach draft for reset:",
      draftError
    );

    return;
  }

  if (
    draft.status !==
      "SENT"
  ) {
    console.warn(
      "Only a SENT outreach draft can be reset."
    );

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  /*
   * If the follow-up has already been sent, we do not reset
   * the original message. The UI also hides the button then.
   */
  if (
    draft.follow_up_sent_at
  ) {
    console.warn(
      "A sent outreach draft cannot be reset after its follow-up was already sent."
    );

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  const {
    data:
      resetDraft,
    error:
      resetError,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        status:
          "DRAFT",

        sent_at:
          null,

        sent_to:
          null,

        gmail_message_id:
          null,

        gmail_thread_id:
          null,

        sending_started_at:
          null,

        send_error:
          null,

        follow_up_sent_at:
          null,

        follow_up_sent_to:
          null,

        gmail_follow_up_message_id:
          null,

        gmail_follow_up_thread_id:
          null,

        follow_up_sending_started_at:
          null,

        follow_up_send_error:
          null,
      })
      .eq(
        "id",
        draftId
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
        "status",
        "SENT"
      )
      .is(
        "follow_up_sent_at",
        null
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    resetError
  ) {
    console.error(
      "Could not reset sent outreach draft:",
      resetError
    );

    return;
  }

  if (
    !resetDraft
  ) {
    console.warn(
      "Sent outreach draft was not reset because its state changed."
    );

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
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
        status:
          "DRAFT_READY",

        last_contacted_at:
          null,

        next_follow_up_at:
          null,
      })
      .eq(
        "id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    leadUpdateError
  ) {
    console.error(
      "Outreach draft was reset, but the lead state could not be reset:",
      leadUpdateError
    );
  }

  revalidateLead(
    leadId
  );

  redirect(
    `/leads/${leadId}#outreach`
  );
}

/* =========================================================
   UPDATE OUTREACH DRAFT
========================================================= */

export async function updateOutreachDraft(
  formData:
    FormData
) {
  const draftId =
    formData.get(
      "draftId"
    );

  const leadId =
    formData.get(
      "leadId"
    );

  const rawSubject =
    formData.get(
      "subject"
    );

  const rawBody =
    formData.get(
      "body"
    );

  const rawFollowUp =
    formData.get(
      "followUpBody"
    );

  if (
    typeof draftId !==
      "string" ||
    !draftId ||
    typeof leadId !==
      "string" ||
    !leadId ||
    typeof rawSubject !==
      "string" ||
    typeof rawBody !==
      "string"
  ) {
    return;
  }

  const subject =
    rawSubject.trim();

  const body =
    normalizeTextBlock(
      rawBody
    );

  const followUp =
    typeof rawFollowUp ===
      "string"
      ? normalizeTextBlock(
          rawFollowUp
        )
      : "";

  if (
    !subject ||
    !body
  ) {
    console.error(
      "Subject and body are required."
    );

    return;
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const {
    data:
      updatedDraft,

    error,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        subject,

        body:
          ensureSignature(
            body
          ),

        follow_up_body:
          followUp
            ? ensureSignature(
                followUp
              )
            : null,

        status:
          "DRAFT",

        send_error:
          null,
      })
      .eq(
        "id",
        draftId
      )
      .eq(
        "lead_id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      )
      .in(
        "status",
        [
          "DRAFT",
          "APPROVED",
        ]
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    error ||
    !updatedDraft
  ) {
    console.error(
      "Could not update outreach draft:",
      error
    );

    return;
  }

  revalidateLead(
    leadId
  );

  redirect(
    `/leads/${leadId}#outreach`
  );
}

/* =========================================================
   UPDATE CONTACT SALUTATION
========================================================= */

export async function updateLeadContactSalutation(
  formData:
    FormData
) {
  const leadId =
    formData.get(
      "leadId"
    );

  const contactId =
    formData.get(
      "contactId"
    );

  const rawSalutation =
    formData.get(
      "salutation"
    );

  if (
    typeof leadId !==
      "string" ||
    !leadId ||
    typeof contactId !==
      "string" ||
    !contactId
  ) {
    return;
  }

  const salutation:
    | "HERR"
    | "FRAU"
    | null =
    rawSalutation ===
      "HERR" ||
    rawSalutation ===
      "FRAU"
      ? rawSalutation
      : null;

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const {
    data:
      contact,

    error:
      contactLoadError,
  } =
    await supabase
      .from(
        "contacts"
      )
      .select(`
        id,
        full_name
      `)
      .eq(
        "id",
        contactId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    contactLoadError ||
    !contact
  ) {
    console.error(
      "Could not load contact:",
      contactLoadError
    );

    return;
  }

  const {
    error:
      updateError,
  } =
    await supabase
      .from(
        "contacts"
      )
      .update({
        salutation,
      })
      .eq(
        "id",
        contactId
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    updateError
  ) {
    console.error(
      "Could not update contact salutation:",
      updateError
    );

    return;
  }

  if (
    contact.full_name
  ) {
    const greeting =
      getGreeting(
        contact.full_name,
        salutation
      );

    const {
      data:
        latestDraft,

      error:
        draftLoadError,
    } =
      await supabase
        .from(
          "outreach_drafts"
        )
        .select(`
          id,
          body,
          follow_up_body
        `)
        .eq(
          "lead_id",
          leadId
        )
        .eq(
          "user_id",
          user.id
        )
        .in(
          "status",
          [
            "DRAFT",
            "APPROVED",
          ]
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
      draftLoadError
    ) {
      console.error(
        "Could not load latest draft:",
        draftLoadError
      );
    }

    if (
      latestDraft
    ) {
      const patchedBody =
        replaceOpeningGreeting(
          latestDraft.body,
          greeting
        );

      const patchedFollowUp =
        latestDraft.follow_up_body
          ? replaceOpeningGreeting(
              latestDraft.follow_up_body,
              greeting
            )
          : null;

      const {
        error:
          draftUpdateError,
      } =
        await supabase
          .from(
            "outreach_drafts"
          )
          .update({
            body:
              patchedBody,

            follow_up_body:
              patchedFollowUp,

            status:
              "DRAFT",

            send_error:
              null,
          })
          .eq(
            "id",
            latestDraft.id
          )
          .eq(
            "user_id",
            user.id
          );

      if (
        draftUpdateError
      ) {
        console.error(
          "Could not patch outreach greeting:",
          draftUpdateError
        );
      }
    }
  }

  revalidateLead(
    leadId
  );

  redirect(
    `/leads/${leadId}#outreach`
  );
}

/* =========================================================
   USE WEBSITE EMAIL CANDIDATE
========================================================= */

export async function applyDiscoveredEmailCandidate(
  formData:
    FormData
) {
  const leadId =
    formData.get(
      "leadId"
    );

  const contactId =
    formData.get(
      "contactId"
    );

  if (
    typeof leadId !==
      "string" ||
    !leadId ||
    typeof contactId !==
      "string" ||
    !contactId
  ) {
    return;
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const {
    data:
      contact,
    error:
      loadError,
  } =
    await supabase
      .from(
        "contacts"
      )
      .select(`
        id,
        email_candidate,
        email_candidate_source_url
      `)
      .eq(
        "id",
        contactId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    loadError ||
    !contact?.email_candidate
  ) {
    console.error(
      "Could not load discovered email candidate:",
      loadError
    );

    return;
  }

  const candidate =
    contact.email_candidate
      .trim()
      .toLowerCase();

  const {
    error:
      updateError,
  } =
    await supabase
      .from(
        "contacts"
      )
      .update({
        email:
          candidate,

        email_quality_status:
          "VERIFIED_WEBSITE",

        email_quality_detail:
          "Öffentliche Adresse von der Firmenwebsite übernommen.",

        email_source_url:
          contact
            .email_candidate_source_url,

        email_candidate:
          null,

        email_candidate_source_url:
          null,

        email_checked_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        contactId
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    updateError
  ) {
    console.error(
      "Could not apply discovered email candidate:",
      updateError
    );

    return;
  }

  /*
   * Recipient changed: force any unsent approved draft back
   * to DRAFT so the final recipient is reviewed once more.
   */
  const {
    error:
      draftResetError,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        status:
          "DRAFT",

        send_error:
          null,
      })
      .eq(
        "lead_id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      )
      .is(
        "sent_at",
        null
      )
      .in(
        "status",
        [
          "DRAFT",
          "APPROVED",
        ]
      );

  if (
    draftResetError
  ) {
    console.error(
      "Could not reset draft after recipient correction:",
      draftResetError
    );
  }

  revalidateLead(
    leadId
  );

  redirect(
    `/leads/${leadId}#outreach`
  );
}

/* =========================================================
   APPROVE DRAFT
========================================================= */

export async function approveOutreachDraft(
  formData:
    FormData
) {
  const draftId =
    formData.get(
      "draftId"
    );

  const leadId =
    formData.get(
      "leadId"
    );

  if (
    typeof draftId !==
      "string" ||
    !draftId ||
    typeof leadId !==
      "string" ||
    !leadId
  ) {
    return;
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/login"
    );
  }

  const preSendQuality =
    await getPreSendQualityOrError({
      supabase,

      userId:
        user.id,

      leadId,

      draftId,
    });

  if (
    !preSendQuality.ok
  ) {
    await setDraftEmailSafetyError({
      supabase,

      userId:
        user.id,

      leadId,

      draftId,

      message:
        `Versandprüfung fehlgeschlagen: ${preSendQuality.error}`,
    });

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  const qualityError =
    getOutreachQualityBlockingMessage(
      preSendQuality.quality
    );

  if (
    qualityError
  ) {
    await setDraftEmailSafetyError({
      supabase,

      userId:
        user.id,

      leadId,

      draftId,

      message:
        `Freigabe blockiert: ${qualityError}`,
    });

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  const {
    data:
      approvedDraft,

    error,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        status:
          "APPROVED",

        send_error:
          null,
      })
      .eq(
        "id",
        draftId
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
        "status",
        "DRAFT"
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    error ||
    !approvedDraft
  ) {
    console.error(
      "Could not approve outreach draft:",
      error
    );

    return;
  }

  revalidateLead(
    leadId
  );

  redirect(
    `/leads/${leadId}#outreach`
  );
}

/* =========================================================
   SEND APPROVED EMAIL
========================================================= */

export async function sendApprovedOutreachDraft(
  formData:
    FormData
) {
  const draftId =
    formData.get(
      "draftId"
    );

  const leadId =
    formData.get(
      "leadId"
    );

  if (
    typeof draftId !==
      "string" ||
    !draftId ||
    typeof leadId !==
      "string" ||
    !leadId
  ) {
    return;
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
    redirect(
      "/login"
    );
  }

  const preSendQuality =
    await getPreSendQualityOrError({
      supabase,

      userId:
        user.id,

      leadId,

      draftId,
    });

  if (
    !preSendQuality.ok
  ) {
    await setDraftEmailSafetyError({
      supabase,

      userId:
        user.id,

      leadId,

      draftId,

      message:
        `Versandprüfung fehlgeschlagen: ${preSendQuality.error}`,
    });

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  const qualityError =
    getOutreachQualityBlockingMessage(
      preSendQuality.quality
    );

  if (
    qualityError
  ) {
    await setDraftEmailSafetyError({
      supabase,

      userId:
        user.id,

      leadId,

      draftId,

      message:
        `Versand blockiert: ${qualityError}`,
    });

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
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
        lead_id,
        channel,
        status,
        subject,
        body,
        language,
        sent_at
      `)
      .eq(
        "id",
        draftId
      )
      .eq(
        "lead_id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    draftError ||
    !draft
  ) {
    console.error(
      "Could not load outreach draft for sending:",
      draftError
    );

    return;
  }

  if (
    draft.status ===
      "SENT" ||
    draft.sent_at
  ) {
    console.warn(
      "Attempted to send an already sent outreach draft."
    );

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  if (
    draft.status !==
    "APPROVED"
  ) {
    console.warn(
      "Only approved outreach drafts can be sent."
    );

    return;
  }

  if (
    draft.channel !==
    "EMAIL"
  ) {
    console.warn(
      "This outreach draft is not an email draft."
    );

    return;
  }

  if (
    !draft.subject
      ?.trim() ||
    !draft.body
      ?.trim()
  ) {
    console.error(
      "Draft subject or body is missing."
    );

    return;
  }

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
        status,
        outreach_gif_enabled,

        primary_contact:contacts (
          id,
          full_name,
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
    leadError ||
    !lead
  ) {
    console.error(
      "Could not load lead before sending:",
      leadError
    );

    return;
  }

  if (
    lead.status ===
    "DO_NOT_CONTACT"
  ) {
    console.warn(
      "Email sending blocked because the lead is marked Do Not Contact."
    );

    return;
  }

  const contact =
    getSingleRelation(
      lead.primary_contact
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
    console.error(
      "Lead has no valid recipient email."
    );

    return;
  }

  const {
    data:
      gmailConnection,

    error:
      gmailConnectionError,
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
        user.id
      )
      .maybeSingle();

  if (
    gmailConnectionError ||
    !gmailConnection
  ) {
    console.error(
      "Gmail is not connected:",
      gmailConnectionError
    );

    return;
  }

  const scopes =
    Array.isArray(
      gmailConnection.scopes
    )
      ? gmailConnection.scopes
      : [];

  if (
    !scopes.includes(
      GMAIL_SEND_SCOPE
    )
  ) {
    console.error(
      "Gmail connection does not have gmail.send permission."
    );

    return;
  }

  const startedAt =
    new Date()
      .toISOString();

  const {
    data:
      claimedDraft,

    error:
      claimError,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        status:
          "SENDING",

        sending_started_at:
          startedAt,

        send_error:
          null,
      })
      .eq(
        "id",
        draft.id
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "APPROVED"
      )
      .is(
        "sent_at",
        null
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (
    claimError
  ) {
    console.error(
      "Could not claim outreach draft for sending:",
      claimError
    );

    return;
  }

  if (
    !claimedDraft
  ) {
    console.warn(
      "Outreach draft is already being sent or was already sent."
    );

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  let htmlBody:
    | string
    | null =
      null;

  let inlinePreviewGif:
    Awaited<
      ReturnType<
        typeof loadOutreachPreviewGifInlineImage
      >
    > =
      null;

  if (
    lead.outreach_gif_enabled !==
      false
  ) {
    const {
      data:
        publicPreview,
      error:
        publicPreviewError,
    } =
      await supabase
        .from(
          "design_public_previews"
        )
        .select(`
          public_slug,
          preview_gif_status,
          preview_gif_path,
          revoked_at,
          expires_at,
          created_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "lead_id",
          leadId
        )
        .is(
          "revoked_at",
          null
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      publicPreviewError
    ) {
      console.error(
        "Could not load preview GIF for outreach. Falling back to plain text:",
        publicPreviewError
      );
    } else if (
      publicPreview &&
      publicPreview.preview_gif_status ===
        "READY" &&
      publicPreview.preview_gif_path &&
      (
        !publicPreview.expires_at ||
        new Date(
          publicPreview.expires_at
        ).getTime() >
          Date.now()
      )
    ) {
      inlinePreviewGif =
        await loadOutreachPreviewGifInlineImage(
          publicPreview.preview_gif_path
        );

      if (
        inlinePreviewGif
      ) {
        const publicBaseUrl =
          process.env.LEADBASE_PUBLIC_APP_URL ??
          "https://leadbase.joelcimpean.com";

        const previewUrl =
          `${publicBaseUrl.replace(
            /\/$/,
            ""
          )}/concept/${encodeURIComponent(
            publicPreview.public_slug
          )}?src=outreach`;

        htmlBody =
          buildOutreachHtmlEmail({
            textBody:
              draft.body,

            previewUrl,

            gifContentId:
              OUTREACH_PREVIEW_GIF_CID,

            language:
              draft.language,
          });
      }
    }
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
          draft.subject.trim(),

        body:
          draft.body,

        htmlBody,

        inlineImages:
          inlinePreviewGif
            ? [
                inlinePreviewGif,
              ]
            : [],

        encryptedRefreshToken:
          gmailConnection.encrypted_refresh_token,
      });
  } catch (
    error
  ) {
    const errorMessage =
      getErrorMessage(
        error
      );

    console.error(
      "Could not send outreach email:",
      error
    );

    const {
      error:
        rollbackError,
    } =
      await supabase
        .from(
          "outreach_drafts"
        )
        .update({
          status:
            "APPROVED",

          sending_started_at:
            null,

          send_error:
            errorMessage,
        })
        .eq(
          "id",
          draft.id
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "SENDING"
        );

    if (
      rollbackError
    ) {
      console.error(
        "Could not restore failed outreach draft:",
        rollbackError
      );
    }

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  const sentAt =
    new Date()
      .toISOString();

  const {
    error:
      sentUpdateError,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        status:
          "SENT",

        sent_at:
          sentAt,

        sent_to:
          recipientEmail,

        gmail_message_id:
          gmailResult.messageId,

        gmail_thread_id:
          gmailResult.threadId,

        sending_started_at:
          null,

        send_error:
          null,
      })
      .eq(
        "id",
        draft.id
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "status",
        "SENDING"
      );

  if (
    sentUpdateError
  ) {
    console.error(
      "Email was sent, but the database could not mark the draft as SENT:",
      sentUpdateError
    );

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  const nextFollowUp =
    new Date(
      Date.now() +
        FOLLOW_UP_DELAY_DAYS *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  const {
    error:
      leadUpdateError,
  } =
    await supabase
      .from(
        "leads"
      )
      .update({
        status:
          "CONTACTED",

        last_contacted_at:
          sentAt,

        next_follow_up_at:
          nextFollowUp,

        smart_follow_up_mode:
          "STANDARD",

        smart_follow_up_reason:
          "No customer engagement signal yet; standard 5-day follow-up remains.",

        smart_follow_up_updated_at:
          new Date()
            .toISOString(),

        manual_follow_up_stopped_at:
          null,
      })
      .eq(
        "id",
        lead.id
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    leadUpdateError
  ) {
    console.error(
      "Email was sent, but lead status could not be updated:",
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
          user.id,

        lead_id:
          lead.id,

        activity_type:
          "EMAIL_SENT",

        title:
          "Outreach email sent",

        description:
          `Email sent to ${recipientEmail}.`,
      });

  if (
    activityError
  ) {
    console.error(
      "Email was sent, but activity logging failed:",
      activityError
    );
  }

  revalidateLead(
    lead.id
  );

  redirect(
    `/leads/${lead.id}#outreach`
  );
}

/* =========================================================
   SEND FOLLOW-UP
========================================================= */

export async function sendFollowUpOutreachDraft(
  formData:
    FormData
) {
  const draftId =
    formData.get(
      "draftId"
    );

  const leadId =
    formData.get(
      "leadId"
    );

  if (
    typeof draftId !==
      "string" ||
    !draftId ||
    typeof leadId !==
      "string" ||
    !leadId
  ) {
    return;
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
    redirect(
      "/login"
    );
  }

  const emailSafety =
    await loadLeadEmailSafety({
      supabase,

      userId:
        user.id,

      leadId,
    });

  if (
    !emailSafety.ok ||
    emailSafety.assessment
      .blocksSending
  ) {
    const reason =
      emailSafety.ok
        ? emailSafety
            .assessment
            .detail
        : emailSafety.error;

    const {
      error:
        safetyError,
    } =
      await supabase
        .from(
          "outreach_drafts"
        )
        .update({
          follow_up_send_error:
            `Follow-up blockiert: ${reason}`,
        })
        .eq(
          "id",
          draftId
        )
        .eq(
          "lead_id",
          leadId
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      safetyError
    ) {
      console.error(
        "Could not save follow-up safety error:",
        safetyError
      );
    }

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
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
        lead_id,
        status,
        subject,
        follow_up_body,
        follow_up_sent_at,
        gmail_message_id,
        gmail_thread_id
      `)
      .eq(
        "id",
        draftId
      )
      .eq(
        "lead_id",
        leadId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    draftError ||
    !draft
  ) {
    console.error(
      "Could not load draft for follow-up:",
      draftError
    );

    return;
  }

  if (
    draft.status !==
    "SENT"
  ) {
    console.warn(
      "Follow-up can only be sent after the original email."
    );

    return;
  }

  if (
    draft.follow_up_sent_at
  ) {
    console.warn(
      "Follow-up has already been sent."
    );

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  if (
    !draft.follow_up_body
      ?.trim()
  ) {
    console.error(
      "No follow-up message exists."
    );

    return;
  }

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
        status,
        next_follow_up_at,

        primary_contact:contacts (
          id,
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
    leadError ||
    !lead
  ) {
    console.error(
      "Could not load lead for follow-up:",
      leadError
    );

    return;
  }

  if (
    lead.status ===
    "DO_NOT_CONTACT"
  ) {
    console.warn(
      "Follow-up blocked because lead is Do Not Contact."
    );

    return;
  }

  if (
    lead.next_follow_up_at &&
    new Date(
      lead.next_follow_up_at
    ).getTime() >
      Date.now()
  ) {
    console.warn(
      "Follow-up is not due yet."
    );

    return;
  }

  const contact =
    getSingleRelation(
      lead.primary_contact
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
    console.error(
      "No valid email found for follow-up."
    );

    return;
  }

  const {
    data:
      gmailConnection,

    error:
      gmailConnectionError,
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
        user.id
      )
      .maybeSingle();

  if (
    gmailConnectionError ||
    !gmailConnection
  ) {
    console.error(
      "Gmail is not connected:",
      gmailConnectionError
    );

    return;
  }

  const scopes =
    Array.isArray(
      gmailConnection.scopes
    )
      ? gmailConnection.scopes
      : [];

  if (
    !scopes.includes(
      GMAIL_SEND_SCOPE
    )
  ) {
    console.error(
      "Gmail connection has no send permission."
    );

    return;
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
        user.id
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
    console.error(
      "Could not claim follow-up:",
      claimError
    );

    return;
  }

  if (
    !claimed
  ) {
    console.warn(
      "Follow-up is already sending or has already been sent."
    );

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
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
      draft.gmail_message_id &&
      draft.gmail_thread_id
        ? await sendGmailThreadFollowUp({
            fromEmail:
              gmailConnection.email_address,

            toEmail:
              recipientEmail,

            body:
              draft.follow_up_body,

            encryptedRefreshToken:
              gmailConnection.encrypted_refresh_token,

            replyToGmailMessageId:
              draft.gmail_message_id,

            gmailThreadId:
              draft.gmail_thread_id,
          })
        : await sendGmailMessage({
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
    const errorMessage =
      getErrorMessage(
        error
      );

    console.error(
      "Follow-up send failed:",
      error
    );

    const {
      error:
        rollbackError,
    } =
      await supabase
        .from(
          "outreach_drafts"
        )
        .update({
          follow_up_sending_started_at:
            null,

          follow_up_send_error:
            errorMessage,
        })
        .eq(
          "id",
          draft.id
        )
        .eq(
          "user_id",
          user.id
        );

    if (
      rollbackError
    ) {
      console.error(
        "Could not restore failed follow-up:",
        rollbackError
      );
    }

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
  }

  const sentAt =
    new Date()
      .toISOString();

  const {
    error:
      updateError,
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
        user.id
      )
      .is(
        "follow_up_sent_at",
        null
      );

  if (
    updateError
  ) {
    console.error(
      "Follow-up was sent but database update failed:",
      updateError
    );

    revalidateLead(
      leadId
    );

    redirect(
      `/leads/${leadId}#outreach`
    );
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
      })
      .eq(
        "id",
        lead.id
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    leadUpdateError
  ) {
    console.error(
      "Follow-up sent but lead dates could not be updated:",
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
          user.id,

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
      "Follow-up sent but activity could not be logged:",
      activityError
    );
  }

  revalidateLead(
    lead.id
  );

  redirect(
    `/leads/${lead.id}#outreach`
  );
}
/* =========================================================
   LOAD BULK GIF PREFERENCES
========================================================= */

export async function getBulkOutreachGifPreferences(
  leadIds: string[]
): Promise<
  | {
      ok: true;
      leads: Record<
        string,
        {
          enabled: boolean;
          gifReady: boolean;
        }
      >;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const ids =
    Array.from(
      new Set(
        leadIds
          .map((id) => id.trim())
          .filter(Boolean)
      )
    ).slice(0, 200);

  if (ids.length === 0) {
    return {
      ok: true,
      leads: {},
    };
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
    return {
      ok: false,
      error:
        "Unauthorized.",
    };
  }

  const [
    leadResult,
    previewResult,
  ] =
    await Promise.all([
      supabase
        .from("leads")
        .select(`
          id,
          outreach_gif_enabled
        `)
        .eq(
          "user_id",
          user.id
        )
        .in(
          "id",
          ids
        ),

      supabase
        .from(
          "design_public_previews"
        )
        .select(`
          lead_id,
          preview_gif_status,
          preview_gif_url,
          revoked_at,
          expires_at,
          created_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .in(
          "lead_id",
          ids
        )
        .is(
          "revoked_at",
          null
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (leadResult.error) {
    return {
      ok: false,
      error:
        leadResult.error.message,
    };
  }

  if (previewResult.error) {
    return {
      ok: false,
      error:
        previewResult.error.message,
    };
  }

  const latestPreviewByLead =
    new Map<
      string,
      {
        preview_gif_status:
          | string
          | null;
        preview_gif_url:
          | string
          | null;
        expires_at:
          | string
          | null;
      }
    >();

  for (
    const preview of
      previewResult.data ?? []
  ) {
    if (
      latestPreviewByLead.has(
        preview.lead_id
      )
    ) {
      continue;
    }

    latestPreviewByLead.set(
      preview.lead_id,
      preview
    );
  }

  const result: Record<
    string,
    {
      enabled: boolean;
      gifReady: boolean;
    }
  > = {};

  for (
    const lead of
      leadResult.data ?? []
  ) {
    const preview =
      latestPreviewByLead.get(
        lead.id
      );

    const notExpired =
      !preview?.expires_at ||
      new Date(
        preview.expires_at
      ).getTime() >
        Date.now();

    result[lead.id] = {
      enabled:
        lead.outreach_gif_enabled ??
        true,
      gifReady:
        Boolean(
          preview &&
          notExpired &&
          preview.preview_gif_status ===
            "READY" &&
          preview.preview_gif_url
        ),
    };
  }

  return {
    ok: true,
    leads: result,
  };
}

/* =========================================================
   SCHEDULE INITIAL OUTREACH — BULK
========================================================= */

export type BulkScheduleOutreachResult =
  | {
      success: true;
      status:
        "scheduled";
      scheduledFor: string;
    }
  | {
      success: true;
      status:
        "skipped";
      reason: string;
    }
  | {
      success: false;
      status:
        "failed";
      error: string;
    };

export async function scheduleLeadOutreachForBulk(
  leadId: string,
  scheduledForIso: string,
  includePreviewGif: boolean
): Promise<BulkScheduleOutreachResult> {
  const cleanLeadId =
    leadId.trim();

  if (
    !cleanLeadId
  ) {
    return {
      success:
        false,
      status:
        "failed",
      error:
        "Invalid lead ID.",
    };
  }

  const scheduledFor =
    new Date(
      scheduledForIso
    );

  if (
    !Number.isFinite(
      scheduledFor.getTime()
    )
  ) {
    return {
      success:
        false,
      status:
        "failed",
      error:
        "Invalid send time.",
    };
  }

  if (
    scheduledFor.getTime() <=
      Date.now() +
        30_000
  ) {
    return {
      success:
        false,
      status:
        "failed",
      error:
        "The send time must be in the future.",
    };
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
    return {
      success:
        false,
      status:
        "failed",
      error:
        "Unauthorized.",
    };
  }

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
        status,

        primary_contact:contacts (
          id,
          email
        )
      `)
      .eq(
        "id",
        cleanLeadId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  if (
    leadError ||
    !lead
  ) {
    return {
      success:
        false,
      status:
        "failed",
      error:
        leadError?.message ??
        "Lead not found.",
    };
  }

  if (
    lead.status ===
      "DO_NOT_CONTACT"
  ) {
    return {
      success:
        true,
      status:
        "skipped",
      reason:
        "Lead is marked Do Not Contact.",
    };
  }

  const contact =
    getSingleRelation(
      lead.primary_contact
    );

  const recipientEmail =
    contact?.email
      ?.trim()
      .toLowerCase();

  if (
    !recipientEmail ||
    !isReasonableEmail(
      recipientEmail
    )
  ) {
    return {
      success:
        true,
      status:
        "skipped",
      reason:
        "Lead has no valid recipient email.",
    };
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
        body,
        sent_at,
        created_at
      `)
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "lead_id",
        cleanLeadId
      )
      .is(
        "sent_at",
        null
      )
      .in(
        "status",
        [
          "DRAFT",
          "APPROVED",
        ]
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
    return {
      success:
        false,
      status:
        "failed",
      error:
        draftError.message,
    };
  }

  if (
    !draft
  ) {
    return {
      success:
        true,
      status:
        "skipped",
      reason:
        "No unsent outreach draft exists.",
    };
  }

  if (
    !draft.subject
      ?.trim() ||
    !draft.body
      ?.trim()
  ) {
    return {
      success:
        true,
      status:
        "skipped",
      reason:
        "Draft has no subject or body.",
    };
  }

  const preSendQuality =
    await getPreSendQualityOrError({
      supabase,

      userId:
        user.id,

      leadId:
        cleanLeadId,

      draftId:
        draft.id,
    });

  if (
    !preSendQuality.ok
  ) {
    return {
      success:
        false,
      status:
        "failed",
      error:
        preSendQuality.error,
    };
  }

  const qualityError =
    getOutreachQualityBlockingMessage(
      preSendQuality.quality
    );

  if (
    qualityError
  ) {
    return {
      success:
        true,
      status:
        "skipped",
      reason:
        `Quality gate: ${qualityError}`,
    };
  }

  const {
    data:
      existingSchedule,
    error:
      existingScheduleError,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .select(`
        id,
        scheduled_for
      `)
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "lead_id",
        cleanLeadId
      )
      .eq(
        "message_type",
        "OUTREACH"
      )
      .eq(
        "outreach_draft_id",
        draft.id
      )
      .in(
        "status",
        [
          "SCHEDULED",
          "PROCESSING",
        ]
      )
      .limit(
        1
      )
      .maybeSingle();

  if (
    existingScheduleError
  ) {
    return {
      success:
        false,
      status:
        "failed",
      error:
        existingScheduleError.message,
    };
  }

  if (
    existingSchedule
  ) {
    return {
      success:
        true,
      status:
        "skipped",
      reason:
        "This outreach draft is already scheduled.",
    };
  }

  const {
    error:
      scheduleError,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .insert({
        user_id:
          user.id,

        lead_id:
          cleanLeadId,

        message_type:
          "OUTREACH",

        outreach_draft_id:
          draft.id,

        reply_to_email_message_id:
          null,

        status:
          "SCHEDULED",

        body:
          draft.body,

        cc_emails:
          [],

        bcc_emails:
          [],

        attachments:
          [],

        include_preview_gif:
          includePreviewGif,

        scheduled_for:
          scheduledFor.toISOString(),
      });

  if (
    scheduleError
  ) {
    /*
     * The partial unique index also protects against two
     * fast clicks creating the same scheduled outreach.
     */
    if (
      scheduleError.code ===
        "23505"
    ) {
      return {
        success:
          true,
        status:
          "skipped",
        reason:
          "This outreach draft is already scheduled.",
      };
    }

    return {
      success:
        false,
      status:
        "failed",
      error:
        scheduleError.message,
    };
  }

  /*
   * Scheduling is an explicit send decision, so the draft
   * becomes APPROVED immediately. The worker still checks
   * everything again at the actual send time.
   */
  const {
    error:
      approveScheduledDraftError,
  } =
    await supabase
      .from(
        "outreach_drafts"
      )
      .update({
        status:
          "APPROVED",
      })
      .eq(
        "id",
        draft.id
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "lead_id",
        cleanLeadId
      )
      .eq(
        "status",
        "DRAFT"
      )
      .is(
        "sent_at",
        null
      );

  if (
    approveScheduledDraftError
  ) {
    console.error(
      "Outreach was scheduled, but the draft could not be marked APPROVED:",
      approveScheduledDraftError
    );
  }

  revalidatePath(
    "/leads"
  );

  revalidatePath(
    "/scheduled"
  );

  revalidateLead(
    cleanLeadId
  );

  return {
    success:
      true,
    status:
      "scheduled",
    scheduledFor:
      scheduledFor.toISOString(),
  };
}

/* =========================================================
   CANCEL INITIAL OUTREACH SCHEDULE — BULK
========================================================= */

export type BulkCancelOutreachScheduleResult =
  | {
      success: true;
      cancelled: number;
    }
  | {
      success: false;
      error: string;
    };

export async function cancelScheduledOutreachForBulk(
  leadId: string
): Promise<BulkCancelOutreachScheduleResult> {
  const cleanLeadId =
    leadId.trim();

  if (
    !cleanLeadId
  ) {
    return {
      success:
        false,
      error:
        "Invalid lead ID.",
    };
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
    return {
      success:
        false,
      error:
        "Unauthorized.",
    };
  }

  const cancelledAt =
    new Date()
      .toISOString();

  const {
    data:
      cancelledRows,
    error:
      cancelError,
  } =
    await supabase
      .from(
        "scheduled_emails"
      )
      .update({
        status:
          "CANCELLED",

        cancelled_at:
          cancelledAt,

        last_error:
          "Cancelled manually from the Leads page.",
      })
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "lead_id",
        cleanLeadId
      )
      .eq(
        "message_type",
        "OUTREACH"
      )
      .eq(
        "status",
        "SCHEDULED"
      )
      .select(`
        id,
        outreach_draft_id
      `);

  if (
    cancelError
  ) {
    return {
      success:
        false,
      error:
        cancelError.message,
    };
  }

  const cancelledDraftIds =
    Array.from(
      new Set(
        (
          cancelledRows ??
          []
        )
          .map(
            (
              row
            ) =>
              row.outreach_draft_id
          )
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
                "string" &&
              value.length >
                0
          )
      )
    );

  if (
    cancelledDraftIds.length >
      0
  ) {
    const {
      error:
        draftResetError,
    } =
      await supabase
        .from(
          "outreach_drafts"
        )
        .update({
          status:
            "DRAFT",
        })
        .eq(
          "user_id",
          user.id
        )
        .in(
          "id",
          cancelledDraftIds
        )
        .is(
          "sent_at",
          null
        )
        .in(
          "status",
          [
            "DRAFT",
            "APPROVED",
          ]
        );

    if (
      draftResetError
    ) {
      console.error(
        "Scheduled outreach was cancelled, but the draft status could not be reset:",
        draftResetError
      );
    }
  }

  revalidatePath(
    "/leads"
  );

  revalidatePath(
    "/scheduled"
  );

  revalidateLead(
    cleanLeadId
  );

  return {
    success:
      true,
    cancelled:
      cancelledRows
        ?.length ??
      0,
  };
}


/* =========================================================
   CANCEL INITIAL OUTREACH SCHEDULE — SINGLE LEAD
========================================================= */

export async function cancelScheduledOutreach(
  formData:
    FormData
) {
  const leadId =
    formData.get(
      "leadId"
    );

  if (
    typeof leadId !==
      "string" ||
    !leadId.trim()
  ) {
    return;
  }

  await cancelScheduledOutreachForBulk(
    leadId.trim()
  );

  revalidatePath(
    "/scheduled"
  );

  redirect(
    `/leads/${leadId.trim()}#outreach`
  );
}


/* =========================================================
   UPDATE OUTREACH GIF PREFERENCE
========================================================= */

export async function updateLeadOutreachGifPreference(
  leadId:
    string,
  enabled:
    boolean
): Promise<
  | {
      ok:
        true;
    }
  | {
      ok:
        false;

      error:
        string;
    }
> {
  const cleanLeadId =
    leadId.trim();

  if (
    !cleanLeadId
  ) {
    return {
      ok:
        false,

      error:
        "Invalid lead ID.",
    };
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
    return {
      ok:
        false,

      error:
        "Unauthorized.",
    };
  }

  const {
    error,
  } =
    await supabase
      .from(
        "leads"
      )
      .update({
        outreach_gif_enabled:
          enabled,
      })
      .eq(
        "id",
        cleanLeadId
      )
      .eq(
        "user_id",
        user.id
      );

  if (
    error
  ) {
    return {
      ok:
        false,

      error:
        error.message,
    };
  }

  revalidatePath(
    `/leads/${cleanLeadId}`
  );

  revalidatePath(
    "/leads"
  );

  return {
    ok:
      true,
  };
}
