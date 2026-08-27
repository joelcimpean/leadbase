import "server-only";

import {
  type RedesignAnalysisContext,
} from "@/lib/redesign-preview";

import {
  type RedesignSource,
} from "@/lib/redesign-source";

import {
  type RedesignSiteIntelligence,
  type SiteIntelligenceImage,
} from "@/lib/redesign-site-intelligence";

/* =========================================================
   TYPES
========================================================= */

export type StylePreset =
  | "editorial-split"
  | "bold-serif"
  | "technical-grid"
  | "image-led";

export type DesignHeroLayout =
  | "split"
  | "offset"
  | "fullbleed"
  | "poster"
  | "frame"
  | "editorial";

export type DesignServicesLayout =
  | "rows"
  | "grid"
  | "columns"
  | "index";

export type DesignReferencesLayout =
  | "mosaic"
  | "feature"
  | "grid"
  | "strip";

export type DesignAboutLayout =
  | "split"
  | "image-left"
  | "image-right"
  | "statement";

export type DesignPageMode =
  | "light"
  | "warm"
  | "dark";

export type DesignSectionKey =
  | "stats"
  | "services"
  | "references"
  | "about"
  | "team";

export type MockupStat = {
  value:
    string;

  label:
    string;

  note:
    string;
};

export type MockupService = {
  title:
    string;

  description:
    string;
};

export type MockupImage = {
  url:
    string;

  alt:
    string;

  kind:
    | "hero"
    | "team"
    | "project"
    | "content";
};

export type DesignMockupSnapshot = {
  version:
    1
    | 2;

  company: {
    name:
      string;

    industry:
      string
      | null;

    location:
      string
      | null;

    description:
      string
      | null;

    websiteUrl:
      string;
  };

  stylePreset:
    StylePreset;

  designDirection?:
    string;

  inspirationMemo?:
    string;

  inspirationKeywords?:
    string[];

  heroLayout?:
    DesignHeroLayout;

  servicesLayout?:
    DesignServicesLayout;

  referencesLayout?:
    DesignReferencesLayout;

  aboutLayout?:
    DesignAboutLayout;

  pageMode?:
    DesignPageMode;

  sectionOrder?:
    DesignSectionKey[];

  brandColor:
    string;

  logoUrl:
    string
    | null;

  navigation:
    string[];

  heroTitle:
    string;

  heroSubtitle:
    string;

  heroImageUrl:
    string
    | null;

  servicesTitle:
    string;

  services:
    Array<
      string
      | MockupService
    >;

  stats:
    MockupStat[];

  aboutTitle:
    string;

  aboutParagraphs:
    string[];

  aboutImageUrl?:
    string
    | null;

  teamTitle:
    string;

  teamParagraphs:
    string[];

  teamImageUrl:
    string
    | null;

  teamGroupImageUrl:
    string
    | null;

  referenceTitle:
    string;

  referenceImages:
    MockupImage[];

  contactTitle:
    string;

  contactLines:
    string[];
};

export type GenerateDesignMockupResult = {
  previewUrl:
    string;

  promptSnapshot:
    string;

  snapshot:
    DesignMockupSnapshot;
};

/* =========================================================
   DESIGN DIRECTIONS
========================================================= */

type DirectionDefinition = {
  id:
    string;

  tags:
    string[];

  stylePreset:
    StylePreset;

  heroLayout:
    DesignHeroLayout;

  servicesLayout:
    DesignServicesLayout;

  referencesLayout:
    DesignReferencesLayout;

  aboutLayout:
    DesignAboutLayout;

  pageMode:
    DesignPageMode;

  sectionOrder:
    DesignSectionKey[];
};

