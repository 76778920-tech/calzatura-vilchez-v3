-- Bloquea lectura/escritura directa con anon key; el BFF usa service_role.
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE pedidos FROM anon, authenticated;
REVOKE ALL ON TABLE usuarios FROM anon, authenticated;
