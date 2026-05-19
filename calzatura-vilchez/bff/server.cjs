/* Copiado desde ../functions/index.js — al cambiar lógica de API, actualizar ambos o extraer módulo compartido. */
/* BFF Express: mismo contrato de rutas que Cloud Functions. Desplegar en Render/Fly/Railway (sin plan Blaze). */
require("dotenv").config();

const fs = require("fs");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const admin = require("firebase-admin");
const { discountOrderStockRpc, applyOrderStatusStockSideEffects } = require("../functions/fnUtils");

function loadAllowedOrigins() {
  const defaults = [
    "https://calzaturavilchez-ab17f.web.app",
    "https://calzaturavilchez-ab17f.firebaseapp.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  const extras = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...defaults, ...extras]);
}

const allowedOrigins = loadAllowedOrigins();

function loadSuperadminEmails() {
  const defaults = ["76778920@continental.edu.pe"];
  const extras = (process.env.SUPERADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...defaults, ...extras]);
}

const superadminEmails = loadSuperadminEmails();

function isSuperadminEmail(email) {
  return superadminEmails.has(String(email || "").trim().toLowerCase());
}

function applyCorsHeaders(req, res, next) {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.has(origin)) {
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,PATCH,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
}

const cors = require("cors")({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido"));
  },
  methods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
});

const {
  readIdempotencyKey,
  findOrderByIdempotency,
  idempotencyOrderJson,
} = require("../functions/fnUtils");
const { handleLookupDni } = require("./lookupDni.cjs");

function loadFirebaseServiceAccount() {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  if (filePath && String(filePath).trim()) {
    const p = String(filePath).trim();
    try {
      if (!fs.existsSync(p)) {
        console.error("FIREBASE_SERVICE_ACCOUNT_FILE: archivo no existe:", p);
        process.exit(1);
      }
      const raw = fs.readFileSync(p, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("FIREBASE_SERVICE_ACCOUNT_FILE invalido:", e.message);
      process.exit(1);
    }
  }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (b64 && String(b64).trim()) {
    try {
      const raw = Buffer.from(String(b64).trim(), "base64").toString("utf8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 invalido:", e.message);
      process.exit(1);
    }
  }
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (saJson && String(saJson).trim()) {
    const t = String(saJson).trim();
    try {
      return JSON.parse(t);
    } catch (e) {
      if (t.startsWith("-----BEGIN") || t.startsWith('"-----BEGIN')) {
        console.error(
          "FIREBASE_SERVICE_ACCOUNT_JSON: valor incorrecto (PEM suelto). Usa el .json completo, FIREBASE_SERVICE_ACCOUNT_JSON_BASE64, o FIREBASE_SERVICE_ACCOUNT_FILE (Render Secret File)."
        );
      }
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON invalido:", e.message);
      process.exit(1);
    }
  }
  return null;
}

const serviceAccount = loadFirebaseServiceAccount();
if (serviceAccount) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  admin.initializeApp();
}

const ORDER_ITEM_LIMIT = 30;
const ORDER_QTY_LIMIT = 100;
const SHIPPING_COST = 0;
/** Tope de envío (S/) que acepta el servidor si el cliente envía `envio` (debe coincidir con tarifa ORS en frontend). */
const DELIVERY_MAX_ENVIO_S = 35;

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

async function verifyFirebaseUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    throw Object.assign(new Error("No autenticado"), { status: 401 });
  }
  return admin.auth().verifyIdToken(token);
}

async function assertAdminRole(supabase, uid) {
  const { data, error } = await supabase.from("usuarios").select("rol").eq("uid", uid).maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo verificar el rol"), { status: 500 });
  }
  if (data?.rol === "admin") {
    return;
  }
  throw Object.assign(new Error("Solo administradores pueden consultar el servicio de IA"), { status: 403 });
}

async function assertStaffRole(supabase, uid) {
  const { data, error } = await supabase.from("usuarios").select("rol").eq("uid", uid).maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo verificar el rol"), { status: 500 });
  }
  if (data?.rol === "admin" || data?.rol === "trabajador") {
    return;
  }
  throw Object.assign(new Error("Sin permisos para gestionar pedidos"), { status: 403 });
}

async function assertPsychologistRole(supabase, uid) {
  const { data, error } = await supabase.from("usuarios").select("rol").eq("uid", uid).maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo verificar el rol"), { status: 500 });
  }
  if (data?.rol === "admin" || data?.rol === "psicologo") {
    return;
  }
  throw Object.assign(new Error("Sin permisos para el panel de psicologia"), { status: 403 });
}

async function assertHrRole(supabase, uid) {
  const { data, error } = await supabase.from("usuarios").select("rol").eq("uid", uid).maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo verificar el rol"), { status: 500 });
  }
  if (data?.rol === "admin" || data?.rol === "rrhh") {
    return;
  }
  throw Object.assign(new Error("Sin permisos para recursos humanos"), { status: 403 });
}

const ORDER_STATUSES = new Set(["pendiente", "pagado", "enviado", "entregado", "cancelado"]);
const USER_ROLES = new Set(["cliente", "trabajador", "psicologo", "rrhh", "admin"]);

function profileString(value) {
  return typeof value === "string" ? value.trim() : undefined;
}

function sanitizeOwnUserProfile(decodedToken, incomingProfile, existingProfile) {
  const emailFromToken = profileString(decodedToken.email);
  const now = new Date().toISOString();
  const profile = {
    uid: decodedToken.uid,
    email: emailFromToken || profileString(existingProfile?.email) || profileString(incomingProfile.email) || "",
    rol: existingProfile?.rol || (isSuperadminEmail(emailFromToken) ? "admin" : "cliente"),
    creadoEn: existingProfile?.creadoEn || profileString(incomingProfile.creadoEn) || now,
  };

  for (const key of ["nombre", "nombres", "apellidos", "dni", "telefono"]) {
    const value = profileString(incomingProfile[key]);
    if (value !== undefined) profile[key] = value;
  }

  if (Array.isArray(incomingProfile.direcciones)) {
    profile.direcciones = incomingProfile.direcciones;
  }

  return profile;
}

function toCents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function validStripeImage(image) {
  try {
    const url = new URL(image);
    return url.protocol === "https:" ? [image] : [];
  } catch {
    return [];
  }
}

// Inserta en la tabla auditoria desde el contexto de Cloud Functions.
// No lanza: un fallo de auditoría nunca interrumpe la operación principal.
async function logAuditFn(supabase, accion, entidad, entidadId, entidadNombre, usuarioUid, usuarioEmail, detalle) {
  try {
    await supabase.from("auditoria").insert({
      accion,
      entidad,
      entidadId,
      entidadNombre,
      detalle: detalle ?? null,
      usuarioUid: usuarioUid ?? null,
      usuarioEmail: usuarioEmail ?? null,
      realizadoEn: new Date().toISOString(),
    });
  } catch {
    // silencioso
  }
}

