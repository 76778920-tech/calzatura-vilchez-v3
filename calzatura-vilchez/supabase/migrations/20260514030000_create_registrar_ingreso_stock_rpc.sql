-- RPC para registrar un ingreso de mercancía sobre un producto existente.
-- Suma las nuevas cantidades al tallaStock actual, actualiza stock total
-- y tallas disponibles, e inserta el movimiento en movimientosStock.
-- Todo en una sola transacción atómica.

CREATE OR REPLACE FUNCTION registrar_ingreso_stock(
  p_product_id     TEXT,
  p_talla_stock    JSONB,       -- unidades que llegan por talla: { "37": 3, "38": 6 }
  p_costo_unitario NUMERIC      DEFAULT NULL,
  p_proveedor      TEXT         DEFAULT NULL,
  p_observaciones  TEXT         DEFAULT NULL,
  p_registrado_por TEXT         DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_current  JSONB;
  v_merged   JSONB;
  v_cantidad INTEGER := 0;
  v_key      TEXT;
  v_added    INTEGER;
BEGIN
  -- Obtener tallaStock actual del producto
  SELECT "tallaStock" INTO v_current
  FROM productos
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado: %', p_product_id;
  END IF;

  v_merged := coalesce(v_current, '{}');

  -- Sumar las cantidades nuevas talla a talla
  FOR v_key, v_added IN
    SELECT key, (value::text)::integer
    FROM jsonb_each(p_talla_stock)
    WHERE (value::text)::integer > 0
  LOOP
    v_cantidad := v_cantidad + v_added;
    v_merged   := jsonb_set(
      v_merged,
      ARRAY[v_key],
      to_jsonb(coalesce((v_merged->>v_key)::integer, 0) + v_added)
    );
  END LOOP;

  IF v_cantidad = 0 THEN
    RAISE EXCEPTION 'El ingreso debe tener al menos 1 unidad';
  END IF;

  -- Actualizar producto: tallaStock, stock total y lista de tallas disponibles
  UPDATE productos
  SET
    "tallaStock" = v_merged,
    stock = (
      SELECT coalesce(SUM((value::text)::integer), 0)
      FROM jsonb_each(v_merged)
    ),
    tallas = coalesce(
      (SELECT jsonb_agg(key ORDER BY key)
       FROM jsonb_each(v_merged)
       WHERE (value::text)::integer > 0),
      '[]'::jsonb
    )
  WHERE id = p_product_id;

  -- Registrar el movimiento
  INSERT INTO "movimientosStock" (
    "productId", tipo, fecha, "tallaStock", cantidad,
    "costoUnitario", proveedor, observaciones, "registradoPor"
  ) VALUES (
    p_product_id,
    'ingreso',
    CURRENT_DATE,
    p_talla_stock,
    v_cantidad,
    p_costo_unitario,
    p_proveedor,
    p_observaciones,
    p_registrado_por
  );

  RETURN jsonb_build_object(
    'ok',         true,
    'cantidad',   v_cantidad,
    'tallaStock', v_merged
  );
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_ingreso_stock(TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT)
  TO authenticated;
