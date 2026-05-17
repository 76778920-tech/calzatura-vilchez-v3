import { describe, expect, it } from "vitest";
import {
  dniLookupErrorToast,
  isDniLookupError,
  salesOperationErrorToast,
} from "@/domains/ventas/utils/salesErrorMessages";

describe("salesErrorMessages", () => {
  it("detecta errores de lookup DNI", () => {
    expect(isDniLookupError(new Error("DNI_NOT_FOUND"))).toBe(true);
    expect(isDniLookupError(new Error("otro"))).toBe(false);
  });

  it("mapea mensajes de lookup DNI", () => {
    expect(dniLookupErrorToast(new Error("DNI_NOT_FOUND"))).toMatch(/No se encontraron/);
  });

  it("mapea stock insuficiente", () => {
    expect(salesOperationErrorToast(new Error("insufficient_stock"))).toMatch(/Stock insuficiente/);
  });

  it("mapea error generico", () => {
    expect(salesOperationErrorToast(new Error("fallo"))).toMatch(/fallo/);
  });
});
