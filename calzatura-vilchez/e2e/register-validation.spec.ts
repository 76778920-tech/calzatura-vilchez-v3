/**
 * E2E RF-AUT-01 — registro con validación de identidad y política de contraseña.
 * TC-AUT-REG-001 / TC-AUT-REG-002
 */
import { expect, test, type Page } from "@playwright/test";

async function mockDniLookup(page: Page) {
  await page.route((url) => /\/lookup-dni\/?$/i.test(url.pathname), async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = JSON.parse(route.request().postData() ?? "{}") as { dni?: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dni: body.dni ?? "87654321",
        nombres: "JUAN",
        apellidos: "PEREZ",
        lookupToken: "e2e-lookup-token",
      }),
    });
  });
}

test.describe("registro → validación RF-AUT-01", () => {
  test.beforeEach(async ({ page }) => {
    await mockDniLookup(page);
    await page.goto("/registro");
    await expect(page.getByRole("heading", { name: /Crear Cuenta/i })).toBeVisible({ timeout: 15_000 });
    await page.locator("form.auth-form").evaluate((el) => {
      (el as HTMLFormElement).noValidate = true;
    });
  });

  test("TC-AUT-REG-001: DNI inválido muestra error sin llamar a Firebase", async ({ page }) => {
    let identityCalled = false;
    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      identityCalled = true;
      await route.fallback();
    });

    await page.locator("#register-dni").fill("1234");
    await page.locator(".register-terms-checkbox").check();
    await page.locator("button[type='submit']").click();

    await expect(page.locator("#register-dni-error")).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("#register-dni-error")).toContainText(/8 dígitos/i);
    expect(identityCalled).toBe(false);
  });

  test("TC-AUT-REG-002: contraseña corta bloqueada tras validar DNI", async ({ page }) => {
    let identityCalled = false;
    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      identityCalled = true;
      await route.fallback();
    });

    await page.locator("#register-dni").fill("87654321");
    await page.getByRole("button", { name: /Buscar datos por DNI/i }).click();
    await expect(page.locator("#register-nombres")).toHaveValue("JUAN", { timeout: 8_000 });

    await page.locator("#register-email").fill("nuevo@test.com");
    await page.locator("#register-celular").fill("912345678");
    await page.locator("#register-password").fill("Ab1");
    await page.locator("#register-confirm-password").fill("Ab1");
    await page.locator(".register-terms-checkbox").check();
    await page.locator("button[type='submit']").click();

    await expect(page.locator("#register-password-error")).toBeVisible({ timeout: 8_000 });
    expect(identityCalled).toBe(false);
  });
});
