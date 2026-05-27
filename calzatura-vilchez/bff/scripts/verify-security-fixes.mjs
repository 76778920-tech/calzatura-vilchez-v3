/**
 * Verificación de hallazgos de auditoría (sin Upstash/Resend reales).
 * node bff/scripts/verify-security-fixes.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bffDir = path.resolve(__dirname, "..");
const require = createRequire(path.join(bffDir, "package.json"));

const results = [];
const pass = (id, detail) => results.push({ id, ok: true, detail });
const fail = (id, detail) => {
  results.push({ id, ok: false, detail });
  console.error(`FAIL ${id}: ${detail}`);
};

function clearBffCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes("bff")) delete require.cache[key];
  }
}

// H1 — NaN en env de rate limit
process.env.LOGIN_RATE_MAX = "not-a-number";
clearBffCache();
const { buildRateLimitSpecs } = require(path.join(bffDir, "publicRateLimit.cjs"));
const { SURFACES } = require(path.join(bffDir, "securityMonitor.cjs"));
const loginSpec = buildRateLimitSpecs()[SURFACES.AUTH_LOGIN];
if (loginSpec.max === 15) pass("H1-NaN-env", `max fallback=${loginSpec.max}`);
else fail("H1-NaN-env", `max=${loginSpec.max}`);

clearBffCache();
const { consumeRateLimit } = require(path.join(bffDir, "securityStore.cjs"));
const rl = await consumeRateLimit(`verify-${Date.now()}`, Number.NaN, 60_000);
if (!rl.limited && rl.count === 1) pass("H1-store-NaN", "normalizeLimit en store");
else fail("H1-store-NaN", JSON.stringify(rl));

// H2 — orden DNI
const lookupSrc = fs.readFileSync(path.join(bffDir, "lookupDni.cjs"), "utf8");
const handleBlock = lookupSrc.match(
  /async function handleLookupDni[\s\S]*?const authz = authorizeLookupRequest/,
)?.[0];
if (
  handleBlock
  && handleBlock.indexOf("enforceRateLimit") < handleBlock.indexOf("const authz = authorizeLookupRequest")
) {
  pass("H2-dni-order", "rate limit antes de authz");
} else fail("H2-dni-order", "orden incorrecto");

// H3 — logs en alertas
const emailSrc = fs.readFileSync(path.join(bffDir, "securityAlertEmail.cjs"), "utf8");
if (
  emailSrc.includes("sin destinatarios")
  && emailSrc.includes("falta RESEND_API_KEY")
) {
  pass("H3-alert-logs", "skip registrado en logServerError");
} else fail("H3-alert-logs", "faltan logs");

// H4 — health/security
const serverSrc = fs.readFileSync(path.join(bffDir, "server.cjs"), "utf8");
if (serverSrc.includes("HEALTH_SECURITY_TOKEN") && serverSrc.includes("issueCount")) {
  pass("H4-health-token", "health/security protegido");
} else fail("H4-health-token", "incompleto");

// H5 — sal hash IP
delete process.env.SECURITY_IP_HASH_SALT;
clearBffCache();
const { hashIp: hashA } = require(path.join(bffDir, "clientIp.cjs"));
const h1 = hashA("203.0.113.1");
process.env.SECURITY_IP_HASH_SALT = "verify-salt";
clearBffCache();
const { hashIp: hashB } = require(path.join(bffDir, "clientIp.cjs"));
const h2 = hashB("203.0.113.1");
if (h1 !== h2) pass("H5-ip-salt", "hash distinto con sal");
else fail("H5-ip-salt", "hash igual");

// H6 — delivery
if (serverSrc.includes("trackDeliveryInputAbuse")) pass("H6-delivery-abuse", "presente");
else fail("H6-delivery-abuse", "ausente");

// H7 — digest
const queueSrc = fs.readFileSync(path.join(bffDir, "securityAlertQueue.cjs"), "utf8");
if (queueSrc.includes("releaseDigestSlot") && queueSrc.includes("BUFFER_LOG_THRESHOLD")) {
  pass("H7-digest", "digest + release + log cola");
} else fail("H7-digest", "incompleto");

// H8/H9 — comportamiento monitor (mock fetch)
process.env.SECURITY_VALIDATION_ABUSE_MAX = "2";
process.env.SECURITY_ALERT_ENABLED = "true";
process.env.SECURITY_ALERT_EMAIL = "t@t.local";
process.env.RESEND_API_KEY = "re_test";
process.env.SECURITY_EMAIL_FROM = "T <t@t>";
clearBffCache();
const fetchCalls = [];
globalThis.fetch = async () => {
  fetchCalls.push(1);
  return { ok: true, text: async () => "" };
};
const { onValidationFailure: onVal } = require(path.join(bffDir, "securityMonitor.cjs"));
const log = () => {};

await onVal({ surface: SURFACES.AUTH_LOGIN, ip: "10.0.0.1", fields: { a: 1 } }, log);
await onVal({ surface: SURFACES.AUTH_LOGIN, ip: "10.0.0.1", fields: { a: 1 } }, log);
await onVal({ surface: SURFACES.LIBRO_RECLAMACIONES, ip: "10.0.0.2", fields: { b: 1 } }, log);
await onVal({ surface: SURFACES.LIBRO_RECLAMACIONES, ip: "10.0.0.2", fields: { b: 1 } }, log);
await new Promise((r) => setTimeout(r, 30));
if (fetchCalls.length >= 2) pass("H8-surface-buckets", `superficies separadas (${fetchCalls.length} envíos)`);
else fail("H8-surface-buckets", `calls=${fetchCalls.length}`);

fetchCalls.length = 0;
await onVal({ surface: SURFACES.CHECK_EMAIL, ip: "10.0.0.3", fields: { e: 1 } }, log);
await onVal({ surface: SURFACES.CHECK_EMAIL, ip: "10.0.0.3", fields: { e: 1 } }, log);
const atThreshold = fetchCalls.length;
await onVal({ surface: SURFACES.CHECK_EMAIL, ip: "10.0.0.3", fields: { e: 1 } }, log);
await new Promise((r) => setTimeout(r, 30));
if (atThreshold === 1 && fetchCalls.length === 1) pass("H9-threshold-once", "alerta solo al umbral");
else fail("H9-threshold-once", `at=${atThreshold} total=${fetchCalls.length}`);

// H10 — login codes
if (serverSrc.includes("AUTH_LOGIN_CODE.RATE_LIMITED")) pass("H10-login-codes", "códigos authLogin");
else fail("H10-login-codes", "ausente");

const failed = results.filter((r) => !r.ok);
console.log("\n=== Verificación hallazgos auditoría ===\n");
for (const r of results) {
  console.log(`${r.ok ? "OK  " : "FAIL"} ${r.id} — ${r.detail}`);
}
console.log(`\n${results.length - failed.length}/${results.length} OK\n`);
process.exit(failed.length > 0 ? 1 : 0);
