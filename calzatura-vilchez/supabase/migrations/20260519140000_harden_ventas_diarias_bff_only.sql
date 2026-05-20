-- ISO/IEC 27001 — privilegio mínimo: ventas diarias solo vía BFF (service_role).
-- Requiere BFF desplegado con /admin|staff/dailySales/* antes de aplicar.

ALTER TABLE "ventasDiarias" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "ventasDiarias" FROM anon, authenticated;

REVOKE ALL ON FUNCTION list_ventas_diarias_by_fecha(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION list_ventas_diarias_since(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION register_daily_sales_atomic(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION return_daily_sale_atomic(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION register_daily_sales_atomic(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION return_daily_sale_atomic(text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
