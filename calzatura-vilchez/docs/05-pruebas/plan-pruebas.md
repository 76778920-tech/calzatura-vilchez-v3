# Plan de Pruebas — Calzatura Vilchez

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-05-05 |
| Norma base | ISO/IEC 25010:2011 — Funcionalidad, Fiabilidad, Usabilidad |
| Norma complementaria | ISO 9001:2015 — Cláusula 8.6 (Liberación de productos y servicios) |
| Herramientas | Pytest (Python), Vitest (TypeScript), Flutter Test |

---

## 1. Estrategia de pruebas

El plan de pruebas cubre tres niveles:

1. **Pruebas unitarias:** Funciones individuales del servicio IA (cálculo del IRE, predicción de demanda, alertas de stock) y componentes React aislados.
2. **Pruebas de integración:** Flujos que involucran múltiples componentes del sistema (registro de usuario, creación de pedido, registro de venta).
3. **Pruebas de aceptación (E2E):** Flujos completos desde la perspectiva del usuario final usando la aplicación real.

La estrategia prioriza las pruebas del **servicio IA** (funciones críticas de predicción y riesgo) y los **flujos de negocio principales** (compra online, venta presencial, gestión de productos), siguiendo el principio ISO/IEC 25010 de que las pruebas deben validar las características de calidad más críticas.

---

## 2. Pruebas unitarias — Servicio IA (Pytest)

### PT-IA-01: Cálculo del IRE con datos de referencia

**Módulo:** `models/risk.py` — función `compute_ire()`  
**Objetivo:** Verificar que el IRE se calcula correctamente con la fórmula ponderada y las clasificaciones son correctas.

**Casos de prueba:**

| ID | Entrada | Resultado esperado | Criterio |
|---|---|---|---|
| PT-IA-01-A | riesgo_stock=0, riesgo_ingresos=0, riesgo_demanda=0 | IRE=0, clasificación="Bajo" | Verde (sin riesgo) |
| PT-IA-01-B | riesgo_stock=60, riesgo_ingresos=30, riesgo_demanda=20 | IRE=38.0, clasificación="Moderado" | Cálculo: 60×0.4 + 30×0.35 + 20×0.25 = 24+10.5+5 = 39.5 |
| PT-IA-01-C | riesgo_stock=100, riesgo_ingresos=100, riesgo_demanda=100 | IRE=100, clasificación="Crítico" | Máximo riesgo |
| PT-IA-01-D | riesgo_stock=55, riesgo_ingresos=60, riesgo_demanda=70 | IRE=60.5, clasificación="Alto" | Umbral 51-75 |

**Código de prueba (referencia):**
```python
def test_compute_ire_bajo():
    result = compute_ire(riesgo_stock=0, riesgo_ingresos=0, riesgo_demanda=0)
    assert result["score"] == 0.0
    assert result["clasificacion"] == "Bajo"

def test_compute_ire_moderado():
    result = compute_ire(riesgo_stock=60, riesgo_ingresos=30, riesgo_demanda=20)
    assert abs(result["score"] - 39.5) < 0.1
    assert result["clasificacion"] == "Moderado"

def test_compute_ire_critico():
    result = compute_ire(riesgo_stock=100, riesgo_ingresos=100, riesgo_demanda=100)
    assert result["score"] == 100.0
    assert result["clasificacion"] == "Crítico"
```

*Artículo de referencia: Altman (1968) — validación de la función discriminante con rangos de clasificación. El umbral del IRE sigue el patrón de zonas de riesgo del Z-score.*

---

### PT-IA-02: Alerta de stock con fecha de agotamiento

**Módulo:** `models/demand.py` — función `get_stock_alerts()`  
**Objetivo:** Verificar que las alertas se calculan correctamente y la fecha de agotamiento es precisa.

