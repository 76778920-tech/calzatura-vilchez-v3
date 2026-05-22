/**
 * E2E: AdminSales — registro de venta y devolución con stock atómico.
 *
 * Cubre:
 * 1. Flujo completo: seleccionar producto → agregar línea → registrar venta
 *    → register_daily_sales_atomic llamado (TC-SALE-001).
 * 2. Cantidad mayor al stock disponible muestra toast de error sin llamar RPC
 *    (TC-SALE-002).
 * 3. Devolución sin motivo muestra toast de error sin llamar RPC (TC-SALE-003).
 * 4. Devolución con motivo llama return_daily_sale_atomic
 *    (TC-SALE-004).
 */
import { expect, test, type Page } from "@playwright/test";
import { FAKE_ADMIN_EMAIL, FAKE_ADMIN_UID, injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";
import { todayISO } from "./helpers/dates";
import {
  mockBffDailySales,
  mockBffRegisterDailySales,
  mockBffReturnDailySale,
} from "./helpers/mockAdminBff";
import {
  mirrorAdminProductCodigos,
  mirrorAdminProductFinanzas,
  mirrorAdminProducts,
} from "./helpers/mirrorAdminDataRoutes";

// ─── Datos semilla ────────────────────────────────────────────────────────────

const PRODUCT = {
  id: "prod-001",
  nombre: "Zapatilla Running",
  precio: 150,
  descripcion: "",
  imagen: "",
  imagenes: [],
  stock: 5,
  categoria: "hombre",
  tipoCalzado: "Zapatillas",
  tallas: ["40", "41", "42"],
  tallaStock: { "40": 2, "41": 2, "42": 1 },
  marca: "SportBrand",
  material: null,
  estilo: null,
  color: "Negro",
  familiaId: "fam-001",
  destacado: false,
  descuento: null,
  campana: null,
};

const FINANCIAL = {
  productId: "prod-001",
  costoCompra: 80,
  precioMinimo: 100,
  precioSugerido: 116,
  precioMaximo: 200,
  margenMinimo: 25,
  margenObjetivo: 45,
  margenMaximo: 150,
  actualizadoEn: "2026-05-02T00:00:00.000Z",
};

function buildSale() {
  return {
  id: "sale-001",
  productId: "prod-001",
  codigo: "SB-001",
  nombre: "Zapatilla Running",
  color: "Negro",
  talla: "41",
  fecha: todayISO(),
  cantidad: 1,
  precioVenta: 116,
  total: 116,
  costoUnitario: 80,
  costoTotal: 80,
  ganancia: 36,
  devuelto: false,
  documentoTipo: "ninguno",
  creadoEn: "2026-05-02T10:00:00.000Z",
  devueltoEn: null,
  motivoDevolucion: null,
  cliente: null,
  documentoNumero: null,
  encargadoUid: FAKE_ADMIN_UID,
  encargadoNombre: "Admin E2E",
  encargadoEmail: FAKE_ADMIN_EMAIL,
  canal: "tienda",
};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setupBaseMocks(page: Page) {
  await mockBffDailySales(page, []);
  await mirrorAdminProducts(page, [PRODUCT]);
  await mirrorAdminProductCodigos(page, [{ productoId: "prod-001", codigo: "SB-001" }]);
  await mirrorAdminProductFinanzas(page, [FINANCIAL]);

  await page.route("**/rest/v1/ventasDiarias*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      return;
    }
    // POST (addDailySale)
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ...buildSale(), id: "sale-new-001" }),
      });
      return;
    }
    await route.fallback();
  });
}


async function goToSales(page: Page) {
  await page.goto("/admin/ventas");
  await page.waitForLoadState("domcontentloaded");
  await page.getByPlaceholder("Escribe la marca").waitFor({ state: "visible", timeout: 15_000 });
}

