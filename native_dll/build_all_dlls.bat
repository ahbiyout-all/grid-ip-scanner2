@echo off
chcp 65001 >nul
REM ==============================================================================
REM Grid IP Scanner2 - Master Native DLLs Automated Multi-Target Builder
REM Compiles all 6 Specialized Native DLL Modules:
REM   1. grid_probe_engine.dll  - Async ICMP SendEcho2 and L2 SendARP
REM   2. grid_port_iocp.dll     - IOCP High-Concurrency Port Scanner
REM   3. grid_discovery.dll     - mDNS, SSDP, LLMNR, NetBIOS Multicast
REM   4. grid_oui_trie.dll      - In-Memory Radix-Trie IEEE OUI Engine
REM   5. grid_banner_grabber.dll- HTTP, SSH, RTSP, TLS Banner Grabber
REM   6. grid_pcap_analyzer.dll - Npcap/WinPcap Kernel Packet Analyzer
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

echo [1/6] Compiling grid_probe_engine.dll...
gcc -O3 -shared -Wall -DBUILDING_GRID_PROBE_ENGINE -o grid_probe_engine.dll grid_probe_engine.c -lws2_32 -liphlpapi -Wl,--out-implib,libgrid_probe_engine.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_probe_engine.dll

echo [2/6] Compiling grid_port_iocp.dll...
gcc -O3 -shared -Wall -DBUILDING_GRID_PORT_IOCP -o grid_port_iocp.dll grid_port_iocp.c -lws2_32 -Wl,--out-implib,libgrid_port_iocp.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_port_iocp.dll

echo [3/6] Compiling grid_discovery.dll...
gcc -O3 -shared -Wall -DBUILDING_GRID_DISCOVERY -o grid_discovery.dll grid_discovery.c -lws2_32 -Wl,--out-implib,libgrid_discovery.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_discovery.dll

echo [4/6] Compiling grid_oui_trie.dll...
gcc -O3 -shared -Wall -DBUILDING_GRID_OUI_TRIE -o grid_oui_trie.dll grid_oui_trie.c -Wl,--out-implib,libgrid_oui_trie.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_oui_trie.dll

echo [5/6] Compiling grid_banner_grabber.dll...
gcc -O3 -shared -Wall -DBUILDING_GRID_BANNER_GRABBER -o grid_banner_grabber.dll grid_banner_grabber.c -lws2_32 -Wl,--out-implib,libgrid_banner_grabber.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_banner_grabber.dll

echo [6/7] Compiling grid_pcap_analyzer.dll...
gcc -O3 -shared -Wall -DBUILDING_GRID_PCAP_ANALYZER -o grid_pcap_analyzer.dll grid_pcap_analyzer.c -lws2_32 -liphlpapi -Wl,--out-implib,libgrid_pcap_analyzer.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_pcap_analyzer.dll

echo [7/7] Compiling grid_fingerprint_engine.dll (Pure Creative Native Heuristic Engine)...
gcc -O3 -shared -Wall -DBUILDING_GRID_FINGERPRINT_ENGINE -o grid_fingerprint_engine.dll grid_fingerprint_engine.c -Wl,--out-implib,libgrid_fingerprint_engine.a
if %ERRORLEVEL% NEQ 0 echo [X] Failed to compile grid_fingerprint_engine.dll

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

:COPY_AND_FINISH
echo.
echo [*] Copying compiled DLLs to root directory...
copy /Y *.dll ..\ >nul 2>nul
echo [OK] All Native DLL processing completed.
exit /b 0
