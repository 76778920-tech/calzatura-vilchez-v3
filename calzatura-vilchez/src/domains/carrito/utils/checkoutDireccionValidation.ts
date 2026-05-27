import type { Address } from "@/types";
import { formatPeruPhone, isValidPeruPhone, peruPhoneError } from "@/utils/phone";
import { DELIVERY_CONFIG } from "@/config/delivery";
import type { DeliveryQuote, GeocodeCandidate } from "@/services/deliveryOpenRoute";
import { buildCheckoutAddressLine } from "@/domains/carrito/utils/checkoutAddressLine";

type ValidateArgs = {
  direccion: Address;
  deliveryPricingActive: boolean;
  locationConfirmed: boolean;
  selectedDelivery: GeocodeCandidate | null;
  deliveryQuoteLoading: boolean;
  deliveryQuoteError: string;
  deliveryQuote: DeliveryQuote | null;
};

export type CheckoutFieldErrors = {
  direccion?: string;
  distrito?: string;
  telefono?: string;
  delivery?: string;
};

export function getCheckoutFieldErrors({
  direccion,
  deliveryPricingActive,
  locationConfirmed,
  selectedDelivery,
  deliveryQuoteLoading,
  deliveryQuoteError,
  deliveryQuote,
}: ValidateArgs): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};

  if (!direccion.direccion) errors.direccion = "Ingresa una dirección";
  if (!direccion.distrito) errors.distrito = "Ingresa un distrito";

  if (!direccion.telefono) {
    errors.telefono = "Ingresa un teléfono";
  } else {
    const phoneErr = peruPhoneError(direccion.telefono);
    if (phoneErr || !isValidPeruPhone(direccion.telefono)) {
      errors.telefono = phoneErr ?? "Ingresa un teléfono válido";
    }
  }

  if (deliveryPricingActive && Object.keys(errors).length === 0) {
    const line = buildCheckoutAddressLine(direccion);
    if (line.length >= 8 && !locationConfirmed) {
      errors.delivery = "Confirmá la entrega: elegí una sugerencia, buscá en el mapa o arrastrá el pin azul.";
    } else if (line.length >= 8 && !selectedDelivery) {
      errors.delivery = "Elegí un punto de entrega: una sugerencia de la lista, una búsqueda o el mapa.";
    } else if (deliveryQuoteLoading) {
      errors.delivery = "Espera un momento: estamos calculando el costo de envío.";
    } else if (deliveryQuoteError) {
      errors.delivery = deliveryQuoteError;
    } else if (!deliveryQuote || deliveryQuote.isOutOfRange) {
      errors.delivery = `No podemos entregar a esa dirección (máx. ${DELIVERY_CONFIG.maxDeliveryKm} km desde la tienda).`;
    }
  }

  return errors;
}

/** Devuelve mensaje de error para `toast.error`, o `null` si puede pasar al paso pago. */
export function validateCheckoutDireccionStep(args: ValidateArgs): string | null {
  const errors = getCheckoutFieldErrors(args);
  return errors.direccion ?? errors.distrito ?? errors.telefono ?? errors.delivery ?? null;
}

export function formatDireccionTelefonoForSubmit(direccion: Address): Address {
  return {
    ...direccion,
    telefono: formatPeruPhone(direccion.telefono),
  };
}
