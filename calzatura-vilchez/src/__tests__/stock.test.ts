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

  it("con talla inexistente en tallaStock devuelve cero", () => {
    const p = product({ id: "1", stock: 12, tallaStock: { "39": 4 } });
    expect(getSizeStock(p, "40")).toBe(0);
  });

  it("sin tallaStock cae en product.stock", () => {
    const p = product({ id: "1", stock: 7 });
    expect(getSizeStock(p, "40")).toBe(7);
  });

  it("talla numérica en JSON coincide con clave string en tallaStock", () => {
    const p = product({ id: "1", tallaStock: { "38": 3 }, stock: 0 });
    expect(getSizeStock(p, "38")).toBe(3);
    expect(getSizeStock(p, String(38))).toBe(3);
  });

  it("colorStock: cantidad como string y color sin acento", () => {
    const base = product({ id: "1", stock: 0 });
    const p = Object.assign(base, {
      colorStock: { Camel: { "38": "2" } },
    }) as Product;
    expect(getSizeStock(p, "38", "camel")).toBe(2);
  });

  it("colorStock: color inexistente no suma otras variantes", () => {
    const base = product({ id: "1", stock: 99 });
    const p = Object.assign(base, {
      colorStock: { Camel: { "38": 2 }, Negro: { "38": 5 } },
    }) as Product;
    expect(getSizeStock(p, "38", "Rojo")).toBe(0);
  });

  it("colorStock vacío o solo filas sin tallas: usa tallaStock", () => {
    const onlyEmptyRows = Object.assign(product({ id: "1", stock: 0, tallaStock: { "38": 4 } }), {
      colorStock: { Camel: {} },
    }) as Product;
    expect(getSizeStock(onlyEmptyRows, "38", "Camel")).toBe(4);

    const emptyMap = Object.assign(product({ id: "1", stock: 0, tallaStock: { "38": 2 } }), {
      colorStock: {},
    }) as Product;
    expect(getSizeStock(emptyMap, "38")).toBe(2);
  });

  it("tallaStock vacío {} usa columna stock (mismo caso que RPC coalesce a {})", () => {
    const p = Object.assign(product({ id: "1", stock: 9, tallaStock: {} as Record<string, number> }), {});
    expect(getSizeStock(p, "38")).toBe(9);
    expect(getSizeStock(p)).toBe(9);
  });

  it("colorStock con fila de color vacía: usa tallaStock para esa talla", () => {
    const base = product({
      id: "1",
      stock: 6,
      color: "Negro",
      tallaStock: { "39": 5 },
    });
    const p = Object.assign(base, {
      colorStock: { Negro: {}, Camel: { "39": 1 } },
    }) as Product;
    expect(getSizeStock(p, "39", "Negro")).toBe(5);
  });

  it("sin talla con colorStock usa max entre suma por color y columna stock", () => {
    const p = Object.assign(product({ id: "1", stock: 10 }), {
      colorStock: { A: { "38": 2 }, B: { "38": 3 } },
    }) as Product;
    expect(getSizeStock(p)).toBe(10);
    expect(getSizeStock(p, "   ")).toBe(10);
  });

  it("sin talla sin colorStock usa columna stock", () => {
    const p = product({ id: "1", stock: 4 });
    expect(getSizeStock(p)).toBe(4);
  });

  it("colorStock sin color pide suma de todas las filas para esa talla", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { A: { "38": 2 }, B: { "38": 3 }, C: { "39": 1 } },
    }) as Product;
    expect(getSizeStock(p, "38")).toBe(5);
    expect(getSizeStock(p, "39")).toBe(1);
  });

  it("resuelve color por hint product.color cuando el pedido pide otro nombre", () => {
    const p = Object.assign(product({ id: "1", stock: 0, color: "Camel" }), {
      colorStock: { Camel: { "38": 7 } },
    }) as Product;
    expect(getSizeStock(p, "38", "Rojo")).toBe(7);
  });

  it("un solo color en mapa: sin coincidencia de nombre usa tallaStock o stock", () => {
    const p = Object.assign(product({ id: "1", stock: 8, tallaStock: { "38": 2 } }), {
      colorStock: { Único: { "38": 0 } },
    }) as Product;
    expect(getSizeStock(p, "38", "OtroColor")).toBe(2);
  });

  it("colorStock con talla inexistente en la fila resuelta usa lineStock / columna", () => {
    const p = Object.assign(product({ id: "1", stock: 3, tallaStock: { "40": 9 } }), {
      colorStock: { Negro: { "38": 5 } },
    }) as Product;
    expect(getSizeStock(p, "40", "Negro")).toBe(9);
  });

  it("tallaStock objeto vacío ignora tallas y usa stock de columna", () => {
    const p = Object.assign(product({ id: "1", stock: 11, tallaStock: {} as Record<string, number> }), {
      colorStock: undefined,
    });
    expect(getSizeStock(p, "99")).toBe(11);
  });

  it("colorStock ignora filas vacías o no objeto al derivar total sin talla", () => {
    const p = Object.assign(product({ id: "1", stock: 1 }), {
      colorStock: {
        Vacio: {},
        Mal: [] as unknown as Record<string, number>,
        Bueno: { "38": 2 },
      },
    }) as Product;
    expect(getSizeStock(p)).toBe(2);
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

  it("agrega tallas desde colorStock en varias variantes", () => {
    const p = Object.assign(product({ id: "1" }), {
      colorStock: {
        A: { "38": 1, "40": 0 },
        B: { "38": 2, "39": 1 },
      },
    }) as Product;
    expect(getAvailableSizes(p)).toEqual(["38", "39"]);
  });
});
