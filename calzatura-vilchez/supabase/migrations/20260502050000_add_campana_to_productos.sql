-- Agrega columna campana (campaña) a productos para trazabilidad de performance.
-- Valores posibles: outlet | cyber-wow | club-calzado | nueva-temporada | lanzamiento | null

ALTER TABLE productos ADD COLUMN IF NOT EXISTS campana text;

-- ─── Reemplaza create_product_variants_atomic con soporte a campana ────────────

CREATE OR REPLACE FUNCTION create_product_variants_atomic(variants jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v        jsonb;
  pid      text;
  ids      text[] := '{}';
BEGIN
  FOR v IN SELECT * FROM jsonb_array_elements(variants)
  LOOP
    pid := gen_random_uuid()::text;

    INSERT INTO productos (
      id, nombre, precio, descripcion, imagen, imagenes,
      stock, categoria, "tipoCalzado", tallas, "tallaStock",
      marca, material, estilo, color, "familiaId",
      destacado, descuento, campana
    ) VALUES (
      pid,
      v->>'nombre',
      (v->>'precio')::numeric,
      coalesce(v->>'descripcion', ''),
      coalesce(v->>'imagen', ''),
      coalesce(v->'imagenes', '[]'::jsonb),
      coalesce((v->>'stock')::integer, 0),
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

    ids := ids || pid;
  END LOOP;

  RETURN jsonb_build_object('ids', to_jsonb(ids));
END;
$$;

GRANT EXECUTE ON FUNCTION create_product_variants_atomic(jsonb) TO authenticated;

-- ─── Reemplaza update_product_atomic con soporte a campana ───────────────────

CREATE OR REPLACE FUNCTION update_product_atomic(
  p_id text, product jsonb, codigo text, finanzas jsonb
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE productos SET
    nombre          = product->>'nombre',
    precio          = (product->>'precio')::numeric,
    descripcion     = coalesce(product->>'descripcion', ''),
    imagen          = coalesce(product->>'imagen', ''),
    imagenes        = coalesce(product->'imagenes', '[]'::jsonb),
    stock           = (product->>'stock')::integer,
    categoria       = product->>'categoria',
    "tipoCalzado"   = product->>'tipoCalzado',
    tallas          = coalesce(product->'tallas', '[]'::jsonb),
    "tallaStock"    = coalesce(product->'tallaStock', '{}'::jsonb),
    marca           = product->>'marca',
    material        = product->>'material',
    estilo          = product->>'estilo',
    color           = product->>'color',
    "familiaId"     = product->>'familiaId',
    destacado       = coalesce((product->>'destacado')::boolean, false),
    descuento       = CASE WHEN product->>'descuento' IS NULL THEN NULL
                          ELSE (product->>'descuento')::integer END,
    campana         = product->>'campana'
  WHERE id = p_id;

  INSERT INTO "productoCodigos" ("productoId", codigo, "actualizadoEn")
  VALUES (p_id, codigo, now()::text)
  ON CONFLICT ("productoId") DO UPDATE SET
    codigo        = EXCLUDED.codigo,
    "actualizadoEn" = EXCLUDED."actualizadoEn";

  INSERT INTO "productoFinanzas" (
    "productId", "costoCompra", "margenMinimo", "margenObjetivo",
    "margenMaximo", "precioMinimo", "precioSugerido", "precioMaximo", "actualizadoEn"
  )
  VALUES (
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
  ON CONFLICT ("productId") DO UPDATE SET
    "costoCompra"    = EXCLUDED."costoCompra",
    "margenMinimo"   = EXCLUDED."margenMinimo",
    "margenObjetivo" = EXCLUDED."margenObjetivo",
    "margenMaximo"   = EXCLUDED."margenMaximo",
    "precioMinimo"   = EXCLUDED."precioMinimo",
    "precioSugerido" = EXCLUDED."precioSugerido",
    "precioMaximo"   = EXCLUDED."precioMaximo",
    "actualizadoEn"  = EXCLUDED."actualizadoEn";
END;
$$;

GRANT EXECUTE ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) TO authenticated;
