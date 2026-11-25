# Sangeet Local - Mobile Data Internet Tunnel Runner
$ErrorActionPreference = "Stop"

$ProjectDir = $PSScriptRoot
$ToolsDir = Join-Path $ProjectDir "tools"
$Cloudflared = Join-Path $ToolsDir "cloudflared.exe"
$LogFile = Join-Path $ToolsDir "tunnel_live.log"

# 1. Verify cloudflared exists
if (-not (Test-Path $Cloudflared)) {
    Write-Host "cloudflared.exe not found! Downloading..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $Cloudflared -UseBasicParsing
}

# 2. Check if local music server is running on port 8080
$serverRunning = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 8080)
    $tcp.Close()
    $serverRunning = $true
} catch {
    $serverRunning = $false
}

if (-not $serverRunning) {
    Write-Host "Starting local music server daemon on port 8080..." -ForegroundColor Cyan
    $serverScript = Join-Path $ProjectDir "server.ps1"
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$serverScript`" -Port 8080" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# Clear previous log
if (Test-Path $LogFile) { Remove-Item $LogFile -Force -ErrorAction SilentlyContinue }

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  🎵 SANGEET LOCAL - MOBILE DATA INTERNET STREAMING" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  Requesting your free worldwide link for Mobile Data (4G / 5G)..." -ForegroundColor Yellow
Write-Host "  Please wait 5-10 seconds..." -ForegroundColor Gray

$proc = Start-Process -FilePath $Cloudflared -ArgumentList "tunnel --url http://localhost:8080" -PassThru -RedirectStandardError $LogFile -WindowStyle Hidden

$tunnelUrl = $null
for ($i = 0; $i -lt 35; $i++) {
    Start-Sleep -Milliseconds 1000
    if (Test-Path $LogFile) {
        $content = Get-Content $LogFile -Raw -ErrorAction SilentlyContinue
        if ($content) {
            $m = [regex]::Match($content, 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
            if ($m.Success) {
                $tunnelUrl = $m.Value
                break
            }
        }
    }
    Write-Host "." -NoNewline -ForegroundColor Green
}
Write-Host ""

if ($tunnelUrl) {
    try { Set-Clipboard -Value $tunnelUrl } catch {}

    Clear-Host
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host "  🎵 SANGEET LOCAL IS LIVE ON MOBILE DATA (4G / 5G / ANYWHERE)" -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Open this link on your phone (Chrome / Safari / Firefox):" -ForegroundColor White
    Write-Host ""
    Write-Host "  👉  $tunnelUrl" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  (Link has been copied to your PC clipboard automatically!)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor DarkGray
    Write-Host "  ✅ Works on Mobile Data (Jio, Airtel, Vi, 4G, 5G)" -ForegroundColor Green
    Write-Host "  ✅ No home Wi-Fi needed on your phone" -ForegroundColor Green
    Write-Host "  ✅ 100% Free & Unlimited Audio Streaming" -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor DarkGray
    Write-Host "  Keep this window open while listening on mobile." -ForegroundColor White
    Write-Host "  Press Ctrl+C to stop the connection." -ForegroundColor DarkGray
    Write-Host "================================================================================" -ForegroundColor DarkGray
    Write-Host ""

    # Monitor until process exits
    try {
        $proc.WaitForExit()
    } finally {
        if (-not $proc.HasExited) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Host ""
    Write-Host "Could not retrieve tunnel URL. Please check your internet connection." -ForegroundColor Red
    if (Test-Path $LogFile) { Get-Content $LogFile -Tail 15 }
    if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
}
