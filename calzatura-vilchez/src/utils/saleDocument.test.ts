import { describe, expect, it, vi } from "vitest";
import { buildSaleDocumentHtml, openSaleDocumentWindow, writeHtmlToPopupWindow } from "./saleDocument";

describe("saleDocument popup", () => {
  it("writeHtmlToPopupWindow navega con Blob URL (sin document.write)", () => {
    const location = { replace: vi.fn() };
    const preview = { location, closed: false } as unknown as Window;
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    writeHtmlToPopupWindow(preview, "<!doctype html><html><body>x</body></html>");

    expect(createObjectURL).toHaveBeenCalled();
    expect(location.replace).toHaveBeenCalledWith("blob:mock");

    vi.unstubAllGlobals();
  });

  it("openSaleDocumentWindow abre about:blank y escribe loading", () => {
    const location = { replace: vi.fn() };
    const previewWindow = { location, closed: false, focus: vi.fn() };
    vi.stubGlobal("open", vi.fn(() => previewWindow));
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:loading"),
      revokeObjectURL: vi.fn(),
    });

    const preview = openSaleDocumentWindow();
    expect(preview).toBe(previewWindow);
    expect(location.replace).toHaveBeenCalled();
    expect(globalThis.open).toHaveBeenCalledWith(
      "about:blank",
      "_blank",
      "noopener,noreferrer,width=900,height=760",
    );

    vi.unstubAllGlobals();
  });

  it("buildSaleDocumentHtml incluye titulo de nota de venta", () => {
    const html = buildSaleDocumentHtml({
      id: "NV-20260528-12345",
      type: "nota_venta",
      customer: { dni: "12345678", nombres: "Juan", apellidos: "Perez" },
      date: new Date("2026-05-28T12:00:00"),
      lines: [{
        codigo: "ABC",
        nombre: "Zapato",
        quantity: 1,
        salePrice: 100,
        total: 100,
      }],
    });
    expect(html).toContain("NOTA DE VENTA");
    expect(html).toContain("Juan Perez");
  });
});
