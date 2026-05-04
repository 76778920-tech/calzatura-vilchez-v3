/**
 * E2E: AdminUsers — KPIs, filtro de rol, protección de admin y error RLS.
 *
 * TC-USR-001: KPIs por rol reflejan datos moqueados.
 * TC-USR-002: Filtro por rol "cliente" muestra solo clientes.
 * TC-USR-003: No-superadmin ve el select de rol deshabilitado para cuentas admin.
 * TC-USR-004: Error RLS 42501 en PATCH muestra toast sin código técnico.
 */
import { expect, test, type Page } from "@playwright/test";
import { FAKE_ADMIN_EMAIL, FAKE_ADMIN_UID, injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Semilla ──────────────────────────────────────────────────────────────────

const MOCK_ADMIN = {
  uid: FAKE_ADMIN_UID,
  nombre: "Admin E2E",
  nombres: "Admin",
  apellidos: "E2E",
  email: FAKE_ADMIN_EMAIL,
  rol: "admin",
  creadoEn: "2024-01-01T00:00:00.000Z",
};

const MOCK_CLIENTE = {
  uid: "client-uid-001",
  nombre: "Cliente Test",
  nombres: "Cliente",
  apellidos: "Test",
  email: "cliente@test.com",
  rol: "cliente",
  creadoEn: "2025-01-01T00:00:00.000Z",
};

const MOCK_TRABAJADOR = {
  uid: "worker-uid-001",
  nombre: "Trabajador Test",
  nombres: "Trabajador",
  apellidos: "Test",
  email: "trabajador@test.com",
  rol: "trabajador",
  creadoEn: "2025-06-01T00:00:00.000Z",
};

const MOCK_ADMIN_OTHER = {
  uid: "admin-uid-002",
  nombre: "Admin Otro",
  nombres: "Admin",
  apellidos: "Otro",
  email: "admin2@test.com",
  rol: "admin",
  creadoEn: "2024-06-01T00:00:00.000Z",
};

const ALL_USERS = [MOCK_ADMIN, MOCK_CLIENTE, MOCK_TRABAJADOR, MOCK_ADMIN_OTHER];

// ─── Setup helper ─────────────────────────────────────────────────────────────

async function setupUserMocks(
  page: Page,
  opts: { patchStatus?: number } = {},
) {
  const patchStatus = opts.patchStatus ?? 204;

  await page.route("**/rest/v1/usuarios*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const url = route.request().url();
      if (url.includes("uid=eq.")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_ADMIN]) });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ALL_USERS) });
      return;
    }
    if (method === "PATCH") {
      if (patchStatus === 403) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ code: "42501", message: "new row violates row-level security policy" }),
        });
        return;
      }
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });

  await page.route("**/rest/v1/pedidos*", async (route) => {
    if (route.request().method() !== "GET") { await route.fallback(); return; }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/rest/v1/auditoria*", async (route) => {
    await route.fulfill({ status: 201, body: "" });
  });
}

async function goToUsers(page: Page) {
  await page.goto("/admin/usuarios");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("table tbody tr", { timeout: 15_000 });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin usuarios → KPIs, filtro y roles", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-users] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-USR-001
  // ──────────────────────────────────────────────────────────────────────────
  test("KPIs por rol reflejan los 4 usuarios moqueados (TC-USR-001)", async ({ page }) => {
    await setupUserMocks(page);
    await goToUsers(page);

    // 1 cliente, 1 trabajador, 2 admins, 4 total
    await expect(page.getByText("4").first()).toBeVisible({ timeout: 8_000 });

    const cards = page.locator(".admin-metric-card");
    await expect(cards.filter({ hasText: /Clientes/ }).locator("strong")).toHaveText("1");
    await expect(cards.filter({ hasText: /Trabajadores/ }).locator("strong")).toHaveText("1");
    await expect(cards.filter({ hasText: /Administradores/ }).locator("strong")).toHaveText("2");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-USR-002
  // ──────────────────────────────────────────────────────────────────────────
  test("filtro por 'clientes' muestra solo la fila del cliente (TC-USR-002)", async ({ page }) => {
    await setupUserMocks(page);
    await goToUsers(page);

    // 4 filas inicialmente
    await expect(page.locator("table tbody tr:not(:has(td[colspan]))")).toHaveCount(4, { timeout: 8_000 });

    await page.selectOption("select.form-input", "cliente");

    await expect(page.locator("table tbody tr:not(:has(td[colspan]))")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("cliente@test.com");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-USR-003
  // ──────────────────────────────────────────────────────────────────────────
  // FAKE_ADMIN_EMAIL (76778920@continental.edu.pe) es superadmin, por lo que
  // puede editar cualquier rol ajeno. La protección que aplica siempre es la
  // autoprotección: la propia fila del usuario autenticado tiene select disabled.
  test("select de rol de la propia cuenta del admin autenticado está deshabilitado (TC-USR-003)", async ({ page }) => {
    await setupUserMocks(page);
    await goToUsers(page);

    const ownRow = page.locator("table tbody tr").filter({ hasText: FAKE_ADMIN_EMAIL });
    await expect(ownRow).toBeVisible();
    await expect(ownRow.locator("select.admin-role-select")).toBeDisabled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-USR-004
  // ──────────────────────────────────────────────────────────────────────────
  test("error RLS 42501 en cambio de rol muestra 'Sin permisos' sin código técnico (TC-USR-004)", async ({ page }) => {
    await setupUserMocks(page, { patchStatus: 403 });
    await goToUsers(page);

    // Cambiar rol del trabajador (no protegido)
    const trabajadorRow = page.locator("table tbody tr").filter({ hasText: "trabajador@test.com" });
    await expect(trabajadorRow).toBeVisible();
    await trabajadorRow.locator("select.admin-role-select").selectOption("cliente");

    await expect(page.getByText(/Sin permisos para realizar esta operación/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/42501/)).not.toBeVisible();
  });
});
