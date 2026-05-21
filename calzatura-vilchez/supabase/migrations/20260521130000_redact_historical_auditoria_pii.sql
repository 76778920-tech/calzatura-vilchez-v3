-- ISO/IEC 27001 / 27701 - saneamiento de PII historica en auditoria.
-- Las filas nuevas se normalizan en BFF; esta migracion corrige registros previos.

UPDATE auditoria
SET "entidadNombre" =
  CASE
    WHEN entidad IN ('usuario', 'fabricante', 'pedido', 'venta', 'importar')
      THEN entidad || ':' || COALESCE(NULLIF(RIGHT(COALESCE("entidadId", ''), 8), ''), 'sin-id')
    WHEN "entidadNombre" ~ '^[0-9]{8}$'
      THEN '[redacted]'
    WHEN "entidadNombre" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      THEN '[redacted]'
    ELSE "entidadNombre"
  END
WHERE "entidadNombre" IS NOT NULL
  AND (
    entidad IN ('usuario', 'fabricante', 'pedido', 'venta', 'importar')
    OR "entidadNombre" ~ '^[0-9]{8}$'
    OR "entidadNombre" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

UPDATE auditoria
SET "usuarioEmail" =
  CASE
    WHEN "usuarioEmail" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      THEN LEFT(split_part("usuarioEmail", '@', 1), 2) || '***@' || split_part("usuarioEmail", '@', 2)
    ELSE "usuarioEmail"
  END
WHERE "usuarioEmail" IS NOT NULL
  AND "usuarioEmail" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';

CREATE OR REPLACE FUNCTION redact_audit_detail_pii(p_value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  item record;
  key_lower text;
BEGIN
  IF p_value IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(p_value) = 'object' THEN
    result := '{}'::jsonb;
    FOR item IN SELECT key, value FROM jsonb_each(p_value) LOOP
      key_lower := LOWER(item.key);
      IF key_lower IN ('dni', 'documento', 'documentonumero', 'email', 'correo')
        OR key_lower LIKE '%telefono%'
        OR key_lower LIKE '%celular%'
        OR key_lower LIKE '%direccion%'
        OR key_lower LIKE '%referencia%'
        OR key_lower LIKE '%password%'
        OR key_lower LIKE '%token%'
        OR key_lower LIKE '%secret%'
        OR key_lower LIKE '%apikey%'
        OR key_lower LIKE '%api_key%'
      THEN
        result := result || jsonb_build_object(item.key, '[redacted]');
      ELSE
        result := result || jsonb_build_object(item.key, redact_audit_detail_pii(item.value));
      END IF;
    END LOOP;
    RETURN result;
  END IF;

  IF jsonb_typeof(p_value) = 'array' THEN
    SELECT COALESCE(jsonb_agg(redact_audit_detail_pii(value)), '[]'::jsonb)
      INTO result
      FROM jsonb_array_elements(p_value);
    RETURN result;
  END IF;

  RETURN p_value;
END;
$$;

WITH redacted_detalle AS (
  SELECT id, redact_audit_detail_pii(detalle) AS detalle
  FROM auditoria
  WHERE detalle IS NOT NULL
)
UPDATE auditoria a
SET detalle = r.detalle
FROM redacted_detalle r
WHERE a.id = r.id
  AND a.detalle IS DISTINCT FROM r.detalle;

DROP FUNCTION redact_audit_detail_pii(jsonb);
