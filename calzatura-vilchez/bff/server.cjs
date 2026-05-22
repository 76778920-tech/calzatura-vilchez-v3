/* Copiado desde ../functions/index.js — al cambiar lógica de API, actualizar ambos o extraer módulo compartido. */
/* BFF Express: mismo contrato de rutas que Cloud Functions. Desplegar en Render/Fly/Railway (sin plan Blaze). */
require("dotenv").config();

const fs = require("fs");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const admin = require("firebase-admin");
const { discountOrderStockRpc, applyOrderStatusStockSideEffects } = require("../functions/fnUtils");
const { ORDER_STATUSES, assertOrderStatusTransition } = require("../functions/orderStatusPolicy");

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

function isProductionRuntime() {
  return process.env.NODE_ENV === "production"
    || process.env.VERCEL_ENV === "production"
    || process.env.RENDER === "true"
    || Boolean(process.env.RENDER_SERVICE_ID)
    || Boolean(process.env.FLY_APP_NAME);
}

function requireDniAppCheck() {
  if (isProductionRuntime()) return true;
  return process.env.REQUIRE_DNI_APPCHECK === "true";
}

function requireDniProofSecret() {
  if (isProductionRuntime()) return true;
  return process.env.REQUIRE_DNI_PROOF_SECRET === "true";
}

function hasEnvValue(name) {
  return Boolean(String(process.env[name] || "").trim());
}

function validateProductionRuntimeConfig(serviceAccount) {
  if (!isProductionRuntime()) return;

  const missing = [];
  const requiredEnv = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DNI_LOOKUP_PROOF_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "AI_SERVICE_URL",
    "AI_SERVICE_BEARER_TOKEN",
    "FIREBASE_WEB_API_KEY",
  ];

  for (const name of requiredEnv) {
    if (!hasEnvValue(name)) missing.push(name);
  }

  const hasFirebaseAdminCredential = Boolean(serviceAccount)
    || hasEnvValue("GOOGLE_APPLICATION_CREDENTIALS");

  if (!hasFirebaseAdminCredential) {
    missing.push("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 o FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_FILE");
  }

  if (missing.length > 0) {
    console.error("Configuracion BFF de produccion incompleta. Faltan secrets/variables:");
    for (const name of missing) {
      console.error(`- ${name}`);
    }
    process.exit(1);
  }
}

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
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, Idempotency-Key, X-Firebase-AppCheck, X-Calzatura-Client",
    );
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
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "Idempotency-Key",
    "X-Firebase-AppCheck",
    "X-Calzatura-Client",
  ],
});

const {
  readIdempotencyKey,
  findOrderByIdempotency,
  idempotencyOrderJson,
} = require("../functions/fnUtils");
const { handleLookupDni, verifyDniLookupProof } = require("./lookupDni.cjs");
const { redactOrderForStaff, maskEmail } = require("./privacy.cjs");
const { buildCloudinaryUploadSignature } = require("./cloudinarySign.cjs");

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
validateProductionRuntimeConfig(serviceAccount);
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

async function verifyFirebaseAppCheckToken(token) {
  try {
    await admin.appCheck().verifyToken(token);
    return true;
  } catch (error) {
    console.warn("App Check invalido:", error?.message || error);
    return false;
  }
}

async function assertAdminRole(supabase, uid) {
  const { data, error } = await supabase.from("usuarios").select("rol").eq("uid", uid).maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo verificar el rol"), { status: 500 });
  }
  if (data?.rol === "admin") {
    return;
  }
  throw Object.assign(new Error("Sin permisos de administrador"), { status: 403 });
}

async function assertStaffRole(supabase, uid) {
  const { data, error } = await supabase.from("usuarios").select("rol").eq("uid", uid).maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo verificar el rol"), { status: 500 });
  }
  if (data?.rol === "admin" || data?.rol === "trabajador") {
    return data.rol;
  }
  throw Object.assign(new Error("Sin permisos para gestionar pedidos"), { status: 403 });
}

async function assertTrabajadorRole(supabase, uid) {
  const { data, error } = await supabase.from("usuarios").select("rol").eq("uid", uid).maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo verificar el rol"), { status: 500 });
  }
  if (data?.rol === "trabajador") {
    return;
  }
  throw Object.assign(new Error("Sin permisos de trabajador"), { status: 403 });
}

const ADMIN_DATA_EXPORT_COLLECTIONS = new Set([
  "productos",
  "productoFinanzas",
  "fabricantes",
  "ventasDiarias",
  "pedidos",
  "usuarios",
]);
const ADMIN_DATA_IMPORT_COLLECTIONS = new Set([
  "productos",
  "productoFinanzas",
  "fabricantes",
  "ventasDiarias",
]);
const ADMIN_DATA_MAX_IMPORT_ROWS = 5000;

/** Columnas permitidas en export admin (sin PII cruda; redacción adicional en redactAdminExportRow). */
const ADMIN_DATA_EXPORT_COLUMNS = {
  productos:
    "id,nombre,precio,stock,categoria,tipoCalzado,descripcion,marca,color,familiaId,tallas,tallaStock,destacado,esDePrueba,importadoEn,loteImportacion,escenario",
  productoFinanzas:
    "productId,costoCompra,margenMinimo,margenObjetivo,margenMaximo,precioMinimo,precioSugerido,precioMaximo,actualizadoEn,esDePrueba,importadoEn,loteImportacion,escenario",
  fabricantes:
    "id,dni,nombres,apellidos,marca,telefono,activo,observaciones,creadoEn,actualizadoEn,esDePrueba,importadoEn,loteImportacion,escenario",
  ventasDiarias:
    "id,productId,codigo,nombre,color,talla,fecha,cantidad,precioVenta,total,costoUnitario,costoTotal,ganancia,documentoTipo,documentoNumero,devuelto,creadoEn,esDePrueba,importadoEn,loteImportacion,escenario",
  pedidos:
    "id,userId,userEmail,total,subtotal,envio,estado,metodoPago,notas,creadoEn",
  usuarios: "uid,nombres,apellidos,nombre,email,rol,creadoEn,telefono",
};

function adminDataExportSelect(collection) {
  return ADMIN_DATA_EXPORT_COLUMNS[collection] || "";
}

function assertAdminDataCollection(collection, { importable = false } = {}) {
  const allowed = importable ? ADMIN_DATA_IMPORT_COLLECTIONS : ADMIN_DATA_EXPORT_COLLECTIONS;
  if (!allowed.has(collection)) {
    throw Object.assign(new Error("Coleccion no permitida"), { status: 400 });
  }
}

function assertImportRowsEsDePrueba(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i]?.esDePrueba !== true) {
      throw Object.assign(
        new Error(`Fila ${i + 1}: solo se permiten datos de prueba (esDePrueba=true)`),
        { status: 400 },
      );
    }
  }
}

async function loadProductIdSet(supabase) {
  const { data, error } = await supabase.from("productos").select("id");
  if (error) {
    throw error;
  }
  return new Set((data ?? []).map((item) => String(item.id || "").trim()).filter(Boolean));
}

