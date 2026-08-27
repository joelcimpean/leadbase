import type {
  Metadata,
} from "next";

import {
  notFound,
} from "next/navigation";

import LegacyDesignPreviewPage from "./legacy-design-preview";

import {
  StaticDesignFrame,
} from "./static-design-frame";

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

type StaticHtmlSnapshot = {
  version:
    3;

  renderMode:
    "html";

  html:
    string;

  companyName?:
    string;

  direction?:
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

function getStaticHtmlSnapshot(
  value:
    unknown
): StaticHtmlSnapshot | null {
  if (
    !isRecord(
      value
    )
  ) {
    return null;
  }

  if (
    value[
      "version"
    ] !==
      3 ||
    value[
      "renderMode"
    ] !==
      "html" ||
    typeof value[
      "html"
    ] !==
      "string" ||
    !value[
      "html"
    ].trim()
  ) {
    return null;
  }

  return value as
    unknown as
    StaticHtmlSnapshot;
}

/* =========================================================
   RUNTIME SCROLL SAFETY

   Important:

   This runs while DISPLAYING the stored design.

   That means OLD Sol variants also get the fix without
   regenerating them and without spending OpenAI tokens.
========================================================= */

function addRuntimeScrollSafety(
  html:
    string
) {
  const marker =
    "data-leadbase-runtime-scroll-safety";

  if (
    html.includes(
      marker
    )
  ) {
    return html;
  }

  const css =
    `
<style ${marker}>
html,
body {
  width: 100% !important;
  max-width: 100% !important;

  height: auto !important;
  min-height: 100% !important;
  max-height: none !important;

  overflow-x: hidden !important;
  overflow-y: visible !important;
}

body {
  position: relative !important;
}

body > main,
body > div:first-child,
#root,
#__next,
#app {
  width: 100% !important;

  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;

  overflow: visible !important;
}

@media (max-width: 768px) {
  html,
  body {
    height: auto !important;
    min-height: 100% !important;
    max-height: none !important;

    overflow-x: hidden !important;
    overflow-y: visible !important;

    touch-action: pan-y !important;
  }

  body > main,
  body > div:first-child,
  #root,
  #__next,
  #app {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;

    overflow: visible !important;
  }
}

@media (max-width: 480px) {
  html,
  body {
    width: 100% !important;
    max-width: 100% !important;

    height: auto !important;
    min-height: 100% !important;
    max-height: none !important;

    overflow-x: hidden !important;
    overflow-y: visible !important;
  }
}
</style>
    `.trim();

  if (
    /<\/head>/i.test(
      html
    )
  ) {
    return html.replace(
      /<\/head>/i,
      `${css}\n</head>`
    );
  }

  if (
    /<body\b/i.test(
      html
    )
  ) {
    return html.replace(
      /<body\b/i,
      `${css}\n<body`
    );
  }

  return `${css}\n${html}`;
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
      "Could not load design preview:",
      error
    );

    notFound();
  }

  if (
    !data
  ) {
    notFound();
  }

  const staticSnapshot =
    getStaticHtmlSnapshot(
      data.source_snapshot
    );

  /* =======================================================
     GPT-5.6 SOL HTML DESIGN
  ======================================================= */

  if (
    staticSnapshot
  ) {
    const previewHtml =
      addRuntimeScrollSafety(
        staticSnapshot.html
      );

    const title =
      staticSnapshot.companyName
        ? `Design Concept · ${staticSnapshot.companyName}`
        : "Design Concept";

    return (
      <main className="min-h-dvh w-full overflow-x-hidden bg-black">
        <StaticDesignFrame
          html={
            previewHtml
          }
          title={
            title
          }
        />
      </main>
    );
  }

  /* =======================================================
     LEGACY DESIGN

     Alte Varianten funktionieren weiterhin mit dem alten
     Renderer.
  ======================================================= */

  return (
    <LegacyDesignPreviewPage
      params={
        Promise.resolve({
          id,
        })
      }
    />
  );
}