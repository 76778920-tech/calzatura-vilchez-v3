import { describe, expect, it } from "vitest";
import { getCheckoutFieldErrors } from "@/domains/carrito/utils/checkoutDireccionValidation";
import type { Address } from "@/types";

const baseAddress: Address = {
  nombre: "Ana",
  apellido: "López",
  direccion: "Av. Huancayo 123",
  ciudad: "Huancayo",
  distrito: "El Tambo",
  telefono: "964052530",
  referencia: "",
};

const inactiveDelivery = {
  deliveryPricingActive: false,
  locationConfirmed: false,
  selectedDelivery: null,
  deliveryQuoteLoading: false,
  deliveryQuoteError: "",
  deliveryQuote: null,
};

describe("getCheckoutFieldErrors", () => {
  it("exige dirección, distrito y teléfono válido", () => {
    const errors = getCheckoutFieldErrors({
      direccion: { ...baseAddress, direccion: "", distrito: "", telefono: "" },
      ...inactiveDelivery,
    });
    expect(errors.direccion).toBeTruthy();
    expect(errors.distrito).toBeTruthy();
    expect(errors.telefono).toBeTruthy();
  });

  it("no valida envío si faltan datos de dirección", () => {
    const errors = getCheckoutFieldErrors({
      direccion: { ...baseAddress, direccion: "" },
      deliveryPricingActive: true,
      locationConfirmed: false,
      selectedDelivery: null,
      deliveryQuoteLoading: false,
      deliveryQuoteError: "",
      deliveryQuote: null,
    });
    expect(errors.delivery).toBeUndefined();
  });
});