/** Stripe y otros SDK usan `statusCode`; nuestros throws usan `status`. */
function httpErrorStatus(error) {
  if (!error || typeof error !== "object") return 500;
  const s = error.status ?? error.statusCode;
  if (typeof s === "number" && s >= 400 && s <= 599) return s;
  return 500;
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

function isNonEmptyString(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function isRecoverableSupabaseError(error) {
  const msg = String(error?.message || error?.details || error || "").toLowerCase();
  const code = String(error?.code || "");
  return (
    code === "42P01"
    || code === "PGRST205"
    || code === "42703"
    || msg.includes("does not exist")
    || msg.includes("schema cache")
    || msg.includes("could not find")
    || msg.includes("encargadouid")
  );
}

async function supabaseRows(queryPromise, label, fallback = []) {
  const result = await queryPromise;
  if (!result.error) return result.data ?? fallback;
  if (isRecoverableSupabaseError(result.error)) {
    console.warn(`[${label}]`, result.error.message || result.error);
    return fallback;
  }
  throw result.error;
}

const LOGIN_RATE_WINDOW_MS = 30 * 60 * 1000; // ventana: 30 minutos
const LOGIN_RATE_MAX = 15; // máximo de POST /authLogin por IP en esa ventana (antes de cortar sin llamar a Google)
const loginRateByIp = new Map();

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

function isLoginRateLimited(ip) {
  const now = Date.now();
  let row = loginRateByIp.get(ip);
  if (!row || now > row.resetAt) {
    row = { count: 0, resetAt: now + LOGIN_RATE_WINDOW_MS };
  }
  if (row.count >= LOGIN_RATE_MAX) {
    loginRateByIp.set(ip, row);
    return true;
  }
  row.count += 1;
  loginRateByIp.set(ip, row);
  if (loginRateByIp.size > 5000) {
    for (const [k, v] of loginRateByIp) {
      if (now > v.resetAt) loginRateByIp.delete(k);
    }
  }
  return false;
}

const LOGIN_EMAIL_RE =
  /^[A-Za-z0-9_+~-]+(?:\.[A-Za-z0-9_+~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

function isValidLoginEmail(email) {
  if (typeof email !== "string") return false;
  const t = email.trim().toLowerCase();
  return t.length <= 254 && LOGIN_EMAIL_RE.test(t);
}

function isValidLoginPassword(password) {
  return typeof password === "string" && password.length >= 1 && password.length <= 256;
}

function isValidPeruPhone(value) {
  return typeof value === "string" && /^\+51 9\d{2} \d{3} \d{3}$/.test(value);
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
  return Object.values(tallaStock || {}).reduce(
    (sum, qty) => sum + Math.max(0, Number(qty) || 0),
    0
  );
}

function sumColorSizeStock(colorStock) {
  return Object.values(colorStock || {}).reduce(
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

/** Talla/color desde JSON pueden venir como número o string; sin esto el stock queda en 0 y createOrder falla. */
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

function toFinitePrice(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value)
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

/** `{}` o filas sin tallas son truthy en JS pero no son inventario por color; no deben bloquear tallaStock/stock. */
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

/** `tallaStock` por defecto en BD es `{}`; truthy pero suma 0 y bloquea la columna `stock`. */
function effectiveTallaStock(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (Object.keys(raw).length === 0) return null;
  return raw;
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

/** Coincidencia de color en JSON vs texto del carrito / columna `product.color`. */
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

/** Stock por talla usando solo tallaStock o la columna `stock` (sin colorStock). */
function lineStockFromTallaOrColumn(product, talla) {
  const t = talla ? String(talla).trim() : "";
  if (!t) return deriveTotalStock(product);
  const ts = effectiveTallaStock(product.tallaStock);
  if (ts) {
    const tk = findTallaKeyInMap(ts, t);
    if (tk != null) return cellQty(ts[tk]);
    return 0;
  }
  return Math.max(0, Number(product.stock) || 0);
}

function aggregateColorStock(colorStock) {
  const aggregate = {};

  Object.values(colorStock || {}).forEach((stockBySize) => {
    Object.entries(stockBySize || {}).forEach(([talla, qty]) => {
      aggregate[talla] = (aggregate[talla] || 0) + Math.max(0, Number(qty) || 0);
    });
  });

  return aggregate;
}

function getAvailableSizes(product) {
  const cs0 = effectiveColorStock(product.colorStock);
  if (cs0) {
    const stockBySize = aggregateColorStock(cs0);
    return Object.entries(stockBySize)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([talla]) => talla)
      .sort((a, b) => Number(a) - Number(b));
  }

  const ts0 = effectiveTallaStock(product.tallaStock);
  if (ts0) {
    return Object.entries(ts0)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([talla]) => talla)
      .sort((a, b) => Number(a) - Number(b));
  }

  return Array.isArray(product.tallas) ? product.tallas : [];
}

function deriveTotalStock(product) {
  const column = Math.max(0, Number(product.stock) || 0);
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
    descripcion: product.descripcion || "",
    imagen: product.imagen || "",
    imagenes: Array.isArray(product.imagenes) ? product.imagenes : [],
    stock: deriveTotalStock(product),
    categoria: product.categoria || "",
    tipoCalzado: product.tipoCalzado || "",
    tallas: getAvailableSizes(product),
    tallaStock: effectiveTallaStock(product.tallaStock) || null,
    colorStock: effectiveColorStock(product.colorStock) || null,
    marca: product.marca || "",
    color: product.color || "",
    colores: Array.isArray(product.colores) ? product.colores : [],
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

function extractProductName(item) {
  if (item?.product?.nombre && typeof item.product.nombre === "string") {
    return item.product.nombre.trim();
  }
  if (item?.nombre && typeof item.nombre === "string") {
    return item.nombre.trim();
  }
  return "";
}

function clientProductFromItem(item) {
  if (!item?.product || typeof item.product !== "object") return null;
  const product = item.product;
  const id = String(product.id ?? "").trim();
  const nombre = typeof product.nombre === "string" ? product.nombre.trim() : "";
  const precio = toFinitePrice(product.precio);
  if (!id || !nombre || precio <= 0) return null;
  return product;
}

async function fetchProductsByIds(supabase, ids) {
  const { data, error } = await supabase.from("productos").select("*").in("id", ids);
  if (error) {
    throw Object.assign(new Error("No se pudo consultar productos"), { status: 500 });
  }
  return data || [];
}

async function findProductVariantByColor(supabase, product, requestedColor) {
  if (!requestedColor || !product || sameComparable(product.color, requestedColor)) {
    return product;
  }

  let query = supabase.from("productos").select("*").limit(20);
  if (product.familiaId) {
    query = query.eq("familiaId", product.familiaId);
  } else {
    query = query.eq("nombre", product.nombre);
  }

  const { data, error } = await query;
  if (error) {
    throw Object.assign(new Error("No se pudo consultar variantes del producto"), { status: 500 });
  }

  return (data || []).find((candidate) => sameComparable(candidate.color, requestedColor)) || product;
}

async function findOrderableProductVariant(supabase, product, item) {
  const requestedColor = item.color || "";
  const productName = item.productName || product?.nombre || "";
  const needsVariantLookup =
    !product ||
    (requestedColor && !sameComparable(product.color, requestedColor)) ||
    toFinitePrice(product.precio) <= 0 ||
    getSizeStock(product, item.talla || undefined, requestedColor || undefined) < item.quantity;

  if (!needsVariantLookup) {
    return product;
  }

  const candidates = [];
  if (product?.familiaId) {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("familiaId", product.familiaId)
      .limit(50);
    if (error) {
      throw Object.assign(new Error("No se pudo consultar variantes del producto"), { status: 500 });
    }
    candidates.push(...(data || []));
  }

  if (productName) {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("nombre", productName)
      .limit(50);
    if (error) {
      throw Object.assign(new Error("No se pudo consultar variantes del producto"), { status: 500 });
    }
    candidates.push(...(data || []));
  }

  const seen = new Set();
  const uniqueCandidates = candidates.filter((candidate) => {
    const id = String(candidate.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return (
    uniqueCandidates.find((candidate) => {
      if (requestedColor && !sameComparable(candidate.color, requestedColor)) return false;
      if (toFinitePrice(candidate.precio) <= 0) return false;
      return getSizeStock(candidate, item.talla || undefined, requestedColor || undefined) >= item.quantity;
    }) ||
    product
  );
}

function clientProductIsOrderable(product, item) {
  if (!product) return false;
  if (item.color && product.color && !sameComparable(product.color, item.color)) return false;
  if (item.productName && product.nombre && !sameComparable(product.nombre, item.productName)) return false;
  if (toFinitePrice(product.precio) <= 0) return false;
  return getSizeStock(product, item.talla || undefined, item.color || undefined) >= item.quantity;
}

async function resolveOrderProduct(supabase, productMap, item) {
  let product = productMap.get(item.productId);
  if (product) {
    product = await findProductVariantByColor(supabase, product, item.color);
    product = await findOrderableProductVariant(supabase, product, item);
    if (clientProductIsOrderable(product, item)) {
      return product;
    }
  }

  if (clientProductIsOrderable(item.clientProduct, item)) {
    return item.clientProduct;
  }

  if (!product) {
    throw Object.assign(new Error("Producto no encontrado"), { status: 400 });
  }
  return product;
}

async function fetchProductOrThrow(supabase, productId) {
  const { data, error } = await supabase.from("productos").select("*").eq("id", productId).maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo consultar el producto"), { status: 500 });
  }
  if (!data) {
    throw Object.assign(new Error("Producto no encontrado"), { status: 400 });
  }
  return data;
}

function calculateStoredSubtotal(items) {
  return (items || []).reduce((sum, item) => {
    const quantity = Number(item?.quantity || 0);
    const price = Number(item?.product?.precio || 0);
    return sum + (quantity * price);
  }, 0);
}

function assertStoredTotals(order) {
  const subtotal = calculateStoredSubtotal(order.items);
  const envio = Number(order.envio || 0);
  const total = subtotal + envio;

  if (
    Math.abs(Number(order.subtotal || 0) - subtotal) > 0.01 ||
    Math.abs(Number(order.total || 0) - total) > 0.01
  ) {
    throw Object.assign(new Error("Los totales del pedido no coinciden"), { status: 409 });
  }
}

async function assertOrderStockAvailability(supabase, items) {
  for (const item of items || []) {
    const productId = extractProductId(item);
    const quantity = Number(item?.quantity || 0);
    const talla = normalizeOrderTalla(item?.talla);
    const color = normalizeOrderColor(item?.color);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > ORDER_QTY_LIMIT) {
      throw Object.assign(new Error("Producto invalido en el pedido"), { status: 400 });
    }

    const product = await fetchProductOrThrow(supabase, productId);
    const price = toFinitePrice(product.precio);
    const totalStock = deriveTotalStock(product);
    const sizeStock = getSizeStock(product, talla || undefined, color || undefined);

    if (price <= 0 || totalStock < quantity || sizeStock < quantity) {
      throw Object.assign(new Error("Stock o precio invalido"), { status: 409 });
    }
  }
}

async function buildOrderDraft(supabase, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > ORDER_ITEM_LIMIT) {
    throw Object.assign(new Error("Pedido sin productos validos"), { status: 400 });
  }

  const normalizedItems = rawItems.map((item) => {
    const productId = extractProductId(item);
    const productName = extractProductName(item);
    const clientProduct = clientProductFromItem(item);
    const quantity = Number(item?.quantity || 0);
    const talla = normalizeOrderTalla(item?.talla);
    const color = normalizeOrderColor(item?.color);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > ORDER_QTY_LIMIT) {
      throw Object.assign(new Error("Producto invalido en el pedido"), { status: 400 });
    }

    return {
      productId,
      productName,
      clientProduct,
      quantity,
      talla,
      color,
    };
  });

  const uniqueIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const products = await fetchProductsByIds(supabase, uniqueIds);
  const productMap = new Map(products.map((product) => [String(product.id), product]));

  const items = [];
  let subtotal = 0;

  for (const item of normalizedItems) {
    const product = await resolveOrderProduct(supabase, productMap, item);

    const price = toFinitePrice(product.precio);
    const totalStock = deriveTotalStock(product);
    const sizeStock = getSizeStock(product, item.talla || undefined, item.color || undefined);

    if (price <= 0 || totalStock < item.quantity || sizeStock < item.quantity) {
      throw Object.assign(new Error("Stock o precio invalido"), { status: 409 });
    }

    subtotal += price * item.quantity;
    items.push({
      product: sanitizeOrderProduct(product),
      quantity: item.quantity,
      talla: item.talla || undefined,
      color: item.color || undefined,
    });
  }

  const envio = items.length > 0 ? SHIPPING_COST : 0;

  return {
    items,
    subtotal,
    envio,
    total: subtotal + envio,
  };
}

async function fetchOrderOrThrow(supabase, orderId) {
  const { data, error } = await supabase.from("pedidos").select("*").eq("id", orderId).maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo consultar el pedido"), { status: 500 });
  }
  if (!data) {
    throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
  }
  return data;
}

async function updateOrder(supabase, orderId, patch) {
  const { data, error } = await supabase.from("pedidos").update(patch).eq("id", orderId).select("id").maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo actualizar el pedido"), { status: 500 });
  }
  if (!data?.id) {
    throw Object.assign(new Error("Pedido no encontrado"), { status: 404 });
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

const app = express();
app.set("trust proxy", 1);
app.use(applyCorsHeaders);
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get("/", (_req, res) =>
  res.status(200).type("text/plain").send("Calzatura Vilchez BFF. Use GET /health para estado."),
);

app.get("/health", (_req, res) => res.status(200).type("text/plain").send("ok"));

app.post("/lookup-dni", (req, res) => {
  cors(req, res, () => handleLookupDni(req, res));
});

const ORS_API_BASE = "https://api.openrouteservice.org";
const deliveryProviders = require("./delivery.cjs");

function getOrsApiKey() {
  return (
    deliveryProviders.stripEnvKey(process.env.ORS_API_KEY) ||
    deliveryProviders.stripEnvKey(process.env.VITE_ORS_API_KEY)
  );
}

app.get("/delivery/geocode", cors, async (req, res) => {
  try {
    const q = String(req.query.q || req.query.text || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 15, 1), 20);
    if (q.length < 3) {
      return res.status(200).json({ candidates: [] });
    }
    const candidates = await deliveryProviders.geocodeCandidates(q, limit);
    return res.status(200).json({ candidates });
  } catch (err) {
    console.error("delivery/geocode:", err?.message || err);
    return res.status(200).json({ candidates: [] });
  }
});

app.get("/delivery/reverse", cors, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lon ?? req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat/lon requeridos" });
    }
    const label = await deliveryProviders.nominatimReverse(lat, lng);
    return res.status(200).json({ label });
  } catch (err) {
    console.error("delivery/reverse:", err?.message || err);
    return res.status(200).json({ label: null });
  }
});

app.get("/delivery/route", cors, async (req, res) => {
  try {
    const storeLat = Number(req.query.storeLat);
    const storeLng = Number(req.query.storeLng);
    const destLat = Number(req.query.destLat);
    const destLng = Number(req.query.destLng);
    if (![storeLat, storeLng, destLat, destLng].every(Number.isFinite)) {
      return res.status(400).json({ error: "coordenadas invalidas" });
    }
    const route = await deliveryProviders.drivingRoute(storeLng, storeLat, destLng, destLat);
    return res.status(200).json(route);
  } catch (err) {
    console.error("delivery/route:", err?.message || err);
    return res.status(200).json({ positions: [], distanceKm: null });
  }
});

app.get("/delivery/distance", cors, async (req, res) => {
  try {
    const storeLat = Number(req.query.storeLat);
    const storeLng = Number(req.query.storeLng);
    const destLat = Number(req.query.destLat);
    const destLng = Number(req.query.destLng);
    if (![storeLat, storeLng, destLat, destLng].every(Number.isFinite)) {
      return res.status(400).json({ error: "coordenadas invalidas" });
    }
    const distanceKm = await deliveryProviders.drivingDistanceKm(
      storeLng,
      storeLat,
      destLng,
      destLat,
    );
    if (distanceKm == null) {
      return res.status(200).json({ distanceKm: null });
    }
    return res.status(200).json({ distanceKm });
  } catch (err) {
    console.error("delivery/distance:", err?.message || err);
    return res.status(200).json({ distanceKm: null });
  }
});

/** Proxy ORS: la clave queda en el servidor (Render), no en el navegador. */
app.use("/ors", cors, async (req, res) => {
  const apiKey = getOrsApiKey();
  if (!apiKey) {
    return res.status(503).json({ error: "ORS_API_KEY no configurada en el BFF" });
  }

  const pathAndQuery = req.url || "/";
  const target = new URL(`${ORS_API_BASE}${pathAndQuery}`);
  target.searchParams.set("api_key", apiKey);

  const method = req.method.toUpperCase();
  const headers = {};
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = req.headers["content-type"] || "application/json";
    headers.Authorization = apiKey;
  }

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : req.rawBody ?? (req.body != null ? JSON.stringify(req.body) : undefined);

  try {
    const upstream = await fetch(target.toString(), { method, headers, body });
    const text = await upstream.text();
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }
    return res.send(text);
  } catch (err) {
    console.error("ors proxy:", err?.message || err);
    return res.status(502).json({ error: "No se pudo contactar OpenRouteService" });
  }
});

