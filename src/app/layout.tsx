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