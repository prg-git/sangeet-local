@echo off
title Upload Sangeet Project to GitHub
color 0a
echo ===================================================================
echo           UPLOAD SANGEET LOCAL PROJECT TO GITHUB
echo ===================================================================
echo  This tool uploads your entire project (HTML, CSS, JS, Music, Icons)
echo  directly to your GitHub repository with all folders intact!
echo ===================================================================
echo.

set "GIT_CMD="

:: Check local portable Git first
if exist "%~dp0tools\git\cmd\git.exe" (
    set "GIT_CMD=%~dp0tools\git\cmd\git.exe"
)

:: If not found locally, check system PATH
if "%GIT_CMD%"=="" (
    where git >nul 2>&1
    if %errorLevel% equ 0 set "GIT_CMD=git"
)

:: Check common program files paths
if "%GIT_CMD%"=="" (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
    ) else if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Users\%USERNAME%\AppData\Local\Programs\Git\cmd\git.exe"
    )
)

:: If still not found, download portable Git automatically
if "%GIT_CMD%"=="" (
    echo [INFO] Downloading portable Git (no installation required)...
    powershell -ExecutionPolicy Bypass -File "%~dp0tools\download-git.ps1"
    if exist "%~dp0tools\git\cmd\git.exe" (
        set "GIT_CMD=%~dp0tools\git\cmd\git.exe"
    )
)

if "%GIT_CMD%"=="" (
    echo [ERROR] Git could not be located.
    pause
    exit /b
)

echo [OK] Ready with Git: %GIT_CMD%
echo.
echo ===================================================================
echo  Please enter your GitHub Repository URL.
echo  Example: https://github.com/YOUR_USERNAME/sangeet.git
echo ===================================================================
echo.
set /p REPO_URL="Enter GitHub Repository URL: "

if "%REPO_URL%"=="" (
    echo [ERROR] No URL entered. Aborted.
    pause
    exit /b
)

echo.
echo Step 1: Initializing Git repository...
cd /d "%~dp0"
if not exist ".git" (
    "%GIT_CMD%" init
)

echo.
echo Step 2: Staging all project files, music, and folders...
"%GIT_CMD%" add .

echo.
echo Step 3: Creating commit...
"%GIT_CMD%" commit -m "Deploy Sangeet Local Music Studio"

echo.
echo Step 4: Setting branch to main...
"%GIT_CMD%" branch -M main

echo.
echo Step 5: Connecting to %REPO_URL%...
"%GIT_CMD%" remote remove origin >nul 2>&1
"%GIT_CMD%" remote add origin %REPO_URL%

echo.
echo Step 6: Uploading all files and folders to GitHub...
"%GIT_CMD%" push -u origin main --force

if %errorLevel% equ 0 (
    echo.
    echo ===================================================================
    echo  [SUCCESS] All files and folders have been uploaded to GitHub!
    echo ===================================================================
    echo.
    echo  FINAL STEP to make your app LIVE on Mobile Data:
    echo  1. Open your repository on GitHub in your browser.
    echo  2. Click "Settings" (top tab) -^> "Pages" (left menu).
    echo  3. Under "Branch", select "main" and folder "/ (root)", then click "Save".
    echo  4. In 1 minute, your site will be LIVE worldwide!
    echo ===================================================================
) else (
    echo.
    echo [NOTE] If a browser window opened asking you to sign into GitHub,
    echo please click "Sign in with your browser" to allow the upload.
)

echo.
pause
