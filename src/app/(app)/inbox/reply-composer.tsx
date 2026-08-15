"use client";

import {
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

type AttachmentPayload = {
  filename: string;

  contentType: string;

  size: number;

  base64: string;
};

/* =========================================================
   HELPERS
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
     GENERATE REPLY
  ======================================================= */

  async function handleGenerateReply() {
    if (
      generating ||
      sending
    ) {
      return;
    }

    if (
      body.trim()
    ) {
      const shouldReplace =
        window.confirm(
          "Replace your current reply with an AI-generated draft?"
        );

      if (
        !shouldReplace
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
      console.warn(
        "Reply generation failed:",
        generationError
      );

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
    setBody(
      ""
    );

    setCc(
      ""
    );

    setBcc(
      ""
    );

    setShowCc(
      false
    );

    setShowBcc(
      false
    );

    setFiles(
      []
    );

    setError(
      null
    );
  }

  /* =======================================================
     SEND
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      sending ||
      generating
    ) {
      return;
    }

    const trimmedBody =
      body.trim();

    if (
      !trimmedBody
    ) {
      setError(
        "Write a message before sending."
      );

      return;
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
      const attachments:
        AttachmentPayload[] =
        await Promise.all(
          files.map(
            async (
              file
            ) => ({
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
                  trimmedBody,

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
        () => {
          setSent(
            false
          );
        },
        3500
      );
    } catch (
      submitError
    ) {
      console.warn(
        "Reply send failed:",
        submitError
      );

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
     CLOSED
  ======================================================= */

  if (
    !open
  ) {
    return (
      <div className="mt-8 rounded-xl border bg-muted/20 p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
            <MessageSquareReply className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">
              Reply
            </h3>

            {sent ? (
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
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     OPEN
  ======================================================= */

  return (
    <div className="mt-8 overflow-hidden rounded-xl border bg-background shadow-sm">
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
          onClick={
            () =>
              setOpen(
                false
              )
          }
          disabled={
            sending ||
            generating
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
                onClick={
                  () =>
                    setShowCc(
                      true
                    )
                }
                disabled={
                  sending ||
                  generating
                }
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cc
              </button>
            ) : null}

            {!showBcc ? (
              <button
                type="button"
                onClick={
                  () =>
                    setShowBcc(
                      true
                    )
                }
                disabled={
                  sending ||
                  generating
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
              onClick={
                () => {
                  setCc(
                    ""
                  );

                  setShowCc(
                    false
                  );
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
              onClick={
                () => {
                  setBcc(
                    ""
                  );

                  setShowBcc(
                    false
                  );
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
            onChange={
              (
                event
              ) =>
                setBody(
                  event.target.value
                )
            }
            autoFocus
            disabled={
              sending ||
              generating
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

          {/* FILES */}

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
                      <File className="size-4" />

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
          <div className="flex items-center gap-2">
            <input
              ref={
                fileInputRef
              }
              type="file"
              multiple
              onChange={
                handleFiles
              }
              className="hidden"
            />

            <button
              type="button"
              onClick={
                () =>
                  fileInputRef.current
                    ?.click()
              }
              disabled={
                sending ||
                generating
              }
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              title="Attach files"
            >
              <Paperclip className="size-4" />
            </button>

            <button
              type="button"
              onClick={
                handleGenerateReply
              }
              disabled={
                sending ||
                generating
              }
              className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={
                () =>
                  setOpen(
                    false
                  )
              }
              disabled={
                sending ||
                generating
              }
              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                sending ||
                generating ||
                !body.trim()
              }
              className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
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
          </div>
        </div>
      </form>
    </div>
  );
}