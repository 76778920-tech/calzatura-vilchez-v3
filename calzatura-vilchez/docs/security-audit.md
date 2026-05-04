# Auditoría de seguridad del portal

Fecha: 2026-04-27 (actualizado — revisión inicial: 2026-04-20)

Alcance revisado:

- Rutas públicas y rutas administrativas.
- Políticas RLS de Supabase (datos) y Firestore Rules (perfiles de usuario Firebase Auth).
- Firebase Auth y perfiles.
- Cloud Functions de Stripe.
- Carga de imágenes a Cloudinary.
- Hosting y headers HTTP.
- Exposición de configuración en frontend.
- Manejo de errores y degradación comunicada en módulos admin.

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

### S2 - Superadmin por email hardcoded

Antes el superadministrador se identificaba por email en frontend (`VITE_SUPERADMIN_EMAILS`) y en reglas de Firestore.

Corrección:

- Las reglas de Firestore y Storage ahora usan `request.auth.token.superadmin == true` (custom claim).
- El frontend mantiene `VITE_SUPERADMIN_EMAILS` solo como barrera de UI, no como control de acceso real.
- La autorización real recae en Firestore Rules y Cloud Functions, no en el bundle frontend.

### S1 - Pago contra entrega sin validación server-side

El flujo COD confirmaba el pedido en frontend sin verificar precios ni stock reales.

Corrección:

- Se agregó la Cloud Function `confirmCodOrder` que verifica token Firebase, re-fetcha precios y stock reales desde Firestore, valida que `subtotal` y `total` coincidan (tolerancia ±0.01), y solo entonces actualiza el estado a `confirmado`.
- El frontend llama obligatoriamente a esta función antes de navegar a la página de éxito.

### S1 - Instrumentación de debug con telemetría externa

Múltiples archivos contenían `fetch` a `127.0.0.1:7932` (endpoint de debug de sesión) en funciones de producción: `security.ts`, `auth.ts`, `Register.tsx`, `CheckoutPage.tsx`, `orders.ts`, `AdminPredictions.tsx`.

Corrección:

- Todos los bloques de instrumentación temporal eliminados del código de producción.

### S2 - Rate limiting ausente en AI service

El servicio de IA en Render no tenía límites de solicitudes por IP.

Corrección:

- Agregado `slowapi` con límite de 20 req/min en endpoints de predicción y 5 req/min en invalidate cache.

## Riesgos pendientes

### S1 - Creación de pedidos desde frontend (parcialmente mitigado)

El frontend crea documentos en `pedidos` directamente con totales calculados en cliente.

Estado actual:

- Stripe: mitigado completamente — `createCheckoutSession` recalcula totales desde Firestore y rechaza con 409 si no coinciden.
- Contra entrega: mitigado — `confirmCodOrder` valida server-side antes de confirmar el pedido.
- Riesgo residual: el documento en `pedidos` se crea con datos del cliente antes de la validación. Si la validación falla, queda un registro `pendiente` con datos potencialmente incorrectos (no avanza, pero genera ruido de datos).

Recomendación pendiente:

- Mover la creación del pedido a una Cloud Function `createOrder` que reciba solo `items[]` (productId, quantity, talla), dirección y método de pago, y construya el documento desde Firestore.
- Bloquear `allow create` directo en `pedidos` para clientes en Firestore Rules.

### S1 - Cloudinary unsigned upload preset expuesto

La subida de imágenes usa un unsigned upload preset desde el navegador. Aunque solo la UI admin lo expone, el preset queda visible en el bundle frontend.

Riesgo:

- Si el preset no está restringido en Cloudinary, terceros podrían subir imágenes al cloud.

Recomendación obligatoria:

- Configurar el preset en Cloudinary con restricciones de formato, tamaño, carpeta y moderación si está disponible.
- Migrar a subida firmada mediante Cloud Function admin-only.
- No usar Cloudinary API secret en frontend.

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

1. Refactor de creación de pedidos a Cloud Function `createOrder` (elimina riesgo residual de datos COD incorrectos).
2. Subida firmada a Cloudinary desde Function admin-only.
3. App Check.
4. CSP en modo reporte.

## Arquitectura de rutas aplicada

Se aplicó una separación obligatoria por dominios:

- `src/domains`: código, documentación y propiedad por dominio funcional.
- `src/routes/paths.ts`: rutas centralizadas.
- `src/routes/RouteGuards.tsx`: guardias de autenticación y autorización por área.
- `src/security/accessControl.ts`: mapa de roles permitidos por área.

Esta separación no sustituye Supabase RLS ni backend. Es una barrera de mantenibilidad y prevención de errores de rutas; la seguridad real de datos sigue en Supabase RLS (tablas de negocio), Firebase Auth (identidad) y Cloud Functions (pagos Stripe).

## Hallazgos — AdminDashboard (commit 4f6ce4c, 2026-05-02)

Ver detalle completo en `docs/15-modulos/AdminDashboard-auditoria.md`.

| ID | Hallazgo | Severidad | Estado |
|---|---|---|---|
| H-01 | `Promise.all` sin `.catch`: KPIs en cero sin aviso si un fetch falla | Alta | ✅ Cerrado |
| H-02 | `fetchRecentAudit` catch silencioso: tabla vacía sin distinción de error | Media | ✅ Cerrado |
| H-03 | `<tr onClick>` sin `role="button"` ni teclado (accesibilidad WCAG 4.1.2) | Media | ✅ Cerrado |
| H-04 | Ganancia estimada sin indicación visual de estimación | Baja | ✅ Cerrado |

**Corrección aplicada:** `setLoadError` + `toast.error` + pantalla de error con Reintentar; `setAuditError` + mensaje visible; `role="button"` + `onKeyDown`; etiqueta `(est.)` en KPI.

**Caso de prueba pendiente de automatizar:** TC-DASH-001 (mock 500 → verificar UX). Ver `docs/CU-T07-LEEME.md` (matriz canónica en `documentacion/cuadros-excel/CU-T07-matriz-pruebas-requisitos.csv`).
