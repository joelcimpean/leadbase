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
  request: NextRequest
) {
  let supabaseResponse =
    NextResponse.next({
      request,
    });

  /* =======================================================
     SUPABASE
  ======================================================= */

  const supabase =
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(
            cookiesToSet
          ) {
            /*
             * Update the request cookies first so
             * Server Components receive the refreshed session.
             */
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

            /*
             * Also send refreshed cookies back to
             * the browser.
             */
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

  /* =======================================================
     PUBLIC ROUTES
  ======================================================= */

  const pathname =
    request.nextUrl.pathname;

  const isPublicRoute =
    pathname.startsWith(
      "/login"
    ) ||
    pathname.startsWith(
      "/auth"
    ) ||
    pathname.startsWith(
      "/api/health"
    );

  if (
    isPublicRoute
  ) {
    return supabaseResponse;
  }

  /* =======================================================
     AUTH CHECK
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

   IMPORTANT:
   /api/inbox/reply is deliberately excluded.

   That Route Handler performs its own authentication and
   should receive the raw POST request without Proxy touching
   it.
========================================================= */

export const config = {
  matcher: [
    "/((?!api/inbox/reply|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};