-- Actualiza create_product_variants_atomic para que al crear un producto
-- registre automáticamente el stock inicial como primer movimiento de ingreso.

CREATE OR REPLACE FUNCTION create_product_variants_atomic(variants jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v        jsonb;
  pid      text;
  ids      text[] := '{}';
  v_stock  integer;
BEGIN
  FOR v IN SELECT * FROM jsonb_array_elements(variants)
  LOOP
    pid     := gen_random_uuid()::text;
    v_stock := coalesce((v->>'stock')::integer, 0);

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

    -- Registra el stock inicial como primer ingreso de mercancía.
    -- Solo se inserta si el producto tiene stock > 0.
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

GRANT EXECUTE ON FUNCTION create_product_variants_atomic(jsonb) TO authenticated;
