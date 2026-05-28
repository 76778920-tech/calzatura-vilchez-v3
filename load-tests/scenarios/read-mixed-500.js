/**
 * Mix 500 VUs — lecturas amplias (catálogo, códigos, finanzas, campañas, BFF, hosting).
 * k6 run load-tests/scenarios/read-mixed-500.js
 */
import { sleep } from "k6";
import { Gauge } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { getConfig, buildStages } from "../lib/targets.js";
import {
  readBffCatalogActive,
  readBffCatalogPage,
  readBffFamilyCounts,
  readProductDetail,
  readBffHealth,
  readDeliveryQuote,
  readHostingShell,
  fetchSampleProductIds,
  pickRandom,
} from "../lib/reads.js";
import {
  readCatalogPaginated,
  readProductoCodigos,
  readProductoFinanzas,
  readCampanasDetectadas,
  readCampanaProductos,
  countTableRows,
} from "../lib/reads-extended.js";

const cfg = getConfig();

const vusCatalog = Number(__ENV.LOAD_CATALOG_VUS || "175");
const vusCatalogPage = Number(__ENV.LOAD_CATALOG_PAGE_VUS || "100");
const vusDetail = Number(__ENV.LOAD_DETAIL_VUS || "75");
const vusMeta = Number(__ENV.LOAD_META_VUS || "50");
const vusCampanas = Number(__ENV.LOAD_CAMPANAS_VUS || "40");
const vusBff = Number(__ENV.LOAD_BFF_VUS || "40");
const vusHosting = Number(__ENV.LOAD_HOSTING_VUS || "20");

const volProductosActivos = new Gauge("volume_productos_activos");
const volProductosTotal = new Gauge("volume_productos_total");
const volCodigos = new Gauge("volume_producto_codigos");
const volVentas = new Gauge("volume_ventas_diarias");
const volPedidos = new Gauge("volume_pedidos");
const volUsuarios = new Gauge("volume_usuarios");
const volCampanas = new Gauge("volume_campanas");

function scaleStages(targetVus) {
  return [
    { duration: cfg.rampUp, target: targetVus },
    { duration: cfg.steady, target: targetVus },
    { duration: cfg.rampDown, target: 0 },
  ];
}

export const options = {
  scenarios: {
    catalog_full: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusCatalog),
      exec: "catalogFullWorker",
      gracefulRampDown: "20s",
    },
    catalog_paged: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusCatalogPage),
      exec: "catalogPageWorker",
      gracefulRampDown: "20s",
    },
    product_detail: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusDetail),
      exec: "detailWorker",
      gracefulRampDown: "20s",
    },
    product_meta: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusMeta),
      exec: "metaWorker",
      gracefulRampDown: "20s",
    },
    campanas: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusCampanas),
      exec: "campanasWorker",
      gracefulRampDown: "20s",
    },
    bff_read: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusBff),
      exec: "bffWorker",
      gracefulRampDown: "20s",
    },
    hosting_static: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: scaleStages(vusHosting),
      exec: "hostingWorker",
      gracefulRampDown: "20s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    "http_req_failed{name:bff_catalog_active}": ["rate<0.01"],
    "http_req_failed{name:bff_catalog_page}": ["rate<0.01"],
    "http_req_failed{name:supabase_catalog_list}": ["rate<0.01"],
    "http_req_failed{name:supabase_catalog_page}": ["rate<0.01"],
    "http_req_failed{name:supabase_product_detail}": ["rate<0.01"],
    "http_req_failed{name:supabase_producto_codigos}": ["rate<0.01"],
    "http_req_duration{name:bff_catalog_active}": ["p(95)<4000"],
    "http_req_duration{name:bff_catalog_page}": ["p(95)<3000"],
    "http_req_duration{name:supabase_catalog_list}": ["p(95)<4000"],
    "http_req_duration{name:supabase_catalog_page}": ["p(95)<3000"],
    "http_req_duration{name:supabase_product_detail}": ["p(95)<3000"],
  },
};

export function setup() {
  const productIds = fetchSampleProductIds(cfg, 150);
  const volumes = {
    productos_activos: countTableRows(cfg, "productos", "activo=eq.true"),
    productos_total: countTableRows(cfg, "productos"),
    producto_codigos: countTableRows(cfg, "productoCodigos"),
    ventas_diarias: countTableRows(cfg, "ventasDiarias"),
    pedidos: countTableRows(cfg, "pedidos"),
    usuarios: countTableRows(cfg, "usuarios"),
    campanas: countTableRows(cfg, "campanas_detectadas"),
  };
  if (volumes.productos_activos.count >= 0) volProductosActivos.add(volumes.productos_activos.count);
  if (volumes.productos_total.count >= 0) volProductosTotal.add(volumes.productos_total.count);
  if (volumes.producto_codigos.count >= 0) volCodigos.add(volumes.producto_codigos.count);
  if (volumes.ventas_diarias.count >= 0) volVentas.add(volumes.ventas_diarias.count);
  if (volumes.pedidos.count >= 0) volPedidos.add(volumes.pedidos.count);
  if (volumes.usuarios.count >= 0) volUsuarios.add(volumes.usuarios.count);
  if (volumes.campanas.count >= 0) volCampanas.add(volumes.campanas.count);
  console.log(`[data-audit] ${JSON.stringify(volumes)}`);
  return { productIds, volumes };
}

export function catalogFullWorker() {
  readBffCatalogActive(cfg);
  sleep(Math.random() * 1.5 + 0.3);
}

export function catalogPageWorker() {
  const page = Math.floor(Math.random() * 8) + 1;
  readBffCatalogPage(cfg, page, 48);
  if (Math.random() < 0.25) {
    readCatalogPaginated(cfg, page - 1, 48);
  }
  sleep(Math.random() * 1.5 + 0.4);
}

export function detailWorker(data) {
  readProductDetail(cfg, pickRandom(data.productIds));
  sleep(Math.random() * 1.5 + 0.4);
}

export function metaWorker() {
  const r = Math.random();
  if (r < 0.7) {
    readProductoCodigos(cfg);
  } else {
    readProductoFinanzas(cfg);
  }
  sleep(Math.random() * 1.2 + 0.4);
}

export function campanasWorker() {
  if (Math.random() < 0.55) {
    readCampanasDetectadas(cfg);
  } else {
    readCampanaProductos(cfg);
  }
  sleep(Math.random() * 1.5 + 0.5);
}

export function bffWorker() {
  readBffHealth(cfg);
  if (Math.random() < 0.25) {
    readDeliveryQuote(cfg);
  }
  sleep(Math.random() * 1.2 + 0.5);
}

export function hostingWorker() {
  readHostingShell(cfg);
  sleep(Math.random() * 2 + 0.8);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    "artifacts/load-tests/summary-500.json": JSON.stringify(
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
  catalogFullWorker();
}
