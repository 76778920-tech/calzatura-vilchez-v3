import http from "k6/http";
import { check, fail } from "k6";
import { supabaseHeaders } from "./targets.js";

function bffOpts(cfg, tags, timeout = "30s") {
  const opts = { tags, timeout };
  if (cfg.loadTestToken) {
    opts.headers = { "X-Load-Test-Token": cfg.loadTestToken };
  }
  return opts;
}

/** fetchPublicProducts() vía BFF (caché). Si no hay BFF, cae a Supabase directo. */
export function readBffCatalogActive(cfg) {
  if (!cfg.bffBaseUrl) {
    return readCatalogList(cfg);
  }
  const res = http.get(`${cfg.bffBaseUrl}/public/catalog/active`, bffOpts(cfg, { name: "bff_catalog_active" }));
  check(res, {
    "bff catalog active 200": (r) => r.status === 200,
    "bff catalog active tiene products": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).products);
      } catch {
        return false;
      }
    },
  });
  return res;
}

/** Catálogo paginado vía BFF. */
export function readBffCatalogPage(cfg, page = 1, limit = 48) {
  if (!cfg.bffBaseUrl) {
    return readCatalogList(cfg);
  }
  const url = `${cfg.bffBaseUrl}/public/catalog?page=${page}&limit=${limit}`;
  const res = http.get(url, bffOpts(cfg, { name: "bff_catalog_page" }));
  check(res, {
    "bff catalog page 200": (r) => r.status === 200,
    "bff catalog page tiene products": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).products);
      } catch {
        return false;
      }
    },
  });
  return res;
}

/** ProductsPage — catálogo filtrado y paginado en servidor. */
export function readBffCatalogBrowse(cfg, page = 1, limit = 24) {
  if (!cfg.bffBaseUrl) {
    return readCatalogList(cfg);
  }
  const url = `${cfg.bffBaseUrl}/public/catalog/browse?page=${page}&limit=${limit}&categoria=todos`;
  const res = http.get(url, bffOpts(cfg, { name: "bff_catalog_browse" }));
  check(res, {
    "bff catalog browse 200": (r) => r.status === 200,
    "bff catalog browse tiene products": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).products);
      } catch {
        return false;
      }
    },
  });
  return res;
}

/** Detalle público vía BFF. */
export function readBffProductDetail(cfg, productId) {
  if (!cfg.bffBaseUrl || !productId) {
    return readProductDetail(cfg, productId);
  }
  const res = http.get(`${cfg.bffBaseUrl}/public/catalog/product/${encodeURIComponent(productId)}`, bffOpts(cfg, { name: "bff_product_detail" }, "20s"));
  check(res, { "bff product detail 200": (r) => r.status === 200 });
  return res;
}

/** Destacados vía BFF. */
export function readBffFeatured(cfg) {
  if (!cfg.bffBaseUrl) {
    return readFeatured(cfg);
  }
  const res = http.get(`${cfg.bffBaseUrl}/public/catalog/featured?limit=24`, bffOpts(cfg, { name: "bff_featured" }, "20s"));
  check(res, { "bff featured 200": (r) => r.status === 200 });
  return res;
}

/** Índice ligero vía BFF. */
export function readBffCatalogIndex(cfg) {
  if (!cfg.bffBaseUrl) {
    return readCatalogList(cfg);
  }
  const res = http.get(`${cfg.bffBaseUrl}/public/catalog/index`, bffOpts(cfg, { name: "bff_catalog_index" }, "25s"));
  check(res, { "bff catalog index 200": (r) => r.status === 200 });
  return res;
}

/** fetchProductFamilyGroupCounts() vía BFF. */
export function readBffFamilyCounts(cfg) {
  if (!cfg.bffBaseUrl) {
    return readFamilyCounts(cfg);
  }
  const res = http.get(`${cfg.bffBaseUrl}/public/catalog/family-counts`, bffOpts(cfg, { name: "bff_family_counts" }, "25s"));
  check(res, {
    "bff family counts 200": (r) => r.status === 200,
  });
  return res;
}

