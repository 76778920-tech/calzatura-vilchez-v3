-- Defensa en profundidad (web): anon/authenticated no acceden a tablas sensibles vía PostgREST.
-- Complementa supabaseDirectAccessGuard (sin mutaciones en src) y validate-supabase-rls-matrix.mjs (CI).
-- El BFF opera con service_role; el navegador solo usa anon key para catálogo público (productos activos).

-- Tablas que debían estar BFF-only pero carecían de REVOKE explícito
ALTER TABLE libro_reclamaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE libro_reclamaciones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE libro_reclamaciones FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE libro_reclamaciones TO service_role;

DROP POLICY IF EXISTS "service_role_all_libro_reclamaciones" ON libro_reclamaciones;
CREATE POLICY "service_role_all_libro_reclamaciones"
  ON libro_reclamaciones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE fabricantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabricantes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE fabricantes FROM PUBLIC, anon, authenticated;

ALTER TABLE "ireHistorial" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ireHistorial" FROM PUBLIC, anon, authenticated;

ALTER TABLE "modeloEstado" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "modeloEstado" FROM PUBLIC, anon, authenticated;

-- Stock: eliminar acceso authenticated amplio; solo service_role / RPC SECURITY DEFINER vía BFF
ALTER TABLE "movimientosStock" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "movimientosStock" FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "authenticated_all_movimientosStock" ON "movimientosStock";

-- Endurecer tablas ya restringidas (propietario de tabla no bypass RLS)
ALTER TABLE pedidos FORCE ROW LEVEL SECURITY;
ALTER TABLE usuarios FORCE ROW LEVEL SECURITY;
ALTER TABLE favoritos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE favoritos FROM PUBLIC;
ALTER TABLE auditoria FORCE ROW LEVEL SECURITY;
ALTER TABLE "ventasDiarias" FORCE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
