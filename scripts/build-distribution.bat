@echo off
setlocal enabledelayedexpansion
:: ======================================================================
:: Grid IP Scanner2 - Automated Multi-Folder Distribution Builder
:: Creates isolated build folders under dist_releases/ for each build sequence
:: Copyright (c) 2025-2026 AhBiYout  All rights reserved.
:: ======================================================================

title Grid IP Scanner2 - Multi-Folder Distribution Builder
color 0A
cls

echo ======================================================================
echo       GRID IP SCANNER2 - AUTOMATED DISTRIBUTION PACKAGING PIPELINE   
echo ======================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js was not found in system PATH.
    echo Please install Node.js (v18+) and try again.
    pause
    exit /b 1
)

echo [1/3] Synchronizing versions across SSOT targets...
call node scripts\sync-version.js

echo.
echo [2/3] Building assets, portable exe and installer...
call npm run build
call node generate-assets.js

echo.
echo [3/3] Orchestrating multi-folder release outputs...
call node scripts\build-distribution.js

if %errorlevel% equ 0 (
    color 0A
    echo.
    echo ======================================================================
    echo  SUCCESS: All distribution folders generated under dist_releases/
    echo ======================================================================
) else (
    color 0C
    echo.
    echo ======================================================================
    echo  ERROR: Distribution build failed!
    echo ======================================================================
)

echo.
pause
