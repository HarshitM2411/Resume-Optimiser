$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CertDir = Join-Path (Split-Path -Parent $ScriptDir) "nginx\certs"
New-Item -ItemType Directory -Force -Path $CertDir | Out-Null

$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) {
    throw "OpenSSL is required to generate development certificates."
}

& openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
    -keyout (Join-Path $CertDir "key.pem") `
    -out (Join-Path $CertDir "cert.pem") `
    -subj "/CN=localhost"

Write-Host "Generated self-signed certs in $CertDir"
