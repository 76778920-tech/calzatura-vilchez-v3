# Documentación del Modelo de IA — Calzatura Vilchez

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-05-05 |
| Modelo principal | RandomForestRegressor (scikit-learn 1.5) |
| Índice de riesgo | IRE (Índice de Riesgo Empresarial) |
| Framework | Python 3.12 + FastAPI 0.111 |
| Norma de calidad | ISO/IEC 25010:2011 — Funcionalidad; ISO/IEC 27001 — Trazabilidad del modelo |

---

## 1. Descripción del sistema de IA

El sistema de IA de Calzatura Vilchez tiene tres componentes principales:

1. **Predicción de demanda:** Estima cuántas unidades se venderán de cada producto en los próximos N días.
2. **Índice de Riesgo Empresarial (IRE):** Calcula un score 0-100 que combina riesgo de stock, riesgo de ingresos y riesgo de demanda.
3. **Alertas de stock:** Identifica productos que se agotarán antes del horizonte configurado.

El sistema se implementa como un microservicio FastAPI desplegado en Render.com, consumiendo datos históricos de Supabase.

---

## 2. Dataset y fuentes de datos

### 2.1 Fuentes de datos

| Fuente | Tabla Supabase | Variables extraídas |
|---|---|---|
| Ventas presenciales | `ventasDiarias` | productId, cantidad, fecha, precio, devolucion |
| Pedidos online confirmados | `pedidos` | productos (jsonb array), createdAt, estado |
| Catálogo de productos | `productos` | id, nombre, precio, stock, categoria, marca, destacado |
| Códigos internos | `productoCodigos` | productId, codigo |

### 2.2 Construcción del dataset de entrenamiento

El servicio IA unifica las dos fuentes de ventas (ventas diarias + pedidos completados) en una serie temporal de unidades vendidas por producto por día:

```python
# Pseudocódigo del proceso de build_daily_sales_by_product()
for cada venta en ventasDiarias (no devuelta):
    series[productId][fecha] += cantidad

for cada pedido en pedidos (estado='confirmado'):
    for cada item en pedido.productos:
        series[item.productId][pedido.fecha] += item.cantidad

# Resultado: dict {productId: {fecha: unidades}}
```

**Preprocesamiento:**
- Las devoluciones (`devolucion=True`) se excluyen del conteo.
- Los pedidos cancelados no se incluyen.
- Las fechas sin ventas se rellenan con 0 (demanda intermitente tratada explícitamente).
- Las series se truncan al período de `history_days` configurado.

### 2.3 Variables del modelo

**Variable objetivo (target):**
- `y`: unidades vendidas por día para cada producto

**Variables predictoras (features) por producto:**

| Feature | Descripción | Tipo |
|---|---|---|
| `weekday` | Día de la semana de la observación | Calendario |
| `month` | Mes del año | Calendario |
| `day_of_month` | Día del mes | Calendario |
| `lag_7` | Promedio diario vendido en los últimos 7 días | Histórico |
| `lag_30` | Promedio diario vendido en los últimos 30 días | Histórico |
| `categoria` | Categoría comercial del producto codificada | Categórica |
| `campana` | Campaña comercial del producto codificada | Categórica |
| `temporada_verano` | Bandera de temporada verano (dic-mar) | Estacional |
| `temporada_escolar` | Bandera de inicio escolar (feb-mar) | Estacional |
| `temporada_fiestas_patrias` | Bandera de Fiestas Patrias (jul) | Estacional |
| `temporada_navidad` | Bandera de Navidad / fin de año (nov-dic) | Estacional |

*Fundamento académico: Fildes et al. (2022) — Las covariables más relevantes para forecasting retail incluyen historial de ventas, estacionalidad, tendencia y señales comerciales. Por ello, el modelo incorpora lags de ventas, variables de calendario, categoría, campaña y banderas de temporada propias del negocio de calzado.*

---

## 3. Algoritmo de predicción de demanda

### 3.1 RandomForestRegressor

El modelo usa RandomForestRegressor de scikit-learn con los siguientes hiperparámetros:

| Hiperparámetro | Valor | Justificación |
|---|---|---|
| `n_estimators` | 100 | Suficiente para convergencia en datasets pequeños (Breiman, 2001) |
| `max_features` | "sqrt" | Reduce correlación entre árboles (selección aleatoria de √p features) |
| `min_samples_leaf` | 2 | Evita sobreajuste en series cortas |
| `random_state` | 42 | Reproducibilidad de resultados |

