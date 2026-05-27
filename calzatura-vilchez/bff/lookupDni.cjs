/**
 * Consulta DNI con failover entre proveedores (primer éxito gana).
 *
 * Variables de entorno (Render / serverless) — configura al menos UNA:
 *   APISPERU_TOKEN o APISPERU_DNIRUC_TOKEN — APIsPERU dniruc.apisperu.com (query token), prioridad 1
 *   CONSULTAS_PERU_TOKEN — ConsultasPerú (body token), prioridad 2
 *   PERUAPI_TOKEN o TOKEN_PERUAPI — Perú API peruapi.com (cabecera X-API-KEY), prioridad 3
 *   API_INTI_TOKEN       — ApiInti app.apiinti.dev (Bearer), prioridad 4
 *   APIPERU_DEV_TOKEN    — apiperu.dev (Bearer), prioridad 5
 *   LATINFO_API_KEY o CLAVE_API_LATINFO — Latinfo (solo entidades; personas → out_of_scope), último
 *
 * Orígenes CORS: allowedOrigins abajo (añade preview/staging si hace falta).
 */

function loadAllowedOrigins() {
  const defaults = [
    "https://calzaturavilchez-ab17f.web.app",
    "https://calzaturavilchez-ab17f.firebaseapp.com",
    "https://project-rif8c.vercel.app",
    "https://project-riff-bff.vercel.app",
    "https://project-nfb8c.vercel.app",
    "https://calzatura-vilchez-v3.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  const extras = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...defaults, ...extras]);
}

const allowedOrigins = loadAllowedOrigins();

const crypto = require("crypto");
const { getClientIp } = require("./clientIp.cjs");
const {
  onValidationFailure,
  onAuthProbeFailure,
  SURFACES,
} = require("./securityMonitor.cjs");

const DNI_LOOKUP_PROOF_TTL_MS = 30 * 60 * 1000;

function authorizeLookupRequest(req) {
  // Clientes móviles nativos no envían Origin — se identifican con este header
  if (req.headers["x-calzatura-client"] === "calzatura-mobile") {
    return { ok: true };
  }
  const origin = req.headers.origin;
  if (!origin) return { ok: false, status: 403, error: "Origen requerido" };
  if (!allowedOrigins.has(origin)) {
    return { ok: false, status: 403, error: "Origen no permitido" };
  }
  return { ok: true };
}

function lookupProofSecret() {
  return process.env.DNI_LOOKUP_PROOF_SECRET?.trim() || "";
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signLookupPayload(payload) {
  const secret = lookupProofSecret();
  if (!secret) return "";
  const encoded = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyDniLookupProof(token) {
  const secret = lookupProofSecret();
  const raw = String(token || "").trim();
  if (!secret || !raw.includes(".")) return null;
  const [encoded, sig] = raw.split(".", 2);
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    if (Number(payload.exp) < Date.now()) return null;
    const dni = normalizeDni(payload.dni);
    const nombres = String(payload.nombres || "").trim().toUpperCase();
    const apellidos = String(payload.apellidos || "").trim().toUpperCase();
    if (!/^\d{8}$/.test(dni) || !nombres || !apellidos) return null;
    return { dni, nombres, apellidos };
  } catch {
    return null;
  }
}

const { enforceRateLimit } = require("./publicRateLimit.cjs");
const REQUEST_TIMEOUT_MS = 10_000;

/** Primera variable definida y no vacía (soporta alias en Vercel). */
function envFirstTrimmed(...names) {
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  return "";
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Calzatura-Client, X-Firebase-AppCheck"
  );
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
    envFirstTrimmed("APISPERU_TOKEN", "APISPERU_DNIRUC_TOKEN")
    || process.env.CONSULTAS_PERU_TOKEN?.trim()
    || envFirstTrimmed("PERUAPI_TOKEN", "TOKEN_PERUAPI")
    || process.env.API_INTI_TOKEN?.trim()
    || process.env.APIPERU_DEV_TOKEN?.trim()
    || envFirstTrimmed("LATINFO_API_KEY", "CLAVE_API_LATINFO")
  );
}

/** @returns {{ person: object | null, httpStatus: number | null, skipped: boolean }} */
async function tryApisPeru(dni) {
  const token = envFirstTrimmed("APISPERU_TOKEN", "APISPERU_DNIRUC_TOKEN");
  if (!token) return { person: null, httpStatus: null, skipped: true };
  const url = new URL(`https://dniruc.apisperu.com/api/v1/dni/${dni}`);
  url.searchParams.set("token", token);
  const { ok, status, json } = await fetchJson(url.toString(), { method: "GET" });
  if (!ok) return { person: null, httpStatus: status, skipped: false };
  const person = personFromRecord(json, dni);
  return { person, httpStatus: status, skipped: false };
}

