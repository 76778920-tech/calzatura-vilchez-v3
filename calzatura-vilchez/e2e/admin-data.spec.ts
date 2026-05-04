/**
 * E2E: AdminData — carga de pantalla y visibilidad del botón Plantilla.
 *
 * Import/export de Excel es complejo de probar end-to-end (requiere file input +
 * mock de upsert). Estos tests cubren el mínimo verificable sin depender de archivos:
 *
 * TC-DATA-001: Pantalla carga con título "Gestión de Datos Excel" y selector de colección.
 * TC-DATA-002: Botón "Plantilla" está visible y habilitado para la primera colección.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Setup helper ─────────────────────────────────────────────────────────────

async function setupDataMocks(page: Page) {
  // AdminData hace GET a varias tablas para exportar; moquear todas para que no fallen.
  const tables = ["productos", "fabricantes", "productoFinanzas", "ventasDiarias"];
  for (const table of tables) {
    await page.route(`**/rest/v1/${table}*`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return;
      }
      await route.fallback();
    });
  }

  await page.route("**/rest/v1/auditoria*", async (route) => {
    await route.fulfill({ status: 201, body: "" });
  });

  await page.route("**/api/cache/**", async (route) => {
    await route.fulfill({ status: 200, body: "{}" });
  });
}

async function goToData(page: Page) {
  await page.goto("/admin/datos");
  await page.waitForLoadState("domcontentloaded");
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin datos excel → carga y botón plantilla", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-data] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
    await setupDataMocks(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-DATA-001
  // ──────────────────────────────────────────────────────────────────────────
  test("pantalla carga con título 'Gestión de Datos Excel' (TC-DATA-001)", async ({ page }) => {
    await goToData(page);

    await expect(page.getByText(/Gestión de Datos Excel/i)).toBeVisible({ timeout: 15_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-DATA-002
  // ──────────────────────────────────────────────────────────────────────────
  test("botón 'Plantilla' está visible y habilitado para descargar (TC-DATA-002)", async ({ page }) => {
    await goToData(page);

    await expect(page.getByText(/Gestión de Datos Excel/i)).toBeVisible({ timeout: 15_000 });

    // Cada colección tiene un botón "Plantilla" para descargar el template xlsx
    const plantillaBtn = page.getByRole("button", { name: /Plantilla/i }).first();
    await expect(plantillaBtn).toBeVisible();
    await expect(plantillaBtn).toBeEnabled();
  });
});
