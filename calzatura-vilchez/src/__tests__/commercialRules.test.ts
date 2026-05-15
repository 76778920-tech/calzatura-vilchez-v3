/**
 * TC-COMMERCIAL — Tests para src/domains/productos/utils/commercialRules.ts
 *
 * Semáforo:
 *   🟢 validateCommercialProductDraft — precio fuera de rango, margen invertido — VERIFICADO
 *   🟢 normalizeAdminCategory — alias "mujer"→"dama", unknown→"hombre" — VERIFICADO
 *   🟢 styleIsAllowedForType — combinaciones inválidas llegan a producción — VERIFICADO
 *   🟢 materialIsAllowed — material fuera de paleta pasa silencioso — VERIFICADO
 *   🟢 sizesForCategory / footwearTypesForCategory — datos estáticos correctos — VERIFICADO
 */
import { describe, it, expect } from "vitest";
import {
  normalizeAdminCategory,
  sizesForCategory,
  footwearTypesForCategory,
  styleIsAllowedForType,
  materialIsAllowed,
  validateCommercialProductDraft,
  orderedStyleTokensFromCsv,
  normalizeEstiloField,
  describeCommercialDraftError,
  type CommercialDraft,
} from "@/domains/productos/utils/commercialRules";

// ─── normalizeAdminCategory ───────────────────────────────────────────────────
describe("normalizeAdminCategory", () => {
  it("convierte 'mujer' en 'dama' (alias histórico)", () => {
    expect(normalizeAdminCategory("mujer")).toBe("dama");
  });

  it("devuelve 'hombre' para categoría desconocida", () => {
    expect(normalizeAdminCategory("zapateria")).toBe("hombre");
  });

  it("devuelve 'hombre' para cadena vacía", () => {
    expect(normalizeAdminCategory("")).toBe("hombre");
  });

  it("devuelve 'hombre' sin argumentos (default)", () => {
    expect(normalizeAdminCategory()).toBe("hombre");
  });

  it.each(["hombre", "dama", "juvenil", "nino", "bebe"])(
    "devuelve la categoría '%s' sin modificar",
    (cat) => expect(normalizeAdminCategory(cat)).toBe(cat)
  );
});

// ─── sizesForCategory ─────────────────────────────────────────────────────────
describe("sizesForCategory", () => {
  it("devuelve tallas de hombre (37-45)", () => {
    const sizes = sizesForCategory("hombre");
    expect(sizes).toContain("37");
    expect(sizes).toContain("45");
    expect(sizes).not.toContain("36");
  });

  it("devuelve tallas de bebé (18-22)", () => {
    const sizes = sizesForCategory("bebe");
    expect(sizes).toContain("18");
    expect(sizes).toContain("22");
    expect(sizes).not.toContain("23");
  });

  it("devuelve lista vacía para categoría desconocida", () => {
    expect(sizesForCategory("unknown")).toEqual([]);
  });
});

// ─── footwearTypesForCategory ─────────────────────────────────────────────────
describe("footwearTypesForCategory", () => {
  it("dama incluye Zapatillas y Sandalias", () => {
    const types = footwearTypesForCategory("dama");
    expect(types).toContain("Zapatillas");
    expect(types).toContain("Sandalias");
  });

  it("hombre NO incluye Ballerinas", () => {
    expect(footwearTypesForCategory("hombre")).not.toContain("Ballerinas");
  });

  it("devuelve lista vacía para categoría desconocida", () => {
    expect(footwearTypesForCategory("unknown")).toEqual([]);
  });
});

// ─── styleIsAllowedForType ────────────────────────────────────────────────────
describe("styleIsAllowedForType", () => {
  it("Urbanas es válido para Zapatillas", () => {
    expect(styleIsAllowedForType("Zapatillas", "Urbanas")).toBe(true);
  });

  it("Urbanas NO es válido para Zapatos de Vestir", () => {
    expect(styleIsAllowedForType("Zapatos de Vestir", "Urbanas")).toBe(false);
  });

  it("Ejecutivo es válido para Zapatos de Vestir", () => {
    expect(styleIsAllowedForType("Zapatos de Vestir", "Ejecutivo")).toBe(true);
  });

  it("sin estilo siempre es válido (cualquier tipo)", () => {
    expect(styleIsAllowedForType("Zapatos de Vestir", "")).toBe(true);
    expect(styleIsAllowedForType("Zapatillas", "")).toBe(true);
  });

  it("estilo inválido (no existe) devuelve false", () => {
    expect(styleIsAllowedForType("Zapatillas", "Glamour")).toBe(false);
  });

  it("Deportivas es válido para Zapatillas", () => {
    expect(styleIsAllowedForType("Zapatillas", "Deportivas")).toBe(true);
  });

  it("Weekend es válido para Botines", () => {
    expect(styleIsAllowedForType("Botines", "Weekend")).toBe(true);
  });
});

