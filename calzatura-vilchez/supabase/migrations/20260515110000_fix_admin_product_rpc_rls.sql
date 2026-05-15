-- Fix admin product RPCs when RLS is enabled on product metadata tables.
--
-- The web app uses the Supabase anon key and authorizes admins in Firebase/app
-- code. These RPCs must therefore run as their owner to keep the multi-table
-- product writes atomic when RLS is enabled on productoCodigos/productoFinanzas/
-- movimientosStock.

CREATE OR REPLACE FUNCTION update_product_atomic(
  p_id     text,
  product  jsonb,
  codigo   text,
  finanzas jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_stock integer;
  v_new_stock integer;
  v_delta     integer;
BEGIN
  SELECT stock INTO v_old_stock
  FROM productos
  WHERE id = p_id
  FOR UPDATE;

  v_new_stock := coalesce((product->>'stock')::integer, 0);

  UPDATE productos SET
    nombre        = product->>'nombre',
    precio        = (product->>'precio')::numeric,
    descripcion   = coalesce(product->>'descripcion', ''),
    imagen        = coalesce(product->>'imagen', ''),
    imagenes      = coalesce(product->'imagenes', '[]'::jsonb),
    stock         = v_new_stock,
    categoria     = product->>'categoria',
    "tipoCalzado" = product->>'tipoCalzado',
    tallas        = coalesce(product->'tallas', '[]'::jsonb),
    "tallaStock"  = coalesce(product->'tallaStock', '{}'::jsonb),
    marca         = product->>'marca',
    material      = product->>'material',
    estilo        = product->>'estilo',
    color         = product->>'color',
    "familiaId"   = product->>'familiaId',
    destacado     = coalesce((product->>'destacado')::boolean, false),
    activo        = coalesce((product->>'activo')::boolean, true),
    descuento     = CASE WHEN product->>'descuento' IS NULL THEN NULL
                         ELSE (product->>'descuento')::integer END,
    campana       = product->>'campana'
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found: %', p_id;
  END IF;

  INSERT INTO "productoCodigos" ("productoId", codigo, "actualizadoEn")
  VALUES (p_id, codigo, now()::text)
  ON CONFLICT ("productoId")
  DO UPDATE SET
    codigo          = EXCLUDED.codigo,
    "actualizadoEn" = EXCLUDED."actualizadoEn";

  INSERT INTO "productoFinanzas" (
    "productId",
    "costoCompra", "margenMinimo", "margenObjetivo", "margenMaximo",
    "precioMinimo", "precioSugerido", "precioMaximo",
    "actualizadoEn"
  ) VALUES (
    p_id,
    (finanzas->>'costoCompra')::numeric,
    (finanzas->>'margenMinimo')::numeric,
    (finanzas->>'margenObjetivo')::numeric,
    (finanzas->>'margenMaximo')::numeric,
    (finanzas->>'precioMinimo')::numeric,
    (finanzas->>'precioSugerido')::numeric,
    (finanzas->>'precioMaximo')::numeric,
    now()::text
  )
  ON CONFLICT ("productId")
  DO UPDATE SET
    "costoCompra"    = EXCLUDED."costoCompra",
    "margenMinimo"   = EXCLUDED."margenMinimo",
    "margenObjetivo" = EXCLUDED."margenObjetivo",
    "margenMaximo"   = EXCLUDED."margenMaximo",
    "precioMinimo"   = EXCLUDED."precioMinimo",
    "precioSugerido" = EXCLUDED."precioSugerido",
    "precioMaximo"   = EXCLUDED."precioMaximo",
    "actualizadoEn"  = EXCLUDED."actualizadoEn";

  v_delta := v_new_stock - coalesce(v_old_stock, 0);
  IF v_delta > 0 THEN
    INSERT INTO "movimientosStock" (
      "productId", tipo, fecha, "tallaStock", cantidad, observaciones
    ) VALUES (
      p_id,
      'ajuste',
      CURRENT_DATE,
      coalesce(product->'tallaStock', '{}'::jsonb),
      v_delta,
      'Ajuste manual desde edicion de producto'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION create_product_variants_atomic(variants jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v       jsonb;
  pid     text;
  ids     text[] := '{}';
  v_stock integer;
BEGIN
  FOR v IN SELECT * FROM jsonb_array_elements(variants)
  LOOP
    pid     := gen_random_uuid()::text;
    v_stock := coalesce((v->>'stock')::integer, 0);

    INSERT INTO productos (
      id, nombre, precio, descripcion, imagen, imagenes,
      stock, categoria, "tipoCalzado", tallas, "tallaStock",
      marca, material, estilo, color, "familiaId",
      destacado, activo, descuento, campana
    ) VALUES (
      pid,
      v->>'nombre',
      (v->>'precio')::numeric,
      coalesce(v->>'descripcion', ''),
      coalesce(v->>'imagen', ''),
      coalesce(v->'imagenes', '[]'::jsonb),
      v_stock,
      v->>'categoria',
      v->>'tipoCalzado',
      coalesce(v->'tallas', '[]'::jsonb),
      coalesce(v->'tallaStock', '{}'::jsonb),
      v->>'marca',
      v->>'material',
      v->>'estilo',
      v->>'color',
      v->>'familiaId',
      coalesce((v->>'destacado')::boolean, false),
      coalesce((v->>'activo')::boolean, true),
      CASE WHEN v->>'descuento' IS NULL THEN NULL
           ELSE (v->>'descuento')::integer END,
      v->>'campana'
    );

    INSERT INTO "productoCodigos" ("productoId", codigo, "actualizadoEn")
    VALUES (pid, v->>'codigo', now()::text);

    INSERT INTO "productoFinanzas" (
      "productId",
      "costoCompra", "margenMinimo", "margenObjetivo", "margenMaximo",
      "precioMinimo", "precioSugerido", "precioMaximo",
      "actualizadoEn"
    ) VALUES (
      pid,
      (v->'finanzas'->>'costoCompra')::numeric,
      (v->'finanzas'->>'margenMinimo')::numeric,
      (v->'finanzas'->>'margenObjetivo')::numeric,
      (v->'finanzas'->>'margenMaximo')::numeric,
      (v->'finanzas'->>'precioMinimo')::numeric,
      (v->'finanzas'->>'precioSugerido')::numeric,
      (v->'finanzas'->>'precioMaximo')::numeric,
      now()::text
    );

    IF v_stock > 0 THEN
      INSERT INTO "movimientosStock" (
        "productId", tipo, fecha, "tallaStock", cantidad,
        "costoUnitario", observaciones
      ) VALUES (
        pid,
        'ingreso',
        CURRENT_DATE,
        coalesce(v->'tallaStock', '{}'::jsonb),
        v_stock,
        (v->'finanzas'->>'costoCompra')::numeric,
        'Stock inicial al registrar producto'
      );
    END IF;

    ids := ids || pid;
  END LOOP;

  RETURN jsonb_build_object('ids', to_jsonb(ids));
END;
$$;

REVOKE ALL ON FUNCTION create_product_variants_atomic(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_product_variants_atomic(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION create_product_variants_atomic(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION registrar_ingreso_stock(
  p_product_id     text,
  p_talla_stock    jsonb,
  p_costo_unitario numeric DEFAULT NULL,
  p_proveedor      text    DEFAULT NULL,
  p_observaciones  text    DEFAULT NULL,
  p_registrado_por text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current  jsonb;
  v_merged   jsonb;
  v_cantidad integer := 0;
  v_key      text;
  v_added    integer;
BEGIN
  SELECT "tallaStock" INTO v_current
  FROM productos
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado: %', p_product_id;
  END IF;

  v_merged := coalesce(v_current, '{}');

  FOR v_key, v_added IN
    SELECT key, (value::text)::integer
    FROM jsonb_each(p_talla_stock)
    WHERE (value::text)::integer > 0
  LOOP
    v_cantidad := v_cantidad + v_added;
    v_merged := jsonb_set(
      v_merged,
      ARRAY[v_key],
      to_jsonb(coalesce((v_merged->>v_key)::integer, 0) + v_added)
    );
  END LOOP;

  IF v_cantidad = 0 THEN
    RAISE EXCEPTION 'El ingreso debe tener al menos 1 unidad';
  END IF;

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
    'ok', true,
    'cantidad', v_cantidad,
    'tallaStock', v_merged
  );
END;
$$;

REVOKE ALL ON FUNCTION registrar_ingreso_stock(text, jsonb, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_ingreso_stock(text, jsonb, numeric, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION registrar_ingreso_stock(text, jsonb, numeric, text, text, text) TO authenticated;
