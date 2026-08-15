"use client";

import {
  CheckCircle2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type InboxStatusBannerProps = {
  message: string;
  cleanupHref: string;
};

export function InboxStatusBanner({
  message,
  cleanupHref,
}: InboxStatusBannerProps) {
  const router =
    useRouter();

  const [
    visible,
    setVisible,
  ] =
    useState(
      true
    );

  useEffect(
    () => {
      const hideTimer =
        window.setTimeout(
          () => {
            setVisible(
              false
            );
          },
          4000
        );

      const cleanupTimer =
        window.setTimeout(
          () => {
            router.replace(
              cleanupHref,
              {
                scroll:
                  false,
              }
            );
          },
          4400
        );

      return () => {
        window.clearTimeout(
          hideTimer
        );

        window.clearTimeout(
          cleanupTimer
        );
      };
    },
    [
      cleanupHref,
      router,
    ]
  );

  return (
    <div
      className={`overflow-hidden border-b border-emerald-200 bg-emerald-50 transition-all duration-300 dark:border-emerald-900/60 dark:bg-emerald-950/40 ${
        visible
          ? "max-h-12 opacity-100"
          : "max-h-0 border-transparent opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 px-8 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 lg:px-10">
        <CheckCircle2 className="size-3.5 shrink-0" />

        {message}
      </div>
    </div>
  );
}