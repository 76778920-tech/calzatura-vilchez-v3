/**
 * E2E: checkout Stripe — createCheckoutSession vía BFF (mock).
 * No usa tarjeta real; valida redirect y pedido pendiente.
 */
import { expect, test, type Browser } from "@playwright/test";
import {
  E2EClientUser,
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

const CART_KEY = `calzatura_cart:${CHECKOUT_USER.uid}`;

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
      storageState: storageStateForUser(origin, CHECKOUT_USER, [
        { name: CART_KEY, value: JSON.stringify(CART_ITEMS) },
      ]),
    });
    const page = await context.newPage();
    await setupStripeCheckoutMocks(page);

    await page.goto("/checkout");
    await page.getByRole("button", { name: /confirmar pedido/i }).click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
    await context.close();
  });
});