| ID | Datos de entrada | Resultado esperado |
|---|---|---|
| PT-IA-02-A | stock=10, prediccion_diaria=2.0, horizon=30 | dias_hasta_agotarse=5, nivel="critico" |
| PT-IA-02-B | stock=20, prediccion_diaria=1.0, horizon=30 | dias_hasta_agotarse=20, nivel="alerta" |
| PT-IA-02-C | stock=50, prediccion_diaria=1.0, horizon=30 | dias_hasta_agotarse=50, alerta_stock=False |
| PT-IA-02-D | stock=0, prediccion_diaria=1.0, horizon=30 | alerta_stock=False (stock ya agotado, no predecible) |

---

### PT-IA-03: Predicción de demanda con historial mínimo

**Módulo:** `models/demand.py` — función `predict_demand()`  
**Objetivo:** Verificar que los productos con menos de 14 días de historial se marcan como `sin_historial=True`.

| ID | Historial del producto | Resultado esperado |
|---|---|---|
| PT-IA-03-A | 0 días de ventas | sin_historial=True, prediccion_unidades=0, confianza=0 |
| PT-IA-03-B | 10 días de ventas | sin_historial=True (< 14 días mínimo) |
| PT-IA-03-C | 14 días de ventas | sin_historial=False, prediccion_unidades > 0, confianza > 0 |
| PT-IA-03-D | 90 días de ventas, 2 unidades/día constantes | prediccion_unidades ≈ 60 (30 días × 2), tendencia="estable" |

---

### PT-IA-04: Cálculo de MAE del modelo

**Módulo:** `models/demand.py`  
**Objetivo:** Verificar que el MAE se calcula correctamente en la validación walk-forward.

| ID | Predicciones | Valores reales | MAE esperado |
|---|---|---|---|
| PT-IA-04-A | [3, 5, 4, 6] | [3, 5, 4, 6] | 0.0 (predicción perfecta) |
| PT-IA-04-B | [3, 5, 4, 6] | [4, 4, 5, 5] | 1.0 |
| PT-IA-04-C | [0, 0, 0] | [5, 5, 5] | 5.0 (sin predicción) |

---

### PT-IA-05: Rate limiting del endpoint de predicción

**Objetivo:** Verificar que el rate limiter rechaza la solicitud 21 con HTTP 429.

**Procedimiento:**
1. Enviar 20 solicitudes GET al endpoint `/api/predict/demand` desde la misma IP con el token correcto.
2. Las primeras 20 deben retornar HTTP 200.
3. La solicitud 21 debe retornar HTTP 429.

---

## 3. Pruebas de integración

### PT-INT-01: Flujo completo de registro de usuario

**Objetivo:** Verificar que el registro crea la cuenta en Firebase Auth Y el perfil en Supabase.

**Precondición:** DNI de prueba disponible (o mock de la API RENIEC).

**Pasos:**
1. POST a Firebase Auth con correo/contraseña de prueba.
2. INSERT en Supabase `usuarios` con el `uid` retornado por Firebase.
3. GET en Supabase `usuarios` con `uid = uid_de_prueba`.
4. Verificar que el registro existe con `rol = 'cliente'`.

**Resultado esperado:**
- Firebase Auth crea el usuario (verificado con `listUsers()`)
- Supabase `usuarios` contiene el registro con todos los campos correctos
- El campo `rol` es `'cliente'` (no `'admin'` por defecto)

**Cleanup:** Eliminar el usuario de Firebase y Supabase al finalizar el test.

---

### PT-INT-02: Registro de venta y descuento de stock

**Objetivo:** Verificar que al registrar una venta en `ventasDiarias`, el stock del producto se decrementa correctamente.

**Precondición:** Producto de prueba con `stock = 10` en Supabase.

**Pasos:**
1. Obtener el stock inicial del producto (debe ser 10).
2. INSERT en `ventasDiarias` con `productId`, `cantidad = 3`, `talla = '38'`.
3. Verificar que el stock del producto en `productos` es ahora 7.
4. Verificar que `tallaStock['38']` decrementó en 3 unidades.

**Resultado esperado:** Stock global y stock por talla decrementados correctamente.

---

### PT-INT-03: Flujo de pedido con Stripe (modo test)

**Objetivo:** Verificar el flujo completo de pago con Stripe en modo test (sin cargo real).

**Precondición:** Credenciales de Stripe en modo test. Cliente autenticado con carrito no vacío.

