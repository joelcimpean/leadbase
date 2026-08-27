import type {
    Metadata,
  } from "next";
  
  import {
    notFound,
  } from "next/navigation";
  
  import {
    createClient as createSupabaseClient,
  } from "@supabase/supabase-js";
  
  import {
    PreviewRenderer,
  } from "./preview-renderer";
  
  import {
    RedesignPreviewSpecSchema,
  } from "@/lib/redesign-preview";
  
  export const metadata:
    Metadata = {
    title:
      "Redesign Concept",
  
    robots: {
      index:
        false,
  
      follow:
        false,
    },
  };
  
  type PreviewPageProps = {
    params: Promise<{
      token: string;
    }>;
  };
  
  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  export default async function PreviewPage({
    params,
  }: PreviewPageProps) {
    const {
      token,
    } =
      await params;
  
    if (
      !UUID_PATTERN.test(
        token
      )
    ) {
      notFound();
    }
  
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
      console.error(
        "Public Supabase environment variables are missing."
      );
  
      notFound();
    }
  
    const supabase =
      createSupabaseClient(
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
  
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_redesign_preview_by_token",
        {
          p_token:
            token,
        }
      );
  
    if (
      error
    ) {
      console.error(
        "Could not load public redesign preview:",
        error
      );
  
      notFound();
    }
  
    const row =
      Array.isArray(
        data
      )
        ? data[0] ??
          null
        : data;
  
    if (
      !row ||
      typeof row !==
        "object"
    ) {
      notFound();
    }
  
    const parsed =
      RedesignPreviewSpecSchema.safeParse(
        (
          row as {
            spec?: unknown;
          }
        ).spec
      );
  
    if (
      !parsed.success
    ) {
      console.error(
        "Stored redesign preview has an invalid spec:",
        parsed.error
      );
  
      notFound();
    }
  
    return (
      <PreviewRenderer
        spec={
          parsed.data
        }
      />
    );
  }