app.post("/createOrder", (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo no permitido" });
      }

      try {
        const decodedToken = await verifyFirebaseUser(req);
        const supabase = getSupabaseAdmin();
        const { items, direccion, metodoPago, notas, envio: rawEnvio } = req.body || {};

        if (!["stripe", "contraentrega"].includes(metodoPago)) {
          return res.status(400).json({ error: "Metodo de pago invalido" });
        }

        const normalizedAddress = normalizeAddress(direccion);
        const normalizedNotes = normalizeOptionalText(notas, 600);
        const idempotencyKey = readIdempotencyKey(req);
        if (idempotencyKey) {
          const existing = await findOrderByIdempotency(supabase, decodedToken.uid, idempotencyKey);
          if (existing?.estado === "pendiente") {
            return res.status(200).json(idempotencyOrderJson(existing, true));
          }
        }

        const draft = await buildOrderDraft(supabase, items);
        let envio = draft.envio;
        if (typeof rawEnvio === "number" && Number.isFinite(rawEnvio) && rawEnvio >= 0) {
          envio = Math.min(Math.round(rawEnvio * 100) / 100, DELIVERY_MAX_ENVIO_S);
        }
        const total = draft.subtotal + envio;
        const creadoEn = new Date().toISOString();

        const insertRow = {
          userId: decodedToken.uid,
          userEmail: decodedToken.email || "",
          items: draft.items,
          subtotal: draft.subtotal,
          envio,
          total,
          estado: "pendiente",
          direccion: normalizedAddress,
          creadoEn,
          metodoPago,
          notas: normalizedNotes || "",
        };
        if (idempotencyKey) {
          insertRow.idempotencyKey = idempotencyKey;
        }

        let { data, error } = await supabase.from("pedidos").insert(insertRow).select("id").single();

        if (error?.code === "23505" && idempotencyKey) {
          const existing = await findOrderByIdempotency(supabase, decodedToken.uid, idempotencyKey);
          if (existing?.estado === "pendiente") {
            return res.status(200).json(idempotencyOrderJson(existing, true));
          }
        }

        if (error || !data?.id) {
          throw Object.assign(new Error("No se pudo crear el pedido"), { status: 500 });
        }

        const orderId = data.id;

        if (metodoPago === "contraentrega") {
          try {
            const inserted = await fetchOrderOrThrow(supabase, orderId);
            await discountOrderStockRpc(supabase, inserted);
            const stockMark = new Date().toISOString();
            await updateOrder(supabase, orderId, { stockDescontadoEn: stockMark });
            await logAuditFn(
              supabase,
              "descontar_stock_pedido",
              "pedido",
              orderId,
              `#${orderId.slice(-8).toUpperCase()}`,
              decodedToken.uid,
              decodedToken.email || "",
              { source: "createOrder_cod", metodoPago: "contraentrega" },
            );
          } catch (discountErr) {
            await supabase.from("pedidos").delete().eq("id", orderId);
            throw discountErr;
          }
        }

        return res.status(200).json({
          orderId,
          subtotal: draft.subtotal,
          envio,
          total,
          estado: "pendiente",
        });
      } catch (error) {
        console.error("Create order error:", error);
        return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
      }
    });
});

app.post("/updateOrderStatus", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);

      const { orderId, estado } = req.body || {};
      if (!orderId || typeof orderId !== "string") {
        return res.status(400).json({ error: "Pedido invalido" });
      }
      if (!ORDER_STATUSES.has(estado)) {
        return res.status(400).json({ error: "Estado invalido" });
      }

      const order = await fetchOrderOrThrow(supabase, orderId);
      const patch = { estado };
      if (estado === "pagado") {
        patch.pagadoEn = new Date().toISOString();
      }
      try {
        const stockFx = await applyOrderStatusStockSideEffects(supabase, order, orderId, estado);
        if (stockFx.patch) {
          Object.assign(patch, stockFx.patch);
        }
        if (stockFx.audit) {
          await logAuditFn(
            supabase,
            stockFx.audit.accion,
            "pedido",
            orderId,
            `#${orderId.slice(-8).toUpperCase()}`,
            decodedToken.uid,
            decodedToken.email || "",
            { source: stockFx.audit.source, metodoPago: order.metodoPago },
          );
        }
      } catch (stockErr) {
        console.error("updateOrderStatus stock:", stockErr?.message || stockErr);
        const isRestore = estado === "cancelado";
        return res.status(409).json({
          error: isRestore
            ? "No se pudo restaurar stock al cancelar. Revisa inventario o contacta soporte."
            : "No se pudo descontar stock. Revisa inventario antes de marcar como pagado.",
        });
      }

      await updateOrder(supabase, orderId, patch);

      await logAuditFn(
        supabase,
        "cambiar_estado",
        "pedido",
        orderId,
        `#${orderId.slice(-8).toUpperCase()}`,
        decodedToken.uid,
        decodedToken.email || "",
        { estado, source: "updateOrderStatus" },
      );

      return res.status(200).json({ orderId, estado });
    } catch (error) {
      console.error("Update order status error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
    });
});

function handleAdminRpcError(error) {
  const msg = String(error?.message || error || "");
  if (msg.includes("product_not_found")) {
    throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
  }
  if (msg.includes("function") && msg.includes("does not exist")) {
    throw Object.assign(
      new Error("Migraciones de Supabase pendientes (RPC de productos)."),
      { status: 503 },
    );
  }
  throw error;
}

function sinceDateISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function validPeriod(value) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? value : currentPeriod();
}

function periodBounds(period) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month, 1));
  const date = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return {
    startDate: date(start),
    nextDate: date(next),
    startISO: start.toISOString(),
    nextISO: next.toISOString(),
  };
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function workerDisplayName(worker) {
  return [worker?.nombres, worker?.apellidos].filter(Boolean).join(" ").trim()
    || worker?.nombre
    || worker?.email
    || "Trabajador";
}

async function fetchWorkerGoal(supabase, worker, period) {
  const { data, error } = await supabase
    .from("rrhh_metas_mensuales")
    .select("*")
    .eq("trabajadorUid", worker.uid)
    .eq("periodo", period)
    .maybeSingle();
  if (error) {
    if (isRecoverableSupabaseError(error)) {
      return { metaVentas: 3500, metaPedidos: 20 };
    }
    throw error;
  }
  return {
    metaVentas: Number(data?.metaVentas ?? 3500) || 3500,
    metaPedidos: Number(data?.metaPedidos ?? 20) || 20,
  };
}

function defaultWorkerPerformance(worker, period) {
  return {
    trabajadorUid: worker.uid,
    trabajadorNombre: workerDisplayName(worker),
    trabajadorEmail: worker.email || "",
    periodo: period,
    ventasCantidad: 0,
    ventasTotal: 0,
    gananciaTotal: 0,
    unidadesVendidas: 0,
    pedidosGestionados: 0,
    metaVentas: 3500,
    metaPedidos: 20,
    cumplimientoVentas: 0,
    cumplimientoPedidos: 0,
    cumplimientoGeneral: 0,
    feedback: "Sin datos de ventas para este periodo.",
  };
}

