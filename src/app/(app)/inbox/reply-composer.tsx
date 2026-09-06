"use client";

import {
  CalendarClock,
  ChevronDown,
  Clock3,
  File as FileIcon,
  Loader2,
  MessageSquareReply,
  Paperclip,
  Pencil,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  type AppLanguage,
} from "@/lib/i18n";

import {
  inboxCopy,
} from "@/lib/inbox-i18n";

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

type ScheduledAttachment = {
  name: string;
  type: string;
  size: number;
};

type ScheduledReplyState = {
  id: string;

  status:
    | "SCHEDULED"
    | "CANCELLED"
    | "FAILED"
    | string;

  body: string;

  ccEmails: string[];
  bccEmails: string[];

  attachments:
    ScheduledAttachment[];

  scheduledFor: string;

  cancelledAt:
    | string
    | null;

  cancelReason:
    | string
    | null;

  lastError:
    | string
    | null;

  createdAt: string;
};

type ScheduleReplyResponse = {
  ok?: boolean;
  error?: string;

  id?: string;

  scheduledFor?: string;

  schedule?:
    | ScheduledReplyState
    | null;
};

type AttachmentPayload = {
  filename: string;
  contentType: string;
  size: number;
  base64: string;
};

/* =========================================================
   LOCAL DRAFTS
========================================================= */

type StoredReplyDraft = {
  body: string;
  cc: string;
  bcc: string;
  showCc: boolean;
  showBcc: boolean;
  hadAttachments: boolean;
};

const REPLY_DRAFT_STORAGE_PREFIX =
  "leadbase:reply-draft:v1";

function getReplyDraftStorageKey(
  leadId: string
) {
  return `${REPLY_DRAFT_STORAGE_PREFIX}:${leadId}`;
}

function readStoredReplyDraft(
  storageKey: string
): StoredReplyDraft | null {
  try {
    const raw =
      window.localStorage.getItem(
        storageKey
      );

    if (
      !raw
    ) {
      return null;
    }

    const parsed =
      JSON.parse(
        raw
      ) as Partial<StoredReplyDraft>;

    const body =
      typeof parsed.body ===
      "string"
        ? parsed.body
        : "";

    const cc =
      typeof parsed.cc ===
      "string"
        ? parsed.cc
        : "";

    const bcc =
      typeof parsed.bcc ===
      "string"
        ? parsed.bcc
        : "";

    const showCc =
      Boolean(
        parsed.showCc
      );

    const showBcc =
      Boolean(
        parsed.showBcc
      );

    const hadAttachments =
      Boolean(
        parsed.hadAttachments
      );

    if (
      !body.trim() &&
      !cc.trim() &&
      !bcc.trim()
    ) {
      window.localStorage.removeItem(
        storageKey
      );

      return null;
    }

    return {
      body,
      cc,
      bcc,
      showCc,
      showBcc,
      hadAttachments,
    };
  } catch (
    draftError
  ) {
    console.warn(
      "Could not read saved reply draft:",
      draftError
    );

    return null;
  }
}

function writeStoredReplyDraft(
  storageKey: string,
  draft:
    StoredReplyDraft
) {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(
        draft
      )
    );
  } catch (
    draftError
  ) {
    console.warn(
      "Could not save reply draft:",
      draftError
    );
  }
}

function removeStoredReplyDraft(
  storageKey: string
) {
  try {
    window.localStorage.removeItem(
      storageKey
    );
  } catch (
    draftError
  ) {
    console.warn(
      "Could not remove reply draft:",
      draftError
    );
  }
}

