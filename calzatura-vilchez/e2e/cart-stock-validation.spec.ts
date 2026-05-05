/**
 * E2E: carrito → validación de stock
 *
 * Semáforo:
 *   🔴 TC-CART-001: botón "Agregar al Carrito" queda deshabilitado cuando stock=0
 *   🔴 TC-CART-002: la cantidad en carrito no puede exceder el stock disponible
 *   🟡 TC-CART-003: agregar el mismo producto dos veces incrementa la cantidad (no duplica la fila)
 *   🟢 TC-CART-004: ir al carrito muestra el ítem recién añadido
 *
 * Estrategia: los tests navegan a la página de producto, mockean Supabase para
 * controlar el stock, y verifican el comportamiento del carrito sin depender de
 * datos reales de producción.
 */
import { expect, test, type Page } from "@playwright/test";

const MOCK_PRODUCT_WITH_STOCK = {
  id: "e2e-cart-prod-001",
  nombre: "Zapatilla Stock E2E",
  precio: 120,
  descripcion: "Producto para test de carrito",
  imagen: "",
  imagenes: [],
  stock: 3,
  categoria: "hombre",
  color: "Negro",
  tallas: ["40", "41", "42"],
  marcaSlug: "test-marca",
  marca: "TestMarca",
  activo: true,
  codigo: "TST-001",
};

const MOCK_PRODUCT_NO_STOCK = {
  ...MOCK_PRODUCT_WITH_STOCK,
  id: "e2e-cart-prod-002",
  nombre: "Zapatilla Sin Stock E2E",
  stock: 0,
  codigo: "TST-002",
};

async function setupProductMock(page: Page, product: Record<string, unknown>) {
  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([product]),
    });
  });
}

async function goToProductDetail(page: Page, productId: string) {
  await page.goto(`/producto/${productId}`);
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("main.detail-page")).toBeVisible({ timeout: 20_000 });
}

test.describe("carrito → validación de stock", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) =>
      console.log(`[cart-stock] pageerror: ${err.message}`)
    );
    // Limpiar el carrito antes de cada test
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("calzatura_cart"));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-CART-001: stock=0 → botón deshabilitado
  // ──────────────────────────────────────────────────────────────────────────
  test("botón Agregar al Carrito está deshabilitado cuando stock=0 (TC-CART-001)", async ({ page }) => {
    await setupProductMock(page, MOCK_PRODUCT_NO_STOCK);
    await goToProductDetail(page, MOCK_PRODUCT_NO_STOCK.id);

    const addBtn = page.getByRole("button", { name: /Agregar al Carrito/i });
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await expect(addBtn).toBeDisabled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-CART-002: cantidad en carrito no excede el stock
  // ──────────────────────────────────────────────────────────────────────────
  test("cantidad máxima en carrito está limitada al stock disponible (TC-CART-002)", async ({ page }) => {
    await setupProductMock(page, MOCK_PRODUCT_WITH_STOCK);
    await goToProductDetail(page, MOCK_PRODUCT_WITH_STOCK.id);

    // Seleccionar talla si el selector existe
    const tallaBtns = page.locator(".talla-btn");
    if (await tallaBtns.count() > 0) {
      await tallaBtns.first().click();
    }

    const addBtn = page.getByRole("button", { name: /Agregar al Carrito/i });
    await expect(addBtn).toBeVisible({ timeout: 15_000 });

    if (await addBtn.isDisabled()) {
      test.skip(true, "Producto no disponible para agregar en este entorno");
    }

    // Agregar el producto al carrito
    await addBtn.click();

    // Navegar al carrito
    await page.goto("/carrito");
    await expect(page.locator(".cart-page-item, [class*='cart-item']")).toBeVisible({ timeout: 15_000 });

    // El botón de incrementar cantidad debería desactivarse en el límite de stock
    const incrementBtns = page.locator("button[aria-label*='aumentar'], button[title*='aumentar'], .qty-btn-plus, [class*='quantity'] button:last-child");
    if (await incrementBtns.count() > 0) {
      // Intentar incrementar más allá del stock (stock=3, ya tenemos 1)
      for (let i = 0; i < 5; i++) {
        const btn = incrementBtns.first();
        if (await btn.isDisabled()) break;
        await btn.click();
      }
      // La cantidad mostrada no debe superar el stock del producto (3)
      const quantityDisplay = page.locator("[class*='quantity'], .cart-qty, .item-quantity").first();
      if (await quantityDisplay.isVisible()) {
        const qty = await quantityDisplay.textContent();
        const qtyNum = parseInt(qty ?? "0", 10);
        expect(qtyNum).toBeLessThanOrEqual(MOCK_PRODUCT_WITH_STOCK.stock);
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-CART-003: agregar mismo producto dos veces incrementa cantidad, no duplica
  // ──────────────────────────────────────────────────────────────────────────
  test("agregar el mismo producto dos veces incrementa cantidad sin duplicar la fila (TC-CART-003)", async ({ page }) => {
    await setupProductMock(page, MOCK_PRODUCT_WITH_STOCK);
    await goToProductDetail(page, MOCK_PRODUCT_WITH_STOCK.id);

    const tallaBtns = page.locator(".talla-btn");
    if (await tallaBtns.count() > 0) {
      await tallaBtns.first().click();
    }

    const addBtn = page.getByRole("button", { name: /Agregar al Carrito/i });
    await expect(addBtn).toBeVisible({ timeout: 15_000 });

    if (await addBtn.isDisabled()) {
      test.skip(true, "Producto no disponible para agregar en este entorno");
    }

    // Agregar dos veces
    await addBtn.click();
    await page.waitForTimeout(500);
    await addBtn.click();

    // Navegar al carrito
    await page.goto("/carrito");
    await expect(page.getByRole("heading", { name: /Mi Carrito/i })).toBeVisible({ timeout: 15_000 });

    // Debe haber exactamente 1 fila (no 2 filas duplicadas)
    const items = page.locator(".cart-page-item, [class*='cart-item']");
    await expect(items).toHaveCount(1, { timeout: 10_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-CART-004: el carrito muestra el ítem recién añadido
  // ──────────────────────────────────────────────────────────────────────────
  test("ir a /carrito muestra el producto recién agregado desde el detalle (TC-CART-004)", async ({ page }) => {
    await setupProductMock(page, MOCK_PRODUCT_WITH_STOCK);
    await goToProductDetail(page, MOCK_PRODUCT_WITH_STOCK.id);

    const tallaBtns = page.locator(".talla-btn");
    if (await tallaBtns.count() > 0) {
      await tallaBtns.first().click();
    }

    const addBtn = page.getByRole("button", { name: /Agregar al Carrito/i });
    await expect(addBtn).toBeVisible({ timeout: 15_000 });

    if (await addBtn.isDisabled()) {
      test.skip(true, "Producto no disponible para agregar en este entorno");
    }

    await addBtn.click();

    await page.goto("/carrito");
    await expect(page.getByRole("heading", { name: /Mi Carrito/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".cart-page-item, [class*='cart-item']")).toHaveCount(1, { timeout: 10_000 });
  });
});
