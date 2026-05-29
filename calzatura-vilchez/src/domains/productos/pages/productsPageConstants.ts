export const CATALOG_CAMPAIGN_ROTATION_MS = 9000;
export const CATALOG_PAGE_SIZE = 24;

export const CYBER_DISCOUNT_PILL_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Todo Cyber Wow", value: "all" },
  { label: "10 %", value: "10" },
  { label: "20 %", value: "20" },
  { label: "30 %", value: "30" },
];

export const COLOR_SWATCH_MAP: Record<string, string> = {
  negro: "#000000",
  blanco: "#f5f4f0",
  nude: "#d9d7b2",
  camel: "#bd7013",
  multicolor: "linear-gradient(90deg, #ff0000, #ff8c00, #ffee00, #00c853, #00b0ff, #3d00ff)",
  gris: "#8e8e8e",
  dorado: "#d4b11a",
  plata: "#bfbfbf",
  morado: "#a046bd",
  "azul-claro": "#9bc5d3",
  azul: "#322fb0",
  verde: "#0f8d0f",
  chocolate: "#8b5a07",
  marron: "#7b4b2a",
  rojo: "#ff2b1a",
  rosa: "#e9aaa7",
  "cafe-claro": "#c9aa58",
  guinda: "#6f1f2b",
  "petroleo-oscuro": "#27464c",
  "rose-gold": "#bf9f8c",
  amarillo: "#e5df2a",
  "verde-agua": "#13a394",
};

export const COLOR_SWATCH_ORDER = [
  "negro",
  "blanco",
  "nude",
  "camel",
  "multicolor",
  "gris",
  "dorado",
  "plata",
  "morado",
  "azul-claro",
  "azul",
  "verde",
  "chocolate",
  "marron",
  "rojo",
  "rosa",
  "cafe-claro",
  "guinda",
  "petroleo-oscuro",
  "rose-gold",
  "amarillo",
  "verde-agua",
] as const;

export function productCountLabel(count: number): string {
  const suffix = count === 1 ? "" : "s";
  return `${count} producto${suffix}`;
}
