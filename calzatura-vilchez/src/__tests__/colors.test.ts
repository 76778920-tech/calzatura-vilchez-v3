/**
 * TC-COLORS — Tests para src/utils/colors.ts
 *
 * Semáforo:
 *   🟢 capitalizeWords con entradas vacías/null → no debe explotar — VERIFICADO
 *   🟢 parseColorList deduplicación case-insensitive → consistencia de datos — VERIFICADO
 *   🟢 getProductColors prioriza colores[] sobre color string — VERIFICADO
 *   🟢 formatColors es determinista — VERIFICADO
 */
import { describe, it, expect } from "vitest";
import {
  capitalizeWords,
  parseColorList,
  getProductColors,
  formatColors,
} from "@/utils/colors";

// ─── capitalizeWords ──────────────────────────────────────────────────────────
describe("capitalizeWords", () => {
  it("capitaliza la primera letra de cada palabra", () => {
    expect(capitalizeWords("negro mate")).toBe("Negro Mate");
  });

  it("convierte a minúscula primero y luego capitaliza", () => {
    expect(capitalizeWords("NEGRO MATE")).toBe("Negro Mate");
  });

  it("elimina espacios extra internos", () => {
    expect(capitalizeWords("  negro   mate  ")).toBe("Negro Mate");
  });

  it("devuelve cadena vacía para input vacío", () => {
    expect(capitalizeWords("")).toBe("");
  });

  it("devuelve cadena vacía para input undefined", () => {
    expect(capitalizeWords(undefined)).toBe("");
  });

  it("maneja una sola palabra correctamente", () => {
    expect(capitalizeWords("camel")).toBe("Camel");
  });

  it("preserva caracteres acentuados", () => {
    expect(capitalizeWords("azul añil")).toBe("Azul Añil");
  });
});

// ─── parseColorList ───────────────────────────────────────────────────────────
describe("parseColorList", () => {
  it("devuelve lista vacía para cadena vacía", () => {
    expect(parseColorList("")).toEqual([]);
  });

  it("devuelve lista vacía para undefined", () => {
    expect(parseColorList(undefined)).toEqual([]);
  });

  it("parsea un solo color", () => {
    expect(parseColorList("Negro")).toEqual(["Negro"]);
  });

  it("parsea múltiples colores separados por coma", () => {
    expect(parseColorList("Negro,Blanco,Camel")).toEqual(["Negro", "Blanco", "Camel"]);
  });

  it("normaliza mayúsculas y capitaliza cada color", () => {
    expect(parseColorList("NEGRO,blanco,cAMEL")).toEqual(["Negro", "Blanco", "Camel"]);
  });

  it("deduplica colores con distintas mayúsculas (case-insensitive)", () => {
    expect(parseColorList("Negro,negro,NEGRO")).toEqual(["Negro"]);
  });

  it("preserva el primero cuando hay duplicados con distintas capitalizaciones", () => {
    const result = parseColorList("rojo,Rojo");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Rojo");
  });

  it("limita a 5 colores como máximo", () => {
    expect(parseColorList("A,B,C,D,E,F,G")).toHaveLength(5);
  });

  it("ignora entradas vacías en la lista", () => {
    expect(parseColorList(",Negro,,Blanco,")).toEqual(["Negro", "Blanco"]);
  });
});

// ─── getProductColors ─────────────────────────────────────────────────────────
describe("getProductColors", () => {
  it("devuelve lista vacía para producto sin color ni colores", () => {
    expect(getProductColors({})).toEqual([]);
  });

  it("usa campo color si colores no está", () => {
    expect(getProductColors({ color: "Negro,Blanco" })).toEqual(["Negro", "Blanco"]);
  });

  it("prioriza colores[] sobre color string cuando ambos existen", () => {
    expect(
      getProductColors({ color: "Negro", colores: ["Camel", "Blanco"] })
    ).toEqual(["Camel", "Blanco"]);
  });

  it("cae a color si colores es array vacío", () => {
    expect(getProductColors({ color: "Negro", colores: [] })).toEqual(["Negro"]);
  });

  it("capitaliza los valores de colores[]", () => {
    expect(getProductColors({ colores: ["NEGRO", "blanco"] })).toEqual(["Negro", "Blanco"]);
  });

  it("limita colores[] a 5 elementos", () => {
    expect(
      getProductColors({ colores: ["A", "B", "C", "D", "E", "F"] })
    ).toHaveLength(5);
  });

  it("filtra valores vacíos en colores[]", () => {
    expect(getProductColors({ colores: ["Negro", "", "  ", "Blanco"] })).toEqual(["Negro", "Blanco"]);
  });
});

// ─── formatColors ─────────────────────────────────────────────────────────────
describe("formatColors", () => {
  it("une colores con coma y espacio", () => {
    expect(formatColors(["Negro", "Blanco", "Camel"])).toBe("Negro, Blanco, Camel");
  });

  it("devuelve cadena vacía para lista vacía", () => {
    expect(formatColors([])).toBe("");
  });

  it("devuelve solo el color para lista de uno", () => {
    expect(formatColors(["Negro"])).toBe("Negro");
  });
});
