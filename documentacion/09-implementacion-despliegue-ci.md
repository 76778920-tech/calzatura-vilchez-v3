# 09 — Implementación, despliegue y automatización (CI/CD)

## 1. Stack tecnológico verificado (2026)

| Capa | Tecnología | Versión (referencia) |
|------|------------|----------------------|
| Runtime | Node.js | Ver CI / local |
| Framework UI | React | `package.json` |
| Build | Vite | `package.json` |
| Lenguaje | TypeScript | estricto proyecto |
| Datos | Supabase (@supabase/supabase-js) | `package.json` |
| Auth / hosting | Firebase (auth, app hosting) | `package.json` |
| Pagos | Stripe | `@stripe/stripe-js` |
| Tests | Vitest, Playwright | `package.json` |

## 2. Estructura de repositorio (alto nivel)

```
Cazatura Vilchez V3/
  estado_del_arte.md             # Corpus Q1 (20 artículos)
  documentacion/                 # Paquete documental ISO / tesis
  .github/workflows/
    ci.yml                       # CI con mocks — corre en todo push/PR
    ci-integration.yml           # CI con secrets reales — solo rama main
  docker-compose.yml             # 3 servicios: frontend, ai-service, firebase-emulator
  railway.toml                   # Config de despliegue Railway (raíz)
  calzatura-vilchez/             # SPA React + migraciones Supabase
    src/
      domains/                   # 10 dominios (trabajadores/ presente pero sin implementar)
      hooks/                     # Hooks Supabase Realtime (productos, pedidos, favoritos)
      utils/                     # 12 utilidades reutilizables
    supabase/migrations/         # 27 migraciones SQL con prefijo YYYYMMDDHHMMSS
    e2e/                         # 27 specs Playwright
    tdd/                         # Módulo PHP/Laravel del curso de construcción de SW (legado académico, no forma parte del sistema en producción)
  ai-service/                    # Microservicio IA Python/FastAPI
    models/                      # demand.py, revenue.py, risk.py, campaign.py
    services/                    # supabase_client.py, firebase_verifier.py, firebase_client.py
    tests/                       # 7 suites pytest
    scripts/                     # verify_ire_historial_schema.py (validación de esquema BD)
    railway.toml                 # Config de despliegue Railway (ai-service)
    requirements.txt             # Dependencias de producción
    requirements-dev.txt         # Dependencias de desarrollo y pruebas (pytest)
  firebase-emulator/             # Emulador Firebase Auth para E2E local
    Dockerfile                   # Imagen del emulador
```

## 3. Variables de entorno (solo nombres)

Documentar en `.env.example` si existe; **nunca** valores reales en Markdown.

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | URL proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima |
| `VITE_*` | Otras configuraciones front |

Firebase: configuración en `src/firebase/config.ts` (claves públicas de cliente).

## 4. Migraciones de base de datos

- Ubicación: `calzatura-vilchez/supabase/migrations/`.
- Total: **27 migraciones** con prefijo `YYYYMMDDHHMMSS_*.sql`.
- Procedimiento de aplicación: Supabase CLI `db push` o SQL Editor.
- **Checklist pre-producción:** duplicados códigos resueltos antes de índice único.

### 4.1 Listado completo de migraciones

| Archivo | Propósito |
|---------|-----------|
| `20260430120000_add_familia_id_to_productos.sql` | Columna `familiaId` para agrupar variantes de producto |
| `20260430130000_create_all_tables.sql` | Creación inicial de todas las tablas del sistema |
| `20260501135500_enforce_unique_product_codes.sql` | Índice único en `productoCodigos` |
| `20260502020000_add_commercial_guardrails.sql` | CHECK constraints de categoría, precio y descuento |
| `20260502030000_create_product_variants_atomic.sql` | RPC `create_product_variants_atomic` |
| `20260502040000_update_product_atomic.sql` | RPC `update_product_atomic` |
| `20260502050000_add_campana_to_productos.sql` | Columna `campana` en productos |
| `20260502120000_align_codigos_and_import_metadata.sql` | Alineación de códigos e importación de metadata |
| `20260502130000_atomic_stock_rpc.sql` | RPC de actualización atómica de stock |
| `20260502140000_grant_stock_rpc_to_anon.sql` | Permisos RPC de stock para rol anon |
| `20260503100000_audit_pedidos_trigger.sql` | Trigger `trg_audit_pedido_insert` en tabla `pedidos` |
| `20260503110000_add_pagadoen_and_canal.sql` | Columnas `pagadoEn` y `canal` en pedidos |
| `20260504190000_producto_estilo_multi_token.sql` | Soporte multi-token para campo estilo |
| `20260504220000_modelo_estado_table.sql` | Tabla `modeloEstado` para persistir training_meta del modelo IA |
| `20260504230000_pgcrypto_dni_protection.sql` | Hash SHA-256 para protección de DNI (`pgcrypto`) |
| `20260504240000_data_retention_policy.sql` | Funciones de retención de datos (`purge_old_audit_records`, `purge_test_sales`) |
| `20260505120000_fix_unique_constraints.sql` | Corrección de constraints únicos |
| `20260505150000_fix_activo_in_atomic_functions.sql` | Fix del campo `activo` en RPCs atómicas |
| `20260505160000_enable_realtime_productos.sql` | Habilitar Supabase Realtime en tabla `productos` |
| `20260506180000_extend_ire_historial_audit.sql` | Columnas extendidas en `ireHistorial` (version, definicion, formula, variables, detalle) |
| `20260507100000_fix_favoritos_unique_constraint.sql` | Constraint único en tabla `favoritos` |
| `20260507110000_enable_realtime_pedidos.sql` | Habilitar Supabase Realtime en tabla `pedidos` |
| `20260508103000_enable_realtime_product_metadata.sql` | Habilitar Realtime en `productoCodigos` y `productoFinanzas` |
| `20260508120000_create_campanas_detectadas.sql` | Tabla `campanas_detectadas` para campañas detectadas por IA |
| `20260508130000_campaign_data_model_v2.sql` | Modelo de datos v2 para campañas (productos, métricas, feedback) |
| `20260508140000_add_focus_fields_to_campanas.sql` | Campos de foco (productos prioritarios) en campañas |
| `20260508150000_add_impacto_soles_to_campana_productos.sql` | Campo `impacto_soles` en productos de campaña |

