import type { Page } from "@playwright/test";

export const E2E_FIREBASE_PROJECT_ID = "calzaturavilchez-ab17f";
export const E2E_FIREBASE_API_KEY = "AIzaSyBAnVUP4M6wujGs-x8EytdGabkIP7EJkwo";

export type E2EClientUser = {
  uid: string;
  email: string;
  name: string;
};

function b64url(data: string): string {
  return Buffer.from(data, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function fakeJwt(user: E2EClientUser): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "e2e-fake-kid" }));
  const payload = b64url(
    JSON.stringify({
      iss: `https://securetoken.google.com/${E2E_FIREBASE_PROJECT_ID}`,
      aud: E2E_FIREBASE_PROJECT_ID,
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
    }),
  );
  return `${header}.${payload}.e2e-fake-sig`;
}

export function storageStateForUser(origin: string, user: E2EClientUser) {
  const token = fakeJwt(user);
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: `firebase:authUser:${E2E_FIREBASE_API_KEY}:[DEFAULT]`,
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
              apiKey: E2E_FIREBASE_API_KEY,
              appName: "[DEFAULT]",
            }),
          },
        ],
      },
    ],
  };
}

export async function mockClientFirebaseAuth(page: Page, user: E2EClientUser): Promise<void> {
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
        project_id: E2E_FIREBASE_PROJECT_ID,
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
}

/** Mock BFF /favorites (y alias /favoritos) aislado por usuario. */
export async function mockBffFavoritesForUser(page: Page): Promise<{
  favoriteIds: Set<string>;
}> {
  const favoriteIds = new Set<string>();

  const handle = async (route: import("@playwright/test").Route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    let productId = url.searchParams.get("productId")?.trim() ?? "";

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders() });
      return;
    }

    if (method === "GET") {
      if (productId) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: corsHeaders(),
          body: JSON.stringify({ isFavorite: favoriteIds.has(productId) }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: corsHeaders(),
        body: JSON.stringify({ productIds: [...favoriteIds] }),
      });
      return;
    }

    if (method === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        productId?: string;
        action?: string;
        remove?: boolean;
      };
      productId = String(body.productId ?? productId).trim();
      if (!productId) {
        await route.fulfill({ status: 400, headers: corsHeaders(), body: JSON.stringify({ error: "Producto invalido" }) });
        return;
      }
      if (body.action === "remove" || body.remove === true) {
        favoriteIds.delete(productId);
      } else {
        favoriteIds.add(productId);
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: corsHeaders(),
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    if (method === "DELETE") {
      if (productId) favoriteIds.delete(productId);
      else favoriteIds.clear();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: corsHeaders(),
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    await route.fulfill({ status: 405, headers: corsHeaders(), body: JSON.stringify({ error: "Metodo no permitido" }) });
  };

  await page.route(/\/favorites(\?.*)?$/i, handle);
  await page.route(/\/favoritos(\?.*)?$/i, handle);

  return { favoriteIds };
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}
