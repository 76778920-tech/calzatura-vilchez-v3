import type { DeliveryQuote } from "@/services/deliveryOpenRoute";

type Args = {
  deliveryPricingActive: boolean;
  locationConfirmed: boolean;
  deliveryQuoteLoading: boolean;
  deliveryQuoteError: string;
  deliveryQuote: DeliveryQuote | null;
};

/** Texto de la fila «Envío» en el resumen del checkout (evita ternarios anidados en el JSX). */
export function checkoutEnvioSummaryLabel({
  deliveryPricingActive,
  locationConfirmed,
  deliveryQuoteLoading,
  deliveryQuoteError,
  deliveryQuote,
}: Args): string {
  if (!deliveryPricingActive) return "S/ 0.00";
  if (!locationConfirmed) return "Confirmar ubicación";
  if (deliveryQuoteLoading) return "…";
  if (deliveryQuoteError) return "—";
  if (!deliveryQuote) return "—";
  if (deliveryQuote.isOutOfRange) return "No disponible";
  if (deliveryQuote.isFreeDelivery) return "Gratis";
  return deliveryQuote.costFormatted;
}