## 5. Scripts NPM relevantes

| Script | Comando | Propósito |
|--------|---------|-----------|
| Calidad | `npm run quality` | test + lint + typecheck + build |
| Tests unit | `npm run test` | Vitest |
| E2E | `npm run test:e2e` | Playwright |

## 6. Integración continua (CI)

### 6.1 Estado — GitHub Actions (2 workflows activos)

| Archivo | Disparadores | Jobs | Propósito |
|---------|--------------|------|-----------|
| `.github/workflows/ci.yml` | `push` y `pull_request` a cualquier rama | validar migraciones · lint + test + build / E2E | Validación rápida — mocks de red |
| `.github/workflows/ci-integration.yml` | `push` a `main` + `workflow_dispatch` | validar migraciones · quality · ai-service · e2e | Integración con secrets reales — solo en `main` |
| `.github/workflows/deploy-production.yml` | tras **CI Integration** success en `main` + `workflow_dispatch` | gate (CI+Integration) · Firebase Hosting · Render IA + smoke | **Único** pipeline de deploy a producción |

#### ci-integration.yml — detalle de jobs

| Job | Pasos principales |
|-----|-------------------|
| **quality** | lint (ESLint) → Vitest + cobertura (artefacto HTML 30 días) → typecheck → build con todos los `VITE_*` secrets reales |
| **ai-service** | Python 3.12 → `pip install -r requirements.txt` → `pytest` (7 suites) → `verify_ire_historial_schema.py --write-probe` contra Supabase real |
| **e2e** | Node 20 → caché Playwright → Chromium → `npm run test:e2e` con `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD` reales → artefacto reporte HTML 30 días |

Evidencia: pestaña **Actions** del repositorio remoto; filas detalladas con **dos respaldos** normativos en `cuadros-excel/CU-T08-automatizacion-respaldos.csv`.

### 6.2 Tabla de automatización y **dos respaldos** mínimos

**Archivo maestro:** `cuadros-excel/CU-T08-automatizacion-respaldos.csv` (incluye filas CI + calidad local + E2E + migraciones + lint).

## 7. Despliegue a producción (completo)

### 7.1 Flujo automático en `main`

```text
push main → CI (tests + migraciones)     ─┐
         → CI Integration (secrets reales) ─┤ ambos deben ser success
         → Deploy Producción (gate)       ← solo si Integration terminó OK
              ├─ Firebase Hosting + smoke https://calzaturavilchez-ab17f.web.app
              └─ Render deploy hook + smoke /api/health
```

No hay deploy en `pull_request`. El workflow antiguo `Deploy — Firebase Hosting` en paralelo al CI fue sustituido por `Deploy — Producción`.

### 7.2 Secrets obligatorios en GitHub (Actions)

| Secret | Uso |
|--------|-----|
| `FIREBASE_SERVICE_ACCOUNT` | Deploy Firebase Hosting |
| `RENDER_DEPLOY_HOOK_URL` | Deploy hook del servicio IA en Render (Settings → Deploy Hook) |
| `VITE_*` (Firebase, Supabase, Stripe, Cloudinary, DNI, IA, BFF, ORS) | Build Vite en deploy |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | CI Integration + IA |
| `SONAR_TOKEN` | SonarQube (opcional; skip si falta) |

Sin `RENDER_DEPLOY_HOOK_URL` el job de deploy **falla** (no se omite).

### 7.3 Despliegue manual de emergencia

GitHub → Actions → **Deploy — Producción (Firebase + Render)** → **Run workflow** (usa el commit actual de `main`; no exige re-verificar CI).

### 7.4 Supabase

- Migraciones: validadas en CI; aplicar en remoto con `npm run db:push` desde `calzatura-vilchez/`.
- Proyecto dev/staging/prod separados recomendados.

### 7.5 Servicio IA (Render)

- URL: `https://calzatura-vilchez-v3.onrender.com`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health: `GET /api/health` (el deploy espera hasta ~12 min por cold start)
- Env en Render: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FIREBASE_PROJECT_ID`, `SUPERADMIN_EMAILS`, `AI_SERVICE_BEARER_TOKEN`
- Plantilla local: `ai-service/.env.example`

### 7.6 Limpieza de artefactos locales

```bash
node scripts/clean-local-residual.mjs
```

Elimina `n/` (restos Firebase), `calzatura-vilchez-mobile/android/build/` y coverage XML sueltos en `ai-service/`.

### 7.4 Firebase Emulator (entorno local / E2E)

- Servicio: `firebase-emulator/` — imagen Docker propia con `firebase-emulator/Dockerfile`
- Emula: Firebase Auth (puerto 9099) y Cloud Functions (puerto 5001)
- Uso: levantado por `docker-compose.yml` para pruebas E2E locales sin consumir cuota de Firebase real
- En CI (`ci.yml`): el emulador se inicia como servicio de Docker antes de ejecutar Playwright

## 8. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial. |
| 1.1 | 2026-05-02 | CI GitHub Actions documentado; CU-T08 actualizado con jobs reales. |
