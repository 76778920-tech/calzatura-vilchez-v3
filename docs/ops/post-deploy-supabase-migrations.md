# Post-deploy — migraciones Supabase

Tras cada despliegue a **main** que incluya archivos nuevos en `calzatura-vilchez/supabase/migrations/`:

1. Revisar que **CI Integration** haya pasado `supabase-remote-parity` (paridad Local/Remote).
2. Desde `calzatura-vilchez/`, aplicar en el proyecto enlazado:

   ```bash
   npm run db:push
   ```

3. Confirmar alineación:

   ```bash
   npx supabase migration list
   ```

4. Si el CLI indica desfase de historial, seguir `calzatura-vilchez/supabase/README.md` (`migration repair` antes de `db push`).

**No** ejecutar `db pull` en producción salvo decisión explícita de versionar SQL generado.