async function assertOrderResponseForRole(supabase, decodedToken, order) {
  const { data, error } = await supabase.from("usuarios").select("rol").eq("uid", decodedToken.uid).maybeSingle();
  if (error) {
    throw error;
  }
  if (data?.rol === "trabajador") {
    return redactOrderForStaff(order);
  }
  return order;
}

const USER_ROLES = new Set(["cliente", "trabajador", "admin"]);

function profileString(value) {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeDniValue(value) {
  const dni = String(value || "").replace(/\D/g, "").slice(0, 8);
  return /^\d{8}$/.test(dni) ? dni : "";
}

function maskDniValue(value) {
  const dni = normalizeDniValue(value);
  return dni ? `****${dni.slice(-4)}` : "";
}

function profileRowForClientRead(row) {
  if (!row || typeof row !== "object") return null;
  const profile = { ...row };
  if (profile.dni != null) {
    profile.dni = maskDniValue(profile.dni);
  }
  delete profile.dni_hash;
  return profile;
}

function redactAdminExportRow(collection, row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  if (collection === "pedidos" && out.userEmail != null) {
    out.userEmail = maskEmail(out.userEmail);
  }
  if (collection === "fabricantes" && out.dni != null) {
    out.dni = maskDniValue(out.dni);
  }
  if (collection === "usuarios") {
    delete out.dni;
    delete out.dni_hash;
    delete out.direcciones;
  }
  return out;
}

function redactAdminExportRows(collection, rows) {
  return (rows ?? []).map((row) => redactAdminExportRow(collection, row));
}

function hashDniValue(value) {
  const dni = normalizeDniValue(value);
  if (!dni) return "";
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(dni, "utf8").digest("hex");
}

function sanitizeProfileAddress(address) {
  if (!address || typeof address !== "object") return null;
  const normalized = {};
  for (const key of ["nombre", "apellido", "direccion", "ciudad", "distrito", "referencia"]) {
    if (typeof address[key] === "string") {
      normalized[key] = normalizeTextField(address[key], key, key === "referencia" ? 180 : 120);
    }
  }
  if (typeof address.telefono === "string") {
    normalized.telefono = normalizeTextField(address.telefono, "Telefono", 15);
  }
  return normalized;
}

function sanitizeProfileAddresses(value) {
  if (!Array.isArray(value)) return undefined;
  return value
    .slice(0, 5)
    .map(sanitizeProfileAddress)
    .filter(Boolean);
}

function sanitizeOwnUserProfile(decodedToken, incomingProfile, existingProfile) {
  const emailFromToken = profileString(decodedToken.email);
  const now = new Date().toISOString();
  const lookup = verifyDniLookupProof(incomingProfile.lookupToken);
  const incomingDni = normalizeDniValue(incomingProfile.dni);
  if (incomingDni && (!lookup || lookup.dni !== incomingDni)) {
    throw Object.assign(new Error("Validacion de DNI requerida"), { status: 400 });
  }
  const incomingIdentity = {
    nombres: profileString(incomingProfile.nombres),
    apellidos: profileString(incomingProfile.apellidos),
    nombre: profileString(incomingProfile.nombre),
  };
  const hasIncomingLegalIdentity = Boolean(
    incomingDni || incomingIdentity.nombres !== undefined || incomingIdentity.apellidos !== undefined,
  );
  if (!lookup && !existingProfile && hasIncomingLegalIdentity) {
    throw Object.assign(new Error("Validacion de DNI requerida para registrar identidad"), { status: 400 });
  }
  const identityChangedWithoutLookup = !lookup && existingProfile && Object.entries(incomingIdentity).some(
    ([key, value]) => value !== undefined && value !== profileString(existingProfile[key]),
  );
  if (identityChangedWithoutLookup) {
    throw Object.assign(new Error("Validacion de DNI requerida para cambiar nombres"), { status: 400 });
  }
  const profile = {
    uid: decodedToken.uid,
    email: emailFromToken || profileString(existingProfile?.email) || profileString(incomingProfile.email) || "",
    rol: existingProfile?.rol || (isSuperadminEmail(emailFromToken) ? "admin" : "cliente"),
    creadoEn: existingProfile?.creadoEn || profileString(incomingProfile.creadoEn) || now,
  };

  const telefono = profileString(incomingProfile.telefono);
  if (telefono !== undefined) {
    profile.telefono = telefono;
  }

  if (lookup) {
    profile.dni = maskDniValue(lookup.dni);
    profile.dni_hash = hashDniValue(lookup.dni);
    profile.nombres = lookup.nombres;
    profile.apellidos = lookup.apellidos;
    profile.nombre = `${lookup.nombres} ${lookup.apellidos}`.trim();
  } else {
    const existingDni = profileString(existingProfile?.dni);
    if (existingDni !== undefined) {
      profile.dni = normalizeDniValue(existingDni) ? maskDniValue(existingDni) : existingDni;
    }
    const existingDniHash = profileString(existingProfile?.dni_hash);
    if (existingDniHash !== undefined) {
      profile.dni_hash = existingDniHash;
    } else if (existingDni && normalizeDniValue(existingDni)) {
      profile.dni_hash = hashDniValue(existingDni);
    }
    for (const key of ["nombres", "apellidos", "nombre"]) {
      const value = profileString(existingProfile?.[key]);
      if (value !== undefined) profile[key] = value;
    }
    if (!profile.nombre) {
      profile.nombre = profile.email?.split("@")[0] || "Usuario";
    }
  }

  const direcciones = sanitizeProfileAddresses(incomingProfile.direcciones);
  if (direcciones) {
    profile.direcciones = direcciones;
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

const AUDIT_REDACTED = "[redacted]";

function isSensitiveAuditKey(key) {
  const k = String(key || "").toLowerCase();
  if (["authorization", "cookie", "jwt", "dni", "documento", "documentonumero", "email", "correo"].includes(k)) return true;
  if (k.includes("password") || k.includes("passwd") || k.includes("contrase")) return true;
  if (k.includes("token") || k.includes("secret") || k.includes("bearer")) return true;
  if (k.includes("telefono") || k.includes("celular") || k.includes("direccion") || k.includes("referencia")) return true;
  if (/(^|_)api[_-]?key($|_)/.test(k) || k.endsWith("apikey")) return true;
  return false;
}

function sanitizeAuditValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (typeof value === "object") {
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = isSensitiveAuditKey(key) ? AUDIT_REDACTED : sanitizeAuditValue(inner);
    }
    return out;
  }
  return value;
}

function sanitizeAuditEmail(value) {
  const email = String(value || "").trim();
  if (!email.includes("@")) return email || null;
  const [local, domain] = email.split("@", 2);
  return `${local.slice(0, 2)}***@${domain}`;
}

function sanitizeAuditLabel(value) {
  const label = String(value || "").trim();
  if (/^\d{8}$/.test(label)) return AUDIT_REDACTED;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(label)) return sanitizeAuditEmail(label);
  return label;
}

function safeAuditEntityRef(entidad, entidadId) {
  const id = String(entidadId || "").trim();
  const suffix = id.length > 8 ? id.slice(-8) : id || "sin-id";
  return `${entidad}:${suffix}`;
}

