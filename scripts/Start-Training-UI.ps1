$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (Get-NetTCPConnection -LocalPort 8675 -State Listen -ErrorAction SilentlyContinue) {
    Write-Host 'Port 8675 is already in use. If AI Toolkit is running, open http://localhost:8675.'
    exit 0
}

$python = Join-Path $repoRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    throw 'The toolkit is not installed yet. Run run_windows.bat from the repository root first.'
}

$env:HF_HOME = Join-Path $repoRoot '.cache\huggingface'
$env:UV_CACHE_DIR = Join-Path $repoRoot '.cache\uv'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $repoRoot '.uv\python'
$env:MODELS_PATH = Join-Path $repoRoot 'models'
$env:NEXT_TELEMETRY_DISABLED = '1'

$smi = Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue
if (-not $smi) {
    $driverSmi = Get-ChildItem -LiteralPath 'C:\Windows\System32\DriverStore\FileRepository' -Filter nvidia-smi.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($driverSmi) { $env:PATH = $driverSmi.DirectoryName + ';' + $env:PATH }
}

& $python -m manager launch --no-browser
exit $LASTEXITCODE
