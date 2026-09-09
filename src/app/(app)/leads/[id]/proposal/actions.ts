"use server";

import {
  randomUUID,
} from "node:crypto";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  sendGmailMessage,
} from "@/lib/gmail-send";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  parseProposalSectionsJson,
  normalizeProposalSections,
} from "@/lib/proposal-sections";

import {
  normalizeProposalDesignTemplate,
} from "@/lib/proposal-design-templates";


const GMAIL_SEND_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

function publicProposalBaseUrl() {
  return (
    process.env.PUBLIC_PREVIEW_BASE_URL?.trim().replace(/\/+$/, "") ||
    "https://leadbase.joelcimpean.com"
  );
}

function text(
  formData: FormData,
  key: string
) {
  const value =
    formData.get(key);

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}


function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function normalizeProposalNumberKey(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

function optionalText(
  formData: FormData,
  key: string
) {
  return text(
    formData,
    key
  ) || null;
}

function proposalLanguage(
  formData: FormData
): "de" | "en" {
  return text(
    formData,
    "proposalLanguage"
  ) === "en"
    ? "en"
    : "de";
}

function money(
  formData: FormData,
  key: string
) {
  const raw =
    text(
      formData,
      key
    ).replace(
      ",",
      "."
    );

  if (!raw) {
    return 0;
  }

  const value =
    Number(raw);

  if (
    !Number.isFinite(
      value
    ) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function scopeItems(
  formData: FormData
) {
  return text(
    formData,
    "scope"
  )
    .split(/\r?\n/)
    .map((item) =>
      item.trim()
    )
    .filter(Boolean)
    .slice(0, 30);
}

function normalizeWebsiteUrl(
  value: string
) {
  const raw =
    value.trim();

  if (!raw) {
    return null;
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(raw)
        ? raw
        : `https://${raw}`
    );

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function normalizeAccentColor(
  value: string
) {
  const normalized =
    value.trim();

  return /^#[0-9A-F]{6}$/i.test(
    normalized
  )
    ? normalized.toUpperCase()
    : "#002BBA";
}

function isReasonableEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function logoFile(
  formData: FormData
) {
  const value =
    formData.get(
      "logoFile"
    );

  if (
    !value ||
    typeof value === "string" ||
    value.size === 0
  ) {
    return null;
  }

  return value;
}

function logoExtension(
  contentType: string
) {
  switch (
    contentType.toLowerCase()
  ) {
    case "image/png":
      return "png";

    case "image/jpeg":
      return "jpg";

    case "image/webp":
      return "webp";

    default:
      return null;
  }
}

function redirectError(
  leadId: string,
  message: string
): never {
  redirect(
    `/leads/${encodeURIComponent(
      leadId
    )}/proposal?error=${encodeURIComponent(
      message
    )}`
  );
}

export async function saveProposal(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const leadId =
    text(
      formData,
      "leadId"
    );

  const title =
    text(
      formData,
      "title"
    );

  const clientName =
    text(
      formData,
      "clientName"
    );

  const proposalNumber =
    text(
      formData,
      "proposalNumber"
    );

  const price =
    money(
      formData,
      "price"
    );

  const selectedLanguage =
    proposalLanguage(
      formData
    );

  if (
    !leadId ||
    !title ||
    !clientName ||
    !proposalNumber ||
    proposalNumber.length > 64 ||
    price === null
  ) {
    redirectError(
      leadId,
      selectedLanguage === "de"
        ? "Bitte prüfe Angebotsnummer, Titel, Kunde und Preis. Die Angebotsnummer darf maximal 64 Zeichen lang sein."
        : "Please check the proposal number, title, client and price. The proposal number may contain up to 64 characters."
    );
  }

  const websiteInput =
    text(
      formData,
      "websiteUrl"
    );

  const websiteUrl =
    normalizeWebsiteUrl(
      websiteInput
    );

  if (
    websiteInput &&
    !websiteUrl
  ) {
    redirectError(
      leadId,
      "Bitte gib eine gültige Website ein. joelcimpean.com reicht aus – https:// wird automatisch ergänzt."
    );
  }

  const contactEmail =
    text(
      formData,
      "contactEmail"
    ).toLowerCase();

  if (
    contactEmail &&
    !isReasonableEmail(
      contactEmail
    )
  ) {
    redirectError(
      leadId,
      "Bitte prüfe die Kunden-E-Mail für die Bestätigungs-PDF."
    );
  }

  const {
    data: lead,
    error: leadError,
  } =
    await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (
    leadError ||
    !lead
  ) {
    redirect(
      `/leads/${encodeURIComponent(
        leadId
      )}?error=${encodeURIComponent(
        "Lead nicht gefunden."
      )}`
    );
  }

  const {
    data: existing,
    error: existingError,
  } =
    await supabase
      .from("proposals")
      .select(`
        id,
        public_token,
        status,
        revision,
        language,
        design_template,
        proposal_number,
        logo_path,
        logo_url
      `)
      .eq("user_id", user.id)
      .eq("lead_id", leadId)
      .maybeSingle();

  if (existingError) {
    console.error(
      "Could not load existing proposal:",
      existingError
    );

    redirectError(
      leadId,
      existingError.message
    );
  }

  if (
    existing?.status ===
    "ACCEPTED"
  ) {
    redirectError(
      leadId,
      "Dieses Angebot wurde bereits angenommen und ist deshalb gesperrt."
    );
  }

  let nextLogoPath =
    existing?.logo_path ??
    null;

  let nextLogoUrl =
    existing?.logo_url ??
    null;

  const removeLogo =
    text(
      formData,
      "removeLogo"
    ) === "1";

  const uploadedLogo =
    logoFile(
      formData
    );

  const templateLogoUrl =
    optionalText(
      formData,
      "templateLogoUrl"
    );

  if (
    !uploadedLogo &&
    !removeLogo &&
    templateLogoUrl
  ) {
    nextLogoPath = null;
    nextLogoUrl = templateLogoUrl;
  }

  const admin =
    createAdminClient();

  const {
    data: reservedNumber,
    error: reservedNumberError,
  } = await admin
    .from("proposal_number_registry")
    .select("proposal_id,proposal_number")
    .eq("user_id", user.id)
    .eq("normalized_number", normalizeProposalNumberKey(proposalNumber))
    .maybeSingle();

  if (reservedNumberError) {
    console.error("Could not check proposal number history:", reservedNumberError);
    redirectError(
      leadId,
      selectedLanguage === "de"
        ? "Die Angebotsnummer konnte nicht geprüft werden. Bitte führe zuerst die Phase-11B.3-SQL-Migration aus."
        : "The proposal number could not be checked. Please run the Phase 11B.3 SQL migration first."
    );
  }

  if (
    reservedNumber &&
    reservedNumber.proposal_id !== existing?.id
  ) {
    redirectError(
      leadId,
      selectedLanguage === "de"
        ? `Die Angebotsnummer „${proposalNumber}“ wurde bereits von einem angenommenen Angebot verwendet und bleibt deshalb dauerhaft reserviert.`
        : `The proposal number “${proposalNumber}” was already used by an accepted proposal and is therefore permanently reserved.`
    );
  }

  const {
    data: activeNumberRows,
    error: activeNumberRowsError,
  } = await admin
    .from("proposals")
    .select("id,proposal_number,status")
    .eq("user_id", user.id)
    .neq("status", "DECLINED");

  if (activeNumberRowsError) {
    console.error("Could not check active proposal numbers:", activeNumberRowsError);
    redirectError(
      leadId,
      selectedLanguage === "de"
        ? "Die Angebotsnummer konnte nicht geprüft werden. Bitte führe zuerst die Phase-11B.3-SQL-Migration aus."
        : "The proposal number could not be checked. Please run the Phase 11B.3 SQL migration first."
    );
  }

  const activeNumberOwner =
    (activeNumberRows ?? []).find((row) =>
      row.id !== existing?.id &&
      typeof row.proposal_number === "string" &&
      normalizeProposalNumberKey(row.proposal_number) ===
        normalizeProposalNumberKey(proposalNumber)
    );

  if (activeNumberOwner) {
    redirectError(
      leadId,
      selectedLanguage === "de"
        ? `Die Angebotsnummer „${proposalNumber}“ wird bereits in einem anderen aktiven Angebot verwendet. Sobald dieses Angebot abgelehnt oder gelöscht wurde, kannst du die Nummer wieder verwenden.`
        : `The proposal number “${proposalNumber}” is already used by another active proposal. You can reuse it once that proposal is declined or deleted.`
    );
  }

  if (
    removeLogo &&
    nextLogoPath
  ) {
    const {
      error: removeError,
    } =
      await admin.storage
        .from(
          "proposal-assets"
        )
        .remove([
          nextLogoPath,
        ]);

    if (removeError) {
      console.error(
        "Could not remove proposal logo:",
        removeError
      );
    }

    nextLogoPath =
      null;
    nextLogoUrl =
      null;
  }

  if (uploadedLogo) {
    const extension =
      logoExtension(
        uploadedLogo.type
      );

    if (!extension) {
      redirectError(
        leadId,
        "Logo bitte als PNG, JPG oder WebP hochladen."
      );
    }

    if (
      uploadedLogo.size >
      2 * 1024 * 1024
    ) {
      redirectError(
        leadId,
        "Das Logo darf maximal 2 MB groß sein."
      );
    }

    const path =
      `${user.id}/${leadId}/logo.${extension}`;

    const buffer =
      Buffer.from(
        await uploadedLogo.arrayBuffer()
      );

    const {
      error: uploadError,
    } =
      await admin.storage
        .from(
          "proposal-assets"
        )
        .upload(
          path,
          buffer,
          {
            contentType:
              uploadedLogo.type,
            upsert: true,
            cacheControl:
              "3600",
          }
        );

    if (uploadError) {
      console.error(
        "Could not upload proposal logo:",
        uploadError
      );

      redirectError(
        leadId,
        "Logo konnte nicht hochgeladen werden. Bitte prüfe, ob Phase 8B SQL ausgeführt wurde."
      );
    }

    const {
      data: publicData,
    } =
      admin.storage
        .from(
          "proposal-assets"
        )
        .getPublicUrl(
          path
        );

    nextLogoPath =
      path;
    nextLogoUrl =
      publicData.publicUrl;
  }

  const customSections =
    parseProposalSectionsJson(
      text(
        formData,
        "customSections"
      )
    );

  const now =
    new Date().toISOString();

  const isReopeningDeclined =
    existing?.status ===
    "DECLINED";

  const nextRevision =
    isReopeningDeclined
      ? Math.max(
          1,
          Number(
            existing?.revision ??
              1
          )
        ) + 1
      : Math.max(
          1,
          Number(
            existing?.revision ??
              1
          )
        );

  const payload = {
    user_id:
      user.id,

    lead_id:
      leadId,

    public_token:
      existing?.public_token ??
      randomUUID(),

    title,

    proposal_number:
      proposalNumber,

    client_name:
      clientName,

    language:
      selectedLanguage,

    contact_name:
      optionalText(
        formData,
        "contactName"
      ),

    contact_email:
      contactEmail || null,

    website_url:
      websiteUrl,

    intro_text:
      optionalText(
        formData,
        "introText"
      ),

    scope:
      scopeItems(
        formData
      ),

    timeline_text:
      optionalText(
        formData,
        "timelineText"
      ),

    price,

    currency:
      text(
        formData,
        "currency"
      ) || "EUR",

    valid_until:
      optionalText(
        formData,
        "validUntil"
      ),

    notes:
      optionalText(
        formData,
        "notes"
      ),

    custom_sections:
      customSections,

    accent_color:
      normalizeAccentColor(
        text(
          formData,
          "accentColor"
        )
      ),

    logo_path:
      nextLogoPath,

    logo_url:
      nextLogoUrl,

    first_time_client:
      text(
        formData,
        "firstTimeClient"
      ) === "1",

    design_template:
      normalizeProposalDesignTemplate(
        text(
          formData,
          "designTemplate"
        )
      ),

    revision:
      nextRevision,

    ...(isReopeningDeclined
      ? {
          status:
            "DRAFT",
          responded_at:
            null,
          accepted_at:
            null,
          declined_at:
            null,
          sent_at:
            null,
          pdf_emailed_at:
            null,
          pdf_email_error:
            null,
        }
      : {}),

    updated_at:
      now,
  };

  const result =
    existing
      ? await supabase
          .from("proposals")
          .update(payload)
          .eq("id", existing.id)
          .eq("user_id", user.id)
      : await supabase
          .from("proposals")
          .insert(payload);

  if (result.error) {
    console.error(
      "Could not save proposal:",
      result.error
    );

    redirectError(
      leadId,
      result.error.message
    );
  }

  // Phase 10N6: remember proposal branding per user so every new lead starts with it.
  try {
    const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const previousBranding = (currentMetadata.leadbase_proposal_branding ?? {}) as { logoUrl?: unknown; logoPath?: unknown };
    const rememberedLogoPath = payload.logo_path ?? (
      payload.logo_url && previousBranding.logoUrl === payload.logo_url && typeof previousBranding.logoPath === "string"
        ? previousBranding.logoPath
        : null
    );
    await supabase.auth.updateUser({
      data: {
        ...currentMetadata,
        leadbase_proposal_branding: {
          accentColor: payload.accent_color,
          logoUrl: payload.logo_url,
          logoPath: rememberedLogoPath,
        },
      },
    });
  } catch (brandingError) {
    console.error("Could not persist user proposal branding defaults:", brandingError);
  }

  revalidatePath(
    `/leads/${leadId}`
  );

  revalidatePath(
    `/leads/${leadId}/proposal`
  );

  const savedQuery =
    isReopeningDeclined
      ? "saved=1&reopened=1"
      : "saved=1";

  redirect(
    `/leads/${encodeURIComponent(
      leadId
    )}/proposal?${savedQuery}`
  );
}


function templateTokenize(
  value: string | null | undefined,
  clientName: string,
  contactName?: string | null
) {
  let next = value ?? "";

  if (clientName.trim()) {
    next = next.split(clientName).join("{{client}}");
  }

  if (contactName?.trim()) {
    next = next.split(contactName).join("{{contact}}");
  }

  return next;
}

export async function saveProposalAsTemplate(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const leadId = text(formData, "leadId");
  const templateName = text(formData, "templateName");

  if (!leadId || !templateName) {
    redirectError(
      leadId,
      "Bitte gib der Vorlage einen Namen."
    );
  }

  const {
    data: proposal,
    error,
  } = await supabase
    .from("proposals")
    .select(`
      title,
      client_name,
      contact_name,
      intro_text,
      scope,
      timeline_text,
      price,
      currency,
      notes,
      accent_color,
      logo_url,
      first_time_client,
      custom_sections,
      language
    `)
    .eq("lead_id", leadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !proposal) {
    redirectError(
      leadId,
      "Bitte speichere das Angebot zuerst, bevor du daraus eine Vorlage erstellst."
    );
  }

  const clientName = proposal.client_name ?? "";
  const contactName = proposal.contact_name ?? null;

  const customSections = normalizeProposalSections(
    proposal.custom_sections
  ).map((section) => ({
    ...section,
    title: templateTokenize(
      section.title,
      clientName,
      contactName
    ),
    content: templateTokenize(
      section.content,
      clientName,
      contactName
    ),
  }));

  const payload = {
    title: templateTokenize(
      proposal.title,
      clientName,
      contactName
    ),
    introText: templateTokenize(
      proposal.intro_text,
      clientName,
      contactName
    ),
    scope: Array.isArray(proposal.scope)
      ? proposal.scope
          .filter((item: unknown): item is string => typeof item === "string")
          .map((item) =>
            templateTokenize(
              item,
              clientName,
              contactName
            )
          )
      : [],
    timelineText: templateTokenize(
      proposal.timeline_text,
      clientName,
      contactName
    ),
    price: Number(proposal.price ?? 0),
    currency: proposal.currency ?? "EUR",
    notes: templateTokenize(
      proposal.notes,
      clientName,
      contactName
    ),
    accentColor: proposal.accent_color ?? "#002BBA",
    logoUrl: proposal.logo_url ?? null,
    firstTimeClient: proposal.first_time_client !== false,
    customSections,
    language:
      proposal.language === "en"
        ? "en"
        : "de",
  };

  const now = new Date().toISOString();

  const {
    error: saveError,
  } = await supabase
    .from("proposal_templates")
    .upsert(
      {
        user_id: user.id,
        name: templateName.slice(0, 120),
        payload,
        updated_at: now,
      },
      {
        onConflict: "user_id,name",
      }
    );

  if (saveError) {
    console.error(
      "Could not save proposal template:",
      saveError
    );

    redirectError(
      leadId,
      saveError.message
    );
  }

  revalidatePath(
    `/leads/${leadId}/proposal`
  );

  redirect(
    `/leads/${encodeURIComponent(
      leadId
    )}/proposal?templateSaved=1`
  );
}

export async function deleteProposalTemplate(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const leadId = text(formData, "leadId");
  const templateId = text(formData, "templateId");

  if (!leadId || !templateId) {
    redirectError(
      leadId,
      "Vorlage nicht gefunden."
    );
  }

  const {
    error,
  } = await supabase
    .from("proposal_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id);

  if (error) {
    redirectError(
      leadId,
      error.message
    );
  }

  revalidatePath(
    `/leads/${leadId}/proposal`
  );

  redirect(
    `/leads/${encodeURIComponent(
      leadId
    )}/proposal?templateDeleted=1`
  );
}

export async function sendProposalToClient(
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const leadId = text(formData, "leadId");

  if (!leadId) {
    redirect("/leads");
  }

  const {
    data: proposal,
    error: proposalError,
  } = await supabase
    .from("proposals")
    .select(`
      id,
      public_token,
      status,
      revision,
      title,
      client_name,
      contact_name,
      contact_email,
      language
    `)
    .eq("user_id", user.id)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (proposalError || !proposal) {
    redirectError(
      leadId,
      proposalError?.message || "Bitte speichere das Angebot zuerst."
    );
  }

  if (proposal.status === "ACCEPTED") {
    redirectError(
      leadId,
      "Das Angebot wurde bereits angenommen und wird nicht erneut versendet."
    );
  }

  const recipient = proposal.contact_email?.trim().toLowerCase() || "";

  if (!recipient || !isReasonableEmail(recipient)) {
    redirectError(
      leadId,
      "Bitte hinterlege zuerst eine gültige Kunden-E-Mail und speichere das Angebot."
    );
  }

  const admin = createAdminClient();

  const {
    data: gmailConnection,
    error: gmailError,
  } = await admin
    .from("gmail_connections")
    .select(`
      email_address,
      encrypted_refresh_token,
      scopes
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (gmailError || !gmailConnection) {
    redirectError(
      leadId,
      "Gmail ist nicht verbunden. Verbinde Gmail zuerst in den Einstellungen."
    );
  }

  const scopes = Array.isArray(gmailConnection.scopes)
    ? gmailConnection.scopes
    : [];

  if (!scopes.includes(GMAIL_SEND_SCOPE)) {
    redirectError(
      leadId,
      "Die Gmail-Verbindung hat keine Versandberechtigung."
    );
  }

  const publicUrl = `${publicProposalBaseUrl()}/proposal/${encodeURIComponent(
    proposal.public_token
  )}`;

  const isGermanProposal =
    proposal.language !==
    "en";

  const greeting =
    proposal.contact_name
      ? isGermanProposal
        ? `Guten Tag ${proposal.contact_name},`
        : `Hello ${proposal.contact_name},`
      : isGermanProposal
        ? "Guten Tag,"
        : "Hello,";

  const revisionSuffix =
    Number(
      proposal.revision ??
        1
    ) > 1
      ? isGermanProposal
        ? ` (Version ${proposal.revision})`
        : ` (version ${proposal.revision})`
      : "";

  const body =
    isGermanProposal
      ? [
          greeting,
          "",
          `wie besprochen habe ich das Angebot „${proposal.title}“${revisionSuffix} für ${proposal.client_name} vorbereitet.`,
          "",
          "Sie können das Angebot hier in Ruhe ansehen und direkt annehmen oder ablehnen:",
          publicUrl,
          "",
          "Bei Fragen oder Änderungswünschen antworten Sie mir einfach auf diese E-Mail.",
          "",
          "Mit freundlichen Grüßen,",
          "",
          "Joel Cimpean",
          "hello@joelcimpean.com / joelcimpean.com",
        ].join("\n")
      : [
          greeting,
          "",
          `as discussed, I prepared the proposal “${proposal.title}”${revisionSuffix} for ${proposal.client_name}.`,
          "",
          "You can review the proposal here and accept or decline it directly:",
          publicUrl,
          "",
          "If you have any questions or would like changes, simply reply to this email.",
          "",
          "Kind regards,",
          "",
          "Joel Cimpean",
          "hello@joelcimpean.com / joelcimpean.com",
        ].join("\n");

  const htmlBody =
    isGermanProposal
      ? `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.65;color:#171717;">
          <p>${escapeHtml(greeting)}</p>
          <p>wie besprochen habe ich das Angebot <strong>„${escapeHtml(
            proposal.title
          )}“</strong>${escapeHtml(revisionSuffix)} für ${escapeHtml(
            proposal.client_name
          )} vorbereitet.</p>
          <p>Sie können das Angebot hier in Ruhe ansehen und direkt annehmen oder ablehnen:</p>
          <p style="margin:24px 0;">
            <a href="${escapeAttribute(
              publicUrl
            )}" style="display:inline-block;border-radius:9px;background:#002BBA;padding:11px 16px;color:#ffffff;text-decoration:none;font-weight:600;">Angebot ansehen →</a>
          </p>
          <p>Bei Fragen oder Änderungswünschen antworten Sie mir einfach auf diese E-Mail.</p>
          <p>Mit freundlichen Grüßen,<br><br>Joel Cimpean<br><a href="mailto:hello@joelcimpean.com" style="color:#002BBA;">hello@joelcimpean.com</a> / <a href="https://joelcimpean.com" style="color:#002BBA;">joelcimpean.com</a></p>
        </div>
      `
      : `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.65;color:#171717;">
          <p>${escapeHtml(greeting)}</p>
          <p>as discussed, I prepared the proposal <strong>“${escapeHtml(
            proposal.title
          )}”</strong>${escapeHtml(revisionSuffix)} for ${escapeHtml(
            proposal.client_name
          )}.</p>
          <p>You can review the proposal here and accept or decline it directly:</p>
          <p style="margin:24px 0;">
            <a href="${escapeAttribute(
              publicUrl
            )}" style="display:inline-block;border-radius:9px;background:#002BBA;padding:11px 16px;color:#ffffff;text-decoration:none;font-weight:600;">View proposal →</a>
          </p>
          <p>If you have any questions or would like changes, simply reply to this email.</p>
          <p>Kind regards,<br><br>Joel Cimpean<br><a href="mailto:hello@joelcimpean.com" style="color:#002BBA;">hello@joelcimpean.com</a> / <a href="https://joelcimpean.com" style="color:#002BBA;">joelcimpean.com</a></p>
        </div>
      `;

  try {
    await sendGmailMessage({
      fromEmail: gmailConnection.email_address,
      toEmail: recipient,
      subject:
        isGermanProposal
          ? `Ihr Angebot – ${proposal.client_name}`
          : `Your proposal – ${proposal.client_name}`,
      body,
      htmlBody,
      encryptedRefreshToken: gmailConnection.encrypted_refresh_token,
    });

    const now = new Date().toISOString();

    const {
      error: updateError,
    } = await supabase
      .from("proposals")
      .update({
        status: "SENT",
        sent_at: now,
        delivery_email_error: null,
        updated_at: now,
      })
      .eq("id", proposal.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Proposal email sent, but status update failed:", updateError);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.replace(/[\r\n]+/g, " ").slice(0, 500)
        : "Unknown Gmail error";

    await supabase
      .from("proposals")
      .update({
        delivery_email_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal.id)
      .eq("user_id", user.id);

    redirectError(
      leadId,
      `Angebot konnte nicht per E-Mail gesendet werden: ${message}`
    );
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath(`/leads/${leadId}/proposal`);

  redirect(
    `/leads/${encodeURIComponent(leadId)}/proposal?proposalSent=1`
  );
}

