/**
 * Hub de evidencias — documentación .md, código del repo, gates y artefactos.
 */
(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMarkdown(src) {
    const lines = src.split("\n");
    let html = "";
    let inCode = false;
    let codeBuf = [];
    let codeLang = "";

    const flushCode = () => {
      if (!codeBuf.length) return;
      html += `<pre class="md-code"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
      codeBuf = [];
    };

    for (let line of lines) {
      if (line.startsWith("```")) {
        if (inCode) {
          flushCode();
          inCode = false;
          codeLang = "";
        } else {
          inCode = true;
          codeLang = line.slice(3).trim();
        }
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        continue;
      }
      if (/^#{1,3}\s/.test(line)) {
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s*/, "");
        html += `<h${level + 2}>${inlineMd(text)}</h${level + 2}>`;
        continue;
      }
      if (/^\|.+\|$/.test(line.trim())) {
        html += `<p class="md-table-row">${inlineMd(line)}</p>`;
        continue;
      }
      if (/^[-*]\s/.test(line)) {
        html += `<li>${inlineMd(line.replace(/^[-*]\s/, ""))}</li>`;
        continue;
      }
      if (!line.trim()) {
        html += "<br/>";
        continue;
      }
      html += `<p>${inlineMd(line)}</p>`;
    }
    flushCode();
    return html;
  }

  function inlineMd(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  async function fetchFile(path, start, end) {
    const q = new URLSearchParams({ path, start: String(start), end: String(end) });
    const r = await fetch(`/api/evidence/file?${q}`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "No se pudo cargar el archivo");
    return data;
  }

  window.initEvidenceHub = function initEvidenceHub(opts) {
    const { manifest, characteristics, onNavigateTab } = opts;
    const nav = document.getElementById("evidence-nav");
    const viewer = document.getElementById("evidence-viewer");
    const typeTabs = document.getElementById("evidence-type-tabs");
    if (!nav || !viewer || !manifest) return;

    let currentSub = "Idoneidad";
    let currentType = "docs";
    let currentItem = null;

    function showTab(tabId) {
      if (typeof onNavigateTab === "function") onNavigateTab(tabId);
    }

    window.dashboardOpenEvidence = function (sub, path, type) {
      if (sub) currentSub = sub;
      if (type) currentType = type;
      showTab("evidencias");
      renderNav();
      if (path) {
        loadItemByPath(path);
      } else {
        loadFirstOfType();
      }
    };

    function entryForSub(name) {
      return manifest.subcharacteristics[name] || { docs: [], code: [], gates: [], artifacts: [] };
    }

    function itemsForType(entry, type) {
      if (type === "docs") return entry.docs || [];
      if (type === "code") return entry.code || [];
      if (type === "gates") return entry.gates || [];
      if (type === "artifacts") return entry.artifacts || [];
      if (type === "global") return manifest.global?.docs || [];
      return [];
    }

    function renderNav() {
      nav.innerHTML = "";
      const globalBtn = document.createElement("button");
      globalBtn.type = "button";
      globalBtn.className = `ev-nav-item ${currentSub === "__global__" ? "is-active" : ""}`;
      globalBtn.textContent = "Global (marco SQuaRE)";
      globalBtn.addEventListener("click", () => {
        currentSub = "__global__";
        currentType = "docs";
        renderNav();
        renderTypeTabs();
        loadFirstOfType();
      });
      nav.appendChild(globalBtn);

      characteristics.forEach((char) => {
        const head = document.createElement("div");
        head.className = "ev-nav-char";
        head.textContent = char.name;
        nav.appendChild(head);
        char.subcharacteristics.forEach((sub) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `ev-nav-item ${currentSub === sub.name ? "is-active" : ""}`;
          btn.innerHTML = `<span>${sub.name}</span><strong>${sub.percent}%</strong>`;
          btn.addEventListener("click", () => {
            currentSub = sub.name;
            renderNav();
            renderTypeTabs();
            loadFirstOfType();
          });
          nav.appendChild(btn);
        });
      });
    }

    function renderTypeTabs() {
      const types =
        currentSub === "__global__"
          ? [
              ["docs", "Documentación"],
              ["ops-reports", "Stress · ZAP · Ops"],
              ["global-ci", "CI / Pipeline"],
              ["diagram", "Diagrama"],
            ]
          : [
              ["docs", "Documentación (.md)"],
              ["code", "Código fuente"],
              ["gates", "Gates / comandos"],
              ["artifacts", "Artefactos (CSV/JSON)"],
            ];
      typeTabs.innerHTML = types
        .map(
          ([id, label]) =>
            `<button type="button" class="ev-type-btn ${currentType === id ? "is-active" : ""}" data-type="${id}">${label}</button>`,
        )
        .join("");
      typeTabs.querySelectorAll(".ev-type-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          currentType = btn.dataset.type;
          renderTypeTabs();
          loadFirstOfType();
        });
      });
    }

    async function loadFirstOfType() {
      if (currentType === "diagram") {
        renderDiagram();
        return;
      }
      if (currentType === "ops-reports") {
        renderOpsReports();
        return;
      }
      if (currentType === "global-ci") {
        const ci = manifest.global?.ci?.[0];
        if (ci) await loadCodeItem(ci);
        else renderEmpty("Sin pipeline CI en manifiesto");
        return;
      }
      const entry = currentSub === "__global__" ? { docs: manifest.global?.docs || [] } : entryForSub(currentSub);
      const items = itemsForType(entry, currentType === "global-ci" ? "code" : currentType);
      if (currentType === "gates") {
        renderGates(items);
        return;
      }
      if (!items.length) {
        renderEmpty(`Sin evidencias «${currentType}» para ${currentSub}`);
        return;
      }
      const item = items[0];
      if (currentType === "docs") await loadDocItem(item);
      else if (currentType === "code" || currentType === "artifacts") await loadCodeItem(item);
    }

    function loadItemByPath(path) {
      const entry = currentSub === "__global__" ? { docs: manifest.global?.docs || [] } : entryForSub(currentSub);
      for (const type of ["docs", "code", "artifacts"]) {
        const found = itemsForType(entry, type).find((i) => i.path === path);
        if (found) {
          currentType = type;
          renderTypeTabs();
          if (type === "docs") return loadDocItem(found);
          return loadCodeItem(found);
        }
      }
      if (path.endsWith(".md")) {
        currentType = "docs";
        return loadDocItem({ path, title: path.split("/").pop() });
      }
      currentType = "code";
      return loadCodeItem({ path, title: path.split("/").pop(), startLine: 1, endLine: 120 });
    }

    function renderEmpty(msg) {
      viewer.innerHTML = `<div class="ev-empty panel">${escapeHtml(msg)}</div>`;
    }

    function renderOpsReports() {
      const stress = manifest.global?.stress || [];
      const zap = manifest.global?.zap || [];
      const stressRows = stress
        .map(
          (i) =>
            `<li><a href="${i.path.endsWith(".html") ? "/stress/" : "#"}" ${i.path.endsWith(".html") ? 'target="_blank"' : ""} data-path="${escapeHtml(i.path)}">${escapeHtml(i.title)}</a> <code>${escapeHtml(i.path)}</code></li>`,
        )
        .join("");
      const zapRows = zap
        .map(
          (i) =>
            `<li><a href="${i.path.endsWith(".html") ? "/zap/" : "#"}" ${i.path.endsWith(".html") ? 'target="_blank"' : ""} data-path="${escapeHtml(i.path)}">${escapeHtml(i.title)}</a> <code>${escapeHtml(i.path)}</code></li>`,
        )
        .join("");
      viewer.innerHTML = `
        <article class="ev-panel panel glass-panel">
          <header class="ev-panel-head"><h3>Informes para ingeniería — DevOps / calidad</h3></header>
          <p class="muted">Informes gráficos (como ZAP DAST) para revisión con el ingeniero.</p>
          <h4>Abrir informes HTML</h4>
          <p><a class="nav-link nav-cta" href="/stress/" target="_blank" rel="noopener">Informe stress k6 (RNF-CAP-02) →</a></p>
          <p><a class="nav-link nav-cta" href="/zap/" target="_blank" rel="noopener">Informe ZAP seguridad (DAST) →</a></p>
          <h4>Evidencia stress k6</h4>
          <ul class="ev-list">${stressRows || "<li>Sin entradas</li>"}</ul>
          <h4>Evidencia ZAP</h4>
          <ul class="ev-list">${zapRows || "<li>Sin entradas</li>"}</ul>
        </article>`;
      viewer.querySelectorAll("[data-path]").forEach((a) => {
        if (a.getAttribute("href") !== "#") return;
        a.addEventListener("click", (e) => {
          e.preventDefault();
          loadItemByPath(a.dataset.path);
        });
      });
    }

    function renderDiagram() {
      const d = manifest.global?.diagram;
      if (!d) return renderEmpty("Diagrama no configurado");
      viewer.innerHTML = `
        <article class="ev-panel panel glass-panel">
          <header class="ev-panel-head"><h3>${escapeHtml(d.title)}</h3><code>${escapeHtml(d.path)}</code></header>
          <div class="ev-diagram-wrap"><img src="/api/evidence/image?path=${encodeURIComponent(d.path)}" alt="${escapeHtml(d.title)}"/></div>
        </article>`;
      // Image needs binary - fix API to support png OR use static path
    }

    async function loadDocItem(item) {
      currentItem = item;
      viewer.innerHTML = `<div class="ev-loading">Cargando ${escapeHtml(item.path)}…</div>`;
      try {
        let start = 1;
        let end = 150;
        let all = "";
        let total = 0;
        let truncated = true;
        while (truncated) {
          const data = await fetchFile(item.path, start, end);
          total = data.totalLines;
          all += (all ? "\n" : "") + data.content;
          truncated = data.truncated;
          start = end + 1;
          end = Math.min(start + 149, total);
          if (start > total) break;
          if (all.split("\n").length > 400) break;
        }
        renderDocView(item, all, total);
      } catch (e) {
        viewer.innerHTML = `<div class="ev-error panel">${escapeHtml(e.message)}</div>`;
      }
    }

    function renderDocView(item, content, totalLines) {
      const list =
        currentSub === "__global__"
          ? manifest.global?.docs || []
          : itemsForType(entryForSub(currentSub), "docs");
      viewer.innerHTML = `
        <article class="ev-panel panel glass-panel">
          <header class="ev-panel-head">
            <div><h3>${escapeHtml(item.title || item.path)}</h3><code class="ev-path">${escapeHtml(item.path)}</code></div>
            <div class="ev-actions">
              <span class="muted">${totalLines} líneas</span>
              <button type="button" class="btn-secondary ev-copy" data-copy="md">Copiar Markdown</button>
            </div>
          </header>
          <div class="ev-doc-list">${list
            .map(
              (d) =>
                `<button type="button" class="ev-chip ${d.path === item.path ? "is-active" : ""}" data-path="${escapeHtml(d.path)}" data-kind="doc">${escapeHtml(d.title)}</button>`,
            )
            .join("")}</div>
          <div class="ev-md-body">${renderMarkdown(content)}</div>
        </article>`;
      wireViewer(item, content);
    }

    async function loadCodeItem(item) {
      currentItem = item;
      viewer.innerHTML = `<div class="ev-loading">Cargando código…</div>`;
      try {
        const data = await fetchFile(item.path, item.startLine || 1, item.endLine || 120);
        renderCodeView(item, data);
      } catch (e) {
        viewer.innerHTML = `<div class="ev-error panel">${escapeHtml(e.message)}</div>`;
      }
    }

    function renderCodeView(item, data) {
      const lines = data.content.split("\n");
      const nums = lines
        .map((_, i) => `<span class="ln">${data.startLine + i}</span>`)
        .join("");
      const code = lines.map((l) => escapeHtml(l)).join("\n");
      const list =
        currentType === "artifacts"
          ? itemsForType(entryForSub(currentSub), "artifacts")
          : itemsForType(entryForSub(currentSub), "code");

      viewer.innerHTML = `
        <article class="ev-panel panel glass-panel">
          <header class="ev-panel-head">
            <div><h3>${escapeHtml(item.title || item.path)}</h3><code class="ev-path">${escapeHtml(data.path)} · ${data.language}</code></div>
            <div class="ev-actions">
              <span class="muted">L${data.startLine}–${data.endLine} de ${data.totalLines}</span>
              <button type="button" class="btn-secondary ev-more" ${data.endLine >= data.totalLines ? "disabled" : ""}>+ líneas</button>
              <button type="button" class="btn-secondary ev-copy" data-copy="code">Copiar</button>
            </div>
          </header>
          <div class="ev-doc-list">${list
            .map(
              (d) =>
                `<button type="button" class="ev-chip ${d.path === item.path ? "is-active" : ""}" data-path="${escapeHtml(d.path)}" data-kind="code">${escapeHtml(d.title)}</button>`,
            )
            .join("")}</div>
          <div class="ev-code-wrap"><div class="ev-gutter">${nums}</div><pre class="ev-code"><code>${code}</code></pre></div>
        </article>`;
      wireViewer(item, data.content, data);
    }

    function renderGates(gates) {
      if (!gates.length) return renderEmpty("Sin gates definidos");
      viewer.innerHTML = `
        <article class="ev-panel panel glass-panel">
          <header class="ev-panel-head"><h3>Comandos de verificación — ${escapeHtml(currentSub)}</h3></header>
          <ul class="ev-gate-list">${gates
            .map(
              (g) => `<li><p>${escapeHtml(g.desc)}</p><code class="ev-gate-cmd">${escapeHtml(g.command)}</code>
              <button type="button" class="btn-secondary ev-copy-cmd" data-cmd="${escapeHtml(g.command)}">Copiar</button></li>`,
            )
            .join("")}</ul>
        </article>`;
      viewer.querySelectorAll(".ev-copy-cmd").forEach((btn) => {
        btn.addEventListener("click", () => navigator.clipboard?.writeText(btn.dataset.cmd));
      });
    }

    function wireViewer(item, content, data) {
      viewer.querySelectorAll(".ev-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const p = chip.dataset.path;
          if (chip.dataset.kind === "doc") loadDocItem({ path: p, title: chip.textContent });
          else loadCodeItem({ path: p, title: chip.textContent, startLine: 1, endLine: 120 });
        });
      });
      const copyBtn = viewer.querySelector(".ev-copy");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => navigator.clipboard?.writeText(content));
      }
      const moreBtn = viewer.querySelector(".ev-more");
      if (moreBtn && data) {
        moreBtn.addEventListener("click", () => {
          loadCodeItem({
            ...item,
            startLine: item.startLine || 1,
            endLine: Math.min((item.endLine || 120) + 120, data.totalLines),
          });
          item.endLine = Math.min((item.endLine || 120) + 120, data.totalLines);
        });
      }
    }

    renderNav();
    renderTypeTabs();
    loadFirstOfType();

    document.addEventListener("dashboard:open-evidence", (e) => {
      const { sub, path, type } = e.detail || {};
      window.dashboardOpenEvidence(sub, path, type);
    });
  };
})();
