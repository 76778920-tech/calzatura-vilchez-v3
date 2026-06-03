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
  ["VITE_GOOGLE_MAPS_API_KEY", "VITE_GOOGLE_MAPS_API_KEY"],
  ["VITE_STRIPE_PUBLIC_KEY", "VITE_STRIPE_PUBLIC_KEY"],
  ["VITE_DNI_LOOKUP_URL", "VITE_DNI_LOOKUP_URL"],
  ["VITE_AI_SERVICE_URL", "VITE_AI_SERVICE_URL"],
  ["VITE_AI_ADMIN_PROXY_URL", "VITE_AI_ADMIN_PROXY_URL"],
  ["VITE_CLOUDINARY_CLOUD_NAME", "VITE_CLOUDINARY_CLOUD_NAME"],
  ["VITE_CLOUDINARY_UPLOAD_PRESET", "VITE_CLOUDINARY_UPLOAD_PRESET"],
  ["RENDER_BFF_DEPLOY_HOOK_URL", "RENDER_BFF_DEPLOY_HOOK_URL"],
];

const PLACEHOLDER_PATTERNS = [
  /ci-placeholder/i,
  /placeholder/i,
  /example/i,
  /changeme/i,
  /dummy/i,
  /test[-_]?key/i,
];

function assertNotPlaceholder(envKey, value) {
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(value)) {
      console.error(`::error::${envKey} parece valor de prueba/placeholder (${value}).`);
      process.exit(1);
    }
  }
}

function assertHttpsUrl(envKey, value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      throw new Error("Protocol must be https");
    }
  } catch {
    console.error(`::error::${envKey} debe ser URL https válida.`);
    process.exit(1);
  }
}

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

  if (envKey !== "FIREBASE_SERVICE_ACCOUNT") {
    assertNotPlaceholder(envKey, value);
  }

  if (envKey.endsWith("_URL")) {
    assertHttpsUrl(envKey, value);
  }
}

try {
  const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (!svc?.project_id || !svc?.client_email || !svc?.private_key) {
    throw new Error("Missing required JSON fields");
  }
} catch {
  console.error("::error::FIREBASE_SERVICE_ACCOUNT no es un JSON válido de Service Account.");
  process.exit(1);
}

console.log("Secrets de produccion OK: build, BFF y deploy.");
