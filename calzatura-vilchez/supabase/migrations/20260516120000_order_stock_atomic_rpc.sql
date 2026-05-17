-- Stock atómico para pedidos (checkout / Stripe / contraentrega).
-- Sustituye read-modify-write en JS por FOR UPDATE + validación de stock (incluye colorStock).

CREATE OR REPLACE FUNCTION cv_norm_label(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(COALESCE(p, '')));
$$;

CREATE OR REPLACE FUNCTION cv_jsonb_cell_qty(val jsonb)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF val IS NULL OR jsonb_typeof(val) = 'null' THEN
    RETURN 0;
  END IF;
  IF jsonb_typeof(val) = 'number' THEN
    RETURN GREATEST(0, (val #>> '{}')::numeric::integer);
  END IF;
  IF jsonb_typeof(val) = 'string' THEN
    BEGIN
      RETURN GREATEST(0, trim(both '"' from val::text)::integer);
    EXCEPTION WHEN OTHERS THEN
      RETURN 0;
    END;
  END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION cv_jsonb_find_talla_key(p_size_map jsonb, p_talla text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k text;
  want text := trim(COALESCE(p_talla, ''));
BEGIN
  IF p_size_map IS NULL OR jsonb_typeof(p_size_map) <> 'object' OR want = '' THEN
    RETURN NULL;
  END IF;
  IF p_size_map ? want THEN
    RETURN want;
  END IF;
  FOR k IN SELECT jsonb_object_keys(p_size_map) LOOP
    IF trim(k) = want THEN
      RETURN k;
    END IF;
    IF want ~ '^\d+(\.\d+)?$' AND k ~ '^\d+(\.\d+)?$' AND k::numeric = want::numeric THEN
      RETURN k;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION cv_jsonb_find_color_key(color_stock jsonb, p_color text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k text;
  want text := cv_norm_label(p_color);
BEGIN
  IF color_stock IS NULL OR jsonb_typeof(color_stock) <> 'object' OR want = '' THEN
    RETURN NULL;
  END IF;
  FOR k IN SELECT jsonb_object_keys(color_stock) LOOP
    IF cv_norm_label(k) = want THEN
      RETURN k;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION cv_effective_color_stock(raw jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k text;
  row jsonb;
BEGIN
  IF raw IS NULL OR jsonb_typeof(raw) <> 'object' THEN
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_object_keys(raw)) THEN
    RETURN NULL;
  END IF;
  FOR k IN SELECT jsonb_object_keys(raw) LOOP
    row := raw -> k;
    IF row IS NOT NULL AND jsonb_typeof(row) = 'object'
       AND EXISTS (SELECT 1 FROM jsonb_object_keys(row)) THEN
      RETURN raw;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION cv_effective_talla_stock(raw jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF raw IS NULL OR jsonb_typeof(raw) <> 'object' THEN
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_object_keys(raw)) THEN
    RETURN NULL;
  END IF;
  RETURN raw;
END;
$$;

CREATE OR REPLACE FUNCTION cv_sum_size_stock(stock_by_size jsonb)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k text;
  total integer := 0;
BEGIN
  IF stock_by_size IS NULL OR jsonb_typeof(stock_by_size) <> 'object' THEN
    RETURN 0;
  END IF;
  FOR k IN SELECT jsonb_object_keys(stock_by_size) LOOP
    total := total + cv_jsonb_cell_qty(stock_by_size -> k);
  END LOOP;
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION cv_sum_color_size_stock(color_stock jsonb)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ck text;
  total integer := 0;
BEGIN
  IF color_stock IS NULL OR jsonb_typeof(color_stock) <> 'object' THEN
    RETURN 0;
  END IF;
  FOR ck IN SELECT jsonb_object_keys(color_stock) LOOP
    total := total + cv_sum_size_stock(color_stock -> ck);
  END LOOP;
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION cv_tallas_from_size_map(stock_by_size jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k text;
  tallas jsonb := '[]'::jsonb;
BEGIN
  IF stock_by_size IS NULL OR jsonb_typeof(stock_by_size) <> 'object' THEN
    RETURN '[]'::jsonb;
  END IF;
  FOR k IN
    SELECT key
    FROM jsonb_each(stock_by_size)
    WHERE cv_jsonb_cell_qty(value) > 0
    ORDER BY key
  LOOP
    tallas := tallas || to_jsonb(k);
  END LOOP;
  RETURN tallas;
END;
$$;

CREATE OR REPLACE FUNCTION cv_aggregate_color_stock(color_stock jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ck text;
  tk text;
  agg jsonb := '{}'::jsonb;
  row jsonb;
  prev integer;
BEGIN
  IF color_stock IS NULL OR jsonb_typeof(color_stock) <> 'object' THEN
    RETURN '{}'::jsonb;
  END IF;
  FOR ck IN SELECT jsonb_object_keys(color_stock) LOOP
    row := color_stock -> ck;
    IF row IS NULL OR jsonb_typeof(row) <> 'object' THEN
      CONTINUE;
    END IF;
    FOR tk IN SELECT jsonb_object_keys(row) LOOP
      prev := cv_jsonb_cell_qty(agg -> tk);
      agg := jsonb_set(
        agg,
        ARRAY[tk],
        to_jsonb(prev + cv_jsonb_cell_qty(row -> tk)),
        true
      );
    END LOOP;
  END LOOP;
  RETURN agg;
END;
$$;

CREATE OR REPLACE FUNCTION cv_derive_total_stock(p_stock integer, p_talla_stock jsonb, p_color_stock jsonb)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  col integer := GREATEST(0, COALESCE(p_stock, 0));
  cs jsonb;
  ts jsonb;
BEGIN
  cs := cv_effective_color_stock(p_color_stock);
  IF cs IS NOT NULL THEN
    RETURN GREATEST(cv_sum_color_size_stock(cs), col);
  END IF;
  ts := cv_effective_talla_stock(p_talla_stock);
  IF ts IS NOT NULL THEN
    RETURN GREATEST(cv_sum_size_stock(ts), col);
  END IF;
  RETURN col;
END;
$$;

CREATE OR REPLACE FUNCTION cv_size_stock_available(
  p_stock integer,
  p_talla_stock jsonb,
  p_color_stock jsonb,
  p_product_color text,
  p_talla text,
  p_color text
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text := trim(COALESCE(p_talla, ''));
  c text := trim(COALESCE(p_color, ''));
  cs jsonb;
  ts jsonb;
  ck text;
  row jsonb;
  tk text;
  sum_all integer := 0;
  key_count integer := 0;
BEGIN
  cs := cv_effective_color_stock(p_color_stock);
  IF cs IS NOT NULL AND t <> '' THEN
    IF c <> '' THEN
      ck := cv_jsonb_find_color_key(cs, c);
      IF ck IS NULL AND p_product_color IS NOT NULL AND cv_norm_label(p_product_color) <> cv_norm_label(c) THEN
        ck := cv_jsonb_find_color_key(cs, p_product_color);
      END IF;
      SELECT count(*)::integer INTO key_count FROM jsonb_object_keys(cs);
      IF ck IS NULL AND key_count = 1 THEN
        ck := (SELECT jsonb_object_keys(cs) LIMIT 1);
      END IF;
      IF ck IS NOT NULL THEN
        row := cs -> ck;
        tk := cv_jsonb_find_talla_key(row, t);
        IF tk IS NOT NULL THEN
          RETURN cv_jsonb_cell_qty(row -> tk);
        END IF;
        RETURN cv_derive_total_stock(p_stock, p_talla_stock, p_color_stock);
      END IF;
      IF key_count > 1 THEN
        RETURN 0;
      END IF;
    ELSE
      FOR ck IN SELECT jsonb_object_keys(cs) LOOP
        tk := cv_jsonb_find_talla_key(cs -> ck, t);
        IF tk IS NOT NULL THEN
          sum_all := sum_all + cv_jsonb_cell_qty((cs -> ck) -> tk);
        END IF;
      END LOOP;
      RETURN sum_all;
    END IF;
  END IF;

  ts := cv_effective_talla_stock(p_talla_stock);
  IF t <> '' AND ts IS NOT NULL THEN
    tk := cv_jsonb_find_talla_key(ts, t);
    IF tk IS NOT NULL THEN
      RETURN cv_jsonb_cell_qty(ts -> tk);
    END IF;
    RETURN 0;
  END IF;

  RETURN cv_derive_total_stock(p_stock, p_talla_stock, p_color_stock);
END;
$$;

CREATE OR REPLACE FUNCTION cv_resolve_color_bucket(
  color_stock jsonb,
  p_talla text,
  p_quantity integer,
  p_preferred_color text,
  p_fallback_color text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text := trim(COALESCE(p_talla, ''));
  pref text := trim(COALESCE(p_preferred_color, ''));
  fb text := trim(COALESCE(p_fallback_color, ''));
  ck text;
  row jsonb;
  tk text;
  keys text[];
BEGIN
  IF color_stock IS NULL OR jsonb_typeof(color_stock) <> 'object' OR t = '' OR p_quantity <= 0 THEN
    RETURN NULL;
  END IF;

  IF pref <> '' THEN
    ck := cv_jsonb_find_color_key(color_stock, pref);
    keys := ARRAY(SELECT jsonb_object_keys(color_stock));
    IF ck IS NULL AND array_length(keys, 1) = 1 THEN
      ck := keys[1];
    END IF;
    IF ck IS NOT NULL THEN
      row := color_stock -> ck;
      tk := cv_jsonb_find_talla_key(row, t);
      IF tk IS NOT NULL AND cv_jsonb_cell_qty(row -> tk) >= p_quantity THEN
        RETURN ck;
      END IF;
    END IF;
    IF fb <> '' AND cv_norm_label(fb) <> cv_norm_label(pref) THEN
      ck := cv_jsonb_find_color_key(color_stock, fb);
      keys := ARRAY(SELECT jsonb_object_keys(color_stock));
      IF ck IS NULL AND array_length(keys, 1) = 1 THEN
        ck := keys[1];
      END IF;
      IF ck IS NOT NULL THEN
        row := color_stock -> ck;
        tk := cv_jsonb_find_talla_key(row, t);
        IF tk IS NOT NULL AND cv_jsonb_cell_qty(row -> tk) >= p_quantity THEN
          RETURN ck;
        END IF;
      END IF;
    END IF;
  ELSIF fb <> '' THEN
    ck := cv_jsonb_find_color_key(color_stock, fb);
    keys := ARRAY(SELECT jsonb_object_keys(color_stock));
    IF ck IS NULL AND array_length(keys, 1) = 1 THEN
      ck := keys[1];
    END IF;
    IF ck IS NOT NULL THEN
      row := color_stock -> ck;
      tk := cv_jsonb_find_talla_key(row, t);
      IF tk IS NOT NULL AND cv_jsonb_cell_qty(row -> tk) >= p_quantity THEN
        RETURN ck;
      END IF;
    END IF;
  END IF;

  FOR ck IN SELECT jsonb_object_keys(color_stock) LOOP
    row := color_stock -> ck;
    tk := cv_jsonb_find_talla_key(row, t);
    IF tk IS NOT NULL AND cv_jsonb_cell_qty(row -> tk) >= p_quantity THEN
      RETURN ck;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_order_line_stock(
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
  v_total integer;
  v_size integer;
  v_color_key text;
  v_color_row jsonb;
  v_talla_key text;
  v_available integer;
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
  v_total := cv_derive_total_stock(v_row.stock, v_row."tallaStock", v_row."colorStock");
  v_size := cv_size_stock_available(
    v_row.stock, v_row."tallaStock", v_row."colorStock", v_row.color, v_talla, v_color
  );

  IF v_total < v_qty OR v_size < v_qty THEN
    RAISE EXCEPTION 'insufficient_stock: product %, requested %, available_total %, available_size %',
      p_product_id, v_qty, v_total, v_size;
  END IF;

  IF v_cs IS NOT NULL AND v_talla IS NOT NULL THEN
    v_color_key := cv_resolve_color_bucket(v_cs, v_talla, v_qty, COALESCE(v_color, ''), COALESCE(v_row.color, ''));
    IF v_color_key IS NULL THEN
      RAISE EXCEPTION 'no_color_stock: product %, size %', p_product_id, v_talla;
    END IF;

    v_color_row := v_cs -> v_color_key;
    v_talla_key := cv_jsonb_find_talla_key(v_color_row, v_talla);
    IF v_talla_key IS NULL THEN
      RAISE EXCEPTION 'insufficient_size_stock: product %, size %', p_product_id, v_talla;
    END IF;

    v_available := cv_jsonb_cell_qty(v_color_row -> v_talla_key);
    IF v_available < v_qty THEN
      RAISE EXCEPTION 'insufficient_size_stock: product %, size %, requested %, available %',
        p_product_id, v_talla, v_qty, v_available;
    END IF;

    v_new_cs := jsonb_set(
      v_cs,
      ARRAY[v_color_key, v_talla_key],
      to_jsonb(v_available - v_qty),
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
      RAISE EXCEPTION 'insufficient_size_stock: product %, size %', p_product_id, v_talla;
    END IF;

    v_available := cv_jsonb_cell_qty(v_ts -> v_talla_key);
    IF v_available < v_qty THEN
      RAISE EXCEPTION 'insufficient_size_stock: product %, size %, requested %, available %',
        p_product_id, v_talla, v_qty, v_available;
    END IF;

    v_new_ts := jsonb_set(
      v_ts,
      ARRAY[v_talla_key],
      to_jsonb(v_available - v_qty),
      true
    );

    UPDATE productos
    SET
      "tallaStock" = v_new_ts,
      stock = cv_sum_size_stock(v_new_ts),
      tallas = cv_tallas_from_size_map(v_new_ts)
    WHERE id = p_product_id;

    RETURN;
  END IF;

  IF COALESCE(v_row.stock, 0) < v_qty THEN
    RAISE EXCEPTION 'insufficient_stock: product %, requested %, available %',
      p_product_id, v_qty, v_row.stock;
  END IF;

  UPDATE productos
  SET stock = GREATEST(0, COALESCE(stock, 0) - v_qty)
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_order_stock(p_items jsonb)
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

    PERFORM decrement_order_line_stock(v_product_id, v_talla, v_color, v_qty);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION decrement_order_line_stock(text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION decrement_order_stock(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION decrement_order_line_stock(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION decrement_order_stock(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
