"use strict";

const upstash = require("./upstashRest.cjs");
const { sendSecurityAlertEmail } = require("./securityAlertEmail.cjs");

const DIGEST_WINDOW_MS = 60 * 60 * 1000;
const BUFFER_LOG_THRESHOLD = Number(process.env.SECURITY_ALERT_BUFFER_LOG_AT || 8);
const memoryEventBuffers = new Map();
const memorySlotUntil = new Map();

function bufferKey(ipHash) {
  return `cv:sec:buf:${ipHash}`;
}

function slotKey(ipHash) {
  return `cv:sec:slot:${ipHash}`;
}

function parseBufferedEntry(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pushMemoryBuffer(ipHash, entry) {
  const list = memoryEventBuffers.get(ipHash) ?? [];
  list.push(entry);
  if (list.length > 25) list.shift();
  memoryEventBuffers.set(ipHash, list);
}

async function pushBuffer(ipHash, entry) {
  const serialized = JSON.stringify(entry);
  if (upstash.isConfigured()) {
    const len = await upstash.rpush(bufferKey(ipHash), serialized);
    if (len !== null) {
      await upstash.expire(bufferKey(ipHash), Math.ceil(DIGEST_WINDOW_MS / 1000));
      return;
    }
  }
  pushMemoryBuffer(ipHash, entry);
}

async function readBuffer(ipHash) {
  if (upstash.isConfigured()) {
    const rows = await upstash.lrange(bufferKey(ipHash), 0, -1);
    if (rows !== null) {
      return rows.map(parseBufferedEntry).filter(Boolean);
    }
  }
  return [...(memoryEventBuffers.get(ipHash) ?? [])];
}

async function clearBuffer(ipHash) {
  if (upstash.isConfigured()) {
    await upstash.del(bufferKey(ipHash));
  }
  memoryEventBuffers.delete(ipHash);
}

async function tryAcquireDigestSlot(ipHash) {
  const ttlSec = Math.ceil(DIGEST_WINDOW_MS / 1000);
  if (upstash.isConfigured()) {
    const acquired = await upstash.setNxEx(slotKey(ipHash), "1", ttlSec);
    if (acquired !== null) return acquired;
  }
  const now = Date.now();
  const until = memorySlotUntil.get(ipHash);
  if (until && now < until) return false;
  memorySlotUntil.set(ipHash, now + DIGEST_WINDOW_MS);
  return true;
}

async function releaseDigestSlot(ipHash) {
  if (upstash.isConfigured()) {
    await upstash.del(slotKey(ipHash));
  }
  memorySlotUntil.delete(ipHash);
}

function buildDigestBody(ipHash, events, suppressedNote) {
  const lines = events.map((ev, idx) => {
    const detailText = (ev.details ?? []).join(" · ");
    return `${idx + 1}. ${ev.event}${detailText ? ` — ${detailText}` : ""}`;
  });
  if (suppressedNote) lines.push("", suppressedNote);
  return lines;
}

/**
 * Encola un evento y envía un correo digest por IP (máx. 1/h), agregando eventos del buffer.
 */
async function recordSecurityAlert({ event, ipHash, details }, logServerError) {
  const entry = { event, details: details ?? [], at: new Date().toISOString() };
  await pushBuffer(ipHash, entry);

  const acquired = await tryAcquireDigestSlot(ipHash);
  if (!acquired) {
    const pending = await readBuffer(ipHash);
    if (pending.length >= BUFFER_LOG_THRESHOLD) {
      logServerError(
        `securityAlertQueue: ${pending.length} eventos en cola para IP ref ${ipHash} (digest ya enviado esta hora)`,
      );
    }
    return { skipped: true, reason: "digest_slot_busy", queued: pending.length };
  }

  const events = await readBuffer(ipHash);

  const subjectEvent =
    events.length === 1
      ? events[0].event
      : `${events.length} eventos de seguridad`;

  const bodyDetails = buildDigestBody(
    ipHash,
    events.length > 0 ? events : [entry],
    events.length > 1 ? "Eventos agrupados en una sola notificación por referencia IP." : null,
  );

  const result = await sendSecurityAlertEmail(
    { event: subjectEvent, ipHash, details: bodyDetails },
    logServerError,
  );

  if (result.ok) {
    await clearBuffer(ipHash);
  } else {
    await releaseDigestSlot(ipHash);
  }

  return result;
}

module.exports = {
  DIGEST_WINDOW_MS,
  recordSecurityAlert,
};
