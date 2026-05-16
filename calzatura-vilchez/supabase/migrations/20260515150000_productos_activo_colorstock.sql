-- Alinea tabla `productos` con el admin y el BFF: `activo` (catálogo) y `colorStock` (JSON por color).
-- El esquema base (20260430130000) no incluía `activo` en productos; las RPC ya lo escribían.
-- `colorStock` no existía: el checkout/BFF lo usaban en memoria pero Supabase no lo persistía.

ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS "colorStock" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Datos existentes: una fila por variante → mapa { color: tallaStock } coherente con `color` + `tallaStock`.
UPDATE productos p
SET "colorStock" = jsonb_build_object(trim(p.color), coalesce(p."tallaStock", '{}'::jsonb))
WHERE trim(coalesce(p.color, '')) <> ''
  AND coalesce(p."tallaStock", '{}'::jsonb) <> '{}'::jsonb
  AND (p."colorStock" IS NULL OR p."colorStock" = '{}'::jsonb);

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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found: %', p_id;
  END IF;

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
    "colorStock"  = CASE
      WHEN product ? 'colorStock' THEN coalesce(product->'colorStock', '{}'::jsonb)
      ELSE productos."colorStock"
    END,
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
  IF v_delta > 0 AND to_regclass('public."movimientosStock"') IS NOT NULL THEN
    EXECUTE '
      INSERT INTO "movimientosStock" (
        "productId", tipo, fecha, "tallaStock", cantidad, observaciones
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)
    '
    USING p_id, 'ajuste', coalesce(product->'tallaStock', '{}'::jsonb), v_delta,
      'Ajuste manual desde edicion de producto';
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
      stock, categoria, "tipoCalzado", tallas, "tallaStock", "colorStock",
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
      coalesce(v->'colorStock', '{}'::jsonb),
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

    IF v_stock > 0 AND to_regclass('public."movimientosStock"') IS NOT NULL THEN
      EXECUTE '
        INSERT INTO "movimientosStock" (
          "productId", tipo, fecha, "tallaStock", cantidad,
          "costoUnitario", observaciones
        ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6)
      '
      USING pid, 'ingreso', coalesce(v->'tallaStock', '{}'::jsonb), v_stock,
        (v->'finanzas'->>'costoCompra')::numeric, 'Stock inicial al registrar producto';
    END IF;

    ids := ids || pid;
  END LOOP;

  RETURN jsonb_build_object('ids', to_jsonb(ids));
END;
$$;

REVOKE ALL ON FUNCTION create_product_variants_atomic(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_product_variants_atomic(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION create_product_variants_atomic(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
