import { test, expect } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

const COLORS = ["Negro", "Blanco", "Camel", "Gris", "Rojo"];
const VARIANT_CARDS = ".admin-variant-carousel-card";

test.describe("admin → nuevo producto: chips de 5 colores", () => {
  test.beforeEach(async ({ page }) => {
    await injectFakeAdminAuth(page);
    await page.goto("/admin/productos");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: /producto nuevo/i }).waitFor({ state: "visible", timeout: 15_000 });
    await page.getByRole("button", { name: /producto nuevo/i }).click();
    await expect(page.locator(".product-modal--create")).toBeVisible({ timeout: 10_000 });
  });

  test("solo Color 1 está habilitado al abrir el modal", async ({ page }) => {
    const chips = page.locator(".variant-chip");
    await expect(chips).toHaveCount(5);
    await expect(chips.nth(0)).not.toBeDisabled();
    for (let i = 1; i < 5; i++) {
      await expect(chips.nth(i)).toBeDisabled();
    }
  });

  test("activación en cadena: cada color habilita el siguiente, los demás quedan bloqueados", async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      const chip = page.locator(".variant-chip").nth(i);
      await expect(chip).not.toBeDisabled();

      // Chips posteriores aún deben estar bloqueados
      for (let j = i + 1; j < 5; j++) {
        await expect(page.locator(".variant-chip").nth(j)).toBeDisabled();
      }

      // Seleccionar color i
      await chip.click();
      await page.locator(".admin-color-popover-item").filter({ hasText: COLORS[i] }).first().click();
      await expect(chip).toHaveClass(/variant-chip--active/);
    }

    // Al final los 5 chips deben estar activos
    for (let i = 0; i < 5; i++) {
      await expect(page.locator(".variant-chip").nth(i)).toHaveClass(/variant-chip--active/);
    }
  });

  test("el panel izquierdo acumula un bloque por cada color activo hasta llegar a 5", async ({ page }) => {
    await expect(page.locator(VARIANT_CARDS)).toHaveCount(0);

    for (let i = 0; i < 5; i++) {
      await page.locator(".variant-chip").nth(i).click();
      await page.locator(".admin-color-popover-item").filter({ hasText: COLORS[i] }).first().click();
      await expect(page.locator(VARIANT_CARDS)).toHaveCount(i + 1);
    }
  });

  test("al elegir Color 2 hace auto-scroll al bloque nuevo", async ({ page }) => {
    await page.evaluate(() => {
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function patchedScrollIntoView(this: Element, arg?: boolean | ScrollIntoViewOptions) {
        globalThis.sessionStorage.setItem(
          "lastScrolledVariantSlot",
          this.getAttribute("data-variant-slot-index") ?? "",
        );
        original.call(this, arg);
      };
    });

    await page.locator(".variant-chip").nth(0).click();
    await page.locator(".admin-color-popover-item").filter({ hasText: COLORS[0] }).first().click();
    await page.locator(".variant-chip").nth(1).click();
    await page.locator(".admin-color-popover-item").filter({ hasText: COLORS[1] }).first().click();

    await expect(page.locator(VARIANT_CARDS)).toHaveCount(2);
    await expect.poll(async () => page.evaluate(() => sessionStorage.getItem("lastScrolledVariantSlot")))
      .toBe("1");
  });

  test("quitar Color 3 limpia ese bloque y los siguientes, manteniendo Color 1 y 2", async ({ page }) => {
    // Activar los 5
    for (let i = 0; i < 5; i++) {
      await page.locator(".variant-chip").nth(i).click();
      await page.locator(".admin-color-popover-item").filter({ hasText: COLORS[i] }).first().click();
    }
    await expect(page.locator(VARIANT_CARDS)).toHaveCount(5);

    // Quitar Color 3 (tercer bloque del panel, índice 2)
    await page.locator(".admin-variant-block-clear").nth(2).click();

    // Solo quedan Color 1 y Color 2
    await expect(page.locator(VARIANT_CARDS)).toHaveCount(2);

    // Color 1 y 2 siguen activos
    await expect(page.locator(".variant-chip").nth(0)).toHaveClass(/variant-chip--active/);
    await expect(page.locator(".variant-chip").nth(1)).toHaveClass(/variant-chip--active/);

    // Color 3 queda disponible pero sin seleccionar
    await expect(page.locator(".variant-chip").nth(2)).not.toBeDisabled();
    await expect(page.locator(".variant-chip").nth(2)).not.toHaveClass(/variant-chip--active/);

    // Color 4 y 5 vuelven a estar bloqueados
    await expect(page.locator(".variant-chip").nth(3)).toBeDisabled();
    await expect(page.locator(".variant-chip").nth(4)).toBeDisabled();
  });
});
