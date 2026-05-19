-- Registra quien atendio cada venta de tienda fisica.

ALTER TABLE "ventasDiarias"
  ADD COLUMN IF NOT EXISTS "encargadoUid" text,
  ADD COLUMN IF NOT EXISTS "encargadoNombre" text,
  ADD COLUMN IF NOT EXISTS "encargadoEmail" text;

CREATE INDEX IF NOT EXISTS idx_ventas_encargado_uid ON "ventasDiarias" ("encargadoUid");

CREATE OR REPLACE FUNCTION register_daily_sales_atomic(p_sales jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale jsonb;
  v_ids text[] := '{}';
  v_id text;
BEGIN
  IF jsonb_typeof(COALESCE(p_sales, '[]'::jsonb)) <> 'array' OR jsonb_array_length(COALESCE(p_sales, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'sales_payload_empty';
  END IF;

  FOR v_sale IN SELECT * FROM jsonb_array_elements(p_sales)
  LOOP
    IF NULLIF(v_sale->>'encargadoUid', '') IS NULL OR NULLIF(v_sale->>'encargadoNombre', '') IS NULL THEN
      RAISE EXCEPTION 'sale_operator_required';
    END IF;

    PERFORM decrement_product_stock(
      v_sale->>'productId',
      jsonb_build_array(jsonb_build_object(
        'talla', NULLIF(v_sale->>'talla', ''),
        'cantidad', COALESCE((v_sale->>'cantidad')::integer, 0)
      ))
    );

    INSERT INTO "ventasDiarias" (
      "productId", codigo, nombre, color, talla, fecha, cantidad,
      "precioVenta", total, "costoUnitario", "costoTotal", ganancia,
      "documentoTipo", "documentoNumero", cliente,
      "encargadoUid", "encargadoNombre", "encargadoEmail",
      canal, "creadoEn"
    )
    VALUES (
      v_sale->>'productId',
      COALESCE(v_sale->>'codigo', 'SIN-CODIGO'),
      COALESCE(v_sale->>'nombre', ''),
      COALESCE(v_sale->>'color', ''),
      NULLIF(v_sale->>'talla', ''),
      v_sale->>'fecha',
      COALESCE((v_sale->>'cantidad')::integer, 0),
      COALESCE((v_sale->>'precioVenta')::numeric, 0),
      COALESCE((v_sale->>'total')::numeric, 0),
      COALESCE((v_sale->>'costoUnitario')::numeric, 0),
      COALESCE((v_sale->>'costoTotal')::numeric, 0),
      COALESCE((v_sale->>'ganancia')::numeric, 0),
      COALESCE(v_sale->>'documentoTipo', 'ninguno'),
      NULLIF(v_sale->>'documentoNumero', ''),
      CASE
        WHEN v_sale ? 'cliente' AND v_sale->'cliente' <> 'null'::jsonb THEN v_sale->'cliente'
        ELSE NULL
      END,
      v_sale->>'encargadoUid',
      v_sale->>'encargadoNombre',
      NULLIF(v_sale->>'encargadoEmail', ''),
      'tienda',
      now()::text
    )
    RETURNING id INTO v_id;

    v_ids := v_ids || v_id;
  END LOOP;

  RETURN jsonb_build_object('ids', to_jsonb(v_ids));
END;
$$;

REVOKE ALL ON FUNCTION register_daily_sales_atomic(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_daily_sales_atomic(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION register_daily_sales_atomic(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