async function fetchWorkerPerformance(supabase, worker, period) {
  const bounds = periodBounds(period);
  const [goalResult, salesResult, auditResult] = await Promise.all([
    fetchWorkerGoal(supabase, worker, period),
    supabase
      .from("ventasDiarias")
      .select("*")
      .eq("encargadoUid", worker.uid)
      .gte("fecha", bounds.startDate)
      .lt("fecha", bounds.nextDate)
      .limit(1000),
    supabase
      .from("auditoria")
      .select("entidadId,realizadoEn")
      .eq("usuarioUid", worker.uid)
      .eq("entidad", "pedido")
      .eq("accion", "cambiar_estado")
      .gte("realizadoEn", bounds.startISO)
      .lt("realizadoEn", bounds.nextISO)
      .limit(1000),
  ]);

  if (salesResult.error && !isRecoverableSupabaseError(salesResult.error)) throw salesResult.error;
  if (auditResult.error && !isRecoverableSupabaseError(auditResult.error)) throw auditResult.error;

  const sales = salesResult.error
    ? []
    : (salesResult.data ?? []).filter((sale) => !sale.devuelto);
  const pedidosGestionados = auditResult.error
    ? 0
    : new Set((auditResult.data ?? []).map((item) => item.entidadId).filter(Boolean)).size;
  const ventasTotal = money(sales.reduce((acc, sale) => acc + Number(sale.total || 0), 0));
  const gananciaTotal = money(sales.reduce((acc, sale) => acc + Number(sale.ganancia || 0), 0));
  const unidadesVendidas = sales.reduce((acc, sale) => acc + Number(sale.cantidad || 0), 0);
  const cumplimientoVentas = goalResult.metaVentas > 0 ? Math.min(1, ventasTotal / goalResult.metaVentas) : 1;
  const cumplimientoPedidos = goalResult.metaPedidos > 0 ? Math.min(1, pedidosGestionados / goalResult.metaPedidos) : 1;
  const cumplimientoGeneral = money(((cumplimientoVentas + cumplimientoPedidos) / 2) * 100) / 100;
  const feedback = cumplimientoGeneral >= 0.9
    ? "Desempeno sobresaliente para el periodo."
    : cumplimientoGeneral >= 0.65
      ? "Desempeno en rango esperado; mantener seguimiento operativo."
      : "Desempeno por debajo del umbral; requiere seguimiento de RR.HH.";

  return {
    trabajadorUid: worker.uid,
    trabajadorNombre: workerDisplayName(worker),
    trabajadorEmail: worker.email || "",
    periodo,
    ventasCantidad: sales.length,
    ventasTotal,
    gananciaTotal,
    unidadesVendidas,
    pedidosGestionados,
    metaVentas: goalResult.metaVentas,
    metaPedidos: goalResult.metaPedidos,
    cumplimientoVentas: money(cumplimientoVentas * 100),
    cumplimientoPedidos: money(cumplimientoPedidos * 100),
    cumplimientoGeneral: money(cumplimientoGeneral * 100),
    feedback,
  };
}

async function fetchWorkerProfiles(supabase) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("uid,nombres,apellidos,nombre,email,rol")
    .eq("rol", "trabajador")
    .order("nombre");
  if (error) {
    if (isRecoverableSupabaseError(error)) return [];
    throw error;
  }
  return data ?? [];
}

async function fetchAllWorkerPerformances(supabase, period) {
  const workers = await fetchWorkerProfiles(supabase);
  return Promise.all(
    workers.map(async (worker) => {
      try {
        return await fetchWorkerPerformance(supabase, worker, period);
      } catch (error) {
        console.warn(`fetchWorkerPerformance ${worker.uid}:`, error?.message || error);
        return defaultWorkerPerformance(worker, period);
      }
    }),
  );
}

async function fetchWorkerSalesForPeriod(supabase, workerUid, period, options = {}) {
  const lenient = options.lenient === true;
  const bounds = periodBounds(period);
  const { data, error } = await supabase
    .from("ventasDiarias")
    .select("fecha,cantidad,total,devuelto,encargadoUid")
    .eq("encargadoUid", workerUid)
    .gte("fecha", bounds.startDate)
    .lt("fecha", bounds.nextDate)
    .limit(2000);
  if (error) {
    console.warn(`ventasDiarias encargado=${workerUid}:`, error.message || error);
    if (lenient || isRecoverableSupabaseError(error)) return [];
    throw error;
  }
  let sales = (data ?? []).filter((sale) => !sale.devuelto);
  if (sales.length === 0 && lenient) {
    const workers = await fetchWorkerProfiles(supabase);
    if (workers.length === 1 && workers[0]?.uid === workerUid) {
      const legacy = await supabase
        .from("ventasDiarias")
        .select("fecha,cantidad,total,devuelto,encargadoUid")
        .is("encargadoUid", null)
        .gte("fecha", bounds.startDate)
        .lt("fecha", bounds.nextDate)
        .limit(2000);
      if (!legacy.error) {
        sales = (legacy.data ?? []).filter((sale) => !sale.devuelto);
      }
    }
  }
  return sales;
}

