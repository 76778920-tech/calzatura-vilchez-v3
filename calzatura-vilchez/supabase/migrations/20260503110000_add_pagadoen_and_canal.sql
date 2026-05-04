-- P1-3: fecha real de pago en pedidos
-- Permite que revenue.py use "pagadoEn" (fecha del webhook Stripe) en lugar de
-- "creadoEn" (fecha de creación del pedido) al construir la serie diaria de ingresos.
-- Los pedidos anteriores conservarán NULL; revenue.py hace fallback a creadoEn.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS "pagadoEn" text;

-- P1-4: canal de venta en ventasDiarias
-- Marca explícitamente que las filas insertadas manualmente son de tienda física.
-- Valor 'tienda' por defecto para toda fila nueva y para el backfill de filas viejas.
ALTER TABLE "ventasDiarias"
  ADD COLUMN IF NOT EXISTS canal text DEFAULT 'tienda';

UPDATE "ventasDiarias"
  SET canal = 'tienda'
  WHERE canal IS NULL;
