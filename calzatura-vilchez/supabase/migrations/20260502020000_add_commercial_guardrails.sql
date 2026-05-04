-- Guardrails comerciales en BD: replica server-side las reglas de
-- commercialRules.ts para que ningún cliente pueda saltarse la UI.
--
-- Cubre: categoría, tipoCalzado (depende de categoría), estilo (depende de
-- tipoCalzado), material, descuento, precio positivo, y coherencia
-- precio ↔ rango financiero (costoCompra + márgenes).

-- ============================================================
-- 1. Añadir columnas que faltan en la tabla real
-- ============================================================
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS material  text,
  ADD COLUMN IF NOT EXISTS estilo    text,
  ADD COLUMN IF NOT EXISTS descuento integer;

-- ============================================================
-- 2. Migrar datos de prueba con categorías viejas a esquema nuevo
--    (Casual/Formal/Escolar/Playa/Urbano → hombre/dama/nino)
-- ============================================================
UPDATE productos SET
  categoria = CASE id
    WHEN 'PRUEBA_CV002' THEN 'dama'
    WHEN 'PRUEBA_CV003' THEN 'dama'
    WHEN 'PRUEBA_CV004' THEN 'hombre'
    WHEN 'PRUEBA_CV005' THEN 'nino'
    WHEN 'PRUEBA_CV006' THEN 'hombre'
    WHEN 'PRUEBA_CV007' THEN 'dama'
    WHEN 'PRUEBA_CV008' THEN 'hombre'
    WHEN 'PRUEBA_CV009' THEN 'dama'
    WHEN 'PRUEBA_CV010' THEN 'hombre'
    ELSE categoria
  END,
  "tipoCalzado" = CASE id
    WHEN 'PRUEBA_CV001' THEN 'Zapatillas'
    WHEN 'PRUEBA_CV002' THEN 'Botas y Botines'
    WHEN 'PRUEBA_CV003' THEN 'Sandalias'
    WHEN 'PRUEBA_CV004' THEN 'Zapatos de Vestir'
    WHEN 'PRUEBA_CV005' THEN 'Escolar'
    WHEN 'PRUEBA_CV006' THEN 'Zapatos de Vestir'
    WHEN 'PRUEBA_CV007' THEN 'Botas y Botines'
    WHEN 'PRUEBA_CV008' THEN 'Zapatillas'
    WHEN 'PRUEBA_CV009' THEN 'Flip Flops'
    WHEN 'PRUEBA_CV010' THEN 'Zapatos Casuales'
    ELSE "tipoCalzado"
  END
WHERE id LIKE 'PRUEBA_CV%';

-- ============================================================
-- 3. CHECK simples (precio, categoría, descuento)
-- ============================================================
ALTER TABLE productos
  DROP CONSTRAINT IF EXISTS cv_check_precio_positivo,
  ADD  CONSTRAINT cv_check_precio_positivo CHECK (precio > 0);

ALTER TABLE productos
  DROP CONSTRAINT IF EXISTS cv_check_categoria,
  ADD  CONSTRAINT cv_check_categoria
    CHECK (categoria IS NULL OR categoria IN ('hombre','dama','juvenil','nino','bebe'));

ALTER TABLE productos
  DROP CONSTRAINT IF EXISTS cv_check_descuento,
  ADD  CONSTRAINT cv_check_descuento
    CHECK (descuento IS NULL OR descuento IN (10, 20, 30));

-- ============================================================
-- 4. TRIGGER: tipoCalzado debe pertenecer a la categoría
-- ============================================================
CREATE OR REPLACE FUNCTION cv_guard_producto_tipo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  allowed text[];
BEGIN
  IF NEW."tipoCalzado" IS NULL OR NEW.categoria IS NULL THEN
    RETURN NEW;
  END IF;
  allowed := CASE NEW.categoria
    WHEN 'dama'    THEN ARRAY['Zapatillas','Sandalias','Zapatos Casuales','Zapatos de Vestir',
                              'Mocasines','Botas y Botines','Ballerinas','Pantuflas','Flip Flops']
    WHEN 'hombre'  THEN ARRAY['Zapatillas','Zapatos de Vestir','Zapatos Casuales',
                              'Sandalias','Botines','Zapatos de Seguridad','Pantuflas']
    WHEN 'nino'    THEN ARRAY['Escolar','Sandalias','Zapatillas','Zapatos']
    WHEN 'juvenil' THEN ARRAY['Escolar','Zapatillas','Sandalias','Zapatos','Botines']
    WHEN 'bebe'    THEN ARRAY['Zapatos','Sandalias','Zapatillas','Pantuflas']
    ELSE NULL
  END;
  IF allowed IS NULL OR NOT (NEW."tipoCalzado" = ANY(allowed)) THEN
    RAISE EXCEPTION 'cv_guard_producto_tipo: tipo "%" no válido para categoría "%"',
      NEW."tipoCalzado", NEW.categoria;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv_guard_producto_tipo ON productos;
CREATE TRIGGER trg_cv_guard_producto_tipo
  BEFORE INSERT OR UPDATE OF categoria, "tipoCalzado" ON productos
  FOR EACH ROW EXECUTE FUNCTION cv_guard_producto_tipo();

