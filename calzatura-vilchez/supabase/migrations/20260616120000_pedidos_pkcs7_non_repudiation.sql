-- No repudio criptográfico (PKCS#7) en pedidos — ISO/IEC 25010 Seguridad
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS "nrPayloadHash" text,
  ADD COLUMN IF NOT EXISTS "nrPkcs7Signature" text,
  ADD COLUMN IF NOT EXISTS "nrSignedAt" text,
  ADD COLUMN IF NOT EXISTS "nrSignatureVersion" text;

COMMENT ON COLUMN pedidos."nrPayloadHash" IS 'SHA-256 hex del payload canónico firmado';
COMMENT ON COLUMN pedidos."nrPkcs7Signature" IS 'Firma PKCS#7 (PEM) del payload del pedido';
COMMENT ON COLUMN pedidos."nrSignedAt" IS 'Timestamp ISO de la última firma';
COMMENT ON COLUMN pedidos."nrSignatureVersion" IS 'Versión del esquema de firma (actual: 1)';
