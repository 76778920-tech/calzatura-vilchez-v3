/**
 * E2E: cambio de estado de pedido → BFF updateOrderStatus (stock vía RPC en servidor).
 * TC-CHK-02: al marcar pagado se invoca updateOrderStatus con estado pagado.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";
import { mirrorAdminOrders } from "./helpers/mirrorAdminDataRoutes";
import { mockBffUpdateOrderStatus } from "./helpers/mockAdminBff";

const ORDER_PENDIENTE = {
  id: "e2e-ord-stock-pendiente",
  userId: "client-stock-e2e",
  userEmail: "stock-e2e@test.com",
  items: [{
    product: { id: "p-stock-1", nombre: "Zapatilla Stock E2E", precio: 80, imagen: "" },
    quantity: 2,
    talla: "40",
    color: "Negro",
  }],
  subtotal: 160,
  envio: 0,
  total: 160,
  estado: "pendiente",
  direccion: {
    nombre: "Luis",
    apellido: "Pérez",
    direccion: "Av. Test 1",
    ciudad: "Lima",
    distrito: "Surco",
    telefono: "999000111",
  },
  creadoEn: "2026-05-10T10:00:00.000Z",
  metodoPago: "contraentrega",
};

async function setupOrderMocks(page: Page) {
  await mirrorAdminOrders(page, [ORDER_PENDIENTE]);
  await mockBffUpdateOrderStatus(page);

  await page.route("**/rest/v1/auditoria*", async (route) => {
    await route.fulfill({ status: 201, body: "" });
  });
}

test.describe("admin pedidos → stock al marcar pagado", () => {
  test.beforeEach(async ({ page }) => {
    await injectFakeAdminAuth(page);
    await setupOrderMocks(page);
  });

  test("marcar pagado llama updateOrderStatus con estado pagado (TC-CHK-02)", async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null;

    await page.route(/\/updateOrderStatus\/?(\?.*)?$/i, async (route) => {
      capturedBody = JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/admin/pedidos");
    await expect(page.locator(".order-card")).toHaveCount(1, { timeout: 10_000 });

    await page.locator(".status-select").first().selectOption("pagado");

    await expect(page.getByText(/Estado actualizado/i)).toBeVisible({ timeout: 8_000 });
    expect(capturedBody).not.toBeNull();
    expect(capturedBody?.estado).toBe("pagado");
    expect(capturedBody?.orderId).toBe(ORDER_PENDIENTE.id);
  });
});
