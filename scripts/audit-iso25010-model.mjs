#!/usr/bin/env node
/**
 * Auditoría estructural ISO/IEC 25010 del dashboard.
 * Uso: node scripts/audit-iso25010-model.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
const chk = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/checklists-data.json"), "utf8"));
const levels = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/evaluation-levels.json"), "utf8"));

const fails = [];
const warns = [];

function fail(msg) {
  fails.push(msg);
}
function warn(msg) {
  warns.push(msg);
}

const port = data.characteristics.find((c) => c.id === "portabilidad");
const compat = data.characteristics.find((c) => c.id === "compatibilidad");
const func = data.characteristics.find((c) => c.id === "funcionalidad");
const sec = data.characteristics.find((c) => c.id === "seguridad");

const SEC_SUBS = ["Confidencialidad", "Integridad", "No repudio", "Responsabilidad", "Autenticidad"];

if (data.characteristics.length !== 8) fail(`Esperadas 8 características ISO 25010, hay ${data.characteristics.length}`);
if (port.subcharacteristics.some((s) => s.name === "Coexistencia")) fail("Coexistencia aún en Portabilidad");
if (func.subcharacteristics.some((s) => s.name === "Interoperabilidad")) fail("Interoperabilidad aún en Funcionalidad");
if (func.subcharacteristics.some((s) => s.name === "Seguridad")) fail("Seguridad aún bajo Funcionalidad");
if (!sec) fail("Falta característica Seguridad de primer nivel");
else {
  for (const n of SEC_SUBS) {
    if (!sec.subcharacteristics.some((s) => s.name === n)) fail(`Falta ${n} en Seguridad`);
  }
}
if (!compat.subcharacteristics.some((s) => s.name === "Coexistencia")) fail("Falta Coexistencia en Compatibilidad");
if (!compat.subcharacteristics.some((s) => s.name === "Interoperabilidad")) fail("Falta Interoperabilidad en Compatibilidad");
if (port.subcharacteristics.some((s) => s.name === "Intercambiabilidad")) fail("Intercambiabilidad sin renombrar a Reemplazabilidad");

for (const c of ["Adaptabilidad", "Facilidad de Instalación", "Reemplazabilidad"]) {
  if (!port.subcharacteristics.some((s) => s.name === c)) fail(`Falta ${c} en Portabilidad`);
}

const subs = data.characteristics.flatMap((c) =>
  c.subcharacteristics.map((s) => ({ char: c.name, sub: s.name, pct: s.percent })),
);

for (const { char, sub, pct } of subs) {
  const cl = chk.checklists[sub];
  if (!cl) {
    fail(`Sin checklist: ${sub}`);
    continue;
  }
  if (cl.caracteristica !== char) {
    fail(`${sub}: checklist bajo «${cl.caracteristica}», data.json bajo «${char}»`);
  }
  const yes = cl.items.filter((i) => i.cumple).length;
  const calc = Math.round((yes / cl.items.length) * 100);
  if (Math.abs(calc - pct) > 1) {
    warn(`${sub}: data.json ${pct}% vs checklist ${calc}% (${yes}/${cl.items.length})`);
  }
  if (!levels.levels[sub]) fail(`Sin evaluation-levels: ${sub}`);
}

console.log("=== Auditoría ISO/IEC 25010 ===\n");
console.log(`Características: ${data.characteristics.length}`);
console.log(`Subcaracterísticas: ${subs.length}`);
console.log(`Listas de cotejo: ${Object.keys(chk.checklists).length}`);
console.log(`Bloques evaluación 3 niveles: ${Object.keys(levels.levels).length}\n`);

if (fails.length === 0) console.log("Estructura 25010: OK");
else fails.forEach((m) => console.log("FAIL:", m));

if (warns.length) {
  console.log("\nAdvertencias (drift data.json ↔ checklist):");
  warns.forEach((m) => console.log("WARN:", m));
}

if (fails.length) process.exit(1);
console.log("\nAuditoría estructural: VERDE");
process.exit(0);
