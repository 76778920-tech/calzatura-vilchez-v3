#!/usr/bin/env node
/**
 * Verificación exhaustiva: Seguridad 100%, PKCS#7, modelo ISO 25010, dashboard.
 * Uso: node scripts/verify-exhaustive-iso25010.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
const chk = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/checklists-data.json"), "utf8"));
const levels = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/evaluation-levels.json"), "utf8"));

const sec = data.characteristics.find((c) => c.id === "seguridad");
const func = data.characteristics.find((c) => c.id === "funcionalidad");
const port = data.characteristics.find((c) => c.id === "portabilidad");

if (data.characteristics.length !== 8) fail(`Características: ${data.characteristics.length} (esperado 8)`);
if (func?.subcharacteristics.some((s) => s.name === "Seguridad")) fail("Seguridad aún bajo Funcionalidad");
if (port?.subcharacteristics.some((s) => s.name === "Coexistencia")) fail("Coexistencia en Portabilidad");

if (!sec) {
  fail("Falta característica Seguridad");
} else {
  for (const s of sec.subcharacteristics) {
    if (s.percent !== 100) fail(`data.json Seguridad/${s.name}=${s.percent}%`);
    const cl = chk.checklists[s.name];
    if (!cl) fail(`Sin checklist ${s.name}`);
    else {
      if (cl.caracteristica !== "Seguridad") fail(`${s.name} checklist bajo ${cl.caracteristica}`);
      const yes = cl.items.filter((i) => i.cumple).length;
      const pct = Math.round((yes / cl.items.length) * 100);
      if (pct !== 100) fail(`Checklist ${s.name}=${pct}% (${yes}/${cl.items.length})`);
      if (cl.items.some((i) => !i.cumple)) fail(`Checklist ${s.name} tiene ítems No`);
    }
    if (!levels.levels[s.name]) fail(`Sin evaluation-levels ${s.name}`);
  }
}

const nrCl = chk.checklists["No repudio"];
if (!nrCl) fail("Sin checklist No repudio");
else {
  const pkcs = nrCl.items.find((i) => /PKCS#7/i.test(i.indicador));
  if (!pkcs?.cumple) fail("Ítem PKCS#7 no cumple");
  if (nrCl.items.length < 6) fail(`No repudio: solo ${nrCl.items.length} ítems (esperado ≥6)`);
}

const nrModPath = path.join(ROOT, "calzatura-vilchez/functions/orderNonRepudiation.cjs");
const bffPath = path.join(ROOT, "calzatura-vilchez/bff/server.cjs");
const fnPath = path.join(ROOT, "calzatura-vilchez/functions/index.js");
const migPath = path.join(
  ROOT,
  "calzatura-vilchez/supabase/migrations/20260616120000_pedidos_pkcs7_non_repudiation.sql",
);

for (const [label, p] of [
  ["orderNonRepudiation.cjs", nrModPath],
  ["bff/server.cjs", bffPath],
  ["functions/index.js", fnPath],
  ["migración PKCS#7", migPath],
]) {
  if (!fs.existsSync(p)) fail(`Falta archivo ${label}: ${p}`);
}

const nrMod = fs.readFileSync(nrModPath, "utf8");
const bff = fs.readFileSync(bffPath, "utf8");
const fn = fs.readFileSync(fnPath, "utf8");
const sql = fs.readFileSync(migPath, "utf8");

if (!nrMod.includes("forge.pkcs7.createSignedData")) fail("Módulo NR sin PKCS#7");
if (!nrMod.includes("verifyOrderRecord")) fail("Módulo NR sin verifyOrderRecord");
if ((bff.match(/refreshOrderNonRepudiation/g) || []).length < 3) fail("BFF: refreshOrderNonRepudiation < 3");
if (!bff.includes("verifyOrderNonRepudiation")) fail("BFF sin endpoint verifyOrderNonRepudiation");
if ((fn.match(/refreshOrderNonRepudiation/g) || []).length < 3) fail("Functions: refreshOrderNonRepudiation < 3");
if (!sql.includes("nrPkcs7Signature")) fail("Migración sin nrPkcs7Signature");

// node-forge instalado en functions
const forgePath = path.join(ROOT, "calzatura-vilchez/functions/node_modules/node-forge/package.json");
if (!fs.existsSync(forgePath)) fail("node-forge no instalado en functions/");

process.env.NODE_ENV = "test";
delete process.env.ORDER_NR_PRIVATE_KEY_PEM;
delete process.env.ORDER_NR_CERT_PEM;

const nr = await import(pathToFileURL(nrModPath).href);
for (let i = 0; i < 20; i++) {
  const order = {
    id: `ord-stress-${i}`,
    userId: "uid",
    userEmail: "e@test.com",
    items: [{ productId: "p", quantity: i + 1, price: 100 }],
    subtotal: 100 * (i + 1),
    envio: 5,
    total: 100 * (i + 1) + 5,
    estado: i % 2 ? "pagado" : "pendiente",
    metodoPago: "stripe",
    creadoEn: "2026-06-16T12:00:00.000Z",
    pagadoEn: i % 2 ? "2026-06-16T12:01:00.000Z" : null,
    stockDescontadoEn: null,
    stripeSessionId: "cs_test",
    idempotencyKey: `k-${i}`,
  };
  const signed = nr.signOrderRecord(order);
  if (!signed.nrPkcs7Signature?.includes("BEGIN PKCS7")) fail(`Iter ${i}: sin PEM PKCS#7`);
  const v = nr.verifyOrderRecord({ ...order, ...signed });
  if (!v.valid) fail(`PKCS#7 roundtrip iter ${i}: ${v.reason}`);
  const tampered = { ...order, ...signed, total: order.total + 1 };
  const bad = nr.verifyOrderRecord(tampered);
  if (bad.valid) fail(`Iter ${i}: tampering no detectado`);
}

// Sync data.json ↔ checklist
for (const c of data.characteristics) {
  for (const s of c.subcharacteristics) {
    const cl = chk.checklists[s.name];
    if (!cl) continue;
    const yes = cl.items.filter((i) => i.cumple).length;
    const calc = Math.round((yes / cl.items.length) * 100);
    if (Math.abs(calc - s.percent) > 0) fail(`${s.name}: data.json ${s.percent}% vs checklist ${calc}%`);
  }
}

console.log("=== Verificación exhaustiva ISO 25010 + PKCS#7 ===\n");
console.log(`Características: ${data.characteristics.length}`);
console.log(`Seguridad: ${sec?.subcharacteristics.map((s) => `${s.name}=${s.percent}%`).join(", ")}`);
console.log(`No repudio checklist: ${nrCl?.items.filter((i) => i.cumple).length}/${nrCl?.items.length} Sí`);
console.log(`PKCS#7 stress: 20/20 roundtrips + tamper detectado`);

if (fails.length) {
  console.log(`\nFALLOS (${fails.length}):`);
  fails.forEach((f) => console.log("  FAIL:", f));
  process.exit(1);
}
console.log("\nRESULTADO: VERDE — 0 fallos");
process.exit(0);
