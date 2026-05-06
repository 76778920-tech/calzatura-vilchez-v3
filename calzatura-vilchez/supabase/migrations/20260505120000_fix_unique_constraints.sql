-- Agrega constraints UNIQUE que requiere ON CONFLICT en update_product_atomic.
-- Sin estos constraints, el UPSERT falla con error 42P10.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'productoCodigos_productoId_unique'
  ) THEN
    ALTER TABLE "productoCodigos"
      ADD CONSTRAINT "productoCodigos_productoId_unique" UNIQUE ("productoId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'productoFinanzas_productId_unique'
  ) THEN
    ALTER TABLE "productoFinanzas"
      ADD CONSTRAINT "productoFinanzas_productId_unique" UNIQUE ("productId");
  END IF;
END $$;
