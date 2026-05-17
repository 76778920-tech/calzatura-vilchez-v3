/**
 * E2E: campo campaña — trazabilidad en payload de edición y creación.
 *
 * Cubre:
 * 1. Editar producto con campaña "outlet" → payload update_product_atomic incluye campana="outlet"
 * 2. Crear variante con campaña "cyber-wow" → payload create_product_variants_atomic incluye campana="cyber-wow"
 */
import { expect, test, type Page } from "@playwright/test";
import { injectFakeAdminAuth } from "./helpers/mockFirebaseAuth";
import {
  mockBffCreateProductVariantsAtomicOk,
  mockBffUpdateProductAtomicOk,
} from "./helpers/mockAdminBff";

// ─── Datos semilla ─────────────────────────────────────────────────────────────

const SEED_ID = "e2e-camp-1";

const SEED_PRODUCT = {
  id: SEED_ID,
  nombre: "Zapato Campaña E2E",
  precio: 75,
  descripcion: "",
  imagen: "https://res.cloudinary.com/dnenqnvbg/image/upload/v1/seed.jpg",
  imagenes: ["https://res.cloudinary.com/dnenqnvbg/image/upload/v1/seed.jpg"],
  stock: 10,
  categoria: "hombre",
  tipoCalzado: "Zapatillas",
  tallas: ["40"],
  tallaStock: { "40": 10 },
  marca: "Marca Camp",
  material: null,
  estilo: null,
  color: "Negro",
  familiaId: SEED_ID,
  destacado: false,
  descuento: null,
  campana: null,
};

const SEED_CODE = { productoId: SEED_ID, codigo: "CV-CAMP-SEED", actualizadoEn: "2026-01-01" };

// costoCompra=60, márgenes 20/25/30 → rango [72, 78] → precio=75 válido.
const SEED_FINANCIAL = {
  productId: SEED_ID,
  costoCompra: 60,
  margenMinimo: 20,
  margenObjetivo: 25,
  margenMaximo: 30,
  precioMinimo: 72,
  precioSugerido: 75,
  precioMaximo: 78,
  actualizadoEn: "2026-01-01",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setupMocks(page: Page) {
  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([SEED_PRODUCT]) });
      return;
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/productoCodigos*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([SEED_CODE]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/rest/v1/productoFinanzas*", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([SEED_FINANCIAL]) });
      return;
    }
    await route.fallback();
  });
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("table tbody tr", { timeout: 10_000 });
}

// Selecciona el campo Campaña dentro del modal (único en el formulario).
const campanaSelect = (page: Page) =>
  page.locator(".form-group").filter({ hasText: /^Campaña/ }).locator("select");

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("admin productos → campo campaña en payload", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) => console.log(`[admin-campana] pageerror: ${err.message}`));
    await injectFakeAdminAuth(page);
    await page.goto("/admin/productos");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: /producto nuevo/i }).waitFor({ state: "visible", timeout: 15_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 1: edición — campana viaja en el payload del RPC
  // ──────────────────────────────────────────────────────────────────────────────
  test("editar producto con campaña outlet envía campana en el payload del RPC", async ({ page }) => {
    await setupMocks(page);

    let rpcBody: Record<string, unknown> | null = null;
    await mockBffUpdateProductAtomicOk(page, (body) => {
      rpcBody = body;
    });

    await page.locator(".admin-actions .edit-btn").first().click();
    await expect(page.getByRole("heading", { name: /editar producto/i })).toBeVisible({ timeout: 10_000 });

    await campanaSelect(page).selectOption("outlet");
    await page.getByRole("button", { name: /actualizar/i }).click();
    await expect(page.getByText("Producto actualizado")).toBeVisible({ timeout: 10_000 });

    expect(rpcBody).not.toBeNull();
    const product = (rpcBody as unknown as { product: { campana: string } }).product;
    expect(product.campana).toBe("outlet");
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test 2: creación — campana viaja en el payload del RPC de variantes
  // ──────────────────────────────────────────────────────────────────────────────
  test("crear variante con campaña cyber-wow envía campana en el payload del RPC", async ({ page }) => {
    await setupMocks(page);

    let rpcBody: Record<string, unknown> | null = null;
    await mockBffCreateProductVariantsAtomicOk(page, ["e2e-camp-new-1"], (body) => {
      rpcBody = body;
    });

    await page.getByRole("button", { name: /producto nuevo/i }).click();
    await expect(page.locator(".product-modal--create")).toBeVisible({ timeout: 10_000 });

    // Campos base requeridos
    await page.getByPlaceholder("CV-FOR-001").fill("CV-CAMP-NEW");
    await page.locator(".form-group").filter({ hasText: /^Nombre/ }).locator("input").fill("Zapato Campaña Test");
    await page.locator(".form-group").filter({ hasText: /^Marca/ }).locator("input").fill("Marca Test");
    await page.locator(".form-group").filter({ hasText: /^Categoría/ }).locator("select").selectOption("hombre");
    await page.locator(".form-group").filter({ hasText: /Tipo de calzado/ }).locator("select").selectOption("Zapatillas");

    // Financiero: costoCompra=60, márgenes default 25/45/75 → rango [75–105] → precio 90 válido.
    await page.locator(".admin-finance-box input").first().fill("60");
    await page.locator(".product-core-row input[placeholder='0.00']").fill("90").catch(() => null);

    // Campaña
    await campanaSelect(page).selectOption("cyber-wow");

    // Color 1 → Negro + stock + imagen
    await page.locator(".variant-chip").first().click();
    await page.locator(".admin-color-popover-item").filter({ hasText: "Negro" }).first().click();
    await page.waitForSelector(".variant-tallas-list", { timeout: 5_000 });
    await page.locator(".variant-tallas-list .admin-size-stock-item input").first().fill("5");
    await page.getByPlaceholder("URL imagen 1").first().fill("https://example.com/camp-test.jpg");

    await page.getByRole("button", { name: /crear producto/i }).click();
    await expect(page.getByText(/variante.*creada/i)).toBeVisible({ timeout: 10_000 });

    expect(rpcBody).not.toBeNull();
    const variants = (rpcBody as unknown as { variants: Array<{ campana: string }> }).variants;
    expect(variants[0]?.campana).toBe("cyber-wow");
  });
});
