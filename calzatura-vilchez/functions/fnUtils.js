"use strict";

const ORDER_ITEM_LIMIT = 30;
const ORDER_QTY_LIMIT = 100;

function strOr(v, d = "") { return v || d; }
function arrOr(v) { return Array.isArray(v) ? v : []; }
function toN(v) { return Number(v) || 0; }

function toFinitePrice(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v)
    .trim()
    .replace(/s\/\s*/gi, "")
    .replace(/pen\s*/gi, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/\s/g, "");
  if (!s) return 0;
  let norm = s;
  if (s.includes(",") && s.includes(".")) {
    norm =
      s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",") && !s.includes(".")) {
    norm = s.replace(",", ".");
  }
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}
function orUndef(v) { return v || undefined; }
function objOr(v) { return v || {}; }
function compareSizes(a, b) { return Number(a) - Number(b); }
function errorStatus(e) {
  if (!e || typeof e !== "object") return 500;
  const s = e.status ?? e.statusCode;
  if (typeof s === "number" && s >= 400 && s <= 599) return s;
  return 500;
}
function trimStr(v) { return typeof v === "string" ? v.trim() : ""; }
function isValidItemArray(items) {
  return Array.isArray(items) && items.length > 0 && items.length <= ORDER_ITEM_LIMIT;
}

