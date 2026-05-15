import { DELIVERY_CONFIG } from "@/config/delivery";
import type { GeocodeCandidate } from "@/services/deliveryOpenRoute";

export const CHECKOUT_DEFAULT_MAP_PICK: GeocodeCandidate = {
  lat: DELIVERY_CONFIG.storeLat + 0.008,
  lng: DELIVERY_CONFIG.storeLng + 0.008,
  label: "Marcá tu entrega en el mapa o elegí una sugerencia",
};

export function isCheckoutDefaultMapPick(candidate: GeocodeCandidate | null): boolean {
  if (!candidate) return false;
  return (
    Math.abs(candidate.lat - CHECKOUT_DEFAULT_MAP_PICK.lat) < 0.0001 &&
    Math.abs(candidate.lng - CHECKOUT_DEFAULT_MAP_PICK.lng) < 0.0001 &&
    candidate.label === CHECKOUT_DEFAULT_MAP_PICK.label
  );
}
