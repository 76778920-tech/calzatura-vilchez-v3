-- Ventas diarias: el registro usa RPC SECURITY DEFINER (insert OK),
-- pero el historial lee con PostgREST + rol anon → hace falta SELECT explícito.

GRANT SELECT ON TABLE "ventasDiarias" TO anon;
GRANT SELECT ON TABLE "ventasDiarias" TO authenticated;
GRANT INSERT, UPDATE ON TABLE "ventasDiarias" TO anon;
GRANT INSERT, UPDATE ON TABLE "ventasDiarias" TO authenticated;

CREATE OR REPLACE FUNCTION list_ventas_diarias_by_fecha(p_fecha text)
RETURNS SETOF "ventasDiarias"
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM "ventasDiarias"
  WHERE fecha = p_fecha
  ORDER BY "creadoEn" DESC;
$$;

REVOKE ALL ON FUNCTION list_ventas_diarias_by_fecha(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_ventas_diarias_by_fecha(text) TO anon;
GRANT EXECUTE ON FUNCTION list_ventas_diarias_by_fecha(text) TO authenticated;

CREATE OR REPLACE FUNCTION list_ventas_diarias_since(p_fecha_desde text)
RETURNS SETOF "ventasDiarias"
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM "ventasDiarias"
  WHERE fecha >= p_fecha_desde
  ORDER BY "creadoEn" DESC
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION list_ventas_diarias_since(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_ventas_diarias_since(text) TO anon;
GRANT EXECUTE ON FUNCTION list_ventas_diarias_since(text) TO authenticated;
