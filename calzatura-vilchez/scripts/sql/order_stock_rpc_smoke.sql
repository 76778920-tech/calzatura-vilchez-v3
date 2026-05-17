-- Smoke test manual (SQL Editor o psql tras aplicar migraciones 20260516120000 y 20260516130000).
-- Esperado: NOTICE stock_ok al final; si falla, ver mensaje de excepción.

BEGIN;

INSERT INTO productos (id, nombre, stock, "tallaStock", "colorStock", color, tallas, precio, categoria, "tipoCalzado", activo)
VALUES (
  'smoke-p1',
  'Zapato smoke',
  10,
  '{"38": 5, "39": 5}'::jsonb,
  '{"Negro": {"38": 3, "39": 2}}'::jsonb,
  'Negro',
  '["38","39"]'::jsonb,
  100,
  'hombre',
  'zapato',
  true
)
ON CONFLICT (id) DO UPDATE SET
  stock = 10,
  "tallaStock" = '{"38": 5, "39": 5}'::jsonb,
  "colorStock" = '{"Negro": {"38": 3, "39": 2}}'::jsonb;

SELECT decrement_order_stock(
  jsonb_build_array(
    jsonb_build_object('productId', 'smoke-p1', 'talla', '38', 'color', 'Negro', 'cantidad', 2)
  )
);

SELECT stock, "colorStock"->'Negro'->>'38' AS negro_38
FROM productos WHERE id = 'smoke-p1';
-- Esperado: stock 8, negro_38 = 1

SELECT restore_order_stock(
  jsonb_build_array(
    jsonb_build_object('productId', 'smoke-p1', 'talla', '38', 'color', 'Negro', 'cantidad', 2)
  )
);

SELECT stock, "colorStock"->'Negro'->>'38' AS negro_38
FROM productos WHERE id = 'smoke-p1';
-- Esperado: stock 10, negro_38 = 3

ROLLBACK;

DO $$ BEGIN RAISE NOTICE 'order_stock_rpc_smoke: OK (transacción revertida)'; END $$;
