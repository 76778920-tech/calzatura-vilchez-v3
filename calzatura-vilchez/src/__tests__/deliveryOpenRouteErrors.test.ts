import { describe, expect, it } from "vitest";
import {
  deliveryLookupErrorMessage,
  isDeliveryLookupUnavailableError,
} from "@/services/deliveryOpenRoute";

describe("deliveryOpenRoute error messages", () => {
  it("convierte Failed to fetch en mensaje usable para checkout", () => {
    const err = new TypeError("Failed to fetch");

    expect(isDeliveryLookupUnavailableError(err)).toBe(true);
    expect(deliveryLookupErrorMessage(err, "fallback")).toContain("Completa la dirección manualmente");
  });

  it("mantiene errores no relacionados con ORS", () => {
    const err = new Error("No se encontro la direccion");

    expect(isDeliveryLookupUnavailableError(err)).toBe(false);
    expect(deliveryLookupErrorMessage(err, "fallback")).toBe("No se encontro la direccion");
  });
});
