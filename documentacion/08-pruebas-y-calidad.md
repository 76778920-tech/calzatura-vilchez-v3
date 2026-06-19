# 08 — Pruebas, verificación y calidad

**Referencias:** IEEE 829 (conceptos), ISO/IEC 25010 (criterios de calidad).

## 1. Plan maestro de pruebas (resumen)

### 1.1 Objetivos

- Demostrar cumplimiento de requisitos **Must**.  
- Reducir regresiones en módulos críticos: auth, pagos, inventario, RPC productos.  
- Proveer **evidencia** para tesis y para ingeniería (ISO).

### 1.2 Alcance de pruebas

| Tipo | Herramienta / método | Ubicación en repo | Nº de archivos |
|------|----------------------|-------------------|----------------|
| Unitarias / integración ligera (frontend) | Vitest | `src/__tests__/` + `src/utils/emailValidation.test.ts` | 16 archivos |
| E2E UI | Playwright (Chromium + Firefox + WebKit) | `e2e/*.spec.ts`, `playwright.config.ts` | 37 archivos |
| Unitarias / integración (servicio IA) | Pytest | `ai-service/tests/` | 7 suites |
| Manuales | Checklist | `plantillas/PL-03-registro-ejecucion-prueba.md` | — |
| Exploratorias | Sesión guiada | Acta en anexo | — |

**Instalación de dependencias de prueba Python:** `pip install -r ai-service/requirements-dev.txt` (incluye pytest y pytest-asyncio; separadas de `requirements.txt` para no desplegar herramientas de testing en producción).

### 1.3 Criterios de entrada/salida por fase de prueba

| Fase | Entrada | Salida |
|------|---------|--------|
| Unitarias | Código en rama + CI | Reporte Vitest |
| E2E | Build + URL base + auth mock o usuario test | Reporte Playwright HTML |
| Aceptación | SRS baseline + checklist UAT | Acta firmada |

## 2. Matriz requisito ↔ prueba

**Fuente editable:** `cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv`  
**Cierre Adaptabilidad (71 %):** `adaptabilidad-trazabilidad-iso25000.md` + **`portabilidad-mapeo-iso25023.md`** (FAd-2/FAd-3/FIn). Gate `npm run ops:verify-adaptabilidad`. Brecha iOS: ítems 5 y 7 checklist, no matriz Safari web.

**Cierre Idoneidad (RF Must 100 %):** `idoneidad-trazabilidad-iso25000.md` — recorrido integrador `e2e/idoneidad-journey.spec.ts` (TC-IDON-001). Verificación: `npm run ops:verify-idoneidad` (raíz) o `npm run test:e2e:idoneidad` (calzatura-vilchez).

**Cierre Precisión (100 %):** `precision-trazabilidad-iso25000.md` — gate `npm run ops:verify-precision -- --run-tests` (raíz).

**Cierre Interoperabilidad (100 %):** `interoperabilidad-trazabilidad-iso25000.md` — gate `npm run ops:verify-interoperabilidad -- --run-tests` (raíz).

**Cierre Seguridad (100 %):** `seguridad-trazabilidad-iso25000.md` — gate `npm run ops:verify-seguridad -- --run-tests` (raíz). Marco **ISO/IEC 25010 producto**, no SGSI 27001.

**Cierre Cumplimiento de la funcionalidad (100 %):** `cumplimiento-trazabilidad-iso25000.md` — gate `npm run ops:verify-cumplimiento -- --run-tests` (raíz). Adherencia a normas legales (Ley 29571, 29733) y trazabilidad SRS CU-T05/CU-T07. TC-CMP-001…005.

### 2.1 Ejemplos (completar IDs reales de specs)

| RF | Caso / spec | Tipo | Resultado última corrida |
|----|---------------|------|---------------------------|
| RF-PED-01 | `e2e/catalog-cart.spec.ts` *(ajustar nombre real)* | E2E | OK / Pendiente |
| RF-ADM-05 | `e2e/admin-code-guards.spec.ts` | E2E | OK |
| RF-ADM-13 | `e2e/admin-campana.spec.ts` | E2E | OK |
| RF-RN-01 | `src/__tests__/variantCreation.test.ts` + triggers SQL | Unit + BD | OK |

## 3. Datos de prueba

- Productos `PRUEBA_CV*` y escenarios Admin Data: ver `AdminData.tsx` y migraciones de datos prueba.  
- **No** usar datos personales reales en E2E grabados.

## 4. Cobertura de código

- Comando: `npm run test:coverage` en `calzatura-vilchez`.  
- Meta orientativa: *(definir % por directoría — ej. dominios críticos ≥ 60 %)*.

## 5. Pruebas no funcionales (ISO 25010)

