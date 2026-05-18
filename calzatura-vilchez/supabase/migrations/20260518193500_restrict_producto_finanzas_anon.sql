-- Costos/márgenes solo vía BFF (staff) o RPC SECURITY DEFINER; catálogo público usa tabla productos.
REVOKE SELECT ON TABLE "productoFinanzas" FROM anon;

DROP POLICY IF EXISTS "anon_select_productoFinanzas" ON "productoFinanzas";
