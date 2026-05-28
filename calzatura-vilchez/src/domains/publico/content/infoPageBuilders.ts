import type { InfoContent, InfoFaqItem, InfoSection } from "./infoPageTypes";

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
