-- Remove out-of-scope HR / psychology workflow objects from the product.
-- Historical migrations remain in the repository for already-applied environments;
-- this migration is the forward cleanup for production and fresh resets.

BEGIN;

-- Internal staff roles are collapsed to the remaining operational role before
-- tightening the role constraint. Admin and customer accounts are preserved.
UPDATE public.usuarios
SET rol = 'trabajador'
WHERE rol IN ('psicologo', 'rrhh');

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('cliente', 'trabajador', 'admin'));

-- Supabase Storage blocks direct DELETE on storage.objects/storage.buckets.
-- Remove the bucket `rrhh-informes` with the Storage API or Dashboard after
-- this migration. The application no longer references that bucket.

-- Remove workflow tables and dependent policies/triggers/indexes.
DROP TABLE IF EXISTS public.rrhh_notificaciones CASCADE;
DROP TABLE IF EXISTS public.rrhh_citas CASCADE;
DROP TABLE IF EXISTS public.rrhh_acciones CASCADE;
DROP TABLE IF EXISTS public.rrhh_informes_psicologicos CASCADE;
DROP TABLE IF EXISTS public.rrhh_alertas CASCADE;
DROP TABLE IF EXISTS public.rrhh_metas_mensuales CASCADE;

COMMIT;
