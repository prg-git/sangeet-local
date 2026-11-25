@echo off
title Sangeet - Personal Music Studio
cd /d "%~dp0"

echo ==========================================================
echo Starting Sangeet Music Studio...
echo ==========================================================

:: Start background PowerShell web server
start /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080

:: Give server a moment to bind
timeout /t 1 /nobreak >nul

:: Detect Edge or Chrome to run in standalone App Window Mode
set EDGE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"

if exist %EDGE% (
    echo Launching Sangeet in Microsoft Edge App Mode...
    start "" %EDGE% --app=http://localhost:8080 --window-size=1280,820
    goto DONE
)

if exist %CHROME% (
    echo Launching Sangeet in Google Chrome App Mode...
    start "" %CHROME% --app=http://localhost:8080 --window-size=1280,820
    goto DONE
)

:: Fallback to default system browser
echo Launching in default web browser...
start http://localhost:8080

:DONE
echo App launched successfully!
exit /b 0
