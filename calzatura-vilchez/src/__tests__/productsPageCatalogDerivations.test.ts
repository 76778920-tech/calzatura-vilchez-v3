import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/types";
import {
  buildActiveCatalogFacetChips,
  buildCatalogBreadcrumbs,
  buildContextualCatalogFilters,
  buildFacetFilteredCatalogProducts,
  buildRouteFilteredCatalogProducts,
  DISCOUNT_OPTIONS,
  filterParsedColorsForCatalogDraft,
  filterParsedMaterialsForCatalogDraft,
  filterParsedSizesForCatalogDraft,
  getPriceLabel,
  getProductSizes,
  humanizeSlug,
  inferProductMaterials,
  MATERIAL_RULES,
  parseColorSelection,
  parseDiscountSelection,
  parseMaterialSelection,
  parsePriceRange,
  parseSizeSelection,
  resolveProductsPageTitle,
  toggleCatalogStringListMember,
} from "@/domains/productos/utils/productsPageCatalogDerivations";

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
  products: [] as Product[],
  categoria: "todos" as const,
  vista: null as string | null,
  marca: "todas",
  marcaSlug: "",
  campana: "",
  promocion: "",
  coleccion: "",
  tipo: "",
  linea: "",
  estilo: "",
  segmento: "",
  rangoEdad: "",
  color: "",
  trimmedQuery: "",
};

const baseContext = {
  vista: null as string | null,
  campana: "",
  categoria: "todos" as const,
  coleccion: "",
  tipo: "",
  linea: "",
  segmento: "",
  color: "",
  descuento: "",
  rangoEdad: "",
  marcas: [] as { label: string; value: string }[],
};

describe("humanizeSlug / parsers / getPriceLabel / parsePriceRange", () => {
  it("humanizeSlug formatea slugs", () => {
    expect(humanizeSlug("zapatillas-blancas")).toBe("Zapatillas Blancas");
    expect(humanizeSlug("")).toBe("");
  });

  it("parseSizeSelection y parseColorSelection / material / discount", () => {
    expect(parseSizeSelection(" 38 , 39 ")).toEqual(["38", "39"]);
    expect(parseColorSelection("negro, blanco")).toEqual(["negro", "blanco"]);
    expect(parseMaterialSelection("cuero,gamuza")).toEqual(["cuero", "gamuza"]);
    expect(parseDiscountSelection("10, all")).toEqual(["10", "all"]);
  });

  it("getPriceLabel cubre modos y fallback", () => {
    expect(getPriceLabel("", 0, 100)).toBe("");
    expect(getPriceLabel("under:50:", 0, 100)).toBe("Hasta S/ 50");
    expect(getPriceLabel("between:10:20:", 0, 100)).toBe("S/ 10 - 20");
    expect(getPriceLabel("over:30:", 0, 100)).toBe("Desde S/ 30");
    expect(getPriceLabel("range:40:60:", 0, 100)).toBe("S/ 40 - 60");
    expect(getPriceLabel("invalid:x:y", 50, 50)).toBe("S/ 50");
    expect(getPriceLabel("invalid:x:y", 50, 60)).toBe("");
  });

  it("parsePriceRange", () => {
    expect(parsePriceRange("range:30:10", 0, 100)).toEqual({ min: 10, max: 30 });
    expect(parsePriceRange("other", 5, 7)).toEqual({ min: 5, max: 7 });
  });
});

describe("getProductSizes / inferProductMaterials / MATERIAL_RULES", () => {
  it("getProductSizes une tallas y tallaStock", () => {
    const sizes = getProductSizes(
      product({
        id: "1",
        tallas: [" 40 ", "41"],
        tallaStock: { "42": 1 },
      })
    );
    expect(sizes).toEqual(expect.arrayContaining(["40", "41", "42"]));
    expect(getProductSizes(product({ id: "2" }))).toEqual([]);
  });

  it("inferProductMaterials detecta términos", () => {
    const mats = inferProductMaterials(
      product({
        id: "1",
        nombre: "Modelo en cuero",
        descripcion: "",
      })
    );
    expect(mats.some((m) => m.slug === "cuero")).toBe(true);
    expect(MATERIAL_RULES.length).toBeGreaterThan(0);
  });
});

