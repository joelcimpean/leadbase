import {
    randomBytes,
  } from "node:crypto";
  
  import {
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type RouteContext = {
    params: Promise<{
      id:
        string;
    }>;
  };
  
  type RequestBody = {
    previewId?:
      unknown;
  };
  
  type ServerSupabaseClient =
    Awaited<
      ReturnType<
        typeof createClient
      >
    >;
  
  type SelectedVariantRow = {
    id:
      string;
  
    generation_index:
      number;
  
    source_snapshot:
      unknown;
  
    selected:
      boolean;
  
    selected_at:
      string
      | null;
  
    created_at:
      string;
  };
  
  type CompanyRow = {
    id:
      string;
  
    name:
      string;
  
    website_url:
      string
      | null;
  };
  
  /* =========================================================
     RECORD
  ========================================================= */
  
  function isRecord(
    value:
      unknown
  ): value is Record<
    string,
    unknown
  > {
    return (
      typeof value ===
        "object" &&
      value !==
        null &&
      !Array.isArray(
        value
      )
    );
  }
  
  /* =========================================================
     STATIC DESIGN SNAPSHOT
  ========================================================= */
  
  function isPublishableDesignSnapshot(
    value:
      unknown
  ) {
    if (
      !isRecord(
        value
      )
    ) {
      return false;
    }
  
    if (
      value.version !==
        3 ||
      value.renderMode !==
        "html"
    ) {
      return false;
    }
  
    if (
      typeof value.html !==
        "string" ||
      value.html.trim()
        .length <
        500
    ) {
      return false;
    }
  
    return true;
  }
  
  /* =========================================================
     PREVIEW ID
  ========================================================= */
  
  function getPreviewId(
    value:
      unknown
  ) {
    return typeof value ===
        "string"
      ? value.trim()
      : "";
  }
  
  /* =========================================================
     SLUG
  ========================================================= */
  
  function slugify(
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
  
  function createPublicSlug(
    companyName:
      string
  ) {
    const suffix =
      randomBytes(
        4
      ).toString(
        "hex"
      );
  
    return `${slugify(
      companyName
    )}-${suffix}`;
  }
  
  /* =========================================================
     PUBLIC URL
  ========================================================= */
  
  function getPublicBaseUrl(
    request:
      Request
  ) {
    const requestUrl =
      new URL(
        request.url
      );
  
    /*
     * Local testing must stay local even when a production
     * preview base URL exists in .env.
     */
    if (
      requestUrl.hostname ===
        "localhost" ||
      requestUrl.hostname ===
        "127.0.0.1" ||
      requestUrl.hostname ===
        "::1"
    ) {
      return requestUrl.origin;
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
  
    return requestUrl.origin;
  }
  
  function buildShareUrl(
    request:
      Request,
    slug:
      string
  ) {
    return `${getPublicBaseUrl(
      request
    )}/concept/${encodeURIComponent(
      slug
    )}`;
  }
  
  /* =========================================================
     AUTH
  ========================================================= */
  
  async function getAuthenticatedUser(
    supabase:
      ServerSupabaseClient
  ) {
    const {
      data: {
        user,
      },
  
      error,
    } =
      await supabase.auth.getUser();
  
    if (
      error ||
      !user
    ) {
      return null;
    }
  
    return user;
  }
  
  /* =========================================================
     READ BODY
  ========================================================= */
  
  async function readBody(
    request:
      Request
  ) {
    try {
      return (
        await request.json()
      ) as RequestBody;
    } catch {
      return {};
    }
  }
  
  /* =========================================================
     COMPANY
  ========================================================= */
  
  async function getCompany({
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
      data,
      error,
    } =
      await supabase
        .from(
          "leads"
        )
        .select(`
          id,
  
          company:companies (
            id,
            name,
            website_url
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
      error
    ) {
      throw new Error(
        error.message
      );
    }
  
    if (
      !data
    ) {
      return null;
    }
  
    const relation =
      data.company;
  
    if (
      Array.isArray(
        relation
      )
    ) {
      return (
        relation[0] ??
        null
      ) as
        CompanyRow
        | null;
    }
  
    return relation as
      CompanyRow
      | null;
  }
  
  /* =========================================================
     SELECTED DESIGN
  ========================================================= */
  
  async function getSelectedVariant({
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
          generation_index,
          source_snapshot,
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
      return selected as
        SelectedVariantRow;
    }
  
    /*
     * Defensive fallback for older rows where no selected
     * flag may exist.
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
          generation_index,
          source_snapshot,
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
  
    return latest as
      SelectedVariantRow
      | null;
  }
  
  /* =========================================================
     EXISTING PUBLIC PREVIEW
  ========================================================= */
  
  async function getExistingShare({
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
          lead_id,
          design_mockup_variant_id,
          public_slug,
          view_count,
          last_viewed_at,
          created_at,
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
  
  /* =========================================================
     GET STATUS
  ========================================================= */
  
  export async function GET(
    request:
      Request,
    {
      params,
    }:
      RouteContext
  ) {
    const {
      id:
        leadId,
    } =
      await params;
  
    const supabase =
      await createClient();
  
    const user =
      await getAuthenticatedUser(
        supabase
      );
  
    if (
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
  
    try {
      const selected =
        await getSelectedVariant({
          supabase,
  
          userId:
            user.id,
  
          leadId,
        });
  
      if (
        !selected
      ) {
        return NextResponse.json({
          ok:
            true,
  
          shared:
            false,
        });
      }
  
      const share =
        await getExistingShare({
          supabase,
  
          userId:
            user.id,
  
          variantId:
            selected.id,
        });
  
      if (
        !share ||
        share.revoked_at
      ) {
        return NextResponse.json({
          ok:
            true,
  
          shared:
            false,
  
          previewId:
            selected.id,
        });
      }
  
      if (
        share.expires_at &&
        new Date(
          share.expires_at
        ).getTime() <=
          Date.now()
      ) {
        return NextResponse.json({
          ok:
            true,
  
          shared:
            false,
  
          previewId:
            selected.id,
        });
      }
  
      return NextResponse.json({
        ok:
          true,
  
        shared:
          true,
  
        previewId:
          selected.id,
  
        publicSlug:
          share.public_slug,
  
        shareUrl:
          buildShareUrl(
            request,
            share.public_slug
          ),
  
        viewCount:
          share.view_count,
  
        lastViewedAt:
          share.last_viewed_at,
  
        createdAt:
          share.created_at,
  
        expiresAt:
          share.expires_at,
      });
    } catch (
      error
    ) {
      console.error(
        "Could not load design share status:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not load customer preview status.",
        },
        {
          status:
            500,
        }
      );
    }
  }
  
  /* =========================================================
     PUBLISH
  ========================================================= */
  
  export async function POST(
    request:
      Request,
    {
      params,
    }:
      RouteContext
  ) {
    const {
      id:
        leadId,
    } =
      await params;
  
    const body =
      await readBody(
        request
      );
  
    const requestedPreviewId =
      getPreviewId(
        body.previewId
      );
  
    const supabase =
      await createClient();
  
    const user =
      await getAuthenticatedUser(
        supabase
      );
  
    if (
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
  
    try {
      const [
        selected,
        company,
      ] =
        await Promise.all([
          getSelectedVariant({
            supabase,
  
            userId:
              user.id,
  
            leadId,
          }),
  
          getCompany({
            supabase,
  
            userId:
              user.id,
  
            leadId,
          }),
        ]);
  
      if (
        !selected
      ) {
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "No redesign has been selected.",
          },
          {
            status:
              404,
          }
        );
      }
  
      if (
        requestedPreviewId &&
        requestedPreviewId !==
          selected.id
      ) {
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "The selected design changed. Please try again.",
          },
          {
            status:
              409,
          }
        );
      }
  
      if (
        !isPublishableDesignSnapshot(
          selected.source_snapshot
        )
      ) {
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "The selected design cannot be published.",
          },
          {
            status:
              400,
          }
        );
      }
  
      if (
        !company
      ) {
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "Company not found.",
          },
          {
            status:
              404,
          }
        );
      }
  
      /*
       * There should only be one current customer-preview
       * design for a lead.
       *
       * Older public links stay in the database, but become
       * revoked as soon as a different design is published.
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
            user.id
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
        await getExistingShare({
          supabase,
  
          userId:
            user.id,
  
          variantId:
            selected.id,
        });
  
      /* =====================================================
         REACTIVATE
      ===================================================== */
  
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
                company.name,
  
              source_website_url:
                company.website_url,
            })
            .eq(
              "id",
              existing.id
            )
            .eq(
              "user_id",
              user.id
            );
  
        if (
          updateError
        ) {
          throw new Error(
            updateError.message
          );
        }
  
        return NextResponse.json({
          ok:
            true,
  
          shared:
            true,
  
          previewId:
            selected.id,
  
          publicSlug:
            existing.public_slug,
  
          shareUrl:
            buildShareUrl(
              request,
              existing.public_slug
            ),
  
          viewCount:
            existing.view_count,
  
          lastViewedAt:
            existing.last_viewed_at,
        });
      }
  
      /* =====================================================
         CREATE
      ===================================================== */
  
      let created:
        {
          id:
            string;
  
          public_slug:
            string;
  
          view_count:
            number;
  
          last_viewed_at:
            string
            | null;
  
          created_at:
            string;
        }
        | null =
        null;
  
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
          createPublicSlug(
            company.name
          );
  
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "design_public_previews"
            )
            .insert({
              user_id:
                user.id,
  
              lead_id:
                leadId,
  
              design_mockup_variant_id:
                selected.id,
  
              public_slug:
                publicSlug,
  
              source_snapshot:
                selected.source_snapshot,
  
              source_brand_name:
                company.name,
  
              source_website_url:
                company.website_url,
  
              expires_at:
                null,
  
              revoked_at:
                null,
            })
            .select(`
              id,
              public_slug,
              view_count,
              last_viewed_at,
              created_at
            `)
            .single();
  
        if (
          !error &&
          data
        ) {
          created =
            data;
  
          break;
        }
  
        lastInsertError =
          error?.message ??
          "Unknown insert error.";
  
        /*
         * Handles two requests publishing the same variant
         * at nearly the same time.
         */
        const concurrent =
          await getExistingShare({
            supabase,
  
            userId:
              user.id,
  
            variantId:
              selected.id,
          });
  
        if (
          concurrent
        ) {
          return NextResponse.json({
            ok:
              true,
  
            shared:
              true,
  
            previewId:
              selected.id,
  
            publicSlug:
              concurrent.public_slug,
  
            shareUrl:
              buildShareUrl(
                request,
                concurrent.public_slug
              ),
  
            viewCount:
              concurrent.view_count,
  
            lastViewedAt:
              concurrent.last_viewed_at,
          });
        }
      }
  
      if (
        !created
      ) {
        throw new Error(
          lastInsertError ??
          "Could not create public preview."
        );
      }
  
      return NextResponse.json({
        ok:
          true,
  
        shared:
          true,
  
        previewId:
          selected.id,
  
        publicSlug:
          created.public_slug,
  
        shareUrl:
          buildShareUrl(
            request,
            created.public_slug
          ),
  
        viewCount:
          created.view_count,
  
        lastViewedAt:
          created.last_viewed_at,
      });
    } catch (
      error
    ) {
      console.error(
        "Could not publish design preview:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The customer preview could not be created.",
        },
        {
          status:
            500,
        }
      );
    }
  }
  
  /* =========================================================
     REVOKE
  ========================================================= */
  
  export async function DELETE(
    request:
      Request,
    {
      params,
    }:
      RouteContext
  ) {
    const {
      id:
        leadId,
    } =
      await params;
  
    const body =
      await readBody(
        request
      );
  
    const requestedPreviewId =
      getPreviewId(
        body.previewId
      );
  
    const supabase =
      await createClient();
  
    const user =
      await getAuthenticatedUser(
        supabase
      );
  
    if (
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
  
    try {
      const selected =
        await getSelectedVariant({
          supabase,
  
          userId:
            user.id,
  
          leadId,
        });
  
      if (
        !selected
      ) {
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "No selected design exists.",
          },
          {
            status:
              404,
          }
        );
      }
  
      if (
        requestedPreviewId &&
        requestedPreviewId !==
          selected.id
      ) {
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "The selected design changed.",
          },
          {
            status:
              409,
          }
        );
      }
  
      const {
        error,
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
            user.id
          )
          .eq(
            "lead_id",
            leadId
          )
          .eq(
            "design_mockup_variant_id",
            selected.id
          );
  
      if (
        error
      ) {
        throw new Error(
          error.message
        );
      }
  
      return NextResponse.json({
        ok:
          true,
  
        shared:
          false,
  
        previewId:
          selected.id,
      });
    } catch (
      error
    ) {
      console.error(
        "Could not revoke design preview:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The customer preview could not be disabled.",
        },
        {
          status:
            500,
        }
      );
    }
  }