import { DELIVERY_CONFIG } from "@/config/delivery";

const ORS_GEOCODE = "https://api.openrouteservice.org/geocode/search";
const ORS_MATRIX = "https://api.openrouteservice.org/v2/matrix/driving-car";

export type DeliveryQuote = {
  distanceKm: number;
  distanceFormatted: string;
  cost: number;
  costFormatted: string;
  isOutOfRange: boolean;
  isFreeDelivery: boolean;
  label?: string;
};

function getApiKey(): string | undefined {
  const k = import.meta.env.VITE_ORS_API_KEY?.trim();
  return k || undefined;
}

export function hasOpenRouteServiceKey(): boolean {
  return Boolean(getApiKey());
}

export async function geocodeAddressPeru(addressLine: string): Promise<{ lat: number; lng: number; label: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Falta VITE_ORS_API_KEY");
  }
  const url = `${ORS_GEOCODE}?api_key=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(addressLine)}&boundary.country=PE`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Geocodificación: HTTP ${response.status}`);
  }
  const data = (await response.json()) as {
    features?: Array<{ geometry: { coordinates: [number, number] }; properties: { label?: string } }>;
  };
  const first = data.features?.[0];
  if (!first) {
    throw new Error("No se encontró la dirección en Perú");
  }
  const [lng, lat] = first.geometry.coordinates;
  return { lat, lng, label: first.properties.label ?? addressLine };
}

async function drivingDistanceKm(storeLng: number, storeLat: number, destLng: number, destLat: number): Promise<number> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Falta VITE_ORS_API_KEY");
  }
  const response = await fetch(ORS_MATRIX, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locations: [
        [storeLng, storeLat],
        [destLng, destLat],
      ],
      metrics: ["distance"],
      units: "km",
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Matrix: HTTP ${response.status}${errText ? ` — ${errText.slice(0, 120)}` : ""}`);
  }
  const data = (await response.json()) as { distances?: number[][] };
  const d = data.distances?.[0]?.[1];
  if (typeof d !== "number" || !Number.isFinite(d)) {
    throw new Error("No se pudo calcular la distancia");
  }
  return d;
}

export function quoteFromDistanceKm(distanceKm: number, label?: string): DeliveryQuote {
  const { basePrice, pricePerKm, maxFreeDistanceKm, maxDeliveryKm } = DELIVERY_CONFIG;
  const isOutOfRange = distanceKm > maxDeliveryKm;
  const isFreeDelivery = distanceKm <= maxFreeDistanceKm;
  let cost = 0;
  if (!isOutOfRange && !isFreeDelivery) {
    const distanceToCharge = Math.max(0, distanceKm - maxFreeDistanceKm);
    cost = basePrice + distanceToCharge * pricePerKm;
    cost = Math.round(cost * 100) / 100;
  }

  return {
    distanceKm,
    distanceFormatted: `${distanceKm.toFixed(1)} km`,
    cost,
    costFormatted: `S/ ${cost.toFixed(2)}`,
    isOutOfRange,
    isFreeDelivery,
    label,
  };
}

/** Geocodifica la dirección y calcula distancia/tarifa desde la tienda. */
export async function calculateDeliveryForAddressLine(addressLine: string): Promise<DeliveryQuote> {
  const { storeLat, storeLng } = DELIVERY_CONFIG;
  const geo = await geocodeAddressPeru(addressLine);
  const distanceKm = await drivingDistanceKm(storeLng, storeLat, geo.lng, geo.lat);
  return quoteFromDistanceKm(distanceKm, geo.label);
}