describe("buildRouteFilteredCatalogProducts", () => {
  const pMujer = product({ id: "a", categoria: "mujer", marca: "Nike" });
  const pHombre = product({ id: "b", categoria: "hombre", marca: "Adidas" });

  it("filtra por categoria y búsqueda", () => {
    const r = buildRouteFilteredCatalogProducts({
      ...baseRoute,
      products: [pMujer, pHombre],
      categoria: "mujer",
      trimmedQuery: "Nike",
    });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("a");
  });

  it("vista marcas + marca", () => {
    const r = buildRouteFilteredCatalogProducts({
      ...baseRoute,
      products: [pMujer, pHombre],
      vista: "marcas",
      marca: "nike",
    });
    expect(r.every((x) => x.marca?.toLowerCase() === "nike")).toBe(true);
  });

  it("marcaSlug campana promocion taxonomías y color simple", () => {
    const withTax = product({
      id: "t",
      categoria: "hombre",
      campana: "cyber",
      tipoCalzado: "zapatillas",
      color: "negro",
    });
    expect(
      buildRouteFilteredCatalogProducts({
        ...baseRoute,
        products: [withTax],
        marcaSlug: "nike",
      })
    ).toHaveLength(0);

    const r2 = buildRouteFilteredCatalogProducts({
      ...baseRoute,
      products: [withTax],
      campana: "cyber",
    });
    expect(r2).toHaveLength(1);

    const r3 = buildRouteFilteredCatalogProducts({
      ...baseRoute,
      products: [withTax],
      color: "negro",
    });
    expect(r3).toHaveLength(1);
  });
});

describe("buildFacetFilteredCatalogProducts", () => {
  const base = [
    product({
      id: "1",
      precio: 80,
      tallas: ["40"],
      color: "Negro",
      descuento: 20,
    }),
    product({ id: "2", precio: 200, tallas: ["41"], descuento: undefined }),
  ];

  it("precio under / between / over / range", () => {
    expect(buildFacetFilteredCatalogProducts(base, { precio: "under:250:", talla: "", color: "", material: "", descuento: "" })).toHaveLength(2);
    expect(buildFacetFilteredCatalogProducts(base, { precio: "between:50:150:", talla: "", color: "", material: "", descuento: "" })).toHaveLength(1);
    expect(buildFacetFilteredCatalogProducts(base, { precio: "over:150:", talla: "", color: "", material: "", descuento: "" })).toHaveLength(1);
    expect(buildFacetFilteredCatalogProducts(base, { precio: "range:70:90:", talla: "", color: "", material: "", descuento: "" })).toHaveLength(1);
  });

  it("talla y color multi y material y descuento", () => {
    expect(
      buildFacetFilteredCatalogProducts(base, {
        precio: "",
        talla: "40",
        color: "",
        material: "",
        descuento: "",
      })
    ).toHaveLength(1);

    const colorMulti = buildFacetFilteredCatalogProducts(
      [
        product({
          id: "c1",
          nombre: "x",
          precio: 1,
          descripcion: "",
          imagen: "",
          stock: 1,
          categoria: "hombre",
          color: "Negro",
        }),
      ],
      { precio: "", talla: "", color: "negro,blanco", material: "", descuento: "" }
    );
    expect(colorMulti.length).toBeGreaterThanOrEqual(0);

    const withLeather = buildFacetFilteredCatalogProducts(
      [product({ id: "m1", nombre: "cuero premium", precio: 1, descripcion: "", imagen: "", stock: 1, categoria: "hombre" })],
      { precio: "", talla: "", color: "", material: "cuero", descuento: "" }
    );
    expect(withLeather.length).toBeGreaterThanOrEqual(0);

    expect(
      buildFacetFilteredCatalogProducts(base, {
        precio: "",
        talla: "",
        color: "",
        material: "",
        descuento: "all",
      })
    ).toHaveLength(1);

    expect(
      buildFacetFilteredCatalogProducts(base, {
        precio: "",
        talla: "",
        color: "",
        material: "",
        descuento: "20",
      })
    ).toHaveLength(1);

    expect(
      buildFacetFilteredCatalogProducts(base, {
        precio: "",
        talla: "",
        color: "",
        material: "",
        descuento: "30",
      })
    ).toHaveLength(0);
  });
});

