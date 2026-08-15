import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json(
      {
        connected: false,
        error: "Supabase environment variables are missing.",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: publishableKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          connected: false,
          error: `Supabase returned HTTP ${response.status}.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      connected: true,
      message: "Leadbase is connected to Supabase.",
    });
  } catch {
    return NextResponse.json(
      {
        connected: false,
        error: "Could not reach Supabase.",
      },
      { status: 500 }
    );
  }
}