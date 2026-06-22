#!/bin/sh
set -e
cd /app

if [ ! -f modulo-adecuacion-funcional-iso25010/dist/index.html ]; then
  echo "[dashboard-iso] Compilando módulo adecuación funcional (primera vez)..."
  cd modulo-adecuacion-funcional-iso25010
  if [ ! -d node_modules ]; then
    npm ci
  fi
  npm run build
  cd /app
fi

if [ ! -f dashboard-iso25000/stress/index.html ]; then
  echo "[dashboard-iso] Generando informe stress k6..."
  node scripts/generar_informe_stress_html.mjs || true
fi

exec node dashboard-iso25000/server.mjs
