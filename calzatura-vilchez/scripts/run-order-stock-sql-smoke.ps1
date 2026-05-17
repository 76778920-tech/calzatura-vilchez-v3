# Verifica en Postgres local (Docker) que las RPC de pedidos compilan y funcionan.
$ErrorActionPreference = "Stop"
$container = "cv-order-stock-pg"
$port = "54333"
$root = Split-Path -Parent $PSScriptRoot

function Wait-Postgres {
  for ($i = 0; $i - 30; $i++) {
    docker exec $container pg_isready -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 1
  }
  throw "Postgres no respondió a tiempo"
}

docker rm -f $container 2>$null | Out-Null
docker run -d --name $container -e POSTGRES_PASSWORD=postgres -p "${port}:5432" postgres:16-alpine | Out-Null
Wait-Postgres

$init = @"
CREATE TABLE productos (
  id text PRIMARY KEY,
  nombre text NOT NULL DEFAULT '',
  stock integer NOT NULL DEFAULT 0,
  "tallaStock" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "colorStock" jsonb NOT NULL DEFAULT '{}'::jsonb,
  color text,
  tallas jsonb NOT NULL DEFAULT '[]'::jsonb,
  precio numeric NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT '',
  "tipoCalzado" text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true
);
CREATE TABLE pedidos (
  id text PRIMARY KEY,
  estado text NOT NULL DEFAULT 'pendiente',
  "stockDescontadoEn" text,
  "stockRestauradoEn" text
);
"@
$init | docker exec -i $container psql -U postgres -v ON_ERROR_STOP=1 -f - | Out-Null

$migrations = @(
  "20260516120000_order_stock_atomic_rpc.sql",
  "20260516130000_order_stock_restore_rpc.sql"
)
foreach ($m in $migrations) {
  $path = Join-Path $root "supabase\migrations\$m"
  Get-Content $path -Raw | docker exec -i $container psql -U postgres -v ON_ERROR_STOP=1 -f - | Out-Null
}

Get-Content (Join-Path $root "scripts\sql\order_stock_rpc_smoke.sql") -Raw |
  docker exec -i $container psql -U postgres -v ON_ERROR_STOP=1 -f -

docker rm -f $container | Out-Null
Write-Host "order_stock_rpc_smoke: PASS"
