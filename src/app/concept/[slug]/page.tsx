import type {
    Metadata,
  } from "next";
  
  import {
    ArrowUpRight,
  } from "lucide-react";
  
  import {
    notFound,
  } from "next/navigation";
  
  import {
    createClient as createSupabaseClient,
  } from "@supabase/supabase-js";
  
  import {
    CustomerContactChoice,
    CustomerDesignFrame,
    PreviewVisitTracker,
  } from "./customer-design-frame";

  import {
    ConceptPreviewExperience,
  } from "./concept-preview-experience";
  
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
  
    searchParams: Promise<{
      capture?:
        string;
  
      src?:
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

    currentWebsiteSnapshotUrl?:
      string;

    currentWebsiteSnapshotCapturedAt?:
      string;

    currentWebsiteFinalUrl?:
      string;

    currentWebsiteSnapshotViewport?: {
      width?:
        number;

      height?:
        number;
    };
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
    searchParams,
  }: ConceptPageProps) {
    const [
      {
        slug,
      },
      resolvedSearchParams,
    ] =
      await Promise.all([
        params,
        searchParams,
      ]);
  
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
  
    const captureMode =
      resolvedSearchParams.capture ===
        "gif";
  
    const companyName =
      row
        .source_brand_name
        ?.trim() ||
      snapshot.companyName ||
      "Unternehmen";
  
    /*
     * Internal capture mode intentionally renders ONLY the
     * generated website.
     *
     * - no customer bar
     * - no visit tracker
     * - no Leadbase visit / Hot Score pollution
     *
     * This URL is used only by the server-side GIF renderer.
     */
    if (
      captureMode
    ) {
      return (
        <main className="min-h-screen bg-white">
          <CustomerDesignFrame
            title={`GIF capture · ${companyName}`}
            html={
              snapshot.html
            }
          />
        </main>
      );
    }
  
    /* =======================================================
       NORMAL CUSTOMER PREVIEW
    ======================================================= */
  
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
  
    const calendarUrl =
      process.env
        .DESIGNER_CALENDAR_URL
        ?.trim() ||
      "https://cal.com/joel-cimpean-ag9kpu/30min";
  
    const mailSubject =
      `Designvorschau für ${companyName}`;
  
    const mailBody =
      [
        "Hallo Joel,",
        "",
        `ich habe mir die Designvorschau für ${companyName} angesehen und würde mich gerne kurz dazu austauschen.`,
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

    /*
     * External websites often block iframe embedding through
     * X-Frame-Options / CSP. Preview 2.0 therefore uses the frozen
     * 16:10 website snapshot for the stable comparison and keeps the
     * original URL only for the explicit "Original öffnen" action.
     */
    const currentWebsiteSnapshotUrl =
      snapshot.currentWebsiteSnapshotUrl?.trim() ||
      `/api/concept/${encodeURIComponent(
        slug
      )}/current-snapshot`;

    const currentWebsiteUrl =
      snapshot.currentWebsiteFinalUrl?.trim() ||
      row.source_website_url?.trim() ||
      null;
  
    return (
      <main className="min-h-screen bg-white text-neutral-950">
        <PreviewVisitTracker
          slug={
            slug
          }
        />
  
        {/*
         * Customer utility bar:
         * - fixed to the viewport instead of living inside the scroll flow
         * - full-width glass surface so it behaves like a real product navbar
         * - one compact row to avoid covering too much of the design
         * - explicit spacer below prevents the generated design from hiding underneath it
         */}
        <div className="fixed inset-x-0 top-0 z-[100] overflow-x-hidden border-b border-neutral-200/70 bg-white/[0.88] shadow-[0_1px_0_rgba(15,23,42,.02),0_10px_32px_rgba(15,23,42,.045)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/[0.78]">
          <div className="mx-auto flex h-[68px] w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#002BBA] text-white shadow-[0_8px_20px_rgba(0,43,186,.16)] sm:size-10">
                <span className="text-[17px] font-semibold leading-none">⚡︎</span>
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="hidden size-1.5 shrink-0 rounded-full bg-[#002BBA] sm:block" />
                  <p className="truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-500 sm:text-[10px]">
                    Persönliches Designkonzept
                  </p>
                </div>

                <div className="mt-0.5 flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold tracking-[-0.02em] text-neutral-950 sm:text-[15px]">
                    {companyName}
                  </p>

                  <span className="hidden text-[10px] text-neutral-300 xl:inline">·</span>
                  <span className="hidden truncate text-[10px] text-neutral-400 xl:inline">
                    Unverbindliche Vorschau · kein finales Konzept
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group hidden items-center gap-1.5 rounded-xl px-2.5 py-2 text-right transition-colors hover:bg-neutral-100/80 lg:flex"
              >
                <span>
                  <span className="block text-[9px] leading-none text-neutral-400">Erstellt von</span>
                  <span className="mt-1 flex items-center justify-end gap-1 text-xs font-semibold leading-none text-neutral-800 transition-colors group-hover:text-[#002BBA]">
                    {designerName}
                    <ArrowUpRight className="size-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </span>
              </a>

              <CustomerContactChoice
                companyName={companyName}
                mailUrl={mailUrl}
                calendarUrl={calendarUrl}
              />
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="h-[68px] sm:h-[72px]" />

        <ConceptPreviewExperience
          companyName={
            companyName
          }
          html={
            snapshot.html
          }
          currentWebsiteSnapshotUrl={
            currentWebsiteSnapshotUrl
          }
          currentWebsiteUrl={
            currentWebsiteUrl
          }
        />
      </main>
    );
  }
  