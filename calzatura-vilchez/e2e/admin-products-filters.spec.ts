/**
 * E2E: filtros de AdminProducts + accesibilidad del modal (Escape, foco).
 *
 * Cubre:
 * 1. Filtro por categoría reduce la lista a los productos que coinciden.
 * 2. Filtro stock "sin-stock" muestra solo productos con stock=0.
 * 3. Búsqueda por texto filtra por nombre/marca.
 * 4. Combinación búsqueda + categoría aplica ambos filtros.
 * 5. Tecla Escape cierra el modal (accesibilidad WCAG 2.1 — 2.1.2).
 * 6. Al cerrar el modal el foco vuelve al botón que lo abrió.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Datos semilla ────────────────────────────────────────────────────────────

const makeProduct = (id: string, overrides: Record<string, unknown>) => ({
  id,
  nombre: `Producto ${id}`,
  precio: 100,
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
  familiaId: id,
  destacado: false,
  descuento: null,
  campana: null,
  ...overrides,
});

const PRODUCT_HOMBRE = makeProduct("p-hombre-1", { nombre: "Zapatilla Hombre", categoria: "hombre", stock: 8 });
const PRODUCT_DAMA   = makeProduct("p-dama-1",   { nombre: "Sandalia Dama",    categoria: "dama",   stock: 0 });
const PRODUCT_BEBE   = makeProduct("p-bebe-1",   { nombre: "Sandalia Bebe",    categoria: "bebe",   stock: 3 });

// ─── Setup ────────────────────────────────────────────────────────────────────

async function setupMocks(page: Page, products: ReturnType<typeof makeProduct>[]) {
  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(products) });
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

// ─── Selectores de filtro ─────────────────────────────────────────────────────

const searchInput   = (page: Page) => page.getByPlaceholder(/buscar por código/i);
const categorySelect = (page: Page) => page.locator(".admin-filter-grid select").nth(0);
const stockSelect    = (page: Page) => page.locator(".admin-filter-grid select").nth(1);

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin productos → filtros y accesibilidad del modal", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[products-filters] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
    await page.goto("/admin/productos");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: /producto nuevo/i }).waitFor({ state: "visible", timeout: 15_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 1: filtro por categoría
  // ──────────────────────────────────────────────────────────────────────────────
  test("filtro por categoría muestra solo los productos de esa categoría", async ({ page }) => {
    await setupMocks(page, [PRODUCT_HOMBRE, PRODUCT_DAMA, PRODUCT_BEBE]);

    // Sin filtro: 3 filas visibles
    await expect(page.locator("table tbody tr")).toHaveCount(3);

    // Filtrar por "hombre"
    await categorySelect(page).selectOption("hombre");

    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Zapatilla Hombre");
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 2: filtro "sin-stock"
  // ──────────────────────────────────────────────────────────────────────────────
  test("filtro sin-stock muestra solo productos con stock 0", async ({ page }) => {
    await setupMocks(page, [PRODUCT_HOMBRE, PRODUCT_DAMA]);

    await stockSelect(page).selectOption("sin-stock");

    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Sandalia Dama");
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 3: búsqueda por texto (nombre)
  // ──────────────────────────────────────────────────────────────────────────────
  test("búsqueda por texto filtra por nombre del producto", async ({ page }) => {
    await setupMocks(page, [PRODUCT_HOMBRE, PRODUCT_DAMA, PRODUCT_BEBE]);

    await searchInput(page).fill("Sandalia");

    // "Sandalia Dama" y "Sandalia Bebe" coinciden; "Zapatilla Hombre" no
    await expect(page.locator("table tbody tr")).toHaveCount(2);
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 4: búsqueda + categoría combinadas
  // ──────────────────────────────────────────────────────────────────────────────
  test("búsqueda y categoría combinadas reducen la lista al único resultado", async ({ page }) => {
    await setupMocks(page, [PRODUCT_HOMBRE, PRODUCT_DAMA, PRODUCT_BEBE]);

    await searchInput(page).fill("Sandalia");
    await categorySelect(page).selectOption("dama");

    // Solo "Sandalia Dama" pasa ambos filtros
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("Sandalia Dama");
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 5: Escape cierra el modal (WCAG 2.1 — 2.1.2)
  // ──────────────────────────────────────────────────────────────────────────────
  test("tecla Escape cierra el modal de producto", async ({ page }) => {
    await setupMocks(page, [PRODUCT_HOMBRE]);

    // Abrir modal de creación
    await page.getByRole("button", { name: /producto nuevo/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 8_000 });

    // Presionar Escape dentro del modal
    await page.getByRole("dialog").press("Escape");

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 6: el foco regresa al botón que abrió el modal al cerrarlo (Escape)
  // ──────────────────────────────────────────────────────────────────────────────
  test("al cerrar con Escape el foco regresa al botón 'Producto nuevo'", async ({ page }) => {
    await setupMocks(page, [PRODUCT_HOMBRE]);

    const openBtn = page.getByRole("button", { name: /producto nuevo/i });
    await openBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 8_000 });

    await page.getByRole("dialog").press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });

    // El foco debe estar en el botón de apertura
    await expect(openBtn).toBeFocused({ timeout: 3_000 });
  });
});
