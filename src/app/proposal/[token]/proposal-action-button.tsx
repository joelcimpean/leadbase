"use client";

import type {
  CSSProperties,
  ReactNode,
} from "react";

import {
  Loader2,
} from "lucide-react";

import {
  useFormStatus,
} from "react-dom";

type ProposalActionButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  variant?:
    | "primary"
    | "secondary";
  accentColor?: string;
};

export function ProposalActionButton({
  children,
  pendingLabel,
  variant = "primary",
  accentColor = "#002BBA",
}: ProposalActionButtonProps) {
  const { pending } =
    useFormStatus();

  const primary =
    variant === "primary";

  const style: CSSProperties =
    primary
      ? {
          backgroundColor:
            accentColor,
          borderColor:
            accentColor,
          color: "#ffffff",
        }
      : {};

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      style={style}
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
        primary
          ? "hover:opacity-90"
          : "border-black/15 bg-white text-zinc-900 hover:bg-zinc-50",
      ].join(" ")}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
