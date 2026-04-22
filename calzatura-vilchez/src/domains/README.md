# Seccionamiento por dominios y roles

Estas carpetas organizan el portal por área funcional y por responsabilidad de seguridad.

Importante: las carpetas del frontend no son una barrera criptográfica. El navegador puede descargar el código público del sitio. La protección real se hace con:

- `src/routes/RouteGuards.tsx`
- `src/security/accessControl.ts`
- `firestore.rules`
- Cloud Functions para operaciones sensibles
- validación de datos en cliente y servidor

## Dominios

- `publico`: inicio, login, registro, tienda pública.
- `productos`: catálogo y detalle de productos.
- `carrito`: carrito y checkout.
- `clientes`: favoritos y vistas privadas del cliente.
- `pedidos`: historial, confirmación y administración de pedidos.
- `administradores`: panel administrativo general.
- `trabajadores`: futuras funciones operativas internas.
- `fabricantes`: gestión de fabricantes.
- `ventas`: ventas diarias y rentabilidad.
- `usuarios`: perfil, registro validado, roles y control de acceso.

Cada nueva pantalla debe registrarse en `src/routes/paths.ts` y quedar protegida con `AreaRoute` si no es pública.
