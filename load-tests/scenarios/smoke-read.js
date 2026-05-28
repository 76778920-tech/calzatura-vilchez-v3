/**
 * Humo de lectura — validar scripts y credenciales (20 VUs, ~2 min).
 * k6 run load-tests/scenarios/smoke-read.js
 */
import { sleep } from "k6";
import { getConfig } from "../lib/targets.js";
import {
  readBffCatalogActive,
  readBffCatalogPage,
  readProductDetail,
  readBffHealth,
  fetchSampleProductIds,
  pickRandom,
} from "../lib/reads.js";

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: 20,
      duration: "2m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    "http_req_duration{name:bff_catalog_active}": ["p(95)<5000"],
    "http_req_duration{name:supabase_catalog_list}": ["p(95)<5000"],
  },
};

const cfg = getConfig();

export function setup() {
  return { productIds: fetchSampleProductIds(cfg, 40) };
}

export default function (data) {
  readBffCatalogActive(cfg);
  readBffCatalogPage(cfg, 1, 48);
  readProductDetail(cfg, pickRandom(data.productIds));
  readBffHealth(cfg);
  sleep(1);
}
