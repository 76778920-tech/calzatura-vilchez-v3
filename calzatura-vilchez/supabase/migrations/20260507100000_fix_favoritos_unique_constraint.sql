-- Alinea la tabla real con el contrato de la app: un favorito por usuario/producto.
DELETE FROM favoritos a
USING favoritos b
WHERE a.id > b.id
  AND a."userId" = b."userId"
  AND a."productId" = b."productId";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'favoritos_user_product_unique'
  ) THEN
    ALTER TABLE favoritos
      ADD CONSTRAINT favoritos_user_product_unique UNIQUE ("userId", "productId");
  END IF;
END $$;

ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON favoritos FROM anon;
REVOKE ALL ON favoritos FROM authenticated;
