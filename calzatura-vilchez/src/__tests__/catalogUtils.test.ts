import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import {
  countProductsForCategory,
  normalizeCategorySlug,
  productMatchesBrandSlug,
  productMatchesCategory,
  productMatchesSearch,
  productMatchesTaxonomy,
  resolvePathFacetSlug,
  slugifyCatalogValue,
  toPublicCategorySlug,
} from "@/utils/catalog";

function product(partial: Partial<Product> = {}): Product {
  return {
    id: "p1",
    nombre: "Zapatilla Urbana",
    descripcion: "Cuero negro",
    marca: "Nike",
    categoria: "dama",
    precio: 199,
    stock: 5,
    destacado: false,
    tipoCalzado: "zapatillas",
    color: "negro",
    ...partial,
  } as Product;
}

describe("catalog utils", () => {
  it("normaliza slugs y categorías públicas", () => {
    expect(slugifyCatalogValue("  Niña & Co. ")).toBe("nina-co");
    expect(normalizeCategorySlug("mujer")).toBe("dama");
    expect(toPublicCategorySlug("dama")).toBe("mujer");
  });

  it("filtra por categoría y marca", () => {
    const items = [product({ categoria: "dama" }), product({ categoria: "hombre" })];
    expect(countProductsForCategory(items, "mujer")).toBe(1);
    expect(productMatchesCategory("dama", "todos")).toBe(true);
    expect(productMatchesBrandSlug(product({ marca: "Adidas" }), "adidas")).toBe(true);
  });

  it("busca por término y destacados", () => {
    expect(productMatchesSearch(product(), "nike")).toBe(true);
    expect(productMatchesSearch(product({ destacado: true, stock: 2 }), "oferta")).toBe(true);
    expect(productMatchesSearch(product(), "inexistente-xyz")).toBe(false);
  });

  it("aplica taxonomía y path facet", () => {
    expect(productMatchesTaxonomy(product({ tipoCalzado: "zapatillas" }), "tipo", "zapatillas")).toBe(true);
    expect(productMatchesTaxonomy(product({ destacado: true, stock: 1 }), "promocion", "destacados")).toBe(true);
    expect(resolvePathFacetSlug("zapatillas")).toEqual({ key: "tipo", value: "zapatillas" });
    expect(resolvePathFacetSlug("")).toBeNull();
  });
});
