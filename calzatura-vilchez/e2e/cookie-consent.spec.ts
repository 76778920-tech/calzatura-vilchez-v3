import { test, expect } from "@playwright/test";

const COOKIE_CONSENT_STORAGE_KEY = "calzatura_cookie_consent";

test.describe("Consentimiento de cookies", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => {
      globalThis.localStorage.removeItem(key);
    }, COOKIE_CONSENT_STORAGE_KEY);
  });

  test("página de política de cookies muestra detalle en texto", async ({ page }) => {
    await page.goto("/legal/politica-cookies");
    await expect(page.getByRole("heading", { name: "Política de cookies" })).toBeVisible();
    await expect(page.getByText(/Detalle por categoría/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Estrictamente necesarias" })).toBeVisible();
    await expect(page.getByText("Elementos incluidos en esta categoría:").first()).toBeVisible();
    await expect(page.locator(".cookie-policy-table")).toHaveCount(0);
  });

  test("abre modal de preferencias desde banner o footer", async ({ page }) => {
    await page.goto("/");
    const banner = page.locator(".cookie-consent-banner");
    if (await banner.isVisible()) {
      await banner.getByRole("button", { name: "Configuración de cookies" }).click();
    } else {
      const footerConfigure = page.locator("footer").getByRole("button", {
        name: "Configuración de cookies",
      });
      await footerConfigure.scrollIntoViewIfNeeded();
      await footerConfigure.click();
    }

    await expect(page.getByRole("heading", { name: "Configuración de cookies" })).toBeVisible();
    await expect(page.getByText("Estrictamente necesarias", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar configuración de cookies" }).click();
    await expect(page.getByRole("heading", { name: "Configuración de cookies" })).toBeHidden();
  });

  test("aceptar todas oculta el banner", async ({ page }) => {
    await page.goto("/");
    const acceptAll = page.getByRole("button", { name: "Aceptar todas" });
    await expect(acceptAll).toBeVisible();
    await acceptAll.click();
    await expect(page.getByRole("dialog", { name: /Tu privacidad en Calzatura Vilchez/i })).toBeHidden();
    await expect(page.locator(".cookie-consent-banner")).toBeHidden();
  });
});
