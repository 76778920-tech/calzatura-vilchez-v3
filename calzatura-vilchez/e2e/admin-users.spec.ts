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
import { mirrorAdminOrders, mirrorAdminUserRolePatch, mirrorAdminUsers } from "./helpers/mirrorAdminDataRoutes";
import { maskEmailForDisplay } from "../src/utils/maskEmail";

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
  opts: { patchStatus?: number; ordersStatus?: number; usersStatus?: number } = {},
) {
  const patchStatus = opts.patchStatus ?? 204;
  const ordersStatus = opts.ordersStatus ?? 200;
  const usersStatus = opts.usersStatus ?? 200;

  if (usersStatus !== 200) {
    await page.route(/\/admin\/users\/?(\?.*)?$/i, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: usersStatus,
          contentType: "application/json",
          body: JSON.stringify({ error: "row-level security policy" }),
        });
        return;
      }
      await route.fallback();
    });
  } else {
    await mirrorAdminUsers(page, ALL_USERS);
  }

  await mirrorAdminUserRolePatch(
    page,
    patchStatus === 403
      ? { status: 403, error: "new row violates row-level security policy" }
      : { status: 200 },
  );

  if (ordersStatus !== 200) {
    await page.route(/\/admin\/orders\/?(\?.*)?$/i, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: ordersStatus,
          contentType: "application/json",
          body: JSON.stringify({ error: "row-level security policy" }),
        });
        return;
      }
      await route.fallback();
    });
  } else {
    await mirrorAdminOrders(page, []);
  }

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
    await expect(page.locator("table tbody tr").first()).toContainText(
      maskEmailForDisplay(MOCK_CLIENTE.email),
    );
  });

  test("si pedidos falla, mantiene usuarios y muestra aviso (TC-USR-005)", async ({ page }) => {
    await setupUserMocks(page, { ordersStatus: 403 });
    await goToUsers(page);

    await expect(page.getByText(/No se pudieron cargar los pedidos de usuarios/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("table tbody tr:not(:has(td[colspan]))")).toHaveCount(4);
  });

  test("si usuarios falla, muestra error con reintento (TC-USR-006)", async ({ page }) => {
    await setupUserMocks(page, { usersStatus: 403 });
    await goToUsers(page);

    await expect(page.getByRole("alert")).toContainText("No se pudieron cargar los usuarios");
    await expect(page.getByRole("button", { name: /reintentar/i })).toBeVisible();
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

    const ownRow = page.locator("table tbody tr").filter({ hasText: MOCK_ADMIN.nombre });
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
    const trabajadorRow = page.locator("table tbody tr").filter({
      hasText: maskEmailForDisplay(MOCK_TRABAJADOR.email),
    });
    await expect(trabajadorRow).toBeVisible();
    await trabajadorRow.locator("select.admin-role-select").selectOption("cliente");

    await expect(page.getByText(/Sin permisos para realizar esta operación/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/42501/)).not.toBeVisible();
  });
});
