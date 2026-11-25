@echo off
title Upload Sangeet Project to GitHub (prg-git/sangeet-local)
color 0a
echo ===================================================================
echo     UPLOAD SANGEET LOCAL PROJECT TO GITHUB (prg-git/sangeet-local)
echo ===================================================================
echo  This script will fix the folder structure by uploading:
echo    - css/       (styles)
echo    - js/        (audio player, database, UI)
echo    - music/     (songs)
echo    - data/      (library.json, playlists.json)
echo    - icons/     (app icons)
echo    - .nojekyll  (GitHub Pages configuration)
echo ===================================================================
echo.

set "GIT_CMD=%~dp0tools\git\cmd\git.exe"

if not exist "%GIT_CMD%" (
    where git >nul 2>&1
    if %errorLevel% equ 0 (
        set "GIT_CMD=git"
    ) else (
        echo [INFO] Portable Git not found. Downloading...
        powershell -ExecutionPolicy Bypass -File "%~dp0tools\download-git.ps1"
    )
)

echo [OK] Using Git: %GIT_CMD%
echo.

set "DEFAULT_URL=https://github.com/prg-git/sangeet-local.git"
echo Your GitHub Repository is set to:
echo   %DEFAULT_URL%
echo.
echo Press ENTER to upload to this repository, or paste a new URL below:
set "REPO_URL="
set /p REPO_URL="Repository URL [%DEFAULT_URL%]: "

if "%REPO_URL%"=="" set "REPO_URL=%DEFAULT_URL%"

echo.
echo Step 1: Connecting repository to %REPO_URL%...
cd /d "%~dp0"
"%GIT_CMD%" remote remove origin >nul 2>&1
"%GIT_CMD%" remote add origin %REPO_URL%

echo.
echo Step 2: Preparing and committing all folders...
"%GIT_CMD%" add .
"%GIT_CMD%" commit -m "Fix folder structure: css, js, music, data, icons" >nul 2>&1

echo.
echo Step 3: Setting branch to main...
"%GIT_CMD%" branch -M main

echo.
echo Step 4: Uploading all folders to GitHub...
echo (If GitHub asks to log in, click 'Sign in with your browser')
echo.
"%GIT_CMD%" push -u origin main --force

if %errorLevel% equ 0 (
    echo.
    echo ===================================================================
    echo  [SUCCESS] All folders (css, js, music, data, icons) are uploaded!
    echo ===================================================================
    echo.
    echo  Your site is now FIXED and will be working in 30-60 seconds at:
    echo  👉 https://prg-git.github.io/sangeet-local/
    echo.
    echo ===================================================================
) else (
    echo.
    echo [ERROR] Push failed. If a browser popup appeared, please complete sign-in.
)

echo.
pause