function sanitizeAuditEntityLabel(entidad, entidadId, entidadNombre) {
  const entity = String(entidad || "").trim();
  if (["usuario", "fabricante"].includes(entity)) {
    return safeAuditEntityRef(entity, entidadId);
  }
  return sanitizeAuditLabel(entidadNombre);
}

function sanitizeAuditEntryForResponse(entry) {
  if (!entry || typeof entry !== "object") return entry;
  return {
    ...entry,
    entidadNombre: sanitizeAuditEntityLabel(entry.entidad, entry.entidadId, entry.entidadNombre),
    detalle: entry.detalle == null ? null : sanitizeAuditValue(entry.detalle),
  };
}

async function resolveClientAuditEntityLabel(supabase, entidad, entidadId, entidadNombre) {
  const entity = String(entidad || "").trim();
  const id = String(entidadId || "").trim();

  if (["usuario", "pedido", "venta", "fabricante", "importar"].includes(entity)) {
    return safeAuditEntityRef(entity, id);
  }

  if (entity === "producto") {
    try {
      const { data, error } = await supabase
        .from("productos")
        .select("nombre")
        .eq("id", id)
        .maybeSingle();
      if (!error && typeof data?.nombre === "string" && data.nombre.trim()) {
        return sanitizeAuditLabel(data.nombre);
      }
    } catch {
      // Fallback seguro abajo: nunca usar el label enviado por cliente para productos.
    }
    return safeAuditEntityRef(entity, id);
  }

  return sanitizeAuditEntityLabel(entity, id, entidadNombre);
}

