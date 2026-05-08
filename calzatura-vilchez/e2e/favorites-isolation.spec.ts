import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const FIREBASE_PROJECT_ID = "calzaturavilchez-ab17f";
const FIREBASE_API_KEY = "AIzaSyBAnVUP4M6wujGs-x8EytdGabkIP7EJkwo";

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

type E2EUser = {
  uid: string;
  email: string;
  name: string;
};

const USER_A: E2EUser = {
  uid: "e2e-client-a-uid",
  email: "cliente-a-e2e@example.com",
  name: "Cliente A",
};

const USER_B: E2EUser = {
  uid: "e2e-client-b-uid",
  email: "cliente-b-e2e@example.com",
  name: "Cliente B",
};

function b64url(data: string): string {
  return Buffer.from(data, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fakeJwt(user: E2EUser): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "e2e-fake-kid" }));
  const payload = b64url(
    JSON.stringify({
      iss: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      aud: FIREBASE_PROJECT_ID,
      auth_time: 1700000000,
      user_id: user.uid,
      sub: user.uid,
      iat: 1700000000,
      exp: 9999999999,
      email: user.email,
      email_verified: true,
      firebase: {
        identities: { email: [user.email] },
        sign_in_provider: "password",
      },
    })
  );
  return `${header}.${payload}.e2e-fake-sig`;
}

function storageStateForUser(origin: string, user: E2EUser) {
  const token = fakeJwt(user);
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: `firebase:authUser:${FIREBASE_API_KEY}:[DEFAULT]`,
            value: JSON.stringify({
              uid: user.uid,
              email: user.email,
              emailVerified: true,
              displayName: user.name,
              isAnonymous: false,
              photoURL: null,
              providerData: [{
                providerId: "password",
                uid: user.email,
                email: user.email,
                displayName: user.name,
                photoURL: null,
                phoneNumber: null,
              }],
              stsTokenManager: {
                refreshToken: `refresh-${user.uid}`,
                accessToken: token,
                expirationTime: 9999999999999,
              },
              createdAt: "1700000000000",
              lastLoginAt: "1700000000000",
              apiKey: FIREBASE_API_KEY,
              appName: "[DEFAULT]",
            }),
          },
        ],
      },
    ],
  };
}

async function mockAuthAndData(page: Page, user: E2EUser) {
  await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        users: [{
          localId: user.uid,
          email: user.email,
          emailVerified: true,
          displayName: user.name,
          validSince: "1700000000",
          disabled: false,
        }],
      }),
    });
  });

  await page.route("**/securetoken.googleapis.com/**", async (route) => {
    const token = fakeJwt(user);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: token,
        expires_in: "3600",
        token_type: "Bearer",
        refresh_token: `refresh-${user.uid}`,
        id_token: token,
        user_id: user.uid,
        project_id: FIREBASE_PROJECT_ID,
      }),
    });
  });

  await page.route("**/rest/v1/usuarios*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        uid: user.uid,
        nombre: user.name,
        email: user.email,
        rol: "cliente",
        creadoEn: "2026-01-01T00:00:00.000Z",
      }),
    });
  });

  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([FAVORITE_PRODUCT]),
    });
  });
}

async function newClientPage(browser: Browser, baseURL: string, user: E2EUser) {
  const origin = new URL(baseURL).origin;
  const context = await browser.newContext({ storageState: storageStateForUser(origin, user) });
  const page = await context.newPage();
  await mockAuthAndData(page, user);
  return { context, page };
}

test.describe("favoritos privados por cuenta", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("cliente A marca favorito y cliente B no lo ve", async ({ browser, baseURL }) => {
    const url = baseURL ?? "http://127.0.0.1:5173";
    const sessions: BrowserContext[] = [];

    const clientA = await newClientPage(browser, url, USER_A);
    sessions.push(clientA.context);
    const clientB = await newClientPage(browser, url, USER_B);
    sessions.push(clientB.context);

    try {
      await clientA.page.goto("/productos");
      await expect(clientA.page.locator("main.products-page")).toBeVisible({ timeout: 20_000 });
      await clientA.page
        .locator("a.product-card", { hasText: FAVORITE_PRODUCT.nombre })
        .getByRole("button", { name: /agregar a favoritos/i })
        .click();
      await expect(clientA.page.getByText(/agregado a favoritos/i)).toBeVisible({ timeout: 8_000 });

      await clientA.page.goto("/favoritos");
      await expect(clientA.page.getByText(FAVORITE_PRODUCT.nombre)).toBeVisible({ timeout: 15_000 });

      await clientB.page.goto("/favoritos");
      await expect(clientB.page.getByRole("heading", { name: /aún no tienes favoritos/i })).toBeVisible({ timeout: 15_000 });
      await expect(clientB.page.getByText(FAVORITE_PRODUCT.nombre)).toHaveCount(0);
    } finally {
      await Promise.all(sessions.map((context) => context.close()));
    }
  });
});