async function selectProductInForm(page: Page) {
  await page.getByPlaceholder("Escribe la marca").fill("SportBrand");
  await page.getByPlaceholder("Escribe codigo o nombre").click();
  await page.getByPlaceholder("Escribe codigo o nombre").fill("Zapatilla");
  await page.locator(".product-suggestions-list button").first().click();
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin ventas → registro de venta y devolución", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-sales] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-SALE-001: flujo completo de venta — RPC de decremento llamado
  // ──────────────────────────────────────────────────────────────────────────
  test("registrar venta llama register_daily_sales_atomic (TC-SALE-001)", async ({ page }) => {
    await setupBaseMocks(page);
    const registeredPayload = await mockBffRegisterDailySales(page);
    const registerPost = page.waitForRequest(
      (req) => req.method() === "POST" && req.url().includes("/admin/dailySales/register"),
      { timeout: 15_000 },
    );

    await goToSales(page);
    await selectProductInForm(page);

    // Seleccionar talla 41
    await page.locator(".admin-size-choice").filter({ hasText: "41" }).click();

    // Precio y cantidad ya tienen valores por defecto (salePrice=precioSugerido, quantity=1)
    await page.getByRole("button", { name: /agregar al detalle/i }).click();
    await expect(page.getByText(/línea agregada/i)).toBeVisible({ timeout: 5_000 });

    // Registrar venta
    await page.getByRole("button", { name: /registrar venta completa/i }).click();
    await expect(page.getByText(/ventas registradas/i)).toBeVisible({ timeout: 8_000 });

    await registerPost;
    expect(registeredPayload()).toMatchObject({
      sales: [
        expect.objectContaining({
          encargadoUid: FAKE_ADMIN_UID,
          encargadoNombre: "Admin E2E",
          encargadoEmail: FAKE_ADMIN_EMAIL,
        }),
      ],
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-SALE-002: cantidad mayor al stock bloquea agregar la línea
  // ──────────────────────────────────────────────────────────────────────────
  test("cantidad mayor al stock muestra error y no agrega la línea (TC-SALE-002)", async ({ page }) => {
    await setupBaseMocks(page);
    const registeredPayload = await mockBffRegisterDailySales(page);

    await goToSales(page);
    await selectProductInForm(page);

    // Talla 42 tiene stock=1; intentamos 5
    await page.locator(".admin-size-choice").filter({ hasText: "42" }).click();
    await page.locator("input[type='number']").first().fill("5");

    await page.getByRole("button", { name: /agregar al detalle/i }).click();
    await expect(page.getByText(/supera el stock disponible/i)).toBeVisible({ timeout: 5_000 });

    expect(registeredPayload()).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-SALE-003: devolución sin motivo no llama RPC
  // ──────────────────────────────────────────────────────────────────────────
  test("devolución sin motivo muestra error y no llama return_daily_sale_atomic (TC-SALE-003)", async ({ page }) => {
    const sale = buildSale();
    await mirrorAdminProducts(page, [PRODUCT]);
    await mirrorAdminProductCodigos(page, []);
    await mirrorAdminProductFinanzas(page, []);
    await mockBffDailySales(page, [sale]);
    await page.route("**/rest/v1/ventasDiarias*", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([sale]) });
    });

    const wasReturned = await mockBffReturnDailySale(page);

    await goToSales(page);

    // Abrir modal de la venta existente
    await page.getByRole("button", { name: /ver detalle de venta/i }).first().click();
    await expect(page.locator(".sale-modal")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("dialog", { name: /detalle de venta/i })).toBeVisible();

    // No escribir motivo — hacer clic directo en "Confirmar devolución"
    await page.getByRole("button", { name: /confirmar devolución/i }).click();
    await expect(page.getByText(/motivo de la devolución/i)).toBeVisible({ timeout: 5_000 });

    expect(wasReturned()).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-SALE-004: devolución con motivo llama restore_product_stock
  // ──────────────────────────────────────────────────────────────────────────
  test("devolución con motivo llama return_daily_sale_atomic (TC-SALE-004)", async ({ page }) => {
    const sale = buildSale();
    await mirrorAdminProducts(page, [PRODUCT]);
    await mirrorAdminProductCodigos(page, []);
    await mirrorAdminProductFinanzas(page, []);
    await mockBffDailySales(page, [sale]);
    await page.route("**/rest/v1/ventasDiarias*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([sale]) });
        return;
      }
      // PATCH (markSaleReturned)
      await route.fulfill({ status: 204, body: "" });
    });

    const wasReturned = await mockBffReturnDailySale(page);

    await goToSales(page);

    // Abrir modal y completar devolución
    await page.getByRole("button", { name: /ver detalle de venta/i }).first().click();
    await expect(page.locator(".sale-modal")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("dialog", { name: /detalle de venta/i })).toBeVisible();

    await page.getByPlaceholder(/talla equivocada/i).fill("Talla equivocada, el cliente pidió una 42");
    await page.getByRole("button", { name: /confirmar devolución/i }).click();
    const returnDialog = page.getByRole("dialog", { name: /confirmar devolución/i });
    await expect(returnDialog).toBeVisible({ timeout: 5_000 });
    await returnDialog.getByRole("button", { name: /registrar devolución/i }).click();

    await expect(page.getByText("Devolución registrada y stock restaurado").first()).toBeVisible({
      timeout: 8_000,
    });

    expect(wasReturned()).toBe(true);
  });
});
