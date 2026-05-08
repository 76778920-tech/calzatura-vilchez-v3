# CAPÍTULO 10: DOCKERIZACIÓN Y DESPLIEGUE DE MÓDULOS

## 10.1. Introducción a Docker en el Proyecto

Docker es una plataforma de contenedores que permite empaquetar una aplicación junto con todas sus dependencias en una unidad aislada llamada **contenedor**. A diferencia de las máquinas virtuales, los contenedores comparten el kernel del sistema operativo anfitrión, lo que los hace más ligeros y eficientes.

### ¿Por qué Docker en Calzatura Vilchez?

El sistema Calzatura Vilchez está compuesto por tres módulos independientes:

| Módulo | Tecnología | Función |
|--------|-----------|---------|
| Frontend | React 19 + Vite + TypeScript | Interfaz web del e-commerce |
| Backend (AI Service) | Python 3.11 + FastAPI | Servicio de predicción de demanda e ingresos |
| Backend (Firebase Emulator) | Node.js 20 + Firebase CLI | Emulación local de Cloud Functions y Authentication |

Sin Docker, cada desarrollador debe instalar manualmente Node.js, Python, Firebase CLI y configurar variables de entorno distintas, lo que genera inconsistencias entre entornos. Con Docker, basta ejecutar un solo comando para levantar el sistema completo de forma idéntica en cualquier máquina.

### Beneficios aplicados al proyecto

**Portabilidad:** Los contenedores corren de manera idéntica en Windows, Linux y macOS, eliminando el problema clásico de "en mi máquina funciona".

**Aislamiento:** Cada módulo opera en su propio contenedor con sus dependencias específicas, sin conflictos entre versiones de Node.js o Python.

**Reproducibilidad:** El entorno de desarrollo es exactamente igual al de producción, reduciendo errores de despliegue.

**Mantenibilidad:** Modificar el servicio IA no afecta al frontend ni al emulador de Firebase, ya que cada contenedor es independiente.

### Relación con ISO/IEC 25010

Docker contribuye directamente a las siguientes características de calidad del software según la norma ISO/IEC 25010:

| Característica | Descripción |
|---------------|-------------|
| **Portabilidad** | El sistema puede trasladarse y ejecutarse en distintos entornos sin modificaciones |
| **Mantenibilidad** | La separación por contenedores facilita modificar un módulo sin afectar los demás |
| **Confiabilidad** | El entorno siempre es idéntico, eliminando fallos por diferencias de configuración |
| **Eficiencia** | Los contenedores consumen menos recursos que las máquinas virtuales tradicionales |

---

## 10.2. Dockerización del Backend

El backend del sistema Calzatura Vilchez está compuesto por dos componentes:

1. **Servicio IA (Python/FastAPI)** — desplegado en Render en producción, dockerizado para desarrollo local.
2. **Firebase Emulator (Node.js)** — emula localmente las Cloud Functions y el servicio de Authentication de Firebase.

### 10.2.1. Dockerización del Servicio IA

El servicio de inteligencia artificial expone una API REST construida con FastAPI. Implementa un modelo Random Forest para predicción de demanda e ingresos de la tienda.

**Archivo:** `ai-service/Dockerfile`

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home --shell /bin/sh appuser
USER appuser

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

**Decisiones técnicas:**

- `python:3.11-slim` — imagen base ligera sin paquetes innecesarios, reduce el tamaño del contenedor.
- `PYTHONDONTWRITEBYTECODE=1` — evita generar archivos `.pyc` dentro del contenedor.
- `useradd appuser` — el proceso no corre como root, mejorando la seguridad (principio de mínimo privilegio).
- `${PORT:-8000}` — el puerto es configurable mediante variable de entorno, necesario para despliegues en Render.

**Variables de entorno requeridas:**

| Variable | Descripción |
|----------|-------------|
| `FIREBASE_KEY_PATH` | Ruta al archivo de credenciales de Firebase Admin SDK |
| `PYTHONUNBUFFERED` | Fuerza salida de logs en tiempo real |

### 10.2.2. Dockerización del Firebase Emulator

El Firebase Emulator Suite permite ejecutar localmente los servicios de Firebase sin afectar el proyecto en producción. Para este proyecto se emulan:

- **Authentication** (puerto 9099) — gestión de usuarios y sesiones.
- **Cloud Functions** (puerto 5001) — lógica de negocio: pagos con Stripe, gestión de pedidos, proxy del servicio IA.

