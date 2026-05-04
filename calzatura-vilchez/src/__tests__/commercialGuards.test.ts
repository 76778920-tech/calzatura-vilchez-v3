import { describe, expect, it } from "vitest";
import { describeCommercialDraftError } from "@/domains/productos/utils/commercialRules";

// Simula el objeto error que devuelve el cliente Supabase cuando un trigger
// de BD lanza RAISE EXCEPTION. PostgrestError no es instanceof Error:
// tiene { message, code, details, hint } como propiedades planas.
function supabaseError(message: string, code = "P0001") {
  return { message, code, details: null, hint: null };
}

describe("describeCommercialDraftError — mapea errores de triggers BD a mensajes legibles", () => {
  it("cv_guard_producto_tipo → tipo de calzado no corresponde a categoría", () => {
    const err = supabaseError('cv_guard_producto_tipo: tipo "Zapatillas" no válido para categoría "bebe"');
    expect(describeCommercialDraftError(err)).toBe(
      "El tipo de calzado no corresponde a la categoría seleccionada."
    );
  });

  it("cv_guard_producto_estilo → estilo no corresponde a tipo", () => {
    const err = supabaseError('cv_guard_producto_estilo: estilo "Ejecutivo" no corresponde al tipo "Sandalias"');
    expect(describeCommercialDraftError(err)).toBe(
      "El estilo seleccionado no corresponde al tipo de calzado."
    );
  });

  it("cv_guard_producto_estilo → estilo no reconocido", () => {
    const err = supabaseError('cv_guard_producto_estilo: estilo "Playero" no es un valor comercial permitido');
    expect(describeCommercialDraftError(err)).toBe(
      "El estilo seleccionado no corresponde al tipo de calzado."
    );
  });

  it("cv_guard_producto_material → material fuera de paleta", () => {
    const err = supabaseError('cv_guard_producto_material: "Plástico" no pertenece a la paleta comercial permitida');
    expect(describeCommercialDraftError(err)).toBe(
      "El material seleccionado no pertenece a la paleta comercial permitida."
    );
  });

  it("cv_guard_producto_precio → precio fuera de rango", () => {
    const err = supabaseError("cv_guard_producto_precio: precio 200 fuera del rango comercial [75, 105]");
    expect(describeCommercialDraftError(err)).toBe(
      "El precio público quedó fuera del rango comercial permitido."
    );
  });

  it("cv_guard_producto_finanzas → márgenes desordenados", () => {
    const err = supabaseError("cv_guard_producto_finanzas: márgenes desordenados (min=50, obj=30, max=75)");
    expect(describeCommercialDraftError(err)).toBe(
      "Los márgenes o el rango de precio no coinciden con la regla comercial del producto."
    );
  });

  it("cv_guard_producto_finanzas → costo inválido", () => {
    const err = supabaseError("cv_guard_producto_finanzas: costoCompra debe ser mayor que cero");
    expect(describeCommercialDraftError(err)).toBe(
      "Los márgenes o el rango de precio no coinciden con la regla comercial del producto."
    );
  });

  it("error desconocido → cadena vacía (sin mapeo)", () => {
    expect(describeCommercialDraftError({ message: "network error", code: "500" })).toBe("");
    expect(describeCommercialDraftError(new Error("algo falló"))).toBe("");
    expect(describeCommercialDraftError(null)).toBe("");
    expect(describeCommercialDraftError(undefined)).toBe("");
  });
});
