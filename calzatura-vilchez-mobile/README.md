# Calzatura Vilchez — App móvil (Flutter)

## Configuración (una vez)

1. Copia `.env.example` → `.env` (o confirma que existe).
2. Obligatorio para pedidos y favoritos:

```env
BACKEND_API_URL=https://calzatura-vilchez-bff.onrender.com
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

3. Dependencias:

```bash
cd calzatura-vilchez-mobile
flutter pub get
```

4. Al arrancar en debug, la consola debe mostrar:

```text
[Calzatura] BFF: https://calzatura-vilchez-bff.onrender.com
```

## Prueba BFF — favoritos + pedido COD

Usa la **misma cuenta** que en la web (Firebase Auth).

### A) Favoritos

1. `flutter run` (emulador o dispositivo con internet).
2. Inicia sesión.
3. Catálogo → abre un producto → pulsa el corazón (favorito).
4. Menú → **Mis Favoritos**: debe aparecer el producto.
5. En Supabase → tabla `favoritos`: fila con tu `userId` y `productId`.
6. Cierra sesión, entra con **otra cuenta**: ese producto no debe verse en favoritos.

### B) Pedido contra entrega

1. Con sesión iniciada: añade al carrito (talla con stock).
2. Carrito → **Checkout** → completa dirección y teléfono (9 dígitos, empieza con 9).
3. Método **Contra entrega** (por defecto) → confirmar.
4. Debe navegar a pantalla de éxito con ID de pedido.
5. Supabase `pedidos`: nuevo registro `estado = pendiente`.
6. Admin web → **Pagado** → stock baja (igual que probaste en tienda web).

### Si falla

| Síntoma | Revisar |
|---------|---------|
| Error al confirmar pedido | BFF en Render (`/health`), logs Render, sesión Firebase |
| Favoritos vacíos tras marcar | `BACKEND_API_URL` en `.env`, hot restart (`R` en `flutter run`) |
| `Unable to load asset .env` | Ejecutar desde `calzatura-vilchez-mobile` (el `.env` va en esta carpeta) |

BFF salud: https://calzatura-vilchez-bff.onrender.com/health
