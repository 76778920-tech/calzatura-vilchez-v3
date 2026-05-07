# 07 - Módulo de inteligencia artificial y riesgo empresarial

**Vinculación obligatoria:** título de tesis - *predicción del riesgo empresarial*.

## 0. Estado de cierre documental (v1.2)

| Item | Estado | Nota |
|------|--------|------|
| Definición de riesgo empresarial R | Cerrado | R se operacionaliza como riesgo empresarial comercial-operativo del e-commerce mediante el IRE. |
| Fuentes de datos | Cerrado para versión actual | Supabase: `ventasDiarias`, `pedidos`, `productos`, `productoCodigos` e historial `ireHistorial`. |
| Codigo servicio IA | Implementado | Backend en `ai-service/`, API principal `GET /api/predict/combined`. |
| Validación | Cerrada para consistencia interna | Se validan invariantes, umbrales, monotonía de horizonte, contribuciones y tests automatizados. La calibración predictiva requiere eventos reales etiquetados. |
| Integración UI | Implementada | Panel React `AdminPredictions.tsx` muestra score, fórmula, variables, versión y trazabilidad del IRE. |

Este documento queda alineado con la implementación del repositorio. El cierre científico de mayor nivel, como AUC o calibración contra eventos reales de quiebre, queda condicionado a que la empresa etiquete eventos históricos suficientes.

## 1. Definición operativa de riesgo empresarial

En esta tesis, el constructo "riesgo empresarial" no se entiende como riesgo crediticio, insolvencia contable o probabilidad formal de quiebra. Se acota al contexto de Calzatura Vilchez como:

> **Riesgo empresarial comercial-operativo:** nivel de exposición de la empresa a pérdidas o presión de gestión producidas por quiebre de stock, baja o alta demanda no atendida, caída proyectada de ingresos y cambios relevantes en el comportamiento reciente de ventas.

El sistema lo mide mediante el **IRE - Índice de Riesgo Empresarial**, un índice proxy de 0 a 100 con cuatro niveles:

| Rango | Nivel | Interpretación |
|-------|-------|----------------|
| 0-25 | Bajo | Operación controlada, sin señales relevantes de presión. |
| 26-50 | Moderado | Señales preventivas que requieren monitoreo. |
| 51-75 | Alto | Riesgo elevado que requiere intervención comercial u operativa. |
| 76-100 | Crítico | Riesgo severo de pérdida de ventas, ingresos o cobertura de inventario. |

## 2. Formula y variables del IRE

```text
IRE = riesgo_stock * 0.40 + riesgo_ingresos * 0.35 + riesgo_demanda * 0.25
```

| Variable | Peso | Datos usados | Interpretación |
|----------|------|--------------|----------------|
| Riesgo de stock | 40% | productos críticos, en atención, en vigilancia, sin stock con demanda | Mide presión del inventario y probabilidad operativa de perder ventas por falta de producto. |
| Riesgo de ingresos | 35% | tendencia de ingresos, crecimiento proyectado, confianza del forecast | Mide presión comercial-financiera por caída o baja confiabilidad de ingresos futuros. |
| Riesgo de demanda | 25% | productos con demanda bajando, alta demanda con bajo stock, drift alto | Mide cambios relevantes del mercado observado en el e-commerce. |

La UI muestra cada dimensión como subíndice entero redondeado. El IRE final se calcula con los valores continuos internos y luego se redondea. Las contribuciones por variable se reparten en puntos enteros mediante mayor resto para que la suma visible de aportes coincida exactamente con el score mostrado.

## 3. Reglas internas y supuestos metodologicos

### 3.1 Riesgo de stock

El subíndice de stock pondera la severidad operativa:

```text
stock = criticos*1.00 + atencion*0.55 + vigilancia*0.25 + sin_stock_con_demanda*0.20
```

Cada término se calcula como proporción sobre los productos con historial. La prioridad más alta se asigna a productos críticos porque son los que pueden generar pérdida inmediata de ventas. Los estados atención y vigilancia reciben pesos decrecientes porque representan ventanas de decisión todavía recuperables.

### 3.2 Riesgo de ingresos

El subíndice de ingresos usa la tendencia del forecast:

- Si los ingresos proyectados bajan, el riesgo parte de 55 y aumenta segun la magnitud de la caida.
- Si se mantienen estables, el riesgo base es 28.
- Si suben, el riesgo disminuye, sin bajar de un piso conservador.
- La baja confianza del forecast agrega penalización para evitar falsa seguridad.

### 3.3 Riesgo de demanda

El subíndice de demanda pondera señales comerciales:

```text
demanda = productos_bajando*65 + alta_demanda_bajo_stock*80 + drift_alto*30
```

La alta demanda con bajo stock recibe el mayor peso porque combina oportunidad comercial con riesgo de no atenderla. La demanda bajando alerta sobre pérdida de rotación. El drift alto se interpreta como cambio reciente que reduce estabilidad del patrón histórico.

### 3.4 Valores por defecto

Ante ausencia de informacion, el sistema usa valores conservadores:

| Caso | Valor por defecto | Justificación |
|------|-------------------|---------------|
| Sin productos con historial | stock 40, demanda 25 | No se asume riesgo bajo si no hay evidencia. |
| Sin forecast de ingresos | ingresos 45 | Se mantiene una alerta moderada hasta tener proyección. |

