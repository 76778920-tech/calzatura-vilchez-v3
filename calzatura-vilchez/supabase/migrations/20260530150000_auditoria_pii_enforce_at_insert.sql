-- PII en auditoría: normalización en INSERT/UPDATE (todos los caminos: BFF, trigger pedidos, RPC).
-- Complementa 20260521130000_redact_historical_auditoria_pii.sql (histórico) y auditPii.cjs (aplicación).

CREATE OR REPLACE FUNCTION mask_audit_email(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_email IS NULL OR trim(p_email) = '' THEN p_email
    WHEN trim(p_email) ~* '^[^@]+\*\*\*@[^@]+$' THEN trim(p_email)
    WHEN trim(p_email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      THEN LEFT(split_part(trim(p_email), '@', 1), 2) || '***@' || split_part(trim(p_email), '@', 2)
    ELSE trim(p_email)
  END;
$$;

CREATE OR REPLACE FUNCTION sanitize_audit_entidad_nombre(
  p_entidad text,
  p_entidad_id text,
  p_entidad_nombre text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ent text := trim(COALESCE(p_entidad, ''));
  eid text := trim(COALESCE(p_entidad_id, ''));
  suffix text;
  nombre text := trim(COALESCE(p_entidad_nombre, ''));
BEGIN
  IF ent IN ('usuario', 'fabricante', 'pedido', 'venta', 'importar') THEN
    suffix := COALESCE(NULLIF(RIGHT(eid, 8), ''), 'sin-id');
    RETURN ent || ':' || suffix;
  END IF;
  IF nombre ~ '^[0-9]{8}$' THEN
    RETURN '[redacted]';
  END IF;
  IF nombre ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RETURN mask_audit_email(nombre);
  END IF;
  RETURN nombre;
END;
$$;

CREATE OR REPLACE FUNCTION redact_audit_detail_pii(p_value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
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
      IF key_lower IN ('dni', 'documento', 'documentonumero', 'email', 'correo', 'useremail', 'usuarioemail')
        OR key_lower LIKE '%email'
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

CREATE OR REPLACE FUNCTION fn_auditoria_normalize_pii()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."usuarioEmail" := mask_audit_email(NEW."usuarioEmail");
  NEW."entidadNombre" := sanitize_audit_entidad_nombre(NEW.entidad, NEW."entidadId", NEW."entidadNombre");
  NEW.detalle := redact_audit_detail_pii(NEW.detalle);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_normalize_pii ON auditoria;

CREATE TRIGGER trg_auditoria_normalize_pii
  BEFORE INSERT OR UPDATE ON auditoria
  FOR EACH ROW
  EXECUTE FUNCTION fn_auditoria_normalize_pii();

-- Trigger pedidos: dejar de depender solo del saneamiento posterior
CREATE OR REPLACE FUNCTION fn_audit_pedido_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO auditoria (
    accion,
    entidad,
    "entidadId",
    "entidadNombre",
    detalle,
    "usuarioUid",
    "usuarioEmail",
    "realizadoEn"
  )
  VALUES (
    'crear',
    'pedido',
    NEW.id,
    '#' || upper(right(NEW.id, 8)),
    jsonb_build_object(
      'total', NEW.total,
      'metodoPago', (to_jsonb(NEW) ->> 'metodoPago'),
      'estado', NEW.estado,
      'source', 'db_trigger'
    ),
    (to_jsonb(NEW) ->> 'userId'),
    mask_audit_email(to_jsonb(NEW) ->> 'userEmail'),
    to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION insert_auditoria_event(
  p_accion text,
  p_entidad text,
  p_entidad_id text DEFAULT NULL,
  p_entidad_nombre text DEFAULT NULL,
  p_detalle jsonb DEFAULT NULL,
  p_usuario_uid text DEFAULT NULL,
  p_usuario_email text DEFAULT NULL,
  p_realizado_en text DEFAULT NULL
)
RETURNS auditoria
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_event auditoria;
BEGIN
  INSERT INTO auditoria (
    accion,
    entidad,
    "entidadId",
    "entidadNombre",
    detalle,
    "usuarioUid",
    "usuarioEmail",
    "realizadoEn"
  )
  VALUES (
    p_accion,
    p_entidad,
    p_entidad_id,
    sanitize_audit_entidad_nombre(p_entidad, p_entidad_id, p_entidad_nombre),
    redact_audit_detail_pii(p_detalle),
    p_usuario_uid,
    mask_audit_email(p_usuario_email),
    COALESCE(p_realizado_en, to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  )
  RETURNING * INTO created_event;

  RETURN created_event;
END;
$$;

NOTIFY pgrst, 'reload schema';
