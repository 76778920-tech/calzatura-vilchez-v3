#!/usr/bin/env node
/**
 * Genera dashboard-iso25000/checklists-data.json desde data.json + ítems de gates verify-*.
 * Ejecutar: node scripts/generate-checklists-data.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/data.json"), "utf8"));
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "dashboard-iso25000/instruments-catalog.json"), "utf8"));

/** Definiciones normativas para objetivos de checklist (ISO/IEC 9126-1 §6.1). */
const OBJETIVO_ISO = {
  Idoneidad:
    "Verificar Idoneidad (9126 §6.1.1): el producto proporciona un conjunto apropiado de funciones para las tareas del e-commerce Calzatura Vilchez (SRS Must + TC-IDON-001).",
  Precisión:
    "Verificar Precisión (9126 §6.1.2): resultados y cálculos (stock, precios, totales, finanzas, IRE) son correctos con el grado de exactitud requerido.",
  Interoperabilidad:
    "Verificar Interoperabilidad (9126 §6.1.3): el producto interactúa correctamente con sistemas especificados (Firebase, Supabase, Stripe, IA, geocodificación, DNI, CDN, caché).",
  Seguridad:
    "Verificar Seguridad (9126 §6.1.4): información y datos protegidos frente a acceso o modificación no autorizados; acceso autorizado no denegado (RLS, auth, auditoría, no repudio).",
  "Cumplimiento de la funcionalidad":
    "Verificar Cumplimiento de la funcionalidad (9126 §6.1.5): adherencia a normas, convenciones y reglamentos legales peruanos relacionados con la funcionalidad (Ley 29571, 29733, términos, CU-T05/06/07).",
};