/** Igual que fetchPublicProducts() sin BFF (Supabase directo). */
export function readCatalogList(cfg) {
  const url = `${cfg.restBase}/productos?select=*&activo=eq.true`;
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    tags: { name: "supabase_catalog_list" },
    timeout: "30s",
  });
  check(res, {
    "catalog status 200": (r) => r.status === 200,
    "catalog tiene array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },
  });
  return res;
}

/** fetchPublicProductById */
export function readProductDetail(cfg, productId) {
  if (!productId) {
    return null;
  }
  const url =
    `${cfg.restBase}/productos?select=*&id=eq.${encodeURIComponent(productId)}` +
    "&activo=eq.true&limit=1";
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    tags: { name: "supabase_product_detail" },
    timeout: "20s",
  });
  check(res, {
    "detail status 200": (r) => r.status === 200,
  });
  return res;
}

/** fetchProductFamilyGroupCounts — lectura ligera */
export function readFamilyCounts(cfg) {
  const url = `${cfg.restBase}/productos?select=id,familiaId&activo=eq.true`;
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    tags: { name: "supabase_family_counts" },
    timeout: "25s",
  });
  check(res, {
    "family counts status 200": (r) => r.status === 200,
  });
  return res;
}

/** Productos destacados (home) */
export function readFeatured(cfg) {
  const url =
    `${cfg.restBase}/productos?select=*&destacado=eq.true&activo=eq.true&limit=24`;
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    tags: { name: "supabase_featured" },
    timeout: "20s",
  });
  check(res, {
    "featured status 200": (r) => r.status === 200,
  });
  return res;
}

export function readBffHealth(cfg) {
  if (!cfg.bffBaseUrl) {
    return null;
  }
  const res = http.get(`${cfg.bffBaseUrl}/health`, bffOpts(cfg, { name: "bff_health" }, "15s"));
  check(res, {
    "bff health 200": (r) => r.status === 200,
  });
  return res;
}

export function readDeliveryQuote(cfg) {
  if (!cfg.bffBaseUrl) {
    return null;
  }
  const res = http.get(`${cfg.bffBaseUrl}/delivery/quote?${cfg.deliveryQuoteQuery}`, bffOpts(cfg, { name: "bff_delivery_quote" }, "20s"));
  check(res, {
    "delivery quote 2xx o rate limit": (r) =>
      (r.status >= 200 && r.status < 300) || r.status === 429,
  });
  return res;
}

export function readHostingShell(cfg) {
  const res = http.get(`${cfg.hostingUrl}/`, {
    tags: { name: "hosting_index" },
    timeout: "15s",
  });
  check(res, {
    "hosting index 200": (r) => r.status === 200,
  });
  return res;
}

export function readAiHealth(cfg) {
  if (!cfg.aiBaseUrl) {
    return null;
  }
  const res = http.get(`${cfg.aiBaseUrl}/api/health`, {
    tags: { name: "ai_health" },
    timeout: "15s",
  });
  check(res, {
    "ai health 2xx": (r) => r.status >= 200 && r.status < 300,
  });
  return res;
}

/** setup(): obtiene IDs reales para detalle de producto */
export function fetchSampleProductIds(cfg, limit = 80) {
  const url = `${cfg.restBase}/productos?select=id&activo=eq.true&limit=${limit}`;
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    timeout: "60s",
  });
  if (res.status !== 200) {
    fail(`setup catalog ids falló: HTTP ${res.status} ${res.body?.slice?.(0, 200)}`);
  }
  let rows;
  try {
    rows = JSON.parse(res.body);
  } catch {
    fail("setup: respuesta Supabase no es JSON");
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    fail("setup: no hay productos activos para prueba de detalle");
  }
  return rows.map((r) => r.id).filter(Boolean);
}

export function pickRandom(ids) {
  if (!ids?.length) {
    return null;
  }
  return ids[Math.floor(Math.random() * ids.length)];
}
