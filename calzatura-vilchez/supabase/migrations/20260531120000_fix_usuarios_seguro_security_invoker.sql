-- Supabase Database Linter 0010 (security_definer_view): public.usuarios_seguro
-- La vista no se expone al cliente web (usuarios es BFF-only). Solo consultas con service_role.

DROP VIEW IF EXISTS usuarios_seguro;

CREATE VIEW usuarios_seguro
WITH (security_invoker = true)
AS
SELECT
  uid,
  nombres,
  apellidos,
  nombre,
  email,
  rol,
  "creadoEn",
  telefono,
  direcciones,
  CASE
    WHEN dni IS NOT NULL AND length(trim(dni)) > 4
    THEN repeat('*', length(trim(dni)) - 4) || right(trim(dni), 4)
    ELSE '****'
  END AS dni_masked,
  dni_hash
FROM usuarios;

COMMENT ON VIEW usuarios_seguro IS
  'DNI enmascarado; security_invoker (permisos del rol que consulta). SELECT solo service_role.';

REVOKE ALL ON TABLE usuarios_seguro FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE usuarios_seguro TO service_role;

NOTIFY pgrst, 'reload schema';
