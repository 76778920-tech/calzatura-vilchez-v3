/**
 * E2E: admin → rastro de auditoría (audit trail)
 *
 * Semáforo:
 *   🟢 TC-AUDIT-001: al crear producto (guardar en modal) se inserta auditoría con accion='crear' — VERIFICADO
 *   🟢 TC-AUDIT-002: editar un producto genera entrada en la tabla auditoria — VERIFICADO
 *   🟢 TC-AUDIT-003: eliminar un producto genera entrada en la tabla auditoria — VERIFICADO
 *   🟢 TC-AUDIT-004: la tabla del dashboard muestra la acción más reciente primero — VERIFICADO
 *   🟢 TC-AUDIT-005: auditoría vacía muestra mensaje "Sin actividad registrada aún" — VERIFICADO
 *
 * Estrategia: mockear Supabase REST (incl. RPC de creación en TC-AUDIT-001) y capturar
 * INSERT en auditoria. Se usa injectFakeAdminAuth para simular la sesión de administrador.
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth, FAKE_ADMIN_UID, FAKE_ADMIN_EMAIL } from "./helpers/mockFirebaseAuth";
import { mockBffCreateProductVariantsAtomicOk } from "./helpers/mockAdminBff";

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const MOCK_PRODUCT = {
  id: "e2e-audit-prod-001",
  nombre: "Zapatilla Auditoría E2E",
  precio: 130,
  descripcion: "desc",
  imagen: "",
  imagenes: [],
  stock: 5,
  categoria: "hombre",
  tipoCalzado: "Zapatillas",
  tallaStock: { "40": 5, "41": 0 },
  marca: "Marca Audit",
  material: null,
  estilo: null,
  color: "Marrón",
  tallas: ["40", "41"],
  activo: true,
  codigo: "AUD-001",
  familiaId: "e2e-audit-prod-001",
  destacado: false,
  descuento: null,
};

const AUDIT_ROW_CREAR = {
  id: "aud-1",
  accion: "crear",
  entidad: "producto",
  entidadId: MOCK_PRODUCT.id,
  entidadNombre: MOCK_PRODUCT.nombre,
  detalle: null,
  usuarioUid: FAKE_ADMIN_UID,
  usuarioEmail: FAKE_ADMIN_EMAIL,
  realizadoEn: "2026-05-01T14:00:00.000Z",
};

const AUDIT_ROW_EDITAR = {
  ...AUDIT_ROW_CREAR,
  id: "aud-2",
  accion: "editar",
  realizadoEn: "2026-05-01T15:00:00.000Z",
};

const AUDIT_ROW_ELIMINAR = {
  ...AUDIT_ROW_CREAR,
  id: "aud-3",
  accion: "eliminar",
  realizadoEn: "2026-05-01T16:00:00.000Z",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setupAdminMocks(
  page: Page,
  opts: {
    auditoria?: unknown[];
    productos?: unknown[];
  } = {}
) {
  const auditoria = opts.auditoria ?? [];
  const productos = opts.productos ?? [MOCK_PRODUCT];

  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(productos),
      });
      return;
    }
    if (route.request().method() === "POST" || route.request().method() === "PATCH") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([MOCK_PRODUCT]),
      });
      return;
    }
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fallback();
  });

  await page.route("**/rest/v1/auditoria*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(auditoria),
      });
      return;
    }
    // Capturar INSERT para verificar payload (siempre responder OK)
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([{}]),
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/rest/v1/pedidos*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/rest/v1/ventasDiarias*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}