const DESIGN_DIRECTIONS:
  DirectionDefinition[] = [
    {
      id:
        "Editorial Heritage",

      tags: [
        "editorial",
        "heritage",
        "history",
        "serif",
        "magazine",
        "tradition",
        "timeless",
      ],

      stylePreset:
        "bold-serif",

      heroLayout:
        "editorial",

      servicesLayout:
        "rows",

      referencesLayout:
        "feature",

      aboutLayout:
        "image-left",

      pageMode:
        "warm",

      sectionOrder: [
        "stats",
        "about",
        "services",
        "references",
        "team",
      ],
    },

    {
      id:
        "Swiss Industrial",

      tags: [
        "swiss",
        "grid",
        "industrial",
        "clean",
        "system",
        "modernist",
        "rational",
      ],

      stylePreset:
        "technical-grid",

      heroLayout:
        "split",

      servicesLayout:
        "index",

      referencesLayout:
        "grid",

      aboutLayout:
        "statement",

      pageMode:
        "light",

      sectionOrder: [
        "stats",
        "services",
        "about",
        "references",
        "team",
      ],
    },

    {
      id:
        "Craft Journal",

      tags: [
        "craft",
        "editorial",
        "warm",
        "human",
        "local",
        "authentic",
        "story",
      ],

      stylePreset:
        "bold-serif",

      heroLayout:
        "poster",

      servicesLayout:
        "columns",

      referencesLayout:
        "mosaic",

      aboutLayout:
        "image-right",

      pageMode:
        "warm",

      sectionOrder: [
        "about",
        "services",
        "references",
        "stats",
        "team",
      ],
    },

    {
      id:
        "Architectural Precision",

      tags: [
        "architecture",
        "architectural",
        "precision",
        "minimal",
        "space",
        "geometry",
        "structure",
      ],

      stylePreset:
        "editorial-split",

      heroLayout:
        "offset",

      servicesLayout:
        "rows",

      referencesLayout:
        "feature",

      aboutLayout:
        "split",

      pageMode:
        "light",

      sectionOrder: [
        "services",
        "references",
        "stats",
        "about",
        "team",
      ],
    },

    {
      id:
        "Bold Typographic",

      tags: [
        "bold",
        "typographic",
        "type",
        "poster",
        "statement",
        "graphic",
        "large",
      ],

      stylePreset:
        "technical-grid",

      heroLayout:
        "poster",

      servicesLayout:
        "index",

      referencesLayout:
        "strip",

      aboutLayout:
        "statement",

      pageMode:
        "light",

      sectionOrder: [
        "stats",
        "services",
        "about",
        "references",
        "team",
      ],
    },

    {
      id:
        "Photo Documentary",

      tags: [
        "photography",
        "photo",
        "documentary",
        "image-led",
        "human",
        "real",
        "storytelling",
      ],

      stylePreset:
        "image-led",

      heroLayout:
        "fullbleed",

      servicesLayout:
        "columns",

      referencesLayout:
        "mosaic",

      aboutLayout:
        "image-left",

      pageMode:
        "dark",

      sectionOrder: [
        "references",
        "about",
        "stats",
        "services",
        "team",
      ],
    },

    {
      id:
        "Quiet Premium",

      tags: [
        "premium",
        "luxury",
        "quiet",
        "minimal",
        "refined",
        "elegant",
        "soft",
      ],

      stylePreset:
        "editorial-split",

      heroLayout:
        "frame",

      servicesLayout:
        "rows",

      referencesLayout:
        "feature",

      aboutLayout:
        "image-right",

      pageMode:
        "warm",

      sectionOrder: [
        "services",
        "about",
        "references",
        "stats",
        "team",
      ],
    },

    {
      id:
        "Technical Blueprint",

      tags: [
        "technical",
        "engineering",
        "blueprint",
        "grid",
        "precision",
        "system",
        "industrial",
      ],

      stylePreset:
        "technical-grid",

      heroLayout:
        "split",

      servicesLayout:
        "index",

      referencesLayout:
        "grid",

      aboutLayout:
        "statement",

      pageMode:
        "dark",

      sectionOrder: [
        "services",
        "stats",
        "references",
        "about",
        "team",
      ],
    },

    {
      id:
        "Modern Trade",

      tags: [
        "trade",
        "construction",
        "craft",
        "modern",
        "direct",
        "robust",
        "practical",
      ],

      stylePreset:
        "editorial-split",

      heroLayout:
        "split",

      servicesLayout:
        "grid",

      referencesLayout:
        "feature",

      aboutLayout:
        "image-left",

      pageMode:
        "light",

      sectionOrder: [
        "stats",
        "services",
        "references",
        "about",
        "team",
      ],
    },

    {
      id:
        "Gallery First",

      tags: [
        "gallery",
        "portfolio",
        "projects",
        "visual",
        "masonry",
        "photography",
        "showcase",
      ],

      stylePreset:
        "image-led",

      heroLayout:
        "fullbleed",

      servicesLayout:
        "rows",

      referencesLayout:
        "mosaic",

      aboutLayout:
        "split",

      pageMode:
        "light",

      sectionOrder: [
        "references",
        "services",
        "about",
        "stats",
        "team",
      ],
    },

    {
      id:
        "Magazine Grid",

      tags: [
        "magazine",
        "editorial",
        "grid",
        "asymmetric",
        "layout",
        "publication",
      ],

      stylePreset:
        "bold-serif",

      heroLayout:
        "editorial",

      servicesLayout:
        "columns",

      referencesLayout:
        "grid",

      aboutLayout:
        "statement",

      pageMode:
        "warm",

      sectionOrder: [
        "about",
        "references",
        "services",
        "stats",
        "team",
      ],
    },

    {
      id:
        "Local Confidence",

      tags: [
        "local",
        "trust",
        "approachable",
        "regional",
        "human",
        "family",
        "friendly",
      ],

      stylePreset:
        "editorial-split",

      heroLayout:
        "offset",

      servicesLayout:
        "grid",

      referencesLayout:
        "mosaic",

      aboutLayout:
        "image-left",

      pageMode:
        "light",

      sectionOrder: [
        "about",
        "stats",
        "services",
        "references",
        "team",
      ],
    },

    {
      id:
        "Monolithic Contrast",

      tags: [
        "contrast",
        "brutalist",
        "dark",
        "monochrome",
        "bold",
        "minimal",
        "massive",
      ],

      stylePreset:
        "technical-grid",

      heroLayout:
        "frame",

      servicesLayout:
        "index",

      referencesLayout:
        "strip",

      aboutLayout:
        "statement",

      pageMode:
        "dark",

      sectionOrder: [
        "services",
        "references",
        "about",
        "stats",
        "team",
      ],
    },

    {
      id:
        "Humanist Editorial",

      tags: [
        "humanist",
        "editorial",
        "people",
        "team",
        "warm",
        "story",
        "portrait",
      ],

      stylePreset:
        "bold-serif",

      heroLayout:
        "poster",

      servicesLayout:
        "rows",

      referencesLayout:
        "feature",

      aboutLayout:
        "image-right",

      pageMode:
        "warm",

      sectionOrder: [
        "about",
        "team",
        "services",
        "references",
        "stats",
      ],
    },

    {
      id:
        "Service Catalogue",

      tags: [
        "catalogue",
        "catalog",
        "services",
        "index",
        "system",
        "structured",
        "information",
      ],

      stylePreset:
        "editorial-split",

      heroLayout:
        "split",

      servicesLayout:
        "index",

      referencesLayout:
        "grid",

      aboutLayout:
        "split",

      pageMode:
        "light",

      sectionOrder: [
        "services",
        "stats",
        "references",
        "about",
        "team",
      ],
    },

    {
      id:
        "Cinematic Craft",

      tags: [
        "cinematic",
        "immersive",
        "full bleed",
        "photography",
        "atmospheric",
        "image",
        "dramatic",
      ],

      stylePreset:
        "image-led",

      heroLayout:
        "fullbleed",

      servicesLayout:
        "columns",

      referencesLayout:
        "strip",

      aboutLayout:
        "image-left",

      pageMode:
        "dark",

      sectionOrder: [
        "references",
        "about",
        "services",
        "stats",
        "team",
      ],
    },
  ];

