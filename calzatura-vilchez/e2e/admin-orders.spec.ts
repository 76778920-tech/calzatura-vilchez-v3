/**
 * E2E: AdminOrders — filtro, expansión y cambio de estado.
 *
 * TC-ORD-001: Filtro por estado reduce la lista.
 * TC-ORD-002: Expand / collapse de tarjeta de pedido.
 * TC-ORD-003: Cambio de estado llama PATCH y muestra toast.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Semilla ──────────────────────────────────────────────────────────────────

const ORDER_PENDIENTE = {
  id: "e2e-ord-0001-pendiente",
  userId: "client-1",
  userEmail: "cliente-e2e@test.com",
  items: [{ product: { id: "p1", nombre: "Zapatilla E2E", precio: 120, imagen: "" }, quantity: 1 }],
  subtotal: 120,
  envio: 0,
  total: 120,
  estado: "pendiente",
  direccion: { nombre: "Ana", apellido: "García", direccion: "Av. Test 123", ciudad: "Lima", distrito: "Miraflores", telefono: "999111222" },
  creadoEn: "2026-05-01T10:00:00.000Z",
  metodoPago: "contraentrega",
};

const ORDER_PAGADO = {
  ...ORDER_PENDIENTE,
  id: "e2e-ord-0002-pagado",
  userEmail: "pagado-e2e@test.com",
  estado: "pagado",
};

// ─── Setup helper ─────────────────────────────────────────────────────────────

async function setupOrderMocks(page: Page, orders: unknown[] = [ORDER_PENDIENTE, ORDER_PAGADO]) {
  await page.route("**/rest/v1/pedidos*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(orders) });
      return;
    }
    if (method === "PATCH") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });

  await page.route("**/rest/v1/auditoria*", async (route) => {
    await route.fulfill({ status: 201, body: "" });
  });
}

async function goToOrders(page: Page) {
  await page.goto("/admin/pedidos");
  await page.waitForLoadState("domcontentloaded");
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin pedidos → filtro, expansión y cambio de estado", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-orders] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
    await setupOrderMocks(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-ORD-001
  // ──────────────────────────────────────────────────────────────────────────
  test("filtro por estado 'pendiente' muestra solo pedidos pendientes (TC-ORD-001)", async ({ page }) => {
    await goToOrders(page);

    await expect(page.locator(".order-card")).toHaveCount(2, { timeout: 10_000 });

    await page.selectOption("select.form-input", "pendiente");

    await expect(page.locator(".order-card")).toHaveCount(1);
    await expect(page.locator(".order-card").first()).toContainText("cliente-e2e@test.com");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-ORD-002
  // ──────────────────────────────────────────────────────────────────────────
  test("click en cabecera expande el detalle; segundo click lo colapsa (TC-ORD-002)", async ({ page }) => {
    await goToOrders(page);

    await expect(page.locator(".order-card")).toHaveCount(2, { timeout: 10_000 });

    const firstCard = page.locator(".order-card").first();
    const header = firstCard.locator(".order-card-header");

    // Antes de expandir el body no existe
    await expect(firstCard.locator(".order-card-body")).not.toBeVisible();

    await header.click();
    await expect(firstCard.locator(".order-card-body")).toBeVisible();
    await expect(firstCard.locator(".order-card-body")).toContainText("Zapatilla E2E");

    // Segundo click colapsa
    await header.click();
    await expect(firstCard.locator(".order-card-body")).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-ORD-003
  // ──────────────────────────────────────────────────────────────────────────
  test("cambio de estado en select llama PATCH y muestra toast de éxito (TC-ORD-003)", async ({ page }) => {
    await goToOrders(page);

    await expect(page.locator(".order-card")).toHaveCount(2, { timeout: 10_000 });

    let patchCalled = false;
    await page.route("**/rest/v1/pedidos*", async (route) => {
      if (route.request().method() === "PATCH") {
        patchCalled = true;
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      await route.fallback();
    });

    // Cambiar estado del primer pedido (pendiente → pagado)
    const statusSelect = page.locator(".status-select").first();
    await statusSelect.selectOption("pagado");

    await expect(page.getByText(/Estado actualizado/i)).toBeVisible({ timeout: 5_000 });
    expect(patchCalled).toBe(true);
  });
});
