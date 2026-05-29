import { providerIdentificationParagraphs } from "@/config/businessContact";
import {
  buildInfoProsePage,
  legalSections,
  type LegalSectionInput,
} from "../infoPageBuilders";
import type { InfoContent, InfoFaqItem } from "../infoPageTypes";

const PROVIDER_ID_BODY = providerIdentificationParagraphs();

type LegalPageConfig = Omit<Parameters<typeof buildInfoProsePage>[0], "group" | "kicker">;

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
  return [sectionTitle, ...PROVIDER_ID_BODY, trailingParagraph];
}

export function legalUpdatedNote(suffix: string): string {
  return `Última actualización: 26 de mayo de 2026. ${suffix}`;
}

export { legalSections, PROVIDER_ID_BODY };
