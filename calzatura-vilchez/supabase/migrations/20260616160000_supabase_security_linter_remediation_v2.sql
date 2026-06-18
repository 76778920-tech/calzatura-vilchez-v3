-- Remediación Supabase Database Linter (2026-06-16) — segunda pasada.
-- 0011 function_search_path_mutable: cv_guard_* + qc_set_updated_at
-- 0024 rls_policy_always_true: políticas legacy dashboard (USING/WITH CHECK true)
-- 0028/0029 anon|authenticated SECURITY DEFINER RPC: product atomic functions
--
-- Nota: auth_leaked_password_protection requiere activación manual en
-- Supabase Dashboard → Authentication → Password Security → Leaked password protection.

-- ── 0024 Políticas RLS permisivas legacy (nombres exactos del linter) ──────────
DROP POLICY IF EXISTS "anon all fabricantes" ON fabricantes;
DROP POLICY IF EXISTS "authenticated write fabricantes" ON fabricantes;

DROP POLICY IF EXISTS "anon all favoritos" ON favoritos;
DROP POLICY IF EXISTS "authenticated all favoritos" ON favoritos;
DROP POLICY IF EXISTS "anon full favoritos" ON favoritos;

DROP POLICY IF EXISTS "anon all ireHistorial" ON "ireHistorial";
DROP POLICY IF EXISTS "authenticated all ireHistorial" ON "ireHistorial";

DROP POLICY IF EXISTS "anon all libro_reclamaciones" ON libro_reclamaciones;
DROP POLICY IF EXISTS "anon insert libro_reclamaciones" ON libro_reclamaciones;
DROP POLICY IF EXISTS "authenticated all libro_reclamaciones" ON libro_reclamaciones;

DROP POLICY IF EXISTS "anon all modeloEstado" ON "modeloEstado";
DROP POLICY IF EXISTS "authenticated all modeloEstado" ON "modeloEstado";

DROP POLICY IF EXISTS "anon all movimientosStock" ON "movimientosStock";
DROP POLICY IF EXISTS "authenticated all movimientosStock" ON "movimientosStock";

DROP POLICY IF EXISTS "anon all productoCodigos" ON "productoCodigos";
DROP POLICY IF EXISTS "authenticated write productoCodigos" ON "productoCodigos";

DROP POLICY IF EXISTS "anon all productoFinanzas" ON "productoFinanzas";
DROP POLICY IF EXISTS "authenticated all productoFinanzas" ON "productoFinanzas";

DROP POLICY IF EXISTS "anon write productos" ON productos;
DROP POLICY IF EXISTS "authenticated write productos" ON productos;
DROP POLICY IF EXISTS "anon delete productos" ON productos;
DROP POLICY IF EXISTS "anon insert productos" ON productos;
DROP POLICY IF EXISTS "anon update productos" ON productos;

DROP POLICY IF EXISTS "anon write usuarios" ON usuarios;
DROP POLICY IF EXISTS "authenticated write usuarios" ON usuarios;
DROP POLICY IF EXISTS "anon delete usuarios" ON usuarios;
DROP POLICY IF EXISTS "anon insert usuarios" ON usuarios;
DROP POLICY IF EXISTS "anon update usuarios" ON usuarios;

DROP POLICY IF EXISTS "anon write ventasDiarias" ON "ventasDiarias";
DROP POLICY IF EXISTS "authenticated write ventasDiarias" ON "ventasDiarias";
DROP POLICY IF EXISTS "anon insert ventasDiarias" ON "ventasDiarias";
DROP POLICY IF EXISTS "anon update ventasDiarias" ON "ventasDiarias";

-- Refuerzo REVOKE + FORCE RLS (defensa en profundidad tras DROP policies)
ALTER TABLE fabricantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabricantes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE fabricantes FROM PUBLIC, anon, authenticated;

ALTER TABLE favoritos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE favoritos FROM PUBLIC, anon, authenticated;

ALTER TABLE "ireHistorial" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ireHistorial" FROM PUBLIC, anon, authenticated;

ALTER TABLE libro_reclamaciones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE libro_reclamaciones FROM PUBLIC, anon, authenticated;

ALTER TABLE "modeloEstado" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "modeloEstado" FROM PUBLIC, anon, authenticated;

ALTER TABLE "movimientosStock" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "movimientosStock" FROM PUBLIC, anon, authenticated;

ALTER TABLE "productoCodigos" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "productoCodigos" FROM PUBLIC, anon, authenticated;

ALTER TABLE "productoFinanzas" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "productoFinanzas" FROM PUBLIC, anon, authenticated;

ALTER TABLE usuarios FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE usuarios FROM PUBLIC, anon, authenticated;

ALTER TABLE "ventasDiarias" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ventasDiarias" FROM PUBLIC, anon, authenticated;

-- ── 0028 / 0029 RPC admin producto: solo service_role (BFF) ───────────────────
REVOKE ALL ON FUNCTION create_product_variants_atomic(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_product_variants_atomic(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) TO service_role;

-- ── 0011 search_path inmutable (funciones recreadas tras remediación previa) ──
ALTER FUNCTION cv_guard_producto_tipo() SET search_path = public;
ALTER FUNCTION cv_guard_producto_material() SET search_path = public;
ALTER FUNCTION cv_guard_producto_precio() SET search_path = public;
ALTER FUNCTION cv_guard_producto_estilo() SET search_path = public;
ALTER FUNCTION cv_guard_producto_finanzas() SET search_path = public;
ALTER FUNCTION qc_set_updated_at() SET search_path = public;

-- Cualquier otra función public sin search_path fijo
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
