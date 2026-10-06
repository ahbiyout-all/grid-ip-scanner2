/**
 * Grid IP Scanner2 - Native Network Acceleration Dynamic Link Library (DLL)
 * Copyright (c) 2025-2026 AhBiYout  All rights reserved.
 * 
 * High-performance Win32 Direct Kernel API implementation:
 * - Direct IP Helper SendARP for sub-millisecond local MAC resolution
 * - Direct Win32 IcmpSendEcho for zero-process-creation Ping probing
 * - Non-blocking Winsock2 TCP SYN/Connect port scanning
 */

#define BUILDING_GRID_NET_DRIVER
#include "grid_net_driver.h"

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <iphlpapi.h>
#include <icmpapi.h>
#include <stdio.h>
#include <stdlib.h>

#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "iphlpapi.lib")

// Automatic Winsock Initializer
static int g_wsaInitialized = 0;

static void EnsureWinsock(void) {
    if (!g_wsaInitialized) {
        WSADATA wsaData;
        if (WSAStartup(MAKEWORD(2, 2), &wsaData) == 0) {
            g_wsaInitialized = 1;
        }
    }
}

GRID_NET_API int GridNet_GetDriverVersion(void) {
    return 20303; // v2.3.3
}

GRID_NET_API int GridNet_FastPing(const char* ip, int timeoutMs) {
    if (!ip || timeoutMs <= 0) return -1;
    EnsureWinsock();

    HANDLE hIcmpFile = IcmpCreateFile();
    if (hIcmpFile == INVALID_HANDLE_VALUE) {
        return -1;
    }

    unsigned long ipAddr = inet_addr(ip);
    if (ipAddr == INADDR_NONE) {
        IcmpCloseHandle(hIcmpFile);
        return -1;
    }

    char sendData[] = "GridNetEchoData";
    WORD sendSize = (WORD)sizeof(sendData);
    DWORD replySize = sizeof(ICMP_ECHO_REPLY) + sendSize + 32;
    void* replyBuffer = malloc(replySize);

    if (!replyBuffer) {
        IcmpCloseHandle(hIcmpFile);
        return -1;
    }

    DWORD dwRetVal = IcmpSendEcho(
        hIcmpFile,
        ipAddr,
        sendData,
        sendSize,
        NULL,
        replyBuffer,
        replySize,
        (DWORD)timeoutMs
    );

    int latency = -1;
    if (dwRetVal != 0) {
        PICMP_ECHO_REPLY pEchoReply = (PICMP_ECHO_REPLY)replyBuffer;
        if (pEchoReply->Status == IP_SUCCESS) {
            latency = (int)pEchoReply->RoundTripTime;
            if (latency == 0) latency = 1; // 0ms indicated as 1ms
        }
    }

    free(replyBuffer);
    IcmpCloseHandle(hIcmpFile);
    return latency;
}

GRID_NET_API int GridNet_GetMacAddress(const char* ip, char* outMac, int maxLen) {
    if (!ip || !outMac || maxLen < 18) return 0;
    EnsureWinsock();

    IPAddr destIp = inet_addr(ip);
    if (destIp == INADDR_NONE) return 0;

    ULONG macAddr[2];
    ULONG macAddrLen = 6;

    memset(macAddr, 0xff, sizeof(macAddr));

    DWORD dwRetVal = SendARP(destIp, 0, macAddr, &macAddrLen);
    if (dwRetVal == NO_ERROR && macAddrLen == 6) {
        unsigned char* mac = (unsigned char*)macAddr;
        snprintf(outMac, maxLen, "%02X:%02X:%02X:%02X:%02X:%02X",
                 mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
        return 1;
    }

    return 0;
}

GRID_NET_API int GridNet_ScanPort(const char* ip, int port, int timeoutMs) {
    if (!ip || port <= 0 || port > 65535 || timeoutMs <= 0) return 0;
    EnsureWinsock();

    SOCKET sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) return 0;

    // Set socket to non-blocking mode
    u_long mode = 1;
    ioctlsocket(sock, FIONBIO, &mode);

    struct sockaddr_in server;
    memset(&server, 0, sizeof(server));
    server.sin_family = AF_INET;
    server.sin_port = htons((u_short)port);
    server.sin_addr.s_addr = inet_addr(ip);

    connect(sock, (struct sockaddr*)&server, sizeof(server));

    fd_set fdwrite, fderr;
    FD_ZERO(&fdwrite);
    FD_ZERO(&fderr);
    FD_SET(sock, &fdwrite);
    FD_SET(sock, &fderr);

    struct timeval tv;
    tv.tv_sec = timeoutMs / 1000;
    tv.tv_usec = (timeoutMs % 1000) * 1000;

    int open = 0;
    if (select(0, NULL, &fdwrite, &fderr, &tv) > 0) {
        if (!FD_ISSET(sock, &fderr)) {
            int error = 0;
            int len = sizeof(error);
            if (getsockopt(sock, SOL_SOCKET, SO_ERROR, (char*)&error, &len) == 0) {
                if (error == 0) {
                    open = 1;
                }
            }
        }
    }

    closesocket(sock);
    return open;
}