// ─── materialIsAllowed ────────────────────────────────────────────────────────
describe("materialIsAllowed", () => {
  it.each(["Cuero", "Gamuza", "Charol", "Nubuk", "Sintético", "Textil"])(
    "permite material de la paleta: %s",
    (mat) => expect(materialIsAllowed(mat)).toBe(true)
  );

  it("rechaza material fuera de paleta", () => {
    expect(materialIsAllowed("Plástico")).toBe(false);
    expect(materialIsAllowed("Tela")).toBe(false);
  });

  it("permite material vacío (campo opcional)", () => {
    expect(materialIsAllowed("")).toBe(true);
    expect(materialIsAllowed("   ")).toBe(true);
  });
});

// ─── orderedStyleTokensFromCsv ────────────────────────────────────────────────
describe("orderedStyleTokensFromCsv", () => {
  it("devuelve lista vacía para string vacío", () => {
    expect(orderedStyleTokensFromCsv("")).toEqual([]);
  });

  it("devuelve lista vacía para undefined", () => {
    expect(orderedStyleTokensFromCsv(undefined)).toEqual([]);
  });

  it("mantiene el orden canónico de STYLE_OPTIONS independientemente del orden de entrada", () => {
    const result = orderedStyleTokensFromCsv("Weekend,Urbanas");
    expect(result).toEqual(["Urbanas", "Weekend"]);
  });

  it("ignora estilos desconocidos", () => {
    expect(orderedStyleTokensFromCsv("Urbanas,Glamour")).toEqual(["Urbanas"]);
  });

  it("no produce duplicados aunque el CSV los tenga", () => {
    expect(orderedStyleTokensFromCsv("Urbanas,Urbanas")).toEqual(["Urbanas"]);
  });
});

// ─── normalizeEstiloField ─────────────────────────────────────────────────────
describe("normalizeEstiloField", () => {
  it("devuelve undefined para string vacío", () => {
    expect(normalizeEstiloField("")).toBeUndefined();
  });

  it("devuelve CSV ordenado para múltiples estilos", () => {
    expect(normalizeEstiloField("Weekend,Urbanas")).toBe("Urbanas,Weekend");
  });

  it("devuelve undefined si solo hay estilos inválidos", () => {
    expect(normalizeEstiloField("Glamour,Fantasia")).toBeUndefined();
  });
});

// ─── validateCommercialProductDraft ──────────────────────────────────────────
function validDraft(overrides: Partial<CommercialDraft> = {}): CommercialDraft {
  return {
    categoria: "hombre",
    tipoCalzado: "Zapatillas",
    estilo: "Urbanas",
    precio: 120,
    costoCompra: 80,
    margenMinimo: 20,
    margenObjetivo: 45,
    margenMaximo: 80,
    material: "Cuero",
    ...overrides,
  };
}

