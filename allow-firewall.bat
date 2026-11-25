@echo off
title Allow Sangeet Music Studio Through Windows Firewall
cd /d "%~dp0"

echo ==========================================================
echo Allowing Port 8080 in Windows Firewall for Mobile Access
echo ==========================================================
echo Requesting administrator privileges...

powershell -Command "Start-Process netsh -ArgumentList 'advfirewall firewall add rule name=\"Sangeet Music Studio 8080\" dir=in action=allow protocol=TCP localport=8080' -Verb RunAs"

echo.
echo If prompted by Windows (UAC), click YES to allow.
echo Once allowed, your mobile phone can connect via Wi-Fi!
timeout /t 3 >nul
exit /b 0
