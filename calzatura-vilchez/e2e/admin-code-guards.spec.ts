import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";
import { mockBffUpdateProductAtomicError } from "./helpers/mockAdminBff";

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

function isExpectedMockedConflict(text: string): boolean {
  return /Failed to load resource: the server responded with a status of 409 \(Conflict\)/.test(text);
}

/** Ruido habitual de Chromium/Playwright (recargas, abortos, HTTP/2); no indica fallo del flujo bajo prueba. */
function isIgnorableBrowserLoadError(text: string): boolean {
  if (!text.includes("Failed to load resource")) return false;
  return /ERR_HTTP2_PROTOCOL_ERROR|ERR_CONNECTION_RESET|ERR_ABORTED|ERR_BLOCKED_BY_CLIENT/.test(text);
}

async function getExistingCodes(page: Page) {
  const codes = await page.locator(".admin-code-badge").allInnerTexts();
  return codes
    .map((value) => normalizeCode(value))
    .filter((value) => Boolean(value) && value !== "SIN-CODIGO");
}

// Producto semilla: código CV-SEED-1 (sufijo -1 cubre tests 1 y 2).
const SEED_PRODUCT = {
  id: "e2e-seed-1",
  nombre: "Zapato Test E2E",
  precio: 150,
  descripcion: "",
  imagen: "",
  imagenes: [],
  stock: 10,
  categoria: "hombre",
  tipoCalzado: "Zapatillas",
  tallas: ["40"],
  tallaStock: { "40": 10 },
  marca: "Marca Test",
  material: null,
  estilo: null,
  color: "Negro",
  familiaId: "e2e-seed-1",
  destacado: false,
  descuento: null,
};
const SEED_CODE = "CV-SEED-1";

/**
 * Inyecta datos semilla vía route-mock y recarga la página.
 *
 * Mocks:
 *  - GET  /rest/v1/productos*        → [SEED_PRODUCT]
 *  - PATCH/POST /rest/v1/productos*  → 200 (evita unhandled rejections en test 3)
 *  - GET  /rest/v1/productoCodigos*  → [{ productoId, codigo }]
 *  - GET  /rest/v1/productoFinanzas* → []
 *  - PATCH/POST /rest/v1/productoFinanzas* → 200
 *
 * LIFO de Playwright: si un test registra su propio handler para
 * productoCodigos ANTES de llamar a setupProductMocks, ese handler queda
 * con menor prioridad. Para GET, este handler lo resuelve directamente.
 * Para POST, este handler llama fallback() y el test lo intercepta.
 */
async function setupProductMocks(page: Page) {
  await page.route("**/rest/v1/productos*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([SEED_PRODUCT]),
      });
      return;
    }
    if (method === "PATCH" || method === "POST" || method === "DELETE") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/productoCodigos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ productoId: SEED_PRODUCT.id, codigo: SEED_CODE }]),
      });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      return;
    }
    if (method === "PATCH" || method === "POST" || method === "DELETE") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector(".admin-code-badge", { timeout: 10_000 });
}