function buildDailyHistoryFromSales(sales) {
  const byDate = new Map();
  for (const sale of sales) {
    const fecha = String(sale.fecha || "");
    if (!fecha) continue;
    const current = byDate.get(fecha) || { fecha, pares: 0, ventasTotal: 0, transacciones: 0 };
    current.pares += Number(sale.cantidad || 0);
    current.ventasTotal += Number(sale.total || 0);
    current.transacciones += 1;
    byDate.set(fecha, current);
  }
  return Array.from(byDate.values())
    .map((row) => ({ ...row, ventasTotal: money(row.ventasTotal) }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

async function buildWorkerDailyHistory(supabase, workerUid, period) {
  try {
    const sales = await fetchWorkerSalesForPeriod(supabase, workerUid, period, { lenient: true });
    return buildDailyHistoryFromSales(sales);
  } catch (error) {
    console.warn(`buildWorkerDailyHistory ${workerUid}:`, error?.message || error);
    return [];
  }
}

function formatCitaForMessage(fechaCita) {
  const value = new Date(fechaCita);
  if (Number.isNaN(value.getTime())) return fechaCita;
  return value.toLocaleString("es-PE", {
    dateStyle: "full",
    timeStyle: "short",
  });
}

async function createStaffNotification(supabase, payload) {
  const { data, error } = await supabase
    .from("rrhh_notificaciones")
    .insert({
      destinatarioUid: payload.destinatarioUid,
      tipo: payload.tipo,
      titulo: payload.titulo,
      mensaje: payload.mensaje,
      metadata: payload.metadata || {},
      leida: false,
      creadoEn: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function fetchStaffNotifications(supabase, workerUid, limit = 50) {
  const { data, error } = await supabase
    .from("rrhh_notificaciones")
    .select("*")
    .eq("destinatarioUid", workerUid)
    .order("creadoEn", { ascending: false })
    .limit(limit);
  if (error) {
    if (isRecoverableSupabaseError(error)) return [];
    throw error;
  }
  return data ?? [];
}

async function fetchWorkerAppointments(supabase, workerUid, period) {
  const bounds = periodBounds(period);
  const { data, error } = await supabase
    .from("rrhh_citas")
    .select("*")
    .eq("trabajadorUid", workerUid)
    .gte("fechaCita", bounds.startISO)
    .lt("fechaCita", bounds.nextISO)
    .order("fechaCita", { ascending: true });
  if (error) {
    if (isRecoverableSupabaseError(error)) return [];
    throw error;
  }
  return data ?? [];
}

async function fetchWorkerActiveCase(supabase, workerUid, period) {
  const { data: alerts, error } = await supabase
    .from("rrhh_alertas")
    .select("*")
    .eq("trabajadorUid", workerUid)
    .eq("periodo", period)
    .neq("estado", "cerrada")
    .order("creadoEn", { ascending: false })
    .limit(1);
  if (error) {
    if (isRecoverableSupabaseError(error)) {
      return { alertaActiva: null, proximaCita: null };
    }
    throw error;
  }
  const alertaActiva = alerts?.[0] ?? null;
  let proximaCita = null;
  if (alertaActiva) {
    const { data: citas, error: citaError } = await supabase
      .from("rrhh_citas")
      .select("*")
      .eq("alertaId", alertaActiva.id)
      .eq("estado", "programada")
      .order("fechaCita", { ascending: true })
      .limit(1);
    if (citaError && !isRecoverableSupabaseError(citaError)) throw citaError;
    proximaCita = citas?.[0] ?? null;
  }
  return { alertaActiva, proximaCita };
}

function sanitizeStorageFilename(fileName) {
  return String(fileName || "informe.pdf")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "informe.pdf";
}

app.get("/admin/dailySales", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);

      const fecha = typeof req.query.fecha === "string" ? req.query.fecha.trim() : "";
      const sinceDays = Math.min(
        365,
        Math.max(1, Number.parseInt(String(req.query.sinceDays ?? "90"), 10) || 90),
      );

      let query = supabase.from("ventasDiarias").select("*");
      if (fecha) {
        query = query.eq("fecha", fecha);
      } else {
        query = query
          .gte("fecha", sinceDateISO(sinceDays))
          .order("fecha", { ascending: false })
          .limit(500);
      }

      const { data, error } = await query;
      if (error) throw error;

      const sales = (data ?? []).sort((a, b) =>
        String(b.creadoEn || "").localeCompare(String(a.creadoEn || "")),
      );
      return res.status(200).json({ sales });
    } catch (error) {
      console.error("admin/dailySales error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/staff/performance", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const period = validPeriod(String(req.query.periodo || ""));
      const { data: worker, error } = await supabase
        .from("usuarios")
        .select("uid,nombres,apellidos,nombre,email,rol")
        .eq("uid", decodedToken.uid)
        .maybeSingle();
      if (error) throw error;
      if (!worker) {
        throw Object.assign(new Error("Perfil de trabajador no encontrado"), { status: 404 });
      }
      const [performance, historialDiario, notificaciones, citas, workflow] = await Promise.all([
        fetchWorkerPerformance(supabase, worker, period),
        buildWorkerDailyHistory(supabase, worker.uid, period),
        fetchStaffNotifications(supabase, worker.uid),
        fetchWorkerAppointments(supabase, worker.uid, period),
        fetchWorkerActiveCase(supabase, worker.uid, period),
      ]);
      return res.status(200).json({
        performance,
        historialDiario,
        notificaciones,
        citas,
        workflow,
      });
    } catch (error) {
      console.error("staff/performance error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/hr/dashboard", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertHrRole(supabase, decodedToken.uid);
      const period = validPeriod(String(req.query.periodo || ""));
      const [performances, alerts, reports, actions, appointments, goals] = await Promise.all([
        fetchAllWorkerPerformances(supabase, period),
        supabaseRows(
          supabase.from("rrhh_alertas").select("*").eq("periodo", period).order("creadoEn", { ascending: false }),
          "rrhh_alertas",
        ),
        supabaseRows(
          supabase.from("rrhh_informes_psicologicos").select("*").eq("periodo", period).order("creadoEn", { ascending: false }),
          "rrhh_informes_psicologicos",
        ),
        supabaseRows(
          supabase.from("rrhh_acciones").select("*").order("creadoEn", { ascending: false }).limit(200),
          "rrhh_acciones",
        ),
        supabaseRows(
          supabase.from("rrhh_citas").select("*").order("fechaCita", { ascending: true }).limit(500),
          "rrhh_citas",
        ),
        supabaseRows(
          supabase.from("rrhh_metas_mensuales").select("*").eq("periodo", period),
          "rrhh_metas_mensuales",
        ),
      ]);
      return res.status(200).json({
        period,
        workers: performances,
        alerts,
        reports,
        actions,
        appointments,
        goals,
      });
    } catch (error) {
      console.error("hr/dashboard error:", error?.message || error, error?.details || "");
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/hr/alerts/generate", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertHrRole(supabase, decodedToken.uid);
      const period = validPeriod(String(req.body?.periodo || ""));
      const threshold = Math.min(95, Math.max(10, Number(req.body?.threshold ?? 65))) || 65;
      const performances = await fetchAllWorkerPerformances(supabase, period);
      const generated = [];

      for (const metrics of performances) {
        if (Number(metrics.cumplimientoGeneral) >= threshold) continue;
        const existing = await supabase
          .from("rrhh_alertas")
          .select("*")
          .eq("trabajadorUid", metrics.trabajadorUid)
          .eq("periodo", period)
          .eq("tipo", "rendimiento_bajo")
          .maybeSingle();
        if (existing.error) throw existing.error;

        const payload = {
          trabajadorUid: metrics.trabajadorUid,
          trabajadorNombre: metrics.trabajadorNombre,
          trabajadorEmail: metrics.trabajadorEmail,
          periodo: period,
          tipo: "rendimiento_bajo",
          motivoGeneral: "Desempeno mensual bajo el umbral operativo definido para seguimiento.",
          metricas: metrics,
          actualizadoEn: new Date().toISOString(),
        };

        if (existing.data) {
          const { data, error } = await supabase
            .from("rrhh_alertas")
            .update(payload)
            .eq("id", existing.data.id)
            .select("*")
            .single();
          if (error) throw error;
          generated.push(data);
        } else {
          const { data, error } = await supabase
            .from("rrhh_alertas")
            .insert({
              ...payload,
              estado: "pendiente_psicologo",
              creadoPorUid: decodedToken.uid,
              creadoPorEmail: decodedToken.email || "",
              creadoEn: new Date().toISOString(),
            })
            .select("*")
            .single();
          if (error) throw error;
          generated.push(data);
        }
      }

      await logAuditFn(
        supabase,
        "crear",
        "rrhh_alerta",
        period,
        "Generacion de alertas RR.HH.",
        decodedToken.uid,
        decodedToken.email || "",
        { period, threshold, generated: generated.length },
      );
      return res.status(200).json({ alerts: generated });
    } catch (error) {
      console.error("hr/alerts/generate error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/hr/alerts/refer", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertHrRole(supabase, decodedToken.uid);
      const period = validPeriod(String(req.body?.periodo || ""));
      const trabajadorUid = String(req.body?.trabajadorUid || "").trim();
      const motivoGeneral = String(req.body?.motivoGeneral || "").trim()
        || "Derivación manual a evaluación psicológica por RR.HH.";
      if (!isNonEmptyString(trabajadorUid, 80)) {
        return res.status(400).json({ error: "Trabajador invalido" });
      }
      const { data: worker, error: workerError } = await supabase
        .from("usuarios")
        .select("uid,nombres,apellidos,nombre,email,rol")
        .eq("uid", trabajadorUid)
        .eq("rol", "trabajador")
        .maybeSingle();
      if (workerError) throw workerError;
      if (!worker) return res.status(404).json({ error: "Trabajador no encontrado" });

      const metrics = await fetchWorkerPerformance(supabase, worker, period);
      const existing = await supabase
        .from("rrhh_alertas")
        .select("*")
        .eq("trabajadorUid", trabajadorUid)
        .eq("periodo", period)
        .eq("tipo", "manual")
        .maybeSingle();
      if (existing.error) throw existing.error;

      const payload = {
        trabajadorUid,
        trabajadorNombre: workerDisplayName(worker),
        trabajadorEmail: worker.email || "",
        periodo: period,
        tipo: "manual",
        motivoGeneral,
        metricas: metrics,
        estado: "pendiente_psicologo",
        actualizadoEn: new Date().toISOString(),
      };

      let alert;
      if (existing.data) {
        const { data, error } = await supabase
          .from("rrhh_alertas")
          .update(payload)
          .eq("id", existing.data.id)
          .select("*")
          .single();
        if (error) throw error;
        alert = data;
      } else {
        const { data, error } = await supabase
          .from("rrhh_alertas")
          .insert({
            ...payload,
            creadoPorUid: decodedToken.uid,
            creadoPorEmail: decodedToken.email || "",
            creadoEn: new Date().toISOString(),
          })
          .select("*")
          .single();
        if (error) throw error;
        alert = data;
      }

      await createStaffNotification(supabase, {
        destinatarioUid: trabajadorUid,
        tipo: "derivacion_rrhh",
        titulo: "Evaluación psicológica solicitada",
        mensaje: "RR.HH. ha solicitado una evaluación profesional. El psicólogo te contactará para coordinar la cita.",
        metadata: { alertaId: alert.id, periodo: period },
      });

      await logAuditFn(
        supabase,
        "crear",
        "rrhh_alerta",
        alert.id,
        "Derivacion manual",
        decodedToken.uid,
        decodedToken.email || "",
        { trabajadorUid, period },
      );
      return res.status(200).json({ alert });
    } catch (error) {
      console.error("hr/alerts/refer error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/hr/workers/:workerUid/history", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertHrRole(supabase, decodedToken.uid);
      const workerUid = String(req.params.workerUid || "").trim();
      const period = validPeriod(String(req.query.periodo || ""));
      if (!isNonEmptyString(workerUid, 80)) {
        return res.status(400).json({ error: "Trabajador invalido" });
      }
      const { data: worker, error: workerError } = await supabase
        .from("usuarios")
        .select("uid,nombres,apellidos,nombre,email,rol")
        .eq("uid", workerUid)
        .maybeSingle();
      if (workerError) throw workerError;
      if (!worker) return res.status(404).json({ error: "Trabajador no encontrado" });

      let performance;
      try {
        performance = await fetchWorkerPerformance(supabase, worker, period);
      } catch (perfError) {
        console.warn("hr/workers history performance:", perfError?.message || perfError, perfError?.details || "");
        performance = defaultWorkerPerformance(worker, period);
      }
      const historialDiario = await buildWorkerDailyHistory(supabase, workerUid, period);
      return res.status(200).json({ performance, historialDiario });
    } catch (error) {
      console.error("hr/workers history error:", error?.message || error, error?.details || "");
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.put("/hr/metas", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertHrRole(supabase, decodedToken.uid);
      const trabajadorUid = String(req.body?.trabajadorUid || "").trim();
      const period = validPeriod(String(req.body?.periodo || ""));
      const metaVentas = Number(req.body?.metaVentas);
      const metaPedidos = Number(req.body?.metaPedidos);
      if (!isNonEmptyString(trabajadorUid, 80) || !Number.isFinite(metaVentas) || metaVentas <= 0 || !Number.isFinite(metaPedidos) || metaPedidos <= 0) {
        return res.status(400).json({ error: "Metas invalidas" });
      }
      const { data: worker, error: workerError } = await supabase
        .from("usuarios")
        .select("uid,nombres,apellidos,nombre,email")
        .eq("uid", trabajadorUid)
        .eq("rol", "trabajador")
        .maybeSingle();
      if (workerError) throw workerError;
      if (!worker) return res.status(404).json({ error: "Trabajador no encontrado" });

      const { data, error } = await supabase
        .from("rrhh_metas_mensuales")
        .upsert({
          trabajadorUid,
          trabajadorNombre: workerDisplayName(worker),
          trabajadorEmail: worker.email || "",
          periodo: period,
          metaVentas: money(metaVentas),
          metaPedidos: Math.round(metaPedidos),
          creadoPorUid: decodedToken.uid,
          creadoPorEmail: decodedToken.email || "",
          actualizadoEn: new Date().toISOString(),
        }, { onConflict: "trabajadorUid,periodo" })
        .select("*")
        .single();
      if (error) throw error;
      return res.status(200).json({ goal: data });
    } catch (error) {
      console.error("hr/metas error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/hr/actions", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertHrRole(supabase, decodedToken.uid);
      const { alertaId, tipoAccion, descripcion } = req.body || {};
      const allowed = new Set([
        "capacitacion",
        "redistribucion_tareas",
        "derivacion_formal",
        "observacion",
        "cerrar_seguimiento",
        "continuar",
        "no_continuar",
      ]);
      if (!isNonEmptyString(alertaId, 80) || !allowed.has(tipoAccion) || !isNonEmptyString(descripcion, 1200)) {
        return res.status(400).json({ error: "Datos de accion invalidos" });
      }
      const { data: alert, error: alertError } = await supabase
        .from("rrhh_alertas")
        .select("*")
        .eq("id", alertaId)
        .maybeSingle();
      if (alertError) throw alertError;
      if (!alert) return res.status(404).json({ error: "Alerta no encontrada" });

      const { data, error } = await supabase
        .from("rrhh_acciones")
        .insert({
          alertaId,
          trabajadorUid: alert.trabajadorUid,
          tipoAccion,
          descripcion: String(descripcion).trim(),
          responsableUid: decodedToken.uid,
          responsableEmail: decodedToken.email || "",
          creadoEn: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw error;

      const closesCase = new Set(["cerrar_seguimiento", "continuar", "no_continuar"]).has(tipoAccion);
      const nextStatus = closesCase ? "cerrada" : "accion_rrhh";
      const { error: updateError } = await supabase
        .from("rrhh_alertas")
        .update({ estado: nextStatus, actualizadoEn: new Date().toISOString() })
        .eq("id", alertaId);
      if (updateError) throw updateError;

      if (tipoAccion === "continuar" || tipoAccion === "no_continuar") {
        const decisionTitulo = tipoAccion === "continuar"
          ? "Decisión RR.HH.: continúas en la empresa"
          : "Decisión RR.HH.: proceso de salida";
        const decisionMensaje = tipoAccion === "continuar"
          ? "RR.HH. ha registrado que continúas en tu puesto tras la evaluación. Revisa el detalle con tu encargado si tienes dudas."
          : "RR.HH. ha registrado una decisión de no continuidad. Coordinación con RR.HH. para los siguientes pasos.";
        await createStaffNotification(supabase, {
          destinatarioUid: alert.trabajadorUid,
          tipo: "decision_rrhh",
          titulo: decisionTitulo,
          mensaje: decisionMensaje,
          metadata: { alertaId, tipoAccion },
        });
      }

      await logAuditFn(
        supabase,
        "cambiar_estado",
        "rrhh_alerta",
        alertaId,
        tipoAccion,
        decodedToken.uid,
        decodedToken.email || "",
        { tipoAccion },
      );
      return res.status(200).json({ action: data });
    } catch (error) {
      console.error("hr/actions error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/hr/reports/:reportId/download-url", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertHrRole(supabase, decodedToken.uid);
      const reportId = String(req.params.reportId || "").trim();
      const { data: report, error } = await supabase
        .from("rrhh_informes_psicologicos")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();
      if (error) throw error;
      if (!report) return res.status(404).json({ error: "Informe no encontrado" });
      const signed = await supabase.storage.from("rrhh-informes").createSignedUrl(report.pdfPath, 300);
      if (signed.error) throw signed.error;
      return res.status(200).json({ signedUrl: signed.data?.signedUrl ?? "" });
    } catch (error) {
      console.error("hr/reports download error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/psychology/alerts", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertPsychologistRole(supabase, decodedToken.uid);
      const period = validPeriod(String(req.query.periodo || ""));
      const [alerts, reports, appointments] = await Promise.all([
        supabaseRows(
          supabase
            .from("rrhh_alertas")
            .select("*")
            .eq("periodo", period)
            .in("estado", ["pendiente_psicologo", "evaluada", "accion_rrhh"])
            .order("creadoEn", { ascending: false }),
          "rrhh_alertas",
        ),
        supabaseRows(
          supabase
            .from("rrhh_informes_psicologicos")
            .select("*")
            .eq("periodo", period)
            .order("creadoEn", { ascending: false }),
          "rrhh_informes_psicologicos",
        ),
        supabaseRows(
          supabase
            .from("rrhh_citas")
            .select("*")
            .order("fechaCita", { ascending: true })
            .limit(500),
          "rrhh_citas",
        ),
      ]);
      return res.status(200).json({
        period,
        alerts,
        reports,
        appointments,
      });
    } catch (error) {
      console.error("psychology/alerts error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.patch("/staff/notifications/:notificationId/read", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const notificationId = String(req.params.notificationId || "").trim();
      const { error } = await supabase
        .from("rrhh_notificaciones")
        .update({ leida: true })
        .eq("id", notificationId)
        .eq("destinatarioUid", decodedToken.uid);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("staff/notifications read error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.patch("/staff/notifications/read-all", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const { error } = await supabase
        .from("rrhh_notificaciones")
        .update({ leida: true })
        .eq("destinatarioUid", decodedToken.uid)
        .eq("leida", false);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("staff/notifications read-all error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/psychology/appointments", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertPsychologistRole(supabase, decodedToken.uid);
      const { alertaId, fechaCita, lugar, notas } = req.body || {};
      if (!isNonEmptyString(alertaId, 80) || !isNonEmptyString(fechaCita, 40)) {
        return res.status(400).json({ error: "Cita incompleta" });
      }
      const citaDate = new Date(fechaCita);
      if (Number.isNaN(citaDate.getTime())) {
        return res.status(400).json({ error: "Fecha de cita invalida" });
      }
      const { data: alert, error: alertError } = await supabase
        .from("rrhh_alertas")
        .select("*")
        .eq("id", alertaId)
        .maybeSingle();
      if (alertError) throw alertError;
      if (!alert) return res.status(404).json({ error: "Alerta no encontrada" });

      const lugarFinal = isNonEmptyString(lugar, 200) ? String(lugar).trim() : "Consultorio / sala de evaluación";
      const { data, error } = await supabase
        .from("rrhh_citas")
        .insert({
          alertaId,
          trabajadorUid: alert.trabajadorUid,
          psicologoUid: decodedToken.uid,
          psicologoEmail: decodedToken.email || "",
          fechaCita: citaDate.toISOString(),
          lugar: lugarFinal,
          notas: isNonEmptyString(notas, 800) ? String(notas).trim() : null,
          estado: "programada",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw error;

      await createStaffNotification(supabase, {
        destinatarioUid: alert.trabajadorUid,
        tipo: "cita_psicologo",
        titulo: "Cita de evaluación programada",
        mensaje: `Tu cita está programada para el ${formatCitaForMessage(data.fechaCita)} en ${lugarFinal}.`,
        metadata: { citaId: data.id, alertaId, fechaCita: data.fechaCita, lugar: lugarFinal },
      });

      await logAuditFn(
        supabase,
        "crear",
        "rrhh_cita",
        data.id,
        alert.trabajadorNombre || alert.trabajadorUid,
        decodedToken.uid,
        decodedToken.email || "",
        { alertaId },
      );
      return res.status(200).json({ appointment: data });
    } catch (error) {
      console.error("psychology/appointments error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.patch("/psychology/appointments/:appointmentId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertPsychologistRole(supabase, decodedToken.uid);
      const appointmentId = String(req.params.appointmentId || "").trim();
      const estado = String(req.body?.estado || "").trim();
      if (!["programada", "realizada", "cancelada"].includes(estado)) {
        return res.status(400).json({ error: "Estado de cita invalido" });
      }
      const { data, error } = await supabase
        .from("rrhh_citas")
        .update({ estado, actualizadoEn: new Date().toISOString() })
        .eq("id", appointmentId)
        .select("*")
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Cita no encontrada" });
      return res.status(200).json({ appointment: data });
    } catch (error) {
      console.error("psychology/appointments patch error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/psychology/reports/upload-url", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertPsychologistRole(supabase, decodedToken.uid);
      const { alertaId, fileName, contentType } = req.body || {};
      if (!isNonEmptyString(alertaId, 80) || contentType !== "application/pdf") {
        return res.status(400).json({ error: "Solo se aceptan informes PDF" });
      }
      const { data: alert, error: alertError } = await supabase
        .from("rrhh_alertas")
        .select("id")
        .eq("id", alertaId)
        .maybeSingle();
      if (alertError) throw alertError;
      if (!alert) return res.status(404).json({ error: "Alerta no encontrada" });

      const safeFile = sanitizeStorageFilename(fileName);
      const path = `informes/${alertaId}/${Date.now()}-${safeFile.endsWith(".pdf") ? safeFile : `${safeFile}.pdf`}`;
      const signed = await supabase.storage.from("rrhh-informes").createSignedUploadUrl(path, { upsert: true });
      if (signed.error) throw signed.error;
      return res.status(200).json({
        bucket: "rrhh-informes",
        path,
        token: signed.data?.token,
        signedUrl: signed.data?.signedUrl,
      });
    } catch (error) {
      console.error("psychology upload-url error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/psychology/reports", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertPsychologistRole(supabase, decodedToken.uid);
      const { alertaId, resumen, recomendacion, pdfPath, pdfNombre } = req.body || {};
      if (
        !isNonEmptyString(alertaId, 80)
        || !isNonEmptyString(resumen, 2000)
        || !isNonEmptyString(recomendacion, 2000)
        || !isNonEmptyString(pdfPath, 240)
        || !String(pdfPath).startsWith(`informes/${alertaId}/`)
      ) {
        return res.status(400).json({ error: "Informe psicologico incompleto" });
      }
      const { data: alert, error: alertError } = await supabase
        .from("rrhh_alertas")
        .select("*")
        .eq("id", alertaId)
        .maybeSingle();
      if (alertError) throw alertError;
      if (!alert) return res.status(404).json({ error: "Alerta no encontrada" });

      const { data, error } = await supabase
        .from("rrhh_informes_psicologicos")
        .insert({
          alertaId,
          trabajadorUid: alert.trabajadorUid,
          periodo: alert.periodo,
          psicologoUid: decodedToken.uid,
          psicologoEmail: decodedToken.email || "",
          resumen: String(resumen).trim(),
          recomendacion: String(recomendacion).trim(),
          pdfPath,
          pdfNombre: sanitizeStorageFilename(pdfNombre || "informe.pdf"),
          creadoEn: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("rrhh_alertas")
        .update({ estado: "evaluada", actualizadoEn: new Date().toISOString() })
        .eq("id", alertaId);
      if (updateError) throw updateError;

      await createStaffNotification(supabase, {
        destinatarioUid: alert.trabajadorUid,
        tipo: "informe_disponible",
        titulo: "Evaluación psicológica registrada",
        mensaje: "El psicólogo ha registrado tu evaluación. RR.HH. revisará el informe y te comunicará la decisión.",
        metadata: { alertaId, reportId: data.id },
      });

      await logAuditFn(
        supabase,
        "crear",
        "rrhh_informe",
        data.id,
        alert.trabajadorNombre || alert.trabajadorUid,
        decodedToken.uid,
        decodedToken.email || "",
        { alertaId },
      );
      return res.status(200).json({ report: data });
    } catch (error) {
      console.error("psychology/reports error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/updateProductAtomic", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const { p_id, product, codigo, finanzas } = req.body || {};
      if (!p_id || typeof p_id !== "string" || !product || !codigo || !finanzas) {
        return res.status(400).json({ error: "Datos de producto incompletos" });
      }
      const { error } = await supabase.rpc("update_product_atomic", {
        p_id,
        product,
        codigo,
        finanzas,
      });
      if (error) handleAdminRpcError(error);
      await logAuditFn(
        supabase,
        "editar",
        "producto",
        p_id,
        product.nombre || p_id,
        decodedToken.uid,
        decodedToken.email || "",
        { source: "updateProductAtomic" },
      );
      return res.status(200).json({ ok: true, id: p_id });
    } catch (error) {
      console.error("updateProductAtomic error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/createProductVariantsAtomic", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const { variants } = req.body || {};
      if (!Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({ error: "Variantes invalidas" });
      }
      const { data, error } = await supabase.rpc("create_product_variants_atomic", { variants });
      if (error) handleAdminRpcError(error);
      const ids = Array.isArray(data?.ids) ? data.ids : [];
      return res.status(200).json({ ok: true, ids });
    } catch (error) {
      console.error("createProductVariantsAtomic error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/deleteProductAtomic", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const { p_id } = req.body || {};
      if (!p_id || typeof p_id !== "string") {
        return res.status(400).json({ error: "Producto invalido" });
      }
      const { error } = await supabase.rpc("delete_product_atomic", { p_id });
      if (error) handleAdminRpcError(error);
      return res.status(200).json({ ok: true, id: p_id });
    } catch (error) {
      console.error("deleteProductAtomic error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/registrarIngresoStock", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const {
        p_product_id,
        p_talla_stock,
        p_costo_unitario,
        p_proveedor,
        p_observaciones,
        p_registrado_por,
      } = req.body || {};
      if (!p_product_id || !p_talla_stock) {
        return res.status(400).json({ error: "Datos de ingreso incompletos" });
      }
      const { data, error } = await supabase.rpc("registrar_ingreso_stock", {
        p_product_id,
        p_talla_stock,
        p_costo_unitario: p_costo_unitario ?? null,
        p_proveedor: p_proveedor || null,
        p_observaciones: p_observaciones || null,
        p_registrado_por: p_registrado_por || decodedToken.email || null,
      });
      if (error) handleAdminRpcError(error);
      return res.status(200).json(data);
    } catch (error) {
      console.error("registrarIngresoStock error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/createCheckoutSession", (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo no permitido" });
      }

      try {
        const decodedToken = await verifyFirebaseUser(req);
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const supabase = getSupabaseAdmin();
        const { orderId } = req.body || {};

        if (!orderId || typeof orderId !== "string") {
          return res.status(400).json({ error: "Pedido invalido" });
        }

        const order = await fetchOrderOrThrow(supabase, orderId);

        if (order.userId !== decodedToken.uid) {
          return res.status(403).json({ error: "No puedes pagar este pedido" });
        }
        if (order.estado !== "pendiente" || order.metodoPago !== "stripe") {
          return res.status(409).json({ error: "El pedido no esta disponible para pago" });
        }
        if (!Array.isArray(order.items) || order.items.length === 0 || order.items.length > ORDER_ITEM_LIMIT) {
          return res.status(400).json({ error: "Pedido sin productos validos" });
        }

        assertStoredTotals(order);

        if (order.stripeSessionId) {
          try {
            const existingSession = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
            if (existingSession.status === "open" && typeof existingSession.url === "string" && existingSession.url.startsWith("https://")) {
              return res.status(200).json({
                sessionId: existingSession.id,
                url: existingSession.url,
                reused: true,
              });
            }
          } catch (sessionErr) {
            console.warn("Stripe session reuse skipped:", sessionErr?.message || sessionErr);
          }
        }

        const lineItems = [];

        for (const item of order.items) {
          const quantity = Number(item?.quantity || 0);
          const price = Number(item?.product?.precio || 0);
          const name = item?.product?.nombre || "Producto";
          const image = item?.product?.imagen || "";

          if (!Number.isInteger(quantity) || quantity <= 0 || quantity > ORDER_QTY_LIMIT || price <= 0) {
            return res.status(400).json({ error: "Producto invalido en el pedido" });
          }

          lineItems.push({
            price_data: {
              currency: "pen",
              product_data: {
                name,
                images: validStripeImage(image),
              },
              unit_amount: toCents(price),
            },
            quantity,
          });
        }

        const envio = Number(order.envio || 0);
        if (envio > 0) {
          lineItems.push({
            price_data: {
              currency: "pen",
              product_data: { name: "Costo de Envio" },
              unit_amount: toCents(envio),
            },
            quantity: 1,
          });
        }

        const appUrl = process.env.APP_URL || "https://calzaturavilchez-ab17f.web.app";

        const payerEmail = String(order.userEmail || "").trim();
        const sessionPayload = {
          payment_method_types: ["card"],
          line_items: lineItems,
          mode: "payment",
          success_url: `${appUrl}/pedido-exitoso/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/checkout`,
          metadata: { orderId, userId: decodedToken.uid },
        };
        if (payerEmail.includes("@")) {
          sessionPayload.customer_email = payerEmail;
        }

        const session = await stripe.checkout.sessions.create(sessionPayload);

        await updateOrder(supabase, orderId, { stripeSessionId: session.id });

        let checkoutUrl = session.url;
        if (!checkoutUrl && session.id) {
          const retrieved = await stripe.checkout.sessions.retrieve(session.id);
          checkoutUrl = retrieved.url;
        }
        if (!checkoutUrl || typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://")) {
          console.error("Stripe checkout session sin URL", {
            sessionId: session.id,
            ui_mode: session.ui_mode,
            status: session.status,
          });
          return res.status(500).json({
            error:
              "Stripe no devolvio el enlace de pago (session.url). Revisa la cuenta Stripe y los logs del BFF.",
          });
        }

        return res.status(200).json({ sessionId: session.id, url: checkoutUrl });
      } catch (error) {
        console.error("Stripe error:", error);
        return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
      }
    });
});

app.post("/stripeWebhook", async (req, res) => {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const supabase = getSupabaseAdmin();
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        try {
          const order = await fetchOrderOrThrow(supabase, orderId);

          if (order.estado !== "pagado") {
            let stockDescontadoEn = null;
            try {
              await discountOrderStockRpc(supabase, order);
              stockDescontadoEn = new Date().toISOString();
            } catch (discountError) {
              console.error("Stripe webhook stock discount error:", discountError?.message || discountError);
            }
            await updateOrder(supabase, orderId, {
              estado: "pagado",
              stripeSessionId: session.id,
              pagadoEn: new Date().toISOString(),
              ...(stockDescontadoEn ? { stockDescontadoEn } : {}),
            });
            await logAuditFn(
              supabase,
              "cambiar_estado",
              "pedido",
              orderId,
              `#${orderId.slice(-8).toUpperCase()}`,
              session.metadata?.userId ?? null,
              order.userEmail ?? null,
              {
                estado: "pagado",
                source: "stripe_webhook",
                stripeEventId: event.id,
                stripeSessionId: session.id,
              },
            );
          }
          // Si order.estado === "pagado": Stripe está reintentando un evento ya procesado.
          // No actualizamos ni auditamos de nuevo para evitar duplicados.
        } catch (error) {
          console.error("Stripe webhook order error:", error);
          return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
        }
      }
    }

    return res.json({ received: true });
});

app.post("/confirmCodOrder", (req, res) => {
  cors(req, res, () => {
    return res.status(410).json({
      error:
        "confirmCodOrder esta retirado. El stock contra entrega se descuenta en POST /createOrder.",
    });
  });
});

app.get("/myOrders", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("userId", decodedToken.uid)
        .order("creadoEn", { ascending: false });
      if (error) throw error;
      return res.status(200).json({ orders: data ?? [] });
    } catch (error) {
      console.error("myOrders error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/orders/:orderId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      const orderId = String(req.params.orderId || "").trim();
      if (!orderId) {
        return res.status(400).json({ error: "Pedido invalido" });
      }
      const order = await fetchOrderOrThrow(supabase, orderId);
      if (order.userId !== decodedToken.uid) {
        await assertStaffRole(supabase, decodedToken.uid);
      }
      return res.status(200).json({ order });
    } catch (error) {
      console.error("orders/:orderId error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/orders", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("creadoEn", { ascending: false });
      if (error) throw error;
      return res.status(200).json({ orders: data ?? [] });
    } catch (error) {
      console.error("admin/orders error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/users", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const { data, error } = await supabase.from("usuarios").select("*");
      if (error) throw error;
      return res.status(200).json({ users: data ?? [] });
    } catch (error) {
      console.error("admin/users error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/productFinanzas", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const { data, error } = await supabase.from("productoFinanzas").select("*");
      if (error) throw error;
      return res.status(200).json({ rows: data ?? [] });
    } catch (error) {
      console.error("admin/productFinanzas error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/products", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const { data, error } = await supabase.from("productos").select("*").order("nombre");
      if (error) throw error;
      return res.status(200).json({ products: data ?? [] });
    } catch (error) {
      console.error("admin/products error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/products/:productId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertStaffRole(supabase, decodedToken.uid);
      const productId = String(req.params.productId || "").trim();
      if (!productId) {
        return res.status(400).json({ error: "Producto invalido" });
      }
      const { data, error } = await supabase.from("productos").select("*").eq("id", productId).maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      return res.status(200).json({ product: data });
    } catch (error) {
      console.error("admin/products/:id error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/users/me", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("uid", decodedToken.uid)
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ profile: data ?? null });
    } catch (error) {
      console.error("users/me GET error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.put("/users/me", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      const profile = req.body?.profile;
      if (!profile || typeof profile !== "object" || profile.uid !== decodedToken.uid) {
        return res.status(400).json({ error: "Perfil invalido" });
      }

      const { data: existingProfile, error: existingError } = await supabase
        .from("usuarios")
        .select("uid,email,rol,creadoEn")
        .eq("uid", decodedToken.uid)
        .maybeSingle();
      if (existingError) throw existingError;

      const safeProfile = sanitizeOwnUserProfile(decodedToken, profile, existingProfile);
      const { error } = await supabase.from("usuarios").upsert(safeProfile, { onConflict: "uid" });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("users/me PUT error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.patch("/users/me", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      const patch = req.body || {};
      const allowed = {};
      if (typeof patch.telefono === "string" || patch.telefono === null) {
        allowed.telefono = patch.telefono;
      }
      if (Array.isArray(patch.direcciones)) {
        allowed.direcciones = patch.direcciones;
      }
      if (Object.keys(allowed).length === 0) {
        return res.status(400).json({ error: "Sin campos para actualizar" });
      }
      const { error } = await supabase.from("usuarios").update(allowed).eq("uid", decodedToken.uid);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("users/me PATCH error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.patch("/admin/users/:uid/role", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const uid = String(req.params.uid || "").trim();
      const { rol } = req.body || {};
      if (!uid || typeof rol !== "string" || !USER_ROLES.has(rol)) {
        return res.status(400).json({ error: "Datos invalidos" });
      }
      const { data: targetUser, error: targetError } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("uid", uid)
        .maybeSingle();
      if (targetError) throw targetError;
      if ((rol === "admin" || targetUser?.rol === "admin") && !isSuperadminEmail(decodedToken.email)) {
        return res.status(403).json({ error: "Solo el superadministrador puede gestionar administradores" });
      }
      const { error } = await supabase.from("usuarios").update({ rol }).eq("uid", uid);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("admin/users role error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.delete("/admin/users/:uid", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const uid = String(req.params.uid || "").trim();
      if (!uid) {
        return res.status(400).json({ error: "Usuario invalido" });
      }
      const { error } = await supabase.from("usuarios").delete().eq("uid", uid);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("admin/users DELETE error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

async function favoritesGetOne(supabase, userId, productId, res) {
  const { data, error } = await supabase
    .from("favoritos")
    .select("id")
    .eq("userId", userId)
    .eq("productId", productId)
    .maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo consultar favoritos"), { status: 500 });
  }
  return res.status(200).json({ isFavorite: Boolean(data) });
}

async function favoritesGetAll(supabase, userId, res) {
  const { data, error } = await supabase
    .from("favoritos")
    .select("productId")
    .eq("userId", userId)
    .order("creadoEn", { ascending: false });
  if (error) {
    throw Object.assign(new Error("No se pudieron consultar tus favoritos"), { status: 500 });
  }
  return res.status(200).json({ productIds: (data || []).map((item) => item.productId) });
}

async function favoritesHandleGet(supabase, userId, productId, res) {
  if (productId) return favoritesGetOne(supabase, userId, productId, res);
  return favoritesGetAll(supabase, userId, res);
}

async function favoritesHandlePost(supabase, userId, productId, res, body) {
  if (!isNonEmptyString(productId, 120)) {
    return res.status(400).json({ error: "Producto invalido" });
  }

  const action = typeof body?.action === "string" ? body.action.trim().toLowerCase() : "";
  if (action === "remove" || body?.remove === true) {
    return favoritesHandleDelete(supabase, userId, productId, res);
  }

  const { data: existing, error: readError } = await supabase
    .from("favoritos")
    .select("id")
    .eq("userId", userId)
    .eq("productId", productId)
    .maybeSingle();
  if (readError) {
    throw Object.assign(new Error("No se pudo consultar favoritos"), { status: 500 });
  }
  if (!existing) {
    const { error } = await supabase.from("favoritos").insert({
      userId,
      productId,
      creadoEn: new Date().toISOString(),
    });
    if (error) {
      throw Object.assign(new Error("No se pudo guardar favorito"), { status: 500 });
    }
  }
  return res.status(200).json({ success: true });
}

async function favoritesHandleDelete(supabase, userId, productId, res) {
  let query = supabase.from("favoritos").delete().eq("userId", userId);
  if (productId) {
    query = query.eq("productId", productId);
  }
  const { error } = await query;
  if (error) {
    throw Object.assign(new Error("No se pudo eliminar favorito"), { status: 500 });
  }
  return res.status(200).json({ success: true });
}

function favoritesRouter(req, res) {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      const userId = decodedToken.uid;
      const rawProductId = req.method === "GET" ? req.query.productId : req.body?.productId;
      const productId = typeof rawProductId === "string" ? rawProductId.trim() : "";

      if (req.method === "GET") {
        return favoritesHandleGet(supabase, userId, productId, res);
      }

      if (req.method === "POST") {
        return favoritesHandlePost(supabase, userId, productId, res, req.body);
      }

      if (req.method === "DELETE") {
        return favoritesHandleDelete(supabase, userId, productId, res);
      }

      return res.status(405).json({ error: "Metodo no permitido" });
    } catch (error) {
      console.error("Favorites error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
}

app.all("/favorites", favoritesRouter);
app.all("/favoritos", favoritesRouter);

const AI_PROXY_UPSTREAM_TIMEOUT_MS = 55_000;

/** @returns {{ ok: true, upstreamUrl: string, method: string } | { ok: false, status?: number, error: string }} */
function aiProxyCombined(base, req) {
  const horizon = parseInt(String(req.query.horizon ?? "30"), 10);
  const history = parseInt(String(req.query.history ?? "120"), 10);
  if (!Number.isFinite(horizon) || horizon < 7 || horizon > 90) return { ok: false, error: "horizon invalido" };
  if (!Number.isFinite(history) || history < 30 || history > 365) return { ok: false, error: "history invalido" };
  const upstreamUrl = `${base}/api/predict/combined?horizon=${encodeURIComponent(horizon)}&history=${encodeURIComponent(history)}`;
  return { ok: true, upstreamUrl, method: "GET" };
}

function aiProxyWeeklyChart(base, req) {
  const weeks = parseInt(String(req.query.weeks ?? "8"), 10);
  if (!Number.isFinite(weeks) || weeks < 2 || weeks > 24) return { ok: false, error: "weeks invalido" };
  const upstreamUrl = `${base}/api/sales/weekly-chart?weeks=${encodeURIComponent(weeks)}`;
  return { ok: true, upstreamUrl, method: "GET" };
}

function aiProxyModelMetrics(base) {
  return { ok: true, upstreamUrl: `${base}/api/model/metrics`, method: "GET" };
}

function aiProxyIreHistorial(base, req) {
  const days = parseInt(String(req.query.days ?? "30"), 10);
  if (!Number.isFinite(days) || days < 1 || days > 365) return { ok: false, error: "days invalido" };
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
  const recentDays = parseInt(String(req.query.recent_days ?? "7"), 10);
  const baselineDays = parseInt(String(req.query.baseline_days ?? "60"), 10);
  if (!Number.isFinite(recentDays) || recentDays < 3 || recentDays > 14) return { ok: false, error: "recent_days invalido" };
  if (!Number.isFinite(baselineDays) || baselineDays < 30 || baselineDays > 120) {
    return { ok: false, error: "baseline_days invalido" };
  }
  const upstreamUrl = `${base}/api/predict/campaign-detection?recent_days=${recentDays}&baseline_days=${baselineDays}`;
  return { ok: true, upstreamUrl, method: "GET" };
}

function aiProxyLearningStats(base) {
  return { ok: true, upstreamUrl: `${base}/api/campaign/learning-stats`, method: "GET" };
}

const AI_ADMIN_UPSTREAM_RESOLVERS = {
  combined: aiProxyCombined,
  weeklyChart: aiProxyWeeklyChart,
  modelMetrics: (base) => aiProxyModelMetrics(base),
  ireHistorial: aiProxyIreHistorial,
  cacheInvalidate: aiProxyCacheInvalidate,
  campaignActive: (base) => aiProxyCampaignActive(base),
  campaignFeedback: aiProxyCampaignFeedback,
  campaignDetection: aiProxyCampaignDetection,
  learningStats: (base) => aiProxyLearningStats(base),
};

function resolveAiAdminUpstreamRequest(base, op, req) {
  const resolver = AI_ADMIN_UPSTREAM_RESOLVERS[op];
  if (!resolver) return { ok: false, error: "op invalido" };
  return resolver(base, req);
}

async function sendUpstreamToClient(res, upstream, text) {
  const ct = upstream.headers.get("content-type") || "application/json; charset=utf-8";
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

async function runAiAdminProxyRequest(req, res) {
  const decodedToken = await verifyFirebaseUser(req);
  const supabase = getSupabaseAdmin();
  await assertAdminRole(supabase, decodedToken.uid);

  const base = process.env.AI_SERVICE_URL.replace(/\/$/, "");
  const serviceAuth = { Authorization: `Bearer ${process.env.AI_SERVICE_BEARER_TOKEN}` };
  const signal = AbortSignal.timeout(AI_PROXY_UPSTREAM_TIMEOUT_MS);
  const op = typeof req.query.op === "string" ? req.query.op : "";

  const resolved = resolveAiAdminUpstreamRequest(base, op, req);
  if (!resolved.ok) {
    return res.status(resolved.status ?? 400).json({ error: resolved.error });
  }
  const { upstreamUrl, method } = resolved;

  const upstreamBody = method === "POST" && op === "campaignFeedback" ? JSON.stringify(req.body) : undefined;
  const upstreamHeaders = {
    ...serviceAuth,
    ...(upstreamBody ? { "Content-Type": "application/json" } : {}),
  };

  const upstream = await fetch(upstreamUrl, { method, headers: upstreamHeaders, body: upstreamBody, signal });
  const text = await upstream.text();
  return sendUpstreamToClient(res, upstream, text);
}

app.all("/aiAdminProxy", (req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    try {
      return await runAiAdminProxyRequest(req, res);
    } catch (error) {
      console.error("aiAdminProxy error:", error);
      const status = aiAdminProxyErrorStatus(error);
      const message = aiAdminProxyErrorMessage(status, error);
      return res.status(status).json({ error: message });
    }
  });
});

/**
 * BFF de login: el navegador no llama a identitytoolkit; solo a este servidor.
 * Respuesta siempre 200 + JSON genérico (ok) para no exponer códigos de Google en el cliente.
 * Requiere FIREBASE_WEB_API_KEY (misma clave web del proyecto) y cuenta de servicio para custom token.
 */
app.all("/authLogin", (req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }

    const ip = getClientIp(req);
    if (isLoginRateLimited(ip)) {
      return res.status(200).json({ ok: false });
    }

    try {
      const rawEmail = req.body && req.body.email;
      const rawPassword = req.body && req.body.password;
      if (!isValidLoginEmail(rawEmail) || !isValidLoginPassword(rawPassword)) {
        return res.status(200).json({ ok: false });
      }
      const email = String(rawEmail).trim().toLowerCase();
      const password = String(rawPassword);
      const apiKey = process.env.FIREBASE_WEB_API_KEY;
      if (!apiKey) {
        console.error("authLogin: falta FIREBASE_WEB_API_KEY en entorno del BFF");
        return res.status(200).json({ ok: false });
      }

      const identityUrl =
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" +
        encodeURIComponent(apiKey);
      const identityRes = await fetch(identityUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      const identityJson = await identityRes.json();
      if (!identityRes.ok || !identityJson.localId) {
        return res.status(200).json({ ok: false });
      }

      const customToken = await admin.auth().createCustomToken(identityJson.localId);
      return res.status(200).json({ ok: true, customToken });
    } catch {
      console.error("authLogin: error interno");
      return res.status(200).json({ ok: false });
    }
  });
});

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => {
  console.log(`Calzatura BFF escuchando en http://0.0.0.0:${PORT}`);
});
