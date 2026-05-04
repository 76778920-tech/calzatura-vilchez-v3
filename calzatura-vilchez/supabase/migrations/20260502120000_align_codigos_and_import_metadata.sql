-- Alinea el esquema con el cliente (products.ts, RPCs, AdminData).
-- Idempotente: seguro si parte de esto ya existía por SQL manual en el dashboard.

-- ─── 1. productoCodigos: actualizadoEn (upsert en app + INSERT en RPCs) ───────

ALTER TABLE "productoCodigos"
  ADD COLUMN IF NOT EXISTS "actualizadoEn" text;

UPDATE "productoCodigos"
SET "actualizadoEn" = to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
WHERE "actualizadoEn" IS NULL OR btrim("actualizadoEn") = '';

ALTER TABLE "productoCodigos"
  ALTER COLUMN "actualizadoEn" SET DEFAULT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

ALTER TABLE "productoCodigos"
  ALTER COLUMN "actualizadoEn" SET NOT NULL;

-- ─── 2–5. Metadatos de importación / datos de prueba (AdminData) ─────────────

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS "esDePrueba" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "importadoEn" text,
  ADD COLUMN IF NOT EXISTS "loteImportacion" text,
  ADD COLUMN IF NOT EXISTS "escenario" text;

ALTER TABLE "productoFinanzas"
  ADD COLUMN IF NOT EXISTS "esDePrueba" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "importadoEn" text,
  ADD COLUMN IF NOT EXISTS "loteImportacion" text,
  ADD COLUMN IF NOT EXISTS "escenario" text;

ALTER TABLE fabricantes
  ADD COLUMN IF NOT EXISTS "esDePrueba" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "importadoEn" text,
  ADD COLUMN IF NOT EXISTS "loteImportacion" text,
  ADD COLUMN IF NOT EXISTS "escenario" text;

ALTER TABLE "ventasDiarias"
  ADD COLUMN IF NOT EXISTS "esDePrueba" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "importadoEn" text,
  ADD COLUMN IF NOT EXISTS "loteImportacion" text,
  ADD COLUMN IF NOT EXISTS "escenario" text;
