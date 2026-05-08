-- Tabla para persistir eventos de campaña detectados automáticamente por el servicio IA.
-- Permite rastrear inicio, duración, impacto y estado de cada campaña.

CREATE TABLE IF NOT EXISTS campanasDetectadas (
    id                  SERIAL PRIMARY KEY,
    fecha_deteccion     DATE        NOT NULL DEFAULT CURRENT_DATE,
    fecha_inicio        DATE,
    fecha_fin           DATE,
    nivel               TEXT        NOT NULL CHECK (nivel IN ('alta', 'media', 'baja', 'normal')),
    tipo_sugerido       TEXT,
    categorias_afectadas JSONB      NOT NULL DEFAULT '[]',
    uplift_ratio        NUMERIC(6, 3),
    z_score             NUMERIC(6, 3),
    confidence_pct      NUMERIC(5, 1),
    estado              TEXT        NOT NULL DEFAULT 'observando'
                            CHECK (estado IN ('inicio', 'activa', 'finalizada', 'descartada', 'observando')),
    impacto_estimado_soles NUMERIC(12, 2),
    metricas            JSONB       NOT NULL DEFAULT '{}',
    recomendacion       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_campanas_fecha_deteccion ON campanasDetectadas (fecha_deteccion DESC);
CREATE INDEX IF NOT EXISTS idx_campanas_estado          ON campanasDetectadas (estado);
CREATE INDEX IF NOT EXISTS idx_campanas_nivel           ON campanasDetectadas (nivel);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_campanas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campanas_updated_at
    BEFORE UPDATE ON campanasDetectadas
    FOR EACH ROW EXECUTE FUNCTION update_campanas_updated_at();

-- RLS: solo el service role puede escribir; anon puede leer
ALTER TABLE campanasDetectadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon puede leer campanas detectadas"
    ON campanasDetectadas FOR SELECT
    USING (true);

CREATE POLICY "service role puede todo en campanas"
    ON campanasDetectadas FOR ALL
    USING (auth.role() = 'service_role');
