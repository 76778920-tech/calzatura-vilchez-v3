# 14 — Mapa de documentos del repositorio → capítulos de tesis

**Objetivo:** que la redacción del documento final (Word/LaTeX) no duplique esfuerzo: cada sección académica **absorbe** o **cita** el contenido ya elaborado en `documentacion/`, `estado_del_arte.md` y `calzatura-vilchez/docs/`.

> Ajustar numeración de capítulos según **normativa de la escuela de posgrado**.

## Tabla de correspondencia (plantilla)

| Capítulo tesis (nombre tentativo) | Fuentes en repo (rutas) | Producto académico esperado |
|----------------------------------|-------------------------|------------------------------|
| I Introducción | `01-marco-y-tesis.md`, `estado_del_arte.md` § motivación | Problema, objetivos, justificación |
| II Marco teórico | `estado_del_arte.md` completo + literatura riesgo/IA extra | 20 artículos + teoría riesgo |
| III Marco legal / datos personales *(si aplica)* | `10-operacion-y-seguridad.md`, normativa Perú | Ley 29733, consentimiento |
| IV Ingeniería de requisitos | `05-especificacion-requisitos-software-SRS.md`, `CU-T05` | SRS + tablas |
| V Planificación y metodología | `02`, `03`, `04`, `CU-T02`, `CU-T03`, `CU-T04` | WBS, cronograma, riesgos proyecto |
| VI Diseño del sistema | `06-diseno-arquitectura-y-datos.md`, BPMN `calzatura-vilchez/docs/procesos/` | Arquitectura, ER, procesos |
| VII Inteligencia artificial y riesgo | `07-modulo-ia-riesgo-empresarial.md`, `CU-T06` filas EDA-06…EDA-17 | Modelo, métricas, discusión |
| VIII Implementación y despliegue | `09-implementacion-despliegue-ci.md`, código | Stack, migraciones, CI |
| IX Pruebas y calidad | `08-pruebas-y-calidad.md`, `CU-T07`, reportes CI | Casos, resultados |
| X Operación, seguridad y continuidad | `10-operacion-y-seguridad.md` | RPO/RTO, incidentes |
| XI Resultados y discusión | Matrices CSV exportadas, capturas | Interpretación vs hipótesis |
| XII Conclusiones y trabajos futuros | `13-checklist-cierre-defensa.md` + retrospectiva | Cierre |

## Figuras y tablas sugeridas (tipo Excel / export)

| ID figura | Tipo | Origen datos |
|-----------|------|--------------|
| Fig-WBS | Árbol / diagrama | `CU-T02` exportado |
| Fig-Gantt | Cronograma | `CU-T03` exportado |
| Fig-ER | Modelo datos | `06` + migraciones |
| Fig-secuencia-pago | Secuencia | BPMN PR-13 / código Stripe |
| Tab-Riesgos | Matriz | `CU-T04` |
| Tab-Trazabilidad-EDA | Matriz | `CU-T06` |
| Tab-Pruebas | Matriz | `CU-T07` |
| Tab-Automatizacion | Matriz | `CU-T08` |

## Control de versiones del mapa

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-05-01 | Creación |
