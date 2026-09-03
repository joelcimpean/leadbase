"use client";

import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import {
  Loader2,
} from "lucide-react";

import {
  useFormStatus,
} from "react-dom";

type NativeButtonProps =
  Omit<
    ComponentPropsWithoutRef<"button">,
    | "children"
    | "type"
  >;

type PendingSubmitButtonProps =
  NativeButtonProps & {
    children:
      ReactNode;

    pendingText?:
      string;
  };

export function PendingSubmitButton({
  children,
  pendingText = "",
  className = "",
  disabled = false,
  ...buttonProps
}: PendingSubmitButtonProps) {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <button
      {...buttonProps}
      type="submit"
      disabled={
        disabled ||
        pending
      }
      aria-busy={
        pending
      }
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 shrink-0 animate-spin" />

          {pendingText ? (
            <span>
              {
                pendingText
              }
            </span>
          ) : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}
