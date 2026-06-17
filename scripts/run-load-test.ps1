# Ejecuta pruebas k6 con variables desde load-tests/config.env
param(
  [ValidateSet("smoke", "catalog", "mixed500", "mixed1000", "mixed2000")]
  [string]$Scenario = "smoke",
  [string]$ConfigFile = "load-tests/config.env",
  [string]$OutDir = "artifacts/load-tests",
  [switch]$SkipBff
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
  Write-Error "k6 no está instalado. Ver load-tests/README.md"
}

$configPath = Join-Path $repoRoot $ConfigFile
if (-not (Test-Path $configPath)) {
  $localEnv = Join-Path $repoRoot "calzatura-vilchez\.env.local"
  $rootEnv = Join-Path $repoRoot ".env"
  if (-not (Test-Path $localEnv)) {
    Write-Error "Falta $ConfigFile y calzatura-vilchez\.env.local"
  }
  Write-Host "Usando calzatura-vilchez\.env.local + .env (sin commitear config.env)"
  @($localEnv, $(if (Test-Path $rootEnv) { $rootEnv })) | Where-Object { $_ } | ForEach-Object {
    Get-Content $_ | ForEach-Object {
      $line = $_.Trim()
      if (-not $line -or $line.StartsWith("#")) { return }
      $eq = $line.IndexOf("=")
      if ($eq -lt 1) { return }
      $name = $line.Substring(0, $eq).Trim()
      $value = $line.Substring($eq + 1).Trim()
      Set-Item -Path "Env:$name" -Value $value
    }
  }
  $env:SUPABASE_URL = if ($env:VITE_SUPABASE_URL) { $env:VITE_SUPABASE_URL } else { $env:SUPABASE_URL }
  $env:SUPABASE_ANON_KEY = if ($env:VITE_SUPABASE_ANON_KEY) { $env:VITE_SUPABASE_ANON_KEY } else { $env:SUPABASE_ANON_KEY }
  $env:BFF_BASE_URL = if ($env:VITE_BACKEND_API_URL) { $env:VITE_BACKEND_API_URL } else { $env:BFF_BASE_URL }
  $env:AI_SERVICE_URL = if ($env:VITE_AI_SERVICE_URL) { $env:VITE_AI_SERVICE_URL } else { $env:AI_SERVICE_URL }
  $env:HOSTING_URL = if ($env:HOSTING_URL) { $env:HOSTING_URL } else { "https://calzaturavilchez-ab17f.web.app" }
  if (-not $env:LOAD_ENV) { $env:LOAD_ENV = "production" }
  if (-not $env:ALLOW_PROD_LOAD) { $env:ALLOW_PROD_LOAD = "true" }
} else {
Get-Content $configPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $eq = $line.IndexOf("=")
  if ($eq -lt 1) { return }
  $name = $line.Substring(0, $eq).Trim()
  $value = $line.Substring($eq + 1).Trim()
  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  Set-Item -Path "Env:$name" -Value $value
}
}

if ($SkipBff) {
  $env:BFF_BASE_URL = ""
  $env:VITE_BACKEND_API_URL = ""
  Write-Host "SkipBff: lecturas solo Supabase (sin hammer BFF Render)"
}

$scriptMap = @{
  smoke      = "load-tests/scenarios/smoke-read.js"
  catalog    = "load-tests/scenarios/read-catalog-stress.js"
  mixed500   = "load-tests/scenarios/read-mixed-500.js"
  mixed1000  = "load-tests/scenarios/read-mixed-1000.js"
  mixed2000  = "load-tests/scenarios/read-mixed-2000.js"
}

$k6Script = $scriptMap[$Scenario]
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$summary = Join-Path $OutDir "k6-$Scenario-$timestamp.json"

Write-Host "Escenario: $Scenario"
Write-Host "Script: $k6Script"
Write-Host "LOAD_ENV=$env:LOAD_ENV ALLOW_PROD_LOAD=$env:ALLOW_PROD_LOAD"
Write-Host "Resumen: $summary"

k6 run $k6Script --summary-export $summary
exit $LASTEXITCODE
