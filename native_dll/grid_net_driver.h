/**
 * Grid IP Scanner2 - Native Network Acceleration Dynamic Link Library (DLL) Header
 * Copyright (c) 2025-2026 AhBiYout  All rights reserved.
 * 
 * Provides sub-millisecond native Win32 SendARP, IcmpSendEcho, and Winsock2 port scanning
 * without process creation overhead.
 */

#ifndef GRID_NET_DRIVER_H
#define GRID_NET_DRIVER_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef _WIN32
  #ifdef BUILDING_GRID_NET_DRIVER
    #define GRID_NET_API __declspec(dllexport)
  #else
    #define GRID_NET_API __declspec(dllimport)
  #endif
#else
  #define GRID_NET_API
#endif

/**
 * Returns the integer version code of grid_net_driver.dll (e.g., 20303 for v2.3.3).
 */
GRID_NET_API int GridNet_GetDriverVersion(void);

/**
 * Performs a zero-overhead Win32 IcmpSendEcho probe to check host liveness.
 * @param ip IP address string (e.g., "192.168.0.1")
 * @param timeoutMs Timeout in milliseconds
 * @return Round-trip latency in milliseconds if alive, or -1 if offline/timeout
 */
GRID_NET_API int GridNet_FastPing(const char* ip, int timeoutMs);

/**
 * Resolves local MAC address in 0.1ms using native Win32 SendARP API.
 * @param ip Target IP address string
 * @param outMac Output buffer for formatted MAC string ("00:1A:2B:3C:4D:5E")
 * @param maxLen Buffer size
 * @return 1 on success, 0 on failure
 */
GRID_NET_API int GridNet_GetMacAddress(const char* ip, char* outMac, int maxLen);

/**
 * Performs zero-overhead Winsock2 non-blocking TCP port probe.
 * @param ip Target IP address string
 * @param port Target TCP port number (1-65535)
 * @param timeoutMs Connection timeout in milliseconds
 * @return 1 if port is open, 0 if closed/timeout
 */
GRID_NET_API int GridNet_ScanPort(const char* ip, int port, int timeoutMs);

/**
 * Resolves Windows Computer Name / Workgroup via native UDP 137 NetBIOS query (<1ms, 0 process spawn).
 * @param ip Target IP address string
 * @param outName Buffer for output NetBIOS computer name
 * @param nameMaxLen Size of outName buffer
 * @param outWorkgroup Buffer for output Workgroup/Domain name
 * @param wgMaxLen Size of outWorkgroup buffer
 * @return 1 if NetBIOS name resolved, 0 on timeout/unsupported
 */
GRID_NET_API int GridNet_GetNetBIOSName(const char* ip, char* outName, int nameMaxLen, char* outWorkgroup, int wgMaxLen);

/**
 * Snaps HTTP Server Service Banner (e.g. "Apache/2.4", "nginx/1.18", "IIS/10.0") directly via Winsock socket.
 * @param ip Target IP address string
 * @param port TCP Port (e.g., 80, 8080, 443)
 * @param timeoutMs Read timeout in milliseconds
 * @param outBanner Output buffer for Server banner
 * @param maxLen Buffer size
 * @return 1 if banner captured, 0 otherwise
 */
GRID_NET_API int GridNet_GetServiceBanner(const char* ip, int port, int timeoutMs, char* outBanner, int maxLen);

/**
 * Sweeps multiple TCP ports in a single DLL call using Winsock select multiplexing.
 * @param ip Target IP address string
 * @param ports Array of port numbers
 * @param portCount Number of ports in array
 * @param timeoutMs Timeout in milliseconds
 * @param outOpenPorts Output buffer receiving open port numbers
 * @param maxOpenCount Max capacity of outOpenPorts buffer
 * @return Number of open ports found
 */
GRID_NET_API int GridNet_BatchScanPorts(const char* ip, const int* ports, int portCount, int timeoutMs, int* outOpenPorts, int maxOpenCount);

/**
 * Validates IEEE/Wireshark OUI database integrity, repairs malformed lines, and de-duplicates entries.
 * @param rawBuffer Input raw text buffer containing OUI database
 * @param rawLength Size of rawBuffer in bytes
 * @param sanitizedBuffer Output buffer for cleaned TSV formatted OUI database
 * @param sanitizedCapacity Capacity of sanitizedBuffer
 * @param outTotalLines Returns count of processed lines
 * @param outValidEntries Returns count of valid sanitized entries
 * @param outDuplicatesRemoved Returns count of duplicate entries removed
 * @param outMalformedLines Returns count of malformed/corrupted lines fixed or skipped
 * @return Total bytes written to sanitizedBuffer
 */
GRID_NET_API int GridNet_ValidateAndSanitizeOUI(
    const char* rawBuffer,
    int rawLength,
    char* sanitizedBuffer,
    int sanitizedCapacity,
    int* outTotalLines,
    int* outValidEntries,
    int* outDuplicatesRemoved,
    int* outMalformedLines
);

#ifdef __cplusplus
}
#endif

#endif // GRID_NET_DRIVER_H
