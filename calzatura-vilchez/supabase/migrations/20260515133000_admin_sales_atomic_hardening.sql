-- Hardening Admin Ventas:
-- - Registro de ventas + decremento de stock en una sola transaccion.
-- - Devolucion + restauracion de stock en una sola transaccion.
-- - decrement_product_stock falla si no hay stock suficiente.

CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id text,
  p_lines      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row          record;
  v_line         jsonb;
  v_talla        text;
  v_cantidad     integer;
  v_available    integer;
  v_talla_stock  jsonb;
  v_new_stock    integer;
  v_new_tallas   jsonb;
BEGIN
  SELECT stock, "tallaStock"
  INTO v_row
  FROM productos
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found: %', p_product_id;
  END IF;

  v_talla_stock := COALESCE(v_row."tallaStock", '{}'::jsonb);
  v_new_stock := COALESCE(v_row.stock, 0);

  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_lines, '[]'::jsonb))
  LOOP
    v_talla := NULLIF(v_line->>'talla', '');
    v_cantidad := COALESCE((v_line->>'cantidad')::integer, 0);

    IF v_cantidad <= 0 THEN
      RAISE EXCEPTION 'invalid_sale_quantity';
    END IF;

    IF v_new_stock < v_cantidad THEN
      RAISE EXCEPTION 'insufficient_stock: product %, requested %, available %',
        p_product_id, v_cantidad, v_new_stock;
    END IF;

    IF v_talla IS NOT NULL THEN
      v_available := COALESCE((v_talla_stock->>v_talla)::integer, 0);
      IF v_available < v_cantidad THEN
        RAISE EXCEPTION 'insufficient_size_stock: product %, size %, requested %, available %',
          p_product_id, v_talla, v_cantidad, v_available;
      END IF;

      v_talla_stock := jsonb_set(
        v_talla_stock,
        ARRAY[v_talla],
        to_jsonb(v_available - v_cantidad),
        true
      );
    END IF;

    v_new_stock := v_new_stock - v_cantidad;
  END LOOP;

  SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]'::jsonb)
  INTO v_new_tallas
  FROM jsonb_each(v_talla_stock)
  WHERE (value::text)::integer > 0;

  UPDATE productos
  SET
    stock = v_new_stock,
    "tallaStock" = v_talla_stock,
    tallas = v_new_tallas
  WHERE id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION decrement_product_stock(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrement_product_stock(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION decrement_product_stock(text, jsonb) TO authenticated;

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
      "documentoTipo", "documentoNumero", cliente, canal, "creadoEn"
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

CREATE OR REPLACE FUNCTION return_daily_sale_atomic(
  p_sale_id text,
  p_motivo  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale record;
  v_talla_stock jsonb;
  v_new_tallas jsonb;
  v_now text := now()::text;
BEGIN
  SELECT *
  INTO v_sale
  FROM "ventasDiarias"
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sale_not_found: %', p_sale_id;
  END IF;

  IF COALESCE(v_sale.devuelto, false) THEN
    RAISE EXCEPTION 'sale_already_returned: %', p_sale_id;
  END IF;

  SELECT COALESCE("tallaStock", '{}'::jsonb)
  INTO v_talla_stock
  FROM productos
  WHERE id = v_sale."productId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found: %', v_sale."productId";
  END IF;

  IF v_sale.talla IS NOT NULL AND v_sale.talla <> '' THEN
    v_talla_stock := jsonb_set(
      v_talla_stock,
      ARRAY[v_sale.talla],
      to_jsonb(COALESCE((v_talla_stock->>v_sale.talla)::integer, 0) + v_sale.cantidad),
      true
    );
  END IF;

  SELECT COALESCE(jsonb_agg(key ORDER BY key), '[]'::jsonb)
  INTO v_new_tallas
  FROM jsonb_each(v_talla_stock)
  WHERE (value::text)::integer > 0;

  UPDATE productos
  SET
    stock = COALESCE(stock, 0) + v_sale.cantidad,
    "tallaStock" = v_talla_stock,
    tallas = v_new_tallas
  WHERE id = v_sale."productId";

  UPDATE "ventasDiarias"
  SET
    devuelto = true,
    "motivoDevolucion" = p_motivo,
    "devueltoEn" = v_now
  WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'id', p_sale_id,
    'productId', v_sale."productId",
    'devuelto', true,
    'motivoDevolucion', p_motivo,
    'devueltoEn', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION return_daily_sale_atomic(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION return_daily_sale_atomic(text, text) TO anon;
GRANT EXECUTE ON FUNCTION return_daily_sale_atomic(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
