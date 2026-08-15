"use client";

import {
  CalendarClock,
  ChevronDown,
  Clock3,
  File,
  Loader2,
  MessageSquareReply,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

/* =========================================================
   CONFIG
========================================================= */

const MAX_ATTACHMENTS =
  8;

const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const MAX_TOTAL_SIZE =
  12 * 1024 * 1024;

const SCHEDULE_TIME_ZONE =
  "Europe/Berlin";

/* =========================================================
   TYPES
========================================================= */

type ReplyComposerProps = {
  leadId: string;

  replyToMessageId: string;

  recipientName: string;

  recipientEmail: string;
};

type ReplyApiResponse = {
  ok?: boolean;
  error?: string;

  messageId?: string;
  threadId?: string;
};

type GenerateReplyResponse = {
  ok?: boolean;
  error?: string;

  body?: string;
};

type ScheduleReplyResponse = {
  ok?: boolean;
  error?: string;

  id?: string;
  scheduledFor?: string;
};

type AttachmentPayload = {
  filename: string;
  contentType: string;
  size: number;
  base64: string;
};

/* =========================================================
   FILE HELPERS
========================================================= */

function formatFileSize(
  bytes: number
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(
    1
  )} MB`;
}

function fileToBase64(
  file: File
): Promise<string> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.onload =
        () => {
          if (
            typeof reader.result !==
            "string"
          ) {
            reject(
              new Error(
                `Could not read ${file.name}.`
              )
            );

            return;
          }

          const commaIndex =
            reader.result.indexOf(
              ","
            );

          if (
            commaIndex ===
            -1
          ) {
            reject(
              new Error(
                `Could not encode ${file.name}.`
              )
            );

            return;
          }

          resolve(
            reader.result.slice(
              commaIndex + 1
            )
          );
        };

      reader.onerror =
        () => {
          reject(
            new Error(
              `Could not read ${file.name}.`
            )
          );
        };

      reader.readAsDataURL(
        file
      );
    }
  );
}

/* =========================================================
   API
========================================================= */

async function parseJsonResponse<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get(
      "content-type"
    ) ?? "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    return await response.json();
  }

  const text =
    await response.text();

  console.warn(
    "API returned non-JSON:",
    {
      status:
        response.status,

      response:
        text.slice(
          0,
          1000
        ),
    }
  );

  throw new Error(
    `The server could not process the request (${response.status}).`
  );
}

/* =========================================================
   TIMEZONE HELPERS
========================================================= */

function getZonedParts(
  date: Date,
  timeZone: string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23",
      }
    ).formatToParts(
      date
    );

  const values:
    Record<
      string,
      string
    > = {};

  for (
    const part of
      parts
  ) {
    if (
      part.type !==
      "literal"
    ) {
      values[
        part.type
      ] =
        part.value;
    }
  }

  return {
    year:
      Number(
        values.year
      ),

    month:
      Number(
        values.month
      ),

    day:
      Number(
        values.day
      ),

    hour:
      Number(
        values.hour
      ),

    minute:
      Number(
        values.minute
      ),

    second:
      Number(
        values.second
      ),
  };
}

function getTimeZoneOffsetMs(
  date: Date,
  timeZone: string
) {
  const parts =
    getZonedParts(
      date,
      timeZone
    );

  const representedAsUtc =
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );

  return (
    representedAsUtc -
    date.getTime()
  );
}

function localDateTimeToIso(
  value: string,
  timeZone:
    string
) {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
    );

  if (
    !match
  ) {
    return null;
  }

  const year =
    Number(
      match[1]
    );

  const month =
    Number(
      match[2]
    );

  const day =
    Number(
      match[3]
    );

  const hour =
    Number(
      match[4]
    );

  const minute =
    Number(
      match[5]
    );

  const utcGuess =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        0
      )
    );

  let offset =
    getTimeZoneOffsetMs(
      utcGuess,
      timeZone
    );

  let result =
    new Date(
      utcGuess.getTime() -
      offset
    );

  /*
   * Recalculate once because DST can make the first
   * offset guess land on a different offset.
   */
  offset =
    getTimeZoneOffsetMs(
      result,
      timeZone
    );

  result =
    new Date(
      utcGuess.getTime() -
      offset
    );

  return result
    .toISOString();
}

function pad2(
  value: number
) {
  return String(
    value
  ).padStart(
    2,
    "0"
  );
}

function getTomorrowMorningLocalValue() {
  const nowParts =
    getZonedParts(
      new Date(),
      SCHEDULE_TIME_ZONE
    );

  const date =
    new Date(
      Date.UTC(
        nowParts.year,
        nowParts.month - 1,
        nowParts.day
      )
    );

  date.setUTCDate(
    date.getUTCDate() +
    1
  );

  return [
    date.getUTCFullYear(),
    "-",
    pad2(
      date.getUTCMonth() +
      1
    ),
    "-",
    pad2(
      date.getUTCDate()
    ),
    "T09:00",
  ].join("");
}

function getTomorrowMorningIso() {
  return localDateTimeToIso(
    getTomorrowMorningLocalValue(),
    SCHEDULE_TIME_ZONE
  );
}

function getLaterTodayDate() {
  const now =
    new Date();

  const target =
    new Date(
      now.getTime() +
      2 *
        60 *
        60 *
        1000
    );

  const nowParts =
    getZonedParts(
      now,
      SCHEDULE_TIME_ZONE
    );

  const targetParts =
    getZonedParts(
      target,
      SCHEDULE_TIME_ZONE
    );

  const sameDay =
    nowParts.year ===
      targetParts.year &&
    nowParts.month ===
      targetParts.month &&
    nowParts.day ===
      targetParts.day;

  if (
    !sameDay
  ) {
    return null;
  }

  return target;
}

function formatScheduledDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "de-DE",
    {
      timeZone:
        SCHEDULE_TIME_ZONE,

      weekday:
        "short",

      day:
        "2-digit",

      month:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatTimeOnly(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "de-DE",
    {
      timeZone:
        SCHEDULE_TIME_ZONE,

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export function ReplyComposer({
  leadId,
  replyToMessageId,
  recipientName,
  recipientEmail,
}: ReplyComposerProps) {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    body,
    setBody,
  ] =
    useState("");

  const [
    cc,
    setCc,
  ] =
    useState("");

  const [
    bcc,
    setBcc,
  ] =
    useState("");

  const [
    showCc,
    setShowCc,
  ] =
    useState(false);

  const [
    showBcc,
    setShowBcc,
  ] =
    useState(false);

  const [
    files,
    setFiles,
  ] =
    useState<File[]>(
      []
    );

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    generating,
    setGenerating,
  ] =
    useState(false);

  const [
    scheduling,
    setScheduling,
  ] =
    useState(false);

  const [
    scheduleMenuOpen,
    setScheduleMenuOpen,
  ] =
    useState(false);

  const [
    customScheduleOpen,
    setCustomScheduleOpen,
  ] =
    useState(false);

  const [
    customDateTime,
    setCustomDateTime,
  ] =
    useState(
      getTomorrowMorningLocalValue
    );

  const [
    scheduledFor,
    setScheduledFor,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    sent,
    setSent,
  ] =
    useState(false);

  const busy =
    sending ||
    generating ||
    scheduling;

  const laterToday =
    useMemo(
      () =>
        getLaterTodayDate(),
      []
    );

  /* =======================================================
     FILES
  ======================================================= */

  function handleFiles(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      Array.from(
        event.target.files ??
        []
      );

    event.target.value =
      "";

    if (
      selected.length ===
      0
    ) {
      return;
    }

    setError(
      null
    );

    const combined = [
      ...files,
      ...selected,
    ];

    const next =
      combined.filter(
        (
          file,
          index,
          all
        ) =>
          all.findIndex(
            (
              candidate
            ) =>
              candidate.name ===
                file.name &&
              candidate.size ===
                file.size &&
              candidate.lastModified ===
                file.lastModified
          ) === index
      );

    if (
      next.length >
      MAX_ATTACHMENTS
    ) {
      setError(
        `You can attach up to ${MAX_ATTACHMENTS} files.`
      );

      return;
    }

    const tooLarge =
      next.find(
        (
          file
        ) =>
          file.size >
          MAX_FILE_SIZE
      );

    if (
      tooLarge
    ) {
      setError(
        `${tooLarge.name} is larger than 8 MB.`
      );

      return;
    }

    const totalSize =
      next.reduce(
        (
          total,
          file
        ) =>
          total +
          file.size,
        0
      );

    if (
      totalSize >
      MAX_TOTAL_SIZE
    ) {
      setError(
        "Attachments may be up to 12 MB in total."
      );

      return;
    }

    setFiles(
      next
    );
  }

  function removeFile(
    index: number
  ) {
    setFiles(
      (
        current
      ) =>
        current.filter(
          (
            _,
            currentIndex
          ) =>
            currentIndex !==
            index
        )
    );

    setError(
      null
    );
  }

  /* =======================================================
     ATTACHMENT PAYLOAD
  ======================================================= */

  async function createAttachmentPayload() {
    return await Promise.all(
      files.map(
        async (
          file
        ): Promise<AttachmentPayload> => ({
          filename:
            file.name,

          contentType:
            file.type ||
            "application/octet-stream",

          size:
            file.size,

          base64:
            await fileToBase64(
              file
            ),
        })
      )
    );
  }

  /* =======================================================
     GENERATE
  ======================================================= */

  async function handleGenerateReply() {
    if (
      busy
    ) {
      return;
    }

    if (
      body.trim()
    ) {
      const replace =
        window.confirm(
          "Replace your current reply with an AI-generated draft?"
        );

      if (
        !replace
      ) {
        return;
      }
    }

    setGenerating(
      true
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/inbox/generate-reply",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                leadId,
                replyToMessageId,
              }),
          }
        );

      const result =
        await parseJsonResponse<GenerateReplyResponse>(
          response
        );

      if (
        !response.ok ||
        !result.ok ||
        !result.body
      ) {
        throw new Error(
          result.error ||
          "Reply generation failed."
        );
      }

      setBody(
        result.body
      );
    } catch (
      generationError
    ) {
      setError(
        generationError instanceof
          Error
          ? generationError.message
          : "Reply generation failed."
      );
    } finally {
      setGenerating(
        false
      );
    }
  }

  /* =======================================================
     RESET
  ======================================================= */

  function resetComposer() {
    setBody("");
    setCc("");
    setBcc("");

    setShowCc(false);
    setShowBcc(false);

    setFiles([]);

    setScheduleMenuOpen(
      false
    );

    setCustomScheduleOpen(
      false
    );

    setError(
      null
    );
  }

  /* =======================================================
     VALIDATE BEFORE SEND / SCHEDULE
  ======================================================= */

  function validateComposer() {
    if (
      !body.trim()
    ) {
      setError(
        "Write a message first."
      );

      return false;
    }

    const totalSize =
      files.reduce(
        (
          total,
          file
        ) =>
          total +
          file.size,
        0
      );

    if (
      totalSize >
      MAX_TOTAL_SIZE
    ) {
      setError(
        "Attachments may be up to 12 MB in total."
      );

      return false;
    }

    return true;
  }

  /* =======================================================
     SEND NOW
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      busy ||
      !validateComposer()
    ) {
      return;
    }

    setSending(
      true
    );

    setError(
      null
    );

    setSent(
      false
    );

    try {
      const attachments =
        await createAttachmentPayload();

      const response =
        await fetch(
          "/api/inbox/reply",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                leadId,
                replyToMessageId,

                body:
                  body.trim(),

                cc,
                bcc,

                attachments,
              }),
          }
        );

      const result =
        await parseJsonResponse<ReplyApiResponse>(
          response
        );

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ||
          "Reply could not be sent."
        );
      }

      resetComposer();

      setOpen(
        false
      );

      setSent(
        true
      );

      router.refresh();

      window.setTimeout(
        () =>
          setSent(
            false
          ),
        3500
      );
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Reply could not be sent."
      );
    } finally {
      setSending(
        false
      );
    }
  }

  /* =======================================================
     SCHEDULE
  ======================================================= */

  async function scheduleReply(
    isoDate: string
  ) {
    if (
      busy ||
      !validateComposer()
    ) {
      return;
    }

    setScheduling(
      true
    );

    setError(
      null
    );

    try {
      const attachments =
        await createAttachmentPayload();

      const response =
        await fetch(
          "/api/inbox/schedule-reply",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                leadId,
                replyToMessageId,

                body:
                  body.trim(),

                cc,
                bcc,

                attachments,

                scheduledFor:
                  isoDate,
              }),
          }
        );

      const result =
        await parseJsonResponse<ScheduleReplyResponse>(
          response
        );

      if (
        !response.ok ||
        !result.ok ||
        !result.scheduledFor
      ) {
        throw new Error(
          result.error ||
          "Reply could not be scheduled."
        );
      }

      const successfulTime =
        result.scheduledFor;

      resetComposer();

      setOpen(
        false
      );

      setScheduledFor(
        successfulTime
      );

      router.refresh();
    } catch (
      scheduleError
    ) {
      setError(
        scheduleError instanceof
          Error
          ? scheduleError.message
          : "Reply could not be scheduled."
      );
    } finally {
      setScheduling(
        false
      );
    }
  }

  /* =======================================================
     CUSTOM SCHEDULE
  ======================================================= */

  function handleCustomSchedule() {
    const iso =
      localDateTimeToIso(
        customDateTime,
        SCHEDULE_TIME_ZONE
      );

    if (
      !iso
    ) {
      setError(
        "Choose a valid date and time."
      );

      return;
    }

    void scheduleReply(
      iso
    );
  }

  /* =======================================================
     CLOSED
  ======================================================= */

  if (
    !open
  ) {
    return (
      <div className="mt-8 rounded-xl border bg-muted/20 p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
            {scheduledFor ? (
              <Clock3 className="size-4" />
            ) : (
              <MessageSquareReply className="size-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">
              {scheduledFor
                ? "Reply scheduled"
                : "Reply"}
            </h3>

            {scheduledFor ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Scheduled for{" "}
                <span className="font-medium text-foreground">
                  {formatScheduledDate(
                    scheduledFor
                  )}
                </span>
                .
              </p>
            ) : sent ? (
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                Reply sent successfully.
              </p>
            ) : (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Reply directly to{" "}
                <span className="font-medium text-foreground">
                  {recipientName}
                </span>
                .
              </p>
            )}

            {!scheduledFor ? (
              <button
                type="button"
                onClick={
                  () => {
                    setOpen(
                      true
                    );

                    setSent(
                      false
                    );

                    setError(
                      null
                    );
                  }
                }
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                <MessageSquareReply className="size-4" />

                Write reply
              </button>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Edit and cancel controls come in the next step.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     OPEN COMPOSER
  ======================================================= */

  return (
    <div className="mt-8 overflow-visible rounded-xl border bg-background shadow-sm">
      {/* HEADER */}

      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/20">
            <MessageSquareReply className="size-4" />
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              Reply
            </h3>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Replying in the latest Gmail thread
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={
            busy
          }
          onClick={
            () =>
              setOpen(
                false
              )
          }
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* RECIPIENT */}

      <div className="border-b bg-muted/10">
        <div className="flex min-h-12 items-center gap-3 px-5 text-sm">
          <span className="w-8 shrink-0 text-xs text-muted-foreground">
            To
          </span>

          <div className="min-w-0 flex flex-1 items-center gap-2">
            <span className="truncate font-medium">
              {recipientName}
            </span>

            <span className="truncate text-xs text-muted-foreground">
              &lt;{recipientEmail}&gt;
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {!showCc ? (
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  () =>
                    setShowCc(
                      true
                    )
                }
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cc
              </button>
            ) : null}

            {!showBcc ? (
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  () =>
                    setShowBcc(
                      true
                    )
                }
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Bcc
              </button>
            ) : null}
          </div>
        </div>

        {showCc ? (
          <div className="flex min-h-11 items-center gap-3 border-t px-5">
            <span className="w-8 text-xs text-muted-foreground">
              Cc
            </span>

            <input
              value={
                cc
              }
              disabled={
                busy
              }
              onChange={
                (
                  event
                ) =>
                  setCc(
                    event.target.value
                  )
              }
              placeholder="name@example.com"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                () => {
                  setCc("");
                  setShowCc(false);
                }
              }
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        {showBcc ? (
          <div className="flex min-h-11 items-center gap-3 border-t px-5">
            <span className="w-8 text-xs text-muted-foreground">
              Bcc
            </span>

            <input
              value={
                bcc
              }
              disabled={
                busy
              }
              onChange={
                (
                  event
                ) =>
                  setBcc(
                    event.target.value
                  )
              }
              placeholder="hidden@example.com"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                () => {
                  setBcc("");
                  setShowBcc(false);
                }
              }
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* FORM */}

      <form
        onSubmit={
          handleSubmit
        }
      >
        <div className="px-5 py-5">
          <textarea
            value={
              body
            }
            autoFocus
            disabled={
              busy
            }
            onChange={
              (
                event
              ) =>
                setBody(
                  event.target.value
                )
            }
            placeholder={
              generating
                ? "Generating reply..."
                : "Write your reply..."
            }
            rows={
              8
            }
            className="min-h-[180px] w-full resize-y bg-transparent p-0 text-sm leading-7 outline-none disabled:opacity-60"
          />

          {/* ATTACHMENTS */}

          {files.length >
          0 ? (
            <div className="mt-5 border-t pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium">
                  Attachments
                </p>

                <p className="text-[11px] text-muted-foreground">
                  {formatFileSize(
                    files.reduce(
                      (
                        total,
                        file
                      ) =>
                        total +
                        file.size,
                      0
                    )
                  )}{" "}
                  total
                </p>
              </div>

              <div className="space-y-2">
                {files.map(
                  (
                    file,
                    index
                  ) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
                    >
                      <File className="size-4 shrink-0" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {file.name}
                        </p>

                        <p className="text-[11px] text-muted-foreground">
                          {formatFileSize(
                            file.size
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={
                          () =>
                            removeFile(
                              index
                            )
                        }
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : null}

          {/* CUSTOM SCHEDULE */}

          {customScheduleOpen ? (
            <div className="mt-5 rounded-xl border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <CalendarClock className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    Schedule reply
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Time zone: Europe/Berlin
                  </p>

                  <input
                    type="datetime-local"
                    value={
                      customDateTime
                    }
                    disabled={
                      busy
                    }
                    onChange={
                      (
                        event
                      ) =>
                        setCustomDateTime(
                          event.target.value
                        )
                    }
                    className="mt-4 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  />

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={
                        () =>
                          setCustomScheduleOpen(
                            false
                          )
                      }
                      className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={
                        handleCustomSchedule
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-3 text-sm font-medium text-background disabled:opacity-50"
                    >
                      {scheduling ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Clock3 className="size-4" />
                      )}

                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ERROR */}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {/* SIGNATURE */}

          <div className="mt-6 border-t pt-5 text-sm leading-6">
            <p className="text-muted-foreground">
              Mit freundlichen Grüßen / Kind regards,
            </p>

            <div className="mt-4">
              <p className="font-medium">
                Joel Cimpean
              </p>

              <p className="text-muted-foreground">
                hello@joelcimpean.com / joelcimpean.com
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 px-5 py-3">
          {/* LEFT */}

          <div className="flex items-center gap-2">
            <input
              ref={
                fileInputRef
              }
              type="file"
              multiple
              disabled={
                busy
              }
              onChange={
                handleFiles
              }
              className="hidden"
            />

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                () =>
                  fileInputRef
                    .current
                    ?.click()
              }
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              title="Attach files"
            >
              <Paperclip className="size-4" />
            </button>

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                handleGenerateReply
              }
              className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate reply
                </>
              )}
            </button>
          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                () =>
                  setOpen(
                    false
                  )
              }
              className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>

            {/* SEND SPLIT BUTTON */}

            <div className="relative flex">
              <button
                type="submit"
                disabled={
                  busy ||
                  !body.trim()
                }
                className="inline-flex h-9 items-center gap-2 rounded-l-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Send reply
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={
                  busy ||
                  !body.trim()
                }
                onClick={
                  () =>
                    setScheduleMenuOpen(
                      (
                        current
                      ) =>
                        !current
                    )
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-r-md border-l border-background/20 bg-foreground text-background hover:opacity-90 disabled:opacity-50"
                aria-label="Schedule send"
              >
                <ChevronDown className="size-4" />
              </button>

              {scheduleMenuOpen ? (
                <div className="absolute bottom-11 right-0 z-50 w-64 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
                  <div className="px-2 py-2">
                    <p className="text-xs font-semibold">
                      Send later
                    </p>

                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Europe/Berlin
                    </p>
                  </div>

                  {laterToday ? (
                    <button
                      type="button"
                      onClick={
                        () => {
                          setScheduleMenuOpen(
                            false
                          );

                          void scheduleReply(
                            laterToday.toISOString()
                          );
                        }
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-muted"
                    >
                      <Clock3 className="size-4 text-muted-foreground" />

                      <div>
                        <p className="text-sm font-medium">
                          Later today
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {formatTimeOnly(
                            laterToday
                          )}
                        </p>
                      </div>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={
                      () => {
                        const iso =
                          getTomorrowMorningIso();

                        if (
                          !iso
                        ) {
                          setError(
                            "Could not calculate tomorrow morning."
                          );

                          return;
                        }

                        setScheduleMenuOpen(
                          false
                        );

                        void scheduleReply(
                          iso
                        );
                      }
                    }
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-muted"
                  >
                    <CalendarClock className="size-4 text-muted-foreground" />

                    <div>
                      <p className="text-sm font-medium">
                        Tomorrow morning
                      </p>

                      <p className="text-xs text-muted-foreground">
                        09:00
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={
                      () => {
                        setScheduleMenuOpen(
                          false
                        );

                        setCustomScheduleOpen(
                          true
                        );
                      }
                    }
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-muted"
                  >
                    <CalendarClock className="size-4 text-muted-foreground" />

                    <div>
                      <p className="text-sm font-medium">
                        Custom date & time
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Choose exactly when to send
                      </p>
                    </div>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}