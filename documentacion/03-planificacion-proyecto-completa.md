# 03 — Planificación del proyecto (completa)

## 1. Plan maestro del proyecto (resumen ejecutivo)

### 1.1 Objetivo del plan maestro

Coordinar **tiempo**, **alcance**, **calidad** y **riesgos** del trabajo de tesis + implementación, de forma que el producto software y el **módulo de IA** estén **alineados** con el título de tesis y con los entregables académicos.

### 1.2 Hitos académicos típicos (adaptar fechas reales)

| Hito | Descripción | Entregable | Fecha plan | Fecha real |
|------|-------------|------------|------------|-------------|
| H0 | Aprobación propuesta | Documento propuesta | | |
| H1 | Estado del arte cerrado v1 | `estado_del_arte.md` + matriz `CU-T06` | | |
| H2 | SRS baseline v1 | `05-...` aprobado | | |
| H3 | Arquitectura baseline | `06-...` aprobado | | |
| H4 | MVP e-commerce | Demo funcional | | |
| H5 | Modelo IA v1 validado | `07-...` + métricas | | |
| H6 | Integración IA en web | Capturas + E2E/manual | | |
| H7 | Versión candidata defensa | Tag release + informe pruebas | | |

## 2. EDT / WBS (estructura analítica del proyecto)

La descomposición detallada numérica está en **`cuadros-excel/CU-T02-edt-wbs.csv`**. Árbol lógico de referencia:

```
1. Proyecto de tesis Calzatura Vilchez
  1.1 Gestión de proyecto
    1.1.1 Planificación y seguimiento
    1.1.2 Gestión de riesgos proyecto
    1.1.3 Comunicación con stakeholders
  1.2 Ingeniería de software
    1.2.1 Requisitos y trazabilidad
    1.2.2 Diseño arquitectura y datos
    1.2.3 Implementación frontend/backend serverless
    1.2.4 Pruebas y calidad
    1.2.5 Despliegue y operación
  1.3 Inteligencia artificial y riesgo
    1.3.1 Marco teórico y variables
    1.3.2 Ingeniería de datos
    1.3.3 Modelado y entrenamiento
    1.3.4 Validación e interpretación
    1.3.5 Integración con sistema web
  1.4 Documentación de tesis
    1.4.1 Capítulos y anexos
    1.4.2 Figuras y tablas (Excel exportados)
    1.4.3 Redacción final y formato institucional
```

## 3. Cronograma por fases

**Fuente editable:** `cuadros-excel/CU-T03-cronograma.csv`

### 3.1 Vista Gantt descrita (texto)

| Fase | Duración orientativa | Dependencias | Paralelo con |
|------|----------------------|--------------|--------------|
| Fase A — Marco y requisitos | 3–4 semanas | — | Literatura IA riesgo |
| Fase B — Diseño e implementación core e-commerce | 4–8 semanas | SRS baseline | — |
| Fase C — Datos y modelo IA | 4–10 semanas | Definición riesgo | Parcial con B |
| Fase D — Pruebas integración y endurecimiento | 2–4 semanas | B+C | — |
| Fase E — Cierre documental y tesis | 2–6 semanas | D | Redacción |

## 4. Plan de gestión de riesgos del **proyecto** (no solo software)

**Registro maestro:** `cuadros-excel/CU-T04-matriz-riesgos-proyecto.csv`

### 4.1 Ejemplos de riesgos (completar probabilidad/impacto)

| ID | Riesgo | Categoría | Mitigación | Propietario |
|----|--------|-----------|------------|--------------|
| RP-01 | Retraso en aprobación de capítulos | Académico | Entregas parciales fijas | Autor |
| RP-02 | Datos insuficientes para IA | Técnico | Escenarios sintéticos + transfer learning | Autor |
| RP-03 | Cambio de stack en mitad del proyecto | Técnico | Congelar línea base arquitectura | Ingeniero |
| RP-04 | Indisponibilidad cloud | Operativo | Entorno demo local documentado | Autor |

## 5. Plan de comunicaciones

| Audiencia | Frecuencia | Canal | Contenido mínimo |
|-----------|------------|-------|------------------|
| Director | Semanal/bisemanal | Reunión + correo | Avance vs cronograma |
| Ingeniero | Quincenal | Reunión | ISO, riesgos, automatización |
| Empresa | Mensual | Reunión | Demostración incremental |

Plantilla: `plantillas/PL-02-minuta-reunion.md`.

## 6. Presupuesto de esfuerzo (horas-hombre) — plantilla

| Paquete de trabajo | Horas estimadas | Horas reales | Notas |
|--------------------|-----------------|--------------|-------|
| Requisitos + SRS | | | |
| Implementación web | | | |
| IA + validación | | | |
| Pruebas + documentación | | | |

## 7. Criterios de control de alcance

- Todo **nuevo** requisito debe: (1) ID en `CU-T05`, (2) impacto en cronograma registrado, (3) aprobación explícita en acta si afecta fecha de defensa.

## 8. Registro de cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Versión inicial. |
