/**
 * E2E: admin predicciones → tarjeta IRE y sparkline
 *
 * Semáforo:
 *   🟢 TC-IRE-001: la tarjeta IRE muestra score, nivel y dimensiones — VERIFICADO
 *   🟢 TC-IRE-002: el sparkline "Evolución IRE" se renderiza con datos históricos — VERIFICADO
 *   🟢 TC-IRE-003: la tarjeta IRE proyectado aparece cuando hay datos de proyección — VERIFICADO
 *   🟢 TC-IRE-004: el nivel del IRE proyectado refleja el campo nivel de la respuesta — VERIFICADO
 *   🟢 TC-IRE-005: sin datos de IRE no hay tarjeta hero visible — VERIFICADO
 *
 * Estrategia: mockear /api/predict/combined con respuestas controladas que
 * incluyan el bloque `ire` y `ire_proyectado`. Se usa injectFakeAdminAuth.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const MOCK_IRE_BAJO = {
  score: 18,
  nivel: "bajo",
  descripcion: "El riesgo empresarial es bajo. La operación está bajo control.",
  dimensiones: { riesgo_stock: 15, riesgo_ingresos: 20, riesgo_demanda: 18 },
  pesos: { riesgo_stock: 0.4, riesgo_ingresos: 0.35, riesgo_demanda: 0.25 },
  detalle: {
    total_productos: 5,
    productos_criticos: 0,
    productos_atencion: 1,
    total_con_historial: 4,
    total_sin_historial: 1,
  },
};

const MOCK_IRE_CRITICO = {
  score: 82,
  nivel: "critico",
  descripcion: "El riesgo empresarial es crítico. Requiere atención inmediata.",
  dimensiones: { riesgo_stock: 90, riesgo_ingresos: 75, riesgo_demanda: 80 },
  pesos: { riesgo_stock: 0.4, riesgo_ingresos: 0.35, riesgo_demanda: 0.25 },
  detalle: {
    total_productos: 5,
    productos_criticos: 4,
    productos_atencion: 1,
    total_con_historial: 5,
    total_sin_historial: 0,
  },
};

const MOCK_IRE_PROYECTADO = {
  score: 24,
  nivel: "bajo",
  horizonte_dias: 30,
  descripcion: "A 30 días el riesgo proyectado es bajo.",
  dimensiones: { riesgo_stock: 20, riesgo_ingresos: 25, riesgo_demanda: 22 },
  pesos: { riesgo_stock: 0.4, riesgo_ingresos: 0.35, riesgo_demanda: 0.25 },
  detalle: {
    total_productos: 5,
    productos_criticos: 0,
    productos_atencion: 0,
    total_con_historial: 4,
    total_sin_historial: 1,
  },
};

const MOCK_IRE_HISTORIAL = [
  { fecha: "2026-04-28", score: 20, nivel: "bajo" },
  { fecha: "2026-04-29", score: 22, nivel: "bajo" },
  { fecha: "2026-04-30", score: 19, nivel: "bajo" },
  { fecha: "2026-05-01", score: 21, nivel: "bajo" },
  { fecha: "2026-05-02", score: 18, nivel: "bajo" },
];

function buildCombinedResponse(opts: {
  ire?: typeof MOCK_IRE_BAJO | null;
  ire_proyectado?: typeof MOCK_IRE_PROYECTADO | null;
  ire_historial?: typeof MOCK_IRE_HISTORIAL | null;
}) {
  return {
    demand: {
      predictions: [
        {
          productId: "p-ire-001",
          codigo: "IRE-001",
          nombre: "Zapatilla IRE E2E",
          categoria: "hombre",
          precio: 150,
          stock_actual: 10,
          prediccion_unidades: 5,
          prediccion_diaria: 0.17,
          prediccion_semanal: 1.2,
          dias_hasta_agotarse: 59,
          tendencia: "estable",
          nivel_riesgo: "estable",
          alerta_stock: false,
          alta_demanda: false,
          sin_historial: false,
          feature_importance: [],
          ventas_semanales: [],
          revenue_projection: null,
          drift_score: null,
          riesgo_agotamiento: false,
          consumo_estimado_diario: 0.17,
        },
      ],
      model_version: "rf-v2",
      generated_at: "2026-05-04T12:00:00Z",
    },
    revenue: null,
    ire: opts.ire ?? null,
    ire_proyectado: opts.ire_proyectado ?? null,
    ire_historial: opts.ire_historial ?? null,
  };
}

async function setupAIMock(page: Page, response: object) {
  await page.route("**/api/predict/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });

  await page.route("**/api/cache/**", async (route) => {
    await route.fulfill({ status: 200, body: "{}" });
  });

  await page.route("**/api/ire/historial**", async (route) => {
    const historial = (response as { ire_historial?: unknown[] }).ire_historial ?? [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ days: 60, historial }),
    });
  });
}