describe("validateCommercialProductDraft", () => {
  it("draft válido no produce errores", () => {
    expect(validateCommercialProductDraft(validDraft())).toEqual([]);
  });

  it("categoría vacía produce error (unknown se normaliza a hombre silenciosamente)", () => {
    // normalizeAdminCategory("unknown") → "hombre" (sin error); sólo "" dispara la validación
    const errors = validateCommercialProductDraft(validDraft({ categoria: "" }));
    expect(errors.some((e) => e.includes("categoría"))).toBe(true);
  });

  it("tipo de calzado vacío produce error", () => {
    const errors = validateCommercialProductDraft(validDraft({ tipoCalzado: "" }));
    expect(errors.some((e) => e.includes("tipo"))).toBe(true);
  });

  it("tipo de calzado no pertenece a la categoría produce error", () => {
    // Ballerinas es de dama, no de hombre
    const errors = validateCommercialProductDraft(validDraft({ tipoCalzado: "Ballerinas" }));
    expect(errors.some((e) => e.includes("tipo de calzado no corresponde"))).toBe(true);
  });

  it("estilo incompatible con el tipo produce error", () => {
    // Ejecutivo no es válido para Zapatillas en la config actual... verifiquemos
    // Ejecutivo sí incluye Zapatos de Vestir y Mocasines pero no Zapatillas
    const errors = validateCommercialProductDraft(
      validDraft({ tipoCalzado: "Zapatos de Vestir", estilo: "Urbanas" })
    );
    expect(errors.some((e) => e.includes("estilo") || e.includes("Urbanas"))).toBe(true);
  });

  it("material fuera de paleta produce error", () => {
    const errors = validateCommercialProductDraft(validDraft({ material: "Plastico" }));
    expect(errors.some((e) => e.includes("material"))).toBe(true);
  });

  it("costo cero produce error", () => {
    const errors = validateCommercialProductDraft(validDraft({ costoCompra: 0 }));
    expect(errors.some((e) => e.includes("costo"))).toBe(true);
  });

  it("costo negativo produce error", () => {
    const errors = validateCommercialProductDraft(validDraft({ costoCompra: -50 }));
    expect(errors.some((e) => e.includes("costo"))).toBe(true);
  });

  it("márgenes en orden incorrecto (obj < min) producen error", () => {
    const errors = validateCommercialProductDraft(
      validDraft({ margenMinimo: 50, margenObjetivo: 30, margenMaximo: 80 })
    );
    expect(errors.some((e) => e.includes("márgenes"))).toBe(true);
  });

  it("precio cero produce error", () => {
    const errors = validateCommercialProductDraft(validDraft({ precio: 0 }));
    expect(errors.some((e) => e.includes("precio"))).toBe(true);
  });

  it("precio por debajo del rango comercial mínimo produce error", () => {
    // costoCompra=100, margenMin=20 → precioMinimo=120; precio=50 está por debajo
    const errors = validateCommercialProductDraft(
      validDraft({ costoCompra: 100, margenMinimo: 20, margenObjetivo: 40, margenMaximo: 60, precio: 50 })
    );
    expect(errors.some((e) => e.includes("rango comercial"))).toBe(true);
  });

  it("precio por encima del rango comercial máximo produce error", () => {
    // costoCompra=100, margenMax=60 → precioMaximo=160; precio=300 está por encima
    const errors = validateCommercialProductDraft(
      validDraft({ costoCompra: 100, margenMinimo: 20, margenObjetivo: 40, margenMaximo: 60, precio: 300 })
    );
    expect(errors.some((e) => e.includes("rango comercial"))).toBe(true);
  });

  it("sin estilo (campo opcional) no produce error", () => {
    const errors = validateCommercialProductDraft(validDraft({ estilo: "" }));
    expect(errors).toEqual([]);
  });

  it("sin material (campo opcional) no produce error", () => {
    const errors = validateCommercialProductDraft(validDraft({ material: "" }));
    expect(errors).toEqual([]);
  });

  it("alias 'mujer' para categoría es aceptado (normaliza a 'dama')", () => {
    const errors = validateCommercialProductDraft(
      validDraft({ categoria: "mujer", tipoCalzado: "Zapatillas", estilo: "Urbanas" })
    );
    expect(errors).toEqual([]);
  });

  it("puede devolver múltiples errores simultáneamente", () => {
    const errors = validateCommercialProductDraft(
      validDraft({ tipoCalzado: "", material: "Plastico", costoCompra: 0 })
    );
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it("márgenes cero no lanzan excepción (cubre rama falsy de || 0)", () => {
    const errors = validateCommercialProductDraft(
      validDraft({ margenMinimo: 0, margenObjetivo: 0, margenMaximo: 0, costoCompra: 100, precio: 100 })
    );
    expect(Array.isArray(errors)).toBe(true);
  });

  it("obj > max con min válido produce error de márgenes (segunda condición del ||)", () => {
    const errors = validateCommercialProductDraft(
      validDraft({ margenMinimo: 20, margenObjetivo: 90, margenMaximo: 80 })
    );
    expect(errors.some((e) => e.includes("márgenes"))).toBe(true);
  });
});

describe("describeCommercialDraftError", () => {
  it("mapea errores cv_guard de Supabase a mensajes de negocio", () => {
    expect(describeCommercialDraftError(new Error("cv_guard_producto_tipo: inválido"))).toBe(
      "El tipo de calzado no corresponde a la categoría seleccionada.",
    );
    expect(describeCommercialDraftError(new Error("cv_guard_producto_estilo: inválido"))).toBe(
      "El estilo seleccionado no corresponde al tipo de calzado.",
    );
    expect(describeCommercialDraftError(new Error("cv_guard_producto_material: inválido"))).toBe(
      "El material seleccionado no pertenece a la paleta comercial permitida.",
    );
    expect(describeCommercialDraftError(new Error("cv_guard_producto_precio: fuera"))).toBe(
      "El precio público quedó fuera del rango comercial permitido.",
    );
    expect(describeCommercialDraftError(new Error("cv_guard_producto_finanzas: márgenes"))).toBe(
      "Los márgenes o el rango de precio no coinciden con la regla comercial del producto.",
    );
  });

  it("error desconocido u objeto sin message devuelve cadena vacía", () => {
    expect(describeCommercialDraftError(new Error("otro error"))).toBe("");
    expect(describeCommercialDraftError(null)).toBe("");
    expect(describeCommercialDraftError({})).toBe("");
  });
});
