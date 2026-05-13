import { DELIVERY_CONFIG } from "@/config/delivery";

const ORS_GEOCODE_SEARCH = "https://api.openrouteservice.org/geocode/search";
const ORS_GEOCODE_STRUCTURED = "https://api.openrouteservice.org/geocode/search/structured";
const ORS_GEOCODE_AUTOCOMPLETE = "https://api.openrouteservice.org/geocode/autocomplete";
const ORS_GEOCODE_REVERSE = "https://api.openrouteservice.org/geocode/reverse";
const ORS_MATRIX = "https://api.openrouteservice.org/v2/matrix/driving-car";

const DEFAULT_GEOCODE_SIZE = 15;

export type DeliveryQuote = {
  distanceKm: number;
  distanceFormatted: string;
  cost: number;
  costFormatted: string;
  isOutOfRange: boolean;
  isFreeDelivery: boolean;
  label?: string;
  /** Punto geocodificado de la dirección de entrega (para mapa). */
  customerLat?: number;
  customerLng?: number;
};

function getApiKey(): string | undefined {
  const k = import.meta.env.VITE_ORS_API_KEY?.trim();
  return k || undefined;
}

export function hasOpenRouteServiceKey(): boolean {
  return Boolean(getApiKey());
}

export type GeocodeCandidate = {
  lat: number;
  lng: number;
  label: string;
  /** Capa Pelias (address, street, locality…). */
  layer?: string;
};

type GeoJsonFeature = {
  geometry: { coordinates: [number, number] };
  properties?: { label?: string; layer?: string; confidence?: number };
};

