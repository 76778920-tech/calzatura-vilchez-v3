import { DELIVERY_CONFIG } from "@/config/delivery";
import { getBackendApiBaseUrl } from "@/config/apiBackend";

const ORS_ORIGIN = "https://api.openrouteservice.org";
const ORS_GEOCODE_SEARCH = "/geocode/search";
const ORS_GEOCODE_STRUCTURED = "/geocode/search/structured";
const ORS_GEOCODE_AUTOCOMPLETE = "/geocode/autocomplete";
const ORS_GEOCODE_REVERSE = "/geocode/reverse";
const ORS_MATRIX = "/v2/matrix/driving-car";
const ORS_DIRECTIONS = "/v2/directions/driving-car/geojson";

/** Coordenadas Leaflet `[lat, lng]`. */
export type MapRoutePosition = [number, number];

const DEFAULT_GEOCODE_SIZE = 15;
const ORS_UNAVAILABLE_MESSAGE =
  "No se pudo consultar ubicaciones ahora. Completa la dirección manualmente; el envío se registrará sin cálculo automático.";

class OpenRouteServiceUnavailableError extends Error {
  readonly status?: number;

  constructor(status?: number) {
    super(ORS_UNAVAILABLE_MESSAGE);
    this.name = "OpenRouteServiceUnavailableError";
    this.status = status;
  }
}

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

function orsUsesBffProxy(): boolean {
  return Boolean(getBackendApiBaseUrl());
}

function assertOrsAvailable(): void {
  if (!hasOpenRouteServiceKey()) {
    throw new Error("Falta VITE_ORS_API_KEY o VITE_BACKEND_API_URL (proxy ORS en BFF)");
  }
}

/** URL absoluta hacia ORS directo o hacia el proxy del BFF (`/ors/...`). */
function buildOrsUrl(pathname: string, qs: URLSearchParams): string {
  const bff = getBackendApiBaseUrl();
  if (bff) {
    const proxyQs = new URLSearchParams();
    qs.forEach((value, key) => {
      if (key !== "api_key") proxyQs.set(key, value);
    });
    const q = proxyQs.toString();
    return `${bff}/ors${pathname}${q ? `?${q}` : ""}`;
  }
  const apiKey = getApiKey();
  if (apiKey) {
    qs.set("api_key", apiKey);
  }
  return `${ORS_ORIGIN}${pathname}?${qs.toString()}`;
}

function orsJsonRequestInit(body: unknown): RequestInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!orsUsesBffProxy()) {
    const apiKey = getApiKey();
    if (apiKey) headers.Authorization = apiKey;
  }
  return { method: "POST", headers, body: JSON.stringify(body) };
}

export function hasOpenRouteServiceKey(): boolean {
  return Boolean(getApiKey()) || orsUsesBffProxy();
}

type BffGeocodeResponse = { candidates?: GeocodeCandidate[] };
type BffReverseResponse = { label?: string | null };
type BffRouteResponse = { positions?: MapRoutePosition[]; distanceKm?: number | null };
type BffDistanceResponse = { distanceKm?: number | null };

