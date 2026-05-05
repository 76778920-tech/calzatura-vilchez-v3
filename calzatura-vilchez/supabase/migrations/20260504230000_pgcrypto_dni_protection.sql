-- F-05: Protección del DNI en reposo (ISO 27001 A.8.24 — cifrado de datos PII)
-- Estrategia: hash SHA-256 del DNI para validación sin almacenar el valor en claro.
-- La columna `dni` queda para compatibilidad hasta que la capa de aplicación
-- migre completamente a `dni_hash`. El plan de eliminación de `dni` está en el
-- documento de operación y seguridad (documentacion/10-operacion-y-seguridad.md).

-- 1. Habilitar extensión de criptografía
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Columnas de hash en usuarios y fabricantes
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS dni_hash text;

ALTER TABLE fabricantes
  ADD COLUMN IF NOT EXISTS dni_hash text;

-- 3. Poblar hashes desde los datos existentes
UPDATE usuarios
SET dni_hash = encode(digest(trim(dni), 'sha256'), 'hex')
WHERE dni IS NOT NULL AND dni <> '' AND dni_hash IS NULL;

UPDATE fabricantes
SET dni_hash = encode(digest(trim(dni), 'sha256'), 'hex')
WHERE dni IS NOT NULL AND dni <> '' AND dni_hash IS NULL;

-- 4. Índice para búsqueda rápida por hash (sin exponer el DNI original)
CREATE INDEX IF NOT EXISTS idx_usuarios_dni_hash    ON usuarios    (dni_hash);
CREATE INDEX IF NOT EXISTS idx_fabricantes_dni_hash ON fabricantes (dni_hash);

-- 5. Función auxiliar reutilizable para la capa de aplicación
CREATE OR REPLACE FUNCTION hash_dni(p_dni text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT encode(digest(trim(p_dni), 'sha256'), 'hex');
$$;

-- 6. Vista que enmascara el DNI para consultas de solo lectura
CREATE OR REPLACE VIEW usuarios_seguro AS
SELECT
  uid, nombres, apellidos, nombre, email, rol,
  "creadoEn", telefono, direcciones,
  -- Muestra solo los últimos 4 dígitos del DNI para auditoría visual
  CASE
    WHEN dni IS NOT NULL AND length(trim(dni)) > 4
    THEN repeat('*', length(trim(dni)) - 4) || right(trim(dni), 4)
    ELSE '****'
  END AS dni_masked,
  dni_hash
FROM usuarios;

COMMENT ON VIEW usuarios_seguro IS
  'Vista de solo lectura: DNI enmascarado. Usar esta vista en reportes y auditorías.';