function layerRank(layer: string | undefined): number {
  if (!layer) return 22;
  const order = [
    "address",
    "street",
    "venue",
    "interpolated",
    "neighbourhood",
    "borough",
    "macrohood",
    "locality",
    "localadmin",
    "county",
    "macrocounty",
    "region",
    "macroregion",
    "country",
    "ocean",
    "coarse",
  ];
  const i = order.indexOf(layer);
  return i === -1 ? 21 : i;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseGeocodeFeatures(data: { features?: GeoJsonFeature[] }, fallbackLabel: string): GeocodeCandidate[] {
  const list = data.features ?? [];
  return list.map((f) => {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties ?? {};
    return {
      lat,
      lng,
      label: p.label ?? fallbackLabel,
      layer: typeof p.layer === "string" ? p.layer : undefined,
    };
  });
}

function escapeRegExp(s: string): string {
  const specialChars = new Set([".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]);
  return Array.from(s, (char) => (specialChars.has(char) ? `\\${char}` : char)).join("");
}

/** Normaliza #, N°, Nro. para que el geocoder reciba "calle 215". */
export function normalizeGeocodeQuery(q: string): string {
  return q
    .replaceAll("#", " ")
    .replaceAll(/\bN°\s*/gi, " ")
    .replaceAll(/\bNro\.?\s*/gi, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

/**
 * Intenta separar vía y número de puerta (p. ej. "Av. Arica #215" → street + 215).
 */
export function parseStreetHousenumber(input: string): { street: string; housenumber?: string } {
  const q = input.replaceAll(/\s+/g, " ").trim();
  if (!q) return { street: "" };

  const hash = /^(.+?)[\s,]*#\s*(\d{1,6}[A-Z]?)\s*$/.exec(q);
  if (hash && hash[1].trim().length >= 2) {
    return { street: hash[1].trim(), housenumber: hash[2] };
  }

  const nro = /^(.+?)\s+N(?:°|ro\.?)\s*(\d{1,6}[A-Z]?)\s*$/i.exec(q);
  if (nro && nro[1].trim().length >= 2) {
    return { street: nro[1].trim(), housenumber: nro[2] };
  }

  const endNum = /^(.+?)\s(\d{1,5}[A-Z]?)$/.exec(q);
  if (endNum && endNum[1].trim().length >= 4) {
    const num = endNum[2];
    if (/^(19|20)\d{2}$/.test(num)) return { street: q };
    const n = Number.parseInt(num, 10);
    if (n >= 1 && n <= 99999) {
      return { street: endNum[1].trim(), housenumber: num };
    }
  }

  return { street: q };
}

function labelContainsHousenumber(label: string, housenumber: string): boolean {
  const re = new RegExp(String.raw`(?:^|[\s,.-])${escapeRegExp(housenumber)}(?:$|[\s,.-])`);
  return re.test(label);
}

/** Añade distrito/ciudad del formulario si el texto no los menciona (evita homónimos en Lima). */
export function enrichGeocodeTextWithLocality(
  text: string,
  ciudad?: string,
  distrito?: string,
): string {
  let t = text.trim();
  const low = t.toLowerCase();
  const d = distrito?.trim();
  const c = ciudad?.trim();
  if (d && d.length >= 2 && !low.includes(d.toLowerCase())) {
    t = `${t}, ${d}`;
  }
  const low2 = t.toLowerCase();
  if (c && c.length >= 2 && !low2.includes(c.toLowerCase())) {
    t = `${t}, ${c}`;
  }
  if (!/\bper[úu]\b/i.test(t)) {
    t = `${t}, Perú`;
  }
  return t;
}

function structuredAddressLine(
  normalizedQuery: string,
  parsed: { street: string; housenumber?: string },
): string {
  if (parsed.housenumber) {
    return `${parsed.street} ${parsed.housenumber}`.replaceAll(/\s+/g, " ").trim();
  }
  return normalizedQuery;
}

function dedupeCandidates(list: GeocodeCandidate[]): GeocodeCandidate[] {
  const seen = new Set<string>();
  const out: GeocodeCandidate[] = [];
  for (const c of list) {
    const k = `${c.lat.toFixed(5)}:${c.lng.toFixed(5)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function sortCandidatesForCheckout(
  list: GeocodeCandidate[],
  opts?: { housenumber?: string },
): GeocodeCandidate[] {
  const { storeLat, storeLng } = DELIVERY_CONFIG;
  const hn = opts?.housenumber?.trim();
  return [...list].sort((a, b) => {
    const ra = layerRank(a.layer);
    const rb = layerRank(b.layer);
    if (ra !== rb) return ra - rb;
    if (hn) {
      const ma = labelContainsHousenumber(a.label, hn) ? 0 : 1;
      const mb = labelContainsHousenumber(b.label, hn) ? 0 : 1;
      if (ma !== mb) return ma - mb;
    }
    return (
      haversineKm(storeLat, storeLng, a.lat, a.lng) - haversineKm(storeLat, storeLng, b.lat, b.lng)
    );
  });
}

/** focus en tienda + rectángulo de servicio (si existe) o círculo de reparto. */
function appendGeocodeSpatialContext(
  qs: URLSearchParams,
  opts: { restrictCircle: boolean; useServiceBBox: boolean },
): void {
  const { storeLat, storeLng, maxDeliveryKm, geocodeBbox } = DELIVERY_CONFIG;
  qs.set("focus.point.lat", String(storeLat));
  qs.set("focus.point.lon", String(storeLng));

  if (opts.useServiceBBox && geocodeBbox != null) {
    const b = geocodeBbox;
    qs.set("boundary.rect.min_lat", String(b.minLat));
    qs.set("boundary.rect.min_lon", String(b.minLon));
    qs.set("boundary.rect.max_lat", String(b.maxLat));
    qs.set("boundary.rect.max_lon", String(b.maxLon));
    return;
  }

  if (opts.restrictCircle) {
    const r = Math.min(Math.max(maxDeliveryKm * 3, 45), 85);
    qs.set("boundary.circle.lat", String(storeLat));
    qs.set("boundary.circle.lon", String(storeLng));
    qs.set("boundary.circle.radius", String(r));
  }
}

async function fetchGeocodeSearch(
  text: string,
  size: number,
  extra: { layers?: string; restrictCircle: boolean; useServiceBBox: boolean },
): Promise<GeocodeCandidate[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Falta VITE_ORS_API_KEY");
  }
  const qs = new URLSearchParams();
  qs.set("api_key", apiKey);
  qs.set("text", text);
  qs.set("boundary.country", "PE");
  qs.set("size", String(size));
  appendGeocodeSpatialContext(qs, {
    restrictCircle: extra.restrictCircle,
    useServiceBBox: extra.useServiceBBox,
  });
  if (extra.layers) {
    qs.set("layers", extra.layers);
  }
  const url = `${ORS_GEOCODE_SEARCH}?${qs.toString()}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Geocodificación: HTTP ${response.status}`);
  }
  const data = (await response.json()) as { features?: GeoJsonFeature[] };
  return parseGeocodeFeatures(data, text);
}

/** Búsqueda libre con prioridad a calles/direcciones y reintento sin filtro de capas. */
async function geocodeForwardCandidates(
  text: string,
  size: number,
  opts: { restrictCircle: boolean; useServiceBBox?: boolean; boostHousenumber?: string },
): Promise<GeocodeCandidate[]> {
  const useBox = opts.useServiceBBox ?? true;
  const fineLayers = "address,street,venue,neighbourhood,borough";
  let list = await fetchGeocodeSearch(text, size, {
    layers: fineLayers,
    restrictCircle: opts.restrictCircle,
    useServiceBBox: useBox,
  });
  if (list.length < 3) {
    const broad = await fetchGeocodeSearch(text, size, {
      restrictCircle: opts.restrictCircle,
      useServiceBBox: useBox,
    });
    list = dedupeCandidates([...list, ...broad]);
  }
  return sortCandidatesForCheckout(list, { housenumber: opts.boostHousenumber });
}

async function fetchGeocodeAutocomplete(
  text: string,
  size: number,
  opts: { restrictCircle: boolean; useServiceBBox: boolean },
): Promise<GeocodeCandidate[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Falta VITE_ORS_API_KEY");
  }
  const qs = new URLSearchParams();
  qs.set("api_key", apiKey);
  qs.set("text", text);
  qs.set("boundary.country", "PE");
  qs.set("size", String(size));
  appendGeocodeSpatialContext(qs, {
    restrictCircle: opts.restrictCircle,
    useServiceBBox: opts.useServiceBBox,
  });
  const url = `${ORS_GEOCODE_AUTOCOMPLETE}?${qs.toString()}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Autocompletado: HTTP ${response.status}`);
  }
  const data = (await response.json()) as { features?: GeoJsonFeature[] };
  return parseGeocodeFeatures(data, text);
}

/** Campo “buscar en el mapa”: ciudad/distrito del formulario + caja del valle + prioridad al número de puerta. */
export async function geocodeSearchBarSuggestions(
  query: string,
  context?: { ciudad?: string; distrito?: string },
  size = DEFAULT_GEOCODE_SIZE,
): Promise<GeocodeCandidate[]> {
  const norm = normalizeGeocodeQuery(query);
  if (norm.length < 3) return [];
  const parsed = parseStreetHousenumber(norm);
  const enriched = enrichGeocodeTextWithLocality(norm, context?.ciudad, context?.distrito);

  const structured =
    context?.ciudad?.trim() && structuredAddressLine(norm, parsed).length >= 3
      ? await geocodeStructuredCandidates(
          {
            address: structuredAddressLine(norm, parsed),
            neighbourhood: context?.distrito?.trim() ?? "",
            locality: context.ciudad.trim(),
          },
          size,
        ).catch(() => [] as GeocodeCandidate[])
      : [];

  const spatial = { useServiceBBox: true, restrictCircle: false };
  const auto = await fetchGeocodeAutocomplete(enriched, size, spatial);
  const forward = await geocodeForwardCandidates(enriched, size, {
    ...spatial,
    boostHousenumber: parsed.housenumber,
  });

  return sortCandidatesForCheckout(dedupeCandidates([...structured, ...auto, ...forward]), {
    housenumber: parsed.housenumber,
  });
}

/** Sugerencias según formulario: dirección normalizada + estructurada + búsqueda acotada al área de servicio. */
export async function geocodeCheckoutFormSuggestions(args: {
  direccion: string;
  distrito: string;
  ciudad: string;
}): Promise<GeocodeCandidate[]> {
  const size = DEFAULT_GEOCODE_SIZE;
  const addrNorm = normalizeGeocodeQuery(args.direccion);
  const parsed = parseStreetHousenumber(addrNorm);
  const addressStructured = structuredAddressLine(addrNorm, parsed);

  const structured = await geocodeStructuredCandidates(
    {
      address: addressStructured,
      neighbourhood: args.distrito.trim(),
      locality: args.ciudad.trim(),
    },
    size,
  ).catch(() => [] as GeocodeCandidate[]);

  const line = [args.direccion, args.distrito, args.ciudad].map((s) => s.trim()).filter(Boolean).join(", ");
  const lineNorm = normalizeGeocodeQuery(line);
  const lineParsed = parseStreetHousenumber(lineNorm);
  const enrichedLine = enrichGeocodeTextWithLocality(
    structuredAddressLine(lineNorm, lineParsed),
    args.ciudad,
    args.distrito,
  );
  const forward =
    line.length >= 5
      ? await geocodeForwardCandidates(enrichedLine, size, {
          restrictCircle: false,
          useServiceBBox: true,
          boostHousenumber: lineParsed.housenumber,
        })
      : [];

  return sortCandidatesForCheckout(dedupeCandidates([...structured, ...forward]), {
    housenumber: lineParsed.housenumber,
  });
}

async function geocodeStructuredCandidates(
  parts: { address: string; neighbourhood: string; locality: string },
  size: number,
): Promise<GeocodeCandidate[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Falta VITE_ORS_API_KEY");
  }
  if (!parts.address && !parts.neighbourhood && !parts.locality) {
    return [];
  }
  const qs = new URLSearchParams();
  qs.set("api_key", apiKey);
  qs.set("size", String(size));
  if (parts.address) qs.set("address", parts.address);
  if (parts.neighbourhood) qs.set("neighbourhood", parts.neighbourhood);
  if (parts.locality) qs.set("locality", parts.locality);
  qs.set("country", "PER");
  appendGeocodeSpatialContext(qs, {
    restrictCircle: !DELIVERY_CONFIG.geocodeBbox,
    useServiceBBox: Boolean(DELIVERY_CONFIG.geocodeBbox),
  });

  const url = `${ORS_GEOCODE_STRUCTURED}?${qs.toString()}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    if (response.status === 404 || response.status === 400 || response.status === 405) {
      return [];
    }
    throw new Error(`Geocodificación estructurada: HTTP ${response.status}`);
  }
  const data = (await response.json()) as { features?: GeoJsonFeature[] };
  const raw = parseGeocodeFeatures(data, parts.address || parts.locality);
  return sortCandidatesForCheckout(raw);
}

/** @deprecated Preferir `geocodeCheckoutFormSuggestions` o `geocodeSearchBarSuggestions`. */
export async function geocodePeruCandidates(
  addressLine: string,
  size = DEFAULT_GEOCODE_SIZE,
): Promise<GeocodeCandidate[]> {
  return geocodeForwardCandidates(addressLine, size, { restrictCircle: false, useServiceBBox: false });
}

export async function geocodeAddressPeru(addressLine: string): Promise<{ lat: number; lng: number; label: string }> {
  const list = await geocodeForwardCandidates(addressLine, 1, { restrictCircle: false, useServiceBBox: false });
  const first = list[0];
  if (!first) {
    throw new Error("No se encontró la dirección en Perú");
  }
  return first;
}

/** Etiqueta legible al elegir un punto en el mapa (reverse geocode). */
export async function reverseGeocodeLabel(lng: number, lat: number): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }
  const url =
    `${ORS_GEOCODE_REVERSE}?api_key=${encodeURIComponent(apiKey)}` +
    `&point.lon=${encodeURIComponent(String(lng))}&point.lat=${encodeURIComponent(String(lat))}` +
    "&boundary.country=PE";
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    features?: Array<{ properties: { label?: string } }>;
  };
  return data.features?.[0]?.properties?.label ?? null;
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
    const errSnippet = errText ? ` — ${errText.slice(0, 120)}` : "";
    throw new Error(`Matrix: HTTP ${response.status}${errSnippet}`);
  }
  const data = (await response.json()) as { distances?: number[][] };
  const d = data.distances?.[0]?.[1];
  if (typeof d !== "number" || !Number.isFinite(d)) {
    throw new TypeError("No se pudo calcular la distancia");
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

/** Distancia y tarifa desde la tienda a un punto ya conocido (mapa o sugerencia elegida). */
export async function calculateDeliveryForCoordinates(
  destLat: number,
  destLng: number,
  label?: string,
): Promise<DeliveryQuote> {
  const { storeLat, storeLng } = DELIVERY_CONFIG;
  const distanceKm = await drivingDistanceKm(storeLng, storeLat, destLng, destLat);
  const quote = quoteFromDistanceKm(distanceKm, label);
  return { ...quote, customerLat: destLat, customerLng: destLng };
}

/** Geocodifica (primer resultado) y calcula envío — preferir sugerencias de checkout + `calculateDeliveryForCoordinates` en UI. */
export async function calculateDeliveryForAddressLine(addressLine: string): Promise<DeliveryQuote> {
  const geo = await geocodeAddressPeru(addressLine);
  return calculateDeliveryForCoordinates(geo.lat, geo.lng, geo.label);
}
