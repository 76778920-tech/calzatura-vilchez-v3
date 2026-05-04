-- Crea todas las variantes de color de un producto en una sola transacción.
-- Si cualquier INSERT falla (constraint, trigger, unicidad), todo se revierte.
--
-- Parámetro: variants jsonb — array de objetos, uno por color:
-- {
--   nombre, precio, descripcion, imagen, imagenes,
--   stock, categoria, tipoCalzado, tallas, tallaStock,
--   marca, material, estilo, color, familiaId,
--   destacado, descuento, codigo,
--   finanzas: {
--     costoCompra, margenMinimo, margenObjetivo, margenMaximo,
--     precioMinimo, precioSugerido, precioMaximo
--   }
-- }
--
-- Retorna: { ids: string[] } — UUIDs de los productos creados, en orden.

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
      destacado, descuento
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
           ELSE (v->>'descuento')::integer END
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

-- Solo usuarios autenticados (rol admin en la app) pueden crear variantes.
-- anon no tiene acceso; service_role lo tiene por defecto y no necesita GRANT.
GRANT EXECUTE ON FUNCTION create_product_variants_atomic(jsonb) TO authenticated;
