# 07 — Módulo de inteligencia artificial y riesgo empresarial

**Vinculación obligatoria:** título de tesis — *predicción del riesgo empresarial*.

## 0. Estado de cierre documental (v1.1)

| Ítem | Estado | Nota |
|------|--------|------|
| Marco §1 definición de *R* | Pendiente decisión director | Sin *R* no hay métricas defendibles. |
| Fuentes de datos §3 | Plantilla lista | Completar con ventanas reales de extracción. |
| Código servicio IA | Revisar repo | Si existe `ai-service/` u homólogo, enlazar rutas, versiones de dependencias y comando de inferencia. |
| Validación §6 | Pendiente ejecución | Tabla de métricas vacía hasta correr experimentos. |
| Integración UI §7 | Pendiente | Rutas React del panel de predicción / riesgo cuando estén cerradas. |

Este documento queda **estructuralmente completo**; el cierre científico depende de datos y resultados (tesis), no solo de redacción.

## 1. Marco conceptual

### 1.1 Definición operativa de “riesgo empresarial” *R*

> **Completar con director:** elegir UNA definición principal para la tesis, por ejemplo:

- **R1 — Riesgo operativo de stock:** probabilidad de ruptura de stock en horizonte *H* días que implora pérdida de ventas > *X* %.  
- **R2 — Riesgo financiero de margen:** probabilidad de que el margen bruto caiga por debajo de umbral *m* en el trimestre.  
- **R3 — Riesgo de liquidez simplificado:** índice proxy basado en ventas vs. stock y cuentas por cobrar *(si hay datos)*.

Sin esta definición cerrada, **no** se puede validar el modelo académicamente.

### 1.2 Preguntas de investigación vinculadas al software

1. ¿Qué datos del sistema e-commerce y administrativos alimentan *R*?  
2. ¿Qué algoritmo(s) se comparan (baseline vs. modelo)?  
3. ¿Cómo se mide el error y la utilidad para el decisor de Calzatura Vilchez?

## 2. Stakeholders del módulo IA

| Stakeholder | Necesidad | Implicación |
|-------------|-----------|-------------|
| Dirección | Alertas accionables | UX simple, explicación |
| Administrador | Confianza en el número | Trazabilidad de datos |
| Jurado | Método científico | Protocolo reproducible |

## 3. Datos

### 3.1 Fuentes internas (Supabase)

| Fuente | Campos relevantes | Frecuencia |
|--------|-------------------|------------|
| `ventasDiarias` | cantidad, precio, fecha, producto | Diaria |
| `productos` | stock, tallaStock, precio | Por evento |
| `productoFinanzas` | costos, márgenes | Por cambio admin |

### 3.2 Calidad de datos (DQ)

| Dimensión | Métrica | Umbral |
|-----------|---------|--------|
| Completitud | % nulos por campo clave | *(definir)* |
| Consistencia | Violaciones reglas negocio | 0 en entrenamiento |
| Actualidad | Lag máximo datos | *(definir)* |

### 3.3 Privacidad

- Agregaciones cuando no sea necesario nivel pedido.  
- Anonimización de cliente si el modelo no requiere identidad.

## 4. Ingeniería de características (feature engineering)

Documentar tablas `features_*.csv` o vistas materializadas en anexo:

| Feature | Fórmula / origen | Justificación literaria |
|---------|------------------|---------------------------|
| *(ej.)* ventas_rolling_7d | sum(ventas últimos 7d) | Demanda reciente |
| *(ej.)* cobertura_stock | stock / velocidad venta | Riesgo quiebre |

**Trazabilidad:** cada grupo de features debe citar al menos un artículo o libro en `CU-T06`.

## 5. Modelado

### 5.1 Baseline

- Promedio móvil, ARIMA simple, regresión logística sobre *R* binario, etc.

### 5.2 Modelo principal

- Algoritmo: *(Random Forest, XGBoost, red neuronal… — completar)*.  
- Hiperparámetros: grid documentado.  
- Semilla aleatoria fija para reproducibilidad (**RF-IA-05**).

### 5.3 Salida

- Tipo: probabilidad / clase / intervalo.  
- Horizonte temporal de predicción: *H*.

## 6. Validación

| Conjunto | Proporción | Métrica principal | Valor obtenido |
|----------|------------|-------------------|----------------|
| Entrenamiento | | | |
| Validación | | | |
| Prueba hold-out | | RMSE / AUC / Brier | |

### 6.1 Interpretación

- Importancia de variables / SHAP *(opcional)*.  
- Casos donde el modelo falla (análisis de residuos).

## 7. Integración con el sistema web

- Pantalla(s): ruta `…` en React.  
- Llamada HTTP: método, URL, payload, códigos error.  
- Estados de carga y error para el usuario.

## 8. Limitaciones y sesgos

| Limitación | Impacto | Mitigación declarada |
|------------|---------|----------------------|
| Muestra pequeña PYME | Generalización baja | No extrapolar a otras empresas |
| Cambio de catálogo | Covariate shift | Reentrenamiento periódico |

## 9. Plan de contingencia si el modelo no alcanza métricas

- Entregar **análisis exploratorio** + **línea base** + **roadmap** como resultado parcial defendible.  
- Registrar en acta con director.

## 10. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Plantilla exhaustiva; completar con resultados empíricos. |
| 1.1 | 2026-05-02 | Sección 0: estado explícito de cierre documental vs trabajo empírico pendiente. |
