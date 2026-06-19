# Guia Practica N 13 - Paso 1: clave privada para certificado Apple Development
# NO subas la clave al repositorio.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$signingDir = Join-Path $root "artifacts\signing"
$keyPath = Join-Path $signingDir "ios_development_private_key"

New-Item -ItemType Directory -Force -Path $signingDir | Out-Null

if (-not (Test-Path $keyPath)) {
    Write-Host "Generando clave RSA 2048 PEM..."
    ssh-keygen -t rsa -b 2048 -m PEM -f $keyPath -q -N '""'
}

$key = Get-Content -Raw -Path $keyPath
Set-Clipboard -Value $key

Write-Host ""
Write-Host "=== PASO 1 - Certificado Apple Development ===" -ForegroundColor Green
Write-Host ""
Write-Host "Clave privada:" $keyPath
Write-Host "Copiada al portapapeles."
Write-Host ""
Write-Host "En codemagic.io:"
Write-Host "  1. Team settings -> Environment variables"
Write-Host "     Nombre: CERTIFICATE_PRIVATE_KEY"
Write-Host "     Valor: pegar desde portapapeles"
Write-Host "     Marcar SECRET y Add"
Write-Host ""
Write-Host "  2. Team settings -> Team integrations -> Developer Portal"
Write-Host "     Conectar App Store Connect API con archivo p8, Issuer ID y Key ID"
Write-Host ""
Write-Host "  3. Team settings -> codemagic.yaml settings -> Code signing identities"
Write-Host "     pestaña iOS certificates -> Generate certificate"
Write-Host "     Reference name: calzatura-ios-development"
Write-Host "     Certificate type: Apple Development"
Write-Host "     Create certificate"
Write-Host ""
Write-Host "  4. iOS provisioning profiles -> Fetch profiles"
Write-Host "     Development para com.calzaturavilchez.calzaturaVilchezMobile"
Write-Host ""
Write-Host "Luego push codemagic.yaml y Start new build."
Write-Host ""
