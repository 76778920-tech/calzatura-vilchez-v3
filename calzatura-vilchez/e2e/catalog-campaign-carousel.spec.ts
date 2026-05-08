import { expect, test, type Page } from "@playwright/test";

const CATALOG_CAMPAIGN_ROTATION_MS = 9_000;
const CATALOG_CAMPAIGN_ANIMATION_MS = 720;

const MOCK_PRODUCTS = Array.from({ length: 14 }, (_, index) => ({
  id: `e2e-campaign-product-${index + 1}`,
  nombre: `Producto Campana E2E ${index + 1}`,
  precio: 119 + index,
  descripcion: "Producto controlado para mantener el catalogo con altura suficiente en pruebas.",
  imagen: "/placeholder-product.svg",
  imagenes: ["/placeholder-product.svg"],
  stock: 6,
  categoria: index % 3 === 0 ? "mujer" : index % 3 === 1 ? "hombre" : "nino",
  tipoCalzado: index % 2 === 0 ? "Zapatillas" : "Zapatos de Vestir",
  tallas: ["38", "39", "40", "41"],
  tallaStock: { "38": 2, "39": 2, "40": 1, "41": 1 },
  marca: "E2E Marca",
  material: "Cuero",
  estilo: "casual",
  color: index % 2 === 0 ? "Negro" : "Marron",
  familiaId: `e2e-campaign-family-${Math.floor(index / 2)}`,
  destacado: index < 4,
  activo: true,
  descuento: index % 5 === 0 ? 20 : undefined,
}));

type SlideSnapshot = {
  active: string | null;
  visible: Array<{
    className: string;
    opacity: number;
    imageLoaded: boolean;
    box: { width: number; height: number };
  }>;
  scrollY: number;
};

async function setupProductsMock(page: Page) {
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

async function openCatalog(page: Page) {
  await setupProductsMock(page);
  await page.goto("/productos");
  await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".catalog-campaign-track")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("a.product-card")).toHaveCount(MOCK_PRODUCTS.length, { timeout: 20_000 });
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>(".catalog-campaign-image"))
      .every((image) => image.complete && image.naturalWidth > 0)
  );
}

async function getCarouselSnapshot(page: Page): Promise<SlideSnapshot> {
  return page.evaluate(() => {
    const progress = document.querySelector<HTMLElement>(".catalog-campaign-progress");
    const slides = Array.from(document.querySelectorAll<HTMLElement>(".catalog-campaign-slide"));

    return {
      active: progress?.getAttribute("aria-valuenow") ?? null,
      visible: slides
        .map((slide) => {
          const style = window.getComputedStyle(slide);
          const image = slide.querySelector<HTMLImageElement>(".catalog-campaign-image");
          const box = slide.getBoundingClientRect();

          return {
            className: slide.className,
            opacity: Number(style.opacity),
            imageLoaded: Boolean(image?.complete && image.naturalWidth > 0),
            box: { width: box.width, height: box.height },
          };
        })
        .filter((slide) => slide.opacity > 0.01),
      scrollY: window.scrollY,
    };
  });
}

async function expectCampaignVisible(page: Page) {
  const snapshot = await getCarouselSnapshot(page);
  expect(snapshot.visible.length).toBeGreaterThanOrEqual(1);
  expect(snapshot.visible.every((slide) => slide.imageLoaded)).toBe(true);
  expect(snapshot.visible.every((slide) => slide.box.width > 300 && slide.box.height > 250)).toBe(true);
  return snapshot;
}

async function dragCampaignLeft(page: Page) {
  const track = page.locator(".catalog-campaign-track");
  const box = await track.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.72, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.32, y, { steps: 8 });
}

