import { test, expect } from "@playwright/test";

test.describe("landings de campaña", () => {
  test("Cyber Wow carga contenido principal", async ({ page }) => {
    await page.goto("/cyber-2026");
    await expect(page.locator("main.info-page.info-page--beneficios")).toBeVisible({ timeout: 20_000 });
  });

  test("Club Calzado carga contenido principal", async ({ page }) => {
    await page.goto("/club-vilchez-calzado");
    await expect(page.locator("main.info-page")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("estanterías de catálogo", () => {
  test("outlet carga listado", async ({ page }) => {
    await page.goto("/outlet");
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });
  });

  test("nueva temporada carga listado", async ({ page }) => {
    await page.goto("/nueva-temporada");
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });
  });
});
