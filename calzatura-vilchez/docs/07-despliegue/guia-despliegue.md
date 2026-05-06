# Guía de Despliegue — Calzatura Vilchez

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-05-05 |
| Norma base | ISO/IEC 25010:2011 — Portabilidad, Mantenibilidad |
| Norma complementaria | ISO/IEC 27001:2022 — Gestión de la seguridad en el despliegue |

---

## 1. Prerrequisitos

### 1.1 Software requerido

| Software | Versión mínima | Instalación |
|---|---|---|
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| npm | 10+ | Incluido con Node.js |
| Python | 3.12 | [python.org](https://python.org) |
| Docker Desktop | 24+ | [docker.com](https://docker.com) — solo para despliegue con contenedores |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |
| Firebase CLI | 13+ | `npm install -g firebase-tools` |
| Flutter SDK | 3.x | [flutter.dev](https://flutter.dev) — solo para app móvil |

### 1.2 Cuentas y servicios externos requeridos

| Servicio | Propósito | URL de registro |
|---|---|---|
| Firebase | Auth + Hosting + Cloud Functions | console.firebase.google.com |
| Supabase | Base de datos PostgreSQL | supabase.com |
| Cloudinary | CDN de imágenes | cloudinary.com |
| Stripe | Procesamiento de pagos | stripe.com |
| Render.com | Hosting del servicio IA | render.com |

---

## 2. Configuración inicial del proyecto

### 2.1 Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd "Cazatura Vilchez V3"
```

### 2.2 Estructura del proyecto

```
Cazatura Vilchez V3/
├── calzatura-vilchez/     ← Frontend web (React + TypeScript)
├── calzatura-vilchez-mobile/  ← App móvil (Flutter)
├── ai-service/            ← Servicio de IA (Python FastAPI)
└── docker-compose.yml     ← Orquestación para desarrollo local
```

---

## 3. Configuración del Frontend Web

### 3.1 Instalar dependencias

```bash
cd calzatura-vilchez
npm install
```

### 3.2 Crear archivo de variables de entorno

Crear el archivo `.env` en `calzatura-vilchez/`:

```env
# Supabase
VITE_SUPABASE_URL=https://jdmcvsddnshukkcnzghq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Firebase
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=calzaturavilchez-ab17f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=calzaturavilchez-ab17f
VITE_FIREBASE_STORAGE_BUCKET=calzaturavilchez-ab17f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=nombre-del-cloud
VITE_CLOUDINARY_UPLOAD_PRESET=preset-sin-firma

# Servicio IA
VITE_AI_SERVICE_URL=https://[nombre-servicio].onrender.com
VITE_AI_SERVICE_TOKEN=token-secreto-del-servicio-ia

# API de DNI
VITE_DNI_API_URL=https://api.consultaruc.com/api/dni
VITE_DNI_API_KEY=tu-api-key
```

**Nota de seguridad (ISO/IEC 27001, Control A.9.4.3):** El archivo `.env` está en `.gitignore` y nunca debe subirse al repositorio. Contiene credenciales que deben gestionarse con un gestor de secretos en producción.

### 3.3 Ejecutar en desarrollo

```bash
npm run dev
```

El servidor de desarrollo estará disponible en: `http://localhost:5173`

### 3.4 Validar calidad antes del despliegue

```bash
npm run quality
```

Este comando ejecuta en secuencia:
1. `eslint src/` — revisión de estilo y errores de código
2. `tsc --noEmit` — verificación de tipos TypeScript
3. `vite build` — compilación de producción

**El despliegue solo debe proceder si este comando no reporta errores.**

### 3.5 Desplegar en Firebase Hosting

```bash
# Autenticarse en Firebase (primera vez)
firebase login

# Compilar para producción
npm run build

# Desplegar hosting y reglas de Firestore
firebase deploy --only hosting,firestore:rules
```

**URL de producción:** `https://calzaturavilchez-ab17f.web.app`

---

## 4. Configuración del Servicio IA

### 4.1 Crear entorno virtual Python

```bash
cd ai-service

# Windows
python -m venv venv312
venv312\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```

### 4.2 Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4.3 Crear archivo de variables de entorno

Crear el archivo `.env` en `ai-service/`:

```env
SUPABASE_URL=https://jdmcvsddnshukkcnzghq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
AI_SERVICE_BEARER_TOKEN=token-secreto-min-32-caracteres
ALLOWED_ORIGINS=https://calzaturavilchez-ab17f.web.app
PORT=8000
```

**Importante:** La variable `SUPABASE_SERVICE_KEY` usa la clave `service_role` de Supabase (con acceso sin restricciones RLS). Esta clave nunca debe exponerse al cliente. Debe guardarse con un gestor de secretos en producción.

### 4.4 Ejecutar en desarrollo

```bash
# Windows
run.bat

# Linux/macOS (o directamente)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

El servicio estará disponible en: `http://localhost:8000`  
Documentación interactiva: `http://localhost:8000/docs`

### 4.5 Verificar la conexión a Supabase

```bash
curl -X GET "http://localhost:8000/api/debug/supabase" \
     -H "Authorization: Bearer token-secreto-min-32-caracteres"
```

Respuesta esperada: `{"SUPABASE_URL": true, "supabase": "connected", "productos_count": N}`

---

## 5. Despliegue con Docker Compose

Para levantar el frontend y el servicio IA simultáneamente en un entorno de desarrollo o staging:

### 5.1 Prerrequisitos

Tener Docker Desktop instalado y ejecutándose.

### 5.2 Construir e iniciar los contenedores

```bash
# Desde la raíz del proyecto
docker compose up --build
```

**Servicios disponibles:**
- Frontend: `http://localhost:5173`
- Servicio IA: `http://localhost:8000`

### 5.3 Detener los contenedores

```bash
docker compose down
```

### 5.4 Reconstruir después de cambios en código

```bash
docker compose up --build --force-recreate
```

---

## 6. Despliegue del Servicio IA en Render.com

### 6.1 Pasos en el panel de Render

1. Crear una cuenta en [render.com](https://render.com).
2. Crear un nuevo **Web Service**.
3. Conectar el repositorio Git.
4. Configurar el servicio:
   - **Root Directory:** `ai-service`
   - **Runtime:** Docker
   - **Build Command:** (automático desde Dockerfile)
   - **Start Command:** (automático desde Dockerfile)

### 6.2 Configurar variables de entorno en Render

En el panel de Render, sección "Environment", agregar:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Service Role Key de Supabase |
| `AI_SERVICE_BEARER_TOKEN` | Token secreto (mínimo 32 caracteres) |
| `ALLOWED_ORIGINS` | `https://calzaturavilchez-ab17f.web.app` |

### 6.3 Configuración del Dockerfile

El archivo `ai-service/Dockerfile` ya está configurado:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 6.4 Verificar el despliegue

Tras el despliegue exitoso en Render, verificar:

```bash
curl https://[nombre-servicio].onrender.com/api/health
```

Respuesta esperada: `{"status": "ok", "service": "Calzatura Vilchez AI"}`

**Nota sobre el plan gratuito de Render:** El servicio se pone en modo sleep tras 15 minutos de inactividad. La primera solicitud después del sleep tarda ~30 segundos en despertar el servicio. Para producción, se recomienda el plan Starter ($7/mes) que mantiene el servicio activo 24/7.

---

## 7. Configuración de Firebase Cloud Functions

Las Cloud Functions manejan el webhook de Stripe para confirmar pagos.

### 7.1 Instalar Firebase Functions

```bash
cd calzatura-vilchez/functions
npm install
```

### 7.2 Configurar secretos de Stripe en Firebase

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# Ingresar la Secret Key de Stripe cuando se solicite

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Ingresar el Webhook Secret de Stripe cuando se solicite
```

### 7.3 Desplegar las Cloud Functions

```bash
firebase deploy --only functions
```

### 7.4 Configurar el webhook en Stripe

1. Ir al panel de Stripe → Developers → Webhooks.
2. Agregar endpoint con la URL de la Cloud Function: `https://[region]-[project-id].cloudfunctions.net/stripeWebhook`
3. Seleccionar el evento `checkout.session.completed`.
4. Copiar el "Signing secret" y guardarlo como `STRIPE_WEBHOOK_SECRET` en Firebase Functions secrets.

---

## 8. Configuración de la aplicación móvil (Flutter)

### 8.1 Instalar dependencias Flutter

```bash
cd calzatura-vilchez-mobile
flutter pub get
```

### 8.2 Configurar Firebase para Flutter

1. Instalar FlutterFire CLI: `dart pub global activate flutterfire_cli`
2. Configurar el proyecto: `flutterfire configure --project=calzaturavilchez-ab17f`
3. Esto genera el archivo `lib/firebase_options.dart` automáticamente.

### 8.3 Variables de entorno en Flutter

Crear el archivo `lib/core/config/app_config.dart`:

```dart
class AppConfig {
  static const String supabaseUrl = 'https://jdmcvsddnshukkcnzghq.supabase.co';
  static const String supabaseAnonKey = 'eyJhbG...';
  static const String aiServiceUrl = 'https://[servicio].onrender.com';
  static const String aiServiceToken = 'token-secreto';
}
```

**Nota:** Para producción, usar `--dart-define` en el build para inyectar valores sin exponerlos en el código fuente:

```bash
flutter build apk \
  --dart-define=SUPABASE_URL=https://... \
  --dart-define=SUPABASE_ANON_KEY=eyJhbG... \
  --dart-define=AI_SERVICE_URL=https://...
```

### 8.4 Ejecutar en emulador o dispositivo

```bash
# Listar dispositivos disponibles
flutter devices

# Ejecutar en dispositivo específico
flutter run -d RF8R50W1B0Y  # Samsung SM-A325M (ejemplo)
```

### 8.5 Compilar APK para distribución

```bash
flutter build apk --release
```

El APK generado estará en: `build/app/outputs/flutter-apk/app-release.apk`

---

## 9. Checklist de despliegue a producción

Verificar todos los puntos antes de publicar en producción:

### Seguridad (ISO/IEC 27001)
- [ ] Todas las variables `.env` están en `.gitignore` y fuera del repositorio
- [ ] El token `AI_SERVICE_BEARER_TOKEN` tiene al menos 32 caracteres aleatorios
- [ ] Las reglas RLS de Supabase están activas en todas las tablas
- [ ] El `SUPABASE_SERVICE_KEY` solo se usa en el servicio IA (nunca en el frontend)
- [ ] HTTPS está habilitado en todos los endpoints (Firebase Hosting, Render.com, Supabase)
- [ ] El webhook de Stripe usa firma HMAC para verificar autenticidad

### Calidad del código (ISO 9001:2015)
- [ ] `npm run quality` pasa sin errores (ESLint + TypeScript + build)
- [ ] Las pruebas unitarias del servicio IA pasan: `cd ai-service && pytest`
- [ ] El build de Flutter no tiene errores: `flutter build apk --debug`

### Funcionalidad
- [ ] El catálogo público carga en < 2 segundos
- [ ] El flujo de compra con Stripe funciona en modo test
- [ ] El servicio IA responde correctamente en `/api/health`
- [ ] Las predicciones se muestran en el panel de administración
- [ ] El IRE se calcula y muestra con la clasificación correcta
- [ ] Los filtros del catálogo funcionan en el frontend web y la app móvil

### Monitoreo post-despliegue
- [ ] Verificar logs de Firebase Hosting en Firebase Console
- [ ] Verificar logs del servicio IA en Render.com Dashboard
- [ ] Verificar que el historial del IRE se registra en Supabase `ire_historial`
- [ ] Confirmar que la auditoría registra operaciones en Supabase `auditoria`

---

## 10. Solución de problemas comunes

### El servicio IA no responde

1. Verificar que el servicio está activo en Render.com (puede estar en sleep).
2. Hacer GET a `https://[servicio].onrender.com/` para despertarlo.
3. Verificar los logs en Render.com → Logs.
4. Confirmar que las variables de entorno `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` están configuradas.

### Error "Supabase quota exceeded" en el servicio IA

El plan gratuito de Supabase tiene límites de solicitudes. Si se excede:
1. El servicio IA responde con HTTP 503.
2. El caché de 2 horas reduce las consultas a Supabase significativamente.
3. Si el problema persiste, considerar actualizar al plan Pro de Supabase.

### El pago con Stripe no confirma el pedido

1. Verificar que el webhook de Stripe está configurado con la URL correcta de la Cloud Function.
2. Revisar los logs de la Cloud Function en Firebase Console → Functions → Logs.
3. Confirmar que el `STRIPE_WEBHOOK_SECRET` en Firebase Functions secrets coincide con el Signing Secret en el panel de Stripe.
4. En modo test, usar las tarjetas de prueba de Stripe: `4242 4242 4242 4242` con cualquier fecha futura y CVC de 3 dígitos.

### Error CORS en el servicio IA

Si el frontend recibe errores CORS del servicio IA:
1. Verificar que `ALLOWED_ORIGINS` en Render.com incluye la URL exacta del frontend (con y sin `https://`).
2. El servicio IA ya incluye por defecto: `http://localhost:5173`, `http://localhost:5174`, `https://calzaturavilchez-ab17f.web.app`.
3. Si hay un dominio personalizado, agregarlo a `ALLOWED_ORIGINS` separado por comas.