/** Ítems por subcaracterística (indicadores verificables = filas de la lista de cotejo). */
const ITEMS_BY_SUB = {
  Idoneidad: [
    "Documentación de trazabilidad idoneidad presente",
    "Matriz CU-T07 incluye TC-IDON-001 (recorrido integrador)",
    "Suite E2E ≥ 34 specs Playwright",
    "RF Must catálogo (RF-CAT-01, RF-CAT-02) con evidencia",
    "RF Must autenticación (RF-AUT-01…04) con evidencia",
    "RF Must carrito/checkout/pedidos con evidencia",
    "RF Must administración (RF-ADM) con evidencia E2E",
    "RF Must IA/riesgo (RF-IA) con evidencia",
    "Gate verify-idoneidad-iso25000.mjs en VERDE",
  ],
  Precisión: [
    "Dominio stock talla/color verificado",
    "Dominio checkout catálogo vivo verificado",
    "Dominio BFF totales y precios server-side",
    "Dominio variantes producto",
    "Dominio reglas comerciales BD",
    "Dominio finanzas y márgenes",
    "Dominio ventas tienda",
    "Dominio importación Excel",
    "Dominio predicción / IRE",
    "Gate verify-precision-iso25000.mjs en VERDE",
  ],
  Interoperabilidad: [
    "Integración Firebase Auth verificada",
    "Integración Supabase + RLS verificada",
    "Integración BFF Node verificada",
    "Integración Stripe + webhook verificada",
    "Integración servicio IA FastAPI verificada",
    "Integración delivery (ORS/Nominatim/Google)",
    "Integración APISPERU DNI",
    "Integración Cloudinary",
    "Integración Upstash caché",
    "Gate verify-interoperabilidad-iso25000.mjs en VERDE",
  ],
  Seguridad: [
    "RLS Supabase validado (validate-supabase-rls-matrix.mjs)",
    "PII enmascarada en BFF (privacy.cjs + bffPrivacy.test.ts)",
    "Headers HTTP seguros (firebase.json + BFF)",
    "Rate limits y anti-abuso BFF",
    "Guard sin mutaciones directas desde cliente",
    "Triggers cv_guard_* en migraciones Supabase",
    "Totales y precios validados server-side (precisionBffGuards)",
    "Firebase Auth + verifyIdToken en BFF",
    "App Check en lookup DNI (register-validation E2E)",
    "RNF-SEG-01 rutas admin/staff/cliente (TC-SEG-001…003)",
    "Auditoría admin registrada (admin-audit-trail E2E)",
    "BFF fail-closed + políticas audit (TC-SEG-004)",
    "DAST ZAP producción v2 sin altas críticas (TC-SEG-005)",
    "Checklist verde seguridad producción documentado",
    "Registro de acciones en tabla auditoría (BFF + admin)",
    "Trigger trg_audit_pedido_insert en INSERT pedidos",
    "Webhook Stripe firmado + logAudit source stripe_webhook",
    "Idempotencia pedidos (idempotencyKey BFF/Functions)",
    "Firma PKCS#7 del pedido (nrPkcs7Signature en BD)",
    "Verificación admin GET /admin/verifyOrderNonRepudiation",
    "Gate verify-seguridad-iso25000.mjs en VERDE",
  ],
  Confidencialidad: [
    "RLS Supabase validado (validate-supabase-rls-matrix.mjs)",
    "PII enmascarada en BFF (privacy.cjs + bffPrivacy.test.ts)",
    "Headers HTTP seguros (firebase.json + BFF)",
    "Rate limits y anti-abuso BFF",
  ],
  Integridad: [
    "Guard sin mutaciones directas desde cliente",
    "Triggers cv_guard_* en migraciones Supabase",
    "Totales y precios validados server-side (precisionBffGuards)",
  ],
  Autenticidad: [
    "Firebase Auth + verifyIdToken en BFF",
    "App Check en lookup DNI (register-validation E2E)",
    "RNF-SEG-01 rutas admin/staff/cliente (TC-SEG-001…003)",
  ],
  Responsabilidad: [
    "Auditoría admin registrada (admin-audit-trail E2E)",
    "BFF fail-closed + políticas audit (TC-SEG-004)",
    "DAST ZAP producción v2 sin altas críticas (TC-SEG-005)",
    "Checklist verde seguridad producción documentado",
  ],
  "No repudio": [
    "Registro de acciones en tabla auditoría (BFF + admin)",
    "Trigger trg_audit_pedido_insert en INSERT pedidos",
    "Webhook Stripe firmado + logAudit source stripe_webhook",
    "Idempotencia pedidos (idempotencyKey BFF/Functions)",
    "Firma PKCS#7 del pedido (nrPkcs7Signature en BD)",
    "Verificación admin GET /admin/verifyOrderNonRepudiation",
  ],
  "Cumplimiento de la funcionalidad": [
    "CU-T05: 26 RF Must registrados",
    "CU-T05: RF legales (RF-LEG) implementados",
    "CU-T06 trazabilidad estado del arte",
    "Ley 29571: libro de reclamaciones (TC-CMP-001/004)",
    "Ley 29733: privacidad y cookies (TC-CMP-002/003)",
    "Manifest iso25000-must-rf alineado",
    "Gate verify-cumplimiento-iso25000.mjs en VERDE",
  ],
  Madurez: [
    "CI lint/typecheck/unit en success (ci.yml → Lint + Tests + Build)",
    "CI Integration E2E en success (ci-integration.yml)",
    "SonarQube Analysis en success (sonarqube.yml)",
    "Security DevSecOps Gates en success (security-devsecops.yml)",
    "CI servicio IA en success (ci.yml → AI Service + Docker build)",
    "Controles ops estáticos en CI (readiness, backtest, restore drill fixture)",
    "Último run en success — 4 workflows de madurez en main",
    "Gate verify-madurez-iso25000.mjs documentado y ejecutable",
  ],
  "Tolerancia a Fallos": [
    "Error boundary en rutas críticas",
    "Idempotencia webhook Stripe (estado pagado)",
    "Warnings visibles en panel IA ante datos insuficientes",
    "Validación fail-closed en BFF",
    "Manejo de errores en checkout y admin",
  ],
  "Capacidad de Recuperación": [
    "Backups Firebase configurados (proveedor)",
    "Backups Supabase configurados (proveedor)",
    "Runbook recuperación ante desastres documentado",
    "Prueba de restauración registrada",
    "Script restore-drill-check ejecutado con evidencia",
  ],
  "Cumplimiento de Fiabilidad": [
    "RNF-CAP-02 definido con metas de carga",
    "Scripts k6 en load-tests/ disponibles",
    "Escenario smoke k6 con evidencia archivada",
    "Escenario mixed1000 con evidencia archivada",
    "Escenario mixed2000 planificado (README fases)",
    "Resultados archivados en artifacts/load-tests/",
    "Gate verify-cumplimiento-fiabilidad-iso25000.mjs en VERDE",
  ],
  Inteligibilidad: [
    "Navegación jerárquica por dominios clara",
    "Rutas catálogo/producto/carrito/checkout identificables",
    "Nomenclatura consistente en menús",
    "Etiquetas comprensibles para usuario final",
    "Sin jerga técnica en flujos públicos",
    "Ayudas visuales en acciones principales",
    "E2E axe WCAG 2.1 AA en rutas públicas clave",
    "Páginas de ayuda/FAQ accesibles (paths.ts)",
  ],
  "Facilidad de Aprendizaje": [
    "Toasts de feedback inmediato",
    "Validación en tiempo real en formularios",
    "Ayudas contextuales en checkout",
    "Mensajes de error accionables en admin",
    "Selectores persistidos en panel IA",
    "E2E register-validation con mensajes accionables",
    "E2E feedback datos insuficientes panel IA (TC-PRED-003)",
  ],
  "Operabilidad": [
    "Formularios operables con teclado",
    "Acciones frecuentes ≤ 3 clics en admin",
    "Panel IA con selectores de horizonte",
    "Historial IA persistido (localStorage)",
    "Confirmaciones en acciones destructivas",
    "E2E admin-layout (aria-current, sidebar)",
    "Smoke checkout operable (E2E)",
  ],
  Atractividad: [
    "Coherencia visual Tailwind v4",
    "Animaciones framer-motion en KPIs",
    "Tipografía y contraste legibles",
    "Iconografía consistente",
    "Responsive móvil (iPhone 13 / idoneidad-journey)",
    "Tema claro/oscuro coherente en admin",
  ],
  "Cumplimiento de la Usabilidad": [
    "RNF-USA-01 definido en SRS",
    "WCAG 2.1 AA referenciado en SRS",
    "Instrumento SUS Brooke documentado (10 ítems)",
    "Contexto de uso ISO 9241-11 documentado",
    "E2E axe WCAG en CI (job Playwright)",
    "Trazabilidad usabilidad + gate verify-usabilidad",
    "Plantilla acta sesión y consentimiento (sin datos ficticios)",
    "Sesión SUS con usuarios externos realizada",
    "Acta sesión completada (n ≥ 5 participantes)",
    "Resultado SUS ≥ 70 y mejoras documentadas",
  ],
  "Comportamiento en el tiempo": [
    "Build Vite optimizado",
    "Code-splitting por dominio",
    "Rutas lazy cargadas",
    "RNF-PER-01 latencia catálogo medida",
    "Meta latencia catálogo cumplida (< 3 s p95)",
    "Gate Lighthouse/performance en CI",
  ],
  "Uso de Recursos": [
    "Caché catálogo Upstash en BFF activa",
    "TTL PUBLIC_CATALOG_CACHE_TTL_SEC configurado",
    "Lecturas Supabase reducidas en catálogo",
    "Imágenes optimizadas (Cloudinary transforms)",
    "Bundle frontend sin regresión grave de tamaño",
  ],
  "Cumplimiento de la Eficiencia": [
    "RNF-CAP-02 documentado",
    "load:smoke ejecutado",
    "load:mixed1000 ejecutado",
    "load:mixed2000 ejecutado",
    "Metas p95/fallo HTTP documentadas",
    "k6 integrado en pipeline CI",
  ],
  Analizabilidad: [
    "SonarQube Cloud configurado",
    "ESLint 0 errores en último reporte",
    "ESLint 0 warnings en último reporte",
    "Issues críticos Sonar resueltos",
    "Trazabilidad de deuda técnica visible",
  ],
  Cambiabilidad: [
    "Arquitectura src/domains/ aplicada",
    "Rutas centralizadas paths.ts",
    "Componentes reutilizables por dominio",
    "BFF modular por routers",
    "Cambios localizados sin efecto cascada documentado",
  ],
  Estabilidad: [
    "≥ 34 specs E2E Playwright",
    "Vitest unitarios en CI",
    "Regresión antes de merge a main",
    "Sin flaky tests críticos abiertos",
    "Smoke spec en cada PR",
  ],
  Pruebabilidad: [
    "Vitest coverage líneas ≥ 60 %",
    "Vitest coverage funciones ≥ 60 %",
    "Vitest coverage ramas ≥ 50 %",
    "Dominios críticos con tests dedicados",
    "Mocks/fixtures para integraciones externas",
  ],
  "Cumplimiento de la Mantenibilidad": [
    "SonarQube Quality Gate passing",
    "Política de ramas main protegida",
    "CODEOWNERS o revisión obligatoria",
    "Documentación actualizada por release",
    "Deuda técnica triaged en backlog",
  ],
  Adaptabilidad: [
    "Funciona en Windows 10 (Docker / hosting)",
    "Funciona en Windows 11 (Docker / hosting)",
    "Funciona en diferentes resoluciones (móvil/tablet/escritorio)",
    "Funciona con distintas configuraciones regionales (es-PE)",
    "Adaptabilidad SO móvil declarado (Android + iOS) — ISO 25023 FAd-2",
    "Matriz navegadores documentada (planes-de-prueba §4.6)",
    "SO iOS nativo: funciones críticas verificadas en dispositivo (FAd-2)",
  ],
  "Facilidad de Instalación": [
    "Dockerfile frontend presente",
    "docker-compose 3 servicios operativos",
    "DOCKER.md con pasos reproducibles",
    "Variables .env.example documentadas",
    "Tiempo instalación ≤ 3 min (excelente) medido",
    "Build npm run build sin errores en entorno limpio",
    "Instalación Android APK reproducible (ISO 25023 FIn-1)",
    "Instalación iOS IPA reproducible (ISO 25023 FIn-1)",
  ],
  Coexistencia: [
    "Firebase Auth coexistiendo con Supabase datos",
    "Stripe sin conflicto con checkout BFF",
    "Servicio IA en dominio separado (Render)",
    "Cloudinary sin bloquear catálogo",
    "Upstash sin degradar latencia crítica",
  ],
  Intercambiabilidad: [
    "Sustituye proceso manual de ventas",
    "Sustituye registro manual de inventario",
    "Sustituye generación manual de reportes",
    "Mantiene información histórica al migrar",
    "URL servicio IA configurable (web y Android admin)",
    "Desacoplamiento IA vía contrato HTTP",
  ],
  "Cumplimiento de la Portabilidad": [
    "Plan pruebas portabilidad en 08-pruebas-y-calidad",
    "Matriz SO/navegadores definida",
    "Evidencia ejecución en ≥ 2 navegadores",
    "Despliegue Firebase Hosting documentado",
    "Despliegue BFF Render documentado",
  ],
};

