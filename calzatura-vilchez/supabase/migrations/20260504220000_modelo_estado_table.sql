-- F-04: Persiste el estado del modelo de IA entre reinicios del servidor
-- (ISO/IEC 25010 §5.5 Fiabilidad — el _model_registry en memoria se pierde al reiniciar)

CREATE TABLE IF NOT EXISTS "modeloEstado" (
  id             text PRIMARY KEY DEFAULT 'singleton',
  "trainingMeta" jsonb,
  "actualizadoEn" text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- Solo el service role puede leer/escribir estado del modelo
ALTER TABLE "modeloEstado" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_modelo_estado"
  ON "modeloEstado"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
