# Starts the installed Antigravity app with Proxyman proxy settings for local debugging.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-antigravity-with-proxyman.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-antigravity-with-proxyman.ps1 -Port 9090 -AllowInsecureTls
#
# Notes:
# - This script is intended for local debugging only.
# - It terminates existing Antigravity processes first so the new environment variables take effect.

[CmdletBinding()]
param(
    [int]$Port = 9090,
    [string]$ProxyHost = '127.0.0.1',
    [string]$AppPath = 'C:\Users\Administrator\AppData\Local\Programs\Antigravity\Antigravity.exe',
    [string]$CaPath = 'C:\Users\Administrator\AppData\Roaming\Proxyman\certificate\certs\ca.pem',
    [string]$NoProxy = 'localhost,127.0.0.1,::1',
    [switch]$AllowInsecureTls,
    [switch]$KeepExisting
)

$ErrorActionPreference = 'Stop'

function Write-ColorLine {
    param(
        [string]$Color,
        [string]$Message
    )

    Write-Host $Message -ForegroundColor $Color
}

function Info {
    param([string]$Message)

    Write-ColorLine -Color 'Cyan' -Message "[INFO] $Message"
}

function Success {
    param([string]$Message)

    Write-ColorLine -Color 'Green' -Message "[OK] $Message"
}

function Warn {
    param([string]$Message)

    Write-ColorLine -Color 'Yellow' -Message "[WARN] $Message"
}

function Fail {
    param([string]$Message)

    Write-ColorLine -Color 'Red' -Message "[ERROR] $Message"
    exit 1
}

$proxyUrl = "http://${ProxyHost}:${Port}"
$proxyBypassList = '<local>;localhost;127.0.0.1;::1'

if (-not (Test-Path -LiteralPath $AppPath)) {
    Fail "Antigravity executable not found: $AppPath"
}

if (-not (Test-Path -LiteralPath $CaPath)) {
    Fail "Proxyman CA file not found: $CaPath"
}

Info "Proxy URL: $proxyUrl"
Info "Antigravity path: $AppPath"
Info "CA path: $CaPath"

if (-not $KeepExisting) {
    $existingProcesses = Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue
    if ($existingProcesses) {
        Warn "Stopping existing Antigravity processes so the new proxy environment takes effect..."
        $existingProcesses | Stop-Process -Force
        Start-Sleep -Milliseconds 800
    } else {
        Info 'No running Antigravity process found.'
    }
} else {
    Warn 'KeepExisting enabled; existing Antigravity processes were not terminated.'
}

$env:HTTP_PROXY = $proxyUrl
$env:HTTPS_PROXY = $proxyUrl
$env:ALL_PROXY = $proxyUrl
$env:NO_PROXY = $NoProxy
$env:ELECTRON_PROXY_SERVER = $proxyUrl
$env:ELECTRON_PROXY_BYPASS_LIST = $proxyBypassList
$env:NODE_EXTRA_CA_CERTS = $CaPath

if ($AllowInsecureTls) {
    $env:NODE_TLS_REJECT_UNAUTHORIZED = '0'
    Warn 'NODE_TLS_REJECT_UNAUTHORIZED=0 is enabled for this launch. Use for debugging only.'
} else {
    Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
}

Info 'Starting Antigravity with Proxyman proxy settings...'
$process = Start-Process -FilePath $AppPath -ArgumentList @(
    "--proxy-server=$proxyUrl",
    "--proxy-bypass-list=$proxyBypassList"
) -WorkingDirectory (Split-Path -Parent $AppPath) -PassThru

Success "Antigravity started. PID: $($process.Id)"
Write-Host ''
Write-Host 'Environment used for this launch:' -ForegroundColor Gray
Write-Host "  HTTP_PROXY=$($env:HTTP_PROXY)" -ForegroundColor Gray
Write-Host "  HTTPS_PROXY=$($env:HTTPS_PROXY)" -ForegroundColor Gray
Write-Host "  NO_PROXY=$($env:NO_PROXY)" -ForegroundColor Gray
Write-Host "  NODE_EXTRA_CA_CERTS=$($env:NODE_EXTRA_CA_CERTS)" -ForegroundColor Gray
if ($AllowInsecureTls) {
    Write-Host '  NODE_TLS_REJECT_UNAUTHORIZED=0' -ForegroundColor Gray
}
Write-Host ''
Write-Host 'If Proxyman still does not show traffic, verify that no older Antigravity instance is still alive.' -ForegroundColor Gray
