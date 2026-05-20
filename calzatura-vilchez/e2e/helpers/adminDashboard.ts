import { expect, type Page } from "@playwright/test";

/** Título del dashboard en `AdminLayout` (topbar). */
export const ADMIN_DASHBOARD_HEADING = /^Dashboard ejecutivo$/;

/** Comprueba que /admin cargó (topbar + contenido del dashboard). */
export async function expectAdminDashboardLoaded(page: Page, timeout = 15_000) {
  await expect(page.locator(".admin-topbar h1")).toHaveText(ADMIN_DASHBOARD_HEADING, { timeout });
  await expect(page.locator(".dash-root")).toBeVisible({ timeout });
}
