import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const productCardSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/domains/productos/components/ProductCard.tsx"),
  "utf8",
);

describe("Catálogo ProductCard accessibility guards", () => {
  it("no anida enlaces interactivos (imagen y título son Link separados)", () => {
    const imageLinkIdx = productCardSource.indexOf('className="product-card-image-link"');
    const bodyIdx = productCardSource.indexOf('className="product-card-body"');
    const titleLinkIdx = productCardSource.indexOf('className="product-card-title-link"');
    expect(imageLinkIdx).toBeGreaterThan(-1);
    expect(bodyIdx).toBeGreaterThan(imageLinkIdx);
    expect(titleLinkIdx).toBeGreaterThan(bodyIdx);
    expect(productCardSource).toContain('aria-label="Seleccionar talla"');
  });

  it("el selector de tallas es un dialog modal accesible", () => {
    expect(productCardSource).toContain("<dialog");
    expect(productCardSource).toContain('aria-modal="true"');
    expect(productCardSource).toContain("aria-labelledby={sizePickerTitleId}");
    expect(productCardSource).toContain('aria-label="Cerrar selector de talla"');
    expect(productCardSource).toContain("useDialogKeyboardTrap");
    expect(productCardSource).toContain("firstSizeButtonRef.current?.focus()");
    expect(productCardSource).toContain("openSizePickerButtonRef.current?.focus()");
  });
});
