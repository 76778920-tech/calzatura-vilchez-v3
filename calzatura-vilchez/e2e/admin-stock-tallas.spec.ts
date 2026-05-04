/**
 * E2E: tallas y stock por color — edición + persistencia cruzada.
 *
 * Cubre:
 * 1. stock cero bloquea guardar (validación cliente)
 * 2. cambio de categoría en edición reemplaza el conjunto de tallas (hombre→bebe)
 * 3. payload PATCH incluye tallaStock y stock actualizados
 * 4. persistencia editar→listar→detalle: stock nuevo visible al re-abrir el modal
 * 5. persistencia crear→listar: variante nueva aparece en tabla tras crear
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Datos semilla ────────────────────────────────────────────────────────────

const SEED_ID = "e2e-tallas-1";

// precio=75 está dentro del rango financiero [72, 78] calculado con
// costoCompra=60 y márgenes 20/25/30, garantizando que la validación
// de precio pase y podamos llegar a las validaciones de stock/color.
const SEED_PRODUCT = {
  id: SEED_ID,
  nombre: "Zapato Tallas E2E",
  precio: 75,
  descripcion: "",
  imagen: "https://res.cloudinary.com/dnenqnvbg/image/upload/v1/seed.jpg",
  imagenes: ["https://res.cloudinary.com/dnenqnvbg/image/upload/v1/seed.jpg"],
  stock: 15,
  categoria: "hombre",
  tipoCalzado: "Zapatillas",
  tallas: ["40", "41"],
  tallaStock: { "40": 10, "41": 5 },
  marca: "Marca Tallas",
  material: null,
  estilo: null,
  color: "Negro",
  familiaId: SEED_ID,
  destacado: false,
  descuento: null,
};

const SEED_CODE = { productoId: SEED_ID, codigo: "E2E-TAL-001", actualizadoEn: "2026-01-01" };

// fetchProductFinancials indexa por productId → financials["e2e-tallas-1"]
const SEED_FINANCIAL = {
  productId: SEED_ID,
  costoCompra: 60,
  margenMinimo: 20,
  margenObjetivo: 25,
  margenMaximo: 30,
  precioMinimo: 72,
  precioSugerido: 75,
  precioMaximo: 78,
  actualizadoEn: "2026-01-01",
};

// ─── Helpers de red ───────────────────────────────────────────────────────────

async function setupMocks(page: Page, products: typeof SEED_PRODUCT[] = [SEED_PRODUCT]) {
  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(products) });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/productoCodigos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([SEED_CODE]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([SEED_FINANCIAL]) });
      return;
    }
    await route.fallback();
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("table tbody tr", { timeout: 10_000 });
}

// <label> en AdminProducts no usa htmlFor, así que getByLabel no funciona.
// Usamos el form-group padre como pivote para identificar cada select.
const categoriaSelect = (page: Page) =>
  page.locator(".form-group").filter({ hasText: /^Categoría/ }).locator("select");
const tipoSelect = (page: Page) =>
  page.locator(".form-group").filter({ hasText: /Tipo de calzado/ }).locator("select");

async function openEditModal(page: Page) {
  await page.locator(".admin-actions .edit-btn").first().click();
  await expect(page.getByRole("heading", { name: /editar producto/i })).toBeVisible({ timeout: 10_000 });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin productos → tallas y stock — edición + persistencia", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[stock-tallas] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
    await page.goto("/admin/productos");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: /producto nuevo/i }).waitFor({ state: "visible", timeout: 15_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 1: stock total cero bloquea el guardado
  // ──────────────────────────────────────────────────────────────────────────────
  test("stock cero bloquea guardar con mensaje de error", async ({ page }) => {
    await setupMocks(page);
    await openEditModal(page);

    // Poner a cero todas las tallas (hombre: 9 tallas 37–45)
    for (const input of await page.locator(".admin-size-stock-grid .admin-size-stock-item input").all()) {
      await input.fill("0");
    }

    await page.getByRole("button", { name: /actualizar/i }).click();

    await expect(
      page.getByText("Registra al menos una talla con stock")
    ).toBeVisible({ timeout: 5_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 2: cambiar categoría en edición reemplaza el conjunto de tallas
  // ──────────────────────────────────────────────────────────────────────────────
  test("cambiar categoría en edición reemplaza las tallas disponibles", async ({ page }) => {
    await setupMocks(page);
    await openEditModal(page);

    // hombre: tallas 37–45 → 9 inputs
    const initialCount = await page.locator(".admin-size-stock-grid .admin-size-stock-item input").count();
    expect(initialCount).toBe(9);

    // Cambiar a bebe: tallas 18–22 → 5 inputs
    await categoriaSelect(page).selectOption("bebe");

    await expect(
      page.locator(".admin-size-stock-grid .admin-size-stock-item input")
    ).toHaveCount(5, { timeout: 3_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 3: PATCH contiene tallaStock y stock actualizados
  // ──────────────────────────────────────────────────────────────────────────────
  test("guardar edición envía tallaStock y stock actualizados en el PATCH", async ({ page }) => {
    await setupMocks(page);

    let rpcBody: Record<string, unknown> | null = null;

    // Handler LIFO: captura el RPC atómico antes de que llegue al fallback de setupMocks
    await page.route("**/rest/v1/rpc/update_product_atomic*", async (route) => {
      rpcBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
    });

    await openEditModal(page);

    // Cambiar talla 40: 10 → 8  (stock total nuevo: 8 + 5 = 13)
    await page.locator(".admin-size-stock-item").filter({ hasText: "40" }).locator("input").fill("8");

    await page.getByRole("button", { name: /actualizar/i }).click();
    await expect(page.getByText("Producto actualizado")).toBeVisible({ timeout: 10_000 });

    expect(rpcBody).not.toBeNull();
    const product = (rpcBody as unknown as { product: { tallaStock: Record<string, number>; stock: number } }).product;
    expect(product.tallaStock["40"]).toBe(8);
    expect(product.tallaStock["41"]).toBe(5);
    expect(product.stock).toBe(13);
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 4: editar → listar → detalle — stock nuevo persiste al re-abrir
  // ──────────────────────────────────────────────────────────────────────────────
  test("stock editado persiste al listar y al re-abrir el modal (editar→listar→detalle)", async ({ page }) => {
    const updatedProduct = { ...SEED_PRODUCT, stock: 20, tallaStock: { "40": 15, "41": 5 }, tallas: ["40", "41"] };
    let getCount = 0;

    await page.route("**/rest/v1/productos*", async (route) => {
      if (route.request().method() === "GET") {
        getCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(getCount === 1 ? [SEED_PRODUCT] : [updatedProduct]),
        });
        return;
      }
      await route.fallback();
    });
    await page.route("**/rest/v1/productoCodigos*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([SEED_CODE]) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route("**/rest/v1/productoFinanzas*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([SEED_FINANCIAL]) });
        return;
      }
      await route.fallback();
    });
    await page.route("**/rest/v1/rpc/update_product_atomic*", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "null" });
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("table tbody tr", { timeout: 10_000 });

    // Editar: subir talla 40 de 10 a 15
    await openEditModal(page);
    await page.locator(".admin-size-stock-item").filter({ hasText: "40" }).locator("input").fill("15");
    await page.getByRole("button", { name: /actualizar/i }).click();

    // Esperar toast de éxito y cierre de modal
    await expect(page.getByText("Producto actualizado")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /editar producto/i })).not.toBeVisible({ timeout: 8_000 });

    // Re-abrir modal: la tabla recargó con updatedProduct (segunda GET)
    await openEditModal(page);

    // Detalle: talla 40 muestra 15 y el pill de stock muestra 20
    await expect(
      page.locator(".admin-size-stock-item").filter({ hasText: "40" }).locator("input")
    ).toHaveValue("15", { timeout: 5_000 });
    await expect(page.locator(".admin-stock-pill")).toContainText("20", { timeout: 3_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 5: crear → listar — variante nueva aparece en tabla (crear→listar)
  // ──────────────────────────────────────────────────────────────────────────────
  test("variante creada aparece en tabla con su nombre (crear→listar)", async ({ page }) => {
    const NEW_ID = "e2e-new-variant-1";
    const newProduct = {
      id: NEW_ID,
      nombre: "Zapato Nuevo E2E",
      precio: 90,
      descripcion: "",
      imagen: "https://res.cloudinary.com/dnenqnvbg/image/upload/v1/new.jpg",
      imagenes: ["https://res.cloudinary.com/dnenqnvbg/image/upload/v1/new.jpg"],
      stock: 5,
      categoria: "hombre",
      tipoCalzado: "Zapatillas",
      tallas: ["40"],
      tallaStock: { "40": 5 },
      marca: "Marca Nueva",
      material: null,
      estilo: null,
      color: "Blanco",
      familiaId: NEW_ID,
      destacado: false,
      descuento: null,
    };

    let getCount = 0;
    await page.route("**/rest/v1/productos*", async (route) => {
      if (route.request().method() === "GET") {
        getCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(getCount === 1 ? [] : [newProduct]),
        });
        return;
      }
      await route.fallback();
    });
    await page.route("**/rest/v1/productoCodigos*", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route("**/rest/v1/productoFinanzas*", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route("**/rest/v1/rpc/create_product_variants_atomic*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ids: [NEW_ID] }),
      });
    });

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    // Abrir modal de creación
    await page.getByRole("button", { name: /producto nuevo/i }).click();
    await expect(page.getByRole("heading", { name: /nuevo producto/i })).toBeVisible({ timeout: 5_000 });

    // Campos obligatorios
    // costoCompra=60, márgenes default EMPTY_FORM (25/45/75) → rango [75, 87, 105]
    // precio=90 ∈ [75, 105] ✓
    await page.getByPlaceholder("CV-FOR-001").fill("E2E-NEW-001");
    await page.getByPlaceholder("Zapato formal negro").fill("Zapato Nuevo E2E");
    await page.getByPlaceholder("Calzatura Vilchez").fill("Marca Nueva");
    await categoriaSelect(page).selectOption("hombre");
    await tipoSelect(page).selectOption("Zapatillas");
    await page.locator(".product-core-row input[placeholder='0.00']").fill("90");
    await page.locator(".admin-finance-box input").first().fill("60");

    // Color Blanco vía chip 1
    await page.locator(".variant-chip").first().click();
    await page.locator(".variant-chip-popover .admin-color-popover-item")
      .filter({ hasText: "Blanco" })
      .click();

    // Stock talla 40 = 5 para la variante Blanco
    await page.locator(".variant-tallas-block .admin-size-stock-item")
      .filter({ hasText: "40" })
      .locator("input")
      .first()
      .fill("5");

    // Imagen requerida para la variante (URL directa, sin blur para evitar timeout de validateImageUrlDimensions)
    await page.locator(".admin-variant-carousel-card .input-wrapper input[inputmode='url']")
      .first()
      .fill("https://res.cloudinary.com/dnenqnvbg/image/upload/v1/new.jpg");

    // Guardar
    await page.getByRole("button", { name: /crear producto/i }).click();

    // Listar: el nuevo producto debe aparecer en la tabla
    await expect(page.getByText("Zapato Nuevo E2E")).toBeVisible({ timeout: 10_000 });
  });
});
