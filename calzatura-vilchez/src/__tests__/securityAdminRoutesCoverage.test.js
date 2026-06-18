import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pathsSource = fs.readFileSync(path.resolve(process.cwd(), "src/routes/paths.ts"), "utf8");
const e2eRoutesSource = fs.readFileSync(
  path.resolve(process.cwd(), "e2e/helpers/securityGuardRoutes.ts"),
  "utf8",
);

function extractAdminPathsFromPathsTs() {
  const adminBase = (pathsSource.match(/VITE_ADMIN_PATH \?\? "([^"]+)"/) ?? [])[1] ?? "/admin";
  const block = pathsSource.match(/export const ADMIN_ROUTES = \{[\s\S]*?\} as const;/)?.[0] ?? "";
  const paths = new Set();
  paths.add(adminBase);
  for (const match of block.matchAll(/`\$\{_AP\}([^`]*)`/g)) {
    const suffix = match[1].replace(/\/\*$/, "");
    if (suffix && suffix !== "/login") {
      paths.add(`${adminBase}${suffix}`);
    }
  }
  return [...paths].sort();
}

function extractPathsFromE2eHelper(constName) {
  const block = e2eRoutesSource.match(
    new RegExp(`export const ${constName} = \\[([\\s\\S]*?)\\] as const;`),
  )?.[1] ?? "";
  return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
}

describe("Seguridad — cobertura E2E rutas restringidas (RNF-SEG-01)", () => {
  it("ADMIN_GUARD_PATHS cubre todas las rutas de ADMIN_ROUTES en paths.ts", () => {
    const expected = extractAdminPathsFromPathsTs();
    const covered = extractPathsFromE2eHelper("ADMIN_GUARD_PATHS");
    expect(covered).toEqual(expected);
  });

  it("seguridad-access-guards.spec.ts referencia TC-SEG-001…003", () => {
    const spec = fs.readFileSync(
      path.resolve(process.cwd(), "e2e/seguridad-access-guards.spec.ts"),
      "utf8",
    );
    expect(spec).toContain("TC-SEG-001");
    expect(spec).toContain("TC-SEG-002");
    expect(spec).toContain("TC-SEG-003");
  });
});
