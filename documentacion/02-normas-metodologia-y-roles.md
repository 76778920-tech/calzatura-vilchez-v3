# 02 — Normas de referencia, metodología y roles

## 1. Normas y estándares de referencia (sin certificación)

Esta tesis **adopta** principios de las siguientes normas como **marco de trabajo documental**. No implica certificación ISO de la empresa ni del software.

| Referencia | Uso en el proyecto | Productos de trabajo que sustenta |
|------------|-------------------|-----------------------------------|
| **ISO/IEC 12207:2017** (Systems and software engineering — Software life cycle processes) | Estructurar **procesos** del ciclo de vida: adquisición, desarrollo, operación, mantenimiento | Planes, especificaciones, diseños, registros de prueba |
| **ISO/IEC 25010:2011** (Systems and software Quality Requirements and Evaluation — SQuaRE) | Características de **calidad del producto** | Requisitos no funcionales, criterios de prueba |
| **ISO 9001:2015** (solo cláusula 7.5 como analogía) | Control de **información documentada** | Versiones, aprobaciones, retención (`00-gestion-documental.md`) |
| **IEEE 830-1998** (SRS) — referencia clásica | Estructura de **especificación de requisitos** | `05-especificacion-requisitos-software-SRS.md` |
| **IEEE 829-2008** (Test documentation) — referencia clásica | Documentación de **pruebas** | `08-pruebas-y-calidad.md` |

## 2. Mapeo ISO/IEC 12207 → documentos de este repositorio

| Proceso / resultado 12207 (resumen) | Documento en `documentacion/` |
|-------------------------------------|------------------------------|
| Acuerdos de desarrollo / planificación | `03`, `04` |
| Análisis de requisitos | `05` |
| Diseño arquitectónico y detallado | `06` |
| Implementación | `09` + código |
| Integración y pruebas | `08` + reportes CI |
| Entrega / instalación | `09`, `10` |
| Mantenimiento (conceptual) | `10`, actas de cambio |

## 3. ISO/IEC 25010 — modelo de calidad aplicado

### 3.1 Características prioritarias para este sistema

| Característica 25010 | Cómo se exige en el proyecto | Evidencia |
|----------------------|------------------------------|-----------|
| **Seguridad** | Auth, roles, no exposición de claves, validación en servidor (RPC/triggers) | `06`, `10`, tests |
| **Rendimiento** | Tiempos de carga aceptables en catálogo | pruebas manuales / Lighthouse |
| **Usabilidad** | Flujos de compra y admin | UX, E2E |
| **Confiabilidad** | Integridad datos, migraciones | Supabase migrations, tests |
| **Mantenibilidad** | TypeScript, dominios, tests | estructura `src/domains` |
| **Portabilidad** | Despliegue en hosting estándar | Firebase Hosting + build Vite |

### 3.2 Matriz RNF → característica 25010

*(Completar en `05` y CSV `CU-T05`; tabla guía:)*

| ID RNF | Descripción breve | Característica 25010 |
|--------|-------------------|----------------------|
| RNF-SEG-01 | Autenticación obligatoria en rutas admin | Seguridad |
| RNF-USA-01 | Checkout en ≤ N pasos *(definir N)* | Usabilidad |

## 4. Metodología de desarrollo elegida

### 4.1 Propuesta: **proceso unificado ligero + iteraciones cortas**

Combinación defendible en tesis:

- **Fases** (inspiración UP / 12207): incepción, elaboración, construcción, transición.  
- **Iteraciones** internas tipo **Scrum** de 1–2 semanas con entregable documental al cierre.

### 4.2 Ceremonias mínimas

| Ceremonia | Frecuencia | Salida documental |
|-----------|------------|-------------------|
| Planificación de iteración | Cada iteración | Actualización `CU-T03-cronograma.csv` |
| Revisión con asesor | Acordada | `PL-02-minuta-reunion.md` |
| Retrospectiva | Opcional quincenal | Mejoras en `03` riesgos |

### 4.3 Definición de “Hecho” (DoD) para incremento software

- Código fusionado en rama principal con **CI verde** (`npm run quality` o subconjunto acordado).  
- Pruebas automáticas nuevas o actualizadas si hay lógica crítica.  
- Documentación: SRS o matriz de trazabilidad actualizada si el cambio afecta requisitos.  
- Sin secretos en repo.

## 5. Matriz RACI (Responsable, Aprobador, Consultado, Informado)

Completar nombres en `cuadros-excel` si se prefiere hoja; aquí plantilla resumida:

| Actividad | Director tesis | Ingeniero | Autor desarrollo | Empresa CV |
|-----------|----------------|-----------|------------------|------------|
| Aprobación SRS | A | R | C | C |
| Diseño arquitectura | I | A | R | C |
| Despliegue producción | I | A | R | C |
| Validación modelo IA | A | R | C | R |
| Pruebas E2E | I | C | R | I |

Leyenda: **R** Responsible, **A** Accountable/Approver, **C** Consulted, **I** Informed.

## 6. Herramientas

| Categoría | Herramienta | Uso documental |
|-----------|-------------|----------------|
| Código | Git | Historial |
| CI | GitHub Actions / otro *(completar)* | Evidencia automatización |
| Pruebas | Vitest, Playwright | Reportes |
| Hojas de cálculo | Excel / Calc | Cuadros `cuadros-excel/*.csv` |
| Modelado | BPMN (Camunda / bpmn.io) | `calzatura-vilchez/docs/procesos/bpmn/` |

## 7. Registro de cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial. |
