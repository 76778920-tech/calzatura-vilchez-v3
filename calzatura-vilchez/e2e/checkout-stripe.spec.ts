/**
 * E2E: checkout Stripe — createCheckoutSession vía BFF (mock).
 * No usa tarjeta real; valida redirect y pedido pendiente.
 */
import { expect, test } from "@playwright/test";
import {
  E2EClientUser,
  mockBffCheckoutDelivery,
  mockClientFirebaseAuth,
  mockSupabasePublicProductos,
  storageStateForUser,
} from "./helpers/mockClientAuth";

const CHECKOUT_USER: E2EClientUser = {
  uid: "e2e-stripe-client",
  email: "stripe-e2e@test.com",
  name: "Cliente Stripe",
};

const CHECKOUT_PRODUCT = {
  id: "e2e-stripe-product-001",
  nombre: "Zapatilla Checkout Stripe E2E",
  precio: 120,
  descripcion: "Producto para prueba Stripe mock",
  imagen: "",
  imagenes: [],
  stock: 5,
  categoria: "hombre",
  tipoCalzado: "zapatos",
  color: "Azul",
  tallas: ["41"],
  marca: "Vilchez",
  activo: true,
};

const CART_SESSION_KEY = "calzatura_cart:auth";

const CART_ITEMS = [
  {
    product: CHECKOUT_PRODUCT,
    quantity: 1,
    talla: "41",
    color: "Azul",
  },
];

async function setupStripeCheckoutMocks(page: import("@playwright/test").Page) {
  await mockClientFirebaseAuth(page, CHECKOUT_USER);
  await mockSupabasePublicProductos(page, [CHECKOUT_PRODUCT]);
  await mockBffCheckoutDelivery(page);

  const matchCreateOrder = (url: URL) => /\/createOrder\/?$/i.test(url.pathname);
  await page.route(matchCreateOrder, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ orderId: "e2e-order-stripe-001" }),
    });
  });

  const matchCheckoutSession = (url: URL) => /\/createCheckoutSession\/?$/i.test(url.pathname);
  await page.route(matchCheckoutSession, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = JSON.parse(route.request().postData() ?? "{}") as { orderId?: string };
    expect(body.orderId).toBe("e2e-order-stripe-001");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://checkout.stripe.com/c/pay/e2e-mock-session" }),
    });
  });
}

test.describe("Checkout Stripe (mock BFF)", () => {
  test("TC-CHK-STRIPE-01: redirige a Stripe tras crear pedido", async ({ browser, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const context = await browser.newContext({
      storageState: storageStateForUser(origin, CHECKOUT_USER),
    });
    const page = await context.newPage();
    await page.addInitScript(
      ({ key, items }) => {
        sessionStorage.setItem(key, JSON.stringify(items));
      },
      { key: CART_SESSION_KEY, items: CART_ITEMS },
    );
    await setupStripeCheckoutMocks(page);

    await page.goto("/checkout");
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

    await page.getByRole("button", { name: /Confirmar Pedido/i }).click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
    await context.close();
  });
});
