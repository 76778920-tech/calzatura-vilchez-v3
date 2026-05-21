-- Auditoria protegida: acceso directo solo para service_role/BFF.
-- Los triggers SECURITY DEFINER existentes siguen pudiendo insertar eventos internos.

ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE auditoria FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE auditoria TO service_role;

DROP POLICY IF EXISTS "service_role_all_auditoria" ON auditoria;
CREATE POLICY "service_role_all_auditoria"
  ON auditoria
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

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
    p_entidad_nombre,
    p_detalle,
    p_usuario_uid,
    p_usuario_email,
    COALESCE(p_realizado_en, to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  )
  RETURNING * INTO created_event;

  RETURN created_event;
END;
$$;

CREATE OR REPLACE FUNCTION list_auditoria_events(
  p_limit integer DEFAULT 100,
  p_entidad text DEFAULT NULL,
  p_entidad_id text DEFAULT NULL,
  p_desde text DEFAULT NULL,
  p_hasta text DEFAULT NULL
)
RETURNS SETOF auditoria
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM auditoria
  WHERE (p_entidad IS NULL OR entidad = p_entidad)
    AND (p_entidad_id IS NULL OR "entidadId" = p_entidad_id)
    AND (p_desde IS NULL OR "realizadoEn" >= p_desde)
    AND (p_hasta IS NULL OR "realizadoEn" <= p_hasta)
  ORDER BY "realizadoEn" DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
$$;

REVOKE ALL ON FUNCTION insert_auditoria_event(text, text, text, text, jsonb, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION list_auditoria_events(integer, text, text, text, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION insert_auditoria_event(text, text, text, text, jsonb, text, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION list_auditoria_events(integer, text, text, text, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
