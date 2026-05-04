/**
 * E2E: cadena completa BD-trigger → toast amigable.
 *
 * Simula que Supabase rechaza el PATCH con el mensaje de un trigger de BD
 * (cv_guard_producto_tipo / cv_guard_producto_finanzas) y verifica que
 * AdminProducts.tsx muestra el toast legible generado por
 * describeCommercialDraftError, sin exponer el mensaje crudo de PostgreSQL.
 *
 * No requiere credenciales reales: usa la misma infraestructura de auth mock
 * y datos semilla que admin-code-guards.spec.ts.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

const SEED_PRODUCT = {
  id: "e2e-guard-1",
  nombre: "Zapato Guard E2E",
  precio: 150,
  descripcion: "",
  imagen: "",
  imagenes: [],
  stock: 10,
  categoria: "hombre",
  tipoCalzado: "Zapatillas",
  tallas: ["40"],
  tallaStock: { "40": 10 },
  marca: "Marca Guard",
  material: null,
  estilo: null,
  color: "Negro",
  familiaId: "e2e-guard-1",
  destacado: false,
  descuento: null,
};

// Error PostgREST que devuelve Supabase cuando un trigger lanza RAISE EXCEPTION.
// code "P0001" es el default de PostgreSQL para RAISE EXCEPTION sin SQLSTATE.
function postgrestTriggerError(triggerMessage: string) {
  return JSON.stringify({ code: "P0001", details: null, hint: null, message: triggerMessage });
}

async function setupMocks(page: Page) {
  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([SEED_PRODUCT]) });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/productoCodigos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      return;
    }
    await route.fallback();
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("table tbody tr", { timeout: 10_000 });
}

async function openEditModal(page: Page) {
  await page.locator(".admin-actions .edit-btn").first().click();
  await expect(page.getByRole("heading", { name: /editar producto/i })).toBeVisible({ timeout: 10_000 });

  // Código: seed no tiene registro en productoCodigos (mock devuelve []).
  await page.getByPlaceholder("CV-FOR-001").fill("E2E-GUARD-001");

  // costoCompra=60 → rango [75, 105]; precio=90 → dentro del rango.
  // Rellenar antes de precio para que el rango se calcule.
  await page.locator(".admin-finance-box input").first().fill("60");
  await page.locator(".product-core-row input[placeholder='0.00']").fill("90");

  // Imagen requerida (seed tiene imagenes=[]).
  await page.getByPlaceholder("URL de imagen 1").first().fill("https://example.com/guard-e2e.jpg");

  // Stock por si el mock devuelve 0 al cargar.
  await page.locator(".admin-size-stock-grid .admin-size-stock-item input").first().fill("1");
}

test.describe("admin productos → guardrails comerciales de BD", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[commercial-guards] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
    await page.goto("/admin/productos");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: /producto nuevo/i }).waitFor({ state: "visible", timeout: 15_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 1: trigger cv_guard_producto_tipo → toast legible en UI
  // ---------------------------------------------------------------------------
  test("muestra mensaje de tipo inválido cuando BD rechaza con cv_guard_producto_tipo", async ({ page }) => {
    await setupMocks(page);

    // Registrar handler DESPUÉS de setupMocks → mayor prioridad LIFO.
    // El RPC atómico devuelve el error del trigger como si fuera un error de BD.
    await page.route("**/rest/v1/rpc/update_product_atomic*", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: postgrestTriggerError('cv_guard_producto_tipo: tipo "Zapatillas" no válido para categoría "bebe"'),
      });
    });

    await openEditModal(page);
    await page.getByRole("button", { name: /actualizar/i }).click();

    await expect(
      page.getByText("El tipo de calzado no corresponde a la categoría seleccionada.")
    ).toBeVisible({ timeout: 5_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 2: trigger cv_guard_producto_finanzas → toast legible en UI
  // ---------------------------------------------------------------------------
  test("muestra mensaje financiero cuando BD rechaza con cv_guard_producto_finanzas", async ({ page }) => {
    await setupMocks(page);

    // El trigger financiero ahora dispara dentro del RPC atómico.
    // Registrar DESPUÉS de setupMocks → mayor prioridad LIFO.
    await page.route("**/rest/v1/rpc/update_product_atomic*", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: postgrestTriggerError("cv_guard_producto_finanzas: precio 150 fuera del rango comercial [75, 105]"),
      });
    });

    await openEditModal(page);
    await page.getByRole("button", { name: /actualizar/i }).click();

    await expect(
      page.getByText("Los márgenes o el rango de precio no coinciden con la regla comercial del producto.")
    ).toBeVisible({ timeout: 5_000 });
  });
});