**Archivo:** `firebase-emulator/Dockerfile`

```dockerfile
FROM node:20-alpine

RUN npm install -g firebase-tools@13

WORKDIR /workspace

COPY firebase.json .firebaserc ./

COPY calzatura-vilchez/functions/package*.json ./calzatura-vilchez/functions/
RUN cd calzatura-vilchez/functions && npm install --omit=dev

COPY calzatura-vilchez/functions/index.js ./calzatura-vilchez/functions/index.js

EXPOSE 4000 5001 9099

CMD ["firebase", "emulators:start", "--only", "auth,functions", \
     "--project", "calzaturavilchez-ab17f", \
     "--import=/workspace/emulator-data", \
     "--export-on-exit=/workspace/emulator-data"]
```

**Decisiones técnicas:**

- `node:20-alpine` — coincide con la versión de Node.js requerida por las Cloud Functions (`engines.node: "20"` en `package.json`).
- `firebase-tools@13` — versión estable que soporta las APIs v2 de Cloud Functions usadas en el proyecto.
- `--import/--export-on-exit` — persiste el estado del emulador entre reinicios mediante el volumen `emulator_data`.
- `--only auth,functions` — solo se emulan los servicios que el proyecto utiliza, evitando iniciar Firestore o Storage innecesariamente.

**Cloud Functions emuladas:**

| Función | Método | Descripción |
|---------|--------|-------------|
| `createOrder` | POST | Crea pedidos con método de pago contra entrega |
| `createCheckoutSession` | POST | Genera sesión de pago en Stripe |
| `stripeWebhook` | POST | Procesa confirmaciones de pago de Stripe |
| `confirmCodOrder` | POST | Confirma pedidos contra entrega desde el panel admin |
| `favorites` | GET/POST/DELETE | Gestiona favoritos del usuario en Supabase |
| `aiAdminProxy` | GET | Proxy seguro hacia el servicio de IA |

**Variables de entorno requeridas:**

| Variable | Descripción |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Clave secreta de la API de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Firma para verificar eventos de Stripe |
| `SUPABASE_URL` | URL del proyecto en Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de acceso privilegiado a Supabase |
| `AI_SERVICE_URL` | URL del servicio de predicción IA |
| `AI_SERVICE_BEARER_TOKEN` | Token de autenticación del servicio IA |

---

## 10.3. Dockerización del Frontend

El frontend es una aplicación React 19 construida con Vite. Su Dockerfile implementa un **build multi-etapa** (multi-stage build), una técnica que permite separar el entorno de construcción del entorno de ejecución, reduciendo significativamente el tamaño de la imagen final.

