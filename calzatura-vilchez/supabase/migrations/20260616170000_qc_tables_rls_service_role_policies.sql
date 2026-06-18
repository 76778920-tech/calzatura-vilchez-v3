-- Lint 0008 (INFO): RLS enabled but no policy — tablas QC Adecuación Funcional (BFF-only).
-- Sin política anon/authenticated: REVOKE ALL ya deniega PostgREST cliente.

ALTER TABLE qc_evaluaciones FORCE ROW LEVEL SECURITY;
ALTER TABLE qc_funciones FORCE ROW LEVEL SECURITY;
ALTER TABLE qc_transacciones_funcionales FORCE ROW LEVEL SECURITY;
ALTER TABLE qc_casos_prueba FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE qc_evaluaciones FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE qc_funciones FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE qc_transacciones_funcionales FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE qc_casos_prueba FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "service_role_all_qc_evaluaciones" ON qc_evaluaciones;
CREATE POLICY "service_role_all_qc_evaluaciones"
  ON qc_evaluaciones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_qc_funciones" ON qc_funciones;
CREATE POLICY "service_role_all_qc_funciones"
  ON qc_funciones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_qc_transacciones_funcionales" ON qc_transacciones_funcionales;
CREATE POLICY "service_role_all_qc_transacciones_funcionales"
  ON qc_transacciones_funcionales
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_qc_casos_prueba" ON qc_casos_prueba;
CREATE POLICY "service_role_all_qc_casos_prueba"
  ON qc_casos_prueba
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
