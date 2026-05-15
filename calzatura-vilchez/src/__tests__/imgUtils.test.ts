import type { SyntheticEvent } from "react";
import { describe, expect, it } from "vitest";
import { handleProductImageError } from "@/utils/imgUtils";

describe("handleProductImageError", () => {
  it("asigna placeholder y anula onerror para evitar bucle", () => {
    const img = document.createElement("img");
    img.onerror = () => undefined;
    const ev = { target: img } as unknown as SyntheticEvent<HTMLImageElement>;
    handleProductImageError(ev);
    expect(img.onerror).toBeNull();
    expect(img.src).toContain("placeholder-product.svg");
  });
});
