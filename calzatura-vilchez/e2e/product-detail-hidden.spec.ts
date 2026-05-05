import { test, expect } from "@playwright/test";

/**
 * Simula un producto que existe en catálogo interno pero no es visible en tienda:
 * la API pública consulta `id` + `activo=eq.true`; si la respuesta es vacía, la ficha debe mostrar "no encontrado".
 */
const E2E_HIDDEN_PRODUCT_ID = "eecfc5c0-e2e5-4000-a000-000000000001";

test.describe("ficha producto no visible (tienda pública)", () => {
  test("muestra no encontrado cuando la API no devuelve fila activa", async ({ page }) => {
    await page.route(/\/rest\/v1\/productos(\?|$)/, async (route) => {
      const url = new URL(route.request().url());
      const idParam = url.searchParams.get("id");
      const activoParam = url.searchParams.get("activo");
      const isHiddenDetailQuery =
        idParam === `eq.${E2E_HIDDEN_PRODUCT_ID}` && activoParam === "eq.true";

      if (isHiddenDetailQuery) {
        await route.fulfill({
          status: 200,
          contentType: "application/json; charset=utf-8",
          body: "[]",
        });
        return;
      }

      await route.continue();
    });

    await page.goto(`/producto/${E2E_HIDDEN_PRODUCT_ID}`);

    await expect(page.getByText("Producto no encontrado.", { exact: true })).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByRole("link", { name: /Ver todos los productos/i })).toBeVisible();
  });
});
