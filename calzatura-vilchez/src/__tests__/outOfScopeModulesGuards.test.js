import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FORBIDDEN = /rrhh|psicolog|psychology/i;

const WEB_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEB_ROOT, "..");

function listFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, acc);
      continue;
    }
    acc.push(full);
  }
  return acc;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function migrationFiles() {
  return fs
    .readdirSync(path.join(WEB_ROOT, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql"));
}

describe("out-of-scope module guards (no RRHH / psicología)", () => {
  it("src/ y bff/ no contienen referencias a módulos fuera de alcance", () => {
    const roots = [path.join(WEB_ROOT, "src"), path.join(WEB_ROOT, "bff")];
    const hits = [];
    for (const root of roots) {
      for (const file of listFiles(root)) {
        if (!/\.(ts|tsx|js|cjs|mjs|jsx|json)$/.test(file)) continue;
        if (file.includes(`${path.sep}__tests__${path.sep}`)) continue;
        if (FORBIDDEN.test(readText(file))) hits.push(path.relative(WEB_ROOT, file));
      }
    }
    expect(hits, `Referencias prohibidas en: ${hits.join(", ")}`).toEqual([]);
  });

  it("no hay migraciones que creen módulos fuera de alcance", () => {
    const badNames = migrationFiles().filter((name) => FORBIDDEN.test(name));
    expect(badNames, `Migraciones prohibidas: ${badNames.join(", ")}`).toEqual([]);

    const createHits = [];
    for (const name of migrationFiles()) {
      const sql = readText(path.join(WEB_ROOT, "supabase/migrations", name));
      if (/CREATE TABLE.*rrhh/i.test(sql)) createHits.push(name);
    }
    expect(createHits, `CREATE TABLE legacy: ${createHits.join(", ")}`).toEqual([]);
  });

  it("UserRole solo admite cliente, trabajador y admin", () => {
    const typesSource = readText(path.join(WEB_ROOT, "src/types/index.ts"));
    expect(typesSource).toMatch(/UserRole\s*=\s*"cliente"\s*\|\s*"trabajador"\s*\|\s*"admin"/);
    expect(typesSource).not.toMatch(FORBIDDEN);
  });

  it("app móvil no referencia iconografía/psicología fuera de alcance", () => {
    const mobileAdmin = path.join(
      REPO_ROOT,
      "calzatura-vilchez-mobile/lib/features/admin",
    );
    if (!fs.existsSync(mobileAdmin)) return;

    const hits = [];
    for (const file of listFiles(mobileAdmin)) {
      if (!file.endsWith(".dart")) continue;
      if (FORBIDDEN.test(readText(file))) hits.push(path.relative(REPO_ROOT, file));
    }
    expect(hits, `Referencias prohibidas en móvil: ${hits.join(", ")}`).toEqual([]);
  });
});
