/**
 * Cloud Functions (Firebase). Requiere plan Blaze para desplegar.
 * Misma lógica que `bff/server.cjs` (Express en Render, etc.) — mantener alineados al cambiar la API.
 */
const { createClient } = require("@supabase/supabase-js");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");

const {
  ORDER_QTY_LIMIT,
  strOr, arrOr, toN, orUndef, objOr, errorStatus, trimStr, isValidItemArray,
  isNonEmptyString, isValidLoginEmail, isValidLoginPassword,
  isInvalidOrderQty, hasValidOrderItems, toCents, validStripeImage, publicError,
  normalizeOptionalText, normalizeAddress,
  readIdempotencyKey, findOrderByIdempotency, idempotencyOrderJson,
  sumSizeStock, sumColorSizeStock, getAvailableSizes, deriveTotalStock, getSizeStock,
  sanitizeOrderProduct, extractItemFields, assertStoredTotals,
  assertStockAndPrice, resolveColorBucket, findTallaKeyInMap, cellQty,
  toFinitePrice, effectiveColorStock, effectiveTallaStock,
  resolveAiAdminUpstreamRequest, sendUpstreamToClient,
  aiAdminProxyErrorStatus, aiAdminProxyErrorMessage,
} = require("./fnUtils");

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
  const header = strOr(req.headers.authorization);
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

const ORDER_STATUSES = new Set(["pendiente", "pagado", "enviado", "entregado", "cancelado"]);

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

const LOGIN_RATE_WINDOW_MS = 30 * 60 * 1000; // ventana: 30 minutos
const LOGIN_RATE_MAX = 15; // máximo de POST /authLogin por IP en esa ventana (antes de cortar sin llamar a Google)
const loginRateByIp = new Map();

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim();
  }
  return strOr(req.ip, "unknown");
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

async function fetchProductsByIds(supabase, ids) {
  const { data, error } = await supabase.from("productos").select("*").in("id", ids);
  if (error) {
    throw Object.assign(new Error("No se pudo consultar productos"), { status: 500 });
  }
  return arrOr(data);
}

async function fetchRowOrThrow(supabase, table, id, notFoundStatus, fetchMsg, notFoundMsg) {
  const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw Object.assign(new Error(fetchMsg), { status: 500 });
  if (!data) throw Object.assign(new Error(notFoundMsg), { status: notFoundStatus });
  return data;
}

async function fetchProductOrThrow(supabase, productId) {
  return fetchRowOrThrow(supabase, "productos", productId, 400, "No se pudo consultar el producto", "Producto no encontrado");
}

async function assertOrderStockAvailability(supabase, items) {
  for (const item of arrOr(items)) {
    const { productId, quantity, talla, color } = extractItemFields(item);

    if (isInvalidOrderQty(productId, quantity)) {
      throw Object.assign(new Error("Producto invalido en el pedido"), { status: 400 });
    }

    const product = await fetchProductOrThrow(supabase, productId);
    const price = toFinitePrice(product.precio);
    const totalStock = deriveTotalStock(product);
    const sizeStock = getSizeStock(product, orUndef(talla), orUndef(color));

    assertStockAndPrice(price, totalStock, sizeStock, quantity);
  }
}

async function buildOrderDraft(supabase, rawItems) {
  if (!isValidItemArray(rawItems)) {
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

    const price = toFinitePrice(product.precio);
    const totalStock = deriveTotalStock(product);
    const sizeStock = getSizeStock(product, orUndef(item.talla), orUndef(item.color));

    assertStockAndPrice(price, totalStock, sizeStock, item.quantity);

    subtotal += price * item.quantity;
    items.push({
      product: sanitizeOrderProduct(product),
      quantity: item.quantity,
      talla: orUndef(item.talla),
      color: orUndef(item.color),
    });
  }

  const envio = SHIPPING_COST;

  return {
    items,
    subtotal,
    envio,
    total: subtotal + envio,
  };
}

