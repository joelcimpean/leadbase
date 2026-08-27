import {
    revalidatePath,
  } from "next/cache";
  
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
  
  type ResetResult = {
    deleted_candidates?:
      unknown;
  
    deleted_searches?:
      unknown;
  
    released_companies?:
      unknown;
  };
  
  /* =========================================================
     NUMBER
  ========================================================= */
  
  function parseCount(
    value:
      unknown
  ) {
    return typeof value ===
      "number" &&
      Number.isFinite(
        value
      )
      ? Math.max(
          0,
          Math.trunc(
            value
          )
        )
      : 0;
  }
  
  /* =========================================================
     POST
  ========================================================= */
  
  export async function POST() {
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
       RESET RPC
    ======================================================= */
  
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "reset_my_lead_discovery"
      );
  
    if (
      error
    ) {
      console.error(
        "Could not reset lead discovery:",
        error
      );
  
      return NextResponse.json(
        {
          ok:
            false,
  
          error:
            "Die Lead-Suche konnte nicht zurückgesetzt werden.",
        },
        {
          status:
            500,
        }
      );
    }
  
    const result =
      (
        typeof data ===
          "object" &&
        data !==
          null &&
        !Array.isArray(
          data
        )
      )
        ? data as
            ResetResult
        : {};
  
    revalidatePath(
      "/find-leads"
    );
  
    revalidatePath(
      "/settings"
    );
  
    return NextResponse.json({
      ok:
        true,
  
      deletedCandidates:
        parseCount(
          result.deleted_candidates
        ),
  
      deletedSearches:
        parseCount(
          result.deleted_searches
        ),
  
      releasedCompanies:
        parseCount(
          result.released_companies
        ),
    });
  }