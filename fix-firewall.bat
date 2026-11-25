@echo off
title Unblock Sangeet Port 8080 in Windows Firewall
echo ===================================================================
echo     UNBLOCKING PORT 8080 FOR SANGEET LOCAL MOBILE CONNECTION
echo ===================================================================

:: Check for administrative rights
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [INFO] Requesting Administrator permission to allow incoming connection...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo [OK] Administrator rights confirmed.
echo.
echo Adding inbound firewall rule for Port 8080...
netsh advfirewall firewall delete rule name="Sangeet Music Server 8080" >nul 2>&1
netsh advfirewall firewall add rule name="Sangeet Music Server 8080" dir=in action=allow protocol=TCP localport=8080 profile=any >nul 2>&1

if %errorLevel% EQU 0 (
    echo ===================================================================
    echo  [SUCCESS] Port 8080 is now ALLOWED in Windows Firewall!
    echo ===================================================================
    echo.
    echo Your mobile phone can now connect smoothly via Wi-Fi:
    echo   ==^> http://192.168.31.41:8080
    echo.
) else (
    echo [ERROR] Failed to add firewall rule. Please run as Administrator.
)

echo Press any key to close...
pause >nul
