export type InfoSection = {
  title: string;
  body: string[];
};

export type InfoFaqItem = {
  question: string;
  answer: string;
};

export type InfoContent = {
  group: "corporativo" | "legal" | "ayuda" | "beneficios";
  kicker: string;
  title: string;
  intro: string;
  accent: string;
  note: string;
  highlights: string[];
  sections: InfoSection[];
  faq?: InfoFaqItem[];
};

export type InfoPageKey =
  | "quienesSomos"
  | "nuestraHistoria"
  | "mundoVilchez"
  | "terminos"
  | "privacidad"
  | "politicaCookies"
  | "libroReclamaciones"
  | "contactanos"
  | "rastreoPedido"
  | "preguntasFrecuentes"
  | "cambios"
  | "clubVilchez"
  | "cuotas";

export const LEGAL_PROSE_PAGE_KEYS = new Set<InfoPageKey>([
  "terminos",
  "privacidad",
  "politicaCookies",
  "libroReclamaciones",
]);