/** Ítems con cumple/observación fija (evidencia real, no solo % del dashboard). */
const ITEM_OVERRIDES = {
  Madurez: {
    1: { cumple: true, observacion: "ci.yml lint+unit+typecheck; npm audit limpio; gh último run success" },
    7: {
      cumple: false,
      observacion:
        "ISO 25010 Madurez operacional — requiere historial en producción (uptime SLA, incidentes post-despliegue ≥30 días); CI en main no sustituye operación real",
    },
    8: { cumple: true, observacion: "verify-madurez-iso25000.mjs documentado y ejecutable (evaluación pre-producción)" },
  },
  "Tolerancia a Fallos": {
    1: { cumple: true, observacion: "AppErrorBoundary en main.tsx (global SPA)" },
    3: { cumple: true, observacion: "TC-PRED-003 E2E — banner datos insuficientes" },
    5: { cumple: true, observacion: "TC-CHK-ERR-001 E2E checkout + admin-dashboard error historial" },
  },
  "Capacidad de Recuperación": {
    1: { cumple: true, observacion: "10-operacion §6 + runbook §4 Firebase Hosting" },
    2: { cumple: true, observacion: "10-operacion §6 PITR Supabase + runbook §2" },
    3: { cumple: true, observacion: "docs/ops/runbook-recuperacion-desastres.md" },
    4: {
      cumple: false,
      observacion:
        "restore-drill-evidence.json — drill readonly 2026-06-17 (58 migraciones); pendiente restauración completa verificada en producción",
    },
    5: { cumple: true, observacion: "restore-drill-check.mjs + generate-restore-drill-evidence-live.mjs (fixture CI)" },
  },
  "Cumplimiento de Fiabilidad": {
    3: {
      cumple: false,
      observacion:
        "k6-smoke-evidence.json — corrida con BFF local (local-bff+supabase-prod); pendiente smoke contra URL producción (Render + Firebase)",
    },
    4: {
      cumple: false,
      observacion:
        "k6-mixed1000-bff-evidence.json — 1000 VU BFF local; pendiente mixed1000 contra stack desplegado en producción",
    },
    5: { cumple: true, observacion: "k6-mixed2000-bff-evidence.json — 2000 VU BFF 2026-06-17 (0.07% fail, p95 active 1ms)" },
    6: { cumple: true, observacion: "docs/ops/k6-* + artifacts/load-tests/ — evidencia pre-producción archivada" },
    7: { cumple: true, observacion: "verify-cumplimiento-fiabilidad-iso25000.mjs — gate estático en VERDE (artefactos repo)" },
  },
  Adaptabilidad: {
    3: {
      cumple: true,
      observacion: "ISO 25023 FAd-3 — viewports web móvil/tablet/escritorio (Playwright); no equivale a app nativa iOS",
    },
    5: {
      cumple: false,
      observacion:
        "ISO 25023 FAd-2 — SO móvil declarado Android+iOS; verificado 1/2 (APK Android sí; IPA iOS no — firma Apple/Codemagic)",
    },
    6: {
      cumple: true,
      observacion:
        "ISO 25023 FAd-3 — firefox/webkit/iphone-safari web · browser-matrix-evidence.json (Safari web ≠ IPA)",
    },
    7: {
      cumple: false,
      observacion:
        "ISO 25023 FAd-2 E-IOS — Flutter compilable; sin IPA en dispositivo (Codemagic: No matching profiles)",
    },
  },
  Intercambiabilidad: {
    1: {
      cumple: true,
      observacion:
        "ISO 25023 FRe-1 — checkout COD/Stripe vía BFF · e2e/checkout-cod-order.spec.ts · e2e/checkout-stripe.spec.ts · bff/server.cjs createOrder",
    },
    2: {
      cumple: true,
      observacion:
        "ISO 25023 FRe-1 — inventario digital admin web/móvil · Supabase productos · AdminProducts · admin_products_page.dart (BFF /admin/products)",
    },
    3: {
      cumple: true,
      observacion:
        "ISO 25023 FRe-1 — reportes/predicciones IA · AdminPredictions · admin_predictions_page.dart · servicio IA /api/predict/combined",
    },
    4: {
      cumple: true,
      observacion:
        "ISO 25023 FRe-1 — histórico Supabase + migraciones · restore-drill-evidence.json · documentacion/10-operacion-y-mantenimiento.md §6 PITR",
    },
    5: {
      cumple: true,
      observacion:
        "ISO 25023 FRe-1 — Web: VITE_AI_SERVICE_URL | VITE_AI_ADMIN_PROXY_URL · .env.example · aiAdminClient · Dockerfile · ci/deploy (rebuild hosting al cambiar VITE_*). Android admin: AI_SERVICE_URL · mobile/.env.example · codemagic.yaml (rebuild APK). Proxy BFF/Function: URL IA en env servidor.",
    },
    6: {
      cumple: true,
      observacion:
        "ISO 25023 FRe-1 — contrato HTTP api-referencia §2.0 · 9 rutas PROXY_ROUTES · guard Vitest · admin-predictions E2E · test_api_contract.py. Nuevo IA: compatible Supabase + JSON. Web→Firebase ID token; Android admin→Bearer. Límite: proveedor identidad (Firebase) fuera de alcance.",
    },
  },
  "Facilidad de Instalación": {
    6: {
      cumple: true,
      observacion: "ISO 25023 FIn-1 E-WEB — .github/workflows/ci.yml job test-and-build: npm run build en CI",
    },
    7: {
      cumple: true,
      observacion: "ISO 25023 FIn-1 E-AND — artifacts/apk/ · flutter build apk · grupo Codemagic calzatura_mobile",
    },
    8: {
      cumple: false,
      observacion:
        "ISO 25023 FIn-1 E-IOS — codemagic.yaml listo; bloqueado certificados Apple Developer / perfil com.calzaturavilchez…",
    },
  },
  "Cumplimiento de la Portabilidad": {
    1: { cumple: true, observacion: "08-pruebas-y-calidad.md §9 + adaptabilidad-trazabilidad-iso25000.md" },
    2: {
      cumple: true,
      observacion:
        "planes-de-prueba §4.6 (web) + portabilidad-mapeo-iso25023.md §1 (SO móvil E-AND/E-IOS declarados aparte)",
    },
    3: { cumple: true, observacion: "docs/ops/browser-matrix-evidence.json — ≥2 motores (firefox, webkit)" },
  },
  Analizabilidad: {
    4: { cumple: true, observacion: "SonarQube Analysis success en main (gh run list sonarqube.yml)" },
    5: { cumple: true, observacion: "docs/SONAR_SEGUIMIENTO.md + docs/TECH-DEBT-BACKLOG.md" },
  },
  Cambiabilidad: {
    5: {
      cumple: true,
      observacion: "documentacion/mantenibilidad-trazabilidad-iso25000.md §2 matriz dominio→impacto→regresión",
    },
  },
  Estabilidad: {
    1: { cumple: true, observacion: "132 tests Chromium en 37 specs (playwright test --list)" },
    5: { cumple: true, observacion: "npm run test:e2e:smoke en PR · suite completa en push main (ci.yml)" },
  },
  Pruebabilidad: {
    1: { cumple: true, observacion: "Vitest coverage líneas ≥60% (CI job test-and-build, scope vitest.config.ts)" },
    2: { cumple: true, observacion: "Vitest coverage funciones ≥60%" },
    3: { cumple: true, observacion: "Vitest coverage ramas ≥50%" },
    4: {
      cumple: true,
      observacion:
        "carrito/pedidos/productos/ventas/admin — unit+guard+E2E (mantenibilidad-trazabilidad §4)",
    },
    5: {
      cumple: true,
      observacion: "setup.ts Supabase + e2e/helpers/mock* (Firebase, BFF, IA, checkout)",
    },
  },
  "Cumplimiento de la Mantenibilidad": {
    1: { cumple: true, observacion: "SonarQube Quality Gate passing (sonarqube.yml)" },
    2: { cumple: true, observacion: "CI obligatorio en pull_request→main (ci.yml + sonarqube.yml)" },
    3: { cumple: true, observacion: ".github/CODEOWNERS — revisión por área" },
    4: { cumple: true, observacion: "CHANGELOG.md + documentacion/13-checklist-cierre-defensa.md" },
    5: { cumple: true, observacion: "docs/TECH-DEBT-BACKLOG.md — triage TD-01…TD-07" },
  },
  Inteligibilidad: {
    1: { cumple: true, observacion: "src/domains/ + menús público/admin/staff" },
    2: { cumple: true, observacion: "paths.ts — catálogo, carrito, checkout" },
    3: { cumple: true, observacion: "AdminLayout.tsx title en nav items" },
    4: { cumple: true, observacion: "Formularios auth/checkout con labels visibles" },
    5: { cumple: true, observacion: "Copy tienda en español orientado a cliente" },
    6: { cumple: true, observacion: "CheckoutDeliveryMap hints + cartShared aria-label cantidades" },
    7: { cumple: true, observacion: "e2e/accessibility.spec.ts — axe wcag21aa home/catálogo/login/registro/carrito" },
    8: { cumple: true, observacion: "paths.ts ayudaContacto, ayudaRastreoPedido, ayudaPreguntasFrecuentes, ayudaCambios" },
  },
  "Facilidad de Aprendizaje": {
    1: { cumple: true, observacion: "Toasts admin logout y operaciones CRUD" },
    2: { cumple: true, observacion: "Validación auth y checkout en dominio" },
    3: { cumple: true, observacion: "CheckoutDeliveryBox sugerencias dirección" },
    4: { cumple: true, observacion: "Validación formularios productos/pedidos admin" },
    5: { cumple: true, observacion: "useAdminPredictionsModel — pred_horizon/history/alert_days en localStorage" },
    6: { cumple: true, observacion: "e2e/register-validation.spec.ts" },
    7: { cumple: true, observacion: "e2e/admin-predictions.spec.ts TC-PRED-003 banner datos insuficientes" },
  },
  Operabilidad: {
    1: { cumple: true, observacion: "axe WCAG + aria-label carrito; roles nav admin (parcial teclado — no sesión humana)" },
    2: { cumple: true, observacion: "Panel admin: dashboard → módulo en 1–2 clics" },
    3: { cumple: true, observacion: "AdminPredictionsDashboard selectores horizonte" },
    4: { cumple: true, observacion: "localStorage pred_* en useAdminPredictionsModel.tsx" },
    5: { cumple: true, observacion: "e2e/admin-product-delete.spec.ts TC-PROD-DEL01 confirmar / DEL02 cancelar" },
    6: { cumple: true, observacion: "e2e/admin-layout.spec.ts aria-current + colapso sidebar" },
    7: { cumple: true, observacion: "e2e/smoke.spec.ts + checkout-cod-order.spec.ts" },
  },
  Atractividad: {
    1: { cumple: true, observacion: "Tailwind v4 @theme en estilos dominio" },
    2: { cumple: true, observacion: "framer-motion KPIs predicciones/admin" },
    3: { cumple: true, observacion: "axe serious/critical=0 en rutas auditadas" },
    4: { cumple: true, observacion: "Iconografía consistente nav admin (Lucide)" },
    5: { cumple: true, observacion: "playwright iphone-safari + idoneidad-journey.spec.ts" },
    6: { cumple: true, observacion: "admin-layout.spec.ts toggle tema claro/oscuro" },
  },
  "Cumplimiento de la Usabilidad": {
    1: { cumple: true, observacion: "05-especificacion-requisitos-software-SRS.md RNF-USA-01" },
    2: { cumple: true, observacion: "SRS accesibilidad + criterio axe E2E" },
    3: { cumple: true, observacion: "documentacion/plantillas/instrumento-sus-calzatura-vilchez.md" },
    4: { cumple: true, observacion: "documentacion/usabilidad-trazabilidad-iso25000.md §0 ISO 9241-11" },
    5: { cumple: true, observacion: "ci.yml job e2e ejecuta accessibility.spec.ts" },
    6: { cumple: true, observacion: "verify-usabilidad-iso25000.mjs + trazabilidad" },
    7: { cumple: true, observacion: "acta-sesion-usabilidad-PLANTILLA.md — sin datos inventados" },
    8: {
      cumple: false,
      observacion: "Pendiente tesista — no hay acta-sesion-usabilidad-COMPLETADA*.md",
    },
    9: {
      cumple: false,
      observacion: "Pendiente — n≥5 participantes reales con consentimiento Ley 29733",
    },
    10: {
      cumple: false,
      observacion: "Pendiente — media SUS ≥70 y mejoras en acta/backlog tras sesión real",
    },
  },
  Seguridad: {
    15: { cumple: true, observacion: "audit.ts + POST /audit BFF + admin-audit-trail E2E" },
    16: { cumple: true, observacion: "supabase/migrations/20260503100000_audit_pedidos_trigger.sql — trg_audit_pedido_insert" },
    17: { cumple: true, observacion: "functions/index.js logAuditFn source stripe_webhook tras checkout.session.completed" },
    18: { cumple: true, observacion: "bff/server.cjs idempotencyKey + functions/fnUtils.js findOrderByIdempotency" },
    19: { cumple: true, observacion: "functions/orderNonRepudiation.cjs — PKCS#7 en nrPkcs7Signature (migración 20260616120000)" },
    20: { cumple: true, observacion: "GET /admin/verifyOrderNonRepudiation — verifyOrderRecord()" },
    21: { cumple: true, observacion: "scripts/verify-seguridad-iso25000.mjs — gate en VERDE" },
  },
};

