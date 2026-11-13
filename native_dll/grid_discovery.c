/**
 * Grid IP Scanner2 - Module 3: grid_discovery.c
 * Local Multicast & Broadcast Service Discovery Engine (mDNS, SSDP, LLMNR, NetBIOS)
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

#ifndef BUILDING_GRID_DISCOVERY
#define BUILDING_GRID_DISCOVERY
#endif
#include "grid_discovery.h"

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _MSC_VER
#pragma comment(lib, "ws2_32.lib")
#endif

static LONG volatile winsockState = 0;
static void EnsureWinsock(void) {
    if (InterlockedCompareExchange(&winsockState, 0, 0) == 2) return;
    if (InterlockedCompareExchange(&winsockState, 1, 0) == 0) {
        WSADATA wsa;
        WSAStartup(MAKEWORD(2, 2), &wsa);
        InterlockedExchange(&winsockState, 2);
    } else {
        while (InterlockedCompareExchange(&winsockState, 0, 0) != 2) {
            Sleep(0);
        }
    }
}

static char* disc_stristr(const char* haystack, const char* needle) {
    if (!haystack || !needle || !*needle) return (char*)haystack;
    size_t nlen = strlen(needle);
    for (const char* p = haystack; *p; p++) {
        if (_strnicmp(p, needle, nlen) == 0) return (char*)p;
    }
    return NULL;
}

static int is_mdns_boilerplate(const char* s, int len) {
    if (len <= 0) return 1;
    if (len == 9 && _strnicmp(s, "_services", 9) == 0) return 1;
    if (len == 7 && _strnicmp(s, "_dns-sd", 7) == 0) return 1;
    if (len == 4 && _strnicmp(s, "_udp", 4) == 0) return 1;
    if (len == 4 && _strnicmp(s, "_tcp", 4) == 0) return 1;
    if (len == 5 && _strnicmp(s, "local", 5) == 0) return 1;
    return 0;
}

int Discovery_GetVersion(void) {
    return 20501;
}

// NetBIOS Node Status Query implementation
int Discovery_QueryNetBIOS(
    const char* targetIp,
    int timeoutMs,
    char* outHost,
    int hostLen,
    char* outWorkgroup,
    int wgLen
) {
    if (!targetIp || !outHost || hostLen < 1) return 0;
    outHost[0] = '\0';
    if (outWorkgroup && wgLen > 0) outWorkgroup[0] = '\0';

    unsigned long ipAddr = inet_addr(targetIp);
    if (ipAddr == INADDR_NONE) return 0;

    EnsureWinsock();

    SOCKET s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (s == INVALID_SOCKET) return 0;

    // Timeout setting
    DWORD tv = timeoutMs > 0 ? (DWORD)timeoutMs : 400;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));

    struct sockaddr_in dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin_family = AF_INET;
    dest.sin_port = htons(137);
    dest.sin_addr.s_addr = ipAddr;

    // Standard RFC 1002 NetBIOS Node Status Request Packet (50 bytes)
    unsigned char nbPacket[50] = {
        0xA2, 0x48,             // Transaction ID
        0x00, 0x00,             // Flags: Query
        0x00, 0x01,             // Questions: 1
        0x00, 0x00,             // Answer RRs: 0
        0x00, 0x00,             // Authority RRs: 0
        0x00, 0x00,             // Additional RRs: 0
        // Encoded query name: CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA (wildcard *)
        0x20,
        0x43, 0x4B, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
        0x00,                   // Terminator
        0x00, 0x21,             // Type: NBSTAT (0x0021)
        0x00, 0x01              // Class: IN (0x0001)
    };

    if (sendto(s, (const char*)nbPacket, sizeof(nbPacket), 0, (struct sockaddr*)&dest, sizeof(dest)) <= 0) {
        closesocket(s);
        return 0;
    }

    unsigned char resp[1024];
    int recvLen = recv(s, (char*)resp, sizeof(resp), 0);
    closesocket(s);

    if (recvLen < 57) return 0;

    int numNames = resp[56];
    if (numNames <= 0 || recvLen < 57 + numNames * 18) return 0;

    char resolvedHost[64] = {0};
    char resolvedGroup[64] = {0};

    int offset = 57;
    for (int i = 0; i < numNames; i++) {
        if (offset + 18 > recvLen) break;

        char rawName[16];
        memcpy(rawName, &resp[offset], 15);
        rawName[15] = '\0';

        unsigned char type = resp[offset + 15];
        unsigned short flags = (unsigned short)((resp[offset + 16] << 8) | resp[offset + 17]);
        int isGroup = (flags & 0x8000) != 0;

        // Trim right spaces
        for (int p = 14; p >= 0; p--) {
            if (rawName[p] == ' ' || rawName[p] == '\0') rawName[p] = '\0';
            else break;
        }

        if (strlen(rawName) > 0) {
            if (!isGroup && (type == 0x00 || type == 0x20) && resolvedHost[0] == '\0') {
                snprintf(resolvedHost, sizeof(resolvedHost), "%s", rawName);
            } else if (isGroup && type == 0x00 && resolvedGroup[0] == '\0') {
                snprintf(resolvedGroup, sizeof(resolvedGroup), "%s", rawName);
            }
        }
        offset += 18;
    }

    if (resolvedHost[0] != '\0') {
        snprintf(outHost, (size_t)hostLen, "%s", resolvedHost);
        if (outWorkgroup && wgLen > 0 && resolvedGroup[0] != '\0') {
            snprintf(outWorkgroup, (size_t)wgLen, "%s", resolvedGroup);
        }
        return 1;
    }

    return 0;
}

// mDNS Unicast/Multicast Query implementation
int Discovery_QueryMDNS(
    const char* targetIp,
    int timeoutMs,
    char* outName,
    int maxLen
) {
    if (!targetIp || !outName || maxLen < 1) return 0;
    outName[0] = '\0';

    unsigned long ipAddr = inet_addr(targetIp);
    if (ipAddr == INADDR_NONE) return 0;

    EnsureWinsock();

    SOCKET s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (s == INVALID_SOCKET) return 0;

    DWORD tv = timeoutMs > 0 ? (DWORD)timeoutMs : 400;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));

    struct sockaddr_in dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin_family = AF_INET;
    dest.sin_port = htons(5353);
    dest.sin_addr.s_addr = ipAddr;

    // Standard mDNS PTR query for "_services._dns-sd._udp.local"
    unsigned char mdnsQuery[] = {
        0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x09, '_', 's', 'e', 'r', 'v', 'i', 'c', 'e', 's',
        0x07, '_', 'd', 'n', 's', '-', 's', 'd',
        0x04, '_', 'u', 'd', 'p',
        0x05, 'l', 'o', 'c', 'a', 'l',
        0x00,
        0x00, 0x0C, // Type: PTR
        0x00, 0x01  // Class: IN
    };

    if (sendto(s, (const char*)mdnsQuery, sizeof(mdnsQuery), 0, (struct sockaddr*)&dest, sizeof(dest)) <= 0) {
        closesocket(s);
        return 0;
    }

    unsigned char buffer[1500];
    int r = recv(s, (char*)buffer, sizeof(buffer) - 1, 0);
    closesocket(s);

    if (r > 12) {
        // Scan length-prefixed DNS labels in packet, skipping echoed query tokens (_services/_dns-sd/_udp/_tcp/local)
        char fallbackService[128] = {0};
        for (int i = 12; i < r - 2; i++) {
            unsigned char lblLen = buffer[i];
            if (lblLen >= 3 && lblLen <= 63 && (i + 1 + lblLen) <= r) {
                int validChars = 1;
                for (int k = 1; k <= lblLen; k++) {
                    unsigned char c = buffer[i + k];
                    // Allow printable ASCII and valid UTF-8 continuation/lead bytes (>= 0x80)
                    if (!((c >= 32 && c <= 126) || c >= 0x80)) {
                        validChars = 0;
                        break;
                    }
                }
                if (validChars) {
                    const char* seg = (const char*)&buffer[i + 1];
                    if (!is_mdns_boilerplate(seg, (int)lblLen)) {
                        if (seg[0] != '_') {
                            int copyLen = (int)lblLen < (maxLen - 1) ? (int)lblLen : (maxLen - 1);
                            memcpy(outName, seg, (size_t)copyLen);
                            outName[copyLen] = '\0';
                            return 1;
                        } else if (fallbackService[0] == '\0') {
                            int copyLen = (int)lblLen < (int)(sizeof(fallbackService) - 1) ? (int)lblLen : (int)(sizeof(fallbackService) - 1);
                            memcpy(fallbackService, seg, (size_t)copyLen);
                            fallbackService[copyLen] = '\0';
                        }
                    }
                    i += (int)lblLen;
                }
            }
        }
        if (fallbackService[0] != '\0') {
            snprintf(outName, (size_t)maxLen, "%s", fallbackService);
            return 1;
        }
    }

    return 0;
}

// SSDP M-SEARCH query implementation
int Discovery_QuerySSDP(
    const char* targetIp,
    int timeoutMs,
    char* outDevice,
    int maxLen
) {
    if (!targetIp || !outDevice || maxLen < 1) return 0;
    outDevice[0] = '\0';

    unsigned long ipAddr = inet_addr(targetIp);
    if (ipAddr == INADDR_NONE) return 0;

    EnsureWinsock();

    SOCKET s = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (s == INVALID_SOCKET) return 0;

    DWORD tv = timeoutMs > 0 ? (DWORD)timeoutMs : 400;
    setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, (const char*)&tv, sizeof(tv));
    setsockopt(s, SOL_SOCKET, SO_SNDTIMEO, (const char*)&tv, sizeof(tv));

    struct sockaddr_in dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin_family = AF_INET;
    dest.sin_port = htons(1900);
    dest.sin_addr.s_addr = ipAddr;

    const char* mSearch = 
        "M-SEARCH * HTTP/1.1\r\n"
        "HOST: 239.255.255.250:1900\r\n"
        "MAN: \"ssdp:discover\"\r\n"
        "MX: 1\r\n"
        "ST: ssdp:all\r\n\r\n";

    if (sendto(s, mSearch, (int)strlen(mSearch), 0, (struct sockaddr*)&dest, sizeof(dest)) <= 0) {
        closesocket(s);
        return 0;
    }

    char buffer[2048];
    int r = recv(s, buffer, sizeof(buffer) - 1, 0);
    closesocket(s);

    if (r > 0) {
        buffer[r] = '\0';
        const char* headers[] = { "SERVER:", "ST:", "LOCATION:" };
        const int headerLens[] = { 7, 3, 9 };
        for (int h = 0; h < 3; h++) {
            char* ptr = disc_stristr(buffer, headers[h]);
            if (ptr) {
                ptr += headerLens[h];
                while (*ptr == ' ' || *ptr == '\t') ptr++;
                char* end = strstr(ptr, "\r\n");
                if (!end) end = strchr(ptr, '\n');
                size_t len = end ? (size_t)(end - ptr) : strlen(ptr);
                if (len >= (size_t)maxLen) len = (size_t)(maxLen - 1);
                memcpy(outDevice, ptr, len);
                outDevice[len] = '\0';
                return 1;
            }
        }
    }

    return 0;
}

int Discovery_ProbeHost(
    const char* targetIp,
    int timeoutMs,
    DeviceDiscoveryInfo* outInfo
) {
    if (!targetIp || !outInfo) return 0;
    memset(outInfo, 0, sizeof(DeviceDiscoveryInfo));

    int discoveredBits = 0;

    // 1. Query NetBIOS
    char nbHost[128] = {0};
    char nbWorkgroup[64] = {0};
    if (Discovery_QueryNetBIOS(targetIp, timeoutMs, nbHost, sizeof(nbHost), nbWorkgroup, sizeof(nbWorkgroup))) {
        snprintf(outInfo->hostname, sizeof(outInfo->hostname), "%s", nbHost);
        snprintf(outInfo->workgroup, sizeof(outInfo->workgroup), "%s", nbWorkgroup);
        discoveredBits |= 1; // NetBIOS
    }

    // 2. Query mDNS
    char mdnsDevice[128] = {0};
    if (Discovery_QueryMDNS(targetIp, timeoutMs, mdnsDevice, sizeof(mdnsDevice))) {
        if (outInfo->hostname[0] == '\0') {
            snprintf(outInfo->hostname, sizeof(outInfo->hostname), "%s", mdnsDevice);
        }
        snprintf(outInfo->modelName, sizeof(outInfo->modelName), "%s", mdnsDevice);
        discoveredBits |= 2; // mDNS
    }

    // 3. Query SSDP
    char ssdpDevice[128] = {0};
    if (Discovery_QuerySSDP(targetIp, timeoutMs, ssdpDevice, sizeof(ssdpDevice))) {
        if (outInfo->modelName[0] == '\0') {
            snprintf(outInfo->modelName, sizeof(outInfo->modelName), "%s", ssdpDevice);
        }
        snprintf(outInfo->serviceType, sizeof(outInfo->serviceType), "%s", "UPnP/SSDP");
        discoveredBits |= 4; // SSDP
    }

    outInfo->protocolsDiscovered = discoveredBits;
    return (discoveredBits > 0) ? 1 : 0;
}

#else
int Discovery_GetVersion(void) { return 20500; }
int Discovery_ProbeHost(const char* targetIp, int timeoutMs, DeviceDiscoveryInfo* outInfo) { return 0; }
int Discovery_QueryNetBIOS(const char* targetIp, int timeoutMs, char* outHost, int hostLen, char* outWorkgroup, int wgLen) { return 0; }
int Discovery_QueryMDNS(const char* targetIp, int timeoutMs, char* outName, int maxLen) { return 0; }
int Discovery_QuerySSDP(const char* targetIp, int timeoutMs, char* outDevice, int maxLen) { return 0; }
#endif
