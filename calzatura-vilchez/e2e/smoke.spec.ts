import { test, expect } from "@playwright/test";

test.describe("smoke tienda pública", () => {
  test("inicio carga y muestra marca del sitio", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Calzatura/i);
    await expect(page.locator("h1.home-title")).toBeVisible({ timeout: 30_000 });
  });

  test("catálogo responde", async ({ page }) => {
    await page.goto("/productos");
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });
  });

  test("página de carrito accesible", async ({ page }) => {
    await page.goto("/carrito");
    await expect(
      page.getByRole("heading", { name: /carrito/i }).or(page.getByRole("heading", { name: /Mi Carrito/i }))
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("smoke admin (sin sesión)", () => {
  test("panel productos redirige a login si no hay sesión", async ({ page }) => {
    await page.goto("/admin/productos");
    await expect(page).toHaveURL(/\/login/);
  });
});
