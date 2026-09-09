"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  BellPlus,
  CalendarClock,
  Check,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Textarea,
} from "@/components/ui/textarea";

import {
  WorkspacePageMotion,
} from "@/components/workspace-page-motion";

type Reminder = {
  id: string;
  title: string;
  note: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialReminders:
    Reminder[];
  language:
    "de"
    | "en";
};

function formatDateTime(
  value: string,
  language:
    "de"
    | "en"
) {
  return new Intl.DateTimeFormat(
    language ===
      "de"
      ? "de-DE"
      : "en-GB",
    {
      day:
        "2-digit",
      month:
        "short",
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

export function RemindersClient({
  initialReminders,
  language,
}: Props) {
  const de =
    language ===
    "de";

  const [
    reminders,
    setReminders,
  ] =
    useState(
      initialReminders
    );

  const [
    mode,
    setMode,
  ] =
    useState<
      "open"
      | "notes"
      | "done"
    >(
      "open"
    );

  const [
    title,
    setTitle,
  ] =
    useState(
      ""
    );

  const [
    note,
    setNote,
  ] =
    useState(
      ""
    );

  const [
    dueAt,
    setDueAt,
  ] =
    useState(
      ""
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const visible =
    useMemo(
      () =>
        reminders.filter(
          (
            reminder
          ) => {
            if (
              mode ===
              "done"
            ) {
              return Boolean(
                reminder.completed_at
              );
            }

            if (
              reminder.completed_at
            ) {
              return false;
            }

            if (
              mode ===
              "notes"
            ) {
              return !reminder.due_at;
            }

            return true;
          }
        ),
      [
        mode,
        reminders,
      ]
    );

  async function addReminder() {
    if (
      busy ||
      !title.trim()
    ) {
      return;
    }

    setBusy(
      true
    );
    setError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/reminders",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                title,
                note,
                dueAt:
                  dueAt
                    ? new Date(
                        dueAt
                      ).toISOString()
                    : null,
              }),
          }
        );

      const result =
        (await response.json()) as {
          ok: boolean;
          reminder?: Reminder;
          error?: string;
        };

      if (
        response.ok &&
        result.ok &&
        result.reminder
      ) {
        setReminders(
          (
            current
          ) => [
            result.reminder as Reminder,
            ...current,
          ]
        );
        setTitle(
          ""
        );
        setNote(
          ""
        );
        setDueAt(
          ""
        );
            } else {
        setError(
          result.error ??
            (de
              ? "Reminder konnte nicht gespeichert werden."
              : "Reminder could not be saved.")
        );
      }
    } finally {
      setBusy(
        false
      );
    }
  }

  async function toggleComplete(
    reminder: Reminder
  ) {
    const completed =
      !reminder.completed_at;

    const response =
      await fetch(
        "/api/reminders",
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
                reminder.id,
              completed,
            }),
        }
      );

    const result =
      (await response.json()) as {
        ok: boolean;
        reminder?: Reminder;
      };

    if (
      response.ok &&
      result.reminder
    ) {
      setReminders(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
                reminder.id
                ? result.reminder as Reminder
                : item
          )
      );
    }
  }

  async function removeReminder(
    reminderId: string
  ) {
    const response =
      await fetch(
        `/api/reminders?id=${encodeURIComponent(
          reminderId
        )}`,
        {
          method:
            "DELETE",
        }
      );

    if (
      response.ok
    ) {
      setReminders(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              reminderId
          )
      );
    }
  }

  return (
    <div className="leadbase-workspace-page min-h-full">
      <WorkspacePageMotion />

      <div className="mx-auto w-full max-w-[1300px] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
        <header
          data-workspace-reveal
          className="leadbase-workspace-header p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.06] text-primary">
              <BellPlus className="size-4" />
            </span>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {de
                  ? "Persönlicher Workspace"
                  : "Personal workspace"}
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                {de
                  ? "Reminders & Notizen"
                  : "Reminders & notes"}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {de
                  ? "Halte kleine Aufgaben, Follow-ups außerhalb der Automation und schnelle Notizen an einem Ort fest."
                  : "Keep small tasks, manual follow-ups and quick notes in one place."}
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <Card
            data-workspace-reveal
            className="leadbase-workspace-card h-fit"
          >
            <CardContent className="p-4 sm:p-5">
              <h2 className="text-sm font-semibold">
                {de
                  ? "Neu eintragen"
                  : "Add new"}
              </h2>

              <div className="mt-4 space-y-3">
                <Input
                  value={
                    title
                  }
                  onChange={(
                    event
                  ) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder={
                    de
                      ? "Titel"
                      : "Title"
                  }
                />

                <Textarea
                  value={
                    note
                  }
                  onChange={(
                    event
                  ) =>
                    setNote(
                      event.target.value
                    )
                  }
                  placeholder={
                    de
                      ? "Notiz (optional)"
                      : "Note (optional)"
                  }
                  className="min-h-28"
                />

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {de
                      ? "Erinnerung (optional)"
                      : "Reminder (optional)"}
                  </p>

                  <Input
                    type="datetime-local"
                    value={
                      dueAt
                    }
                    onChange={(
                      event
                    ) =>
                      setDueAt(
                        event.target.value
                      )
                    }
                  />
                </div>

                <Button
                  type="button"
                  disabled={
                    busy ||
                    !title.trim()
                  }
                  onClick={
                    addReminder
                  }
                  className="w-full gap-2"
                >
                  <Plus className="size-4" />
                  {de
                    ? "Speichern"
                    : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card
            data-workspace-reveal
            className="leadbase-workspace-card"
          >
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 className="text-sm font-semibold">
                    {de
                      ? "Deine Liste"
                      : "Your list"}
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {visible.length} {de ? "Einträge" : "items"}
                  </p>
                </div>

                <div className="flex rounded-xl border border-border/70 bg-muted/25 p-1">
                  {[
                    [
                      "open",
                      de
                        ? "Offen"
                        : "Open",
                    ],
                    [
                      "notes",
                      de
                        ? "Notizen"
                        : "Notes",
                    ],
                    [
                      "done",
                      de
                        ? "Erledigt"
                        : "Done",
                    ],
                  ].map(
                    ([
                      value,
                      label,
                    ]) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        onClick={() =>
                          setMode(
                            value as typeof mode
                          )
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          mode ===
                          value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {visible.length ===
              0 ? (
                <div className="flex min-h-64 items-center justify-center p-6 text-center">
                  <div>
                    <FileText className="mx-auto size-5 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">
                      {de
                        ? "Hier ist gerade nichts."
                        : "Nothing here right now."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {visible.map(
                    (
                      reminder
                    ) => (
                      <div
                        key={
                          reminder.id
                        }
                        className="flex items-start gap-3 p-4 transition-colors hover:bg-muted/20 sm:p-5"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void toggleComplete(
                              reminder
                            )
                          }
                          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border transition ${
                            reminder.completed_at
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/40 hover:text-primary"
                          }`}
                          aria-label={
                            de
                              ? "Erledigt umschalten"
                              : "Toggle complete"
                          }
                        >
                          {reminder.completed_at ? (
                            <Check className="size-3.5" />
                          ) : null}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${
                            reminder.completed_at
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}>
                            {reminder.title}
                          </p>

                          {reminder.note ? (
                            <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                              {reminder.note}
                            </p>
                          ) : null}

                          {reminder.due_at ? (
                            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.04] px-2 py-1 text-[11px] text-primary">
                              <CalendarClock className="size-3" />
                              {formatDateTime(
                                reminder.due_at,
                                language
                              )}
                            </div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void removeReminder(
                              reminder.id
                            )
                          }
                          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                          aria-label={
                            de
                              ? "Löschen"
                              : "Delete"
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
