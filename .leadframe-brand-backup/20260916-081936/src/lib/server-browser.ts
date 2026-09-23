import "server-only";

import chromium from "@sparticuz/chromium";

import {
  chromium as playwrightChromium,
  type Browser,
} from "playwright-core";

/* =========================================================
   SERVER BROWSER
========================================================= */

export async function launchServerBrowser(): Promise<Browser> {
  const isVercel =
    process.env.VERCEL === "1";

  /* =======================================================
     VERCEL
  ======================================================= */

  if (isVercel) {
    /*
     * Leadbase only needs normal website rendering and
     * screenshots.
     *
     * WebGL / SwiftShader is unnecessary here and consumes
     * additional serverless resources.
     */
    chromium.setGraphicsMode =
      false;

    const executablePath =
      await chromium.executablePath();

    return await playwrightChromium.launch({
      executablePath,

      args:
        chromium.args,

      headless:
        true,
    });
  }

  /* =======================================================
     LOCAL DEVELOPMENT
  ======================================================= */

  return await playwrightChromium.launch({
    channel:
      "chrome",

    headless:
      true,
  });
}