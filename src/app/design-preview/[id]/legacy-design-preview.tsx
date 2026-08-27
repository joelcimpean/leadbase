import type {
    CSSProperties,
    ReactNode,
  } from "react";
  
  import type {
    Metadata,
  } from "next";
  
  import {
    notFound,
  } from "next/navigation";
  
  import {
    ExternalLink,
    Mail,
    MapPin,
    Phone,
  } from "lucide-react";
  
  import {
    type DesignAboutLayout,
    type DesignHeroLayout,
    type DesignMockupSnapshot,
    type DesignReferencesLayout,
    type DesignSectionKey,
    type DesignServicesLayout,
    type MockupService,
  } from "@/lib/design-mockup-engine";
  
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
      "Design Concept",
  
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
  
  type VariantRow = {
    id:
      string;
  
    generation_index:
      number;
  
    source_snapshot:
      unknown;
  
    created_at:
      string;
  };
  
  /* =========================================================
     SNAPSHOT
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
  ): DesignMockupSnapshot {
    /*
     * IMPORTANT:
     *
     * Do NOT hard-lock this renderer to snapshot.version === 1.
     *
     * The design engine can evolve while the renderer is still
     * perfectly capable of rendering the stored snapshot.
     *
     * We validate the actual minimum shape that this page needs
     * instead of rejecting a perfectly valid future snapshot
     * merely because its internal version changed.
     */
  
    if (
      !isRecord(
        value
      )
    ) {
      console.error(
        "Design mockup source_snapshot is not an object."
      );
  
      notFound();
    }
  
    const company =
      value[
        "company"
      ];
  
    if (
      !isRecord(
        company
      )
    ) {
      console.error(
        "Design mockup snapshot has no valid company object."
      );
  
      notFound();
    }
  
    const companyName =
      company[
        "name"
      ];
  
    const websiteUrl =
      company[
        "websiteUrl"
      ];
  
    const stylePreset =
      value[
        "stylePreset"
      ];
  
    const brandColor =
      value[
        "brandColor"
      ];
  
    const heroTitle =
      value[
        "heroTitle"
      ];
  
    if (
      typeof companyName !==
        "string" ||
      !companyName.trim()
    ) {
      console.error(
        "Design mockup snapshot has no valid company name."
      );
  
      notFound();
    }
  
    if (
      typeof websiteUrl !==
        "string" ||
      !websiteUrl.trim()
    ) {
      console.error(
        "Design mockup snapshot has no valid company website URL."
      );
  
      notFound();
    }
  
    if (
      typeof stylePreset !==
        "string" ||
      !stylePreset.trim()
    ) {
      console.error(
        "Design mockup snapshot has no valid stylePreset."
      );
  
      notFound();
    }
  
    if (
      typeof brandColor !==
        "string" ||
      !brandColor.trim()
    ) {
      console.error(
        "Design mockup snapshot has no valid brandColor."
      );
  
      notFound();
    }
  
    if (
      typeof heroTitle !==
        "string" ||
      !heroTitle.trim()
    ) {
      console.error(
        "Design mockup snapshot has no valid heroTitle."
      );
  
      notFound();
    }
  
    const version =
      value[
        "version"
      ];
  
    if (
      version !==
      undefined &&
      version !==
      1
    ) {
      console.info(
        "Rendering newer design mockup snapshot version:",
        version
      );
    }
  
    return value as
      unknown as
      DesignMockupSnapshot;
  }
  
  /* =========================================================
     URL
  ========================================================= */
  
  function getHostname(
    value:
      string
  ) {
    try {
      return new URL(
        value
      ).hostname.replace(
        /^www\./,
        ""
      );
    } catch {
      return value;
    }
  }
  
  /* =========================================================
     COLOR
  ========================================================= */
  
  function normalizeBrandColor(
    value:
      string
  ) {
    if (
      /^#[0-9A-Fa-f]{6}$/.test(
        value
      )
    ) {
      return value;
    }
  
    return "#1A1A1A";
  }
  
  function hexToRgb(
    value:
      string
  ) {
    const hex =
      value.replace(
        "#",
        ""
      );
  
    if (
      !/^[0-9A-Fa-f]{6}$/.test(
        hex
      )
    ) {
      return null;
    }
  
    return {
      r:
        parseInt(
          hex.slice(
            0,
            2
          ),
          16
        ),
  
      g:
        parseInt(
          hex.slice(
            2,
            4
          ),
          16
        ),
  
      b:
        parseInt(
          hex.slice(
            4,
            6
          ),
          16
        ),
    };
  }
  
  function getContrastText(
    color:
      string
  ) {
    const rgb =
      hexToRgb(
        color
      );
  
    if (
      !rgb
    ) {
      return "#FFFFFF";
    }
  
    const luminance =
      (
        0.299 *
          rgb.r +
        0.587 *
          rgb.g +
        0.114 *
          rgb.b
      ) /
      255;
  
    return luminance >
      0.62
      ? "#111111"
      : "#FFFFFF";
  }
  
  /* =========================================================
     SERVICES
  ========================================================= */
  
  function getServices(
    snapshot:
      DesignMockupSnapshot
  ): MockupService[] {
    return snapshot.services
      .map(
        (
          service
        ) => {
          if (
            typeof service ===
            "string"
          ) {
            return {
              title:
                service,
  
              description:
                "",
            };
          }
  
          return service;
        }
      )
      .filter(
        (
          service
        ) =>
          Boolean(
            service.title
              .trim()
          )
      );
  }
  
  /* =========================================================
     FALLBACK LAYOUTS
  ========================================================= */
  
  function getHeroLayout(
    snapshot:
      DesignMockupSnapshot
  ): DesignHeroLayout {
    if (
      snapshot.heroLayout
    ) {
      return snapshot.heroLayout;
    }
  
    switch (
      snapshot.stylePreset
    ) {
      case "bold-serif":
        return "poster";
  
      case "technical-grid":
        return "split";
  
      case "image-led":
        return "fullbleed";
  
      default:
        return "offset";
    }
  }
  
  function getServicesLayout(
    snapshot:
      DesignMockupSnapshot
  ): DesignServicesLayout {
    return (
      snapshot.servicesLayout ??
      (
        snapshot.stylePreset ===
        "technical-grid"
          ? "index"
          : "rows"
      )
    );
  }
  
  function getReferencesLayout(
    snapshot:
      DesignMockupSnapshot
  ): DesignReferencesLayout {
    return (
      snapshot.referencesLayout ??
      "mosaic"
    );
  }
  
  function getAboutLayout(
    snapshot:
      DesignMockupSnapshot
  ): DesignAboutLayout {
    return (
      snapshot.aboutLayout ??
      "split"
    );
  }
  
  function getSectionOrder(
    snapshot:
      DesignMockupSnapshot
  ): DesignSectionKey[] {
    return (
      snapshot.sectionOrder ??
      [
        "stats",
        "services",
        "references",
        "about",
        "team",
      ]
    );
  }
  
  /* =========================================================
     IMAGE
  ========================================================= */
  
  function DesignImage({
    src,
    alt,
    className,
    eager =
      false,
  }: {
    src:
      string
      | null
      | undefined;
  
    alt:
      string;
  
    className:
      string;
  
    eager?:
      boolean;
  }) {
    if (
      !src
    ) {
      return (
        <div
          className={`${className} flex items-center justify-center bg-[var(--surface)] text-xs uppercase tracking-[0.22em] text-[var(--muted)]`}
        >
          Bild
        </div>
      );
    }
  
    return (
      <img
        src={
          src
        }
        alt={
          alt
        }
        referrerPolicy="no-referrer"
        loading={
          eager
            ? "eager"
            : "lazy"
        }
        className={
          className
        }
      />
    );
  }
  
  /* =========================================================
     EYEBROW
  ========================================================= */
  
  function Eyebrow({
    children,
    inverse =
      false,
  }: {
    children:
      ReactNode;
  
    inverse?:
      boolean;
  }) {
    return (
      <p
        className={`mb-5 text-[10px] font-bold uppercase tracking-[0.22em] ${
          inverse
            ? "text-white/65"
            : "text-[var(--brand)]"
        }`}
      >
        {
          children
        }
      </p>
    );
  }
  
  /* =========================================================
     SECTION
  ========================================================= */
  
  function Section({
    children,
    dark =
      false,
    className =
      "",
  }: {
    children:
      ReactNode;
  
    dark?:
      boolean;
  
    className?:
      string;
  }) {
    return (
      <section
        className={`border-t border-[var(--border)] ${
          dark
            ? "bg-[var(--dark)] text-white"
            : "bg-[var(--page)] text-[var(--ink)]"
        } ${className}`}
      >
        {
          children
        }
      </section>
    );
  }
  
  /* =========================================================
     HEADER
  ========================================================= */
  
  function Header({
    snapshot,
  }: {
    snapshot:
      DesignMockupSnapshot;
  }) {
    const navigation =
      snapshot.navigation
        .filter(
          Boolean
        )
        .slice(
          0,
          5
        );
  
    return (
      <header className="relative z-20 border-b border-[var(--border)] bg-[var(--page)] text-[var(--ink)]">
        <div className="mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-8 px-6 md:px-10 lg:px-14">
          <div className="flex min-w-[130px] items-center">
            {snapshot.logoUrl ? (
              <img
                src={
                  snapshot.logoUrl
                }
                alt={
                  snapshot.company
                    .name
                }
                referrerPolicy="no-referrer"
                className="max-h-12 w-auto max-w-[185px] object-contain object-left"
              />
            ) : (
              <p className="text-base font-bold tracking-tight">
                {
                  snapshot.company
                    .name
                }
              </p>
            )}
          </div>
  
          {navigation.length >
          0 ? (
            <nav className="hidden items-center gap-7 lg:flex">
              {navigation.map(
                (
                  item
                ) => (
                  <span
                    key={
                      item
                    }
                    className="text-[12px] font-medium text-[var(--muted)]"
                  >
                    {
                      item
                    }
                  </span>
                )
              )}
            </nav>
          ) : null}
  
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] text-[var(--muted)] xl:block">
              {
                getHostname(
                  snapshot.company
                    .websiteUrl
                )
              }
            </span>
  
            <span
              className="inline-flex min-h-10 items-center justify-center px-4 text-xs font-bold"
              style={{
                background:
                  "var(--brand)",
  
                color:
                  "var(--brandText)",
              }}
            >
              Kontakt
            </span>
          </div>
        </div>
      </header>
    );
  }
  
  /* =========================================================
     HERO COPY
  ========================================================= */
  
  function HeroCopy({
    snapshot,
    inverse =
      false,
  }: {
    snapshot:
      DesignMockupSnapshot;
  
    inverse?:
      boolean;
  }) {
    return (
      <div>
        <Eyebrow
          inverse={
            inverse
          }
        >
          {snapshot.company
            .location ??
            snapshot.company
              .industry ??
            snapshot.company
              .name}
        </Eyebrow>
  
        <h1
          className={`max-w-[900px] text-[clamp(3.4rem,7vw,7.8rem)] leading-[0.88] tracking-[-0.065em] ${
            snapshot.stylePreset ===
            "bold-serif"
              ? "font-serif font-medium"
              : snapshot.stylePreset ===
                  "technical-grid"
                ? "font-black uppercase"
                : "font-semibold"
          }`}
        >
          {
            snapshot.heroTitle
          }
        </h1>
  
        {snapshot.heroSubtitle ? (
          <p
            className={`mt-7 max-w-[650px] text-base leading-7 md:text-lg ${
              inverse
                ? "text-white/72"
                : "text-[var(--muted)]"
            }`}
          >
            {
              snapshot.heroSubtitle
            }
          </p>
        ) : null}
  
        <div className="mt-8 flex flex-wrap gap-3">
          <span
            className="inline-flex min-h-12 items-center px-5 text-sm font-bold"
            style={{
              background:
                "var(--brand)",
  
              color:
                "var(--brandText)",
            }}
          >
            Projekt besprechen
          </span>
  
          {snapshot.referenceImages.length >
          0 ? (
            <span
              className={`inline-flex min-h-12 items-center border px-5 text-sm font-semibold ${
                inverse
                  ? "border-white/30"
                  : "border-[var(--border)]"
              }`}
            >
              Arbeiten ansehen
            </span>
          ) : null}
        </div>
      </div>
    );
  }
  
  /* =========================================================
     HERO
  ========================================================= */
  
  function Hero({
    snapshot,
  }: {
    snapshot:
      DesignMockupSnapshot;
  }) {
    const layout =
      getHeroLayout(
        snapshot
      );
  
    if (
      layout ===
      "fullbleed"
    ) {
      return (
        <section className="relative min-h-[760px] overflow-hidden bg-[var(--dark)] text-white">
          <DesignImage
            src={
              snapshot.heroImageUrl
            }
            alt={
              snapshot.heroTitle
            }
            eager
            className="absolute inset-0 h-full w-full object-cover"
          />
  
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
  
          <div className="relative mx-auto flex min-h-[760px] max-w-[1440px] items-end px-6 py-16 md:px-10 lg:px-14 lg:py-24">
            <HeroCopy
              snapshot={
                snapshot
              }
              inverse
            />
          </div>
        </section>
      );
    }
  
    if (
      layout ===
      "poster"
    ) {
      return (
        <section className="bg-[var(--page)] text-[var(--ink)]">
          <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-10 lg:px-14 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
              <HeroCopy
                snapshot={
                  snapshot
                }
              />
  
              <div className="border-t border-[var(--border)] pt-6">
                <p className="max-w-[440px] text-xs leading-6 text-[var(--muted)]">
                  {
                    snapshot.designDirection ??
                    "Individuelles Designkonzept"
                  }
                </p>
              </div>
            </div>
  
            <div className="mt-14 h-[clamp(420px,55vw,720px)] overflow-hidden">
              <DesignImage
                src={
                  snapshot.heroImageUrl
                }
                alt={
                  snapshot.heroTitle
                }
                eager
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>
      );
    }
  
    if (
      layout ===
      "frame"
    ) {
      return (
        <section className="bg-[var(--page)] px-4 py-6 text-[var(--ink)] md:px-6">
          <div className="relative mx-auto min-h-[730px] max-w-[1480px] overflow-hidden border border-[var(--border)] p-3 md:p-5">
            <DesignImage
              src={
                snapshot.heroImageUrl
              }
              alt={
                snapshot.heroTitle
              }
              eager
              className="absolute inset-3 h-[calc(100%-24px)] w-[calc(100%-24px)] object-cover md:inset-5 md:h-[calc(100%-40px)] md:w-[calc(100%-40px)]"
            />
  
            <div className="absolute inset-3 bg-gradient-to-r from-black/40 via-black/10 to-transparent md:inset-5" />
  
            <div className="absolute bottom-8 left-8 max-w-[820px] bg-[var(--page)] p-7 md:bottom-12 md:left-12 md:p-10">
              <HeroCopy
                snapshot={
                  snapshot
                }
              />
            </div>
          </div>
        </section>
      );
    }
  
    if (
      layout ===
      "editorial"
    ) {
      return (
        <section className="bg-[var(--page)] text-[var(--ink)]">
          <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 lg:px-14 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[180px_1fr] lg:gap-14">
              <div className="pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
                  {
                    snapshot.company
                      .industry ??
                    snapshot.company
                      .name
                  }
                </p>
  
                <div className="my-5 h-px bg-[var(--border)]" />
  
                <p className="text-xs leading-6 text-[var(--muted)]">
                  {
                    snapshot.company
                      .location ??
                    getHostname(
                      snapshot.company
                        .websiteUrl
                    )
                  }
                </p>
              </div>
  
              <HeroCopy
                snapshot={
                  snapshot
                }
              />
            </div>
  
            <div className="mt-16 h-[clamp(400px,55vw,720px)]">
              <DesignImage
                src={
                  snapshot.heroImageUrl
                }
                alt={
                  snapshot.heroTitle
                }
                eager
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>
      );
    }
  
    if (
      layout ===
      "offset"
    ) {
      return (
        <section className="bg-[var(--page)] text-[var(--ink)]">
          <div className="mx-auto grid min-h-[690px] max-w-[1440px] items-center gap-10 px-6 py-16 md:px-10 lg:grid-cols-[.9fr_1.1fr] lg:px-14 lg:py-20">
            <div className="relative z-10 lg:-mr-24">
              <HeroCopy
                snapshot={
                  snapshot
                }
              />
            </div>
  
            <div className="relative pb-12 pl-6">
              <DesignImage
                src={
                  snapshot.heroImageUrl
                }
                alt={
                  snapshot.heroTitle
                }
                eager
                className="h-[clamp(500px,60vw,700px)] w-full object-cover"
              />
  
              <div
                className="absolute bottom-0 left-0 max-w-[280px] px-6 py-5 text-sm font-semibold"
                style={{
                  background:
                    "var(--brand)",
  
                  color:
                    "var(--brandText)",
                }}
              >
                {
                  snapshot.designDirection ??
                  snapshot.company
                    .name
                }
              </div>
            </div>
          </div>
        </section>
      );
    }
  
    return (
      <section className="bg-[var(--page)] text-[var(--ink)]">
        <div className="mx-auto grid min-h-[690px] max-w-[1440px] lg:grid-cols-[.9fr_1.1fr]">
          <div className="flex flex-col justify-center px-6 py-16 md:px-10 lg:px-14 lg:py-24">
            <HeroCopy
              snapshot={
                snapshot
              }
            />
          </div>
  
          <div className="min-h-[480px] p-4 lg:p-5">
            <DesignImage
              src={
                snapshot.heroImageUrl
              }
              alt={
                snapshot.heroTitle
              }
              eager
              className="h-full min-h-[480px] w-full object-cover"
            />
          </div>
        </div>
      </section>
    );
  }
  
  /* =========================================================
     STATS
  ========================================================= */
  
  function StatsSection({
    snapshot,
  }: {
    snapshot:
      DesignMockupSnapshot;
  }) {
    if (
      snapshot.stats.length ===
      0
    ) {
      return null;
    }
  
    return (
      <section
        style={{
          background:
            "var(--brand)",
  
          color:
            "var(--brandText)",
        }}
      >
        <div
          className="mx-auto grid max-w-[1440px]"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {snapshot.stats.map(
            (
              stat
            ) => (
              <div
                key={`${stat.value}-${stat.label}`}
                className="border-b border-current/15 px-6 py-8 md:px-8 lg:py-10"
              >
                <p className="text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                  {
                    stat.value
                  }
                </p>
  
                <p className="mt-2 text-sm font-bold">
                  {
                    stat.label
                  }
                </p>
  
                {stat.note ? (
                  <p className="mt-2 max-w-[280px] text-xs leading-5 opacity-65">
                    {
                      stat.note
                    }
                  </p>
                ) : null}
              </div>
            )
          )}
        </div>
      </section>
    );
  }
  
  /* =========================================================
     SERVICES
  ========================================================= */
  
  function Services({
    snapshot,
  }: {
    snapshot:
      DesignMockupSnapshot;
  }) {
    const services =
      getServices(
        snapshot
      );
  
    if (
      services.length ===
      0
    ) {
      return null;
    }
  
    const layout =
      getServicesLayout(
        snapshot
      );
  
    const dark =
      snapshot.pageMode ===
        "dark" &&
      layout ===
        "index";
  
    return (
      <Section
        dark={
          dark
        }
      >
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 lg:px-14 lg:py-28">
          <div className="mb-12 grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
            <div>
              <Eyebrow
                inverse={
                  dark
                }
              >
                Leistungsangebot
              </Eyebrow>
  
              <h2
                className={`max-w-[600px] text-[clamp(3rem,5.5vw,5.8rem)] leading-[.9] tracking-[-0.06em] ${
                  snapshot.stylePreset ===
                  "bold-serif"
                    ? "font-serif font-medium"
                    : "font-semibold"
                }`}
              >
                {
                  snapshot.servicesTitle
                }
              </h2>
            </div>
  
            <p
              className={`max-w-[550px] self-end text-sm leading-7 ${
                dark
                  ? "text-white/55"
                  : "text-[var(--muted)]"
              }`}
            >
              Das Leistungsangebot basiert auf den tatsächlichen
              Inhalten des bestehenden Webauftritts.
            </p>
          </div>
  
          {layout ===
          "grid" ? (
            <div className="grid border-l border-t border-current/15 md:grid-cols-2 xl:grid-cols-3">
              {services.map(
                (
                  service
                ) => (
                  <article
                    key={
                      service.title
                    }
                    className="min-h-[190px] border-b border-r border-current/15 p-6 md:p-7"
                  >
                    <h3 className="text-xl font-semibold tracking-[-0.03em]">
                      {
                        service.title
                      }
                    </h3>
  
                    {service.description ? (
                      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                        {
                          service.description
                        }
                      </p>
                    ) : null}
                  </article>
                )
              )}
            </div>
          ) : layout ===
            "columns" ? (
            <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
              {services.map(
                (
                  service
                ) => (
                  <article
                    key={
                      service.title
                    }
                    className="mb-4 break-inside-avoid border-t border-current/20 py-6"
                  >
                    <h3 className="text-xl font-semibold tracking-[-0.03em]">
                      {
                        service.title
                      }
                    </h3>
  
                    {service.description ? (
                      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                        {
                          service.description
                        }
                      </p>
                    ) : null}
                  </article>
                )
              )}
            </div>
          ) : layout ===
            "index" ? (
            <div className="border-t border-current/20">
              {services.map(
                (
                  service
                ) => (
                  <article
                    key={
                      service.title
                    }
                    className="grid gap-3 border-b border-current/20 py-6 md:grid-cols-[.65fr_1fr]"
                  >
                    <h3 className="text-[clamp(1.5rem,2.4vw,2.2rem)] font-semibold tracking-[-0.04em]">
                      {
                        service.title
                      }
                    </h3>
  
                    {service.description ? (
                      <p
                        className={`max-w-[620px] text-sm leading-7 ${
                          dark
                            ? "text-white/55"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {
                          service.description
                        }
                      </p>
                    ) : null}
                  </article>
                )
              )}
            </div>
          ) : (
            <div className="border-t border-current/20">
              {services.map(
                (
                  service
                ) => (
                  <article
                    key={
                      service.title
                    }
                    className="grid gap-3 border-b border-current/20 py-6 lg:grid-cols-[.7fr_1fr_auto] lg:items-start lg:gap-10"
                  >
                    <h3 className="text-xl font-semibold tracking-[-0.03em]">
                      {
                        service.title
                      }
                    </h3>
  
                    <p className="max-w-[650px] text-sm leading-7 text-[var(--muted)]">
                      {
                        service.description ||
                        "Weitere Informationen auf Anfrage."
                      }
                    </p>
  
                    <span className="hidden text-lg opacity-35 lg:block">
                      ↗
                    </span>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </Section>
    );
  }
  
  /* =========================================================
     REFERENCES
  ========================================================= */
  
  function References({
    snapshot,
  }: {
    snapshot:
      DesignMockupSnapshot;
  }) {
    const images =
      snapshot.referenceImages;
  
    if (
      images.length ===
      0
    ) {
      return null;
    }
  
    const layout =
      getReferencesLayout(
        snapshot
      );
  
    const dark =
      snapshot.pageMode ===
        "dark" ||
      snapshot.stylePreset ===
        "technical-grid";
  
    const first =
      images[
        0
      ];
  
    return (
      <Section
        dark={
          dark
        }
      >
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 lg:px-14 lg:py-28">
          <div className="mb-11 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Eyebrow
                inverse={
                  dark
                }
              >
                Referenzen
              </Eyebrow>
  
              <h2 className="max-w-[820px] text-[clamp(3rem,5.5vw,5.8rem)] font-semibold leading-[.9] tracking-[-0.06em]">
                {
                  snapshot.referenceTitle
                }
              </h2>
            </div>
  
            <p
              className={`max-w-[430px] text-sm leading-7 ${
                dark
                  ? "text-white/55"
                  : "text-[var(--muted)]"
              }`}
            >
              Echte Projektbilder aus dem bestehenden Webauftritt.
            </p>
          </div>
  
          {layout ===
          "strip" ? (
            <div className="flex snap-x gap-3 overflow-x-auto pb-2">
              {images.map(
                (
                  image
                ) => (
                  <figure
                    key={
                      image.url
                    }
                    className="min-w-[78%] snap-start md:min-w-[48%] xl:min-w-[34%]"
                  >
                    <DesignImage
                      src={
                        image.url
                      }
                      alt={
                        image.alt
                      }
                      className="aspect-[4/3] w-full object-cover"
                    />
  
                    <figcaption
                      className={`mt-3 text-xs ${
                        dark
                          ? "text-white/55"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {
                        image.alt
                      }
                    </figcaption>
                  </figure>
                )
              )}
            </div>
          ) : layout ===
            "grid" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {images.map(
                (
                  image,
                  index
                ) => (
                  <figure
                    key={
                      image.url
                    }
                    className={
                      index %
                        3 ===
                      0
                        ? "md:col-span-2"
                        : ""
                    }
                  >
                    <DesignImage
                      src={
                        image.url
                      }
                      alt={
                        image.alt
                      }
                      className={`w-full object-cover ${
                        index %
                          3 ===
                        0
                          ? "aspect-[16/7]"
                          : "aspect-[4/3]"
                      }`}
                    />
                  </figure>
                )
              )}
            </div>
          ) : layout ===
            "feature" ? (
            <div className="grid gap-3 lg:grid-cols-[1.4fr_.6fr]">
              <DesignImage
                src={
                  first.url
                }
                alt={
                  first.alt
                }
                className="min-h-[560px] w-full object-cover"
              />
  
              <div className="grid gap-3">
                {images
                  .slice(
                    1,
                    4
                  )
                  .map(
                    (
                      image
                    ) => (
                      <DesignImage
                        key={
                          image.url
                        }
                        src={
                          image.url
                        }
                        alt={
                          image.alt
                        }
                        className="h-full min-h-[180px] w-full object-cover"
                      />
                    )
                  )}
              </div>
            </div>
          ) : (
            <div className="grid auto-rows-[240px] gap-3 md:grid-cols-12">
              {images.map(
                (
                  image,
                  index
                ) => (
                  <figure
                    key={
                      image.url
                    }
                    className={`overflow-hidden ${
                      index ===
                      0
                        ? "md:col-span-8 md:row-span-2"
                        : index ===
                            1 ||
                          index ===
                            2
                          ? "md:col-span-4"
                          : "md:col-span-6"
                    }`}
                  >
                    <DesignImage
                      src={
                        image.url
                      }
                      alt={
                        image.alt
                      }
                      className="h-full w-full object-cover"
                    />
                  </figure>
                )
              )}
            </div>
          )}
        </div>
      </Section>
    );
  }
  
  /* =========================================================
     ABOUT
  ========================================================= */
  
  function About({
    snapshot,
  }: {
    snapshot:
      DesignMockupSnapshot;
  }) {
    if (
      snapshot.aboutParagraphs
        .length ===
        0 &&
      !snapshot.aboutImageUrl
    ) {
      return null;
    }
  
    const layout =
      getAboutLayout(
        snapshot
      );
  
    if (
      layout ===
      "statement"
    ) {
      return (
        <Section>
          <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 lg:px-14 lg:py-28">
            <Eyebrow>
              Unternehmen
            </Eyebrow>
  
            <h2 className="max-w-[1100px] text-[clamp(3.4rem,6vw,7rem)] font-semibold leading-[.9] tracking-[-0.065em]">
              {
                snapshot.aboutTitle
              }
            </h2>
  
            <div className="mt-12 grid gap-8 border-t border-[var(--border)] pt-8 lg:grid-cols-2 lg:gap-20">
              <div />
  
              <div>
                {snapshot.aboutParagraphs.map(
                  (
                    paragraph,
                    index
                  ) => (
                    <p
                      key={`${paragraph}-${index}`}
                      className={`max-w-[680px] text-base leading-8 text-[var(--muted)] ${
                        index >
                        0
                          ? "mt-6"
                          : ""
                      }`}
                    >
                      {
                        paragraph
                      }
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </Section>
      );
    }
  
    const imageFirst =
      layout ===
      "image-left";
  
    return (
      <Section>
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 md:px-10 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-14 lg:py-28">
          {imageFirst &&
          snapshot.aboutImageUrl ? (
            <DesignImage
              src={
                snapshot.aboutImageUrl
              }
              alt={
                snapshot.aboutTitle
              }
              className="aspect-[4/5] max-h-[760px] w-full object-cover"
            />
          ) : null}
  
          <div
            className={
              !imageFirst &&
              snapshot.aboutImageUrl
                ? ""
                : "lg:max-w-[680px]"
            }
          >
            <Eyebrow>
              Unternehmen
            </Eyebrow>
  
            <h2
              className={`text-[clamp(3rem,5.5vw,5.8rem)] leading-[.92] tracking-[-0.06em] ${
                snapshot.stylePreset ===
                "bold-serif"
                  ? "font-serif font-medium"
                  : "font-semibold"
              }`}
            >
              {
                snapshot.aboutTitle
              }
            </h2>
  
            <div className="mt-8">
              {snapshot.aboutParagraphs.map(
                (
                  paragraph,
                  index
                ) => (
                  <p
                    key={`${paragraph}-${index}`}
                    className={`max-w-[720px] text-base leading-8 text-[var(--muted)] ${
                      index >
                      0
                        ? "mt-6"
                        : ""
                    }`}
                  >
                    {
                      paragraph
                    }
                  </p>
                )
              )}
            </div>
          </div>
  
          {!imageFirst &&
          snapshot.aboutImageUrl ? (
            <DesignImage
              src={
                snapshot.aboutImageUrl
              }
              alt={
                snapshot.aboutTitle
              }
              className="aspect-[4/5] max-h-[760px] w-full object-cover"
            />
          ) : null}
        </div>
      </Section>
    );
  }
  
  /* =========================================================
     TEAM
  ========================================================= */
  
  function Team({
    snapshot,
  }: {
    snapshot:
      DesignMockupSnapshot;
  }) {
    const group =
      snapshot.teamGroupImageUrl;
  
    const portrait =
      snapshot.teamImageUrl;
  
    if (
      !group &&
      !portrait
    ) {
      return null;
    }
  
    return (
      <Section>
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 lg:px-14 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
            <div>
              <Eyebrow>
                Menschen
              </Eyebrow>
  
              <h2 className="max-w-[720px] text-[clamp(3rem,5.5vw,5.8rem)] font-semibold leading-[.9] tracking-[-0.06em]">
                {
                  snapshot.teamTitle
                }
              </h2>
            </div>
  
            <div>
              {snapshot.teamParagraphs
                .slice(
                  0,
                  2
                )
                .map(
                  (
                    paragraph,
                    index
                  ) => (
                    <p
                      key={`${paragraph}-${index}`}
                      className={`max-w-[680px] text-base leading-8 text-[var(--muted)] ${
                        index >
                        0
                          ? "mt-5"
                          : ""
                      }`}
                    >
                      {
                        paragraph
                      }
                    </p>
                  )
                )}
            </div>
          </div>
  
          {group &&
          portrait &&
          group !==
            portrait ? (
            <div className="mt-12 grid gap-3 lg:grid-cols-[1.35fr_.65fr]">
              <DesignImage
                src={
                  group
                }
                alt={
                  snapshot.teamTitle
                }
                className="min-h-[460px] w-full object-cover"
              />
  
              <DesignImage
                src={
                  portrait
                }
                alt={
                  snapshot.teamTitle
                }
                className="min-h-[460px] w-full object-cover"
              />
            </div>
          ) : (
            <DesignImage
              src={
                group ??
                portrait
              }
              alt={
                snapshot.teamTitle
              }
              className="mt-12 max-h-[740px] min-h-[400px] w-full object-cover"
            />
          )}
        </div>
      </Section>
    );
  }
  
  /* =========================================================
     CONTACT
  ========================================================= */
  
  function Contact({
    snapshot,
  }: {
    snapshot:
      DesignMockupSnapshot;
  }) {
    return (
      <section
        style={{
          background:
            "var(--brand)",
  
          color:
            "var(--brandText)",
        }}
      >
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 md:px-10 lg:grid-cols-[1.2fr_.8fr] lg:px-14 lg:py-24">
          <div>
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[.22em] opacity-60">
              Nächster Schritt
            </p>
  
            <h2 className="max-w-[850px] text-[clamp(3.4rem,6vw,7rem)] font-semibold leading-[.88] tracking-[-0.065em]">
              Lassen Sie uns über Ihr Projekt sprechen.
            </h2>
  
            <p className="mt-7 max-w-[620px] text-base leading-7 opacity-70">
              Persönliche Beratung, kurze Wege und ein klarer nächster Schritt.
            </p>
          </div>
  
          <div className="flex flex-col justify-end gap-4 border-t border-current/25 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            {snapshot.contactLines.map(
              (
                line
              ) => {
                const email =
                  line.includes(
                    "@"
                  );
  
                const phone =
                  /\d{7,}/.test(
                    line.replace(
                      /\D/g,
                      ""
                    )
                  );
  
                const website =
                  line.startsWith(
                    "http"
                  );
  
                return (
                  <div
                    key={
                      line
                    }
                    className="flex items-start gap-3 text-sm leading-6 opacity-80"
                  >
                    {email ? (
                      <Mail className="mt-1 size-4 shrink-0" />
                    ) : phone ? (
                      <Phone className="mt-1 size-4 shrink-0" />
                    ) : website ? (
                      <ExternalLink className="mt-1 size-4 shrink-0" />
                    ) : (
                      <MapPin className="mt-1 size-4 shrink-0" />
                    )}
  
                    <span className="break-all">
                      {
                        line
                      }
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </section>
    );
  }
  
  /* =========================================================
     FOOTER
  ========================================================= */
  
  function Footer({
    snapshot,
  }: {
    snapshot:
      DesignMockupSnapshot;
  }) {
    return (
      <footer className="bg-[#101211] text-white">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 px-6 py-10 md:flex-row md:items-end md:px-10 lg:px-14">
          <div>
            {snapshot.logoUrl ? (
              <img
                src={
                  snapshot.logoUrl
                }
                alt={
                  snapshot.company
                    .name
                }
                referrerPolicy="no-referrer"
                className="max-h-10 max-w-[160px] object-contain object-left"
              />
            ) : (
              <p className="font-bold">
                {
                  snapshot.company
                    .name
                }
              </p>
            )}
  
            <p className="mt-4 text-xs text-white/45">
              {
                snapshot.company
                  .location ??
                getHostname(
                  snapshot.company
                    .websiteUrl
                )
              }
            </p>
          </div>
  
          <div className="text-left md:text-right">
            <p className="text-xs text-white/45">
              Designkonzept · interne Vorschau
            </p>
  
            {snapshot.designDirection ? (
              <p className="mt-1 text-xs text-white/65">
                {
                  snapshot.designDirection
                }
              </p>
            ) : null}
          </div>
        </div>
      </footer>
    );
  }
  
  /* =========================================================
     PAGE
  ========================================================= */
  
  export default async function DesignPreviewPage({
    params,
  }: PageProps) {
    const {
      id,
    } =
      await params;
  
    const supabase =
      await createClient();
  
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
      console.error(
        "Design preview could not authenticate current user."
      );
  
      notFound();
    }
  
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
          generation_index,
          source_snapshot,
          created_at
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
        "Could not load design mockup:",
        error
      );
  
      notFound();
    }
  
    if (
      !data
    ) {
      console.error(
        `Design mockup variant ${id} was not found for the current user.`
      );
  
      notFound();
    }
  
    const row =
      data as
        VariantRow;
  
    const snapshot =
      getSnapshot(
        row.source_snapshot
      );
  
    const brandColor =
      normalizeBrandColor(
        snapshot.brandColor
      );
  
    const brandText =
      getContrastText(
        brandColor
      );
  
    const pageMode =
      snapshot.pageMode ??
      "light";
  
    const page =
      pageMode ===
        "dark"
        ? "#111412"
        : pageMode ===
            "warm"
          ? "#F3F0E8"
          : "#F5F6F3";
  
    const surface =
      pageMode ===
        "dark"
        ? "#191D1A"
        : pageMode ===
            "warm"
          ? "#E9E4D9"
          : "#EBEEEA";
  
    const ink =
      pageMode ===
        "dark"
        ? "#F3F3EE"
        : "#171917";
  
    const muted =
      pageMode ===
        "dark"
        ? "rgba(243,243,238,.58)"
        : "rgba(23,25,23,.58)";
  
    const border =
      pageMode ===
        "dark"
        ? "rgba(255,255,255,.13)"
        : "rgba(0,0,0,.12)";
  
    const pageStyle = {
      "--brand":
        brandColor,
  
      "--brandText":
        brandText,
  
      "--page":
        page,
  
      "--surface":
        surface,
  
      "--ink":
        ink,
  
      "--muted":
        muted,
  
      "--border":
        border,
  
      "--dark":
        "#141816",
    } as
      CSSProperties;
  
    const order =
      getSectionOrder(
        snapshot
      );
  
    function renderSection(
      key:
        DesignSectionKey
    ) {
      switch (
        key
      ) {
        case "stats":
          return (
            <StatsSection
              key={
                key
              }
              snapshot={
                snapshot
              }
            />
          );
  
        case "services":
          return (
            <Services
              key={
                key
              }
              snapshot={
                snapshot
              }
            />
          );
  
        case "references":
          return (
            <References
              key={
                key
              }
              snapshot={
                snapshot
              }
            />
          );
  
        case "about":
          return (
            <About
              key={
                key
              }
              snapshot={
                snapshot
              }
            />
          );
  
        case "team":
          return (
            <Team
              key={
                key
              }
              snapshot={
                snapshot
              }
            />
          );
  
        default:
          return null;
      }
    }
  
    return (
      <main
        style={
          pageStyle
        }
        className="min-h-screen overflow-x-hidden bg-[var(--page)] text-[var(--ink)] antialiased"
      >
        <Header
          snapshot={
            snapshot
          }
        />
  
        <Hero
          snapshot={
            snapshot
          }
        />
  
        {
          order.map(
            renderSection
          )
        }
  
        <Contact
          snapshot={
            snapshot
          }
        />
  
        <Footer
          snapshot={
            snapshot
          }
        />
      </main>
    );
  }