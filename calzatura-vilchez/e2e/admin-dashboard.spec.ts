/**
 * E2E: AdminDashboard — KPIs, auditoría, errores de carga y reintento.
 *
 * Trazabilidad: TC-DASH-001…005 ↔ CU-T07 / AdminDashboard-auditoria.md
 */
import { expect, test, type Page } from "@playwright/test";
import { FAKE_ADMIN_EMAIL, FAKE_ADMIN_UID, injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

const MOCK_PRODUCT = {
  id: "e2e-prod-1",
  nombre: "Zapatilla E2E",
  precio: 120,
  descripcion: "d",
  imagen: "",
  stock: 4,
  categoria: "hombre",
};

const MOCK_ORDER = {
  id: "e2e-order-uuid-0001",
  userId: "client-1",
  userEmail: "cliente-e2e@test.com",
  items: [
    {
      product: MOCK_PRODUCT,
      quantity: 1,
    },
  ],
  subtotal: 120,
  envio: 0,
  total: 120,
  estado: "pendiente",
  direccion: {
    nombre: "Ana",
    apellido: "García",
    direccion: "Av. Test 123",
    ciudad: "Lima",
    distrito: "Miraflores",
    telefono: "999111222",
  },
  creadoEn: "2026-05-01T15:00:00.000Z",
  metodoPago: "contraentrega",
};

const MOCK_AUDIT_ROW = {
  id: "e2e-audit-1",
  accion: "crear",
  entidad: "producto",
  entidadId: "e2e-prod-1",
  entidadNombre: "Zapatilla E2E",
  detalle: null,
  usuarioUid: FAKE_ADMIN_UID,
  usuarioEmail: FAKE_ADMIN_EMAIL,
  realizadoEn: "2026-05-01T14:00:00.000Z",
};

const MOCK_ADMIN_USER = {
  uid: FAKE_ADMIN_UID,
  nombre: "Admin E2E",
  email: FAKE_ADMIN_EMAIL,
  rol: "admin",
  creadoEn: "2024-01-01T00:00:00.000Z",
};

const MOCK_EXTRA_USER = {
  uid: "client-1",
  nombre: "Cliente",
  email: "cliente-e2e@test.com",
  rol: "cliente",
  creadoEn: "2025-01-01T00:00:00.000Z",
};

/** Respuestas Supabase REST para el dashboard (registrado después de injectFakeAdminAuth). */
async function setupDashboardSupabaseMocks(
  page: Page,
  opts: {
    /** Si true, no registrar `productos` (el test define su propia ruta). */
    skipProductos?: boolean;
    auditoriaStatus?: number;
    products?: unknown[];
    orders?: unknown[];
    ventasDiarias?: unknown[];
    productoFinanzas?: unknown[];
    users?: unknown[];
    auditoria?: unknown[];
  } = {},
) {
  const products = opts.products ?? [];
  const orders = opts.orders ?? [];
  const ventasDiarias = opts.ventasDiarias ?? [];
  const productoFinanzas = opts.productoFinanzas ?? [];
  const users = opts.users ?? [MOCK_ADMIN_USER, MOCK_EXTRA_USER];
  const auditoria = opts.auditoria ?? [];

  const productosBody = JSON.stringify(products);
  const auditoriaStatus = opts.auditoriaStatus ?? 200;
  const auditoriaBody =
    auditoriaStatus >= 400 ? "{}" : JSON.stringify(auditoria);

  if (!opts.skipProductos) {
    await page.route("**/rest/v1/productos*", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: productosBody,
      });
    });
  }

  await page.route("**/rest/v1/pedidos*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(orders),
    });
  });

  await page.route("**/rest/v1/ventasDiarias*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ventasDiarias),
    });
  });

  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(productoFinanzas),
    });
  });

  await page.route("**/rest/v1/usuarios*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const url = route.request().url();
    if (url.includes("uid=eq.")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([MOCK_ADMIN_USER]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(users),
    });
  });

  await page.route("**/rest/v1/auditoria*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: auditoriaStatus,
      contentType: "application/json",
      body: auditoriaBody,
    });
  });
}

async function goToDashboard(page: Page) {
  await page.goto("/admin");
  await page.waitForLoadState("domcontentloaded");
}

