import type { SyntheticEvent } from "react";
import { describe, expect, it } from "vitest";
import { getProductGalleryImages, getProductPrimaryImage, handleProductImageError } from "@/utils/imgUtils";

describe("getProductGalleryImages", () => {
  it("usa imagen cuando imagenes solo tiene huecos vacíos", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/zapato.jpg";
    expect(
      getProductGalleryImages({ imagen: url, imagenes: ["", ""] }),
    ).toEqual([url]);
  });

  it("prioriza URLs válidas en imagenes[]", () => {
    expect(
      getProductGalleryImages({
        imagen: "https://res.cloudinary.com/demo/primary.jpg",
        imagenes: ["", "https://res.cloudinary.com/demo/secondary.jpg"],
      }),
    ).toEqual(["https://res.cloudinary.com/demo/secondary.jpg"]);
  });

  it("getProductPrimaryImage devuelve fallback si no hay URLs", () => {
    expect(getProductPrimaryImage({ imagen: "", imagenes: [] }, "/placeholder.svg")).toBe(
      "/placeholder.svg",
    );
  });
});

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
