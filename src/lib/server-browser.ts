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

  /*
   * VERCEL
   *
   * Vercel does not contain Playwright's downloaded browser.
   * @sparticuz/chromium provides a Chromium binary specifically
   * for serverless Linux environments.
   */
  if (isVercel) {
    const executablePath =
      await chromium.executablePath();

    return await playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }

  /*
   * LOCAL DEVELOPMENT
   *
   * Use the locally installed Google Chrome.
   * This prevents the Linux-only Sparticuz binary from being
   * used on macOS.
   */
  return await playwrightChromium.launch({
    channel: "chrome",
    headless: true,
  });
}