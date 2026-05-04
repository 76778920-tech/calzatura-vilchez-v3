/**
 * E2E: ProfilePage — guardar teléfono, validación cliente y errores de red.
 *
 * Cubre:
 * 1. Teléfono válido → PATCH a Supabase → toast "Perfil actualizado"
 * 2. Teléfono de menos de 9 dígitos → error cliente, sin llamada API
 * 3. Teléfono que no empieza con 9 → error cliente, sin llamada API
 * 4. Supabase responde con RLS 42501 → toast legible sin detalles técnicos
 * 5. Servidor no responde (timeout 10 s) → toast "Tiempo agotado"
 */
import { expect, test } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

test.describe("perfil usuario → guardar cambios", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[profile-save] pageerror: ${err.message}`));
    // Inyectar auth antes del goto para que los mocks de red estén listos.
    await injectFakeAdminAuth(page);
    await page.goto("/perfil");
    await page.waitForURL("**/perfil");
    await page.waitForSelector(".profile-form", { timeout: 10_000 });
    // Desactivar la validación HTML5 del form: el patrón del campo tel bloquea
    // el submit nativo antes de que handleSave pueda ejecutarse. La validación
    // semántica real la hace el propio handleSave con peruPhoneError().
    await page.locator(".profile-form").evaluate((el) => {
      (el as HTMLFormElement).noValidate = true;
    });
  });

  // ---------------------------------------------------------------------------
  // Test 1: teléfono válido → éxito
  // ---------------------------------------------------------------------------
  test("guarda teléfono válido y muestra toast de éxito", async ({ page }) => {
    let patchCalled = false;
    await page.route("**/rest/v1/usuarios*", async (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fallback();
    });

    await page.locator("input[type='tel']").fill("912345678");
    await page.locator("button[type='submit']").click();

    await expect(page.getByText("Perfil actualizado")).toBeVisible({ timeout: 8_000 });
    expect(patchCalled).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 2: teléfono < 9 dígitos → error cliente, sin llamada API
  // ---------------------------------------------------------------------------
  test("rechaza teléfono de menos de 9 dígitos sin llamar a la API", async ({ page }) => {
    let patchCalled = false;
    await page.route("**/rest/v1/usuarios*", async (route) => {
      if (route.request().method() === "PATCH") patchCalled = true;
      await route.fallback();
    });

    await page.locator("input[type='tel']").fill("123");
    await page.locator("button[type='submit']").click();

    await expect(page.getByText("El teléfono debe tener 9 dígitos.")).toBeVisible({ timeout: 3_000 });
    expect(patchCalled).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Test 3: teléfono que no empieza con 9 → error cliente, sin llamada API
  // ---------------------------------------------------------------------------
  test("rechaza teléfono que no empieza con 9 sin llamar a la API", async ({ page }) => {
    let patchCalled = false;
    await page.route("**/rest/v1/usuarios*", async (route) => {
      if (route.request().method() === "PATCH") patchCalled = true;
      await route.fallback();
    });

    await page.locator("input[type='tel']").fill("812345678");
    await page.locator("button[type='submit']").click();

    await expect(page.getByText("El teléfono debe empezar con 9.")).toBeVisible({ timeout: 3_000 });
    expect(patchCalled).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Test 4: error RLS de Supabase → toast legible sin mencionar RLS / código SQL
  // ---------------------------------------------------------------------------
  test("muestra error de permisos si Supabase responde con RLS 42501", async ({ page }) => {
    await page.route("**/rest/v1/usuarios*", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            code: "42501",
            message: "new row violates row-level security policy for table \"usuarios\"",
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.locator("input[type='tel']").fill("912345678");
    await page.locator("button[type='submit']").click();

    await expect(
      page.getByText("Sin permisos para realizar esta operación.")
    ).toBeVisible({ timeout: 8_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 5: servidor no responde → timeout de 10 s → toast legible
  // ---------------------------------------------------------------------------
  test("muestra error de timeout si el servidor no responde en 10 s", async ({ page }) => {
    await page.route("**/rest/v1/usuarios*", async (route) => {
      if (route.request().method() === "PATCH") {
        // No llamamos fulfill/fallback/abort → la petición queda colgada.
        // handleSave tiene un Promise.race con timeout de 10 s que dispara primero.
        return;
      }
      await route.fallback();
    });

    await page.locator("input[type='tel']").fill("912345678");
    await page.locator("button[type='submit']").click();

    await expect(
      page.getByText("Tiempo agotado. Inténtalo de nuevo o revisa tu conexión.")
    ).toBeVisible({ timeout: 15_000 });
  });
});
