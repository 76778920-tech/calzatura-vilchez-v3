const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "dashboard-iso25000");

function makeEl(tag = "div") {
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    attributes: {},
    className: "",
    innerHTML: "",
    style: {},
    dataset: {},
    id: "",
    textContent: "",
    appendChild(c) {
      this.children.push(c);
      c.parent = this;
    },
    setAttribute(k, v) {
      this.attributes[k] = v;
      if (k === "id") this.id = v;
    },
    getAttribute(k) {
      return this.attributes[k] ?? null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    closest() {
      return this;
    },
    classList: {
      _s: new Set(),
      add(...c) {
        c.forEach((x) => this._s.add(x));
      },
      toggle(x, on) {
        on ? this._s.add(x) : this._s.delete(x);
      },
    },
    getBoundingClientRect() {
      return { top: 100, bottom: 200, left: 0, right: 100, width: 100, height: 100 };
    },
  };
  return el;
}

const byId = {};
const document = {
  title: "",
  getElementById(id) {
    return byId[id] ?? null;
  },
  querySelectorAll() {
    return [];
  },
  createElement(tag) {
    return makeEl(tag);
  },
};

function reg(id, tag = "div") {
  const el = makeEl(tag);
  el.id = id;
  byId[id] = el;
  return el;
}

[
  "page-title",
  "page-subtitle",
  "hero-scope",
  "methodology-text",
  "overall-pct",
  "header-kpi-value",
  "overall-ring",
  "meta-cards",
  "status-donut",
  "donut-legend",
  "characteristic-bars",
  "radar-chart",
  "grouped-bars",
  "instruments-grid",
  "characteristics-detail",
  "correlation-panel",
  "hero-badge-row",
  "scroll-progress",
  "site-header",
  "main-nav",
  "nav-links-row",
  "nav-indicator",
].forEach((id) => reg(id, id.includes("ring") || id.includes("donut") || id.includes("radar") ? "svg" : "div"));

global.document = document;
document.documentElement = { scrollTop: 0, scrollHeight: 3000 };
document.body = { scrollHeight: 3000, prepend() {} };
global.window = {
  scrollY: 0,
  innerHeight: 900,
  hash: "",
  addEventListener() {},
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: (cb) => {
    cb(0);
    return 1;
  },
};
global.location = { hash: "" };
global.history = { replaceState() {} };
global.performance = { now: () => 0 };
global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
global.MutationObserver = class {
  observe() {}
  disconnect() {}
};
global.fetch = async (url) => {
  const file = String(url).replace(/^\//, "");
  const p = path.join(ROOT, file);
  const body = fs.readFileSync(p, "utf8");
  return { ok: true, json: async () => JSON.parse(body), text: async () => body };
};

const code = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

try {
  vm.runInNewContext(code, global, { filename: "app.js", timeout: 10000 });
  setTimeout(() => {
    const metaCount = byId["meta-cards"].children.length;
    const bars = byId["characteristic-bars"].children.length;
    const overall = byId["overall-pct"].textContent;
    const radar = byId["radar-chart"].innerHTML.length;
    console.log(JSON.stringify({ ok: true, metaCount, bars, overall, radarLen: radar, subtitle: byId["page-subtitle"].textContent?.slice(0, 40) }, null, 2));
  }, 50);
} catch (e) {
  console.error("RUNTIME FAIL:", e.message);
  process.exit(1);
}
