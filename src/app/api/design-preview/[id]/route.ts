import {
    NextResponse,
  } from "next/server";
  
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
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type RouteContext = {
    params: Promise<{
      id:
        string;
    }>;
  };
  
  type UpdateBody = {
    html?:
      unknown;
  };
  
  type StaticDesignSnapshot = {
    version:
      3;
  
    renderMode:
      "html";
  
    html:
      string;
  
    allowedImages?:
      string[];
  
    [
      key:
        string
    ]:
      unknown;
  };
  
  type UploadedImageMime =
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif";
  
  /* =========================================================
     CONSTANTS
  ========================================================= */
  
  const DESIGN_ASSET_BUCKET =
    "design-editor-assets";
  
  const MAX_UPLOAD_BYTES =
    10 *
    1024 *
    1024;
  
  const MIME_TO_EXTENSION:
    Record<
      UploadedImageMime,
      string
    > = {
    "image/jpeg":
      "jpg",
  
    "image/png":
      "png",
  
    "image/webp":
      "webp",
  
    "image/gif":
      "gif",
  };
  
  /* =========================================================
     HELPERS
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
  
  function getSnapshot(
    value:
      unknown
  ): StaticDesignSnapshot | null {
    if (
      !isRecord(
        value
      )
    ) {
      return null;
    }
  
    if (
      value.version !==
        3 ||
      value.renderMode !==
        "html" ||
      typeof value.html !==
        "string"
    ) {
      return null;
    }
  
    return value as
      StaticDesignSnapshot;
  }
  
  function sanitizeHtml(
    value:
      string
  ) {
    let html =
      value;
  
    html =
      html.replace(
        /<script\b[^>]*>[\s\S]*?<\/script>/gi,
        ""
      );
  
    html =
      html.replace(
        /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
        ""
      );
  
    html =
      html.replace(
        /<object\b[^>]*>[\s\S]*?<\/object>/gi,
        ""
      );
  
    html =
      html.replace(
        /<embed\b[^>]*\/?>/gi,
        ""
      );
  
    html =
      html.replace(
        /\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
        ""
      );
  
    html =
      html.replace(
        /javascript:/gi,
        ""
      );
  
    html =
      html.replace(
        /<meta[^>]+http-equiv=["']?refresh["']?[^>]*>/gi,
        ""
      );
  
    return html.trim();
  }
  
  function isRemoteImageUrl(
    value:
      string
  ) {
    try {
      const url =
        new URL(
          value
        );
  
      return (
        url.protocol ===
          "https:" ||
        url.protocol ===
          "http:"
      );
    } catch {
      return false;
    }
  }
  
  function extractImageUrls(
    html:
      string
  ) {
    const result =
      new Set<string>();
  
    const imageMatches =
      html.matchAll(
        /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
      );
  
    for (
      const match of
        imageMatches
    ) {
      const url =
        match[1]
          ?.trim();
  
      if (
        url &&
        isRemoteImageUrl(
          url
        )
      ) {
        result.add(
          url
        );
      }
    }
  
    const backgroundMatches =
      html.matchAll(
        /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi
      );
  
    for (
      const match of
        backgroundMatches
    ) {
      const url =
        (
          match[1] ??
          match[2] ??
          match[3] ??
          ""
        ).trim();
  
      if (
        url &&
        isRemoteImageUrl(
          url
        )
      ) {
        result.add(
          url
        );
      }
    }
  
    return Array.from(
      result
    );
  }
  
  function isAllowedImageMime(
    value:
      string
  ): value is UploadedImageMime {
    return (
      value ===
        "image/jpeg" ||
      value ===
        "image/png" ||
      value ===
        "image/webp" ||
      value ===
        "image/gif"
    );
  }
  
  /* =========================================================
     POST — UPLOAD OWN IMAGE
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
      id,
    } =
      await params;
  
    const supabase =
      await createClient();
  
    /* =======================================================
       AUTH
    ======================================================= */
  
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
  
    /* =======================================================
       VERIFY VARIANT
    ======================================================= */
  
    const {
      data:
        variant,
  
      error:
        variantError,
    } =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .select(`
          id,
          source_snapshot
        `)
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();
  
    if (
      variantError ||
      !variant
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Design variant not found.",
        },
        {
          status:
            404,
        }
      );
    }
  
    const snapshot =
      getSnapshot(
        variant.source_snapshot
      );
  
    if (
      !snapshot
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "This design cannot be edited.",
        },
        {
          status:
            400,
        }
      );
    }
  
    /* =======================================================
       FILE
    ======================================================= */
  
    let formData:
      FormData;
  
    try {
      formData =
        await request.formData();
    } catch {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Invalid upload body.",
        },
        {
          status:
            400,
        }
      );
    }
  
    const value =
      formData.get(
        "file"
      );
  
    if (
      !(value instanceof File)
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "file is required.",
        },
        {
          status:
            400,
        }
      );
    }
  
    if (
      value.size <=
      0
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The selected image is empty.",
        },
        {
          status:
            400,
        }
      );
    }
  
    if (
      value.size >
      MAX_UPLOAD_BYTES
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The image may not exceed 10 MB.",
        },
        {
          status:
            413,
        }
      );
    }
  
    if (
      !isAllowedImageMime(
        value.type
      )
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Only JPG, PNG, WebP and GIF are supported.",
        },
        {
          status:
            415,
        }
      );
    }
  
    /* =======================================================
       STORAGE
    ======================================================= */
  
    const extension =
      MIME_TO_EXTENSION[
        value.type
      ];
  
    const storagePath =
      `${user.id}/${id}/${crypto.randomUUID()}.${extension}`;
  
    const bytes =
      await value.arrayBuffer();
  
    const uploadResult =
      await supabase.storage
        .from(
          DESIGN_ASSET_BUCKET
        )
        .upload(
          storagePath,
          Buffer.from(
            bytes
          ),
          {
            contentType:
              value.type,
  
            cacheControl:
              "31536000",
  
            upsert:
              false,
          }
        );
  
    if (
      uploadResult.error
    ) {
      console.error(
        "Could not upload design editor image:",
        uploadResult.error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The image could not be uploaded.",
        },
        {
          status:
            500,
        }
      );
    }
  
    const {
      data:
        publicUrlData,
    } =
      supabase.storage
        .from(
          DESIGN_ASSET_BUCKET
        )
        .getPublicUrl(
          storagePath
        );
  
    const publicUrl =
      publicUrlData
        .publicUrl
        ?.trim();
  
    if (
      !publicUrl
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The uploaded image has no public URL.",
        },
        {
          status:
            500,
        }
      );
    }
  
    /* =======================================================
       REMEMBER IMAGE IN SNAPSHOT
    ======================================================= */
  
    const nextAllowedImages =
      Array.from(
        new Set(
          [
            publicUrl,
  
            ...(
              Array.isArray(
                snapshot.allowedImages
              )
                ? snapshot.allowedImages
                : []
            ),
          ].filter(
            (
              item
            ): item is string =>
              typeof item ===
                "string" &&
              isRemoteImageUrl(
                item
              )
          )
        )
      ).slice(
        0,
        150
      );
  
    const snapshotUpdate =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .update({
          source_snapshot: {
            ...snapshot,
  
            allowedImages:
              nextAllowedImages,
  
            assetsUpdatedAt:
              new Date()
                .toISOString(),
          },
        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        );
  
    if (
      snapshotUpdate.error
    ) {
      console.warn(
        "Uploaded image could not be added to the snapshot image library:",
        snapshotUpdate.error
      );
    }
  
    return NextResponse.json({
      ok:
        true,
  
      url:
        publicUrl,
  
      allowedImages:
        nextAllowedImages,
    });
  }
  
  /* =========================================================
     PATCH — SAVE EDITED HTML
  ========================================================= */
  
  export async function PATCH(
    request:
      Request,
    {
      params,
    }:
      RouteContext
  ) {
    const {
      id,
    } =
      await params;
  
    let body:
      UpdateBody = {};
  
    try {
      body =
        (await request.json()) as
          UpdateBody;
    } catch {
      body = {};
    }
  
    if (
      typeof body.html !==
        "string"
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "html is required.",
        },
        {
          status:
            400,
        }
      );
    }
  
    const sanitizedHtml =
      sanitizeHtml(
        body.html
      );
  
    if (
      sanitizedHtml.length <
      500
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The design HTML is incomplete.",
        },
        {
          status:
            400,
        }
      );
    }
  
    const supabase =
      await createClient();
  
    /* =======================================================
       AUTH
    ======================================================= */
  
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
  
    /* =======================================================
       LOAD CURRENT VARIANT
    ======================================================= */
  
    const {
      data:
        variant,
  
      error:
        variantError,
    } =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .select(`
          id,
          source_snapshot
        `)
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();
  
    if (
      variantError ||
      !variant
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Design variant not found.",
        },
        {
          status:
            404,
        }
      );
    }
  
    const snapshot =
      getSnapshot(
        variant.source_snapshot
      );
  
    if (
      !snapshot
    ) {
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "This design cannot be edited.",
        },
        {
          status:
            400,
        }
      );
    }
  
    /* =======================================================
       IMAGES
    ======================================================= */
  
    const allowedImages =
      Array.from(
        new Set(
          [
            ...(
              Array.isArray(
                snapshot.allowedImages
              )
                ? snapshot.allowedImages
                : []
            ),
  
            ...extractImageUrls(
              sanitizedHtml
            ),
          ].filter(
            (
              value
            ): value is string =>
              typeof value ===
                "string" &&
              isRemoteImageUrl(
                value
              )
          )
        )
      ).slice(
        0,
        150
      );
  
    const nextSnapshot = {
      ...snapshot,
  
      html:
        sanitizedHtml,
  
      allowedImages,
  
      editedAt:
        new Date()
          .toISOString(),
    };
  
    /* =======================================================
       SAVE
    ======================================================= */
  
    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .update({
          source_snapshot:
            nextSnapshot,
        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          user.id
        );
  
    if (
      updateError
    ) {
      console.error(
        "Could not save edited design:",
        updateError
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "The design could not be saved.",
        },
        {
          status:
            500,
        }
      );
    }
  
    return NextResponse.json({
      ok:
        true,
  
      html:
        sanitizedHtml,
  
      allowedImages,
    });
  }