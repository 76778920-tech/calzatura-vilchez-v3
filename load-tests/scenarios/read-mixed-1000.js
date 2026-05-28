/**
 * Mix 1.000 VUs — lecturas de catálogo vía BFF (meta RNF-CAP-02 prioridad 1).
 * k6 run load-tests/scenarios/read-mixed-1000.js
 */
import { sleep } from "k6";
import { Gauge } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { getConfig } from "../lib/targets.js";
import {
  readBffCatalogActive,
  readBffCatalogPage,
  readBffFamilyCounts,
  readBffProductDetail,
  readBffCatalogBrowse,
  readBffHealth,
  readHostingShell,
  fetchSampleProductIds,
  pickRandom,
} from "../lib/reads.js";
import {
  readProductoCodigos,
  readProductoFinanzas,
  readCampanasDetectadas,
  readCampanaProductos,
  countTableRows,
} from "../lib/reads-extended.js";

const cfg = getConfig();

const vusCatalog = Number(__ENV.LOAD_CATALOG_VUS || "350");
const vusCatalogPage = Number(__ENV.LOAD_CATALOG_PAGE_VUS || "200");
const vusDetail = Number(__ENV.LOAD_DETAIL_VUS || "150");
const vusMeta = Number(__ENV.LOAD_META_VUS || "100");
const vusCampanas = Number(__ENV.LOAD_CAMPANAS_VUS || "80");
const vusBff = Number(__ENV.LOAD_BFF_VUS || "80");
const vusHosting = Number(__ENV.LOAD_HOSTING_VUS || "40");

const volProductosActivos = new Gauge("volume_productos_activos");

function scaleStages(targetVus) {
  return [
    { duration: cfg.rampUp, target: targetVus },
    { duration: cfg.steady, target: targetVus },
    { duration: cfg.rampDown, target: 0 },
  ];
}

export const options = {
  scenarios: {
    catalog_active: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusCatalog),
      exec: "catalogActiveWorker",
      gracefulRampDown: "25s",
    },
    catalog_paged: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusCatalogPage),
      exec: "catalogPageWorker",
      gracefulRampDown: "25s",
    },
    product_detail: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusDetail),
      exec: "detailWorker",
      gracefulRampDown: "25s",
    },
    product_meta: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusMeta),
      exec: "metaWorker",
      gracefulRampDown: "25s",
    },
    campanas: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusCampanas),
      exec: "campanasWorker",
      gracefulRampDown: "25s",
    },
    bff_misc: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusBff),
      exec: "bffWorker",
      gracefulRampDown: "25s",
    },
    hosting_static: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusHosting),
      exec: "hostingWorker",
      gracefulRampDown: "25s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_failed{name:bff_catalog_active}": ["rate<0.01"],
    "http_req_failed{name:bff_catalog_page}": ["rate<0.01"],
    "http_req_duration{name:bff_catalog_active}": ["p(95)<2000"],
    "http_req_duration{name:bff_catalog_page}": ["p(95)<2000"],
    "http_req_duration{name:supabase_product_detail}": ["p(95)<2500"],
  },
};

export function setup() {
  const productIds = fetchSampleProductIds(cfg, 150);
  const activos = countTableRows(cfg, "productos", "activo=eq.true");
  if (activos.count >= 0) volProductosActivos.add(activos.count);
  console.log(`[data-audit] productos_activos=${activos.count} bff=${cfg.bffBaseUrl || "none"}`);
  return { productIds };
}

export function catalogActiveWorker() {
  readBffCatalogActive(cfg);
  if (Math.random() < 0.15) {
    readBffFamilyCounts(cfg);
  }
  sleep(Math.random() * 1.2 + 0.25);
}

export function catalogPageWorker() {
  const page = Math.floor(Math.random() * 5) + 1;
  readBffCatalogBrowse(cfg, page, 24);
  sleep(Math.random() * 1.2 + 0.3);
}

export function detailWorker(data) {
  readBffProductDetail(cfg, pickRandom(data.productIds));
  sleep(Math.random() * 1.2 + 0.3);
}

export function metaWorker() {
  if (Math.random() < 0.75) {
    readProductoCodigos(cfg);
  } else {
    readProductoFinanzas(cfg);
  }
  sleep(Math.random() * 1 + 0.35);
}

export function campanasWorker() {
  if (Math.random() < 0.55) {
    readCampanasDetectadas(cfg);
  } else {
    readCampanaProductos(cfg);
  }
  sleep(Math.random() * 1.2 + 0.4);
}

export function bffWorker() {
  readBffHealth(cfg);
  if (Math.random() < 0.2) {
    readBffFamilyCounts(cfg);
  }
  sleep(Math.random() * 1 + 0.4);
}

export function hostingWorker() {
  readHostingShell(cfg);
  sleep(Math.random() * 1.5 + 0.5);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    "artifacts/load-tests/summary-1000.json": JSON.stringify(
      {
        at: new Date().toISOString(),
        metrics: data.metrics,
        root_group: data.root_group,
      },
      null,
      2,
    ),
  };
}

export default function () {
  catalogActiveWorker();
}
