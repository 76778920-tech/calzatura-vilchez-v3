-- Habilitar Supabase Realtime para la tabla productos
-- Permite que la app móvil reciba cambios en tiempo real sin hacer polling
ALTER PUBLICATION supabase_realtime ADD TABLE productos;
