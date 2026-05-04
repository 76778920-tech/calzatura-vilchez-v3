/**
 * E2E: AdminPredictions — timeout de cold start y carga exitosa.
 *
 * El servicio IA corre en Render (localhost:8000 en local).
 * Los tests mockean la ruta `/api/predict/combined` para evitar dependencia externa.
 *
 * TC-PRED-001: AbortError (timeout) → mensaje de cold start + botón Reintentar.
 * TC-PRED-002: Respuesta exitosa → tabla de predicciones renderizada con al menos 1 fila.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Respuesta mínima del endpoint /api/predict/combined ──────────────────────

const MOCK_COMBINED_RESPONSE = {
  demand: {
    predictions: [
      {
        productId: "p-e2e-001",
        codigo: "CV-E2E-001",
        nombre: "Zapatilla E2E Pred",
        categoria: "hombre",
        precio: 150,
        stock_actual: 10,
        prediccion_unidades: 5,
        prediccion_diaria: 0.17,
        prediccion_semanal: 1.2,
        dias_hasta_agotarse: 59,
        tendencia: "estable",
        nivel_riesgo: "ok",
        alerta_stock: false,
        alta_demanda: false,
        sin_historial: false,
        feature_importance: [],
        ventas_semanales: [],
        revenue_projection: null,
        drift_score: null,
      },
    ],
    model_version: "rf-v2",
    generated_at: "2026-05-03T12:00:00Z",
  },
  revenue: null,
};

// ─── Setup helpers ────────────────────────────────────────────────────────────

/** Mockea la ruta del servicio IA para que devuelva un AbortError (timeout). */
async function setupAITimeout(page: Page) {
  // Una ruta que nunca responde provoca el AbortError del controller interno (45 s).
  // Para no esperar 45 s en tests, hacemos que la ruta cuelgue y luego Playwright
  // la cancela cuando finaliza el test, pero aquí simulamos el abort rechazando
  // la petición con un network error equivalente.
  await page.route("**/api/predict/**", async (route) => {
    await route.abort("timedout");
  });

  await page.route("**/api/cache/**", async (route) => {
    await route.fulfill({ status: 200, body: "{}" });
  });
}

/** Mockea la ruta del servicio IA para que devuelva datos válidos. */
async function setupAISuccess(page: Page) {
  await page.route("**/api/predict/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_COMBINED_RESPONSE),
    });
  });

  await page.route("**/api/cache/**", async (route) => {
    await route.fulfill({ status: 200, body: "{}" });
  });
}

async function goToPredictions(page: Page) {
  await page.goto("/admin/predicciones");
  await page.waitForLoadState("domcontentloaded");
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin predicciones → cold start y carga exitosa", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-predictions] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-PRED-001: timeout → mensaje de cold start
  // ──────────────────────────────────────────────────────────────────────────
  test("timeout del servicio IA muestra mensaje de cold start y botón Reintentar (TC-PRED-001)", async ({ page }) => {
    await setupAITimeout(page);
    await goToPredictions(page);

    // El mensaje de AbortError menciona "tardó demasiado" o "primera carga del día"
    await expect(
      page.getByText(/tardó demasiado|primera carga del día|Reintentar/i).first()
    ).toBeVisible({ timeout: 20_000 });

    await expect(page.getByRole("button", { name: /Reintentar/i }).first()).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-PRED-002: respuesta exitosa → tabla con filas de predicción
  // ──────────────────────────────────────────────────────────────────────────
  test("respuesta exitosa del servicio IA renderiza la predicción en tabla (TC-PRED-002)", async ({ page }) => {
    await setupAISuccess(page);
    await goToPredictions(page);

    // El nombre del producto del mock debe aparecer en la tabla
    await expect(page.getByText("Zapatilla E2E Pred")).toBeVisible({ timeout: 20_000 });
  });
});
