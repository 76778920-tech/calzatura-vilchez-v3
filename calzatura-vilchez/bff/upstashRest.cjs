"use strict";

const REQUEST_TIMEOUT_MS = 2500;

function getConfig() {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return null;
  return {
    baseUrl,
    headers: { Authorization: `Bearer ${token}` },
  };
}

function isConfigured() {
  return Boolean(getConfig());
}

async function restCommand(segments, query = {}) {
  const cfg = getConfig();
  if (!cfg) return { ok: false, unavailable: true };

  const path = segments.map((s) => encodeURIComponent(String(s))).join("/");
  const params = new URLSearchParams(query);
  const qs = params.toString();
  const url = `${cfg.baseUrl}/${path}${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: cfg.headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const json = await res.json();
    return { ok: true, result: json.result };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function incr(key) {
  const out = await restCommand(["incr", key]);
  if (!out.ok) return null;
  const n = Number(out.result);
  return Number.isFinite(n) ? n : null;
}

async function expire(key, seconds) {
  const sec = Math.max(1, Math.floor(Number(seconds) || 1));
  await restCommand(["expire", key, sec]);
}

async function get(key) {
  const out = await restCommand(["get", key]);
  if (!out.ok) return null;
  return out.result;
}

/** SET con NX y EX (segundos). Devuelve true si se estableció la clave. */
async function setNxEx(key, value, exSeconds) {
  const out = await restCommand(["set", key, value], { NX: "true", EX: String(Math.max(1, Math.floor(exSeconds))) });
  if (!out.ok) return null;
  return out.result === "OK";
}

async function rpush(key, value) {
  const out = await restCommand(["rpush", key, value]);
  if (!out.ok) return null;
  const n = Number(out.result);
  return Number.isFinite(n) ? n : null;
}

async function lrange(key, start, stop) {
  const out = await restCommand(["lrange", key, start, stop]);
  if (!out.ok) return null;
  return Array.isArray(out.result) ? out.result : [];
}

async function del(key) {
  await restCommand(["del", key]);
}

module.exports = {
  getConfig,
  isConfigured,
  incr,
  expire,
  get,
  setNxEx,
  rpush,
  lrange,
  del,
};