**Proceso de entrenamiento:**
1. Para cada producto con ≥ 14 días de historial:
   - Construir la serie temporal diaria de ventas.
   - Calcular las 7 features descritas en la sección 2.3.
   - Entrenar el RandomForestRegressor con las N observaciones del historial.
   - Predecir las ventas para el horizonte configurado (7/15/30 días).
   - Calcular el score de confianza basado en la densidad de datos.

2. Para cada producto con < 14 días de historial:
   - Marcar `sin_historial=True`, `prediccion_unidades=0`, `confianza=0`.

**Score de confianza:**
```python
# Basado en la densidad de datos en el período de historial
densidad = dias_con_ventas / history_days  # [0, 1]
confianza = int(densidad * 100)  # [0, 100]
```

### 3.2 Modelo híbrido (estadístico + ML)

Para productos con pocos datos (14-30 días de historial), el modelo usa una combinación de:
- **Regresión lineal ponderada** (penaliza observaciones antiguas): captura la tendencia reciente.
- **Media móvil** de los últimos 7 días: suaviza el ruido de días atípicos.

```python
# Combinación del modelo híbrido
prediccion = 0.6 * regresion_lineal + 0.4 * media_movil_7dias
```

*Fundamento académico: Makridakis et al. (2018) — Los métodos estadísticos (regresión lineal, media móvil) tienen precisión comparable a ML cuando el historial es corto (< 200 observaciones). sMAPE estadístico: 13.7% vs. ML: 14.8% en el benchmark M3. Este hallazgo justifica el modelo híbrido implementado para series cortas.*

---

## 4. Índice de Riesgo Empresarial (IRE)

### 4.1 Fórmula del IRE

```
IRE = (riesgo_stock × 0.40) + (riesgo_ingresos × 0.35) + (riesgo_demanda × 0.25)
```

**Ponderación justificada:**
- **Stock (40%):** El quiebre de stock es el impacto más inmediato y visible para el cliente (pérdida directa de venta). Beaver (1966) identifica el flujo de caja operativo como el predictor más poderoso de riesgo empresarial.
- **Ingresos (35%):** La caída de ingresos refleja el deterioro del negocio en el medio plazo. Altman (1968) incluye las ventas/activos (X₅) como componente del Z-score.
- **Demanda (25%):** La tendencia de demanda predice el riesgo futuro pero es un indicador más volátil.

### 4.2 Cálculo de cada componente

**Riesgo de stock:**
```python
productos_en_riesgo = [p for p in predicciones if p.dias_hasta_agotarse <= horizon_days]
riesgo_stock = (len(productos_en_riesgo) / total_productos) * 100
```

**Riesgo de ingresos:**
```python
ingreso_media_historica = media de ingresos diarios en los últimos 90 días
ingreso_proyectado_diario = suma(prediccion_diaria * precio) para todos los productos
if ingreso_proyectado_diario < ingreso_media_historica:
    riesgo_ingresos = (1 - ingreso_proyectado_diario / ingreso_media_historica) * 100
else:
    riesgo_ingresos = 0
```

**Riesgo de demanda:**
```python
productos_bajando = [p for p in predicciones if p.tendencia == "bajando"]
riesgo_demanda = (len(productos_bajando) / total_productos) * 100
```

### 4.3 Clasificación y umbrales

| Rango del IRE | Clasificación | Interpretación operativa |
|---|---|---|
| 0 – 25 | Bajo | El negocio opera sin señales de riesgo significativas. Mantener monitoreo rutinario. |
| 26 – 50 | Moderado | Hay señales de tensión en stock o ingresos. Revisar productos en alerta esta semana. |
| 51 – 75 | Alto | Múltiples productos en riesgo de agotamiento. Ordenar reabastecimiento urgente. |
| 76 – 100 | Crítico | Riesgo inminente de pérdida de ventas significativa. Acción inmediata requerida. |

*Fundamento académico: Los umbrales siguen el patrón de zonas de riesgo del Z-score de Altman (1968): zona segura (Z > 2.99), zona gris (1.81-2.99) y zona de peligro (Z < 1.81). La adaptación al IRE usa cuatro zonas en lugar de tres para mayor granularidad en el contexto PYME.*

### 4.4 IRE proyectado

El IRE proyectado estima el score al horizonte configurado asumiendo que no se hace ninguna intervención:

```python
stock_proyectado = stock_actual - prediccion_unidades_horizon
productos_agotados_en_horizonte = [p for p if stock_proyectado[p] <= 0]
ire_proyectado = compute_ire(
    riesgo_stock = len(productos_agotados_en_horizonte) / total_productos * 100,
    riesgo_ingresos = ...,  # basado en predicción de ingresos
    riesgo_demanda = ...
)
```

