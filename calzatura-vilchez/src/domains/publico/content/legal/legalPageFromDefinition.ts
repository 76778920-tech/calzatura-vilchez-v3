import { complaintPlazosTerminosReferencia } from "@/domains/publico/utils/complaintLegalPlazos";
import {
  buildLegalPage,
  legalFaqs,
  legalSections,
  legalUpdatedNote,
  providerLegalSection,
} from "../infoPageBuilders";
import type { InfoContent } from "../infoPageTypes";

type DynamicParagraph = { dynamic: "complaintPlazosTerminosReferencia" };

type LegalParagraph = string | DynamicParagraph;

export type LegalSectionDefinition = {
  title: string;
  paragraphs: LegalParagraph[];
  includeProviderId?: boolean;
};

export type LegalPageDefinition = {
  title: string;
  intro: string;
  accent: string;
  noteSuffix: string;
  highlights: string[];
  sections: LegalSectionDefinition[];
  faq: Array<{ question: string; answer: string }>;
};

function resolveParagraph(paragraph: LegalParagraph): string {
  if (typeof paragraph === "string") return paragraph;
  if (paragraph.dynamic === "complaintPlazosTerminosReferencia") {
    return complaintPlazosTerminosReferencia();
  }
  return "";
}

function buildSections(definitions: LegalSectionDefinition[]) {
  const inputs = definitions.map((section) => {
    if (section.includeProviderId) {
      const trailing = section.paragraphs.map(resolveParagraph).join(" ");
      return providerLegalSection(section.title, trailing);
    }
    return [section.title, ...section.paragraphs.map(resolveParagraph)] as const;
  });
  return legalSections(...inputs);
}

export function buildLegalPageFromDefinition(definition: LegalPageDefinition): InfoContent {
  return buildLegalPage({
    title: definition.title,
    intro: definition.intro,
    accent: definition.accent,
    note: legalUpdatedNote(definition.noteSuffix),
    highlights: definition.highlights,
    sections: buildSections(definition.sections),
    faq: legalFaqs(
      ...definition.faq.map((item) => [item.question, item.answer] as const),
    ),
  });
}
