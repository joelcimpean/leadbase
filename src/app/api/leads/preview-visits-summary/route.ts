import {
    NextResponse,
  } from "next/server";
  
  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  export const runtime =
    "nodejs";
  
  export const dynamic =
    "force-dynamic";
  
  /* =========================================================
     GET
  ========================================================= */
  
  export async function GET() {
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
        previews,
      error:
        previewsError,
    } =
      await admin
        .from(
          "design_public_previews"
        )
        .select(`
          id,
          lead_id,
          public_slug,
          view_count,
          created_at,
          expires_at,
          revoked_at
        `)
        .eq(
          "user_id",
          user.id
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
        );
  
    if (
      previewsError
    ) {
      console.error(
        "Could not load customer preview summaries:",
        previewsError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not load preview summaries.",
        },
        {
          status:
            500,
        }
      );
    }
  
    const now =
      Date.now();
  
    /*
     * One active preview per lead.
     * The share route already revokes older variants, but
     * this keeps the response defensive if older data exists.
     */
    const activeByLead =
      new Map<
        string,
        {
          id:
            string;
  
          leadId:
            string;
  
          publicSlug:
            string;
  
          legacyViewCount:
            number;
        }
      >();
  
    for (
      const preview of
        previews ??
        []
    ) {
      if (
        preview.expires_at &&
        new Date(
          preview.expires_at
        ).getTime() <=
          now
      ) {
        continue;
      }
  
      if (
        activeByLead.has(
          preview.lead_id
        )
      ) {
        continue;
      }
  
      activeByLead.set(
        preview.lead_id,
        {
          id:
            preview.id,
  
          leadId:
            preview.lead_id,
  
          publicSlug:
            preview.public_slug,
  
          legacyViewCount:
            Number(
              preview.view_count ??
                0
            ),
        }
      );
    }
  
    const activePreviews =
      Array.from(
        activeByLead.values()
      );
  
    if (
      activePreviews.length ===
        0
    ) {
      return NextResponse.json({
        ok:
          true,
  
        previews:
          {},
      });
    }
  
    const previewIds =
      activePreviews.map(
        (
          preview
        ) =>
          preview.id
      );
  
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
          preview_id,
          visitor_id,
          session_id,
          is_owner,
          source,
          is_engaged
        `)
        .eq(
          "user_id",
          user.id
        )
        .in(
          "preview_id",
          previewIds
        );
  
    if (
      visitsError
    ) {
      console.error(
        "Could not load customer preview visit summaries:",
        visitsError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not load preview visit summaries.",
        },
        {
          status:
            500,
        }
      );
    }
  
    const visitsByPreview =
      new Map<
        string,
        typeof visits
      >();
  
    for (
      const visit of
        visits ??
        []
    ) {
      const rows =
        visitsByPreview.get(
          visit.preview_id
        ) ??
        [];
  
      rows.push(
        visit
      );
  
      visitsByPreview.set(
        visit.preview_id,
        rows
      );
    }
  
    const result:
      Record<
        string,
        {
          slug:
            string;
  
          totalViews:
            number;
  
          detailedSessions:
            number;
  
          externalVisitors:
            number;
  
          ownerSessions:
            number;
  
          outreachSessions:
            number;
  
          engagedExternalSessions:
            number;
  
          legacyViewCount:
            number;
        }
      > =
      {};
  
    for (
      const preview of
        activePreviews
    ) {
      const rows =
        visitsByPreview.get(
          preview.id
        ) ??
        [];
  
      const external =
        rows.filter(
          (
            visit
          ) =>
            !visit.is_owner
        );
  
      const externalVisitors =
        new Set(
          external.map(
            (
              visit
            ) =>
              visit.visitor_id
          )
        ).size;
  
      const ownerSessions =
        rows.filter(
          (
            visit
          ) =>
            visit.is_owner
        ).length;
  
      const outreachSessions =
        external.filter(
          (
            visit
          ) =>
            visit.source ===
            "OUTREACH"
        ).length;
  
      const engagedExternalSessions =
        external.filter(
          (
            visit
          ) =>
            visit.is_engaged
        ).length;
  
      result[
        preview.leadId
      ] =
        {
          slug:
            preview.publicSlug,
  
          /*
           * The legacy counter stopped when detailed tracking
           * was enabled, so adding both gives the most useful
           * "all-time" number shown in the compact lead list.
           */
          totalViews:
            preview
              .legacyViewCount +
            rows.length,
  
          detailedSessions:
            rows.length,
  
          externalVisitors,
  
          ownerSessions,
  
          outreachSessions,
  
          engagedExternalSessions,
  
          legacyViewCount:
            preview
              .legacyViewCount,
        };
    }
  
    return NextResponse.json({
      ok:
        true,
  
      previews:
        result,
    });
  }
  