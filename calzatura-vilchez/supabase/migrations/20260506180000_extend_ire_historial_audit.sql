-- Auditoria extendida para el Indice de Riesgo Empresarial (IRE).
-- Permite reproducir que definicion, formula, version, variables y conteos
-- generaron el score guardado en cada fecha.

CREATE TABLE IF NOT EXISTS "ireHistorial" (
  fecha        text PRIMARY KEY,
  score        integer NOT NULL,
  nivel        text NOT NULL CHECK (nivel IN ('bajo','moderado','alto','critico')),
  dimensiones  jsonb NOT NULL DEFAULT '{}'::jsonb,
  pesos        jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE "ireHistorial"
  ADD COLUMN IF NOT EXISTS version text,
  ADD COLUMN IF NOT EXISTS definicion text,
  ADD COLUMN IF NOT EXISTS formula text,
  ADD COLUMN IF NOT EXISTS variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS detalle jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ire_historial_fecha ON "ireHistorial" (fecha);
CREATE INDEX IF NOT EXISTS idx_ire_historial_nivel ON "ireHistorial" (nivel);

-- El ai-service usa SUPABASE_SERVICE_KEY, que conserva permisos de service role.
-- No se crean politicas anon/authenticated: el historial del IRE es auditoria interna.
ALTER TABLE "ireHistorial" ENABLE ROW LEVEL SECURITY;
