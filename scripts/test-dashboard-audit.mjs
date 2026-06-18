#!/usr/bin/env node
/** Auditoría completa del dashboard — layout, datos, pestañas, consola */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.ISO_URL || "http://127.0.0.1:4321";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dashboard-iso25000", "screenshots");
mkdirSync(OUT, { recursive: true });

const TABS = ["resumen", "graficos", "correlacion", "instrumentos", "detalle"];
const results = { checks: [], errors: [], warnings: [] };

function check(name, ok, detail = "") {
  results.checks.push({ name, ok, detail });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("pageerror", (e) => results.errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") results.errors.push(`console: ${msg.text()}`);
    if (msg.type() === "warning") results.warnings.push(msg.text());
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForFunction(() => document.querySelector("#meta-cards .meta-card"), null, { timeout: 12000 });
  await page.waitForTimeout(1500);

  // --- Datos base ---
  const overall = await page.locator("#overall-pct").textContent();
  check("overall-pct válido", overall !== "--%" && overall !== "0%" && /^\d+%$/.test(overall?.trim() || ""), overall);

  const kpi = await page.locator("#header-kpi-value").textContent();
  check("sidebar KPI coincide con anillo", kpi === overall, `${kpi} vs ${overall}`);

  const metaCount = await page.locator("#meta-cards .meta-card").count();
  check("4 meta cards", metaCount === 4, String(metaCount));

  const fatal = await page.locator(".fatal-error").count();
  check("sin fatal-error", fatal === 0, String(fatal));

  // --- Pestañas ---
  for (const tab of TABS) {
    await page.locator(`a[data-tab="${tab}"]`).click();
    await page.waitForTimeout(350);

    const panel = page.locator(`#${tab}.tab-panel`);
    const state = await panel.evaluate((el) => ({
      hidden: el.hidden,
      active: el.classList.contains("is-active"),
      display: getComputedStyle(el).display,
    }));
    check(`${tab}: panel visible`, !state.hidden && state.active && state.display !== "none", JSON.stringify(state));

    const othersHidden = await page.evaluate((id) =>
      [...document.querySelectorAll(".tab-panel")].filter((p) => p.id !== id).every((p) => p.hidden),
    tab);
    check(`${tab}: otras ocultas`, othersHidden, "");

    if (tab === "graficos") {
      const barW = await page.locator("#characteristic-bars .bar-fill").first().evaluate((el) => el.style.width);
      check("graficos: bar-fill con ancho", barW && barW !== "0%", barW);
      const radar = (await page.locator("#radar-chart").innerHTML()).length;
      check("graficos: radar renderizado", radar > 300, String(radar));
      const subBars = await page.locator("#grouped-bars .sub-bar-fill").count();
      const subW = await page.locator("#grouped-bars .sub-bar-fill").first().evaluate((el) => el.style.width);
      check("graficos: sub-bar-fill con ancho", subBars > 0 && subW && subW !== "0%", `${subBars} bars, w=${subW}`);
    }

    if (tab === "resumen") {
      const ring = await page.locator(".overall-ring circle[data-ring]").evaluate((el) => {
        if (!el) return null;
        return { offset: el.style.strokeDashoffset, done: el.dataset.ringDone };
      });
      check("resumen: anillo animado", ring && ring.offset !== "" && ring.done === "1", JSON.stringify(ring));
    }

    if (tab === "detalle") {
      const miniW = await page.locator(".mini-bar-fill").first().evaluate((el) => el?.style?.width);
      check("detalle: mini-bar con ancho", miniW && miniW !== "0%", miniW);
      const cards = await page.locator(".char-card").count();
      check("detalle: 8 tarjetas", cards === 8, String(cards));
    }

    if (tab === "instrumentos") {
      const blocks = await page.locator(".checklist-char-block").count();
      check("instrumentos: 8 bloques", blocks === 8, String(blocks));
      check("instrumentos: nivel 2 visible", (await page.locator(".eval-badge.n2").count()) >= 1, "eval n2");
    }

    if (tab === "correlacion") {
      const txt = await page.locator("#correlation-panel").textContent();
      const ok = txt && !txt.includes("shimmer") && txt.length > 40;
      check("correlacion: contenido cargado", ok, txt?.slice(0, 60));
    }

    // Nav indicator
    const ind = await page.locator("#nav-indicator").evaluate((el) => {
      const s = getComputedStyle(el);
      return { w: s.width, h: s.height, opacity: s.opacity, ready: el.classList.contains("is-ready") };
    });
    check(`${tab}: indicador nav listo`, ind.ready && parseFloat(ind.w) > 20, JSON.stringify(ind));

    const overlap = await page.evaluate((tabId) => {
      const panel = document.getElementById(tabId);
      if (!panel) return false;
      const foot = panel.querySelector(".footnote, .methodology-note");
      if (!foot) return false;
      const content = panel.querySelector(".hero-dashboard, .charts-grid, .correlation-panel, .instruments-grid, .detail-grid");
      if (!content) return false;
      const cr = content.getBoundingClientRect();
      const fr = foot.getBoundingClientRect();
      return fr.top < cr.bottom - 4;
    }, tab);
    check(`${tab}: sin solapamiento interno`, !overlap, overlap ? "solapado" : "ok");

    if (tab !== "resumen") {
      const globalFoot = await page.locator(".main-content > .footnote").count();
      check(`${tab}: sin footer global`, globalFoot === 0, String(globalFoot));
    } else {
      const meth = await page.locator("#resumen .methodology-note").count();
      check("resumen: bloque metodología presente", meth === 1, String(meth));
    }

    await page.screenshot({ path: path.join(OUT, `audit-${tab}.png`) });
  }

  // --- Layout sidebar ---
  const sidebarW = await page.locator(".site-sidebar").evaluate((el) => el.getBoundingClientRect().width);
  check("sidebar ancho ~272px", sidebarW >= 260 && sidebarW <= 290, String(Math.round(sidebarW)));

  const mainLeft = await page.locator(".main-content").evaluate((el) => el.getBoundingClientRect().left);
  check("main no solapa sidebar", mainLeft >= sidebarW - 2, `${mainLeft} vs ${sidebarW}`);

  // --- Hash deep link ---
  await page.goto(`${BASE}#detalle`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const deep = await page.evaluate(() => ({
    hash: location.hash,
    active: document.querySelector("#detalle")?.classList.contains("is-active"),
    hidden: document.querySelector("#detalle")?.hidden,
  }));
  check("deep link #detalle", deep.hash === "#detalle" && deep.active && !deep.hidden, JSON.stringify(deep));

  await browser.close();

  console.log("\n=== Dashboard Audit ===\n");
  for (const c of results.checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  if (results.errors.length) {
    console.log("\nErrores de página:");
    results.errors.forEach((e) => console.log(" ", e));
  }
  if (results.warnings.length) {
    console.log("\nAdvertencias:");
    results.warnings.forEach((w) => console.log(" ", w));
  }

  const failed = results.checks.filter((c) => !c.ok).length + results.errors.length;
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
