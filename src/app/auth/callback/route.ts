import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const destination = new URL(next, request.url);

  if (!code) {
    destination.searchParams.set("auth", "missing-code");
    return NextResponse.redirect(destination);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    destination.searchParams.set("auth", "callback-error");
    return NextResponse.redirect(destination);
  }

  const response = NextResponse.redirect(destination);
  if (destination.pathname === "/auth/reset") {
    response.cookies.set("leadbase_password_recovery", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/auth/reset",
      maxAge: 15 * 60,
    });
  }

  return response;
}
