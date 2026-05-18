# Prueba manual — stock atómico en pedidos

Checklist para validar las RPC `decrement_order_stock` / `restore_order_stock` con el BFF en Render y Supabase.

## Prerrequisitos

- Migraciones aplicadas: `20260516120000_order_stock_atomic_rpc.sql`, `20260516130000_order_stock_restore_rpc.sql`
- BFF desplegado en Render con el mismo código que `bff/server.cjs` en `main`
- Producto de prueba con stock conocido por talla (anotar valores antes)

## Flujo

1. **Crear pedido (tienda)** — Cliente autenticado, checkout contra entrega o Stripe test. Anotar `orderId` y líneas (producto, talla, cantidad).
2. **Verificar pendiente** — En Supabase `pedidos`: `estado = pendiente`. Stock de producto **sin cambiar** aún.
3. **Marcar pagado (admin)** — Panel → Pedidos → estado **pagado**.
4. **Verificar descuento** — Stock bajó según líneas; `stockDescontadoEn` con timestamp en el pedido; sin doble descuento si repites el paso 3.
5. **Cancelar pedido** — Cambiar estado a **cancelado**.
6. **Verificar restauración** — Stock restaurado; `stockRestauradoEn` rellenado; no restaurar dos veces si vuelves a cancelar.

## Smoke SQL (opcional)

En el SQL Editor de Supabase, tras sustituir IDs reales:

```bash
# Ver scripts/sql/order_stock_rpc_smoke.sql en el repo
```

## Si algo falla

| Síntoma | Revisar |
|---------|---------|
| Pagado no baja stock | Logs BFF Render; RPC `decrement_order_stock` en Supabase |
| Error 409 / stock insuficiente | Stock real vs cantidad del pedido |
| Cancelado no restaura | `stockDescontadoEn` null (nunca se descontó) o RPC `restore_order_stock` |
| Web OK, móvil no | `BACKEND_API_URL` en `.env` móvil apunta al BFF correcto |
