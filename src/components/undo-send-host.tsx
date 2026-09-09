"use client";

import { AlertCircle, Loader2, RotateCcw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import {
  getUndoableSendTasks,
  subscribeUndoableSends,
  undoQueuedSend,
  type UndoableSendTask,
} from "@/lib/undoable-send";

function CountdownRing({ task, now }: { task: UndoableSendTask; now: number }) {
  const remaining = Math.max(0, task.deadline - now);
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const progress = Math.max(0, Math.min(1, remaining / task.durationMs));
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative flex size-8 shrink-0 items-center justify-center" aria-label={`${seconds} Sekunden`}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="2" />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-white transition-[stroke-dashoffset] duration-200 ease-linear"
        />
      </svg>
      <span className="font-mono text-[9px] font-medium tabular-nums text-white">{seconds}</span>
    </div>
  );
}

export function UndoSendHost() {
  const { language } = useLanguage();
  const de = language === "de";
  const [tasks, setTasks] = useState<UndoableSendTask[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const sync = () => setTasks(getUndoableSendTasks());
    sync();
    return subscribeUndoableSends(sync);
  }, []);

  const hasPending = useMemo(() => tasks.some((task) => task.status === "pending"), [tasks]);

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [hasPending]);

  if (tasks.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[390px]">
      {tasks.map((task) => {
        const failed = task.status === "failed";
        const sending = task.status === "sending";

        return (
          <div
            key={task.id}
            className="pointer-events-auto w-full overflow-hidden rounded-[12px] border border-white/20 bg-[#002BBA] text-white shadow-[0_18px_40px_-18px_rgba(0,43,186,.52)] animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              {failed ? (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/8 text-[#F2B37A]">
                  <AlertCircle className="size-3.5" />
                </div>
              ) : sending ? (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/8">
                  <Loader2 className="size-3.5 animate-spin" />
                </div>
              ) : (
                <CountdownRing task={task} now={now} />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium tracking-[-.01em]">
                  {failed
                    ? de ? "Senden fehlgeschlagen" : "Send failed"
                    : sending
                      ? de ? "Wird jetzt gesendet" : "Sending now"
                      : task.label}
                </p>
                <p className="mt-0.5 truncate text-[10.5px] text-white/65">
                  {failed
                    ? task.error ?? (de ? "Bitte erneut versuchen." : "Please try again.")
                    : sending
                      ? de ? "Die 10-Sekunden-Frist ist abgelaufen." : "The 10-second undo window has ended."
                      : task.detail ?? (de ? "Wird in 10 Sekunden gesendet." : "Will be sent in 10 seconds.")}
                </p>
              </div>

              {!failed && !sending ? (
                <button
                  type="button"
                  onClick={() => undoQueuedSend(task.id)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] border border-white/18 px-2.5 text-[10.5px] font-medium text-white transition-colors hover:bg-white/8"
                >
                  <RotateCcw className="size-3" />
                  {de ? "Rückgängig" : "Undo"}
                </button>
              ) : sending ? (
                <Send className="size-3.5 shrink-0 text-white/55" />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
