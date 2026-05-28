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

- **Histórico:** `confirmCodOrder` en Cloud Functions (retirado en BFF; stock COD en `POST /createOrder`). Estado de pedido pagado en Supabase: **`pagado`** (no `confirmado`).
- El frontend llama obligatoriamente a esta función antes de navegar a la página de éxito.

### S1 - Instrumentación de debug con telemetría externa

Múltiples archivos contenían `fetch` a `127.0.0.1:7932` (endpoint de debug de sesión) en funciones de producción: `security.ts`, `auth.ts`, `Register.tsx`, `CheckoutPage.tsx`, `orders.ts`, `AdminPredictions.tsx`.

Corrección:

- Todos los bloques de instrumentación temporal eliminados del código de producción.

### S2 - Rate limiting ausente en AI service

El servicio de IA en Render no tenía límites de solicitudes por IP.

Corrección:

- Agregado `slowapi` con límite de 20 req/min en endpoints de predicción y 5 req/min en invalidate cache.

## Rol trabajador (endurecimiento 2026-05-19)

Alineado a ISO/IEC 27001 (privilegio mínimo) y `docs/quality-security-standards.md`.

| Control | Estado |
|---------|--------|
| Rutas `/staff/*` con `AreaRoute` + `StaffLayout` | OK |
| Ventas/finanzas: BFF separado admin vs trabajador | OK — ver tabla endpoints |
| Registro/devolución ventas solo vía BFF | OK — RPC revocados a anon/authenticated (`20260519140000`) |
| `ventasDiarias` RLS sin políticas cliente | OK — misma migración |
| Desempeño trabajador sin `gananciaTotal` en API | OK — `GET /staff/performance` redactado |

Endpoints trabajador (token Firebase + rol `trabajador` en Supabase):

- `GET /staff/dailySales` — solo `encargadoUid = uid`; sin costos ni ganancia.
- `GET /staff/productPriceRanges` — solo rangos de precio.
- `POST /staff/dailySales/register` — costos calculados en servidor.
- `POST /staff/dailySales/return` — solo ventas propias (`encargadoUid`).
- `GET /staff/performance` — métricas propias sin ganancia agregada.

### Riesgos residuales trabajador

| ID | Riesgo | Severidad | Estado |
|----|--------|-----------|--------|
| T1 | Pedidos web — PII trabajador | Media | **Mitigado** — `redactOrderForStaff` en `GET /staff/orders` y `GET /orders/:orderId` (email/tel/dirección enmascarados; distrito para logística) |
| T2 | Catálogo inactivo visible al trabajador | Baja | **Cerrado** — `GET /staff/products` y `/staff/productCodes` solo activos |
| T6 | Precio de venta manipulable desde cliente | Alta | **Cerrado** — validación BFF min/max + recálculo de costos en servidor |
| T7 | Sin auditoría de ventas tienda | Media | **Cerrado** — `registrar_venta` / `devolver_venta` en `auditoria` |
| T4 | Tests E2E 403 trabajador (29119) | Media | Fuera de alcance 29119; cubierto parcial por Vitest (`panelScopeServices`, `financeService`) |
| T5 | Orden despliegue migraciones ventas | Alta | Documentado en `ISO-CUMPLIMIENTO-INTERNO.md` |

## Riesgos pendientes

### S1 - Creación de pedidos desde frontend (parcialmente mitigado)

El frontend crea documentos en `pedidos` directamente con totales calculados en cliente.

Estado actual:

- Stripe: mitigado — BFF `createCheckoutSession` recalcula totales desde Supabase y rechaza con 409 si no coinciden.
- Contra entrega: mitigado — `confirmCodOrder` valida server-side antes de confirmar el pedido.
- Riesgo residual: el documento en `pedidos` se crea con datos del cliente antes de la validación. Si la validación falla, queda un registro `pendiente` con datos potencialmente incorrectos (no avanza, pero genera ruido de datos).

Recomendación pendiente:

- Mover la creación del pedido a una Cloud Function `createOrder` que reciba solo `items[]` (productId, quantity, talla), dirección y método de pago, y construya el documento desde Firestore.
- Bloquear `allow create` directo en `pedidos` para clientes en Firestore Rules.

### S1 - Cloudinary (mitigado en código)

**Estado:** subida firmada vía `POST /admin/media/cloudinary-signature` (BFF + `CLOUDINARY_API_SECRET`). El frontend ya no envía `upload_preset`.

**Pendiente operativo:** desactivar o restringir el preset unsigned `calzatura_uploads` en el panel Cloudinary; configurar `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME` en Render.

### S2 - App Check (parcial)

**Estado:** `initializeAppCheck` en `src/firebase/config.ts` si existe `VITE_FIREBASE_APPCHECK_SITE_KEY` (omitido en E2E).

**Pendiente operativo:** registrar reCAPTCHA v3 en Firebase Console → App Check → enforcement en Auth/Hosting.

### S3 - CSP (implementada)

**Estado:** `Content-Security-Policy` en `firebase.json` (Firebase, Stripe, HTTPS para API/BFF/Cloudinary). `img-src` incluye `https:` para URLs de imagen de catálogo pegadas por admin (CDNs de proveedores); scripts siguen restringidos.

**Mejora opcional:** modo `Content-Security-Policy-Report-Only` + endpoint de reportes antes de endurecer `script-src`.

## Prioridad siguiente

1. Enforcement App Check en Firebase Console.
2. Secretos Cloudinary en BFF y retirar preset unsigned en Cloudinary.
3. Pentest / revisión externa antes de declarar SGSI.

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
