# Auditoría de seguridad del portal

Fecha: 2026-04-20

Alcance revisado:

- Rutas públicas y rutas administrativas.
- Reglas de Firestore.
- Firebase Auth y perfiles.
- Cloud Functions de Stripe.
- Carga de imágenes a Cloudinary.
- Hosting y headers HTTP.
- Exposición de configuración en frontend.

## Hallazgos corregidos

### S1 - Gestión de roles administrativos demasiado amplia

Antes, cualquier usuario con rol `admin` podía asignar rol `admin` a otros perfiles. Esto eleva el riesgo ante una cuenta administrativa comprometida.

Corrección:

- Se agregó `isSuperAdmin()` en `firestore.rules`.
- Solo el superadministrador puede crear o modificar usuarios con rol `admin`.
- Un administrador normal ya no puede editar otro perfil administrador ni promover usuarios a administrador.
- La UI del panel de usuarios oculta o bloquea la opción de administrador cuando no corresponde.

### S2 - CORS abierto en Cloud Functions

Antes, `createCheckoutSession` aceptaba cualquier origen con `cors({ origin: true })`.

Corrección:

- Se limitó CORS a:
  - `https://calzaturavilchez-ab17f.web.app`
  - `https://calzaturavilchez-ab17f.firebaseapp.com`
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`

Nota: CORS no reemplaza autenticación. La función ya exige token Firebase.

### S2 - Errores internos expuestos por Function

Antes, la función podía devolver `error.message` incluso en errores internos.

Corrección:

- Los errores 5xx devuelven un mensaje genérico.
- Los errores esperados 4xx mantienen mensajes funcionales para el usuario.

### S3 - Imágenes Stripe con HTTP

Antes se aceptaban URLs `http` para imagen de producto en Stripe.

Corrección:

- Solo se aceptan imágenes `https`.

### S3 - Hosting sin headers mínimos de endurecimiento

Antes solo existían headers de cache.

Corrección:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### S3 - Validación insuficiente de archivos de imagen en cliente

Antes la carga a Cloudinary no validaba tipo ni tamaño antes de subir.

Corrección:

- Tipos permitidos: JPG, PNG, WebP.
- Tamaño original máximo: 10 MB.
- Tamaño máximo de subida: 4 MB.

## Riesgos pendientes

### S1 - Creación de pedidos desde frontend

El frontend crea documentos en `pedidos` directamente. Las reglas validan dueño, estado, dirección y campos básicos, pero no pueden verificar de forma robusta cada precio, stock y subtotal contra los productos reales.

Riesgo:

- Un cliente técnico podría intentar manipular `items`, `subtotal`, `envio` o `total`.
- Stripe mitiga parte del riesgo porque `createCheckoutSession` recalcula totales.
- Pago contra entrega queda con mayor exposición si no se valida en backend.

Recomendación obligatoria:

- Mover creación de pedidos a una Cloud Function `createOrder`.
- La función debe recibir solo `productId`, `quantity`, `talla`, dirección y método de pago.
- La función debe recalcular precio, stock, subtotal, envío y total desde Firestore.
- Firestore debe bloquear `allow create` directo en `pedidos` para clientes cuando exista la función.

### S1 - Cloudinary unsigned upload preset expuesto

La subida de imágenes usa un unsigned upload preset desde el navegador. Aunque solo la UI admin lo expone, el preset queda visible en el bundle frontend.

Riesgo:

- Si el preset no está restringido en Cloudinary, terceros podrían subir imágenes al cloud.

Recomendación obligatoria:

- Configurar el preset en Cloudinary con restricciones de formato, tamaño, carpeta y moderación si está disponible.
- Migrar a subida firmada mediante Cloud Function admin-only.
- No usar Cloudinary API secret en frontend.

### S2 - Superadmin por email hardcoded

El superadministrador está definido por email en frontend y reglas.

Riesgo:

- Requiere cambio de código/reglas si cambia el responsable.

Recomendación:

- Mantenerlo como control temporal.
- En una fase posterior, usar custom claims administrados por backend.

### S2 - Falta App Check

No se evidencia Firebase App Check.

Riesgo:

- Mayor exposición a automatización abusiva contra Firestore/Auth/Functions desde clientes no oficiales.

Recomendación:

- Activar Firebase App Check para Hosting, Firestore y Functions.

### S3 - CSP no configurada

Se agregaron headers base, pero no Content Security Policy.

Riesgo:

- Mayor exposición si en el futuro entra XSS.

Recomendación:

- Definir una CSP compatible con Firebase, Stripe, Cloudinary y Google Fonts.
- Probar primero en modo `Content-Security-Policy-Report-Only`.

## Prioridad siguiente

1. Refactor de creación de pedidos a Cloud Function.
2. Subida firmada a Cloudinary desde Function admin-only.
3. App Check.
4. CSP en modo reporte.
5. Custom claims para roles.

## Arquitectura de rutas aplicada

Se aplicó una separación obligatoria por dominios:

- `src/domains`: código, documentación y propiedad por dominio funcional.
- `src/routes/paths.ts`: rutas centralizadas.
- `src/routes/RouteGuards.tsx`: guardias de autenticación y autorización por área.
- `src/security/accessControl.ts`: mapa de roles permitidos por área.

Esta separación no sustituye Firestore Rules ni backend. Es una barrera de mantenibilidad y prevención de errores de rutas; la seguridad real de datos sigue en Firebase, Functions y endpoints serverless propios como la validación DNI en Vercel.
