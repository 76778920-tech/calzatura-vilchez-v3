// Dashboard ISO/IEC 25000 — UI completa con gráficos, listas de cotejo y correlación CF/COF/TECP.
(async function () {
  const [data, catalog, checklistsData] = await Promise.all([
    fetch("data.json").then((r) => r.json()),
    fetch("instruments-catalog.json").then((r) => r.json()),
    fetch("checklists-data.json").then((r) => r.json()),
  ]);
  const { meta, characteristics } = data;
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

  // --- Cabecera ---
  document.title = meta.title + " — " + meta.project;
  document.getElementById("page-title").textContent = meta.title;
  document.getElementById("page-subtitle").textContent = meta.project + " — " + meta.scope;
  document.getElementById("hero-scope").textContent = meta.scope;
  document.getElementById("methodology-text").textContent = meta.methodology;

  document.getElementById("overall-pct").textContent = overall + "%";
  renderRing(document.getElementById("overall-ring"), overall, statusColor(statusFor(overall)));

  // --- Meta cards ---
  const metaCards = document.getElementById("meta-cards");
  [
    [overall + "%", "Cumplimiento global (6 características)", statusFor(overall)],
    [counts.ok, "Subcaracterísticas ≥ " + OK + "%", "ok"],
    [counts.warn, "Parciales " + WARN + "–" + (OK - 1) + "%", "warn"],
    [counts.bad, "No cumple (< " + WARN + "%)", "bad"],
    [allSubs.length, "Subcaracterísticas evaluadas", "neutral"],
  ].forEach(([num, label, st]) => metaCards.appendChild(metaCard(num, label, st)));

  function metaCard(num, label, status) {
    const div = document.createElement("div");
    div.className = "meta-card " + status;
    div.innerHTML = `<div class="num">${num}</div><div class="label">${label}</div>`;
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
      <span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span>
      <span class="bar-pct">${pct}%</span>`;
    return row;
  }

  // --- Radar ---
  renderRadar(document.getElementById("radar-chart"), charAverages);

  // --- Barras agrupadas subcaracterísticas ---
  renderGroupedBars(document.getElementById("grouped-bars"), characteristics);

  // --- Listas de cotejo (formato UNAM: Sí / No) ---
  renderChecklists(document.getElementById("instruments-grid"), characteristics, checklistsData);

  // --- Detalle tablas ---
  const detailWrap = document.getElementById("characteristics-detail");
  charAverages.forEach((c) => detailWrap.appendChild(charDetailCard(c)));

  // --- Correlación live ---
  loadCorrelation(document.getElementById("correlation-panel"), QC_ROUTE);

  // --- Nav scroll spy ---
  setupNav();

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
        barsSvg += `<rect x="${x}" y="${baseY - h}" width="${barW}" height="${h}" rx="6" class="corr-bar level-${item.level}"/>`;
        barsSvg += `<text x="${x + barW / 2}" y="${baseY - h - 6}" text-anchor="middle" class="corr-pct">${v?.toFixed(1) ?? "N/D"}%</text>`;
        barsSvg += `<text x="${x + barW / 2}" y="${baseY + 14}" text-anchor="middle" class="corr-code">${item.code}</text>`;
      });

      container.innerHTML = `
        <div class="correlation-grid">
          <article class="panel correlation-chart">
            <div class="corr-head">
              <div>
                <h3>Cumplimiento interno — ${ev.codigo}</h3>
                <p class="muted">${ev.titulo} · ${ev.periodo}</p>
              </div>
              <div class="corr-avg level-${m.promedio_classification.level}">
                Promedio: <strong>${m.promedio_adecuacion?.toFixed(1)}%</strong> · ${m.promedio_classification.label}
              </div>
            </div>
            <svg viewBox="0 0 ${chartW} ${chartH + 10}" class="corr-svg">${barsSvg}</svg>
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
        details.open = idx === 0 && c.id === "funcionalidad";
        details.innerHTML = `
          <summary class="checklist-summary">
            <span class="checklist-title">${cl.titulo}</span>
            <span class="status-pill ${st}">${stats.pct}% · ${stats.si}/${stats.total} Sí</span>
          </summary>
          <div class="checklist-body">${renderChecklistTable(cl)}
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
    head.style.background = c.color;
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
          <td><div class="pct-cell"><span class="mini-bar-track"><span class="mini-bar-fill" style="width:${s.percent}%;background:${statusColor(st)}"></span></span><strong>${s.percent}%</strong></div></td>
          <td><span class="status-pill ${st}">${statusLabel(st)}</span></td>
          <td class="inst-cell">${cl ? `${stats.si} / ${stats.total}` : chk.nombre}</td>
          <td class="evidence">${s.evidence}</td>
        </tr>`;
      }).join("")}</tbody></table>`;
    card.appendChild(tableWrap);
    return card;
  }

  function setupNav() {
    const links = document.querySelectorAll(".main-nav .nav-link:not(.nav-cta)");
    const sections = [...links].map((l) => document.querySelector(l.getAttribute("href"))).filter(Boolean);
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id));
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    sections.forEach((s) => obs.observe(s));
  }

  // ========== GRÁFICOS ==========
  function renderRing(svg, pct, color) {
    const r = 50, cx = 60, cy = 60, circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - pct / 100);
    svg.innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="10"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="10"
        stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${cx} ${cy})"/>`;
  }

  function renderDonut(svg, counts) {
    const total = counts.ok + counts.warn + counts.bad || 1;
    const cx = 100, cy = 100, r = 70, ir = 44;
    const slices = [
      { n: counts.ok, color: "#2e9e5b" },
      { n: counts.warn, color: "#e0a92c" },
      { n: counts.bad, color: "#d9483d" },
    ];
    let angle = -Math.PI / 2;
    let paths = "";
    slices.forEach(({ n, color }) => {
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
      paths += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z" fill="${color}"/>`;
    });
    svg.innerHTML = paths + `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="700" fill="#1c2733">${total}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" fill="#5b6b7c">subcaract.</text>`;
  }

  function renderGroupedBars(wrap, chars) {
    const maxBarW = 120;
    chars.forEach((c) => {
      const group = document.createElement("div");
      group.className = "group-block";
      group.innerHTML = `<div class="group-label" style="color:${c.color}">${c.name}</div>`;
      const bars = document.createElement("div");
      bars.className = "group-bars";
      c.subcharacteristics.forEach((s) => {
        const st = statusFor(s.percent);
        const w = (s.percent / 100) * maxBarW;
        const row = document.createElement("div");
        row.className = "sub-bar-row";
        row.innerHTML = `
          <span class="sub-bar-name" title="${s.name}">${s.name}</span>
          <span class="sub-bar-track"><span class="sub-bar-fill ${st}" style="width:${w}px;background:${statusColor(st)}"></span></span>
          <span class="sub-bar-pct">${s.percent}%</span>`;
        bars.appendChild(row);
      });
      group.appendChild(bars);
      wrap.appendChild(group);
    });
  }

  function renderRadar(svg, chars) {
    const n = chars.length;
    svg.setAttribute("viewBox", "0 0 800 800");
    const cx = 400, cy = 400, maxR = 240, labelR = 300;
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
      svgParts += `<polygon points="${pts}" fill="none" stroke="#e1e6eb" stroke-width="1"/>`;
    });
    chars.forEach((_, i) => {
      const [x, y] = pointAt(i, 100);
      svgParts += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#e1e6eb" stroke-width="1"/>`;
    });
    const dataPts = chars.map((c, i) => pointAt(i, c.avg).join(",")).join(" ");
    svgParts += `<polygon points="${dataPts}" fill="rgba(47,111,179,0.25)" stroke="#2f6fb3" stroke-width="2"/>`;
    chars.forEach((c, i) => {
      const [x, y] = pointAt(i, c.avg);
      svgParts += `<circle cx="${x}" cy="${y}" r="6" fill="${c.color}"/>`;
    });
    chars.forEach((c, i) => {
      const [x, y] = pointAt(i, 100, labelR);
      let anchor = "middle";
      if (Math.abs(x - cx) >= 5) anchor = x > cx ? "start" : "end";
      svgParts += `<text x="${x}" y="${y}" font-size="17" font-weight="600" fill="#1c2733" text-anchor="${anchor}" dominant-baseline="middle">${c.name}</text>
        <text x="${x}" y="${y + 20}" font-size="14" fill="${c.color}" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle">${c.avg}%</text>`;
    });
    svg.innerHTML = svgParts;
  }
})();
