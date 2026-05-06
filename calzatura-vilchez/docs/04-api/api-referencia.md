# Referencia de API — Calzatura Vilchez

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-05-05 |
| Base URL local | `http://localhost:8000` |
| Base URL producción | `https://[RENDER_SERVICE].onrender.com` |
| Autenticación | Bearer Token en header `Authorization` |
| Formato | JSON (application/json) |
| Documentación interactiva | `[BASE_URL]/docs` (Swagger UI automático de FastAPI) |

---

## 1. Autenticación

Todos los endpoints del servicio IA (excepto `GET /` y `GET /api/health`) requieren autenticación mediante Bearer Token.

```http
Authorization: Bearer <AI_SERVICE_BEARER_TOKEN>
```

El token se configura en la variable de entorno `AI_SERVICE_BEARER_TOKEN` del servicio IA y en la variable de entorno del frontend para que el cliente web lo incluya en cada solicitud.

**Respuesta ante token inválido:**
```json
HTTP 401 Unauthorized
{
  "detail": "Unauthorized"
}
```

**Respuesta ante servicio sin token configurado:**
```json
HTTP 503 Service Unavailable
{
  "detail": "Auth not configured"
}
```

---

## 2. Endpoints del Servicio IA (FastAPI)

### 2.1 GET `/`
Verificación de estado del servicio.

**Autenticación:** No requerida  
**Rate limit:** Sin límite