**Pasos:**
1. Crear pedido en Supabase con `estado = 'pendiente'`.
2. Llamar a Cloud Function para crear sesión de Stripe (modo test).
3. Simular el webhook `checkout.session.completed` de Stripe con el ID de sesión.
4. Verificar que el pedido en Supabase cambió a `estado = 'confirmado'`.
5. Verificar que el stock de los productos del pedido decrementó.

**Resultado esperado:** Pedido confirmado, stock decrementado, sin errores en Cloud Function.

---

### PT-INT-04: Carga del servicio IA desde Supabase

**Objetivo:** Verificar que el servicio IA puede conectarse a Supabase y cargar datos de ventas.

**Pasos:**
1. Arrancar el servicio IA con las variables de entorno correctas.
2. GET `/api/debug/supabase` con Bearer Token.
3. Verificar que la respuesta contiene `"supabase": "connected"` y `productos_count > 0`.

---

## 4. Pruebas de aceptación (E2E)

### PT-E2E-01: Compra completa desde catálogo hasta confirmación

**Actor:** Cliente registrado  
**Objetivo:** Validar el flujo completo de compra desde el catálogo hasta la página de confirmación.

**Pasos:**
1. Acceder al catálogo en `https://calzaturavilchez-ab17f.web.app/catalog`.
2. Aplicar filtro de categoría "Dama".
3. Seleccionar un producto con stock disponible.
4. Seleccionar talla y hacer clic en "Agregar al carrito".
5. Ir al carrito y verificar que el producto aparece con la talla correcta.
6. Hacer clic en "Proceder al checkout".
7. Ingresar dirección de envío.
8. Seleccionar pago "Contraentrega".
9. Confirmar el pedido.
10. Verificar la página de confirmación con número de pedido.

**Resultado esperado:** Pedido creado en Supabase con estado "pendiente", número de pedido visible en pantalla.

---

### PT-E2E-02: Administrador registra venta presencial

**Actor:** Administrador  
**Objetivo:** Validar el flujo de registro de venta manual y verificar el descuento de stock.

**Pasos:**
1. Iniciar sesión con cuenta de administrador.
2. Navegar a `/admin/ventas` → "Nueva venta".
3. Buscar producto por código interno.
4. Seleccionar talla, cantidad = 2.
5. Confirmar la venta.
6. Verificar que aparece la notificación de éxito.
7. Navegar a la gestión de productos y verificar que el stock del producto decrementó en 2.

**Resultado esperado:** Venta registrada en `ventasDiarias`, stock decrementado, ganancia calculada.

---

### PT-E2E-03: Dashboard de IA muestra predicciones

**Actor:** Administrador  
**Objetivo:** Validar que el panel de predicciones carga correctamente y muestra datos del servicio IA.

**Pasos:**
1. Iniciar sesión con cuenta de administrador.
2. Navegar a `/admin/predictions`.
3. Verificar que se muestra el IRE actual con su clasificación.
4. Verificar que la tabla de predicciones contiene al menos un producto.
5. Cambiar el horizonte de predicción de 30 a 7 días.
6. Verificar que la tabla se actualiza con las nuevas predicciones.

**Resultado esperado:** IRE visible, tabla de predicciones con datos, cambio de horizonte funcional.

---

### PT-E2E-04: Filtros del catálogo funcionan en móvil (Flutter)

**Actor:** Cliente en dispositivo Android  
**Objetivo:** Validar que los filtros de categoría funcionan en la app móvil.

**Pasos:**
1. Abrir la aplicación móvil en un dispositivo Android.
2. En la pantalla del catálogo, seleccionar la categoría "Hombre".
3. Verificar que solo se muestran productos de la categoría "hombre".
4. Seleccionar un producto y verificar que se muestra la pantalla de detalle.
5. Hacer clic en "Agregar al carrito".
6. Verificar que el badge del carrito en la barra de navegación se actualiza.

---

## 5. Pruebas de seguridad

### PT-SEG-01: RLS impide acceso cruzado entre clientes

**Objetivo:** Verificar que un cliente no puede ver los pedidos de otro cliente.

