#!/usr/bin/env node
/**
 * Valida secrets de deploy sin usar `if: secrets.*` (no permitido en GHA)
 * ni `test -n` en bash (JSON multilinea de FIREBASE_SERVICE_ACCOUNT rompe el shell).
 */
const required = [
  ["FIREBASE_SERVICE_ACCOUNT", "FIREBASE_SERVICE_ACCOUNT"],
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_URL"],
  ["VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"],
  ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_API_KEY"],
  ["VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_AUTH_DOMAIN"],
  ["VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID"],
  ["VITE_FIREBASE_MESSAGING_SENDER_ID", "VITE_FIREBASE_MESSAGING_SENDER_ID"],
  ["VITE_FIREBASE_APP_ID", "VITE_FIREBASE_APP_ID"],
  ["VITE_FIREBASE_APPCHECK_SITE_KEY", "VITE_FIREBASE_APPCHECK_SITE_KEY"],
  ["VITE_BACKEND_API_URL", "VITE_BACKEND_API_URL"],
  ["VITE_STRIPE_PUBLIC_KEY", "VITE_STRIPE_PUBLIC_KEY"],
  ["VITE_DNI_LOOKUP_URL", "VITE_DNI_LOOKUP_URL"],
  ["VITE_AI_SERVICE_URL", "VITE_AI_SERVICE_URL"],
  ["VITE_AI_ADMIN_PROXY_URL", "VITE_AI_ADMIN_PROXY_URL"],
  ["VITE_CLOUDINARY_CLOUD_NAME", "VITE_CLOUDINARY_CLOUD_NAME"],
  ["VITE_CLOUDINARY_UPLOAD_PRESET", "VITE_CLOUDINARY_UPLOAD_PRESET"],
  ["RENDER_BFF_DEPLOY_HOOK_URL", "RENDER_BFF_DEPLOY_HOOK_URL"],
];

for (const [envKey, label] of required) {
  const value = process.env[envKey]?.trim();
  if (!value) {
    console.error(`::error::Falta ${label} en GitHub -> Settings -> Secrets -> Actions.`);
    if (envKey === "FIREBASE_SERVICE_ACCOUNT") {
      console.error(
        "Firebase Console -> Configuracion del proyecto -> Cuentas de servicio -> Generar clave privada -> pegar el JSON completo.",
      );
    }
    if (envKey === "RENDER_BFF_DEPLOY_HOOK_URL") {
      console.error("Render -> servicio BFF -> Settings -> Deploy Hook -> copiar URL -> GitHub Secrets.");
    }
    process.exit(1);
  }
}

console.log("Secrets de produccion OK: build, BFF y deploy.");
