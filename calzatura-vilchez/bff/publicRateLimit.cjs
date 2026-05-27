"use strict";

const { getClientIp } = require("./clientIp.cjs");
const { consumeRateLimit } = require("./securityStore.cjs");
const { onRateLimitExceeded, SURFACES, parseThreshold } = require("./securityMonitor.cjs");

function buildRateLimitSpecs() {
  return {
    [SURFACES.AUTH_LOGIN]: {
      max: parseThreshold(process.env.LOGIN_RATE_MAX, 15),
      windowMs: parseThreshold(process.env.LOGIN_RATE_WINDOW_MS, 30 * 60 * 1000),
      label: "15/30min",
    },
    [SURFACES.ORS_PROXY]: {
      max: parseThreshold(process.env.ORS_RATE_MAX, 60),
      windowMs: parseThreshold(process.env.ORS_RATE_WINDOW_MS, 30 * 60 * 1000),
      label: "60/30min",
    },
    [SURFACES.CHECK_EMAIL]: {
      max: parseThreshold(process.env.CHECK_EMAIL_RATE_MAX, 30),
      windowMs: parseThreshold(process.env.CHECK_EMAIL_RATE_WINDOW_MS, 60 * 60 * 1000),
      label: "30/hora",
    },
    [SURFACES.LIBRO_RECLAMACIONES]: {
      max: parseThreshold(process.env.COMPLAINT_RATE_MAX, 8),
      windowMs: parseThreshold(process.env.COMPLAINT_RATE_WINDOW_MS, 60 * 60 * 1000),
      label: "8/hora",
    },
    [SURFACES.LOOKUP_DNI]: {
      max: parseThreshold(process.env.DNI_RATE_MAX, 4),
      windowMs: parseThreshold(process.env.DNI_RATE_WINDOW_MS, 30 * 60 * 1000),
      label: "4/30min",
    },
    [SURFACES.DELIVERY_GEOCODE]: {
      max: parseThreshold(process.env.DELIVERY_GEOCODE_RATE_MAX, 45),
      windowMs: parseThreshold(process.env.DELIVERY_RATE_WINDOW_MS, 30 * 60 * 1000),
      label: "45/30min",
    },
    [SURFACES.DELIVERY_REVERSE]: {
      max: parseThreshold(process.env.DELIVERY_REVERSE_RATE_MAX, 30),
      windowMs: parseThreshold(process.env.DELIVERY_RATE_WINDOW_MS, 30 * 60 * 1000),
      label: "30/30min",
    },
    [SURFACES.DELIVERY_ROUTE]: {
      max: parseThreshold(process.env.DELIVERY_ROUTE_RATE_MAX, 35),
      windowMs: parseThreshold(process.env.DELIVERY_RATE_WINDOW_MS, 30 * 60 * 1000),
      label: "35/30min",
    },
    [SURFACES.DELIVERY_DISTANCE]: {
      max: parseThreshold(process.env.DELIVERY_DISTANCE_RATE_MAX, 35),
      windowMs: parseThreshold(process.env.DELIVERY_RATE_WINDOW_MS, 30 * 60 * 1000),
      label: "35/30min",
    },
    [SURFACES.DELIVERY_QUOTE]: {
      max: parseThreshold(process.env.DELIVERY_QUOTE_RATE_MAX, 40),
      windowMs: parseThreshold(process.env.DELIVERY_RATE_WINDOW_MS, 30 * 60 * 1000),
      label: "40/30min",
    },
  };
}

function specLabel(spec) {
  const windowMin = Math.round(spec.windowMs / 60_000);
  return `${spec.max}/${windowMin}min`;
}

/**
 * Aplica rate limit distribuido (Upstash) o memoria local.
 * @returns {Promise<{ limited: boolean, count: number }>}
 */
async function enforceRateLimit(req, surface, logServerError) {
  const spec = buildRateLimitSpecs()[surface];
  if (!spec) {
    throw new Error(`publicRateLimit: superficie desconocida ${surface}`);
  }
  const ip = getClientIp(req);
  const key = `rl:${surface}:${ip}`;
  const { limited, count } = await consumeRateLimit(key, spec.max, spec.windowMs);
  if (limited) {
    onRateLimitExceeded(
      {
        surface,
        ip,
        limit: spec.label || specLabel(spec),
      },
      logServerError,
    );
  }
  return { limited, count };
}

module.exports = {
  buildRateLimitSpecs,
  enforceRateLimit,
};