**Respuesta exitosa (200 OK):**
```json
{
  "status": "ok",
  "service": "Calzatura Vilchez AI",
  "cache_active": true
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `status` | string | Siempre "ok" si el servicio está activo |
| `service` | string | Nombre identificador del servicio |
| `cache_active` | boolean | `true` si el caché de datos de Supabase está vigente |

---

### 2.2 GET `/api/health`
Health check para monitoreo de uptime.

**Autenticación:** No requerida  
**Rate limit:** Sin límite

**Respuesta exitosa (200 OK):**
```json
{
  "status": "ok",
  "service": "Calzatura Vilchez AI",
  "port": "8000"
}
```

---

### 2.3 GET `/api/predict/demand`
Predicción de demanda por producto usando RandomForestRegressor.

**Autenticación:** Bearer Token requerido  
**Rate limit:** 20 solicitudes/minuto por IP

**Parámetros de consulta (query params):**

| Parámetro | Tipo | Requerido | Default | Validación | Descripción |
|---|---|---|---|---|---|
| `horizon` | integer | No | 30 | ge=7, le=90 | Días a predecir hacia el futuro |
| `history` | integer | No | 90 | ge=14, le=365 | Días de historial de ventas a usar para el entrenamiento |

**Ejemplo de solicitud:**
```http
GET /api/predict/demand?horizon=30&history=90
Authorization: Bearer my-secret-token
```

**Respuesta exitosa (200 OK):**
```json
{
  "horizon_days": 30,
  "history_days": 90,
  "predictions": [
    {
      "productId": "uuid-del-producto",
      "nombre": "Bota Clásica Cuero",
      "codigo": "BC-001",
      "stock": 15,
      "prediccion_unidades": 8,
      "prediccion_diaria": 0.27,
      "tendencia": "estable",
      "confianza": 72,
      "dias_hasta_agotarse": 55,
      "alerta_stock": false,
      "sin_historial": false
    },
    {
      "productId": "uuid-otro-producto",
      "nombre": "Zapatilla Sport",
      "codigo": "ZS-015",
      "stock": 3,
      "prediccion_unidades": 12,
      "prediccion_diaria": 0.40,
      "tendencia": "subiendo",
      "confianza": 85,
      "dias_hasta_agotarse": 7,
      "alerta_stock": true,
      "sin_historial": false
    },
    {
      "productId": "uuid-producto-nuevo",
      "nombre": "Sandalia Verano",
      "codigo": null,
      "stock": 10,
      "prediccion_unidades": 0,
      "prediccion_diaria": 0,
      "tendencia": "sin_datos",
      "confianza": 0,
      "dias_hasta_agotarse": null,
      "alerta_stock": false,
      "sin_historial": true
    }
  ],
  "training_meta": {
    "model_type": "random_forest",
    "n_products_trained": 45,
    "n_products_no_data": 8,
    "data_hash": "abc123def456",
    "cached_at": "2026-05-05"
  },
  "weekly_chart": {
    "labels": ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    "values": [12, 8, 15, 10, 20, 35, 25]
  }
}
```

**Esquema del objeto `predictions[i]`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `productId` | string (UUID) | ID del producto en Supabase |
| `nombre` | string | Nombre del producto |
| `codigo` | string \| null | Código interno (de `productoCodigos`) |
| `stock` | integer | Stock actual del producto |
| `prediccion_unidades` | integer | Unidades estimadas a vender en `horizon_days` |
| `prediccion_diaria` | float | Unidades estimadas por día |
| `tendencia` | string | "subiendo" (pendiente > 0.02), "bajando" (< -0.02), "estable" |
| `confianza` | integer (0-100) | Confianza del modelo basada en densidad de datos históricos |
| `dias_hasta_agotarse` | integer \| null | Días hasta que el stock llegue a 0 según predicción diaria |
| `alerta_stock` | boolean | `true` si `dias_hasta_agotarse` ≤ `horizon_days` y stock > 0 |
| `sin_historial` | boolean | `true` si el producto tiene menos de 14 días de historial |

**Interpretación de `tendencia`:**
- `"subiendo"`: la demanda está creciendo (pendiente de regresión > 0.02 unidades/día)
- `"bajando"`: la demanda está decreciendo (pendiente < -0.02 unidades/día)
- `"estable"`: la demanda es relativamente constante
- `"sin_datos"`: el producto no tiene historial de ventas suficiente

**Errores posibles:**

| Código HTTP | Detalle | Causa |
|---|---|---|
| 401 | "Unauthorized" | Token inválido o ausente |
| 429 | "Rate limit exceeded" | Más de 20 solicitudes/minuto desde la misma IP |
| 503 | "Supabase quota or backend rate limit exceeded. Retry later." | Cuota de Supabase agotada |
| 500 | Mensaje de error de Python | Error interno del modelo |

---

### 2.4 GET `/api/ire`
Calcula el Índice de Riesgo Empresarial (IRE) actual y proyectado.

**Autenticación:** Bearer Token requerido  
**Rate limit:** 20 solicitudes/minuto por IP

**Parámetros de consulta:**

| Parámetro | Tipo | Requerido | Default | Descripción |
|---|---|---|---|---|
| `horizon` | integer | No | 30 | Horizonte para IRE proyectado (días) |
| `history` | integer | No | 90 | Días de historial para el cálculo |

**Respuesta exitosa (200 OK):**
```json
{
  "ire_actual": {
    "score": 42.5,
    "clasificacion": "Moderado",
    "componentes": {
      "riesgo_stock": 55.0,
      "riesgo_ingresos": 30.0,
      "riesgo_demanda": 38.0
    },
    "productos_en_alerta": 5,
    "productos_total": 53
  },
  "ire_proyectado": {
    "score": 61.8,
    "clasificacion": "Alto",
    "horizon_days": 30
  },
  "historial": [
    {"fecha": "2026-04-05", "score": 35.2, "clasificacion": "Moderado"},
    {"fecha": "2026-04-06", "score": 37.1, "clasificacion": "Moderado"},
    ...
    {"fecha": "2026-05-05", "score": 42.5, "clasificacion": "Moderado"}
  ]
}
```

**Fórmula del IRE:**
```
IRE = (riesgo_stock × 0.40) + (riesgo_ingresos × 0.35) + (riesgo_demanda × 0.25)
```

**Clasificación del IRE:**

| Rango | Clasificación | Color en UI |
|---|---|---|
| 0 – 25 | Bajo | Verde |
| 26 – 50 | Moderado | Amarillo |
| 51 – 75 | Alto | Naranja |
| 76 – 100 | Crítico | Rojo |

*Fundamento académico: Altman (1968) — zonas de clasificación del Z-score; Ohlson (1980) — expresión como probabilidad continua [0,1]; Beaver (1966) — deterioro progresivo detectable con anticipación.*

---

### 2.5 GET `/api/stock/alerts`
Lista los productos en riesgo de agotamiento de stock.

**Autenticación:** Bearer Token requerido  
**Rate limit:** 20 solicitudes/minuto por IP

**Parámetros de consulta:**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `horizon` | integer | 30 | Horizonte de predicción en días |
| `history` | integer | 90 | Días de historial para predicción |

**Respuesta exitosa (200 OK):**
```json
{
  "alerts": [
    {
      "productId": "uuid",
      "nombre": "Zapatilla Sport",
      "stock": 3,
      "prediccion_diaria": 0.40,
      "dias_hasta_agotarse": 7,
      "fecha_agotamiento": "2026-05-12",
      "nivel": "critico"
    },
    {
      "productId": "uuid-2",
      "nombre": "Bota Clásica",
      "stock": 8,
      "prediccion_diaria": 0.60,
      "dias_hasta_agotarse": 13,
      "fecha_agotamiento": "2026-05-18",
      "nivel": "alerta"
    }
  ],
  "total_alertas": 2,
  "horizon_days": 30
}
```

**Niveles de alerta:**

| Nivel | Umbral | Descripción |
|---|---|---|
| `critico` | dias_hasta_agotarse ≤ 7 | Requiere reabastecimiento urgente |
| `alerta` | 8-15 días | Requiere reabastecimiento esta semana |
| `aviso` | 16-30 días | Planificar reabastecimiento próxima semana |

---

### 2.6 GET `/api/revenue/forecast`
Proyección de ingresos para el horizonte configurado.

**Autenticación:** Bearer Token requerido

**Parámetros de consulta:**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `horizon` | integer | 30 | Días a proyectar |
| `history` | integer | 90 | Días de historial |

**Respuesta exitosa (200 OK):**
```json
{
  "ingreso_proyectado": 4250.00,
  "ingreso_promedio_diario": 141.67,
  "tendencia": "estable",
  "horizon_days": 30,
  "confidence": 68
}
```

---

### 2.7 GET `/api/model/info`
Información sobre el estado del modelo de IA entrenado.

**Autenticación:** Bearer Token requerido

**Respuesta exitosa (200 OK):**
```json
{
  "model_type": "random_forest",
  "n_products_trained": 45,
  "n_products_no_data": 8,
  "data_hash": "abc123",
  "cached_at": "2026-05-05",
  "restored_from_db": false
}
```

---

### 2.8 GET `/api/debug/supabase`
Diagnóstico de la conexión a Supabase. Solo para uso administrativo.

**Autenticación:** Bearer Token requerido  
**Uso:** Solo en entorno de desarrollo/staging para diagnosticar problemas de conectividad.

**Respuesta exitosa (200 OK):**
```json
{
  "SUPABASE_URL": true,
  "SUPABASE_SERVICE_KEY": true,
  "supabase": "connected",
  "productos_count": 53
}
```

---

## 3. API de Supabase (PostgREST)

El frontend web y la app móvil consumen directamente la API PostgREST de Supabase. La URL base es:

```
https://jdmcvsddnshukkcnzghq.supabase.co/rest/v1/
```

La autenticación se realiza con el JWT de Firebase Auth pasado en el header `Authorization` y con la `anon key` de Supabase en el header `apikey`.

### 3.1 Productos — Consulta de catálogo

```http
GET /rest/v1/productos?select=*&publicado=eq.true&order=destacado.desc,createdAt.desc&limit=20&offset=0
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <FIREBASE_JWT>
```

**Filtros disponibles (query params PostgREST):**

| Filtro | Ejemplo | Descripción |
|---|---|---|
| Categoría | `categoria=eq.dama` | Filtrar por categoría exacta |
| Marca | `marca=eq.Nike` | Filtrar por marca exacta |
| Precio mínimo | `precio=gte.50` | Precio mayor o igual a 50 |
| Precio máximo | `precio=lte.200` | Precio menor o igual a 200 |
| Búsqueda de texto | `nombre=ilike.*zapatilla*` | Búsqueda case-insensitive en nombre |
| Destacados | `destacado=eq.true` | Solo productos destacados |

### 3.2 Productos — Detalle

```http
GET /rest/v1/productos?id=eq.{uuid}&select=*
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <FIREBASE_JWT>
```

### 3.3 Pedidos — Crear pedido

```http
POST /rest/v1/pedidos
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <FIREBASE_JWT>
Content-Type: application/json

