-- Restaura inventario al cancelar pedidos que ya descontaron stock (espejo de decrement_order_stock).

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS "stockRestauradoEn" text;

CREATE OR REPLACE FUNCTION cv_find_color_key_for_restore(
  color_stock jsonb,
  p_talla text,
  p_color text,
  p_product_color text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ck text;
  row jsonb;
BEGIN
  ck := cv_resolve_color_bucket(
    color_stock,
    p_talla,
    1,
    COALESCE(p_color, ''),
    COALESCE(p_product_color, '')
  );
  IF ck IS NOT NULL THEN
    RETURN ck;
  END IF;

  ck := cv_jsonb_find_color_key(color_stock, COALESCE(p_color, ''));
  IF ck IS NOT NULL AND cv_jsonb_find_talla_key(color_stock -> ck, p_talla) IS NOT NULL THEN
    RETURN ck;
  END IF;

  IF p_product_color IS NOT NULL AND cv_norm_label(p_product_color) <> cv_norm_label(COALESCE(p_color, '')) THEN
    ck := cv_jsonb_find_color_key(color_stock, p_product_color);
    IF ck IS NOT NULL AND cv_jsonb_find_talla_key(color_stock -> ck, p_talla) IS NOT NULL THEN
      RETURN ck;
    END IF;
  END IF;

  FOR ck IN SELECT jsonb_object_keys(color_stock) LOOP
    row := color_stock -> ck;
    IF cv_jsonb_find_talla_key(row, p_talla) IS NOT NULL THEN
      RETURN ck;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION restore_order_line_stock(
  p_product_id text,
  p_talla text DEFAULT NULL,
  p_color text DEFAULT NULL,
  p_cantidad integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_talla text := NULLIF(trim(COALESCE(p_talla, '')), '');
  v_color text := NULLIF(trim(COALESCE(p_color, '')), '');
  v_qty integer := COALESCE(p_cantidad, 0);
  v_cs jsonb;
  v_ts jsonb;
  v_color_key text;
  v_color_row jsonb;
  v_talla_key text;
  v_current integer;
  v_new_cs jsonb;
  v_new_ts jsonb;
  v_agg jsonb;
BEGIN
  IF v_qty <= 0 OR v_qty > 100 THEN
    RAISE EXCEPTION 'invalid_order_quantity';
  END IF;

  SELECT id, stock, "tallaStock", "colorStock", color
  INTO v_row
  FROM productos
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found: %', p_product_id;
  END IF;

  v_cs := cv_effective_color_stock(v_row."colorStock");
  v_ts := cv_effective_talla_stock(v_row."tallaStock");

  IF v_cs IS NOT NULL AND v_talla IS NOT NULL THEN
    v_color_key := cv_find_color_key_for_restore(v_cs, v_talla, v_color, v_row.color);
    IF v_color_key IS NULL THEN
      RAISE EXCEPTION 'no_color_stock_restore: product %, size %', p_product_id, v_talla;
    END IF;

    v_color_row := v_cs -> v_color_key;
    v_talla_key := cv_jsonb_find_talla_key(v_color_row, v_talla);
    IF v_talla_key IS NULL THEN
      v_talla_key := v_talla;
    END IF;

    v_current := cv_jsonb_cell_qty(v_color_row -> v_talla_key);
    v_new_cs := jsonb_set(
      v_cs,
      ARRAY[v_color_key, v_talla_key],
      to_jsonb(v_current + v_qty),
      true
    );
    v_agg := cv_aggregate_color_stock(v_new_cs);

    UPDATE productos
    SET
      "colorStock" = v_new_cs,
      stock = GREATEST(cv_sum_color_size_stock(v_new_cs), COALESCE(stock, 0)),
      tallas = cv_tallas_from_size_map(v_agg)
    WHERE id = p_product_id;

    RETURN;
  END IF;

  IF v_ts IS NOT NULL AND v_talla IS NOT NULL THEN
    v_talla_key := cv_jsonb_find_talla_key(v_ts, v_talla);
    IF v_talla_key IS NULL THEN
      v_talla_key := v_talla;
    END IF;

    v_current := cv_jsonb_cell_qty(v_ts -> v_talla_key);
    v_new_ts := jsonb_set(
      v_ts,
      ARRAY[v_talla_key],
      to_jsonb(v_current + v_qty),
      true
    );

    UPDATE productos
    SET
      "tallaStock" = v_new_ts,
      stock = GREATEST(cv_sum_size_stock(v_new_ts), COALESCE(stock, 0)),
      tallas = cv_tallas_from_size_map(v_new_ts)
    WHERE id = p_product_id;

    RETURN;
  END IF;

  UPDATE productos
  SET stock = COALESCE(stock, 0) + v_qty
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION restore_order_stock(p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_product_id text;
  v_talla text;
  v_color text;
  v_qty integer;
BEGIN
  IF jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array' OR jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'order_items_empty';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(trim(v_item->>'productId'), '');
    v_talla := NULLIF(trim(v_item->>'talla'), '');
    v_color := NULLIF(trim(v_item->>'color'), '');
    v_qty := COALESCE((v_item->>'cantidad')::integer, (v_item->>'quantity')::integer, 0);

    IF v_product_id IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid_order_item';
    END IF;

    PERFORM restore_order_line_stock(v_product_id, v_talla, v_color, v_qty);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION restore_order_line_stock(text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION restore_order_stock(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION restore_order_line_stock(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION restore_order_stock(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
