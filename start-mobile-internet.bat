@echo off
title Sangeet Local - Mobile Data Internet Link
color 0a
cd /d "%~dp0"

echo =====================
===========================================================
echo   Sangeet Local - Mobile Data Link Launcher
echo ================================================================================
echo Starting secure mobile data tunnel...
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0tunnel.ps1"
pause
