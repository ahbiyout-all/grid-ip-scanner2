@echo off
REM ==============================================================================
REM Grid IP Scanner2 - Secure Vault DLL (AES-256-GCM) Automated Build Script
REM ==============================================================================

echo [1/3] Checking CGO & GCC Compiler Environment...
where gcc >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Warning: MinGW GCC compiler was not found in PATH.
    echo [*] Please install MinGW-w64 or TDM-GCC to compile CGO DLLs.
    pause
    exit /b 1
)

echo [2/3] Building grid_vault_driver.dll with Go C-Shared Mode (AES-NI / AVX2 Enabled)...
set CGO_ENABLED=1
set GOOS=windows
set GOARCH=amd64

go build -buildmode=c-shared -ldflags="-s -w" -o grid_vault_driver.dll vault_gcm_core.go

if %ERRORLEVEL% EQU 0 (
    echo [3/3] Build SUCCESS! Generated artifacts:
    echo        - grid_vault_driver.dll (Dynamic Link Library)
    echo        - grid_vault_driver.h   (C Header for FFI / C++ Linking)
) else (
    echo [X] DLL Compilation Failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

REM Optional: Copy to electron release directory
if exist "..\electron\bin\" (
    copy /Y grid_vault_driver.dll "..\electron\bin\grid_vault_driver.dll"
    echo [*] Automatically synced to Electron bin folder.
)
