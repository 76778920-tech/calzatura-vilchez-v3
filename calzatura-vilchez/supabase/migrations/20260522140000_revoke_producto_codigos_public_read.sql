-- ISO 27001 A.8.11: códigos comerciales no legibles desde cliente anon/authenticated.
-- El catálogo público y pedidos obtienen datos vía BFF o solo tabla productos (RLS activo).

REVOKE SELECT ON TABLE "productoCodigos" FROM anon;
REVOKE SELECT ON TABLE "productoCodigos" FROM authenticated;

DROP POLICY IF EXISTS "anon_select_productoCodigos" ON "productoCodigos";
DROP POLICY IF EXISTS "authenticated_select_productoCodigos" ON "productoCodigos";