{
  "userId": "firebase-uid",
  "productos": [...],
  "total": 150.00,
  "estado": "pendiente",
  "metodoPago": "stripe",
  "direccionEnvio": {...}
}
```

### 3.4 Pedidos — Historial del cliente

```http
GET /rest/v1/pedidos?userId=eq.{firebase-uid}&order=createdAt.desc
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <FIREBASE_JWT>
```

Las políticas RLS de Supabase garantizan automáticamente que solo se retornan los pedidos del usuario autenticado, independientemente del filtro pasado en el query.

---

## 4. Webhooks

### 4.1 Stripe Webhook
**Endpoint:** Firebase Cloud Function (URL configurada en Stripe Dashboard)  
**Evento:** `checkout.session.completed`  
**Procesamiento:** La Cloud Function verifica la firma del webhook de Stripe, actualiza el pedido en Supabase a estado "confirmado" y decrementa el stock de los productos.

```json
// Payload del evento de Stripe (referencia)
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_live_...",
      "payment_status": "paid",
      "metadata": {
        "pedidoId": "uuid-del-pedido-en-supabase"
      }
    }
  }
}
```

---

## 5. Variables de entorno requeridas

### Servicio IA (`ai-service/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service Role Key de Supabase (acceso sin RLS) | `eyJhbG...` |
| `AI_SERVICE_BEARER_TOKEN` | Token de autenticación del servicio IA | `my-secret-token-123` |
| `ALLOWED_ORIGINS` | Orígenes adicionales permitidos (CORS) | `https://mi-dominio.com` |
| `PORT` | Puerto de escucha del servidor | `8000` |

### Frontend web (`calzatura-vilchez/.env`)

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon Key pública de Supabase |
| `VITE_FIREBASE_API_KEY` | API Key de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain de Firebase |
| `VITE_FIREBASE_PROJECT_ID` | ID del proyecto Firebase |
| `VITE_AI_SERVICE_URL` | URL base del servicio IA |
| `VITE_AI_SERVICE_TOKEN` | Bearer Token del servicio IA |
| `VITE_CLOUDINARY_CLOUD_NAME` | Nombre del cloud en Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Upload preset de Cloudinary |
| `VITE_DNI_API_KEY` | API Key del servicio de validación DNI |

**Nota de seguridad (ISO/IEC 27001, Control A.9.4.3):** Todas las variables `.env` deben estar excluidas del repositorio git mediante `.gitignore`. Las variables `VITE_*` son accesibles en el bundle del frontend (no son secretas desde la perspectiva del servidor), pero el `SUPABASE_SERVICE_KEY` y el `AI_SERVICE_BEARER_TOKEN` son secretos y nunca deben exponerse en el código fuente o en el bundle del cliente.
