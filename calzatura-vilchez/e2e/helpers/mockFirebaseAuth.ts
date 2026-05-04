import type { Page } from "@playwright/test";

const FIREBASE_PROJECT_ID = "calzaturavilchez-ab17f";
export const FAKE_ADMIN_EMAIL = "76778920@continental.edu.pe";
export const FAKE_ADMIN_UID = "e2e-admin-uid-001";

function b64url(data: string): string {
  return Buffer.from(data, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeFakeFirebaseJWT(): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "e2e-fake-kid" }));
  const payload = b64url(
    JSON.stringify({
      iss: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      aud: FIREBASE_PROJECT_ID,
      auth_time: 1700000000,
      user_id: FAKE_ADMIN_UID,
      sub: FAKE_ADMIN_UID,
      iat: 1700000000,
      exp: 9999999999,
      email: FAKE_ADMIN_EMAIL,
      email_verified: true,
      firebase: {
        identities: { email: [FAKE_ADMIN_EMAIL] },
        sign_in_provider: "password",
      },
    })
  );
  return `${header}.${payload}.e2e-fake-sig`;
}

/**
 * Moquea los endpoints de red de Firebase y Supabase para que los tests de
 * admin funcionen sin credenciales reales.
 *
 * La sesión del usuario admin proviene de e2e/.auth/admin.json (storageState),
 * que Playwright carga en localStorage antes de cada test. Firebase lee de
 * localStorage porque el servidor de desarrollo corre con VITE_E2E=true, lo
 * que activa browserLocalPersistence en src/firebase/config.ts.
 *
 * Esta función sólo necesita moquear los endpoints de red para:
 * 1. Evitar que Firebase invalide la sesión por token expirado (accounts:lookup).
 * 2. Responder al refresco de token si Firebase lo solicita.
 * 3. Devolver el perfil admin desde Supabase sin llamada real.
 */
export async function injectFakeAdminAuth(page: Page): Promise<void> {
  // Firebase puede hacer accounts:lookup en segundo plano para verificar el token.
  await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        kind: "identitytoolkit#GetAccountInfoResponse",
        users: [
          {
            localId: FAKE_ADMIN_UID,
            email: FAKE_ADMIN_EMAIL,
            emailVerified: true,
            displayName: "Admin E2E",
            validSince: "1700000000",
            disabled: false,
            lastLoginAt: "1700000000000",
            createdAt: "1700000000000",
            providerUserInfo: [
              {
                providerId: "password",
                federatedId: FAKE_ADMIN_EMAIL,
                email: FAKE_ADMIN_EMAIL,
                rawId: FAKE_ADMIN_EMAIL,
              },
            ],
          },
        ],
      }),
    });
  });

  // Firebase refresca el token cuando expirationTime está próximo o se fuerza.
  await page.route("**/securetoken.googleapis.com/**", async (route) => {
    const refreshedJWT = makeFakeFirebaseJWT();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: refreshedJWT,
        expires_in: "3600",
        token_type: "Bearer",
        refresh_token: "e2e-fake-refresh-token",
        id_token: refreshedJWT,
        user_id: FAKE_ADMIN_UID,
        project_id: FIREBASE_PROJECT_ID,
      }),
    });
  });

  // getUserProfile llama a Supabase usuarios. isSuperAdminEmail da acceso aunque
  // falle, pero moquear evita latencia de red en CI.
  await page.route("**/rest/v1/usuarios*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uid: FAKE_ADMIN_UID,
          nombre: "Admin E2E",
          email: FAKE_ADMIN_EMAIL,
          rol: "admin",
          creadoEn: "2024-01-01T00:00:00.000Z",
        }),
      });
      return;
    }
    await route.fallback();
  });
}
