-- Remediación export Supabase Performance Security Lints (jdmcvsddnshukkcnzghq).
-- 1) Políticas RLS permisivas legacy (dashboard) que REVOKE no elimina.
-- 2) Metadatos producto sin RLS activo.
-- 3) RPC SECURITY DEFINER ejecutables por anon/authenticated.
-- 4) search_path fijo en funciones public (lint 0011).

-- ── Políticas legacy permisivas (INSERT/UPDATE/DELETE/ALL con true) ───────────
DROP POLICY IF EXISTS "anon_insert_auditoria" ON auditoria;
DROP POLICY IF EXISTS "anon full favoritos" ON favoritos;
DROP POLICY IF EXISTS "service_insert_ire_historial" ON "ireHistorial";
DROP POLICY IF EXISTS "service_update_ire_historial" ON "ireHistorial";
DROP POLICY IF EXISTS "anon_insert_pedidos" ON pedidos;
DROP POLICY IF EXISTS "anon_update_pedidos" ON pedidos;
DROP POLICY IF EXISTS "anon_delete_productoCodigos" ON "productoCodigos";
DROP POLICY IF EXISTS "anon_insert_productoCodigos" ON "productoCodigos";
DROP POLICY IF EXISTS "anon_update_productoCodigos" ON "productoCodigos";
DROP POLICY IF EXISTS "anon_select_productoCodigos" ON "productoCodigos";
DROP POLICY IF EXISTS "authenticated_select_productoCodigos" ON "productoCodigos";
DROP POLICY IF EXISTS "anon_delete_productoFinanzas" ON "productoFinanzas";
DROP POLICY IF EXISTS "anon_insert_productoFinanzas" ON "productoFinanzas";
DROP POLICY IF EXISTS "anon_update_productoFinanzas" ON "productoFinanzas";
DROP POLICY IF EXISTS "anon_select_productoFinanzas" ON "productoFinanzas";
DROP POLICY IF EXISTS "authenticated_select_productoFinanzas" ON "productoFinanzas";
DROP POLICY IF EXISTS "anon_delete_productos" ON productos;
DROP POLICY IF EXISTS "anon_insert_productos" ON productos;
DROP POLICY IF EXISTS "anon_update_productos" ON productos;
DROP POLICY IF EXISTS "anon_delete_usuarios" ON usuarios;
DROP POLICY IF EXISTS "anon_insert_usuarios" ON usuarios;
DROP POLICY IF EXISTS "anon_update_usuarios" ON usuarios;
DROP POLICY IF EXISTS "anon_insert_ventasDiarias" ON "ventasDiarias";
DROP POLICY IF EXISTS "anon_update_ventasDiarias" ON "ventasDiarias";

-- ── Metadatos admin: RLS + sin acceso PostgREST cliente ───────────────────────
ALTER TABLE "productoCodigos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "productoCodigos" FORCE ROW LEVEL SECURITY;
ALTER TABLE "productoFinanzas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "productoFinanzas" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "productoCodigos" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "productoFinanzas" FROM PUBLIC, anon, authenticated;

-- ── RPC sensibles: solo service_role (lint 0028 / 0029) ───────────────────────
REVOKE ALL ON FUNCTION decrement_order_line_stock(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION decrement_order_stock(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION restore_order_line_stock(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION restore_order_stock(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION decrement_product_stock(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION restore_product_stock(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION purge_old_audit_records(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION purge_test_sales(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION run_data_retention_policy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION fn_audit_pedido_insert() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION decrement_order_line_stock(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_order_stock(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION restore_order_line_stock(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION restore_order_stock(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_product_stock(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION restore_product_stock(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION purge_old_audit_records(integer) TO service_role;
GRANT EXECUTE ON FUNCTION purge_test_sales(integer) TO service_role;
GRANT EXECUTE ON FUNCTION run_data_retention_policy() TO service_role;

-- ── search_path inmutable en funciones de aplicación (lint 0011) ──────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS func_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public',
      r.schema_name,
      r.func_name,
      r.func_args
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
