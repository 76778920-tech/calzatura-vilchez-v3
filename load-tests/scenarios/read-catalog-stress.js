/**
 * Estrés de lectura de catálogo — simula fetchPublicProducts() masivo.
 * Meta RNF-CAP-02 (componente catálogo): hasta LOAD_CATALOG_VUS (default 1400).
 */
import { sleep } from "k6";
import { getConfig, buildStages } from "../lib/targets.js";
import {
  readBffCatalogActive,
  readBffCatalogPage,
  readBffCatalogBrowse,
  readBffFamilyCounts,
  readBffFeatured,
  readBffProductDetail,
  fetchSampleProductIds,
  pickRandom,
} from "../lib/reads.js";

const cfg = getConfig();
const catalogVus = Number(__ENV.LOAD_CATALOG_VUS || "1400");

export const options = {
  scenarios: {
    catalog_stress: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: buildStages(catalogVus, cfg.rampUp, cfg.steady, cfg.rampDown),
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    "http_req_duration{name:bff_catalog_active}": ["p(95)<2000"],
    "http_req_duration{name:bff_catalog_page}": ["p(95)<2000"],
    "http_req_duration{name:supabase_catalog_list}": ["p(95)<3000"],
    "http_req_duration{name:supabase_product_detail}": ["p(95)<2500"],
  },
};

export function setup() {
  return { productIds: fetchSampleProductIds(cfg, 100) };
}

export default function (data) {
  const roll = Math.random();
  if (roll < 0.55) {
    readBffCatalogActive(cfg);
  } else if (roll < 0.72) {
    readBffCatalogBrowse(cfg, Math.floor(Math.random() * 3) + 1, 24);
  } else if (roll < 0.85) {
    readBffProductDetail(cfg, pickRandom(data.productIds));
  } else if (roll < 0.95) {
    readBffFamilyCounts(cfg);
  } else {
    readBffFeatured(cfg);
  }
  sleep(Math.random() * 2 + 0.5);
}
