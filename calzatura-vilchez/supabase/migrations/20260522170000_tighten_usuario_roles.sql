-- Enforce operational usuario roles and drop deprecated workflow tables if present.
-- Idempotent: safe on fresh installs and on databases that already ran legacy modules.

BEGIN;

UPDATE public.usuarios
SET rol = 'trabajador'
WHERE rol NOT IN ('cliente', 'trabajador', 'admin');

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('cliente', 'trabajador', 'admin'));

DO $$
DECLARE
  legacy record;
BEGIN
  FOR legacy IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE 'rrhh\_%' ESCAPE '\'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', legacy.tablename);
  END LOOP;
END $$;

COMMIT;
