@echo off
REM ==============================================================================
REM SecureVault - High-Performance C++ AES-256-GCM Native DLL Build Script
REM ==============================================================================

echo [BUILD] Building SecureVault.dll (C++17 AES-256-GCM)...

where g++ >nul 2>nul
if %errorlevel% == 0 (
    echo [BUILD] Using MinGW g++ 64-bit compiler with -O3 optimization...
    g++ -shared -O3 -std=c++17 -Wall -Wextra ^
        secure_vault.cpp ^
        -o secure_vault.dll ^
        -lbcrypt -lcrypt32 -ladvapi32 ^
        -Wl,--out-implib,libsecure_vault.a
    if %errorlevel% == 0 (
        echo [SUCCESS] SecureVault.dll compiled successfully!
        exit /b 0
    )
)

where cl.exe >nul 2>nul
if %errorlevel% == 0 (
    echo [BUILD] Using Microsoft MSVC cl.exe...
    cl /LD /O2 /std:c++17 secure_vault.cpp /Fe:secure_vault.dll bcrypt.lib crypt32.lib advapi32.lib
    if %errorlevel% == 0 (
        echo [SUCCESS] SecureVault.dll compiled successfully with MSVC!
        exit /b 0
    )
)

echo [ERROR] Neither g++ nor MSVC cl.exe found in PATH.
exit /b 1
