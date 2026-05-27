"use strict";

const upstash = require("./upstashRest.cjs");

const memoryWindows = new Map();

function currentWindowId(nowMs, windowMs) {
  return Math.floor(nowMs / windowMs);
}

function memoryIncrement(key, windowMs) {
  const now = Date.now();
  const windowId = currentWindowId(now, windowMs);
  const compoundKey = `${key}@${windowId}`;
  const prev = memoryWindows.get(compoundKey) ?? 0;
  const next = prev + 1;
  memoryWindows.set(compoundKey, next);

  if (memoryWindows.size > 20_000) {
    const minWindow = currentWindowId(now, windowMs) - 2;
    for (const k of memoryWindows.keys()) {
      const w = Number(k.split("@").pop());
      if (!Number.isFinite(w) || w < minWindow) memoryWindows.delete(k);
    }
  }

  return next;
}

async function incrementFixedWindow(key, windowMs) {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const windowId = currentWindowId(Date.now(), windowMs);
  const redisKey = `cv:sec:fw:${key}:${windowId}`;

  if (upstash.isConfigured()) {
    const count = await upstash.incr(redisKey);
    if (count === null) {
      return memoryIncrement(key, windowMs);
    }
    if (count === 1) {
      await upstash.expire(redisKey, windowSec);
    }
    return count;
  }

  return memoryIncrement(key, windowMs);
}

/**
 * Incrementa contador en ventana fija (compartido entre réplicas si hay Upstash).
 * @returns {{ count: number, limited: boolean, remaining: number, backend: 'upstash'|'memory' }}
 */
function normalizeLimit(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

async function consumeRateLimit(key, max, windowMs) {
  const safeMax = normalizeLimit(max, 10);
  const safeWindow = normalizeLimit(windowMs, 60_000);
  const count = await incrementFixedWindow(key, safeWindow);
  const limited = count > safeMax;
  return {
    count,
    limited,
    remaining: Math.max(0, safeMax - count),
    backend: upstash.isConfigured() ? "upstash" : "memory",
  };
}

async function incrementAbuseCounter(key, windowMs) {
  return incrementFixedWindow(key, windowMs);
}

function getStoreStatus() {
  return {
    distributed: upstash.isConfigured(),
    backend: upstash.isConfigured() ? "upstash" : "memory",
  };
}

module.exports = {
  consumeRateLimit,
  incrementAbuseCounter,
  incrementFixedWindow,
  getStoreStatus,
};
