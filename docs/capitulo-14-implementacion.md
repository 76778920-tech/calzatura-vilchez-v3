# CAPÍTULO 14: IMPLEMENTACIÓN Y MONITOREO

## 14.1. Preparación del Entorno de Implementación

El sistema Calzatura Vilchez se despliega en tres plataformas en la nube, cada una responsable de un módulo del sistema:

| Plataforma | Módulo | URL de producción |
|-----------|--------|------------------|
| **Firebase Hosting** | Frontend (React + Vite) | https://calzaturavilchez-ab17f.web.app |
| **Firebase Cloud Functions** | Backend (Stripe, pedidos, favoritos) | https://us-central1-calzaturavilchez-ab17f.cloudfunctions.net |
| **Render** | Servicio IA (Python + FastAPI) | https://calzatura-vilchez-v3.onrender.com |
| **Supabase** | Base de datos (PostgreSQL + RLS) | https://jdmcvsddnshukkcnzghq.supabase.co |

### Requisitos previos

Antes de desplegar, verificar que estén disponibles:

| Herramienta | Versión | Propósito |
|-------------|---------|-----------|
| Node.js | 20+ | Build del frontend y Functions |
| Firebase CLI | 13+ | Deploy a Firebase |
| Python | 3.11+ | Servicio IA |
| Docker Desktop | 4+ | Entorno de desarrollo local |
| Git | 2+ | Control de versiones |

### Variables de entorno por entorno

**Frontend (`.env.local`):**

| Variable | Descripción |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Clave pública de Firebase |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `VITE_STRIPE_PUBLIC_KEY` | Clave publicable de Stripe |
| `VITE_AI_SERVICE_URL` | URL del servicio IA |
| `VITE_AI_SERVICE_BEARER_TOKEN` | Token de autenticación IA |
| `VITE_CLOUDINARY_CLOUD_NAME` | Nombre del proyecto Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Preset de carga de imágenes |

**Firebase Cloud Functions (secrets de Firebase):**

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Firma del webhook de Stripe |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de acceso privilegiado |
| `AI_SERVICE_URL` | URL del servicio IA |
| `AI_SERVICE_BEARER_TOKEN` | Token de autenticación IA |

**Servicio IA (variables en Render):**

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Clave de acceso privilegiado |
| `ALLOWED_ORIGINS` | Orígenes permitidos CORS |

---

## 14.2. Implementación del Sistema

### 14.2.1. Despliegue del Frontend (Firebase Hosting)

```bash
cd calzatura-vilchez

# 1. Instalar dependencias
npm ci

# 2. Compilar para producción
npm run build

# 3. Desplegar a Firebase Hosting
firebase deploy --only hosting
```

El build produce archivos estáticos optimizados en `dist/` que Firebase CDN distribuye globalmente. La configuración `firebase.json` define las reglas de rewrite para que React Router funcione correctamente con el historial HTML5.

### 14.2.2. Despliegue de Cloud Functions

```bash
cd calzatura-vilchez

# Desplegar solo las Functions
firebase deploy --only functions
```

Las Cloud Functions disponibles en producción son:

| Función | Endpoint | Descripción |
|---------|---------|-------------|
| `createOrder` | `/createOrder` | Crea pedidos contra entrega |
| `createCheckoutSession` | `/createCheckoutSession` | Genera sesión de pago Stripe |
| `stripeWebhook` | `/stripeWebhook` | Procesa confirmaciones de Stripe |
| `confirmCodOrder` | `/confirmCodOrder` | Confirma pedidos desde admin |
| `favorites` | `/favorites` | Gestiona favoritos del usuario |
| `aiAdminProxy` | `/aiAdminProxy` | Proxy seguro al servicio IA |

### 14.2.3. Despliegue del Servicio IA (Render)

El servicio IA se despliega automáticamente en Render al hacer push a la rama `main`. La configuración detecta el `Dockerfile` en `ai-service/` y construye la imagen.

**Dockerfile de producción (`ai-service/Dockerfile`):**
- Imagen base: `python:3.11-slim`
- Puerto: `${PORT:-8000}` (Render asigna el puerto dinámicamente)
- Usuario sin privilegios: `appuser` (principio de mínimo privilegio)

### 14.2.4. Despliegue del Entorno Local (Docker)

Para desarrollo local, todos los módulos se orquestan con Docker Compose:

```bash
# Construir imágenes
docker compose build

# Levantar todos los servicios
docker compose up

# Levantar en segundo plano
docker compose up -d
```

**Servicios disponibles localmente:**

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| AI Service | http://localhost:8000 |
| Firebase Emulator UI | http://localhost:4000 |
| Cloud Functions (local) | http://localhost:5001 |
| Auth Emulator | http://localhost:9099 |

### 14.2.5. Migraciones de Base de Datos

Las migraciones de Supabase se aplican con:

```bash
cd calzatura-vilchez
supabase db push
```

Las migraciones pendientes se encuentran en `supabase/migrations/` y se aplican en orden cronológico.

---

## 14.3. Verificación de Funcionamiento

### 14.3.1. Pruebas de humo (Smoke Tests)

Después de cada despliegue se ejecutan pruebas de humo automatizadas con Playwright:

```bash
cd calzatura-vilchez
npm run test:e2e -- e2e/smoke.spec.ts
```

