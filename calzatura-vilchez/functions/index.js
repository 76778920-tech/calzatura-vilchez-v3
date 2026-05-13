/**
 * Cloud Functions (Firebase). Requiere plan Blaze para desplegar.
 * Misma lógica que `bff/server.cjs` (Express en Render, etc.) — mantener alineados al cambiar la API.
 */
const { createClient } = require("@supabase/supabase-js");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");

/** Misma clave pública del cliente; solo la usa el servidor para REST Identity Toolkit (login vía BFF). */
const FIREBASE_WEB_API_KEY = defineString("FIREBASE_WEB_API_KEY", { default: "" });

const allowedOrigins = new Set([
  "https://calzaturavilchez-ab17f.web.app",
  "https://calzaturavilchez-ab17f.firebaseapp.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const cors = require("cors")({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origen no permitido"));
  },
});

admin.initializeApp();

const STRIPE_SECRET = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = defineSecret("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = defineSecret("SUPABASE_SERVICE_ROLE_KEY");
const AI_SERVICE_URL = defineSecret("AI_SERVICE_URL");
const AI_SERVICE_BEARER_TOKEN = defineSecret("AI_SERVICE_BEARER_TOKEN");

const ORDER_ITEM_LIMIT = 30;
const ORDER_QTY_LIMIT = 100;
const SHIPPING_COST = 0;
/** Tope de envío (S/) que acepta el servidor si el cliente envía `envio` (debe coincidir con tarifa ORS en frontend). */
const DELIVERY_MAX_ENVIO_S = 35;

function getSupabaseAdmin() {
  return createClient(
    SUPABASE_URL.value(),
    SUPABASE_SERVICE_ROLE_KEY.value(),
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
async function logAuditFn({
  supabase,
  accion,
  entidad,
  entidadId,
  entidadNombre,
  usuarioUid,
  usuarioEmail,
  detalle,
}) {
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

function publicError(error) {
  if (error?.status && error.status < 500) {
    return error.message;
  }
  return "No se pudo procesar la solicitud";
}

function isNonEmptyString(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
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
  return t.length <= 100 && LOGIN_EMAIL_RE.test(t);
}

function isValidLoginPassword(password) {
  return typeof password === "string" && password.length >= 1 && password.length <= 128;
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

function aggregateColorStock(colorStock) {
  const aggregate = {};

  Object.values(colorStock || {}).forEach((stockBySize) => {
    Object.entries(stockBySize || {}).forEach(([talla, qty]) => {
      aggregate[talla] = (aggregate[talla] || 0) + Math.max(0, Number(qty) || 0);
    });
  });

  return aggregate;
}

function sizesFromStockMap(stockBySize) {
  return Object.entries(stockBySize)
    .filter(([, qty]) => Number(qty) > 0)
    .map(([talla]) => talla)
    .sort((a, b) => Number(a) - Number(b));
}

function getAvailableSizes(product) {
  if (product.colorStock) return sizesFromStockMap(aggregateColorStock(product.colorStock));
  if (product.tallaStock) return sizesFromStockMap(product.tallaStock);
  return Array.isArray(product.tallas) ? product.tallas : [];
}

function deriveTotalStock(product) {
  if (product.colorStock) {
    return sumColorSizeStock(product.colorStock);
  }
  if (product.tallaStock) {
    return sumSizeStock(product.tallaStock);
  }
  return Math.max(0, Number(product.stock) || 0);
}

function getSizeStock(product, talla, color) {
  if (product.colorStock && talla) {
    if (color && typeof product.colorStock[color]?.[talla] === "number") {
      return Math.max(0, Number(product.colorStock[color][talla]) || 0);
    }

    return Object.values(product.colorStock).reduce(
      (sum, stockBySize) => sum + Math.max(0, Number(stockBySize?.[talla]) || 0),
      0
    );
  }

  if (talla && product.tallaStock && typeof product.tallaStock[talla] === "number") {
    return Math.max(0, Number(product.tallaStock[talla]) || 0);
  }

  return deriveTotalStock(product);
}

function sanitizeOrderProduct(product) {
  return {
    id: product.id,
    nombre: product.nombre,
    precio: Number(product.precio || 0),
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
    quantity: Number(item?.quantity || 0),
    talla: typeof item?.talla === "string" ? item.talla.trim() : "",
    color: typeof item?.color === "string" ? item.color.trim() : "",
  };
}

function isInvalidOrderQty(productId, quantity) {
  return !productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > ORDER_QTY_LIMIT;
}

function strOr(v, d = "") {
  return v || d;
}

function arrOr(v) {
  return Array.isArray(v) ? v : [];
}

async function fetchProductsByIds(supabase, ids) {
  const { data, error } = await supabase.from("productos").select("*").in("id", ids);
  if (error) {
    throw Object.assign(new Error("No se pudo consultar productos"), { status: 500 });
  }
  return data || [];
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
    const { productId, quantity, talla, color } = extractItemFields(item);

    if (isInvalidOrderQty(productId, quantity)) {
      throw Object.assign(new Error("Producto invalido en el pedido"), { status: 400 });
    }

    const product = await fetchProductOrThrow(supabase, productId);
    const price = Number(product.precio || 0);
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
    const { productId, quantity, talla, color } = extractItemFields(item);

    if (isInvalidOrderQty(productId, quantity)) {
      throw Object.assign(new Error("Producto invalido en el pedido"), { status: 400 });
    }

    return {
      productId,
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
    const product = productMap.get(item.productId);
    if (!product) {
      throw Object.assign(new Error("Producto no encontrado"), { status: 400 });
    }

    const price = Number(product.precio || 0);
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
  const { error } = await supabase.from("pedidos").update(patch).eq("id", orderId);
  if (error) {
    throw Object.assign(new Error("No se pudo actualizar el pedido"), { status: 500 });
  }
}

function resolveColorBucket(colorStock, talla, quantity, preferredColor) {
  if (preferredColor && typeof colorStock[preferredColor]?.[talla] === "number") {
    return preferredColor;
  }

  return Object.keys(colorStock).find((colorKey) => {
    return Math.max(0, Number(colorStock[colorKey]?.[talla]) || 0) >= quantity;
  });
}

async function discountOrderItemStock(supabase, item) {
  const { productId, quantity, talla, color } = extractItemFields(item);

  if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Producto invalido al descontar stock");
  }

  const product = await fetchProductOrThrow(supabase, productId);
  const currentTotalStock = deriveTotalStock(product);
  const currentSizeStock = getSizeStock(product, talla || undefined, color || undefined);

  if (currentTotalStock < quantity || currentSizeStock < quantity) {
    throw new Error("Stock insuficiente al descontar");
  }

  const updates = {};

  if (product.colorStock && talla) {
    const colorStock = {
      ...product.colorStock,
    };
    const colorKey = resolveColorBucket(colorStock, talla, quantity, color || undefined);

    if (!colorKey) {
      throw new Error("No se encontro stock de color para descontar");
    }

    colorStock[colorKey] = {
      ...colorStock[colorKey],
      [talla]: Math.max(0, Number(colorStock[colorKey][talla] || 0) - quantity),
    };

    updates.colorStock = colorStock;
    updates.tallas = getAvailableSizes({ ...product, colorStock });
    updates.stock = sumColorSizeStock(colorStock);
  } else if (product.tallaStock && talla) {
    const tallaStock = {
      ...product.tallaStock,
      [talla]: Math.max(0, Number(product.tallaStock[talla] || 0) - quantity),
    };

    updates.tallaStock = tallaStock;
    updates.tallas = Object.keys(tallaStock)
      .filter((size) => Number(tallaStock[size] || 0) > 0)
      .sort((a, b) => Number(a) - Number(b));
    updates.stock = sumSizeStock(tallaStock);
  } else {
    updates.stock = Math.max(0, Number(product.stock || 0) - quantity);
  }

  const { data, error } = await supabase
    .from("productos")
    .update(updates)
    .eq("id", productId)
    .eq("stock", currentTotalStock)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo descontar stock");
  }

  if (!data) {
    throw new Error("El stock cambio durante la operacion");
  }
}

function hasValidOrderItems(order) {
  return Array.isArray(order.items) && order.items.length > 0 && order.items.length <= ORDER_ITEM_LIMIT;
}

async function discountOrderStock(supabase, order) {
  for (const item of order.items || []) {
    await discountOrderItemStock(supabase, item);
  }
}

exports.createOrder = onRequest(
  { secrets: [SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY] },
  async (req, res) => {
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
        const draft = await buildOrderDraft(supabase, items);
        let envio = draft.envio;
        if (typeof rawEnvio === "number" && Number.isFinite(rawEnvio) && rawEnvio >= 0) {
          envio = Math.min(Math.round(rawEnvio * 100) / 100, DELIVERY_MAX_ENVIO_S);
        }
        const total = draft.subtotal + envio;
        const creadoEn = new Date().toISOString();

        const { data, error } = await supabase
          .from("pedidos")
          .insert({
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
          })
          .select("id")
          .single();

        if (error || !data?.id) {
          throw Object.assign(new Error("No se pudo crear el pedido"), { status: 500 });
        }

        return res.status(200).json({
          orderId: data.id,
          subtotal: draft.subtotal,
          envio,
          total,
          estado: "pendiente",
        });
      } catch (error) {
        console.error("Create order error:", error);
        return res.status(error.status || 500).json({ error: publicError(error) });
      }
    });
  }
);

exports.createCheckoutSession = onRequest(
  { secrets: [STRIPE_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo no permitido" });
      }

      try {
        const decodedToken = await verifyFirebaseUser(req);
        const stripe = require("stripe")(STRIPE_SECRET.value());
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
        if (!hasValidOrderItems(order)) {
          return res.status(400).json({ error: "Pedido sin productos validos" });
        }

        assertStoredTotals(order);
        await assertOrderStockAvailability(supabase, order.items);

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

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: lineItems,
          mode: "payment",
          success_url: `${appUrl}/pedido-exitoso/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/checkout`,
          metadata: { orderId, userId: decodedToken.uid },
        });

        await updateOrder(supabase, orderId, { stripeSessionId: session.id });

        return res.status(200).json({ sessionId: session.id });
      } catch (error) {
        console.error("Stripe error:", error);
        return res.status(error.status || 500).json({ error: publicError(error) });
      }
    });
  }
);

exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY] },
  async (req, res) => {
    const stripe = require("stripe")(STRIPE_SECRET.value());
    const supabase = getSupabaseAdmin();
    const sig = req.headers["stripe-signature"];
    const webhookSecret = STRIPE_WEBHOOK_SECRET.value();

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
            await discountOrderStock(supabase, order);
            await updateOrder(supabase, orderId, {
              estado: "pagado",
              stripeSessionId: session.id,
              pagadoEn: new Date().toISOString(),
            });
            await logAuditFn({
              supabase,
              accion: "cambiar_estado",
              entidad: "pedido",
              entidadId: orderId,
              entidadNombre: `#${orderId.slice(-8).toUpperCase()}`,
              usuarioUid: session.metadata?.userId ?? null,
              usuarioEmail: order.userEmail ?? null,
              detalle: {
                estado: "pagado",
                source: "stripe_webhook",
                stripeEventId: event.id,
                stripeSessionId: session.id,
              },
            });
          }
          // Si order.estado === "pagado": Stripe está reintentando un evento ya procesado.
          // No actualizamos ni auditamos de nuevo para evitar duplicados.
        } catch (error) {
          console.error("Stripe webhook order error:", error);
          return res.status(error.status || 500).json({ error: publicError(error) });
        }
      }
    }

    return res.json({ received: true });
  }
);

