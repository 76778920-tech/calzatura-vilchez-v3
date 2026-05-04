import type { Page } from "@playwright/test";

export function getAdminE2ECreds() {
  const email = process.env.E2E_ADMIN_EMAIL?.trim();
  const password = process.env.E2E_ADMIN_PASSWORD?.trim();
  return { email, password };
}

export type AdminSessionResult =
  | { ok: true }
  | { ok: false; reason: string };

async function hasAdminProductsAccess(page: Page): Promise<boolean> {
  const checks = await Promise.all([
    page.getByRole("button", { name: /producto nuevo/i }).isVisible().catch(() => false),
    page.locator(".admin-layout").isVisible().catch(() => false),
    page.getByRole("heading", { name: /^productos$/i }).isVisible().catch(() => false),
  ]);
  return checks.some(Boolean);
}

async function isLoginScreenVisible(page: Page): Promise<boolean> {
  const emailInput = page.locator('form.auth-form input[type="email"]');
  const passwordInput = page.locator('form.auth-form input[type="password"], form.auth-form input[placeholder*="••••"]');
  const submitButton = page.getByRole("button", { name: /iniciar sesión/i });
  const [hasEmail, hasPassword, hasSubmit] = await Promise.all([
    emailInput.isVisible().catch(() => false),
    passwordInput.first().isVisible().catch(() => false),
    submitButton.isVisible().catch(() => false),
  ]);
  return hasEmail && hasPassword && hasSubmit;
}

/**
 * Asegura sesión admin para pruebas E2E.
 * Devuelve false si no se pudo iniciar sesión o faltan credenciales.
 */
export async function ensureAdminSession(page: Page): Promise<boolean> {
  const result = await ensureAdminSessionDetailed(page);
  return result.ok;
}

export async function ensureAdminSessionDetailed(page: Page): Promise<AdminSessionResult> {
  await page.goto("/admin/productos");
  await page.waitForTimeout(1200);
  if (await hasAdminProductsAccess(page)) return { ok: true };
  if (!(await isLoginScreenVisible(page))) {
    // Reintento corto por si el guard aún está resolviendo sesión.
    await page.goto("/admin/productos");
    await page.waitForTimeout(1500);
    if (await hasAdminProductsAccess(page)) return { ok: true };
  }

  const { email, password } = getAdminE2ECreds();
  if (!email || !password) {
    const missing = [
      !email ? "E2E_ADMIN_EMAIL" : null,
      !password ? "E2E_ADMIN_PASSWORD" : null,
    ].filter(Boolean).join(", ");
    return { ok: false, reason: `Faltan variables: ${missing}` };
  }

  const emailInput = page
    .locator('input[type="email"], input[autocomplete="email"], input[placeholder*="correo" i]')
    .first();
  const passwordInput = page
    .locator('input[type="password"], input[placeholder*="••••"], input[placeholder*="contraseña" i]')
    .first();

  await emailInput.waitFor({ state: "visible", timeout: 10_000 });
  await passwordInput.waitFor({ state: "visible", timeout: 10_000 });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await page.waitForTimeout(1500);

  const isVerifyEmailScreen = await page
    .locator("main.verify-email-page, .verify-email-card")
    .first()
    .isVisible()
    .catch(() => false);
  if (isVerifyEmailScreen || page.url().includes("/verificar-correo")) {
    return { ok: false, reason: "Inicio correcto, pero el correo no está verificado para acceso no-superadmin." };
  }

  // En algunos entornos la sesión tarda en hidratarse tras el submit.
  const loginStillVisible = await isLoginScreenVisible(page);
  if (loginStillVisible) {
    await page.waitForTimeout(2000);
  }

  // Revalidar acceso admin luego de login.
  await page.goto("/admin/productos");
  await page.waitForTimeout(2000);
  if (await hasAdminProductsAccess(page)) return { ok: true };
  if (await isLoginScreenVisible(page)) {
    return { ok: false, reason: "No se pudo iniciar sesión (credenciales inválidas o correo no verificado)." };
  }
  return { ok: false, reason: "Sesión iniciada, pero la cuenta no tiene rol admin para /admin/productos." };
}
