"use client"

import {
  useLanguage,
} from "@/components/language-provider"

export type DashboardOutreachMessage = {
  direction:
    | string
    | null

  received_at:
    | string
    | null

  is_automatic_reply:
    | boolean
    | null

  reply_classification:
    | string
    | null
}

const DAY_LABELS_DE = [
  "MO",
  "DI",
  "MI",
  "DO",
  "FR",
  "SA",
  "SO",
]

const DAY_LABELS_EN = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
]

const WINDOWS = [
  {
    label:
      "08–11",
    start:
      8,
    end:
      11,
  },
  {
    label:
      "11–14",
    start:
      11,
    end:
      14,
  },
  {
    label:
      "14–17",
    start:
      14,
    end:
      17,
  },
  {
    label:
      "17–20",
    start:
      17,
    end:
      20,
  },
]

function toMondayIndex(
  date:
    Date
) {
  const day =
    date.getDay()

  return day ===
    0
    ? 6
    : day -
        1
}

function getWindowIndex(
  hour:
    number
) {
  return WINDOWS.findIndex(
    (
      window
    ) =>
      hour >=
        window.start &&
      hour <
        window.end
  )
}

function isHumanIncoming(
  message:
    DashboardOutreachMessage
) {
  if (
    message.direction !==
    "INCOMING"
  ) {
    return false
  }

  if (
    message.is_automatic_reply
  ) {
    return false
  }

  const classification =
    (
      message.reply_classification ??
      ""
    )
      .trim()
      .toUpperCase()

  return ![
    "AUTO_REPLY",
    "OUT_OF_OFFICE",
    "BOUNCE",
    "DELIVERY_FAILURE",
  ].includes(
    classification
  )
}

function buildMatrix(
  messages:
    DashboardOutreachMessage[]
) {
  const matrix =
    Array.from(
      {
        length:
          WINDOWS.length,
      },
      () =>
        Array.from(
          {
            length:
              7,
          },
          () =>
            0
        )
    )

  for (
    const message of
      messages
  ) {
    if (
      message.direction !==
        "OUTGOING" &&
      !isHumanIncoming(
        message
      )
    ) {
      continue
    }

    if (
      !message.received_at
    ) {
      continue
    }

    const date =
      new Date(
        message.received_at
      )

    if (
      !Number.isFinite(
        date.getTime()
      )
    ) {
      continue
    }

    const day =
      toMondayIndex(
        date
      )

    const windowIndex =
      getWindowIndex(
        date.getHours()
      )

    if (
      windowIndex <
      0
    ) {
      continue
    }

    matrix[
      windowIndex
    ][
      day
    ] += 1
  }

  return matrix
}

function getCellClass({
  count,
  max,
}: {
  count:
    number

  max:
    number
}) {
  if (
    count <=
      0 ||
    max <=
      0
  ) {
    return "bg-[#F1F3FB] dark:bg-[#171A25]"
  }

  const ratio =
    count /
    max

  if (
    ratio <=
    0.25
  ) {
    return "bg-[#D5DCF5] dark:bg-[#273456]"
  }

  if (
    ratio <=
    0.5
  ) {
    return "bg-[#9FB0EA] dark:bg-[#3A4E8B]"
  }

  if (
    ratio <=
    0.75
  ) {
    return "bg-[#4C66D4] dark:bg-[#3655BC]"
  }

  return "bg-[#002BBA] dark:bg-[#4D6FE8]"
}

export function DashboardOutreachHeatmap({
  messages,
  className = "",
}: {
  messages:
    DashboardOutreachMessage[]
  className?: string
}) {
  const {
    language,
  } =
    useLanguage()

  const de =
    language ===
    "de"

  const matrix =
    buildMatrix(
      messages
    )

  const max =
    Math.max(
      0,
      ...matrix.flat()
    )

  let bestRow =
    -1

  let bestColumn =
    -1

  let bestCount =
    0

  for (
    let row = 0;
    row <
    matrix.length;
    row += 1
  ) {
    for (
      let column = 0;
      column <
      matrix[
        row
      ].length;
      column += 1
    ) {
      const count =
        matrix[
          row
        ][
          column
        ]

      if (
        count >
        bestCount
      ) {
        bestCount =
          count

        bestRow =
          row

        bestColumn =
          column
      }
    }
  }

  const labels =
    de
      ? DAY_LABELS_DE
      : DAY_LABELS_EN

  const bestLabel =
    bestCount >
      0 &&
    bestRow >=
      0 &&
    bestColumn >=
      0
      ? `${labels[bestColumn]} ${WINDOWS[bestRow].label}`
      : de
        ? "Noch keine Daten"
        : "No data yet"

  return (
    <div className={`rounded-[16px] border border-border bg-card p-4 shadow-[var(--lb-shadow-xs)] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-[-0.01em]">
            {de
              ? "Outreach-Aktivität"
              : "Outreach activity"}
          </h2>

          <p className="mt-1 text-[10.5px] text-muted-foreground">
            {de
              ? "Kontakte & Antworten je Zeitfenster"
              : "Contacts & replies by time window"}
          </p>
        </div>

        <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.10em] text-muted-foreground">
          {de
            ? "4 Wochen"
            : "4 weeks"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[34px_repeat(7,minmax(0,1fr))] gap-[5px]">
        <div />

        {labels.map(
          (
            label
          ) => (
            <div
              key={
                label
              }
              className="pb-0.5 text-center font-mono text-[7px] uppercase tracking-[0.04em] text-muted-foreground"
            >
              {label}
            </div>
          )
        )}

        {WINDOWS.map(
          (
            window,
            rowIndex
          ) => (
            <div
              key={
                window.label
              }
              className="contents"
            >
              <div className="flex items-center font-mono text-[7px] text-muted-foreground">
                {
                  window.label
                }
              </div>

              {matrix[
                rowIndex
              ].map(
                (
                  count,
                  columnIndex
                ) => (
                  <div
                    key={
                      `${rowIndex}-${columnIndex}`
                    }
                    title={`${labels[columnIndex]} ${window.label}: ${count}`}
                    className={`h-[22px] rounded-[4px] transition-transform hover:scale-[1.04] ${getCellClass({
                      count,
                      max,
                    })}`}
                  />
                )
              )}
            </div>
          )
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <p className="min-w-0 truncate text-[9.5px] text-muted-foreground">
          {de
            ? "Beste Zeit:"
            : "Best time:"}
          {" "}
          <span className="font-medium text-foreground">
            {
              bestLabel
            }
          </span>
        </p>

        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 font-mono text-[7px] uppercase tracking-[0.06em] text-muted-foreground">
            {de
              ? "Weniger"
              : "Less"}
          </span>

          {[
            "bg-[#F1F3FB] dark:bg-[#171A25]",
            "bg-[#D5DCF5] dark:bg-[#273456]",
            "bg-[#9FB0EA] dark:bg-[#3A4E8B]",
            "bg-[#4C66D4] dark:bg-[#3655BC]",
            "bg-[#002BBA] dark:bg-[#4D6FE8]",
          ].map(
            (
              className,
              index
            ) => (
              <span
                key={
                  index
                }
                className={`size-[8px] rounded-[2px] ${className}`}
              />
            )
          )}

          <span className="ml-1 font-mono text-[7px] uppercase tracking-[0.06em] text-muted-foreground">
            {de
              ? "Mehr"
              : "More"}
          </span>
        </div>
      </div>
    </div>
  )
}
