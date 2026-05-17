#!/usr/bin/env node
/**
 * Falla el CI si los informes de cobertura no están alineados con SonarCloud (monorepo).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lcovPath = path.join(repoRoot, "calzatura-vilchez", "coverage", "lcov.info");
const xmlPath = path.join(repoRoot, "ai-service", "coverage.xml");

function fail(msg) {
  console.error(`validate-sonar-coverage-reports: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(lcovPath)) fail(`no existe ${lcovPath}`);
if (!fs.existsSync(xmlPath)) fail(`no existe ${xmlPath}`);

const lcov = fs.readFileSync(lcovPath, "utf8");
const badSf = lcov
  .split("\n")
  .filter((line) => line.startsWith("SF:"))
  .filter((line) => !line.startsWith("SF:calzatura-vilchez/"));
if (badSf.length > 0) {
  fail(`LCOV con rutas SF sin prefijo calzatura-vilchez/: ${badSf.slice(0, 3).join(", ")}`);
}

const requiredTs = [
  "src/utils/stock.ts",
  "src/domains/productos/utils/commercialRules.ts",
  "src/domains/administradores/utils/adminDashboardMetrics.ts",
];
for (const rel of requiredTs) {
  const sf = `SF:calzatura-vilchez/${rel}`;
  const block = lcov.split("end_of_record").find((b) => b.includes(sf));
  if (!block) fail(`falta bloque LCOV para ${rel}`);
  const lf = Number(block.match(/LF:(\d+)/)?.[1] ?? 0);
  const lh = Number(block.match(/LH:(\d+)/)?.[1] ?? 0);
  if (lf === 0) fail(`${rel}: LF=0`);
  if (lh < lf) fail(`${rel}: cobertura incompleta LH=${lh} LF=${lf}`);
}

const xml = fs.readFileSync(xmlPath, "utf8");
if (!xml.includes("<source>") || !xml.match(/<source>[^<]+<\/source>/)) {
  fail("coverage.xml sin <source> válido");
}
const sourceText = (xml.match(/<source>([^<]*)<\/source>/)?.[1] ?? "").replace(/\\/g, "/");
if (sourceText === "." || sourceText.trim() === "") {
  fail('coverage.xml usa <source>.</source>; ejecuta fix_coverage_xml_for_sonar.py');
}
if (!sourceText.endsWith("/ai-service") && !sourceText.endsWith("\\ai-service")) {
  fail(`<source> debe apuntar a ai-service/ (actual: ${sourceText})`);
}

/** Rutas en coverage.xml (relativas a ai-service/) y ruta Sonar (desde raíz del repo). */
const requiredPy = [
  { xmlRel: "models/revenue.py", sonarPath: "ai-service/models/revenue.py" },
  { xmlRel: "models/risk.py", sonarPath: "ai-service/models/risk.py" },
  { xmlRel: "services/supabase_client.py", sonarPath: "ai-service/services/supabase_client.py" },
];
for (const { xmlRel, sonarPath } of requiredPy) {
  if (!xml.includes(`filename="${xmlRel}"`)) {
    fail(`coverage.xml sin filename="${xmlRel}" (${sonarPath})`);
  }
  const rate = xml.match(
    new RegExp(`filename="${xmlRel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*line-rate="([0-9.]+)"`),
  )?.[1];
  if (!rate || Number(rate) < 0.99) {
    fail(`${sonarPath}: line-rate=${rate ?? "missing"} (esperado >= 0.99)`);
  }
}

const supabaseBlock = xml.match(
  /filename="services\/supabase_client\.py"[^>]*>[\s\S]*?<\/class>/,
)?.[0];
if (supabaseBlock) {
  const misses = [...supabaseBlock.matchAll(/<line number="(\d+)" hits="0"/g)];
  if (misses.length > 0) {
    fail(
      `supabase_client.py: ${misses.length} líneas sin cubrir en XML (p. ej. ${misses[0][1]})`,
    );
  }
}

console.log("validate-sonar-coverage-reports: LCOV y coverage.xml listos para SonarCloud");
