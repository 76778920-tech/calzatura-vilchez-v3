import { providerIdentificationParagraphs } from "@/config/businessContact";
import type { InfoContent, InfoFaqItem, InfoSection } from "./infoPageTypes";

const LEGAL_PROVIDER_ID_BODY = providerIdentificationParagraphs();

type LegalPageConfig = {
  title: string;
  intro: string;
  accent: string;
  note: string;
  highlights: readonly string[];
  sections: InfoSection[];
  faq?: readonly InfoFaqItem[];
};

/** [título, ...párrafos] — evita repetir `{ title, body }` en páginas legales. */
export type LegalSectionInput = readonly [title: string, ...paragraphs: string[]];

export function legalSections(...sections: LegalSectionInput[]): InfoSection[] {
  return sections.map(([title, ...body]) => ({ title, body: [...body] }));
}

export function buildLegalPage(config: LegalPageConfig): InfoContent {
  return buildInfoProsePage({ group: "legal", kicker: "Legal", ...config });
}

export function legalFaqs(...pairs: readonly (readonly [string, string])[]): InfoFaqItem[] {
  return pairs.map(([question, answer]) => ({ question, answer }));
}

export function providerLegalSection(
  sectionTitle: string,
  trailingParagraph: string,
): LegalSectionInput {
  return [sectionTitle, ...LEGAL_PROVIDER_ID_BODY, trailingParagraph];
}

export function legalUpdatedNote(suffix: string): string {
  return `Última actualización: 26 de mayo de 2026. ${suffix}`;
}

export function buildInfoProsePage(config: {
  group: InfoContent["group"];
  kicker: string;
  title: string;
  intro: string;
  accent: string;
  note: string;
  highlights: readonly string[];
  sections: InfoSection[];
  faq?: readonly InfoFaqItem[];
}): InfoContent {
  return {
    group: config.group,
    kicker: config.kicker,
    title: config.title,
    intro: config.intro,
    accent: config.accent,
    note: config.note,
    highlights: [...config.highlights],
    sections: config.sections,
    faq: config.faq ? [...config.faq] : undefined,
  };
}

export type InfoBlock = {
  title: string;
  paragraphs: readonly [string, string];
};

export function buildInfoGridPage(config: {
  group: InfoContent["group"];
  kicker: string;
  title: string;
  intro: string;
  accent: string;
  note: string;
  highlights: readonly [string, string, string];
  blocks: readonly [InfoBlock, InfoBlock];
  faq?: readonly [InfoFaqItem, InfoFaqItem];
}): InfoContent {
  const sections: InfoSection[] = config.blocks.map((block) => ({
    title: block.title,
    body: [...block.paragraphs],
  }));

  return {
    group: config.group,
    kicker: config.kicker,
    title: config.title,
    intro: config.intro,
    accent: config.accent,
    note: config.note,
    highlights: [...config.highlights],
    sections,
    faq: config.faq ? [...config.faq] : undefined,
  };
}
