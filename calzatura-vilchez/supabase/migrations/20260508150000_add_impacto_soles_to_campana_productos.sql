-- Agrega impacto económico por producto en campañas detectadas.
-- Calculado en models/campaign.py (_compute_product_uplift) y
-- persistido por main.py junto con los demás campos del top producto.
ALTER TABLE campana_productos
  ADD COLUMN IF NOT EXISTS impacto_soles NUMERIC;
