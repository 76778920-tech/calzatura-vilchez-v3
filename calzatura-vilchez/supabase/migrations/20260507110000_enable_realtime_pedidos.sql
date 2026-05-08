-- Habilitar Supabase Realtime para la tabla pedidos
-- Permite que la web reciba nuevos pedidos y cambios de estado en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
