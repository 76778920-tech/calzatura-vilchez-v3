import type { InfoContent, InfoPageKey } from "./infoPageTypes";
import { COOKIES_LEGAL_PAGE } from "./legal/infoLegalPoliticaCookies";
import { LIBRO_LEGAL_PAGE } from "./legal/infoLegalLibroReclamaciones";
import { PRIVACIDAD_LEGAL_PAGE } from "./legal/infoLegalPrivacidad";
import { TERMINOS_LEGAL_PAGE } from "./legal/infoLegalTerminos";

export const LEGAL_INFO_PAGES: Pick<
  Record<InfoPageKey, InfoContent>,
  "terminos" | "privacidad" | "politicaCookies" | "libroReclamaciones"
> = {
  terminos: TERMINOS_LEGAL_PAGE,
  privacidad: PRIVACIDAD_LEGAL_PAGE,
  politicaCookies: COOKIES_LEGAL_PAGE,
  libroReclamaciones: LIBRO_LEGAL_PAGE,
};
