import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ suggestions: [] }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const language = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "de";
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ suggestions: [], configured: false });

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.placeId",
      },
      body: JSON.stringify({
        input: q,
        includedPrimaryTypes: ["(cities)"],
        languageCode: language,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Google Places city autocomplete failed:", response.status, await response.text());
      return NextResponse.json({ suggestions: [] });
    }

    const data = (await response.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
        };
      }>;
    };

    const suggestions = (data.suggestions ?? [])
      .map((item) => item.placePrediction)
      .filter(Boolean)
      .map((prediction) => ({
        id: prediction?.placeId ?? prediction?.text?.text ?? "",
        label: prediction?.text?.text ?? "",
        city: prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text ?? "",
        secondary: prediction?.structuredFormat?.secondaryText?.text ?? "",
      }))
      .filter((item) => item.label)
      .slice(0, 7);

    return NextResponse.json({ suggestions, configured: true });
  } catch (error) {
    console.error("Google Places city autocomplete failed:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
