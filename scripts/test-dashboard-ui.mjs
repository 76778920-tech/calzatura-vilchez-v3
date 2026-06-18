#!/usr/bin/env node
/** Verificación E2E del dashboard ISO 25000 en localhost:4321 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.ISO_URL || "http://127.0.0.1:4321";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dashboard-iso25000", "screenshots");
mkdirSync(OUT, { recursive: true });

const results = { checks: [], errors: [], console: [] };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  page.on("pageerror", (e) => results.errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") results.console.push(msg.text());
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForFunction(() => document.querySelector("#meta-cards .meta-card"), null, { timeout: 10000 });
  await page.waitForTimeout(800);

  const snap = async (name) => {
    await page.screenshot({ path: path.join(OUT, name), fullPage: name.includes("full") });
  };

  const check = (name, ok, detail = "") => {
    results.checks.push({ name, ok, detail });
  };

  const overall = await page.locator("[id='overall-pct']").textContent();
  check("overall-pct tiene valor real", overall !== "0%" && overall !== "--%" && overall !== "", overall);

  const subtitle = await page.locator("#page-subtitle").textContent();
  check("subtitle cargado", (subtitle?.length ?? 0) > 10, subtitle?.slice(0, 60));

  const metaCount = await page.locator("#meta-cards .meta-card").count();
  check("4 meta cards", metaCount === 4, String(metaCount));

  const metaVisible = await page.locator("#meta-cards .meta-card").first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { opacity: s.opacity, display: s.display, text: el.textContent?.slice(0, 30) };
  });
  check("meta-card visible (opacity>0.5)", parseFloat(metaVisible.opacity) > 0.5, JSON.stringify(metaVisible));

  const bars = await page.locator("#characteristic-bars .bar-row").count();
  check("8 barras características", bars === 8, String(bars));

  const barFillW = await page.locator("#characteristic-bars .bar-fill").first().evaluate((el) => el.style.width);
  check("bar-fill con ancho animado", barFillW !== "" && barFillW !== "0%", barFillW);

  const radarLen = (await page.locator("#radar-chart").innerHTML()).length;
  check("radar SVG renderizado", radarLen > 300, String(radarLen));

  const donutLen = (await page.locator("#status-donut").innerHTML()).length;
  check("donut SVG renderizado", donutLen > 100, String(donutLen));

  const checklists = await page.locator(".checklist-char-block").count();
  check("listas de cotejo (8 chars)", checklists === 8, String(checklists));

  const charCards = await page.locator(".char-card").count();
  check("8 char-cards detalle", charCards === 8, String(charCards));

  const corrText = await page.locator("#correlation-panel").textContent();
  check("correlación no queda en skeleton", !corrText?.includes("shimmer") || corrText.length > 50, corrText?.slice(0, 80));

  await snap("test-resumen.png");
  await page.locator('a[href="#graficos"]').click();
  await page.waitForTimeout(800);
  await snap("test-graficos.png");

  await browser.close();

  console.log("\n=== Dashboard UI Test ===\n");
  for (const c of results.checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  if (results.errors.length) {
    console.log("\nPage errors:");
    results.errors.forEach((e) => console.log(" ", e));
  }
  if (results.console.length) {
    console.log("\nConsole errors:");
    results.console.forEach((e) => console.log(" ", e));
  }

  const failed = results.checks.filter((c) => !c.ok).length + results.errors.length;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
