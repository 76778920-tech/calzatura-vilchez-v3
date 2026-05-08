-- Mantiene sincronizado el admin de productos cuando cambian producto, codigo o finanzas.
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

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'productoCodigos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "productoCodigos";
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'productoFinanzas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "productoFinanzas";
  END IF;
END $$;
