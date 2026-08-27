import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

/* =========================================================
   PROXY
========================================================= */

export async function proxy(
  request:
    NextRequest
) {
  let supabaseResponse =
    NextResponse.next({
      request,
    });

  const supabase =
    createServerClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,

      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,

      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            supabaseResponse =
              NextResponse.next({
                request,
              });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                supabaseResponse.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

  const pathname =
    request.nextUrl.pathname;

  /* =======================================================
     PUBLIC ROUTES

     /concept
     Only explicitly published customer previews live here.

     /preview
     is intentionally NOT public anymore. It is the internal
     redesign preview used from the authenticated Leadbase UI.

     Cron routes authenticate themselves using CRON_SECRET.
  ======================================================= */

  const isPublicRoute =
    pathname.startsWith(
      "/login"
    ) ||
    pathname.startsWith(
      "/auth"
    ) ||
    pathname.startsWith(
      "/concept"
    ) ||
    pathname.startsWith(
      "/api/health"
    ) ||
    pathname.startsWith(
      "/api/cron"
    );

  if (
    isPublicRoute
  ) {
    return supabaseResponse;
  }

  /* =======================================================
     AUTHENTICATED APP ROUTES
  ======================================================= */

  const {
    data,
    error,
  } =
    await supabase.auth.getClaims();

  const claims =
    data?.claims ??
    null;

  if (
    error ||
    !claims
  ) {
    const url =
      request.nextUrl.clone();

    url.pathname =
      "/login";

    return NextResponse.redirect(
      url
    );
  }

  return supabaseResponse;
}

/* =========================================================
   MATCHER
========================================================= */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};