"use client";

import {
  Loader2,
} from "lucide-react";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

type ExternalFormSubmitButtonProps = {
  formId: string;

  pendingText: string;

  disabled?: boolean;

  className?: string;

  children:
    ReactNode;
};

export function ExternalFormSubmitButton({
  formId,
  pendingText,
  disabled = false,
  className,
  children,
}: ExternalFormSubmitButtonProps) {
  const [
    pending,
    setPending,
  ] =
    useState(
      false
    );

  useEffect(
    () => {
      const form =
        document.getElementById(
          formId
        );

      if (
        !(form instanceof HTMLFormElement)
      ) {
        return;
      }

      const handleSubmit =
        () => {
          setPending(
            true
          );
        };

      const handleInvalid =
        () => {
          /*
           * Native validation can prevent submission.
           * In that case the button must not stay stuck in loading state.
           */
          setPending(
            false
          );
        };

      form.addEventListener(
        "submit",
        handleSubmit
      );

      form.addEventListener(
        "invalid",
        handleInvalid,
        true
      );

      return () => {
        form.removeEventListener(
          "submit",
          handleSubmit
        );

        form.removeEventListener(
          "invalid",
          handleInvalid,
          true
        );
      };
    },
    [
      formId,
    ]
  );

  return (
    <button
      type="submit"
      form={
        formId
      }
      disabled={
        disabled ||
        pending
      }
      aria-busy={
        pending
      }
      className={
        className
      }
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />

          {
            pendingText
          }
        </>
      ) : (
        children
      )}
    </button>
  );
}
