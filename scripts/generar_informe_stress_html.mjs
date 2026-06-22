#!/usr/bin/env node
/**
 * Genera informe HTML gráfico de pruebas de estrés k6 (RNF-CAP-02).
 * Uso: node scripts/generar_informe_stress_html.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_ARTIFACTS = path.join(ROOT, "artifacts/load-tests/informe-stress-calzatura-vilchez.html");
const OUT_DASH = path.join(ROOT, "dashboard-iso25000/stress/index.html");

const EVIDENCE_FILES = [
  { file: "docs/ops/k6-smoke-evidence.json", label: "Smoke (20 VUs)" },
  { file: "docs/ops/k6-mixed1000-bff-evidence.json", label: "Mixed 1.000 VUs" },
  { file: "docs/ops/k6-mixed2000-bff-evidence.json", label: "Mixed 2.000 VUs (RNF-CAP-02)" },
];

function readJson(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function pctBar(value, max, ok) {
  const w = Math.min(100, Math.round((value / max) * 100));
  const color = ok ? "#2e9e5b" : "#d9483d";
  return `<div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${color}"></div></div>`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildRows(runs) {
  return runs
    .map((r) => {
      const m = r.metrics ?? {};
      const t = r.thresholds ?? {};
      const failPct = (m.httpReqFailedRate ?? 0) * 100;
      const failOk = (m.httpReqFailedRate ?? 1) <= (t.maxHttpFailedRate ?? 0.02);
      const p95Cat = m.p95BffCatalogActiveMs ?? m.p95CatalogMs ?? 0;
      const p95Ok = p95Cat <= (t.maxP95CatalogMs ?? 4000);
      const badge = r.result === "pass" ? '<span class="badge pass">PASS</span>' : '<span class="badge fail">FAIL</span>';
      return `<tr>
        <td><strong>${esc(r.label)}</strong><br><span class="muted">${esc(r.runId)}</span></td>
        <td>${r.peakVus?.toLocaleString("es-PE") ?? "—"}</td>
        <td>${esc(r.environment)}</td>
        <td>${badge}</td>
        <td>${failPct.toFixed(2)}% ${pctBar(failPct, (t.maxHttpFailedRate ?? 0.02) * 100, failOk)}<small>meta &lt; ${((t.maxHttpFailedRate ?? 0.02) * 100).toFixed(0)}%</small></td>
        <td>${p95Cat} ms ${pctBar(p95Cat, t.maxP95CatalogMs ?? 4000, p95Ok)}<small>meta &lt; ${t.maxP95CatalogMs ?? 4000} ms</small></td>
        <td>${m.p95DetailMs ?? "—"} ms</td>
        <td>${m.p95BffHealthMs ?? "—"} ms</td>
      </tr>`;
    })
    .join("\n");
}

function vuChart(runs) {
  const max = Math.max(...runs.map((r) => r.peakVus ?? 0), 1);
  return runs
    .map((r) => {
      const h = Math.round(((r.peakVus ?? 0) / max) * 160);
      const ok = r.result === "pass";
      return `<div class="vu-col"><div class="vu-bar" style="height:${h}px;background:${ok ? "#3b82f6" : "#d9483d"}"></div><div class="vu-label">${esc(r.scenario)}</div><div class="vu-num">${r.peakVus?.toLocaleString("es-PE")} VU</div></div>`;
    })
    .join("");
}

function main() {
  const runs = EVIDENCE_FILES.map(({ file, label }) => {
    const data = readJson(file);
    if (!data) return null;
    return { ...data, label };
  }).filter(Boolean);

  if (!runs.length) {
    console.error("No hay evidencia k6 en docs/ops/");
    process.exit(1);
  }

  const latest = runs.map((r) => r.date).sort().pop();
  const allPass = runs.every((r) => r.result === "pass");
  const peakMax = Math.max(...runs.map((r) => r.peakVus ?? 0));

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Informe de pruebas de estrés — Calzatura Vilchez</title>
<style>
  :root { --bg:#0f1419; --card:#1a2332; --text:#e8eef4; --muted:#8ba3bc; --accent:#3b82f6; --pass:#2e9e5b; --border:#2a3544; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:Segoe UI,system-ui,sans-serif; background:var(--bg); color:var(--text); line-height:1.5; }
  header { background:linear-gradient(135deg,#1a3a5c,#0f1419); padding:2rem; border-bottom:1px solid var(--border); }
  h1 { margin:0 0 .25rem; font-size:1.75rem; }
  .sub { color:#90b8d8; font-size:.95rem; }
  main { max-width:1100px; margin:0 auto; padding:1.5rem; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:1rem; margin:1.5rem 0; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:1rem 1.25rem; }
  .card .val { font-size:1.8rem; font-weight:700; color:var(--accent); }
  .card.pass .val { color:var(--pass); }
  .card small { color:var(--muted); display:block; margin-top:.25rem; }
  section { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:1.25rem; margin-bottom:1.25rem; }
  h2 { margin:0 0 1rem; font-size:1.1rem; color:#90b8d8; }
  table { width:100%; border-collapse:collapse; font-size:.85rem; }
  th,td { padding:.6rem .5rem; border-bottom:1px solid var(--border); text-align:left; vertical-align:top; }
  th { color:var(--muted); font-weight:600; }
  .badge { padding:.15rem .5rem; border-radius:4px; font-size:.75rem; font-weight:700; }
  .badge.pass { background:#1a3d2a; color:#6ee7a0; }
  .badge.fail { background:#3d1a1a; color:#fca5a5; }
  .bar-track { height:8px; background:#0f1419; border-radius:4px; margin:.35rem 0; overflow:hidden; max-width:140px; }
  .bar-fill { height:100%; border-radius:4px; }
  .muted { color:var(--muted); font-size:.78rem; }
  .vu-chart { display:flex; align-items:flex-end; gap:1.5rem; height:200px; padding:1rem 0; }
  .vu-col { flex:1; text-align:center; }
  .vu-bar { width:100%; max-width:80px; margin:0 auto .5rem; border-radius:6px 6px 0 0; min-height:4px; }
  .vu-label { font-size:.8rem; font-weight:600; }
  .vu-num { font-size:.75rem; color:var(--muted); }
  footer { text-align:center; padding:2rem; color:var(--muted); font-size:.8rem; }
  .links { margin-top:1rem; }
  .links a { color:#90b8d8; margin-right:1rem; }
  code { background:#0f1419; padding:.15rem .35rem; border-radius:4px; font-size:.8rem; }
</style>
</head>
<body>
<header>
  <h1>Informe de pruebas de estrés (k6)</h1>
  <p class="sub">Calzatura Vilchez · RNF-CAP-02 · ISO/IEC 25010 Eficiencia · Grafana k6 + BFF local</p>
  <p class="sub">Generado: ${new Date().toISOString().slice(0, 10)} · Evidencia archivada en docs/ops/k6-*-evidence.json</p>
  <div class="links">
    <a href="http://localhost:4321/">← Dashboard ISO 25000</a>
    <a href="/zap/">Informe ZAP seguridad →</a>
  </div>
</header>
<main>
  <div class="cards">
    <div class="card ${allPass ? "pass" : ""}"><div class="val">${allPass ? "VERDE" : "REVISAR"}</div><small>Veredicto global (${runs.length} escenarios)</small></div>
    <div class="card"><div class="val">${peakMax.toLocaleString("es-PE")}</div><small>VUs pico máximo (meta RNF-CAP-02: 2.000)</small></div>
    <div class="card"><div class="val">${runs.filter((r) => r.peakVus >= 2000).length ? "✓" : "—"}</div><small>Escenario 2.000 VUs ejecutado</small></div>
    <div class="card"><div class="val">${latest ?? "—"}</div><small>Última corrida documentada</small></div>
  </div>

  <section>
    <h2>VUs por escenario</h2>
    <div class="vu-chart">${vuChart(runs)}</div>
  </section>

  <section>
    <h2>Resultados detallados</h2>
    <table>
      <thead>
        <tr>
          <th>Escenario</th><th>VUs</th><th>Entorno</th><th>Resultado</th>
          <th>Fallos HTTP</th><th>p95 catálogo BFF</th><th>p95 detalle</th><th>p95 /health</th>
        </tr>
      </thead>
      <tbody>${buildRows(runs)}</tbody>
    </table>
    <p class="muted" style="margin-top:1rem">Lecturas: GET /public/catalog/active, catálogo paginado, detalle Supabase, /health. Sin checkout ni admin autenticado.</p>
  </section>

  <section>
    <h2>Reproducir / actualizar</h2>
    <pre style="background:#0f1419;padding:1rem;border-radius:8px;overflow:auto;font-size:.8rem"><code>npm run load:smoke:bff
npm run load:mixed1000:bff
npm run load:mixed2000:bff
node scripts/generar_informe_stress_html.mjs</code></pre>
  </section>
</main>
<footer>
  RNF-CAP-02 · documentacion/08-pruebas-y-calidad.md §5.1 · load-tests/README.md
</footer>
</body>
</html>`;

  fs.mkdirSync(path.dirname(OUT_ARTIFACTS), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_DASH), { recursive: true });
  fs.writeFileSync(OUT_ARTIFACTS, html, "utf8");
  fs.writeFileSync(OUT_DASH, html, "utf8");
  console.log(`OK: ${OUT_ARTIFACTS}`);
  console.log(`OK: ${OUT_DASH}`);
}

main();
