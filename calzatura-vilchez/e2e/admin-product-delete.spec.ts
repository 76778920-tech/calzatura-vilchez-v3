/**
 * E2E: AdminProducts — borrado de producto con dialogo accesible.
 *
 * Cubre:
 * 1. Confirmar el dialogo elimina el producto: estado vacío en UI + producto ausente (TC-PROD-DEL01).
 *    (El estado vacío es un <tr> en <tbody>, no usar toHaveCount(0) sobre filas.)
 * 2. Cancelar el dialogo no llama al RPC y el producto permanece (TC-PROD-DEL02).
 *
 * handleDelete abre un dialogo propio con nombre accesible.
 * El borrado se mockea como RPC atómico `delete_product_atomic`.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";
import { mockBffDeleteProductAtomic } from "./helpers/mockAdminBff";
import {
  mirrorAdminProductCodigos,
  mirrorAdminProductFinanzas,
} from "./helpers/mirrorAdminDataRoutes";

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

  await page.route(/\/admin\/products\/?(\?.*)?$/i, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const products = counters.deleteProductAtomicCalls > 0 ? [] : [PRODUCT];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products }),
    });
  });

  await mirrorAdminProductCodigos(page, []);
  await mirrorAdminProductFinanzas(page, []);

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

test.describe("admin productos → borrado con dialogo accesible", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[product-delete] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-PROD-DEL01: confirmar dialogo -> DELETE en las 3 tablas + estado vacio (texto) + producto ausente
  // ──────────────────────────────────────────────────────────────────────────
  test("confirmar el dialogo elimina el producto y deja la lista vacia (TC-PROD-DEL01)", async ({ page }) => {
    await goToProducts(page);
    const counters = await setupMocks(page);

    // 1 producto visible antes de borrar
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Bota Borrable E2E");

    await page.locator(".action-btn.delete-btn").first().click();
    const dialog = page.getByRole("dialog", { name: /eliminar producto/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Bota Borrable E2E");
    await dialog.getByRole("button", { name: /^eliminar producto$/i }).click();

    // Toast de éxito
    await expect(page.getByText(/producto eliminado/i)).toBeVisible({ timeout: 8_000 });

    // La lista recarga: estado vacío como <tr> en <tbody> — asertar mensaje + ausencia del producto
    await expect(page.getByText("No hay productos. Crea el primero.")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("table")).not.toContainText("Bota Borrable E2E");

    // El RPC atómico debe haberse llamado exactamente una vez
    expect(counters.deleteProductAtomicCalls).toBe(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-PROD-DEL02: cancelar dialogo -> no llama RPC, producto permanece
  // ──────────────────────────────────────────────────────────────────────────
  test("cancelar el dialogo no llama al RPC y el producto permanece (TC-PROD-DEL02)", async ({ page }) => {
    await goToProducts(page);
    const counters = await setupMocks(page);

    await expect(page.locator("table tbody tr")).toHaveCount(1);

    await page.locator(".action-btn.delete-btn").first().click();
    const dialog = page.getByRole("dialog", { name: /eliminar producto/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^cancelar$/i }).click();
    await expect(dialog).toBeHidden();

    // El producto debe seguir en la tabla (sin recarga)
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Bota Borrable E2E");

    // Ningún RPC fue llamado
    expect(counters.deleteProductAtomicCalls).toBe(0);
  });
});
