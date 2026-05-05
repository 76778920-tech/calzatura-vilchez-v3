import { describe, it, expect } from "vitest";
import {
  normalizeEstiloField,
  orderedStyleTokensFromCsv,
  validateCommercialProductDraft,
} from "@/domains/productos/utils/commercialRules";

describe("orderedStyleTokensFromCsv / normalizeEstiloField", () => {
  it("ordena y deduplica según STYLE_OPTIONS", () => {
    expect(orderedStyleTokensFromCsv("Weekend, Urbanas, Weekend")).toEqual(["Urbanas", "Weekend"]);
    expect(normalizeEstiloField("Casuales, Urbanas")).toBe("Urbanas,Casuales");
  });

  it("vacío → undefined", () => {
    expect(normalizeEstiloField("  ,  ")).toBeUndefined();
    expect(normalizeEstiloField(undefined)).toBeUndefined();
  });
});

describe("validateCommercialProductDraft — estilo CSV", () => {
  const base = {
    categoria: "hombre",
    tipoCalzado: "Zapatillas",
    precio: 72.5,
    costoCompra: 50,
    margenMinimo: 25,
    margenObjetivo: 45,
    margenMaximo: 75,
    material: "Cuero",
  };

  it("acepta varios estilos compatibles con el tipo", () => {
    const err = validateCommercialProductDraft({
      ...base,
      estilo: "Urbanas,Casuales",
    });
    expect(err).toEqual([]);
  });

  it("rechaza un token inválido en la lista", () => {
    const err = validateCommercialProductDraft({
      ...base,
      estilo: "Urbanas,Fantasma",
    });
    expect(err.some((m) => m.includes("Fantasma"))).toBe(true);
  });

  it("rechaza un token incompatible con el tipo", () => {
    const err = validateCommercialProductDraft({
      ...base,
      estilo: "Urbanas,Ejecutivo",
    });
    expect(err.some((m) => m.includes("Ejecutivo"))).toBe(true);
  });
});