exports.confirmCodOrder = onRequest(
  { secrets: [SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo no permitido" });
      }

      try {
        const decodedToken = await verifyFirebaseUser(req);
        const supabase = getSupabaseAdmin();
        const { orderId } = req.body || {};

        if (!orderId || typeof orderId !== "string") {
          return res.status(400).json({ error: "Pedido invalido" });
        }

        const order = await fetchOrderOrThrow(supabase, orderId);

        if (order.userId !== decodedToken.uid) {
          return res.status(403).json({ error: "No puedes confirmar este pedido" });
        }
        if (order.estado !== "pendiente" || order.metodoPago !== "contraentrega") {
          return res.status(409).json({ error: "El pedido no esta disponible para confirmar" });
        }
        if (!hasValidOrderItems(order)) {
          return res.status(400).json({ error: "Pedido sin productos validos" });
        }

        assertStoredTotals(order);
        await assertOrderStockAvailability(supabase, order.items);

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error("COD confirm error:", error);
        return res.status(error.status || 500).json({ error: publicError(error) });
      }
    });
  }
);

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

async function favoritesHandlePost(supabase, userId, productId, res) {
  if (!isNonEmptyString(productId, 120)) {
    return res.status(400).json({ error: "Producto invalido" });
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

const FAVORITES_HANDLERS = {
  GET: favoritesHandleGet,
  POST: favoritesHandlePost,
  DELETE: favoritesHandleDelete,
};

exports.favorites = onRequest(
  { secrets: [SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY] },
  async (req, res) => {
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

        const handler = FAVORITES_HANDLERS[req.method];
        if (!handler) return res.status(405).json({ error: "Metodo no permitido" });
        return handler(supabase, userId, productId, res);
      } catch (error) {
        console.error("Favorites error:", error);
        return res.status(error.status || 500).json({ error: publicError(error) });
      }
    });
  }
);

