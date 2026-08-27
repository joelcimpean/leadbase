import type {
    CSSProperties,
    ReactNode,
  } from "react";
  
  import {
    ArrowUpRight,
  } from "lucide-react";
  
  import {
    type RedesignPreviewSpec,
  } from "@/lib/redesign-preview";
  
  /* =========================================================
     TYPES
  ========================================================= */
  
  type PreviewRendererProps = {
    spec:
      RedesignPreviewSpec;
  };
  
  type PreviewSection =
    RedesignPreviewSpec["sections"][number];
  
  type PreviewSectionItem =
    PreviewSection["items"][number];
  
  /* =========================================================
     HELPERS
  ========================================================= */
  
  function getAssetUrl(
    spec:
      RedesignPreviewSpec,
    assetId:
      string
  ) {
    if (
      !assetId
    ) {
      return null;
    }
  
    return (
      spec.assets.find(
        (
          asset
        ) =>
          asset.id ===
          assetId
      )
        ?.url ??
      null
    );
  }
  
  function getLogoUrl(
    spec:
      RedesignPreviewSpec
  ) {
    return (
      spec.assets.find(
        (
          asset
        ) =>
          asset.kind ===
          "logo"
      )
        ?.url ??
      null
    );
  }
  
  function getRadius(
    radius:
      RedesignPreviewSpec["theme"]["radius"]
  ) {
    switch (
      radius
    ) {
      case "none":
        return "0px";
  
      case "small":
        return "6px";
  
      case "medium":
        return "12px";
  
      case "large":
        return "22px";
  
      case "pill":
        return "999px";
  
      default:
        return "12px";
    }
  }
  
  function getSpacing(
    spacing:
      RedesignPreviewSpec["theme"]["spacing"]
  ) {
    switch (
      spacing
    ) {
      case "tight":
        return {
          section:
            "py-16 md:py-20",
  
          gap:
            "gap-6",
        };
  
      case "airy":
        return {
          section:
            "py-24 md:py-32 lg:py-36",
  
          gap:
            "gap-10 lg:gap-14",
        };
  
      default:
        return {
          section:
            "py-20 md:py-24 lg:py-28",
  
          gap:
            "gap-8 lg:gap-10",
        };
    }
  }
  
  /* =========================================================
     IMAGE
  ========================================================= */
  
  function PreviewImage({
    src,
    alt,
    className,
    radius,
  }: {
    src:
      string
      | null;
  
    alt:
      string;
  
    className:
      string;
  
    radius:
      string;
  }) {
    if (
      !src
    ) {
      return null;
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
        className={
          className
        }
        style={{
          borderRadius:
            radius,
        }}
      />
    );
  }
  
  /* =========================================================
     EYEBROW
  ========================================================= */
  
  function Eyebrow({
    children,
    accent,
  }: {
    children:
      ReactNode;
  
    accent:
      string;
  }) {
    if (
      !children
    ) {
      return null;
    }
  
    return (
      <p
        className="mb-5 text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{
          color:
            accent,
        }}
      >
        {
          children
        }
      </p>
    );
  }
  
  /* =========================================================
     SECTION HEADER
  ========================================================= */
  
  function SectionHeader({
    section,
    spec,
    centered =
      false,
  }: {
    section:
      PreviewSection;
  
    spec:
      RedesignPreviewSpec;
  
    centered?:
      boolean;
  }) {
    return (
      <div
        className={
          centered
            ? "mx-auto mb-12 max-w-[880px] text-center"
            : "mb-12 max-w-[900px]"
        }
      >
        <Eyebrow
          accent={
            spec.theme.accent
          }
        >
          {
            section.eyebrow
          }
        </Eyebrow>
  
        {section.title ? (
          <h2 className="text-[clamp(2.6rem,5vw,5.8rem)] font-semibold leading-[0.94] tracking-[-0.055em]">
            {
              section.title
            }
          </h2>
        ) : null}
  
        {section.intro ? (
          <p
            className="mt-6 max-w-[760px] text-base leading-8"
            style={{
              color:
                spec.theme.mutedText,
            }}
          >
            {
              section.intro
            }
          </p>
        ) : null}
      </div>
    );
  }
  
  /* =========================================================
     HERO
  ========================================================= */
  
  function Hero({
    spec,
  }: {
    spec:
      RedesignPreviewSpec;
  }) {
    const heroImage =
      getAssetUrl(
        spec,
        spec.hero
          .imageAssetId
      );
  
    const radius =
      getRadius(
        spec.theme.radius
      );
  
    const copy = (
      <div className="relative z-10">
        <Eyebrow
          accent={
            spec.theme.accent
          }
        >
          {
            spec.hero.eyebrow
          }
        </Eyebrow>
  
        <h1 className="max-w-[980px] text-[clamp(3.5rem,7.5vw,8.5rem)] font-semibold leading-[0.86] tracking-[-0.07em]">
          {
            spec.hero.headline
          }
        </h1>
  
        {spec.hero
          .subheadline ? (
          <p
            className="mt-7 max-w-[680px] text-base leading-8 md:text-lg"
            style={{
              color:
                spec.theme
                  .mutedText,
            }}
          >
            {
              spec.hero
                .subheadline
            }
          </p>
        ) : null}
  
        <div className="mt-8 flex flex-wrap gap-3">
          {spec.hero
            .primaryCta ? (
            <span
              className="inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-semibold"
              style={{
                background:
                  spec.theme
                    .accent,
  
                color:
                  spec.theme
                    .accentText,
  
                borderRadius:
                  radius,
              }}
            >
              {
                spec.hero
                  .primaryCta
              }
  
              <ArrowUpRight className="size-4" />
            </span>
          ) : null}
  
          {spec.hero
            .secondaryCta ? (
            <span
              className="inline-flex min-h-12 items-center justify-center border px-5 text-sm font-semibold"
              style={{
                borderColor:
                  spec.theme
                    .border,
  
                borderRadius:
                  radius,
              }}
            >
              {
                spec.hero
                  .secondaryCta
              }
            </span>
          ) : null}
        </div>
      </div>
    );
  
    if (
      spec.hero.layout ===
        "fullbleed" &&
      heroImage
    ) {
      return (
        <section
          className="relative min-h-[760px] overflow-hidden"
          data-gsap-hero
        >
          <img
            src={
              heroImage
            }
            alt={
              spec.hero
                .headline
            }
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover"
          />
  
          <div className="absolute inset-0 bg-black/55" />
  
          <div
            className="relative mx-auto flex min-h-[760px] max-w-[1480px] items-end px-6 py-16 text-white md:px-10 lg:px-14 lg:py-24"
            style={{
              color:
                "#FFFFFF",
            }}
          >
            {
              copy
            }
          </div>
        </section>
      );
    }
  
    if (
      spec.hero.layout ===
        "centered"
    ) {
      return (
        <section className="border-b">
          <div className="mx-auto max-w-[1480px] px-6 py-24 text-center md:px-10 lg:px-14 lg:py-32">
            <div className="mx-auto max-w-[1000px]">
              {
                copy
              }
            </div>
  
            {heroImage ? (
              <PreviewImage
                src={
                  heroImage
                }
                alt={
                  spec.hero
                    .headline
                }
                radius={
                  radius
                }
                className="mt-14 aspect-[16/8] w-full object-cover"
              />
            ) : null}
          </div>
        </section>
      );
    }
  
    if (
      spec.hero.layout ===
        "editorial"
    ) {
      return (
        <section className="border-b">
          <div className="mx-auto max-w-[1480px] px-6 py-20 md:px-10 lg:px-14 lg:py-28">
            <div className="grid gap-12 lg:grid-cols-[180px_1fr]">
              <div className="pt-3">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                  style={{
                    color:
                      spec.theme
                        .accent,
                  }}
                >
                  {
                    spec.sourceBrandName
                  }
                </p>
  
                <div
                  className="my-5 h-px"
                  style={{
                    background:
                      spec.theme
                        .border,
                  }}
                />
  
                <p
                  className="text-xs leading-6"
                  style={{
                    color:
                      spec.theme
                        .mutedText,
                  }}
                >
                  {
                    spec.conceptName
                  }
                </p>
              </div>
  
              {
                copy
              }
            </div>
  
            {heroImage ? (
              <PreviewImage
                src={
                  heroImage
                }
                alt={
                  spec.hero
                    .headline
                }
                radius={
                  radius
                }
                className="mt-16 aspect-[16/8] w-full object-cover"
              />
            ) : null}
          </div>
        </section>
      );
    }
  
    if (
      spec.hero.layout ===
        "offset"
    ) {
      return (
        <section className="border-b">
          <div className="mx-auto grid min-h-[700px] max-w-[1480px] items-center gap-10 px-6 py-16 md:px-10 lg:grid-cols-[.9fr_1.1fr] lg:px-14">
            <div className="relative z-10 lg:-mr-16">
              {
                copy
              }
            </div>
  
            {heroImage ? (
              <PreviewImage
                src={
                  heroImage
                }
                alt={
                  spec.hero
                    .headline
                }
                radius={
                  radius
                }
                className="min-h-[520px] w-full object-cover lg:min-h-[650px]"
              />
            ) : null}
          </div>
        </section>
      );
    }
  
    return (
      <section className="border-b">
        <div className="mx-auto grid min-h-[700px] max-w-[1480px] lg:grid-cols-2">
          <div className="flex items-center px-6 py-20 md:px-10 lg:px-14">
            {
              copy
            }
          </div>
  
          {heroImage ? (
            <div className="p-4 lg:p-5">
              <PreviewImage
                src={
                  heroImage
                }
                alt={
                  spec.hero
                    .headline
                }
                radius={
                  radius
                }
                className="h-full min-h-[520px] w-full object-cover"
              />
            </div>
          ) : null}
        </div>
      </section>
    );
  }
  
  /* =========================================================
     SERVICES
  ========================================================= */
  
  function ServicesSection({
    section,
    spec,
  }: {
    section:
      PreviewSection;
  
    spec:
      RedesignPreviewSpec;
  }) {
    const radius =
      getRadius(
        spec.theme.radius
      );
  
    if (
      section.layout ===
        "cards"
    ) {
      return (
        <>
          <SectionHeader
            section={
              section
            }
            spec={
              spec
            }
          />
  
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {section.items.map(
              (
                item,
                index
              ) => {
                const image =
                  getAssetUrl(
                    spec,
                    item.imageAssetId
                  );
  
                return (
                  <article
                    key={`${item.title}-${index}`}
                    className="overflow-hidden border"
                    style={{
                      borderColor:
                        spec.theme
                          .border,
  
                      borderRadius:
                        radius,
  
                      background:
                        spec.theme
                          .surface,
                    }}
                  >
                    {image ? (
                      <PreviewImage
                        src={
                          image
                        }
                        alt={
                          item.title
                        }
                        radius="0px"
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : null}
  
                    <div className="p-6">
                      {item.label ? (
                        <p
                          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
                          style={{
                            color:
                              spec.theme
                                .accent,
                          }}
                        >
                          {
                            item.label
                          }
                        </p>
                      ) : null}
  
                      <h3 className="text-xl font-semibold tracking-[-0.03em]">
                        {
                          item.title
                        }
                      </h3>
  
                      {item.description ? (
                        <p
                          className="mt-4 text-sm leading-7"
                          style={{
                            color:
                              spec.theme
                                .mutedText,
                          }}
                        >
                          {
                            item.description
                          }
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </>
      );
    }
  
    return (
      <>
        <SectionHeader
          section={
            section
          }
          spec={
            spec
          }
        />
  
        <div
          className="border-t"
          style={{
            borderColor:
              spec.theme
                .border,
          }}
        >
          {section.items.map(
            (
              item,
              index
            ) => (
              <article
                key={`${item.title}-${index}`}
                className="grid gap-3 border-b py-6 md:grid-cols-[.7fr_1fr_auto] md:gap-10"
                style={{
                  borderColor:
                    spec.theme
                      .border,
                }}
              >
                <h3 className="text-xl font-semibold tracking-[-0.035em]">
                  {
                    item.title
                  }
                </h3>
  
                <p
                  className="max-w-[720px] text-sm leading-7"
                  style={{
                    color:
                      spec.theme
                        .mutedText,
                  }}
                >
                  {
                    item.description
                  }
                </p>
  
                <ArrowUpRight
                  className="hidden size-4 opacity-40 md:block"
                />
              </article>
            )
          )}
        </div>
      </>
    );
  }
  
  /* =========================================================
     ABOUT
  ========================================================= */
  
  function AboutSection({
    section,
    spec,
  }: {
    section:
      PreviewSection;
  
    spec:
      RedesignPreviewSpec;
  }) {
    const image =
      getAssetUrl(
        spec,
        section.imageAssetId
      );
  
    const radius =
      getRadius(
        spec.theme.radius
      );
  
    if (
      section.layout ===
        "editorial"
    ) {
      return (
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          <div>
            <SectionHeader
              section={
                section
              }
              spec={
                spec
              }
            />
          </div>
  
          <div>
            {section.body ? (
              <p
                className="max-w-[760px] text-lg leading-9"
                style={{
                  color:
                    spec.theme
                      .mutedText,
                }}
              >
                {
                  section.body
                }
              </p>
            ) : null}
  
            {image ? (
              <PreviewImage
                src={
                  image
                }
                alt={
                  section.title
                }
                radius={
                  radius
                }
                className="mt-10 aspect-[16/10] w-full object-cover"
              />
            ) : null}
          </div>
        </div>
      );
    }
  
    return (
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div>
          <SectionHeader
            section={
              section
            }
            spec={
              spec
            }
          />
  
          {section.body ? (
            <p
              className="max-w-[720px] text-base leading-8"
              style={{
                color:
                  spec.theme
                    .mutedText,
              }}
            >
              {
                section.body
              }
            </p>
          ) : null}
  
          {section.items.length >
          0 ? (
            <div className="mt-8 space-y-5">
              {section.items.map(
                (
                  item,
                  index
                ) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="border-t pt-4"
                    style={{
                      borderColor:
                        spec.theme
                          .border,
                    }}
                  >
                    <p className="font-semibold">
                      {
                        item.title
                      }
                    </p>
  
                    {item.description ? (
                      <p
                        className="mt-2 text-sm leading-7"
                        style={{
                          color:
                            spec.theme
                              .mutedText,
                        }}
                      >
                        {
                          item.description
                        }
                      </p>
                    ) : null}
                  </div>
                )
              )}
            </div>
          ) : null}
        </div>
  
        {image ? (
          <PreviewImage
            src={
              image
            }
            alt={
              section.title
            }
            radius={
              radius
            }
            className="aspect-[4/5] max-h-[760px] w-full object-cover"
          />
        ) : null}
      </div>
    );
  }
  
  /* =========================================================
     SHOWCASE
  ========================================================= */
  
  function ShowcaseSection({
    section,
    spec,
  }: {
    section:
      PreviewSection;
  
    spec:
      RedesignPreviewSpec;
  }) {
    const radius =
      getRadius(
        spec.theme.radius
      );
  
    const images =
      [
        section.imageAssetId
          ? {
              id:
                section.imageAssetId,
  
              title:
                section.title,
            }
          : null,
  
        ...section.items.map(
          (
            item
          ) => ({
            id:
              item.imageAssetId,
  
            title:
              item.title,
          })
        ),
      ]
        .filter(
          (
            item
          ): item is {
            id:
              string;
  
            title:
              string;
          } =>
            Boolean(
              item &&
              item.id
            )
        )
        .map(
          (
            item
          ) => ({
            ...item,
  
            url:
              getAssetUrl(
                spec,
                item.id
              ),
          })
        )
        .filter(
          (
            item
          ) =>
            Boolean(
              item.url
            )
        );
  
    return (
      <>
        <SectionHeader
          section={
            section
          }
          spec={
            spec
          }
        />
  
        {images.length >
        0 ? (
          <div className="grid auto-rows-[240px] gap-3 md:grid-cols-12">
            {images.map(
              (
                image,
                index
              ) => (
                <figure
                  key={`${image.id}-${index}`}
                  className={`relative overflow-hidden ${
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
                  style={{
                    borderRadius:
                      radius,
                  }}
                >
                  <PreviewImage
                    src={
                      image.url
                    }
                    alt={
                      image.title
                    }
                    radius="0px"
                    className="h-full w-full object-cover"
                  />
  
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-14 text-white">
                    <p className="text-sm font-semibold">
                      {
                        image.title
                      }
                    </p>
                  </div>
                </figure>
              )
            )}
          </div>
        ) : null}
      </>
    );
  }
  
  /* =========================================================
     PROOF
  ========================================================= */
  
  function ProofSection({
    section,
    spec,
  }: {
    section:
      PreviewSection;
  
    spec:
      RedesignPreviewSpec;
  }) {
    return (
      <>
        <SectionHeader
          section={
            section
          }
          spec={
            spec
          }
        />
  
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {section.items.map(
            (
              item,
              index
            ) => (
              <article
                key={`${item.title}-${index}`}
                className="border-t py-6"
                style={{
                  borderColor:
                    spec.theme
                      .border,
                }}
              >
                {item.label ? (
                  <p
                    className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em]"
                    style={{
                      color:
                        spec.theme
                          .accent,
                    }}
                  >
                    {
                      item.label
                    }
                  </p>
                ) : null}
  
                <h3 className="text-2xl font-semibold tracking-[-0.04em]">
                  {
                    item.title
                  }
                </h3>
  
                {item.description ? (
                  <p
                    className="mt-4 text-sm leading-7"
                    style={{
                      color:
                        spec.theme
                          .mutedText,
                    }}
                  >
                    {
                      item.description
                    }
                  </p>
                ) : null}
              </article>
            )
          )}
        </div>
      </>
    );
  }
  
  /* =========================================================
     PROCESS
  ========================================================= */
  
  function ProcessSection({
    section,
    spec,
  }: {
    section:
      PreviewSection;
  
    spec:
      RedesignPreviewSpec;
  }) {
    return (
      <>
        <SectionHeader
          section={
            section
          }
          spec={
            spec
          }
        />
  
        <div
          className="grid border-l border-t md:grid-cols-2 lg:grid-cols-4"
          style={{
            borderColor:
              spec.theme
                .border,
          }}
        >
          {section.items.map(
            (
              item,
              index
            ) => (
              <article
                key={`${item.title}-${index}`}
                className="border-b border-r p-6 md:p-7"
                style={{
                  borderColor:
                    spec.theme
                      .border,
                }}
              >
                <p
                  className="mb-8 text-xs font-semibold"
                  style={{
                    color:
                      spec.theme
                        .accent,
                  }}
                >
                  {
                    String(
                      index +
                        1
                    ).padStart(
                      2,
                      "0"
                    )
                  }
                </p>
  
                <h3 className="text-lg font-semibold">
                  {
                    item.title
                  }
                </h3>
  
                {item.description ? (
                  <p
                    className="mt-4 text-sm leading-7"
                    style={{
                      color:
                        spec.theme
                          .mutedText,
                    }}
                  >
                    {
                      item.description
                    }
                  </p>
                ) : null}
              </article>
            )
          )}
        </div>
      </>
    );
  }
  
  /* =========================================================
     CTA
  ========================================================= */
  
  function CtaSection({
    section,
    spec,
  }: {
    section:
      PreviewSection;
  
    spec:
      RedesignPreviewSpec;
  }) {
    const radius =
      getRadius(
        spec.theme.radius
      );
  
    return (
      <div
        className="grid gap-10 px-7 py-10 md:px-10 md:py-14 lg:grid-cols-[1.2fr_.8fr] lg:items-end"
        style={{
          background:
            spec.theme
              .accent,
  
          color:
            spec.theme
              .accentText,
  
          borderRadius:
            radius,
        }}
      >
        <div>
          {section.eyebrow ? (
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.2em] opacity-60">
              {
                section.eyebrow
              }
            </p>
          ) : null}
  
          <h2 className="max-w-[900px] text-[clamp(2.8rem,5vw,5.5rem)] font-semibold leading-[.92] tracking-[-0.055em]">
            {
              section.title
            }
          </h2>
        </div>
  
        <div>
          {section.body ||
          section.intro ? (
            <p className="max-w-[560px] text-sm leading-7 opacity-75">
              {
                section.body ||
                section.intro
              }
            </p>
          ) : null}
  
          <span
            className="mt-7 inline-flex min-h-11 items-center gap-2 bg-white px-4 text-sm font-semibold text-black"
            style={{
              borderRadius:
                radius,
            }}
          >
            Kontakt aufnehmen
  
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    );
  }
  
  /* =========================================================
     GENERIC SECTION
  ========================================================= */
  
  function RenderSection({
    section,
    spec,
    index,
  }: {
    section:
      PreviewSection;
  
    spec:
      RedesignPreviewSpec;
  
    index:
      number;
  }) {
    const spacing =
      getSpacing(
        spec.theme.spacing
      );
  
    if (
      section.type ===
      "cta"
    ) {
      return (
        <section
          key={`${section.type}-${index}`}
          className={`${spacing.section} px-6 md:px-10 lg:px-14`}
        >
          <div className="mx-auto max-w-[1480px]">
            <CtaSection
              section={
                section
              }
              spec={
                spec
              }
            />
          </div>
        </section>
      );
    }
  
    const alternate =
      index %
        2 ===
      1;
  
    return (
      <section
        key={`${section.type}-${index}`}
        className={`${spacing.section} border-b px-6 md:px-10 lg:px-14`}
        style={{
          borderColor:
            spec.theme
              .border,
  
          background:
            alternate
              ? spec.theme
                  .surface
              : spec.theme
                  .background,
        }}
      >
        <div className="mx-auto max-w-[1480px]">
          {section.type ===
          "services" ? (
            <ServicesSection
              section={
                section
              }
              spec={
                spec
              }
            />
          ) : section.type ===
            "about" ? (
            <AboutSection
              section={
                section
              }
              spec={
                spec
              }
            />
          ) : section.type ===
            "showcase" ? (
            <ShowcaseSection
              section={
                section
              }
              spec={
                spec
              }
            />
          ) : section.type ===
            "proof" ? (
            <ProofSection
              section={
                section
              }
              spec={
                spec
              }
            />
          ) : section.type ===
            "process" ? (
            <ProcessSection
              section={
                section
              }
              spec={
                spec
              }
            />
          ) : (
            <>
              <SectionHeader
                section={
                  section
                }
                spec={
                  spec
                }
              />
  
              {section.body ? (
                <p
                  className="max-w-[800px] text-base leading-8"
                  style={{
                    color:
                      spec.theme
                        .mutedText,
                  }}
                >
                  {
                    section.body
                  }
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>
    );
  }
  
  /* =========================================================
     TICKER
  ========================================================= */
  
  function Ticker({
    spec,
  }: {
    spec:
      RedesignPreviewSpec;
  }) {
    if (
      !spec.ticker.enabled ||
      spec.ticker.items
        .length ===
        0
    ) {
      return null;
    }
  
    return (
      <div
        className="overflow-hidden border-b py-3"
        style={{
          borderColor:
            spec.theme
              .border,
  
          background:
            spec.ticker.style ===
            "solid"
              ? spec.theme
                  .accent
              : spec.theme
                  .background,
  
          color:
            spec.ticker.style ===
            "solid"
              ? spec.theme
                  .accentText
              : spec.theme
                  .text,
        }}
      >
        <div className="flex min-w-max items-center gap-8 px-6 text-[10px] font-semibold uppercase tracking-[.18em]">
          {spec.ticker.items.map(
            (
              item,
              index
            ) => (
              <div
                key={`${item}-${index}`}
                className="flex items-center gap-8"
              >
                <span>
                  {
                    item
                  }
                </span>
  
                <span
                  style={{
                    color:
                      spec.theme
                        .accent,
                  }}
                >
                  •
                </span>
              </div>
            )
          )}
        </div>
      </div>
    );
  }
  
  /* =========================================================
     HEADER
  ========================================================= */
  
  function Header({
    spec,
  }: {
    spec:
      RedesignPreviewSpec;
  }) {
    const logo =
      getLogoUrl(
        spec
      );
  
    const radius =
      getRadius(
        spec.theme.radius
      );
  
    return (
      <header
        className="relative z-30 border-b"
        style={{
          background:
            spec.theme
              .background,
  
          borderColor:
            spec.theme
              .border,
        }}
      >
        <div className="mx-auto flex min-h-20 max-w-[1480px] items-center justify-between gap-8 px-6 md:px-10 lg:px-14">
          <div className="flex min-w-[130px] items-center">
            {logo ? (
              <img
                src={
                  logo
                }
                alt={
                  spec.sourceBrandName
                }
                referrerPolicy="no-referrer"
                className="max-h-12 w-auto max-w-[190px] object-contain object-left"
              />
            ) : (
              <p className="text-base font-semibold">
                {
                  spec.sourceBrandName
                }
              </p>
            )}
          </div>
  
          {spec.navigation
            .items.length >
          0 ? (
            <nav className="hidden items-center gap-7 lg:flex">
              {spec.navigation
                .items.map(
                  (
                    item
                  ) => (
                    <span
                      key={
                        item
                      }
                      className="text-xs font-medium"
                      style={{
                        color:
                          spec.theme
                            .mutedText,
                      }}
                    >
                      {
                        item
                      }
                    </span>
                  )
                )}
            </nav>
          ) : null}
  
          {spec.navigation
            .ctaLabel ? (
            <span
              className="inline-flex min-h-10 items-center px-4 text-xs font-semibold"
              style={{
                background:
                  spec.theme
                    .accent,
  
                color:
                  spec.theme
                    .accentText,
  
                borderRadius:
                  radius,
              }}
            >
              {
                spec.navigation
                  .ctaLabel
              }
            </span>
          ) : null}
        </div>
      </header>
    );
  }
  
  /* =========================================================
     FOOTER
  ========================================================= */
  
  function Footer({
    spec,
  }: {
    spec:
      RedesignPreviewSpec;
  }) {
    const logo =
      getLogoUrl(
        spec
      );
  
    return (
      <footer
        className="border-t px-6 py-12 md:px-10 lg:px-14"
        style={{
          background:
            spec.theme
              .background,
  
          borderColor:
            spec.theme
              .border,
        }}
      >
        <div className="mx-auto grid max-w-[1480px] gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            {logo ? (
              <img
                src={
                  logo
                }
                alt={
                  spec.sourceBrandName
                }
                referrerPolicy="no-referrer"
                className="max-h-10 max-w-[165px] object-contain object-left"
              />
            ) : (
              <p className="font-semibold">
                {
                  spec.sourceBrandName
                }
              </p>
            )}
  
            {spec.footer.tagline ? (
              <p
                className="mt-5 max-w-[600px] text-sm leading-7"
                style={{
                  color:
                    spec.theme
                      .mutedText,
                }}
              >
                {
                  spec.footer
                    .tagline
                }
              </p>
            ) : null}
  
            {spec.footer
              .contactLine ? (
              <p
                className="mt-3 text-xs"
                style={{
                  color:
                    spec.theme
                      .mutedText,
                }}
              >
                {
                  spec.footer
                    .contactLine
                }
              </p>
            ) : null}
          </div>
  
          {spec.footer
            .navigation.length >
          0 ? (
            <div className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
              {spec.footer
                .navigation.map(
                  (
                    item
                  ) => (
                    <span
                      key={
                        item
                      }
                      className="text-xs"
                      style={{
                        color:
                          spec.theme
                            .mutedText,
                      }}
                    >
                      {
                        item
                      }
                    </span>
                  )
                )}
            </div>
          ) : null}
        </div>
      </footer>
    );
  }
  
  /* =========================================================
     RENDERER
  ========================================================= */
  
  export function PreviewRenderer({
    spec,
  }: PreviewRendererProps) {
    const headingFont =
      spec.typography
        ?.headingFont ??
      "Manrope";
  
    const bodyFont =
      spec.typography
        ?.bodyFont ??
      "Inter";
  
    const style = {
      backgroundColor:
        spec.theme
          .background,
  
      color:
        spec.theme.text,
  
      fontFamily:
        `"${bodyFont}", Arial, sans-serif`,
  
      "--preview-heading-font":
        `"${headingFont}", Arial, sans-serif`,
    } as
      CSSProperties;
  
    return (
      <main
        style={
          style
        }
        className="min-h-screen overflow-x-hidden antialiased [&_h1]:[font-family:var(--preview-heading-font)] [&_h2]:[font-family:var(--preview-heading-font)] [&_h3]:[font-family:var(--preview-heading-font)]"
      >
        <Header
          spec={
            spec
          }
        />
  
        <Hero
          spec={
            spec
          }
        />
  
        <Ticker
          spec={
            spec
          }
        />
  
        {spec.sections.map(
          (
            section,
            index
          ) => (
            <RenderSection
              key={`${section.type}-${index}`}
              section={
                section
              }
              spec={
                spec
              }
              index={
                index
              }
            />
          )
        )}
  
        <Footer
          spec={
            spec
          }
        />
      </main>
    );
  }
  
  /* =========================================================
     DEFAULT EXPORT
  
     Supports both:
     import { PreviewRenderer } ...
     and:
     import PreviewRenderer ...
  ========================================================= */
  
  export default PreviewRenderer;