---

## 5. Métricas de evaluación del modelo

### 5.1 Métricas para predicción de demanda

| Métrica | Fórmula | Umbral de aceptación | Artículo base |
|---|---|---|---|
| MAE | Σ\|real - pred\| / n | ≤ 3 unidades/producto/período | Makridakis et al. (2018) |
| sMAPE | 200 × Σ\|real-pred\| / (real+pred) / n | ≤ 30% | Makridakis et al. (2018) — benchmark M3: 12.7% (Theta), objetivo PYME 30% |
| RMSE | √(Σ(real-pred)² / n) | ≤ 5 unidades | Fildes et al. (2022) |
| Confianza promedio | media del score de confianza de todos los productos | ≥ 60 sobre 100 | Criterio interno |

### 5.2 Métricas para el IRE

| Métrica | Descripción | Umbral |
|---|---|---|
| Precisión de alerta de stock | % de alertas que efectivamente se agotaron en el período predicho | ≥ 70% |
| Recall de alerta de stock | % de agotamientos reales que el modelo predijo | ≥ 80% |
| AUC-ROC del riesgo | Capacidad discriminante del IRE para predecir períodos de crisis vs. normales | ≥ 0.80 |

*Fundamento: Ozbayoglu et al. (2020) — Para predicción de riesgo empresarial, los modelos de DL logran AUC = 0.89 vs. métodos tradicionales AUC = 0.72. El umbral de AUC ≥ 0.80 es consistente con este benchmark para el modelo de regresión actual.*

---

## 6. Limitaciones conocidas y mejoras futuras

### 6.1 Limitaciones actuales

| Limitación | Impacto | Artículo que la identifica |
|---|---|---|
| Historial corto (< 90 días por PYME nueva) | Predicciones con baja confianza para productos nuevos | Makridakis et al. (2018) — ML supera estadísticos solo con n > 200 observaciones |
| Sin covariables externas (precio, campaña) | El modelo no captura el efecto de promociones o temporadas | Fildes et al. (2022) — Covariables reducen RMSE en 15-25% |
| Demanda intermitente no modelada específicamente | Error alto en productos de baja rotación (CV² > 0.49) | Fildes et al. (2022) — Croston/TSB es superior para demanda intermitente |
| Sin modelado de correlaciones entre productos | No captura el efecto sustituto/complementario entre productos | Fildes et al. (2022) |

### 6.2 Roadmap de mejoras

**Corto plazo (próximos 3 meses):**
- Incorporar el precio del producto como covariable del modelo (efecto precio-demanda).
- Implementar el método de Croston para productos con demanda intermitente (CV² > 0.49).

**Medio plazo (6-12 meses, cuando historial > 2 años):**
- Migrar a arquitectura LSTM (Fischer & Krauss, 2018) para capturar dependencias temporales largas.
- Implementar selección de variables LASSO (Tian et al., 2015) para el componente de riesgo financiero.

**Largo plazo:**
- Incorporar análisis de sentimientos de reseñas de clientes como señal predictiva (Liang & Turban, 2011).
- Desarrollar el módulo de predicción de riesgo de insolvencia basado en Altman Z''-score adaptado para PYMES (Altman, 1968) con ratios financieros del balance de Calzatura Vilchez.

---

## 7. Reproducibilidad y versionado del modelo

### 7.1 Persistencia del estado del modelo

El modelo no persiste el modelo entrenado a disco (no se serializa con joblib/pickle). En su lugar, persiste los metadatos del entrenamiento (`training_meta`) en la tabla `modelo_estado` de Supabase:

```json
{
  "model_type": "random_forest",
  "n_products_trained": 45,
  "n_products_no_data": 8,
  "data_hash": "sha256 del dataset de entrenamiento",
  "cached_at": "2026-05-05",
  "hyperparameters": {
    "n_estimators": 100,
    "max_features": "sqrt",
    "random_state": 42
  }
}
```

Al reiniciarse el servicio, se restauran los metadatos desde Supabase para proveer contexto sin necesidad de reentrenamiento inmediato.

### 7.2 Detección de cambios en los datos

El campo `data_hash` es un hash SHA-256 del dataset de entrenamiento (fechas + cantidades). Si el hash cambia entre solicitudes, el servicio sabe que hay datos nuevos y puede reentrenar el modelo. Esto garantiza que el modelo siempre usa los datos más recientes disponibles.

*Fundamento ISO/IEC 27001: Control A.12.4 — Registro y monitoreo. La trazabilidad del modelo (qué datos se usaron, cuándo se entrenó) es parte de la auditoría del sistema de IA.*
