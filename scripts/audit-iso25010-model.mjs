#!/usr/bin/env node
/**
 * Auditoría estructural ISO/IEC 9126-1 del dashboard (6 características).
 * Uso: node scripts/audit-iso25010-model.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
const chk = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/checklists-data.json"), "utf8"));
const levels = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/evaluation-levels.json"), "utf8"));

/** Taxonomía ISO/IEC 9126-1 — calidad interna/externa (diagrama de referencia). */
const ISO9126 = {
  funcionalidad: ["Idoneidad", "Precisión", "Interoperabilidad", "Seguridad", "Cumplimiento de la funcionalidad"],
  fiabilidad: ["Madurez", "Tolerancia a Fallos", "Capacidad de Recuperación", "Cumplimiento de Fiabilidad"],
  usabilidad: [
    "Inteligibilidad",
    "Facilidad de Aprendizaje",
    "Operabilidad",
    "Atractividad",
    "Cumplimiento de la Usabilidad",
  ],
  eficiencia: ["Comportamiento en el tiempo", "Uso de Recursos", "Cumplimiento de la Eficiencia"],
  mantenibilidad: [
    "Analizabilidad",
    "Cambiabilidad",
    "Estabilidad",
    "Pruebabilidad",
    "Cumplimiento de la Mantenibilidad",
  ],
  portabilidad: [
    "Adaptabilidad",
    "Facilidad de Instalación",
    "Coexistencia",
    "Intercambiabilidad",
    "Cumplimiento de la Portabilidad",
  ],
};

const fails = [];
const warns = [];

function fail(msg) {
  fails.push(msg);
}
function warn(msg) {
  warns.push(msg);
}

if (data.characteristics.length !== 6) {
  fail(`Esperadas 6 características ISO 9126, hay ${data.characteristics.length}`);
}

for (const [id, subs] of Object.entries(ISO9126)) {
  const char = data.characteristics.find((c) => c.id === id);
  if (!char) {
    fail(`Falta característica ${id}`);
    continue;
  }
  if (char.subcharacteristics.length !== subs.length) {
    fail(`${char.name}: esperadas ${subs.length} subcaracterísticas, hay ${char.subcharacteristics.length}`);
  }
  for (const name of subs) {
    if (!char.subcharacteristics.some((s) => s.name === name)) {
      fail(`${char.name}: falta subcaracterística «${name}»`);
    }
  }
  for (const sub of char.subcharacteristics) {
    if (!subs.includes(sub.name)) {
      fail(`${char.name}: subcaracterística extra «${sub.name}» (no está en ISO 9126)`);
    }
  }
}

if (data.characteristics.some((c) => c.id === "seguridad")) {
  fail("Seguridad no debe ser característica de primer nivel (9126: subcaracterística de Funcionalidad)");
}
if (data.characteristics.some((c) => c.id === "compatibilidad")) {
  fail("Compatibilidad no existe en ISO 9126 (Interoperabilidad → Funcionalidad; Coexistencia → Portabilidad)");
}

const func = data.characteristics.find((c) => c.id === "funcionalidad");
const port = data.characteristics.find((c) => c.id === "portabilidad");
if (func && !func.subcharacteristics.some((s) => s.name === "Seguridad")) {
  fail("Falta Seguridad bajo Funcionalidad");
}
if (func && !func.subcharacteristics.some((s) => s.name === "Interoperabilidad")) {
  fail("Falta Interoperabilidad bajo Funcionalidad");
}
if (port && !port.subcharacteristics.some((s) => s.name === "Coexistencia")) {
  fail("Falta Coexistencia bajo Portabilidad");
}
if (port && port.subcharacteristics.some((s) => s.name === "Reemplazabilidad")) {
  fail("Reemplazabilidad debe llamarse Intercambiabilidad (9126)");
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

console.log("=== Auditoría ISO/IEC 9126-1 ===\n");
console.log(`Características: ${data.characteristics.length}`);
console.log(`Subcaracterísticas: ${subs.length}`);
console.log(`Listas de cotejo: ${Object.keys(chk.checklists).length}`);
console.log(`Bloques evaluación 3 niveles: ${Object.keys(levels.levels).length}\n`);

if (fails.length === 0) console.log("Estructura 9126: OK");
else fails.forEach((m) => console.log("FAIL:", m));

if (warns.length) {
  console.log("\nAdvertencias (drift data.json ↔ checklist):");
  warns.forEach((m) => console.log("WARN:", m));
}

if (fails.length) process.exit(1);
console.log("\nAuditoría estructural: VERDE");
process.exit(0);
