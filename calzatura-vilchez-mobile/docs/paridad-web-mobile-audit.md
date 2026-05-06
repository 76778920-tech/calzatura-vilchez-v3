# Paridad Web vs Mobile

Fecha: 2026-05-05

## Estado actual

La app `calzatura-vilchez-mobile` ya cubre parte del catálogo público, autenticación básica y varios módulos admin. Sin embargo, todavía no alcanza paridad funcional con `calzatura-vilchez` para una salida comercial completa.

## Lo ya presente en móvil

- Autenticación con Firebase.
- Lectura de catálogo público desde Supabase.
- Home editorial móvil.
- Detalle de producto.
- Carrito local.
- Historial de pedidos básico.
- Panel admin parcial:
  - Dashboard
  - Productos
  - Pedidos
  - Ventas
  - Usuarios
  - Fabricantes
  - Predicciones

## Brechas críticas para salida a mercado

### P0 - Venta real

- Checkout real en móvil.
- Creación de pedido usando Cloud Function `createOrder`.
- Pantalla de confirmación post-compra.
- Corrección del historial de pedidos para usar `userId` real.
- Validación de dirección y teléfono como en web.

### P0 - Integridad funcional

- Corregir consultas móviles para que reflejen el esquema real de Supabase.
- Alinear `productoCodigos`, `usuarios.uid`, `pedidos.userId`, etc.
- Eliminar placeholders que bloquean flujos comerciales.

### P1 - Experiencia de cliente

- Favoritos reales con persistencia.
- Perfil completo con datos de usuario y direcciones.
- Checkout reutilizando direcciones guardadas.
- Pantallas de éxito, error y estados vacíos más completas.

### P1 - Paridad de catálogo

- Facetas/filtros avanzados del catálogo web.
- Agrupación por familia de producto y variantes relacionadas.
- Búsqueda más rica.
- Campañas especiales tipo outlet / nueva temporada / landings.

### P1 - Operación admin

- Admin Data (`/admin/datos`) no existe en móvil.
- Admin Products móvil aún está por debajo de la web en:
  - variantes
  - finanzas
  - validaciones comerciales
  - reglas de imagen
  - importación
- Admin Sales aún requiere alinear `codigo` con `productoCodigos`.

### P2 - Pago móvil completo

- Stripe móvil no está implementado.
- La web usa `@stripe/stripe-js`; móvil requerirá:
  - Stripe nativo para Flutter, o
  - ajuste backend para devolver URL/flujo móvil compatible.

## Brechas de rutas

### Web con ruta y móvil sin equivalente claro

- `checkout`
- `pedido-exitoso/:id`
- `verify-email`
- `stores`
- `info/*`
- `cyber-wow`
- `club-calzado`
- `admin/datos`

## Riesgos detectados

- Hay lógica de negocio importante todavía solo en la web.
- Algunas pantallas móviles estaban leyendo columnas que no existen o relaciones no declaradas.
- El móvil tiene placeholders en zonas sensibles del funnel de venta.
- La paridad visual existe en varias áreas, pero la paridad transaccional todavía no.

## Estrategia recomendada

1. Cerrar P0 de compra y pedidos.
2. Cerrar P0/P1 de favoritos y perfil.
3. Llevar admin crítico a consistencia de datos.
4. Alinear catálogo avanzado.
5. Resolver Stripe móvil.
6. Añadir landings y páginas institucionales si negocio lo necesita dentro de la app.

## Implementación iniciada en esta sesión

- Correcciones de esquema en admin productos, pedidos y usuarios.
- Navegación de retroceso segura para evitar cierres de app.
- Inicio del flujo P0 de checkout móvil.
