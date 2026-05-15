"use strict";

const ORDER_ITEM_LIMIT = 30;
const ORDER_QTY_LIMIT = 100;

function strOr(v, d = "") { return v || d; }
function arrOr(v) { return Array.isArray(v) ? v : []; }
function toN(v) { return Number(v) || 0; }
function orUndef(v) { return v || undefined; }
function objOr(v) { return v || {}; }
function compareSizes(a, b) { return Number(a) - Number(b); }
function errorStatus(e) { return e.status || 500; }
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
  if (error?.status && error.status < 500) {
    return error.message;
  }
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
  if (product.colorStock) return sizesFromStockMap(aggregateColorStock(product.colorStock));
  if (product.tallaStock) return sizesFromStockMap(product.tallaStock);
  return Array.isArray(product.tallas) ? product.tallas : [];
}

function deriveTotalStock(product) {
  if (product.colorStock) return sumColorSizeStock(product.colorStock);
  if (product.tallaStock) return sumSizeStock(product.tallaStock);
  return Math.max(0, toN(product.stock));
}

function getSizeStock(product, talla, color) {
  if (product.colorStock && talla) {
    if (color && typeof product.colorStock[color]?.[talla] === "number") {
      return Math.max(0, toN(product.colorStock[color][talla]));
    }
    return Object.values(product.colorStock).reduce(
      (sum, stockBySize) => sum + Math.max(0, toN(stockBySize?.[talla])),
      0
    );
  }
  if (talla && product.tallaStock) {
    return Math.max(0, toN(product.tallaStock[talla]));
  }
  return deriveTotalStock(product);
}

function sanitizeOrderProduct(product) {
  return {
    id: product.id,
    nombre: product.nombre,
    precio: toN(product.precio),
    descripcion: strOr(product.descripcion),
    imagen: strOr(product.imagen),
    imagenes: arrOr(product.imagenes),
    stock: deriveTotalStock(product),
    categoria: strOr(product.categoria),
    tipoCalzado: strOr(product.tipoCalzado),
    tallas: getAvailableSizes(product),
    tallaStock: product.tallaStock || null,
    colorStock: product.colorStock || null,
    marca: strOr(product.marca),
    color: strOr(product.color),
    colores: arrOr(product.colores),
    destacado: Boolean(product.destacado),
  };
}

function extractProductId(item) {
  if (item?.product?.id && typeof item.product.id === "string") {
    return item.product.id.trim();
  }
  if (item?.productId && typeof item.productId === "string") {
    return item.productId.trim();
  }
  return "";
}

function extractItemFields(item) {
  return {
    productId: extractProductId(item),
    quantity: toN(item?.quantity),
    talla: trimStr(item?.talla),
    color: trimStr(item?.color),
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

function resolveColorBucket(colorStock, talla, quantity, preferredColor) {
  if (preferredColor && typeof colorStock[preferredColor]?.[talla] === "number") {
    return preferredColor;
  }
  return Object.keys(colorStock).find((colorKey) => {
    return Math.max(0, toN(colorStock[colorKey]?.[talla])) >= quantity;
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
  parseQueryInt,
  resolveAiAdminUpstreamRequest,
  sendUpstreamToClient,
  aiAdminProxyErrorStatus,
  aiAdminProxyErrorMessage,
};
