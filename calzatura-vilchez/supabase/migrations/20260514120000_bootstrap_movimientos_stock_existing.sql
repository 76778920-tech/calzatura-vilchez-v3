-- Punto de partida para catálogo ya existente: un ingreso por producto con stock > 0
-- solo si aún no tiene ningún movimiento (idempotente si se re-ejecuta en otro entorno).

INSERT INTO "movimientosStock" (
  "productId",
  tipo,
  fecha,
  "tallaStock",
  cantidad,
  observaciones
)
SELECT
  p.id,
  'ingreso',
  CURRENT_DATE,
  COALESCE(p."tallaStock", '{}'::jsonb),
  p.stock,
  'Stock inicial — migración automática (catálogo existente)'
FROM productos p
WHERE p.stock > 0
  AND NOT EXISTS (
    SELECT 1 FROM "movimientosStock" m WHERE m."productId" = p.id
  );
