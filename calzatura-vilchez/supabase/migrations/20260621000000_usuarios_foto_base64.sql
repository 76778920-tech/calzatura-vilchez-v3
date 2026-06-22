-- Agrega columna para foto de perfil almacenada como base64
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS "fotoBase64" TEXT DEFAULT NULL;
