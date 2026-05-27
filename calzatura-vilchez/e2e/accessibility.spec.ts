import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("WCAG 2.1 AA — auditoría automática", () => {
  test("Home page sin violaciones críticas", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1.home-title")).toBeVisible({ timeout: 30_000 });

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
      formatViolations(results.violations),
    ).toHaveLength(0);
  });

  test("Catálogo sin violaciones críticas", async ({ page }) => {
    await page.goto("/productos");
    await expect(page.locator("main.products-page")).toBeVisible({ timeout: 30_000 });

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
      formatViolations(results.violations),
    ).toHaveLength(0);
  });

  test("Login sin violaciones críticas", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("main.auth-page")).toBeVisible({ timeout: 15_000 });

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
      formatViolations(results.violations),
    ).toHaveLength(0);
  });

  test("Registro sin violaciones críticas", async ({ page }) => {
    await page.goto("/registro");
    await expect(page.locator("main.auth-page")).toBeVisible({ timeout: 15_000 });

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
      formatViolations(results.violations),
    ).toHaveLength(0);
  });

  test("Carrito sin violaciones críticas", async ({ page }) => {
    await page.goto("/carrito");
    await expect(
      page.getByRole("heading", { name: /carrito/i }).or(page.getByRole("heading", { name: /Mi Carrito/i })),
    ).toBeVisible({ timeout: 15_000 });

    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .analyze();

    expect(
      results.violations.filter((v) => v.impact === "critical" || v.impact === "serious"),
      formatViolations(results.violations),
    ).toHaveLength(0);
  });
});

function formatViolations(violations: { id: string; impact?: string; description: string; nodes: { html: string }[] }[]) {
  const blocking = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  const moderate = violations.filter((v) => v.impact === "moderate");
  const lines: string[] = [];
  if (blocking.length) {
    lines.push("=== BLOCKING ===");
    for (const v of blocking) lines.push(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodo(s))`);
  }
  if (moderate.length) {
    lines.push("=== MODERATE (no bloquean, pero revisar) ===");
    for (const v of moderate) lines.push(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodo(s))`);
  }
  return lines.join("\n");
}
