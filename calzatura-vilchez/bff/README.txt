Calzatura Vilchez — BFF Express (alternativa a Cloud Functions sin plan Blaze)

Rutas (igual que antes en Firebase):
  POST /authLogin
  POST /createOrder
  POST /createCheckoutSession
  POST /stripeWebhook
  POST /confirmCodOrder     (410 — retirado; stock COD en createOrder)
  GET  /myOrders
  GET  /orders/:orderId
  GET  /admin/orders
  GET  /admin/users
  GET  /admin/productFinanzas
  GET  /admin/products
  GET  /admin/products/:productId
  GET  /users/me
  PUT  /users/me
  PATCH /users/me
  PATCH /admin/users/:uid/role
  DELETE /admin/users/:uid
  ALL  /favorites
  ALL  /aiAdminProxy
  GET  /delivery/geocode   (Nominatim)
  GET  /delivery/reverse
  GET  /delivery/route      (Google Directions si GOOGLE_MAPS_API_KEY; si no, ORS → OSRM)
  GET  /delivery/distance   (misma prioridad que /delivery/route)
  ALL  /ors/*   (proxy OpenRouteService legado; opcional)
  GET  /health

Despliegue ejemplo (Render.com):
  1. Nuevo "Web Service", conectar repo, root: calzatura-vilchez/bff
  2. Build: npm install   Start: npm start
  3. Copiar variables desde env.example (valores reales desde Firebase Console, Supabase, Stripe)
     Para checkout con ruta y tarifa de envío: GOOGLE_MAPS_API_KEY (Directions API en Google Cloud)
     Respaldo opcional: ORS_API_KEY
  4. En Stripe Dashboard → Webhooks, apuntar a https://TU-SERVICIO.onrender.com/stripeWebhook
  5. En el build del frontend (Firebase Hosting u otro), definir:
       VITE_BACKEND_API_URL=https://TU-SERVICIO.onrender.com
     Opcional: VITE_AUTH_PROXY_LOGIN_URL si el login BFF vive en otra URL.
     Desactivar proxy de login con VITE_AUTH_PROXY_LOGIN_URL=0

Seguridad (Resend + Upstash, solo servidor):
  Rate limits y contadores de abuso compartidos entre réplicas si defines
  UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.
  Superficies: libro-reclamaciones, authLogin, lookup-dni, check-email, ors/*, delivery/*.
  Arranque: auditoría de config; GET /health/security para diagnóstico.
  Variables: env.example (SECURITY_*, UPSTASH_*, rate limits).
  Redeploy del BFF en Render tras cambios (no basta Firebase Hosting).

Nota Firebase Admin (Render suele truncar JSON largo en variables):
  - Preferido: Secret File en Render + FIREBASE_SERVICE_ACCOUNT_FILE=/etc/secrets/<nombre>.json
  - Alternativa: FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 (ver env.example)
  - Último recurso: FIREBASE_SERVICE_ACCOUNT_JSON en una sola línea (JSON minificado completo desde { hasta })
