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

import { readableTextColor } from "@/lib/brand-kit";

type ProposalActionButtonProps = {
  children: ReactNode;
  pendingLabel: string;
  variant?:
    | "primary"
    | "secondary"
    | "rail-secondary";
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

  const railSecondary =
    variant ===
    "rail-secondary";

  const style: CSSProperties =
    primary
      ? {
          backgroundColor:
            accentColor,
          borderColor:
            accentColor,
          color: readableTextColor(accentColor),
        }
      : {};

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      style={style}
      className={[
        "inline-flex items-center justify-center gap-2 border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        railSecondary
          ? "h-8 w-full rounded-[9px] border-black/[0.12] bg-white px-2 text-[10.5px] text-[#6B6660] hover:border-black/[0.26] hover:text-[#14161A]"
          : primary
            ? "h-10 rounded-full px-4 text-[11.5px] hover:opacity-90"
            : "h-10 rounded-full border-black/[0.14] bg-white px-4 text-[11.5px] text-[#6B6660] hover:border-black/[0.30] hover:text-[#14161A]",
      ].join(" ")}
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