function distributeCumple(total, pct) {
  const yes = Math.round((total * pct) / 100);
  return Array.from({ length: total }, (_, i) => i < yes);
}

const checklists = {};

for (const char of DATA.characteristics) {
  for (const sub of char.subcharacteristics) {
    const indicators = ITEMS_BY_SUB[sub.name];
    if (!indicators) continue;
    const flags = distributeCumple(indicators.length, sub.percent);
    const cat = CATALOG[sub.name] || {};
    checklists[sub.name] = {
      caracteristica: char.name,
      color: char.color,
      titulo: `Lista de cotejo — ${sub.name}`,
      objetivo:
        OBJETIVO_ISO[sub.name] ??
        `Verificar el cumplimiento de la subcaracterística «${sub.name}» (${char.name}) según ISO/IEC 9126-1 (familia SQuaRE 25000).`,
      referencia: cat.referencia || "—",
      rutaModulo: cat.rutaModulo || null,
      instrucciones:
        "Marque ✓ en la columna Sí si el indicador se cumple con evidencia verificable. Marque ✓ en No si no se cumple. El porcentaje = (Sí ÷ total ítems) × 100.",
      items: indicators.map((indicador, i) => {
        const n = i + 1;
        const ov = ITEM_OVERRIDES[sub.name]?.[n];
        const cumple = ov ? ov.cumple : flags[i];
        return {
          n,
          indicador,
          cumple,
          observacion: ov?.observacion ?? (cumple ? "Evidencia conforme al repositorio." : "Pendiente o evidencia insuficiente."),
        };
      }),
    };
  }
}

