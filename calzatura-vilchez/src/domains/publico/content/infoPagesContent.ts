import { INFO_ROUTES } from "@/routes/paths";
import {
  AYUDA_INFO_PAGES,
  BENEFICIOS_INFO_PAGES,
  CORPORATIVO_INFO_PAGES,
} from "./infoPagesGridContent";
import { LEGAL_INFO_PAGES } from "./infoPagesLegalContent";
import type { InfoContent, InfoPageKey } from "./infoPageTypes";

export type { InfoContent, InfoFaqItem, InfoPageKey, InfoSection } from "./infoPageTypes";
export { LEGAL_PROSE_PAGE_KEYS } from "./infoPageTypes";

export const INFO_CONTENT: Record<InfoPageKey, InfoContent> = {
  ...CORPORATIVO_INFO_PAGES,
  ...LEGAL_INFO_PAGES,
  ...AYUDA_INFO_PAGES,
  ...BENEFICIOS_INFO_PAGES,
};

export const PAGE_ROUTE_MAP: Record<InfoPageKey, string> = {
  quienesSomos: INFO_ROUTES.corporativoQuienesSomos,
  nuestraHistoria: INFO_ROUTES.corporativoNuestraHistoria,
  mundoVilchez: INFO_ROUTES.corporativoMundoVilchez,
  terminos: INFO_ROUTES.legalTerminos,
  privacidad: INFO_ROUTES.legalPrivacidad,
  politicaCookies: INFO_ROUTES.legalCookies,
  libroReclamaciones: INFO_ROUTES.legalLibroReclamaciones,
  contactanos: INFO_ROUTES.ayudaContacto,
  rastreoPedido: INFO_ROUTES.ayudaRastreoPedido,
  preguntasFrecuentes: INFO_ROUTES.ayudaPreguntasFrecuentes,
  cambios: INFO_ROUTES.ayudaCambios,
  clubVilchez: INFO_ROUTES.beneficiosClubVilchez,
  cuotas: INFO_ROUTES.beneficiosCuotas,
};

export function infoContentEntries(): Array<[InfoPageKey, InfoContent]> {
  return Object.entries(INFO_CONTENT) as Array<[InfoPageKey, InfoContent]>;
}
