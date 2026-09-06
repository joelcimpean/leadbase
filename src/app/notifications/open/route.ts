import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function GET(
  request: NextRequest
) {
  const id =
    request.nextUrl.searchParams.get(
      "id"
    );

  if (!id) {
    return NextResponse.redirect(
      new URL(
        "/notifications",
        request.url
      )
    );
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  const {
    data: notification,
  } = await supabase
    .from("app_notifications")
    .select("id, href")
    .eq("id", id)
    .eq(
      "user_id",
      user.id
    )
    .maybeSingle();

  if (!notification) {
    return NextResponse.redirect(
      new URL(
        "/notifications",
        request.url
      )
    );
  }

  await supabase
    .from("app_notifications")
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq("id", id)
    .eq(
      "user_id",
      user.id
    );

  const href =
    typeof notification.href ===
      "string" &&
    notification.href.startsWith(
      "/"
    )
      ? notification.href
      : "/notifications";

  return NextResponse.redirect(
    new URL(
      href,
      request.url
    )
  );
}
