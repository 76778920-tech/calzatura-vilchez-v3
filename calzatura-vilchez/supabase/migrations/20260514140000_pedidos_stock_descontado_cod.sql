-- Marca cuándo se descontó inventario por un pedido contra entrega (createOrder COD).
-- Evita doble descuento si se llama confirmCodOrder de nuevo; Stripe sigue usando solo webhook.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS "stockDescontadoEn" text;
