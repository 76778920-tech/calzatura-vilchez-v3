-- Agrega campos de foco y scope a campanas_detectadas para consultas directas
-- sin necesidad de parsear los JSONB de categorias_afectadas / metricas.

ALTER TABLE campanas_detectadas
    ADD COLUMN IF NOT EXISTS scope                           TEXT
        CHECK (scope IN ('global', 'focalizada')),
    ADD COLUMN IF NOT EXISTS foco_tipo                      TEXT
        CHECK (foco_tipo IN ('global', 'categoria', 'producto')),
    ADD COLUMN IF NOT EXISTS foco_nombre                    TEXT,
    ADD COLUMN IF NOT EXISTS foco_uplift                    NUMERIC(6, 3),
    ADD COLUMN IF NOT EXISTS impacto_estimado_soles_focalizado NUMERIC(12, 2);

-- Índice para filtrar por tipo de foco (campañas focalizadas vs globales)
CREATE INDEX IF NOT EXISTS idx_camp_scope     ON campanas_detectadas (scope);
CREATE INDEX IF NOT EXISTS idx_camp_foco_tipo ON campanas_detectadas (foco_tipo);
