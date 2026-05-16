import { describe, it, expect } from "vitest";
import { deriveTotalFromProduct, getAvailableSizes, getSizeStock, sumSizeStock } from "@/utils/stock";
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

  it("stock de columna negativo se trata como cero", () => {
    const p = product({ id: "1", stock: -3 });
    expect(getSizeStock(p, "40")).toBe(0);
    expect(getSizeStock(p)).toBe(0);
  });

  it("talla numérica en JSON coincide con clave string en tallaStock", () => {
    const p = product({ id: "1", tallaStock: { "38": 3 }, stock: 0 });
    expect(getSizeStock(p, "38")).toBe(3);
    expect(getSizeStock(p, String(38))).toBe(3);
  });

  it("talla con ceros a la izquierda coincide por comparación numérica de clave", () => {
    const p = product({ id: "1", tallaStock: { "38": 5 }, stock: 0 });
    expect(getSizeStock(p, "038")).toBe(5);
  });

  it("tallaStock: clave con espacios coincide por trim con la talla pedida", () => {
    const p = product({
      id: "1",
      stock: 0,
      tallaStock: { " 38 ": 2 } as Record<string, number>,
    });
    expect(getSizeStock(p, "38")).toBe(2);
  });

  it("colorStock: cantidad como string y color sin acento", () => {
    const base = product({ id: "1", stock: 0 });
    const p = Object.assign(base, {
      colorStock: { Camel: { "38": "2" } },
    }) as Product;
    expect(getSizeStock(p, "38", "camel")).toBe(2);
  });

  it("colorStock: cantidad no finita cuenta como cero", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { A: { "38": Number.POSITIVE_INFINITY } },
    }) as Product;
    expect(getSizeStock(p, "38", "A")).toBe(0);
  });

  it("colorStock: nombre de color sin acento coincide con clave accentuada", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { Café: { "38": 4 } },
    }) as Product;
    expect(getSizeStock(p, "38", "cafe")).toBe(4);
  });

  it("colorStock: celda null, string no numérico, negativo o numérico", () => {
    const nullCell = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { A: { "38": null as unknown } },
    }) as Product;
    expect(getSizeStock(nullCell, "38", "A")).toBe(0);

    const badStr = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { A: { "38": "x" } },
    }) as Product;
    expect(getSizeStock(badStr, "38", "A")).toBe(0);

    const neg = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { A: { "38": -2 } },
    }) as Product;
    expect(getSizeStock(neg, "38", "A")).toBe(0);

    const spaced = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { A: { "38": "  3  " } },
    }) as Product;
    expect(getSizeStock(spaced, "38", "A")).toBe(3);

    const num = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { A: { "38": 7 } },
    }) as Product;
    expect(getSizeStock(num, "38", "A")).toBe(7);
  });

  it("colorStock: color inexistente no suma otras variantes", () => {
    const base = product({ id: "1", stock: 99 });
    const p = Object.assign(base, {
      colorStock: { Camel: { "38": 2 }, Negro: { "38": 5 } },
    }) as Product;
    expect(getSizeStock(p, "38", "Rojo")).toBe(0);
  });

  it("colorStock: color de producto solo espacios no actúa como hint", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      color: "   ",
      colorStock: { Camel: { "38": 1 }, Negro: { "38": 2 } },
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

  it("colorStock sin color: talla ausente en todas las filas suma cero", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { A: { "38": 1 }, B: { "39": 2 } },
    }) as Product;
    expect(getSizeStock(p, "40")).toBe(0);
  });

  it("resuelve color por hint product.color cuando el pedido pide otro nombre", () => {
    const p = Object.assign(product({ id: "1", stock: 0, color: "Camel" }), {
      colorStock: { Camel: { "38": 7 } },
    }) as Product;
    expect(getSizeStock(p, "38", "Rojo")).toBe(7);
  });

  it("coincidencia de color por normalización de clave compuesta", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { "Negro Intenso": { "38": 1 } },
    }) as Product;
    expect(getSizeStock(p, "38", "negro intenso")).toBe(1);
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

  it("colorStock: talla no en fila y sin tallaStock usa stock de columna (fallback)", () => {
    const p = Object.assign(product({ id: "1", stock: 6 }), {
      colorStock: { Negro: { "38": 5 } },
    }) as Product;
    expect(getSizeStock(p, "40", "Negro")).toBe(6);
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

  it("tallaStock no objeto en runtime usa stock de columna", () => {
    const p = Object.assign(product({ id: "1", stock: 4 }), { tallaStock: 99 as unknown }) as Product;
    expect(getSizeStock(p, "40")).toBe(4);
  });

  it("colorStock null en runtime se ignora como sin mapa", () => {
    const p = Object.assign(product({ id: "1", stock: 3, tallaStock: { "38": 1 } }), {
      colorStock: null as unknown,
    }) as Product;
    expect(getSizeStock(p, "38")).toBe(1);
  });

  it("colorStock raíz no objeto o array no define variantes", () => {
    const pnum = Object.assign(product({ id: "1", stock: 2 }), { colorStock: 42 as unknown }) as Product;
    expect(getSizeStock(pnum, "40")).toBe(2);
    const parr = Object.assign(product({ id: "1", stock: 1 }), { colorStock: [] as unknown }) as Product;
    expect(getSizeStock(parr, "40")).toBe(1);
  });

  it("colorStock mezcla filas inválidas y conserva solo filas con tallas", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: {
        A: null,
        B: "solo-texto" as unknown as Record<string, number>,
        C: [] as unknown as Record<string, number>,
        D: {},
        E: { "38": 1 },
      } as unknown,
    }) as Product;
    expect(getSizeStock(p, "38", "E")).toBe(1);
    const onlyBad = Object.assign(product({ id: "1", stock: 5 }), {
      colorStock: { A: {}, B: {}, C: null } as unknown,
    }) as Product;
    expect(getSizeStock(onlyBad, "38")).toBe(5);
  });

  it("colorStock fila sin la talla: tallaStock no tiene esa talla => cero desde lineStock", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      tallaStock: { "39": 3 },
      colorStock: { N: { "38": 1 } },
    }) as Product;
    expect(getSizeStock(p, "40", "N")).toBe(0);
  });

  it("hint product.color sin clave coincidente en colorStock no resuelve color", () => {
    const p = Object.assign(product({ id: "1", stock: 0, color: "Camel" }), {
      colorStock: { Negro: { "38": 2 } },
    }) as Product;
    expect(getSizeStock(p, "38", "Azul")).toBe(0);
  });

  it("clave Infinity no matchea comparación numérica no finita (findTallaKey)", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      tallaStock: { Infinity: 9 } as unknown as Record<string, number>,
    }) as Product;
    expect(getSizeStock(p, "infinity")).toBe(0);
  });

  it("colorStock solo espacios pide todas las variantes pero filas vacías no suman talla", () => {
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: {
        SoloEspacios: { " ": 9 } as unknown as Record<string, unknown>,
      },
    }) as Product;
    expect(getSizeStock(p, "38")).toBe(0);
  });

  it("clave de color con carácter no recortado resuelve fila (\u200c separador sin ancho)", () => {
    const zwj = "\u200c";
    const p = Object.assign(product({ id: "1", stock: 0 }), {
      colorStock: { [zwj]: { "40": 3 } },
    }) as Product;
    expect(zwj.trim()).toBe(zwj);
    expect(getSizeStock(p, "40", zwj)).toBe(3);
  });
});

