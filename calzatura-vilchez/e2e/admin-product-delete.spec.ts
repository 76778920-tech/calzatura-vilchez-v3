/**
 * E2E: AdminProducts — borrado de producto con confirmación nativa.
 *
 * Cubre:
 * 1. Aceptar el confirm() elimina el producto: estado vacío en UI + producto ausente (TC-PROD-DEL01).
 *    (El estado vacío es un <tr> en <tbody>, no usar toHaveCount(0) sobre filas.)
 * 2. Rechazar el confirm() no llama al RPC y el producto permanece (TC-PROD-DEL02).
 *
 * handleDelete usa window.confirm(); Playwright lo intercepta con page.on("dialog").
 * El borrado se mockea como RPC atómico `delete_product_atomic`.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";
import { mockBffDeleteProductAtomic } from "./helpers/mockAdminBff";

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
  deleteProductAtomicCalls: number;
}

async function setupMocks(page: Page): Promise<Counters> {
  const counters: Counters = { deleteProductAtomicCalls: 0 };

  await page.route("**/rest/v1/productos*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const body = counters.deleteProductAtomicCalls > 0 ? "[]" : JSON.stringify([PRODUCT]);
      await route.fulfill({ status: 200, contentType: "application/json", body });
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
    await route.fallback();
  });

  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });

  await mockBffDeleteProductAtomic(page, () => {
    counters.deleteProductAtomicCalls += 1;
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

    // El RPC atómico debe haberse llamado exactamente una vez
    expect(counters.deleteProductAtomicCalls).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-PROD-DEL02: rechazar el confirm → no llama RPC, producto permanece
  // ──────────────────────────────────────────────────────────────────────────
  test("rechazar el confirm no llama al RPC y el producto permanece (TC-PROD-DEL02)", async ({ page }) => {
    await goToProducts(page);
    const counters = await setupMocks(page);

    await expect(page.locator("table tbody tr")).toHaveCount(1);

    // Interceptar el confirm nativo y rechazar
    page.once("dialog", (dialog) => dialog.dismiss());

    await page.locator(".action-btn.delete-btn").first().click();

    // El producto debe seguir en la tabla (sin recarga)
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Bota Borrable E2E");

    // Ningún RPC fue llamado
    expect(counters.deleteProductAtomicCalls).toBe(0);
  });
});
