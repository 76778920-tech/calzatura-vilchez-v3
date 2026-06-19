/**
 * Matriz de compatibilidad de navegadores — planes-de-prueba.md §4.6
 *
 * | ID             | Navegador              | Proyecto Playwright |
 * |----------------|------------------------|---------------------|
 * | TC-MAN-BRW-001 | Chrome (latest)        | chromium (suite E2E) |
 * | TC-MAN-BRW-002 | Firefox (latest)       | firefox              |
 * | TC-MAN-BRW-003 | Safari / iPhone Safari | webkit · iphone-safari |
 * | TC-MAN-BRW-004 | Edge (latest)          | chromium (motor Blink) |
 *
 * Flujo completo integrador: e2e/idoneidad-journey.spec.ts (TC-IDON-001) en los mismos proyectos.
 */
import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("TC-MAN-BRW — humo tienda pública", () => {
  test("inicio → catálogo → carrito vacío navegable", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1.home-title")).toBeVisible({ timeout: 30_000 });

    await page.goto("/productos");
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });

    await page.goto("/carrito");
    await expect(
      page.getByRole("heading", { name: /carrito/i }).or(page.getByRole("heading", { name: /Mi Carrito/i })),
    ).toBeVisible({ timeout: 15_000 });
  });
});