GRID_NET_API int GridNet_GetNetBIOSName(const char* ip, char* outName, int nameMaxLen, char* outWorkgroup, int wgMaxLen) {
    if (!ip || !outName || nameMaxLen < 2) return 0;
    EnsureWinsock();

    if (outWorkgroup && wgMaxLen > 0) outWorkgroup[0] = '\0';
    outName[0] = '\0';

    SOCKET sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (sock == INVALID_SOCKET) return 0;

    // Set socket timeout (750ms)
    DWORD timeout = 750;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout, sizeof(timeout));

    struct sockaddr_in dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin_family = AF_INET;
    dest.sin_port = htons(137); // NetBIOS Name Service Port
    dest.sin_addr.s_addr = inet_addr(ip);

    // Standard NetBIOS Node Status Request Packet
    unsigned char request[] = {
        0x80, 0x94, // Transaction ID
        0x00, 0x00, // Flags (Query)
        0x00, 0x01, // Questions (1)
        0x00, 0x00, // Answer RRs
        0x00, 0x00, // Authority RRs
        0x00, 0x00, // Additional RRs
        0x20,       // Name length (32)
        'C','K','A','A','A','A','A','A','A','A','A','A','A','A','A','A',
        'A','A','A','A','A','A','A','A','A','A','A','A','A','A','A','A',
        0x00,       // Terminator
        0x00, 0x21, // Type: NBSTAT (33)
        0x00, 0x01  // Class: IN
    };

    if (sendto(sock, (const char*)request, sizeof(request), 0, (struct sockaddr*)&dest, sizeof(dest)) == SOCKET_ERROR) {
        closesocket(sock);
        return 0;
    }

    char response[1024];
    int respLen = recv(sock, response, sizeof(response), 0);
    closesocket(sock);

    if (respLen < 57) return 0; // Invalid NetBIOS packet size

    unsigned char numNames = (unsigned char)response[56];
    int offset = 57;

    for (int i = 0; i < numNames && (offset + 18) <= respLen; i++) {
        char name[16];
        memcpy(name, &response[offset], 15);
        name[15] = '\0';

        // Trim trailing spaces
        for (int k = 14; k >= 0; k--) {
            if (name[k] == ' ' || name[k] == '\t') name[k] = '\0';
            else break;
        }

        unsigned char nameType = (unsigned char)response[offset + 15];
        unsigned short flags = (unsigned short)*((unsigned short*)&response[offset + 16]);

        if (nameType == 0x00 && !(flags & 0x8000) && strlen(outName) == 0) {
            snprintf(outName, nameMaxLen, "%s", name);
        } else if (nameType == 0x00 && (flags & 0x8000) && outWorkgroup && strlen(outWorkgroup) == 0) {
            snprintf(outWorkgroup, wgMaxLen, "%s", name);
        }

        offset += 18;
    }

    return (strlen(outName) > 0) ? 1 : 0;
}

