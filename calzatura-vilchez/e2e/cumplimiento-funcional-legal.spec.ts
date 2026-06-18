/**
 * E2E Cumplimiento funcional — páginas legales publicadas (ISO 9126).
 * TC-CMP-001…004
 */
import { expect, test } from "@playwright/test";

test.describe("cumplimiento funcional — normativa legal publicada", () => {
  test("TC-CMP-001: libro de reclamaciones cita Ley 29571 y plazos legales", async ({ page }) => {
    await page.goto("/legal/libro-reclamaciones");
    await expect(page.getByRole("heading", { name: "Libro de reclamaciones" })).toBeVisible();
    await expect(page.getByText(/Ley N\.° 29571/i).first()).toBeVisible();
    await expect(page.getByText(/tres \(3\) días hábiles/i)).toBeVisible();
    await expect(page.getByText(/quince \(15\) días hábiles/i)).toBeVisible();
  });

  test("TC-CMP-002: política de privacidad cita Ley 29733", async ({ page }) => {
    await page.goto("/legal/politica-privacidad");
    await expect(page.getByRole("heading", { name: "Política de privacidad" })).toBeVisible();
    await expect(page.getByText(/Ley N\.° 29733/i).first()).toBeVisible();
    await expect(page.getByText(/ANPDP/i).first()).toBeVisible();
  });

  test("TC-CMP-004: términos y condiciones cita Ley 29571 y libro de reclamaciones", async ({
    page,
  }) => {
    await page.goto("/legal/terminos-condiciones");
    await expect(page.getByRole("heading", { name: "Términos y condiciones" })).toBeVisible();
    await expect(page.getByText(/Ley N\.° 29571/i).first()).toBeVisible();
    await expect(page.getByText(/Libro de reclamaciones/i).first()).toBeVisible();
  });
});
