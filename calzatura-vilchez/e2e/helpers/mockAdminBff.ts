import type { Page } from "@playwright/test";

type Json = Record<string, unknown>;

type BffResult = { status: number; body?: unknown };

const BFF_ROUTE_PATTERNS = {
  updateProduct: /\/updateProductAtomic\/?(\?.*)?$/i,
  createVariants: /\/createProductVariantsAtomic\/?(\?.*)?$/i,
  deleteProduct: /\/deleteProductAtomic\/?(\?.*)?$/i,
  registrarIngreso: /\/registrarIngresoStock\/?(\?.*)?$/i,
  updateOrderStatus: /\/updateOrderStatus\/?(\?.*)?$/i,
  dailySales: /\/admin\/dailySales\/?(\?.*)?$/i,
} as const;

/** Evita ruido CORS/500 al invalidar cache del servicio IA tras guardar productos. */
export async function mockAICacheInvalidate(page: Page): Promise<void> {
  await page.route("**/api/cache/invalidate**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}

/**
 * Respuestas BFF exitosas por defecto (CI usa VITE_BACKEND_API_URL externo).
 * Los tests pueden registrar handlers más específicos después (LIFO: prevalecen).
 */
export async function installDefaultAdminBffMocks(page: Page): Promise<void> {
  await mockAICacheInvalidate(page);

  await page.route(BFF_ROUTE_PATTERNS.updateProduct, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = JSON.parse(route.request().postData() ?? "{}") as Json;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, id: body.p_id ?? "e2e-mock-product" }),
    });
  });

  await page.route(BFF_ROUTE_PATTERNS.createVariants, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, ids: ["e2e-mock-variant-1"] }),
    });
  });

  await page.route(BFF_ROUTE_PATTERNS.deleteProduct, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route(BFF_ROUTE_PATTERNS.registrarIngreso, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, cantidad: 4, tallaStock: { "40": 13, "41": 6 } }),
    });
  });

  await page.route(BFF_ROUTE_PATTERNS.updateOrderStatus, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route(BFF_ROUTE_PATTERNS.dailySales, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sales: [] }),
    });
  });
}

export async function mockBffUpdateProductAtomic(
  page: Page,
  handler: (body: Json) => BffResult | Promise<BffResult>,
): Promise<void> {
  await mockAICacheInvalidate(page);
  await page.route(BFF_ROUTE_PATTERNS.updateProduct, async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as Json;
    const result = await handler(body);
    await route.fulfill({
      status: result.status,
      contentType: "application/json",
      body: JSON.stringify(result.body ?? { ok: true }),
    });
  });
}

export async function mockBffUpdateProductAtomicOk(
  page: Page,
  onBody?: (body: Json) => void,
): Promise<void> {
  await mockBffUpdateProductAtomic(page, (body) => {
    onBody?.(body);
    return { status: 200, body: { ok: true, id: body.p_id } };
  });
}

export async function mockBffUpdateProductAtomicError(
  page: Page,
  status: number,
  errorMessage: string,
  onBody?: (body: Json) => void,
): Promise<void> {
  await mockBffUpdateProductAtomic(page, (body) => {
    onBody?.(body);
    return { status, body: { error: errorMessage } };
  });
}

export async function mockBffCreateProductVariantsAtomic(
  page: Page,
  handler: (body: Json) => BffResult | Promise<BffResult>,
): Promise<void> {
  await mockAICacheInvalidate(page);
  await page.route(BFF_ROUTE_PATTERNS.createVariants, async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as Json;
    const result = await handler(body);
    await route.fulfill({
      status: result.status,
      contentType: "application/json",
      body: JSON.stringify(result.body ?? { ok: true, ids: [] }),
    });
  });
}

export async function mockBffCreateProductVariantsAtomicOk(
  page: Page,
  ids: string[],
  onBody?: (body: Json) => void,
): Promise<void> {
  await mockBffCreateProductVariantsAtomic(page, (body) => {
    onBody?.(body);
    return { status: 200, body: { ok: true, ids } };
  });
}

export async function mockBffDeleteProductAtomic(page: Page, onCall?: () => void): Promise<void> {
  await mockAICacheInvalidate(page);
  await page.route(BFF_ROUTE_PATTERNS.deleteProduct, async (route) => {
    onCall?.();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

export async function mockBffRegistrarIngresoStock(
  page: Page,
  onBody?: (body: Json) => void,
  responseBody: Json = { ok: true, cantidad: 4, tallaStock: { "40": 13, "41": 6 } },
): Promise<void> {
  await mockAICacheInvalidate(page);
  await page.route(BFF_ROUTE_PATTERNS.registrarIngreso, async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as Json;
    onBody?.(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseBody),
    });
  });
}

export async function mockBffUpdateOrderStatus(page: Page, onCall?: () => void): Promise<void> {
  await page.route(BFF_ROUTE_PATTERNS.updateOrderStatus, async (route) => {
    onCall?.();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

/** Lectura de ventas diarias vía BFF (prioridad sobre Supabase en CI). */
export async function mockBffDailySales(page: Page, sales: unknown[]): Promise<void> {
  await page.route(BFF_ROUTE_PATTERNS.dailySales, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sales }),
    });
  });
}
