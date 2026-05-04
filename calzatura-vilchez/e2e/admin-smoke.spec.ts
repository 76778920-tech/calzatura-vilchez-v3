/**
 * E2E Smoke: verifica que cada ruta /admin/* carga su heading principal.
 *
 * Un smoke test "abre la ruta + comprueba un landmark" por módulo.
 * Usa un mock genérico de Supabase REST (GET → []) y del servicio IA (abort)
 * para que ningún test dependa de datos reales.
 *
 * TC-SMOKE-001 /admin              → "Dashboard"
 * TC-SMOKE-002 /admin/productos    → "Productos"
 * TC-SMOKE-003 /admin/pedidos      → "Pedidos"
 * TC-SMOKE-004 /admin/ventas       → "Consulta y registro de ventas"
 * TC-SMOKE-005 /admin/usuarios     → "Usuarios registrados"
 * TC-SMOKE-006 /admin/fabricantes  → "Fabricantes"
 * TC-SMOKE-007 /admin/predicciones → "Inteligencia Artificial"
 * TC-SMOKE-008 /admin/datos        → "Gestión de Datos Excel"
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Mock genérico ────────────────────────────────────────────────────────────

async function setupGenericMocks(page: Page) {
  // Todas las tablas Supabase devuelven array vacío en GET
  await page.route("**/rest/v1/**", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const url = route.request().url();
      // Usuarios: injectFakeAdminAuth ya registró una ruta; esta LIFO la sobreescribe
      // para el perfil uid=eq y para la lista completa
      await route.fulfill({ status: 200, contentType: "application/json", body: url.includes("uid=eq.") ? "[]" : "[]" });
      return;
    }
    // POST/PATCH/DELETE/etc. → pass-through o 204
    await route.fulfill({ status: 204, body: "" });
  });

  // Servicio IA: respuesta mínima exitosa para que AdminPredictions renderice su h1
  // (cuando hay error, el componente devuelve early con pred-error-card sin el h1)
  await page.route("**/api/predict/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ demand: { predictions: [], model_version: "rf-v2", generated_at: "2026-05-03T00:00:00Z" }, revenue: null }),
    });
  });
  await page.route("**/api/cache/**", async (route) => {
    await route.fulfill({ status: 200, body: "{}" });
  });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

const SMOKE_ROUTES: Array<{ id: string; path: string; heading: RegExp }> = [
  { id: "TC-SMOKE-001", path: "/admin",              heading: /^Dashboard$/ },
  { id: "TC-SMOKE-002", path: "/admin/productos",    heading: /^Productos$/ },
  { id: "TC-SMOKE-003", path: "/admin/pedidos",      heading: /^Pedidos/ },
  { id: "TC-SMOKE-004", path: "/admin/ventas",       heading: /Consulta y registro de ventas/i },
  { id: "TC-SMOKE-005", path: "/admin/usuarios",     heading: /Usuarios registrados/i },
  { id: "TC-SMOKE-006", path: "/admin/fabricantes",  heading: /^Fabricantes$/ },
  { id: "TC-SMOKE-007", path: "/admin/predicciones", heading: /Inteligencia Artificial/i },
  { id: "TC-SMOKE-008", path: "/admin/datos",        heading: /Gestión de Datos Excel/i },
];

test.describe("admin smoke — heading de cada ruta /admin/*", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-smoke] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
    await setupGenericMocks(page);
  });

  for (const { id, path, heading } of SMOKE_ROUTES) {
    test(`${id} — ${path} renderiza heading correcto`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 15_000 });
    });
  }
});
