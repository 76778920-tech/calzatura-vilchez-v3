const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
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

function publicError(error) {
  if (error && error.status && error.status < 500) {
    return error.message;
  }
  return "No se pudo procesar la solicitud";
}

function getSizeStock(product, talla) {
  if (talla && product.tallaStock && typeof product.tallaStock[talla] === "number") {
    return Number(product.tallaStock[talla] || 0);
  }
  return Number(product.stock || 0);
}

async function discountOrderStock(db, order) {
  await db.runTransaction(async (transaction) => {
    for (const item of order.items || []) {
      const productId = item?.product?.id;
      const quantity = Number(item?.quantity);
      const talla = item?.talla;
      if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Producto invalido al descontar stock");
      }

      const productRef = db.collection("productos").doc(productId);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists) {
        throw new Error("Producto no encontrado al descontar stock");
      }

      const product = productSnap.data();
      const sizeStock = getSizeStock(product, talla);
      if (sizeStock < quantity || Number(product.stock || 0) < quantity) {
        throw new Error("Stock insuficiente al descontar");
      }

      const updates = {
        stock: Number(product.stock || 0) - quantity,
      };

      if (talla && product.tallaStock) {
        const tallaStock = { ...product.tallaStock };
        tallaStock[talla] = sizeStock - quantity;
        updates.tallaStock = tallaStock;
        updates.tallas = Object.keys(tallaStock)
          .filter((size) => Number(tallaStock[size] || 0) > 0)
          .sort((a, b) => Number(a) - Number(b));
      }

      transaction.update(productRef, updates);
    }
  });
}

exports.createCheckoutSession = onRequest(
  { secrets: [STRIPE_SECRET] },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo no permitido" });
      }

      try {
        const decodedToken = await verifyFirebaseUser(req);
        const stripe = require("stripe")(STRIPE_SECRET.value());
        const { orderId } = req.body;

        if (!orderId || typeof orderId !== "string") {
          return res.status(400).json({ error: "Pedido invalido" });
        }

        const db = admin.firestore();
        const orderRef = db.collection("pedidos").doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
          return res.status(404).json({ error: "Pedido no encontrado" });
        }

        const order = orderSnap.data();
        if (order.userId !== decodedToken.uid) {
          return res.status(403).json({ error: "No puedes pagar este pedido" });
        }
        if (order.estado !== "pendiente" || order.metodoPago !== "stripe") {
          return res.status(409).json({ error: "El pedido no esta disponible para pago" });
        }
        if (!Array.isArray(order.items) || order.items.length === 0 || order.items.length > 30) {
          return res.status(400).json({ error: "Pedido sin productos validos" });
        }

        const lineItems = [];
        let subtotal = 0;

        for (const item of order.items) {
          const productId = item?.product?.id;
          const quantity = Number(item?.quantity);

          if (!productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
            return res.status(400).json({ error: "Producto invalido en el pedido" });
          }

          const productSnap = await db.collection("productos").doc(productId).get();
          if (!productSnap.exists) {
            return res.status(400).json({ error: "Producto no encontrado" });
          }

          const product = productSnap.data();
          const stock = Number(product.stock || 0);
          const talla = item?.talla;
          const sizeStock = getSizeStock(product, talla);
          const price = Number(product.precio || 0);

          if (price <= 0 || stock < quantity || sizeStock < quantity) {
            return res.status(409).json({ error: "Stock o precio invalido" });
          }

          subtotal += price * quantity;
          lineItems.push({
            price_data: {
              currency: "pen",
              product_data: {
                name: product.nombre,
                images: validStripeImage(product.imagen),
              },
              unit_amount: toCents(price),
            },
            quantity,
          });
        }

        const envio = Number(order.envio || 0);
        const total = subtotal + envio;
        if (
          Math.abs(Number(order.subtotal || 0) - subtotal) > 0.01
          || Math.abs(Number(order.total || 0) - total) > 0.01
        ) {
          return res.status(409).json({ error: "Los totales del pedido no coinciden" });
        }

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

        const appUrl =
          process.env.APP_URL || "https://calzaturavilchez-ab17f.web.app";

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: lineItems,
          mode: "payment",
          success_url: `${appUrl}/pedido-exitoso/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl}/checkout`,
          metadata: { orderId, userId: decodedToken.uid },
        });

        await orderRef.update({ stripeSessionId: session.id });

        return res.status(200).json({ sessionId: session.id });
      } catch (error) {
        console.error("Stripe error:", error);
        return res.status(error.status || 500).json({ error: publicError(error) });
      }
    });
  }
);

exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const stripe = require("stripe")(STRIPE_SECRET.value());
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
        const db = admin.firestore();
        const orderRef = db.collection("pedidos").doc(orderId);
        const orderSnap = await orderRef.get();
        const order = orderSnap.exists ? orderSnap.data() : null;
        if (order && order.estado !== "pagado") {
          await discountOrderStock(db, order);
        }
        await orderRef.update({
          estado: "pagado",
          stripeSessionId: session.id,
        });
      }
    }

    res.json({ received: true });
  }
);

exports.confirmCodOrder = onRequest(
  {},
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Metodo no permitido" });
      }
      try {
        const decodedToken = await verifyFirebaseUser(req);
        const { orderId } = req.body;

        if (!orderId || typeof orderId !== "string") {
          return res.status(400).json({ error: "Pedido invalido" });
        }

        const db = admin.firestore();
        const orderRef = db.collection("pedidos").doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
          return res.status(404).json({ error: "Pedido no encontrado" });
        }

        const order = orderSnap.data();
        if (order.userId !== decodedToken.uid) {
          return res.status(403).json({ error: "No puedes confirmar este pedido" });
        }
        if (order.estado !== "pendiente" || order.metodoPago !== "contraentrega") {
          return res.status(409).json({ error: "El pedido no esta disponible para confirmar" });
        }
        if (!Array.isArray(order.items) || order.items.length === 0 || order.items.length > 30) {
          return res.status(400).json({ error: "Pedido sin productos validos" });
        }

        let subtotal = 0;
        for (const item of order.items) {
          const productId = item?.product?.id;
          const quantity = Number(item?.quantity);
          if (!productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
            return res.status(400).json({ error: "Producto invalido en el pedido" });
          }
          const productSnap = await db.collection("productos").doc(productId).get();
          if (!productSnap.exists) {
            return res.status(400).json({ error: "Producto no encontrado" });
          }
          const product = productSnap.data();
          const talla = item?.talla;
          const sizeStock = getSizeStock(product, talla);
          const price = Number(product.precio || 0);
          const stock = Number(product.stock || 0);
          if (price <= 0 || stock < quantity || sizeStock < quantity) {
            return res.status(409).json({ error: "Stock o precio invalido" });
          }
          subtotal += price * quantity;
        }

        const envio = Number(order.envio || 0);
        const total = subtotal + envio;
        if (
          Math.abs(Number(order.subtotal || 0) - subtotal) > 0.01
          || Math.abs(Number(order.total || 0) - total) > 0.01
        ) {
          return res.status(409).json({ error: "Los totales del pedido no coinciden" });
        }

        await orderRef.update({ estado: "confirmado" });
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error("COD confirm error:", error);
        return res.status(error.status || 500).json({ error: publicError(error) });
      }
    });
  }
);