**Checklist de verificación manual post-despliegue:**

| Verificación | Cómo validar |
|-------------|-------------|
| Frontend carga correctamente | Abrir https://calzaturavilchez-ab17f.web.app |
| Autenticación funciona | Iniciar sesión con cuenta de prueba |
| Catálogo de productos visible | Ver listado de productos |
| Carrito operativo | Agregar un producto al carrito |
| AI Service responde | GET https://calzatura-vilchez-v3.onrender.com/api/health |
| Panel admin accesible | Iniciar sesión como administrador |

### 14.3.2. Verificación de endpoints del Servicio IA

| Endpoint | Método | Descripción | Respuesta esperada |
|----------|--------|-------------|-------------------|
| `/` | GET | Estado general | `{"status": "ok", "cache_active": bool}` |
| `/api/health` | GET | Health check | `{"status": "ok", "port": "..."}` |
| `/api/model/info` | GET | Info del modelo | Versión y parámetros del modelo |
| `/api/model/metrics` | GET | Métricas del modelo | R², MAE, RMSE |
| `/api/predict/demand` | GET | Predicción de demanda | Lista de predicciones por producto |
| `/api/predict/combined` | GET | Predicción combinada | Demanda + ingresos + IRE |

### 14.3.3. Script de verificación automatizada

El proyecto incluye un script de verificación de todos los servicios:

```bash
# Verificar servicios de producción
node scripts/health-check.js prod

# Verificar servicios locales
node scripts/health-check.js local

# Verificar todos
node scripts/health-check.js
```

**Salida esperada (producción):**
```
🔍 Calzatura Vilchez — Health Check [prod]
───────────────────────────────────────────────────────
✅  AI Service (producción)          200    487ms
✅  Frontend (producción)            200    643ms
───────────────────────────────────────────────────────
✅  Todos los servicios operativos
```

---

## 14.4. Monitoreo del Sistema

El monitoreo se realiza en tres niveles: plataforma, aplicación y pipeline.

### 14.4.1. Monitoreo de plataforma

**Firebase Console** (`console.firebase.google.com`):

| Sección | Qué monitorea |
|---------|--------------|
| Functions → Logs | Errores y ejecuciones de Cloud Functions |
| Functions → Usage | Número de invocaciones y tiempo de ejecución |
| Hosting → Usage | Tráfico, ancho de banda y cacheo CDN |
| Authentication → Users | Usuarios activos y registros |

**Render Dashboard** (`dashboard.render.com`):

| Sección | Qué monitorea |
|---------|--------------|
| Logs | Logs en tiempo real del servicio IA |
| Metrics | CPU, memoria y latencia de respuesta |
| Events | Despliegues y reinicios del servicio |

**Supabase Dashboard** (`supabase.com/dashboard`):

| Sección | Qué monitorea |
|---------|--------------|
| Database → Logs | Queries lentas y errores SQL |
| API → Logs | Peticiones a la API REST |
| Auth → Logs | Intentos de autenticación |

### 14.4.2. Monitoreo de aplicación — Endpoints de salud

El Servicio IA expone endpoints de monitoreo propios:

**`GET /api/health`**
```json
{
  "status": "ok",
  "service": "Calzatura Vilchez AI",
  "port": "8000"
}
```

**`GET /api/model/metrics`**

Expone métricas del modelo de predicción:
```json
{
  "demand": {
    "r2": 0.87,
    "mae": 2.3,
    "rmse": 3.1
  },
  "revenue": {
    "r2": 0.91,
    "mae": 45.2
  }
}
```

**`GET /api/model/info`**

Estado del modelo en memoria y fecha del último entrenamiento.

### 14.4.3. Monitoreo de pipeline CI/CD

GitHub Actions monitorea automáticamente la calidad del código en cada push:

| Job | Qué monitorea | Falla si... |
|-----|--------------|-------------|
| `Lint + Tests + Build` | Calidad de código | ESLint reporta errores o Vitest falla |
| `AI Service` | Backend IA | Pytest falla o schema Supabase inválido |
| `E2E Playwright` | Flujos de usuario | Algún flujo E2E no completa |
| `Cobertura` | Cobertura de código | Baja de umbrales definidos |

### 14.4.4. Rate Limiting — Protección del Servicio IA

El servicio IA implementa limitación de tasa con `slowapi` para prevenir abuso:

```python
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

Cuando se supera el límite, la API responde con `HTTP 429 Too Many Requests`.

### 14.4.5. Caché de datos — Optimización de rendimiento

El servicio IA implementa caché en memoria con TTL de 2 horas para reducir consultas a Supabase:

```python
_CACHE_TTL = 7200  # 2 horas
_cache: dict = {
    "data": None,
    "expires_at": 0.0,
}
```

El estado del caché es visible en el endpoint raíz (`GET /`):
```json
{
  "status": "ok",
  "cache_active": true
}
```

Para invalidar el caché manualmente:
```bash
POST /api/cache/invalidate
```

### 14.4.6. Alertas de stock

El sistema genera alertas automáticas cuando el stock de un producto baja del umbral configurado. Estas alertas son visibles en el panel de administración y se obtienen mediante:

```
GET /api/predict/stock-alert?threshold=N
```

Donde `N` es el número de días de cobertura de stock (configurable: 7, 14, 21 o 30 días).
