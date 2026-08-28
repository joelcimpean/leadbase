import type {
    Metadata,
  } from "next";
  
  import {
    ArrowUpRight,
    Mail,
  } from "lucide-react";
  
  import {
    notFound,
  } from "next/navigation";
  
  import {
    createClient as createSupabaseClient,
  } from "@supabase/supabase-js";
  
  import {
    CustomerDesignFrame,
  } from "./customer-design-frame";
  
  /* =========================================================
     CONFIG
  ========================================================= */
  
  export const dynamic =
    "force-dynamic";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type ConceptPageProps = {
    params: Promise<{
      slug:
        string;
    }>;
  };
  
  type PublicPreviewRow = {
    id?:
      string;
  
    source_snapshot?:
      unknown;
  
    source_brand_name?:
      string;
  
    source_website_url?:
      string
      | null;
  
    created_at?:
      string;
  
    expires_at?:
      string
      | null;
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
  
    sourceUrl?:
      string;
  
    generationIndex?:
      number;
  
    model?:
      string;
  
    direction?:
      string;
  };
  
  /* =========================================================
     VALIDATION
  ========================================================= */
  
  const SLUG_PATTERN =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
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
  
  function getStaticDesignSnapshot(
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
        "html"
    ) {
      return null;
    }
  
    if (
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
     SUPABASE
  ========================================================= */
  
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
  
  /* =========================================================
     LOAD
  ========================================================= */
  
  async function loadPreview(
    slug:
      string
  ) {
    if (
      !SLUG_PATTERN.test(
        slug
      )
    ) {
      return null;
    }
  
    const supabase =
      createPublicSupabaseClient();
  
    if (
      !supabase
    ) {
      console.error(
        "Public Supabase environment variables are missing."
      );
  
      return null;
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
        "Could not load public design preview:",
        error
      );
  
      return null;
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
      return null;
    }
  
    return row as
      PublicPreviewRow;
  }
  
  /* =========================================================
     METADATA
  ========================================================= */
  
  export async function generateMetadata({
    params,
  }: ConceptPageProps): Promise<Metadata> {
    const {
      slug,
    } =
      await params;
  
    const row =
      await loadPreview(
        slug
      );
  
    const companyName =
      row
        ?.source_brand_name
        ?.trim() ||
      "Unternehmen";
  
    return {
      title:
        `Designkonzept für ${companyName}`,
  
      description:
        `Persönliche Website-Vorschau für ${companyName}.`,
  
      robots: {
        index:
          false,
  
        follow:
          false,
  
        nocache:
          true,
  
        googleBot: {
          index:
            false,
  
          follow:
            false,
  
          noimageindex:
            true,
        },
      },
  
      referrer:
        "no-referrer",
    };
  }
  
  /* =========================================================
     PAGE
  ========================================================= */
  
  export default async function ConceptPage({
    params,
  }: ConceptPageProps) {
    const {
      slug,
    } =
      await params;
  
    const row =
      await loadPreview(
        slug
      );
  
    if (
      !row
    ) {
      notFound();
    }
  
    const snapshot =
      getStaticDesignSnapshot(
        row.source_snapshot
      );
  
    if (
      !snapshot
    ) {
      console.error(
        "Public design preview contains an invalid static design snapshot."
      );
  
      notFound();
    }
  
    /* =======================================================
       TRACK VIEW
    ======================================================= */
  
    const supabase =
      createPublicSupabaseClient();
  
    if (
      supabase
    ) {
      const {
        error:
          trackingError,
      } =
        await supabase.rpc(
          "track_public_design_preview_view",
          {
            p_slug:
              slug,
          }
        );
  
      if (
        trackingError
      ) {
        console.warn(
          "Could not track public design preview view:",
          trackingError
        );
      }
    }
  
    /* =======================================================
       BASIC DATA
    ======================================================= */
  
    const companyName =
      row
        .source_brand_name
        ?.trim() ||
      snapshot.companyName ||
      "Unternehmen";
  
    const designerName =
      process.env
        .DESIGNER_NAME
        ?.trim() ||
      "Joel Cimpean";
  
    const portfolioUrl =
      process.env
        .DESIGNER_PORTFOLIO_URL
        ?.trim() ||
      "https://joelcimpean.com";
  
    const designerEmail =
      process.env
        .DESIGNER_EMAIL
        ?.trim() ||
      "hello@joelcimpean.com";
  
    /* =======================================================
       MAIL CTA
    ======================================================= */
  
    const mailSubject =
      `Designkonzept für ${companyName}`;
  
    const mailBody =
      [
        "Hallo Joel,",
        "",
        `ich habe mir das Designkonzept für ${companyName} angesehen und würde gerne darüber sprechen.`,
        "",
        "Viele Grüße",
      ].join(
        "\n"
      );
  
    const mailUrl =
      designerEmail
        ? `mailto:${designerEmail}?subject=${encodeURIComponent(
            mailSubject
          )}&body=${encodeURIComponent(
            mailBody
          )}`
        : null;
  
    /* =======================================================
       RENDER
    ======================================================= */
  
    return (
      <main className="min-h-screen bg-white text-neutral-950">
        {/* ===================================================
            CUSTOMER BAR
  
            Sticky on desktop + mobile.
        =================================================== */}
  
        <div className="sticky top-0 z-[100] border-b border-neutral-200 bg-white/95 text-neutral-950 shadow-[0_1px_0_rgba(0,0,0,.04)] backdrop-blur-xl">
          <div className="mx-auto flex min-h-[64px] max-w-[1440px] items-center justify-between gap-2 px-3 py-2.5 sm:min-h-[76px] sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
            {/* ===============================================
                COMPANY
            =============================================== */}
  
            <div className="min-w-0 flex-1 pr-1 sm:pr-3">
              <p className="line-clamp-2 text-[8px] font-semibold uppercase leading-[1.3] tracking-[0.13em] text-neutral-500 min-[390px]:text-[9px] sm:text-[10px] sm:tracking-[0.15em]">
                Persönliches Designkonzept für
              </p>
  
              <p className="mt-1 truncate text-[13px] font-semibold leading-tight text-neutral-950 min-[390px]:text-sm sm:text-base">
                {
                  companyName
                }
              </p>
            </div>
  
            {/* ===============================================
                DESKTOP DESIGNER
            =============================================== */}
  
            <div className="hidden shrink-0 text-right md:block">
              <p className="text-[11px] text-neutral-500">
                Erstellt von
              </p>
  
              <a
                href={
                  portfolioUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-neutral-950 transition-opacity hover:opacity-60"
              >
                {
                  designerName
                }
  
                <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
  
              <p className="mt-0.5 text-[9px] text-neutral-400">
              Unverbindliche Designvorschau · mögliche Gestaltungsrichtung · kein finales Konzept
              </p>
            </div>
  
            {/* ===============================================
                CONTACT CTA
            =============================================== */}
  
            {mailUrl ? (
              <a
                href={
                  mailUrl
                }
                className="group inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-neutral-950 px-3 text-[11px] font-semibold text-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-px hover:bg-neutral-800 min-[390px]:gap-2 min-[390px]:px-3.5 min-[390px]:text-xs sm:h-11 sm:px-5 sm:text-sm"
              >
                <Mail className="size-3.5 shrink-0 sm:size-4" />
  
                <span className="min-[390px]:hidden">
                  Kontakt
                </span>
  
                <span className="hidden min-[390px]:inline">
                  Projekt besprechen
                </span>
  
                <ArrowUpRight className="hidden size-3.5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" />
              </a>
            ) : null}
          </div>
  
          {/* ===============================================
              SMALL MOBILE TRUST STRIP
  
              Keeps Joel visible without making the main bar
              huge.
          =============================================== */}
  
          <div className="border-t border-neutral-100 px-3 py-1.5 md:hidden">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
              <a
                href={
                  portfolioUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1 text-[9px] font-medium text-neutral-500 transition-colors hover:text-neutral-950"
              >
                <span className="truncate">
                  Erstellt von{" "}
                  <strong className="font-semibold text-neutral-700">
                    {
                      designerName
                    }
                  </strong>
                </span>
  
                <ArrowUpRight className="size-2.5 shrink-0" />
              </a>
  
              <span className="hidden shrink-0 text-[8px] text-neutral-400 min-[430px]:block">
                Reine Designvorschau · keine finales Konzept
              </span>
            </div>
          </div>
        </div>
  
        {/* ===================================================
            GENERATED DESIGN
  
            The client component measures the REAL document
            height. Therefore the browser page itself scrolls,
            rather than relying on nested mobile iframe
            scrolling.
        =================================================== */}
  
        <CustomerDesignFrame
          title={`Designkonzept für ${companyName}`}
          html={
            snapshot.html
          }
        />
      </main>
    );
  }