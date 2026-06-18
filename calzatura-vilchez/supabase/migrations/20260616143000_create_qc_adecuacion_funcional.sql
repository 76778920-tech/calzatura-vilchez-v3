-- Módulo Adecuación Funcional ISO/IEC 25010 — Calzatura Vilchez
-- Fuente canónica: modulo-adecuacion-funcional-iso25010/database/schema.postgresql.sql

CREATE TABLE IF NOT EXISTS qc_evaluaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo          VARCHAR(30)  NOT NULL UNIQUE,
    titulo          VARCHAR(200) NOT NULL,
    sistema         VARCHAR(120) NOT NULL DEFAULT 'Sistema de Gestión de Calzados Calzatura Vilchez',
    periodo         VARCHAR(40),
    evaluador       VARCHAR(120),
    fecha_evaluacion DATE        NOT NULL DEFAULT CURRENT_DATE,
    observaciones   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qc_funciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluacion_id   UUID         NOT NULL REFERENCES qc_evaluaciones(id) ON DELETE CASCADE,
    codigo_rf       VARCHAR(20)  NOT NULL,
    modulo          VARCHAR(60),
    nombre          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    requerida       BOOLEAN      NOT NULL DEFAULT TRUE,
    implementada    BOOLEAN      NOT NULL DEFAULT FALSE,
    evidencia       TEXT,
    verificado_en   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (evaluacion_id, codigo_rf)
);

CREATE INDEX IF NOT EXISTS idx_qc_funciones_evaluacion ON qc_funciones(evaluacion_id);

