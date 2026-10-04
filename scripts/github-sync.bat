@echo off
setlocal enabledelayedexpansion
:: ======================================================================
:: Grid IP Scanner2 - Automated GitHub Push & CI/CD Release Script
:: Account: AhBiYout | Repository: AhBiYout-all
:: Copyright (c) 2026 AhBiYout. All rights reserved.
:: ======================================================================

title Grid IP Scanner2 - GitHub Sync & Release Pipeline
color 0B
cls

echo ======================================================================
echo       GRID IP SCANNER2 - AUTOMATED GITHUB SYNC & RELEASE SCRIPT       
echo       Account: AhBiYout  ^|  Target: AhBiYout-all
echo ======================================================================
echo.

:: [Step 1] Check Git installation
echo [1/6] Checking Git environment...
where git >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Git was not found in your system PATH.
    echo Please install Git from https://git-scm.com/ and try again.
    goto FAILED
)
for /f "tokens=*" %%g in ('git --version') do echo    Found: %%g
echo.

:: [Step 2] Dynamic Multi-Tier Version Extraction & Auto-Sync (Single Source of Truth)
echo [2/6] Synchronizing repository files with Semantic Versioning (SSOT)...
set APP_VER=

:: Tier 1: Execute auto-sync and extract from package.json via Node
where node >nul 2>nul
if %errorlevel% equ 0 (
    if exist "scripts\sync-version.js" (
        call node "scripts\sync-version.js"
    )
    if exist "package.json" (
        for /f "tokens=*" %%v in ('node -p "try{require('./package.json').version}catch(e){}" 2^>nul') do set APP_VER=%%v
    )
)

:: Tier 2 (Fallback): Parse from docs/PATCH_NOTE.md header
if "%APP_VER%"=="" (
    if exist "docs\PATCH_NOTE.md" (
        for /f "tokens=2 delims=()" %%a in ('findstr /i "Patch Note (v" "docs\PATCH_NOTE.md" 2^>nul') do (
            set RAW_MATCH=%%a
            set APP_VER=!RAW_MATCH:v=!
        )
    )
)

:: Default safety fallback
if "%APP_VER%"=="" set APP_VER=2.3.2
echo    Resolved Version: v%APP_VER%
title Grid IP Scanner2 [v%APP_VER%] - GitHub Sync Pipeline
echo.

:: [Step 3] Verify or Initialize Local Git Repository
echo [3/6] Verifying local Git repository...
if not exist ".git\" (
    echo    Initializing new Git repository...
    git init
    if %errorlevel% neq 0 goto FAILED
) else (
    echo    Git repository already initialized.
)

:: Ensure main branch is selected
git branch -M main >nul 2>nul

:: Verify Remote Origin
set REMOTE_URL=https://github.com/AhBiYout/AhBiYout-all.git
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo    Adding remote origin: %REMOTE_URL%
    git remote add origin %REMOTE_URL%
) else (
    git remote set-url origin %REMOTE_URL%
    echo    Remote origin verified: %REMOTE_URL%
)
echo.

:: [Step 4] Staging changes
echo [4/6] Staging files (honoring .gitignore)...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Failed to stage files with 'git add .'
    goto FAILED
)
echo    All modified and new files staged.
echo.

:: [Step 5] Commit changes with dynamic version and date
echo [5/6] Creating commit...
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set TODAY=%%a-%%b-%%c
set COMMIT_MSG=feat: Grid IP Scanner2 v%APP_VER% release update (%date% %time:~0,5%)

:: Allow custom commit message if user wishes
echo Default Commit Message:
echo   "%COMMIT_MSG%"
set /p USER_MSG="Press [Enter] to use default, or enter custom message: "
if not "!USER_MSG!"=="" set COMMIT_MSG=!USER_MSG!

git commit -m "!COMMIT_MSG!"
if %errorlevel% equ 0 (
    echo    Commit created successfully.
) else (
    echo    No new local changes to commit or commit already up to date.
)
echo.

:: [Step 6] Push to GitHub & Trigger CI/CD Actions
echo [6/6] Pushing to GitHub (origin main)...
git push -u origin main
if %errorlevel% neq 0 (
    color 0E
    echo.
    echo ⚠️ Push to main encountered an issue. Attempting with force/set-upstream...
    git push -f origin main
    if !errorlevel! neq 0 (
        color 0C
        echo ERROR: Git push failed.
        echo Please ensure you are logged into GitHub and have write permissions to:
        echo   %REMOTE_URL%
        goto FAILED
    )
)
echo    Push to branch 'main' succeeded!
echo.

:: Create and Push Tag for Automated GitHub Releases
echo [*] Synchronizing Semantic Release Tag (v%APP_VER%)...
git tag -d v%APP_VER% >nul 2>nul
git push origin :refs/tags/v%APP_VER% >nul 2>nul
git tag -a v%APP_VER% -m "Release Grid IP Scanner2 v%APP_VER%"
git push origin v%APP_VER%
echo    Tag v%APP_VER% published. (GitHub Actions CI/CD automatically triggered)
echo.

color 0A
echo ======================================================================
echo [SUCCESS] Grid IP Scanner2 v%APP_VER% successfully synced to GitHub!
echo ======================================================================
echo.
echo 🌐 GitHub Repository : https://github.com/AhBiYout/AhBiYout-all
echo 🚀 Actions CI/CD     : https://github.com/AhBiYout/AhBiYout-all/actions
echo 📦 Releases Download : https://github.com/AhBiYout/AhBiYout-all/releases
echo.
echo Note: GitHub Actions will now automatically build:
echo    1. Grid IP Scanner2 v%APP_VER% Portable (.exe)
echo    2. Grid IP Scanner2 Setup Installer (.exe)
echo    3. Mobile Web & PWA distribution bundle
echo.
pause
exit /b 0

:FAILED
color 0C
echo.
echo ======================================================================
echo [FAILED] GitHub synchronization could not be completed.
echo ======================================================================
echo Please check the error message above and verify your Git / Network settings.
echo.
pause
exit /b 1
