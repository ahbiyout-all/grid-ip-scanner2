@echo off
REM ==============================================================================
REM OuiValidator - High Performance C++ OUI Validator DLL Compilation Script
REM ==============================================================================

echo [1/3] Checking MinGW g++ Compiler...
where g++ >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Warning: g++ compiler not found in PATH.
    echo [*] Please install MinGW-w64 or Visual Studio C++ build tools.
    pause
    exit /b 1
)

echo [2/3] Compiling OuiValidator.dll with -O3 optimizations...
g++ -O3 -shared -fPIC -std=c++17 -Wall -Wextra -static-libgcc -static-libstdc++ -o oui_validator.dll oui_validator.cpp

if %ERRORLEVEL% EQU 0 (
    echo [3/3] Compilation SUCCESS! Generated:
    echo        - native_dll\oui_validator.dll
    echo        - native_dll\oui_validator.h
) else (
    echo [X] g++ compilation failed with error %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
