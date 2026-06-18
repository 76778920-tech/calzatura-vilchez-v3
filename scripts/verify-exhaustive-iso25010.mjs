#!/usr/bin/env node
/**
 * Verificación exhaustiva: modelo ISO 9126, Seguridad (Funcionalidad), PKCS#7, dashboard.
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

const func = data.characteristics.find((c) => c.id === "funcionalidad");
const port = data.characteristics.find((c) => c.id === "portabilidad");

if (data.characteristics.length !== 6) fail(`Características: ${data.characteristics.length} (esperado 6 ISO 9126)`);
if (data.characteristics.some((c) => c.id === "seguridad" || c.id === "compatibilidad")) {
  fail("No debe haber Seguridad ni Compatibilidad como características de primer nivel (9126)");
}
if (!func?.subcharacteristics.some((s) => s.name === "Seguridad")) {
  fail("Falta Seguridad bajo Funcionalidad");
}
if (!func?.subcharacteristics.some((s) => s.name === "Interoperabilidad")) {
  fail("Falta Interoperabilidad bajo Funcionalidad");
}
if (!port?.subcharacteristics.some((s) => s.name === "Coexistencia")) {
  fail("Falta Coexistencia bajo Portabilidad");
}

const secSub = func?.subcharacteristics.find((s) => s.name === "Seguridad");
if (!secSub) {
  fail("Sin subcaracterística Seguridad");
} else {
  if (secSub.percent !== 100) fail(`data.json Funcionalidad/Seguridad=${secSub.percent}%`);
  const cl = chk.checklists.Seguridad;
  if (!cl) fail("Sin checklist Seguridad");
  else {
    if (cl.caracteristica !== "Funcionalidad") fail(`Checklist Seguridad bajo ${cl.caracteristica}`);
    const yes = cl.items.filter((i) => i.cumple).length;
    const pct = Math.round((yes / cl.items.length) * 100);
    if (pct !== 100) fail(`Checklist Seguridad=${pct}% (${yes}/${cl.items.length})`);
    const pkcs = cl.items.find((i) => /PKCS#7/i.test(i.indicador));
    if (!pkcs?.cumple) fail("Ítem PKCS#7 no cumple en checklist Seguridad");
    if (cl.items.length < 20) fail(`Seguridad: solo ${cl.items.length} ítems (esperado ≥20)`);
  }
  if (!levels.levels.Seguridad) fail("Sin evaluation-levels Seguridad");
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

for (const c of data.characteristics) {
  for (const s of c.subcharacteristics) {
    const cl = chk.checklists[s.name];
    if (!cl) continue;
    const yes = cl.items.filter((i) => i.cumple).length;
    const calc = Math.round((yes / cl.items.length) * 100);
    if (Math.abs(calc - s.percent) > 0) fail(`${s.name}: data.json ${s.percent}% vs checklist ${calc}%`);
  }
}

console.log("=== Verificación exhaustiva ISO 9126 + PKCS#7 ===\n");
console.log(`Características: ${data.characteristics.length}`);
console.log(`Funcionalidad/Seguridad: ${secSub?.percent}%`);
console.log(`Checklist Seguridad: ${chk.checklists.Seguridad?.items.filter((i) => i.cumple).length}/${chk.checklists.Seguridad?.items.length} Sí`);
console.log(`PKCS#7 stress: 20/20 roundtrips + tamper detectado`);

if (fails.length) {
  console.log(`\nFALLOS (${fails.length}):`);
  fails.forEach((f) => console.log("  FAIL:", f));
  process.exit(1);
}
console.log("\nRESULTADO: VERDE — 0 fallos");
process.exit(0);
