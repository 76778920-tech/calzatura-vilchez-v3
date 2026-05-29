#!/usr/bin/env node
/**
 * Valida que las migraciones Supabase cumplan el contrato RLS (capa DB para cliente web anon).
 * Complementa supabaseDirectAccessGuard.test.js (capa código).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(repoRoot, "calzatura-vilchez", "supabase", "migrations");
const contractPath = path.join(repoRoot, "calzatura-vilchez", "supabase", "rls-matrix.contract.json");

function fail(message) {
  console.error(`validate-supabase-rls-matrix: ${message}`);
  process.exit(1);
}

function normalizeTableName(raw) {
  return String(raw || "").replace(/"/g, "").trim();
}

function loadCombinedMigrationsSql() {
  if (!fs.existsSync(migrationsDir)) {
    fail(`no existe ${migrationsDir}`);
  }
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    fail("no hay migraciones .sql");
  }
  return files.map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8")).join("\n\n");
}

function tablePattern(table) {
  const quoted = table.replace(/"/g, "");
  const needsQuotes = /[A-Z]/.test(quoted);
  const bare = needsQuotes ? `"${quoted}"` : quoted;
  const escaped = bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Identificadores entre comillas no tienen límite de palabra (\b) antes de "
  return needsQuotes ? new RegExp(escaped, "i") : new RegExp(`\\b${escaped}\\b`, "i");
}

function assertRlsEnabled(sql, table) {
  const pattern = new RegExp(
    `ALTER\\s+TABLE\\s+${tablePattern(table).source}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  );
  if (!pattern.test(sql)) {
    fail(`tabla ${table}: falta ENABLE ROW LEVEL SECURITY`);
  }
}

function assertForceRls(sql, table) {
  const pattern = new RegExp(
    `ALTER\\s+TABLE\\s+${tablePattern(table).source}\\s+FORCE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  );
  if (!pattern.test(sql)) {
    fail(`tabla ${table}: falta FORCE ROW LEVEL SECURITY (dueño de tabla no puede saltarse RLS)`);
  }
}

function assertRevokedFromRoles(sql, table, roles) {
  const revokeRe = new RegExp(
    `REVOKE\\s+ALL\\s+ON\\s+(?:TABLE\\s+)?${tablePattern(table).source}\\s+FROM\\s+([^;\\n]+)`,
    "gi",
  );
  const found = new Set();
  let match;
  while ((match = revokeRe.exec(sql)) !== null) {
    const segment = match[1].toLowerCase();
    for (const role of roles) {
      if (segment.includes(role)) {
        found.add(role);
      }
    }
  }
  for (const role of roles) {
    if (!found.has(role)) {
      fail(`tabla ${table}: falta REVOKE ALL ... FROM ${role} (o equivalente en la misma sentencia)`);
    }
  }
}

function assertNoAnonWritePolicies(sql, table) {
  const policyRe = new RegExp(
    `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+${tablePattern(table).source}[\\s\\S]*?;`,
    "gi",
  );
  let match;
  while ((match = policyRe.exec(sql)) !== null) {
    const block = match[0];
    if (!/\bTO\s+anon\b/i.test(block)) continue;
    if (/\bFOR\s+(ALL|INSERT|UPDATE|DELETE)\b/i.test(block)) {
      fail(`tabla ${table}: política RLS peligrosa para anon (${block.slice(0, 120)}...)`);
    }
  }
}

function assertNoAnonSelectGrant(sql, table) {
  const grantRe = new RegExp(
    `GRANT\\s+SELECT\\s+ON\\s+TABLE\\s+${tablePattern(table).source}\\s+TO\\s+anon\\b`,
    "i",
  );
  const revokeAnonReadRe = new RegExp(
    `REVOKE\\s+(?:SELECT|ALL)\\s+ON\\s+(?:TABLE\\s+)?${tablePattern(table).source}\\s+FROM\\s+[^;\\n]*\\banon\\b`,
    "i",
  );
  if (grantRe.test(sql) && !revokeAnonReadRe.test(sql)) {
    fail(`tabla ${table}: GRANT SELECT TO anon sin REVOKE SELECT/ALL posterior`);
  }
}

function assertProductosCatalogPolicy(sql) {
  assertRlsEnabled(sql, "productos");
  if (!/CREATE\s+POLICY\s+"anon_read_active_productos"[\s\S]*?TO\s+anon[\s\S]*?FOR\s+SELECT/i.test(sql)) {
    fail("productos: falta política anon_read_active_productos (SELECT)");
  }
  if (!/anon_read_active_productos[\s\S]*?activo\s+IS\s+TRUE/i.test(sql)) {
    fail("productos: la política anon debe filtrar activo IS TRUE");
  }
  assertNoAnonWritePolicies(sql, "productos");
}

function assertRpcRevokedFromClientRoles(sql, functionName) {
  const revokeRe = new RegExp(
    `REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+${functionName}\\s*\\([\\s\\S]*?\\)\\s+FROM\\s+([^;\\n]+)`,
    "gi",
  );
  const found = { anon: false, authenticated: false, public: false };
  let match;
  while ((match = revokeRe.exec(sql)) !== null) {
    const roles = match[1].toLowerCase();
    if (roles.includes("anon")) found.anon = true;
    if (roles.includes("authenticated")) found.authenticated = true;
    if (roles.includes("public")) found.public = true;
  }
  if (!found.anon || !found.authenticated) {
    fail(
      `función ${functionName}: falta REVOKE ALL ON FUNCTION ... FROM anon/authenticated (encontrado: ${JSON.stringify(found)})`,
    );
  }
}

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const sql = loadCombinedMigrationsSql();

for (const table of contract.bffOnlyTables) {
  assertRlsEnabled(sql, table);
  assertForceRls(sql, table);
  assertRevokedFromRoles(sql, table, ["anon", "authenticated"]);
  assertNoAnonWritePolicies(sql, table);
  assertNoAnonSelectGrant(sql, table);
}

assertProductosCatalogPolicy(sql);

for (const table of contract.metadataBffOnlyTables || []) {
  assertRlsEnabled(sql, table);
  assertForceRls(sql, table);
  assertRevokedFromRoles(sql, table, ["anon", "authenticated"]);
  assertNoAnonWritePolicies(sql, table);
}

for (const table of contract.metadataNoAnonSelect) {
  assertNoAnonSelectGrant(sql, table);
  const revokeAnonRead = new RegExp(
    `REVOKE\\s+(?:SELECT|ALL)\\s+ON\\s+(?:TABLE\\s+)?${tablePattern(table).source}\\s+FROM\\s+[^;\\n]*\\banon\\b`,
    "i",
  );
  if (!revokeAnonRead.test(sql)) {
    fail(`tabla ${table}: falta REVOKE SELECT/ALL FROM anon (metadatos solo vía BFF)`);
  }
}

for (const fn of contract.bffOnlyRpcFunctions) {
  assertRpcRevokedFromClientRoles(sql, fn);
}

const metadataCount = (contract.metadataBffOnlyTables || []).length;
console.log(
  `validate-supabase-rls-matrix: OK — ${contract.bffOnlyTables.length} tablas BFF-only, ${metadataCount} metadatos, catálogo productos, RPC sensibles`,
);
