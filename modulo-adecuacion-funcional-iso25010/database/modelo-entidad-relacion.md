# Modelo Entidad-Relación — Adecuación Funcional (ISO/IEC 25010)

**Sistema:** Gestión de Calzados Calzatura Vilchez  
**Característica:** Adecuación Funcional (Functional Suitability)  
**Subcaracterísticas medidas:** Completitud Funcional, Corrección Funcional, Tasa de Éxito de Casos de Prueba

## Diagrama ER

```mermaid
erDiagram
    QC_EVALUACIONES ||--o{ QC_FUNCIONES : contiene
    QC_EVALUACIONES ||--o{ QC_TRANSACCIONES_FUNCIONALES : contiene
    QC_EVALUACIONES ||--o{ QC_CASOS_PRUEBA : contiene

    QC_EVALUACIONES {
        uuid id PK
        varchar codigo UK
        varchar titulo
        varchar sistema
        varchar periodo
        varchar evaluador
        date fecha_evaluacion
        text observaciones
        timestamptz created_at
        timestamptz updated_at
    }

    QC_FUNCIONES {
        uuid id PK
        uuid evaluacion_id FK
        varchar codigo_rf UK
        varchar modulo
        varchar nombre
        text descripcion
        boolean requerida
        boolean implementada
        text evidencia
        timestamptz verificado_en
    }

    QC_TRANSACCIONES_FUNCIONALES {
        uuid id PK
        uuid evaluacion_id FK
        varchar codigo UK
        varchar modulo
        text descripcion
        boolean evaluada
        boolean correcta
        timestamptz fecha_prueba
        text observaciones
    }

    QC_CASOS_PRUEBA {
        uuid id PK
        uuid evaluacion_id FK
        varchar codigo UK
        varchar nombre
        varchar modulo
        text descripcion
        boolean ejecutado
        boolean aprobado
        timestamptz fecha_ejecucion
        text observaciones
    }
```

## Relaciones

| Relación | Cardinalidad | Regla |
|----------|--------------|-------|
| Evaluación → Funciones | 1:N | Cada función pertenece a una evaluación; `codigo_rf` único por evaluación |
| Evaluación → Transacciones | 1:N | Casos de corrección funcional (transacciones de negocio) |
| Evaluación → Casos de prueba | 1:N | Casos ejecutados para TECP |

## Fórmulas (vistas / capa de negocio)

| Indicador | Fórmula ISO | Implementación |
|-----------|-------------|----------------|
| **CF** Completitud Funcional | `(Funciones implementadas / Funciones requeridas) × 100` | `COUNT(implementada=true AND requerida=true) / COUNT(requerida=true)` |
| **COF** Corrección Funcional | `(Transacciones correctas / Transacciones evaluadas) × 100` | `COUNT(correcta=true AND evaluada=true) / COUNT(evaluada=true)` |
| **TECP** Tasa Éxito Casos | `(Casos aprobados / Casos ejecutados) × 100` | `COUNT(aprobado=true AND ejecutado=true) / COUNT(ejecutado=true)` |

## Escala de clasificación

| Rango | Clasificación |
|-------|---------------|
| 90% – 100% | Excelente |
| 80% – 89% | Bueno |
| 70% – 79% | Aceptable |
| &lt; 70% | Deficiente |
