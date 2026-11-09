@echo off
chcp 65001 >nul
REM ==============================================================================
REM Grid IP Scanner2 - Master Native DLLs Automated Multi-Target Builder
REM Compiles all 11 Specialized Native DLL Modules:
REM   1. grid_probe_engine.dll  - Async ICMP SendEcho2 and L2 SendARP
REM   2. grid_port_iocp.dll     - IOCP High-Concurrency Port Scanner
REM   3. grid_discovery.dll     - mDNS, SSDP, LLMNR, NetBIOS Multicast
REM   4. grid_oui_trie.dll      - In-Memory Radix-Trie IEEE OUI Engine
REM   5. grid_banner_grabber.dll- HTTP, SSH, RTSP, TLS Banner Grabber
REM   6. grid_pcap_analyzer.dll - Npcap/WinPcap Kernel Packet Analyzer
REM   7. grid_fingerprint_engine.dll - AI Heuristic Device Fingerprinting & Risk Engine
REM   8. grid_net_driver.dll    - Sub-millisecond Direct IP Helper Net Driver
REM   9. grid_vault_driver.dll  - Secure Key Isolation & Vault Driver
REM   10. oui_validator.dll     - C++17 High Performance Fast OUI Validator
REM   11. secure_vault.dll      - C++17 Windows BCrypt AES-256-GCM Vault
REM Copyright (c) 2025-2026 AhBiYout. All rights reserved.
REM ==============================================================================

echo ==============================================================================
echo     GRID IP SCANNER2 - MASTER NATIVE DLL MULTI-MODULE COMPILER
echo ==============================================================================
echo.

where gcc >nul 2>nul
if %ERRORLEVEL% EQU 0 goto BUILD_GCC

where cl >nul 2>nul
if %ERRORLEVEL% EQU 0 goto BUILD_MSVC

echo [!] Notice: Neither GCC nor MSVC C-compiler was found in PATH.
echo [*] Native DLL compilation skipped. The application will use high-speed Go runtime fallbacks.
echo.
exit /b 0

:BUILD_GCC
echo [*] Compiler: MinGW-w64 GCC detected.
echo.

where g++ >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    set "CXX_CMD=gcc"
) else (
    set "CXX_CMD=g++"
)

echo [1/11] Compiling grid_probe_engine.dll...
gcc -O3 -s -shared -Wall -DBUILDING_GRID_PROBE_ENGINE -static-libgcc -o grid_probe_engine.dll grid_probe_engine.c -lws2_32 -liphlpapi -Wl,--out-implib,libgrid_probe_engine.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_probe_engine.dll

echo [2/11] Compiling grid_port_iocp.dll...
gcc -O3 -s -shared -Wall -DBUILDING_GRID_PORT_IOCP -static-libgcc -o grid_port_iocp.dll grid_port_iocp.c -lws2_32 -Wl,--out-implib,libgrid_port_iocp.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_port_iocp.dll

echo [3/11] Compiling grid_discovery.dll...
gcc -O3 -s -shared -Wall -DBUILDING_GRID_DISCOVERY -static-libgcc -o grid_discovery.dll grid_discovery.c -lws2_32 -Wl,--out-implib,libgrid_discovery.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_discovery.dll

echo [4/11] Compiling grid_oui_trie.dll...
gcc -O3 -s -shared -Wall -DBUILDING_GRID_OUI_TRIE -static-libgcc -o grid_oui_trie.dll grid_oui_trie.c -Wl,--out-implib,libgrid_oui_trie.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_oui_trie.dll

echo [5/11] Compiling grid_banner_grabber.dll...
gcc -O3 -s -shared -Wall -DBUILDING_GRID_BANNER_GRABBER -static-libgcc -o grid_banner_grabber.dll grid_banner_grabber.c -lws2_32 -Wl,--out-implib,libgrid_banner_grabber.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_banner_grabber.dll

echo [6/11] Compiling grid_pcap_analyzer.dll...
gcc -O3 -s -shared -Wall -DBUILDING_GRID_PCAP_ANALYZER -static-libgcc -o grid_pcap_analyzer.dll grid_pcap_analyzer.c -lws2_32 -liphlpapi -Wl,--out-implib,libgrid_pcap_analyzer.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_pcap_analyzer.dll

echo [7/11] Compiling grid_fingerprint_engine.dll (Pure Creative Native Heuristic Engine)...
gcc -O3 -s -shared -Wall -DBUILDING_GRID_FINGERPRINT_ENGINE -static-libgcc -o grid_fingerprint_engine.dll grid_fingerprint_engine.c -Wl,--out-implib,libgrid_fingerprint_engine.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_fingerprint_engine.dll

