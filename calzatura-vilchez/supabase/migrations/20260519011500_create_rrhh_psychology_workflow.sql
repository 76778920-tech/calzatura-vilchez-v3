-- Flujo temporal pero funcional para trabajador, psicologo y RR.HH.

ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_rol_check
  CHECK (rol IN ('cliente','trabajador','psicologo','rrhh','admin'));

CREATE TABLE IF NOT EXISTS "rrhh_metas_mensuales" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "trabajadorUid" text NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  "trabajadorNombre" text NOT NULL,
  "trabajadorEmail" text,
  periodo text NOT NULL,
  "metaVentas" numeric NOT NULL DEFAULT 3500,
  "metaPedidos" integer NOT NULL DEFAULT 20,
  "creadoPorUid" text,
  "creadoPorEmail" text,
  "actualizadoEn" text NOT NULL DEFAULT now()::text,
  UNIQUE ("trabajadorUid", periodo)
);

CREATE TABLE IF NOT EXISTS "rrhh_alertas" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "trabajadorUid" text NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  "trabajadorNombre" text NOT NULL,
  "trabajadorEmail" text,
  periodo text NOT NULL,
  tipo text NOT NULL DEFAULT 'rendimiento_bajo'
    CHECK (tipo IN ('rendimiento_bajo','seguimiento','manual')),
  "motivoGeneral" text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente_psicologo'
    CHECK (estado IN ('pendiente_psicologo','evaluada','accion_rrhh','cerrada')),
  metricas jsonb NOT NULL DEFAULT '{}'::jsonb,
  "creadoPorUid" text,
  "creadoPorEmail" text,
  "creadoEn" text NOT NULL DEFAULT now()::text,
  "actualizadoEn" text NOT NULL DEFAULT now()::text,
  UNIQUE ("trabajadorUid", periodo, tipo)
);

CREATE TABLE IF NOT EXISTS "rrhh_informes_psicologicos" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "alertaId" text NOT NULL REFERENCES "rrhh_alertas"(id) ON DELETE CASCADE,
  "trabajadorUid" text NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  periodo text NOT NULL,
  "psicologoUid" text NOT NULL REFERENCES usuarios(uid) ON DELETE RESTRICT,
  "psicologoEmail" text,
  resumen text NOT NULL,
  recomendacion text NOT NULL,
  "pdfPath" text NOT NULL,
  "pdfNombre" text NOT NULL,
  "creadoEn" text NOT NULL DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS "rrhh_acciones" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "alertaId" text NOT NULL REFERENCES "rrhh_alertas"(id) ON DELETE CASCADE,
  "trabajadorUid" text NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  "tipoAccion" text NOT NULL
    CHECK ("tipoAccion" IN ('capacitacion','redistribucion_tareas','derivacion_formal','observacion','cerrar_seguimiento')),
  descripcion text NOT NULL,
  "responsableUid" text NOT NULL REFERENCES usuarios(uid) ON DELETE RESTRICT,
  "responsableEmail" text,
  "creadoEn" text NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_rrhh_metas_periodo ON "rrhh_metas_mensuales" (periodo);
CREATE INDEX IF NOT EXISTS idx_rrhh_alertas_estado ON "rrhh_alertas" (estado);
CREATE INDEX IF NOT EXISTS idx_rrhh_alertas_periodo ON "rrhh_alertas" (periodo);
CREATE INDEX IF NOT EXISTS idx_rrhh_alertas_trabajador ON "rrhh_alertas" ("trabajadorUid");
CREATE INDEX IF NOT EXISTS idx_rrhh_informes_alerta ON "rrhh_informes_psicologicos" ("alertaId");
CREATE INDEX IF NOT EXISTS idx_rrhh_acciones_alerta ON "rrhh_acciones" ("alertaId");

ALTER TABLE "rrhh_metas_mensuales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rrhh_alertas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rrhh_informes_psicologicos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rrhh_acciones" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_rrhh_metas" ON "rrhh_metas_mensuales";
CREATE POLICY "service_role_all_rrhh_metas"
  ON "rrhh_metas_mensuales" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_rrhh_alertas" ON "rrhh_alertas";
CREATE POLICY "service_role_all_rrhh_alertas"
  ON "rrhh_alertas" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_rrhh_informes" ON "rrhh_informes_psicologicos";
CREATE POLICY "service_role_all_rrhh_informes"
  ON "rrhh_informes_psicologicos" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_rrhh_acciones" ON "rrhh_acciones";
CREATE POLICY "service_role_all_rrhh_acciones"
  ON "rrhh_acciones" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rrhh-informes', 'rrhh-informes', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

NOTIFY pgrst, 'reload schema';
