@echo off
setlocal enabledelayedexpansion
:: ======================================================================
:: Grid IP Scanner2 - Automated Real-Time GitHub Releases Updater
:: Developer: AhBiYout | GitHub Account / Namespace: AhBiYout-all
:: Repository: grid-ip-scanner2
:: Copyright (c) 2026 AhBiYout. All rights reserved.
:: ======================================================================

title Grid IP Scanner2 - Auto Updater
color 0B
cls

echo ======================================================================
echo       GRID IP SCANNER2 - AUTOMATED GITHUB RELEASES UPDATER           
echo       Developer: AhBiYout  ^|  Target: AhBiYout-all/grid-ip-scanner2
echo ======================================================================
echo.

:: 1. Extract local current version
set LOCAL_VER=
where node >nul 2>nul
if %errorlevel% equ 0 (
    if exist "package.json" (
        for /f "tokens=*" %%v in ('node -p "try{require('./package.json').version}catch(e){}" 2^>nul') do set LOCAL_VER=%%v
    )
)
if "%LOCAL_VER%"=="" set LOCAL_VER=2.4.0
echo [*] Local Version : v%LOCAL_VER%
echo [*] Checking GitHub Releases API (AhBiYout-all/grid-ip-scanner2)...
echo.

:: 2. Query GitHub Releases API via PowerShell
set "PS_CHECK=$ErrorActionPreference='Stop'; try { $res = Invoke-RestMethod -Uri 'https://api.github.com/repos/AhBiYout-all/grid-ip-scanner2/releases/latest' -Headers @{'User-Agent'='Grid-IP-Scanner2-Updater'}; [Console]::WriteLine('TAG:' + $res.tag_name); foreach($a in $res.assets) { if($a.name.EndsWith('.exe')) { [Console]::WriteLine('ASSET:' + $a.name + '|' + $a.browser_download_url) } if($a.name.EndsWith('.apk')) { [Console]::WriteLine('APK:' + $a.name + '|' + $a.browser_download_url) } } } catch { [Console]::WriteLine('ERR:' + $_.Exception.Message) }"

set REMOTE_TAG=
set EXE_URL=
set SETUP_URL=
set APK_URL=

for /f "usebackq tokens=1,* delims=:" %%a in (`powershell -NoProfile -Command "%PS_CHECK%" 2^>nul`) do (
    if "%%a"=="TAG" (
        set RAW_TAG=%%b
        set REMOTE_TAG=!RAW_TAG:v=!
        set REMOTE_TAG=!REMOTE_TAG: =!
    )
    if "%%a"=="ERR" (
        echo [!] Note: GitHub API query returned: %%b
    )
)

if "%REMOTE_TAG%"=="" (
    color 0E
    echo [i] No published releases found on GitHub repository yet or API rate limit reached.
    echo     GitHub Repository: https://github.com/AhBiYout-all/grid-ip-scanner2/releases
    echo     Your current version (v%LOCAL_VER%) is up to date with local source.
    echo.
    pause
    exit /b 0
)

echo [*] Remote Version: v%REMOTE_TAG%
echo.

if "%LOCAL_VER%"=="%REMOTE_TAG%" (
    color 0A
    echo ======================================================================
    echo [OK] Grid IP Scanner2 is already at the latest version (v%LOCAL_VER%)!
    echo ======================================================================
    echo.
    pause
    exit /b 0
)

color 0A
echo ======================================================================
echo [UPDATE AVAILABLE] A new version is available: v%REMOTE_TAG%!
echo ======================================================================
echo.
echo Select download option:
echo   [1] Download Windows Portable (.exe)
echo   [2] Download Windows Official Installer (Setup.exe)
echo   [3] Download Android Mobile APK (.apk)
echo   [4] Open GitHub Releases in Browser
echo   [5] Cancel
echo.

set /p CHOICE="Enter choice (1-5): "
if "%CHOICE%"=="1" goto DOWNLOAD_PORTABLE
if "%CHOICE%"=="2" goto DOWNLOAD_INSTALLER
if "%CHOICE%"=="3" goto DOWNLOAD_APK
if "%CHOICE%"=="4" goto OPEN_BROWSER
goto EXIT

:DOWNLOAD_PORTABLE
echo.
echo [*] Downloading Grid IP Scanner2 v%REMOTE_TAG% Portable...
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; try { $res = Invoke-RestMethod -Uri 'https://api.github.com/repos/AhBiYout/grid-ip-scanner2/releases/latest'; $asset = $res.assets | Where-Object { $_.name -like '*.exe' -and $_.name -notlike '*Setup*' } | Select-Object -First 1; if($asset) { Write-Host 'Downloading ' $asset.name; Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $asset.name; Write-Host 'Download complete: ' $asset.name } else { Write-Host 'Portable exe asset not found, opening release page...'; Start-Process $res.html_url } } catch { Write-Host 'Download failed: ' $_.Exception.Message }"
echo.
pause
goto EXIT

:DOWNLOAD_INSTALLER
echo.
echo [*] Downloading Grid IP Scanner2 v%REMOTE_TAG% Setup Installer...
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; try { $res = Invoke-RestMethod -Uri 'https://api.github.com/repos/AhBiYout-all/grid-ip-scanner2/releases/latest'; $asset = $res.assets | Where-Object { $_.name -like '*Setup*.exe' } | Select-Object -First 1; if($asset) { Write-Host 'Downloading ' $asset.name; Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $asset.name; Write-Host 'Download complete: ' $asset.name; Start-Process $asset.name } else { Write-Host 'Setup asset not found, opening release page...'; Start-Process $res.html_url } } catch { Write-Host 'Download failed: ' $_.Exception.Message }"
echo.
pause
goto EXIT

:DOWNLOAD_APK
echo.
echo [*] Downloading Grid IP Scanner2 v%REMOTE_TAG% Android APK...
powershell -NoProfile -Command "$ErrorActionPreference='Stop'; try { $res = Invoke-RestMethod -Uri 'https://api.github.com/repos/AhBiYout-all/grid-ip-scanner2/releases/latest'; $asset = $res.assets | Where-Object { $_.name -like '*.apk' } | Select-Object -First 1; if($asset) { Write-Host 'Downloading ' $asset.name; Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $asset.name; Write-Host 'Download complete: ' $asset.name } else { Write-Host 'Android APK not found, opening release page...'; Start-Process $res.html_url } } catch { Write-Host 'Download failed: ' $_.Exception.Message }"
echo.
pause
goto EXIT

:OPEN_BROWSER
start https://github.com/AhBiYout-all/grid-ip-scanner2/releases
goto EXIT

:EXIT
exit /b 0