echo [8/11] Compiling grid_net_driver.dll...
gcc -O3 -s -shared -Wall -DBUILDING_GRID_NET_DRIVER -static-libgcc -o grid_net_driver.dll grid_net_driver.c -lws2_32 -liphlpapi -Wl,--out-implib,libgrid_net_driver.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_net_driver.dll

echo [9/11] Compiling grid_vault_driver.dll...
gcc -O3 -s -shared -Wall -DBUILDING_GRID_VAULT_DRIVER -static-libgcc -o grid_vault_driver.dll grid_vault_driver.c -lcrypt32 -ladvapi32 -Wl,--out-implib,libgrid_vault_driver.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_vault_driver.dll

echo [10/11] Compiling oui_validator.dll...
%CXX_CMD% -O3 -s -shared -fPIC -std=c++17 -Wall -Wextra -static-libgcc -static-libstdc++ -o oui_validator.dll oui_validator.cpp
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile oui_validator.dll

echo [11/11] Compiling secure_vault.dll...
%CXX_CMD% -O3 -s -shared -std=c++17 -Wall -Wextra -static-libgcc -static-libstdc++ secure_vault.cpp -o secure_vault.dll -lbcrypt -lcrypt32 -ladvapi32 -Wl,--out-implib,libsecure_vault.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile secure_vault.dll

goto COPY_AND_FINISH

:BUILD_MSVC
echo [*] Compiler: Microsoft Visual C++ detected.
echo.
cl /O2 /LD /DBUILDING_GRID_PROBE_ENGINE grid_probe_engine.c /Fe:grid_probe_engine.dll ws2_32.lib iphlpapi.lib
cl /O2 /LD /DBUILDING_GRID_PORT_IOCP grid_port_iocp.c /Fe:grid_port_iocp.dll ws2_32.lib
cl /O2 /LD /DBUILDING_GRID_DISCOVERY grid_discovery.c /Fe:grid_discovery.dll ws2_32.lib
cl /O2 /LD /DBUILDING_GRID_OUI_TRIE grid_oui_trie.c /Fe:grid_oui_trie.dll
cl /O2 /LD /DBUILDING_GRID_BANNER_GRABBER grid_banner_grabber.c /Fe:grid_banner_grabber.dll ws2_32.lib
cl /O2 /LD /DBUILDING_GRID_PCAP_ANALYZER grid_pcap_analyzer.c /Fe:grid_pcap_analyzer.dll ws2_32.lib iphlpapi.lib
cl /O2 /LD /DBUILDING_GRID_FINGERPRINT_ENGINE grid_fingerprint_engine.c /Fe:grid_fingerprint_engine.dll
cl /O2 /LD /DBUILDING_GRID_NET_DRIVER grid_net_driver.c /Fe:grid_net_driver.dll ws2_32.lib iphlpapi.lib
cl /O2 /LD /DBUILDING_GRID_VAULT_DRIVER grid_vault_driver.c /Fe:grid_vault_driver.dll crypt32.lib advapi32.lib
cl /LD /O2 /std:c++17 oui_validator.cpp /Fe:oui_validator.dll
cl /LD /O2 /std:c++17 secure_vault.cpp /Fe:secure_vault.dll bcrypt.lib crypt32.lib advapi32.lib

:COPY_AND_FINISH
echo.
echo [*] Synchronizing compiled DLLs to project root...
copy /Y *.dll ..\ >nul 2>nul
if exist "..\dist_releases" (
    echo [*] Syncing DLLs to dist_releases unpacked folders...
    for /d %%D in (..\dist_releases\v*) do (
        if exist "%%D\unpacked" copy /Y *.dll "%%D\unpacked\" >nul 2>nul
    )
)

echo.
echo [*] Verifying all 11 compiled DLL binaries:
set /a SUCCESS_DLL=0
for %%F in (grid_probe_engine.dll grid_port_iocp.dll grid_discovery.dll grid_oui_trie.dll grid_banner_grabber.dll grid_pcap_analyzer.dll grid_fingerprint_engine.dll grid_net_driver.dll grid_vault_driver.dll oui_validator.dll secure_vault.dll) do (
    if exist "%%F" (
        set /a SUCCESS_DLL+=1
        echo   [OK] %%F
    ) else (
        echo   [X] MISSING: %%F
    )
)
echo.
echo [OK] !SUCCESS_DLL! / 11 Native Acceleration DLLs successfully built and deployed.
exit /b 0
