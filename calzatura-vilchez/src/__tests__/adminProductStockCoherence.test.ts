import { describe, expect, it } from "vitest";
import { filterAdminProducts, type AdminProductRow } from "@/domains/productos/pages/adminProductsListFilters";
import { isStockTallaIncoherent, sumTallaStockUnits } from "@/domains/productos/pages/adminProductStockCoherence";

describe("sumTallaStockUnits", () => {
  it("suma valores no negativos", () => {
    expect(sumTallaStockUnits({ "38": 2, "39": 3 })).toBe(5);
  });
  it("trata ausente o null como vacío", () => {
    expect(sumTallaStockUnits(undefined)).toBe(0);
    expect(sumTallaStockUnits(null)).toBe(0);
    expect(sumTallaStockUnits({})).toBe(0);
  });
});

describe("isStockTallaIncoherent", () => {
  it("coincide cuando stock y suma tallas son iguales", () => {
    expect(isStockTallaIncoherent({ stock: 10, tallaStock: { "37": 4, "38": 6 } })).toBe(false);
    expect(isStockTallaIncoherent({ stock: 0, tallaStock: {} })).toBe(false);
  });
  it("detecta legacy sin desglose", () => {
    expect(isStockTallaIncoherent({ stock: 5, tallaStock: {} })).toBe(true);
    expect(isStockTallaIncoherent({ stock: 3 })).toBe(true);
  });
  it("detecta suma distinta al total", () => {
    expect(isStockTallaIncoherent({ stock: 10, tallaStock: { "38": 4 } })).toBe(true);
  });
  it("detecta stock cero con tallas sobrantes", () => {
    expect(isStockTallaIncoherent({ stock: 0, tallaStock: { "40": 1 } })).toBe(true);
  });
});

describe("filterAdminProducts stock-talla-mismatch", () => {
  it("solo deja productos incoherentes", () => {
    const rowOk: AdminProductRow = {
      id: "a",
      nombre: "Ok",
      imagen: "",
      precio: 1,
      categoria: "hombre",
      stock: 5,
      tallaStock: { "38": 2, "39": 3 },
    };
    const rowBad: AdminProductRow = {
      id: "b",
      nombre: "Bad",
      imagen: "",
      precio: 1,
      categoria: "hombre",
      stock: 5,
      tallaStock: { "38": 1 },
    };
    const out = filterAdminProducts([rowOk, rowBad], {
      searchTerm: "",
      categoryFilter: "todos",
      stockFilter: "stock-talla-mismatch",
      featuredFilter: "todos",
      lowStockLimit: 5,
    });
    expect(out.map((r) => r.id)).toEqual(["b"]);
  });
});
