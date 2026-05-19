-- Citas psicológicas, notificaciones al trabajador y decisiones explícitas RR.HH.

CREATE TABLE IF NOT EXISTS "rrhh_citas" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "alertaId" text NOT NULL REFERENCES "rrhh_alertas"(id) ON DELETE CASCADE,
  "trabajadorUid" text NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  "psicologoUid" text NOT NULL REFERENCES usuarios(uid) ON DELETE RESTRICT,
  "psicologoEmail" text,
  "fechaCita" text NOT NULL,
  lugar text NOT NULL DEFAULT 'Consultorio / sala de evaluación',
  notas text,
  estado text NOT NULL DEFAULT 'programada'
    CHECK (estado IN ('programada','realizada','cancelada')),
  "creadoEn" text NOT NULL DEFAULT now()::text,
  "actualizadoEn" text NOT NULL DEFAULT now()::text
);

CREATE TABLE IF NOT EXISTS "rrhh_notificaciones" (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "destinatarioUid" text NOT NULL REFERENCES usuarios(uid) ON DELETE CASCADE,
  tipo text NOT NULL
    CHECK (tipo IN ('cita_psicologo','derivacion_rrhh','informe_disponible','decision_rrhh','general')),
  titulo text NOT NULL,
  mensaje text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  leida boolean NOT NULL DEFAULT false,
  "creadoEn" text NOT NULL DEFAULT now()::text
);

CREATE INDEX IF NOT EXISTS idx_rrhh_citas_alerta ON "rrhh_citas" ("alertaId");
CREATE INDEX IF NOT EXISTS idx_rrhh_citas_trabajador ON "rrhh_citas" ("trabajadorUid");
CREATE INDEX IF NOT EXISTS idx_rrhh_citas_fecha ON "rrhh_citas" ("fechaCita");
CREATE INDEX IF NOT EXISTS idx_rrhh_notif_dest ON "rrhh_notificaciones" ("destinatarioUid");
CREATE INDEX IF NOT EXISTS idx_rrhh_notif_leida ON "rrhh_notificaciones" (leida);

ALTER TABLE "rrhh_citas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rrhh_notificaciones" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_rrhh_citas" ON "rrhh_citas";
CREATE POLICY "service_role_all_rrhh_citas"
  ON "rrhh_citas" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_role_all_rrhh_notif" ON "rrhh_notificaciones";
CREATE POLICY "service_role_all_rrhh_notif"
  ON "rrhh_notificaciones" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE "rrhh_acciones" DROP CONSTRAINT IF EXISTS "rrhh_acciones_tipoAccion_check";
ALTER TABLE "rrhh_acciones"
  ADD CONSTRAINT "rrhh_acciones_tipoAccion_check"
  CHECK ("tipoAccion" IN (
    'capacitacion',
    'redistribucion_tareas',
    'derivacion_formal',
    'observacion',
    'cerrar_seguimiento',
    'continuar',
    'no_continuar'
  ));

NOTIFY pgrst, 'reload schema';
