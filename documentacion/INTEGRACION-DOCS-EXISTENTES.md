# Integración con documentación ya existente en el repositorio

## Ubicación

Ruta base aplicación: `calzatura-vilchez/docs/`  
Paquete tesis / ISO (raíz repo): `documentacion/`

## Fuente única de la matriz de pruebas (CU-T07)

| Qué | Dónde |
|-----|--------|
| **CSV maestro** | `documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv` |
| Puntero desde la app | `calzatura-vilchez/docs/CU-T07-LEEME.md` |

No crear copias del CSV bajo `calzatura-vilchez/docs/` (evita bifurcación).

## Auditorías por módulo (nuevo patrón)

| Ruta | Contenido |
|------|-----------|
| `calzatura-vilchez/docs/15-modulos/AdminDashboard-auditoria.md` | Auditoría ISO del dashboard admin (alcance, hallazgos H-01…H-04, riesgos aceptados, TC-DASH). |

Replicar el mismo patrón para otros módulos críticos (`Checkout`, `AdminProducts`, …).

## Inventario y estado de sincronización

| Ruta | Tipo | Contenido | Estado respecto al sistema **actual** (2026) |
|------|------|-------------|-----------------------------------------------|
| `documentacion-general-sistema.md` | Texto | Visión general, módulos, stack | **Sincronizado** a Supabase (PostgreSQL) + Firebase Auth/Functions + IA. |
| `formato-09-alcance-proyecto-software.md` | Formato académico | Alcance, IN/OUT scope | **Sincronizado** (IN-10 pedidos Supabase; IN-28 RLS + Rules; restricciones operativas). Cruzar con `documentacion/05-especificacion-requisitos-software-SRS.md`. |
| `quality-security-standards.md` | Texto | Estándares calidad/seguridad | Revisar coherencia con **ISO 25010** en `documentacion/02-normas-metodologia-y-roles.md`. |
| `security-audit.md` | Texto | Auditoría seguridad + tabla resumen H-01…H-04 | **Activo**; enlaza a `15-modulos/AdminDashboard-auditoria.md` y CU-T07 canónico. |
| `operaciones-credenciales.md` | Texto | Credenciales / operación | **No duplicar secretos**; solo nombres de variables. |
| `procesos/catalogo-mapas-procesos.md` | Catálogo | Lista de BPMN | Mantener; alinear con RF en `documentacion/cuadros-excel/CU-T05-requisitos.csv`. |
| `procesos/bpmn/*.bpmn` | BPMN 2.0 | Flujos | Validar pasos contra `src/domains/`. Los que hablen solo de **Firestore como BD de negocio** requieren revisión frente a **Supabase**. |
| `procesos/bpmn/README.md` | Texto | Guía BPMN | OK. |
| `Auditoria-Panel-Administrativo-Calzatura-Vilchez.docx` | Binario | Auditoría panel | Conservar; citar en tesis como evidencia. |

## CI / automatización (respaldos CU-T08)

| Origen | Descripción |
|--------|-------------|
| `.github/workflows/ci.yml` | Job `test-and-build`: `npm ci`, `npm test`, `npm run typecheck`, `npm run build` sobre `calzatura-vilchez/`. |

Filas correspondientes en `documentacion/cuadros-excel/CU-T08-automatizacion-respaldos.csv`.

## Regla de oro

- **Fuente de verdad técnica:** código + `calzatura-vilchez/supabase/migrations/` + variables en `documentacion/09-implementacion-despliegue-ci.md`.  
- **Documentos obsoletos:** marcar encabezado `OBSOLETO` solo si se reemplazan; no borrar sin acta.

## Checklist de sincronización

- [x] `documentacion-general-sistema.md` — stack Supabase.  
- [x] `formato-09` — IN-10, IN-28, restricciones operativas, criterio viabilidad.  
- [x] Matriz CU-T07 — una sola copia en `documentacion/cuadros-excel/`.  
- [ ] Revisar BPMN pedidos/pagos vs código (tarea continua).  
- [ ] Vincular cada PR-xx del catálogo a un **RF-** en `CU-T05-requisitos.csv`.
