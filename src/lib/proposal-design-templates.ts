export const PROPOSAL_DESIGN_TEMPLATES = [
  {
    id: "signature",
    name: "Signature",
    blurbDe: "Editorial, dunkles Cover, Serifen-Display",
    blurbEn: "Editorial, dark cover, serif display",
    paper: "#FFFDFB",
    ink: "#0E1013",
    accentBar: true,
  },
  {
    id: "minimal",
    name: "Minimal",
    blurbDe: "Eine Spalte, viel Weißraum, nur Linien",
    blurbEn: "Single column, generous whitespace, lines only",
    paper: "#FFFFFF",
    ink: "#14161A",
    accentBar: false,
  },
  {
    id: "kontur",
    name: "Kontur",
    blurbDe: "Schweizer Raster, Hairlines, Tabellen",
    blurbEn: "Swiss grid, hairlines, tables",
    paper: "#FFFFFF",
    ink: "#14161A",
    accentBar: false,
  },
  {
    id: "kanzlei",
    name: "Kanzlei",
    blurbDe: "Formeller Brief, Baskerville, Signaturfeld",
    blurbEn: "Formal letter, Baskerville, signature field",
    paper: "#FFFFFF",
    ink: "#1A1D22",
    accentBar: true,
  },
  {
    id: "prisma",
    name: "Prisma",
    blurbDe: "Dunkel, kontraststark, großes Display",
    blurbEn: "Dark, high contrast, large display",
    paper: "#0B0C0E",
    ink: "#FFFFFF",
    accentBar: true,
  },
  {
    id: "atelier",
    name: "Atelier",
    blurbDe: "Warmes Papier, kursive Serife, asymmetrisch",
    blurbEn: "Warm paper, italic serif, asymmetric",
    paper: "#F3EFE7",
    ink: "#211E1A",
    accentBar: false,
  },
  {
    id: "kompakt",
    name: "Kompakt",
    blurbDe: "Leadbase-Flächen, dichte Karten",
    blurbEn: "Leadbase surfaces, dense cards",
    paper: "#F6F7F9",
    ink: "#0B0C0E",
    accentBar: true,
  },
] as const;

export type ProposalDesignTemplate =
  (typeof PROPOSAL_DESIGN_TEMPLATES)[number]["id"];

export const DEFAULT_PROPOSAL_DESIGN_TEMPLATE: ProposalDesignTemplate =
  "minimal";

export function normalizeProposalDesignTemplate(
  value: unknown
): ProposalDesignTemplate {
  return PROPOSAL_DESIGN_TEMPLATES.some(
    (template) => template.id === value
  )
    ? (value as ProposalDesignTemplate)
    : DEFAULT_PROPOSAL_DESIGN_TEMPLATE;
}

export function proposalDesignTemplateMeta(
  value: unknown
) {
  const id = normalizeProposalDesignTemplate(value);
  return PROPOSAL_DESIGN_TEMPLATES.find((template) => template.id === id)!;
}
