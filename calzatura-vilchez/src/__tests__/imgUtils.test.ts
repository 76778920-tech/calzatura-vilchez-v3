import { describe, it, expect } from "vitest";
import { handleProductImageError } from "@/utils/imgUtils";

describe("handleProductImageError", () => {
  it("asigna el placeholder y limpia onerror", () => {
    const img = document.createElement("img");
    img.src = "https://example.com/broken.jpg";
    const event = { target: img } as unknown as React.SyntheticEvent<HTMLImageElement>;
    handleProductImageError(event);
    expect(img.src).toContain("placeholder-product.svg");
    expect(img.onerror).toBeNull();
  });

  it("no lanza excepción si el target es un img vacío", () => {
    const img = document.createElement("img");
    const event = { target: img } as unknown as React.SyntheticEvent<HTMLImageElement>;
    expect(() => handleProductImageError(event)).not.toThrow();
  });
});