const AI_PROXY_UPSTREAM_TIMEOUT_MS = 55_000;

/** @returns {{ ok: true, upstreamUrl: string, method: string } | { ok: false, status?: number, error: string }} */
function parseQueryInt(req, name, defaultVal, min, max) {
  const v = Number.parseInt(String(req.query[name] ?? defaultVal), 10);
  if (!Number.isFinite(v) || v < min || v > max) return null;
  return v;
}

function aiProxyCombined(base, req) {
  const horizon = parseQueryInt(req, "horizon", "30", 7, 90);
  const history = parseQueryInt(req, "history", "120", 30, 365);
  if (horizon === null) return { ok: false, error: "horizon invalido" };
  if (history === null) return { ok: false, error: "history invalido" };
  const upstreamUrl = `${base}/api/predict/combined?horizon=${encodeURIComponent(horizon)}&history=${encodeURIComponent(history)}`;
  return { ok: true, upstreamUrl, method: "GET" };
}

function aiProxyWeeklyChart(base, req) {
  const weeks = parseQueryInt(req, "weeks", "8", 2, 24);
  if (weeks === null) return { ok: false, error: "weeks invalido" };
  const upstreamUrl = `${base}/api/sales/weekly-chart?weeks=${encodeURIComponent(weeks)}`;
  return { ok: true, upstreamUrl, method: "GET" };
}

function aiProxyModelMetrics(base) {
  return { ok: true, upstreamUrl: `${base}/api/model/metrics`, method: "GET" };
}

function aiProxyIreHistorial(base, req) {
  const days = parseQueryInt(req, "days", "30", 1, 365);
  if (days === null) return { ok: false, error: "days invalido" };
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
  if (recentDays === null) return { ok: false, error: "recent_days invalido" };
  if (baselineDays === null) return { ok: false, error: "baseline_days invalido" };
  const upstreamUrl = `${base}/api/predict/campaign-detection?recent_days=${encodeURIComponent(recentDays)}&baseline_days=${encodeURIComponent(baselineDays)}`;
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

  const base = AI_SERVICE_URL.value().replace(/\/$/, "");
  const serviceAuth = { Authorization: `Bearer ${AI_SERVICE_BEARER_TOKEN.value()}` };
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

exports.aiAdminProxy = onRequest(
  {
    secrets: [SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_SERVICE_URL, AI_SERVICE_BEARER_TOKEN],
    invoker: "public",
  },
  async (req, res) => {
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
  }
);

/**
 * BFF de login: el navegador no llama a identitytoolkit; solo a esta función.
 * Respuesta siempre 200 + JSON genérico (ok) para no exponer códigos de Google en el cliente.
 * Configurar parámetro FIREBASE_WEB_API_KEY (misma clave web del proyecto) en entorno de Functions.
 */
exports.authLogin = onRequest(
  {
    invoker: "public",
    memory: "256MiB",
    timeoutSeconds: 25,
  },
  async (req, res) => {
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
        const rawEmail = req.body?.email;
        const rawPassword = req.body?.password;
        if (!isValidLoginEmail(rawEmail) || !isValidLoginPassword(rawPassword)) {
          return res.status(200).json({ ok: false });
        }
        const email = String(rawEmail).trim().toLowerCase();
        const password = String(rawPassword);
        const apiKey = FIREBASE_WEB_API_KEY.value();
        if (!apiKey) {
          console.error("authLogin: falta FIREBASE_WEB_API_KEY en parametros de Functions");
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
  }
);
