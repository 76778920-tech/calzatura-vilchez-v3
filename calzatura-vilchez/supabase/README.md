# Supabase runbook

## Admin productos y Realtime

Orden recomendado para activar sincronizacion web/movil:

1. Alinear historial remoto antes de empujar migraciones:

```bash
npm run db:push
```

Si Supabase responde que hay versiones remotas ausentes localmente, primero resolver el historial con `supabase migration repair` y/o `supabase db pull`; no forzar nuevas migraciones encima de un historial divergente.

2. Verificar que las tres tablas del admin de productos estan en la publicacion Realtime:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('productos', 'productoCodigos', 'productoFinanzas')
order by tablename;
```

Debe devolver `productos`, `productoCodigos` y `productoFinanzas`.

3. Verificar acceso efectivo del cliente admin.

La app usa cliente anon de Supabase y control de rol en la aplicacion. Si se activa RLS en estas tablas en el futuro, crear primero politicas de `select`/Realtime compatibles con el rol que usa el panel admin; de lo contrario el canal puede suscribirse sin errores visibles pero no recibir cambios.

4. Prueba manual corta despues del deploy:

- Abrir admin web y admin movil en productos.
- Editar nombre, visibilidad, codigo o finanzas desde uno.
- Confirmar que el otro refresca la lista sin salir de la pantalla.
