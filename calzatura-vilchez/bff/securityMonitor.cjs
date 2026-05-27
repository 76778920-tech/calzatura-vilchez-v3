"use strict";

const { hashIp } = require("./clientIp.cjs");
const { incrementAbuseCounter } = require("./securityStore.cjs");
const { recordSecurityAlert } = require("./securityAlertQueue.cjs");

const ABUSE_WINDOW_MS = 60 * 60 * 1000;

function parseThreshold(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

const VALIDATION_ABUSE_MAX = parseThreshold(process.env.SECURITY_VALIDATION_ABUSE_MAX, 5);
const BRUTE_FORCE_MAX = parseThreshold(process.env.SECURITY_BRUTE_FORCE_MAX, 10);

const SURFACES = {
  LIBRO_RECLAMACIONES: "libro_reclamaciones",
  AUTH_LOGIN: "auth_login",
  LOOKUP_DNI: "lookup_dni",
  ORS_PROXY: "ors_proxy",
  CHECK_EMAIL: "check_email",
  DELIVERY_GEOCODE: "delivery_geocode",
  DELIVERY_REVERSE: "delivery_reverse",
  DELIVERY_ROUTE: "delivery_route",
  DELIVERY_DISTANCE: "delivery_distance",
  DELIVERY_QUOTE: "delivery_quote",
};

const SURFACE_LABELS = {
  libro_reclamaciones: "Libro de reclamaciones",
  auth_login: "Inicio de sesión (authLogin)",
  lookup_dni: "Consulta DNI",
  ors_proxy: "Proxy mapas (ORS)",
  check_email: "Verificación de correo",
  delivery_geocode: "Geocodificación (delivery/geocode)",
  delivery_reverse: "Reverse geocode (delivery/reverse)",
  delivery_route: "Ruta de envío (delivery/route)",
  delivery_distance: "Distancia (delivery/distance)",
  delivery_quote: "Cotización envío (delivery/quote)",
};

function surfaceLabel(surface) {
  return SURFACE_LABELS[surface] || surface;
}

function validationBucketKey(surface, ip) {
  return `v:${surface}:${hashIp(ip)}`;
}

function bruteForceBucketKey(surface, ip) {
  return `bf:${surface}:${hashIp(ip)}`;
}

async function dispatchAlert({ event, ip, details }, logServerError) {
  const log = logServerError || ((label, err) => console.error(label, err));
  try {
    await recordSecurityAlert({ event, ipHash: hashIp(ip), details }, log);
  } catch (err) {
    log("securityMonitor dispatchAlert:", err?.message || err);
  }
}

function runMonitorTask(task, logServerError) {
  void task.catch((err) => {
    const log = logServerError || ((label, error) => console.error(label, error));
    log("securityMonitor:", err?.message || err);
  });
}

/** Límite de solicitudes superado (429 o equivalente). */
function onRateLimitExceeded({ surface, ip, limit }, logServerError) {
  runMonitorTask(
    dispatchAlert(
      {
        event: `${surfaceLabel(surface)}: rate limit`,
        ip,
        details: [
          `Superficie: ${surface}`,
          `Límite: ${limit}`,
          "Posible spam, scraping o prueba automatizada.",
          "Revisa logs del BFF en Render y el panel de Resend.",
        ],
      },
      logServerError,
    ),
    logServerError,
  );
}

/** Varios envíos con datos inválidos desde la misma IP en la misma superficie. */
async function onValidationFailure({ surface, ip, fields }, logServerError) {
  const count = await incrementAbuseCounter(validationBucketKey(surface, ip), ABUSE_WINDOW_MS);
  if (count !== VALIDATION_ABUSE_MAX) return;

  const fieldList = fields && typeof fields === "object" ? Object.keys(fields).join(", ") : "desconocido";
  await dispatchAlert(
    {
      event: `${surfaceLabel(surface)}: intentos inválidos`,
      ip,
      details: [
        `Superficie: ${surface}`,
        `Intentos inválidos en la última hora: ${count} (umbral ${VALIDATION_ABUSE_MAX}).`,
        `Campos rechazados (último intento): ${fieldList}.`,
      ],
    },
    logServerError,
  );
}

/** Credenciales incorrectas con formato válido (fuerza bruta). */
async function onBruteForceAttempt({ surface, ip }, logServerError) {
  const count = await incrementAbuseCounter(bruteForceBucketKey(surface, ip), ABUSE_WINDOW_MS);
  if (count !== BRUTE_FORCE_MAX) return;

  await dispatchAlert(
    {
      event: `${surfaceLabel(surface)}: fuerza bruta`,
      ip,
      details: [
        `Superficie: ${surface}`,
        `Intentos fallidos en la última hora: ${count} (umbral ${BRUTE_FORCE_MAX}).`,
        "Posible ataque de adivinación de contraseñas o pruebas automatizadas.",
      ],
    },
    logServerError,
  );
}

/** Origen no permitido, App Check fallido, etc. */
async function onAuthProbeFailure({ surface, ip, reason }, logServerError) {
  const key = `probe:${surface}:${hashIp(ip)}`;
  const count = await incrementAbuseCounter(key, ABUSE_WINDOW_MS);
  if (count !== VALIDATION_ABUSE_MAX) return;

  await dispatchAlert(
    {
      event: `${surfaceLabel(surface)}: acceso no autorizado`,
      ip,
      details: [
        `Superficie: ${surface}`,
        `Motivo: ${reason}`,
        `Intentos en la última hora: ${count}.`,
      ],
    },
    logServerError,
  );
}

module.exports = {
  SURFACES,
  parseThreshold,
  VALIDATION_ABUSE_MAX,
  BRUTE_FORCE_MAX,
  onRateLimitExceeded,
  onValidationFailure,
  onBruteForceAttempt,
  onAuthProbeFailure,
};
