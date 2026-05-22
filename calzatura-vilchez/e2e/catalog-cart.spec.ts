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
  test("tarjeta de producto separa links y controles para navegacion por teclado", async ({ page }) => {
    await setupProductMock(page);
    await page.goto("/productos");
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });

    const firstCard = page.locator(".product-card").first();
    await expect(firstCard).toBeVisible({ timeout: 20_000 });

    await expect(firstCard.locator("a button, button a")).toHaveCount(0);
    await expect(firstCard.locator(".product-card-image-link")).toHaveAttribute("href", /\/producto\//);
    await expect(firstCard.locator(".product-card-title-link")).toHaveAttribute("href", /\/producto\//);

    await firstCard.locator(".product-card-title-link").focus();
    await expect(firstCard.locator(".product-card-title-link")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(firstCard.getByRole("button", { name: /favoritos/i })).toBeFocused();

    await page.keyboard.press("Tab");
    const cartButton = firstCard.getByRole("button", { name: /Seleccionar talla/i });
    await expect(cartButton).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(firstCard.getByRole("dialog", { name: /Selecciona tu talla/i })).toBeVisible();
    await expect(firstCard.getByRole("dialog", { name: /Selecciona tu talla/i })).toHaveAttribute("aria-modal", "true");
    await expect(firstCard.getByRole("button", { name: /^40$/ })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(firstCard.getByRole("dialog", { name: /Selecciona tu talla/i })).toBeHidden();
    await expect(cartButton).toBeFocused();
    await expect(page).toHaveURL(/\/productos/);
  });

  test("desde productos abre ficha, agrega al carrito y aparece en /carrito", async ({ page }) => {
    await setupProductMock(page);
    await page.goto("/productos");
    await page.evaluate(() => {
      localStorage.removeItem("calzatura_cart");
      sessionStorage.removeItem("calzatura_cart:guest");
    });
    await page.reload();
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });

    const firstCard = page.locator(".product-card").first();
    await expect(firstCard).toBeVisible({ timeout: 20_000 });
    await firstCard.getByText(MOCK_PRODUCT.nombre).click();

    await expect(page).toHaveURL(/\/producto\/[^/]+$/);
    await expect(page.locator("main.detail-page")).toBeVisible({ timeout: 20_000 });

    const firstTalla = page.locator(".talla-btn").first();
    if (await firstTalla.isVisible().catch(() => false)) {
      await firstTalla.click();
    }

    const addBtn = page.getByRole("button", { name: /Agregar al Carrito/i });
    await expect(addBtn).toBeVisible({ timeout: 15_000 });

    // El mock y la talla deben dejar el botón habilitado; si no, fallamos con mensaje claro (no test.skip: Sonar).
    const addDisabled = await addBtn.isDisabled();
    expect(
      addDisabled,
      "El mock E2E debe permitir agregar al carrito (talla visible/seleccionada y stock). Si el botón sigue deshabilitado, revisar selectores o MOCK_PRODUCT."
    ).toBe(false);

    await addBtn.click();

    // Esperar a que el CartContext persista el ítem en sessionStorage antes de
    // la recarga completa de página que provoca page.goto(). Sin esta espera
    // existe una condición de carrera: el useEffect que hace
    // sessionStorage.setItem puede no haberse ejecutado aún y la nueva página
    // lee el carrito vacío.
    await page.waitForFunction(
      (key: string) => {
        const stored = sessionStorage.getItem(key);
        if (!stored) return false;
        try {
          return (JSON.parse(stored) as unknown[]).length > 0;
        } catch {
          return false;
        }
      },
      "calzatura_cart:guest",
      { timeout: 5_000 }
    );

    await page.goto("/carrito");
    await expect(page.getByRole("heading", { name: /Mi Carrito/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".cart-page-item")).toHaveCount(1, { timeout: 10_000 });
  });
});