test.describe("admin dashboard → KPIs, auditoría y errores", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-dashboard] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
  });

  test("fallo en productos: error, toast y Reintentar; al reintentar carga el dashboard (TC-DASH-001)", async ({ page }) => {
    let productosFallan = true;
    await page.route("**/rest/v1/productos*", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }
      if (productosFallan) {
        await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await setupDashboardSupabaseMocks(page, { skipProductos: true });

    await goToDashboard(page);

    await expect(page.locator(".admin-loading").getByText(/No se pudieron cargar los datos del dashboard\./i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /reintentar/i })).toBeVisible();
    await expect(page.getByText(/Verifica tu conexión/i).first()).toBeVisible({ timeout: 5_000 });

    productosFallan = false;
    await page.getByRole("button", { name: /reintentar/i }).click();
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1.dash-title", { hasText: /^Dashboard$/ })).toBeVisible({ timeout: 15_000 });
  });

  test("fallo solo en auditoría: mensaje explícito sin confundir con vacío (TC-DASH-002)", async ({ page }) => {
    await setupDashboardSupabaseMocks(page, { auditoriaStatus: 500 });
    await goToDashboard(page);

    await expect(page.locator("h1.dash-title", { hasText: /^Dashboard$/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/No se pudo cargar el historial de actividad/i)).toBeVisible();
    await expect(page.getByText(/Sin actividad registrada aún/i)).not.toBeVisible();
  });

  test("pedido reciente: foco, Enter y Space abren modal; Escape cierra (TC-DASH-003)", async ({ page }) => {
    await setupDashboardSupabaseMocks(page, { orders: [MOCK_ORDER] });
    await goToDashboard(page);

    await expect(page.locator("h1.dash-title", { hasText: /^Dashboard$/ })).toBeVisible({ timeout: 15_000 });

    const row = page.locator("tr.dash-order-row").first();
    const rowButton = row.locator("button.dash-order-row-btn");
    await expect(row).toBeVisible();
    await rowButton.focus();
    await expect(rowButton).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByText(/Detalle del Pedido/i)).toBeVisible();
    await expect(page.locator(".dash-order-modal").getByText(/cliente-e2e@test\.com/i)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText(/Detalle del Pedido/i)).not.toBeVisible();

    await rowButton.focus();
    await expect(rowButton).toBeFocused();
    await page.keyboard.press(" ");
    await expect(page.locator(".dash-order-modal").getByText(/Detalle del Pedido/i)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".dash-order-modal")).not.toBeVisible();
  });

  test("KPIs y tabla de auditoría reflejan datos moqueados (TC-DASH-004)", async ({ page }) => {
    await setupDashboardSupabaseMocks(page, {
      products: [MOCK_PRODUCT, { ...MOCK_PRODUCT, id: "e2e-prod-2", nombre: "Sandalia" }],
      orders: [MOCK_ORDER, { ...MOCK_ORDER, id: "e2e-order-2", estado: "pagado" }],
      auditoria: [MOCK_AUDIT_ROW],
    });
    await goToDashboard(page);

    await expect(page.locator("h1.dash-title", { hasText: /^Dashboard$/ })).toBeVisible({ timeout: 15_000 });

    await expect(page.locator(".dash-kpi-blue .dash-kpi-value")).toHaveText("2");
    await expect(page.locator(".dash-kpi-green .dash-kpi-value")).toHaveText("2");
    await expect(page.locator(".dash-kpi-orange .dash-kpi-value")).toHaveText("2");

    await expect(page.getByRole("columnheader", { name: /Acción/i })).toBeVisible();
    await expect(page.getByRole("cell", { name: /^crear$/ })).toBeVisible();
    await expect(page.getByRole("cell", { name: /Zapatilla E2E/i })).toBeVisible();
  });

  test("sin pedidos: fila de pedidos no existe; auditoría vacía con copy de éxito (TC-DASH-005)", async ({ page }) => {
    await setupDashboardSupabaseMocks(page, { orders: [], auditoria: [] });
    await goToDashboard(page);

    await expect(page.locator("h1.dash-title", { hasText: /^Dashboard$/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("tr.dash-order-row")).toHaveCount(0);
    await expect(page.getByText(/No hay pedidos aún/i)).toBeVisible();
    await expect(page.getByText(/Sin actividad registrada aún/i)).toBeVisible();
  });
});
