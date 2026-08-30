import {
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  export const runtime =
    "nodejs";
  
  export const dynamic =
    "force-dynamic";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type RouteContext = {
    params: Promise<{
      slug:
        string;
    }>;
  };
  
  const SLUG_PATTERN =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
  /* =========================================================
     GET
  ========================================================= */
  
  export async function GET(
    _request:
      Request,
    {
      params,
    }:
      RouteContext
  ) {
    const {
      slug,
    } =
      await params;
  
    if (
      !SLUG_PATTERN.test(
        slug
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Invalid preview.",
        },
        {
          status:
            400,
        }
      );
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
  
    const admin =
      createAdminClient();
  
    const {
      data:
        preview,
      error:
        previewError,
    } =
      await admin
        .from(
          "design_public_previews"
        )
        .select(`
          id,
          user_id,
          lead_id,
          public_slug,
          view_count,
          last_viewed_at
        `)
        .eq(
          "public_slug",
          slug
        )
        .maybeSingle();
  
    if (
      previewError ||
      !preview
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Preview not found.",
        },
        {
          status:
            404,
        }
      );
    }
  
    if (
      preview.user_id !==
        user.id
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Forbidden.",
        },
        {
          status:
            403,
        }
      );
    }
  
    const {
      data:
        visits,
      error:
        visitsError,
    } =
      await admin
        .from(
          "design_preview_visits"
        )
        .select(`
          id,
          visitor_id,
          session_id,
          source,
          is_owner,
          is_engaged,
          first_seen_at,
          last_seen_at,
          engaged_at,
          duration_seconds,
          max_scroll_percent,
          interaction_count,
          country_code,
          country_region,
          city,
          timezone,
          device_type,
          browser_name,
          os_name
        `)
        .eq(
          "preview_id",
          preview.id
        )
        .order(
          "first_seen_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          100
        );
  
    if (
      visitsError
    ) {
      console.error(
        "Could not load preview visits:",
        visitsError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not load visits.",
        },
        {
          status:
            500,
        }
      );
    }
  
    const rows =
      visits ??
      [];
  
    const externalRows =
      rows.filter(
        (
          visit
        ) =>
          !visit.is_owner
      );
  
    const ownerRows =
      rows.filter(
        (
          visit
        ) =>
          visit.is_owner
      );
  
    const outreachRows =
      externalRows.filter(
        (
          visit
        ) =>
          visit.source ===
            "OUTREACH"
      );
  
    const engagedExternalRows =
      externalRows.filter(
        (
          visit
        ) =>
          visit.is_engaged
      );
  
    const externalVisitorCount =
      new Set(
        externalRows.map(
          (
            visit
          ) =>
            visit.visitor_id
        )
      ).size;
  
    return NextResponse.json({
      ok:
        true,
  
      summary: {
        legacyViewCount:
          preview.view_count ??
          0,
  
        externalSessions:
          externalRows.length,
  
        externalVisitors:
          externalVisitorCount,
  
        ownerSessions:
          ownerRows.length,
  
        outreachSessions:
          outreachRows.length,
  
        engagedExternalSessions:
          engagedExternalRows.length,
  
        lastViewedAt:
          preview.last_viewed_at,
      },
  
      visits:
        rows,
    });
  }
  