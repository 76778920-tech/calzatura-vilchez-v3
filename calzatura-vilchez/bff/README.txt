Calzatura Vilchez — BFF Express (alternativa a Cloud Functions sin plan Blaze)

Rutas (igual que antes en Firebase):
  POST /authLogin
  POST /createOrder
  POST /createCheckoutSession
  POST /stripeWebhook
  POST /confirmCodOrder
  ALL  /favorites
  ALL  /aiAdminProxy
  GET  /health

Despliegue ejemplo (Render.com):
  1. Nuevo "Web Service", conectar repo, root: calzatura-vilchez/bff
  2. Build: npm install   Start: npm start
  3. Copiar variables desde env.example (valores reales desde Firebase Console, Supabase, Stripe)
  4. En Stripe Dashboard → Webhooks, apuntar a https://TU-SERVICIO.onrender.com/stripeWebhook
  5. En el build del frontend (Firebase Hosting u otro), definir:
       VITE_BACKEND_API_URL=https://TU-SERVICIO.onrender.com
     Opcional: VITE_AUTH_PROXY_LOGIN_URL si el login BFF vive en otra URL.
     Desactivar proxy de login con VITE_AUTH_PROXY_LOGIN_URL=0

Nota: FIREBASE_SERVICE_ACCOUNT_JSON es el JSON de cuenta de servicio descargado desde
Firebase → Project settings → Service accounts.
