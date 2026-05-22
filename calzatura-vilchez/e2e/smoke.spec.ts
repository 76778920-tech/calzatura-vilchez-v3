import { test, expect } from "@playwright/test";

test.describe("smoke tienda publica", () => {
  test("inicio carga y muestra marca del sitio", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Calzatura/i);
    await expect(page.locator("h1.home-title")).toBeVisible({ timeout: 30_000 });
  });

  test("hero permite navegar promociones sin role application", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator(".home-hero");
    const carousel = page.locator(".home-hero-carousel");
    await expect(hero).toBeVisible({ timeout: 30_000 });
    await expect(hero.locator('[role="application"]')).toHaveCount(0);
    await expect(carousel).toHaveAttribute("role", "group");
    await expect(carousel).toHaveAttribute("aria-describedby", "home-hero-carousel-keyboard-help");

    const nextButton = page.getByRole("button", { name: /siguiente promocion/i });
    const prevButton = page.getByRole("button", { name: /promocion anterior/i });
    await expect(nextButton).toBeVisible();
    await expect(prevButton).toBeVisible();

    const secondDot = page.getByRole("button", { name: /ver promocion 2/i });
    await secondDot.focus();
    await expect(secondDot).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(secondDot).toHaveAttribute("aria-current", "true");
    await expect(hero.locator('[aria-live="polite"]')).toContainText(/Promocion 2 de/);

    await prevButton.focus();
    await expect(prevButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: /ver promocion 1/i })).toHaveAttribute("aria-current", "true");

    await carousel.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: /ver promocion 2/i })).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("button", { name: /ver promocion 1/i })).toHaveAttribute("aria-current", "true");
  });

  test("catalogo responde", async ({ page }) => {
    await page.goto("/productos");
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });
  });

  test("pagina de carrito accesible", async ({ page }) => {
    await page.goto("/carrito");
    await expect(
      page.getByRole("heading", { name: /carrito/i }).or(page.getByRole("heading", { name: /Mi Carrito/i })),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("carrito lateral vacio enlaza al catalogo", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("calzatura_cart"));

    await page.getByRole("button", { name: /abrir carrito/i }).click();
    await expect(page.getByLabel(/carrito de compras/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: /ver productos/i }).click();
    await expect(page).toHaveURL(/\/productos/);
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("smoke admin (sin sesion)", () => {
  test("panel productos redirige a login si no hay sesion", async ({ page }) => {
    await page.goto("/admin/productos");
    await expect(page).toHaveURL(/\/login/);
  });
});
