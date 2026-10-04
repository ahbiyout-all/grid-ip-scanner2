@echo off
:: ======================================================================
:: Cisnet Grid IP Scanner2 - Automated Build Script
:: Copyright (c) 2026 Cisnet. All rights reserved.
:: ======================================================================

title Cisnet Grid IP Scanner2 Builder
color 0B
cls

echo ======================================================================
echo           CISNET GRID IP SCANNER - STANDALONE BUILD SCRIPT            
echo ======================================================================
echo.

:: STEP 0: Configure port setting (Interactive custom port input)
echo [*] STEP 0: Configure local server / communication port...
echo Please enter the port number you want to use for the Vite server / local communication.
set /p PORT_INPUT="Enter Port Number (Default: 3031): "
if "%PORT_INPUT%"=="" (
    set PORT_INPUT=3031
)
echo [OK] Custom port selected of: %PORT_INPUT%
echo.

:: Step 1: Check Node.js installation
echo [1/4] Checking Node.js environment...
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
echo [2/4] Verifying node_modules dependencies...
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

:: Step 3: Run the build workflow
echo [3/4] Triggering Windows Build Workflow (build-win.js)...
echo This will package Vite frontend and build standalone Go executable...
echo Rebuilding React frontend and Go backend with custom Port: %PORT_INPUT%...
echo.

set VITE_PORT=%PORT_INPUT%
call npm run build:exe
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ERROR: Build workflow failed during execution.
    goto FAILED
)

:: Step 4: Verification
echo.
echo [4/4] Verifying generated executable...
set "GEN_EXE="
for /f "delims=" %%i in ('dir /b "Grid IP Scanner2 v*.exe" 2^>nul') do (
    set "GEN_EXE=%%i"
)

if not "%GEN_EXE%"=="" (
    color 0A
    echo.
    echo ======================================================================
    echo SUCCESS: Standalone Windows Executable built!
    echo Filename: %GEN_EXE%
    echo ======================================================================
    echo.
    goto SUCCESS
) else (
    color 0C
    echo ERROR: Build reported success but versioned executable 'Grid IP Scanner2 v*.exe' was not found.
    goto FAILED
)

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
echo.
echo Press any key to exit.
pause >nul
exit /b 0
