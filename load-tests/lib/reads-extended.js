import http from "k6/http";
import { check } from "k6";
import { supabaseHeaders } from "./targets.js";

/** Catálogo paginado (más realista que select=* sin límite). */
export function readCatalogPaginated(cfg, page = 0, pageSize = 48) {
  const offset = page * pageSize;
  const url =
    `${cfg.restBase}/productos?select=id,nombre,precio,stock,marca,categoria,imagen,activo,destacado` +
    `&activo=eq.true&order=destacado.desc&limit=${pageSize}&offset=${offset}`;
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    tags: { name: "supabase_catalog_page" },
    timeout: "25s",
  });
  check(res, { "catalog page 200": (r) => r.status === 200 });
  return res;
}

/** Metadatos de códigos (lectura anon permitida por RLS). */
export function readProductoCodigos(cfg, limit = 80) {
  const url =
    `${cfg.restBase}/productoCodigos?select=productoId,codigo,actualizadoEn&limit=${limit}`;
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    tags: { name: "supabase_producto_codigos" },
    timeout: "20s",
  });
  check(res, { "productoCodigos 200": (r) => r.status === 200 });
  return res;
}

/** Finanzas por producto (anon select según migración). */
/** Finanzas: anon revocado por diseño (ISO 27001). 403/401 = comportamiento esperado. */
export function readProductoFinanzas(cfg, limit = 60) {
  const url =
    `${cfg.restBase}/productoFinanzas?select=productId,costoCompra,precioSugerido,margenObjetivo&limit=${limit}`;
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    tags: { name: "supabase_producto_finanzas" },
    timeout: "20s",
  });
  check(res, {
    "productoFinanzas bloqueado para anon": (r) => r.status === 403 || r.status === 401,
  });
  return res;
}

export function readCampanasDetectadas(cfg, limit = 20) {
  const url =
    `${cfg.restBase}/campanas_detectadas?select=id,nivel,estado,fecha_inicio,fecha_fin,impacto_estimado_soles&limit=${limit}`;
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    tags: { name: "supabase_campanas" },
    timeout: "20s",
  });
  check(res, { "campanas 200": (r) => r.status === 200 });
  return res;
}

export function readCampanaProductos(cfg, limit = 40) {
  const url =
    `${cfg.restBase}/campana_productos?select=campana_id,producto_id,uplift_ratio,stock_actual&limit=${limit}`;
  const res = http.get(url, {
    headers: supabaseHeaders(cfg.supabaseAnonKey),
    tags: { name: "supabase_campana_productos" },
    timeout: "20s",
  });
  check(res, { "campana_productos 200": (r) => r.status === 200 });
  return res;
}

/** Conteo de filas (solo en setup; usa service role si está disponible). */
export function countTableRows(cfg, table, filter = "") {
  const serviceKey = String(__ENV.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!serviceKey) {
    return { table, count: -1, skipped: true };
  }
  const qs = filter ? `?${filter}&select=id` : "?select=id";
  const url = `${cfg.restBase}/${table}${qs}`;
  const res = http.get(url, {
    headers: {
      ...supabaseHeaders(serviceKey),
      Prefer: "count=exact",
      Range: "0-0",
    },
    timeout: "30s",
  });
  const range = res.headers["Content-Range"] || res.headers["content-range"] || "";
  const match = /\/(\d+)$/.exec(range);
  const count = match ? Number(match[1]) : -1;
  return { table, count, status: res.status, skipped: false };
}