/* =========================================================
   TEXT
========================================================= */

function cleanText(
  value:
    string
) {
  return value
    .replace(
      /\u00a0/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function truncate(
  value:
    string,
  maxLength:
    number
) {
  const cleaned =
    cleanText(
      value
    );

  if (
    cleaned.length <=
    maxLength
  ) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    maxLength -
      1
  )}…`;
}

function uniqueStrings(
  values:
    Array<
      string
      | null
      | undefined
    >,
  limit:
    number
) {
  const seen =
    new Set<string>();

  const result:
    string[] = [];

  for (
    const value of
      values
  ) {
    const cleaned =
      cleanText(
        value ??
        ""
      );

    if (
      !cleaned
    ) {
      continue;
    }

    const key =
      cleaned.toLowerCase();

    if (
      seen.has(
        key
      )
    ) {
      continue;
    }

    seen.add(
      key
    );

    result.push(
      cleaned
    );

    if (
      result.length >=
      limit
    ) {
      break;
    }
  }

  return result;
}

/* =========================================================
   HASH
========================================================= */

function hashString(
  value:
    string
) {
  let hash =
    2166136261;

  for (
    let index =
      0;
    index <
    value.length;
    index +=
      1
  ) {
    hash ^=
      value.charCodeAt(
        index
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return hash >>> 0;
}

/* =========================================================
   INSPIRATION
========================================================= */

function getResearchKeywords(
  designResearch:
    string | null
) {
  if (
    !designResearch
  ) {
    return [];
  }

  const normalized =
    designResearch.toLowerCase();

  const candidates = [
    "editorial",
    "heritage",
    "serif",
    "magazine",
    "grid",
    "swiss",
    "industrial",
    "technical",
    "architecture",
    "architectural",
    "minimal",
    "bold",
    "typographic",
    "poster",
    "photography",
    "photo",
    "image-led",
    "full bleed",
    "gallery",
    "masonry",
    "premium",
    "luxury",
    "warm",
    "human",
    "local",
    "craft",
    "brutalist",
    "monochrome",
    "asymmetric",
    "cinematic",
    "structured",
    "catalogue",
    "services",
    "storytelling",
  ];

  return candidates.filter(
    (
      keyword
    ) =>
      normalized.includes(
        keyword
      )
  );
}

function pickDirection({
  designResearch,
  generationIndex,
}: {
  designResearch:
    string | null;

  generationIndex:
    number;
}) {
  const research =
    (
      designResearch ??
      ""
    ).toLowerCase();

  const researchHash =
    hashString(
      research
    );

  const ranked =
    DESIGN_DIRECTIONS
      .map(
        (
          direction,
          originalIndex
        ) => {
          let score =
            0;

          for (
            const tag of
              direction.tags
          ) {
            if (
              research.includes(
                tag
              )
            ) {
              score +=
                20;
            }
          }

          const tieBreaker =
            hashString(
              `${researchHash}:${direction.id}`
            ) %
            1000;

          return {
            direction,
            score,
            tieBreaker,
            originalIndex,
          };
        }
      )
      .sort(
        (
          first,
          second
        ) => {
          if (
            second.score !==
            first.score
          ) {
            return (
              second.score -
              first.score
            );
          }

          if (
            designResearch
          ) {
            return (
              second.tieBreaker -
              first.tieBreaker
            );
          }

          return (
            first.originalIndex -
            second.originalIndex
          );
        }
      );

  const index =
    Math.abs(
      generationIndex -
      1
    ) %
    ranked.length;

  return ranked[
    index
  ].direction;
}

/* =========================================================
   IMAGE FILTERING
========================================================= */

function buildIntrinsicImageText(
  image:
    Pick<
      SiteIntelligenceImage,
      | "url"
      | "alt"
      | "context"
    >
) {
  return [
    image.url,
    image.alt,
    image.context,
  ]
    .join(
      " "
    )
    .toLowerCase();
}

function hasBadImageKeywords(
  value:
    string
) {
  return /\b(icon|favicon|logo|wordmark|brandmark|download|brochure|broschüre|broschuere|pdf|facebook|instagram|linkedin|youtube|social|badge|award|auszeichnung|siegel|zertifikat|meisterhaft|rating|bewertung|stars?|map|maps|google[- ]?maps|karte|location-map|placeholder|avatar|sprite|qr|barcode|meditation|yoga|wellness|pexels|unsplash)\b/i.test(
    value
  );
}

function hasLandscapeNoise(
  value:
    string
) {
  return /\b(lighthouse|leuchtturm|sea|ocean|coast|beach|sunset|mountain landscape|generic landscape)\b/i.test(
    value
  );
}

function hasTeamKeywords(
  value:
    string
) {
  return /\b(team|mitarbeiter|mitarbeitende|mitarbeiterinnen|büroteam|bueroteam|belegschaft|staff|employee|employees|people|crew|mannschaft|kollegen|kolleginnen)\b/i.test(
    value
  );
}

function hasProjectKeywords(
  value:
    string
  ) {
  return /\b(referenz|referenzen|projekt|projekte|portfolio|bauvorhaben|baustelle|sanierung|renovierung|umbau|neubau|project|projects|work|arbeiten)\b/i.test(
    value
  );
}

/* =========================================================
   USED IMAGE ALLOCATOR
========================================================= */

function createImageAllocator() {
  const used =
    new Set<string>();

  return {
    isUsed(
      url:
        string
    ) {
      return used.has(
        url
      );
    },

    reserve(
      url:
        string
        | null
        | undefined
    ) {
      if (
        url
      ) {
        used.add(
          url
        );
      }

      return (
        url ??
        null
      );
    },
  };
}

/* =========================================================
   HERO IMAGE
========================================================= */

function pickHeroImage({
  source,
  site,
  isUsed,
}: {
  source:
    RedesignSource;

  site:
    RedesignSiteIntelligence;

  isUsed:
    (
      url:
        string
    ) => boolean;
}) {
  const sourceHeroCandidates =
    source.assets.filter(
      (
        asset
      ) =>
        asset.kind ===
          "image" &&
        asset.role ===
          "hero" &&
        !hasBadImageKeywords(
          `${asset.url} ${asset.alt} ${asset.context}`
        )
    );

  for (
    const candidate of
      sourceHeroCandidates
  ) {
    if (
      !isUsed(
        candidate.url
      )
    ) {
      return candidate.url;
    }
  }

  const projectCandidates =
    site.projectImages
      .filter(
        (
          image
        ) => {
          const text =
            buildIntrinsicImageText(
              image
            );

          return (
            !hasBadImageKeywords(
              text
            ) &&
            !hasLandscapeNoise(
              text
            ) &&
            image.width >=
              700 &&
            image.height >=
              350
          );
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          (
            second.projectScore +
            second.width /
              100
          ) -
          (
            first.projectScore +
            first.width /
              100
          )
      );

  for (
    const candidate of
      projectCandidates
  ) {
    if (
      !isUsed(
        candidate.url
      )
    ) {
      return candidate.url;
    }
  }

  const sourceImages =
    source.assets.filter(
      (
        asset
      ) =>
        asset.kind ===
          "image" &&
        asset.role !==
          "team" &&
        !hasBadImageKeywords(
          `${asset.url} ${asset.alt} ${asset.context}`
        )
    );

  for (
    const candidate of
      sourceImages
  ) {
    if (
      !isUsed(
        candidate.url
      )
    ) {
      return candidate.url;
    }
  }

  return null;
}

/* =========================================================
   TEAM IMAGES

   IMPORTANT:
   We intentionally require image-specific evidence.
   Being on an "About" page alone is NOT enough.
========================================================= */

function pickTeamGroupImage({
  images,
  isUsed,
}: {
  images:
    SiteIntelligenceImage[];

  isUsed:
    (
      url:
        string
    ) => boolean;
}) {
  const ranked =
    images
      .filter(
        (
          image
        ) => {
          const text =
            buildIntrinsicImageText(
              image
            );

          const ratio =
            image.height >
              0
              ? image.width /
                image.height
              : 0;

          return (
            !isUsed(
              image.url
            ) &&
            !hasBadImageKeywords(
              text
            ) &&
            !hasLandscapeNoise(
              text
            ) &&
            hasTeamKeywords(
              text
            ) &&
            image.width >=
              650 &&
            image.height >=
              280 &&
            ratio >=
              1.25
          );
        }
      )
      .map(
        (
          image
        ) => ({
          image,

          score:
            image.teamScore +
            (
              image.width >=
              1000
                ? 70
                : 0
            ),
        })
      )
      .sort(
        (
          first,
          second
        ) =>
          second.score -
          first.score
      );

  return (
    ranked[0]
      ?.image ??
    null
  );
}

function pickTeamPortrait({
  images,
  isUsed,
}: {
  images:
    SiteIntelligenceImage[];

  isUsed:
    (
      url:
        string
    ) => boolean;
}) {
  const ranked =
    images
      .filter(
        (
          image
        ) => {
          const text =
            buildIntrinsicImageText(
              image
            );

          const ratio =
            image.height >
              0
              ? image.width /
                image.height
              : 0;

          return (
            !isUsed(
              image.url
            ) &&
            !hasBadImageKeywords(
              text
            ) &&
            !hasLandscapeNoise(
              text
            ) &&
            hasTeamKeywords(
              text
            ) &&
            ratio >=
              0.55 &&
            ratio <=
              1.25 &&
            image.height >=
              400
          );
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          second.teamScore -
          first.teamScore
      );

  return (
    ranked[0] ??
    null
  );
}

/* =========================================================
   ABOUT IMAGE
========================================================= */

function pickAboutImage({
  site,
  isUsed,
}: {
  site:
    RedesignSiteIntelligence;

  isUsed:
    (
      url:
        string
    ) => boolean;
}) {
  const images = [
    ...site.teamImages,
    ...site.contentImages,
  ];

  const ranked =
    images
      .filter(
        (
          image
        ) => {
          const intrinsic =
            buildIntrinsicImageText(
              image
            );

          const pageText =
            `${image.pageUrl} ${image.pageTitle}`
              .toLowerCase();

          return (
            !isUsed(
              image.url
            ) &&
            !hasBadImageKeywords(
              intrinsic
            ) &&
            !hasLandscapeNoise(
              intrinsic
            ) &&
            /\b(über|ueber|about|unternehmen|firma|betrieb|team|menschen|geschichte|standort|werkstatt)\b/i.test(
              `${pageText} ${intrinsic}`
            ) &&
            image.width >=
              500 &&
            image.height >=
              280
          );
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          (
            second.width *
            second.height
          ) -
          (
            first.width *
            first.height
          )
      );

  return (
    ranked[0] ??
    null
  );
}

/* =========================================================
   REFERENCES
========================================================= */

function pickReferenceImages({
  source,
  site,
  isUsed,
}: {
  source:
    RedesignSource;

  site:
    RedesignSiteIntelligence;

  isUsed:
    (
      url:
        string
    ) => boolean;
}) {
  const result:
    MockupImage[] = [];

  function addImage(
    image:
      MockupImage
  ) {
    if (
      isUsed(
        image.url
      ) ||
      result.some(
        (
          current
        ) =>
          current.url ===
          image.url
      )
    ) {
      return;
    }

    result.push(
      image
    );
  }

  const siteProjects =
    site.projectImages
      .filter(
        (
          image
        ) => {
          const text =
            buildIntrinsicImageText(
              image
            );

          return (
            !hasBadImageKeywords(
              text
            ) &&
            !hasLandscapeNoise(
              text
            ) &&
            (
              image.projectScore >=
                70 ||
              hasProjectKeywords(
                text
              )
            ) &&
            image.width >=
              500 &&
            image.height >=
              260
          );
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          second.projectScore -
          first.projectScore
      );

  for (
    const image of
      siteProjects
  ) {
    addImage({
      url:
        image.url,

      alt:
        truncate(
          image.alt ||
          image.context ||
          image.pageTitle ||
          "Referenz",
          100
        ),

      kind:
        "project",
    });

    if (
      result.length >=
      5
    ) {
      return result;
    }
  }

  for (
    const asset of
      source.assets
  ) {
    if (
      asset.kind !==
        "image" ||
      asset.role !==
        "project"
    ) {
      continue;
    }

    if (
      hasBadImageKeywords(
        `${asset.url} ${asset.alt} ${asset.context}`
      )
    ) {
      continue;
    }

    addImage({
      url:
        asset.url,

      alt:
        truncate(
          asset.alt ||
          asset.context ||
          "Referenz",
          100
        ),

      kind:
        "project",
    });

    if (
      result.length >=
      5
    ) {
      break;
    }
  }

  return result;
}

/* =========================================================
   SERVICE FILTER
========================================================= */

function isBadServiceTitle(
  value:
    string
) {
  const cleaned =
    cleanText(
      value
    );

  if (
    !cleaned ||
    cleaned.length <
      3 ||
    cleaned.length >
      90
  ) {
    return true;
  }

  if (
    /\b(home|startseite|kontakt|unternehmen|über uns|ueber uns|team|jobs?|karriere|aktuelles|news|referenzen?|impressum|datenschutz|cookies?|zustimmen|einstellungen|menü|menu|download|broschüre|broschuere|absenden|telefon|tel\.?|mehr info|mehr erfahren|weiterlesen)\b/i.test(
      cleaned
    )
  ) {
    return true;
  }

  if (
    /^[+\d\s()/.-]+$/.test(
      cleaned
    )
  ) {
    return true;
  }

  return false;
}

function extractServices({
  source,
  site,
}: {
  source:
    RedesignSource;

  site:
    RedesignSiteIntelligence;
}) {
  const result:
    MockupService[] = [];

  const seen =
    new Set<string>();

  function add({
    title,
    description,
  }: {
    title:
      string;

    description:
      string;
  }) {
    const cleanTitle =
      cleanText(
        title
      );

    if (
      isBadServiceTitle(
        cleanTitle
      )
    ) {
      return;
    }

    const key =
      cleanTitle.toLowerCase();

    if (
      seen.has(
        key
      )
    ) {
      return;
    }

    seen.add(
      key
    );

    result.push({
      title:
        truncate(
          cleanTitle,
          80
        ),

      description:
        truncate(
          description,
          190
        ),
    });
  }

  for (
    const section of
      source.homepageSections
  ) {
    if (
      section.purpose !==
      "services"
    ) {
      continue;
    }

    for (
      const link of
        section.links
    ) {
      add({
        title:
          link,

        description:
          section.text.find(
            (
              text
            ) =>
              text
                .toLowerCase()
                .includes(
                  link
                    .toLowerCase()
                    .slice(
                      0,
                      Math.min(
                        12,
                        link.length
                      )
                    )
                )
          ) ??
          "",
      });
    }

    for (
      const text of
        section.text
    ) {
      if (
        text.length <=
        85
      ) {
        add({
          title:
            text,

          description:
            "",
        });
      }
    }
  }

  const servicePages =
    site.pages.filter(
      (
        page
      ) =>
        /\b(leistung|leistungen|service|services|kompetenz|angebot|was wir tun|lösungen|loesungen)\b/i.test(
          `${page.url} ${page.title} ${page.h1}`
        )
    );

  for (
    const page of
      servicePages
  ) {
    const headings =
      page.headings.filter(
        (
          heading
        ) =>
          !isBadServiceTitle(
            heading
          ) &&
          heading !==
            page.h1
      );

    for (
      let index =
        0;
      index <
      headings.length;
      index +=
        1
    ) {
      const heading =
        headings[
          index
        ];

      const description =
        page.paragraphs[
          index
        ] ??
        "";

      add({
        title:
          heading,

        description,
      });
    }
  }

  /*
   * Some websites expose the real services as short
   * homepage headings rather than links.
   */
  if (
    result.length <
    4
  ) {
    for (
      const heading of
        source.headings
    ) {
      if (
        isBadServiceTitle(
          heading
        )
      ) {
        continue;
      }

      if (
        /\b(dach|zimmer|spengl|pv|photovoltaik|wartung|drohne|putz|stuck|farbe|maler|fassade|dämm|daemm|trockenbau|sanierung|renovierung|innenausbau|neubau|ausbau|abdichtung|reinigung|service)\b/i.test(
          heading
        )
      ) {
        add({
          title:
            heading,

          description:
            "",
        });
      }
    }
  }

  return result.slice(
    0,
    14
  );
}

/* =========================================================
   STATS
========================================================= */

type StatRule = {
  id:
    string;

  label:
    string;

  keyword:
    RegExp;

  min:
    number;

  max:
    number;

  allowYear:
    boolean;
};

const STAT_RULES:
  StatRule[] = [
    {
      id:
        "employees",

      label:
        "Mitarbeitende",

      keyword:
        /\b(mitarbeiter|mitarbeitende|mitarbeiterinnen|beschäftigte|beschaeftigte|teammitglieder)\b/i,

      min:
        2,

      max:
        2000,

      allowYear:
        false,
    },

    {
      id:
        "apprentices",

      label:
        "Auszubildende",

      keyword:
        /\b(auszubildende|auszubildender|azubi|azubis|nachwuchs)\b/i,

      min:
        1,

      max:
        500,

      allowYear:
        false,
    },

    {
      id:
        "projects",

      label:
        "Bauvorhaben",

      keyword:
        /\b(bauvorhaben|projekte|projekt|projekte umgesetzt|baustellen)\b/i,

      min:
        2,

      max:
        10000000,

      allowYear:
        false,
    },

    {
      id:
        "clients",

      label:
        "Auftraggeber",

      keyword:
        /\b(auftraggeber|kunden|kundinnen|kundenprojekte)\b/i,

      min:
        2,

      max:
        10000000,

      allowYear:
        false,
    },

    {
      id:
        "experience",

      label:
        "Jahre Erfahrung",

      keyword:
        /\b(jahre erfahrung|jahre|jahrzehnte)\b/i,

      min:
        5,

      max:
        300,

      allowYear:
        false,
    },

    {
      id:
        "founded",

      label:
        "Seit",

      keyword:
        /\b(seit|gegründet|gegruendet|gründung|gruendung)\b/i,

      min:
        1800,

      max:
        2100,

      allowYear:
        true,
    },
  ];

function parseNumber(
  value:
    string
) {
  const match =
    value.match(
      /\b\d{1,8}(?:[.,]\d{1,3})?\+?\b/
    );

  if (
    !match
  ) {
    return null;
  }

  const clean =
    match[0]
      .replace(
        /\+/g,
        ""
      )
      .replace(
        ",",
        "."
      );

  const number =
    Number(
      clean
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return null;
  }

  return {
    raw:
      match[0],

    number,
  };
}

function validStatNumber(
  rule:
    StatRule,
  number:
    number
) {
  if (
    number <
      rule.min ||
    number >
      rule.max
  ) {
    return false;
  }

  if (
    !rule.allowYear &&
    number >=
      1900 &&
    number <=
      2100
  ) {
    return false;
  }

  return true;
}

function extractStats({
  source,
  site,
}: {
  source:
    RedesignSource;

  site:
    RedesignSiteIntelligence;
}) {
  const result =
    new Map<
      string,
      {
        stat:
          MockupStat;

        score:
          number;
      }
    >();

  function offer({
    rule,
    value,
    note,
    score,
  }: {
    rule:
      StatRule;

    value:
      string;

    note:
      string;

    score:
      number;
  }) {
    const parsed =
      parseNumber(
        value
      );

    if (
      !parsed ||
      !validStatNumber(
        rule,
        parsed.number
      )
    ) {
      return;
    }

    const existing =
      result.get(
        rule.id
      );

    if (
      existing &&
      existing.score >=
        score
    ) {
      return;
    }

    result.set(
      rule.id,
      {
        score,

        stat: {
          value:
            parsed.raw,

          label:
            rule.label,

          note:
            truncate(
              cleanText(
                note
              ),
              120
            ),
        },
      }
    );
  }

  const structuredGroups = [
    ...(
      source.homepageHero
        ? [
            {
              heading:
                source
                  .homepageHero
                  .heading,

              lines:
                source
                  .homepageHero
                  .text,
            },
          ]
        : []
    ),

    ...source.homepageSections.map(
      (
        section
      ) => ({
        heading:
          section.heading,

        lines:
          section.text,
      })
    ),
  ];

  for (
    const group of
      structuredGroups
  ) {
    const lines = [
      group.heading,
      ...group.lines,
    ].filter(
      Boolean
    );

    for (
      const rule of
        STAT_RULES
    ) {
      for (
        const line of
          lines
      ) {
        if (
          !rule.keyword.test(
            line
          )
        ) {
          continue;
        }

        const parsed =
          parseNumber(
            line
          );

        if (
          parsed
        ) {
          offer({
            rule,
            value:
              parsed.raw,

            note:
              line,

            score:
              120,
          });
        }
      }

      /*
       * A lot of stat cards look like:
       *
       * 49
       * Kompetente Mitarbeiter ...
       *
       * so inspect neighboring lines without globally
       * mixing unrelated pages.
       */
      for (
        let index =
          0;
        index <
        lines.length;
        index +=
          1
      ) {
        const line =
          lines[
            index
          ];

        if (
          !rule.keyword.test(
            line
          )
        ) {
          continue;
        }

        const neighbors = [
          lines[
            index -
              2
          ] ??
            "",
          lines[
            index -
              1
          ] ??
            "",
          lines[
            index +
              1
          ] ??
            "",
          lines[
            index +
              2
          ] ??
            "",
        ];

        for (
          const neighbor of
            neighbors
        ) {
          const parsed =
            parseNumber(
              neighbor
            );

          if (
            !parsed
          ) {
            continue;
          }

          offer({
            rule,
            value:
              parsed.raw,

            note:
              line,

            score:
              95,
          });

          break;
        }
      }
    }
  }

  /*
   * Multi-page extraction stores headings and paragraphs
   * separately. Counter-heavy About pages often contain
   * four number headings followed by four descriptions.
   * Pair them by original sequence instead of blending all
   * content from the entire website.
   */
  for (
    const page of
      site.pages
  ) {
    const numericHeadings =
      page.headings
        .map(
          (
            heading
          ) => ({
            heading,

            parsed:
              parseNumber(
                heading
              ),
          })
        )
        .filter(
          (
            entry
          ) =>
            Boolean(
              entry.parsed
            )
        );

    const labelledLines =
      [
        ...page.headings,
        ...page.paragraphs,
      ].filter(
        (
          line
        ) =>
          STAT_RULES.some(
            (
              rule
            ) =>
              rule.keyword.test(
                line
              )
          )
      );

    if (
      numericHeadings.length >=
        2 &&
      labelledLines.length >=
        2
    ) {
      const count =
        Math.min(
          numericHeadings.length,
          labelledLines.length
        );

      for (
        let index =
          0;
        index <
        count;
        index +=
          1
      ) {
        const numeric =
          numericHeadings[
            index
          ];

        const labelLine =
          labelledLines[
            index
          ];

        const rule =
          STAT_RULES.find(
            (
              current
            ) =>
              current.keyword.test(
                labelLine
              )
          );

        if (
          !rule ||
          !numeric.parsed
        ) {
          continue;
        }

        offer({
          rule,

          value:
            numeric.parsed.raw,

          note:
            labelLine,

          score:
            105,
        });
      }
    }

    const allLines = [
      page.h1,
      ...page.headings,
      ...page.paragraphs,
    ];

    for (
      const rule of
        STAT_RULES
    ) {
      for (
        const line of
          allLines
      ) {
        if (
          !rule.keyword.test(
            line
          )
        ) {
          continue;
        }

        const parsed =
          parseNumber(
            line
          );

        if (
          !parsed
        ) {
          continue;
        }

        offer({
          rule,

          value:
            parsed.raw,

          note:
            line,

          score:
            90,
        });
      }
    }
  }

  const priority = [
    "employees",
    "apprentices",
    "projects",
    "clients",
    "experience",
    "founded",
  ];

  return priority
    .map(
      (
        key
      ) =>
        result.get(
          key
        )?.stat ??
        null
    )
    .filter(
      (
        value
      ): value is MockupStat =>
        Boolean(
          value
        )
    )
    .slice(
      0,
      4
    );
}

/* =========================================================
   ABOUT
========================================================= */

function getAboutPages(
  site:
    RedesignSiteIntelligence
) {
  return site.pages.filter(
    (
      page
    ) =>
      /\b(über|ueber|about|unternehmen|firma|geschichte|familie|betrieb|team|menschen|mitarbeiter)\b/i.test(
        `${page.url} ${page.title} ${page.h1}`
      )
  );
}

function pickAboutTitle({
  site,
}: {
  site:
    RedesignSiteIntelligence;
}) {
  const pages =
    getAboutPages(
      site
    );

  for (
    const page of
      pages
  ) {
    if (
      page.h1 &&
      !/\b(über uns|ueber uns|about us)\b/i.test(
        page.h1
      )
    ) {
      return truncate(
        page.h1,
        110
      );
    }
  }

  return "Über das Unternehmen";
}

function pickAboutParagraphs({
  source,
  site,
  analysis,
}: {
  source:
    RedesignSource;

  site:
    RedesignSiteIntelligence;

  analysis:
    RedesignAnalysisContext;
}) {
  const aboutPages =
    getAboutPages(
      site
    );

  return uniqueStrings(
    [
      ...aboutPages.flatMap(
        (
          page
        ) =>
          page.paragraphs
      ),

      analysis.company
        .description ??
        "",

      ...source.paragraphs,
    ],
    4
  )
    .filter(
      (
        paragraph
      ) =>
        paragraph.length >=
        45
    )
    .map(
      (
        paragraph
      ) =>
        truncate(
          paragraph,
          420
        )
    )
    .slice(
      0,
      3
    );
}

/* =========================================================
   CONTACT
========================================================= */

function buildAllText({
  source,
  site,
  analysis,
}: {
  source:
    RedesignSource;

  site:
    RedesignSiteIntelligence;

  analysis:
    RedesignAnalysisContext;
}) {
  return [
    source.pageTitle,
    source.metaDescription,
    ...source.headings,
    ...source.paragraphs,
    ...source.homepageSections.flatMap(
      (
        section
      ) => [
        section.heading,
        ...section.text,
      ]
    ),
    ...site.pages.flatMap(
      (
        page
      ) => [
        page.title,
        page.h1,
        ...page.headings,
        ...page.paragraphs,
      ]
    ),
    analysis.company
      .description ??
      "",
  ]
    .filter(
      Boolean
    )
    .join(
      " "
    );
}

function extractContactLines({
  source,
  analysis,
  site,
}: {
  source:
    RedesignSource;

  analysis:
    RedesignAnalysisContext;

  site:
    RedesignSiteIntelligence;
}) {
  const text =
    buildAllText({
      source,
      site,
      analysis,
    });

  const result:
    string[] = [];

  const email =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    )
      ?.[0] ??
    null;

  const phoneCandidates =
    text.match(
      /(?:\+49|0)[\d\s()/.-]{7,}\d/g
    ) ??
    [];

  const phone =
    phoneCandidates.find(
      (
        candidate
      ) => {
        const digits =
          candidate.replace(
            /\D/g,
            ""
          );

        return (
          digits.length >=
            9 &&
          digits.length <=
            15
        );
      }
    ) ??
    null;

  if (
    analysis.company
      .location
  ) {
    result.push(
      analysis.company
        .location
    );
  }

  if (
    phone
  ) {
    result.push(
      cleanText(
        phone
      )
    );
  }

  if (
    email
  ) {
    result.push(
      email
    );
  }

  result.push(
    source.finalUrl
  );

  return uniqueStrings(
    result,
    4
  );
}

/* =========================================================
   GENERATE
========================================================= */

export async function generateDesignMockupVariant({
  variantId,
  source,
  analysis,
  site,
  generationIndex,
  designResearch = null,
}: {
  variantId:
    string;

  source:
    RedesignSource;

  analysis:
    RedesignAnalysisContext;

  site:
    RedesignSiteIntelligence;

  generationIndex:
    number;

  designResearch?:
    string
    | null;
}): Promise<GenerateDesignMockupResult> {
  const direction =
    pickDirection({
      designResearch,
      generationIndex,
    });

  const allocator =
    createImageAllocator();

  const logoUrl =
    site.primaryLogo
      ?.url ??
    source.assets.find(
      (
        asset
      ) =>
        asset.kind ===
        "logo"
    )
      ?.url ??
    null;

  const brandColor =
    site.primaryBrandColor ??
    source.brandColorAnchor ??
    source.brandColorCandidates[
      0
    ] ??
    source.colorHints[
      0
    ] ??
    "#161616";

  const heroImageUrl =
    allocator.reserve(
      pickHeroImage({
        source,
        site,
        isUsed:
          allocator.isUsed,
      })
    );

  const teamGroupImage =
    pickTeamGroupImage({
      images:
        site.teamImages,
      isUsed:
        allocator.isUsed,
    });

  const teamGroupImageUrl =
    allocator.reserve(
      teamGroupImage
        ?.url ??
        null
    );

  const teamPortrait =
    pickTeamPortrait({
      images:
        site.teamImages,
      isUsed:
        allocator.isUsed,
    });

  const teamImageUrl =
    allocator.reserve(
      teamPortrait
        ?.url ??
        null
    );

  const aboutImage =
    pickAboutImage({
      site,
      isUsed:
        allocator.isUsed,
    });

  const aboutImageUrl =
    allocator.reserve(
      aboutImage
        ?.url ??
        null
    );

  const references =
    pickReferenceImages({
      source,
      site,
      isUsed:
        allocator.isUsed,
    });

  for (
    const reference of
      references
  ) {
    allocator.reserve(
      reference.url
    );
  }

  const services =
    extractServices({
      source,
      site,
    });

  const stats =
    extractStats({
      source,
      site,
    });

  const aboutParagraphs =
    pickAboutParagraphs({
      source,
      site,
      analysis,
    });

  const heroTitle =
    truncate(
      source.homepageHero
        ?.heading ||
      source.headings[
        0
      ] ||
      analysis.company
        .name,
      130
    );

  const heroSubtitle =
    truncate(
      source.homepageHero
        ?.text[
          0
        ] ??
      source.metaDescription ??
      source.paragraphs[
        0
      ] ??
      analysis.company
        .description ??
      "",
      280
    );

  const inspirationKeywords =
    getResearchKeywords(
      designResearch
    );

  const storedMemo =
    designResearch
      ? truncate(
          designResearch,
          6500
        )
      : "";

  const snapshot:
    DesignMockupSnapshot = {
    version:
      2,

    company: {
      name:
        analysis.company
          .name,

      industry:
        analysis.company
          .industry ??
        null,

      location:
        analysis.company
          .location ??
        null,

      description:
        analysis.company
          .description ??
        null,

      websiteUrl:
        source.finalUrl,
    },

    stylePreset:
      direction.stylePreset,

    designDirection:
      direction.id,

    inspirationMemo:
      storedMemo,

    inspirationKeywords,

    heroLayout:
      direction.heroLayout,

    servicesLayout:
      direction.servicesLayout,

    referencesLayout:
      direction.referencesLayout,

    aboutLayout:
      direction.aboutLayout,

    pageMode:
      direction.pageMode,

    sectionOrder:
      direction.sectionOrder,

    brandColor,

    logoUrl,

    navigation:
      uniqueStrings(
        source.navigation.filter(
          (
            item
          ) =>
            !/\b(home|startseite)\b/i.test(
              item
            )
        ),
        5
      ),

    heroTitle:
      heroTitle ||
      analysis.company
        .name,

    heroSubtitle,

    heroImageUrl,

    servicesTitle:
      services.length >
        0
        ? "Leistungen"
        : "Was wir tun",

    services,

    stats,

    aboutTitle:
      pickAboutTitle({
        site,
      }),

    aboutParagraphs,

    aboutImageUrl,

    teamTitle:
      "Menschen hinter dem Unternehmen",

    teamParagraphs:
      aboutParagraphs.slice(
        0,
        2
      ),

    teamImageUrl,

    teamGroupImageUrl,

    referenceTitle:
      "Ausgewählte Arbeiten",

    referenceImages:
      references,

    contactTitle:
      "Projekt besprechen",

    contactLines:
      extractContactLines({
        source,
        analysis,
        site,
      }),
  };

  const promptSnapshot =
    [
      `DIRECTION=${direction.id}`,

      `MAXIBESTOF=${designResearch ? "yes" : "fallback"}`,

      `INSPO_KEYWORDS=${inspirationKeywords.join(", ")}`,

      `HERO_LAYOUT=${direction.heroLayout}`,

      `SERVICES_LAYOUT=${direction.servicesLayout}`,

      `REFERENCES_LAYOUT=${direction.referencesLayout}`,

      `ABOUT_LAYOUT=${direction.aboutLayout}`,

      `PAGE_MODE=${direction.pageMode}`,

      `BRAND_COLOR=${brandColor}`,

      `LOGO=${logoUrl ?? "none"}`,

      `HERO_IMAGE=${heroImageUrl ?? "none"}`,

      `SERVICES=${services
        .map(
          (
            service
          ) =>
            service.title
        )
        .join(" | ")}`,

      `STATS=${stats
        .map(
          (
            stat
          ) =>
            `${stat.value} ${stat.label}`
        )
        .join(" | ")}`,

      `ABOUT_IMAGE=${aboutImageUrl ?? "none"}`,

      `TEAM_GROUP=${teamGroupImageUrl ?? "none"}`,

      `TEAM_PORTRAIT=${teamImageUrl ?? "none"}`,

      `REFERENCES=${references
        .map(
          (
            image
          ) =>
            image.url
        )
        .join(" | ")}`,
    ].join(
      "\n"
    );

  return {
    previewUrl:
      `/design-preview/${variantId}`,

    promptSnapshot,

    snapshot,
  };
}