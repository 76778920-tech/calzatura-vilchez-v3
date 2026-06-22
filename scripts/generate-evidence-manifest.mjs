#!/usr/bin/env node
/**
 * Genera dashboard-iso25000/evidence-manifest.json — docs, código, gates y artefactos por subcaracterística.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/instruments-catalog.json"), "utf8"));
const LEVELS = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/evaluation-levels.json"), "utf8"));
const CHECKLISTS = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/checklists-data.json"), "utf8"));

const SNIPPET_DEFAULTS = {
  "calzatura-vilchez/e2e/idoneidad-journey.spec.ts": { start: 1, end: 55, title: "TC-IDON-001 — recorrido Must" },
  "scripts/verify-idoneidad-iso25000.mjs": { start: 1, end: 45, title: "Gate idoneidad" },
  "calzatura-vilchez/bff/server.cjs": { start: 1, end: 60, title: "BFF — entrada servidor" },
  "calzatura-vilchez/functions/orderNonRepudiation.cjs": { start: 1, end: 70, title: "PKCS#7 no repudio" },
  "scripts/validate-supabase-rls-matrix.mjs": { start: 1, end: 50, title: "Validación RLS" },
  "calzatura-vilchez/e2e/seguridad-access-guards.spec.ts": { start: 1, end: 45, title: "TC-SEG guards" },
  "calzatura-vilchez/e2e/checkout-cod-order.spec.ts": { start: 1, end: 50, title: "TC-INT-001 COD" },
  "ai-service/app/main.py": { start: 1, end: 55, title: "Servicio IA FastAPI" },
};

const GLOBAL_DOCS = [
  { path: "documentacion/modelo-calidad-25010-alineacion.md", title: "Modelo SQuaRE — 6 características" },
  { path: "documentacion/funcionalidad-trazabilidad-iso25000.md", title: "Funcionalidad — marco completo" },
  { path: "documentacion/05-especificacion-requisitos-software-SRS.md", title: "SRS — requisitos software" },
  { path: "documentacion/08-pruebas-y-calidad.md", title: "Pruebas y calidad" },
];

const GLOBAL_DIAGRAM = { path: "iso25000_ref.png", title: "Diagrama calidad interna/externa" };

function extractPaths(text) {
  if (!text) return [];
  return text
    .split(/[·|,]/)
    .map((s) => s.trim())
    .map((p) => (p.startsWith("e2e/") ? `calzatura-vilchez/${p}` : p))
    .filter(
      (p) =>
        /^[\w./-]+\.(md|ts|tsx|js|mjs|cjs|py|sql|json|csv|yml|yaml|spec\.ts)$/i.test(p) ||
        p.startsWith("documentacion/") ||
        p.startsWith("calzatura-vilchez/") ||
        p.startsWith("scripts/"),
    );
}

function uniq(items) {
  const seen = new Set();
  return items.filter((x) => {
    const k = x.path || x;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function asDoc(p, title) {
  return { path: p.replace(/\\/g, "/"), title: title || p.split("/").pop(), kind: "doc" };
}

function asCode(p, title) {
  const norm = p.replace(/\\/g, "/");
  const def = SNIPPET_DEFAULTS[norm];
  return {
    path: norm,
    title: def?.title || title || path.basename(norm),
    kind: "code",
    startLine: def?.start ?? 1,
    endLine: def?.end ?? 100,
  };
}

function asArtifact(p, title) {
  return { path: p.replace(/\\/g, "/"), title: title || p.split("/").pop(), kind: "artifact" };
}

function asGate(command, desc) {
  return { command, desc };
}

function buildSubEntry(subName, charName) {
  const paths = new Set();
  const gates = [];

  const cat = CATALOG[subName];
  if (cat?.referencia) extractPaths(cat.referencia).forEach((p) => paths.add(p));

  const cl = CHECKLISTS.checklists[subName];
  if (cl?.referencia) extractPaths(cl.referencia).forEach((p) => paths.add(p));

  const lv = LEVELS.levels?.[subName];
  if (lv?.nivel2) {
    for (const row of lv.nivel2) {
      if (row.referencia) extractPaths(row.referencia).forEach((p) => paths.add(p));
    }
  }
  if (lv?.nivel3) {
    for (const row of lv.nivel3) {
      if (row.evidencia) extractPaths(row.evidencia).forEach((p) => paths.add(p));
    }
  }

  const gateMatch = [...paths].find((p) => p.startsWith("scripts/verify-"));
  if (gateMatch) {
    gates.push(asGate(`node ${gateMatch}`, `Gate ${subName}`));
    gates.push(asGate(`node ${gateMatch} --run-tests`, `Gate ${subName} + pruebas`));
  }
  if (subName === "Seguridad") {
    gates.push(asGate("node scripts/validate-supabase-rls-matrix.mjs", "Contrato RLS Supabase"));
  }

  const docs = [];
  const code = [];
  const artifacts = [];

  for (const p of paths) {
    const norm = p.replace(/\\/g, "/");
    if (norm.endsWith(".md")) docs.push(asDoc(norm));
    else if (norm.endsWith(".csv") || (norm.endsWith(".json") && norm.includes("cuadros"))) {
      artifacts.push(asArtifact(norm));
    } else if (/\.(ts|tsx|js|mjs|cjs|py|sql|spec\.ts)$/i.test(norm)) {
      code.push(asCode(norm));
    }
  }

  const trazDoc = `documentacion/${subName.toLowerCase().replace(/\s+/g, "-")}-trazabilidad-iso25000.md`;
  const altTraz = {
    Idoneidad: "documentacion/idoneidad-trazabilidad-iso25000.md",
    Precisión: "documentacion/precision-trazabilidad-iso25000.md",
    Interoperabilidad: "documentacion/interoperabilidad-trazabilidad-iso25000.md",
    Seguridad: "documentacion/seguridad-trazabilidad-iso25000.md",
    "Cumplimiento de la funcionalidad": "documentacion/cumplimiento-trazabilidad-iso25000.md",
    "Cumplimiento de Fiabilidad": "documentacion/fiabilidad-trazabilidad-iso25000.md",
    "Cumplimiento de la Usabilidad": "documentacion/usabilidad-trazabilidad-iso25000.md",
    "Cumplimiento de la Eficiencia": "documentacion/08-pruebas-y-calidad.md",
    "Cumplimiento de la Mantenibilidad": "documentacion/mantenibilidad-trazabilidad-iso25000.md",
    "Cumplimiento de la Portabilidad": "documentacion/portabilidad-mapeo-iso25023.md",
  };
  const docPath = altTraz[subName];
  if (docPath && fs.existsSync(path.join(ROOT, docPath))) {
    docs.unshift(asDoc(docPath, `Trazabilidad — ${subName}`));
  }

  return {
    characteristic: charName,
    docs: uniq(docs).filter((d) => existsRel(d.path)).slice(0, 8),
    code: uniq(code).filter((c) => existsRel(c.path)).slice(0, 10),
    gates: uniq(gates),
    artifacts: uniq(artifacts).filter((a) => existsRel(a.path)).slice(0, 6),
  };
}

function existsRel(p) {
  return fs.existsSync(path.join(ROOT, p));
}

const subcharacteristics = {};
for (const char of DATA.characteristics) {
  for (const sub of char.subcharacteristics) {
    subcharacteristics[sub.name] = buildSubEntry(sub.name, char.name);
  }
}

const manifest = {
  meta: {
    generatedAt: new Date().toISOString().slice(0, 10),
    proyecto: DATA.meta.project,
    descripcion: "Evidencias enlazadas: documentación .md, fragmentos de código, gates verify-* y artefactos CU-T*",
    api: {
      manifest: "/api/evidence/manifest",
      file: "/api/evidence/file?path={ruta}&start={n}&end={m}",
    },
  },
  global: {
    diagram: GLOBAL_DIAGRAM,
    docs: GLOBAL_DOCS,
    ci: [
      { path: ".github/workflows/ci.yml", title: "Pipeline CI GitHub Actions", startLine: 1, endLine: 100, kind: "code" },
    ],
    zap: [
      { path: "zap-reports/zap-production-report-v3.json", title: "DAST ZAP producción v3 (2026-06-20)", kind: "artifact" },
      { path: "zap-reports/zap-production-report-v3.html", title: "DAST ZAP producción v3 — informe HTML", kind: "artifact" },
    ],
    stress: [
      { path: "artifacts/load-tests/informe-stress-calzatura-vilchez.html", title: "Informe gráfico pruebas de estrés k6", kind: "artifact" },
      { path: "docs/ops/k6-mixed2000-bff-evidence.json", title: "k6 mixed2000 BFF — 2000 VUs", kind: "artifact" },
      { path: "docs/ops/k6-mixed1000-bff-evidence.json", title: "k6 mixed1000 BFF", kind: "artifact" },
      { path: "docs/ops/k6-smoke-evidence.json", title: "k6 smoke BFF", kind: "artifact" },
      { path: "load-tests/README.md", title: "Guía load-tests k6", kind: "doc" },
    ],
  },
  subcharacteristics,
};

const out = path.join(ROOT, "dashboard-iso25000/evidence-manifest.json");
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`OK: evidence-manifest.json — ${Object.keys(subcharacteristics).length} subcaracterísticas`);
