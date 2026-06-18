#!/usr/bin/env node
/** Verifica navegación por pestañas del dashboard ISO 25000 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.ISO_URL || "http://127.0.0.1:4321";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dashboard-iso25000", "screenshots");
mkdirSync(OUT, { recursive: true });

const TABS = [
  { id: "resumen", label: "Resumen", selector: "#meta-cards .meta-card", minCount: 4 },
  { id: "graficos", label: "Gráficos", selector: "#characteristic-bars .bar-row", minCount: 8 },
  { id: "correlacion", label: "Adecuación funcional", selector: "#correlation-panel .correlation-grid, #correlation-panel .empty-correlation, #correlation-panel .warn-panel", minCount: 1 },
  { id: "instrumentos", label: "Listas de cotejo", selector: ".checklist-char-block", minCount: 8 },
  { id: "detalle", label: "Detalle", selector: ".char-card", minCount: 8 },
];

const results = { checks: [], errors: [] };

function check(name, ok, detail = "") {
  results.checks.push({ name, ok, detail });
}

async function isPanelVisible(page, tabId) {
  return page.locator(`#${tabId}.tab-panel`).evaluate((el) => {
    if (!el) return false;
    const s = getComputedStyle(el);
    return !el.hidden && el.classList.contains("is-active") && s.display !== "none";
  });
}

async function hiddenPanelsCount(page) {
  return page.locator(".tab-panel[hidden]").count();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  page.on("pageerror", (e) => results.errors.push(`pageerror: ${e.message}`));

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForFunction(() => document.querySelector("#meta-cards .meta-card"), null, { timeout: 12000 });
  await page.waitForTimeout(1200);

  check("solo resumen activo al inicio", await isPanelVisible(page, "resumen"), "");
  check("4 paneles ocultos al inicio", (await hiddenPanelsCount(page)) === 4, String(await hiddenPanelsCount(page)));

  const resumenOnly = await page.evaluate(() => {
    const panels = [...document.querySelectorAll(".tab-panel")];
    const visible = panels.filter((p) => !p.hidden && p.classList.contains("is-active"));
    return visible.length === 1 && visible[0].id === "resumen";
  });
  check("exactamente 1 pestaña visible", resumenOnly, "");

  for (const tab of TABS) {
    await page.locator(`a[data-tab="${tab.id}"]`).click();
    await page.waitForTimeout(400);

    const visible = await isPanelVisible(page, tab.id);
    check(`pestaña ${tab.label} visible`, visible, tab.id);

    const activeLink = await page.locator(`a[data-tab="${tab.id}"]`).evaluate((el) => el.classList.contains("active"));
    check(`nav ${tab.label} activo`, activeLink, tab.id);

    const hash = await page.evaluate(() => location.hash);
    check(`hash #${tab.id}`, hash === `#${tab.id}`, hash);

    const contentCount = await page.locator(tab.selector).count();
    check(`${tab.label} tiene contenido`, contentCount >= tab.minCount, `${contentCount} (min ${tab.minCount})`);

    const othersHidden = await page.evaluate((activeId) => {
      return [...document.querySelectorAll(".tab-panel")]
        .filter((p) => p.id !== activeId)
        .every((p) => p.hidden || !p.classList.contains("is-active"));
    }, tab.id);
    check(`${tab.label}: otras pestañas ocultas`, othersHidden, "");

    await page.screenshot({ path: path.join(OUT, `tab-${tab.id}.png`) });
  }

  await browser.close();

  console.log("\n=== Dashboard Tabs Test ===\n");
  for (const c of results.checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  if (results.errors.length) {
    console.log("\nPage errors:");
    results.errors.forEach((e) => console.log(" ", e));
  }

  const failed = results.checks.filter((c) => !c.ok).length + results.errors.length;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
