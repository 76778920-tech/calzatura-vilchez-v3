# Índice maestro — documentación de ingeniería y tesis

**Proyecto / tesis:** Sistema web de comercio electrónico con un modelo de inteligencia artificial para la predicción del riesgo empresarial en la empresa Calzatura Vilchez  

**Asesor:** Dr. Maglioni Arana Caparachin  

**Propósito de esta carpeta:** concentrar la **documentación de gestión de proyecto**, **ingeniería de software**, **trazabilidad normativa (ISO)**, **requisitos, diseño, pruebas**, **IA / riesgo empresarial**, **operación** y **cuadros exportables a Excel**, de forma **exhaustiva** y **por fases**. Complementa el archivo raíz `estado_del_arte.md` (20 artículos Q1), que permanece como **corpus bibliográfico principal**.

---

## Cómo usar este índice

1. Leer `LEEME-PRIMERO.md` (convenciones, alcance, responsables de mantenimiento).  
2. Revisar `INTEGRACION-DOCS-EXISTENTES.md` para enlazar BPMN, auditoría y formatos ya presentes en `calzatura-vilchez/docs/`.  
3. Completar **plantillas** en `plantillas/` y **CSV** en `cuadros-excel/` (abrir en Microsoft Excel, LibreOffice Calc o Google Sheets).  
4. Mantener **trazabilidad** actualizada en `11-trazabilidad-estado-del-arte.md` cada vez que cambien requisitos o el código.

---

## Mapa de documentos (numeración ISO / ingeniería)

| Fase | Archivo | Contenido principal |
|------|---------|---------------------|
| 0 | `00-gestion-documental.md` | Política documental, versionado, nomenclatura, control de cambios, vínculo con ISO 9001 “información documentada” (enfoque académico). |
| 1 | `01-marco-y-tesis.md` | Stakeholders, contexto empresa, **alineación explícita con el título de tesis** (e-commerce + IA + riesgo), supuestos y exclusiones. |
| 2 | `02-normas-metodologia-y-roles.md` | ISO/IEC 12207 (procesos), ISO/IEC 25010 (calidad), metodología elegida, **matriz RACI**, reuniones. |
| 3 | `03-planificacion-proyecto-completa.md` | Plan maestro, **EDT/WBS**, cronograma por fases, **riesgos del proyecto**, comunicaciones. |
| 4 | `04-planificacion-software.md` | Plan de desarrollo de software, líneas base, entornos, criterios de “hecho”. |
| 5 | `05-especificacion-requisitos-software-SRS.md` | ERS / SRS estilo IEEE 830: requisitos funcionales, no funcionales, reglas, interfaces externas. |
| 6 | `06-diseno-arquitectura-y-datos.md` | Arquitectura lógica/física, modelo de datos Supabase, diagramas, seguridad de diseño. |
| 7 | `07-modulo-ia-riesgo-empresarial.md` | Definición de riesgo, datos, modelo, validación, sesgos, trazabilidad al título de tesis. |
| 8 | `08-pruebas-y-calidad.md` | Plan maestro de pruebas, tipos de prueba, Vitest/Playwright, cobertura, ISO 25010 operacionalizado. |
| 9 | `09-implementacion-despliegue-ci.md` | Stack **real** (React, Supabase, Firebase Auth/Hosting), migraciones, CI, automatizaciones y **2 respaldos por proceso**. |
| 10 | `10-operacion-y-seguridad.md` | Despliegue, variables de entorno, backups lógicos, incidentes, continuidad. |
| 11 | `11-trazabilidad-estado-del-arte.md` | Matriz **artículo → requisito/decisión → evidencia** respecto de `estado_del_arte.md`. |
| 12 | `12-anexos-glosario-bibliografia-documental.md` | Glosario, siglas, bibliografía **documental** (normas, guías), anexos de tesis. |
| 13 | `13-checklist-cierre-defensa.md` | Lista maestra de verificación pre-jurado (tesis + ISO + trazabilidad + automatización). |
| 14 | `14-mapa-documentos-a-capitulos-tesis.md` | Puente entre esta documentación y la estructura de capítulos del documento de tesis. |

---

## Cuadros tipo Excel (obligatorio completar en hoja de cálculo)

| Archivo CSV | Descripción |
|---------------|-------------|
| `cuadros-excel/CU-T01-stakeholders.csv` | Partes interesadas, poder/interés, estrategia. |
| `cuadros-excel/CU-T02-edt-wbs.csv` | EDT descomposición del trabajo. |
| `cuadros-excel/CU-T03-cronograma.csv` | Fases, entregables, fechas planificadas/reales. |
| `cuadros-excel/CU-T04-matriz-riesgos-proyecto.csv` | Riesgos proyecto (no solo software). |
| `cuadros-excel/CU-T05-requisitos.csv` | Lista maestra de requisitos con ID estable. |
| `cuadros-excel/CU-T06-trazabilidad-articulo-requisito.csv` | Estado del arte ↔ requisitos. |
| `cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv` | Requisitos ↔ casos de prueba ↔ resultado. |
| `cuadros-excel/CU-T08-automatizacion-respaldos.csv` | Cada automatización con **≥2 respaldos** (norma/artículo + evidencia). |

Guía de exportación: `cuadros-excel/README-tablas-exportables.md`.

---

## Plantillas operativas

| Plantilla | Uso |
|-----------|-----|
| `plantillas/PL-01-acta-revision-documento.md` | Revisiones formales de documentos (calidad). |
| `plantillas/PL-02-minuta-reunion.md` | Decisiones y compromisos. |
| `plantillas/PL-03-registro-ejecucion-prueba.md` | Evidencia de prueba manual o exploratoria. |
| `plantillas/PL-04-registro-incidente-produccion.md` | Postmortem ligero. |

## Cierre de defensa

- `13-checklist-cierre-defensa.md` — verificación final antes de entregar al jurado.

---

## Documentación en `calzatura-vilchez/docs/` (aplicación)

| Ruta | Rol |
|------|-----|
| `documentacion-general-sistema.md` | Visión del sistema (**sincronizada** a Supabase + Firebase). |
| `formato-09-alcance-proyecto-software.md` | Formato 09 académico (**sincronizado** con persistencia actual). |
| `15-modulos/README.md` | Índice de auditorías por módulo. |
| `15-modulos/AdminDashboard-auditoria.md` | Ejemplo de auditoría ISO (dashboard). |
| `CU-T07-LEEME.md` | Puntero a la matriz de pruebas canónica. |
| `security-audit.md`, `procesos/bpmn/` | Seguridad y procesos. |

Detalle de integración y checklist: `INTEGRACION-DOCS-EXISTENTES.md`.

---

## Control de versiones de esta documentación

| Versión | Fecha | Autor / rol | Cambio resumido |
|---------|--------|-------------|-----------------|
| 1.0 | 2026-05-01 | Equipo tesis | Creación del paquete documental maestro en `documentacion/`. |
| 1.1 | 2026-05-02 | Equipo tesis | CU-T07 canónico único; CU-T08 con CI; integración con `calzatura-vilchez/docs`; formato-09 y formato general alineados a Supabase. |

*(Actualizar esta tabla en cada entrega formal a asesoría o jurado.)*