const CLIENT_AUDIT_ACTIONS = new Set(["crear", "editar", "eliminar", "cambiar_estado", "importar"]);
const CLIENT_AUDIT_ENTITIES = new Set(["producto", "pedido", "fabricante", "usuario", "venta", "importar"]);
const ADMIN_CLIENT_AUDIT_POLICY = {
  producto: new Set(["crear", "editar", "eliminar", "importar"]),
  fabricante: new Set(["crear", "editar", "eliminar", "importar"]),
  usuario: new Set(["crear", "editar", "eliminar", "cambiar_estado"]),
  venta: new Set(["crear", "editar", "eliminar", "cambiar_estado", "importar"]),
  pedido: new Set(["cambiar_estado"]),
  importar: new Set(["importar"]),
};
const STAFF_CLIENT_AUDIT_POLICY = {
  venta: new Set(["crear", "editar", "eliminar", "cambiar_estado"]),
  pedido: new Set(["cambiar_estado"]),
};
const SELF_USER_AUDIT_ACTIONS = new Set(["crear", "eliminar"]);
const SELF_USER_AUDIT_DETAIL_KEYS = new Set(["rol", "validadoPorDNI", "correoVerificado", "selfService"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function auditPolicyAllows(policy, accion, entidad) {
  return Boolean(policy[entidad]?.has(accion));
}

function hasOnlyAllowedAuditDetailKeys(detalle, allowedKeys) {
  if (detalle == null) return true;
  if (!isPlainObject(detalle)) return false;
  return Object.keys(detalle).every((key) => allowedKeys.has(key));
}

async function fetchAuditActorRole(supabase, decodedToken) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("uid", decodedToken.uid)
    .maybeSingle();
  if (error) {
    throw Object.assign(new Error("No se pudo verificar el rol"), { status: 500 });
  }
  if (data?.rol) return data.rol;
  return isSuperadminEmail(decodedToken.email) ? "admin" : "";
}

function assertClientAuditAllowed({ accion, entidad, entidadId, detalle, role, uid }) {
  if (!CLIENT_AUDIT_ACTIONS.has(accion) || !CLIENT_AUDIT_ENTITIES.has(entidad)) {
    throw Object.assign(new Error("Evento de auditoria no permitido"), { status: 403 });
  }

  if (role === "admin" && auditPolicyAllows(ADMIN_CLIENT_AUDIT_POLICY, accion, entidad)) {
    return;
  }
  if (role === "trabajador" && auditPolicyAllows(STAFF_CLIENT_AUDIT_POLICY, accion, entidad)) {
    return;
  }
  if (
    role === "cliente" &&
    entidad === "usuario" &&
    entidadId === uid &&
    SELF_USER_AUDIT_ACTIONS.has(accion) &&
    hasOnlyAllowedAuditDetailKeys(detalle, SELF_USER_AUDIT_DETAIL_KEYS)
  ) {
    return;
  }

  throw Object.assign(new Error("Evento de auditoria no permitido"), { status: 403 });
}

// Inserta en la tabla auditoria desde el contexto de Cloud Functions.
// No lanza: un fallo de auditoría nunca interrumpe la operación principal.
async function logAuditFn(supabase, accion, entidad, entidadId, entidadNombre, usuarioUid, usuarioEmail, detalle, options = {}) {
  try {
    const safeEntidadNombre = options.entityLabelResolved === true
      ? sanitizeAuditLabel(entidadNombre)
      : sanitizeAuditEntityLabel(entidad, entidadId, entidadNombre);
    await supabase.from("auditoria").insert({
      accion,
      entidad,
      entidadId,
      entidadNombre: safeEntidadNombre,
      detalle: detalle == null ? null : sanitizeAuditValue(detalle),
      usuarioUid: usuarioUid ?? null,
      usuarioEmail: sanitizeAuditEmail(usuarioEmail),
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

function supabaseFriendlyError(error) {
  const msg = String(error?.message || error?.details || "");
  const code = String(error?.code || "");
  if (code === "23505" || msg.includes("duplicate key")) {
    return "Ya existe un registro para este trabajador y periodo";
  }
  if (code === "23503" || msg.includes("foreign key")) {
    return "Referencia invalida: verifica que el trabajador exista en usuarios";
  }
  if (code === "PGRST116" || msg.includes("multiple")) {
    return "Datos duplicados en base de datos; contacta soporte";
  }
  return "";
}

function publicError(error) {
  if (!error) return "No se pudo procesar la solicitud";
  const friendly = supabaseFriendlyError(error);
  if (friendly) return friendly;
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

function isOrsRateLimited(ip) {
  const now = Date.now();
  let row = orsRateByIp.get(ip);
  if (!row || now > row.resetAt) {
    row = { count: 0, resetAt: now + ORS_RATE_WINDOW_MS };
  }
  if (row.count >= ORS_RATE_MAX) {
    orsRateByIp.set(ip, row);
    return true;
  }
  row.count += 1;
  orsRateByIp.set(ip, row);
  if (orsRateByIp.size > 5000) {
    for (const [k, v] of orsRateByIp) {
      if (now > v.resetAt) orsRateByIp.delete(k);
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

  const lat = address.lat != null ? Number(address.lat) : NaN;
  const lng = address.lng != null ? Number(address.lng) : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    normalized.lat = lat;
    normalized.lng = lng;
  }

  return normalized;
}

function assertProductCanBeOrdered(product) {
  if (!product || product.activo !== true) {
    throw Object.assign(new Error("Producto no disponible"), { status: 400 });
  }
  if (product.esDePrueba === true) {
    throw Object.assign(new Error("Producto no disponible"), { status: 400 });
  }
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

async function fetchProductsByIds(supabase, ids) {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .in("id", ids)
    .eq("activo", true);
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
    assertProductCanBeOrdered(product);
    product = await findProductVariantByColor(supabase, product, item.color);
    assertProductCanBeOrdered(product);
    product = await findOrderableProductVariant(supabase, product, item);
    assertProductCanBeOrdered(product);
    if (clientProductIsOrderable(product, item)) {
      return product;
    }
  }

  if (!product) {
    throw Object.assign(new Error("Producto no encontrado"), { status: 400 });
  }
  throw Object.assign(new Error("Producto sin stock, color o talla disponible"), { status: 409 });
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
    assertProductCanBeOrdered(product);
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
    const quantity = Number(item?.quantity || 0);
    const talla = normalizeOrderTalla(item?.talla);
    const color = normalizeOrderColor(item?.color);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > ORDER_QTY_LIMIT) {
      throw Object.assign(new Error("Producto invalido en el pedido"), { status: 400 });
    }

    return {
      productId,
      productName,
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
  cors(req, res, () => handleLookupDni(req, res, {
    requireAppCheck: requireDniAppCheck(),
    requireProofSecret: requireDniProofSecret(),
    verifyAppCheckToken: verifyFirebaseAppCheckToken,
  }));
});

const ORS_API_BASE = "https://api.openrouteservice.org";
const deliveryProviders = require("./delivery.cjs");
const deliveryPricing = require("./deliveryPricing.cjs");

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
  const ip = getClientIp(req);
  if (isOrsRateLimited(ip)) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Intenta nuevamente." });
  }

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
        let envio = 0;
        const destLat = normalizedAddress.lat;
        const destLng = normalizedAddress.lng;
        if (Number.isFinite(destLat) && Number.isFinite(destLng)) {
          const quote = await deliveryPricing.computeDeliveryFeeFromCoords(destLat, destLng);
          if (quote.isOutOfRange) {
            throw Object.assign(new Error("Direccion fuera del area de reparto"), { status: 400 });
          }
          envio = quote.cost;
        }
        envio = Math.min(Math.round(envio * 100) / 100, DELIVERY_MAX_ENVIO_S);
        if (typeof rawEnvio === "number" && Number.isFinite(rawEnvio) && rawEnvio >= 0) {
          const clientEnvio = Math.min(Math.round(rawEnvio * 100) / 100, DELIVERY_MAX_ENVIO_S);
          if (clientEnvio > 0 && (!Number.isFinite(destLat) || !Number.isFinite(destLng))) {
            throw Object.assign(new Error("Coordenadas de entrega requeridas para calcular envio"), { status: 400 });
          }
          if (Math.abs(clientEnvio - envio) > 0.05) {
            throw Object.assign(new Error("El costo de envio no coincide con la direccion"), { status: 409 });
          }
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
      const currentEstado = assertOrderStatusTransition(order, estado);
      if (currentEstado === estado) {
        return res.status(200).json({ ok: true, unchanged: true });
      }
      if (order.metodoPago === "stripe" && estado === "pagado") {
        return res.status(409).json({
          error: "Los pedidos Stripe solo se marcan como pagados desde el webhook de pago.",
        });
      }
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
            {
              from: currentEstado,
              to: estado,
              source: stockFx.audit.source,
              metodoPago: order.metodoPago,
            },
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
        { from: currentEstado, to: estado, source: "updateOrderStatus" },
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

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

const DAILY_SALE_CLIENT_OMIT_FIELDS = new Set(["ganancia", "costoUnitario", "costoTotal"]);

function redactDailySaleForStaff(sale) {
  const redacted = { ...sale };
  for (const field of DAILY_SALE_CLIENT_OMIT_FIELDS) {
    delete redacted[field];
  }
  return redacted;
}

async function returnDailySaleOrThrow(supabase, saleId, motivo, options = {}) {
  const ownerUid = options.ownerUid;
  if (ownerUid) {
    const { data: sale, error: readErr } = await supabase
      .from("ventasDiarias")
      .select("encargadoUid")
      .eq("id", saleId)
      .maybeSingle();
    if (readErr) {
      throw readErr;
    }
    if (!sale) {
      throw Object.assign(new Error("Venta no encontrada"), { status: 404 });
    }
    if (sale.encargadoUid && sale.encargadoUid !== ownerUid) {
      throw Object.assign(new Error("No puedes devolver una venta de otro encargado"), { status: 403 });
    }
  }

  const { data, error } = await supabase.rpc("return_daily_sale_atomic", {
    p_sale_id: saleId,
    p_motivo: motivo,
  });
  if (error) {
    throw error;
  }
  return data;
}

function toStaffProductPriceRange(row) {
  return {
    productId: row.productId,
    margenMinimo: Number(row.margenMinimo) || 0,
    margenObjetivo: Number(row.margenObjetivo) || 0,
    margenMaximo: Number(row.margenMaximo) || 0,
    precioMinimo: Number(row.precioMinimo) || 0,
    precioSugerido: Number(row.precioSugerido) || 0,
    precioMaximo: Number(row.precioMaximo) || 0,
    actualizadoEn: row.actualizadoEn || "",
  };
}

async function loadProductFinancialsMap(supabase, productIds) {
  if (productIds.length === 0) {
    return new Map();
  }
  const { data: finanzas, error } = await supabase
    .from("productoFinanzas")
    .select("productId,costoCompra,precioMinimo,precioMaximo")
    .in("productId", productIds);
  if (error) {
    throw error;
  }
  return new Map((finanzas ?? []).map((row) => [row.productId, row]));
}

function stripClientFinancialFields(sale) {
  const payload = { ...sale };
  for (const field of DAILY_SALE_CLIENT_OMIT_FIELDS) {
    delete payload[field];
  }
  return payload;
}

/**
 * Validación server-side (ISO 27001): precio en rango, producto activo (staff), encargado y cantidades.
 */
async function validateDailySalesRegister(supabase, sales, options = {}) {
  const { requireActiveProduct = false, ownerUid } = options;
  if (!Array.isArray(sales) || sales.length === 0) {
    throw Object.assign(new Error("No hay ventas para registrar"), { status: 400 });
  }

  const productIds = [...new Set(sales.map((sale) => String(sale?.productId || "").trim()).filter(Boolean))];
  const financialsByProduct = await loadProductFinancialsMap(supabase, productIds);

  for (const sale of sales) {
    const productId = String(sale?.productId || "").trim();
    const encargadoUid = String(sale?.encargadoUid || "").trim();
    const cantidad = Number(sale?.cantidad);
    const precioVenta = Number(sale?.precioVenta);

    if (!productId) {
      throw Object.assign(new Error("Producto invalido en la venta"), { status: 400 });
    }
    if (ownerUid && encargadoUid !== ownerUid) {
      throw Object.assign(new Error("No puedes registrar ventas de otro encargado"), { status: 403 });
    }
    if (!encargadoUid) {
      throw Object.assign(new Error("Encargado de venta requerido"), { status: 400 });
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw Object.assign(new Error("Cantidad invalida en la venta"), { status: 400 });
    }
    if (!Number.isFinite(precioVenta) || precioVenta <= 0) {
      throw Object.assign(new Error("Precio de venta invalido"), { status: 400 });
    }

    const { data: product, error: productError } = await supabase
      .from("productos")
      .select("id,activo,nombre")
      .eq("id", productId)
      .maybeSingle();
    if (productError) {
      throw productError;
    }
    if (!product) {
      throw Object.assign(new Error("Producto no encontrado"), { status: 404 });
    }
    if (requireActiveProduct && product.activo !== true) {
      throw Object.assign(new Error("Producto no disponible para venta en tienda"), { status: 400 });
    }

    const fin = financialsByProduct.get(productId);
    if (!fin) {
      throw Object.assign(
        new Error(`El producto "${product.nombre || productId}" no tiene rango de precio registrado`),
        { status: 400 },
      );
    }

    const precioMinimo = Number(fin.precioMinimo);
    const precioMaximo = Number(fin.precioMaximo);
    if (precioVenta < precioMinimo || precioVenta > precioMaximo) {
      throw Object.assign(
        new Error(
          `Precio fuera de rango para "${product.nombre || productId}" (min ${precioMinimo}, max ${precioMaximo})`,
        ),
        { status: 400 },
      );
    }
  }

  return sales;
}

async function enrichDailySalesWithCosts(supabase, sales) {
  const productIds = [...new Set(sales.map((sale) => sale.productId).filter(Boolean))];
  const financialsByProduct = await loadProductFinancialsMap(supabase, productIds);

  return sales.map((sale) => {
    const cantidad = Math.max(0, Number(sale.cantidad) || 0);
    const precioVenta = Number(sale.precioVenta) || 0;
    const total = Number(sale.total) || money(precioVenta * cantidad);
    const fin = financialsByProduct.get(sale.productId);
    const costoUnitario = Math.max(0, Number(fin?.costoCompra) || 0);
    const costoTotal = money(costoUnitario * cantidad);
    return {
      ...sale,
      total,
      costoUnitario,
      costoTotal,
      ganancia: money(total - costoTotal),
    };
  });
}

async function registerDailySalesBatch(supabase, sales, auditContext) {
  const { data, error } = await supabase.rpc("register_daily_sales_atomic", { p_sales: sales });
  if (error) {
    throw error;
  }
  const ids = (data && typeof data === "object" && Array.isArray(data.ids)) ? data.ids : [];
  for (const saleId of ids) {
    await logAuditFn(
      supabase,
      "registrar_venta",
      "venta_diaria",
      saleId,
      saleId ? `#${String(saleId).slice(-8).toUpperCase()}` : "venta",
      auditContext.uid,
      auditContext.email || "",
      { source: auditContext.source, cantidad: sales.length },
    );
  }
  return ids;
}

async function fetchProductCodesMap(supabase, options = {}) {
  const activeOnly = options.activeOnly === true;
  let productIds = null;
  if (activeOnly) {
    const { data: products, error: productsError } = await supabase
      .from("productos")
      .select("id")
      .eq("activo", true);
    if (productsError) {
      throw productsError;
    }
    productIds = (products ?? []).map((row) => row.id).filter(Boolean);
    if (productIds.length === 0) {
      return {};
    }
  }

  let query = supabase.from("productoCodigos").select("productoId,codigo");
  if (productIds) {
    query = query.in("productoId", productIds);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return (data ?? []).reduce((acc, row) => {
    if (row.codigo && row.productoId) {
      acc[row.productoId] = row.codigo;
    }
    return acc;
  }, {});
}

async function assertOrderReadAccess(supabase, decodedToken, order) {
  if (order?.userId === decodedToken.uid) {
    return;
  }
  const { data, error } = await supabase.from("usuarios").select("rol").eq("uid", decodedToken.uid).maybeSingle();
  if (error) {
    throw error;
  }
  if (data?.rol === "admin" || data?.rol === "trabajador") {
    return;
  }
  throw Object.assign(new Error("No autorizado para ver este pedido"), { status: 403 });
}

function parseDailySalesQuery(req) {
  const fecha = typeof req.query.fecha === "string" ? req.query.fecha.trim() : "";
  const sinceDays = Math.min(
    365,
    Math.max(1, Number.parseInt(String(req.query.sinceDays ?? "90"), 10) || 90),
  );
  return { fecha, sinceDays };
}

async function queryDailySales(supabase, { fecha, sinceDays, encargadoUid }) {
  let query = supabase.from("ventasDiarias").select("*");
  if (encargadoUid) {
    query = query.eq("encargadoUid", encargadoUid);
  }
  if (fecha) {
    query = query.eq("fecha", fecha);
  } else {
    query = query
      .gte("fecha", sinceDateISO(sinceDays))
      .order("fecha", { ascending: false })
      .limit(500);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).sort((a, b) => String(b.creadoEn || "").localeCompare(String(a.creadoEn || "")));
}

app.get("/admin/dailySales", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);

      const sales = await queryDailySales(supabase, parseDailySalesQuery(req));
      return res.status(200).json({ sales });
    } catch (error) {
      console.error("admin/dailySales error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/staff/dailySales", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertTrabajadorRole(supabase, decodedToken.uid);

      const sales = await queryDailySales(supabase, {
        ...parseDailySalesQuery(req),
        encargadoUid: decodedToken.uid,
      });
      return res.status(200).json({ sales: sales.map(redactDailySaleForStaff) });
    } catch (error) {
      console.error("staff/dailySales error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/staff/dailySales/register", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertTrabajadorRole(supabase, decodedToken.uid);

      const incoming = Array.isArray(req.body?.sales) ? req.body.sales : [];
      if (incoming.length === 0) {
        return res.status(400).json({ error: "No hay ventas para registrar" });
      }

      const sanitized = incoming.map((sale) => stripClientFinancialFields(sale));
      const validated = await validateDailySalesRegister(supabase, sanitized, {
        requireActiveProduct: true,
        ownerUid: decodedToken.uid,
      });
      const enriched = await enrichDailySalesWithCosts(supabase, validated);
      const ids = await registerDailySalesBatch(supabase, enriched, {
        uid: decodedToken.uid,
        email: decodedToken.email,
        source: "staff/dailySales/register",
      });
      return res.status(200).json({ ids });
    } catch (error) {
      console.error("staff/dailySales/register error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/admin/dailySales/register", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);

      const incoming = Array.isArray(req.body?.sales) ? req.body.sales : [];
      if (incoming.length === 0) {
        return res.status(400).json({ error: "No hay ventas para registrar" });
      }

      const sanitized = incoming.map((sale) => stripClientFinancialFields(sale));
      const validated = await validateDailySalesRegister(supabase, sanitized);
      const enriched = await enrichDailySalesWithCosts(supabase, validated);
      const ids = await registerDailySalesBatch(supabase, enriched, {
        uid: decodedToken.uid,
        email: decodedToken.email,
        source: "admin/dailySales/register",
      });
      return res.status(200).json({ ids });
    } catch (error) {
      console.error("admin/dailySales/register error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/staff/dailySales/return", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertTrabajadorRole(supabase, decodedToken.uid);

      const saleId = String(req.body?.saleId || "").trim();
      const motivo = String(req.body?.motivo || "").trim();
      if (!saleId || !motivo) {
        return res.status(400).json({ error: "Venta o motivo invalido" });
      }

      const data = await returnDailySaleOrThrow(supabase, saleId, motivo, {
        ownerUid: decodedToken.uid,
      });
      await logAuditFn(
        supabase,
        "devolver_venta",
        "venta_diaria",
        saleId,
        `#${String(saleId).slice(-8).toUpperCase()}`,
        decodedToken.uid,
        decodedToken.email || "",
        { source: "staff/dailySales/return", motivo },
      );
      return res.status(200).json({ sale: data });
    } catch (error) {
      console.error("staff/dailySales/return error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/admin/dailySales/return", (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Metodo no permitido" });
    }
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);

      const saleId = String(req.body?.saleId || "").trim();
      const motivo = String(req.body?.motivo || "").trim();
      if (!saleId || !motivo) {
        return res.status(400).json({ error: "Venta o motivo invalido" });
      }

      const data = await returnDailySaleOrThrow(supabase, saleId, motivo);
      await logAuditFn(
        supabase,
        "devolver_venta",
        "venta_diaria",
        saleId,
        `#${String(saleId).slice(-8).toUpperCase()}`,
        decodedToken.uid,
        decodedToken.email || "",
        { source: "admin/dailySales/return", motivo },
      );
      return res.status(200).json({ sale: data });
    } catch (error) {
      console.error("admin/dailySales/return error:", error);
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
      await assertAdminRole(supabase, decodedToken.uid);
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
      await assertAdminRole(supabase, decodedToken.uid);
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
      await assertAdminRole(supabase, decodedToken.uid);
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
      await assertAdminRole(supabase, decodedToken.uid);
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

app.post("/admin/products/decrementStock", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const { productId, lines } = req.body || {};
      if (!productId || !Array.isArray(lines)) {
        return res.status(400).json({ error: "Datos de stock incompletos" });
      }
      const { error } = await supabase.rpc("decrement_product_stock", {
        p_product_id: productId,
        p_lines: lines,
      });
      if (error) handleAdminRpcError(error);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("admin/products/decrementStock error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/admin/products/restoreStock", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const { productId, talla, cantidad } = req.body || {};
      if (!productId || !Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
        return res.status(400).json({ error: "Datos de stock incompletos" });
      }
      const { error } = await supabase.rpc("restore_product_stock", {
        p_product_id: productId,
        p_talla: talla ?? null,
        p_cantidad: Number(cantidad),
      });
      if (error) handleAdminRpcError(error);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("admin/products/restoreStock error:", error);
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
        await assertOrderStockAvailability(supabase, order.items);

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
            const fromEstado = assertOrderStatusTransition(order, "pagado");
            let stockDescontadoEn = order.stockDescontadoEn || null;
            if (!stockDescontadoEn) {
              try {
                await discountOrderStockRpc(supabase, order);
                stockDescontadoEn = new Date().toISOString();
              } catch (discountError) {
                console.error("Stripe webhook stock discount error:", discountError?.message || discountError);
                return res.status(500).json({
                  error: "No se pudo descontar stock. Stripe reintentara el webhook.",
                });
              }
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
                from: fromEstado,
                to: "pagado",
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
      await assertOrderReadAccess(supabase, decodedToken, order);
      const safeOrder = await assertOrderResponseForRole(supabase, decodedToken, order);
      return res.status(200).json({ order: safeOrder });
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
      await assertAdminRole(supabase, decodedToken.uid);
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

app.get("/staff/orders", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertTrabajadorRole(supabase, decodedToken.uid);
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .order("creadoEn", { ascending: false });
      if (error) throw error;
      const orders = (data ?? []).map(redactOrderForStaff);
      return res.status(200).json({ orders });
    } catch (error) {
      console.error("staff/orders error:", error);
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
      const { data, error } = await supabase
        .from("usuarios")
        .select("uid,dni,nombres,apellidos,nombre,email,rol,creadoEn,telefono,direcciones");
      if (error) throw error;
      return res.status(200).json({ users: data ?? [] });
    } catch (error) {
      console.error("admin/users error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/data/product-ids", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const ids = await loadProductIdSet(supabase);
      return res.status(200).json({ ids: Array.from(ids) });
    } catch (error) {
      console.error("admin/data/product-ids error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/data/export", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const collection = String(req.query.collection || "").trim();
      assertAdminDataCollection(collection);
      const selectCols = adminDataExportSelect(collection);
      const { data, error } = await supabase.from(collection).select(selectCols);
      if (error) throw error;
      const rows = redactAdminExportRows(collection, data);
      let extra = undefined;
      if (collection === "productos") {
        const { data: codes, error: codesErr } = await supabase
          .from("productoCodigos")
          .select("productoId, codigo");
        if (codesErr) throw codesErr;
        extra = (codes ?? []).reduce((acc, row) => {
          if (row.codigo) acc[row.productoId] = row.codigo;
          return acc;
        }, {});
      }
      await logAuditFn(
        supabase,
        "exportar",
        collection,
        collection,
        collection,
        decodedToken.uid,
        decodedToken.email || "",
        { rowCount: rows.length },
      );
      return res.status(200).json({ rows, extra });
    } catch (error) {
      console.error("admin/data/export error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/admin/data/import", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const { collection, rows, productCodes, onConflict } = req.body || {};
      const table = String(collection || "").trim();
      const conflictColumn =
        typeof onConflict === "string" && onConflict.trim() ? onConflict.trim() : undefined;
      assertAdminDataCollection(table, { importable: true });
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: "Sin filas para importar" });
      }
      if (rows.length > ADMIN_DATA_MAX_IMPORT_ROWS) {
        return res.status(400).json({ error: "Demasiadas filas en una sola importacion" });
      }
      assertImportRowsEsDePrueba(rows);

      let validProductIds = null;
      if (table === "ventasDiarias" || table === "productoFinanzas") {
        validProductIds = await loadProductIdSet(supabase);
        for (let i = 0; i < rows.length; i += 1) {
          const productId = String(rows[i]?.productId || "").trim();
          if (productId && !validProductIds.has(productId)) {
            return res.status(400).json({
              error: `Fila ${i + 1}: productId '${productId}' no existe en productos`,
            });
          }
        }
      }

      const CHUNK = 500;
      let imported = 0;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const upsertOpts = conflictColumn ? { onConflict: conflictColumn } : undefined;
        const { error } = await supabase.from(table).upsert(chunk, upsertOpts);
        if (error) throw error;
        imported += chunk.length;
      }

      if (table === "productos" && Array.isArray(productCodes) && productCodes.length > 0) {
        const codes = productCodes
          .map((row) => ({
            productoId: String(row.productoId || "").trim(),
            codigo: String(row.codigo || "").trim(),
            actualizadoEn: new Date().toISOString(),
          }))
          .filter((row) => row.productoId && row.codigo);
        if (codes.length > 0) {
          const { error: codesErr } = await supabase
            .from("productoCodigos")
            .upsert(codes, { onConflict: "productoId" });
          if (codesErr) throw codesErr;
        }
      }

      await logAuditFn(
        supabase,
        "importar",
        "admin_data",
        table,
        table,
        decodedToken.uid,
        decodedToken.email || "",
        { rows: imported },
      );
      return res.status(200).json({ ok: true, imported });
    } catch (error) {
      console.error("admin/data/import error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/data/test-batches", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const results = await Promise.all(
        Array.from(ADMIN_DATA_IMPORT_COLLECTIONS).map(async (colId) => {
          const { data, error } = await supabase.from(colId).select("*").eq("esDePrueba", true);
          if (error) throw error;
          return (data ?? []).map((item) => ({ colId, data: item }));
        }),
      );
      return res.status(200).json({ docs: results.flat() });
    } catch (error) {
      console.error("admin/data/test-batches error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.delete("/admin/data/test-data", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const mode = String(req.query.mode || "").trim();
      const escenario = String(req.query.escenario || "").trim();
      const loteImportacion = String(req.query.loteImportacion || "").trim();

      if (mode === "scenario") {
        if (!escenario) {
          return res.status(400).json({ error: "escenario requerido" });
        }
        await Promise.all(
          Array.from(ADMIN_DATA_IMPORT_COLLECTIONS).map((colId) =>
            supabase.from(colId).delete().eq("esDePrueba", true).eq("escenario", escenario),
          ),
        );
        return res.status(200).json({ ok: true });
      }

      if (mode === "batch") {
        if (!loteImportacion) {
          return res.status(400).json({ error: "loteImportacion requerido" });
        }
        await Promise.all(
          Array.from(ADMIN_DATA_IMPORT_COLLECTIONS).map((colId) =>
            supabase
              .from(colId)
              .delete()
              .eq("esDePrueba", true)
              .eq("loteImportacion", loteImportacion),
          ),
        );
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "mode invalido (scenario|batch)" });
    } catch (error) {
      console.error("admin/data/test-data error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/data/sales/count", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const until = String(req.query.until || "").trim();
      if (!until) {
        return res.status(400).json({ error: "until requerido (YYYY-MM-DD)" });
      }
      const { count, error } = await supabase
        .from("ventasDiarias")
        .select("*", { count: "exact", head: true })
        .lte("fecha", until);
      if (error) throw error;
      return res.status(200).json({ count: count ?? 0 });
    } catch (error) {
      console.error("admin/data/sales/count error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.delete("/admin/data/sales", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const until = String(req.query.until || "").trim();
      if (!until) {
        return res.status(400).json({ error: "until requerido (YYYY-MM-DD)" });
      }
      const { count } = await supabase
        .from("ventasDiarias")
        .select("*", { count: "exact", head: true })
        .lte("fecha", until);
      const { error } = await supabase.from("ventasDiarias").delete().lte("fecha", until);
      if (error) throw error;
      await logAuditFn(
        supabase,
        "eliminar",
        "ventasDiarias",
        until,
        `ventas hasta ${until}`,
        decodedToken.uid,
        decodedToken.email || "",
        { deleted: count ?? 0 },
      );
      return res.status(200).json({ ok: true, deleted: count ?? 0 });
    } catch (error) {
      console.error("admin/data/sales error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/admin/media/cloudinary-signature", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const payload = buildCloudinaryUploadSignature();
      return res.status(200).json(payload);
    } catch (error) {
      console.error("admin/media/cloudinary-signature error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/productFinanzas", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const { data, error } = await supabase.from("productoFinanzas").select("*");
      if (error) throw error;
      return res.status(200).json({ rows: data ?? [] });
    } catch (error) {
      console.error("admin/productFinanzas error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.put("/admin/productFinanzas/:productId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const productId = String(req.params.productId || "").trim();
      const data = req.body || {};
      if (!productId) {
        return res.status(400).json({ error: "Producto invalido" });
      }
      const payload = {
        productId,
        costoCompra: Number(data.costoCompra ?? 0),
        margenMinimo: Number(data.margenMinimo ?? 0),
        margenObjetivo: Number(data.margenObjetivo ?? 0),
        margenMaximo: Number(data.margenMaximo ?? 0),
        precioMinimo: Number(data.precioMinimo ?? 0),
        precioSugerido: Number(data.precioSugerido ?? 0),
        precioMaximo: Number(data.precioMaximo ?? 0),
        actualizadoEn: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("productoFinanzas")
        .upsert(payload, { onConflict: "productId" });
      if (error) throw error;
      return res.status(200).json({ ok: true, row: payload });
    } catch (error) {
      console.error("admin/productFinanzas PUT error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.delete("/admin/productFinanzas/:productId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const productId = String(req.params.productId || "").trim();
      if (!productId) {
        return res.status(400).json({ error: "Producto invalido" });
      }
      const { error } = await supabase.from("productoFinanzas").delete().eq("productId", productId);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("admin/productFinanzas DELETE error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/staff/productPriceRanges", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertTrabajadorRole(supabase, decodedToken.uid);
      const { data, error } = await supabase
        .from("productoFinanzas")
        .select(
          "productId,margenMinimo,margenObjetivo,margenMaximo,precioMinimo,precioSugerido,precioMaximo,actualizadoEn",
        );
      if (error) throw error;
      return res.status(200).json({ rows: (data ?? []).map(toStaffProductPriceRange) });
    } catch (error) {
      console.error("staff/productPriceRanges error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/products", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const { data, error } = await supabase.from("productos").select("*").order("nombre");
      if (error) throw error;
      return res.status(200).json({ products: data ?? [] });
    } catch (error) {
      console.error("admin/products error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/admin/products", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const product = req.body?.product || req.body;
      if (!product || typeof product !== "object" || !String(product.nombre || "").trim()) {
        return res.status(400).json({ error: "Producto incompleto" });
      }
      const { data, error } = await supabase.from("productos").insert(product).select("id").single();
      if (error) throw error;
      await logAuditFn(
        supabase,
        "crear",
        "producto",
        data.id,
        product.nombre || data.id,
        decodedToken.uid,
        decodedToken.email || "",
        { source: "admin/products" },
      );
      return res.status(200).json({ ok: true, id: data.id });
    } catch (error) {
      console.error("admin/products POST error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/staff/products", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertTrabajadorRole(supabase, decodedToken.uid);
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return res.status(200).json({ products: data ?? [] });
    } catch (error) {
      console.error("staff/products error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/products/:productId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
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

app.patch("/admin/products/:productId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const productId = String(req.params.productId || "").trim();
      const data = req.body?.product || req.body;
      if (!productId || !data || typeof data !== "object") {
        return res.status(400).json({ error: "Producto invalido" });
      }
      const { error } = await supabase.from("productos").update(data).eq("id", productId);
      if (error) throw error;
      await logAuditFn(
        supabase,
        "editar",
        "producto",
        productId,
        data.nombre || productId,
        decodedToken.uid,
        decodedToken.email || "",
        { source: "admin/products/:id", campos: Object.keys(data) },
      );
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("admin/products PATCH error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.put("/admin/productCodes/:productId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const productId = String(req.params.productId || "").trim();
      const codigo = String(req.body?.codigo || "").trim();
      if (!productId || !codigo) {
        return res.status(400).json({ error: "Codigo de producto invalido" });
      }
      const { error } = await supabase
        .from("productoCodigos")
        .upsert(
          { productoId: productId, codigo, actualizadoEn: new Date().toISOString() },
          { onConflict: "productoId" },
        );
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("admin/productCodes PUT error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/productCodes", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const codes = await fetchProductCodesMap(supabase);
      return res.status(200).json({ codes });
    } catch (error) {
      console.error("admin/productCodes error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/staff/productCodes", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertTrabajadorRole(supabase, decodedToken.uid);
      const codes = await fetchProductCodesMap(supabase, { activeOnly: true });
      return res.status(200).json({ codes });
    } catch (error) {
      console.error("staff/productCodes error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/manufacturers", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const { data, error } = await supabase.from("fabricantes").select("*").order("marca");
      if (error) throw error;
      return res.status(200).json({ manufacturers: data ?? [] });
    } catch (error) {
      console.error("admin/manufacturers error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/admin/manufacturers", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const manufacturer = req.body?.manufacturer || req.body;
      if (!manufacturer || typeof manufacturer !== "object" || !String(manufacturer.marca || "").trim()) {
        return res.status(400).json({ error: "Fabricante incompleto" });
      }
      const { data, error } = await supabase.from("fabricantes").insert(manufacturer).select("id").single();
      if (error) throw error;
      await logAuditFn(
        supabase,
        "crear",
        "fabricante",
        data.id,
        manufacturer.marca || data.id,
        decodedToken.uid,
        decodedToken.email || "",
        { source: "admin/manufacturers" },
      );
      return res.status(200).json({ ok: true, id: data.id });
    } catch (error) {
      console.error("admin/manufacturers POST error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.patch("/admin/manufacturers/:manufacturerId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const manufacturerId = String(req.params.manufacturerId || "").trim();
      const data = req.body?.manufacturer || req.body;
      if (!manufacturerId || !data || typeof data !== "object") {
        return res.status(400).json({ error: "Fabricante invalido" });
      }
      const { error } = await supabase.from("fabricantes").update(data).eq("id", manufacturerId);
      if (error) throw error;
      await logAuditFn(
        supabase,
        "editar",
        "fabricante",
        manufacturerId,
        data.marca || manufacturerId,
        decodedToken.uid,
        decodedToken.email || "",
        { source: "admin/manufacturers/:id", campos: Object.keys(data) },
      );
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("admin/manufacturers PATCH error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.delete("/admin/manufacturers/:manufacturerId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const manufacturerId = String(req.params.manufacturerId || "").trim();
      if (!manufacturerId) {
        return res.status(400).json({ error: "Fabricante invalido" });
      }
      const { error } = await supabase.from("fabricantes").delete().eq("id", manufacturerId);
      if (error) throw error;
      await logAuditFn(
        supabase,
        "eliminar",
        "fabricante",
        manufacturerId,
        manufacturerId,
        decodedToken.uid,
        decodedToken.email || "",
        { source: "admin/manufacturers/:id" },
      );
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("admin/manufacturers DELETE error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/staff/products/:productId", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertTrabajadorRole(supabase, decodedToken.uid);
      const productId = String(req.params.productId || "").trim();
      if (!productId) {
        return res.status(400).json({ error: "Producto invalido" });
      }
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("id", productId)
        .eq("activo", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      return res.status(200).json({ product: data });
    } catch (error) {
      console.error("staff/products/:id error:", error);
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
        .select("uid,dni,nombres,apellidos,nombre,email,rol,creadoEn,telefono,direcciones")
        .eq("uid", decodedToken.uid)
        .maybeSingle();
      if (error) throw error;
      const profile = profileRowForClientRead(data);
      return res.status(200).json({ profile });
    } catch (error) {
      console.error("users/me GET error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.post("/audit", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      const { accion, entidad, entidadId, entidadNombre, detalle } = req.body || {};
      if (![accion, entidad, entidadId, entidadNombre].every((v) => typeof v === "string" && v.trim())) {
        return res.status(400).json({ error: "Evento de auditoria invalido" });
      }
      const safeAccion = accion.trim();
      const safeEntidad = entidad.trim();
      const safeEntidadId = entidadId.trim();
      const safeDetalle = detalle && isPlainObject(detalle) ? detalle : null;
      const role = await fetchAuditActorRole(supabase, decodedToken);
      assertClientAuditAllowed({
        accion: safeAccion,
        entidad: safeEntidad,
        entidadId: safeEntidadId,
        detalle: safeDetalle,
        role,
        uid: decodedToken.uid,
      });
      const safeEntidadNombre = await resolveClientAuditEntityLabel(
        supabase,
        safeEntidad,
        safeEntidadId,
        entidadNombre,
      );
      await logAuditFn(
        supabase,
        safeAccion,
        safeEntidad,
        safeEntidadId,
        safeEntidadNombre,
        decodedToken.uid,
        decodedToken.email || "",
        safeDetalle ? { ...safeDetalle, clientSubmitted: true } : { clientSubmitted: true },
        { entityLabelResolved: true },
      );
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("audit POST error:", error);
      return res.status(httpErrorStatus(error)).json({ error: publicError(error) });
    }
  });
});

app.get("/admin/audit", (req, res) => {
  cors(req, res, async () => {
    try {
      const decodedToken = await verifyFirebaseUser(req);
      const supabase = getSupabaseAdmin();
      await assertAdminRole(supabase, decodedToken.uid);
      const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || "20"), 10) || 20, 1), 100);
      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .order("realizadoEn", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const entries = (data ?? []).map(sanitizeAuditEntryForResponse);
      return res.status(200).json({ entries });
    } catch (error) {
      console.error("admin/audit error:", error);
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
        .select("uid,email,rol,creadoEn,dni,dni_hash,nombres,apellidos,nombre")
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
        allowed.direcciones = sanitizeProfileAddresses(patch.direcciones) || [];
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
      if (uid === decodedToken.uid) {
        return res.status(400).json({ error: "No puedes eliminar tu propio usuario desde administracion" });
      }
      const { data: targetUser, error: targetError } = await supabase
        .from("usuarios")
        .select("email,rol")
        .eq("uid", uid)
        .maybeSingle();
      if (targetError) throw targetError;
      if (targetUser?.rol === "admin" && !isSuperadminEmail(decodedToken.email)) {
        return res.status(403).json({ error: "Solo el superadministrador puede eliminar administradores" });
      }
      if (targetUser?.email && isSuperadminEmail(targetUser.email)) {
        return res.status(403).json({ error: "No se puede eliminar el superadministrador" });
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
