/**
 * Mocks del servicio IA admin (`VITE_AI_SERVICE_URL` = origen Vite en E2E).
 * Centraliza rutas que antes se duplicaban en admin-predictions y admin-ire-dashboard.
 */
import type { Page } from "@playwright/test";

export type AdminAIMockOptions = {
  /** Respuesta de GET /api/predict/combined (y demás bajo /api/predict/*). */
  combined?: object;
  /** Historial para GET /api/ire/historial; por defecto usa combined.ire_historial o []. */
  ireHistorial?: unknown[];
  /** Simula cold-start (AbortError en la UI). */
  predictTimeout?: boolean;
};

export async function installAdminAIMocks(page: Page, opts: AdminAIMockOptions = {}): Promise<void> {
  if (opts.predictTimeout) {
    await page.route("**/api/predict/**", async (route) => {
      await route.abort("timedout");
    });
  } else if (opts.combined !== undefined) {
    await page.route("**/api/predict/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(opts.combined),
      });
    });
  }

  await page.route("**/api/cache/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route("**/api/ire/historial**", async (route) => {
    const url = new URL(route.request().url());
    const days = Number(url.searchParams.get("days") ?? "60");
    const fromCombined = (opts.combined as { ire_historial?: unknown[] } | undefined)?.ire_historial;
    const historial = opts.ireHistorial ?? fromCombined ?? [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ days, historial }),
    });
  });
}