async function goToPredictions(page: Page) {
  await page.goto("/admin/predicciones");
  await page.waitForLoadState("domcontentloaded");
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin predicciones → tarjeta IRE y sparkline", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) =>
      console.log(`[admin-ire] pageerror: ${err.message}`)
    );
    await injectFakeAdminAuth(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-IRE-001: tarjeta IRE muestra score, nivel y dimensiones
  // ──────────────────────────────────────────────────────────────────────────
  test("tarjeta IRE muestra score, nivel y dimensiones correctas (TC-IRE-001)", async ({ page }) => {
    const response = buildCombinedResponse({
      ire: MOCK_IRE_BAJO,
      ire_historial: MOCK_IRE_HISTORIAL,
    });
    await setupAIMock(page, response);
    await goToPredictions(page);

    // La tarjeta hero del IRE debe estar visible
    const ireHero = page.locator(".ire-hero");
    await expect(ireHero).toBeVisible({ timeout: 20_000 });

    // El score debe aparecer
    await expect(page.locator(".ire-score")).toHaveText(String(MOCK_IRE_BAJO.score));

    // El nivel debe estar como clase CSS
    await expect(ireHero).toHaveClass(/ire-hero-bajo/);

    // Las tres dimensiones deben aparecer
    await expect(page.locator(".ire-dim")).toHaveCount(3, { timeout: 5_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-IRE-002: sparkline se renderiza con historial
  // ──────────────────────────────────────────────────────────────────────────
  test("el sparkline 'Evolución IRE' se renderiza cuando hay historial (TC-IRE-002)", async ({ page }) => {
    const response = buildCombinedResponse({
      ire: MOCK_IRE_BAJO,
      ire_historial: MOCK_IRE_HISTORIAL,
    });
    await setupAIMock(page, response);
    await goToPredictions(page);

    await expect(page.locator(".ire-hero")).toBeVisible({ timeout: 20_000 });

    // El SVG del sparkline debe estar visible
    const sparkline = page.locator("svg.ire-sparkline-svg");
    await expect(sparkline).toBeVisible({ timeout: 10_000 });

    // La etiqueta de días debe aparecer
    await expect(page.locator(".ire-sparkline-label")).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-IRE-003: tarjeta IRE proyectado visible cuando hay datos
  // ──────────────────────────────────────────────────────────────────────────
  test("tarjeta IRE proyectado aparece cuando la respuesta incluye ire_proyectado (TC-IRE-003)", async ({ page }) => {
    const response = buildCombinedResponse({
      ire: MOCK_IRE_BAJO,
      ire_proyectado: MOCK_IRE_PROYECTADO,
      ire_historial: MOCK_IRE_HISTORIAL,
    });
    await setupAIMock(page, response);
    await goToPredictions(page);

    await expect(page.locator(".ire-hero")).toBeVisible({ timeout: 20_000 });

    // La tarjeta proyectada debe aparecer
    const proy = page.locator(".ire-proyectado-card");
    await expect(proy).toBeVisible({ timeout: 10_000 });

    // Debe mostrar el score proyectado
    await expect(page.locator(".ire-proy-score")).toHaveText(
      String(MOCK_IRE_PROYECTADO.score)
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-IRE-004: nivel proyectado refleja el nivel de la respuesta
  // ──────────────────────────────────────────────────────────────────────────
  test("el nivel del IRE proyectado crítico se refleja en la clase CSS (TC-IRE-004)", async ({ page }) => {
    const ireProyectadoCritico = {
      ...MOCK_IRE_PROYECTADO,
      score: 88,
      nivel: "critico",
      descripcion: "A 30 días el riesgo proyectado es crítico.",
    };
    const response = buildCombinedResponse({
      ire: MOCK_IRE_CRITICO,
      ire_proyectado: ireProyectadoCritico,
      ire_historial: MOCK_IRE_HISTORIAL,
    });
    await setupAIMock(page, response);
    await goToPredictions(page);

    await expect(page.locator(".ire-hero")).toBeVisible({ timeout: 20_000 });

    const proyCard = page.locator(".ire-proyectado-card");
    await expect(proyCard).toBeVisible({ timeout: 10_000 });

    // La clase debe incluir el nivel "critico"
    await expect(proyCard).toHaveClass(/ire-proyectado-critico/);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-IRE-005: sin datos de IRE la tarjeta hero no aparece
  // ──────────────────────────────────────────────────────────────────────────
  test("sin datos de IRE la tarjeta hero no aparece (TC-IRE-005)", async ({ page }) => {
    const response = buildCombinedResponse({
      ire: null,
      ire_proyectado: null,
      ire_historial: null,
    });
    await setupAIMock(page, response);
    await goToPredictions(page);

    // Esperar que la página cargue (tabla de predicciones)
    await expect(page.getByText("Zapatilla IRE E2E")).toBeVisible({ timeout: 20_000 });

    // La tarjeta hero del IRE no debe estar visible
    await expect(page.locator(".ire-hero")).not.toBeVisible();
  });
});
