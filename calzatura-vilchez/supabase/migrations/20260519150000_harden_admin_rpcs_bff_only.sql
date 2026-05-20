-- ISO/IEC 27001 — RPCs administrativos y stock solo vía BFF (service_role).
-- Requiere BFF con /updateProductAtomic, /createProductVariantsAtomic, /deleteProductAtomic,
-- /registrarIngresoStock y migraciones 20260519140000_* desplegadas antes de aplicar.

REVOKE ALL ON FUNCTION create_product_variants_atomic(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION delete_product_atomic(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION registrar_ingreso_stock(text, jsonb, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION decrement_product_stock(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION restore_product_stock(text, text, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION create_product_variants_atomic(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION delete_product_atomic(text) TO service_role;
GRANT EXECUTE ON FUNCTION registrar_ingreso_stock(text, jsonb, numeric, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_product_stock(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION restore_product_stock(text, text, integer) TO service_role;

GRANT EXECUTE ON FUNCTION list_ventas_diarias_by_fecha(text) TO service_role;
GRANT EXECUTE ON FUNCTION list_ventas_diarias_since(text) TO service_role;

NOTIFY pgrst, 'reload schema';