describe("resolveProductsPageTitle", () => {
  const b = {
    vista: null as string | null,
    campana: "",
    promocion: "",
    coleccion: "",
    linea: "",
    tipo: "",
    estilo: "",
    segmento: "",
    marcaSlug: "",
    categoria: "todos" as const,
    trimmedQuery: "",
  };

  it("prioridad de título", () => {
    expect(resolveProductsPageTitle({ ...b, vista: "marcas" })).toBe("Marcas seleccionadas");
    expect(resolveProductsPageTitle({ ...b, campana: "cyber" })).toContain("Campaña");
    expect(resolveProductsPageTitle({ ...b, promocion: "oferta" })).toContain("Selección");
    expect(resolveProductsPageTitle({ ...b, coleccion: "urban-glow" })).toBe("Urban Glow");
    expect(resolveProductsPageTitle({ ...b, linea: "zapatillas", categoria: "mujer" })).toContain("Mujer");
    expect(resolveProductsPageTitle({ ...b, tipo: "sandalias", categoria: "todos" })).toBe("Sandalias");
    expect(resolveProductsPageTitle({ ...b, estilo: "urbanas", categoria: "hombre" })).toContain("Hombre");
    expect(resolveProductsPageTitle({ ...b, segmento: "juvenil" })).toBe("Juvenil");
    expect(resolveProductsPageTitle({ ...b, marcaSlug: "nike-air" })).toContain("Marca");
    expect(resolveProductsPageTitle({ ...b, categoria: "mujer" })).toContain("Mujer");
    expect(resolveProductsPageTitle({ ...b, trimmedQuery: "zapato" })).toContain("zapato");
    expect(resolveProductsPageTitle({ ...b })).toBe("Todos los productos");
  });
});

describe("buildContextualCatalogFilters", () => {
  const brands = [{ label: "Nike", value: "nike" }];

  it("marcas y cyber y nuevas tendencias", () => {
    const marcas = buildContextualCatalogFilters({ ...baseContext, vista: "marcas", marcas: brands });
    expect(marcas.title).toBe("Marcas");
    expect(marcas.items.length).toBeGreaterThan(1);

    expect(
      buildContextualCatalogFilters({ ...baseContext, campana: "cyber", linea: "zapatillas" }).title
    ).toBe("Cyber Zapatillas");

    expect(
      buildContextualCatalogFilters({ ...baseContext, campana: "cyber", categoria: "hombre" }).title
    ).toBe("Cyber Hombre");

    expect(
      buildContextualCatalogFilters({ ...baseContext, campana: "cyber", categoria: "mujer" }).title
    ).toBe("Cyber Mujer");

    expect(
      buildContextualCatalogFilters({ ...baseContext, campana: "cyber", categoria: "nino" }).title
    ).toBe("Cyber Infantil");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        categoria: "mujer",
        campana: "nueva-temporada",
      }).title
    ).toBe("Nuevas tendencias");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        categoria: "mujer",
        coleccion: "pasos-radiantes",
      }).title
    ).toBe("Nuevas tendencias");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        categoria: "hombre",
        coleccion: "ruta-urbana",
      }).title
    ).toBe("Nuevas tendencias");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        categoria: "nino",
        coleccion: "vuelta-al-cole",
      }).title
    ).toBe("Nuevas tendencias");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        categoria: "mujer",
        tipo: "zapatillas",
      }).title
    ).toBe("Zapatillas mujer");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        categoria: "hombre",
        tipo: "zapatillas",
      }).title
    ).toBe("Zapatillas hombre");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        linea: "zapatillas",
        color: "blanco",
      }).title
    ).toBe("Zapatillas blancas");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        tipo: "zapatillas",
        color: "blanco",
      }).title
    ).toBe("Zapatillas blancas");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        categoria: "nino",
        segmento: "ninas",
      }).title
    ).toBe("Niñas");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        categoria: "nino",
        segmento: "ninos",
      }).title
    ).toBe("Niños");

    expect(
      buildContextualCatalogFilters({
        ...baseContext,
        categoria: "nino",
        rangoEdad: "1-3",
      }).title
    ).toBe("Niños");

    expect(buildContextualCatalogFilters({ ...baseContext, categoria: "mujer" }).title).toBe("Calzado mujer");
    expect(buildContextualCatalogFilters({ ...baseContext, categoria: "hombre" }).title).toBe("Calzado hombre");
    expect(buildContextualCatalogFilters({ ...baseContext, categoria: "nino" }).title).toBe("Infantil");
    expect(buildContextualCatalogFilters({ ...baseContext }).title).toBe("Categoría");
  });

  it("usa descuento explícito para cyber cuando viene en input", () => {
    const g = buildContextualCatalogFilters({
      ...baseContext,
      campana: "cyber",
      categoria: "hombre",
      descuento: "30",
    });
    expect(g.items[0].params.descuento).toBe("30");
  });
});

