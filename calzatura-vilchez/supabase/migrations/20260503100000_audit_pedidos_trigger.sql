-- Trigger delgado de auditoría: SOLO INSERT en pedidos
--
-- Por qué solo INSERT (no UPDATE):
--   - Cambios de estado vía admin React  → logAudit() en orders.ts (aplicación)
--   - Cambio a "pagado" vía Stripe webhook → logAuditFn() en functions/index.js
--   Un trigger en UPDATE duplicaría esos registros.
--
-- Por qué INSERT vía trigger (no vía Functions):
--   - createOrder en Cloud Functions inserta en pedidos pero no tiene sesión React.
--   - El trigger captura ese INSERT con source="db_trigger" y obtiene userId/userEmail
--     de la fila recién insertada.
--   - Si en el futuro una inserción directa en BD (bypass total) ocurre, también queda auditada.
--
-- Resultado: un único registro en auditoria por cada pedido creado, sin duplicados.
--
-- ADVERTENCIA — semántica "auditoría obligatoria":
--   A diferencia de logAudit() en React (best-effort, fallo silencioso), un fallo en este
--   trigger revierte también el INSERT en pedidos. Es el comportamiento correcto para el
--   checkout: si no se puede auditar, el pedido no se crea y Stripe puede reintentar.
--   CONSECUENCIA: no añadir FKs rígidos, CHECKs estrictos ni dependencias externas en la
--   tabla auditoria que puedan fallar durante el checkout (p. ej. FK a usuarios.uid).

CREATE OR REPLACE FUNCTION fn_audit_pedido_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Columnas en orden físico de auditoria; camelCase de pedidos vía to_jsonb(NEW) (sin "..." en SQL).
  INSERT INTO auditoria VALUES (
    DEFAULT,
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
    (to_jsonb(NEW) ->> 'userEmail'),
    to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  RETURN NEW;
END;
$$;

-- Recrear el trigger para que el CREATE OR REPLACE de la función quede vinculado.
DROP TRIGGER IF EXISTS trg_audit_pedido_insert ON pedidos;

CREATE TRIGGER trg_audit_pedido_insert
  AFTER INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_pedido_insert();
