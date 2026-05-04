-- Agrupa variantes de color del mismo modelo (familiaId compartido).
-- En bases vacías, `productos` aún no existe: la crea `20260430130000_create_all_tables.sql`
-- (que ya incluye "familiaId"). Este bloque solo altera si la tabla existe (legado / orden mixto).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'productos'
  ) THEN
    ALTER TABLE productos ADD COLUMN IF NOT EXISTS "familiaId" text;
    CREATE INDEX IF NOT EXISTS idx_productos_familia_id ON productos ("familiaId");
    COMMENT ON COLUMN productos."familiaId" IS 'Mismo valor en variantes del mismo modelo; variantes creadas desde admin comparten clave con el producto origen.';
  END IF;
END $$;
