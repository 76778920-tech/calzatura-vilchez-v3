-- F-08: Política de retención de datos (ISO 27001 A.5.33)
-- Elimina registros de auditoría mayores a 2 años y ventas de prueba mayores a 90 días.
-- Ejecutar manualmente o programar con pg_cron (Supabase Pro: cron.schedule).

-- 1. Función de retención para tabla `auditoria`
CREATE OR REPLACE FUNCTION purge_old_audit_records(retention_years int DEFAULT 2)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
  cutoff_date   text;
BEGIN
  cutoff_date := to_char(
    (now() AT TIME ZONE 'utc') - make_interval(years => retention_years),
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );

  DELETE FROM auditoria
  WHERE "realizadoEn" < cutoff_date;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 2. Función de retención para datos de prueba en `ventasDiarias`
CREATE OR REPLACE FUNCTION purge_test_sales(retention_days int DEFAULT 90)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
  cutoff_date   text;
BEGIN
  cutoff_date := to_char(
    (now() AT TIME ZONE 'utc') - make_interval(days => retention_days),
    'YYYY-MM-DD'
  );

  DELETE FROM "ventasDiarias"
  WHERE "esDePrueba" = true
    AND fecha < cutoff_date;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 3. Función maestra que ejecuta ambas purgas y devuelve un resumen
CREATE OR REPLACE FUNCTION run_data_retention_policy()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_deleted int;
  test_deleted  int;
BEGIN
  audit_deleted := purge_old_audit_records(2);   -- 2 años para auditoría
  test_deleted  := purge_test_sales(90);          -- 90 días para ventas de prueba

  RETURN jsonb_build_object(
    'ejecutadoEn',          to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'auditoria_eliminados', audit_deleted,
    'ventas_prueba_eliminadas', test_deleted
  );
END;
$$;

-- Permisos: solo service_role puede ejecutar las funciones de retención
REVOKE ALL ON FUNCTION purge_old_audit_records(int)    FROM PUBLIC;
REVOKE ALL ON FUNCTION purge_test_sales(int)            FROM PUBLIC;
REVOKE ALL ON FUNCTION run_data_retention_policy()      FROM PUBLIC;

GRANT EXECUTE ON FUNCTION run_data_retention_policy() TO service_role;

-- Para programar con pg_cron (requiere extensión pg_cron en Supabase Pro):
-- SELECT cron.schedule('retention-policy', '0 3 1 * *', 'SELECT run_data_retention_policy()');
-- Ejecutar el primer día de cada mes a las 3:00 AM UTC.
--
-- En plan gratuito: ejecutar manualmente desde SQL Editor:
--   SELECT run_data_retention_policy();
