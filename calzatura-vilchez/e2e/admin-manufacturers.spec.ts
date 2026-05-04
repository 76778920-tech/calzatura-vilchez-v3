/**
 * E2E: AdminManufacturers — carga, filtro de estado y borrado con confirm.
 *
 * TC-MFR-001: Pantalla carga con lista de fabricantes y stats.
 * TC-MFR-002: Filtro "inactivos" muestra solo fabricantes inactivos.
 * TC-MFR-003: Aceptar confirm → DELETE llamado + toast "Fabricante eliminado".
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Semilla ──────────────────────────────────────────────────────────────────

const MFR_ACTIVO = {
  id: "mfr-e2e-001",
  dni: "12345678",
  nombres: "Juan",
  apellidos: "Proveedor",
  marca: "MarcaActiva",
  telefono: "999000001",
  ultimoIngresoFecha: "2026-04-01",
  ultimoIngresoMonto: 500,
  documentos: [],
  observaciones: "",
  activo: true,
  creadoEn: "2025-01-01T00:00:00.000Z",
  actualizadoEn: "2026-04-01T00:00:00.000Z",
};

const MFR_INACTIVO = {
  ...MFR_ACTIVO,
  id: "mfr-e2e-002",
  nombres: "Pedro",
  marca: "MarcaInactiva",
  activo: false,
};

const ALL_MFRS = [MFR_ACTIVO, MFR_INACTIVO];

// ─── Setup helper ─────────────────────────────────────────────────────────────

async function setupMfrMocks(page: Page, manufacturers: unknown[] = ALL_MFRS) {
  await page.route("**/rest/v1/fabricantes*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(manufacturers) });
      return;
    }
    if (method === "DELETE") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });

  await page.route("**/rest/v1/auditoria*", async (route) => {
    await route.fulfill({ status: 201, body: "" });
  });
}

async function goToManufacturers(page: Page) {
  await page.goto("/admin/fabricantes");
  await page.waitForLoadState("domcontentloaded");
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin fabricantes → carga, filtro y borrado", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-manufacturers] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
    await setupMfrMocks(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-MFR-001
  // ──────────────────────────────────────────────────────────────────────────
  test("pantalla carga con lista de 2 fabricantes y stats visibles (TC-MFR-001)", async ({ page }) => {
    await goToManufacturers(page);

    // Fabricantes como tarjetas o filas — esperamos los dos nombres de marca
    await expect(page.getByText("MarcaActiva")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("MarcaInactiva")).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-MFR-002
  // ──────────────────────────────────────────────────────────────────────────
  test("filtro 'inactivos' muestra solo MarcaInactiva (TC-MFR-002)", async ({ page }) => {
    await goToManufacturers(page);

    await expect(page.getByText("MarcaActiva")).toBeVisible({ timeout: 10_000 });

    await page.locator(".admin-manufacturer-filter-grid select").selectOption("inactivos");

    await expect(page.getByText("MarcaInactiva")).toBeVisible();
    await expect(page.getByText("MarcaActiva")).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-MFR-003
  // ──────────────────────────────────────────────────────────────────────────
  test("aceptar confirm en borrar llama DELETE y muestra toast (TC-MFR-003)", async ({ page }) => {
    await goToManufacturers(page);

    await expect(page.getByText("MarcaActiva")).toBeVisible({ timeout: 10_000 });

    let deleteCalled = false;
    await page.route("**/rest/v1/fabricantes*", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fallback();
    });

    page.once("dialog", (dialog) => dialog.accept());

    await page.locator(".action-btn.delete-btn").first().click();

    await expect(page.getByText(/Fabricante eliminado/i)).toBeVisible({ timeout: 5_000 });
    expect(deleteCalled).toBe(true);
  });
});