-- ============================================================
-- 5. TRIGGER: estilo debe corresponder al tipoCalzado
-- ============================================================
CREATE OR REPLACE FUNCTION cv_guard_producto_estilo()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  allowed text[];
BEGIN
  IF NEW.estilo IS NULL OR trim(NEW.estilo) = '' THEN
    RETURN NEW;
  END IF;
  allowed := CASE NEW.estilo
    WHEN 'Urbanas'    THEN ARRAY['Zapatillas']
    WHEN 'Deportivas' THEN ARRAY['Zapatillas']
    WHEN 'Casuales'   THEN ARRAY['Zapatillas','Zapatos Casuales','Zapatos','Sandalias','Botines']
    WHEN 'Outdoor'    THEN ARRAY['Zapatillas','Botines']
    WHEN 'Ejecutivo'  THEN ARRAY['Zapatos de Vestir','Mocasines','Zapatos','Escolar']
    WHEN 'Weekend'    THEN ARRAY['Zapatillas','Zapatos Casuales','Botines','Sandalias','Mocasines']
    ELSE NULL
  END;
  IF allowed IS NULL THEN
    RAISE EXCEPTION 'cv_guard_producto_estilo: estilo "%" no es un valor comercial permitido', NEW.estilo;
  END IF;
  IF NEW."tipoCalzado" IS NOT NULL AND NOT (NEW."tipoCalzado" = ANY(allowed)) THEN
    RAISE EXCEPTION 'cv_guard_producto_estilo: estilo "%" no corresponde al tipo "%"',
      NEW.estilo, NEW."tipoCalzado";
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv_guard_producto_estilo ON productos;
CREATE TRIGGER trg_cv_guard_producto_estilo
  BEFORE INSERT OR UPDATE OF estilo, "tipoCalzado" ON productos
  FOR EACH ROW EXECUTE FUNCTION cv_guard_producto_estilo();

-- ============================================================
-- 6. TRIGGER: material dentro de la paleta comercial
-- ============================================================
CREATE OR REPLACE FUNCTION cv_guard_producto_material()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.material IS NULL OR trim(NEW.material) = '' THEN
    RETURN NEW;
  END IF;
  IF NOT (NEW.material = ANY(ARRAY['Cuero','Gamuza','Charol','Nubuk','Sintético','Textil'])) THEN
    RAISE EXCEPTION 'cv_guard_producto_material: "%" no pertenece a la paleta comercial permitida',
      NEW.material;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv_guard_producto_material ON productos;
CREATE TRIGGER trg_cv_guard_producto_material
  BEFORE INSERT OR UPDATE OF material ON productos
  FOR EACH ROW EXECUTE FUNCTION cv_guard_producto_material();

-- ============================================================
-- 7. TRIGGER: precio coherente con rango financiero almacenado
--    (se activa al cambiar precio en productos)
-- ============================================================
CREATE OR REPLACE FUNCTION cv_guard_producto_precio()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  fin record;
BEGIN
  SELECT "precioMinimo", "precioMaximo"
    INTO fin
    FROM "productoFinanzas"
   WHERE "productId" = NEW.id;
  IF NOT FOUND THEN
    RETURN NEW; -- sin finanzas aún; validará cuando se upserte productoFinanzas
  END IF;
  IF NEW.precio < fin."precioMinimo" OR NEW.precio > fin."precioMaximo" THEN
    RAISE EXCEPTION 'cv_guard_producto_precio: precio % fuera del rango comercial [%, %]',
      NEW.precio, fin."precioMinimo", fin."precioMaximo";
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv_guard_producto_precio ON productos;
CREATE TRIGGER trg_cv_guard_producto_precio
  BEFORE INSERT OR UPDATE OF precio ON productos
  FOR EACH ROW EXECUTE FUNCTION cv_guard_producto_precio();

-- ============================================================
-- 8. TRIGGER: coherencia financiera (márgenes + precio)
--    (se activa al insertar/actualizar productoFinanzas)
-- ============================================================
CREATE OR REPLACE FUNCTION cv_guard_producto_finanzas()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_precio numeric;
BEGIN
  IF NEW."costoCompra" <= 0 THEN
    RAISE EXCEPTION 'cv_guard_producto_finanzas: costoCompra debe ser mayor que cero';
  END IF;
  IF NEW."margenMinimo" > NEW."margenObjetivo" OR NEW."margenObjetivo" > NEW."margenMaximo" THEN
    RAISE EXCEPTION 'cv_guard_producto_finanzas: márgenes desordenados (min=%, obj=%, max=%)',
      NEW."margenMinimo", NEW."margenObjetivo", NEW."margenMaximo";
  END IF;
  SELECT precio INTO v_precio FROM productos WHERE id = NEW."productId";
  IF FOUND AND v_precio IS NOT NULL
     AND (v_precio < NEW."precioMinimo" OR v_precio > NEW."precioMaximo") THEN
    RAISE EXCEPTION 'cv_guard_producto_finanzas: precio % fuera del rango comercial [%, %]',
      v_precio, NEW."precioMinimo", NEW."precioMaximo";
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cv_guard_producto_finanzas ON "productoFinanzas";
CREATE TRIGGER trg_cv_guard_producto_finanzas
  BEFORE INSERT OR UPDATE ON "productoFinanzas"
  FOR EACH ROW EXECUTE FUNCTION cv_guard_producto_finanzas();
