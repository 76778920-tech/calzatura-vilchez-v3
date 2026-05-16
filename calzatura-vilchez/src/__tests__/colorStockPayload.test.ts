import { describe, it, expect } from "vitest";
import { buildColorStockForVariant } from "@/utils/colorStockPayload";

describe("buildColorStockForVariant", () => {
  it("arma mapa color → tallas con stock > 0", () => {
    expect(buildColorStockForVariant("Negro", { "39": 3, "40": 0 })).toEqual({ Negro: { "39": 3 } });
  });

  it("sin color o sin unidades devuelve undefined", () => {
    expect(buildColorStockForVariant("", { "39": 1 })).toBeUndefined();
    expect(buildColorStockForVariant("Negro", {})).toBeUndefined();
  });
});
