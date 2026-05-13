import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  IMAGE_RULES,
  checkImageDimensions,
  imageValidationMessage,
  validateImageFile,
  validateImageUrlDimensions,
  type ImageValidationError,
} from "@/domains/productos/utils/imageRules";

type MockImageResult =
  | { kind: "load"; width: number; height: number }
  | { kind: "error" };

class MockImage {
  static next: MockImageResult = { kind: "load", width: 800, height: 800 };

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;

  set src(_value: string) {
    queueMicrotask(() => {
      if (MockImage.next.kind === "error") {
        this.onerror?.();
        return;
      }

      this.naturalWidth = MockImage.next.width;
      this.naturalHeight = MockImage.next.height;
      this.onload?.();
    });
  }
}

describe("checkImageDimensions", () => {
  it("acepta imagen cuadrada valida", () => {
    expect(checkImageDimensions(800, 800)).toBeNull();
  });

  it("acepta retrato permitido", () => {
    expect(checkImageDimensions(600, 900)).toBeNull();
  });

  it("acepta apaisado permitido", () => {
    expect(checkImageDimensions(1200, 900)).toBeNull();
  });

  it("acepta el limite inferior exacto de dimensiones", () => {
    expect(checkImageDimensions(600, 600)).toBeNull();
  });

  it("rechaza width menor al minimo", () => {
    expect(checkImageDimensions(400, 800)).toBe("IMAGE_TOO_SMALL");
  });

  it("rechaza height menor al minimo", () => {
    expect(checkImageDimensions(800, 400)).toBe("IMAGE_TOO_SMALL");
  });

  it("rechaza ambas dimensiones menores al minimo", () => {
    expect(checkImageDimensions(300, 300)).toBe("IMAGE_TOO_SMALL");
  });

  it("rechaza imagen demasiado vertical", () => {
    expect(checkImageDimensions(900, 1600)).toBe("IMAGE_RATIO_TOO_TALL");
  });

  it("rechaza imagen casi cuadrada muy alta", () => {
    expect(checkImageDimensions(600, 1000)).toBe("IMAGE_RATIO_TOO_TALL");
  });

  it("rechaza ratio 2:1", () => {
    expect(checkImageDimensions(1600, 800)).toBe("IMAGE_RATIO_TOO_WIDE");
  });

  it("rechaza ratio 16:9", () => {
    expect(checkImageDimensions(1600, 900)).toBe("IMAGE_RATIO_TOO_WIDE");
  });
});

describe("imageValidationMessage", () => {
  const allCodes: ImageValidationError[] = [
    "IMAGE_TOO_SMALL",
    "IMAGE_RATIO_TOO_WIDE",
    "IMAGE_RATIO_TOO_TALL",
    "IMAGE_COMPRESSED_TOO_LARGE",
  ];

  it.each(allCodes)("%s devuelve mensaje no vacio", (code) => {
    expect(imageValidationMessage(code).length).toBeGreaterThan(0);
  });

  it("IMAGE_TOO_SMALL menciona las dimensiones minimas de la regla", () => {
    const msg = imageValidationMessage("IMAGE_TOO_SMALL");
    expect(msg).toContain(String(IMAGE_RULES.minWidth));
    expect(msg).toContain(String(IMAGE_RULES.minHeight));
  });

  it("mensajes de ratio mencionan la proporcion de referencia", () => {
    expect(imageValidationMessage("IMAGE_RATIO_TOO_WIDE")).toMatch(/2:3|8:5|proporci/i);
    expect(imageValidationMessage("IMAGE_RATIO_TOO_TALL")).toMatch(/2:3|8:5|proporci/i);
  });
});

describe("validacion asincrona de imagenes", () => {
  beforeEach(() => {
    MockImage.next = { kind: "load", width: 800, height: 800 };
    vi.stubGlobal("Image", MockImage);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-image");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("validateImageFile valida dimensiones reales y libera el object URL", async () => {
    MockImage.next = { kind: "load", width: 1600, height: 900 };

    await expect(validateImageFile(new File(["x"], "zapato.webp"))).resolves.toBe("IMAGE_RATIO_TOO_WIDE");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-image");
  });

  it("validateImageFile no bloquea si el navegador no puede leer la imagen", async () => {
    MockImage.next = { kind: "error" };

    await expect(validateImageFile(new File(["x"], "zapato.webp"))).resolves.toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-image");
  });

  it("validateImageUrlDimensions valida dimensiones de una URL remota", async () => {
    MockImage.next = { kind: "load", width: 900, height: 1600 };

    await expect(validateImageUrlDimensions("https://cdn.test/zapato.webp")).resolves.toBe(
      "IMAGE_RATIO_TOO_TALL"
    );
  });

  it("validateImageUrlDimensions no bloquea si la URL falla", async () => {
    MockImage.next = { kind: "error" };

    await expect(validateImageUrlDimensions("https://cdn.test/rota.webp")).resolves.toBeNull();
  });
});
