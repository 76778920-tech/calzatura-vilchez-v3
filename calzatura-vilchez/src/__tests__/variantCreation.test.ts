import { describe, expect, it } from "vitest";
import { buildVariantCreationPlan, type VariantDraft } from "@/domains/productos/utils/variantCreation";

function makeDraft(index: number, color: string): VariantDraft {
  return {
    index,
    color,
    imagenes: [`https://example.com/${color.toLowerCase()}-1.png`, `https://example.com/${color.toLowerCase()}-2.png`],
    tallaStock: { "37": index + 1, "38": index + 2, "39": 0 },
    totalStock: index + 3,
  };
}

const base = {
  codigoBase: "VI-001",
  familiaId: "fam-123",
  nombre: "Zapato formal negro",
  precio: 199.9,
  descripcion: "Modelo elegante",
  categoria: "hombre",
  tipoCalzado: "Zapatos de Vestir",
  marca: "Calzatura Vilchez",
  material: "Cuero",
  estilo: "Formal",
  destacado: true,
  descuento: 20 as const,
};

describe("buildVariantCreationPlan", () => {
  it.each([
    [["Negro"], ["VI-001-1"]],
    [["Negro", "Blanco"], ["VI-001-1", "VI-001-2"]],
    [["Negro", "Blanco", "Camel"], ["VI-001-1", "VI-001-2", "VI-001-3"]],
    [["Negro", "Blanco", "Camel", "Rojo"], ["VI-001-1", "VI-001-2", "VI-001-3", "VI-001-4"]],
    [["Negro", "Blanco", "Camel", "Rojo", "Azul"], ["VI-001-1", "VI-001-2", "VI-001-3", "VI-001-4", "VI-001-5"]],
  ])("genera %s segun la cantidad de colores", (colors, expectedCodes) => {
    const drafts = colors.map((color, index) => makeDraft(index, color));
    const plan = buildVariantCreationPlan(base, drafts);

    expect(plan).toHaveLength(colors.length);
    expect(plan.map((item) => item.generatedCode)).toEqual(expectedCodes);
    expect(new Set(plan.map((item) => item.product.familiaId))).toEqual(new Set([base.familiaId]));
    expect(plan.map((item) => item.product.color)).toEqual(colors);
  });

  it("mantiene imagenes y tallaStock independientes por cada color", () => {
    const drafts = [makeDraft(0, "Negro"), makeDraft(1, "Blanco")];
    const plan = buildVariantCreationPlan(base, drafts);

    expect(plan[0].product.imagenes).toEqual([
      "https://example.com/negro-1.png",
      "https://example.com/negro-2.png",
    ]);
    expect(plan[1].product.imagenes).toEqual([
      "https://example.com/blanco-1.png",
      "https://example.com/blanco-2.png",
    ]);
    expect(plan[0].product.tallaStock).toEqual({ "37": 1, "38": 2 });
    expect(plan[1].product.tallaStock).toEqual({ "37": 2, "38": 3 });
  });

  it("falla si una variante activa no tiene imagen", () => {
    const drafts = [
      {
        ...makeDraft(0, "Negro"),
        imagenes: [],
      },
    ];

    expect(() => buildVariantCreationPlan(base, drafts)).toThrow(/Color 1: agrega al menos una imagen/i);
  });
});
