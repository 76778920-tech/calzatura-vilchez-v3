/**
 * Capa 1 (código): el bundle no debe mutar PostgREST desde src/.
 * Capa 2 (DB): anon/authenticated bloqueados en migraciones — ver
 * supabase/rls-matrix.contract.json y scripts/validate-supabase-rls-matrix.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = path.resolve(process.cwd(), "src");
const ignoredPathParts = [
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}supabase${path.sep}client.ts`,
  `${path.sep}types${path.sep}`,
];
const sensitiveMutationRpc = [
  "create_product_variants_atomic",
  "update_product_atomic",
  "delete_product_atomic",
  "registrar_ingreso_stock",
  "register_daily_sales_atomic",
  "return_daily_sale_atomic",
  "decrement_product_stock",
  "restore_product_stock",
];

function listSourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isIgnored(file) {
  return ignoredPathParts.some((part) => file.includes(part));
}

describe("Supabase direct access anti-regression", () => {
  it("no permite escrituras directas desde src contra tablas Supabase", () => {
    const offenders = [];
    for (const file of listSourceFiles(srcRoot).filter((item) => !isIgnored(item))) {
      const source = fs.readFileSync(file, "utf8");
      const directMutation = /supabase\s*\.from\s*\([^)]*\)[\s\S]{0,500}?\.(insert|update|upsert|delete)\s*\(/m;
      if (directMutation.test(source)) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it("no permite RPC mutantes Supabase desde src; deben pasar por BFF", () => {
    const offenders = [];
    for (const file of listSourceFiles(srcRoot).filter((item) => !isIgnored(item))) {
      const source = fs.readFileSync(file, "utf8");
      const hits = sensitiveMutationRpc.filter((rpc) => source.includes(`supabase.rpc("${rpc}"`) || source.includes(`supabase.rpc('${rpc}'`));
      if (hits.length > 0) {
        offenders.push(`${path.relative(process.cwd(), file)} -> ${hits.join(", ")}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
