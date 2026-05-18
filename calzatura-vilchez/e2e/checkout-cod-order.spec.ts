/**
 * E2E: checkout contra entrega — createOrder vía BFF (mock).
 * TC-CHK-01: cliente autenticado confirma pedido COD y llega a pedido exitoso.
 */
import { expect, test, type Browser } from "@playwright/test";
import {
  E2EClientUser,
  mockBffCheckoutDelivery,
  mockClientFirebaseAuth,
  mockSupabasePublicProductos,
  storageStateForUser,
} from "./helpers/mockClientAuth";

const CHECKOUT_USER: E2EClientUser = {
  uid: "e2e-checkout-client",
  email: "checkout-e2e@test.com",
  name: "Cliente Checkout",
};

const CHECKOUT_PRODUCT = {
  id: "e2e-checkout-product-001",
  nombre: "Zapatilla Checkout COD E2E",
  precio: 99,
  descripcion: "Producto para prueba de checkout COD",
  imagen: "",
  imagenes: [],
  stock: 10,
  categoria: "hombre",
  tipoCalzado: "zapatos",
  color: "Negro",
  tallas: ["40"],
  marca: "Vilchez",
  activo: true,
};

const CART_KEY = `calzatura_cart:${CHECKOUT_USER.uid}`;

const CART_ITEMS = [
  {
    product: CHECKOUT_PRODUCT,
    quantity: 1,
    talla: "40",
    color: "Negro",
  },
];

async function setupCheckoutMocks(page: import("@playwright/test").Page) {
  await mockClientFirebaseAuth(page, CHECKOUT_USER);
  await mockSupabasePublicProductos(page, [CHECKOUT_PRODUCT]);
  await mockBffCheckoutDelivery(page);

  const matchCreateOrder = (url: URL) => /\/createOrder\/?$/i.test(url.pathname);
  await page.route(matchCreateOrder, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = JSON.parse(route.request().postData() ?? "{}") as { metodoPago?: string };
    expect(body.metodoPago).toBe("contraentrega");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ orderId: "e2e-order-cod-001" }),
    });
  });
}

async function openCheckoutPage(browser: Browser, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const context = await browser.newContext({
    storageState: storageStateForUser(origin, CHECKOUT_USER, [
      { name: CART_KEY, value: JSON.stringify(CART_ITEMS) },
    ]),
  });
  const page = await context.newPage();
  await setupCheckoutMocks(page);
  await page.goto("/checkout");
  return { context, page };
}

test.describe("checkout COD → createOrder BFF", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("confirma pedido contra entrega y navega a pedido exitoso (TC-CHK-01)", async ({ browser, baseURL }) => {
    const url = baseURL ?? "http://127.0.0.1:5173";
    const { context, page } = await openCheckoutPage(browser, url);

    try {
      await expect(page.locator("main.checkout-page")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(CHECKOUT_PRODUCT.nombre)).toBeVisible({ timeout: 10_000 });

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

      await expect(page).toHaveURL(/\/pedido-exitoso\/e2e-order-cod-001/, { timeout: 15_000 });
    } finally {
      await context.close();
    }
  });
});