/* =========================================================
   FILES
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

function fileToBase64(
  file: File,
  language:
    AppLanguage
): Promise<string> {
  const text =
    inboxCopy[
      language
    ].composer;

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
                text.fileReadFailed.replace(
                  "{name}",
                  file.name
                )
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
                text.fileEncodeFailed.replace(
                  "{name}",
                  file.name
                )
              )
            );

            return;
          }

          resolve(
            reader.result.slice(
              commaIndex +
              1
            )
          );
        };

      reader.onerror =
        () => {
          reject(
            new Error(
              text.fileReadFailed.replace(
                "{name}",
                file.name
              )
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
  response: Response,
  fallbackError:
    string
): Promise<T> {
  const contentType =
    response.headers.get(
      "content-type"
    ) ??
    "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    return await response.json();
  }

  const responseText =
    await response.text();

  console.warn(
    "API returned non-JSON:",
    {
      status:
        response.status,

      response:
        responseText.slice(
          0,
          1000
        ),
    }
  );

  throw new Error(
    `${fallbackError} (${response.status})`
  );
}

/* =========================================================
   TIMEZONE
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
      parts.month -
        1,
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
  timeZone: string
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
        month -
          1,
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

  return result.toISOString();
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
        nowParts.month -
          1,
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

function isoToBerlinLocalInput(
  value: string
) {
  const parts =
    getZonedParts(
      new Date(
        value
      ),
      SCHEDULE_TIME_ZONE
    );

  return [
    parts.year,
    "-",
    pad2(
      parts.month
    ),
    "-",
    pad2(
      parts.day
    ),
    "T",
    pad2(
      parts.hour
    ),
    ":",
    pad2(
      parts.minute
    ),
  ].join("");
}

function formatScheduledDate(
  value: string,
  language:
    AppLanguage
) {
  return new Intl.DateTimeFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-GB",
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
  date: Date,
  language:
    AppLanguage
) {
  return new Intl.DateTimeFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-GB",
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

  const {
    language,
  } =
    useLanguage();

  const text =
    inboxCopy[
      language
    ].composer;

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const [
    body,
    setBody,
  ] =
    useState(
      ""
    );

  const [
    cc,
    setCc,
  ] =
    useState(
      ""
    );

  const [
    bcc,
    setBcc,
  ] =
    useState(
      ""
    );

  const [
    showCc,
    setShowCc,
  ] =
    useState(
      false
    );

  const [
    showBcc,
    setShowBcc,
  ] =
    useState(
      false
    );

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
    useState(
      false
    );

  const [
    generating,
    setGenerating,
  ] =
    useState(
      false
    );

  const [
    scheduling,
    setScheduling,
  ] =
    useState(
      false
    );

  const [
    cancelling,
    setCancelling,
  ] =
    useState(
      false
    );

  const [
    scheduleMenuOpen,
    setScheduleMenuOpen,
  ] =
    useState(
      false
    );

  const [
    customScheduleOpen,
    setCustomScheduleOpen,
  ] =
    useState(
      false
    );

  const [
    customDateTime,
    setCustomDateTime,
  ] =
    useState(
      getTomorrowMorningLocalValue
    );

  const [
    schedule,
    setSchedule,
  ] =
    useState<
      ScheduledReplyState | null
    >(
      null
    );

  const [
    scheduleLoading,
    setScheduleLoading,
  ] =
    useState(
      true
    );

  const [
    editingScheduleId,
    setEditingScheduleId,
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
    useState(
      false
    );

  const [
    draftLoaded,
    setDraftLoaded,
  ] =
    useState(
      false
    );

  const [
    draftExists,
    setDraftExists,
  ] =
    useState(
      false
    );

  const draftStorageKey =
    useMemo(
      () =>
        getReplyDraftStorageKey(
          leadId
        ),
      [
        leadId,
      ]
    );

  const busy =
    sending ||
    generating ||
    scheduling ||
    cancelling;

  const editingSchedule =
    Boolean(
      editingScheduleId
    );

  const laterToday =
    useMemo(
      () =>
        getLaterTodayDate(),
      []
    );

  /* =======================================================
     LOAD SCHEDULE
  ======================================================= */

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadSchedule() {
        setScheduleLoading(
          true
        );

        try {
          const response =
            await fetch(
              `/api/inbox/schedule-reply?leadId=${encodeURIComponent(
                leadId
              )}`,
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          const result =
            await parseJsonResponse<ScheduleReplyResponse>(
              response,
              text.serverError
            );

          if (
            cancelled
          ) {
            return;
          }

          if (
            response.ok &&
            result.ok
          ) {
            setSchedule(
              result.schedule ??
              null
            );
          }
        } catch (
          loadError
        ) {
          console.warn(
            "Could not load scheduled reply:",
            loadError
          );
        } finally {
          if (
            !cancelled
          ) {
            setScheduleLoading(
              false
            );
          }
        }
      }

      void loadSchedule();

      return () => {
        cancelled =
          true;
      };
    },
    [
      leadId,
      text.serverError,
    ]
  );

  /* =======================================================
     LOAD DRAFT
  ======================================================= */

  useEffect(
    () => {
      setDraftLoaded(
        false
      );

      const savedDraft =
        readStoredReplyDraft(
          draftStorageKey
        );

      if (
        savedDraft
      ) {
        setBody(
          savedDraft.body
        );

        setCc(
          savedDraft.cc
        );

        setBcc(
          savedDraft.bcc
        );

        setShowCc(
          savedDraft.showCc ||
            Boolean(
              savedDraft.cc.trim()
            )
        );

        setShowBcc(
          savedDraft.showBcc ||
            Boolean(
              savedDraft.bcc.trim()
            )
        );

        setDraftExists(
          true
        );

        setOpen(
          true
        );

        if (
          savedDraft.hadAttachments
        ) {
          setError(
            text.draftRestoredAttachments
          );
        }
      } else {
        setDraftExists(
          false
        );
      }

      setDraftLoaded(
        true
      );
    },
    [
      draftStorageKey,
      text.draftRestoredAttachments,
    ]
  );

  /* =======================================================
     AUTO SAVE
  ======================================================= */

  useEffect(
    () => {
      if (
        !draftLoaded ||
        editingSchedule
      ) {
        return;
      }

      const hasContent =
        Boolean(
          body.trim() ||
          cc.trim() ||
          bcc.trim()
        );

      if (
        !hasContent
      ) {
        removeStoredReplyDraft(
          draftStorageKey
        );

        setDraftExists(
          false
        );

        return;
      }

      writeStoredReplyDraft(
        draftStorageKey,
        {
          body,
          cc,
          bcc,
          showCc,
          showBcc,

          hadAttachments:
            files.length >
            0,
        }
      );

      setDraftExists(
        true
      );
    },
    [
      body,
      bcc,
      cc,
      draftLoaded,
      draftStorageKey,
      editingSchedule,
      files.length,
      showBcc,
      showCc,
    ]
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

    if (
      editingSchedule
    ) {
      setError(
        text.scheduledAttachmentsPreserved
      );

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
          ) ===
          index
      );

    if (
      next.length >
      MAX_ATTACHMENTS
    ) {
      setError(
        text.maxAttachments.replace(
          "{count}",
          String(
            MAX_ATTACHMENTS
          )
        )
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
        text.fileTooLarge.replace(
          "{name}",
          tooLarge.name
        )
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
        text.totalTooLarge
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
              file,
              language
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
          text.replaceWithAi
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
          response,
          text.serverError
        );

      if (
        !response.ok ||
        !result.ok ||
        !result.body
      ) {
        console.error(
          "Reply generation API error:",
          result.error
        );

        throw new Error(
          text.generationFailed
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
          : text.generationFailed
      );
    } finally {
      setGenerating(
        false
      );
    }
  }

  /* =======================================================
     DRAFT
  ======================================================= */

  function clearSavedDraft() {
    removeStoredReplyDraft(
      draftStorageKey
    );

    setDraftExists(
      false
    );
  }

  function discardDraft() {
    if (
      busy
    ) {
      return;
    }

    const hasContent =
      Boolean(
        body.trim() ||
        cc.trim() ||
        bcc.trim()
      );

    if (
      hasContent
    ) {
      const confirmed =
        window.confirm(
          text.discardDraftConfirm
        );

      if (
        !confirmed
      ) {
        return;
      }
    }

    clearSavedDraft();

    resetComposer();

    setOpen(
      false
    );
  }

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

    setScheduleMenuOpen(
      false
    );

    setCustomScheduleOpen(
      false
    );

    setEditingScheduleId(
      null
    );

    setCustomDateTime(
      getTomorrowMorningLocalValue()
    );

    setError(
      null
    );
  }

  function closeComposer() {
    if (
      busy
    ) {
      return;
    }

    if (
      editingSchedule
    ) {
      resetComposer();

      setOpen(
        false
      );

      return;
    }

    setScheduleMenuOpen(
      false
    );

    setCustomScheduleOpen(
      false
    );

    setOpen(
      false
    );
  }

  function openNewReply() {
    if (
      !draftExists
    ) {
      resetComposer();
    }

    setOpen(
      true
    );

    setSent(
      false
    );
  }

  /* =======================================================
     SCHEDULE EDIT
  ======================================================= */

  function openScheduleEditor() {
    if (
      !schedule ||
      schedule.status !==
        "SCHEDULED"
    ) {
      return;
    }

    setBody(
      schedule.body
    );

    setCc(
      schedule.ccEmails.join(
        ", "
      )
    );

    setBcc(
      schedule.bccEmails.join(
        ", "
      )
    );

    setShowCc(
      schedule.ccEmails.length >
      0
    );

    setShowBcc(
      schedule.bccEmails.length >
      0
    );

    setFiles(
      []
    );

    setCustomDateTime(
      isoToBerlinLocalInput(
        schedule.scheduledFor
      )
    );

    setEditingScheduleId(
      schedule.id
    );

    setCustomScheduleOpen(
      true
    );

    setScheduleMenuOpen(
      false
    );

    setError(
      null
    );

    setOpen(
      true
    );
  }

  function openFailedAsNew() {
    if (
      !schedule
    ) {
      openNewReply();

      return;
    }

    setBody(
      schedule.body
    );

    setCc(
      schedule.ccEmails.join(
        ", "
      )
    );

    setBcc(
      schedule.bccEmails.join(
        ", "
      )
    );

    setShowCc(
      schedule.ccEmails.length >
      0
    );

    setShowBcc(
      schedule.bccEmails.length >
      0
    );

    setFiles(
      []
    );

    setEditingScheduleId(
      null
    );

    setCustomScheduleOpen(
      false
    );

    setCustomDateTime(
      getTomorrowMorningLocalValue()
    );

    setError(
      null
    );

    setOpen(
      true
    );
  }

  /* =======================================================
     VALIDATE
  ======================================================= */

  function validateComposer() {
    if (
      !body.trim()
    ) {
      setError(
        text.writeMessageFirst
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
        text.totalTooLarge
      );

      return false;
    }

    return true;
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
      editingSchedule
    ) {
      void saveScheduledReply();

      return;
    }

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
          response,
          text.serverError
        );

      if (
        !response.ok ||
        !result.ok
      ) {
        console.error(
          "Reply API error:",
          result.error
        );

        throw new Error(
          text.replyCouldNotBeSent
        );
      }

      setSchedule(
        null
      );

      clearSavedDraft();

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
          : text.replyCouldNotBeSent
      );
    } finally {
      setSending(
        false
      );
    }
  }

  /* =======================================================
     CREATE SCHEDULE
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
          response,
          text.serverError
        );

      if (
        !response.ok ||
        !result.ok ||
        !result.schedule
      ) {
        console.error(
          "Schedule reply API error:",
          result.error
        );

        throw new Error(
          text.replyCouldNotBeScheduled
        );
      }

      setSchedule(
        result.schedule
      );

      clearSavedDraft();

      resetComposer();

      setOpen(
        false
      );

      router.refresh();
    } catch (
      scheduleError
    ) {
      setError(
        scheduleError instanceof
          Error
          ? scheduleError.message
          : text.replyCouldNotBeScheduled
      );
    } finally {
      setScheduling(
        false
      );
    }
  }

  /* =======================================================
     SAVE SCHEDULE
  ======================================================= */

  async function saveScheduledReply() {
    if (
      busy ||
      !editingScheduleId ||
      !validateComposer()
    ) {
      return;
    }

    const iso =
      localDateTimeToIso(
        customDateTime,
        SCHEDULE_TIME_ZONE
      );

    if (
      !iso
    ) {
      setError(
        text.validDate
      );

      return;
    }

    setScheduling(
      true
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/inbox/schedule-reply",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  editingScheduleId,

                body:
                  body.trim(),

                cc,
                bcc,

                scheduledFor:
                  iso,
              }),
          }
        );

      const result =
        await parseJsonResponse<ScheduleReplyResponse>(
          response,
          text.serverError
        );

      if (
        !response.ok ||
        !result.ok ||
        !result.schedule
      ) {
        console.error(
          "Update schedule API error:",
          result.error
        );

        throw new Error(
          text.scheduledReplyUpdateFailed
        );
      }

      setSchedule(
        result.schedule
      );

      resetComposer();

      setOpen(
        false
      );

      router.refresh();
    } catch (
      updateError
    ) {
      setError(
        updateError instanceof
          Error
          ? updateError.message
          : text.scheduledReplyUpdateFailed
      );
    } finally {
      setScheduling(
        false
      );
    }
  }

  /* =======================================================
     CANCEL SCHEDULE
  ======================================================= */

  async function cancelScheduledReply() {
    if (
      busy ||
      !schedule ||
      schedule.status !==
        "SCHEDULED"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        text.cancelScheduledConfirm
      );

    if (
      !confirmed
    ) {
      return;
    }

    setCancelling(
      true
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/inbox/schedule-reply?id=${encodeURIComponent(
            schedule.id
          )}`,
          {
            method:
              "DELETE",
          }
        );

      const result =
        await parseJsonResponse<ScheduleReplyResponse>(
          response,
          text.serverError
        );

      if (
        !response.ok ||
        !result.ok ||
        !result.schedule
      ) {
        console.error(
          "Cancel schedule API error:",
          result.error
        );

        throw new Error(
          text.scheduledReplyCancelFailed
        );
      }

      setSchedule(
        result.schedule
      );

      resetComposer();

      setOpen(
        false
      );

      router.refresh();
    } catch (
      cancelError
    ) {
      setError(
        cancelError instanceof
          Error
          ? cancelError.message
          : text.scheduledReplyCancelFailed
      );
    } finally {
      setCancelling(
        false
      );
    }
  }

  /* =======================================================
     CUSTOM
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
        text.validDate
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
    if (
      scheduleLoading
    ) {
      return (
        <div className="mt-8 rounded-xl border bg-muted/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>

            <p className="text-sm text-muted-foreground">
              {
                text.loadingReplyStatus
              }
            </p>
          </div>
        </div>
      );
    }

    if (
      schedule?.status ===
      "SCHEDULED"
    ) {
      return (
        <div className="mt-8 rounded-xl border bg-muted/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <Clock3 className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">
                    {
                      text.replyScheduled
                    }
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {
                      text.scheduledFor
                    }{" "}
                    <span className="font-medium text-foreground">
                      {formatScheduledDate(
                        schedule.scheduledFor,
                        language
                      )}
                    </span>
                    .
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={
                      openScheduleEditor
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <Pencil className="size-3.5" />

                    {
                      text.edit
                    }
                  </button>

                  <button
                    type="button"
                    disabled={
                      cancelling
                    }
                    onClick={() =>
                      void cancelScheduledReply()
                    }
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-background px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    {cancelling ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}

                    {
                      text.cancel
                    }
                  </button>
                </div>
              </div>

              {schedule.body ? (
                <div className="mt-4 rounded-lg border bg-background/70 px-3 py-3">
                  <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                    {
                      schedule.body
                    }
                  </p>
                </div>
              ) : null}

              {schedule.attachments.length >
              0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {
                    schedule.attachments.length
                  }{" "}
                  {schedule.attachments.length ===
                  1
                    ? text.attachment
                    : text.attachments}{" "}
                  {
                    text.included
                  }
                </p>
              ) : null}

              {error ? (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                  {
                    error
                  }
                </p>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    if (
      schedule?.status ===
      "CANCELLED"
    ) {
      const cancelledByReply =
        schedule.cancelReason ===
        "CUSTOMER_REPLY";

      return (
        <div className="mt-8 rounded-xl border bg-muted/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <X className="size-4 text-muted-foreground" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">
                {
                  text.scheduledReplyCancelled
                }
              </h3>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {cancelledByReply
                  ? text.cancelledByReply
                  : text.cancelledNormally}
              </p>

              <button
                type="button"
                onClick={
                  openNewReply
                }
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <MessageSquareReply className="size-4" />

                {
                  text.writeReply
                }
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (
      schedule?.status ===
      "FAILED"
    ) {
      return (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <Clock3 className="size-4 text-red-600 dark:text-red-400" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">
                {
                  text.scheduledReplyFailed
                }
              </h3>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {
                  text.scheduledReplyCouldNotBeSent
                }
              </p>

              {schedule.lastError &&
              language ===
              "en" ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {
                    schedule.lastError
                  }
                </p>
              ) : null}

              <button
                type="button"
                onClick={
                  openFailedAsNew
                }
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Pencil className="size-4" />

                {
                  text.editReschedule
                }
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (
      draftExists
    ) {
      return (
        <div className="mt-8 rounded-xl border bg-muted/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <Pencil className="size-4" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">
                {
                  text.draftSaved
                }
              </h3>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {
                  text.draftSavedDescription
                }
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={
                    openNewReply
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Pencil className="size-4" />

                  {
                    text.continueDraft
                  }
                </button>

                <button
                  type="button"
                  onClick={
                    discardDraft
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Trash2 className="size-4" />

                  {
                    text.discard
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-8 rounded-xl border bg-muted/20 p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
            <MessageSquareReply className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">
              {
                text.reply
              }
            </h3>

            {sent ? (
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                {
                  text.replySent
                }
              </p>
            ) : (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {
                  text.replyDirectlyTo
                }{" "}
                <span className="font-medium text-foreground">
                  {
                    recipientName
                  }
                </span>
                .
              </p>
            )}

            <button
              type="button"
              onClick={
                openNewReply
              }
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <MessageSquareReply className="size-4" />

              {
                text.writeReply
              }
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
    <div className="mt-8 overflow-visible rounded-xl border bg-background shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/20">
            {editingSchedule ? (
              <Clock3 className="size-4" />
            ) : (
              <MessageSquareReply className="size-4" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              {editingSchedule
                ? text.editScheduledReply
                : text.reply}
            </h3>

            <p className="mt-0.5 text-xs text-muted-foreground">
              {editingSchedule
                ? text.updateScheduledMessage
                : draftExists
                  ? text.draftSavedAutomatically
                  : text.replyingLatestThread}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={
            busy
          }
          onClick={
            closeComposer
          }
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          title={
            text.close
          }
        >
          <X className="size-4" />
        </button>
      </div>

      {/* ===================================================
          RECIPIENT
      =================================================== */}

      <div className="border-b bg-muted/10">
        <div className="flex min-h-12 items-center gap-3 px-5 text-sm">
          <span className="w-8 shrink-0 text-xs text-muted-foreground">
            {
              text.to
            }
          </span>

          <div className="min-w-0 flex flex-1 items-center gap-2">
            <span className="truncate font-medium">
              {
                recipientName
              }
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
                onClick={() =>
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
                onClick={() =>
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
              onChange={(
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
              onClick={() => {
                setCc(
                  ""
                );

                setShowCc(
                  false
                );
              }}
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
              onChange={(
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
              onClick={() => {
                setBcc(
                  ""
                );

                setShowBcc(
                  false
                );
              }}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={
          handleSubmit
        }
      >
        <div className="px-4 py-5 sm:px-5">
          <textarea
            value={
              body
            }
            autoFocus
            disabled={
              busy
            }
            onChange={(
              event
            ) =>
              setBody(
                event.target.value
              )
            }
            placeholder={
              generating
                ? text.generatingReply
                : text.writeYourReply
            }
            rows={
              8
            }
            className="min-h-[180px] w-full resize-y bg-transparent p-0 text-sm leading-7 outline-none disabled:opacity-60"
          />

          {/* =================================================
              NEW ATTACHMENTS
          ================================================= */}

          {files.length >
          0 ? (
            <div className="mt-5 border-t pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium">
                  {
                    text.attachments
                  }
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
                  {
                    text.total
                  }
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
                      <FileIcon className="size-4 shrink-0" />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {
                            file.name
                          }
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
                        onClick={() =>
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

          {/* =================================================
              EXISTING ATTACHMENTS
          ================================================= */}

          {editingSchedule &&
          schedule?.attachments.length ? (
            <div className="mt-5 border-t pt-4">
              <p className="text-xs font-medium">
                {
                  text.existingAttachments
                }
              </p>

              <div className="mt-3 space-y-2">
                {schedule.attachments.map(
                  (
                    attachment
                  ) => (
                    <div
                      key={`${attachment.name}-${attachment.size}`}
                      className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5"
                    >
                      <FileIcon className="size-4 shrink-0" />

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
                    </div>
                  )
                )}
              </div>

              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {
                  text.existingAttachmentsDescription
                }
              </p>
            </div>
          ) : null}

          {/* =================================================
              SCHEDULE
          ================================================= */}

          {customScheduleOpen ? (
            <div className="mt-5 rounded-xl border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <CalendarClock className="size-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {editingSchedule
                      ? text.scheduledSendTime
                      : text.scheduleReply}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {
                      text.timeZone
                    }
                    : Europe/Berlin
                  </p>

                  <input
                    type="datetime-local"
                    value={
                      customDateTime
                    }
                    disabled={
                      busy
                    }
                    onChange={(
                      event
                    ) =>
                      setCustomDateTime(
                        event.target.value
                      )
                    }
                    className="mt-4 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none"
                  />

                  {!editingSchedule ? (
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          setCustomScheduleOpen(
                            false
                          )
                        }
                        className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
                      >
                        {
                          text.cancel
                        }
                      </button>

                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={
                          handleCustomSchedule
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {scheduling ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Clock3 className="size-4" />
                        )}

                        {
                          text.schedule
                        }
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* =================================================
              ERROR
          ================================================= */}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {
                error
              }
            </div>
          ) : null}

          {/* =================================================
              SIGNATURE
          ================================================= */}

          <div className="mt-6 border-t pt-5 text-sm leading-6">
            <p className="text-muted-foreground">
              {language ===
              "de"
                ? "Mit freundlichen Grüßen,"
                : "Kind regards,"}
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

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={
                fileInputRef
              }
              type="file"
              multiple
              disabled={
                busy ||
                editingSchedule
              }
              onChange={
                handleFiles
              }
              className="hidden"
            />

            <button
              type="button"
              disabled={
                busy ||
                editingSchedule
              }
              onClick={() =>
                fileInputRef
                  .current
                  ?.click()
              }
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              title={
                editingSchedule
                  ? text.attachmentsPreserved
                  : text.attachFiles
              }
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

                  {
                    text.generating
                  }
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />

                  {
                    text.generateReply
                  }
                </>
              )}
            </button>
          </div>

          {editingSchedule ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  closeComposer
                }
                className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {
                  text.discardChanges
                }
              </button>

              <button
                type="button"
                disabled={
                  busy ||
                  !body.trim()
                }
                onClick={() =>
                  void saveScheduledReply()
                }
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {scheduling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Clock3 className="size-4" />
                )}

                {
                  text.saveChanges
                }
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  discardDraft
                }
                className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                title={
                  text.discardDraft
                }
                aria-label={
                  text.discardDraft
                }
              >
                <Trash2 className="size-4" />
              </button>

              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  closeComposer
                }
                className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {
                  text.close
                }
              </button>

              <div className="relative flex">
                <button
                  type="submit"
                  disabled={
                    busy ||
                    !body.trim()
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-l-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />

                      {
                        text.sending
                      }
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />

                      {
                        text.sendReply
                      }
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={
                    busy ||
                    !body.trim()
                  }
                  onClick={() =>
                    setScheduleMenuOpen(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-r-md border-l border-background/20 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  aria-label={
                    text.scheduleSend
                  }
                >
                  <ChevronDown className="size-4" />
                </button>

                {scheduleMenuOpen ? (
                  <div className="absolute bottom-11 right-0 z-50 w-64 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
                    <div className="px-2 py-2">
                      <p className="text-xs font-semibold">
                        {
                          text.sendLater
                        }
                      </p>

                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Europe/Berlin
                      </p>
                    </div>

                    {laterToday ? (
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleMenuOpen(
                            false
                          );

                          void scheduleReply(
                            laterToday.toISOString()
                          );
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-muted"
                      >
                        <Clock3 className="size-4 text-muted-foreground" />

                        <div>
                          <p className="text-sm font-medium">
                            {
                              text.laterToday
                            }
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {formatTimeOnly(
                              laterToday,
                              language
                            )}
                          </p>
                        </div>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        const iso =
                          getTomorrowMorningIso();

                        if (
                          !iso
                        ) {
                          setError(
                            text.tomorrowCalculationFailed
                          );

                          return;
                        }

                        setScheduleMenuOpen(
                          false
                        );

                        void scheduleReply(
                          iso
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-muted"
                    >
                      <CalendarClock className="size-4 text-muted-foreground" />

                      <div>
                        <p className="text-sm font-medium">
                          {
                            text.tomorrowMorning
                          }
                        </p>

                        <p className="text-xs text-muted-foreground">
                          09:00
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setScheduleMenuOpen(
                          false
                        );

                        setCustomScheduleOpen(
                          true
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-muted"
                    >
                      <CalendarClock className="size-4 text-muted-foreground" />

                      <div>
                        <p className="text-sm font-medium">
                          {
                            text.customDateTime
                          }
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {
                            text.chooseSendTime
                          }
                        </p>
                      </div>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}