import { expect, type Page } from "@playwright/test";

/** Espera hidratación de auth + CartContext antes de asertar el formulario de checkout. */
export async function waitForCheckoutHydrated(page: Page, productName: string) {
  await expect(page.getByText(productName)).toBeVisible({ timeout: 25_000 });
  await expect(page.locator("main.checkout-page")).toBeVisible({ timeout: 10_000 });
}
