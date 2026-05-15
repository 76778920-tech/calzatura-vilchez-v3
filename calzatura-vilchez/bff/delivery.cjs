/**
 * Geocodificación (Nominatim) y rutas/distancia (OSRM, con ORS opcional si la clave lo permite).
 * Evita 403 de Pelias cuando la clave ORS no incluye geocoding.
 */
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";
const ORS_BASE = "https://api.openrouteservice.org";
const DELIVERY_UA =
  "CalzaturaVilchez/1.0 (checkout; https://calzaturavilchez-ab17f.web.app)";

function stripEnvKey(value) {
  let k = String(value || "").trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

function getOrsApiKey() {
  return stripEnvKey(process.env.ORS_API_KEY) || stripEnvKey(process.env.VITE_ORS_API_KEY);
}

/** @type {boolean | null} */
let orsRoutingAllowed = null;

async function probeOrsRouting() {
  if (orsRoutingAllowed !== null) return orsRoutingAllowed;
  const apiKey = getOrsApiKey();
  if (!apiKey) {
    orsRoutingAllowed = false;
    return false;
  }
  try {
    const res = await fetch(`${ORS_BASE}/v2/matrix/driving-car`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations: [
          [-75.205806, -12.071054],
          [-75.21, -12.075],
        ],
        metrics: ["distance"],
        units: "km",
      }),
    });
    if (res.status === 403 || res.status === 401) {
      orsRoutingAllowed = false;
      return false;
    }
    orsRoutingAllowed = res.ok;
    return res.ok;
  } catch {
    orsRoutingAllowed = false;
    return false;
  }
}

function nominatimLayer(place) {
  const t = place.type || place.class || "";
  if (t === "house" || t === "building" || t === "residential") return "address";
  if (t === "road" || t === "pedestrian" || t === "street") return "street";
  if (t === "suburb" || t === "neighbourhood") return "neighbourhood";
  if (t === "city" || t === "town" || t === "village") return "locality";
  return t || undefined;
}

function mapNominatimPlace(place) {
  return {
    lat: Number.parseFloat(place.lat),
    lng: Number.parseFloat(place.lon),
    label: place.display_name || "",
    layer: nominatimLayer(place),
  };
}

function inBbox(lat, lng, bbox) {
  if (!bbox) return true;
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLon && lng <= bbox.maxLon;
}

async function nominatimSearch(query, limit, bbox) {
  const q = String(query || "").trim();
  if (q.length < 3) return [];
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "pe");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 20)));

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": DELIVERY_UA, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map(mapNominatimPlace)
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && inBbox(c.lat, c.lng, bbox));
}

async function nominatimReverse(lat, lng) {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": DELIVERY_UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.display_name || null;
}

async function osrmDrivingRoute(storeLng, storeLat, destLng, destLat) {
  const path = `${OSRM_BASE}/route/v1/driving/${storeLng},${storeLat};${destLng},${destLat}`;
  const url = `${path}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return { positions: [], distanceKm: null };
  const data = await res.json();
  const route = data.routes?.[0];
  const coords = route?.geometry?.coordinates;
  const positions =
    Array.isArray(coords) && coords.length >= 3
      ? coords.map(([lng, lat]) => [lat, lng])
      : [];
  const distanceKm =
    typeof route?.distance === "number" && Number.isFinite(route.distance)
      ? route.distance / 1000
      : null;
  return { positions, distanceKm };
}

async function orsDrivingRoute(storeLng, storeLat, destLng, destLat) {
  const apiKey = getOrsApiKey();
  if (!apiKey) return { positions: [], distanceKm: null };
  const res = await fetch(`${ORS_BASE}/v2/directions/driving-car/geojson?api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [storeLng, storeLat],
        [destLng, destLat],
      ],
    }),
  });
  if (!res.ok) return { positions: [], distanceKm: null };
  const data = await res.json();
  const coords = data.features?.[0]?.geometry?.coordinates;
  const positions =
    Array.isArray(coords) && coords.length >= 3
      ? coords.map(([lng, lat]) => [lat, lng])
      : [];
  let distanceKm = null;
  if (typeof data.features?.[0]?.properties?.summary?.distance === "number") {
    distanceKm = data.features[0].properties.summary.distance / 1000;
  }
  return { positions, distanceKm };
}

async function drivingRoute(storeLng, storeLat, destLng, destLat) {
  if (await probeOrsRouting()) {
    const ors = await orsDrivingRoute(storeLng, storeLat, destLng, destLat);
    if (ors.positions.length >= 3) return ors;
  }
  return osrmDrivingRoute(storeLng, storeLat, destLng, destLat);
}

async function drivingDistanceKm(storeLng, storeLat, destLng, destLat) {
  if (await probeOrsRouting()) {
    const apiKey = getOrsApiKey();
    const res = await fetch(`${ORS_BASE}/v2/matrix/driving-car`, {
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
    if (res.ok) {
      const data = await res.json();
      const d = data.distances?.[0]?.[1];
      if (typeof d === "number" && Number.isFinite(d)) return d;
    }
  }
  const route = await osrmDrivingRoute(storeLng, storeLat, destLng, destLat);
  if (route.distanceKm != null) return route.distanceKm;
  return null;
}

function parseBbox(raw) {
  if (!raw || typeof raw !== "string") return null;
  const p = raw.split(",").map((s) => Number(s.trim()));
  if (p.length !== 4 || !p.every((n) => Number.isFinite(n))) return null;
  return { minLat: p[0], minLon: p[1], maxLat: p[2], maxLon: p[3] };
}

const DEFAULT_BBOX = { minLat: -12.38, minLon: -75.55, maxLat: -11.78, maxLon: -74.78 };

function getServiceBbox() {
  return parseBbox(process.env.VITE_GEOCODE_BBOX) || DEFAULT_BBOX;
}

async function geocodeCandidates(query, limit) {
  const bbox = getServiceBbox();
  const base = await nominatimSearch(query, limit, bbox);
  if (base.length > 0) return base;
  return nominatimSearch(`${query}, Perú`, limit, bbox);
}

module.exports = {
  geocodeCandidates,
  nominatimReverse,
  drivingRoute,
  drivingDistanceKm,
  stripEnvKey,
};
