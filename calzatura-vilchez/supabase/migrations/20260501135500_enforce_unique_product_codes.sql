-- Evita códigos duplicados en productoCodigos sin importar mayúsculas/minúsculas.
-- Si existe algún duplicado actual, este script falla intencionalmente para corregir datos primero.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT upper(trim(codigo)) AS normalized_code, count(*) AS total
      FROM "productoCodigos"
      GROUP BY upper(trim(codigo))
      HAVING count(*) > 1
    ) duplicated
  ) THEN
    RAISE EXCEPTION 'Hay códigos duplicados en "productoCodigos". Corrígelos antes de aplicar la restricción única.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_codigos_codigo_unique_ci
  ON "productoCodigos" (upper(trim(codigo)));
