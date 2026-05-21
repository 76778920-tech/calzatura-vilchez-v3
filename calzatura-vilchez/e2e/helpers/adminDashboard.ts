import { expect, type Page } from "@playwright/test";

/** Título del dashboard en `AdminLayout` (topbar). */
export const ADMIN_DASHBOARD_HEADING = /^Dashboard ejecutivo$/;

/** Panel admin montado (sidebar + topbar); espera a que AuthContext termine. */
export async function waitForAdminShell(page: Page, timeout = 20_000) {
  await page.locator("nav[aria-label='Módulos del panel']").waitFor({ state: "visible", timeout });
}

/** Comprueba que /admin cargó (topbar + contenido del dashboard). */
export async function expectAdminDashboardLoaded(page: Page, timeout = 15_000) {
  await waitForAdminShell(page, timeout);
  await expect(page.locator(".admin-topbar h1")).toHaveText(ADMIN_DASHBOARD_HEADING, { timeout });
  await expect(page.locator(".dash-root")).toBeVisible({ timeout });
}
