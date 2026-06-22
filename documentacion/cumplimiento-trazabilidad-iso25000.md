# Cumplimiento de la funcionalidad — trazabilidad y evidencia (ISO/IEC 25000 / 9126-1)

**Proyecto:** Calzatura Vilchez  
**Característica:** Funcionalidad · **Subcaracterística:** Cumplimiento de la funcionalidad (9126 §6.1.5)  
**Índice Funcionalidad:** `documentacion/funcionalidad-trazabilidad-iso25000.md`  
**Definición ISO/IEC 9126:** capacidad del software de **adherirse a normas, convenciones y reglas legales o reglamentarias** relacionadas con la funcionalidad.

**No confundir con:** ISO/IEC 27001 (gestión de seguridad de la información) ni con Idoneidad (¿hace lo que debe?).

**Última revisión:** 2026-06-16  
**Verificación repetible:** `node scripts/verify-cumplimiento-iso25000.mjs` (añadir `--run-tests` para Vitest + E2E legal).

## Dominios de cumplimiento cubiertos

| # | Dominio | Norma / estándar | Evidencia principal |
|---|---------|------------------|---------------------|
| 1 | Catálogo maestro SRS | IEEE 829 / 12207 — CU-T05 | `CU-T05-requisitos.csv`, `functionalComplianceSrs.guard.test.js` |
| 2 | Trazabilidad Must → prueba | SRS §7, Idoneidad | `scripts/iso25000-must-rf-manifest.mjs`, `idoneidad-trazabilidad-iso25000.md` |
| 3 | Matriz pruebas ↔ RF | CU-T07 | `CU-T07-matriz-pruebas-requisitos.csv`, TC-CMP-005 |
| 4 | Estado del arte ↔ RF | CU-T06 | `CU-T06-trazabilidad-articulo-requisito.csv` |
| 5 | Ley 29571 — Libro reclamaciones | RF-LEG-01 | `complaintLegalPlazos.ts`, `libroReclamaciones.test.ts`, TC-CMP-001 |
| 6 | Ley 29733 — Privacidad | RF-LEG-02 | `privacidad.json`, TC-CMP-002 |
| 7 | Cookies / consentimiento | RF-LEG-03 | `infoLegalPoliticaCookies.ts`, `cookie-consent.spec.ts`, TC-CMP-003 |
| 8 | Términos comercio electrónico | RF-LEG-04 | `terminos.json`, TC-CMP-004 |
| 9 | BFF libro reclamaciones | Funcional legal operativa | `bff/server.cjs` `/libro-reclamaciones`, `complaintNotifyEmail.guard.test.js` |

## Matriz de casos

| Caso | Requisito | Prueba | Tipo |
|------|-----------|--------|------|
| TC-CMP-001 | RF-LEG-01 — Ley 29571 libro virtual | `e2e/cumplimiento-funcional-legal.spec.ts` | E2E |
| TC-CMP-002 | RF-LEG-02 — Ley 29733 privacidad | `e2e/cumplimiento-funcional-legal.spec.ts` | E2E |
| TC-CMP-003 | RF-LEG-03 — política cookies | `e2e/cookie-consent.spec.ts` | E2E |
| TC-CMP-004 | RF-LEG-04 — términos y condiciones | `e2e/cumplimiento-funcional-legal.spec.ts` | E2E |
| TC-CMP-005 | SRS Must ↔ CU-T05 ↔ evidencia | `functionalComplianceSrs.guard.test.js` + manifest | Vitest guard |

## Criterio de cierre al 100 %

1. Los **26 RF Must** del SRS están en CU-T05 con estado Implementado.
2. Cada RF Must y RF-LEG tiene evidencia en `iso25000-must-rf-manifest.mjs`.
3. CU-T06 y CU-T07 presentes; TC-CMP-001…005 en CU-T07.
4. `node scripts/verify-cumplimiento-iso25000.mjs --run-tests` termina en **VERDE**.

## Brecha residual

- CU-T06 filas EDA marcadas «Pendiente» de evidencia captura manual (no bloquean cumplimiento funcional Must/legal).
- Asesoría legal externa para certificación formal INDECOPI/ANPDP fuera del alcance del gate automatizado.
