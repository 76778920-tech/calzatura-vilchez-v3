-- Tabla de movimientos de stock: registra cada ingreso de mercancía,
-- ajuste manual o devolución de proveedor.
-- Permite al modelo IA calcular sell-through, detectar agotamientos reales
-- y distinguir stock muerto de demanda censurada.

CREATE TABLE "movimientosStock" (
  id             UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "productId"    TEXT         NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo           TEXT         NOT NULL CHECK (tipo IN ('ingreso', 'ajuste', 'devolucion_proveedor')),
  fecha          DATE         NOT NULL DEFAULT CURRENT_DATE,
  "tallaStock"   JSONB        NOT NULL DEFAULT '{}',
  cantidad       INTEGER      NOT NULL CHECK (cantidad > 0),
  "costoUnitario" NUMERIC(10,2),
  proveedor      TEXT,
  observaciones  TEXT,
  "registradoPor" TEXT,
  "creadoEn"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimientos_stock_producto ON "movimientosStock" ("productId");
CREATE INDEX idx_movimientos_stock_fecha    ON "movimientosStock" (fecha);

-- RLS: solo usuarios autenticados (admin) tienen acceso.
-- anon no puede leer ni escribir movimientos de stock.
ALTER TABLE "movimientosStock" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all_movimientosStock"
  ON "movimientosStock"
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