test.describe("catalogo: carrusel de campana", () => {
  test("mantiene imagen visible durante drag y avanza hacia la siguiente lamina", async ({ page }) => {
    await openCatalog(page);
    await expectCampaignVisible(page);

    await dragCampaignLeft(page);
    const duringDrag = await expectCampaignVisible(page);
    expect(duringDrag.active).toBe("1");
    expect(duringDrag.visible.length).toBeGreaterThanOrEqual(2);
    expect(duringDrag.visible.some((slide) => slide.className.includes("is-drag-target"))).toBe(true);

    await page.mouse.up();
    await expect.poll(async () => (await getCarouselSnapshot(page)).active).toBe("2");

    const duringTransition = await expectCampaignVisible(page);
    expect(duringTransition.visible.some((slide) => slide.className.includes("is-entering from-right"))).toBe(true);
    expect(duringTransition.visible.some((slide) => slide.className.includes("is-exiting to-left"))).toBe(true);

    await page.waitForTimeout(CATALOG_CAMPAIGN_ANIMATION_MS + 150);
    const afterTransition = await expectCampaignVisible(page);
    expect(afterTransition.active).toBe("2");
    expect(afterTransition.visible).toHaveLength(1);
  });

  test("en autoplay sigue hacia adelante al cerrar el loop y no devuelve la pagina al inicio", async ({ page }) => {
    await openCatalog(page);

    await dragCampaignLeft(page);
    await page.mouse.up();
    await expect.poll(async () => (await getCarouselSnapshot(page)).active).toBe("2");
    await page.waitForTimeout(CATALOG_CAMPAIGN_ANIMATION_MS + 150);

    await page.evaluate(() => window.scrollTo(0, 1_500));
    await expect.poll(async () => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBeGreaterThan(200);
    const scrollBeforeAutoplay = await page.evaluate(() => window.scrollY);

    await expect.poll(
      async () => (await getCarouselSnapshot(page)).active,
      { timeout: CATALOG_CAMPAIGN_ROTATION_MS + 2_000 }
    ).toBe("1");

    const duringLoopTransition = await expectCampaignVisible(page);
    expect(duringLoopTransition.visible.some((slide) => slide.className.includes("is-entering from-right"))).toBe(true);
    expect(duringLoopTransition.visible.some((slide) => slide.className.includes("is-exiting to-left"))).toBe(true);
    expect(duringLoopTransition.scrollY).toBeGreaterThan(200);

    await page.waitForTimeout(CATALOG_CAMPAIGN_ANIMATION_MS + 150);
    const afterAutoplay = await expectCampaignVisible(page);
    expect(afterAutoplay.active).toBe("1");
    expect(afterAutoplay.visible).toHaveLength(1);
    expect(afterAutoplay.scrollY).toBeGreaterThan(200);
    expect(Math.abs(afterAutoplay.scrollY - scrollBeforeAutoplay)).toBeLessThan(260);
  });
});

test.describe("catalogo: carrusel tactil", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("permite swipe con dedo en productos", async ({ page }) => {
    await openCatalog(page);
    const track = page.locator(".catalog-campaign-track");
    const box = await track.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const pointer = {
      pointerId: 7,
      pointerType: "touch",
      isPrimary: true,
      buttons: 1,
    };
    const y = box.y + box.height / 2;

    await track.dispatchEvent("pointerdown", { ...pointer, clientX: box.x + box.width * 0.78, clientY: y });
    await track.dispatchEvent("pointermove", { ...pointer, clientX: box.x + box.width * 0.36, clientY: y });

    const duringSwipe = await expectCampaignVisible(page);
    expect(duringSwipe.visible.some((slide) => slide.className.includes("is-drag-target"))).toBe(true);

    await track.dispatchEvent("pointerup", { ...pointer, buttons: 0, clientX: box.x + box.width * 0.36, clientY: y });
    await expect.poll(async () => (await getCarouselSnapshot(page)).active).toBe("2");

    await page.waitForTimeout(CATALOG_CAMPAIGN_ANIMATION_MS + 150);
    const afterSwipe = await expectCampaignVisible(page);
    expect(afterSwipe.active).toBe("2");
    expect(afterSwipe.visible).toHaveLength(1);
  });
});