test.describe("admin productos → guardas de código único", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (error) => {
      console.log(`[admin-code-guards] browser pageerror -> ${error.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        if (isExpectedMockedConflict(msg.text())) return;
        if (isIgnorableBrowserLoadError(msg.text())) return;
        console.log(`[admin-code-guards] browser console error -> ${msg.text()}`);
      }
    });

    // Auth completamente moquead: inyecta usuario admin falso en IDB y moquea
    // los endpoints de Firebase/Supabase. No requiere credenciales reales.
    await injectFakeAdminAuth(page);
    await page.goto("/admin/productos");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: /producto nuevo/i }).waitFor({
      state: "visible",
      timeout: 15_000,
    });
  });

  // ---------------------------------------------------------------------------
  // Test 1: guarda cliente-side bloquea código duplicado en modo Nuevo producto
  // ---------------------------------------------------------------------------
  test("bloquea guardar si el código ya existe en otro producto", async ({ page }) => {
    await setupProductMocks(page);

    const existingCodes = await getExistingCodes(page);
    expect(existingCodes.length, "El mock debe inyectar al menos un código en la tabla").toBeGreaterThan(0);
    const duplicatedCode = existingCodes[0]; // "CV-SEED-1"

    await page.getByRole("button", { name: /producto nuevo/i }).click();
    await expect(page.locator(".product-modal--create")).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder("CV-FOR-001").fill(duplicatedCode);

    // El modal de Nuevo producto tiene varios campos con `required`.
    // Desactivar validación HTML5 para que handleSave se ejecute: el chequeo
    // de código duplicado es la PRIMERA guarda de handleSave (antes de nombre,
    // precio, etc.), por lo que dispara el toast aunque el resto esté vacío.
    await page.locator(".modal-form").evaluate((el) => {
      (el as HTMLFormElement).noValidate = true;
    });
    await page.getByRole("button", { name: /crear producto/i }).click();

    await expect(
      page.getByText(`El código "${duplicatedCode}" ya existe en otro producto`)
    ).toBeVisible({ timeout: 5_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 2: guarda cliente-side bloquea colisión de código generado (BASE-1)
  // ---------------------------------------------------------------------------
  test("bloquea creación de variante si código generado (BASE-1) ya existe", async ({ page }) => {
    await setupProductMocks(page);

    const existingCodes = await getExistingCodes(page);
    const collided = existingCodes.find((code) => /-1$/.test(code));
    expect(collided, "El mock debe inyectar un código con sufijo -1 (CV-SEED-1)").toBeTruthy();

    // "CV-SEED-1".slice(0, -2) → "CV-SEED"
    const codeBase = collided!.slice(0, -2);

    const row = page
      .locator("tr", { has: page.locator(".admin-code-badge", { hasText: collided! }) })
      .first();
    await row.getByRole("button", { name: /crear variante/i }).click();
    await expect(page.locator(".product-modal--create")).toBeVisible({ timeout: 10_000 });

    // Código base cuya variante -1 colisiona con el seed.
    await page.getByPlaceholder("CV-FOR-001").fill(codeBase);

    // Activar Color 1 con "Negro".
    await page.locator(".variant-chip").first().click();
    await page.locator(".admin-color-popover-item").filter({ hasText: "Negro" }).first().click();

    // Esperar a que React renderice la sección de tallas/stock del color activo.
    await page.waitForSelector(".variant-tallas-list", { timeout: 5_000 });
    await page.locator(".variant-tallas-list .admin-size-stock-item input").first().fill("1");
    await page.getByPlaceholder("URL imagen 1").first().fill("https://example.com/e2e-variant-1.jpg");

    // Financiero: handleSave valida costoCompra > 0 y precio dentro del rango.
    // Con costo 60 y márgenes 25/45/75 %, el rango es S/ 75–105 → precio 90 ✓.
    await page.locator(".admin-finance-box input").first().fill("60");
    await page.locator(".product-core-row input[placeholder='0.00']").fill("90").catch(() => null);

    await page.getByRole("button", { name: /crear producto/i }).click();

    await expect(
      page.getByText(`El código generado "${collided}" ya existe. Cambia el código base.`)
    ).toBeVisible({ timeout: 5_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 3: catch de error 23505 de BD muestra mensaje amigable en modo Editar
  // ---------------------------------------------------------------------------
  test("muestra mensaje claro si la BD devuelve error de unicidad", async ({ page }) => {
    // La edición ya no usa PATCH/POST separados: va por update_product_atomic (RPC).
    // Registrar el mock del RPC ANTES de setupProductMocks → menor prioridad LIFO,
    // pero el RPC no está en setupProductMocks, así que no hay conflicto.
    let rpcTriggered = false;
    await mockBffUpdateProductAtomicError(
      page,
      409,
      "duplicate key value violates unique constraint",
      () => {
        rpcTriggered = true;
      },
    );

    await setupProductMocks(page);

    // El seed garantiza al menos un producto con botón Editar.
    await page.locator(".admin-actions .edit-btn").first().click();
    await expect(page.getByRole("heading", { name: /editar producto/i })).toBeVisible({ timeout: 10_000 });

    // Tipo de calzado: seed tiene "Zapatillas" para categoría "hombre".
    // Seleccionar explícitamente para garantizar que el form lo tenga válido.
    await page
      .locator("select")
      .filter({ has: page.locator("option", { hasText: "Selecciona un tipo" }) })
      .first()
      .selectOption("Zapatillas");

    // costoCompra primero para que el rango se calcule antes de poner el precio.
    // Con costo 60 y márgenes 25/45/75 %, el rango es S/ 75–105 → precio 90 ✓.
    await page.locator(".admin-finance-box input").first().fill("60");
    await page.locator(".product-core-row input[placeholder='0.00']").fill("90");

    // Código único: sin colisión cliente-side para que handleSave llegue al RPC.
    await page.getByPlaceholder("CV-FOR-001").fill("E2E-CODE-UNIQ");

    // Al menos una imagen (seed tiene imagenes=[]): necesario para pasar la
    // guardia "Agrega al menos una imagen del producto" en modo editar.
    await page.getByPlaceholder("URL de imagen 1").first().fill("https://example.com/e2e-edit-1.jpg");

    // Stock: seed tiene tallaStock={"40":10}, totalStock=10>0. Rellenar igualmente
    // para el caso de que el store muestre 0 tras el reload con datos moquead.
    await page.locator(".admin-size-stock-grid .admin-size-stock-item input").first().fill("1");

    await page.getByRole("button", { name: /actualizar/i }).click();

    await expect(
      page.getByText("Código duplicado: usa un código único para este producto")
    ).toBeVisible({ timeout: 5_000 });

    expect(rpcTriggered, "El RPC update_product_atomic debe haber sido interceptado").toBe(true);
  });
});
