// Dashboard ISO/IEC 25000 — UI completa con gráficos, listas de cotejo y correlación CF/COF/TECP.
(async function () {
  const $ = (id) => document.getElementById(id);

  function showFatalError(err) {
    console.error(err);
    const box = document.createElement("div");
    box.className = "fatal-error";
    box.innerHTML = `<strong>Error al cargar el dashboard</strong><p>${err?.message || err}</p><p class="muted">Revisa la consola (F12) y que <code>data.json</code> esté accesible.</p>`;
    document.body.prepend(box);
  }

  try {
  let navIndicatorReady = false;

  const [data, catalog, checklistsData, evaluationLevels] = await Promise.all([
    fetch("data.json").then((r) => {
      if (!r.ok) throw new Error("No se pudo cargar data.json");
      return r.json();
    }),
    fetch("instruments-catalog.json").then((r) => {
      if (!r.ok) throw new Error("No se pudo cargar instruments-catalog.json");
      return r.json();
    }),
    fetch("checklists-data.json").then((r) => {
      if (!r.ok) throw new Error("No se pudo cargar checklists-data.json");
      return r.json();
    }),
    fetch("evaluation-levels.json").then((r) => {
      if (!r.ok) throw new Error("No se pudo cargar evaluation-levels.json");
      return r.json();
    }),
  ]);
  const { meta } = data;

  function checklistPct(name) {
    const cl = checklistsData.checklists[name];
    if (!cl?.items?.length) return null;
    const yes = cl.items.filter((i) => i.cumple).length;
    return Math.round((yes / cl.items.length) * 100);
  }

  /** Lista de cotejo = instrumento principal; los % del dashboard derivan de ítems Sí/No. */
  const characteristics = data.characteristics.map((c) => ({
    ...c,
    subcharacteristics: c.subcharacteristics.map((s) => {
      const pct = checklistPct(s.name);
      return pct != null ? { ...s, percent: pct } : s;
    }),
  }));
  const OK = meta.thresholds?.ok ?? 80;
  const WARN = meta.thresholds?.warn ?? 60;
  const QC_ROUTE = meta.routes?.adecuacionFuncional ?? "/adecuacion-funcional/";

  function getChecklist(name) {
    const entry = catalog[name];
    if (!entry) return { tipo: "Lista de cotejo", nombre: "Por definir en instruments-catalog.json", referencia: "—" };
    return entry;
  }

  function statusFor(pct) {
    if (pct >= OK) return "ok";
    if (pct >= WARN) return "warn";
    return "bad";
  }
  function statusLabel(s) {
    if (s === "ok") return "Cumple";
    if (s === "warn") return "Parcial";
    return "No cumple";
  }
  function statusColor(status) {
    if (status === "ok") return "#2e9e5b";
    if (status === "warn") return "#e0a92c";
    return "#d9483d";
  }
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const charAverages = characteristics.map((c) => ({
    ...c,
    avg: Math.round(avg(c.subcharacteristics.map((s) => s.percent))),
  }));
  const overall = Math.round(avg(charAverages.map((c) => c.avg)));
  const allSubs = characteristics.flatMap((c) =>
    c.subcharacteristics.map((s) => ({ ...s, charName: c.name, charColor: c.color, charId: c.id })),
  );
  const counts = { ok: 0, warn: 0, bad: 0 };
  allSubs.forEach((s) => counts[statusFor(s.percent)]++);

  const META_ICONS = {
    ok: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>',
    warn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
    bad: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    neutral: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    overall: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  };

  // --- Cabecera ---
  document.title = meta.title + " — " + meta.project;
  document.getElementById("page-title").textContent = meta.title;
  document.getElementById("page-subtitle").textContent = meta.project;
  document.getElementById("hero-scope").textContent = meta.scope;
  document.getElementById("methodology-text").textContent = meta.methodology;

  document.getElementById("overall-pct").textContent = overall + "%";
  $("header-kpi-value").textContent = overall + "%";
  renderRing(document.getElementById("overall-ring"), overall, statusColor(statusFor(overall)));

  const heroBadges = document.getElementById("hero-badge-row");
  if (heroBadges) {
    heroBadges.innerHTML = [
      `<span class="hero-chip ${statusFor(overall)}">${statusLabel(statusFor(overall))}</span>`,
      `<span class="hero-chip neutral">${allSubs.length} subcaracterísticas</span>`,
      `<span class="hero-chip ok">${counts.ok} cumplen (≥${OK}%)</span>`,
      counts.warn ? `<span class="hero-chip warn">${counts.warn} parciales</span>` : "",
      counts.bad ? `<span class="hero-chip bad">${counts.bad} no cumplen</span>` : "",
    ].filter(Boolean).join("");
  }

  // --- Meta cards ---
  const metaCards = document.getElementById("meta-cards");
  [
    [counts.ok, "Subcaracterísticas ≥ " + OK + "%", "ok"],
    [counts.warn, "Parciales " + WARN + "–" + (OK - 1) + "%", "warn"],
    [counts.bad, "No cumple (< " + WARN + "%)", "bad"],
    [allSubs.length, "Total evaluadas", "neutral"],
  ].forEach(([num, label, st]) => metaCards.appendChild(metaCard(num, label, st)));

  function metaCard(num, label, status) {
    const div = document.createElement("div");
    div.className = "meta-card " + status;
    const iconKey = status === "neutral" ? "neutral" : status;
    div.innerHTML = `
      <div class="meta-card-inner">
        <div class="meta-icon">${META_ICONS[iconKey] || META_ICONS.neutral}</div>
        <div class="meta-content">
          <div class="num">${num}</div>
          <div class="label">${label}</div>
        </div>
      </div>`;
    return div;
  }

  // --- Donut ---
  renderDonut(document.getElementById("status-donut"), counts);
  const legend = document.getElementById("donut-legend");
  [
    ["ok", "Cumple (≥" + OK + "%)", counts.ok],
    ["warn", "Parcial", counts.warn],
    ["bad", "No cumple", counts.bad],
  ].forEach(([st, lbl, n]) => {
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML = `<span class="dot ${st}"></span><span>${lbl}</span><strong>${n}</strong>`;
    legend.appendChild(row);
  });

  // --- Barras características ---
  const barsWrap = document.getElementById("characteristic-bars");
  charAverages.forEach((c) => barsWrap.appendChild(barRow(c.name, c.avg, c.color)));

  function barRow(name, pct, color) {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span class="bar-name">${name}</span>
      <span class="bar-track"><span class="bar-fill" data-width="${pct}" style="background:${color}"></span></span>
      <span class="bar-pct">${pct}%</span>`;
    return row;
  }

  // --- Radar ---
  renderRadar(document.getElementById("radar-chart"), charAverages);

  // --- Barras agrupadas subcaracterísticas ---
  renderGroupedBars(document.getElementById("grouped-bars"), characteristics);

  // --- Listas de cotejo + detalle (diferido para primer pintado rápido) ---
  setTimeout(() => {
    renderChecklists($("instruments-grid"), characteristics, checklistsData);
    const detailWrap = $("characteristics-detail");
    charAverages.forEach((c) => detailWrap.appendChild(charDetailCard(c)));
    applyBarWidths();
  }, 50);

  // --- Correlación live (diferido) ---
  setTimeout(() => loadCorrelation($("correlation-panel"), QC_ROUTE), 0);

  const TAB_IDS = ["resumen", "graficos", "correlacion", "instrumentos", "detalle"];

  function setupTabs() {
    const panels = TAB_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    const links = [...document.querySelectorAll("#nav-links-row .nav-link[role='tab']")];
    let current = "resumen";

    function scheduleLayout(fn) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => requestAnimationFrame(fn));
      } else {
        setTimeout(fn, 0);
      }
    }

    function onTabShown(tabId) {
      applyBarWidths();
      if (tabId === "resumen") animateRingNow(true);
      scheduleLayout(moveNavIndicator);
    }

    function showTab(tabId, pushHash = true) {
      if (!TAB_IDS.includes(tabId)) tabId = "resumen";
      const isSame = current === tabId;

      if (!isSame) {
        current = tabId;

        panels.forEach((panel) => {
          const active = panel.id === tabId;
          panel.classList.toggle("is-active", active);
          panel.hidden = !active;
        });

        links.forEach((link) => {
          const isActive = link.dataset.tab === tabId;
          link.classList.toggle("active", isActive);
          link.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        if (pushHash && location.hash !== `#${tabId}`) {
          history.replaceState(null, "", `#${tabId}`);
        }
      }

      const main = document.getElementById("main-scroll");
      if (main) main.scrollTop = 0;
      if (!isSame) onTabShown(tabId);
    }

    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        showTab(link.dataset.tab || link.getAttribute("href")?.slice(1) || "resumen");
      });
    });

    window.addEventListener("hashchange", () => {
      const tab = location.hash.replace("#", "") || "resumen";
      if (TAB_IDS.includes(tab)) showTab(tab, false);
    });

    const initial = location.hash.replace("#", "") || "resumen";
    if (!location.hash) {
      history.replaceState(null, "", "#resumen");
    }
    if (initial !== "resumen" && TAB_IDS.includes(initial)) {
      panels.forEach((panel) => {
        const active = panel.id === initial;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
      links.forEach((link) => {
        const isActive = link.dataset.tab === initial;
        link.classList.toggle("active", isActive);
        link.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      current = initial;
    }

    setupNavIndicator();
    onTabShown(current);
  }

  // --- Nav por pestañas + scroll ---
  setupScrollMotion();
  setupTabs();
  initDashboard();

  // ========== CORRELACIÓN CF/COF/TECP ==========
  async function loadCorrelation(container, route) {
    try {
      const list = await fetch("/api/evaluaciones").then((r) => {
        if (!r.ok) throw new Error("API no disponible");
        return r.json();
      });
      if (!list.length) {
        container.innerHTML = `
          <div class="panel empty-correlation">
            <p>Sin evaluaciones registradas en el módulo de adecuación funcional.</p>
            <a href="${route}" class="btn-primary">Abrir módulo CF/COF/TECP</a>
          </div>`;
        return;
      }
      const ev = list.sort((a, b) => (b.fecha_evaluacion || "").localeCompare(a.fecha_evaluacion || ""))[0];
      const m = ev.metricas;
      const items = [
        { code: "CF", label: "Completitud Funcional", pct: m.completitud_funcional.pct, level: m.completitud_funcional.classification.level, num: `${m.completitud_funcional.funciones_implementadas}/${m.completitud_funcional.funciones_requeridas}` },
        { code: "COF", label: "Corrección Funcional", pct: m.correccion_funcional.pct, level: m.correccion_funcional.classification.level, num: `${m.correccion_funcional.transacciones_correctas}/${m.correccion_funcional.transacciones_evaluadas}` },
        { code: "TECP", label: "Tasa éxito casos prueba", pct: m.tecp.pct, level: m.tecp.classification.level, num: `${m.tecp.casos_aprobados}/${m.tecp.casos_ejecutados}` },
      ];
      const chartW = 420;
      const chartH = 200;
      const barW = 72;
      const gap = 40;
      const baseY = chartH - 20;
      const scaleH = baseY - 24;
      let barsSvg = "";
      [90, 80, 70].forEach((t) => {
        const y = baseY - (t / 100) * scaleH;
        barsSvg += `<line x1="40" x2="${chartW}" y1="${y}" y2="${y}" class="threshold-line" stroke-dasharray="4 4"/>`;
        barsSvg += `<text x="36" y="${y + 4}" text-anchor="end" class="threshold-label">${t}%</text>`;
      });
      items.forEach((item, i) => {
        const v = item.pct ?? 0;
        const h = (v / 100) * scaleH;
        const x = 56 + i * (barW + gap);
        barsSvg += `<rect x="${x}" y="${baseY - h}" width="${barW}" height="${h}" rx="6" class="corr-bar level-${item.level}" style="transition-delay:${i * 0.12}s"/>`;
        barsSvg += `<text x="${x + barW / 2}" y="${baseY - h - 6}" text-anchor="middle" class="corr-pct">${v?.toFixed(1) ?? "N/D"}%</text>`;
        barsSvg += `<text x="${x + barW / 2}" y="${baseY + 14}" text-anchor="middle" class="corr-code">${item.code}</text>`;
      });

      container.innerHTML = `
        <div class="correlation-grid">
          <article class="panel correlation-chart glass-panel">
            <div class="corr-head">
              <div>
                <h3>Cumplimiento interno — ${ev.codigo}</h3>
                <p class="muted">${ev.titulo} · ${ev.periodo}</p>
              </div>
              <div class="corr-avg level-${m.promedio_classification.level}">
                Promedio: <strong>${m.promedio_adecuacion?.toFixed(1)}%</strong> · ${m.promedio_classification.label}
              </div>
            </div>
            <svg viewBox="0 0 ${chartW} ${chartH + 10}" class="corr-svg">
              <defs>
                <linearGradient id="gradOk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5ef5a0"/><stop offset="100%" stop-color="#2e9e5b"/></linearGradient>
                <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7eb8ff"/><stop offset="100%" stop-color="#3d7fd4"/></linearGradient>
                <linearGradient id="gradWarn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffd060"/><stop offset="100%" stop-color="#c98a1a"/></linearGradient>
                <linearGradient id="gradBad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff9a8a"/><stop offset="100%" stop-color="#d9483d"/></linearGradient>
              </defs>
              ${barsSvg}
            </svg>
            <p class="muted foot">Umbrales: 90% Excelente · 80% Bueno · 70% Aceptable. Datos en vivo desde qc-db.json.</p>
          </article>
          <div class="corr-cards">
            ${items.map((item) => `
              <article class="corr-card level-${item.level}">
                <span class="corr-card-code">${item.code}</span>
                <h4>${item.label}</h4>
                <div class="corr-card-pct">${item.pct?.toFixed(1) ?? "N/D"}%</div>
                <div class="corr-card-ratio">${item.num} registros</div>
                <div class="corr-card-inst">${catalog[item.code.toLowerCase()]?.nombre || ""}</div>
              </article>`).join("")}
          </div>
        </div>
        <div class="correlation-actions">
          <a href="${route}" class="btn-primary">Gestionar registros CF / COF / TECP →</a>
          <a href="${route}evaluacion/${ev.id}" class="btn-secondary">Abrir evaluación ${ev.codigo}</a>
        </div>`;
      refreshMotionEffects();
    } catch {
      container.innerHTML = `
        <div class="panel warn-panel">
          <p>No se pudo conectar con la API en <code>/api/evaluaciones</code>. Inicia el servidor unificado:</p>
          <code class="code-block">node dashboard-iso25000/server.mjs</code>
          <a href="${route}" class="btn-secondary">Ir al módulo CF/COF/TECP</a>
        </div>`;
    }
  }


  // ========== LISTAS DE COTEJO (formato UNAM Cap. 14) ==========
  function calcChecklistStats(items) {
    const si = items.filter((i) => i.cumple).length;
    const no = items.length - si;
    const pct = items.length ? Math.round((si / items.length) * 100) : 0;
    return { si, no, pct, total: items.length };
  }

  function renderChecklistTable(cl) {
    const stats = calcChecklistStats(cl.items);
    const rows = cl.items
      .map(
        (it) => `<tr class="${it.cumple ? "row-si" : "row-no"}">
        <td class="col-n">${it.n}</td>
        <td class="col-ind">${it.indicador}</td>
        <td class="col-mark">${it.cumple ? "✓" : ""}</td>
        <td class="col-mark">${!it.cumple ? "✓" : ""}</td>
        <td class="col-obs">${it.observacion || "—"}</td>
      </tr>`,
      )
      .join("");
    return `
      <div class="checklist-meta">
        <p><strong>Objetivo:</strong> ${cl.objetivo}</p>
        <p><strong>Referencia:</strong> ${cl.referencia}</p>
        <p class="checklist-instr"><em>Instrucciones:</em> ${cl.instrucciones}</p>
      </div>
      <div class="checklist-table-wrap">
        <table class="checklist-table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Indicador</th>
              <th>Sí</th>
              <th>No</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="checklist-total">
              <td colspan="2"><strong>Total</strong></td>
              <td><strong>${stats.si}</strong></td>
              <td><strong>${stats.no}</strong></td>
              <td><strong>Resultado: ${stats.si}/${stats.total} = ${stats.pct}%</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  }

  function renderEvaluationLevels(subName) {
    const block = evaluationLevels.levels?.[subName];
    if (!block) return "";
    const n2 = block.nivel2?.length
      ? `<div class="eval-level-panel">
          <h4 class="eval-level-title"><span class="eval-badge n2">Nivel 2</span> Casos de prueba</h4>
          <table class="eval-level-table">
            <thead><tr><th>Código</th><th>Prueba</th><th>Cumple</th><th>Referencia</th></tr></thead>
            <tbody>${block.nivel2
              .map(
                (r) => `<tr class="${r.cumple ? "row-si" : "row-no"}">
                <td><code>${r.codigo}</code></td>
                <td>${r.prueba}</td>
                <td>${r.cumple ? "Sí" : "No"}</td>
                <td class="muted">${r.referencia || "—"}</td>
              </tr>`,
              )
              .join("")}</tbody>
          </table>
        </div>`
      : `<p class="eval-empty muted">Nivel 2: sin casos de prueba registrados para esta subcaracterística.</p>`;
    const n3 = block.nivel3?.length
      ? `<div class="eval-level-panel">
          <h4 class="eval-level-title"><span class="eval-badge n3">Nivel 3</span> Evidencias (capturas y actas)</h4>
          <table class="eval-level-table">
            <thead><tr><th>Código</th><th>Prueba / acta</th><th>Evidencia</th></tr></thead>
            <tbody>${block.nivel3
              .map(
                (r) => `<tr>
                <td><code>${r.codigo}</code></td>
                <td>${r.prueba}</td>
                <td class="muted">${r.evidencia}</td>
              </tr>`,
              )
              .join("")}</tbody>
          </table>
        </div>`
      : "";
    return `<section class="eval-levels" aria-label="Evaluación niveles 2 y 3">
      ${n2}${n3}
    </section>`;
  }

  function renderChecklists(wrap, chars, clData) {
    const metaBox = document.createElement("div");
    metaBox.className = "checklist-format-note panel";
    metaBox.innerHTML = `
      <h3>Formato del instrumento</h3>
      <p><strong>${clData.meta.formato}</strong> — escala dicotómica <em>Sí / No</em> (cumple / no cumple), según ${clData.meta.fuenteFormato ? `<a href="${clData.meta.fuenteFormato}" target="_blank" rel="noopener">UNAM Cap. 14</a>` : "metodología UNAM"}.</p>
      <p class="muted">${clData.meta.instruccionesGenerales}</p>
      <p class="muted"><strong>Evaluador:</strong> ${clData.meta.evaluador} · <strong>Fecha:</strong> ${clData.meta.fecha}</p>
    `;
    wrap.appendChild(metaBox);

    chars.forEach((c) => {
      const block = document.createElement("article");
      block.className = "checklist-char-block panel";
      block.innerHTML = `<header class="checklist-char-head" style="border-left:4px solid ${c.color}">
        <h3>${c.name}</h3>
        <span class="inst-avg">${Math.round(avg(c.subcharacteristics.map((s) => s.percent)))}%</span>
      </header>`;

      c.subcharacteristics.forEach((s, idx) => {
        const cl = clData.checklists[s.name];
        if (!cl) return;
        const stats = calcChecklistStats(cl.items);
        const st = statusFor(stats.pct);
        const route = cl.rutaModulo || null;
        const details = document.createElement("details");
        details.className = "checklist-doc";
        details.open = idx === 0 && (c.id === "funcionalidad" || c.id === "seguridad");
        details.innerHTML = `
          <summary class="checklist-summary">
            <span class="checklist-title">${cl.titulo}</span>
            <span class="status-pill ${st}">${stats.pct}% · ${stats.si}/${stats.total} Sí</span>
          </summary>
          <div class="checklist-body">
            <div class="eval-level-panel eval-nivel1">
              <h4 class="eval-level-title"><span class="eval-badge n1">Nivel 1</span> Lista de cotejo (Sí / No)</h4>
              ${renderChecklistTable(cl)}
            </div>
            ${renderEvaluationLevels(s.name)}
            ${route ? `<p class="checklist-link"><a href="${route}" class="btn-secondary">Registros operativos (CF/COF/TECP) →</a></p>` : ""}
          </div>`;
        block.appendChild(details);
      });
      wrap.appendChild(block);
    });
  }

  function charDetailCard(c) {
    const card = document.createElement("section");
    card.className = "char-card";
    const head = document.createElement("div");
    head.className = "char-head";
    head.style.background = `linear-gradient(135deg, ${c.color} 0%, ${c.color}99 100%)`;
    head.innerHTML = `<div><h3>${c.name}</h3><div class="char-def">${c.definition}</div></div><div class="char-pct">${c.avg}%</div>`;
    card.appendChild(head);
    const tableWrap = document.createElement("div");
    tableWrap.className = "char-table-wrap";
    tableWrap.innerHTML = `<table class="char-table">
      <thead><tr><th>Subcaracterística</th><th>%</th><th>Estado</th><th>Ítems Sí/Total</th><th>Evidencia resumida</th></tr></thead>
      <tbody>${c.subcharacteristics.map((s) => {
        const st = statusFor(s.percent);
        const cl = checklistsData.checklists[s.name];
        const stats = cl ? calcChecklistStats(cl.items) : { si: "—", total: "—", pct: s.percent };
        const chk = getChecklist(s.name);
        return `<tr>
          <td class="sub-name">${s.name}</td>
          <td><div class="pct-cell"><span class="mini-bar-track"><span class="mini-bar-fill" data-width="${s.percent}" style="background:${statusColor(st)}"></span></span><strong>${s.percent}%</strong></div></td>
          <td><span class="status-pill ${st}">${statusLabel(st)}</span></td>
          <td class="inst-cell">${cl ? `${stats.si} / ${stats.total}` : chk.nombre}</td>
          <td class="evidence">${s.evidence}</td>
        </tr>`;
      }).join("")}</tbody></table>`;
    card.appendChild(tableWrap);
    return card;
  }

  function applyBarWidths() {
    document.querySelectorAll(".bar-fill[data-width], .sub-bar-fill[data-width], .mini-bar-fill[data-width]").forEach((el) => {
      const w = el.getAttribute("data-width");
      if (w != null) el.style.width = w + "%";
    });
  }

  function animateRingNow(force = false) {
    document.querySelectorAll(".overall-ring circle[data-ring]").forEach((circle) => {
      const target = Number(circle.getAttribute("data-ring-offset"));
      const full = circle.getAttribute("stroke-dasharray")?.split(" ")[0];
      if (force && full) {
        circle.style.transition = "none";
        circle.style.strokeDashoffset = full;
        circle.dataset.ringDone = "";
      }
      if (!force && circle.dataset.ringDone) return;
      const run = () => {
        circle.style.transition = "stroke-dashoffset 1s ease-out";
        circle.style.strokeDashoffset = String(target);
        circle.dataset.ringDone = "1";
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else run();
    });
  }

  function initDashboard() {
    applyBarWidths();
    animateRingNow();
    moveNavIndicator();
  }

  function refreshMotionEffects() {
    applyBarWidths();
    animateRingNow();
  }

  function moveNavIndicator() {
    const row = document.getElementById("nav-links-row");
    const indicator = document.getElementById("nav-indicator");
    if (!row || !indicator) return;
    const active = row.querySelector(".nav-link.active[role='tab']");
    if (!active) return;
    const rowRect = row.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    indicator.style.width = `${rect.width}px`;
    indicator.style.height = `${rect.height}px`;
    indicator.style.transform = `translate(${rect.left - rowRect.left}px, ${rect.top - rowRect.top}px)`;
    indicator.classList.add("is-ready");
  }

  function setupNavIndicator() {
    if (navIndicatorReady) return;
    navIndicatorReady = true;
    const row = document.getElementById("nav-links-row");
    if (!row) return;
    row.querySelectorAll(".nav-link[role='tab']").forEach((l) => {
      l.addEventListener("click", () => requestAnimationFrame(moveNavIndicator));
    });
    window.addEventListener("resize", moveNavIndicator, { passive: true });
    moveNavIndicator();
  }

  function setupScrollMotion() {
    const progress = document.getElementById("scroll-progress");
    const header = document.getElementById("site-header");
    const scrollRoot = document.getElementById("main-scroll");
    let ticking = false;

    const onScroll = () => {
      const el = scrollRoot || document.documentElement;
      const scrollTop = el.scrollTop ?? window.scrollY ?? 0;
      const scrollHeight = el.scrollHeight ?? document.documentElement.scrollHeight;
      const clientHeight = el.clientHeight ?? window.innerHeight;
      const docHeight = scrollHeight - clientHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      if (progress) progress.style.width = pct + "%";
      if (header) header.classList.toggle("is-scrolled", scrollTop > 24);
      ticking = false;
    };

    const target = scrollRoot || window;
    target.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true },
    );
    onScroll();
  }

  // ========== GRÁFICOS ==========
  function renderRing(svg, pct, color) {
    const r = 50, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - pct / 100);
    svg.classList.add("overall-ring");
    svg.innerHTML = `
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#7c5cff"/>
        </linearGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#ringGrad)" stroke-width="10"
        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
        data-ring="1" data-ring-offset="${offset}"
        transform="rotate(-90 ${cx} ${cy})"/>`;
  }

  function renderDonut(svg, counts) {
    const total = counts.ok + counts.warn + counts.bad || 1;
    const cx = 100, cy = 100, r = 70, ir = 44;
    const slices = [
      { n: counts.ok, id: "donutOk", c1: "#5ef5a0", c2: "#2e9e5b" },
      { n: counts.warn, id: "donutWarn", c1: "#ffd060", c2: "#c98a1a" },
      { n: counts.bad, id: "donutBad", c1: "#ff9a8a", c2: "#d9483d" },
    ];
    let defs = slices.map((s) => `<linearGradient id="${s.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${s.c1}"/><stop offset="100%" stop-color="${s.c2}"/></linearGradient>`).join("");
    let angle = -Math.PI / 2;
    let paths = "";
    slices.forEach(({ n, id }) => {
      if (!n) return;
      const sweep = (n / total) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      angle += sweep;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const ix1 = cx + ir * Math.cos(angle - sweep);
      const iy1 = cy + ir * Math.sin(angle - sweep);
      const ix2 = cx + ir * Math.cos(angle);
      const iy2 = cy + ir * Math.sin(angle);
      const large = sweep > Math.PI ? 1 : 0;
      paths += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z" fill="url(#${id})"/>`;
    });
    svg.innerHTML = `<defs>${defs}</defs>${paths}<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="700" fill="#f4f6fa" font-family="JetBrains Mono, monospace">${total}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="10" fill="#8b94a8" letter-spacing="0.08em">SUBCARACT.</text>`;
  }

  function renderGroupedBars(wrap, chars) {
    chars.forEach((c) => {
      const group = document.createElement("div");
      group.className = "group-block";
      group.innerHTML = `<div class="group-label" style="color:${c.color}">${c.name}</div>`;
      const bars = document.createElement("div");
      bars.className = "group-bars";
      c.subcharacteristics.forEach((s) => {
        const st = statusFor(s.percent);
        const row = document.createElement("div");
        row.className = "sub-bar-row";
        row.innerHTML = `
          <span class="sub-bar-name" title="${s.name}">${s.name}</span>
          <span class="sub-bar-track"><span class="sub-bar-fill ${st}" data-width="${s.percent}" style="background:${statusColor(st)}"></span></span>
          <span class="sub-bar-pct">${s.percent}%</span>`;
        bars.appendChild(row);
      });
      group.appendChild(bars);
      wrap.appendChild(group);
    });
  }

  function renderRadar(svg, chars) {
    const n = chars.length;
    const cx = 210, cy = 210, maxR = 118, labelR = 168;
    svg.setAttribute("viewBox", "0 0 420 420");
    const rings = [20, 40, 60, 80, 100];
    const angleFor = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
    const pointAt = (i, value, radius = maxR) => {
      const a = angleFor(i);
      const r = (value / 100) * radius;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };
    let svgParts = "";
    rings.forEach((ring) => {
      const pts = chars.map((_, i) => pointAt(i, ring).join(",")).join(" ");
      svgParts += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    });
    chars.forEach((_, i) => {
      const [x, y] = pointAt(i, 100);
      svgParts += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    });
    const dataPts = chars.map((c, i) => pointAt(i, c.avg).join(",")).join(" ");
    svgParts += `<polygon points="${dataPts}" fill="url(#radarFill)" stroke="#5aafff" stroke-width="2.5"/>`;
    svgParts = `<defs>
      <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(90,175,255,0.35)"/>
        <stop offset="100%" stop-color="rgba(124,92,255,0.15)"/>
      </linearGradient>
    </defs>` + svgParts;
    chars.forEach((c, i) => {
      const [x, y] = pointAt(i, c.avg);
      svgParts += `<circle cx="${x}" cy="${y}" r="6" fill="${c.color}" stroke="#fff" stroke-width="1.2"/>`;
    });
    chars.forEach((c, i) => {
      const [x, y] = pointAt(i, 100, labelR);
      let anchor = "middle";
      if (Math.abs(x - cx) >= 5) anchor = x > cx ? "start" : "end";
      const shortName = c.name.length > 14 ? c.name.slice(0, 13) + "…" : c.name;
      svgParts += `<text x="${x}" y="${y}" font-size="12" font-weight="600" fill="#eef1f6" text-anchor="${anchor}" dominant-baseline="middle">${shortName}</text>
        <text x="${x}" y="${y + 15}" font-size="11" fill="${c.color}" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle">${c.avg}%</text>`;
    });
    svg.innerHTML = svgParts;
  }

  } catch (err) {
    showFatalError(err);
  }
})();