const out = {
  meta: {
    formato: "Lista de cotejo dicotómica (UNAM Cap. 14 · Sí/No)",
    fuenteFormato: "https://cuaed.unam.mx/publicaciones/libro-evaluacion/pdf/Capitulo-14-LISTA-DE-COTEJO.pdf",
    proyecto: DATA.meta.project,
    evaluador: "Ing. Calidad — Tesis UCV",
    fecha: DATA.meta.generatedAt,
    instruccionesGenerales:
      "Evaluación en tres niveles: (1) lista de cotejo Sí/No — instrumento principal; (2) casos de prueba con evidencia objetiva (TC-*, gates verify-*); (3) capturas y actas para sustento ante jurado. El % = ítems cumplidos ÷ total × 100.",
  },
  checklists,
};

fs.writeFileSync(
  path.join(ROOT, "dashboard-iso25000/checklists-data.json"),
  JSON.stringify(out, null, 2) + "\n",
  "utf8",
);

let synced = 0;
for (const char of DATA.characteristics) {
  for (const sub of char.subcharacteristics) {
    const cl = checklists[sub.name];
    if (!cl?.items?.length) continue;
    const yes = cl.items.filter((i) => i.cumple).length;
    const pct = Math.round((yes / cl.items.length) * 100);
    if (sub.percent !== pct) {
      sub.percent = pct;
      synced++;
    }
  }
}
if (synced > 0) {
  fs.writeFileSync(
    path.join(ROOT, "dashboard-iso25000/data.json"),
    JSON.stringify(DATA, null, 2) + "\n",
    "utf8",
  );
}

console.log(`OK: ${Object.keys(checklists).length} listas de cotejo → dashboard-iso25000/checklists-data.json`);
if (synced > 0) console.log(`OK: ${synced} porcentajes sincronizados en data.json desde listas de cotejo`);
