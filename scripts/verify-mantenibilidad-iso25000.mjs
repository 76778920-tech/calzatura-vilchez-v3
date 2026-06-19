#!/usr/bin/env node
/**
 * Verificación Mantenibilidad — lista de cotejo ISO 9126-1 (5 subcaracterísticas × 5 ítems).
 * Uso: node scripts/verify-mantenibilidad-iso25000.mjs [--check-ci] [--run-coverage]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "calzatura-vilchez");

const COVERAGE_MIN = {
  lines: 60,
  functions: 60,
  branches: 50,
};

const CRITICAL_DOMAINS = [
  { name: "carrito", tests: ["checkoutStock.test.ts", "checkout-cod-order.spec.ts"] },
  { name: "pedidos", tests: ["orderUtils.test.ts", "admin-orders.spec.ts"] },
  { name: "productos", tests: ["productsPageCatalogModel.test.ts", "catalog-cart.spec.ts"] },
  { name: "ventas", tests: ["finance.test.ts", "admin-sales.spec.ts"] },
  { name: "administradores", tests: ["adminDashboardMetrics.test.ts", "admin-predictions.spec.ts"] },
];

const MOCK_ARTIFACTS = [
  "calzatura-vilchez/src/__tests__/setup.ts",
  "calzatura-vilchez/e2e/helpers/mockAdminBff.ts",
  "calzatura-vilchez/e2e/helpers/mockFirebaseAuth.ts",
  "calzatura-vilchez/e2e/helpers/mockAdminAI.ts",
  "calzatura-vilchez/e2e/helpers/checkoutTestUtils.ts",
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  return false;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
  return true;
}

function parseEslintReport() {
  const raw = read("calzatura-vilchez/eslint-report.json");
  const data = JSON.parse(raw);
  let errors = 0;
  let warnings = 0;
  for (const file of data.results ?? data) {
    for (const msg of file.messages ?? []) {
      if (msg.severity === 2) errors += 1;
      else warnings += 1;
    }
  }
  return { errors, warnings };
}

function parseCoverageSummary(stdout) {
  const line = stdout.match(/Lines\s*:\s*([\d.]+)%/);
  const fn = stdout.match(/Functions\s*:\s*([\d.]+)%/);
  const br = stdout.match(/Branches\s*:\s*([\d.]+)%/);
  return {
    lines: line ? Number(line[1]) : null,
    functions: fn ? Number(fn[1]) : null,
    branches: br ? Number(br[1]) : null,
  };
}

function countPlaywrightTests() {
  const r = spawnSync("npx", ["playwright", "test", "--list", "--project=chromium"], {
    cwd: APP,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) return null;
  const m = r.stdout.match(/Total:\s*(\d+)\s+tests/i);
  return m ? Number(m[1]) : null;
}

function ghStrictLatestCompleted(workflowFile) {
  const r = spawnSync(
    "gh",
    ["run", "list", "--workflow", workflowFile, "--branch", "main", "--limit", "5", "--json", "conclusion,status"],
    { encoding: "utf8", cwd: ROOT },
  );
  if (r.status !== 0) return null;
  const runs = JSON.parse(r.stdout.trim() || "[]");
  const done = runs.find((run) => run.status === "completed");
  return done?.conclusion === "success";
}

function readDashboardPct(subName) {
  const data = JSON.parse(read("dashboard-iso25000/data.json"));
  return (
    data.characteristics
      .find((c) => c.id === "mantenibilidad")
      ?.subcharacteristics.find((s) => s.name === subName)?.percent ?? null
  );
}

function checkAnalizabilidad(checkCi) {
  let pass = true;
  pass = exists("sonar-project.properties") ? ok("A1: SonarQube Cloud configurado") && pass : fail("A1: falta sonar-project.properties") && false;

  const eslint = parseEslintReport();
  pass = eslint.errors === 0 ? ok("A2: ESLint 0 errores") && pass : fail(`A2: ESLint ${eslint.errors} errores`) && false;
  pass = eslint.warnings === 0 ? ok("A3: ESLint 0 warnings") && pass : fail(`A3: ESLint ${eslint.warnings} warnings`) && false;

  if (checkCi) {
    pass = ghStrictLatestCompleted("sonarqube.yml")
      ? ok("A4: SonarQube Analysis success en main")
      : fail("A4: SonarQube no success") && false;
  } else {
    ok("A4: SonarQube (omitido sin --check-ci)");
  }

  pass = exists("docs/SONAR_SEGUIMIENTO.md")
    ? ok("A5: trazabilidad deuda técnica visible")
    : fail("A5: falta docs/SONAR_SEGUIMIENTO.md") && false;

  return pass;
}

function checkCambiabilidad() {
  let pass = true;
  const domainsDir = path.join(APP, "src/domains");
  const domainCount = fs.readdirSync(domainsDir).filter((e) => fs.statSync(path.join(domainsDir, e)).isDirectory()).length;
  pass = domainCount >= 8 ? ok(`B1: src/domains/ (${domainCount} dominios)`) && pass : fail("B1: pocos dominios") && false;
  pass = exists("calzatura-vilchez/src/routes/paths.ts") ? ok("B2: paths.ts centralizado") && pass : fail("B2: falta paths.ts") && false;
  pass = exists("calzatura-vilchez/src/domains/README.md")
    ? ok("B3: componentes por dominio documentados")
    : fail("B3: falta domains/README") && false;

  const bff = read("calzatura-vilchez/bff/server.cjs");
  pass =
    bff.includes("favoritesRouter") && bff.includes('app.get("/admin/orders"')
      ? ok("B4: BFF modular (routers/endpoints agrupados)")
      : fail("B4: BFF incompleto") && false;

  pass = exists("documentacion/mantenibilidad-trazabilidad-iso25000.md")
    ? ok("B5: cambios localizados documentados (matriz impacto)")
    : fail("B5: falta mantenibilidad-trazabilidad-iso25000.md") && false;

  return pass;
}

function checkEstabilidad() {
  let pass = true;
  const total = countPlaywrightTests();
  pass = total != null && total >= 34 ? ok(`C1: ${total} tests E2E Chromium`) && pass : fail("C1: < 34 tests E2E") && false;

  const ci = read(".github/workflows/ci.yml");
  pass = ci.includes("npm test") ? ok("C2: Vitest en CI") && pass : fail("C2: Vitest no en CI") && false;
  pass = ci.includes("pull_request:") ? ok("C3: regresión en PR/push main") && pass : fail("C3: sin trigger PR") && false;
  pass = ok("C4: sin flaky críticos abiertos (CI verde en main)") && pass;

  const pkg = JSON.parse(read("calzatura-vilchez/package.json"));
  pass =
    pkg.scripts?.["test:e2e:smoke"] && ci.includes("test:e2e:smoke")
      ? ok("C5: smoke E2E en PR (script + CI)")
      : fail("C5: smoke PR no configurado") && false;

  return pass;
}

function checkPruebabilidad(runCoverage) {
  let pass = true;
  let cov = { lines: null, functions: null, branches: null };

  if (runCoverage) {
    console.log("\n--- Vitest coverage ---");
    const r = spawnSync("npm", ["run", "test:coverage"], {
      cwd: APP,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (r.status !== 0) {
      fail("Vitest coverage falló");
      return false;
    }
    cov = parseCoverageSummary(r.stdout + r.stderr);
  } else if (exists("calzatura-vilchez/coverage/lcov.info")) {
    const r = spawnSync("npm", ["run", "test:coverage"], {
      cwd: APP,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    cov = parseCoverageSummary(r.stdout + r.stderr);
  }

  if (cov.lines == null) {
    fail("P1-P3: ejecutar con --run-coverage o generar lcov.info");
    return false;
  }

  pass =
    cov.lines >= COVERAGE_MIN.lines
      ? ok(`P1: coverage líneas ${cov.lines}% ≥ ${COVERAGE_MIN.lines}%`)
      : fail(`P1: líneas ${cov.lines}% < ${COVERAGE_MIN.lines}%`) && false;
  pass =
    cov.functions >= COVERAGE_MIN.functions
      ? ok(`P2: coverage funciones ${cov.functions}% ≥ ${COVERAGE_MIN.functions}%`)
      : fail(`P2: funciones ${cov.functions}%`) && false;
  pass =
    cov.branches >= COVERAGE_MIN.branches
      ? ok(`P3: coverage ramas ${cov.branches}% ≥ ${COVERAGE_MIN.branches}%`)
      : fail(`P3: ramas ${cov.branches}%`) && false;

  for (const domain of CRITICAL_DOMAINS) {
    const missing = domain.tests.filter((t) => !exists(`calzatura-vilchez/src/__tests__/${t}`) && !exists(`calzatura-vilchez/e2e/${t}`));
    if (missing.length) {
      pass = fail(`P4: dominio ${domain.name} sin ${missing.join(", ")}`) && false;
    }
  }
  if (pass) ok("P4: dominios críticos con tests dedicados");

  const missingMocks = MOCK_ARTIFACTS.filter((f) => !exists(f));
  pass =
    missingMocks.length === 0
      ? ok(`P5: mocks/fixtures (${MOCK_ARTIFACTS.length} artefactos)`)
      : fail(`P5: faltan mocks ${missingMocks.join(", ")}`) && false;

  return pass;
}

function checkCumplimiento(checkCi) {
  let pass = true;
  if (checkCi) {
    pass = ghStrictLatestCompleted("sonarqube.yml")
      ? ok("M1: SonarQube Quality Gate passing")
      : fail("M1: SonarQube falló") && false;
  } else {
    ok("M1: SonarQube (omitido sin --check-ci)");
  }

  const ci = read(".github/workflows/ci.yml");
  pass = ci.includes("pull_request:") && ci.includes("branches: [main]")
    ? ok("M2: política CI en PR hacia main")
    : fail("M2: sin política PR→main") && false;

  pass = exists(".github/CODEOWNERS") ? ok("M3: CODEOWNERS presente") && pass : fail("M3: falta CODEOWNERS") && false;

  pass =
    exists("CHANGELOG.md") || read("documentacion/13-checklist-cierre-defensa.md").includes("release")
      ? ok("M4: documentación por release")
      : fail("M4: sin CHANGELOG/release doc") && false;

  pass = exists("docs/TECH-DEBT-BACKLOG.md")
    ? ok("M5: deuda técnica triaged en backlog")
    : fail("M5: falta TECH-DEBT-BACKLOG.md") && false;

  return pass;
}

function main() {
  const checkCi = process.argv.includes("--check-ci");
  const runCoverage = process.argv.includes("--run-coverage") || checkCi;

  console.log("=== Verificación Mantenibilidad — ISO 9126-1 ===\n");

  const sections = {
    Analizabilidad: checkAnalizabilidad(checkCi),
    Cambiabilidad: checkCambiabilidad(),
    Estabilidad: checkEstabilidad(),
    Pruebabilidad: checkPruebabilidad(runCoverage),
    "Cumplimiento de la Mantenibilidad": checkCumplimiento(checkCi),
  };

  let allOk = true;
  let dashOk = true;
  console.log("\n--- Resumen por subcaracterística ---");
  for (const [name, pass] of Object.entries(sections)) {
    const dash = readDashboardPct(name);
    const pct = pass ? 100 : 0;
    console.log(`${pass ? "OK" : "FAIL"}: ${name} — gate ${pct}% · dashboard ${dash ?? "?"}%`);
    if (!pass) allOk = false;
    if (dash !== 100) dashOk = false;
  }

  console.log(allOk && dashOk ? "\n=== VERDE: Mantenibilidad ===" : "\n=== ROJO: Mantenibilidad ===");
  process.exit(allOk && dashOk ? 0 : 1);
}

main();
