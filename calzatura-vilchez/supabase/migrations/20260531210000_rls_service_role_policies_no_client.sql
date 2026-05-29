-- Lint 0008 (INFO): RLS enabled but no policy — tablas BFF-only con politica explicita service_role.
-- Sin politica anon/authenticated: REVOKE ALL ya deniega PostgREST cliente.

DROP POLICY IF EXISTS "service_role_all_movimientosStock" ON "movimientosStock";
CREATE POLICY "service_role_all_movimientosStock"
  ON "movimientosStock"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_productoCodigos" ON "productoCodigos";
CREATE POLICY "service_role_all_productoCodigos"
  ON "productoCodigos"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_productoFinanzas" ON "productoFinanzas";
CREATE POLICY "service_role_all_productoFinanzas"
  ON "productoFinanzas"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
