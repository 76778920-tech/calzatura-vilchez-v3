-- Actualiza update_product_atomic para registrar un movimiento de 'ajuste'
-- cuando el admin edita el stock directamente (sin usar registrar_ingreso_stock).
-- Solo se inserta movimiento cuando el stock nuevo > stock anterior.

CREATE OR REPLACE FUNCTION update_product_atomic(
  p_id     text,
  product  jsonb,
  codigo   text,
  finanzas jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_stock  INTEGER;
  v_new_stock  INTEGER;
  v_delta      INTEGER;
BEGIN
  SELECT stock INTO v_old_stock FROM productos WHERE id = p_id;
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
    descuento     = CASE WHEN product->>'descuento' IS NULL THEN NULL
                         ELSE (product->>'descuento')::integer END
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

  -- Registrar ajuste de stock si el admin aumentó el stock manualmente.
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
      'Ajuste manual desde edición de producto'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_product_atomic(text, jsonb, text, jsonb) TO authenticated;
