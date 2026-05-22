# Carrito de compras

Área pública para el carrito y autenticada para finalizar compra.

**Persistencia:** `sessionStorage` con `calzatura_cart:guest` (invitado) y `calzatura_cart:auth` (logueado). Sin UID en la clave (privacidad en equipos compartidos). Migración automática desde `localStorage` legacy; limpieza en `logoutUser` → `clearSensitiveClientStorage`.

La creación de pedidos debe migrarse a backend para evitar manipulación de precios o totales desde el navegador.
