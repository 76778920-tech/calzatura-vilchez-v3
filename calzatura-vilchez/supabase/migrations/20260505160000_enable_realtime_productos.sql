-- Habilitar Supabase Realtime para la tabla productos
-- Permite que la app móvil reciba cambios en tiempo real sin hacer polling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'productos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE productos;
  END IF;
END $$;
