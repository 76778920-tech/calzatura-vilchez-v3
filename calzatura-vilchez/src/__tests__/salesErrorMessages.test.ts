import { describe, expect, it } from "vitest";
import {
  dniLookupErrorToast,
  isDniLookupError,
  salesOperationErrorToast,
} from "@/domains/ventas/utils/salesErrorMessages";

describe("salesErrorMessages", () => {
  it("detecta errores de lookup DNI", () => {
    expect(isDniLookupError(new Error("DNI_INVALID"))).toBe(true);
    expect(isDniLookupError(new Error("DNI_LOOKUP_NOT_CONFIGURED"))).toBe(true);
    expect(isDniLookupError(new Error("DNI_LOOKUP_FAILED"))).toBe(true);
    expect(isDniLookupError(new Error("DNI_NOT_FOUND"))).toBe(true);
    expect(isDniLookupError(new Error("otro"))).toBe(false);
  });

  it("mapea mensajes de lookup DNI", () => {
    expect(dniLookupErrorToast(new Error("DNI_INVALID"))).toBe(
      "No se pudo consultar el DNI",
    );
    expect(dniLookupErrorToast(new Error("DNI_LOOKUP_FAILED"))).toBe(
      "No se pudo consultar el DNI",
    );
    expect(dniLookupErrorToast(new Error("DNI_NOT_FOUND"))).toMatch(/No se encontraron/);
    expect(dniLookupErrorToast(new Error("DNI_LOOKUP_NOT_CONFIGURED"))).toMatch(
      /aun no tiene API configurada/,
    );
  });

  it("mapea stock insuficiente", () => {
    expect(salesOperationErrorToast(new Error("insufficient_stock"))).toMatch(/Stock insuficiente/);
  });

  it("mapea error generico", () => {
    expect(salesOperationErrorToast(new Error("fallo"))).toMatch(/fallo/);
  });
});
