# 08 — Pruebas, verificación y calidad

**Referencias:** IEEE 829 (conceptos), ISO/IEC 25010 (criterios de calidad).

## 1. Plan maestro de pruebas (resumen)

### 1.1 Objetivos

- Demostrar cumplimiento de requisitos **Must**.  
- Reducir regresiones en módulos críticos: auth, pagos, inventario, RPC productos.  
- Proveer **evidencia** para tesis y para ingeniería (ISO).

### 1.2 Alcance de pruebas

| Tipo | Herramienta / método | Ubicación en repo |
|------|----------------------|-------------------|
| Unitarias / integración ligera | Vitest | `src/__tests__/`, `vitest.config.ts` |
| E2E UI | Playwright | `e2e/*.spec.ts`, `playwright.config.ts` |
| Manuales | Checklist | `plantillas/PL-03-registro-ejecucion-prueba.md` |
| Exploratorias | Sesión guiada | Acta en anexo |

### 1.3 Criterios de entrada/salida por fase de prueba

| Fase | Entrada | Salida |
|------|---------|--------|
| Unitarias | Código en rama + CI | Reporte Vitest |
| E2E | Build + URL base + auth mock o usuario test | Reporte Playwright HTML |
| Aceptación | SRS baseline + checklist UAT | Acta firmada |

## 2. Matriz requisito ↔ prueba

**Fuente editable:** `cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv`

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
| RNF-USA-01 | Checkout | Test usuario externo + cuestionario SUS opcional |

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

## 9. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial. |
