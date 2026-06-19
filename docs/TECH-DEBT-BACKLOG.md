# Backlog de deuda técnica — Calzatura Vilchez

**Última triage:** 2026-06-19  
**Fuente:** SonarCloud, auditorías `docs/15-modulos/`, revisión ISO Mantenibilidad.

| ID | Área | Descripción | Severidad | Estado | Evidencia / acción |
|----|------|-------------|-----------|--------|-------------------|
| TD-01 | Admin IA | `AdminPredictionsDashboard.tsx` >2400 líneas — extraer `PredictionTable`, `AIChatPanel` | Media | Backlog | `AdminPredictions-auditoria.md` A6 |
| TD-02 | BFF | `bff/server.cjs` monolítico (~4000 líneas) — extraer routers por dominio | Media | Backlog | Favoritos ya extraído; pedidos/ventas pendientes |
| TD-03 | Cobertura UI | Páginas React excluidas del scope Vitest (cubiertas por E2E) | Baja | Aceptado | `vitest.config.ts` include acotado; E2E 132 tests |
| TD-04 | iOS | IPA bloqueado por certificados Apple Developer | Media | Bloqueado externo | `codemagic.yaml`, portabilidad FIn-1 |
| TD-05 | Sonar fantasma | 3 issues huérfanos `fix_coverage_xml_for_sonar.py` | Baja | Cerrado/wontfix | `docs/SONAR_SEGUIMIENTO.md` |
| TD-06 | receipt.ts | Utilidad impresión sin tests unitarios (cubierta E2E legal) | Baja | Backlog | `cumplimiento-funcional-legal.spec.ts` |
| TD-07 | auth.ts | Servicio auth grande, cobertura parcial | Media | Backlog | Guards en `accessControl.test.ts`, E2E registro |

**Criterio de cierre:** issue resuelto + test/gate verde + actualización en este archivo.
