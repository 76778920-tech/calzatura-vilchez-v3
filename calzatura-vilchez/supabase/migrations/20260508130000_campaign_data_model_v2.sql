-- Migración v2: modelo de datos de campañas profesional.
-- Reemplaza campanasDetectadas (camelCase) por campanas_detectadas (snake_case),
-- amplía estados, y agrega tablas de métricas diarias, productos afectados y feedback.

-- ── 1. Eliminar tabla anterior (camelCase) ────────────────────────────────────
DROP TABLE IF EXISTS "campanasDetectadas" CASCADE;

-- ── 2. Tabla principal: campanas_detectadas ───────────────────────────────────
CREATE TABLE IF NOT EXISTS campanas_detectadas (
    id                      SERIAL PRIMARY KEY,
    fecha_deteccion         DATE            NOT NULL DEFAULT CURRENT_DATE,
    fecha_inicio            DATE,
    fecha_fin               DATE,
    nivel                   TEXT            NOT NULL
                                CHECK (nivel IN ('alta', 'media', 'baja', 'normal')),
    tipo_sugerido           TEXT,
    categorias_afectadas    JSONB           NOT NULL DEFAULT '[]',
    uplift_ratio            NUMERIC(6, 3),
    z_score                 NUMERIC(6, 3),
    confidence_pct          NUMERIC(5, 1),
    estado                  TEXT            NOT NULL DEFAULT 'observando'
                                CHECK (estado IN (
                                    'observando',   -- señal emergente, aún sin confirmar
                                    'inicio',       -- primer día confirmado
                                    'activa',       -- campaña en curso
                                    'finalizando',  -- ventas bajando, cooldown activo
                                    'en_riesgo_stock', -- campaña activa con stock crítico
                                    'finalizada',   -- campaña cerrada por sistema
                                    'descartada'    -- admin la marcó como falso positivo
                                )),
    impacto_estimado_soles  NUMERIC(12, 2),
    metricas                JSONB           NOT NULL DEFAULT '{}',
    recomendacion           TEXT,
    -- Feedback humano
    confirmada_por_admin    BOOLEAN         DEFAULT NULL,
    admin_nota              TEXT,
    -- Auditoría
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 3. Tabla de métricas diarias por campaña ──────────────────────────────────
-- Una fila por (campana_id, fecha): permite graficar evolución del uplift
-- durante todo el ciclo de vida de la campaña.
CREATE TABLE IF NOT EXISTS campana_metricas_diarias (
    id              SERIAL PRIMARY KEY,
    campana_id      INTEGER         NOT NULL REFERENCES campanas_detectadas (id) ON DELETE CASCADE,
    fecha           DATE            NOT NULL,
    ventas_unidades NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    ventas_soles    NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    uplift_ratio    NUMERIC(6, 3),
    z_score         NUMERIC(6, 3),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (campana_id, fecha)
);

-- ── 4. Tabla de productos más afectados por campaña ──────────────────────────
-- Top productos que jalan el pico; permite recomendaciones de stock específicas.
CREATE TABLE IF NOT EXISTS campana_productos (
    id              SERIAL PRIMARY KEY,
    campana_id      INTEGER         NOT NULL REFERENCES campanas_detectadas (id) ON DELETE CASCADE,
    producto_id     TEXT            NOT NULL,
    nombre          TEXT,
    categoria       TEXT,
    uplift_ratio    NUMERIC(6, 3),
    ventas_recientes NUMERIC(10, 2),
    ventas_baseline  NUMERIC(10, 2),
    stock_actual    INTEGER,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (campana_id, producto_id)
);

-- ── 5. Tabla de feedback del administrador ───────────────────────────────────
-- Historial de acciones del admin sobre cada campaña detectada.
CREATE TABLE IF NOT EXISTS campana_feedback (
    id              SERIAL PRIMARY KEY,
    campana_id      INTEGER         NOT NULL REFERENCES campanas_detectadas (id) ON DELETE CASCADE,
    accion          TEXT            NOT NULL
                        CHECK (accion IN ('confirmar', 'descartar', 'ajustar_nivel', 'nota')),
    nivel_ajustado  TEXT,
    nota            TEXT,
    admin_email     TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 6. Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_camp_fecha_deteccion  ON campanas_detectadas (fecha_deteccion DESC);
CREATE INDEX IF NOT EXISTS idx_camp_estado           ON campanas_detectadas (estado);
CREATE INDEX IF NOT EXISTS idx_camp_nivel            ON campanas_detectadas (nivel);
CREATE INDEX IF NOT EXISTS idx_camp_met_campana_fecha ON campana_metricas_diarias (campana_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_camp_prod_campana     ON campana_productos (campana_id);
CREATE INDEX IF NOT EXISTS idx_camp_feed_campana     ON campana_feedback (campana_id, created_at DESC);

-- ── 7. Trigger updated_at ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_campanas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campanas_updated_at ON campanas_detectadas;
CREATE TRIGGER trg_campanas_updated_at
    BEFORE UPDATE ON campanas_detectadas
    FOR EACH ROW EXECUTE FUNCTION update_campanas_updated_at();

-- ── 8. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE campanas_detectadas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE campana_metricas_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE campana_productos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE campana_feedback         ENABLE ROW LEVEL SECURITY;

-- campanas_detectadas: lectura pública, escritura solo service_role
CREATE POLICY "anon puede leer campanas"
    ON campanas_detectadas FOR SELECT USING (true);

CREATE POLICY "service role puede todo en campanas"
    ON campanas_detectadas FOR ALL
    USING (auth.role() = 'service_role');

-- métricas diarias: lectura pública
CREATE POLICY "anon puede leer metricas diarias"
    ON campana_metricas_diarias FOR SELECT USING (true);

CREATE POLICY "service role puede todo en metricas diarias"
    ON campana_metricas_diarias FOR ALL
    USING (auth.role() = 'service_role');

-- productos afectados: lectura pública
CREATE POLICY "anon puede leer campana_productos"
    ON campana_productos FOR SELECT USING (true);

CREATE POLICY "service role puede todo en campana_productos"
    ON campana_productos FOR ALL
    USING (auth.role() = 'service_role');

-- feedback: solo service_role (datos sensibles de admin)
CREATE POLICY "service role puede todo en feedback"
    ON campana_feedback FOR ALL
    USING (auth.role() = 'service_role');
