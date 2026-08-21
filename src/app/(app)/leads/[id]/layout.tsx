"use client";

import {
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

/* =========================================================
   SAFE RETURN URL

   Only Inbox URLs are accepted.
   This prevents arbitrary redirect URLs from being used.
========================================================= */

function getSafeInboxReturnTo(
  value:
    | string
    | null
) {
  if (
    !value
  ) {
    return null;
  }

  if (
    value ===
      "/inbox" ||
    value.startsWith(
      "/inbox?"
    )
  ) {
    return value;
  }

  return null;
}

/* =========================================================
   LAYOUT
========================================================= */

export default function LeadContextLayout({
  children,
}: Readonly<{
  children:
    ReactNode;
}>) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  /* =======================================================
     THREAD RETURN URL
  ======================================================= */

  const returnTo =
    getSafeInboxReturnTo(
      searchParams.get(
        "returnTo"
      )
    );

  /* =======================================================
     ONLY DETAIL PAGE

     /leads/123       -> yes
     /leads/123/edit  -> no
  ======================================================= */

  const isLeadDetailPage =
    /^\/leads\/[^/]+$/.test(
      pathname
    );

  const hasThreadContext =
    Boolean(
      returnTo &&
      isLeadDetailPage
    );

  /* =======================================================
     INTERCEPT THE EXISTING "BACK TO LEADS" LINK
  ======================================================= */

  function handleClickCapture(
    event:
      MouseEvent<HTMLDivElement>
  ) {
    if (
      !hasThreadContext ||
      !returnTo
    ) {
      return;
    }

    const target =
      event.target;

    if (
      !(
        target instanceof
        Element
      )
    ) {
      return;
    }

    const link =
      target.closest(
        "a"
      );

    if (
      !link
    ) {
      return;
    }

    /*
     * Only replace the normal lead-detail
     * "Back to leads" link.
     */

    if (
      link.getAttribute(
        "href"
      ) !==
      "/leads"
    ) {
      return;
    }

    event.preventDefault();

    router.push(
      returnTo
    );
  }

  return (
    <div
      onClickCapture={
        handleClickCapture
      }
      className={
        hasThreadContext
          ? "[&>div>a:first-child]:text-[0px] [&>div>a:first-child]:after:text-sm [&>div>a:first-child]:after:content-['Back_to_thread']"
          : undefined
      }
    >
      {children}
    </div>
  );
}