/** @returns {{ person: object | null, httpStatus: number | null, skipped: boolean }} */
async function tryLatinfo(dni) {
  const token = envFirstTrimmed("LATINFO_API_KEY", "CLAVE_API_LATINFO");
  if (!token) return { person: null, httpStatus: null, skipped: true };
  const { ok, status, json } = await fetchJson(`https://api.latinfo.dev/pe/dni/${dni}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!ok) {
    if (status === 404 && json?.error === "out_of_scope") {
      return { person: null, httpStatus: null, skipped: true };
    }
    return { person: null, httpStatus: status, skipped: false };
  }
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

/**
 * Failover en cadena: 1 → 2 → 3… hasta el primer proveedor que devuelva nombre/apellidos.
 * Si un proveedor no tiene token, se omite (skipped). Si responde pero sin datos o con error, sigue el siguiente.
 */
const PROVIDERS = [
  { name: "apisperu", run: tryApisPeru },
  { name: "consultasperu", run: tryConsultasPeru },
  { name: "peruapi", run: tryPeruApi },
  { name: "apiinti", run: tryApiInti },
  { name: "apiperu.dev", run: tryApiperuDev },
  { name: "latinfo", run: tryLatinfo },
];

async function handleLookupDni(req, res, options = {}) {
  const logServerError = options.logServerError || ((label, err) => console.error(label, err));
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  const clientIp = getClientIp(req);

  const { limited: dniRateLimited } = await enforceRateLimit(req, SURFACES.LOOKUP_DNI, logServerError);
  if (dniRateLimited) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Intenta nuevamente." });
  }

  if (options.requireProofSecret && !lookupProofSecret()) {
    return res.status(503).json({ error: "Validacion DNI no configurada" });
  }

  const authz = authorizeLookupRequest(req);
  if (!authz.ok) {
    void onAuthProbeFailure(
      {
        surface: SURFACES.LOOKUP_DNI,
        ip: clientIp,
        reason: authz.error || "Origen no autorizado",
      },
      logServerError,
    );
    return res.status(authz.status).json({ error: authz.error });
  }

  if (options.requireAppCheck) {
    const isMobileClient = req.headers["x-calzatura-client"] === "calzatura-mobile";
    if (!isMobileClient) {
      const appCheckToken = req.headers["x-firebase-appcheck"];
      const token = typeof appCheckToken === "string" ? appCheckToken.trim() : "";
      const verified = token && typeof options.verifyAppCheckToken === "function"
        ? await options.verifyAppCheckToken(token)
        : false;
      if (!verified) {
        void onAuthProbeFailure(
          {
            surface: SURFACES.LOOKUP_DNI,
            ip: clientIp,
            reason: "App Check inválido o ausente",
          },
          logServerError,
        );
        return res.status(401).json({ error: "App Check requerido" });
      }
    }
  }

  const origin = req.headers.origin;

  const dni = normalizeDni(req.body?.dni);
  if (!/^\d{8}$/.test(dni)) {
    void onValidationFailure(
      { surface: SURFACES.LOOKUP_DNI, ip: clientIp, fields: { dni: "invalid" } },
      logServerError,
    );
    return res.status(400).json({ error: toPublicError(400) });
  }

  if (!hasAnyProviderToken()) {
    const fallbackUrl = (
      process.env.DNI_LOOKUP_FALLBACK_URL?.trim() ||
      "https://project-rif8c.vercel.app/api/lookup-dni"
    );
    try {
      const { status, json: payload } = await fetchJson(fallbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Origin": "https://calzaturavilchez-ab17f.web.app",
        },
        body: JSON.stringify({ dni }),
      });
      return res.status(status).json(payload);
    } catch {
      return res.status(502).json({ error: toPublicError(502) });
    }
  }

  let sawHttp = false;
  let all404 = true;
  let lastProvider = "";
  let lastHttpStatus = null;
  const attempts = [];

  try {
    for (const { name, run } of PROVIDERS) {
      let outcome;
      try {
        outcome = await run(dni);
      } catch (err) {
        console.error(`[lookup-dni] ${name} error:`, err?.message || err);
        all404 = false;
        attempts.push({ provider: name, status: "error" });
        lastProvider = name;
        lastHttpStatus = null;
        continue;
      }

      const { person, httpStatus, skipped } = outcome;
      if (skipped) {
        attempts.push({ provider: name, status: "skipped" });
        continue;
      }

      sawHttp = true;
      lastProvider = name;
      lastHttpStatus = httpStatus;
      attempts.push({ provider: name, status: httpStatus ?? "error" });
      if (httpStatus !== 404) all404 = false;

      if (person) {
        if (origin && allowedOrigins.has(origin)) {
          res.setHeader("Access-Control-Expose-Headers", "X-DNI-Provider");
        }
        res.setHeader("X-DNI-Provider", name);
        const lookupToken = signLookupPayload({
          ...person,
          exp: Date.now() + DNI_LOOKUP_PROOF_TTL_MS,
        });
        return res.status(200).json({ ...person, lookupToken });
      }
    }

    const status = sawHttp && all404 ? 404 : 502;
    const body = { error: toPublicError(status), attempts };
    if (status === 502) {
      const authFailure = attempts.find(
        (item) => item.status === 401 || item.status === 403,
      );
      if (authFailure) {
        body.detail =
          `Token invalido o sin permiso en ${authFailure.provider} (HTTP ${authFailure.status}). Renueva el token o configura otro proveedor (APISPERU_TOKEN, CONSULTAS_PERU_TOKEN, APIPERU_DEV_TOKEN, etc.) en el mismo servicio que expone /lookup-dni.`;
      } else if (lastProvider) {
        body.detail = `Ningun proveedor devolvio datos validos. Ultimo intento: ${lastProvider} (HTTP ${lastHttpStatus ?? "error"}).`;
      } else {
        body.detail =
          "Ninguna llamada HTTP a proveedores se completó (timeouts o excepciones).";
      }
      if (origin && allowedOrigins.has(origin)) {
        res.setHeader(
          "Access-Control-Expose-Headers",
          "X-DNI-Last-Provider,X-DNI-Last-Status,X-DNI-Saw-Http",
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

module.exports = { handleLookupDni, verifyDniLookupProof };
