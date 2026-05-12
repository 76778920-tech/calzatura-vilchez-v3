/**
 * Consulta DNI con failover entre proveedores (primer éxito gana).
 *
 * Variables de entorno (Vercel / serverless) — configura al menos UNA:
 *   LATINFO_API_KEY o CLAVE_API_LATINFO — Latinfo (Bearer), prioridad 1
 *   CONSULTAS_PERU_TOKEN — ConsultasPerú (body token), prioridad 2
 *   PERUAPI_TOKEN o TOKEN_PERUAPI — Perú API peruapi.com (cabecera X-API-KEY), prioridad 3
 *   API_INTI_TOKEN       — ApiInti app.apiinti.dev (Bearer), prioridad 4
 *   APIPERU_DEV_TOKEN    — apiperu.dev (Bearer), prioridad 5
 *
 * Orígenes CORS: allowedOrigins abajo (añade preview/staging si hace falta).
 */

const allowedOrigins = new Set([
  "https://calzaturavilchez-ab17f.web.app",
  "https://calzaturavilchez-ab17f.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;
const ipBuckets = new Map();
const REQUEST_TIMEOUT_MS = 10_000;

/** Primera variable definida y no vacía (soporta alias en Vercel). */
function envFirstTrimmed(...names) {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return "";
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    ipBuckets.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeDni(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

function toPublicError(status) {
  if (status === 400) return "DNI invalido";
  if (status === 404) return "DNI no encontrado";
  return "No se pudo validar el DNI";
}

/** Une `data` anidada con la raíz para leer campos en un solo objeto. */
function mergeDataBlocks(json) {
  if (!json || typeof json !== "object") return {};
  const inner = json.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return { ...json, ...inner };
  }
  return json;
}

/**
 * Heurística para nombre completo sin campos separados (RENIEC / APIs variadas).
 * 2 palabras: nombre + apellido; 3: nombre + dos apellidos; 4+: dos nombres + resto apellidos.
 */
function splitPeruvianFullName(full) {
  const words = String(full || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 2) return null;
  const up = (s) => s.toUpperCase();
  if (words.length === 2) return { nombres: up(words[0]), apellidos: up(words[1]) };
  if (words.length === 3) return { nombres: up(words[0]), apellidos: up(`${words[1]} ${words[2]}`) };
  return { nombres: up(words.slice(0, 2).join(" ")), apellidos: up(words.slice(2).join(" ")) };
}

/** Normaliza respuesta de cualquier proveedor a { dni, nombres, apellidos } o null. */
function personFromRecord(raw, requestedDni) {
  const data = mergeDataBlocks(raw);
  if (raw && raw.success === false && !data.nombres && !data.nombre && !data.full_name) {
    return null;
  }

  const dni = normalizeDni(
    data.number
    || data.dni
    || data.numero
    || data.document_number
    || data.numDocumento
    || requestedDni
  );

  let nombres = String(
    data.nombres
    || data.nombre
    || [data.nombre1, data.nombre2].filter(Boolean).join(" ")
    || ""
  ).trim();

  const p1 = data.apellido_paterno || data.apellidoPaterno || data.first_last_name || data.apellido1;
  const p2 = data.apellido_materno || data.apellidoMaterno || data.second_last_name || data.apellido2;
  let apellidos = "";
  if (p1 || p2) {
    apellidos = [p1, p2].filter(Boolean).join(" ").trim();
  }
  if (!apellidos) {
    apellidos = String(data.apellidos || data.surname || data.last_name || "").trim();
  }

  const full =
    data.full_name
    || data.fullName
    || data.nombre_completo
    || data.nombreCompleto
    || data.complete_name
    || data.name
    || "";

  if ((!nombres || !apellidos) && full) {
    const sp = splitPeruvianFullName(full);
    if (sp) {
      nombres = nombres || sp.nombres;
      apellidos = apellidos || sp.apellidos;
    }
  }

  nombres = nombres.toUpperCase();
  apellidos = apellidos.toUpperCase();

  if (dni !== requestedDni || !nombres || !apellidos) return null;
  return { dni, nombres, apellidos };
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  return { ok: res.ok, status: res.status, json };
}

function hasAnyProviderToken() {
  return Boolean(
    envFirstTrimmed("LATINFO_API_KEY", "CLAVE_API_LATINFO")
    || process.env.CONSULTAS_PERU_TOKEN?.trim()
    || envFirstTrimmed("PERUAPI_TOKEN", "TOKEN_PERUAPI")
    || process.env.API_INTI_TOKEN?.trim()
    || process.env.APIPERU_DEV_TOKEN?.trim()
  );
}

/** @returns {{ person: object | null, httpStatus: number | null, skipped: boolean }} */
async function tryLatinfo(dni) {
  const token = envFirstTrimmed("LATINFO_API_KEY", "CLAVE_API_LATINFO");
  if (!token) return { person: null, httpStatus: null, skipped: true };
  const { ok, status, json } = await fetchJson(`https://api.latinfo.dev/pe/dni/${dni}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ok) return { person: null, httpStatus: status, skipped: false };
  const person = personFromRecord(json, dni);
  return { person, httpStatus: status, skipped: false };
}

async function tryConsultasPeru(dni) {
  const token = process.env.CONSULTAS_PERU_TOKEN?.trim();
  if (!token) return { person: null, httpStatus: null, skipped: true };
  const { ok, status, json } = await fetchJson("https://api.consultasperu.com/api/v1/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      type_document: "dni",
      document_number: dni,
    }),
  });
  const person =
    ok && json.success !== false ? personFromRecord(json, dni) : null;
  return { person, httpStatus: status, skipped: false };
}

async function tryPeruApi(dni) {
  const token = envFirstTrimmed("PERUAPI_TOKEN", "TOKEN_PERUAPI");
  if (!token) return { person: null, httpStatus: null, skipped: true };
  // Documentación: https://peruapi.com/documentacion — GET + X-API-KEY
  const { ok, status, json } = await fetchJson(
    `https://peruapi.com/api/dni/${dni}?summary=0&plan=0`,
    {
      method: "GET",
      headers: { "X-API-KEY": token },
    }
  );
  if (!ok) return { person: null, httpStatus: status, skipped: false };
  const codeOk = json.code == null || String(json.code) === "200";
  if (!codeOk) {
    const asNum = Number.parseInt(String(json.code), 10);
    return {
      person: null,
      httpStatus: Number.isFinite(asNum) && asNum >= 400 && asNum < 600 ? asNum : 502,
      skipped: false,
    };
  }
  const person = personFromRecord(json, dni);
  return { person, httpStatus: status, skipped: false };
}

async function tryApiInti(dni) {
  const token = process.env.API_INTI_TOKEN?.trim();
  if (!token) return { person: null, httpStatus: null, skipped: true };
  const { ok, status, json } = await fetchJson(`https://app.apiinti.dev/api/v1/dni/${dni}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ok) return { person: null, httpStatus: status, skipped: false };
  const person = personFromRecord(json, dni);
  return { person, httpStatus: status, skipped: false };
}

async function tryApiperuDev(dni) {
  const token = process.env.APIPERU_DEV_TOKEN?.trim();
  if (!token) return { person: null, httpStatus: null, skipped: true };
  const { ok, status, json } = await fetchJson(`https://apiperu.dev/api/dni/${dni}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ok) return { person: null, httpStatus: status, skipped: false };
  const person = personFromRecord(json, dni);
  return { person, httpStatus: status, skipped: false };
}

const PROVIDERS = [
  { name: "latinfo", run: tryLatinfo },
  { name: "consultasperu", run: tryConsultasPeru },
  { name: "peruapi", run: tryPeruApi },
  { name: "apiinti", run: tryApiInti },
  { name: "apiperu.dev", run: tryApiperuDev },
];

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  const origin = req.headers.origin;
  if (!origin) {
    return res.status(403).json({ error: "Origen requerido" });
  }

  if (!allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "Origen no permitido" });
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Intenta nuevamente." });
  }

  const dni = normalizeDni(req.body?.dni);
  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).json({ error: toPublicError(400) });
  }

  if (!hasAnyProviderToken()) {
    return res.status(500).json({
      error: "Servicio no configurado",
      detail:
        "Define al menos una variable DNI: LATINFO_API_KEY o CLAVE_API_LATINFO, CONSULTAS_PERU_TOKEN, PERUAPI_TOKEN o TOKEN_PERUAPI, API_INTI_TOKEN o APIPERU_DEV_TOKEN",
    });
  }

  let sawHttp = false;
  let all404 = true;
  /** Último proveedor que sí llamó a red (no skipped), para diagnosticar 502 en Network. */
  let lastProvider = "";
  let lastHttpStatus = null;

  try {
    for (const { name, run } of PROVIDERS) {
      let outcome;
      try {
        outcome = await run(dni);
      } catch (err) {
        console.error(`[lookup-dni] ${name} error:`, err?.message || err);
        all404 = false;
        lastProvider = name;
        lastHttpStatus = null;
        continue;
      }

      const { person, httpStatus, skipped } = outcome;
      if (skipped) continue;

      sawHttp = true;
      lastProvider = name;
      lastHttpStatus = httpStatus;
      if (httpStatus !== 404) all404 = false;

      if (person) {
        if (origin && allowedOrigins.has(origin)) {
          res.setHeader("Access-Control-Expose-Headers", "X-DNI-Provider");
        }
        res.setHeader("X-DNI-Provider", name);
        return res.status(200).json(person);
      }
    }

    const status = sawHttp && all404 ? 404 : 502;
    const body = { error: toPublicError(status) };
    if (status === 502) {
      if (lastProvider) {
        body.detail = `Ningun proveedor devolvio datos validos. Ultimo intento: ${lastProvider} (HTTP ${lastHttpStatus ?? "error"}). En Vercel: Logs de esta funcion, variables de entorno en el mismo proyecto que despliega esta URL (LATINFO/CLAVE_API_LATINFO, PERUAPI/TOKEN_PERUAPI, etc.). Si usas peruapi.com en plan free, revisa IP permitida.`;
      } else {
        body.detail =
          "Ninguna llamada HTTP a proveedores se completó (timeouts o excepciones). Revisa Vercel Logs de esta funcion.";
      }
      if (origin && allowedOrigins.has(origin)) {
        res.setHeader(
          "Access-Control-Expose-Headers",
          "X-DNI-Last-Provider,X-DNI-Last-Status,X-DNI-Saw-Http"
        );
        res.setHeader("X-DNI-Last-Provider", lastProvider || "none");
        res.setHeader("X-DNI-Last-Status", lastHttpStatus != null ? String(lastHttpStatus) : "");
        res.setHeader("X-DNI-Saw-Http", sawHttp ? "1" : "0");
      }
    }
    return res.status(status).json(body);
  } catch (error) {
    console.error("[lookup-dni] fatal:", error);
    return res.status(502).json({ error: toPublicError(502) });
  }
}
