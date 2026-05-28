"use strict";

const { get, setEx, incr, isConfigured } = require("./upstashRest.cjs");

const memory = new Map();
const inflight = new Map();
const MEMORY_MAX_ENTRIES = 200;
const GENERATION_KEY = "pubcat:generation";
let localGeneration = 0;

function parseTtlSec() {
  const n = Number(process.env.PUBLIC_CATALOG_CACHE_TTL_SEC);
  if (!Number.isFinite(n) || n < 10) return 60;
  return Math.min(300, Math.max(10, Math.floor(n)));
}

function memoryGet(key) {
  const ent = memory.get(key);
  if (!ent) return undefined;
  if (Date.now() > ent.expires) {
    memory.delete(key);
    return undefined;
  }
  return ent.value;
}

function memorySet(key, value, ttlSec) {
  if (memory.size >= MEMORY_MAX_ENTRIES) {
    const first = memory.keys().next().value;
    if (first) memory.delete(first);
  }
  memory.set(key, { value, expires: Date.now() + ttlSec * 1000 });
}

async function getCachedJson(key) {
  const local = memoryGet(key);
  if (local !== undefined) return local;

  if (!isConfigured()) return null;

  const raw = await get(key);
  if (raw == null || raw === "") return null;

  try {
    const parsed = JSON.parse(raw);
    memorySet(key, parsed, 5);
    return parsed;
  } catch {
    return null;
  }
}

async function setCachedJson(key, value, ttlSec) {
  const ttl = ttlSec ?? parseTtlSec();
  memorySet(key, value, ttl);
  if (!isConfigured()) return;
  await setEx(key, JSON.stringify(value), ttl);
}

async function getCatalogGeneration() {
  if (!isConfigured()) return String(localGeneration);
  const raw = await get(GENERATION_KEY);
  return raw != null ? String(raw) : "0";
}

async function buildCatalogCacheKey(suffix) {
  const gen = await getCatalogGeneration();
  return `pubcat:g${gen}:${suffix}`;
}

/** Invalida caché pública tras mutaciones de producto (admin/RPC). */
async function bumpPublicCatalogCache() {
  memory.clear();
  inflight.clear();
  if (!isConfigured()) {
    localGeneration += 1;
    return;
  }
  await incr(GENERATION_KEY);
}

async function withCatalogCache(suffix, loader) {
  const key = await buildCatalogCacheKey(suffix);
  const cached = await getCachedJson(key);
  if (cached !== null) return cached;

  if (inflight.has(key)) return inflight.get(key);

  const pending = (async () => {
    try {
      const fresh = await loader();
      await setCachedJson(key, fresh, parseTtlSec());
      return fresh;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, pending);
  return pending;
}

module.exports = {
  getCachedJson,
  setCachedJson,
  parseTtlSec,
  bumpPublicCatalogCache,
  withCatalogCache,
};
