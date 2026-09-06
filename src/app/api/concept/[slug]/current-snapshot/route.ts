import {
  NextResponse,
} from "next/server";

import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

import {
  captureWebsiteScreenshots,
} from "@/lib/website-screenshot";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    slug:
      string;
  }>;
};

type PublicPreviewRow = {
  source_website_url?:
    string
    | null;
};

const SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function createPublicSupabaseClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    return null;
  }

  return createSupabaseClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        detectSessionInUrl:
          false,
      },
    }
  );
}

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
        error:
          "Invalid preview slug.",
      },
      {
        status:
          400,
      }
    );
  }

  const supabase =
    createPublicSupabaseClient();

  if (
    !supabase
  ) {
    return NextResponse.json(
      {
        error:
          "Preview service is unavailable.",
      },
      {
        status:
          503,
      }
    );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_public_design_preview_by_slug",
      {
        p_slug:
          slug,
      }
    );

  if (
    error
  ) {
    console.error(
      "Could not load public preview for current-site snapshot:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Preview not found.",
      },
      {
        status:
          404,
      }
    );
  }

  const row =
    (Array.isArray(
      data
    )
      ? data[0] ??
        null
      : data) as
      | PublicPreviewRow
      | null;

  const websiteUrl =
    row
      ?.source_website_url
      ?.trim();

  if (
    !websiteUrl
  ) {
    return NextResponse.json(
      {
        error:
          "No source website is available.",
      },
      {
        status:
          404,
      }
    );
  }

  try {
    const screenshots =
      await captureWebsiteScreenshots(
        websiteUrl
      );

    return new Response(
      new Uint8Array(
        screenshots.desktop
      ),
      {
        status:
          200,

        headers: {
          "Content-Type":
            "image/jpeg",

          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (
    captureError
  ) {
    console.error(
      "Could not capture current website for public preview:",
      captureError
    );

    return NextResponse.json(
      {
        error:
          "Current website snapshot could not be created.",
      },
      {
        status:
          502,
      }
    );
  }
}
