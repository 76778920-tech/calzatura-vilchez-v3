import { expect, test, type Browser, type BrowserContext } from "@playwright/test";
import {
  type E2EClientUser,
  mockClientFirebaseAuth,
  mockSupabasePublicProductos,
  storageStateForUser,
} from "./helpers/mockClientAuth";

const FAVORITE_PRODUCT = {
  id: "e2e-favorite-private-001",
  nombre: "Zapato Favorito Privado E2E",
  precio: 199,
  descripcion: "Producto controlado para aislamiento de favoritos",
  imagen: "",
  imagenes: [],
  stock: 5,
  categoria: "hombre",
  tipoCalzado: "zapatos",
  color: "Negro",
  tallas: ["40", "41"],
  marca: "Vilchez",
  activo: true,
  destacado: true,
};

const USER_A: E2EClientUser = {
  uid: "e2e-client-a-uid",
  email: "cliente-a-e2e@example.com",
  name: "Cliente A",
};

const USER_B: E2EClientUser = {
  uid: "e2e-client-b-uid",
  email: "cliente-b-e2e@example.com",
  name: "Cliente B",
};

const E2E_FAVORITES_KEY_A = `e2e_favorites:${USER_A.uid}`;

async function newClientPage(browser: Browser, baseURL: string, user: E2EClientUser) {
  const origin = new URL(baseURL).origin;
  const context = await browser.newContext({ storageState: storageStateForUser(origin, user) });
  const page = await context.newPage();
  await mockClientFirebaseAuth(page, user);
  await mockSupabasePublicProductos(page, [FAVORITE_PRODUCT]);
  return { context, page };
}

test.describe("favoritos privados por cuenta (BFF)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("cliente A marca favorito y cliente B no lo ve (TC-FAV-001)", async ({ browser, baseURL }) => {
    const url = baseURL ?? "http://127.0.0.1:5173";
    const sessions: BrowserContext[] = [];

    const clientA = await newClientPage(browser, url, USER_A);
    sessions.push(clientA.context);

    try {
      await clientA.page.goto("/productos");
      await expect(clientA.page.locator("main.products-page")).toBeVisible({ timeout: 20_000 });
      await clientA.page
        .locator("a.product-card", { hasText: FAVORITE_PRODUCT.nombre })
        .getByRole("button", { name: /agregar a favoritos/i })
        .click();
      await expect(clientA.page.getByText(/agregado a favoritos/i)).toBeVisible({ timeout: 8_000 });

      await clientA.page.waitForFunction(
        ([key, productId]) => {
          try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) && parsed.includes(productId);
          } catch {
            return false;
          }
        },
        [E2E_FAVORITES_KEY_A, FAVORITE_PRODUCT.id],
        { timeout: 10_000 },
      );

      await clientA.page.goto("/favoritos", { waitUntil: "networkidle" });
      await expect(clientA.page.getByText(FAVORITE_PRODUCT.nombre)).toBeVisible({ timeout: 20_000 });

      const clientB = await newClientPage(browser, url, USER_B);
      sessions.push(clientB.context);
      await clientB.page.goto("/favoritos");
      await expect(clientB.page.getByRole("heading", { name: /aún no tienes favoritos/i })).toBeVisible({ timeout: 15_000 });
      await expect(clientB.page.getByText(FAVORITE_PRODUCT.nombre)).toHaveCount(0);
    } finally {
      await Promise.all(sessions.map((context) => context.close()));
    }
  });
});