**Procedimiento:**
1. Crear dos usuarios cliente (A y B) en Firebase Auth.
2. Crear un pedido para el usuario A.
3. Autenticar como usuario B y hacer GET a `/rest/v1/pedidos?userId=eq.[uid_del_usuario_A]`.
4. La respuesta debe ser un array vacío `[]` (las políticas RLS filtran automáticamente).

**Resultado esperado:** Array vacío, sin errores HTTP (Supabase retorna 200 con array vacío cuando la RLS filtra todos los registros).

---

### PT-SEG-02: Servicio IA rechaza solicitudes sin token

**Procedimiento:**
1. GET `/api/predict/demand` sin el header `Authorization`.
2. Verificar respuesta `HTTP 401 Unauthorized`.
3. GET `/api/predict/demand` con token incorrecto `Authorization: Bearer wrong-token`.
4. Verificar respuesta `HTTP 401 Unauthorized`.

---

### PT-SEG-03: Cliente no puede cambiar su propio rol

**Procedimiento:**
1. Autenticar como cliente.
2. PATCH a `/rest/v1/usuarios?uid=eq.[mi_uid]` con body `{"rol": "admin"}`.
3. Las políticas RLS deben rechazar el cambio: la política de UPDATE valida que el nuevo rol sea igual al rol actual.

**Resultado esperado:** `HTTP 403 Forbidden` o actualización ignorada (campo `rol` sin cambios).

---

## 6. Matriz de trazabilidad pruebas → requisitos

| ID Prueba | ID Requisito SRS | Característica ISO/IEC 25010 |
|---|---|---|
| PT-IA-01 | RF-29 | Funcionalidad — Exactitud funcional |
| PT-IA-02 | RF-28 | Funcionalidad — Completitud funcional |
| PT-IA-03 | RF-27 | Fiabilidad — Tolerancia a fallos |
| PT-IA-04 | RF-27 (MAE) | Funcionalidad — Exactitud funcional |
| PT-IA-05 | RNF-09 | Eficiencia de rendimiento — Comportamiento en el tiempo |
| PT-INT-01 | RF-06, RF-34 | Seguridad — Autenticidad |
| PT-INT-02 | RF-21, RF-20 | Funcionalidad — Consistencia |
| PT-INT-03 | RF-13, RF-15 | Funcionalidad — Completitud; Seguridad |
| PT-INT-04 | RNF-01 | Fiabilidad — Disponibilidad |
| PT-E2E-01 | RF-11 a RF-15 | Usabilidad — Operabilidad |
| PT-E2E-02 | RF-21, RF-22 | Funcionalidad — Completitud funcional |
| PT-E2E-03 | RF-27 a RF-33 | Funcionalidad — Adecuación funcional |
| PT-E2E-04 | RF-01, RF-02, RF-11 (móvil) | Usabilidad — Operabilidad en móvil |
| PT-SEG-01 | RF-34, RNF-14 | Seguridad — Confidencialidad |
| PT-SEG-02 | RF-36, RNF-13 | Seguridad — Autenticidad |
| PT-SEG-03 | RF-26, RNF-14 | Seguridad — Integridad |

---

## 7. Criterios de aprobación

El sistema se considera apto para despliegue en producción cuando:

1. Todas las pruebas unitarias del servicio IA (PT-IA-01 a PT-IA-05) pasan con 100% de éxito.
2. Las pruebas de integración PT-INT-01 a PT-INT-04 pasan con 100% de éxito.
3. Las pruebas E2E PT-E2E-01 y PT-E2E-02 (flujos críticos de negocio) pasan con 100%.
4. Las tres pruebas de seguridad PT-SEG-01 a PT-SEG-03 pasan con 100%.
5. El tiempo de respuesta del endpoint `/api/predict/demand` es ≤ 3 segundos en el percentil 95.
6. No hay vulnerabilidades críticas identificadas en la revisión de código.

*Fundamento ISO 9001:2015 — Cláusula 8.6: La liberación del producto al cliente no se realizará hasta que se hayan completado satisfactoriamente las disposiciones planificadas para verificar que se cumplen los requisitos del producto.*
