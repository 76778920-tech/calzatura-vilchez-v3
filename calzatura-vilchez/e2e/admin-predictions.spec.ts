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
        stock_actual: 1,
        prediccion_unidades: 15,
        prediccion_diaria: 2.1,
        prediccion_semanal: 14.7,
        dias_hasta_agotarse: 3,
        tendencia: "subiendo",
        nivel_riesgo: "critico",
        alerta_stock: true,
        alta_demanda: true,
        sin_historial: false,
        feature_importance: [],
        ventas_semanales: [],
        revenue_projection: null,
        drift_score: null,
      },
    ],
    model_version: "rf-v2",
    generated_at: "2026-05-03T12:00:00Z",
    modelo_meta: {
      n_samples: 90,
      n_products: 1,
      date_range_start: "2026-04-01",
      date_range_end: "2026-05-01",
      random_state: 42,
      sklearn_version: "1.5.0",
      feature_cols: ["weekday", "month", "day_of_month", "lag_7", "lag_30", "categoria", "campana", "temporada_escolar"],
      feature_importances: [
        { feature: "campana", importance: 0.21 },
        { feature: "temporada_escolar", importance: 0.13 },
      ],
      feature_stats: { lag_7: { mean: 2, std: 0.5 }, lag_30: { mean: 1.8, std: 0.4 } },
      seasonality_features: ["temporada_verano", "temporada_escolar", "temporada_fiestas_patrias", "temporada_navidad"],
      campaign_values: ["nueva-temporada"],
      data_hash: "abc123def4567890",
      model_type: "random_forest",
    },
  },
  revenue: null,
  ire: {
    score: 38,
    nivel: "moderado",
    descripcion: "IRE de prueba para contrato visual.",
    version: "1.1.0",
    definicion: "Índice proxy de 0 a 100 que resume el riesgo empresarial comercial-operativo.",
    formula: "IRE = riesgo_stock * 0.40 + riesgo_ingresos * 0.35 + riesgo_demanda * 0.25",
    horizonte_dias: null,
    dimensiones: { riesgo_stock: 40, riesgo_ingresos: 45, riesgo_demanda: 25 },
    pesos: { riesgo_stock: 0.4, riesgo_ingresos: 0.35, riesgo_demanda: 0.25 },
    variables: [
      {
        codigo: "riesgo_stock",
        nombre: "Riesgo de stock",
        peso: 0.4,
        valor: 40,
        contribucion_score: 16,
        descripcion: "Presión del inventario.",
        fuente: "Predicción de demanda e inventario.",
        indicadores: ["productos_criticos", "total_con_historial"],
      },
      {
        codigo: "riesgo_ingresos",
        nombre: "Riesgo de ingresos",
        peso: 0.35,
        valor: 45,
        contribucion_score: 16,
        descripcion: "Presión de ingresos.",
        fuente: "Proyección de ingresos.",
        indicadores: ["tendencia_ingresos"],
      },
      {
        codigo: "riesgo_demanda",
        nombre: "Riesgo de demanda",
        peso: 0.25,
        valor: 25,
        contribucion_score: 6,
        descripcion: "Cambios de demanda.",
        fuente: "Predicción por producto.",
        indicadores: ["productos_bajando"],
      },
    ],
    detalle: {
      productos_criticos: 0,
      productos_atencion: 0,
      productos_vigilancia: 0,
      productos_sin_stock: 0,
      productos_bajando: 0,
      alta_demanda_bajo_stock: 0,
      productos_drift_alto: 0,
      total_con_historial: 1,
      total_sin_historial: 0,
    },
  },
  ire_proyectado: {
    score: 40,
    nivel: "moderado",
    descripcion: "IRE proyectado de prueba.",
    version: "1.1.0",
    definicion: "Índice proxy de 0 a 100 que resume el riesgo empresarial comercial-operativo.",
    formula: "IRE = riesgo_stock * 0.40 + riesgo_ingresos * 0.35 + riesgo_demanda * 0.25",
    horizonte_dias: 30,
    dimensiones: { riesgo_stock: 45, riesgo_ingresos: 45, riesgo_demanda: 25 },
    pesos: { riesgo_stock: 0.4, riesgo_ingresos: 0.35, riesgo_demanda: 0.25 },
    variables: [],
    detalle: {
      productos_criticos: 0,
      productos_atencion: 0,
      productos_vigilancia: 0,
      productos_sin_stock: 0,
      total_con_historial: 1,
      total_sin_historial: 0,
    },
  },
  warnings: [],
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

  await page.route("**/api/ire/historial**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ historial: [], days: 60 }) });
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

  await page.route("**/api/ire/historial**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        days: 60,
        historial: [
          { fecha: "2026-05-05", score: 37, nivel: "moderado", version: "1.1.0", detalle: { total_con_historial: 1 } },
          { fecha: "2026-05-06", score: 38, nivel: "moderado", version: "1.1.0", detalle: { total_con_historial: 1 } },
        ],
      }),
    });
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
    await expect(page.locator(".pred-alert-name").getByText("Zapatilla E2E Pred", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Índice de Riesgo Empresarial")).toBeVisible();
    await expect(page.getByText("Recomendaciones automáticas priorizadas")).toBeVisible();
    await expect(page.getByText("Prioriza este producto en el siguiente pedido.")).toBeVisible();
    await page.getByRole("tab", { name: /Detalle IRE/i }).click();
    await expect(page.getByText("Variables del riesgo empresarial")).toBeVisible();
    await expect(page.getByText("IRE = riesgo_stock * 0.40")).toBeVisible();
    await page.getByRole("tab", { name: /Modelo IA/i }).click();
    await expect(page.getByText("Temporadas y campañas incorporadas")).toBeVisible();
    await expect(page.getByText("Campaña: nueva-temporada")).toBeVisible();
    await expect(page.locator(".ire-variable-tags span", { hasText: "Inicio escolar" })).toBeVisible();
  });
});
