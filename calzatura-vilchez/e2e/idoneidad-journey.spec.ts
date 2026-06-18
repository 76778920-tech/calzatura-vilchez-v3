/**
 * E2E Idoneidad ISO 25010 — flujo Must completo en un solo recorrido:
 * catálogo → ficha → carrito → checkout COD → éxito → historial (RF-PED-03).
 *
 * TC-IDON-001: trazabilidad RF-CAT-01/02, RF-CAR-01, RF-CHK-01, RF-PED-01/02, RF-PED-03.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  E2EClientUser,
  mockBffCheckoutDelivery,
  mockClientFirebaseAuth,
  mockSupabasePublicProductos,
  storageStateForUser,
} from "./helpers/mockClientAuth";
import { waitForCheckoutHydrated } from "./helpers/checkoutTestUtils";

const IDONEIDAD_USER: E2EClientUser = {
  uid: "e2e-idoneidad-client",
  email: "idoneidad-e2e@test.com",
  name: "Cliente Idoneidad",
};

const ORDER_ID = "e2e-idoneidad-order-001";

const IDONEIDAD_PRODUCT = {
  id: "e2e-idoneidad-product-001",
  nombre: "Zapatilla Idoneidad E2E",
  precio: 149,
  descripcion: "Producto controlado para trazabilidad de idoneidad funcional",
  imagen: "",
  imagenes: [],
  stock: 6,
  categoria: "hombre",
  tipoCalzado: "zapatos",
  color: "Negro",
  tallas: ["40", "41"],
  marcaSlug: "vilchez",
  marca: "Vilchez",
  activo: true,
  codigo: "IDON-001",
};

function mockMyOrders(page: Page) {
  return page.route((url) => /\/myOrders\/?$/i.test(url.pathname), async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        orders: [
          {
            id: ORDER_ID,
            userId: IDONEIDAD_USER.uid,
            userEmail: IDONEIDAD_USER.email,
            items: [
              {
                product: IDONEIDAD_PRODUCT,
                quantity: 1,
                talla: "40",
                color: "Negro",
              },
            ],
            subtotal: 149,
            envio: 0,
            total: 149,
            estado: "pendiente",
            direccion: {
              nombre: "Ana",
              apellido: "García",
              direccion: "Av. Benavides 123",
              ciudad: "Lima",
              distrito: "Miraflores",
              telefono: "999888777",
            },
            creadoEn: "2026-06-16T12:00:00.000Z",
            metodoPago: "contraentrega",
          },
        ],
      }),
    });
  });
}

async function setupIdoneidadMocks(page: Page) {
  await mockClientFirebaseAuth(page, IDONEIDAD_USER);
  await mockSupabasePublicProductos(page, [IDONEIDAD_PRODUCT]);
  await mockBffCheckoutDelivery(page);
  await mockMyOrders(page);

  await page.route((url) => /\/createOrder\/?$/i.test(url.pathname), async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = JSON.parse(route.request().postData() ?? "{}") as { metodoPago?: string };
    expect(body.metodoPago).toBe("contraentrega");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ orderId: ORDER_ID }),
    });
  });
}

async function openAuthenticatedPage(browser: Browser, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const context = await browser.newContext({
    storageState: storageStateForUser(origin, IDONEIDAD_USER),
  });
  const page = await context.newPage();
  await setupIdoneidadMocks(page);
  return { context, page };
}

test.describe("idoneidad — flujo Must tienda pública", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("TC-IDON-001: catálogo → ficha → carrito → checkout COD → historial", async ({ browser, baseURL }) => {
    const url = baseURL ?? "http://127.0.0.1:5173";
    const { context, page } = await openAuthenticatedPage(browser, url);

    try {
      await page.goto("/productos");
      await page.evaluate(() => {
        sessionStorage.removeItem("calzatura_cart:guest");
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith("calzatura_cart:auth:")) sessionStorage.removeItem(key);
        }
      });
      await page.reload();
      await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });

      const productCard = page.locator(".product-card").filter({ hasText: IDONEIDAD_PRODUCT.nombre });
      await expect(productCard).toBeVisible({ timeout: 20_000 });
      await productCard.getByText(IDONEIDAD_PRODUCT.nombre).click();

      await expect(page).toHaveURL(/\/producto\/[^/]+$/);
      await expect(page.locator("main.detail-page")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("heading", { name: IDONEIDAD_PRODUCT.nombre })).toBeVisible();

      const talla40 = page.getByRole("button", { name: /^40$/ });
      if (await talla40.isVisible().catch(() => false)) {
        await talla40.click();
      }

      const addBtn = page.getByRole("button", { name: /Agregar al Carrito/i });
      await expect(addBtn).toBeEnabled({ timeout: 15_000 });
      await addBtn.click();

      await page.waitForFunction(
        () => {
          for (const key of Object.keys(sessionStorage)) {
            if (!key.startsWith("calzatura_cart:auth:")) continue;
            const stored = sessionStorage.getItem(key);
            if (!stored) continue;
            try {
              return (JSON.parse(stored) as unknown[]).length > 0;
            } catch {
              return false;
            }
          }
          return false;
        },
        { timeout: 8_000 },
      );

      await page.goto("/carrito");
      await expect(page.getByRole("heading", { name: /Mi Carrito/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(IDONEIDAD_PRODUCT.nombre)).toBeVisible();
      await page.getByRole("link", { name: /Proceder al Pago/i }).click();

      await expect(page).toHaveURL(/\/checkout/);
      await waitForCheckoutHydrated(page, IDONEIDAD_PRODUCT.nombre);

      await page.locator("#checkout-nombre").fill("Ana");
      await page.locator("#checkout-apellido").fill("García");
      await page.locator("#checkout-direccion").fill("Av. Benavides 123");
      await page.locator("#checkout-ciudad").fill("Lima");
      await page.locator("#checkout-distrito").fill("Miraflores");
      await page.locator("#checkout-telefono").fill("999 888 777");

      await expect(page.locator(".checkout-delivery-suggest-btn").first()).toBeVisible({ timeout: 15_000 });
      await page.locator(".checkout-delivery-suggest-btn").first().click();

      await page.getByRole("button", { name: /Continuar al Pago/i }).click();
      await expect(page.getByText(/Método de Pago/i)).toBeVisible({ timeout: 10_000 });

      await page.getByLabel(/Pago contra entrega/i).check();
      await page.getByRole("button", { name: /Confirmar Pedido/i }).click();

      await expect(page).toHaveURL(new RegExp(`/pedido-exitoso/${ORDER_ID}`), { timeout: 15_000 });

      await page.goto("/mis-pedidos");
      await expect(page.getByRole("heading", { name: /Mis Pedidos/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(".order-card")).toHaveCount(1);
      await expect(page.getByText(/pendiente/i)).toBeVisible();
      await expect(page.getByText(/1 producto/i)).toBeVisible();
      await page.locator(".order-card-header").click();
      await expect(page.getByText(IDONEIDAD_PRODUCT.nombre)).toBeVisible({ timeout: 10_000 });
    } finally {
      await context.close();
    }
  });
});
