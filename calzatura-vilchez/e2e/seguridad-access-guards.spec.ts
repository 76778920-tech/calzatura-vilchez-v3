/**
 * E2E Seguridad (ISO 25010 · RNF-SEG-01): rutas restringidas sin sesión.
 * TC-SEG-001 admin · TC-SEG-002 staff · TC-SEG-003 cliente
 */
import { expect, test } from "@playwright/test";
import {
  ADMIN_GUARD_PATHS,
  CLIENT_GUARD_PATHS,
  STAFF_GUARD_PATHS,
} from "./helpers/securityGuardRoutes";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("seguridad — acceso sin sesión (RNF-SEG-01)", () => {
  test("TC-SEG-001: todas las rutas /admin/* redirigen a login admin", async ({ page }) => {
    for (const path of ADMIN_GUARD_PATHS) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expect(page, `ruta ${path}`).toHaveURL(/\/admin\/login/);
    }
  });

  test("TC-SEG-002: todas las rutas /staff/* redirigen a login tienda", async ({ page }) => {
    for (const path of STAFF_GUARD_PATHS) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expect(page, `ruta ${path}`).toHaveURL(/\/login/);
      await expect(page.url()).not.toMatch(/\/admin\/login/);
    }
  });

  test("TC-SEG-003: rutas cliente protegidas redirigen a login tienda", async ({ page }) => {
    for (const path of CLIENT_GUARD_PATHS) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expect(page, `ruta ${path}`).toHaveURL(/\/login/);
    }
  });
});
