import "server-only";

import {
  launchServerBrowser,
} from "@/lib/server-browser";

export type WebsiteScreenshots = {
  desktop:
    Buffer;

  mobile:
    Buffer;

  finalUrl:
    string;
};

/* =========================================================
   URL
========================================================= */

function normalizeUrl(
  websiteUrl:
    string
) {
  const value =
    websiteUrl.trim();

  const normalized =
    value.startsWith(
      "http://"
    ) ||
    value.startsWith(
      "https://"
    )
      ? value
      : `https://${value}`;

  const url =
    new URL(
      normalized
    );

  if (
    url.protocol !==
      "http:" &&
    url.protocol !==
      "https:"
  ) {
    throw new Error(
      "Unsupported website protocol."
    );
  }

  return url.toString();
}

/* =========================================================
   SCREENSHOTS
========================================================= */

export async function captureWebsiteScreenshots(
  websiteUrl:
    string
): Promise<WebsiteScreenshots> {
  const url =
    normalizeUrl(
      websiteUrl
    );

  const browser =
    await launchServerBrowser();

  try {
    /*
     * IMPORTANT:
     *
     * Use exactly ONE browser context on serverless.
     *
     * @sparticuz/chromium can become unstable when contexts
     * are repeatedly created/closed in Lambda-style
     * environments.
     */
    const context =
      await browser.newContext({
        viewport: {
          width:
            1440,

          height:
            1000,
        },

        deviceScaleFactor:
          1,

        locale:
          "de-DE",

        serviceWorkers:
          "block",
      });

    try {
      /*
       * Use one page for both desktop and mobile.
       *
       * This avoids creating a second BrowserContext /
       * newPage after the first screenshot.
       */
      const page =
        await context.newPage();

      /*
       * Videos are unnecessary for screenshots and can be
       * expensive on serverless Chromium.
       *
       * Keep CSS, fonts, JavaScript and images enabled.
       */
      await page.route(
        "**/*",
        async (
          route
        ) => {
          const request =
            route.request();

          const resourceType =
            request.resourceType();

          if (
            resourceType ===
            "media"
          ) {
            await route.abort();

            return;
          }

          await route.continue();
        }
      );

      /* =====================================================
         DESKTOP
      ===================================================== */

      await page.goto(
        url,
        {
          waitUntil:
            "domcontentloaded",

          timeout:
            20_000,
        }
      );

      await page.waitForTimeout(
        1200
      );

      const finalUrl =
        page.url();

      const desktopScreenshot =
        await page.screenshot({
          type:
            "jpeg",

          quality:
            80,

          fullPage:
            false,
        });

      const desktop =
        Buffer.from(
          desktopScreenshot
        );

      /* =====================================================
         MOBILE
      ===================================================== */

      /*
       * Do NOT close the context and create another one.
       *
       * Simply resize the existing page.
       */
      await page.setViewportSize({
        width:
          390,

        height:
          844,
      });

      /*
       * Reload after changing the viewport so responsive
       * JavaScript and layout listeners get another chance
       * to react to the mobile dimensions.
       */
      await page.goto(
        finalUrl,
        {
          waitUntil:
            "domcontentloaded",

          timeout:
            20_000,
        }
      );

      await page.waitForTimeout(
        1200
      );

      const mobileScreenshot =
        await page.screenshot({
          type:
            "jpeg",

          quality:
            80,

          fullPage:
            false,
        });

      const mobile =
        Buffer.from(
          mobileScreenshot
        );

      return {
        desktop,

        mobile,

        finalUrl,
      };
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}