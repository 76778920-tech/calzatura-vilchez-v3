import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/types";
import { buildCatalogModel } from "@/domains/productos/utils/productsPageCatalogModel";

function product(partial: Partial<Product> & Pick<Product, "id">): Product {
  return {
    nombre: "Zapato test",
    precio: 100,
    descripcion: "Cuero genuino",
    imagen: "/x.png",
    stock: 1,
    categoria: "hombre",
    ...partial,
  };
}

const baseRoute = {
  categoria: "todos" as const,
  vista: null as string | null,
  marca: "todas",
  marcaSlug: "",
  campana: "",
  promocion: "",
  coleccion: "",
  estilo: "",
  tipo: "",
  linea: "",
  segmento: "",
  color: "",
  rangoEdad: "",
  precio: "",
  talla: "",
  material: "",
  descuento: "",
  trimmedQuery: "",
};

describe("buildCatalogModel", () => {
  it("pagina y filtra productos en modo cliente", () => {
    const products = [
      product({ id: "1", categoria: "mujer", precio: 80, marca: "Nike" }),
      product({ id: "2", categoria: "hombre", precio: 120, marca: "Adidas" }),
      product({ id: "3", categoria: "mujer", precio: 200, marca: "Nike" }),
    ];
    const applyFacetFilter = vi.fn();

    const model = buildCatalogModel({
      products,
      browse: null,
      useBffBrowse: false,
      catalogPage: 1,
      route: { ...baseRoute, categoria: "mujer", precio: "range:70:150" },
      applyFacetFilter,
    });

    expect(model.catalogTotal).toBe(1);
    expect(model.pagedProducts).toHaveLength(1);
    expect(model.pagedProducts[0]?.id).toBe("1");
    expect(model.pageTitle).toContain("Mujer");
    expect(model.filterMenus.some((menu) => menu.key === "precio")).toBe(true);
    expect(model.activeFacets.length).toBeGreaterThan(0);
  });

  it("expone metadatos del browse en modo BFF", () => {
    const applyFacetFilter = vi.fn();
    const browseProduct = product({ id: "bff-1", categoria: "hombre", precio: 99 });

    const model = buildCatalogModel({
      products: [],
      browse: {
        products: [browseProduct],
        total: 1,
        totalPages: 1,
        familyGroupCounts: {},
        meta: {
          marcas: [{ label: "Nike", value: "nike" }],
          availableSizes: ["40", "41"],
          priceBounds: { min: 50, max: 200, low: 80, high: 150 },
        },
      },
      useBffBrowse: true,
      catalogPage: 1,
      route: baseRoute,
      applyFacetFilter,
    });

    expect(model.pagedProducts).toEqual([browseProduct]);
    expect(model.catalogTotal).toBe(1);
    expect(model.marcas).toEqual([{ label: "Nike", value: "nike" }]);
    expect(model.availableSizes).toEqual(["40", "41"]);
    expect(model.priceBounds).toEqual({ min: 50, max: 200, low: 80, high: 150 });
  });
});
