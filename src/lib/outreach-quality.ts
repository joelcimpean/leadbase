import type {
    SupabaseClient,
  } from "@supabase/supabase-js";
  
  import {
    assessEmailQuality,
    type EmailQualityAssessment,
  } from "@/lib/email-quality";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  export type OutreachQualitySeverity =
    | "ok"
    | "warning"
    | "blocker";
  
  export type OutreachQualityKey =
    | "lead_status"
    | "recipient"
    | "email_quality"
    | "draft"
    | "design"
    | "preview"
    | "preview_link"
    | "salutation"
    | "gmail";
  
  export type OutreachQualityItem = {
    key:
      OutreachQualityKey;
  
    label:
      string;
  
    severity:
      OutreachQualitySeverity;
  
    detail:
      string;
  };
  
  export type OutreachQualityResult = {
    ready:
      boolean;
  
    blockers:
      OutreachQualityItem[];
  
    warnings:
      OutreachQualityItem[];
  
    items:
      OutreachQualityItem[];
  
    emailAssessment:
      EmailQualityAssessment;
  
    selectedDesignId:
      string
      | null;
  
    activePreviewSlug:
      string
      | null;
  };
  
  type QualityInput = {
    leadStatus:
      string
      | null;
  
    companyName:
      string
      | null;
  
    websiteUrl:
      string
      | null;
  
    contact:
      {
        email:
          string
          | null;
  
        full_name:
          string
          | null;
  
        salutation:
          string
          | null;
  
        email_quality_status?:
          string
          | null;
  
        email_source_url?:
          string
          | null;
  
        email_candidate?:
          string
          | null;
  
        email_candidate_source_url?:
          string
          | null;
      }
      | null;
  
    draft:
      {
        subject:
          string
          | null;
  
        body:
          string
          | null;
      }
      | null;
  
    selectedDesign:
      {
        id:
          string;
  
        source_snapshot:
          unknown;
      }
      | null;
  
    publicPreviews:
      {
        design_mockup_variant_id:
          string;
  
        public_slug:
          string;
  
        expires_at:
          string
          | null;
  
        revoked_at:
          string
          | null;
      }[];
  
    gmailReady:
      boolean;
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
  
  export function isPublishableOutreachDesign(
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
  
  function getActivePreview({
    selectedDesignId,
    previews,
  }: {
    selectedDesignId:
      string
      | null;
  
    previews:
      QualityInput[
        "publicPreviews"
      ];
  }) {
    if (
      !selectedDesignId
    ) {
      return null;
    }
  
    const now =
      Date.now();
  
    return (
      previews.find(
        (
          preview
        ) => {
          if (
            preview.design_mockup_variant_id !==
            selectedDesignId
          ) {
            return false;
          }
  
          if (
            preview.revoked_at
          ) {
            return false;
          }
  
          if (
            preview.expires_at &&
            new Date(
              preview.expires_at
            ).getTime() <=
              now
          ) {
            return false;
          }
  
          return true;
        }
      ) ??
      null
    );
  }
  
  function hasCurrentPreviewLink(
    body:
      string
      | null
      | undefined,
    publicSlug:
      string
      | null
  ) {
    if (
      !body ||
      !publicSlug
    ) {
      return false;
    }
  
    return body.includes(
      `/concept/${publicSlug}`
    );
  }
  
  /* =========================================================
     PURE EVALUATION
  ========================================================= */
  
  export function evaluateOutreachQuality(
    input:
      QualityInput
  ): OutreachQualityResult {
    const emailAssessment =
      assessEmailQuality({
        currentEmail:
          input.contact
            ?.email ??
          null,
  
        websiteUrl:
          input.websiteUrl,
  
        discoveredEmail:
          input.contact
            ?.email_candidate ??
          (
            input.contact
              ?.email_quality_status ===
              "VERIFIED_WEBSITE"
              ? input.contact
                  .email
              : null
          ),
  
        discoveredEmailSourceUrl:
          input.contact
            ?.email_candidate_source_url ??
          input.contact
            ?.email_source_url ??
          null,
      });
  
    const selectedDesignId =
      input.selectedDesign
        ?.id ??
      null;
  
    const designPublishable =
      Boolean(
        input.selectedDesign &&
        isPublishableOutreachDesign(
          input.selectedDesign
            .source_snapshot
        )
      );
  
    const activePreview =
      getActivePreview({
        selectedDesignId,
  
        previews:
          input.publicPreviews,
      });
  
    const activePreviewSlug =
      activePreview
        ?.public_slug ??
      null;
  
    const draftSubject =
      input.draft
        ?.subject
        ?.trim() ??
      "";
  
    const draftBody =
      input.draft
        ?.body
        ?.trim() ??
      "";
  
    const items:
      OutreachQualityItem[] =
      [];
  
    /* -------------------------------------------------------
       LEAD STATUS
    ------------------------------------------------------- */
  
    if (
      input.leadStatus ===
        "DO_NOT_CONTACT"
    ) {
      items.push({
        key:
          "lead_status",
  
        label:
          "Kontaktstatus",
  
        severity:
          "blocker",
  
        detail:
          "Dieser Lead ist als „Nicht kontaktieren“ markiert.",
      });
    } else {
      items.push({
        key:
          "lead_status",
  
        label:
          "Kontaktstatus",
  
        severity:
          "ok",
  
        detail:
          "Lead darf kontaktiert werden.",
      });
    }
  
    /* -------------------------------------------------------
       RECIPIENT
    ------------------------------------------------------- */
  
    if (
      !input.contact
        ?.email
    ) {
      items.push({
        key:
          "recipient",
  
        label:
          "Empfänger",
  
        severity:
          "blocker",
  
        detail:
          "Es ist keine Empfängeradresse gespeichert.",
      });
    } else {
      items.push({
        key:
          "recipient",
  
        label:
          "Empfänger",
  
        severity:
          "ok",
  
        detail:
          input.contact.email,
      });
    }
  
    /* -------------------------------------------------------
       EMAIL QUALITY
    ------------------------------------------------------- */
  
    items.push({
      key:
        "email_quality",
  
      label:
        "E-Mail-Sicherheit",
  
      severity:
        emailAssessment
          .blocksSending
          ? "blocker"
          : emailAssessment
                .level ===
              "warning"
            ? "warning"
            : "ok",
  
      detail:
        emailAssessment.detail,
    });
  
    /* -------------------------------------------------------
       DRAFT
    ------------------------------------------------------- */
  
    if (
      draftSubject.length <
        3 ||
      draftBody.length <
        40
    ) {
      items.push({
        key:
          "draft",
  
        label:
          "E-Mail-Entwurf",
  
        severity:
          "blocker",
  
        detail:
          "Betreff oder Nachricht ist leer bzw. unvollständig.",
      });
    } else {
      items.push({
        key:
          "draft",
  
        label:
          "E-Mail-Entwurf",
  
        severity:
          "ok",
  
        detail:
          "Betreff und Nachricht sind vollständig.",
      });
    }
  
    /* -------------------------------------------------------
       DESIGN
    ------------------------------------------------------- */
  
    if (
      !input.selectedDesign
    ) {
      items.push({
        key:
          "design",
  
        label:
          "Design",
  
        severity:
          "blocker",
  
        detail:
          "Es ist noch keine Designvariante ausgewählt.",
      });
    } else if (
      !designPublishable
    ) {
      items.push({
        key:
          "design",
  
        label:
          "Design",
  
        severity:
          "blocker",
  
        detail:
          "Die ausgewählte Designvariante ist nicht veröffentlichbar.",
      });
    } else {
      items.push({
        key:
          "design",
  
        label:
          "Design",
  
        severity:
          "ok",
  
        detail:
          "Eine veröffentlichbare Designvariante ist ausgewählt.",
      });
    }
  
    /* -------------------------------------------------------
       PUBLIC PREVIEW
    ------------------------------------------------------- */
  
    if (
      !activePreview
    ) {
      items.push({
        key:
          "preview",
  
        label:
          "Kundenvorschau",
  
        severity:
          "blocker",
  
        detail:
          "Für das ausgewählte Design ist keine aktive Kundenvorschau vorhanden.",
      });
    } else {
      items.push({
        key:
          "preview",
  
        label:
          "Kundenvorschau",
  
        severity:
          "ok",
  
        detail:
          `/concept/${activePreview.public_slug}`,
      });
    }
  
    /* -------------------------------------------------------
       LINK IN DRAFT
    ------------------------------------------------------- */
  
    if (
      activePreviewSlug &&
      hasCurrentPreviewLink(
        input.draft
          ?.body,
        activePreviewSlug
      )
    ) {
      items.push({
        key:
          "preview_link",
  
        label:
          "Preview-Link",
  
        severity:
          "ok",
  
        detail:
          "Der Entwurf enthält den aktuell gültigen Kundenvorschau-Link.",
      });
    } else {
      items.push({
        key:
          "preview_link",
  
        label:
          "Preview-Link",
  
        severity:
          "blocker",
  
        detail:
          activePreviewSlug
            ? "Der Entwurf enthält nicht den aktuell gültigen Preview-Link. Entwurf bitte neu generieren oder aktualisieren."
            : "Preview-Link kann ohne aktive Kundenvorschau nicht geprüft werden.",
      });
    }
  
    /* -------------------------------------------------------
       SALUTATION
    ------------------------------------------------------- */
  
    if (
      input.contact
        ?.full_name &&
      (
        input.contact
          .salutation ===
          "HERR" ||
        input.contact
          .salutation ===
          "FRAU"
      )
    ) {
      items.push({
        key:
          "salutation",
  
        label:
          "Anrede",
  
        severity:
          "ok",
  
        detail:
          "Personalisierte Anrede ist öffentlich belegt.",
      });
    } else if (
      input.contact
        ?.full_name
    ) {
      items.push({
        key:
          "salutation",
  
        label:
          "Anrede",
  
        severity:
          "warning",
  
        detail:
          "Ansprechpartner vorhanden, aber Herr/Frau ist nicht belegt. Leadbase sollte eine neutrale Begrüßung verwenden.",
      });
    } else {
      items.push({
        key:
          "salutation",
  
        label:
          "Anrede",
  
        severity:
          "warning",
  
        detail:
          "Kein namentlicher Ansprechpartner vorhanden. Die Mail verwendet eine allgemeine Begrüßung.",
      });
    }
  
    /* -------------------------------------------------------
       GMAIL
    ------------------------------------------------------- */
  
    items.push({
      key:
        "gmail",
  
      label:
        "Gmail",
  
      severity:
        input.gmailReady
          ? "ok"
          : "warning",
  
      detail:
        input.gmailReady
          ? "Gmail-Senden ist verbunden."
          : "Gmail-Senden ist aktuell nicht vollständig verbunden.",
    });
  
    const blockers =
      items.filter(
        (
          item
        ) =>
          item.severity ===
          "blocker"
      );
  
    const warnings =
      items.filter(
        (
          item
        ) =>
          item.severity ===
          "warning"
      );
  
    return {
      ready:
        blockers.length ===
        0,
  
      blockers,
  
      warnings,
  
      items,
  
      emailAssessment,
  
      selectedDesignId,
  
      activePreviewSlug,
    };
  }
  
  /* =========================================================
     SERVER LOADER
  ========================================================= */
  
  export async function loadOutreachQuality({
    supabase,
    userId,
    leadId,
    draftId,
  }: {
    supabase:
      SupabaseClient;
  
    userId:
      string;
  
    leadId:
      string;
  
    draftId?:
      string
      | null;
  }) {
    const draftQuery =
      supabase
        .from(
          "outreach_drafts"
        )
        .select(`
          id,
          subject,
          body,
          status
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
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          1
        );
  
    if (
      draftId
    ) {
      draftQuery.eq(
        "id",
        draftId
      );
    }
  
    const [
      leadResult,
      draftResult,
      selectedDesignResult,
      previewsResult,
      gmailResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "leads"
          )
          .select(`
            id,
            status,
  
            company:companies (
              id,
              name,
              website_url
            ),
  
            primary_contact:contacts (
              id,
              full_name,
              email,
              salutation,
              email_quality_status,
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
          .maybeSingle(),
  
        draftQuery
          .maybeSingle(),
  
        supabase
          .from(
            "design_mockup_variants"
          )
          .select(`
            id,
            source_snapshot,
            selected,
            selected_at
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
          .maybeSingle(),
  
        supabase
          .from(
            "design_public_previews"
          )
          .select(`
            design_mockup_variant_id,
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
          ),
  
        supabase
          .from(
            "gmail_connections"
          )
          .select(
            "scopes"
          )
          .eq(
            "user_id",
            userId
          )
          .maybeSingle(),
      ]);
  
    if (
      leadResult.error ||
      !leadResult.data
    ) {
      throw new Error(
        leadResult.error
          ?.message ??
        "Lead not found."
      );
    }
  
    if (
      draftResult.error
    ) {
      throw new Error(
        draftResult.error
          .message
      );
    }
  
    if (
      selectedDesignResult.error
    ) {
      throw new Error(
        selectedDesignResult
          .error
          .message
      );
    }
  
    if (
      previewsResult.error
    ) {
      throw new Error(
        previewsResult
          .error
          .message
      );
    }
  
    if (
      gmailResult.error
    ) {
      throw new Error(
        gmailResult.error
          .message
      );
    }
  
    const lead =
      leadResult.data;
  
    const company =
      getSingleRelation(
        lead.company
      );
  
    const contact =
      getSingleRelation(
        lead.primary_contact
      );
  
    const scopes =
      Array.isArray(
        gmailResult.data
          ?.scopes
      )
        ? gmailResult.data
            .scopes
        : [];
  
    return evaluateOutreachQuality({
      leadStatus:
        lead.status,
  
      companyName:
        company?.name ??
        null,
  
      websiteUrl:
        company?.website_url ??
        null,
  
      contact:
        contact
          ? {
              email:
                contact.email,
  
              full_name:
                contact.full_name,
  
              salutation:
                contact.salutation,
  
              email_quality_status:
                contact.email_quality_status,
  
              email_source_url:
                contact.email_source_url,
  
              email_candidate:
                contact.email_candidate,
  
              email_candidate_source_url:
                contact.email_candidate_source_url,
            }
          : null,
  
      draft:
        draftResult.data
          ? {
              subject:
                draftResult.data
                  .subject,
  
              body:
                draftResult.data
                  .body,
            }
          : null,
  
      selectedDesign:
        selectedDesignResult
          .data
          ? {
              id:
                selectedDesignResult
                  .data.id,
  
              source_snapshot:
                selectedDesignResult
                  .data
                  .source_snapshot,
            }
          : null,
  
      publicPreviews:
        (
          previewsResult.data ??
          []
        ).map(
          (
            preview
          ) => ({
            design_mockup_variant_id:
              preview
                .design_mockup_variant_id,
  
            public_slug:
              preview
                .public_slug,
  
            expires_at:
              preview
                .expires_at,
  
            revoked_at:
              preview
                .revoked_at,
          })
        ),
  
      gmailReady:
        scopes.includes(
          "https://www.googleapis.com/auth/gmail.send"
        ),
    });
  }
  
  /* =========================================================
     ERROR MESSAGE
  ========================================================= */
  
  export function getOutreachQualityBlockingMessage(
    result:
      OutreachQualityResult
  ) {
    if (
      result.ready
    ) {
      return null;
    }
  
    return result.blockers
      .map(
        (
          item
        ) =>
          `${item.label}: ${item.detail}`
      )
      .join(
        " · "
      );
  }
  