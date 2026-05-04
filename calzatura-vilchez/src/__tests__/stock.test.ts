import { describe, it, expect } from "vitest";
import { getAvailableSizes, getSizeStock, sumSizeStock } from "@/utils/stock";
import type { Product } from "@/types";

function product(partial: Partial<Product> & Pick<Product, "id">): Product {
  return {
    nombre: "Test",
    precio: 1,
    descripcion: "",
    imagen: "",
    stock: 0,
    categoria: "hombre",
    ...partial,
  };
}

describe("sumSizeStock", () => {
  it("suma cantidades por talla", () => {
    expect(sumSizeStock({ "40": 2, "41": 3 })).toBe(5);
  });

  it("trata cantidades no numéricas como cero", () => {
    expect(sumSizeStock({ "40": NaN, "41": 2 } as Record<string, number>)).toBe(2);
  });

  it("objeto vacío da cero", () => {
    expect(sumSizeStock({})).toBe(0);
  });
});

describe("getSizeStock", () => {
  it("devuelve stock de talla cuando existe tallaStock", () => {
    const p = product({
      id: "1",
      tallaStock: { "39": 4, "40": 0 },
      stock: 99,
    });
    expect(getSizeStock(p, "39")).toBe(4);
    expect(getSizeStock(p, "40")).toBe(0);
  });

  it("sin talla usa stock agregado del producto", () => {
    const p = product({ id: "1", stock: 12, tallaStock: { "39": 4 } });
    expect(getSizeStock(p)).toBe(12);
  });

  it("sin tallaStock cae en product.stock", () => {
    const p = product({ id: "1", stock: 7 });
    expect(getSizeStock(p, "40")).toBe(7);
  });
});

describe("getAvailableSizes", () => {
  it("lista tallas con stock > 0 ordenadas numéricamente", () => {
    const p = product({
      id: "1",
      tallaStock: { "41": 1, "39": 2, "40": 0 },
    });
    expect(getAvailableSizes(p)).toEqual(["39", "41"]);
  });

  it("sin tallaStock devuelve tallas del producto", () => {
    const p = product({ id: "1", tallas: ["38", "39"] });
    expect(getAvailableSizes(p)).toEqual(["38", "39"]);
  });

  it("sin tallaStock ni tallas devuelve array vacío", () => {
    const p = product({ id: "1" });
    expect(getAvailableSizes(p)).toEqual([]);
  });
});
