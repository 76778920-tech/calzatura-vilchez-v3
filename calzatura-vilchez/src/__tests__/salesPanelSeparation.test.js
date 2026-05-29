import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.resolve(root, relPath), "utf8");
}

describe("Separación panel ventas admin vs staff", () => {
  it("StaffSales no monta AdminSales ni useAdminSalesPage", () => {
    const staffSales = read("src/domains/trabajadores/pages/StaffSales.tsx");
    expect(staffSales).toContain("useStaffSalesPage");
    expect(staffSales).not.toMatch(/useAdminSalesPage|AdminSales\.tsx/);
  });

  it("useStaffSalesPage fija alcance staff", () => {
    const hook = read("src/domains/trabajadores/pages/useStaffSalesPage.ts");
    expect(hook).toContain('financeScope: "staff"');
    expect(hook).not.toMatch(/from\s+["']@\/security\/accessControl["']/);
    expect(hook).not.toContain("/admin/dailySales");
  });

  it("useAdminSalesPage fija alcance admin", () => {
    const hook = read("src/domains/ventas/pages/useAdminSalesPage.ts");
    expect(hook).toContain('financeScope: "admin"');
    expect(hook).not.toMatch(/from\s+["']@\/security\/accessControl["']/);
  });

  it("App.tsx enruta /staff/ventas a StaffSales y /admin/ventas a AdminSales", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('import("@/domains/trabajadores/pages/StaffSales")');
    expect(app).toMatch(/STAFF_ROUTES\.root[\s\S]*StaffSales/);
    expect(app).toMatch(/ADMIN_ROUTES\.root[\s\S]*AdminSales/);
  });
});
