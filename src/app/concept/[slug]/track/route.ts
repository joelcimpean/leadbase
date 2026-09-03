import {
    createHash,
  } from "node:crypto";
  
  import {
    NextResponse,
  } from "next/server";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  import {
    recalculateSmartFollowUpForLead,
    shouldRecalculateFromPreviewUpdate,
  } from "@/lib/smart-follow-up";
  
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
  
  type VisitBody = {
    action?:
      unknown;
  
    visitorId?:
      unknown;
  
    sessionId?:
      unknown;
  
    source?:
      unknown;
  
    durationSeconds?:
      unknown;
  
    maxScrollPercent?:
      unknown;
  
    interactionCount?:
      unknown;
  
    engaged?:
      unknown;
  };
  
  /* =========================================================
     VALIDATION
  ========================================================= */
  
  const SLUG_PATTERN =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
  const ID_PATTERN =
    /^[a-zA-Z0-9_-]{8,120}$/;
  
  function cleanId(
    value:
      unknown
  ) {
    if (
      typeof value !==
        "string"
    ) {
      return null;
    }
  
    const cleaned =
      value.trim();
  
    return ID_PATTERN.test(
      cleaned
    )
      ? cleaned
      : null;
  }
  
  function cleanInteger(
    value:
      unknown,
    minimum:
      number,
    maximum:
      number
  ) {
    const numeric =
      typeof value ===
        "number"
        ? value
        : Number(
            value
          );
  
    if (
      !Number.isFinite(
        numeric
      )
    ) {
      return minimum;
    }
  
    return Math.min(
      maximum,
      Math.max(
        minimum,
        Math.round(
          numeric
        )
      )
    );
  }
  
  function cleanHeader(
    value:
      string
      | null
  ) {
    if (
      !value
    ) {
      return null;
    }
  
    try {
      return decodeURIComponent(
        value
      ).slice(
        0,
        180
      );
    } catch {
      return value.slice(
        0,
        180
      );
    }
  }
  
  /* =========================================================
     USER AGENT
  ========================================================= */
  
  function isLikelyBot(
    userAgent:
      string
  ) {
    return /bot|crawler|spider|preview|scanner|headless|googleimageproxy|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|microsoft office|safelinks|proofpoint|mimecast|barracuda|urlscan/i.test(
      userAgent
    );
  }
  
  function detectDevice(
    userAgent:
      string
  ) {
    if (
      /ipad|tablet|kindle|silk/i.test(
        userAgent
      )
    ) {
      return "Tablet";
    }
  
    if (
      /iphone|android.*mobile|windows phone|mobile/i.test(
        userAgent
      )
    ) {
      return "Mobile";
    }
  
    return "Desktop";
  }
  
  function detectBrowser(
    userAgent:
      string
  ) {
    if (
      /edg\//i.test(
        userAgent
      )
    ) {
      return "Edge";
    }
  
    if (
      /opr\/|opera/i.test(
        userAgent
      )
    ) {
      return "Opera";
    }
  
    if (
      /firefox\//i.test(
        userAgent
      )
    ) {
      return "Firefox";
    }
  
    if (
      /chrome\//i.test(
        userAgent
      ) &&
      !/edg\//i.test(
        userAgent
      )
    ) {
      return "Chrome";
    }
  
    if (
      /safari\//i.test(
        userAgent
      ) &&
      !/chrome\//i.test(
        userAgent
      )
    ) {
      return "Safari";
    }
  
    return "Unbekannt";
  }
  
  function detectOs(
    userAgent:
      string
  ) {
    if (
      /iphone|ipad|ipod/i.test(
        userAgent
      )
    ) {
      return "iOS / iPadOS";
    }
  
    if (
      /android/i.test(
        userAgent
      )
    ) {
      return "Android";
    }
  
    if (
      /mac os x|macintosh/i.test(
        userAgent
      )
    ) {
      return "macOS";
    }
  
    if (
      /windows/i.test(
        userAgent
      )
    ) {
      return "Windows";
    }
  
    if (
      /linux/i.test(
        userAgent
      )
    ) {
      return "Linux";
    }
  
    return "Unbekannt";
  }
  
  /* =========================================================
     IP HASH
  ========================================================= */
  
  function getIpHash(
    request:
      Request,
    userAgent:
      string
  ) {
    const forwarded =
      request.headers.get(
        "x-forwarded-for"
      );
  
    const ip =
      forwarded
        ?.split(
          ","
        )[0]
        ?.trim() ||
      request.headers.get(
        "x-real-ip"
      ) ||
      "";
  
    if (
      !ip
    ) {
      return null;
    }
  
    const salt =
      process.env
        .PREVIEW_TRACKING_SALT ||
      process.env
        .CRON_SECRET ||
      "leadbase-preview";
  
    return createHash(
      "sha256"
    )
      .update(
        `${salt}:${ip}:${userAgent}`
      )
      .digest(
        "hex"
      );
  }
  
  /* =========================================================
     BODY
  ========================================================= */
  
  async function readBody(
    request:
      Request
  ): Promise<VisitBody> {
    try {
      return (
        await request.json()
      ) as VisitBody;
    } catch {
      return {};
    }
  }
  
  /* =========================================================
     POST
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
  
    const body =
      await readBody(
        request
      );
  
    const visitorId =
      cleanId(
        body.visitorId
      );
  
    const sessionId =
      cleanId(
        body.sessionId
      );
  
    if (
      !visitorId ||
      !sessionId
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Invalid visitor session.",
        },
        {
          status:
            400,
        }
      );
    }
  
    const userAgent =
      (
        request.headers.get(
          "user-agent"
        ) ||
        ""
      ).slice(
        0,
        1000
      );
  
    /*
     * Obvious scanners and bots do not become customer views.
     */
    if (
      isLikelyBot(
        userAgent
      )
    ) {
      return NextResponse.json({
        ok:
          true,
  
        ignored:
          true,
      });
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
          expires_at,
          revoked_at
        `)
        .eq(
          "public_slug",
          slug
        )
        .maybeSingle();
  
    if (
      previewError ||
      !preview ||
      preview.revoked_at
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
      preview.expires_at &&
      new Date(
        preview.expires_at
      ).getTime() <=
        Date.now()
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Preview expired.",
        },
        {
          status:
            410,
        }
      );
    }
  
    /*
     * If Joel opens the public link while logged in on the
     * same browser, the normal Supabase session cookie lets us
     * mark this visit as OWNER instead of customer traffic.
     */
    const authClient =
      await createClient();
  
    const {
      data: {
        user,
      },
    } =
      await authClient.auth.getUser();
  
    const isOwner =
      Boolean(
        user &&
        user.id ===
          preview.user_id
      );
  
    const requestedSource =
      body.source ===
        "OUTREACH"
        ? "OUTREACH"
        : "DIRECT";
  
    const source =
      isOwner
        ? "OWNER"
        : requestedSource;
  
    const durationSeconds =
      cleanInteger(
        body.durationSeconds,
        0,
        60 *
          60 *
          12
      );
  
    const maxScrollPercent =
      cleanInteger(
        body.maxScrollPercent,
        0,
        100
      );
  
    const interactionCount =
      cleanInteger(
        body.interactionCount,
        0,
        10000
      );
  
    const engaged =
      body.engaged ===
        true ||
      durationSeconds >=
        8 ||
      maxScrollPercent >=
        25 ||
      interactionCount >=
        1;
  
    const now =
      new Date()
        .toISOString();
  
    const countryCode =
      cleanHeader(
        request.headers.get(
          "x-vercel-ip-country"
        )
      );
  
    const countryRegion =
      cleanHeader(
        request.headers.get(
          "x-vercel-ip-country-region"
        )
      );
  
    const city =
      cleanHeader(
        request.headers.get(
          "x-vercel-ip-city"
        )
      );
  
    const timezone =
      cleanHeader(
        request.headers.get(
          "x-vercel-ip-timezone"
        )
      );
  
    const {
      data:
        existing,
      error:
        existingError,
    } =
      await admin
        .from(
          "design_preview_visits"
        )
        .select(`
          id,
          source,
          is_owner,
          is_engaged,
          engaged_at,
          duration_seconds,
          max_scroll_percent,
          interaction_count
        `)
        .eq(
          "preview_id",
          preview.id
        )
        .eq(
          "session_id",
          sessionId
        )
        .maybeSingle();
  
    if (
      existingError
    ) {
      console.error(
        "Could not load existing preview visit:",
        existingError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Could not track preview.",
        },
        {
          status:
            500,
        }
      );
    }
  
    if (
      existing
    ) {
      const nextSource =
        isOwner
          ? "OWNER"
          : existing.source ===
              "OUTREACH" ||
            source ===
              "OUTREACH"
            ? "OUTREACH"
            : "DIRECT";
  
      const nextEngaged =
        existing.is_engaged ||
        engaged;
  
      const nextDurationSeconds =
        Math.max(
          existing.duration_seconds ??
            0,
          durationSeconds
        );
  
      const nextScrollPercent =
        Math.max(
          existing.max_scroll_percent ??
            0,
          maxScrollPercent
        );
  
      const shouldRecalculate =
        !isOwner &&
        !existing.is_owner &&
        shouldRecalculateFromPreviewUpdate({
          existingEngaged:
            Boolean(
              existing.is_engaged
            ),
  
          existingDurationSeconds:
            Number(
              existing.duration_seconds ??
                0
            ),
  
          existingScrollPercent:
            Number(
              existing.max_scroll_percent ??
                0
            ),
  
          nextEngaged,
  
          nextDurationSeconds,
  
          nextScrollPercent,
        });
  
      const {
        error:
          updateError,
      } =
        await admin
          .from(
            "design_preview_visits"
          )
          .update({
            source:
              nextSource,
  
            is_owner:
              existing.is_owner ||
              isOwner,
  
            is_engaged:
              nextEngaged,
  
            engaged_at:
              existing.engaged_at ||
              (
                engaged
                  ? now
                  : null
              ),
  
            last_seen_at:
              now,
  
            duration_seconds:
              nextDurationSeconds,
  
            max_scroll_percent:
              nextScrollPercent,
  
            interaction_count:
              Math.max(
                existing.interaction_count ??
                  0,
                interactionCount
              ),
  
            country_code:
              countryCode,
  
            country_region:
              countryRegion,
  
            city,
  
            timezone,
  
            device_type:
              detectDevice(
                userAgent
              ),
  
            browser_name:
              detectBrowser(
                userAgent
              ),
  
            os_name:
              detectOs(
                userAgent
              ),
  
            user_agent:
              userAgent,
  
            ip_hash:
              getIpHash(
                request,
                userAgent
              ),
          })
          .eq(
            "id",
            existing.id
          );
  
      if (
        updateError
      ) {
        console.error(
          "Could not update preview visit:",
          updateError
        );
  
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "Could not track preview.",
          },
          {
            status:
              500,
          }
        );
      }
  
      if (
        shouldRecalculate
      ) {
        await recalculateSmartFollowUpForLead({
          supabase:
            admin,
  
          userId:
            preview.user_id,
  
          leadId:
            preview.lead_id,
        });
      }
  
      return NextResponse.json({
        ok:
          true,
  
        isOwner,
  
        source:
          nextSource,
      });
    }
  
    const {
      error:
        insertError,
    } =
      await admin
        .from(
          "design_preview_visits"
        )
        .insert({
          preview_id:
            preview.id,
  
          user_id:
            preview.user_id,
  
          lead_id:
            preview.lead_id,
  
          public_slug:
            preview.public_slug,
  
          visitor_id:
            visitorId,
  
          session_id:
            sessionId,
  
          source,
  
          is_owner:
            isOwner,
  
          is_engaged:
            engaged,
  
          engaged_at:
            engaged
              ? now
              : null,
  
          first_seen_at:
            now,
  
          last_seen_at:
            now,
  
          duration_seconds:
            durationSeconds,
  
          max_scroll_percent:
            maxScrollPercent,
  
          interaction_count:
            interactionCount,
  
          country_code:
            countryCode,
  
          country_region:
            countryRegion,
  
          city,
  
          timezone,
  
          device_type:
            detectDevice(
              userAgent
            ),
  
          browser_name:
            detectBrowser(
              userAgent
            ),
  
          os_name:
            detectOs(
              userAgent
            ),
  
          user_agent:
            userAgent,
  
          ip_hash:
            getIpHash(
              request,
              userAgent
            ),
        });
  
    if (
      insertError
    ) {
      /*
       * A fast duplicate start/update is harmless because the
       * session has already been stored.
       */
      if (
        insertError.code !==
          "23505"
      ) {
        console.error(
          "Could not insert preview visit:",
          insertError
        );
  
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "Could not track preview.",
          },
          {
            status:
              500,
          }
        );
      }
    } else if (
      !isOwner
    ) {
      /*
       * Keep the existing simple view_count useful, but from
       * now on it only increments for new non-owner browser
       * sessions that survived the bot/client-side checks.
       */
      const {
        error:
          legacyCountError,
      } =
        await admin.rpc(
          "track_public_design_preview_view",
          {
            p_slug:
              slug,
          }
        );
  
      if (
        legacyCountError
      ) {
        console.warn(
          "Detailed preview visit was saved, but legacy view_count could not be incremented:",
          legacyCountError
        );
      }
  
      /*
       * A brand-new external session is always a meaningful
       * signal: first view or repeat visit.
       */
      await recalculateSmartFollowUpForLead({
        supabase:
          admin,
  
        userId:
          preview.user_id,
  
        leadId:
          preview.lead_id,
      });
    }
  
    return NextResponse.json({
      ok:
        true,
  
      isOwner,
  
      source,
    });
  }
  