# Ejecuta pruebas k6 con variables desde load-tests/config.env
param(
  [ValidateSet("smoke", "catalog", "mixed500", "mixed1000", "mixed2000")]
  [string]$Scenario = "smoke",
  [string]$ConfigFile = "load-tests/config.env",
  [string]$OutDir = "artifacts/load-tests",
  [switch]$SkipBff,
  [switch]$StartLocalBff
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

function Ensure-BffEnvForLocal {
  if (-not $env:SUPABASE_URL -and $env:VITE_SUPABASE_URL) { $env:SUPABASE_URL = $env:VITE_SUPABASE_URL }
  if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Error "Falta SUPABASE_SERVICE_ROLE_KEY (raíz .env) para BFF local"
  }
  if (-not $env:LOAD_TEST_TOKEN) {
    $env:LOAD_TEST_TOKEN = [guid]::NewGuid().ToString()
    Write-Host "LOAD_TEST_TOKEN generado para bypass rate-limit en BFF local"
  }
}

$bffProc = $null
if ($StartLocalBff) {
  Ensure-BffEnvForLocal
  $env:BFF_BASE_URL = "http://127.0.0.1:8787"
  $env:VITE_BACKEND_API_URL = $env:BFF_BASE_URL
  $env:LOAD_ENV = "local"
  $env:PORT = "8787"
  $bffDir = Join-Path $repoRoot "calzatura-vilchez\bff"
  Write-Host "Iniciando BFF local en $env:BFF_BASE_URL (LOAD_TEST_TOKEN activo)"
  $bffProc = Start-Process -FilePath "node" -ArgumentList "server.cjs" -WorkingDirectory $bffDir -PassThru -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(45)
  $ready = $false
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri "$($env:BFF_BASE_URL)/health" -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 2 }
  }
  if (-not $ready) {
    if ($bffProc -and -not $bffProc.HasExited) { Stop-Process -Id $bffProc.Id -Force -ErrorAction SilentlyContinue }
    Write-Error "BFF local no respondió en /health"
  }
  Write-Host "BFF local listo"
} elseif (-not $SkipBff -and $env:BFF_BASE_URL -and $env:LOAD_TEST_TOKEN) {
  Write-Host "LOAD_TEST_TOKEN: bypass rate-limit si el BFF remoto lo tiene configurado"
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

try {
  k6 run $k6Script --summary-export $summary
  $code = $LASTEXITCODE
} finally {
  if ($bffProc -and -not $bffProc.HasExited) {
    Stop-Process -Id $bffProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host "BFF local detenido"
  }
}
exit $code
