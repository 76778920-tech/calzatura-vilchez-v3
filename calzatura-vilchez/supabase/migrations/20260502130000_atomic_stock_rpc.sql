-- RPC atómicos para decrementar y restaurar stock de producto.
-- Usan FOR UPDATE para evitar race conditions cuando dos sesiones
-- modifican el mismo producto simultáneamente (oversell / sub-restore).

-- ─── decrement_product_stock ─────────────────────────────────────────────────
-- p_lines: [{talla: text|null, cantidad: int}, ...]
-- Descuenta stock y tallaStock para cada línea de venta.
CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id text,
  p_lines       jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row          record;
  v_line         jsonb;
  v_talla        text;
  v_cantidad     integer;
  v_talla_stock  jsonb;
  v_new_stock    integer;
  v_new_tallas   text[];
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
  v_new_stock   := v_row.stock;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_talla    := v_line->>'talla';
    v_cantidad := (v_line->>'cantidad')::integer;

    v_new_stock := GREATEST(0, v_new_stock - v_cantidad);

    IF v_talla IS NOT NULL AND v_talla <> '' THEN
      v_talla_stock := jsonb_set(
        v_talla_stock,
        ARRAY[v_talla],
        to_jsonb(GREATEST(
          0,
          COALESCE((v_talla_stock->>v_talla)::integer, 0) - v_cantidad
        ))
      );
    END IF;
  END LOOP;

  SELECT array_agg(key ORDER BY key::numeric)
  INTO v_new_tallas
  FROM jsonb_each(v_talla_stock)
  WHERE value::text::integer > 0;

  UPDATE productos SET
    stock        = v_new_stock,
    "tallaStock" = v_talla_stock,
    tallas       = COALESCE(v_new_tallas, '{}')
  WHERE id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION decrement_product_stock(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decrement_product_stock(text, jsonb) TO authenticated;


-- ─── restore_product_stock ───────────────────────────────────────────────────
-- Restaura stock de una sola talla (devolución individual de venta).
CREATE OR REPLACE FUNCTION restore_product_stock(
  p_product_id text,
  p_talla      text,
  p_cantidad   integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row         record;
  v_talla_stock jsonb;
  v_new_tallas  text[];
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

  IF p_talla IS NOT NULL AND p_talla <> '' THEN
    v_talla_stock := jsonb_set(
      v_talla_stock,
      ARRAY[p_talla],
      to_jsonb(COALESCE((v_talla_stock->>p_talla)::integer, 0) + p_cantidad)
    );
  END IF;

  SELECT array_agg(key ORDER BY key::numeric)
  INTO v_new_tallas
  FROM jsonb_each(v_talla_stock)
  WHERE value::text::integer > 0;

  UPDATE productos SET
    stock        = v_row.stock + p_cantidad,
    "tallaStock" = v_talla_stock,
    tallas       = COALESCE(v_new_tallas, '{}')
  WHERE id = p_product_id;
END;
$$;

REVOKE ALL ON FUNCTION restore_product_stock(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION restore_product_stock(text, text, integer) TO authenticated;
