"use client";

export type UndoableSendStatus = "pending" | "sending" | "failed";

export type UndoableSendTask = {
  id: string;
  label: string;
  detail?: string;
  createdAt: number;
  deadline: number;
  durationMs: number;
  status: UndoableSendStatus;
  error?: string;
};

type InternalTask = UndoableSendTask & {
  timer: number;
  commit: () => Promise<void>;
  onUndo?: () => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

type QueueUndoableSendInput = {
  label: string;
  detail?: string;
  durationMs?: number;
  commit: () => Promise<void>;
  onUndo?: () => void;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

const DEFAULT_DURATION_MS = 10_000;
const CHANGE_EVENT = "leadbase:undo-send-change";
const tasks = new Map<string, InternalTask>();

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function publicTasks() {
  return Array.from(tasks.values())
    .map(({ timer: _timer, commit: _commit, onUndo: _onUndo, onSuccess: _onSuccess, onError: _onError, ...task }) => task)
    .sort((a, b) => a.createdAt - b.createdAt);
}

function removeTask(id: string) {
  const task = tasks.get(id);
  if (!task) return;
  window.clearTimeout(task.timer);
  tasks.delete(id);
  emitChange();
}

async function commitTask(id: string) {
  const task = tasks.get(id);
  if (!task || task.status !== "pending") return;

  task.status = "sending";
  emitChange();

  try {
    await task.commit();
    task.onSuccess?.();
    removeTask(id);
  } catch (error) {
    const digest =
      typeof error === "object" && error && "digest" in error
        ? String((error as { digest?: unknown }).digest ?? "")
        : "";

    if (digest.startsWith("NEXT_REDIRECT")) {
      task.onSuccess?.();
      removeTask(id);
      return;
    }

    task.status = "failed";
    task.error = error instanceof Error ? error.message : "Senden fehlgeschlagen";
    task.onError?.(error);
    emitChange();

    window.setTimeout(() => {
      if (tasks.get(id)?.status === "failed") removeTask(id);
    }, 6000);
  }
}

export function queueUndoableSend({
  label,
  detail,
  durationMs = DEFAULT_DURATION_MS,
  commit,
  onUndo,
  onSuccess,
  onError,
}: QueueUndoableSendInput) {
  if (typeof window === "undefined") {
    throw new Error("Undoable sends can only be queued in the browser.");
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const createdAt = Date.now();
  const deadline = createdAt + durationMs;

  const task: InternalTask = {
    id,
    label,
    detail,
    createdAt,
    deadline,
    durationMs,
    status: "pending",
    commit,
    onUndo,
    onSuccess,
    onError,
    timer: 0,
  };

  task.timer = window.setTimeout(() => void commitTask(id), durationMs);
  tasks.set(id, task);
  emitChange();
  return id;
}

export function undoQueuedSend(id: string) {
  const task = tasks.get(id);
  if (!task || task.status !== "pending") return false;

  window.clearTimeout(task.timer);
  tasks.delete(id);
  task.onUndo?.();
  emitChange();
  return true;
}

export function getUndoableSendTasks(): UndoableSendTask[] {
  return publicTasks();
}

export function subscribeUndoableSends(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
