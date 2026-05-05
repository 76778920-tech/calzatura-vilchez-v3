/**
 * E2E: catálogo → filtro por marca (popover)
 *
 * Semáforo:
 *   🟢 TC-MARCA-001: El botón de marca abre un popover con opciones — VERIFICADO
 *   🟢 TC-MARCA-002: Seleccionar una marca actualiza el parámetro de URL ?marcaSlug= — VERIFICADO
 *   🟢 TC-MARCA-003: El facet activo aparece como chip en la barra de filtros — VERIFICADO
 *   🟢 TC-MARCA-004: Limpiar el chip de marca borra el filtro de URL — VERIFICADO
 *
 * Estrategia: se mockea /rest/v1/productos para entregar un catálogo controlado
 * con dos marcas conocidas, de modo que los tests no dependan de datos reales.
 */
import { expect, test, type Page } from "@playwright/test";

const MOCK_PRODUCTS = [
  {
    id: "p-marca-001",
    nombre: "Zapatilla Adidas E2E",
    precio: 150,
    descripcion: "desc",
    imagen: "",
    imagenes: [],
    stock: 5,
    categoria: "hombre",
    color: "Negro",
    tallas: ["40", "41", "42"],
    marcaSlug: "adidas",
    marca: "Adidas",
    activo: true,
    codigo: "ADE-001",
  },
  {
    id: "p-marca-002",
    nombre: "Bota Nike E2E",
    precio: 200,
    descripcion: "desc",
    imagen: "",
    imagenes: [],
    stock: 3,
    categoria: "dama",
    color: "Blanco",
    tallas: ["36", "37"],
    marcaSlug: "nike",
    marca: "Nike",
    activo: true,
    codigo: "NK-002",
  },
];

async function setupCatalogMocks(page: Page) {
  await page.route("**/rest/v1/productos*", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PRODUCTS),
    });
  });
}

async function goToCatalog(page: Page) {
  await page.goto("/productos");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("main.products-page")).toBeVisible({ timeout: 20_000 });
}

test.describe("catálogo → filtro por marca (popover)", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (err) =>
      console.log(`[catalog-marca] pageerror: ${err.message}`)
    );
    await setupCatalogMocks(page);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-MARCA-001: el botón de marca abre el popover
  // ──────────────────────────────────────────────────────────────────────────
  test("botón Marca abre popover con lista de marcas (TC-MARCA-001)", async ({ page }) => {
    await goToCatalog(page);

    const marcaBtn = page.getByRole("button", { name: /marca/i }).first();
    await expect(marcaBtn).toBeVisible({ timeout: 15_000 });
    await marcaBtn.click();

    // El popover debe aparecer con opciones de marca
    const popover = page.locator("#catalog-marca-popover");
    await expect(popover).toBeVisible({ timeout: 8_000 });

    // Deben aparecer las marcas del mock
    await expect(popover.getByText(/adidas/i)).toBeVisible();
    await expect(popover.getByText(/nike/i)).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-MARCA-002: seleccionar marca y aplicar → URL contiene marcaSlug
  // ──────────────────────────────────────────────────────────────────────────
  test("seleccionar marca actualiza el parámetro marcaSlug en la URL (TC-MARCA-002)", async ({ page }) => {
    await goToCatalog(page);

    const marcaBtn = page.getByRole("button", { name: /marca/i }).first();
    await marcaBtn.click();

    const popover = page.locator("#catalog-marca-popover");
    await expect(popover).toBeVisible({ timeout: 8_000 });

    // Seleccionar "Adidas"
    await popover.getByLabel(/adidas/i).click();

    // Aplicar filtro
    const applyBtn = popover.getByRole("button", { name: /mostrar resultados/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // La URL debe reflejar el filtro
    await expect(page).toHaveURL(/marcaSlug=adidas/i, { timeout: 8_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-MARCA-003: facet activo aparece como chip
  // ──────────────────────────────────────────────────────────────────────────
  test("filtro activo de marca aparece como chip en la barra de facets (TC-MARCA-003)", async ({ page }) => {
    // Navegar directamente con el filtro aplicado en URL
    await page.goto("/productos?marcaSlug=nike");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 20_000 });

    // Debe aparecer un chip que mencione "nike" o "Nike"
    const facetBar = page.locator(".catalog-active-facets, [class*='facet']");
    await expect(facetBar.getByText(/nike/i).first()).toBeVisible({ timeout: 10_000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TC-MARCA-004: cerrar el chip elimina el filtro de URL
  // ──────────────────────────────────────────────────────────────────────────
  test("cerrar chip de marca elimina marcaSlug de la URL (TC-MARCA-004)", async ({ page }) => {
    await page.goto("/productos?marcaSlug=adidas");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 20_000 });

    // Buscar el botón de cerrar dentro del chip de la marca
    const closeBtn = page
      .locator(".catalog-active-facets button, [class*='facet'] button")
      .first();
    await expect(closeBtn).toBeVisible({ timeout: 10_000 });
    await closeBtn.click();

    // La URL ya no debe tener marcaSlug
    await expect(page).not.toHaveURL(/marcaSlug=/, { timeout: 8_000 });
  });
});