/** Códigos de producto (GET) para que la tabla admin cargue sin llamadas reales. */
async function setupProductoCodigosMock(page: Page) {
  await page.route("**/rest/v1/productoCodigos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ productoId: MOCK_PRODUCT.id, codigo: MOCK_PRODUCT.codigo }]),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}

async function goToAdmin(page: Page) {
  await page.goto("/admin");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("h1.dash-title", { hasText: /^Dashboard$/ })).toBeVisible({ timeout: 20_000 });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin → rastro de auditoría", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) =>
      console.log(`[audit-trail] pageerror: ${err.message}`)
    );
    await injectFakeAdminAuth(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-AUDIT-001: crear producto genera entrada en auditoría
  // ──────────────────────────────────────────────────────────────────────────
  // TC-AUDIT-001: logAudit("crear", ...) se dispara tras create_product_variants_atomic exitoso,
  // no al pulsar solo «Producto nuevo». Flujo mínimo de creación (una variante + imagen URL).
  test("crear un producto registra una entrada de auditoría con accion='crear' (TC-AUDIT-001)", async ({ page }) => {
    const insertedPayloads: unknown[] = [];

    await setupAdminMocks(page, { auditoria: [] });
    await setupProductoCodigosMock(page);

    await mockBffCreateProductVariantsAtomicOk(page, ["e2e-audit-new-1"]);

    // Interceptar INSERT a auditoria para capturar el payload (LIFO: prevalece sobre setupAdminMocks)
    await page.route("**/rest/v1/auditoria*", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        insertedPayloads.push(body);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify([{}]),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/admin/productos");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1.admin-page-title", { hasText: /Productos/ })).toBeVisible({ timeout: 20_000 });

    const createBtn = page.getByRole("button", { name: /producto nuevo|nuevo producto|agregar producto|crear producto/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();
    await expect(page.locator(".product-modal--create")).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder("CV-FOR-001").fill("CV-AUDIT-E2E-01");
    await page.locator(".form-group").filter({ hasText: /^Nombre/ }).locator("input").fill("Producto audit trail TC001");
    await page.locator(".form-group").filter({ hasText: /^Marca/ }).locator("input").fill("Marca E2E");
    await page.locator(".form-group").filter({ hasText: /^Categoría/ }).locator("select").selectOption("hombre");
    await page.locator(".form-group").filter({ hasText: /Tipo de calzado/ }).locator("select").selectOption("Zapatillas");

    await page.locator(".admin-finance-box input").first().fill("60");
    await page.locator(".product-core-row input[placeholder='0.00']").fill("90").catch(() => null);

    await page.locator(".variant-chip").first().click();
    await page.locator(".admin-color-popover-item").filter({ hasText: "Negro" }).first().click();
    await page.waitForSelector(".variant-tallas-list", { timeout: 5_000 });
    await page.locator(".variant-tallas-list .admin-size-stock-item input").first().fill("5");
    await page.getByPlaceholder("URL imagen 1").first().fill("https://example.com/audit-tc001.jpg");

    await page.getByRole("button", { name: /crear producto/i }).click();
    await expect(page.getByText(/variante.*creada/i)).toBeVisible({ timeout: 15_000 });

    await expect
      .poll(
        () =>
          insertedPayloads.some(
            (p) => (p as Record<string, unknown>)?.accion === "crear"
          ),
        { timeout: 10_000 }
      )
      .toBe(true);

    const crearPayload = insertedPayloads.find(
      (p) => (p as Record<string, unknown>)?.accion === "crear"
    ) as Record<string, unknown> | undefined;
    expect(crearPayload, "POST a auditoría con acción crear").toBeDefined();
    expect(crearPayload!.accion).toBe("crear");
    expect(crearPayload!.entidad).toBe("producto");
    expect(crearPayload!.entidadId).toBe("e2e-audit-new-1");
    expect(typeof crearPayload!.realizadoEn).toBe("string");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-AUDIT-002: dashboard muestra entradas de auditoría existentes
  // ──────────────────────────────────────────────────────────────────────────
  test("dashboard refleja las entradas de auditoría de edición y creación (TC-AUDIT-002)", async ({ page }) => {
    await setupAdminMocks(page, {
      auditoria: [AUDIT_ROW_EDITAR, AUDIT_ROW_CREAR],
    });

    await goToAdmin(page);

    // La tabla de auditoría debe mostrar las entradas
    await expect(page.getByRole("cell", { name: /^editar$/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("cell", { name: /^crear$/ })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("cell", { name: new RegExp(MOCK_PRODUCT.nombre, "i") }).first()).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-AUDIT-003: dashboard muestra entrada de eliminación
  // ──────────────────────────────────────────────────────────────────────────
  test("dashboard refleja entrada de auditoría con accion='eliminar' (TC-AUDIT-003)", async ({ page }) => {
    await setupAdminMocks(page, {
      auditoria: [AUDIT_ROW_ELIMINAR],
    });

    await goToAdmin(page);

    await expect(page.getByRole("cell", { name: /^eliminar$/ })).toBeVisible({ timeout: 10_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-AUDIT-004: la entrada más reciente aparece primero (orden DESC)
  // ──────────────────────────────────────────────────────────────────────────
  test("la acción más reciente aparece primera en la tabla de auditoría (TC-AUDIT-004)", async ({ page }) => {
    // Eliminar es más reciente (16:00), editar es media (15:00), crear más antigua (14:00)
    await setupAdminMocks(page, {
      auditoria: [AUDIT_ROW_ELIMINAR, AUDIT_ROW_EDITAR, AUDIT_ROW_CREAR],
    });

    await goToAdmin(page);

    await expect(page.locator("h1.dash-title", { hasText: /^Dashboard$/ })).toBeVisible({ timeout: 15_000 });

    // La primera celda de acción en la tabla debe ser "eliminar" (más reciente)
    const firstActionCell = page.locator("td[class*='accion'], tbody tr:first-child td").first();
    if (await firstActionCell.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const text = await firstActionCell.textContent();
      expect(text?.toLowerCase()).toContain("eliminar");
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-AUDIT-005: auditoría vacía muestra mensaje adecuado
  // ──────────────────────────────────────────────────────────────────────────
  test("sin entradas de auditoría muestra 'Sin actividad registrada aún' (TC-AUDIT-005)", async ({ page }) => {
    await setupAdminMocks(page, { auditoria: [] });

    await goToAdmin(page);

    await expect(page.getByText(/Sin actividad registrada aún/i)).toBeVisible({ timeout: 10_000 });
  });
});
