import "server-only";

import {
  launchServerBrowser,
} from "@/lib/server-browser";

export type WebsiteScreenshots = {
  desktop: Buffer;

  mobile: Buffer;

  finalUrl: string;
};

function normalizeUrl(
  websiteUrl: string
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

export async function captureWebsiteScreenshots(
  websiteUrl: string
): Promise<WebsiteScreenshots> {
  const url =
    normalizeUrl(
      websiteUrl
    );

  const browser =
    await launchServerBrowser();

  try {
    /* =========================================================
       DESKTOP
    ========================================================= */

    const desktopContext =
      await browser.newContext({
        viewport: {
          width: 1440,

          height: 1000,
        },

        deviceScaleFactor:
          1,

        locale:
          "de-DE",
      });

    const desktopPage =
      await desktopContext.newPage();

    await desktopPage.goto(
      url,
      {
        waitUntil:
          "domcontentloaded",

        timeout:
          20_000,
      }
    );

    await desktopPage.waitForTimeout(
      1200
    );

    const finalUrl =
      desktopPage.url();

    const desktop =
      await desktopPage.screenshot({
        type:
          "jpeg",

        quality:
          80,

        fullPage:
          false,
      });

    await desktopContext.close();

    /* =========================================================
       MOBILE
    ========================================================= */

    const mobileContext =
      await browser.newContext({
        viewport: {
          width: 390,

          height: 844,
        },

        deviceScaleFactor:
          1,

        isMobile:
          true,

        hasTouch:
          true,

        locale:
          "de-DE",
      });

    const mobilePage =
      await mobileContext.newPage();

    await mobilePage.goto(
      finalUrl,
      {
        waitUntil:
          "domcontentloaded",

        timeout:
          20_000,
      }
    );

    await mobilePage.waitForTimeout(
      1200
    );

    const mobile =
      await mobilePage.screenshot({
        type:
          "jpeg",

        quality:
          80,

        fullPage:
          false,
      });

    await mobileContext.close();

    return {
      desktop,

      mobile,

      finalUrl,
    };
  } finally {
    await browser.close();
  }
}