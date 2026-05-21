#!/usr/bin/env node
/**
 * Valida secrets de deploy Firebase/Vite sin usar `if: secrets.*` (no permitido en GHA)
 * ni `test -n` en bash (JSON multilínea de FIREBASE_SERVICE_ACCOUNT rompe el shell).
 */
const required = [
  ["FIREBASE_SERVICE_ACCOUNT", "FIREBASE_SERVICE_ACCOUNT"],
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_URL"],
  ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_API_KEY"],
  ["VITE_FIREBASE_APPCHECK_SITE_KEY", "VITE_FIREBASE_APPCHECK_SITE_KEY"],
];

for (const [envKey, label] of required) {
  const value = process.env[envKey]?.trim();
  if (!value) {
    console.error(`::error::Falta ${label} en GitHub → Settings → Secrets → Actions.`);
    if (envKey === "FIREBASE_SERVICE_ACCOUNT") {
      console.error(
        "Firebase Console → Configuración del proyecto → Cuentas de servicio → Generar clave privada → pegar el JSON completo.",
      );
    }
    process.exit(1);
  }
}

console.log("Secrets Firebase OK — build y deploy.");
