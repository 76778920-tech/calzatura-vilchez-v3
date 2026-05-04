-- Edita un producto, su código y sus finanzas en una sola transacción.
-- Si cualquier operación falla (constraint, trigger, unicidad) todo se revierte,
-- eliminando el riesgo de estados parciales entre las tres tablas.
--
-- Parámetros:
--   p_id     text   — UUID del producto a actualizar
--   product  jsonb  — campos de la tabla productos
--   codigo   text   — código de catálogo (upsert en productoCodigos)
--   finanzas jsonb  — { costoCompra, margenMinimo, margenObjetivo, margenMaximo,
--                       precioMinimo, precioSugerido, precioMaximo }

CREATE OR REPLACE FUNCTION update_product_atomic(
  p_id     text,
  product  jsonb,
  codigo   text,
  finanzas jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE productos SET
    nombre        = product->>'nombre',
    precio        = (product->>'precio')::numeric,
    descripcion   = coalesce(product->>'descripcion', ''),
    imagen        = coalesce(product->>'imagen', ''),
    imagenes      = coalesce(product->'imagenes', '[]'::jsonb),
    stock         = (product->>'stock')::integer,
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
    descuento     = CASE WHEN product->>'descuento' IS NULL THEN NULL
                         ELSE (product->>'descuento')::integer END
  WHERE id = p_id;

  INSERT INTO "productoCodigos" ("productoId", codigo, "actualizadoEn")
  VALUES (p_id, codigo, now()::text)
  ON CONFLICT ("productoId")
  DO UPDATE SET
    codigo        = EXCLUDED.codigo,
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
END;
$$;

-- Solo usuarios autenticados (rol admin en la app) pueden editar productos.
GRANT EXECUTE ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) TO authenticated;
