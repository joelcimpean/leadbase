/* eslint-disable @next/next/no-img-element */

import {
    Archive,
    ArrowLeft,
    ArrowUpRight,
    Download,
    FileText,
    Inbox,
    Mail,
    MailCheck,
    MailOpen,
    Paperclip,
    RotateCcw,
    Trash2,
    XCircle,
  } from "lucide-react";
  
  import Link from "next/link";
  
  import {
    redirect,
  } from "next/navigation";
  
  import {
    archiveLeadConversation,
    markLeadConversationReadFromForm,
    markLeadConversationUnreadFromForm,
    moveLeadConversationToTrash,
    permanentlyDeleteLeadConversation,
    restoreLeadConversation,
  } from "./actions";
  
  import type {
    Conversation,
    InboxView,
    TimelineAttachment,
    TimelineMessage,
  } from "./inbox-data";
  
  import {
    ReplyComposer,
  } from "./reply-composer";
  
  import {
    Badge,
  } from "@/components/ui/badge";
  
  import {
    Separator,
  } from "@/components/ui/separator";
  
  /* =========================================================
     SUBJECT
  ========================================================= */
  
  function normalizeSubject(
    value:
      | string
      | null
      | undefined
  ) {
    return (
      value ??
      ""
    )
      .replace(
        /^(?:(?:re|aw|fw|fwd)\s*:\s*)+/i,
        ""
      )
      .trim()
      .toLowerCase();
  }
  
  /* =========================================================
     DATE
  ========================================================= */
  
  function formatFullDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "de-DE",
      {
        timeZone:
          "Europe/Berlin",
  
        day:
          "2-digit",
  
        month:
          "short",
  
        year:
          "numeric",
  
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
  
  /* =========================================================
     FILE SIZE
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
      1024 *
        1024
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
  
  /* =========================================================
     STATUS
  ========================================================= */
  
  function messageStatusClass(
    status: string
  ) {
    if (
      status ===
      "Replied"
    ) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    }
  
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
  }
  
  /* =========================================================
     THREAD
  ========================================================= */
  
  export function InboxThread({
    selected,
    currentView,
    inboxListHref,
    openLeadHref,
    gmailSendReady,
  }: {
    selected:
      Conversation;
  
    currentView:
      InboxView;
  
    inboxListHref:
      string;
  
    openLeadHref:
      string;
  
    gmailSendReady:
      boolean;
  }) {
    /* =======================================================
       ARCHIVE + GO HOME
  
       Important:
       After archiving from an open thread,
       we intentionally return to /inbox instead
       of automatically opening the next thread.
    ======================================================= */
  
    async function archiveAndReturnToInbox() {
      "use server";
  
      await archiveLeadConversation(
        selected.leadId
      );
  
      redirect(
        "/inbox"
      );
    }
  
    return (
      <div className="mx-auto w-full max-w-4xl px-4 pb-5 sm:px-6 sm:pb-6 md:px-8 md:py-8 lg:px-12 lg:py-10">
        {/* ===================================================
            STICKY THREAD HEADER
        =================================================== */}
  
        <div className="sticky top-0 z-30 -mx-4 mb-6 border-b bg-background/95 px-4 pb-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:mb-0 md:border-b-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          {/* =================================================
              MOBILE BACK
          ================================================= */}
  
          <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
            <Link
              href={
                inboxListHref
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-5" />
  
              Inbox
            </Link>
  
            <span className="text-xs text-muted-foreground">
              {
                selected.timeline
                  .length
              }{" "}
              {selected.timeline
                .length ===
              1
                ? "message"
                : "messages"}
            </span>
          </div>
  
          {/* =================================================
              SUBJECT
          ================================================= */}
  
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="min-w-0">
              <Badge
                variant="outline"
                className={
                  messageStatusClass(
                    selected.status
                  )
                }
              >
                {selected.status ===
                "Replied"
                  ? "Reply received"
                  : "Email sent"}
              </Badge>
  
              <h2 className="mt-4 break-words text-xl font-semibold">
                {
                  selected.subject
                }
              </h2>
  
              <p className="mt-2 break-words text-sm text-muted-foreground">
                {selected.contact} ·{" "}
                {selected.company}
              </p>
            </div>
  
            {/* =================================================
                ACTIONS
            ================================================= */}
  
            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
              {/* READ / UNREAD */}
  
              {currentView !==
              "trash" ? (
                selected.unread ? (
                  <form
                    action={
                      markLeadConversationReadFromForm.bind(
                        null,
                        selected.leadId
                      )
                    }
                  >
                    <button
                      type="submit"
                      title="Mark as read"
                      className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                    >
                      <MailOpen className="size-4" />
  
                      <span className="hidden sm:inline">
                        Read
                      </span>
                    </button>
                  </form>
                ) : selected.replyToMessageId ? (
                  <form
                    action={
                      markLeadConversationUnreadFromForm.bind(
                        null,
                        selected.leadId
                      )
                    }
                  >
                    <button
                      type="submit"
                      title="Mark as unread"
                      className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                    >
                      <Mail className="size-4" />
  
                      <span className="hidden sm:inline">
                        Unread
                      </span>
                    </button>
                  </form>
                ) : null
              ) : null}
  
              {/* ARCHIVE */}
  
              {currentView ===
              "inbox" ? (
                <form
                  action={
                    archiveAndReturnToInbox
                  }
                >
                  <button
                    type="submit"
                    title="Archive"
                    className="inline-flex size-9 items-center justify-center rounded-md border bg-background hover:bg-muted"
                  >
                    <Archive className="size-4" />
                  </button>
                </form>
              ) : null}
  
              {/* RESTORE */}
  
              {currentView ===
              "archived" ? (
                <form
                  action={
                    restoreLeadConversation.bind(
                      null,
                      selected.leadId
                    )
                  }
                >
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                  >
                    <RotateCcw className="size-4" />
  
                    <span className="hidden sm:inline">
                      Restore
                    </span>
                  </button>
                </form>
              ) : null}
  
              {/* TRASH */}
  
              {currentView !==
              "trash" ? (
                <form
                  action={
                    moveLeadConversationToTrash.bind(
                      null,
                      selected.leadId
                    )
                  }
                >
                  <button
                    type="submit"
                    title="Move to trash"
                    className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              ) : (
                <>
                  {/* RESTORE FROM TRASH */}
  
                  <form
                    action={
                      restoreLeadConversation.bind(
                        null,
                        selected.leadId
                      )
                    }
                  >
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                    >
                      <RotateCcw className="size-4" />
  
                      <span className="hidden sm:inline">
                        Restore
                      </span>
                    </button>
                  </form>
  
                  {/* DELETE FOREVER */}
  
                  <form
                    action={
                      permanentlyDeleteLeadConversation.bind(
                        null,
                        selected.leadId
                      )
                    }
                  >
                    <button
                      type="submit"
                      title="Delete permanently"
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-background px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40"
                    >
                      <XCircle className="size-4" />
  
                      <span className="hidden sm:inline">
                        Delete permanently
                      </span>
                    </button>
                  </form>
                </>
              )}
  
              {/* =================================================
                  OPEN LEAD
  
                  This URL contains returnTo=/inbox?... so the
                  lead page can navigate back to this exact thread.
              ================================================= */}
  
              <Link
                href={
                  openLeadHref
                }
                className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
              >
                <span className="hidden sm:inline">
                  Open lead
                </span>
  
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
  
        <Separator className="hidden md:my-8 md:block" />
  
        {/* ===================================================
            MESSAGES
        =================================================== */}
  
        <div className="space-y-4 md:space-y-6">
          {selected.timeline.map(
            (
              message
            ) => (
              <MessageCard
                key={
                  message.id
                }
                message={
                  message
                }
                conversationSubject={
                  selected.subject
                }
              />
            )
          )}
        </div>
  
        {/* ===================================================
            REPLY
        =================================================== */}
  
        {currentView !==
          "trash" &&
        selected.replyToMessageId &&
        selected.replyRecipientEmail &&
        gmailSendReady ? (
          <ReplyComposer
            leadId={
              selected.leadId
            }
            replyToMessageId={
              selected.replyToMessageId
            }
            recipientName={
              selected.replyRecipientName ??
              selected.replyRecipientEmail
            }
            recipientEmail={
              selected.replyRecipientEmail
            }
          />
        ) : null}
      </div>
    );
  }
  
  /* =========================================================
     MESSAGE
  ========================================================= */
  
  function MessageCard({
    message,
    conversationSubject,
  }: {
    message:
      TimelineMessage;
  
    conversationSubject:
      string;
  }) {
    const outgoing =
      message.direction ===
      "outgoing";
  
    const differentSubject =
      Boolean(
        message.subject &&
        normalizeSubject(
          message.subject
        ) !==
          normalizeSubject(
            conversationSubject
          )
      );
  
    return (
      <article className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              {outgoing ? (
                <MailCheck className="size-4" />
              ) : (
                <Inbox className="size-4" />
              )}
            </div>
  
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {
                  message.sender
                }
              </p>
  
              <p className="truncate text-xs text-muted-foreground">
                {
                  message.email
                }
              </p>
            </div>
          </div>
  
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatFullDate(
              message.date
            )}
          </span>
        </div>
  
        {differentSubject ? (
          <div className="border-b bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
            Subject:{" "}
  
            <span className="font-medium text-foreground">
              {
                message.subject
              }
            </span>
          </div>
        ) : null}
  
        <div className="break-words whitespace-pre-wrap px-4 py-4 text-sm leading-7 sm:px-5 sm:py-5">
          {
            message.body
          }
        </div>
  
        {message.attachments.length >
        0 ? (
          <div className="border-t px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium">
              <Paperclip className="size-3.5" />
  
              Attachments
            </div>
  
            <div className="grid gap-3 sm:grid-cols-2">
              {message.attachments.map(
                (
                  attachment
                ) => (
                  <AttachmentCard
                    key={`${message.id}-${attachment.name}`}
                    attachment={
                      attachment
                    }
                  />
                )
              )}
            </div>
          </div>
        ) : null}
      </article>
    );
  }
  
  /* =========================================================
     ATTACHMENT
  ========================================================= */
  
  function AttachmentCard({
    attachment,
  }: {
    attachment:
      TimelineAttachment;
  }) {
    const isImage =
      attachment.type.startsWith(
        "image/"
      );
  
    const baseUrl =
      attachment.gmailMessageId
        ? `/api/inbox/attachment?messageId=${encodeURIComponent(
            attachment.gmailMessageId
          )}&filename=${encodeURIComponent(
            attachment.name
          )}`
        : null;
  
    if (
      isImage &&
      baseUrl
    ) {
      return (
        <div className="overflow-hidden rounded-lg border">
          <a
            href={
              baseUrl
            }
            target="_blank"
            rel="noreferrer"
            className="block bg-muted/20"
          >
            <img
              src={
                baseUrl
              }
              alt={
                attachment.name
              }
              className="max-h-72 w-full object-contain"
            />
          </a>
  
          <div className="flex items-center gap-3 border-t px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {
                  attachment.name
                }
              </p>
  
              <p className="text-[11px] text-muted-foreground">
                {formatFileSize(
                  attachment.size
                )}
              </p>
            </div>
  
            <a
              href={`${baseUrl}&download=1`}
              className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
              title="Download attachment"
            >
              <Download className="size-3.5" />
            </a>
          </div>
        </div>
      );
    }
  
    return (
      <div className="flex items-center gap-3 rounded-lg border px-3 py-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted">
          <FileText className="size-4" />
        </div>
  
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">
            {
              attachment.name
            }
          </p>
  
          <p className="text-[11px] text-muted-foreground">
            {formatFileSize(
              attachment.size
            )}
          </p>
        </div>
  
        {baseUrl ? (
          <a
            href={`${baseUrl}&download=1`}
            className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
          >
            <Download className="size-3.5" />
          </a>
        ) : null}
      </div>
    );
  }