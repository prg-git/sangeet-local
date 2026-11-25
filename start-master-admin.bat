@echo off
title Sangeet - PC Master Admin Studio
cd /d "%~dp0"

echo ==========================================================
echo Starting Sangeet PC Master Admin Studio...
echo ==========================================================

:: Start background PowerShell web server if not already running
netstat -ano | findstr ":8080" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting local web server on port 8080...
    start /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
    timeout /t 1 /nobreak >nul
) else (
    echo Local server already active on port 8080.
)

:: Detect Edge or Chrome to run in standalone App Window Mode
set EDGE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"

if exist %EDGE% (
    echo Launching Master Admin Studio in Microsoft Edge App Mode...
    start "" %EDGE% --app=http://localhost:8080/admin.html --window-size=1280,850
    goto DONE
)

if exist %CHROME% (
    echo Launching Master Admin Studio in Google Chrome App Mode...
    start "" %CHROME% --app=http://localhost:8080/admin.html --window-size=1280,850
    goto DONE
)

:: Fallback to default browser
echo Launching Master Admin in default web browser...
start http://localhost:8080/admin.html

:DONE
echo Master Admin Studio launched successfully!
exit /b 0
