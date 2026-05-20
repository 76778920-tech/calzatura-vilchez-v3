/**
 * Duplica mocks de datos admin en BFF y Supabase REST.
 * Tras RLS/BFF, fetchProducts/fetchAllOrders/fetchAllUsers usan VITE_BACKEND_API_URL.
 */
import type { Page } from "@playwright/test";
import { FAKE_ADMIN_EMAIL, FAKE_ADMIN_UID } from "./e2eAuthConstants";

export const DEFAULT_ADMIN_PROFILE = {
  uid: FAKE_ADMIN_UID,
  nombre: "Admin E2E",
  email: FAKE_ADMIN_EMAIL,
  rol: "admin",
  creadoEn: "2024-01-01T00:00:00.000Z",
};

export async function mirrorAdminProducts(page: Page, products: unknown[]): Promise<void> {
  const listBody = JSON.stringify(products);

  await page.route(/\/admin\/products\/[^/?]+/i, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const id = decodeURIComponent(route.request().url().match(/\/admin\/products\/([^/?]+)/i)?.[1] ?? "");
    const product = (products as { id?: string }[]).find((p) => p.id === id);
    await route.fulfill({
      status: product ? 200 : 404,
      contentType: "application/json",
      body: JSON.stringify(product ? { product } : { error: "not found" }),
    });
  });

  await page.route(/\/admin\/products\/?(\?.*)?$/i, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products }),
    });
  });

  await page.route("**/rest/v1/productos*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: listBody });
      return;
    }
    if (method === "PATCH" || method === "POST" || method === "DELETE") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
}

export async function mirrorAdminOrders(page: Page, orders: unknown[]): Promise<void> {
  const body = JSON.stringify(orders);

  await page.route(/\/admin\/orders\/?(\?.*)?$/i, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ orders }),
    });
  });

  await page.route("**/rest/v1/pedidos*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body });
      return;
    }
    if (method === "PATCH") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });
}

export async function mirrorAdminUsers(page: Page, users: unknown[]): Promise<void> {
  const body = JSON.stringify(users);

  await page.route(/\/admin\/users\/?(\?.*)?$/i, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ users }),
    });
  });

  await page.route("**/rest/v1/usuarios*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      const url = route.request().url();
      if (url.includes("uid=eq.")) {
        const uid = decodeURIComponent(url.match(/uid=eq\.([^&]+)/)?.[1] ?? "");
        const row = (users as { uid?: string }[]).find((u) => u.uid === uid) ?? users[0];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(row ? [row] : []),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body });
      return;
    }
    await route.fallback();
  });
}

export async function mirrorAdminProductFinanzas(page: Page, rows: unknown[]): Promise<void> {
  const body = JSON.stringify(rows);

  await page.route(/\/admin\/productFinanzas\/?(\?.*)?$/i, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows }),
    });
  });

  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body });
      return;
    }
    if (method === "PATCH" || method === "POST" || method === "DELETE") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    await route.fallback();
  });
}

export async function mirrorAdminProductCodigos(page: Page, rows: unknown[]): Promise<void> {
  const codesMap = (rows as { productoId?: string; codigo?: string }[]).reduce<Record<string, string>>(
    (acc, row) => {
      if (row.productoId && row.codigo) {
        acc[row.productoId] = row.codigo;
      }
      return acc;
    },
    {},
  );

  await page.route(/\/admin\/productCodes\/?(\?.*)?$/i, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ codes: codesMap }),
    });
  });

  const body = JSON.stringify(rows);
  await page.route("**/rest/v1/productoCodigos*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body });
      return;
    }
    await route.fallback();
  });
}

export async function mirrorAdminVentasDiarias(page: Page, sales: unknown[]): Promise<void> {
  const body = JSON.stringify(sales);

  await page.route(/\/admin\/dailySales\/?(\?.*)?$/i, async (route) => {
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

  await page.route("**/rest/v1/ventasDiarias*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body });
      return;
    }
    await route.fallback();
  });
}

/** Perfil autenticado vía BFF (AuthContext, perfil, admin usuarios). */
export async function mirrorUsersMe(
  page: Page,
  profile: Record<string, unknown> = DEFAULT_ADMIN_PROFILE,
  opts?: { patchStatus?: number; patchError?: string },
): Promise<void> {
  await page.route(/\/users\/me\/?(\?.*)?$/i, async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ profile }),
      });
      return;
    }
    if (method === "PATCH" || method === "PUT") {
      const status = opts?.patchStatus ?? 200;
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(
          status >= 400 ? { error: opts?.patchError ?? "Error" } : { ok: true, profile },
        ),
      });
      return;
    }
    await route.fallback();
  });
}

/** Defaults vacíos + perfil admin (llamar desde injectFakeAdminAuth). */
export async function installDefaultAdminDataMirrors(page: Page): Promise<void> {
  await mirrorUsersMe(page);
  await mirrorAdminProducts(page, []);
  await mirrorAdminOrders(page, []);
  await mirrorAdminUsers(page, [DEFAULT_ADMIN_PROFILE]);
  await mirrorAdminProductFinanzas(page, []);
  await mirrorAdminProductCodigos(page, []);
  await mirrorAdminVentasDiarias(page, []);
}

/** Lista de productos en admin + recarga (patrón común en specs de productos). */
export async function mirrorAdminProductListSetup(
  page: Page,
  products: unknown[],
  opts?: { codigos?: unknown[]; finanzas?: unknown[] },
): Promise<void> {
  await mirrorAdminProducts(page, products);
  await mirrorAdminProductCodigos(page, opts?.codigos ?? []);
  await mirrorAdminProductFinanzas(page, opts?.finanzas ?? []);
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("table tbody tr", { timeout: 10_000 });
}

/**
 * Lista admin con respuesta distinta en cada GET (p. ej. tras guardar → recargar).
 * Mantiene BFF + REST + detalle por id alineados con el último listado servido.
 */
export async function mirrorAdminProductsListResolver(
  page: Page,
  resolver: (listFetchIndex: number) => unknown[],
): Promise<void> {
  let listFetchIndex = 0;
  let lastProducts: unknown[] = [];

  const syncProducts = () => {
    listFetchIndex += 1;
    lastProducts = resolver(listFetchIndex);
  };

  await page.route(/\/admin\/products\/?(\?.*)?$/i, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    syncProducts();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products: lastProducts }),
    });
  });

  await page.route(/\/admin\/products\/[^/?]+/i, async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    const id = decodeURIComponent(route.request().url().match(/\/admin\/products\/([^/?]+)/i)?.[1] ?? "");
    const product = (lastProducts as { id?: string }[]).find((p) => p.id === id);
    await route.fulfill({
      status: product ? 200 : 404,
      contentType: "application/json",
      body: JSON.stringify(product ? { product } : { error: "not found" }),
    });
  });

  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    if (listFetchIndex === 0) syncProducts();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(lastProducts),
    });
  });
}

/** PATCH /admin/users/:uid/role — respuesta de permisos o éxito. */
export async function mirrorAdminUserRolePatch(
  page: Page,
  opts: { status?: number; error?: string } = {},
): Promise<void> {
  const status = opts.status ?? 200;
  await page.route(/\/admin\/users\/[^/]+\/role\/?$/i, async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.fallback();
      return;
    }
    if (status >= 400) {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify({
          error: opts.error ?? "new row violates row-level security policy",
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}
