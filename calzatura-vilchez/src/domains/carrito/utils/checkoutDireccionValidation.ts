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

function getCheckoutPhoneError(telefono: string): string | undefined {
  if (!telefono) return "Ingresa un teléfono";
  const phoneErr = peruPhoneError(telefono);
  if (phoneErr || !isValidPeruPhone(telefono)) {
    return phoneErr ?? "Ingresa un teléfono válido";
  }
  return undefined;
}

function getCheckoutDeliveryError(args: ValidateArgs): string | undefined {
  if (!args.deliveryPricingActive) return undefined;

  const line = buildCheckoutAddressLine(args.direccion);
  if (line.length >= 8 && !args.locationConfirmed) {
    return "Confirmá la entrega: elegí una sugerencia, buscá en el mapa o arrastrá el pin azul.";
  }
  if (line.length >= 8 && !args.selectedDelivery) {
    return "Elegí un punto de entrega: una sugerencia de la lista, una búsqueda o el mapa.";
  }
  if (args.deliveryQuoteLoading) {
    return "Espera un momento: estamos calculando el costo de envío.";
  }
  if (args.deliveryQuoteError) return args.deliveryQuoteError;
  if (!args.deliveryQuote || args.deliveryQuote.isOutOfRange) {
    return `No podemos entregar a esa dirección (máx. ${DELIVERY_CONFIG.maxDeliveryKm} km desde la tienda).`;
  }
  return undefined;
}

export function getCheckoutFieldErrors(args: ValidateArgs): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};

  if (!args.direccion.direccion) errors.direccion = "Ingresa una dirección";
  if (!args.direccion.distrito) errors.distrito = "Ingresa un distrito";

  const telefonoError = getCheckoutPhoneError(args.direccion.telefono);
  if (telefonoError) errors.telefono = telefonoError;

  const hasAddressErrors = Boolean(errors.direccion || errors.distrito || errors.telefono);
  if (!hasAddressErrors) {
    const deliveryError = getCheckoutDeliveryError(args);
    if (deliveryError) errors.delivery = deliveryError;
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
