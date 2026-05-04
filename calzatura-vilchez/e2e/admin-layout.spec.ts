/**
 * E2E: AdminLayout — sidebar, navegación activa, tema y acciones globales.
 *
 * Cubre:
 * 1. El enlace activo recibe aria-current="page" cuando la URL coincide.
 * 2. Al navegar a otra sección el enlace activo cambia.
 * 3. El toggle de tema cambia el aria-label del botón.
 * 4. "Ver tienda" navega a la raíz pública (/).
 * 5. "Cerrar sesión" muestra el toast de confirmación.
 * 6. Colapsar: clase `collapsed` + `aria-expanded="false"`.
 * 7. Preferencia colapsada persiste tras recargar (sin `addInitScript` en reload).
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mockea todos los endpoints de datos para que el panel cargue sin errores. */
async function setupDataMocks(page: Page) {
  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/productoCodigos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/ventasDiarias*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/pedidos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/auditoria*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
}

async function goToAdmin(page: Page) {
  await page.goto("/admin");
  await page.waitForLoadState("domcontentloaded");
  await page.locator("nav[aria-label='Módulos del panel']").waitFor({ state: "visible", timeout: 15_000 });
}

function sidebarNav(page: Page) {
  return page.locator("nav[aria-label='Módulos del panel']");
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin layout → sidebar y acciones globales", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-layout] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
    await setupDataMocks(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-LAYOUT-001: enlace activo tiene aria-current="page" en /admin
  // ──────────────────────────────────────────────────────────────────────────
  test("enlace Dashboard tiene aria-current=page cuando la URL es /admin (TC-LAYOUT-001)", async ({ page }) => {
    await goToAdmin(page);

    const nav = sidebarNav(page);
    // React Router NavLink añade aria-current="page" automáticamente cuando isActive
    await expect(nav.getByRole("link", { name: /^dashboard$/i })).toHaveAttribute("aria-current", "page");

    // En el sidebar, Productos no está activo (el dashboard duplica enlaces fuera del nav)
    await expect(nav.getByRole("link", { name: /^productos$/i })).not.toHaveAttribute("aria-current");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-LAYOUT-002: enlace activo cambia al navegar a otra sección
  // ──────────────────────────────────────────────────────────────────────────
  test("al navegar a /admin/ventas el enlace Ventas recibe aria-current=page (TC-LAYOUT-002)", async ({ page }) => {
    await goToAdmin(page);

    const nav = sidebarNav(page);
    await nav.getByRole("link", { name: /^ventas$/i }).click();
    await page.waitForURL("**/admin/ventas");

    await expect(nav.getByRole("link", { name: /^ventas$/i })).toHaveAttribute("aria-current", "page");

    await expect(nav.getByRole("link", { name: /^dashboard$/i })).not.toHaveAttribute("aria-current");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-LAYOUT-003: toggle de tema cambia el aria-label del botón
  // ──────────────────────────────────────────────────────────────────────────
  test("toggle de tema cambia el aria-label al alternar (TC-LAYOUT-003)", async ({ page }) => {
    await goToAdmin(page);

    const toggleBtn = page.locator(".admin-theme-toggle");
    const labelBefore = await toggleBtn.getAttribute("aria-label");
    expect(labelBefore).toMatch(/modo claro|modo oscuro/i);

    await toggleBtn.click();

    const labelAfter = await toggleBtn.getAttribute("aria-label");
    // Después del clic el label debe ser el contrario
    expect(labelAfter).not.toBe(labelBefore);
    expect(labelAfter).toMatch(/modo claro|modo oscuro/i);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-LAYOUT-004: "Ver tienda" navega a la raíz pública
  // ──────────────────────────────────────────────────────────────────────────
  test("botón 'Ver tienda' navega a / (TC-LAYOUT-004)", async ({ page }) => {
    await goToAdmin(page);

    await page.getByRole("button", { name: /ver tienda/i }).click();
    await page.waitForURL("/");

    await expect(page).toHaveURL("/");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-LAYOUT-005: "Cerrar sesión" muestra toast de confirmación
  // ──────────────────────────────────────────────────────────────────────────
  test("botón 'Cerrar sesión' muestra toast 'Sesión cerrada' (TC-LAYOUT-005)", async ({ page }) => {
    await goToAdmin(page);

    await page.getByRole("button", { name: /cerrar sesión/i }).click();

    await expect(page.getByText(/sesión cerrada/i)).toBeVisible({ timeout: 8_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-LAYOUT-006: colapsar sidebar añade clase y cambia aria-expanded
  // ──────────────────────────────────────────────────────────────────────────
  test("colapsar sidebar añade clase 'collapsed' y aria-expanded pasa a false (TC-LAYOUT-006)", async ({ page }) => {
    // Partir siempre de sidebar expandido
    await page.addInitScript(() => localStorage.setItem("adminSidebarCollapsed", "false"));
    await goToAdmin(page);

    const sidebar = page.locator("#admin-sidebar");
    const toggleBtn = page.getByRole("button", { name: /colapsar menú/i });

    await expect(sidebar).not.toHaveClass(/collapsed/);
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    await toggleBtn.click();

    await expect(sidebar).toHaveClass(/collapsed/);
    // Tras colapsar, aria-expanded = false y el label cambia a "Expandir menú"
    await expect(page.getByRole("button", { name: /expandir menú/i })).toHaveAttribute("aria-expanded", "false");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-LAYOUT-007: estado colapsado persiste tras recargar la página
  // ──────────────────────────────────────────────────────────────────────────
  test("estado colapsado persiste en localStorage tras recargar (TC-LAYOUT-007)", async ({ page }) => {
    await goToAdmin(page);
    // No usar addInitScript aquí: Playwright lo ejecuta en *cada* carga (incl. reload) y
    // sobrescribiría adminSidebarCollapsed tras colapsar. Forzar expandido una sola vez:
    await page.evaluate(() => localStorage.setItem("adminSidebarCollapsed", "false"));
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.locator("nav[aria-label='Módulos del panel']").waitFor({ state: "visible", timeout: 15_000 });

    // Colapsar
    await page.getByRole("button", { name: /colapsar menú/i }).click();
    await expect(page.locator("#admin-sidebar")).toHaveClass(/collapsed/);

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.locator("nav[aria-label='Módulos del panel']").waitFor({ state: "visible", timeout: 15_000 });

    // El sidebar debe seguir colapsado
    await expect(page.locator("#admin-sidebar")).toHaveClass(/collapsed/);
    await expect(page.getByRole("button", { name: /expandir menú/i })).toBeVisible();
  });
});
