@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Grid IP Scanner2 - Windows 프로그램 추가/제거 공식 등록 도구

echo ======================================================================
echo  Grid IP Scanner2 - Windows 프로그램 추가/제거 (제어판) 등록 도구
echo ======================================================================
echo.

:: 1. 관리자 권한 확인 및 승격
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [안내] 레지스트리 등록을 위해 관리자 권한이 필요합니다.
    echo UAC 승인 창이 열리면 '예'를 클릭해주세요...
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\" %*\"' -Verb RunAs"
    exit /b 0
)

:: 2. 설치 디렉토리 감지
set "APP_DIR=C:\Program Files\Grid IP Scanner2"

if not exist "!APP_DIR!" (
    :: 현재 실행 폴더 또는 상위 폴더 점검
    if exist "%~dp0..\Grid_IP_Scanner2.exe" (
        set "APP_DIR=%~dp0.."
    ) else if exist "%~dp0Grid_IP_Scanner2.exe" (
        set "APP_DIR=%~dp0"
    ) else if exist "%LOCALAPPDATA%\Programs\Grid IP Scanner2" (
        set "APP_DIR=%LOCALAPPDATA%\Programs\Grid IP Scanner2"
    )
)

echo [1/3] 설치 경로 확인: !APP_DIR!
if not exist "!APP_DIR!" (
    mkdir "!APP_DIR!" 2>nul
)

:: 3. 공식 언인스톨러 (uninstall.bat) 생성
set "UNINSTALL_BAT=!APP_DIR!\uninstall.bat"
if not exist "!UNINSTALL_BAT!" (
    echo [2/3] 공식 언인스톨러 생성 중...
    (
        echo @echo off
        echo setlocal
        echo chcp 65001 ^>nul
        echo title Grid IP Scanner2 - 프로그램 제거 ^(Uninstall^)
        echo.
        echo net session ^>nul 2^>^&1
        echo if %%errorlevel%% neq 0 ^(
        echo     powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%%~f0\" %%*\"' -Verb RunAs"
        echo     exit /b
        echo ^)
        echo.
        echo set "SILENT_MODE=0"
        echo if /i "%%1"=="/SILENT" set "SILENT_MODE=1"
        echo if /i "%%1"=="/VERYSILENT" set "SILENT_MODE=1"
        echo if /i "%%1"=="/quiet" set "SILENT_MODE=1"
        echo if /i "%%1"=="/s" set "SILENT_MODE=1"
        echo.
        echo if "%%SILENT_MODE%%"=="0" ^(
        echo     powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $res = [System.Windows.Forms.MessageBox]::Show('Grid IP Scanner2를 시스템에서 완전히 제거하시겠습니까?', 'Grid IP Scanner2 제거 확인', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question); if ($res -ne [System.Windows.Forms.DialogResult]::Yes) { exit 1 }"
        echo     if errorlevel 1 exit /b 0
        echo ^)
        echo.
        echo taskkill /F /IM "Grid_IP_Scanner2.exe" ^>nul 2^>^&1
        echo taskkill /F /IM "Grid IP Scanner2*.exe" ^>nul 2^>^&1
        echo.
        echo netsh advfirewall firewall delete rule name="Grid IP Scanner2" ^>nul 2^>^&1
        echo netsh advfirewall firewall delete rule name="Grid IP Scanner2 (Inbound)" ^>nul 2^>^&1
        echo netsh advfirewall firewall delete rule name="Grid IP Scanner2 (Outbound)" ^>nul 2^>^&1
        echo netsh advfirewall firewall delete rule name="Grid_IP_Scanner2.exe" ^>nul 2^>^&1
        echo.
        echo del /f /q "%%PUBLIC%%\Desktop\Grid IP Scanner2*.lnk" ^>nul 2^>^&1
        echo del /f /q "%%USERPROFILE%%\Desktop\Grid IP Scanner2*.lnk" ^>nul 2^>^&1
        echo del /f /q "%%APPDATA%%\Microsoft\Windows\Start Menu\Programs\Grid IP Scanner2*.lnk" ^>nul 2^>^&1
        echo del /f /q "%%ALLUSERSPROFILE%%\Microsoft\Windows\Start Menu\Programs\Grid IP Scanner2*.lnk" ^>nul 2^>^&1
        echo.
        echo reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\Grid_IP_Scanner2" /f ^>nul 2^>^&1
        echo reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Grid_IP_Scanner2" /f ^>nul 2^>^&1
        echo reg delete "HKLM\Software\Grid IP Scanner2" /f ^>nul 2^>^&1
        echo reg delete "HKCU\Software\Grid IP Scanner2" /f ^>nul 2^>^&1
        echo.
        echo set "APP_DIR=%%~dp0"
        echo if "%%APP_DIR:~-1%%"=="\" set "APP_DIR=%%APP_DIR:~0,-1%%"
        echo.
        echo if "%%SILENT_MODE%%"=="0" ^(
        echo     powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; [System.Windows.Forms.MessageBox]::Show('Grid IP Scanner2가 성공적으로 제거되었습니다.', '제거 완료', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)" ^>nul 2^>^&1
        echo ^)
        echo.
        echo start /b "" cmd.exe /c "timeout /t 1 /nobreak ^>nul ^& rd /s /q \"%%APP_DIR%%\""
        echo exit /b 0
    ) > "!UNINSTALL_BAT!"
)