async function fetchOrderOrThrow(supabase, orderId) {
  return fetchRowOrThrow(supabase, "pedidos", orderId, 404, "No se pudo consultar el pedido", "Pedido no encontrado");
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

async function discountOrderItemStock(supabase, item) {
  const { productId, quantity, talla, color } = extractItemFields(item);

  if (isInvalidOrderQty(productId, quantity)) {
    throw new Error("Producto invalido al descontar stock");
  }

  const product = await fetchProductOrThrow(supabase, productId);
  const currentTotalStock = deriveTotalStock(product);
  const currentSizeStock = getSizeStock(product, orUndef(talla), orUndef(color));

  if (currentTotalStock < quantity || currentSizeStock < quantity) {
    throw new Error("Stock insuficiente al descontar");
  }

  const updates = {};

  const csDiscount = effectiveColorStock(product.colorStock);
  if (csDiscount && talla) {
    const colorStock = {
      ...csDiscount,
    };
    const colorKey = resolveColorBucket(colorStock, talla, quantity, orUndef(color), strOr(product.color));

    if (!colorKey) {
      throw new Error("No se encontro stock de color para descontar");
    }

    const tallaKey = findTallaKeyInMap(colorStock[colorKey], talla) || talla;
    colorStock[colorKey] = {
      ...colorStock[colorKey],
      [tallaKey]: Math.max(0, cellQty(colorStock[colorKey][tallaKey]) - quantity),
    };

    updates.colorStock = colorStock;
    updates.tallas = getAvailableSizes({ ...product, colorStock });
    updates.stock = sumColorSizeStock(colorStock);
  } else if (effectiveTallaStock(product.tallaStock) && talla) {
    const baseTs = effectiveTallaStock(product.tallaStock);
    const tallaKey = findTallaKeyInMap(baseTs, talla) || talla;
    const tallaStock = {
      ...baseTs,
      [tallaKey]: Math.max(0, cellQty(baseTs[tallaKey]) - quantity),
    };

    updates.tallaStock = tallaStock;
    updates.tallas = Object.keys(tallaStock)
      .filter((size) => toN(tallaStock[size]) > 0)
      .sort((a, b) => Number(a) - Number(b));
    updates.stock = sumSizeStock(tallaStock);
  } else {
    updates.stock = Math.max(0, toN(product.stock) - quantity);
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

async function discountOrderStock(supabase, order) {
  for (const item of arrOr(order.items)) {
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
        const { items, direccion, metodoPago, notas, envio: rawEnvio } = objOr(req.body);

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
          userEmail: strOr(decodedToken.email),
          items: draft.items,
          subtotal: draft.subtotal,
          envio,
          total,
          estado: "pendiente",
          direccion: normalizedAddress,
          creadoEn,
          metodoPago,
          notas: normalizedNotes,
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
            await discountOrderStock(supabase, inserted);
            const stockMark = new Date().toISOString();
            await updateOrder(supabase, orderId, { stockDescontadoEn: stockMark });
            await logAuditFn({
              supabase,
              accion: "descontar_stock_pedido",
              entidad: "pedido",
              entidadId: orderId,
              entidadNombre: `#${orderId.slice(-8).toUpperCase()}`,
              usuarioUid: decodedToken.uid,
              usuarioEmail: strOr(decodedToken.email),
              detalle: { source: "createOrder_cod", metodoPago: "contraentrega" },
            });
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
        return res.status(errorStatus(error)).json({ error: publicError(error) });
      }
    });
  }
);

exports.updateOrderStatus = onRequest(
  { secrets: [SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY] },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo no permitido" });
      }

      try {
        const decodedToken = await verifyFirebaseUser(req);
        const supabase = getSupabaseAdmin();
        await assertStaffRole(supabase, decodedToken.uid);

        const { orderId, estado } = objOr(req.body);
        if (!orderId || typeof orderId !== "string") {
          return res.status(400).json({ error: "Pedido invalido" });
        }
        if (!ORDER_STATUSES.has(estado)) {
          return res.status(400).json({ error: "Estado invalido" });
        }

        const patch = { estado };
        if (estado === "pagado") {
          patch.pagadoEn = new Date().toISOString();
        }

        await updateOrder(supabase, orderId, patch);

        await logAuditFn({
          supabase,
          accion: "cambiar_estado",
          entidad: "pedido",
          entidadId: orderId,
          entidadNombre: `#${orderId.slice(-8).toUpperCase()}`,
          usuarioUid: decodedToken.uid,
          usuarioEmail: strOr(decodedToken.email),
          detalle: { estado, source: "updateOrderStatus" },
        });

        return res.status(200).json({ orderId, estado });
      } catch (error) {
        console.error("Update order status error:", error);
        return res.status(errorStatus(error)).json({ error: publicError(error) });
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
        const { orderId } = objOr(req.body);

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

        if (order.stripeSessionId) {
          try {
            const existingSession = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
            if (
              existingSession.status === "open" &&
              typeof existingSession.url === "string" &&
              existingSession.url.startsWith("https://")
            ) {
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
          const quantity = toN(item?.quantity);
          const price = toN(item?.product?.precio);
          const name = strOr(item?.product?.nombre, "Producto");
          const image = strOr(item?.product?.imagen);

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

        const envio = toN(order.envio);
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

        const appUrl = strOr(process.env.APP_URL, "https://calzaturavilchez-ab17f.web.app");

        const payerEmail = strOr(order.userEmail).trim();
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
              "Stripe no devolvio el enlace de pago (session.url). Revisa la cuenta Stripe y los logs del servidor.",
          });
        }

        return res.status(200).json({ sessionId: session.id, url: checkoutUrl });
      } catch (error) {
        console.error("Stripe error:", error);
        return res.status(errorStatus(error)).json({ error: publicError(error) });
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
          return res.status(errorStatus(error)).json({ error: publicError(error) });
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
        const { orderId } = objOr(req.body);

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

        if (order.stockDescontadoEn) {
          return res.status(200).json({ success: true, alreadyProcessed: true });
        }

        assertStoredTotals(order);
        await assertOrderStockAvailability(supabase, order.items);
        await discountOrderStock(supabase, order);
        const stockMark = new Date().toISOString();
        await updateOrder(supabase, orderId, { stockDescontadoEn: stockMark });
        await logAuditFn({
          supabase,
          accion: "descontar_stock_pedido",
          entidad: "pedido",
          entidadId: orderId,
          entidadNombre: `#${orderId.slice(-8).toUpperCase()}`,
          usuarioUid: decodedToken.uid,
          usuarioEmail: order.userEmail ?? null,
          detalle: { source: "confirmCodOrder", metodoPago: "contraentrega" },
        });

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error("COD confirm error:", error);
        return res.status(errorStatus(error)).json({ error: publicError(error) });
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
  return res.status(200).json({ productIds: arrOr(data).map((item) => item.productId) });
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
        const productId = trimStr(rawProductId);

        const handler = FAVORITES_HANDLERS[req.method];
        if (!handler) return res.status(405).json({ error: "Metodo no permitido" });
        return handler(supabase, userId, productId, res);
      } catch (error) {
        console.error("Favorites error:", error);
        return res.status(errorStatus(error)).json({ error: publicError(error) });
      }
    });
  }
);

const AI_PROXY_UPSTREAM_TIMEOUT_MS = 55_000;

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