CREATE TABLE IF NOT EXISTS qc_transacciones_funcionales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluacion_id   UUID         NOT NULL REFERENCES qc_evaluaciones(id) ON DELETE CASCADE,
    codigo          VARCHAR(30)  NOT NULL,
    modulo          VARCHAR(60),
    descripcion     TEXT         NOT NULL,
    evaluada        BOOLEAN      NOT NULL DEFAULT FALSE,
    correcta        BOOLEAN,
    fecha_prueba    TIMESTAMPTZ,
    observaciones   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (evaluacion_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_qc_transacciones_evaluacion ON qc_transacciones_funcionales(evaluacion_id);

CREATE TABLE IF NOT EXISTS qc_casos_prueba (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluacion_id   UUID         NOT NULL REFERENCES qc_evaluaciones(id) ON DELETE CASCADE,
    codigo          VARCHAR(30)  NOT NULL,
    nombre          VARCHAR(200) NOT NULL,
    modulo          VARCHAR(60),
    descripcion     TEXT,
    ejecutado       BOOLEAN      NOT NULL DEFAULT FALSE,
    aprobado        BOOLEAN,
    fecha_ejecucion TIMESTAMPTZ,
    observaciones   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (evaluacion_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_qc_casos_prueba_evaluacion ON qc_casos_prueba(evaluacion_id);

CREATE VIEW qc_v_metricas_evaluacion
WITH (security_invoker = true)
AS
SELECT
    e.id AS evaluacion_id,
    e.codigo,
    e.titulo,
    e.periodo,
    (SELECT COUNT(*) FROM qc_funciones f WHERE f.evaluacion_id = e.id AND f.requerida) AS funciones_requeridas,
    (SELECT COUNT(*) FROM qc_funciones f WHERE f.evaluacion_id = e.id AND f.requerida AND f.implementada) AS funciones_implementadas,
    CASE WHEN (SELECT COUNT(*) FROM qc_funciones f WHERE f.evaluacion_id = e.id AND f.requerida) = 0 THEN NULL
         ELSE ROUND(100.0 * (SELECT COUNT(*) FROM qc_funciones f WHERE f.evaluacion_id = e.id AND f.requerida AND f.implementada)
              / (SELECT COUNT(*) FROM qc_funciones f WHERE f.evaluacion_id = e.id AND f.requerida), 2) END AS completitud_funcional_pct,
    (SELECT COUNT(*) FROM qc_transacciones_funcionales t WHERE t.evaluacion_id = e.id AND t.evaluada) AS transacciones_evaluadas,
    (SELECT COUNT(*) FROM qc_transacciones_funcionales t WHERE t.evaluacion_id = e.id AND t.evaluada AND t.correcta) AS transacciones_correctas,
    CASE WHEN (SELECT COUNT(*) FROM qc_transacciones_funcionales t WHERE t.evaluacion_id = e.id AND t.evaluada) = 0 THEN NULL
         ELSE ROUND(100.0 * (SELECT COUNT(*) FROM qc_transacciones_funcionales t WHERE t.evaluacion_id = e.id AND t.evaluada AND t.correcta)
              / (SELECT COUNT(*) FROM qc_transacciones_funcionales t WHERE t.evaluacion_id = e.id AND t.evaluada), 2) END AS correccion_funcional_pct,
    (SELECT COUNT(*) FROM qc_casos_prueba c WHERE c.evaluacion_id = e.id AND c.ejecutado) AS casos_ejecutados,
    (SELECT COUNT(*) FROM qc_casos_prueba c WHERE c.evaluacion_id = e.id AND c.ejecutado AND c.aprobado) AS casos_aprobados,
    CASE WHEN (SELECT COUNT(*) FROM qc_casos_prueba c WHERE c.evaluacion_id = e.id AND c.ejecutado) = 0 THEN NULL
         ELSE ROUND(100.0 * (SELECT COUNT(*) FROM qc_casos_prueba c WHERE c.evaluacion_id = e.id AND c.ejecutado AND c.aprobado)
              / (SELECT COUNT(*) FROM qc_casos_prueba c WHERE c.evaluacion_id = e.id AND c.ejecutado), 2) END AS tecp_pct
FROM qc_evaluaciones e;

CREATE OR REPLACE FUNCTION qc_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_qc_evaluaciones_updated ON qc_evaluaciones;
CREATE TRIGGER trg_qc_evaluaciones_updated
    BEFORE UPDATE ON qc_evaluaciones
    FOR EACH ROW EXECUTE FUNCTION qc_set_updated_at();

ALTER TABLE qc_evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_evaluaciones FORCE ROW LEVEL SECURITY;
ALTER TABLE qc_funciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_funciones FORCE ROW LEVEL SECURITY;
ALTER TABLE qc_transacciones_funcionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_transacciones_funcionales FORCE ROW LEVEL SECURITY;
ALTER TABLE qc_casos_prueba ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_casos_prueba FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE qc_evaluaciones FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE qc_funciones FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE qc_transacciones_funcionales FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE qc_casos_prueba FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "service_role_all_qc_evaluaciones" ON qc_evaluaciones;
CREATE POLICY "service_role_all_qc_evaluaciones"
  ON qc_evaluaciones FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_qc_funciones" ON qc_funciones;
CREATE POLICY "service_role_all_qc_funciones"
  ON qc_funciones FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_qc_transacciones_funcionales" ON qc_transacciones_funcionales;
CREATE POLICY "service_role_all_qc_transacciones_funcionales"
  ON qc_transacciones_funcionales FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_qc_casos_prueba" ON qc_casos_prueba;
CREATE POLICY "service_role_all_qc_casos_prueba"
  ON qc_casos_prueba FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON qc_evaluaciones TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON qc_funciones TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON qc_transacciones_funcionales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON qc_casos_prueba TO service_role;

COMMENT ON VIEW qc_v_metricas_evaluacion IS
  'Métricas ISO 25010 Adecuación Funcional; security_invoker (permisos del rol que consulta). SELECT solo service_role.';

REVOKE ALL ON TABLE qc_v_metricas_evaluacion FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE qc_v_metricas_evaluacion TO service_role;

NOTIFY pgrst, 'reload schema';
