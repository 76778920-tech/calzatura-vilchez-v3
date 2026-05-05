-- Permite varios estilos comerciales en `productos.estilo` como CSV (ej. "Urbanas,Casuales").
-- Cada token se valida igual que el valor único anterior; vacío / NULL sigue permitido.

CREATE OR REPLACE FUNCTION cv_guard_producto_estilo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  raw text;
  piece text;
  allowed text[];
BEGIN
  raw := trim(COALESCE(NEW.estilo, ''));
  IF raw = '' THEN
    RETURN NEW;
  END IF;

  FOREACH piece IN ARRAY string_to_array(NEW.estilo, ',')
  LOOP
    piece := trim(piece);
    IF piece = '' THEN
      CONTINUE;
    END IF;

    allowed := CASE piece
      WHEN 'Urbanas'    THEN ARRAY['Zapatillas']::text[]
      WHEN 'Deportivas' THEN ARRAY['Zapatillas']::text[]
      WHEN 'Casuales'   THEN ARRAY['Zapatillas','Zapatos Casuales','Zapatos','Sandalias','Botines']::text[]
      WHEN 'Outdoor'    THEN ARRAY['Zapatillas','Botines']::text[]
      WHEN 'Ejecutivo'  THEN ARRAY['Zapatos de Vestir','Mocasines','Zapatos','Escolar']::text[]
      WHEN 'Weekend'    THEN ARRAY['Zapatillas','Zapatos Casuales','Botines','Sandalias','Mocasines']::text[]
      ELSE NULL
    END;

    IF allowed IS NULL THEN
      RAISE EXCEPTION 'cv_guard_producto_estilo: estilo "%" no es un valor comercial permitido', piece;
    END IF;

    IF NEW."tipoCalzado" IS NOT NULL AND NOT (trim(NEW."tipoCalzado") = ANY(allowed)) THEN
      RAISE EXCEPTION 'cv_guard_producto_estilo: estilo "%" no corresponde al tipo "%"',
        piece, NEW."tipoCalzado";
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;
