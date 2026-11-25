@echo off
title Deploy Sangeet to Firebase (lafa-xaak)
color 0b
echo ===================================================================
echo      DEPLOY SANGEET TO FIREBASE HOSTING [PROJECT: lafa-xaak]
echo ===================================================================
echo.
echo Target Project : lafa-xaak
echo Target Live URL: https://lafa-xaak.web.app
echo.
echo ===================================================================
echo.

set FIREBASE_CMD="%~dp0tools\firebase.exe"

if not exist %FIREBASE_CMD% (
    echo [INFO] Downloading portable Firebase CLI...
    powershell -ExecutionPolicy Bypass -File "%~dp0tools\download-firebase.ps1"
)

echo Step 1: Checking Google Firebase Authentication...
echo (If a browser window opens, please sign in with your Google account)
echo.
%FIREBASE_CMD% login

echo.
echo Step 2: Selecting project 'lafa-xaak'...
%FIREBASE_CMD% use lafa-xaak

echo.
echo Step 3: Deploying files and songs to Firebase Hosting...
%FIREBASE_CMD% deploy --only hosting --project lafa-xaak

echo.
echo ===================================================================
echo  [SUCCESS] Deployment complete!
echo.
echo  Your Mobile Music App is now LIVE worldwide:
echo    ==^> https://lafa-xaak.web.app
echo    ==^> https://lafa-xaak.firebaseapp.com
echo.
echo  Open this link on your mobile phone on Mobile Data (4G/5G)!
echo ===================================================================
echo.
pause
