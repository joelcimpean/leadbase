import type {
  Metadata,
} from "next";

import {
  Inter,
} from "next/font/google";

import {
  ThemeProvider,
} from "@/components/theme-provider";

import "./globals.css";

/* =========================================================
   FONT
========================================================= */

const inter =
  Inter({
    subsets: [
      "latin",
    ],

    variable:
      "--font-inter",
  });

/* =========================================================
   METADATA
========================================================= */

export const metadata:
  Metadata = {
    title:
      "Leadbase",

    description:
      "Private lead generation and CRM workspace",
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

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="de"
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
        className={`${inter.variable} ${inter.className}`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}