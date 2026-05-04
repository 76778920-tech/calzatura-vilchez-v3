import { describe, expect, it } from "vitest";
import {
  IMAGE_RULES,
  checkImageDimensions,
  imageValidationMessage,
  type ImageValidationError,
} from "@/domains/productos/utils/imageRules";

describe("checkImageDimensions — validación de reglas de negocio para imágenes", () => {
  it("null para imagen cuadrada válida (800×800)", () => {
    expect(checkImageDimensions(800, 800)).toBeNull();
  });

  it("null para retrato permitido (600×900 ≈ 2:3, ratio 0.667 ≥ 0.65)", () => {
    expect(checkImageDimensions(600, 900)).toBeNull();
  });

  it("null para apaisado permitido (1200×900 ≈ 4:3, ratio 1.33 ≤ 1.60)", () => {
    expect(checkImageDimensions(1200, 900)).toBeNull();
  });

  it("null en el límite inferior exacto de dimensiones (600×600)", () => {
    expect(checkImageDimensions(600, 600)).toBeNull();
  });

  it("IMAGE_TOO_SMALL cuando width < minWidth", () => {
    expect(checkImageDimensions(400, 800)).toBe("IMAGE_TOO_SMALL");
  });

  it("IMAGE_TOO_SMALL cuando height < minHeight", () => {
    expect(checkImageDimensions(800, 400)).toBe("IMAGE_TOO_SMALL");
  });

  it("IMAGE_TOO_SMALL cuando ambas dimensiones son menores al mínimo", () => {
    expect(checkImageDimensions(300, 300)).toBe("IMAGE_TOO_SMALL");
  });

  it("IMAGE_RATIO_TOO_TALL para ratio 9:16 (0.5625 < 0.65)", () => {
    expect(checkImageDimensions(900, 1600)).toBe("IMAGE_RATIO_TOO_TALL");
  });

  it("IMAGE_RATIO_TOO_TALL para imagen casi cuadrada muy alta (600×1000, ratio 0.60)", () => {
    expect(checkImageDimensions(600, 1000)).toBe("IMAGE_RATIO_TOO_TALL");
  });

  it("IMAGE_RATIO_TOO_WIDE para ratio 2:1 (2.0 > 1.60)", () => {
    expect(checkImageDimensions(1600, 800)).toBe("IMAGE_RATIO_TOO_WIDE");
  });

  it("IMAGE_RATIO_TOO_WIDE para ratio 16:9 (1.778 > 1.60)", () => {
    expect(checkImageDimensions(1600, 900)).toBe("IMAGE_RATIO_TOO_WIDE");
  });
});

describe("imageValidationMessage — mensajes de error legibles", () => {
  const allCodes: ImageValidationError[] = [
    "IMAGE_TOO_SMALL",
    "IMAGE_RATIO_TOO_WIDE",
    "IMAGE_RATIO_TOO_TALL",
    "IMAGE_COMPRESSED_TOO_LARGE",
  ];

  it.each(allCodes)("%s → mensaje no vacío", (code) => {
    expect(imageValidationMessage(code).length).toBeGreaterThan(0);
  });

  it("IMAGE_TOO_SMALL menciona las dimensiones mínimas de la regla", () => {
    const msg = imageValidationMessage("IMAGE_TOO_SMALL");
    expect(msg).toContain(String(IMAGE_RULES.minWidth));
    expect(msg).toContain(String(IMAGE_RULES.minHeight));
  });

  it("mensajes de ratio mencionan la proporción de referencia", () => {
    expect(imageValidationMessage("IMAGE_RATIO_TOO_WIDE")).toMatch(/2:3|8:5|proporci/i);
    expect(imageValidationMessage("IMAGE_RATIO_TOO_TALL")).toMatch(/2:3|8:5|proporci/i);
  });
});
