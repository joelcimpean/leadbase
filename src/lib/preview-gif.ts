import "server-only";

import {
  GIFEncoder,
  applyPalette,
  quantize,
} from "gifenc";

import {
  PNG,
} from "pngjs";

import {
  launchServerBrowser,
} from "@/lib/server-browser";

/* =========================================================
   CONFIG
========================================================= */

/*
 * Smooth but email-conscious:
 *
 * - 560 × 350 instead of 640 × 400
 * - 84 frames instead of 32
 * - ~9.2 second loop
 * - ~9 FPS
 * - lower palette to offset the added frames
 *
 * This gives much smaller movement jumps while avoiding an
 * unnecessarily gigantic email asset.
 */
const WIDTH =
  560;

const HEIGHT =
  350;

const FRAME_DELAY_MS =
  110;

const MAX_COLORS =
  48;

const LOAD_TIMEOUT_MS =
  20_000;

const STABILIZE_MS =
  1_500;

/*
 * Keep the visual travel the user already liked.
 */
const MAX_SCROLL_FRACTION =
  0.42;

const MOTION_PEAK =
  0.64;

const TOP_HOLD_FRAMES =
  8;

const DOWN_FRAMES =
  31;

const BOTTOM_HOLD_FRAMES =
  6;

const UP_FRAMES =
  31;

const FINAL_HOLD_FRAMES =
  8;

/* =========================================================
   TYPES
========================================================= */

export type PreviewGifResult = {
  bytes:
    Uint8Array;

  width:
    number;

  height:
    number;

  frameCount:
    number;

  durationMs:
    number;
};

/* =========================================================
   HELPERS
========================================================= */

function sleep(
  milliseconds:
    number
) {
  return new Promise<void>(
    (
      resolve
    ) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function easeInOutSine(
  value:
    number
) {
  return -(
    Math.cos(
      Math.PI *
        value
    ) -
    1
  ) /
    2;
}

function createScrollProgress() {
  const frames:
    number[] =
      [];

  for (
    let index =
      0;
    index <
      TOP_HOLD_FRAMES;
    index +=
      1
  ) {
    frames.push(
      0
    );
  }

  for (
    let index =
      1;
    index <=
      DOWN_FRAMES;
    index +=
      1
  ) {
    frames.push(
      easeInOutSine(
        index /
          DOWN_FRAMES
      ) *
        MOTION_PEAK
    );
  }

  for (
    let index =
      0;
    index <
      BOTTOM_HOLD_FRAMES;
    index +=
      1
  ) {
    frames.push(
      MOTION_PEAK
    );
  }

  for (
    let index =
      1;
    index <=
      UP_FRAMES;
    index +=
      1
  ) {
    frames.push(
      (
        1 -
        easeInOutSine(
          index /
            UP_FRAMES
        )
      ) *
        MOTION_PEAK
    );
  }

  for (
    let index =
      0;
    index <
      FINAL_HOLD_FRAMES;
    index +=
      1
  ) {
    frames.push(
      0
    );
  }

  return frames;
}

const SCROLL_PROGRESS =
  createScrollProgress();

/* =========================================================
   GENERATE
========================================================= */

export async function generatePreviewGif(
  previewUrl:
    string
): Promise<PreviewGifResult> {
  const browser =
    await launchServerBrowser();

  try {
    const page =
      await browser.newPage({
        viewport: {
          width:
            WIDTH,

          height:
            HEIGHT,
        },

        deviceScaleFactor:
          1,
      });

    await page.setExtraHTTPHeaders({
      "x-leadbase-renderer":
        "preview-gif",
    });

    await page.goto(
      previewUrl,
      {
        waitUntil:
          "networkidle",

        timeout:
          LOAD_TIMEOUT_MS,
      }
    );

    await page.waitForSelector(
      "iframe",
      {
        timeout:
          LOAD_TIMEOUT_MS,
      }
    );

    await sleep(
      STABILIZE_MS
    );

    const pageHeight =
      await page.evaluate(
        () =>
          Math.max(
            document.documentElement
              .scrollHeight,
            document.body
              ?.scrollHeight ??
              0,
            window.innerHeight
          )
      );

    const fullAvailableScroll =
      Math.max(
        0,
        pageHeight -
          HEIGHT
      );

    const teaserScroll =
      Math.round(
        fullAvailableScroll *
          MAX_SCROLL_FRACTION
      );

    const gif =
      GIFEncoder();

    for (
      let index =
        0;
      index <
        SCROLL_PROGRESS.length;
      index +=
        1
    ) {
      const targetScroll =
        Math.round(
          teaserScroll *
            SCROLL_PROGRESS[
              index
            ]
        );

      await page.evaluate(
        (
          y
        ) => {
          window.scrollTo(
            0,
            y
          );
        },
        targetScroll
      );

      await sleep(
        45
      );

      const screenshot =
        await page.screenshot({
          type:
            "png",

          animations:
            "disabled",
        });

      const png =
        PNG.sync.read(
          screenshot
        );

      const rgba =
        new Uint8Array(
          png.data.buffer,
          png.data.byteOffset,
          png.data.byteLength
        );

      const palette =
        quantize(
          rgba,
          MAX_COLORS,
          {
            format:
              "rgb565",
          }
        );

      const indexed =
        applyPalette(
          rgba,
          palette,
          "rgb565"
        );

      gif.writeFrame(
        indexed,
        png.width,
        png.height,
        {
          palette,

          delay:
            FRAME_DELAY_MS,

          repeat:
            0,
        }
      );
    }

    gif.finish();

    const bytes =
      gif.bytes();

    if (
      bytes.byteLength <
      1000
    ) {
      throw new Error(
        "Generated GIF is unexpectedly small."
      );
    }

    return {
      bytes,

      width:
        WIDTH,

      height:
        HEIGHT,

      frameCount:
        SCROLL_PROGRESS.length,

      durationMs:
        SCROLL_PROGRESS.length *
        FRAME_DELAY_MS,
    };
  } finally {
    await browser.close();
  }
}
