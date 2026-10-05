@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
:: ======================================================================
:: Grid IP Scanner2 - Master Automated Multi-Folder Distribution Builder
:: Copyright (c) 2025-2026 AhBiYout (Cisnet). All rights reserved.
:: ======================================================================

:: 1. Dynamic Version Extraction (Tier 1: package.json, Tier 2 Fallback: docs/PATCH_NOTE.md)
set "APP_VER="
where node >nul 2>nul
if %errorlevel% equ 0 (
    if exist "package.json" (
        for /f "tokens=*" %%v in ('node -p "try{require('./package.json').version}catch(e){}" 2^>nul') do set "APP_VER=%%v"
    )
)
if "%APP_VER%"=="" (
    if exist "docs\PATCH_NOTE.md" (
        for /f "tokens=*" %%v in ('powershell -NoProfile -Command "if(Get-Content docs\PATCH_NOTE.md -Raw -ErrorAction SilentlyContinue -match '\(v?([0-9.]+)\)'){ $matches[1] }" 2^>nul') do set "APP_VER=%%v"
    )
)
if "%APP_VER%"=="" set "APP_VER=2.3.2"

title Grid IP Scanner2 v%APP_VER% - Automated Multi-Folder Builder
color 0B
cls

echo ======================================================================
echo       GRID IP SCANNER2 v%APP_VER% - AUTOMATED MULTI-FOLDER BUILDER       
echo ======================================================================
echo.

:: STEP 0: Configure port setting (Interactive custom port input)
echo [*] STEP 0: Configure local server / communication port...
echo Please enter the port number for local communication (Default: 3031):
set /p PORT_INPUT="Enter Port Number (Default: 3031): "
if "%PORT_INPUT%"=="" set PORT_INPUT=3031
echo [OK] Custom port selected: %PORT_INPUT%
echo.

:: Step 1: Check Node.js installation
echo [1/5] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js was not found in your system PATH.
    echo Please install Node.js from https://nodejs.org/ first.
    echo.
    goto FAILED
)
node --version
echo Node.js is present.
echo.

:: Step 2: Install dependencies if missing
echo [2/5] Verifying node_modules dependencies...
if not exist "node_modules\" (
    echo node_modules directory not found. Running dependency installation...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo ERROR: 'npm install' failed. Please check your internet connection.
        goto FAILED
    )
) else (
    echo node_modules folder already exists. Skipping npm install.
)
echo.

:: Step 3: Synchronize versions across all project targets
echo [3/5] Synchronizing Semantic Versions across SSOT targets...
call node scripts\sync-version.js
echo.

:: Step 4: Build Windows Executable and trigger Multi-Folder Packaging
echo [4/5] Building React Web UI, Standalone Executable, and Distribution Folders...
echo Rebuilding frontend and backend with Port: %PORT_INPUT%...
set VITE_PORT=%PORT_INPUT%

call node build-win.js
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ERROR: Windows binary compilation failed during execution.
    goto FAILED
)

:: Step 5: Multi-Folder Distribution Verification
echo.
echo [5/5] Verifying all generated distribution folder outputs...
set "DIST_BASE=dist_releases\v%APP_VER%"

if exist "%DIST_BASE%\unpacked\" (
    echo   [OK] Unpacked Multi-File Folder : %DIST_BASE%\unpacked\
) else (
    echo   [!] Warning: Unpacked multi-file folder missing.
)

if exist "%DIST_BASE%\portable\" (
    echo   [OK] Portable Executable Folder : %DIST_BASE%\portable\
) else (
    echo   [!] Warning: Portable folder missing.
)

if exist "%DIST_BASE%\installer\" (
    echo   [OK] Inno Setup Installer Folder: %DIST_BASE%\installer\
) else (
    echo   [!] Note: Inno Setup compiler folder: %DIST_BASE%\installer\
)

if exist "%DIST_BASE%\mobile\" (
    echo   [OK] Mobile PWA / Android Folder: %DIST_BASE%\mobile\
)

if exist "%DIST_BASE%\build_manifest.json" (
    echo   [OK] SHA256 Build Manifest File : %DIST_BASE%\build_manifest.json
)

if exist "dist_releases\build_history\" (
    echo   [OK] Build History Directory    : dist_releases\build_history\
)

color 0A
echo.
echo ======================================================================
echo SUCCESS: Grid IP Scanner2 v%APP_VER% Multi-Folder Distribution Complete!
echo Location: %CD%\dist_releases\v%APP_VER%\
echo ======================================================================
echo.
goto SUCCESS

:FAILED
echo.
echo ======================================================================
echo                         BUILD PROCESS FAILED                          
echo ======================================================================
echo Please review the errors printed above.
echo.
pause
exit /b 1

:SUCCESS
echo Press any key to exit.
pause >nul
exit /b 0