describe("deriveTotalFromProduct", () => {
  it("columna negativa se normaliza a cero", () => {
    expect(deriveTotalFromProduct(product({ id: "1", stock: -9 }))).toBe(0);
  });

  it("tallaStock vacío {} es truthy pero sin tallas efectivas: solo columna", () => {
    const p = product({
      id: "1",
      stock: 7,
      tallaStock: {} as Record<string, number>,
    });
    expect(deriveTotalFromProduct(p)).toBe(7);
  });

  it("sin colorStock suma tallaStock y gana a la columna si es mayor", () => {
    const p = product({ id: "1", stock: 1, tallaStock: { "38": 5, "39": 2 } });
    expect(deriveTotalFromProduct(p)).toBe(7);
  });

  it("sin colorStock usa max entre suma tallas y columna", () => {
    const p = product({ id: "1", stock: 10, tallaStock: { "38": 3 } });
    expect(deriveTotalFromProduct(p)).toBe(10);
  });

  it("tallaStock array: truthy pero sin mapa efectivo, solo columna", () => {
    const p = Object.assign(product({ id: "1", stock: 4 }), {
      tallaStock: [1, 2] as unknown,
    }) as Product;
    expect(deriveTotalFromProduct(p)).toBe(4);
  });

  it("tallaStock null: no entra en suma por tallas, solo columna", () => {
    const p = Object.assign(product({ id: "1", stock: 3 }), { tallaStock: null }) as Product;
    expect(deriveTotalFromProduct(p)).toBe(3);
  });

  it("con colorStock gana la columna si la suma por colores es menor", () => {
    const p = Object.assign(product({ id: "1", stock: 50 }), {
      colorStock: { Solo: { "38": 1 } },
    }) as Product;
    expect(deriveTotalFromProduct(p)).toBe(50);
  });

  it("con colorStock gana la suma si supera la columna", () => {
    const p = Object.assign(product({ id: "1", stock: 2 }), {
      colorStock: { A: { "38": 3 }, B: { "39": 4 } },
    }) as Product;
    expect(deriveTotalFromProduct(p)).toBe(7);
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

  it("tallas null se normaliza a array vacío", () => {
    const p = Object.assign(product({ id: "1" }), { tallas: null as unknown }) as Product;
    expect(getAvailableSizes(p)).toEqual([]);
  });

  it("colorStock con cero y luego positivo en la misma talla sigue listando la talla", () => {
    const p = Object.assign(product({ id: "1" }), {
      colorStock: { A: { "38": 0 }, B: { "38": 4 } },
    }) as Product;
    expect(getAvailableSizes(p)).toEqual(["38"]);
  });
});
