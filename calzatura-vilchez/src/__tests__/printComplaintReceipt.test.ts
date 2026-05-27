import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildComplaintReceiptPrintHtml,
  printHtmlDocument,
} from "@/domains/publico/utils/printComplaintReceipt";

describe("printComplaintReceipt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("buildComplaintReceiptPrintHtml incluye datos y script de impresión", () => {
    const html = buildComplaintReceiptPrintHtml("<p>Constancia</p>", "CV-LR-TEST");
    expect(html).toContain("Constancia CV-LR-TEST");
    expect(html).toContain("<p>Constancia</p>");
    expect(html).toContain("globalThis.print");
  });

  it("printHtmlDocument escribe el HTML en la ventana antes de imprimir", () => {
    vi.useFakeTimers();
    const printMock = vi.fn();
    const mockDoc = {
      open: vi.fn(),
      close: vi.fn(),
      title: "",
      documentElement: document.createElement("html"),
      importNode: (node: Node) => node,
      replaceChild: vi.fn(),
    };
    const preview = {
      closed: false,
      document: mockDoc,
      focus: vi.fn(),
      print: printMock,
    } as unknown as Window;

    vi.spyOn(globalThis, "open").mockReturnValue(preview);

    printHtmlDocument(
      buildComplaintReceiptPrintHtml("<h1>Hoja</h1>", "CV-LR-1"),
      "Constancia CV-LR-1",
    );

    expect(mockDoc.open).toHaveBeenCalled();
    expect(mockDoc.replaceChild).toHaveBeenCalled();
    expect(mockDoc.close).toHaveBeenCalled();
    expect(printMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(350);
    expect(printMock).toHaveBeenCalled();
  });
});