GRID_NET_API int GridNet_GetServiceBanner(const char* ip, int port, int timeoutMs, char* outBanner, int maxLen) {
    if (!ip || port <= 0 || !outBanner || maxLen < 4) return 0;
    EnsureWinsock();
    outBanner[0] = '\0';

    SOCKET sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (sock == INVALID_SOCKET) return 0;

    DWORD tv = (DWORD)timeoutMs;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));

    struct sockaddr_in server;
    memset(&server, 0, sizeof(server));
    server.sin_family = AF_INET;
    server.sin_port = htons((u_short)port);
    server.sin_addr.s_addr = inet_addr(ip);

    if (connect(sock, (struct sockaddr*)&server, sizeof(server)) == SOCKET_ERROR) {
        closesocket(sock);
        return 0;
    }

    char req[] = "HEAD / HTTP/1.1\r\nHost: localhost\r\nUser-Agent: GridNetScanner/2.3.3\r\nConnection: close\r\n\r\n";
    send(sock, req, (int)strlen(req), 0);

    char recvBuf[1024];
    int recvLen = recv(sock, recvBuf, sizeof(recvBuf) - 1, 0);
    closesocket(sock);

    if (recvLen <= 0) return 0;
    recvBuf[recvLen] = '\0';

    char* serverHeader = strstr(recvBuf, "Server: ");
    if (serverHeader) {
        serverHeader += 8;
        char* endLine = strstr(serverHeader, "\r\n");
        if (endLine) *endLine = '\0';
        snprintf(outBanner, maxLen, "%s", serverHeader);
        return 1;
    }

    return 0;
}

GRID_NET_API int GridNet_BatchScanPorts(const char* ip, const int* ports, int portCount, int timeoutMs, int* outOpenPorts, int maxOpenCount) {
    if (!ip || !ports || portCount <= 0 || !outOpenPorts || maxOpenCount <= 0) return 0;
    EnsureWinsock();

    int foundCount = 0;
    for (int i = 0; i < portCount && foundCount < maxOpenCount; i++) {
        if (GridNet_ScanPort(ip, ports[i], timeoutMs)) {
            outOpenPorts[foundCount++] = ports[i];
        }
    }

    return foundCount;
}

GRID_NET_API int GridNet_ValidateAndSanitizeOUI(
    const char* rawBuffer,
    int rawLength,
    char* sanitizedBuffer,
    int sanitizedCapacity,
    int* outTotalLines,
    int* outValidEntries,
    int* outDuplicatesRemoved,
    int* outMalformedLines
) {
    if (!rawBuffer || rawLength <= 0 || !sanitizedBuffer || sanitizedCapacity <= 0) return 0;

    int totalLines = 0;
    int validEntries = 0;
    int duplicates = 0;
    int malformed = 0;
    int writtenBytes = 0;

    // Simple hash table for de-duplicating 24-bit OUI prefixes
    #define OUI_HASH_SIZE 65536
    static unsigned char seenHashes[OUI_HASH_SIZE];
    memset(seenHashes, 0, sizeof(seenHashes));

    const char* ptr = rawBuffer;
    const char* end = rawBuffer + rawLength;

    while (ptr < end) {
        // Find line boundary
        const char* lineStart = ptr;
        while (ptr < end && *ptr != '\n' && *ptr != '\r') ptr++;
        int lineLen = (int)(ptr - lineStart);
        while (ptr < end && (*ptr == '\n' || *ptr == '\r')) ptr++;

        totalLines++;
        if (lineLen <= 0) continue;

        // Skip comment lines (#)
        int firstCharIdx = 0;
        while (firstCharIdx < lineLen && (lineStart[firstCharIdx] == ' ' || lineStart[firstCharIdx] == '\t')) firstCharIdx++;
        if (firstCharIdx >= lineLen || lineStart[firstCharIdx] == '#') continue;

        // Extract prefix and vendor
        char prefixBuf[32];
        char vendorBuf[256];
        prefixBuf[0] = '\0';
        vendorBuf[0] = '\0';

        int pIdx = 0;
        int i = firstCharIdx;

        // Parse prefix (hex characters, colons, hyphens, slashes)
        while (i < lineLen && pIdx < 31) {
            char c = lineStart[i];
            if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == ':' || c == '-' || c == '/') {
                prefixBuf[pIdx++] = (c >= 'a' && c <= 'z') ? (c - 32) : c; // Convert to upper
                i++;
            } else {
                break;
            }
        }
        prefixBuf[pIdx] = '\0';

        // Replace hyphens with colons in prefix
        for (int k = 0; k < pIdx; k++) {
            if (prefixBuf[k] == '-') prefixBuf[k] = ':';
        }

        // Skip delimiters and "(hex)", "(base 16)" IEEE tags
        while (i < lineLen) {
            if (lineStart[i] == '\t' || lineStart[i] == ' ') {
                i++;
            } else if (i + 5 <= lineLen && strncmp(&lineStart[i], "(hex)", 5) == 0) {
                i += 5;
            } else if (i + 9 <= lineLen && strncmp(&lineStart[i], "(base 16)", 9) == 0) {
                i += 9;
            } else {
                break;
            }
        }

        // Parse Vendor Name
        int vIdx = 0;
        while (i < lineLen && vIdx < 254) {
            vendorBuf[vIdx++] = lineStart[i++];
        }
        vendorBuf[vIdx] = '\0';

        // Trim vendor trailing spaces
        while (vIdx > 0 && (vendorBuf[vIdx-1] == ' ' || vendorBuf[vIdx-1] == '\t' || vendorBuf[vIdx-1] == '\r')) {
            vendorBuf[--vIdx] = '\0';
        }

        // Validate Prefix Length and Vendor
        if (pIdx < 6 || vIdx < 2) {
            malformed++;
            continue;
        }

        // De-duplication Check (Simple additive Hash)
        unsigned int hashVal = 0;
        for (int k = 0; k < pIdx; k++) {
            hashVal = (hashVal * 31 + (unsigned char)prefixBuf[k]) % OUI_HASH_SIZE;
        }

        if (seenHashes[hashVal]) {
            duplicates++;
            continue; // Skip duplicate
        }
        seenHashes[hashVal] = 1;

        // Format into sanitized output buffer (TSV)
        int needed = snprintf(sanitizedBuffer + writtenBytes, sanitizedCapacity - writtenBytes, "%s\t%s\n", prefixBuf, vendorBuf);
        if (needed > 0 && (writtenBytes + needed) < sanitizedCapacity) {
            writtenBytes += needed;
            validEntries++;
        } else {
            break; // Buffer full
        }
    }

    if (outTotalLines) *outTotalLines = totalLines;
    if (outValidEntries) *outValidEntries = validEntries;
    if (outDuplicatesRemoved) *outDuplicatesRemoved = duplicates;
    if (outMalformedLines) *outMalformedLines = malformed;

    return writtenBytes;
}

BOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {
    switch (fdwReason) {
        case DLL_PROCESS_ATTACH:
            EnsureWinsock();
            break;
        case DLL_PROCESS_DETACH:
            if (g_wsaInitialized) {
                WSACleanup();
                g_wsaInitialized = 0;
            }
            break;
    }
    return TRUE;
}

#else

// Fallback stubs for non-Windows platforms
int GridNet_GetDriverVersion(void) { return 20302; }
int GridNet_FastPing(const char* ip, int timeoutMs) { (void)ip; (void)timeoutMs; return -1; }
int GridNet_GetMacAddress(const char* ip, char* outMac, int maxLen) { (void)ip; (void)outMac; (void)maxLen; return 0; }
int GridNet_ScanPort(const char* ip, int port, int timeoutMs) { (void)ip; (void)port; (void)timeoutMs; return 0; }
int GridNet_GetNetBIOSName(const char* ip, char* outName, int nameMaxLen, char* outWorkgroup, int wgMaxLen) { (void)ip; (void)outName; (void)nameMaxLen; (void)outWorkgroup; (void)wgMaxLen; return 0; }
int GridNet_GetServiceBanner(const char* ip, int port, int timeoutMs, char* outBanner, int maxLen) { (void)ip; (void)port; (void)timeoutMs; (void)outBanner; (void)maxLen; return 0; }
int GridNet_BatchScanPorts(const char* ip, const int* ports, int portCount, int timeoutMs, int* outOpenPorts, int maxOpenCount) { (void)ip; (void)ports; (void)portCount; (void)timeoutMs; (void)outOpenPorts; (void)maxOpenCount; return 0; }
int GridNet_ValidateAndSanitizeOUI(const char* raw, int rawLen, char* outBuf, int cap, int* total, int* valid, int* dup, int* malformed) { (void)raw; (void)rawLen; (void)outBuf; (void)cap; if (total) *total=0; if (valid) *valid=0; if (dup) *dup=0; if (malformed) *malformed=0; return 0; }

#endif
