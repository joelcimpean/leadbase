import "server-only";

import type {
  Page,
} from "playwright-core";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  launchServerBrowser,
} from "@/lib/server-browser";

/* =========================================================
   CONFIG
========================================================= */

const SNAPSHOT_BUCKET =
  "leadbase-preview-snapshots";

const SNAPSHOT_WIDTH =
  1440;

const SNAPSHOT_HEIGHT =
  900;

/* =========================================================
   TYPES
========================================================= */

type CaptureResult = {
  buffer:
    Buffer;

  finalUrl:
    string;
};

type BuildPublicSnapshotInput = {
  sourceSnapshot:
    unknown;

  websiteUrl:
    string
    | null;

  userId:
    string;

  leadId:
    string;

  variantId:
    string;
};

/* =========================================================
   RECORD
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
   CAPTURE POLISH
========================================================= */

function escapeRegExp(
  value:
    string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

async function clickConsentAction({
  page,
  label,
}: {
  page:
    Page;

  label:
    string;
}) {
  const pattern =
    new RegExp(
      `^\\s*${escapeRegExp(
        label
      )}\\s*$`,
      "i"
    );

  const candidates = [
    page.getByRole(
      "button",
      {
        name:
          pattern,
      }
    ),

    page.getByRole(
      "link",
      {
        name:
          pattern,
      }
    ),

    page.getByText(
      pattern,
      {
        exact:
          true,
      }
    ),
  ];

  for (
    const candidate
    of candidates
  ) {
    const locator =
      candidate.first();

    const visible =
      await locator
        .isVisible({
          timeout:
            250,
        })
        .catch(
          () =>
            false
        );

    if (
      !visible
    ) {
      continue;
    }

    const clicked =
      await locator
        .click({
          timeout:
            1_500,
        })
        .then(
          () =>
            true
        )
        .catch(
          () =>
            false
        );

    if (
      clicked
    ) {
      await page.waitForTimeout(
        350
      );

      return true;
    }
  }

  return false;
}

async function dismissCookieConsent(
  page:
    Page
) {
  /*
   * Prefer reject / essential-only actions so the screenshot stays
   * clean without enabling unnecessary third-party media or trackers.
   */
  const preferredLabels = [
    "Alle ablehnen",
    "Alles ablehnen",
    "Nur notwendige",
    "Nur notwendige Cookies",
    "Nur erforderliche",
    "Nur essentielle Cookies",
    "Ablehnen",
    "Reject all",
    "Reject All",
    "Decline all",
    "Decline All",
    "Essential only",
    "Only necessary",
    "Continue without accepting",
    "Weiter ohne Zustimmung",
  ];

  for (
    const label
    of preferredLabels
  ) {
    if (
      await clickConsentAction({
        page,
        label,
      })
    ) {
      break;
    }
  }

  /*
   * Some consent tools leave an overlay behind even after a click,
   * or use custom elements that Playwright cannot identify by role.
   * Remove only fixed/sticky high-z-index consent layers.
   */
  await page
    .evaluate(() => {
      const keywords = [
        "cookie",
        "consent",
        "datenschutz",
        "privacy",
        "einwilligung",
      ];

      const nodes =
        Array.from(
          document.body
            ?.querySelectorAll<HTMLElement>(
              "*"
            ) ??
            []
        );

      for (
        const element
        of nodes
      ) {
        const style =
          window.getComputedStyle(
            element
          );

        if (
          style.position !==
            "fixed" &&
          style.position !==
            "sticky"
        ) {
          continue;
        }

        const zIndex =
          Number.parseInt(
            style.zIndex ||
              "0",
            10
          );

        if (
          !Number.isFinite(
            zIndex
          ) ||
          zIndex <
            20
        ) {
          continue;
        }

        const haystack =
          [
            element.id,
            element.className,
            element.getAttribute(
              "aria-label"
            ) ??
              "",
            element.textContent ??
              "",
          ]
            .join(
              " "
            )
            .toLowerCase();

        if (
          !keywords.some(
            (
              keyword
            ) =>
              haystack.includes(
                keyword
              )
          )
        ) {
          continue;
        }

        const rect =
          element.getBoundingClientRect();

        if (
          rect.width <
            140 ||
          rect.height <
            70
        ) {
          continue;
        }

        element.remove();
      }

      document.documentElement.style.overflow =
        "";

      if (
        document.body
      ) {
        document.body.style.overflow =
          "";
      }
    })
    .catch(
      () =>
        undefined
    );
}

async function stabilizePage(
  page:
    Page
) {
  await page
    .waitForLoadState(
      "networkidle",
      {
        timeout:
          5_000,
      }
    )
    .catch(
      () =>
        undefined
    );

  await dismissCookieConsent(
    page
  );

  await page
    .addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
          caret-color: transparent !important;
        }

        html {
          scroll-behavior: auto !important;
        }
      `,
    })
    .catch(
      () =>
        undefined
    );

  await page
    .evaluate(async () => {
      window.scrollTo(
        0,
        0
      );

      if (
        "fonts" in document
      ) {
        await document.fonts.ready;
      }

      const images =
        Array.from(
          document.images
        );

      await Promise.all(
        images.map(
          async (
            image
          ) => {
            if (
              image.complete
            ) {
              return;
            }

            await new Promise<void>(
              (
                resolve
              ) => {
                const done =
                  () =>
                    resolve();

                image.addEventListener(
                  "load",
                  done,
                  {
                    once:
                      true,
                  }
                );

                image.addEventListener(
                  "error",
                  done,
                  {
                    once:
                      true,
                  }
                );

                window.setTimeout(
                  done,
                  1_500
                );
              }
            );
          }
        )
      );
    })
    .catch(
      () =>
        undefined
    );

  await page.waitForTimeout(
    250
  );
}

/* =========================================================
   CAPTURE
========================================================= */

async function captureCurrentWebsiteSnapshot(
  websiteUrl:
    string
): Promise<CaptureResult> {
  const url =
    normalizeUrl(
      websiteUrl
    );

  const browser =
    await launchServerBrowser();

  try {
    const context =
      await browser.newContext({
        viewport: {
          width:
            SNAPSHOT_WIDTH,

          height:
            SNAPSHOT_HEIGHT,
        },

        deviceScaleFactor:
          1,

        locale:
          "de-DE",

        serviceWorkers:
          "block",

        ignoreHTTPSErrors:
          true,

        reducedMotion:
          "reduce",
      });

    try {
      const page =
        await context.newPage();

      await page.route(
        "**/*",
        async (
          route
        ) => {
          const resourceType =
            route
              .request()
              .resourceType();

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

      await page.goto(
        url,
        {
          waitUntil:
            "domcontentloaded",

          timeout:
            25_000,
        }
      );

      await stabilizePage(
        page
      );

      const finalUrl =
        page.url();

      const screenshot =
        await page.screenshot({
          type:
            "jpeg",

          quality:
            88,

          fullPage:
            false,
        });

      return {
        buffer:
          Buffer.from(
            screenshot
          ),

        finalUrl,
      };
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

/* =========================================================
   STORAGE
========================================================= */

async function ensureSnapshotBucket() {
  const admin =
    createAdminClient();

  const {
    data:
      buckets,
    error:
      listError,
  } =
    await admin.storage.listBuckets();

  if (
    listError
  ) {
    throw new Error(
      listError.message
    );
  }

  const exists =
    buckets?.some(
      (
        bucket
      ) =>
        bucket.name ===
        SNAPSHOT_BUCKET
    ) ??
    false;

  if (
    !exists
  ) {
    const {
      error:
        createError,
    } =
      await admin.storage.createBucket(
        SNAPSHOT_BUCKET,
        {
          public:
            true,

          allowedMimeTypes: [
            "image/jpeg",
          ],
        }
      );

    if (
      createError &&
      !createError.message
        .toLowerCase()
        .includes(
          "already exists"
        )
    ) {
      throw new Error(
        createError.message
      );
    }
  }

  return admin;
}

async function uploadSnapshot({
  buffer,
  userId,
  leadId,
  variantId,
}: {
  buffer:
    Buffer;

  userId:
    string;

  leadId:
    string;

  variantId:
    string;
}) {
  const admin =
    await ensureSnapshotBucket();

  const path =
    `${userId}/${leadId}/${variantId}/current-desktop.jpg`;

  const {
    error:
      uploadError,
  } =
    await admin.storage
      .from(
        SNAPSHOT_BUCKET
      )
      .upload(
        path,
        buffer,
        {
          contentType:
            "image/jpeg",

          cacheControl:
            "3600",

          upsert:
            true,
        }
      );

  if (
    uploadError
  ) {
    throw new Error(
      uploadError.message
    );
  }

  const {
    data,
  } =
    admin.storage
      .from(
        SNAPSHOT_BUCKET
      )
      .getPublicUrl(
        path
      );

  return data.publicUrl;
}

/* =========================================================
   PUBLIC SNAPSHOT
========================================================= */

export async function buildPublicDesignSnapshot({
  sourceSnapshot,
  websiteUrl,
  userId,
  leadId,
  variantId,
}: BuildPublicSnapshotInput) {
  if (
    !isRecord(
      sourceSnapshot
    ) ||
    !websiteUrl
      ?.trim()
  ) {
    return sourceSnapshot;
  }

  try {
    const capture =
      await captureCurrentWebsiteSnapshot(
        websiteUrl
      );

    let snapshotUrl:
      string;

    try {
      snapshotUrl =
        await uploadSnapshot({
          buffer:
            capture.buffer,

          userId,
          leadId,
          variantId,
        });
    } catch (
      uploadError
    ) {
      console.error(
        "Could not upload current website snapshot; using inline fallback:",
        uploadError
      );

      snapshotUrl =
        `data:image/jpeg;base64,${capture.buffer.toString(
          "base64"
        )}`;
    }

    return {
      ...sourceSnapshot,

      currentWebsiteSnapshotUrl:
        snapshotUrl,

      currentWebsiteSnapshotCapturedAt:
        new Date()
          .toISOString(),

      currentWebsiteFinalUrl:
        capture.finalUrl,

      currentWebsiteSnapshotViewport: {
        width:
          SNAPSHOT_WIDTH,

        height:
          SNAPSHOT_HEIGHT,
      },
    };
  } catch (
    error
  ) {
    console.error(
      "Could not capture current website snapshot for public preview:",
      error
    );

    return sourceSnapshot;
  }
}
