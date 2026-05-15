Calzatura Vilchez — BFF Express (alternativa a Cloud Functions sin plan Blaze)

Rutas (igual que antes en Firebase):
  POST /authLogin
  POST /createOrder
  POST /createCheckoutSession
  POST /stripeWebhook
  POST /confirmCodOrder
  ALL  /favorites
  ALL  /aiAdminProxy
  ALL  /ors/*   (proxy OpenRouteService; ORS_API_KEY solo en servidor)
  GET  /health

Despliegue ejemplo (Render.com):
  1. Nuevo "Web Service", conectar repo, root: calzatura-vilchez/bff
  2. Build: npm install   Start: npm start
  3. Copiar variables desde env.example (valores reales desde Firebase Console, Supabase, Stripe)
     Para checkout con ruta en mapa: ORS_API_KEY (misma clave que OpenRouteService)
  4. En Stripe Dashboard → Webhooks, apuntar a https://TU-SERVICIO.onrender.com/stripeWebhook
  5. En el build del frontend (Firebase Hosting u otro), definir:
       VITE_BACKEND_API_URL=https://TU-SERVICIO.onrender.com
     Opcional: VITE_AUTH_PROXY_LOGIN_URL si el login BFF vive en otra URL.
     Desactivar proxy de login con VITE_AUTH_PROXY_LOGIN_URL=0

Nota Firebase Admin (Render suele truncar JSON largo en variables):
  - Preferido: Secret File en Render + FIREBASE_SERVICE_ACCOUNT_FILE=/etc/secrets/<nombre>.json
  - Alternativa: FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 (ver env.example)
  - Último recurso: FIREBASE_SERVICE_ACCOUNT_JSON en una sola línea (JSON minificado completo desde { hasta })
