@echo off
title Sangeet Local - Mobile APK Packager
color 0b
echo ===================================================================
echo             SANGEET LOCAL - ANDROID APK PACKAGER
echo                   Developed at Basugaon by Parag
echo ===================================================================
echo.
cd /d "%~dp0"

echo [1/3] Syncing latest mobile view files to Android assets...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$dest = 'android-apk-project\app\src\main\assets';" ^
    "if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null };" ^
    "Copy-Item index.html, manifest.json, sw.js -Destination $dest -Force;" ^
    "Copy-Item -Recurse -Force css, js, icons, data, music -Destination $dest;" ^
    "Write-Host 'Web files synced into Android APK assets successfully!'"

echo.
echo [2/3] Checking for local Java / Android SDK...
where java >nul 2>&1
if %errorLevel% equ 0 (
    echo Java detected! Attempting local Gradle APK build...
    cd android-apk-project
    call gradlew.bat assembleDebug
    cd ..
    if exist "android-apk-project\app\build\outputs\apk\debug\app-debug.apk" (
        copy /y "android-apk-project\app\build\outputs\apk\debug\app-debug.apk" "Sangeet-Local.apk" >nul
        echo.
        echo ===============================================================
        echo [SUCCESS] Sangeet-Local.apk created in project root folder!
        echo Transfer Sangeet-Local.apk to your phone and install it.
        echo ===============================================================
        pause
        exit /b 0
    )
)

echo.
echo [3/3] Local Java environment not configured.
echo GitHub Actions automatically builds and releases the APK in the cloud!
echo.
echo You can download the compiled APK directly from:
echo   https://github.com/prg-git/sangeet-local/releases
echo.
echo Or push the latest files using upload-to-github.bat to trigger an automatic new build.
echo ===================================================================
pause
