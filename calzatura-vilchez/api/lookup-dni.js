const allowedOrigins = new Set([
  "https://calzaturavilchez-ab17f.web.app",
  "https://calzaturavilchez-ab17f.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutos
const RATE_LIMIT_MAX_REQUESTS = 15; // máximo POST por IP en esa ventana
const ipBuckets = new Map();

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

function normalizeDniResponse(payload, requestedDni) {
  const data = payload?.data || {};
  const dni = normalizeDni(data.number || data.dni || data.numero || requestedDni);
  const nombres = String(data.name || data.nombres || data.nombre || "").trim().toUpperCase();
  const apellidos = String(
    data.surname
    || data.apellidos
    || [data.first_last_name, data.second_last_name].filter(Boolean).join(" ")
  ).trim().toUpperCase();

  if (dni !== requestedDni || !nombres || !apellidos) {
    return null;
  }

  return { dni, nombres, apellidos };
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  const clientIp = getClientIp(req);
  const reqContext = {
    method: req.method,
    path: req.url,
    origin: req.headers.origin || null,
    host: req.headers.host || null,
    hasAuthorization: Boolean(req.headers.authorization),
    hasApiKey: Boolean(req.headers["x-api-key"]),
    forwardedFor: req.headers["x-forwarded-for"] || null,
    clientIp,
  };

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

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Intenta nuevamente." });
  }

  const dni = normalizeDni(req.body?.dni);
  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).json({ error: toPublicError(400) });
  }

  if (!process.env.CONSULTAS_PERU_TOKEN) {
    return res.status(500).json({ error: "Servicio no configurado" });
  }

  try {
    const response = await fetch("https://api.consultasperu.com/api/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: process.env.CONSULTAS_PERU_TOKEN,
        type_document: "dni",
        document_number: dni,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    const result = response.ok && payload.success !== false
      ? normalizeDniResponse(payload, dni)
      : null;

    if (!result) {
      const status = response.status === 404 ? 404 : 502;
      return res.status(status).json({ error: toPublicError(status) });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("DNI lookup error:", error);
    return res.status(502).json({ error: toPublicError(502) });
  }
}
