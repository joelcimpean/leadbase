import {
    NextResponse,
  } from "next/server";
  
  import {
    generatePreviewGif,
  } from "@/lib/preview-gif";
  
  import {
    createAdminClient,
  } from "@/lib/supabase/admin";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  /* =========================================================
     CONFIG
  ========================================================= */
  
  export const runtime =
    "nodejs";
  
  export const dynamic =
    "force-dynamic";
  
  export const maxDuration =
    300;
  
  const GIF_BUCKET =
    "preview-gifs";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type RouteContext = {
    params:
      Promise<{
        id:
          string;
      }>;
  };
  
  /* =========================================================
     HELPERS
  ========================================================= */
  
  function getRenderBaseUrl(
    request:
      Request
  ) {
    const requestUrl =
      new URL(
        request.url
      );
  
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
  
  function buildRendererUrl({
    request,
    slug,
  }: {
    request:
      Request;
  
    slug:
      string;
  }) {
    const url =
      new URL(
        `/concept/${encodeURIComponent(
          slug
        )}`,
        getRenderBaseUrl(
          request
        )
      );
  
    url.searchParams.set(
      "src",
      "generator"
    );
  
    url.searchParams.set(
      "capture",
      "gif"
    );
  
    return url.toString();
  }
  
  async function getAuthenticatedUser() {
    const supabase =
      await createClient();
  
    const {
      data: {
        user,
      },
  
      error,
    } =
      await supabase.auth.getUser();
  
    return {
      supabase,
      user:
        error
          ? null
          : user,
    };
  }
  
  async function getActivePreview({
    userId,
    leadId,
  }: {
    userId:
      string;
  
    leadId:
      string;
  }) {
    const admin =
      createAdminClient();
  
    const {
      data,
      error,
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
          revoked_at,
          expires_at,
          preview_gif_status,
          preview_gif_path,
          preview_gif_url,
          preview_gif_generated_at,
          preview_gif_error,
          preview_gif_bytes
        `)
        .eq(
          "user_id",
          userId
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
        .limit(
          1
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
  
    if (
      data.expires_at &&
      new Date(
        data.expires_at
      ).getTime() <=
        Date.now()
    ) {
      return null;
    }
  
    return data;
  }
  
  /* =========================================================
     GET STATUS
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
      id:
        leadId,
    } =
      await params;
  
    const {
      user,
    } =
      await getAuthenticatedUser();
  
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
      const preview =
        await getActivePreview({
          userId:
            user.id,
  
          leadId,
        });
  
      if (
        !preview
      ) {
        return NextResponse.json({
          ok:
            true,
  
          exists:
            false,
  
          status:
            "NOT_GENERATED",
        });
      }
  
      return NextResponse.json({
        ok:
          true,
  
        exists:
          true,
  
        status:
          preview.preview_gif_status ??
          "NOT_GENERATED",
  
        gifUrl:
          preview.preview_gif_url,
  
        generatedAt:
          preview.preview_gif_generated_at,
  
        error:
          preview.preview_gif_error,
  
        bytes:
          preview.preview_gif_bytes,
      });
    } catch (
      error
    ) {
      console.error(
        "Could not load preview GIF status:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            error instanceof
              Error
              ? error.message
              : "Could not load preview GIF status.",
        },
        {
          status:
            500,
        }
      );
    }
  }
  
  /* =========================================================
     POST GENERATE / REGENERATE
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
  
    const {
      user,
    } =
      await getAuthenticatedUser();
  
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
  
    const admin =
      createAdminClient();
  
    let previewId:
      string
      | null =
      null;
  
    try {
      const preview =
        await getActivePreview({
          userId:
            user.id,
  
          leadId,
        });
  
      if (
        !preview
      ) {
        return NextResponse.json(
          {
            ok:
              false,
  
            error:
              "Create an active client preview first.",
          },
          {
            status:
              404,
          }
        );
      }
  
      previewId =
        preview.id;
  
      const {
        error:
          generatingError,
      } =
        await admin
          .from(
            "design_public_previews"
          )
          .update({
            preview_gif_status:
              "GENERATING",
  
            preview_gif_error:
              null,
          })
          .eq(
            "id",
            preview.id
          )
          .eq(
            "user_id",
            user.id
          );
  
      if (
        generatingError
      ) {
        throw new Error(
          generatingError.message
        );
      }
  
      const rendererUrl =
        buildRendererUrl({
          request,
          slug:
            preview.public_slug,
        });
  
      const result =
        await generatePreviewGif(
          rendererUrl
        );
  
      const gifCacheKey =
        Date.now()
          .toString(36);

      const previousStoragePath =
        preview.preview_gif_path;

      // Every regeneration gets a new public URL. This prevents
      // browsers/email clients from showing an old cached GIF after
      // the design itself was edited.
      const storagePath =
        `${user.id}/${leadId}/${preview.id}-${gifCacheKey}.gif`;
  
      const {
        error:
          uploadError,
      } =
        await admin
          .storage
          .from(
            GIF_BUCKET
          )
          .upload(
            storagePath,
            Buffer.from(
              result.bytes
            ),
            {
              contentType:
                "image/gif",
  
              cacheControl:
                "60",
  
              upsert:
                true,
            }
          );
  
      if (
        uploadError
      ) {
        throw new Error(
          uploadError.message
        );
      }
  
      const {
        data:
          publicUrlData,
      } =
        admin
          .storage
          .from(
            GIF_BUCKET
          )
          .getPublicUrl(
            storagePath
          );
  
      const gifUrl =
        publicUrlData
          .publicUrl;
  
      const generatedAt =
        new Date()
          .toISOString();
  
      const {
        error:
          updateError,
      } =
        await admin
          .from(
            "design_public_previews"
          )
          .update({
            preview_gif_status:
              "READY",
  
            preview_gif_path:
              storagePath,
  
            preview_gif_url:
              gifUrl,
  
            preview_gif_generated_at:
              generatedAt,
  
            preview_gif_error:
              null,
  
            preview_gif_bytes:
              result.bytes
                .byteLength,
  
            preview_gif_version:
              2,
          })
          .eq(
            "id",
            preview.id
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
  
      if (
        previousStoragePath &&
        previousStoragePath !==
          storagePath
      ) {
        const { error: cleanupError } =
          await admin.storage
            .from(
              GIF_BUCKET
            )
            .remove([
              previousStoragePath,
            ]);

        if (cleanupError) {
          console.warn(
            "Fresh GIF saved, but the old cached file could not be removed:",
            cleanupError
          );
        }
      }

      return NextResponse.json({
        ok:
          true,
  
        status:
          "READY",
  
        gifUrl,
  
        generatedAt,
  
        bytes:
          result.bytes
            .byteLength,
  
        width:
          result.width,
  
        height:
          result.height,
  
        frameCount:
          result.frameCount,
  
        durationMs:
          result.durationMs,
      });
    } catch (
      error
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Preview GIF generation failed.";
  
      console.error(
        "Preview GIF generation failed:",
        error
      );
  
      if (
        previewId
      ) {
        await admin
          .from(
            "design_public_previews"
          )
          .update({
            preview_gif_status:
              "FAILED",
  
            preview_gif_error:
              message,
          })
          .eq(
            "id",
            previewId
          )
          .eq(
            "user_id",
            user.id
          );
      }
  
      return NextResponse.json(
        {
          ok:
            false,
  
          status:
            "FAILED",
  
          error:
            message,
        },
        {
          status:
            500,
        }
      );
    }
  }
  