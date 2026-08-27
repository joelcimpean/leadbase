import "server-only";

import {
  createHash,
} from "node:crypto";

/* =========================================================
   CONFIG
========================================================= */

const PEXELS_SEARCH_URL =
  "https://api.pexels.com/v1/search";

const PHOTOS_PER_QUERY =
  16;

/* =========================================================
   TYPES
========================================================= */

type PexelsPhoto = {
  id: number;

  width: number;

  height: number;

  url: string;

  photographer: string;

  photographer_url: string;

  alt: string | null;

  src: {
    original?: string;

    large2x?: string;

    large?: string;

    landscape?: string;
  };
};

type PexelsSearchResponse = {
  photos?: PexelsPhoto[];
};

export type StockImageAsset = {
  id: string;

  url: string;

  alt: string;

  kind:
    "image";

  source:
    "pexels";

  creditName: string;

  creditUrl: string;
};

export type StockImageResult = {
  assets:
    StockImageAsset[];

  assetIdsByQuery:
    string[][];
};

/* =========================================================
   HASH
========================================================= */

function hashNumber(
  value: string
) {
  const hash =
    createHash(
      "sha256"
    )
      .update(
        value
      )
      .digest();

  return hash.readUInt32BE(
    0
  );
}

/* =========================================================
   SEEDED SHUFFLE
========================================================= */

function seededShuffle<T>(
  values: T[],
  seed: string
) {
  const result =
    [
      ...values,
    ];

  let state =
    hashNumber(
      seed
    ) ||
    1;

  function random() {
    state =
      (
        state *
          1664525 +
        1013904223
      ) %
      4294967296;

    return (
      state /
      4294967296
    );
  }

  for (
    let index =
      result.length -
      1;
    index >
    0;
    index -=
    1
  ) {
    const target =
      Math.floor(
        random() *
          (
            index +
            1
          )
      );

    [
      result[index],
      result[target],
    ] = [
      result[target],
      result[index],
    ];
  }

  return result;
}

/* =========================================================
   QUERY
========================================================= */

function normalizeQuery(
  value: string
) {
  return value
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .slice(
      0,
      120
    );
}

/* =========================================================
   SEARCH
========================================================= */

async function searchPexels(
  query: string,
  apiKey: string,
  seed: string
) {
  const url =
    new URL(
      PEXELS_SEARCH_URL
    );

  url.searchParams.set(
    "query",
    query
  );

  url.searchParams.set(
    "orientation",
    "landscape"
  );

  url.searchParams.set(
    "per_page",
    String(
      PHOTOS_PER_QUERY
    )
  );

  const response =
    await fetch(
      url,
      {
        headers: {
          Authorization:
            apiKey,
        },

        /*
         * Pexels explicitly recommends caching API
         * responses. The same search can therefore be
         * reused for one day.
         */
        next: {
          revalidate:
            86400,
        },
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Pexels returned HTTP ${response.status}.`
    );
  }

  const data =
    (await response.json()) as
      PexelsSearchResponse;

  const photos =
    data.photos ??
    [];

  return seededShuffle(
    photos,
    `${query}:${seed}`
  );
}

/* =========================================================
   STOCK IMAGE SETS
========================================================= */

export async function getStockImageSets({
  queries,
  seed,
}: {
  queries:
    string[];

  seed:
    string;
}): Promise<StockImageResult> {
  const apiKey =
    process.env
      .PEXELS_API_KEY;

  if (
    !apiKey
  ) {
    throw new Error(
      "PEXELS_API_KEY is missing from the environment."
    );
  }

  const cleanQueries =
    queries
      .map(
        normalizeQuery
      )
      .filter(
        Boolean
      )
      .slice(
        0,
        3
      );

  if (
    cleanQueries.length ===
    0
  ) {
    return {
      assets:
        [],

      assetIdsByQuery:
        [],
    };
  }

  const searchResults =
    await Promise.all(
      cleanQueries.map(
        (
          query,
          index
        ) =>
          searchPexels(
            query,
            apiKey,
            `${seed}:${index}`
          )
      )
    );

  const assets:
    StockImageAsset[] =
    [];

  const assetIdsByQuery:
    string[][] =
    [];

  const usedPexelsIds =
    new Set<number>();

  for (
    let queryIndex =
      0;
    queryIndex <
    searchResults.length;
    queryIndex +=
      1
  ) {
    const photos =
      searchResults[
        queryIndex
      ];

    const ids:
      string[] = [];

    for (
      const photo of
        photos
    ) {
      if (
        usedPexelsIds.has(
          photo.id
        )
      ) {
        continue;
      }

      const imageUrl =
        photo.src.large2x ??
        photo.src.large ??
        photo.src.landscape ??
        photo.src.original;

      if (
        !imageUrl
      ) {
        continue;
      }

      usedPexelsIds.add(
        photo.id
      );

      const id =
        `stock-${queryIndex + 1}-${photo.id}`;

      ids.push(
        id
      );

      assets.push({
        id,

        url:
          imageUrl,

        alt:
          photo.alt ??
          cleanQueries[
            queryIndex
          ],

        kind:
          "image",

        source:
          "pexels",

        creditName:
          photo.photographer,

        creditUrl:
          photo.url,
      });

      /*
       * Ten alternatives per query are more than enough
       * for one homepage and prevent repeated imagery.
       */
      if (
        ids.length >=
        10
      ) {
        break;
      }
    }

    assetIdsByQuery.push(
      ids
    );
  }

  return {
    assets,

    assetIdsByQuery,
  };
}