async function fetchBffDelivery<T>(path: string, qs: URLSearchParams): Promise<T | null> {
  const bff = getBackendApiBaseUrl();
  if (!bff) return null;
  const q = qs.toString();
  const url = q ? `${bff}${path}?${q}` : `${bff}${path}`;
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function bffGeocodeCandidates(query: string, limit = DEFAULT_GEOCODE_SIZE): Promise<GeocodeCandidate[]> {
  const qs = new URLSearchParams();
  qs.set("q", query);
  qs.set("limit", String(limit));
  const data = await fetchBffDelivery<BffGeocodeResponse>("/delivery/geocode", qs);
  return Array.isArray(data?.candidates) ? data.candidates : [];
}

export function isDeliveryLookupUnavailableError(err: unknown): boolean {
  if (err instanceof OpenRouteServiceUnavailableError) return true;
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("failed to fetch") || msg.includes("load failed") || msg.includes("networkerror");
}

export function deliveryLookupErrorMessage(err: unknown, fallback: string): string {
  if (isDeliveryLookupUnavailableError(err)) return ORS_UNAVAILABLE_MESSAGE;
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

/** Mensaje claro cuando ORS rechaza la clave (401/403) — suele ser clave errónea, cuota o dominio no permitido. */
function openRouteGeocodeError(operation: string, status: number): Error {
  if (status === 401 || status === 403 || status === 429) {
    if (import.meta.env.DEV) {
      console.warn(
        `${operation}: OpenRouteService respondio ${status}. Revisa VITE_ORS_API_KEY, cuota y restricciones por referrer.`,
      );
    }
    return new OpenRouteServiceUnavailableError(status);
  }
  return new Error(`${operation}: HTTP ${status}`);
}

async function fetchOpenRoute(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  operation: string,
  allowedStatuses: readonly number[] = [],
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (import.meta.env.DEV) {
      console.warn(`${operation}: no se pudo contactar OpenRouteService`, err);
    }
    throw new OpenRouteServiceUnavailableError();
  }
  if (!response.ok && !allowedStatuses.includes(response.status)) {
    throw openRouteGeocodeError(operation, response.status);
  }
  return response;
}

function optionalStructuredFallback(err: unknown): GeocodeCandidate[] {
  if (isDeliveryLookupUnavailableError(err)) throw err;
  return [];
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

function isAsciiDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isAsciiLetter(char: string): boolean {
  const upper = char.toUpperCase();
  return upper >= "A" && upper <= "Z";
}

function isWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

function normalizeHouseNumber(value: string, maxDigits: number): string | null {
  const candidate = value.trim().toUpperCase();
  if (!candidate) return null;

  let digitCount = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    const char = candidate[index];
    if (isAsciiDigit(char)) {
      digitCount += 1;
      if (digitCount > maxDigits) return null;
      continue;
    }

    if (index !== candidate.length - 1 || !isAsciiLetter(char)) return null;
  }

  return digitCount > 0 ? candidate : null;
}

function splitByHashMarker(value: string): { street: string; housenumber: string } | null {
  const markerIndex = value.lastIndexOf("#");
  if (markerIndex <= 0) return null;

  const street = value.slice(0, markerIndex).replaceAll(",", " ").trim();
  const housenumber = normalizeHouseNumber(value.slice(markerIndex + 1), 6);
  return street.length >= 2 && housenumber ? { street, housenumber } : null;
}

function splitByNroMarker(value: string): { street: string; housenumber: string } | null {
  const lower = value.toLowerCase();
  for (let index = 1; index < lower.length; index += 1) {
    if (lower[index] !== "n" || !isWhitespace(lower[index - 1])) continue;

    const tail = lower.slice(index + 1);
    let markerLength = 0;
    if (tail.startsWith("ro.")) {
      markerLength = 4;
    } else if (tail.startsWith("ro")) {
      markerLength = 3;
    } else if (tail.startsWith("°") || tail.startsWith("º")) {
      markerLength = 2;
    }
    if (markerLength === 0) continue;

    const street = value.slice(0, index).trim();
    const housenumber = normalizeHouseNumber(value.slice(index + markerLength), 6);
    if (street.length >= 2 && housenumber) return { street, housenumber };
  }

  return null;
}

function splitTrailingHouseNumber(value: string): { street: string; housenumber: string } | null {
  const lastSpace = value.lastIndexOf(" ");
  if (lastSpace <= 0) return null;

  const street = value.slice(0, lastSpace).trim();
  const housenumber = normalizeHouseNumber(value.slice(lastSpace + 1), 5);
  if (street.length < 4 || !housenumber) return null;

  const numberPart = Number.parseInt(housenumber, 10);
  if ((numberPart >= 1900 && numberPart <= 2099 && housenumber.length === 4) || numberPart < 1 || numberPart > 99999) {
    return null;
  }

  return { street, housenumber };
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

  const hash = splitByHashMarker(q);
  if (hash) {
    return hash;
  }

  const nro = splitByNroMarker(q);
  if (nro) {
    return nro;
  }

  const endNum = splitTrailingHouseNumber(q);
  if (endNum) {
    return endNum;
  }

  return { street: q };
}

export function addressLabelContainsHousenumber(label: string, housenumber: string): boolean {
  return labelContainsHousenumber(label, housenumber);
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

/** Si hay número de puerta, prioriza resultados que lo incluyan en la etiqueta. */
export function preferHousenumberMatches(
  list: GeocodeCandidate[],
  housenumber?: string,
): GeocodeCandidate[] {
  const hn = housenumber?.trim();
  if (!hn) return list;
  const matches = list.filter((c) => labelContainsHousenumber(c.label, hn));
  return matches.length > 0 ? matches : list;
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
  assertOrsAvailable();
  const qs = new URLSearchParams();
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
  const url = buildOrsUrl(ORS_GEOCODE_SEARCH, qs);
  const response = await fetchOpenRoute(url, { method: "GET" }, "Geocodificacion");
  const data = (await response.json()) as { features?: GeoJsonFeature[] };
  return parseGeocodeFeatures(data, text);
}

/** Búsqueda libre con prioridad a calles/direcciones y reintento sin filtro de capas. */
async function geocodeForwardCandidates(
  text: string,
  size: number,
  opts: { restrictCircle: boolean; useServiceBBox?: boolean; boostHousenumber?: string },
): Promise<GeocodeCandidate[]> {
  if (orsUsesBffProxy()) {
    const list = await bffGeocodeCandidates(text, size);
    return sortCandidatesForCheckout(list, { housenumber: opts.boostHousenumber });
  }
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
  if (orsUsesBffProxy()) {
    return bffGeocodeCandidates(text, size);
  }
  assertOrsAvailable();
  const qs = new URLSearchParams();
  qs.set("text", text);
  qs.set("boundary.country", "PE");
  qs.set("size", String(size));
  appendGeocodeSpatialContext(qs, {
    restrictCircle: opts.restrictCircle,
    useServiceBBox: opts.useServiceBBox,
  });
  const url = buildOrsUrl(ORS_GEOCODE_AUTOCOMPLETE, qs);
  const response = await fetchOpenRoute(url, { method: "GET" }, "Autocompletado");
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

  if (orsUsesBffProxy()) {
    const list = await bffGeocodeCandidates(enriched, size);
    return preferHousenumberMatches(
      sortCandidatesForCheckout(list, { housenumber: parsed.housenumber }),
      parsed.housenumber,
    );
  }

  const structuredParts =
    context?.ciudad?.trim() && (parsed.street.length >= 2 || structuredAddressLine(norm, parsed).length >= 3)
      ? await geocodeStructuredCandidates(
          {
            street: parsed.housenumber ? parsed.street : undefined,
            housenumber: parsed.housenumber,
            address: parsed.housenumber ? undefined : structuredAddressLine(norm, parsed),
            neighbourhood: context?.distrito?.trim() ?? "",
            locality: context.ciudad.trim(),
          },
          size,
        ).catch(optionalStructuredFallback)
      : [];

  const structuredCombined =
    parsed.housenumber && context?.ciudad?.trim()
      ? await geocodeStructuredCandidates(
          {
            address: structuredAddressLine(norm, parsed),
            neighbourhood: context?.distrito?.trim() ?? "",
            locality: context.ciudad.trim(),
          },
          size,
        ).catch(optionalStructuredFallback)
      : [];

  const structured = dedupeCandidates([...structuredParts, ...structuredCombined]);

  const spatial = { useServiceBBox: true, restrictCircle: false };
  const auto = await fetchGeocodeAutocomplete(enriched, size, spatial);
  const forward = await geocodeForwardCandidates(enriched, size, {
    ...spatial,
    boostHousenumber: parsed.housenumber,
  });

  return preferHousenumberMatches(
    sortCandidatesForCheckout(dedupeCandidates([...structured, ...auto, ...forward]), {
      housenumber: parsed.housenumber,
    }),
    parsed.housenumber,
  );
}

/** Sugerencias según formulario: dirección normalizada + estructurada + búsqueda acotada al área de servicio. */
export async function geocodeCheckoutFormSuggestions(args: {
  direccion: string;
  distrito: string;
  ciudad: string;
}): Promise<GeocodeCandidate[]> {
  const size = DEFAULT_GEOCODE_SIZE;
  const line = [args.direccion, args.distrito, args.ciudad].map((s) => s.trim()).filter(Boolean).join(", ");
  const lineNorm = normalizeGeocodeQuery(line);
  const lineParsed = parseStreetHousenumber(lineNorm);
  const enrichedLine = enrichGeocodeTextWithLocality(
    structuredAddressLine(lineNorm, lineParsed),
    args.ciudad,
    args.distrito,
  );

  if (orsUsesBffProxy()) {
    const list = line.length >= 3 ? await bffGeocodeCandidates(enrichedLine, size) : [];
    return preferHousenumberMatches(
      sortCandidatesForCheckout(list, { housenumber: lineParsed.housenumber }),
      lineParsed.housenumber,
    );
  }

  const addrNorm = normalizeGeocodeQuery(args.direccion);
  const parsed = parseStreetHousenumber(addrNorm);
  const addressStructured = structuredAddressLine(addrNorm, parsed);

  const structuredStreet = parsed.housenumber ? parsed.street : undefined;
  const structuredNumber = parsed.housenumber;
  const structuredByParts = await geocodeStructuredCandidates(
    {
      street: structuredStreet,
      housenumber: structuredNumber,
      address: structuredNumber ? undefined : addressStructured,
      neighbourhood: args.distrito.trim(),
      locality: args.ciudad.trim(),
    },
    size,
  ).catch(optionalStructuredFallback);

  const structuredCombined =
    structuredNumber && structuredStreet
      ? await geocodeStructuredCandidates(
          {
            address: addressStructured,
            neighbourhood: args.distrito.trim(),
            locality: args.ciudad.trim(),
          },
          size,
        ).catch(optionalStructuredFallback)
      : [];

  const structured = dedupeCandidates([...structuredByParts, ...structuredCombined]);

  const forward =
    line.length >= 5
      ? await geocodeForwardCandidates(enrichedLine, size, {
          restrictCircle: false,
          useServiceBBox: true,
          boostHousenumber: lineParsed.housenumber,
        })
      : [];

  const merged = preferHousenumberMatches(
    sortCandidatesForCheckout(dedupeCandidates([...structured, ...forward]), {
      housenumber: lineParsed.housenumber,
    }),
    lineParsed.housenumber,
  );
  return merged;
}

type StructuredGeocodeParts = {
  street?: string;
  housenumber?: string;
  address?: string;
  neighbourhood: string;
  locality: string;
};

async function geocodeStructuredCandidates(
  parts: StructuredGeocodeParts,
  size: number,
): Promise<GeocodeCandidate[]> {
  if (orsUsesBffProxy()) {
    const q = [parts.street, parts.housenumber, parts.address, parts.neighbourhood, parts.locality, "Perú"]
      .filter(Boolean)
      .join(", ");
    return bffGeocodeCandidates(q, size);
  }
  assertOrsAvailable();
  const street = parts.street?.trim() ?? "";
  const housenumber = parts.housenumber?.trim() ?? "";
  const address = parts.address?.trim() ?? "";
  if (!street && !housenumber && !address && !parts.neighbourhood && !parts.locality) {
    return [];
  }
  const qs = new URLSearchParams();
  qs.set("size", String(size));
  if (street) qs.set("street", street);
  if (housenumber) qs.set("housenumber", housenumber);
  if (address) qs.set("address", address);
  if (parts.neighbourhood) qs.set("neighbourhood", parts.neighbourhood);
  if (parts.locality) qs.set("locality", parts.locality);
  qs.set("country", "PER");
  appendGeocodeSpatialContext(qs, {
    restrictCircle: !DELIVERY_CONFIG.geocodeBbox,
    useServiceBBox: Boolean(DELIVERY_CONFIG.geocodeBbox),
  });

  const url = buildOrsUrl(ORS_GEOCODE_STRUCTURED, qs);
  const response = await fetchOpenRoute(
    url,
    { method: "GET" },
    "Geocodificacion estructurada",
    [400, 403, 404, 405],
  );
  if (!response.ok) return [];
  const data = (await response.json()) as { features?: GeoJsonFeature[] };
  const fallbackLabel = address || [street, housenumber].filter(Boolean).join(" ") || parts.locality;
  const raw = parseGeocodeFeatures(data, fallbackLabel);
  return sortCandidatesForCheckout(raw, { housenumber: housenumber || undefined });
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
  if (!hasOpenRouteServiceKey()) {
    return null;
  }
  if (orsUsesBffProxy()) {
    const qs = new URLSearchParams();
    qs.set("lat", String(lat));
    qs.set("lon", String(lng));
    const data = await fetchBffDelivery<BffReverseResponse>("/delivery/reverse", qs);
    return data?.label ?? null;
  }
  const qs = new URLSearchParams();
  qs.set("point.lon", String(lng));
  qs.set("point.lat", String(lat));
  qs.set("boundary.country", "PE");
  const url = buildOrsUrl(ORS_GEOCODE_REVERSE, qs);
  const response = await fetchOpenRoute(url, { method: "GET" }, "Geocodificacion inversa").catch(() => null);
  if (!response) return null;
  const data = (await response.json()) as {
    features?: Array<{ properties: { label?: string } }>;
  };
  return data.features?.[0]?.properties?.label ?? null;
}

/** Geometría de la ruta en auto (tienda → entrega) para dibujar en el mapa. */
export async function fetchDrivingRoutePositions(
  storeLat: number,
  storeLng: number,
  destLat: number,
  destLng: number,
): Promise<MapRoutePosition[]> {
  if (orsUsesBffProxy()) {
    const qs = new URLSearchParams();
    qs.set("storeLat", String(storeLat));
    qs.set("storeLng", String(storeLng));
    qs.set("destLat", String(destLat));
    qs.set("destLng", String(destLng));
    const data = await fetchBffDelivery<BffRouteResponse>("/delivery/route", qs);
    const positions = data?.positions;
    return Array.isArray(positions) && positions.length >= 3 ? positions : [];
  }
  assertOrsAvailable();
  const url = buildOrsUrl(ORS_DIRECTIONS, new URLSearchParams());
  const response = await fetchOpenRoute(
    url,
    orsJsonRequestInit({
      coordinates: [
        [storeLng, storeLat],
        [destLng, destLat],
      ],
    }),
    "Directions (ruta)",
  );
  const data = (await response.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
  };
  const coords = data.features?.[0]?.geometry?.coordinates;
  /** Menos de 3 vértices ≈ línea recta; no dibujar como “ruta por calles”. */
  if (!coords || coords.length < 3) {
    return [];
  }
  return coords.map(([lng, lat]) => [lat, lng] as MapRoutePosition);
}

/** ¿La geometría representa una ruta real (no solo origen–destino)? */
export function isDrivingRouteGeometry(positions: MapRoutePosition[] | null | undefined): boolean {
  return Boolean(positions && positions.length >= 3);
}

async function drivingDistanceKm(storeLng: number, storeLat: number, destLng: number, destLat: number): Promise<number> {
  if (orsUsesBffProxy()) {
    const qs = new URLSearchParams();
    qs.set("storeLat", String(storeLat));
    qs.set("storeLng", String(storeLng));
    qs.set("destLat", String(destLat));
    qs.set("destLng", String(destLng));
    const data = await fetchBffDelivery<BffDistanceResponse>("/delivery/distance", qs);
    const d = data?.distanceKm;
    if (typeof d === "number" && Number.isFinite(d)) return d;
    throw new TypeError("No se pudo calcular la distancia");
  }
  assertOrsAvailable();
  const url = buildOrsUrl(ORS_MATRIX, new URLSearchParams());
  const response = await fetchOpenRoute(
    url,
    orsJsonRequestInit({
      locations: [
        [storeLng, storeLat],
        [destLng, destLat],
      ],
      metrics: ["distance"],
      units: "km",
    }),
    "Matrix (distancia)",
  );
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

/** Cotización aproximada (línea recta) cuando ORS Matrix no está disponible; el mapa sigue usable. */
export function estimateDeliveryQuoteHaversine(
  destLat: number,
  destLng: number,
  label?: string,
): DeliveryQuote {
  const { storeLat, storeLng } = DELIVERY_CONFIG;
  const distanceKm = haversineKm(storeLat, storeLng, destLat, destLng);
  const quote = quoteFromDistanceKm(distanceKm, label);
  return {
    ...quote,
    distanceFormatted: `${distanceKm.toFixed(1)} km (aprox.)`,
    customerLat: destLat,
    customerLng: destLng,
  };
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
