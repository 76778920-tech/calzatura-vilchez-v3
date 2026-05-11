/** Caja WGS84 para acotar geocodificación al área de reparto (evita homónimos en Lima, etc.). */
export type GeocodeBbox = {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
};

/** Valle de Mantaro / Huancayo y alrededores (ampliable con VITE_GEOCODE_BBOX). */
const DEFAULT_GEOCODE_BBOX: GeocodeBbox = {
  minLat: -12.38,
  minLon: -75.55,
  maxLat: -11.78,
  maxLon: -74.78,
};

function parseGeocodeBbox(): GeocodeBbox | null {
  const raw = import.meta.env.VITE_GEOCODE_BBOX?.trim().toLowerCase();
  if (raw === "0" || raw === "off" || raw === "none" || raw === "false") {
    return null;
  }
  if (raw) {
    const p = raw.split(",").map((s) => Number(s.trim()));
    if (p.length === 4 && p.every((n) => Number.isFinite(n))) {
      return { minLat: p[0], minLon: p[1], maxLat: p[2], maxLon: p[3] };
    }
  }
  return DEFAULT_GEOCODE_BBOX;
}

/** Tarifas y sede para envío (Huancayo). Sobrescribibles con variables VITE_*. */
export const DELIVERY_CONFIG = {
  basePrice: Number(import.meta.env.VITE_DELIVERY_BASE_PRICE ?? 3),
  pricePerKm: Number(import.meta.env.VITE_DELIVERY_PRICE_PER_KM ?? 2),
  maxFreeDistanceKm: Number(import.meta.env.VITE_DELIVERY_FREE_KM ?? 2),
  maxDeliveryKm: Number(import.meta.env.VITE_DELIVERY_MAX_KM ?? 15),
  storeLat: Number(import.meta.env.VITE_STORE_LAT ?? -12.071054),
  storeLng: Number(import.meta.env.VITE_STORE_LNG ?? -75.205806),
  geocodeBbox: parseGeocodeBbox(),
} as const;
