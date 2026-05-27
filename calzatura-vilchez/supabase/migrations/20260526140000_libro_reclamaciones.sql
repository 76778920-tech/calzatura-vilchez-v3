-- Libro de reclamaciones (Ley N.° 29571). Acceso solo vía BFF con service_role.
CREATE TABLE IF NOT EXISTS libro_reclamaciones (
  codigo            text PRIMARY KEY,
  tipo              text NOT NULL CHECK (tipo IN ('reclamo', 'queja')),
  canal             text NOT NULL DEFAULT 'web' CHECK (canal IN ('web', 'whatsapp', 'tienda')),
  nombres           text NOT NULL,
  apellidos         text NOT NULL,
  dni               text NOT NULL,
  domicilio         text NOT NULL,
  telefono          text NOT NULL,
  email             text NOT NULL,
  "bienContratado"  text NOT NULL,
  monto             text,
  "numeroPedido"    text,
  detalle           text NOT NULL,
  estado            text NOT NULL DEFAULT 'recibido'
    CHECK (estado IN ('recibido', 'en_tramite', 'respondido', 'cerrado')),
  "notasInternas"   text,
  "ipHash"          text,
  "creadoEn"        text NOT NULL,
  "actualizadoEn"   text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_libro_reclamaciones_estado ON libro_reclamaciones (estado);
CREATE INDEX IF NOT EXISTS idx_libro_reclamaciones_creado ON libro_reclamaciones ("creadoEn" DESC);
CREATE INDEX IF NOT EXISTS idx_libro_reclamaciones_email ON libro_reclamaciones (email);

ALTER TABLE libro_reclamaciones ENABLE ROW LEVEL SECURITY;
