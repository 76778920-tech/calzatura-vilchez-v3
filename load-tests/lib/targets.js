/**
 * Configuración compartida para pruebas k6 (carga / estrés lectura).
 * Variables: ver load-tests/config.env.example
 */

const PROD_HOST_MARKERS = [
  "calzaturavilchez-ab17f.web.app",
  "onrender.com",
  "supabase.co",
];

export function getConfig() {
  const supabaseUrl = String(__ENV.SUPABASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  const supabaseAnonKey = String(__ENV.SUPABASE_ANON_KEY || "").trim();
  const bffBaseUrl = String(__ENV.BFF_BASE_URL || __ENV.VITE_BACKEND_API_URL || "")
    .trim()
    .replace(/\/$/, "");
  const hostingUrl = String(
    __ENV.HOSTING_URL || "https://calzaturavilchez-ab17f.web.app",
  )
    .trim()
    .replace(/\/$/, "");
  const aiBaseUrl = String(__ENV.AI_SERVICE_URL || __ENV.VITE_AI_SERVICE_URL || "")
    .trim()
    .replace(/\/$/, "");

  const loadEnv = String(__ENV.LOAD_ENV || "staging").trim().toLowerCase();
  const allowProd = String(__ENV.ALLOW_PROD_LOAD || "").toLowerCase() === "true";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan SUPABASE_URL y SUPABASE_ANON_KEY. Copia load-tests/config.env.example",
    );
  }

  assertLoadEnvironment({ loadEnv, allowProd, supabaseUrl, bffBaseUrl, hostingUrl });

  const destLat = Number(__ENV.DELIVERY_DEST_LAT || "-12.0464");
  const destLng = Number(__ENV.DELIVERY_DEST_LNG || "-77.0428");

  return {
    supabaseUrl,
    supabaseAnonKey,
    bffBaseUrl,
    hostingUrl,
    aiBaseUrl,
    loadEnv,
    restBase: `${supabaseUrl}/rest/v1`,
    deliveryQuoteQuery: `destLat=${destLat}&destLng=${destLng}`,
    maxVus: Number(__ENV.LOAD_MAX_VUS || "2000"),
    rampUp: __ENV.LOAD_RAMP_UP || "5m",
    steady: __ENV.LOAD_STEADY || "10m",
    rampDown: __ENV.LOAD_RAMP_DOWN || "2m",
  };
}

function assertLoadEnvironment({ loadEnv, allowProd, supabaseUrl, bffBaseUrl, hostingUrl }) {
  if (loadEnv === "production" && !allowProd) {
    throw new Error(
      "LOAD_ENV=production bloqueado. Define ALLOW_PROD_LOAD=true solo con ventana aprobada.",
    );
  }

  if (loadEnv === "local") {
    return;
  }

  if (loadEnv !== "production") {
    const urls = [supabaseUrl, bffBaseUrl, hostingUrl].filter(Boolean);
    const looksProd = urls.some((u) => hostLooksProduction(u));
    if (looksProd && !allowProd) {
      throw new Error(
        "URLs parecen producción y LOAD_ENV no es 'local'. " +
          "Usa LOAD_ENV=staging con proyecto Supabase/BFF de prueba, o ALLOW_PROD_LOAD=true.",
      );
    }
  }
}

function hostLooksProduction(urlString) {
  try {
    const host = new URL(urlString).hostname.toLowerCase();
    return PROD_HOST_MARKERS.some((m) => host.includes(m));
  } catch {
    return false;
  }
}

export function supabaseHeaders(anonKey) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/json",
  };
}

export function buildStages(targetVus, rampUp, steady, rampDown) {
  return [
    { duration: rampUp, target: targetVus },
    { duration: steady, target: targetVus },
    { duration: rampDown, target: 0 },
  ];
}
