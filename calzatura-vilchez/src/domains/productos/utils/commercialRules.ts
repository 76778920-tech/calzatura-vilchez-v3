// SINCRONIZACIÓN TS ↔ BD: las reglas de esta sección deben mantenerse
// alineadas con los triggers y CHECKs de la migración
// supabase/migrations/20260502020000_add_commercial_guardrails.sql.
// Cualquier cambio de negocio (nuevas categorías, tipos, materiales, etc.)
// debe propagarse en AMBOS lados y versionarse como nueva migración.
// Nota: service-role y COPY de Supabase pueden eludir triggers; esos
// caminos son responsabilidad de proceso, no de esta capa.
import { calculatePriceRange } from "@/domains/ventas/services/finance";

export const CATEGORY_SIZES: Record<string, string[]> = {
  hombre: ["37", "38", "39", "40", "41", "42", "43", "44", "45"],
  dama: ["32", "33", "34", "35", "36", "37", "38", "39", "40"],
  juvenil: ["33", "34", "35", "36", "37", "38"],
  nino: ["24", "25", "26", "27", "28", "29", "30", "31", "32"],
  bebe: ["18", "19", "20", "21", "22"],
};

export const CATEGORIAS = Object.keys(CATEGORY_SIZES);

export const FOOTWEAR_TYPES_BY_CATEGORY: Record<string, string[]> = {
  dama: [
    "Zapatillas",
    "Sandalias",
    "Zapatos Casuales",
    "Zapatos de Vestir",
    "Mocasines",
    "Botas y Botines",
    "Ballerinas",
    "Pantuflas",
    "Flip Flops",
  ],
  hombre: [
    "Zapatillas",
    "Zapatos de Vestir",
    "Zapatos Casuales",
    "Sandalias",
    "Botines",
    "Zapatos de Seguridad",
    "Pantuflas",
  ],
  nino: ["Escolar", "Sandalias", "Zapatillas", "Zapatos"],
  juvenil: ["Escolar", "Zapatillas", "Sandalias", "Zapatos", "Botines"],
  bebe: ["Zapatos", "Sandalias", "Zapatillas", "Pantuflas"],
};

export const MATERIAL_PRESETS = [
  "Cuero",
  "Gamuza",
  "Charol",
  "Nubuk",
  "Sintético",
  "Textil",
] as const;

export const STYLE_OPTIONS = [
  "Urbanas",
  "Deportivas",
  "Casuales",
  "Outdoor",
  "Ejecutivo",
  "Weekend",
] as const;

const STYLE_ALLOWED_TYPES: Record<string, string[]> = {
  Urbanas: ["Zapatillas"],
  Deportivas: ["Zapatillas"],
  Casuales: ["Zapatillas", "Zapatos Casuales", "Zapatos", "Sandalias", "Botines"],
  Outdoor: ["Zapatillas", "Botines"],
  Ejecutivo: ["Zapatos de Vestir", "Mocasines", "Zapatos", "Escolar"],
  Weekend: ["Zapatillas", "Zapatos Casuales", "Botines", "Sandalias", "Mocasines"],
};

export type CommercialDraft = {
  categoria: string;
  tipoCalzado?: string;
  estilo?: string;
  precio: number;
  costoCompra: number;
  margenMinimo: number;
  margenObjetivo: number;
  margenMaximo: number;
  material?: string;
};

export function normalizeAdminCategory(category = "hombre") {
  if (category === "mujer") return "dama";
  return CATEGORY_SIZES[category] ? category : "hombre";
}

export function sizesForCategory(category: string) {
  return CATEGORY_SIZES[category] ?? [];
}

export function footwearTypesForCategory(category: string) {
  return FOOTWEAR_TYPES_BY_CATEGORY[category] ?? [];
}

export function styleIsAllowedForType(tipoCalzado = "", estilo = "") {
  const normalizedStyle = estilo.trim();
  if (!normalizedStyle) return true;
  const allowedTypes = STYLE_ALLOWED_TYPES[normalizedStyle];
  return Array.isArray(allowedTypes) && allowedTypes.includes(tipoCalzado.trim());
}

export function materialIsAllowed(material = "") {
  const normalized = material.trim();
  if (!normalized) return true;
  return MATERIAL_PRESETS.includes(normalized as (typeof MATERIAL_PRESETS)[number]);
}

export function validateCommercialProductDraft(draft: CommercialDraft): string[] {
  const errors: string[] = [];
  const categoria = normalizeAdminCategory(draft.categoria || "");
  const tipoCalzado = draft.tipoCalzado?.trim() || "";
  const estilo = draft.estilo?.trim() || "";
  const material = draft.material?.trim() || "";

  if (!draft.categoria || !CATEGORY_SIZES[categoria]) {
    errors.push("Selecciona una categoría comercial válida.");
  }

  if (!tipoCalzado) {
    errors.push("Selecciona el tipo de calzado.");
  } else if (!footwearTypesForCategory(categoria).includes(tipoCalzado)) {
    errors.push("El tipo de calzado no corresponde a la categoría seleccionada.");
  }

  if (estilo) {
    if (!STYLE_OPTIONS.includes(estilo as (typeof STYLE_OPTIONS)[number])) {
      errors.push("Selecciona un estilo comercial válido.");
    } else if (!styleIsAllowedForType(tipoCalzado, estilo)) {
      errors.push("El estilo seleccionado no corresponde al tipo de calzado.");
    }
  }

  if (!materialIsAllowed(material)) {
    errors.push("Selecciona un material permitido en la paleta comercial.");
  }

  if ((Number(draft.costoCompra) || 0) <= 0) {
    errors.push("Registra el costo real de compra.");
  }

  const marginMin = Number(draft.margenMinimo) || 0;
  const marginTarget = Number(draft.margenObjetivo) || 0;
  const marginMax = Number(draft.margenMaximo) || 0;

  if (marginMin > marginTarget || marginTarget > marginMax) {
    errors.push("Ordena los márgenes: mínimo, objetivo y máximo.");
  }

  const range = calculatePriceRange(
    Number(draft.costoCompra) || 0,
    marginMin,
    marginTarget,
    marginMax
  );
  const precio = Number(draft.precio) || 0;

  if (precio <= 0) {
    errors.push("Registra un precio público mayor que cero.");
  } else if (precio < range.precioMinimo || precio > range.precioMaximo) {
    errors.push("El precio público debe quedar dentro del rango comercial calculado.");
  }

  return errors;
}

export function describeCommercialDraftError(error: unknown) {
  const message = typeof error === "object" && error && "message" in error
    ? String(error.message)
    : "";

  if (message.includes("cv_guard_producto_tipo")) {
    return "El tipo de calzado no corresponde a la categoría seleccionada.";
  }
  if (message.includes("cv_guard_producto_estilo")) {
    return "El estilo seleccionado no corresponde al tipo de calzado.";
  }
  if (message.includes("cv_guard_producto_material")) {
    return "El material seleccionado no pertenece a la paleta comercial permitida.";
  }
  if (message.includes("cv_guard_producto_precio")) {
    return "El precio público quedó fuera del rango comercial permitido.";
  }
  if (message.includes("cv_guard_producto_finanzas")) {
    return "Los márgenes o el rango de precio no coinciden con la regla comercial del producto.";
  }

  return "";
}
