import type {
  Metadata,
} from "next";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import {
  ThemeProvider,
} from "@/components/theme-provider";

import { getAppLanguage } from "@/lib/i18n-server";

import "./globals.css";
import "./leadbase-design-system.css";
import "./leadbase-app-migration.css";
import "./leadbase-workspaces-v2.css";

/* =========================================================
   FONT
========================================================= */

const geist =
  Geist({
    subsets: [
      "latin",
    ],

    variable:
      "--font-geist-sans",
  });

const geistMono =
  Geist_Mono({
    subsets: [
      "latin",
    ],

    variable:
      "--font-geist-mono",
  });

/* =========================================================
   METADATA
========================================================= */

export const metadata:
  Metadata = {
    title:
      "Leadbase",

    description:
      "Lead generation, outreach and client acquisition workspace",
  };


const themeBootScript = `
(() => {
  try {
    const stored = localStorage.getItem("leadbase-theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (stored !== "light" && systemDark);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }
})();
`;

/* =========================================================
   ROOT LAYOUT
========================================================= */

export default async function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  const language = await getAppLanguage();

  return (
    <html
      lang={language}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              themeBootScript,
          }}
        />
      </head>

      <body
        className={`${geist.variable} ${geistMono.variable}`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}