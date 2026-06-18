/**
 * Mix RNF-CAP-02: 2000 usuarios concurrentes en lecturas (sin escrituras destructivas).
 *
 * Reparto default (VUs en paralelo):
 *   1400 — listado catálogo Supabase (fetchPublicProducts)
 *    350 — detalle + familias + destacados
 *    200 — BFF health + cotización envío (lectura)
 *     50 — shell hosting (CDN)
 *
 * k6 run load-tests/scenarios/read-mixed-2000.js
 * Recomendado: LOAD_ENV=staging y proyecto Supabase de prueba.
 */
import { sleep } from "k6";
import { getConfig, buildStages } from "../lib/targets.js";
import {
  readBffCatalogActive,
  readBffCatalogPage,
  readProductDetail,
  readFamilyCounts,
  readFeatured,
  readBffHealth,
  readDeliveryQuote,
  readHostingShell,
  readAiHealth,
  fetchSampleProductIds,
  pickRandom,
} from "../lib/reads.js";

const cfg = getConfig();

const vusCatalog = Number(__ENV.LOAD_CATALOG_VUS || "1400");
const vusBrowse = Number(__ENV.LOAD_BROWSE_VUS || "350");
const vusBff = Number(__ENV.LOAD_BFF_VUS || "200");
const vusHosting = Number(__ENV.LOAD_HOSTING_VUS || "50");

function scaleStages(targetVus) {
  return [
    { duration: cfg.rampUp, target: targetVus },
    { duration: cfg.steady, target: targetVus },
    { duration: cfg.rampDown, target: 0 },
  ];
}

export const options = {
  scenarios: {
    supabase_catalog: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusCatalog),
      exec: "catalogWorker",
      gracefulRampDown: "30s",
    },
    supabase_browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusBrowse),
      exec: "browseWorker",
      gracefulRampDown: "30s",
    },
    bff_read: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusBff),
      exec: "bffWorker",
      gracefulRampDown: "30s",
    },
    hosting_static: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusHosting),
      exec: "hostingWorker",
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    "http_req_duration{name:bff_catalog_active}": ["p(95)<3000"],
    "http_req_duration{name:bff_catalog_page}": ["p(95)<3000"],
    "http_req_duration{name:supabase_catalog_list}": ["p(95)<3000"],
    "http_req_duration{name:supabase_product_detail}": ["p(95)<2500"],
    "http_req_duration{name:bff_health}": ["p(95)<1500"],
    "http_req_duration{name:hosting_index}": ["p(95)<2000"],
  },
};

export function setup() {
  return { productIds: fetchSampleProductIds(cfg, 120) };
}

export function catalogWorker() {
  readBffCatalogActive(cfg);
  const pagePct = Number(__ENV.LOAD_CATALOG_PAGE_PCT ?? "15") / 100;
  if (Math.random() < pagePct) {
    readBffCatalogPage(cfg, Math.floor(Math.random() * 4) + 1, 48);
  }
  sleep(Math.random() * 2 + 0.4);
}

export function browseWorker(data) {
  const r = Math.random();
  if (r < 0.5) {
    readProductDetail(cfg, pickRandom(data.productIds));
  } else if (r < 0.8) {
    readFamilyCounts(cfg);
  } else {
    readFeatured(cfg);
  }
  sleep(Math.random() * 2 + 0.5);
}

export function bffWorker() {
  readBffHealth(cfg);
  if (Math.random() < 0.35) {
    readDeliveryQuote(cfg);
  }
  if (Math.random() < 0.1) {
    readAiHealth(cfg);
  }
  sleep(Math.random() * 1.5 + 0.5);
}

export function hostingWorker() {
  readHostingShell(cfg);
  sleep(Math.random() * 3 + 1);
}

export default function () {
  catalogWorker();
}
