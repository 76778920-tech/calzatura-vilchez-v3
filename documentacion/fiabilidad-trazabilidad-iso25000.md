# Fiabilidad — trazabilidad y evidencia (ISO/IEC 25010 / familia 25000)

**Proyecto:** Calzatura Vilchez  
**Característica:** Fiabilidad  
**Subcaracterísticas:** Madurez · Tolerancia a fallos · Capacidad de recuperación · Cumplimiento de fiabilidad  

**Última revisión:** 2026-06-19  
**Gate maestro:** `npm run ops:verify-fiabilidad` · modo completo: `npm run ops:verify-fiabilidad:full`

> **Criterio producción (ISO 25010 / calidad en uso):** Madurez operacional, pruebas de carga contra el stack desplegado y restauración completa ante desastres **no se consideran al 100 %** hasta contar con evidencia en **producción** (URL Render/Firebase, uptime post-despliegue, DR ejecutado). La evaluación actual documenta madurez de **ingeniería** (CI/CD) y pruebas en **entorno controlado** (BFF local + Supabase prod, restore drill readonly).

**Resumen dashboard:** 25/25 ítems = **100 %** (Madurez 100 % · Tolerancia 100 % · Recuperación 100 % · Cumplimiento 100 %).

---

## 1. Madurez (100 % — 8/8)

**Definición ISO/IEC 25010:** grado en que el software **evita fallos** por defectos, bajo condiciones normales de uso.

**Instrumento:** Lista de cotejo — workflows CI en `main` (8 ítems). Ver `dashboard-iso25000/checklists-data.json` → `Madurez`.

### 1.1 Estado de la lista de cotejo

| N° | Indicador | Estado | Evidencia |
|----|-----------|--------|-----------|
| 1 | CI lint/typecheck/unit en success | **Sí** | Workflow `ci.yml` → job `Lint + Tests + Build` |
| 2 | CI Integration E2E en success | **Sí** | Workflow `ci-integration.yml` |
| 3 | SonarQube Analysis en success | **Sí** | Workflow `sonarqube.yml` |
| 4 | Security DevSecOps Gates en success | **Sí** | Workflow `security-devsecops.yml` |
| 5 | CI servicio IA en success | **Sí** | `ci.yml` → jobs IA + Docker build |
| 6 | Controles ops estáticos en CI | **Sí** | readiness, backtest IA, restore drill fixture |
| 7 | Último run success — 4 workflows madurez | **Sí** | `ci.yml`, `ci-integration.yml`, `sonarqube.yml` y `security-devsecops.yml` en success en `main` |
| 8 | Gate verify-madurez documentado | **Sí** | `scripts/verify-madurez-iso25000.mjs` |

**Resultado lista:** 8/8 = **100 %**.

### 1.2 Incidente resuelto (2026-06-15)

Fallos en push mobile iOS por **SCA npm audit** en `calzatura-vilchez/functions` y frontend. Remediación: `npm audit fix` en ambos paquetes (0 vulnerabilidades high/critical con `--omit=dev`).

**Verificación:** `npm run ops:verify-madurez:ci` consulta el **último run** por workflow en `main` (no exige racha histórica de 5/5).

### 1.3 Workflows que sustentan Madurez

| Workflow | Archivo | Qué valida |
|----------|---------|------------|
| CI | `.github/workflows/ci.yml` | Lint, Vitest, build, E2E, IA, npm audit, ops estáticos |
| CI Integration | `.github/workflows/ci-integration.yml` | Paridad Supabase, E2E integración |
| SonarQube | `.github/workflows/sonarqube.yml` | Quality gate SonarCloud |
| Security DevSecOps | `.github/workflows/security-devsecops.yml` | Gates seguridad |

---

## 2. Tolerancia a fallos (100 %)

**Evidencia:**

| Área | Artefacto |
|------|-----------|
| Error boundary global | `AppErrorBoundary.tsx`, `main.tsx` |
| Idempotencia Stripe | `bff/server.cjs` (`order.estado !== "pagado"`), `functions/index.js` |
| Tests política estados | `bffOrderStatusPolicy.test.js`, `stripeLegacyGuards.test.js` |
| Warnings IA | `AdminPredictionsDashboard.tsx` |
| BFF fail-closed | `orderStatusPolicy.js`, `bffAuditEndpointPolicy.test.js` |
| UI errores checkout/admin | `CheckoutPagoStep.tsx`, E2E checkout/admin |

**Gate:** `npm run ops:verify-tolerancia-fallos` (opcional `--run-tests`).

---

## 3. Capacidad de recuperación (100 % — 5/5)

**Evidencia:**

| Área | Artefacto | Estado |
|------|-----------|--------|
| Backups proveedor | Firebase Hosting/Auth; Supabase PITR | **Sí** |
| Runbook DR | `docs/ops/runbook-recuperacion-desastres.md` | **Sí** |
| Restore drill | `docs/ops/restore-drill-evidence.json` (live-readonly 2026-06-17) | **Sí** — drill validado; evidencia archivada |
| Validador | `scripts/restore-drill-check.mjs` (job `ops-controls-static` en CI) | **Sí** |

**Gate:** `npm run ops:verify-recuperacion -- --run-drill-check`

---

## 4. Cumplimiento de fiabilidad (100 % — 7/7)

**RNF-CAP-02:** fallo HTTP &lt; 2 %, p95 catálogo &lt; 3 s (documentado en `documentacion/08-pruebas-y-calidad.md`).

| Escenario | Script | Evidencia | Estado |
|-----------|--------|-----------|--------|
| Smoke (20 VUs) | `load-tests/scenarios/smoke-read.js` | `docs/ops/k6-smoke-evidence.json` | **Sí** — evidencia validada |
| Mixed 1000 VUs + BFF | `load-tests/scenarios/read-mixed-1000.js` | `docs/ops/k6-mixed1000-bff-evidence.json` | **Sí** — evidencia validada |
| Mixed 1000 VUs datastore | mismo script con `-SkipBff` | `docs/ops/k6-mixed1000-evidence.json` | Referencia Supabase prod (parcial) |
| Mixed 2000 VUs + BFF | `load-tests/scenarios/read-mixed-2000.js` | `docs/ops/k6-mixed2000-bff-evidence.json` | **Sí** — pre-producción archivada |
| Mixed 2000 VUs estático | autocannon | `artifacts/load-tests/autocannon-home-c2000-*.json` | **Sí** |

**Gate:** `npm run ops:verify-cumplimiento-fiabilidad -- --run-evidence-check`  
**Validador evidencia:** `scripts/k6-evidence-check.mjs`

---

## 5. Relación con RNF del SRS

| ID | Enunciado | Subcaracterística |
|----|-----------|-------------------|
| RNF-REL-01 | Migraciones SQL reproducibles | Madurez |
| RNF-CAP-02 | Capacidad 1.000–2.000 VUs | Cumplimiento de fiabilidad |

---

## 6. Comandos de verificación

```bash
npm run ops:verify-madurez
npm run ops:verify-madurez:ci
npm run ops:verify-tolerancia-fallos
npm run ops:verify-recuperacion -- --run-drill-check
npm run ops:verify-cumplimiento-fiabilidad -- --run-evidence-check
npm run ops:verify-fiabilidad:full
npm run dashboard:checklists
```
