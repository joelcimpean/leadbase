export type ProposalCustomSection = {
  id: string;
  title: string;
  content: string;
};

function cleanString(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export function normalizeProposalSections(
  value: unknown,
  maxItems = 20
): ProposalCustomSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const title = cleanString(candidate.title).slice(0, 120);
      const content = cleanString(candidate.content).slice(0, 12000);

      if (!title || !content) {
        return null;
      }

      const id =
        cleanString(candidate.id).slice(0, 120) ||
        `section-${index + 1}`;

      return {
        id,
        title,
        content,
      };
    })
    .filter((item): item is ProposalCustomSection => Boolean(item))
    .slice(0, maxItems);
}

export function parseProposalSectionsJson(
  raw: string
): ProposalCustomSection[] {
  if (!raw.trim()) {
    return [];
  }

  try {
    return normalizeProposalSections(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function defaultProposalCustomSections(
  language: "de" | "en" = "de"
): ProposalCustomSection[] {
  if (language === "en") {
    return [
      {
        id: "default-terms",
        title: "Terms & responsibilities",
        content: [
          "- One consolidated revision round per agreed milestone is included unless agreed otherwise.",
          "- Additional services or major direction changes are agreed separately before implementation.",
          "- Usage rights to final deliverables transfer after full payment within the agreed scope.",
          "- The client provides required content, access and approvals on time.",
        ].join("\n"),
      },
    ];
  }

  return [
    {
      id: "default-terms",
      title: "Rahmenbedingungen",
      content: [
        "- Eine konsolidierte Korrekturrunde pro vereinbartem Meilenstein ist enthalten, sofern nichts anderes vereinbart wurde.",
        "- Zusätzliche Leistungen oder größere Richtungsänderungen werden vor Umsetzung separat abgestimmt.",
        "- Die Nutzungsrechte an den finalen Leistungen gehen nach vollständiger Zahlung im vereinbarten Umfang auf den Kunden über.",
        "- Benötigte Inhalte, Zugänge und Freigaben werden vom Kunden rechtzeitig bereitgestellt.",
      ].join("\n"),
    },
  ];
}