**Archivo:** `calzatura-vilchez/Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM deps AS build
WORKDIR /app
COPY . .
ARG VITE_AI_SERVICE_URL
ARG VITE_DNI_LOOKUP_URL
ARG VITE_STRIPE_PUBLIC_KEY
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET
ENV VITE_AI_SERVICE_URL=$VITE_AI_SERVICE_URL
ENV VITE_DNI_LOOKUP_URL=$VITE_DNI_LOOKUP_URL
ENV VITE_STRIPE_PUBLIC_KEY=$VITE_STRIPE_PUBLIC_KEY
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME
ENV VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET
RUN npm run build

FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Etapas del build multi-etapa

| Etapa | Imagen base | Propósito |
|-------|------------|-----------|
| `deps` | node:24-alpine | Instala dependencias con `npm ci` (reproducible) |
| `dev` | deps | Servidor de desarrollo con hot reload en puerto 5173 |
| `build` | deps | Compila la aplicación con Vite para producción |
| `production` | nginx:1.27-alpine | Sirve los archivos estáticos compilados |

**Decisiones técnicas:**

- `npm ci` en lugar de `npm install` — instalación determinista basada exactamente en `package-lock.json`, garantizando reproducibilidad.
- `ARG` para variables de entorno — las variables `VITE_*` se inyectan en tiempo de compilación, no en tiempo de ejecución, ya que Vite las embebe en el bundle de JavaScript.
- `nginx:1.27-alpine` en producción — imagen de solo 8 MB que sirve archivos estáticos de forma eficiente, sin incluir Node.js.
- `target: dev` en docker-compose — en desarrollo se usa la etapa `dev` con hot reload; en producción se usa la etapa `production` con Nginx.

---

## 10.4. Orquestación con Docker Compose

Docker Compose permite definir y gestionar aplicaciones multi-contenedor mediante un único archivo de configuración. Todos los servicios del sistema Calzatura Vilchez se orquestan en el archivo `docker-compose.yml`.

**Archivo:** `docker-compose.yml`

```yaml
services:
  frontend:
    build:
      context: ./calzatura-vilchez
      target: dev
    container_name: calzatura-frontend
    ports:
      - "5173:5173"
    environment:
      VITE_AI_SERVICE_URL: http://localhost:8000
      CHOKIDAR_USEPOLLING: "true"
    volumes:
      - ./calzatura-vilchez:/app
      - frontend_node_modules:/app/node_modules
    depends_on:
      ai-service:
        condition: service_started
      firebase-emulator:
        condition: service_healthy

  ai-service:
    build:
      context: ./ai-service
    container_name: calzatura-ai-service
    ports:
      - "8000:8000"
    environment:
      FIREBASE_KEY_PATH: /run/secrets/firebase-service-account.json
      PYTHONUNBUFFERED: "1"
    volumes:
      - ./ai-service:/app
      - ./ai-service/serviceAccountKey.json:/run/secrets/firebase-service-account.json:ro
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/', timeout=3)"]
      interval: 30s
      timeout: 5s
      retries: 3

  firebase-emulator:
    build:
      context: .
      dockerfile: firebase-emulator/Dockerfile
    container_name: calzatura-firebase-emulator
    ports:
      - "4000:4000"
      - "5001:5001"
      - "9099:9099"
    environment:
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      AI_SERVICE_URL: ${AI_SERVICE_URL}
      AI_SERVICE_BEARER_TOKEN: ${AI_SERVICE_BEARER_TOKEN}
    volumes:
      - emulator_data:/workspace/emulator-data
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--spider", "http://localhost:4000"]
      interval: 15s
      timeout: 10s
      retries: 5
      start_period: 30s

volumes:
  frontend_node_modules:
  emulator_data:
```

### Mapa de puertos del sistema

| Servicio | Puerto local | Puerto contenedor | URL de acceso |
|----------|-------------|-------------------|---------------|
| Frontend (React) | 5173 | 5173 | http://localhost:5173 |
| AI Service (FastAPI) | 8000 | 8000 | http://localhost:8000 |
| Firebase Emulator UI | 4000 | 4000 | http://localhost:4000 |
| Cloud Functions | 5001 | 5001 | http://localhost:5001 |
| Authentication | 9099 | 9099 | http://localhost:9099 |

### Dependencias entre servicios

```
firebase-emulator ─────┐
                        ├──► frontend
ai-service ────────────┘
```

El frontend espera a que:
- `ai-service` haya iniciado (`service_started`)
- `firebase-emulator` esté saludable (`service_healthy`) — verificado mediante healthcheck en el puerto 4000

### Volúmenes persistentes

| Volumen | Propósito |
|---------|-----------|
| `frontend_node_modules` | Evita reinstalar dependencias de Node.js en cada reinicio |
| `emulator_data` | Persiste usuarios y datos del emulador entre sesiones |

### Healthchecks

Ambos servicios backend implementan verificaciones de salud:

- **AI Service** — ejecuta una petición HTTP a `localhost:8000` cada 30 segundos.
- **Firebase Emulator** — verifica disponibilidad del panel UI en `localhost:4000` cada 15 segundos con un período de gracia de 30 segundos al arranque.

### Variables de entorno

Las variables sensibles (claves de API) se gestionan mediante un archivo `.env` en la raíz del proyecto, nunca versionado en el repositorio. El archivo `.env.example` documenta las variables requeridas:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
AI_SERVICE_URL=https://calzatura-vilchez-v3.onrender.com
AI_SERVICE_BEARER_TOKEN=cv_ai_v3_...
```

### Comandos de uso

**Construir todas las imágenes:**
```bash
docker compose build
```

**Levantar el sistema completo:**
```bash
docker compose up
```

**Levantar en segundo plano:**
```bash
docker compose up -d
```

**Reconstruir un servicio específico:**
```bash
docker compose build firebase-emulator
```

**Detener todos los servicios:**
```bash
docker compose down
```

**Ver logs de un servicio:**
```bash
docker compose logs -f firebase-emulator
```
