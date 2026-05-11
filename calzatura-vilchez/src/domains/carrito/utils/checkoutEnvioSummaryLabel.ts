import type { DeliveryQuote } from "@/services/deliveryOpenRoute";

type Args = {
  orsEnabled: boolean;
  deliveryQuoteLoading: boolean;
  deliveryQuoteError: string;
  deliveryQuote: DeliveryQuote | null;
};

/** Texto de la fila «Envío» en el resumen del checkout (evita ternarios anidados en el JSX). */
export function checkoutEnvioSummaryLabel({
  orsEnabled,
  deliveryQuoteLoading,
  deliveryQuoteError,
  deliveryQuote,
}: Args): string {
  if (!orsEnabled) return "S/ 0.00";
  if (deliveryQuoteLoading) return "…";
  if (deliveryQuoteError) return "—";
  if (!deliveryQuote) return "—";
  if (deliveryQuote.isOutOfRange) return "No disponible";
  if (deliveryQuote.isFreeDelivery) return "Gratis";
  return deliveryQuote.costFormatted;
}
