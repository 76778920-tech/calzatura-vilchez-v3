-- El SPA usa la clave `anon` de PostgREST (autenticación vía Firebase, no Supabase Auth).
-- Sin EXECUTE para `anon`, `supabase.rpc('decrement_product_stock'|...)` desde el navegador falla.
-- Las funciones son SECURITY DEFINER: mitigar abuso en roadmap (p. ej. proxy admin con service_role).

GRANT EXECUTE ON FUNCTION decrement_product_stock(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION restore_product_stock(text, text, integer) TO anon;