## 4. Justificacion de pesos y sensibilidad

Los pesos agregados 40/35/25 priorizan inventario porque en retail de calzado el quiebre de stock y la mala cobertura afectan directamente ventas, satisfacción del cliente y capital inmovilizado. Ingresos queda en segundo lugar porque resume la presión económica global. Demanda complementa el índice al detectar cambios recientes o productos con comportamiento inestable.

Para defensa de tesis se recomienda reportar una sensibilidad simple:

| Escenario | Cambio | Criterio de lectura |
|-----------|--------|---------------------|
| Base | 40/35/25 | Resultado oficial del sistema. |
| Mayor peso a stock | stock +10%, otros reescalados | Verifica si el nivel cambia cuando inventario domina. |
| Mayor peso a ingresos | ingresos +10%, otros reescalados | Verifica si el nivel cambia cuando la presión financiera domina. |
| Mayor peso a demanda | demanda +10%, otros reescalados | Verifica estabilidad ante cambios recientes de mercado. |

Si el nivel del IRE no cambia ante estos escenarios, el índice es estable. Si cambia, debe explicarse como caso sensible y revisarse con dirección o asesor de tesis.

## 5. Datos

| Fuente | Campos relevantes | Uso |
|--------|-------------------|-----|
| `ventasDiarias` | fecha, cantidad, total, productId, precioVenta, devuelto | Historial de demanda e ingresos de tienda. |
| `pedidos` | creadoEn, pagadoEn, estado, items, total | Ventas web completadas. |
| `productos` | id, nombre, categoria, precio, stock, imagen | Inventario y contexto de producto. |
| `productoCodigos` | productoId, codigo | Trazabilidad comercial. |
| `ireHistorial` | fecha, score, nivel, dimensiones, version, variables, detalle | Seguimiento longitudinal y auditoría del IRE. |

## 6. Modelado

El módulo usa dos familias de salida:

| Componente | Modelo / regla | Salida |
|------------|----------------|--------|
| Demanda por producto | Random Forest con fallback a promedio móvil ponderado | predicción diaria, semanal, horizonte, riesgo de agotamiento. |
| Ingresos | Forecast por tendencia reciente y estacionalidad por dia de semana | ingresos proyectados, tendencia y confianza. |
| IRE | Índice compuesto basado en reglas explicables | score 0-100, nivel, variables, fórmula y detalle. |

El IRE no es un clasificador supervisado entrenado con etiquetas de crisis; es una capa de decision explicable construida sobre predicciones de demanda e ingresos.

## 7. Validación

### 7.1 Validación automatizada en repositorio

| Aspecto | Prueba |
|---------|--------|
| Pesos agregados | Los pesos suman 1.0. |
| Rango del score | El IRE permanece entre 0 y 100. |
| Umbrales | Bajo, moderado, alto y crítico respetan los cortes definidos. |
| Escenarios deterministas | Casos favorables producen bajo; casos extremos producen crítico. |
| Proyección | El IRE proyectado no produce stock negativo y aumenta con horizontes más largos cuando corresponde. |
| Contribuciones | La suma de contribuciones por variable coincide con el score final. |
| Historial | El guardado extendido y el fallback compatible se validan con mocks. |

### 7.2 Validación pendiente si se desea calibración predictiva

Para medir AUC, precision, recall o Brier Score del IRE se requiere una etiqueta historica, por ejemplo:

- quiebre real de stock en el horizonte H,
- caida de ingresos mayor a un umbral definido,
- sobrestock sostenido mayor a N dias,
- evento compuesto aprobado por direccion.

Sin etiquetas, la validación defendible es de consistencia interna, sensibilidad, revisión experta y utilidad operacional.

## 8. Integracion con el sistema web

| Elemento | Implementacion |
|----------|----------------|
| Endpoint principal | `GET /api/predict/combined?horizon={H}&history={D}` |
| Historial | `GET /api/ire/historial?days={N}` |
| Pantalla | `calzatura-vilchez/src/domains/administradores/pages/AdminPredictions.tsx` |
| Persistencia | `save_ire_historial` en `ai-service/services/supabase_client.py` |

## 9. Limitaciones y sesgos

| Limitacion | Impacto | Mitigacion |
|------------|---------|------------|
| Historial corto de PYME | Menor generalizacion | Usar modelos robustos y declarar alcance local. |
| Cambios de catalogo | Drift de comportamiento | Recalcular periodicamente y mostrar `drift_score`. |
| Ausencia de etiquetas de crisis | No permite AUC del IRE | Validar consistencia, sensibilidad y utilidad con dirección. |
| Pesos definidos por criterio aplicado | Posible percepción de arbitrariedad | Documentar criterio, sensibilidad y aprobación del asesor/empresa. |

## 10. Historial de versiones

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | 2026-05-01 | Plantilla inicial del módulo IA. |
| 1.1 | 2026-05-02 | Estado de cierre documental vs trabajo empirico pendiente. |
| 1.2 | 2026-05-06 | Definición aplicada del IRE, fórmula, variables, supuestos, validación y trazabilidad técnica. |