:: 4. Windows 레지스트리 공식 등록 (프로그램 추가/제거)
echo [3/3] Windows 프로그램 추가/제거 (Uninstall Registry) 등록 중...

set "REG_KEY=HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\Grid_IP_Scanner2"
set "ICON_PATH=!APP_DIR!\icon.ico"
if not exist "!ICON_PATH!" (
    if exist "!APP_DIR!\Grid_IP_Scanner2.exe" (
        set "ICON_PATH=!APP_DIR!\Grid_IP_Scanner2.exe"
    )
)

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set "DATETIME=%%I"
set "TODAY=%DATETIME:~0,8%"
if "%TODAY%"=="" set "TODAY=20261025"

reg add "%REG_KEY%" /v "DisplayName" /t REG_SZ /d "Grid IP Scanner2 v2.4.7" /f >nul
reg add "%REG_KEY%" /v "DisplayVersion" /t REG_SZ /d "2.4.7" /f >nul
reg add "%REG_KEY%" /v "Publisher" /t REG_SZ /d "AhBiYout" /f >nul
reg add "%REG_KEY%" /v "DisplayIcon" /t REG_SZ /d "!ICON_PATH!" /f >nul
reg add "%REG_KEY%" /v "InstallLocation" /t REG_SZ /d "!APP_DIR!" /f >nul
reg add "%REG_KEY%" /v "UninstallString" /t REG_SZ /d "\"!UNINSTALL_BAT!\"" /f >nul
reg add "%REG_KEY%" /v "QuietUninstallString" /t REG_SZ /d "\"!UNINSTALL_BAT!\" /SILENT" /f >nul
reg add "%REG_KEY%" /v "InstallDate" /t REG_SZ /d "%TODAY%" /f >nul
reg add "%REG_KEY%" /v "URLInfoAbout" /t REG_SZ /d "https://github.com/AhBiYout-all/grid-ip-scanner2" /f >nul
reg add "%REG_KEY%" /v "HelpLink" /t REG_SZ /d "https://ahbiyoutvibe.blogspot.com/" /f >nul
reg add "%REG_KEY%" /v "URLUpdateInfo" /t REG_SZ /d "https://github.com/AhBiYout-all/grid-ip-scanner2/releases" /f >nul
reg add "%REG_KEY%" /v "EstimatedSize" /t REG_DWORD /d 125000 /f >nul
reg add "%REG_KEY%" /v "NoModify" /t REG_DWORD /d 1 /f >nul
reg add "%REG_KEY%" /v "NoRepair" /t REG_DWORD /d 1 /f >nul

:: 보조 레지스트리 등록
reg add "HKLM\Software\Grid IP Scanner2" /v "InstallPath" /t REG_SZ /d "!APP_DIR!" /f >nul
reg add "HKLM\Software\Grid IP Scanner2" /v "Version" /t REG_SZ /d "2.4.7" /f >nul
reg add "HKLM\Software\Grid IP Scanner2" /v "Publisher" /t REG_SZ /d "AhBiYout" /f >nul

echo.
echo ======================================================================
echo  [완료] Windows 프로그램 추가/제거(제어판)에 성공적으로 등록되었습니다!
echo  - 제어판 ^> 프로그램 및 기능 또는 설정 ^> 앱 ^> 설치된 앱에서 확인 가능합니다.
echo ======================================================================
echo.
pause
