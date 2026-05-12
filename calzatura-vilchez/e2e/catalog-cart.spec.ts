import { test, expect, type Page } from "@playwright/test";

const MOCK_PRODUCT = {
  id: "e2e-catalog-cart-001",
  nombre: "Zapatilla Catalog Cart E2E",
  precio: 129,
  descripcion: "Producto controlado para prueba de catalogo a carrito",
  imagen: "",
  imagenes: [],
  stock: 4,
  categoria: "hombre",
  color: "Negro",
  tallas: ["40", "41"],
  marcaSlug: "test-marca",
  marca: "TestMarca",
  activo: true,
  codigo: "CAT-CART-001",
};

async function setupProductMock(page: Page) {
  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([MOCK_PRODUCT]),
    });
  });
}

test.describe("catálogo → detalle → carrito", () => {
  test("desde productos abre ficha, agrega al carrito y aparece en /carrito", async ({ page }) => {
    await setupProductMock(page);
    await page.goto("/productos");
    await page.evaluate(() => localStorage.removeItem("calzatura_cart"));
    await page.reload();
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });

    const firstCard = page.locator("a.product-card").first();
    await expect(firstCard).toBeVisible({ timeout: 20_000 });
    await firstCard.click();

    await expect(page).toHaveURL(/\/producto\/[^/]+$/);
    await expect(page.locator("main.detail-page")).toBeVisible({ timeout: 20_000 });

    const firstTalla = page.locator(".talla-btn").first();
    if (await firstTalla.isVisible().catch(() => false)) {
      await firstTalla.click();
    }

    const addBtn = page.getByRole("button", { name: /Agregar al Carrito/i });
    await expect(addBtn).toBeVisible({ timeout: 15_000 });

    test.skip(
      await addBtn.isDisabled(),
      "El primer producto del listado no tiene stock/talla seleccionable para agregar al carrito."
    );

    await addBtn.click();

    // Esperar a que el CartContext persista el ítem en localStorage antes de
    // la recarga completa de página que provoca page.goto(). Sin esta espera
    // existe una condición de carrera: el useEffect que hace
    // localStorage.setItem puede no haberse ejecutado aún y la nueva página
    // lee el carrito vacío.
    await page.waitForFunction(
      (key: string) => {
        const stored = localStorage.getItem(key);
        if (!stored) return false;
        try {
          return (JSON.parse(stored) as unknown[]).length > 0;
        } catch {
          return false;
        }
      },
      "calzatura_cart",
      { timeout: 5_000 }
    );

    await page.goto("/carrito");
    await expect(page.getByRole("heading", { name: /Mi Carrito/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".cart-page-item")).toHaveCount(1, { timeout: 10_000 });
  });
});
