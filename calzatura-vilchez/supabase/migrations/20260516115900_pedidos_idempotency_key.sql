-- Evita pedidos duplicados por doble clic o reintentos en checkout.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS "idempotencyKey" text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_idempotency_key
  ON pedidos ("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;