| RNF | Prueba | Procedimiento |
|-----|--------|---------------|
| RNF-SEG-01 | Rutas admin bloqueadas | Playwright sin auth |
| RNF-PER-01 | Latencia catálogo | Lighthouse / DevTools |
| RNF-CAP-02 | Capacidad lectura 2.000 concurrentes | k6 en `load-tests/` — ver README |
| RNF-USA-01 | Checkout | Test usuario externo + cuestionario SUS opcional |

### 5.1 RNF-CAP-02 — Capacidad de lectura (2.000 usuarios concurrentes)

**Objetivo:** Evitar caídas en campañas o picos de tráfico validando lecturas críticas antes de producción.

| Apartado | VUs meta | Lecturas simuladas |
|----------|----------|-------------------|
| Catálogo BFF (caché) | 1.400 | `GET /public/catalog/active` y paginado (`fetchPublicProducts` vía BFF) |
| Navegación / detalle | 350 | Detalle por id, familias, destacados |
| BFF | 200 | `/health`, `/delivery/quote` |
| Hosting estático | 50 | Página principal Firebase |

**Herramienta:** [Grafana k6](https://k6.io) — scripts en `load-tests/scenarios/`.

**Criterios de éxito (staging):** tasa de fallo HTTP &lt; 2 %; p95 catálogo &lt; 3 s; p95 detalle &lt; 2,5 s.

**Ejecución:** `npm run load:smoke` → `npm run load:mixed1000` (meta 1.000 VUs) → `npm run load:mixed2000` (requiere `load-tests/config.env` y **no** disparar picos en producción sin ventana aprobada).

**Evidencia:** JSON en `artifacts/load-tests/`.

**Prioridad 1 (implementado):** rutas `GET /public/catalog/*` en BFF con caché Upstash (`PUBLIC_CATALOG_CACHE_TTL_SEC`), frontend usa BFF cuando `VITE_BACKEND_API_URL` está definido; pooler Supabase en despliegue (ver `bff/README.txt`).

## 6. Regresión y humo

- **Smoke:** `e2e/smoke.spec.ts` si existe; ampliar lista en CI.  
- **Regresión:** ejecutar `npm run quality` antes de merge.

## 7. Gestión de defectos

| Severidad | Definición | SLA interno |
|-----------|------------|-------------|
| S1 | Caída pago o pérdida datos | Inmediato |
| S2 | Bloqueo admin sin workaround | 24 h |
| S3 | Cosmético | Backlog |

Plantilla: `PL-04-registro-incidente-produccion.md`.

## 8. Evidencias para carpeta tesis (exportar)

- PDF de reporte Playwright.  
- Capturas de Vitest verde en CI.  
- Checklist UAT firmado.

## 9. Portabilidad — Adaptabilidad (ISO 25010)

**Trazabilidad completa:** `documentacion/adaptabilidad-trazabilidad-iso25000.md` · **`documentacion/portabilidad-mapeo-iso25023.md`** (mapeo ISO 25023 FAd/FIn)  
**Gate:** `npm run ops:verify-adaptabilidad` (añadir `--run-e2e` para matriz Firefox/WebKit/iPhone).

### 9.1 Configuración sin modificar código

| Canal | Plantilla env | Despliegue |
|-------|---------------|------------|
| Web SPA | `calzatura-vilchez/.env.example` | Firebase Hosting (secrets `VITE_*` en GitHub Actions) |
| BFF | `bff/env.example` | Render |
| IA | `ai-service/.env.example` | Render / Docker |
| Móvil | `calzatura-vilchez-mobile/.env.example` | Codemagic (`calzatura_mobile`) / APK local |
| Local | `.env.example` (raíz) + `DOCKER.md` | `docker compose up` (3 servicios) |

Mismo commit/build; solo cambian URLs y claves entre local, staging y producción.

### 9.2 Matriz de navegadores (planes-de-prueba §4.6)

| Herramienta | Alcance |
|-------------|---------|
| Playwright `chromium` | Suite E2E completa (TC-MAN-BRW-001 Chrome, TC-MAN-BRW-004 Edge) |
| Playwright `firefox` | TC-IDON-001 + `e2e/browser-matrix.spec.ts` (TC-MAN-BRW-002) |
| Playwright `webkit` | TC-MAN-BRW-003 Safari desktop |
| Playwright `iphone-safari` | TC-MAN-BRW-003 iPhone Safari (web) |

```bash
cd calzatura-vilchez
npm run test:e2e:portabilidad   # Firefox + WebKit + iPhone
```

Evidencia JSON: `docs/ops/browser-matrix-evidence.json` · reporte HTML: `playwright-report/`.

**Limitante:** app nativa iOS (IPA) pendiente de certificados Apple; navegación en iPhone vía Safari web cubierta por `iphone-safari`.

## 10. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial. |
| 1.1 | 2026-06-16 | §9 Adaptabilidad: matriz navegadores Playwright + gate verify-adaptabilidad. |
