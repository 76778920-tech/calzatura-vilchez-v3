Login proxy en Vercel (gratis, serverless)

1. Cuenta en https://vercel.com — Import Project — root: calzatura-vilchez (carpeta del repo donde está package.json + api/).
2. Framework: Vite (autodetect). Build: npm run build. Output: dist (vercel.json ya lo fija).
3. Environment Variables (Production + Preview si quieres):
   - FIREBASE_SERVICE_ACCOUNT_JSON = JSON minificado de la cuenta de servicio Firebase
   - FIREBASE_WEB_API_KEY = misma clave web del proyecto
   - ALLOWED_ORIGINS = opcional, orígenes extra separados por coma
4. Deploy. La URL del proxy será:
   https://<tu-proyecto>.vercel.app/api/auth-login
5. En el build del frontend:
   VITE_AUTH_PROXY_LOGIN_URL=https://<tu-proyecto>.vercel.app/api/auth-login
   (Sigue usando VITE_BACKEND_API_URL para pedidos/Stripe si ese BFF está en otro sitio.)

Nota: el rate limit por IP en serverless es best-effort (cada instancia tiene su memoria). Para pedidos/Stripe sigue haciendo falta el BFF completo (Render/Oracle) o otro host.
