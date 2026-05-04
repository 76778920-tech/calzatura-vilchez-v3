-- Schema completo de Calzatura Vilchez
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. productos
CREATE TABLE IF NOT EXISTS productos (
  id             text PRIMARY KEY,
  nombre         text NOT NULL,
  precio         numeric NOT NULL DEFAULT 0,
  descripcion    text,
  imagen         text,
  imagenes       jsonb,
  stock          integer NOT NULL DEFAULT 0,
  categoria      text,
  "tipoCalzado"  text,
  tallas         jsonb,
  "tallaStock"   jsonb,
  marca          text,
  material       text,
  estilo         text,
  color          text,
  "familiaId"    text,
  destacado      boolean NOT NULL DEFAULT false,
  descuento      integer CHECK (descuento IS NULL OR descuento IN (10, 20, 30)),
  campana        text,
  "esDePrueba"   boolean NOT NULL DEFAULT false,
  "importadoEn"  text,
  "loteImportacion" text,
  escenario      text
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria   ON productos (categoria);
CREATE INDEX IF NOT EXISTS idx_productos_familia_id  ON productos ("familiaId");
CREATE INDEX IF NOT EXISTS idx_productos_destacado   ON productos (destacado);

-- 2. productoCodigos
CREATE TABLE IF NOT EXISTS "productoCodigos" (
  "productoId"     text PRIMARY KEY,
  codigo           text NOT NULL,
  "actualizadoEn"  text NOT NULL DEFAULT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- 3. productoFinanzas
CREATE TABLE IF NOT EXISTS "productoFinanzas" (
  "productId"      text PRIMARY KEY,
  "costoCompra"    numeric NOT NULL DEFAULT 0,
  "margenMinimo"   numeric NOT NULL DEFAULT 25,
  "margenObjetivo" numeric NOT NULL DEFAULT 45,
  "margenMaximo"   numeric NOT NULL DEFAULT 75,
  "precioMinimo"   numeric NOT NULL DEFAULT 0,
  "precioSugerido" numeric NOT NULL DEFAULT 0,
  "precioMaximo"   numeric NOT NULL DEFAULT 0,
  "actualizadoEn"  text NOT NULL,
  "esDePrueba"     boolean NOT NULL DEFAULT false,
  "importadoEn"    text,
  "loteImportacion" text,
  escenario        text
);

-- 4. ventasDiarias
CREATE TABLE IF NOT EXISTS "ventasDiarias" (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "productId"       text NOT NULL,
  codigo            text,
  nombre            text,
  color             text,
  talla             text,
  fecha             text NOT NULL,
  cantidad          integer NOT NULL DEFAULT 1,
  "precioVenta"     numeric NOT NULL DEFAULT 0,
  total             numeric NOT NULL DEFAULT 0,
  "costoUnitario"   numeric NOT NULL DEFAULT 0,
  "costoTotal"      numeric NOT NULL DEFAULT 0,
  ganancia          numeric NOT NULL DEFAULT 0,
  "documentoTipo"   text CHECK ("documentoTipo" IS NULL OR "documentoTipo" IN ('ninguno','nota_venta','guia_remision')),
  "documentoNumero" text,
  cliente           jsonb,
  devuelto          boolean NOT NULL DEFAULT false,
  "motivoDevolucion" text,
  "devueltoEn"      text,
  "creadoEn"        text NOT NULL,
  "esDePrueba"      boolean NOT NULL DEFAULT false,
  "importadoEn"     text,
  "loteImportacion" text,
  escenario         text
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha      ON "ventasDiarias" (fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_product_id ON "ventasDiarias" ("productId");

-- 5. usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  uid          text PRIMARY KEY,
  dni          text,
  nombres      text,
  apellidos    text,
  nombre       text NOT NULL,
  email        text NOT NULL,
  rol          text NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente','trabajador','admin')),
  "creadoEn"   text NOT NULL,
  telefono     text,
  direcciones  jsonb
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- 6. pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id                text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"          text NOT NULL,
  "userEmail"       text NOT NULL,
  items             jsonb NOT NULL,
  subtotal          numeric NOT NULL DEFAULT 0,
  envio             numeric NOT NULL DEFAULT 0,
  total             numeric NOT NULL DEFAULT 0,
  estado            text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagado','enviado','entregado','cancelado')),
  direccion         jsonb NOT NULL,
  "creadoEn"        text NOT NULL,
  "stripeSessionId" text,
  "metodoPago"      text NOT NULL,
  notas             text
);

CREATE INDEX IF NOT EXISTS idx_pedidos_user_id  ON pedidos ("userId");
CREATE INDEX IF NOT EXISTS idx_pedidos_estado   ON pedidos (estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_creado   ON pedidos ("creadoEn");

-- 7. favoritos
CREATE TABLE IF NOT EXISTS favoritos (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     text NOT NULL,
  "productId"  text NOT NULL,
  "creadoEn"   text NOT NULL,
  UNIQUE ("userId", "productId")
);

CREATE INDEX IF NOT EXISTS idx_favoritos_user ON favoritos ("userId");

-- 8. fabricantes
CREATE TABLE IF NOT EXISTS fabricantes (
  id                    text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dni                   text,
  nombres               text NOT NULL,
  apellidos             text NOT NULL,
  marca                 text NOT NULL,
  telefono              text,
  "ultimoIngresoFecha"  text,
  "ultimoIngresoMonto"  numeric,
  documentos            jsonb,
  observaciones         text,
  activo                boolean NOT NULL DEFAULT true,
  "creadoEn"            text NOT NULL,
  "actualizadoEn"       text NOT NULL,
  "esDePrueba"          boolean NOT NULL DEFAULT false,
  "importadoEn"         text,
  "loteImportacion"     text,
  escenario             text
);

CREATE INDEX IF NOT EXISTS idx_fabricantes_marca  ON fabricantes (marca);
CREATE INDEX IF NOT EXISTS idx_fabricantes_activo ON fabricantes (activo);

-- 9. auditoria
CREATE TABLE IF NOT EXISTS auditoria (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  accion          text NOT NULL,
  entidad         text NOT NULL,
  "entidadId"     text,
  "entidadNombre" text,
  detalle         jsonb,
  "usuarioUid"    text,
  "usuarioEmail"  text,
  "realizadoEn"   text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auditoria_realizado ON auditoria ("realizadoEn" DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad   ON auditoria (entidad);
