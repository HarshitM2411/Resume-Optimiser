$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InfraDir = Split-Path -Parent $ScriptDir
$WorkDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_.FullName }

try {
    @"
\documentclass{article}
\begin{document}
Hello, Tectonic!
\end{document}
"@ | Set-Content -Path (Join-Path $WorkDir "minimal.tex") -Encoding UTF8

    docker compose -f (Join-Path $InfraDir "docker-compose.yml") run --rm `
        -v "${WorkDir}:/work" `
        --workdir /work `
        tectonic `
        /work/minimal.tex --outdir /work

    $PdfPath = Join-Path $WorkDir "minimal.pdf"
    if (-not (Test-Path $PdfPath)) {
        throw "Expected PDF was not produced."
    }

    $Header = [System.Text.Encoding]::ASCII.GetString((Get-Content -Path $PdfPath -Encoding Byte -TotalCount 5))
    if ($Header -ne "%PDF-") {
        throw "Output file is not a valid PDF."
    }

    Write-Host "Tectonic smoke test passed."
}
finally {
    Remove-Item -Recurse -Force $WorkDir -ErrorAction SilentlyContinue
}
