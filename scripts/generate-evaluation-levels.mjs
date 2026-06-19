#!/usr/bin/env node
/**
 * Genera dashboard-iso25000/evaluation-levels.json — Nivel 2 (casos de prueba) y Nivel 3 (evidencias).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));

/** @type {Record<string, { nivel2: Array<{codigo:string, prueba:string, cumple:boolean, referencia?:string}>, nivel3: Array<{codigo:string, prueba:string, evidencia:string}> }>} */
const LEVELS_BY_SUB = {
  Idoneidad: {
    nivel2: [
      { codigo: "TC-IDON-001", prueba: "Recorrido integrador compra Must", cumple: true, referencia: "e2e/idoneidad-journey.spec.ts" },
      { codigo: "TC-AUT-REG-001", prueba: "Registro usuario válido", cumple: true, referencia: "e2e/register-validation.spec.ts" },
    ],
    nivel3: [{ codigo: "EV-IDON", prueba: "Matriz CU-T07 + gate idoneidad", evidencia: "documentacion/idoneidad-trazabilidad-iso25000.md" }],
  },
  Precisión: {
    nivel2: [{ codigo: "TC-PREC-ALL", prueba: "9 dominios de cálculo Vitest", cumple: true, referencia: "scripts/verify-precision-iso25000.mjs" }],
    nivel3: [{ codigo: "EV-PREC", prueba: "Trazabilidad precisión", evidencia: "documentacion/precision-trazabilidad-iso25000.md" }],
  },
  "Cumplimiento de la funcionalidad": {
    nivel2: [
      { codigo: "TC-CMP-001", prueba: "Libro de reclamaciones", cumple: true, referencia: "e2e/legal-pages.spec.ts" },
      { codigo: "TC-CMP-002", prueba: "Privacidad Ley 29733", cumple: true, referencia: "privacidad.json" },
    ],
    nivel3: [{ codigo: "EV-CMP", prueba: "CU-T05 / CU-T06", evidencia: "documentacion/cumplimiento-trazabilidad-iso25000.md" }],
  },
  Coexistencia: {
    nivel2: [
      { codigo: "TC-INT-003", prueba: "IA en dominio separado", cumple: true, referencia: "documentacion/10-operacion-y-mantenimiento.md" },
      { codigo: "TC-INT-004", prueba: "Stripe + BFF checkout", cumple: true, referencia: "bff/server.cjs" },
    ],
    nivel3: [{ codigo: "EV-COEX", prueba: "Despliegue multi-servicio", evidencia: "Firebase + Supabase + Stripe + Render IA" }],
  },
  Madurez: {
    nivel2: [{ codigo: "TC-CI-001", prueba: "Workflows CI en success", cumple: true, referencia: "scripts/verify-madurez-iso25000.mjs" }],
    nivel3: [{ codigo: "EV-MAD", prueba: "Historial GitHub Actions", evidencia: ".github/workflows/ci.yml" }],
  },
  "Tolerancia a Fallos": {
    nivel2: [{ codigo: "TC-CHK-ERR-001", prueba: "Errores checkout/admin", cumple: true, referencia: "e2e/checkout-cod-order.spec.ts" }],
    nivel3: [{ codigo: "EV-TF", prueba: "Error boundaries + idempotencia Stripe", evidencia: "documentacion/08-pruebas-y-calidad.md" }],
  },
  "Capacidad de Recuperación": {
    nivel2: [{ codigo: "TC-DR-001", prueba: "Restore drill fixture", cumple: true, referencia: "scripts/restore-drill-check.mjs" }],
    nivel3: [{ codigo: "EV-REC", prueba: "Runbook DR", evidencia: "docs/ops/runbook-recuperacion-desastres.md" }],
  },
  "Cumplimiento de Fiabilidad": {
    nivel2: [
      { codigo: "TC-K6-SMOKE", prueba: "k6 smoke BFF", cumple: true, referencia: "docs/ops/k6-smoke-evidence.json" },
      { codigo: "TC-K6-1000", prueba: "k6 mixed1000 BFF", cumple: true, referencia: "docs/ops/k6-mixed1000-bff-evidence.json" },
    ],
    nivel3: [{ codigo: "EV-FIA", prueba: "Evidencia carga archivada", evidencia: "artifacts/load-tests/" }],
  },
  Interoperabilidad: {
    nivel2: [
      { codigo: "TC-INT-001", prueba: "BFF ↔ Supabase pedido COD", cumple: true, referencia: "e2e/checkout-cod-order.spec.ts" },
      { codigo: "TC-INT-002", prueba: "Stripe Checkout", cumple: true, referencia: "e2e/checkout-stripe.spec.ts" },
      { codigo: "TC-INT-003", prueba: "Servicio IA", cumple: true, referencia: "e2e/admin-predictions.spec.ts" },
      { codigo: "TC-INT-004", prueba: "APISPERU DNI", cumple: true, referencia: "e2e/register-validation.spec.ts" },
      { codigo: "TC-INT-005", prueba: "Firebase ↔ Supabase perfil", cumple: true, referencia: "e2e/profile-save.spec.ts" },
    ],
    nivel3: [{ codigo: "EV-INT", prueba: "Gate interoperabilidad", evidencia: "documentacion/interoperabilidad-trazabilidad-iso25000.md" }],
  },
  Seguridad: {
    nivel2: [
      { codigo: "PT-RLS-01", prueba: "Contrato RLS migraciones", cumple: true, referencia: "scripts/validate-supabase-rls-matrix.mjs" },
      { codigo: "TC-SEG-001", prueba: "Rutas /admin/* sin sesión", cumple: true, referencia: "e2e/seguridad-access-guards.spec.ts" },
      { codigo: "TC-SEG-004", prueba: "BFF admin fail-closed", cumple: true, referencia: "bffAuditEndpointPolicy.test.js" },
      { codigo: "TC-SEG-005", prueba: "ZAP producción v2", cumple: true, referencia: "securityZapProduction.guard.test.js" },
      { codigo: "TC-NR-001", prueba: "Firma PKCS#7 al crear pedido", cumple: true, referencia: "orderNonRepudiation.test.js" },
      { codigo: "TC-AUD-001", prueba: "Auditoría admin trazable", cumple: true, referencia: "e2e/admin-audit-trail.spec.ts" },
    ],
    nivel3: [
      { codigo: "EV-SEC", prueba: "Trazabilidad seguridad", evidencia: "documentacion/seguridad-trazabilidad-iso25000.md" },
      { codigo: "EV-SEC-NR", prueba: "Migración columnas nr*", evidencia: "supabase/migrations/20260616120000_pedidos_pkcs7_non_repudiation.sql" },
    ],
  },
  Adaptabilidad: {
    nivel2: [
      { codigo: "TC-UI-001", prueba: "Responsive móvil/tablet/escritorio (FAd-3 web)", cumple: true, referencia: "playwright.config.ts" },
      { codigo: "TC-MAN-BRW-002", prueba: "Flujo tienda Firefox (FAd-3)", cumple: true, referencia: "e2e/idoneidad-journey.spec.ts · firefox" },
      { codigo: "TC-MAN-BRW-003", prueba: "Safari web / iPhone Safari (FAd-3)", cumple: true, referencia: "e2e/browser-matrix.spec.ts · webkit · iphone-safari" },
      { codigo: "FAd-2-AND", prueba: "SO Android — APK funcional", cumple: true, referencia: "artifacts/apk/" },
      { codigo: "FAd-2-IOS", prueba: "SO iOS nativo — IPA", cumple: false, referencia: "portabilidad-mapeo-iso25023.md §3 ítems 5/7" },
    ],
    nivel3: [
      { codigo: "PT01", prueba: "Instalación Windows 10 (Docker)", evidencia: "DOCKER.md" },
      { codigo: "PT-IOS", prueba: "Brecha iOS documentada", evidencia: "portabilidad-mapeo-iso25023.md §1 E-IOS" },
    ],
  },
  "Facilidad de Instalación": {
    nivel2: [
      { codigo: "TC-DOCKER-001", prueba: "docker-compose 3 servicios (FIn web)", cumple: true, referencia: "docker-compose.yml" },
      { codigo: "FIn-AND", prueba: "Instalación APK Android", cumple: true, referencia: "checklist ítem 7" },
      { codigo: "FIn-IOS", prueba: "Instalación IPA iOS", cumple: false, referencia: "checklist ítem 8 · Codemagic" },
    ],
    nivel3: [
      { codigo: "PT01", prueba: "Instalación entorno limpio", evidencia: "Tiempo promedio ~2–3 min registrado" },
      { codigo: "PT02", prueba: "Instalación Windows 11", evidencia: "documentacion/08-pruebas-y-calidad.md" },
    ],
  },
  Pruebabilidad: {
    nivel2: [{ codigo: "TC-COV-001", prueba: "Cobertura Vitest dominios críticos", cumple: false, referencia: "calzatura-vilchez/coverage/lcov.info" }],
    nivel3: [{ codigo: "EV-PRU", prueba: "Meta cobertura 60%", evidencia: "npm run test:coverage en calzatura-vilchez" }],
  },
  Intercambiabilidad: {
    nivel2: [
      { codigo: "TC-REP-001", prueba: "Sustituye ventas manuales", cumple: true, referencia: "e2e/checkout-cod-order.spec.ts · checkout-stripe.spec.ts" },
      { codigo: "TC-REP-002", prueba: "URL IA web (VITE_*) y Android (AI_SERVICE_URL)", cumple: true, referencia: "calzatura-vilchez/.env.example · calzatura-vilchez-mobile/.env.example · codemagic.yaml" },
      { codigo: "TC-REP-003", prueba: "Contrato HTTP + compatibilidad Supabase/JSON", cumple: true, referencia: "docs/04-api/api-referencia.md §2.0 · test_api_contract.py" },
    ],
    nivel3: [
      { codigo: "EV-REP", prueba: "Gate intercambiabilidad", evidencia: "scripts/verify-intercambiabilidad-iso25000.mjs" },
      { codigo: "PT04", prueba: "Validación dueño negocio", evidencia: "Acta / minuta validación procesos" },
    ],
  },
};

const levels = {};
for (const char of DATA.characteristics) {
  for (const sub of char.subcharacteristics) {
    const block = LEVELS_BY_SUB[sub.name];
    levels[sub.name] = block ?? {
      nivel2: [],
      nivel3: [{ codigo: "EV-DOC", prueba: "Evidencia documental", evidencia: sub.evidence?.slice(0, 120) || "—" }],
    };
  }
}

const out = {
  meta: {
    descripcion: "Nivel 2: casos de prueba · Nivel 3: capturas y actas",
    generado: DATA.meta.generatedAt,
    proyecto: DATA.meta.project,
  },
  levels,
};

fs.writeFileSync(
  path.join(ROOT, "dashboard-iso25000/evaluation-levels.json"),
  JSON.stringify(out, null, 2) + "\n",
  "utf8",
);
console.log(`OK: ${Object.keys(levels).length} bloques de evaluación → dashboard-iso25000/evaluation-levels.json`);