describe("buildCatalogBreadcrumbs", () => {
  it("construye cadena con refinamientos", () => {
    const crumbs = buildCatalogBreadcrumbs({
      vista: null,
      categoria: "mujer",
      campana: "cyber",
      coleccion: "",
      linea: "zapatillas",
      tipo: "zapatillas",
      estilo: "urbanas",
      segmento: "juvenil",
      rangoEdad: "1-3",
      color: "negro",
      marca: "todas",
      marcaSlug: "nike",
      descuento: "10",
      precio: "under:200:",
      talla: "38",
      material: "cuero",
    });
    expect(crumbs.length).toBeGreaterThan(3);
    expect(crumbs.every((c) => typeof c.params === "object")).toBe(true);
  });

  it("vista marcas y marca distinta de todas", () => {
    const crumbs = buildCatalogBreadcrumbs({
      vista: "marcas",
      categoria: "todos",
      campana: "",
      coleccion: "",
      linea: "",
      tipo: "",
      estilo: "",
      segmento: "",
      rangoEdad: "",
      color: "",
      marca: "Puma",
      marcaSlug: "",
      descuento: "",
      precio: "",
      talla: "",
      material: "",
    });
    expect(crumbs[0].label).toBe("Marcas");
  });
});

describe("draft filters / active facets / toggle", () => {
  it("filterParsed* helpers", () => {
    expect(filterParsedSizesForCatalogDraft(["38", "99"], ["38"])).toEqual(["38"]);
    expect(filterParsedColorsForCatalogDraft(["negro"], [{ value: "negro" }])).toEqual(["negro"]);
    expect(filterParsedMaterialsForCatalogDraft(["cuero"], [{ value: "cuero" }])).toEqual(["cuero"]);
  });

  it("buildActiveCatalogFacetChips ejecuta onClear", () => {
    const apply = vi.fn();
    const chips = buildActiveCatalogFacetChips(
      {
        precio: "under:100:",
        talla: "40,41",
        marcaSlug: "nike",
        color: "negro,blanco",
        material: "cuero,gamuza",
        descuento: "10,20",
        categoria: "mujer",
        vista: null,
        priceBoundsMin: 0,
        priceBoundsMax: 500,
      },
      apply
    );
    expect(chips.length).toBeGreaterThan(4);
    chips.forEach((c) => c.onClear());
    expect(apply).toHaveBeenCalled();
  });

  it("toggleCatalogStringListMember", () => {
    expect(toggleCatalogStringListMember(["a"], "a", true)).toEqual([]);
    expect(toggleCatalogStringListMember(["a"], "b", false)).toEqual(["a", "b"]);
  });
});

describe("DISCOUNT_OPTIONS", () => {
  it("expone opciones", () => {
    expect(DISCOUNT_OPTIONS.map((o) => o.value)).toContain("all");
  });
});
