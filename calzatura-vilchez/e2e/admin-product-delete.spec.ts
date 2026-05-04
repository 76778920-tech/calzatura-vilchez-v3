/**
 * E2E: AdminProducts — borrado de producto con confirmación nativa.
 *
 * Cubre:
 * 1. Aceptar el confirm() elimina el producto: estado vacío en UI + producto ausente (TC-PROD-DEL01).
 *    (El estado vacío es un <tr> en <tbody>, no usar toHaveCount(0) sobre filas.)
 * 2. Rechazar el confirm() no llama a DELETE y el producto permanece (TC-PROD-DEL02).
 *
 * handleDelete usa window.confirm(); Playwright lo intercepta con page.on("dialog").
 * Los tres DELETE (productos / productoCodigos / productoFinanzas) se mockean por
 * separado para poder afirmar si fueron o no llamados.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Semilla ──────────────────────────────────────────────────────────────────

const PRODUCT = {
  id: "e2e-del-001",
  nombre: "Bota Borrable E2E",
  precio: 130,
  descripcion: "",
  imagen: "",
  imagenes: [],
  stock: 5,
  categoria: "hombre",
  tipoCalzado: "Zapatillas",
  tallas: ["40", "41"],
  tallaStock: { "40": 3, "41": 2 },
  marca: "BrandDel",
  material: null,
  estilo: null,
  color: "Negro",
  familiaId: "e2e-del-001",
  destacado: false,
  descuento: null,
  campana: null,
};

// ─── Setup helper ─────────────────────────────────────────────────────────────

interface Counters {
  productosDeleteCalls: number;
  codigosDeleteCalls: number;
  finanzasDeleteCalls: number;
}

async function setupMocks(page: Page): Promise<Counters> {
  const counters: Counters = { productosDeleteCalls: 0, codigosDeleteCalls: 0, finanzasDeleteCalls: 0 };

  await page.route("**/rest/v1/productos*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const body = counters.productosDeleteCalls > 0 ? "[]" : JSON.stringify([PRODUCT]);
      await route.fulfill({ status: 200, contentType: "application/json", body });
      return;
    }
    if (method === "DELETE") {
      counters.productosDeleteCalls += 1;
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });

  await page.route("**/rest/v1/productoCodigos*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    if (method === "DELETE") {
      counters.codigosDeleteCalls += 1;
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });

  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    if (method === "DELETE") {
      counters.finanzasDeleteCalls += 1;
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });

  // logAudit lanza un INSERT a auditoria; el try/catch de logAudit absorbe errores,
  // pero moquear evita request sin handler en CI.
  await page.route("**/rest/v1/auditoria*", async (route) => {
    await route.fulfill({ status: 201, body: "" });
  });

  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("table tbody tr", { timeout: 10_000 });

  return counters;
}

async function goToProducts(page: Page) {
  await page.goto("/admin/productos");
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("button", { name: /producto nuevo/i }).waitFor({ state: "visible", timeout: 15_000 });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin productos → borrado con confirmación", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[product-delete] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-PROD-DEL01: aceptar confirm → DELETE en las 3 tablas + estado vacío (texto) + producto ausente
  // ──────────────────────────────────────────────────────────────────────────
  test("aceptar el confirm elimina el producto y deja la lista vacía (TC-PROD-DEL01)", async ({ page }) => {
    await goToProducts(page);
    const counters = await setupMocks(page);

    // 1 producto visible antes de borrar
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Bota Borrable E2E");

    // Interceptar el confirm nativo y aceptar
    page.once("dialog", (dialog) => dialog.accept());

    await page.locator(".action-btn.delete-btn").first().click();

    // Toast de éxito
    await expect(page.getByText(/producto eliminado/i)).toBeVisible({ timeout: 8_000 });

    // La lista recarga: estado vacío como <tr> en <tbody> — asertar mensaje + ausencia del producto
    await expect(page.getByText("No hay productos. Crea el primero.")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("table")).not.toContainText("Bota Borrable E2E");

    // Los tres DELETE deben haberse llamado exactamente una vez
    expect(counters.productosDeleteCalls).toBe(1);
    expect(counters.codigosDeleteCalls).toBe(1);
    expect(counters.finanzasDeleteCalls).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-PROD-DEL02: rechazar el confirm → no llama DELETE, producto permanece
  // ──────────────────────────────────────────────────────────────────────────
  test("rechazar el confirm no llama DELETE y el producto permanece (TC-PROD-DEL02)", async ({ page }) => {
    await goToProducts(page);
    const counters = await setupMocks(page);

    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // Interceptar el confirm nativo y rechazar
    page.once("dialog", (dialog) => dialog.dismiss());

    await page.locator(".action-btn.delete-btn").first().click();

    // El producto debe seguir en la tabla (sin recarga)
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Bota Borrable E2E");

    // Ningún DELETE fue llamado
    expect(counters.productosDeleteCalls).toBe(0);
    expect(counters.codigosDeleteCalls).toBe(0);
    expect(counters.finanzasDeleteCalls).toBe(0);
  });
});
