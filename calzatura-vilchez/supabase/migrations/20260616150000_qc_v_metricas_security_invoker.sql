-- Supabase Database Linter 0010 (security_definer_view): public.qc_v_metricas_evaluacion
-- La vista agrega métricas QC; acceso solo vía service_role (BFF). security_invoker respeta RLS del consultante.

DROP VIEW IF EXISTS qc_v_metricas_evaluacion;

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

COMMENT ON VIEW qc_v_metricas_evaluacion IS
  'Métricas ISO 25010 Adecuación Funcional; security_invoker (permisos del rol que consulta). SELECT solo service_role.';

REVOKE ALL ON TABLE qc_v_metricas_evaluacion FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE qc_v_metricas_evaluacion TO service_role;

NOTIFY pgrst, 'reload schema';
