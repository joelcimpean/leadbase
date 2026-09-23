import type {
    Metadata,
  } from "next";
  
  import {
    notFound,
  } from "next/navigation";
  
  import {
    DesignEditor,
  } from "./design-editor";
  
  import {
    createClient,
  } from "@/lib/supabase/server";
  
  /* =========================================================
     CONFIG
  ========================================================= */
  
  export const dynamic =
    "force-dynamic";
  
  export const metadata:
    Metadata = {
    title:
      "Design Studio",
  
    robots: {
      index:
        false,
  
      follow:
        false,
    },
  };
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type PageProps = {
    params: Promise<{
      id:
        string;
    }>;
  };
  
  type StaticDesignSnapshot = {
    version:
      3;
  
    renderMode:
      "html";
  
    html:
      string;
  
    companyName?:
      string;
  
    allowedImages?:
      string[];
  
    editedAt?:
      string;
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
        "string" ||
      value.html.trim()
        .length <
        500
    ) {
      return null;
    }
  
    return value as
      unknown as
      StaticDesignSnapshot;
  }
  
  /* =========================================================
     PAGE
  ========================================================= */
  
  export default async function DesignEditPage({
    params,
  }: PageProps) {
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
      notFound();
    }
  
    /* =======================================================
       LOAD VARIANT
    ======================================================= */
  
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "design_mockup_variants"
        )
        .select(`
          id,
          lead_id,
          generation_index,
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
      error
    ) {
      console.error(
        "Could not load design editor:",
        error
      );
  
      notFound();
    }
  
    if (
      !data
    ) {
      notFound();
    }
  
    const snapshot =
      getSnapshot(
        data.source_snapshot
      );
  
    if (
      !snapshot
    ) {
      console.error(
        "Design editor received an invalid static design snapshot."
      );
  
      notFound();
    }
  
    const allowedImages =
      Array.from(
        new Set(
          (
            snapshot.allowedImages ??
            []
          ).filter(
            (
              value
            ): value is string =>
              typeof value ===
                "string" &&
              Boolean(
                value.trim()
              )
          )
        )
      );
  
    return (
      <DesignEditor
        key={`${data.id}:${snapshot.editedAt ?? snapshot.html.length}`}
        variantId={
          data.id
        }
        leadId={
          data.lead_id
        }
        generationIndex={
          data.generation_index
        }
        companyName={
          snapshot.companyName ??
          "Design"
        }
        initialHtml={
          snapshot.html
        }
        initialAllowedImages={
          allowedImages
        }
      />
    );
  }