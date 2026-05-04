import { test, expect } from "@playwright/test";

test.describe("catálogo → detalle → carrito", () => {
  test("desde productos abre ficha, agrega al carrito y aparece en /carrito", async ({ page }) => {
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

    if (await addBtn.isDisabled()) {
      test.skip(true, "El primer producto del listado no tiene stock para agregar al carrito");
    }

    await addBtn.click();

    await page.goto("/carrito");
    await expect(page.getByRole("heading", { name: /Mi Carrito/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".cart-page-item")).toHaveCount(1, { timeout: 10_000 });
  });
});
