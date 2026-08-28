"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  headers,
} from "next/headers";

import {
  redirect,
} from "next/navigation";

import {
  generateOutreachDraft,
} from "@/lib/outreach-generation";

import {
  sendGmailMessage,
} from "@/lib/gmail-send";

import {
  createClient,
} from "@/lib/supabase/server";

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
   PUBLIC BASE URL
========================================================= */

async function getPublicBaseUrl() {
  const requestHeaders =
    await headers();

  const forwardedHost =
    requestHeaders.get(
      "x-forwarded-host"
    );

  const regularHost =
    requestHeaders.get(
      "host"
    );

  const host =
    forwardedHost ||
    regularHost;

  const forwardedProto =
    requestHeaders.get(
      "x-forwarded-proto"
    );

  if (
    host &&
    (
      host.startsWith(
        "localhost:"
      ) ||
      host.startsWith(
        "127.0.0.1:"
      ) ||
      host ===
        "localhost"
    )
  ) {
    return `http://${host}`;
  }

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

  if (
    host
  ) {
    const protocol =
      forwardedProto ||
      "https";

    return `${protocol}://${host}`;
  }

  return null;
}

/* =========================================================
   ACTIVE CUSTOMER PREVIEW
========================================================= */

async function getActiveCustomerPreviewUrl({
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
      .select(
        "id"
      )
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
    console.warn(
      "Could not load selected redesign for outreach:",
      selectedError
    );

    return null;
  }

  if (
    !selected
  ) {
    return null;
  }

  const {
    data:
      preview,
    error:
      previewError,
  } =
    await supabase
      .from(
        "design_public_previews"
      )
      .select(`
        public_slug,
        expires_at,
        revoked_at
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
        "design_mockup_variant_id",
        selected.id
      )
      .is(
        "revoked_at",
        null
      )
      .maybeSingle();

  if (
    previewError
  ) {
    /*
     * Draft generation should still work if the customer
     * preview has not been configured yet.
     */
    console.warn(
      "Could not load customer preview for outreach:",
      previewError
    );

    return null;
  }

  if (
    !preview
  ) {
    return null;
  }

  if (
    preview.expires_at &&
    new Date(
      preview.expires_at
    ).getTime() <=
      Date.now()
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

  return `${baseUrl}/concept/${encodeURIComponent(
    preview.public_slug
  )}`;
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
  const normalized =
    normalizeTextBlock(
      value
    );

  if (
    !previewUrl
  ) {
    return normalized;
  }

  if (
    normalized.includes(
      previewUrl
    )
  ) {
    return normalized;
  }

  const previewBlock =
  [
    "Ich habe Ihnen auf Basis Ihres aktuellen Webauftritts außerdem eine unverbindliche Designvorschau vorbereitet. Sie zeigt eine mögliche Richtung – ein finales Konzept würde selbstverständlich noch individueller auf Ihr Unternehmen, Ihre Ziele und Inhalte abgestimmt werden:",
    previewUrl,
  ].join(
    "\n"
  );

  /*
   * Prefer inserting the preview before a closing greeting
   * if the AI generated one.
   */
  const closingMarkers =
    [
      "\nMit freundlichen Grüßen",
      "\nViele Grüße",
      "\nBeste Grüße",
      "\nFreundliche Grüße",
      "\nHerzliche Grüße",
    ];

  let insertionIndex =
    -1;

  for (
    const marker of
      closingMarkers
  ) {
    const index =
      normalized.indexOf(
        marker
      );

    if (
      index !==
        -1 &&
      (
        insertionIndex ===
          -1 ||
        index <
          insertionIndex
      )
    ) {
      insertionIndex =
        index;
    }
  }

  if (
    insertionIndex !==
    -1
  ) {
    const before =
      normalized
        .slice(
          0,
          insertionIndex
        )
        .trim();

    const after =
      normalized
        .slice(
          insertionIndex
        )
        .trim();

    return [
      before,
      previewBlock,
      after,
    ]
      .filter(
        Boolean
      )
      .join(
        "\n\n"
      );
  }

  return `${normalized}\n\n${previewBlock}`;
}

/* =========================================================
   GENERATE OUTREACH
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
        user.id
      )
      .maybeSingle();

  if (
    leadError ||
    !lead
  ) {
    console.error(
      "Could not load lead for outreach:",
      leadError
    );

    return;
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
    console.error(
      "Lead has no company."
    );

    return;
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

  /*
   * Load public preview in parallel with the AI generation.
   *
   * This does not add any extra AI cost.
   */
  const customerPreviewPromise =
    getActiveCustomerPreviewUrl({
      supabase,

      userId:
        user.id,

      leadId:
        lead.id,
    });

  let generated;

  try {
    generated =
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

  const customerPreviewUrl =
    await customerPreviewPromise;

  const bodyWithPreview =
    addCustomerPreviewToBody(
      generated.body,
      customerPreviewUrl
    );

  const finalBody =
    ensureSignature(
      bodyWithPreview
    );

  const finalFollowUp =
    generated.followUpBody
      ?.trim()
      ? ensureSignature(
          generated.followUpBody
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
          user.id,

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
    console.error(
      "Could not save outreach draft:",
      draftError
    );

    return;
  }

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
          user.id
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
          user.id,

        lead_id:
          lead.id,

        activity_type:
          "OUTREACH_DRAFT_GENERATED",

        title:
          "Outreach draft generated",

        description:
          customerPreviewUrl
            ? "A personalized German outreach draft with customer preview was generated."
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

  redirect(
    `/leads/${lead.id}#outreach`
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