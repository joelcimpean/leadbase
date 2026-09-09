"use client";

import type {
  ReactNode,
} from "react";

import {
  useState,
} from "react";

import {
  FileText,
} from "lucide-react";

type TabKey =
  | "details"
  | "scope"
  | "sections"
  | "branding"
  | "design";

export function ProposalBuilderTabs({
  isGerman,
  scopeCount,
  sectionCount,
  details,
  scope,
  sections,
  branding,
  design,
  footer,
}: {
  isGerman: boolean;
  scopeCount: number;
  sectionCount: number;
  details: ReactNode;
  scope: ReactNode;
  sections: ReactNode;
  branding: ReactNode;
  design: ReactNode;
  footer: ReactNode;
}) {
  const [tab, setTab] =
    useState<TabKey>("details");

  const items: Array<{
    key: TabKey;
    label: string;
  }> = [
    {
      key: "details",
      label: isGerman
        ? "Angebotsdaten"
        : "Proposal details",
    },
    {
      key: "scope",
      label: `${
        isGerman
          ? "Leistungen"
          : "Services"
      } ${scopeCount}`,
    },
    {
      key: "sections",
      label: `${
        isGerman
          ? "Abschnitte"
          : "Sections"
      } ${sectionCount}`,
    },
    {
      key: "branding",
      label: "Branding",
    },
    {
      key: "design",
      label: isGerman ? "Design" : "Design",
    },
  ];

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(11,12,14,0.03)] dark:border-white/[0.08] dark:bg-[#111216]">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/[0.07] px-[18px] py-[13px] dark:border-white/[0.08]">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="size-[15px] shrink-0 text-[#002BBA]" />

          <h2 className="whitespace-nowrap text-[14.5px] font-semibold tracking-[-0.015em]">
            {isGerman
              ? "Angebotsinhalt"
              : "Proposal content"}
          </h2>

          <span className="truncate text-[11.5px] text-[#6B7078]">
            {isGerman
              ? "Alles hier Erfasste erscheint auf der öffentlichen Angebotsseite."
              : "Everything entered here appears on the public proposal page."}
          </span>
        </div>

        <div className="flex shrink-0 rounded-[10px] bg-black/[0.045] p-[3px] dark:bg-white/[0.06]">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setTab(item.key)
              }
              className={`h-[26px] rounded-[8px] px-[10px] text-[11.5px] transition-[background-color,color,box-shadow] duration-150 ${
                tab === item.key
                  ? "bg-white font-medium text-[#0B0C0E] shadow-[0_1px_2px_rgba(11,12,14,0.12)] dark:bg-[#202126] dark:text-white"
                  : "text-[#6B7078] hover:text-[#0B0C0E] dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-4">
        {/*
         * Keep every proposal panel mounted.
         *
         * The previous version conditionally unmounted inactive tabs.
         * That meant the real form fields from "Proposal details"
         * disappeared from the DOM when the user opened "Services".
         *
         * ProposalReadinessCard reads the actual form fields, so Title,
         * Client, Introduction, etc. incorrectly became incomplete.
         * More importantly, unmounted inputs would also be absent from a
         * normal form submission.
         *
         * Hidden panels remain mounted and therefore remain part of the
         * single real proposal form, while only the active panel is visible.
         */}
        <div
          role="tabpanel"
          aria-hidden={
            tab !== "details"
          }
          className={
            tab === "details"
              ? "block"
              : "hidden"
          }
        >
          {
            details
          }
        </div>

        <div
          role="tabpanel"
          aria-hidden={
            tab !== "scope"
          }
          className={
            tab === "scope"
              ? "block"
              : "hidden"
          }
        >
          {
            scope
          }
        </div>

        <div
          role="tabpanel"
          aria-hidden={
            tab !== "sections"
          }
          className={
            tab === "sections"
              ? "block"
              : "hidden"
          }
        >
          {
            sections
          }
        </div>

        <div
          role="tabpanel"
          aria-hidden={
            tab !== "branding"
          }
          className={
            tab === "branding"
              ? "block"
              : "hidden"
          }
        >
          {
            branding
          }
        </div>

        <div
          role="tabpanel"
          aria-hidden={
            tab !== "design"
          }
          className={
            tab === "design"
              ? "block"
              : "hidden"
          }
        >
          {
            design
          }
        </div>
      </div>

      {footer}
    </section>
  );
}
