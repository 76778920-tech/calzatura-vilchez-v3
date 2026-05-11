import type { Address } from "@/types";
import { formatPeruPhone, isValidPeruPhone, peruPhoneError } from "@/utils/phone";
import { DELIVERY_CONFIG } from "@/config/delivery";
import type { DeliveryQuote, GeocodeCandidate } from "@/services/deliveryOpenRoute";
import { buildCheckoutAddressLine } from "@/domains/carrito/utils/checkoutAddressLine";

type ValidateArgs = {
  direccion: Address;
  orsEnabled: boolean;
  selectedDelivery: GeocodeCandidate | null;
  deliveryQuoteLoading: boolean;
  deliveryQuoteError: string;
  deliveryQuote: DeliveryQuote | null;
};

/** Devuelve mensaje de error para `toast.error`, o `null` si puede pasar al paso pago. */
export function validateCheckoutDireccionStep({
  direccion,
  orsEnabled,
  selectedDelivery,
  deliveryQuoteLoading,
  deliveryQuoteError,
  deliveryQuote,
}: ValidateArgs): string | null {
  if (!direccion.direccion || !direccion.distrito || !direccion.telefono) {
    return "Completa todos los campos requeridos";
  }
  const phoneError = peruPhoneError(direccion.telefono);
  if (phoneError || !isValidPeruPhone(direccion.telefono)) {
    return phoneError ?? "Ingresa un teléfono válido";
  }
  if (!orsEnabled) return null;

  const line = buildCheckoutAddressLine(direccion);
  if (line.length >= 10 && !selectedDelivery) {
    return "Elegí un punto de entrega: una sugerencia de la lista, una búsqueda o el mapa.";
  }
  if (deliveryQuoteLoading) {
    return "Espera un momento: estamos calculando el costo de envío.";
  }
  if (deliveryQuoteError) {
    return deliveryQuoteError;
  }
  if (!deliveryQuote || deliveryQuote.isOutOfRange) {
    return `No podemos entregar a esa dirección (máx. ${DELIVERY_CONFIG.maxDeliveryKm} km desde la tienda).`;
  }
  return null;
}

export function formatDireccionTelefonoForSubmit(direccion: Address): Address {
  return {
    ...direccion,
    telefono: formatPeruPhone(direccion.telefono),
  };
}
