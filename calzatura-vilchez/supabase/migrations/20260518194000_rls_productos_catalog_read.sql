-- Catálogo público: solo productos activos visibles con anon key.
-- Admin (inactivos) sigue vía RPC SECURITY DEFINER y panel con rol verificado en app + BFF.
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_active_productos" ON productos;
CREATE POLICY "anon_read_active_productos"
  ON productos FOR SELECT TO anon
  USING (activo IS TRUE);

DROP POLICY IF EXISTS "authenticated_read_active_productos" ON productos;
CREATE POLICY "authenticated_read_active_productos"
  ON productos FOR SELECT TO authenticated
  USING (activo IS TRUE);
