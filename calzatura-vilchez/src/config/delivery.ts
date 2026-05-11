/** Tarifas y sede para envío (Huancayo). Sobrescribibles con variables VITE_*. */
export const DELIVERY_CONFIG = {
  basePrice: Number(import.meta.env.VITE_DELIVERY_BASE_PRICE ?? 3),
  pricePerKm: Number(import.meta.env.VITE_DELIVERY_PRICE_PER_KM ?? 2),
  maxFreeDistanceKm: Number(import.meta.env.VITE_DELIVERY_FREE_KM ?? 2),
  maxDeliveryKm: Number(import.meta.env.VITE_DELIVERY_MAX_KM ?? 15),
  storeLat: Number(import.meta.env.VITE_STORE_LAT ?? -12.0686),
  storeLng: Number(import.meta.env.VITE_STORE_LNG ?? -75.2099),
} as const;