function isNonEmptyString(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

const LOGIN_EMAIL_RE =
  /^[A-Za-z0-9_+~-]+(?:\.[A-Za-z0-9_+~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

function isValidLoginEmail(email) {
  if (typeof email !== "string") return false;
  const t = email.trim().toLowerCase();
  return t.length <= 100 && LOGIN_EMAIL_RE.test(t);
}

function isValidLoginPassword(password) {
  return typeof password === "string" && password.length >= 1 && password.length <= 128;
}

function isValidPeruPhone(value) {
  return typeof value === "string" && /^\+51 9\d{2} \d{3} \d{3}$/.test(value);
}

function isInvalidOrderQty(productId, quantity) {
  return !productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > ORDER_QTY_LIMIT;
}

function hasValidOrderItems(order) {
  return isValidItemArray(order.items);
}

function toCents(amount) {
  return Math.round(toN(amount) * 100);
}

function validStripeImage(image) {
  try {
    const url = new URL(image);
    return url.protocol === "https:" ? [image] : [];
  } catch {
    return [];
  }
}

function publicError(error) {
  if (!error) return "No se pudo procesar la solicitud";
  const http = error.status ?? error.statusCode;
  const msg = typeof error.message === "string" ? error.message.trim() : "";
  if (msg && typeof http === "number" && http < 500) return msg;
  if (msg && error.type && String(error.type).includes("Stripe")) return msg;
  if (error.status && error.status < 500 && msg) return msg;
  return "No se pudo procesar la solicitud";
}

function normalizeTextField(value, fieldName, max) {
  if (!isNonEmptyString(value, max)) {
    throw Object.assign(new Error(`${fieldName} invalido`), { status: 400 });
  }
  return value.trim();
}

function normalizeOptionalText(value, max) {
  if (value == null || value === "") return "";
  if (typeof value !== "string" || value.trim().length > max) {
    throw Object.assign(new Error("Campo opcional invalido"), { status: 400 });
  }
  return value.trim();
}

function normalizeAddress(address) {
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    throw Object.assign(new Error("Direccion invalida"), { status: 400 });
  }
  const normalized = {
    nombre: normalizeTextField(address.nombre, "Nombre", 80),
    apellido: normalizeTextField(address.apellido, "Apellido", 80),
    direccion: normalizeTextField(address.direccion, "Direccion", 180),
    ciudad: normalizeTextField(address.ciudad, "Ciudad", 80),
    distrito: normalizeTextField(address.distrito, "Distrito", 80),
    telefono: normalizeTextField(address.telefono, "Telefono", 15),
    referencia: normalizeOptionalText(address.referencia, 180),
  };
  if (!isValidPeruPhone(normalized.telefono)) {
    throw Object.assign(new Error("Telefono invalido"), { status: 400 });
  }
  return normalized;
}

function sumSizeStock(tallaStock) {
  return Object.values(objOr(tallaStock)).reduce(
    (sum, qty) => sum + Math.max(0, toN(qty)),
    0
  );
}

function sumColorSizeStock(colorStock) {
  return Object.values(objOr(colorStock)).reduce(
    (sum, stockBySize) => sum + sumSizeStock(stockBySize),
    0
  );
}

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sameComparable(a, b) {
  return normalizeComparable(a) === normalizeComparable(b);
}

function normalizeOrderTalla(raw) {
  if (raw == null || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw).trim();
  if (typeof raw === "string") return raw.trim();
  return String(raw).trim();
}

function normalizeOrderColor(raw) {
  if (raw == null || raw === "") return "";
  if (typeof raw === "string") return raw.trim();
  return String(raw).trim();
}

function cellQty(v) {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function findTallaKeyInMap(stockBySize, talla) {
  if (!stockBySize || !talla) return null;
  const want = String(talla).trim();
  if (Object.prototype.hasOwnProperty.call(stockBySize, want)) return want;
  for (const k of Object.keys(stockBySize)) {
    const ks = String(k).trim();
    if (ks === want) return k;
    if (Number(k) === Number(want) && want !== "" && Number.isFinite(Number(want))) return k;
  }
  return null;
}

function findColorKeyInStock(colorStock, color) {
  if (!colorStock || !color) return null;
  const keys = Object.keys(colorStock);
  return keys.find((k) => sameComparable(k, color)) || null;
}

/** `{}` o filas sin tallas: truthy pero no representan inventario por color. */
function effectiveColorStock(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const keys = Object.keys(raw);
  if (keys.length === 0) return null;
  for (const k of keys) {
    const row = raw[k];
    if (row && typeof row === "object" && !Array.isArray(row) && Object.keys(row).length > 0) {
      return raw;
    }
  }
  return null;
}

/** `tallaStock` por defecto `{}` en BD: truthy pero suma 0 y anula `stock`. */
function effectiveTallaStock(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (Object.keys(raw).length === 0) return null;
  return raw;
}

function resolveColorKeyForLine(colorStock, requestedColor, product) {
  const rc = requestedColor ? String(requestedColor).trim() : "";
  if (!colorStock || !rc) return null;
  let k = findColorKeyInStock(colorStock, rc);
  if (k) return k;
  const hint = product?.color ? String(product.color).trim() : "";
  if (hint && !sameComparable(hint, rc)) {
    k = findColorKeyInStock(colorStock, hint);
    if (k) return k;
  }
  const keys = Object.keys(colorStock);
  if (keys.length === 1) {
    const only = keys[0];
    if (sameComparable(only, rc) || (hint && sameComparable(only, hint))) return only;
  }
  return null;
}

function lineStockFromTallaOrColumn(product, talla) {
  const t = talla ? String(talla).trim() : "";
  if (!t) return deriveTotalStock(product);
  const ts = effectiveTallaStock(product.tallaStock);
  if (ts) {
    const tk = findTallaKeyInMap(ts, t);
    if (tk != null) return cellQty(ts[tk]);
    return 0;
  }
  return Math.max(0, toN(product.stock));
}

function aggregateColorStock(colorStock) {
  const aggregate = {};
  Object.values(objOr(colorStock)).forEach((stockBySize) => {
    Object.entries(objOr(stockBySize)).forEach(([talla, qty]) => {
      aggregate[talla] = toN(aggregate[talla]) + Math.max(0, toN(qty));
    });
  });
  return aggregate;
}

function sizesFromStockMap(stockBySize) {
  return Object.entries(stockBySize)
    .filter(([, qty]) => Number(qty) > 0)
    .map(([talla]) => talla)
    .sort(compareSizes);
}

function getAvailableSizes(product) {
  const cs0 = effectiveColorStock(product.colorStock);
  if (cs0) return sizesFromStockMap(aggregateColorStock(cs0));
  const ts0 = effectiveTallaStock(product.tallaStock);
  if (ts0) return sizesFromStockMap(ts0);
  return Array.isArray(product.tallas) ? product.tallas : [];
}

function deriveTotalStock(product) {
  const column = Math.max(0, toN(product.stock));
  const cs0 = effectiveColorStock(product.colorStock);
  if (cs0) {
    return Math.max(sumColorSizeStock(cs0), column);
  }
  const ts0 = effectiveTallaStock(product.tallaStock);
  if (ts0) {
    return Math.max(sumSizeStock(ts0), column);
  }
  return column;
}

function getSizeStock(product, talla, color) {
  const t = talla ? String(talla).trim() : "";
  const c = color ? String(color).trim() : "";

  const cs = effectiveColorStock(product.colorStock);
  if (cs && t) {
    if (c) {
      const colorKey = resolveColorKeyForLine(cs, c, product);
      if (!colorKey) {
        if (Object.keys(cs).length > 1) return 0;
        return lineStockFromTallaOrColumn(product, t);
      }
      const row = cs[colorKey];
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return lineStockFromTallaOrColumn(product, t);
      }
      const tallaKey = findTallaKeyInMap(row, t);
      if (tallaKey != null) return cellQty(row[tallaKey]);
      return lineStockFromTallaOrColumn(product, t);
    }
    return Object.values(cs).reduce((sum, stockBySize) => {
      const tallaKey = findTallaKeyInMap(stockBySize, t);
      if (tallaKey == null) return sum;
      return sum + cellQty(stockBySize[tallaKey]);
    }, 0);
  }

  const ts = effectiveTallaStock(product.tallaStock);
  if (t && ts) {
    const tallaKey = findTallaKeyInMap(ts, t);
    if (tallaKey != null) return cellQty(ts[tallaKey]);
    return 0;
  }

  return deriveTotalStock(product);
}

function sanitizeOrderProduct(product) {
  return {
    id: product.id,
    nombre: product.nombre,
    precio: toFinitePrice(product.precio),
    descripcion: strOr(product.descripcion),
    imagen: strOr(product.imagen),
    imagenes: arrOr(product.imagenes),
    stock: deriveTotalStock(product),
    categoria: strOr(product.categoria),
    tipoCalzado: strOr(product.tipoCalzado),
    tallas: getAvailableSizes(product),
    tallaStock: effectiveTallaStock(product.tallaStock) || null,
    colorStock: effectiveColorStock(product.colorStock) || null,
    marca: strOr(product.marca),
    color: strOr(product.color),
    colores: arrOr(product.colores),
    destacado: Boolean(product.destacado),
  };
}

function extractProductId(item) {
  const fromProduct = item?.product?.id;
  if (fromProduct != null && fromProduct !== "") {
    const s = String(fromProduct).trim();
    if (s) return s;
  }
  const fromField = item?.productId;
  if (fromField != null && fromField !== "") {
    const s = String(fromField).trim();
    if (s) return s;
  }
  return "";
}

function extractItemFields(item) {
  return {
    productId: extractProductId(item),
    quantity: toN(item?.quantity),
    talla: normalizeOrderTalla(item?.talla),
    color: normalizeOrderColor(item?.color),
  };
}

function calculateStoredSubtotal(items) {
  return arrOr(items).reduce((sum, item) => {
    return sum + toN(item?.quantity) * toN(item?.product?.precio);
  }, 0);
}

function assertStoredTotals(order) {
  const subtotal = calculateStoredSubtotal(order.items);
  const envio = toN(order.envio);
  const total = subtotal + envio;
  if (
    Math.abs(toN(order.subtotal) - subtotal) > 0.01 ||
    Math.abs(toN(order.total) - total) > 0.01
  ) {
    throw Object.assign(new Error("Los totales del pedido no coinciden"), { status: 409 });
  }
}

function assertStockAndPrice(price, totalStock, sizeStock, quantity) {
  if (price <= 0 || totalStock < quantity || sizeStock < quantity) {
    throw Object.assign(new Error("Stock o precio invalido"), { status: 409 });
  }
}

function resolveColorBucket(colorStock, talla, quantity, preferredColor, fallbackColor) {
  const t = String(talla || "").trim();
  if (!t || !colorStock) return null;
  const pref = preferredColor ? String(preferredColor).trim() : "";
  const fb = fallbackColor ? String(fallbackColor).trim() : "";

  const tryResolve = (label) => {
    if (!label) return null;
    let ck = findColorKeyInStock(colorStock, label);
    const keys = Object.keys(colorStock);
    if (!ck && keys.length === 1) ck = keys[0];
    if (!ck) return null;
    const row = colorStock[ck];
    const tk = findTallaKeyInMap(row, t);
    if (tk != null && cellQty(row[tk]) >= quantity) return ck;
    return null;
  };

  if (pref) {
    const hit = tryResolve(pref) || (fb && !sameComparable(pref, fb) ? tryResolve(fb) : null);
    if (hit) return hit;
  } else if (fb) {
    const hit = tryResolve(fb);
    if (hit) return hit;
  }
  return Object.keys(colorStock).find((colorKey) => {
    const row = colorStock[colorKey];
    const tk = findTallaKeyInMap(row, t);
    if (tk == null) return false;
    return cellQty(row[tk]) >= quantity;
  });
}

function parseQueryInt(req, name, defaultVal, min, max) {
  const v = Number.parseInt(String(req.query[name] ?? defaultVal), 10);
  if (!Number.isFinite(v) || v < min || v > max) return Number.NaN;
  return v;
}

function aiProxyCombined(base, req) {
  const horizon = parseQueryInt(req, "horizon", "30", 7, 90);
  const history = parseQueryInt(req, "history", "120", 30, 365);
  if (Number.isNaN(horizon)) return { ok: false, error: "horizon invalido" };
  if (Number.isNaN(history)) return { ok: false, error: "history invalido" };
  const upstreamUrl = `${base}/api/predict/combined?horizon=${encodeURIComponent(horizon)}&history=${encodeURIComponent(history)}`;
  return { ok: true, upstreamUrl, method: "GET" };
}

function aiProxyWeeklyChart(base, req) {
  const weeks = parseQueryInt(req, "weeks", "8", 2, 24);
  if (Number.isNaN(weeks)) return { ok: false, error: "weeks invalido" };
  const upstreamUrl = `${base}/api/sales/weekly-chart?weeks=${encodeURIComponent(weeks)}`;
  return { ok: true, upstreamUrl, method: "GET" };
}

function aiProxyModelMetrics(base) {
  return { ok: true, upstreamUrl: `${base}/api/model/metrics`, method: "GET" };
}

function aiProxyIreHistorial(base, req) {
  const days = parseQueryInt(req, "days", "30", 1, 365);
  if (Number.isNaN(days)) return { ok: false, error: "days invalido" };
  const upstreamUrl = `${base}/api/ire/historial?days=${encodeURIComponent(days)}`;
  return { ok: true, upstreamUrl, method: "GET" };
}

function aiProxyCacheInvalidate(base, req) {
  if (req.method !== "POST") return { ok: false, status: 405, error: "Metodo no permitido" };
  return { ok: true, upstreamUrl: `${base}/api/cache/invalidate`, method: "POST" };
}

function aiProxyCampaignActive(base) {
  return { ok: true, upstreamUrl: `${base}/api/campaign/active`, method: "GET" };
}

function aiProxyCampaignFeedback(base, req) {
  if (req.method !== "POST") return { ok: false, status: 405, error: "Metodo no permitido" };
  return { ok: true, upstreamUrl: `${base}/api/campaign/feedback`, method: "POST" };
}

function aiProxyCampaignDetection(base, req) {
  const recentDays = parseQueryInt(req, "recent_days", "7", 3, 14);
  const baselineDays = parseQueryInt(req, "baseline_days", "60", 30, 120);
  if (Number.isNaN(recentDays)) return { ok: false, error: "recent_days invalido" };
  if (Number.isNaN(baselineDays)) return { ok: false, error: "baseline_days invalido" };
  const upstreamUrl = `${base}/api/predict/campaign-detection?recent_days=${encodeURIComponent(recentDays)}&baseline_days=${encodeURIComponent(baselineDays)}`;
  return { ok: true, upstreamUrl, method: "GET" };
}

function aiProxyLearningStats(base) {
  return { ok: true, upstreamUrl: `${base}/api/campaign/learning-stats`, method: "GET" };
}

const AI_ADMIN_UPSTREAM_RESOLVERS = {
  combined: aiProxyCombined,
  weeklyChart: aiProxyWeeklyChart,
  modelMetrics: aiProxyModelMetrics,
  ireHistorial: aiProxyIreHistorial,
  cacheInvalidate: aiProxyCacheInvalidate,
  campaignActive: aiProxyCampaignActive,
  campaignFeedback: aiProxyCampaignFeedback,
  campaignDetection: aiProxyCampaignDetection,
  learningStats: aiProxyLearningStats,
};

function resolveAiAdminUpstreamRequest(base, op, req) {
  const resolver = AI_ADMIN_UPSTREAM_RESOLVERS[op];
  if (!resolver) return { ok: false, error: "op invalido" };
  return resolver(base, req);
}

async function sendUpstreamToClient(res, upstream, text) {
  const ct = strOr(upstream.headers.get("content-type"), "application/json; charset=utf-8");
  if (ct.includes("application/json")) {
    try {
      return res.status(upstream.status).type("application/json").send(JSON.parse(text));
    } catch {
      return res.status(upstream.status).type("text/plain").send(text);
    }
  }
  return res.status(upstream.status).type(ct).send(text);
}

function aiAdminProxyErrorStatus(error) {
  let status = typeof error.status === "number" ? error.status : 500;
  if (status === 500 && error.code && String(error.code).startsWith("auth/")) {
    status = 401;
  }
  return status;
}

function aiAdminProxyErrorMessage(status, error) {
  if (status === 401) return "Sesion invalida o expirada. Vuelve a iniciar sesion.";
  if (status < 500 && error.message) return error.message;
  return publicError(error);
}

module.exports = {
  ORDER_ITEM_LIMIT,
  ORDER_QTY_LIMIT,
  strOr,
  arrOr,
  toN,
  toFinitePrice,
  effectiveColorStock,
  effectiveTallaStock,
  orUndef,
  objOr,
  compareSizes,
  errorStatus,
  trimStr,
  isValidItemArray,
  isNonEmptyString,
  isValidLoginEmail,
  isValidLoginPassword,
  isValidPeruPhone,
  isInvalidOrderQty,
  hasValidOrderItems,
  toCents,
  validStripeImage,
  publicError,
  normalizeTextField,
  normalizeOptionalText,
  normalizeAddress,
  sumSizeStock,
  sumColorSizeStock,
  normalizeComparable,
  sameComparable,
  aggregateColorStock,
  sizesFromStockMap,
  getAvailableSizes,
  deriveTotalStock,
  getSizeStock,
  sanitizeOrderProduct,
  extractProductId,
  extractItemFields,
  calculateStoredSubtotal,
  assertStoredTotals,
  assertStockAndPrice,
  resolveColorBucket,
  findTallaKeyInMap,
  cellQty,
  parseQueryInt,
  resolveAiAdminUpstreamRequest,
  sendUpstreamToClient,
  aiAdminProxyErrorStatus,
  aiAdminProxyErrorMessage,
};
