"use client";

import {
  Check,
  Copy,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  Button,
} from "@/components/ui/button";

type CopyProposalLinkProps = {
  path:
    string;

  label:
    string;

  copiedLabel:
    string;
};

export function CopyProposalLink({
  path,
  label,
  copiedLabel,
}: CopyProposalLinkProps) {
  const [copied, setCopied] =
    useState(false);

  async function handleCopy() {
    const url =
      `${window.location.origin}${path}`;

    await navigator.clipboard.writeText(
      url
    );

    setCopied(true);

    window.setTimeout(
      () =>
        setCopied(false),
      1800
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      className="gap-2"
    >
      {copied ? (
        <Check className="size-4" />
      ) : (
        <Copy className="size-4" />
      )}

      {copied
        ? copiedLabel
        : label}
    </Button>
  );
}
